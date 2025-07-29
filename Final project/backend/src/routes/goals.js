const express = require('express');
const Goal = require('../models/Goal');
const { protect, checkOwnership } = require('../middleware/auth');
const { validate, goalSchemas, querySchemas } = require('../middleware/validation');
const { sendToUser } = require('../socket/socketHandler');
const debug = require('debug')('lifefit:goals');

const router = express.Router();

// @desc    Get all goals for user
// @route   GET /api/v1/goals
// @access  Private
router.get('/',
  protect,
  validate(querySchemas.pagination, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, sort, status, category, priority } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      let query = { user: req.user._id };

      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;

      const goals = await Goal.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Goal.countDocuments(query);

      // Calculate summary statistics
      const stats = await Goal.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]);

      const summary = {
        total,
        active: 0,
        completed: 0,
        paused: 0,
        cancelled: 0,
        failed: 0
      };

      stats.forEach(stat => {
        summary[stat._id] = stat.count;
      });

      res.json({
        success: true,
        count: goals.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary,
        data: goals
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get goal by ID
// @route   GET /api/v1/goals/:id
// @access  Private
router.get('/:id',
  protect,
  checkOwnership(Goal),
  async (req, res, next) => {
    try {
      const goal = req.resource; // Set by checkOwnership middleware

      res.json({
        success: true,
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Create new goal
// @route   POST /api/v1/goals
// @access  Private
router.post('/',
  protect,
  validate(goalSchemas.create),
  async (req, res, next) => {
    try {
      const goal = await Goal.create({
        ...req.body,
        user: req.user._id
      });

      // Send real-time update
      sendToUser(req.user._id.toString(), 'goal:created', {
        id: goal._id,
        title: goal.title,
        category: goal.category,
        status: goal.status
      });

      debug(`Goal created for user: ${req.user.email} - ${goal.title}`);

      res.status(201).json({
        success: true,
        message: 'Goal created successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Update goal
// @route   PUT /api/v1/goals/:id
// @access  Private
router.put('/:id',
  protect,
  checkOwnership(Goal),
  validate(goalSchemas.update),
  async (req, res, next) => {
    try {
      const goal = await Goal.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      // Send real-time update
      sendToUser(req.user._id.toString(), 'goal:updated', {
        id: goal._id,
        title: goal.title,
        status: goal.status,
        progress: goal.progress
      });

      debug(`Goal updated for user: ${req.user.email} - ${goal.title}`);

      res.json({
        success: true,
        message: 'Goal updated successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Delete goal
// @route   DELETE /api/v1/goals/:id
// @access  Private
router.delete('/:id',
  protect,
  checkOwnership(Goal),
  async (req, res, next) => {
    try {
      const goal = req.resource;
      await Goal.findByIdAndDelete(req.params.id);

      // Send real-time update
      sendToUser(req.user._id.toString(), 'goal:deleted', {
        id: req.params.id,
        title: goal.title
      });

      debug(`Goal deleted for user: ${req.user.email} - ${goal.title}`);

      res.json({
        success: true,
        message: 'Goal deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Update goal progress
// @route   PUT /api/v1/goals/:id/progress
// @access  Private
router.put('/:id/progress',
  protect,
  checkOwnership(Goal),
  validate(goalSchemas.updateProgress),
  async (req, res, next) => {
    try {
      const { value, note } = req.body;
      const goal = req.resource;

      await goal.updateProgress(value, note);

      // Send real-time update
      sendToUser(req.user._id.toString(), 'goal:progress-updated', {
        id: goal._id,
        title: goal.title,
        progress: goal.progress,
        completed: goal.status === 'completed'
      });

      // Send completion celebration if goal is completed
      if (goal.status === 'completed') {
        sendToUser(req.user._id.toString(), 'goal:completed', {
          id: goal._id,
          title: goal.title,
          completedAt: goal.completedAt,
          celebration: true
        });
      }

      debug(`Goal progress updated for user: ${req.user.email} - ${goal.title}: ${value}`);

      res.json({
        success: true,
        message: 'Goal progress updated successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Complete goal
// @route   PUT /api/v1/goals/:id/complete
// @access  Private
router.put('/:id/complete',
  protect,
  checkOwnership(Goal),
  async (req, res, next) => {
    try {
      const { note } = req.body;
      const goal = req.resource;

      if (goal.status === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Goal is already completed'
        });
      }

      await goal.complete(note);

      // Send real-time updates
      sendToUser(req.user._id.toString(), 'goal:completed', {
        id: goal._id,
        title: goal.title,
        completedAt: goal.completedAt,
        celebration: true
      });

      debug(`Goal completed for user: ${req.user.email} - ${goal.title}`);

      res.json({
        success: true,
        message: 'Goal completed successfully! 🎉',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Pause goal
// @route   PUT /api/v1/goals/:id/pause
// @access  Private
router.put('/:id/pause',
  protect,
  checkOwnership(Goal),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const goal = req.resource;

      if (goal.status !== 'active') {
        return res.status(400).json({
          success: false,
          error: 'Only active goals can be paused'
        });
      }

      await goal.pause(reason);

      // Send real-time update
      sendToUser(req.user._id.toString(), 'goal:paused', {
        id: goal._id,
        title: goal.title,
        reason
      });

      debug(`Goal paused for user: ${req.user.email} - ${goal.title}`);

      res.json({
        success: true,
        message: 'Goal paused successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Resume goal
// @route   PUT /api/v1/goals/:id/resume
// @access  Private
router.put('/:id/resume',
  protect,
  checkOwnership(Goal),
  async (req, res, next) => {
    try {
      const goal = req.resource;

      if (goal.status !== 'paused') {
        return res.status(400).json({
          success: false,
          error: 'Only paused goals can be resumed'
        });
      }

      await goal.resume();

      // Send real-time update
      sendToUser(req.user._id.toString(), 'goal:resumed', {
        id: goal._id,
        title: goal.title
      });

      debug(`Goal resumed for user: ${req.user.email} - ${goal.title}`);

      res.json({
        success: true,
        message: 'Goal resumed successfully',
        data: goal
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get active goals
// @route   GET /api/v1/goals/active
// @access  Private
router.get('/active/list', protect, async (req, res, next) => {
  try {
    const goals = await Goal.getActiveGoals(req.user._id);

    res.json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get goals by category
// @route   GET /api/v1/goals/category/:category
// @access  Private
router.get('/category/:category', protect, async (req, res, next) => {
  try {
    const { category } = req.params;
    const goals = await Goal.getGoalsByCategory(req.user._id, category);

    res.json({
      success: true,
      count: goals.length,
      data: goals
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get goal analytics
// @route   GET /api/v1/goals/analytics/summary
// @access  Private
router.get('/analytics/summary', protect, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get goal statistics
    const pipeline = [
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalGoals: { $sum: 1 },
          completedGoals: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          activeGoals: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          pausedGoals: {
            $sum: { $cond: [{ $eq: ['$status', 'paused'] }, 1, 0] }
          },
          avgProgress: { $avg: '$progress.percentage' },
          categories: { $addToSet: '$category' },
          priorities: { $addToSet: '$priority' }
        }
      }
    ];

    const analytics = await Goal.aggregate(pipeline);
    
    // Get completion trends
    const trendPipeline = [
      {
        $match: {
          user: req.user._id,
          completedAt: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' },
            day: { $dayOfMonth: '$completedAt' }
          },
          date: { $first: '$completedAt' },
          completedCount: { $sum: 1 }
        }
      },
      { $sort: { date: 1 } }
    ];

    const trends = await Goal.aggregate(trendPipeline);

    // Get category breakdown
    const categoryPipeline = [
      {
        $match: {
          user: req.user._id,
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          active: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          avgProgress: { $avg: '$progress.percentage' }
        }
      }
    ];

    const categoryBreakdown = await Goal.aggregate(categoryPipeline);

    const summary = analytics[0] || {
      totalGoals: 0,
      completedGoals: 0,
      activeGoals: 0,
      pausedGoals: 0,
      avgProgress: 0,
      categories: [],
      priorities: []
    };

    // Calculate completion rate
    summary.completionRate = summary.totalGoals > 0 
      ? Math.round((summary.completedGoals / summary.totalGoals) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate: now },
        summary,
        trends,
        categoryBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get overdue goals
// @route   GET /api/v1/goals/overdue
// @access  Private
router.get('/overdue/list', protect, async (req, res, next) => {
  try {
    const now = new Date();
    
    const overdueGoals = await Goal.find({
      user: req.user._id,
      status: { $in: ['active', 'paused'] },
      'timeframe.endDate': { $lt: now },
      'timeframe.type': { $ne: 'ongoing' }
    }).sort({ 'timeframe.endDate': 1 });

    res.json({
      success: true,
      count: overdueGoals.length,
      data: overdueGoals
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get goals due soon
// @route   GET /api/v1/goals/due-soon
// @access  Private
router.get('/due-soon/list', protect, async (req, res, next) => {
  try {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const dueSoonGoals = await Goal.find({
      user: req.user._id,
      status: 'active',
      'timeframe.endDate': { 
        $gte: now,
        $lte: sevenDaysFromNow 
      }
    }).sort({ 'timeframe.endDate': 1 });

    res.json({
      success: true,
      count: dueSoonGoals.length,
      data: dueSoonGoals
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;