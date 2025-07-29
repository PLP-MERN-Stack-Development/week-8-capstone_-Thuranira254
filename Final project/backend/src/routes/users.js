const express = require('express');
const User = require('../models/User');
const HealthData = require('../models/HealthData');
const Goal = require('../models/Goal');
const Workout = require('../models/Workout');
const { protect, authorize } = require('../middleware/auth');
const { validate, querySchemas } = require('../middleware/validation');
const debug = require('debug')('lifefit:users');

const router = express.Router();

// @desc    Get all users (admin only)
// @route   GET /api/v1/users
// @access  Private/Admin
router.get('/',
  protect,
  authorize('admin'),
  validate(querySchemas.pagination, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, sort, fields } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      let query = User.find({ isActive: true });

      // Select fields
      if (fields) {
        query = query.select(fields.split(',').join(' '));
      } else {
        query = query.select('-password');
      }

      // Sort
      query = query.sort(sort);

      // Pagination
      query = query.skip(skip).limit(limit);

      const users = await query;
      const total = await User.countDocuments({ isActive: true });

      res.json({
        success: true,
        count: users.length,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        data: users
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private/Admin or Own Profile
router.get('/:id', protect, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check if user is accessing their own profile or is admin
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only view your own profile.'
      });
    }

    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
          profile: user.profile,
          preferences: user.preferences,
          bmi: user.bmi,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get user statistics
// @route   GET /api/v1/users/:id/stats
// @access  Private/Own Profile or Admin
router.get('/:id/stats', protect, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check permissions
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get date ranges
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get health data statistics
    const totalHealthEntries = await HealthData.countDocuments({ user: userId });
    const recentHealthEntries = await HealthData.countDocuments({
      user: userId,
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get goal statistics
    const totalGoals = await Goal.countDocuments({ user: userId });
    const activeGoals = await Goal.countDocuments({ user: userId, status: 'active' });
    const completedGoals = await Goal.countDocuments({ user: userId, status: 'completed' });

    // Get workout statistics
    const totalWorkouts = await Workout.countDocuments({ user: userId });
    const recentWorkouts = await Workout.countDocuments({
      user: userId,
      date: { $gte: sevenDaysAgo }
    });

    // Get workout stats for last 30 days
    const workoutStats = await Workout.aggregate([
      {
        $match: {
          user: user._id,
          date: { $gte: thirtyDaysAgo },
          completionStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$summary.caloriesBurned' },
          avgDuration: { $avg: '$duration' },
          workoutCount: { $sum: 1 }
        }
      }
    ]);

    // Get latest health data
    const latestHealthData = await HealthData.findOne({ user: userId })
      .sort({ date: -1 })
      .select('date metrics');

    // Calculate streaks
    const healthDataStreak = await calculateHealthDataStreak(userId);
    const workoutStreak = await calculateWorkoutStreak(userId);

    const stats = {
      overview: {
        memberSince: user.createdAt,
        lastLogin: user.lastLogin,
        totalHealthEntries,
        recentHealthEntries,
        healthDataStreak
      },
      goals: {
        total: totalGoals,
        active: activeGoals,
        completed: completedGoals,
        completionRate: totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0
      },
      workouts: {
        total: totalWorkouts,
        recent: recentWorkouts,
        streak: workoutStreak,
        last30Days: workoutStats[0] || {
          totalDuration: 0,
          totalCalories: 0,
          avgDuration: 0,
          workoutCount: 0
        }
      },
      health: {
        latestEntry: latestHealthData,
        bmi: user.bmi
      }
    };

    debug(`User stats retrieved for: ${user.email}`);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user (admin only)
// @route   PUT /api/v1/users/:id
// @access  Private/Admin
router.put('/:id',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      debug(`User updated by admin: ${user.email}`);

      res.json({
        success: true,
        message: 'User updated successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Delete user (admin only)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
router.delete('/:id',
  protect,
  authorize('admin'),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Soft delete - deactivate user instead of removing
      user.isActive = false;
      await user.save();

      debug(`User deactivated by admin: ${user.email}`);

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get user activity feed
// @route   GET /api/v1/users/:id/activity
// @access  Private/Own Profile or Admin
router.get('/:id/activity', protect, async (req, res, next) => {
  try {
    const userId = req.params.id;

    // Check permissions
    if (userId !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    const { limit = 20, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Get recent activities
    const activities = [];

    // Recent health data entries
    const recentHealthData = await HealthData.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('date metrics createdAt');

    recentHealthData.forEach(entry => {
      activities.push({
        type: 'health_data',
        action: 'created',
        data: entry,
        timestamp: entry.createdAt
      });
    });

    // Recent workouts
    const recentWorkouts = await Workout.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name type date duration completionStatus createdAt');

    recentWorkouts.forEach(workout => {
      activities.push({
        type: 'workout',
        action: workout.completionStatus === 'completed' ? 'completed' : 'created',
        data: workout,
        timestamp: workout.createdAt
      });
    });

    // Recent goals
    const recentGoals = await Goal.find({ user: userId })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('title status progress createdAt updatedAt');

    recentGoals.forEach(goal => {
      activities.push({
        type: 'goal',
        action: goal.status === 'completed' ? 'completed' : 'updated',
        data: goal,
        timestamp: goal.updatedAt
      });
    });

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Apply pagination
    const paginatedActivities = activities.slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      count: paginatedActivities.length,
      total: activities.length,
      data: paginatedActivities
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to calculate health data streak
async function calculateHealthDataStreak(userId) {
  const entries = await HealthData.find({ user: userId })
    .sort({ date: -1 })
    .select('date');

  if (entries.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  for (const entry of entries) {
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((currentDate - entryDate) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

// Helper function to calculate workout streak
async function calculateWorkoutStreak(userId) {
  const workouts = await Workout.find({
    user: userId,
    completionStatus: 'completed'
  })
    .sort({ date: -1 })
    .select('date');

  if (workouts.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const workoutDates = [...new Set(workouts.map(w => 
    new Date(w.date).toDateString()
  ))];

  for (const dateStr of workoutDates) {
    const workoutDate = new Date(dateStr);
    const diffDays = Math.floor((currentDate - workoutDate) / (1000 * 60 * 60 * 24));

    if (diffDays === streak) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (diffDays > streak) {
      break;
    }
  }

  return streak;
}

module.exports = router;