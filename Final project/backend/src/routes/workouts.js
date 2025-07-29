const express = require('express');
const Workout = require('../models/Workout');
const HealthData = require('../models/HealthData');
const { protect, checkOwnership } = require('../middleware/auth');
const { validate, workoutSchemas, querySchemas } = require('../middleware/validation');
const { sendToUser } = require('../socket/socketHandler');
const debug = require('debug')('lifefit:workouts');

const router = express.Router();

// @desc    Get all workouts for user
// @route   GET /api/v1/workouts
// @access  Private
router.get('/',
  protect,
  validate(querySchemas.pagination, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, sort, type, status, startDate, endDate } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      let query = { user: req.user._id };

      if (type) query.type = type;
      if (status) query.completionStatus = status;
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      const workouts = await Workout.find(query)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Workout.countDocuments(query);

      // Calculate summary statistics
      const stats = await Workout.aggregate([
        { $match: { user: req.user._id } },
        {
          $group: {
            _id: '$completionStatus',
            count: { $sum: 1 }
          }
        }
      ]);

      const summary = {
        total,
        planned: 0,
        'in-progress': 0,
        completed: 0,
        skipped: 0
      };

      stats.forEach(stat => {
        summary[stat._id] = stat.count;
      });

      res.json({
        success: true,
        count: workouts.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary,
        data: workouts
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get workout by ID
// @route   GET /api/v1/workouts/:id
// @access  Private
router.get('/:id',
  protect,
  checkOwnership(Workout),
  async (req, res, next) => {
    try {
      const workout = req.resource; // Set by checkOwnership middleware

      res.json({
        success: true,
        data: workout
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Create new workout
// @route   POST /api/v1/workouts
// @access  Private
router.post('/',
  protect,
  validate(workoutSchemas.create),
  async (req, res, next) => {
    try {
      const workout = await Workout.create({
        ...req.body,
        user: req.user._id
      });

      // Send real-time update
      sendToUser(req.user._id.toString(), 'workout:created', {
        id: workout._id,
        name: workout.name,
        type: workout.type,
        date: workout.date,
        status: workout.completionStatus
      });

      debug(`Workout created for user: ${req.user.email} - ${workout.name}`);

      res.status(201).json({
        success: true,
        message: 'Workout created successfully',
        data: workout
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Update workout
// @route   PUT /api/v1/workouts/:id
// @access  Private
router.put('/:id',
  protect,
  checkOwnership(Workout),
  validate(workoutSchemas.create),
  async (req, res, next) => {
    try {
      const workout = await Workout.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      // Send real-time update
      sendToUser(req.user._id.toString(), 'workout:updated', {
        id: workout._id,
        name: workout.name,
        status: workout.completionStatus,
        duration: workout.duration
      });

      debug(`Workout updated for user: ${req.user.email} - ${workout.name}`);

      res.json({
        success: true,
        message: 'Workout updated successfully',
        data: workout
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Delete workout
// @route   DELETE /api/v1/workouts/:id
// @access  Private
router.delete('/:id',
  protect,
  checkOwnership(Workout),
  async (req, res, next) => {
    try {
      const workout = req.resource;
      await Workout.findByIdAndDelete(req.params.id);

      // Remove workout reference from health data
      await HealthData.updateMany(
        { workouts: req.params.id },
        { $pull: { workouts: req.params.id } }
      );

      // Send real-time update
      sendToUser(req.user._id.toString(), 'workout:deleted', {
        id: req.params.id,
        name: workout.name
      });

      debug(`Workout deleted for user: ${req.user.email} - ${workout.name}`);

      res.json({
        success: true,
        message: 'Workout deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Start workout
// @route   PUT /api/v1/workouts/:id/start
// @access  Private
router.put('/:id/start',
  protect,
  checkOwnership(Workout),
  async (req, res, next) => {
    try {
      const workout = req.resource;

      if (workout.completionStatus !== 'planned') {
        return res.status(400).json({
          success: false,
          error: 'Only planned workouts can be started'
        });
      }

      await workout.start();

      // Send real-time update
      sendToUser(req.user._id.toString(), 'workout:started', {
        id: workout._id,
        name: workout.name,
        startTime: workout.startTime
      });

      debug(`Workout started for user: ${req.user.email} - ${workout.name}`);

      res.json({
        success: true,
        message: 'Workout started successfully',
        data: workout
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Complete workout
// @route   PUT /api/v1/workouts/:id/complete
// @access  Private
router.put('/:id/complete',
  protect,
  checkOwnership(Workout),
  async (req, res, next) => {
    try {
      const workout = req.resource;
      const { rating, notes, mood, energy } = req.body;

      if (workout.completionStatus === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Workout is already completed'
        });
      }

      // Update workout with completion data
      if (rating) workout.rating = rating;
      if (notes) workout.notes = notes;
      if (mood) workout.mood = { ...workout.mood, ...mood };
      if (energy) workout.energy = { ...workout.energy, ...energy };

      await workout.complete();

      // Update health data for the workout date
      const workoutDate = new Date(workout.date);
      workoutDate.setHours(0, 0, 0, 0);

      let healthData = await HealthData.findOne({
        user: req.user._id,
        date: workoutDate
      });

      if (!healthData) {
        healthData = await HealthData.create({
          user: req.user._id,
          date: workoutDate,
          workouts: [workout._id],
          metrics: {
            calories: {
              burned: workout.summary.caloriesBurned || 0
            }
          }
        });
      } else {
        // Add workout to existing health data
        if (!healthData.workouts.includes(workout._id)) {
          healthData.workouts.push(workout._id);
        }
        
        // Update calories burned
        if (workout.summary.caloriesBurned) {
          healthData.metrics.calories = healthData.metrics.calories || {};
          healthData.metrics.calories.burned = 
            (healthData.metrics.calories.burned || 0) + workout.summary.caloriesBurned;
        }

        await healthData.save();
      }

      // Send real-time updates
      sendToUser(req.user._id.toString(), 'workout:completed', {
        id: workout._id,
        name: workout.name,
        duration: workout.duration,
        caloriesBurned: workout.summary.caloriesBurned,
        completedAt: workout.endTime
      });

      sendToUser(req.user._id.toString(), 'workout:celebration', {
        workoutId: workout._id,
        name: workout.name,
        duration: workout.duration,
        caloriesBurned: workout.summary.caloriesBurned,
        completedAt: workout.endTime
      });

      debug(`Workout completed for user: ${req.user.email} - ${workout.name}`);

      res.json({
        success: true,
        message: 'Workout completed successfully! 🎉',
        data: workout
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Skip workout
// @route   PUT /api/v1/workouts/:id/skip
// @access  Private
router.put('/:id/skip',
  protect,
  checkOwnership(Workout),
  async (req, res, next) => {
    try {
      const { reason } = req.body;
      const workout = req.resource;

      if (workout.completionStatus === 'completed') {
        return res.status(400).json({
          success: false,
          error: 'Cannot skip a completed workout'
        });
      }

      workout.completionStatus = 'skipped';
      if (reason) {
        workout.notes = workout.notes 
          ? `${workout.notes}\n\nSkipped: ${reason}` 
          : `Skipped: ${reason}`;
      }

      await workout.save();

      // Send real-time update
      sendToUser(req.user._id.toString(), 'workout:skipped', {
        id: workout._id,
        name: workout.name,
        reason
      });

      debug(`Workout skipped for user: ${req.user.email} - ${workout.name}`);

      res.json({
        success: true,
        message: 'Workout marked as skipped',
        data: workout
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get workout templates
// @route   GET /api/v1/workouts/templates
// @access  Private
router.get('/templates/list', protect, async (req, res, next) => {
  try {
    const templates = await Workout.getTemplates(req.user._id);

    res.json({
      success: true,
      count: templates.length,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Create template from workout
// @route   POST /api/v1/workouts/:id/template
// @access  Private
router.post('/:id/template',
  protect,
  checkOwnership(Workout),
  async (req, res, next) => {
    try {
      const { templateName, isPublic = false } = req.body;
      
      if (!templateName) {
        return res.status(400).json({
          success: false,
          error: 'Template name is required'
        });
      }

      const workout = req.resource;
      const template = workout.createTemplate(templateName);
      template.isPublic = isPublic;
      
      await template.save();

      debug(`Workout template created for user: ${req.user.email} - ${templateName}`);

      res.status(201).json({
        success: true,
        message: 'Workout template created successfully',
        data: template
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Create workout from template
// @route   POST /api/v1/workouts/from-template/:templateId
// @access  Private
router.post('/from-template/:templateId', protect, async (req, res, next) => {
  try {
    const { date, startTime } = req.body;
    
    if (!date || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Date and start time are required'
      });
    }

    const template = await Workout.findById(req.params.templateId);
    
    if (!template || !template.isTemplate) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Check if user can access this template
    if (template.user.toString() !== req.user._id.toString() && !template.isPublic) {
      return res.status(403).json({
        success: false,
        error: 'Access denied to this template'
      });
    }

    // Create workout from template
    const workoutData = template.toObject();
    delete workoutData._id;
    delete workoutData.createdAt;
    delete workoutData.updatedAt;
    
    workoutData.user = req.user._id;
    workoutData.date = new Date(date);
    workoutData.startTime = new Date(startTime);
    workoutData.isTemplate = false;
    workoutData.templateName = undefined;
    workoutData.completionStatus = 'planned';

    const workout = await Workout.create(workoutData);

    debug(`Workout created from template for user: ${req.user.email} - ${workout.name}`);

    res.status(201).json({
      success: true,
      message: 'Workout created from template successfully',
      data: workout
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get workout statistics
// @route   GET /api/v1/workouts/analytics/stats
// @access  Private
router.get('/analytics/stats', protect, async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    
    const stats = await Workout.getWorkoutStats(req.user._id, parseInt(days));

    res.json({
      success: true,
      data: stats[0] || {
        totalWorkouts: 0,
        totalDuration: 0,
        totalCalories: 0,
        avgDuration: 0,
        avgCalories: 0,
        workoutTypes: []
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get workout analytics
// @route   GET /api/v1/workouts/analytics/summary
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

    // Get workout analytics
    const pipeline = [
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: null,
          totalWorkouts: { $sum: 1 },
          completedWorkouts: {
            $sum: { $cond: [{ $eq: ['$completionStatus', 'completed'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$summary.caloriesBurned' },
          avgDuration: { $avg: '$duration' },
          avgCalories: { $avg: '$summary.caloriesBurned' },
          avgRating: { $avg: '$rating' },
          workoutTypes: { $addToSet: '$type' },
          locations: { $addToSet: '$location' },
          intensities: { $addToSet: '$intensity' }
        }
      }
    ];

    const analytics = await Workout.aggregate(pipeline);
    
    // Get workout trends
    const trendPipeline = [
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: now },
          completionStatus: 'completed'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          date: { $first: '$date' },
          workoutCount: { $sum: 1 },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$summary.caloriesBurned' }
        }
      },
      { $sort: { date: 1 } }
    ];

    const trends = await Workout.aggregate(trendPipeline);

    // Get type breakdown
    const typeBreakdown = await Workout.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$completionStatus', 'completed'] }, 1, 0] }
          },
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$summary.caloriesBurned' },
          avgRating: { $avg: '$rating' }
        }
      }
    ]);

    const summary = analytics[0] || {
      totalWorkouts: 0,
      completedWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      avgDuration: 0,
      avgCalories: 0,
      avgRating: 0,
      workoutTypes: [],
      locations: [],
      intensities: []
    };

    // Calculate completion rate
    summary.completionRate = summary.totalWorkouts > 0 
      ? Math.round((summary.completedWorkouts / summary.totalWorkouts) * 100) 
      : 0;

    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate: now },
        summary,
        trends,
        typeBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;