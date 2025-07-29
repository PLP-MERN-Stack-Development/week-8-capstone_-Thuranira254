const express = require('express');
const HealthData = require('../models/HealthData');
const { protect, checkOwnership } = require('../middleware/auth');
const { validate, healthDataSchemas, querySchemas } = require('../middleware/validation');
const { sendToUser } = require('../socket/socketHandler');
const debug = require('debug')('lifefit:health-data');

const router = express.Router();

// @desc    Get all health data for user
// @route   GET /api/v1/health-data
// @access  Private
router.get('/',
  protect,
  validate(querySchemas.healthDataQuery, 'query'),
  async (req, res, next) => {
    try {
      const { startDate, endDate, metrics, tags, page, limit, sort } = req.query;
      const skip = (page - 1) * limit;

      // Build query
      let query = { user: req.user._id };

      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate);
        if (endDate) query.date.$lte = new Date(endDate);
      }

      // Tags filter
      if (tags) {
        query.tags = { $in: tags.split(',') };
      }

      // Build aggregation pipeline
      let pipeline = [
        { $match: query },
        { $sort: { [sort.replace('-', '')]: sort.startsWith('-') ? -1 : 1 } },
        { $skip: skip },
        { $limit: parseInt(limit) }
      ];

      // Metrics filter (project only requested metrics)
      if (metrics) {
        const requestedMetrics = metrics.split(',');
        const projection = {
          user: 1,
          date: 1,
          notes: 1,
          tags: 1,
          createdAt: 1,
          updatedAt: 1
        };

        requestedMetrics.forEach(metric => {
          projection[`metrics.${metric}`] = 1;
        });

        pipeline.push({ $project: projection });
      }

      const healthData = await HealthData.aggregate(pipeline);
      const total = await HealthData.countDocuments(query);

      // Calculate summary statistics
      const summaryPipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            avgWeight: { $avg: '$metrics.weight.value' },
            avgSteps: { $avg: '$metrics.steps.value' },
            avgSleep: { $avg: '$metrics.sleep.duration' },
            avgCaloriesBurned: { $avg: '$metrics.calories.burned' },
            avgCaloriesConsumed: { $avg: '$metrics.calories.consumed' },
            totalEntries: { $sum: 1 }
          }
        }
      ];

      const summary = await HealthData.aggregate(summaryPipeline);

      res.json({
        success: true,
        count: healthData.length,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: summary[0] || {},
        data: healthData
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get health data by ID
// @route   GET /api/v1/health-data/:id
// @access  Private
router.get('/:id',
  protect,
  checkOwnership(HealthData),
  async (req, res, next) => {
    try {
      const healthData = await HealthData.findById(req.params.id)
        .populate('workouts', 'name type duration summary');

      res.json({
        success: true,
        data: healthData
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Create health data entry
// @route   POST /api/v1/health-data
// @access  Private
router.post('/',
  protect,
  validate(healthDataSchemas.create),
  async (req, res, next) => {
    try {
      const healthData = await HealthData.create({
        ...req.body,
        user: req.user._id
      });

      await healthData.populate('workouts', 'name type duration summary');

      // Send real-time update
      sendToUser(req.user._id.toString(), 'health-data:created', {
        id: healthData._id,
        date: healthData.date,
        metrics: healthData.metrics
      });

      debug(`Health data created for user: ${req.user.email}`);

      res.status(201).json({
        success: true,
        message: 'Health data created successfully',
        data: healthData
      });
    } catch (error) {
      // Handle duplicate key error (one entry per user per date)
      if (error.code === 11000) {
        return res.status(400).json({
          success: false,
          error: 'Health data already exists for this date. Use PUT to update existing entry.'
        });
      }
      next(error);
    }
  }
);

// @desc    Update health data entry
// @route   PUT /api/v1/health-data/:id
// @access  Private
router.put('/:id',
  protect,
  checkOwnership(HealthData),
  validate(healthDataSchemas.update),
  async (req, res, next) => {
    try {
      const healthData = await HealthData.findByIdAndUpdate(
        req.params.id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      ).populate('workouts', 'name type duration summary');

      // Send real-time update
      sendToUser(req.user._id.toString(), 'health-data:updated', {
        id: healthData._id,
        date: healthData.date,
        metrics: healthData.metrics
      });

      debug(`Health data updated for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Health data updated successfully',
        data: healthData
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Delete health data entry
// @route   DELETE /api/v1/health-data/:id
// @access  Private
router.delete('/:id',
  protect,
  checkOwnership(HealthData),
  async (req, res, next) => {
    try {
      await HealthData.findByIdAndDelete(req.params.id);

      // Send real-time update
      sendToUser(req.user._id.toString(), 'health-data:deleted', {
        id: req.params.id
      });

      debug(`Health data deleted for user: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Health data deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get health data by date
// @route   GET /api/v1/health-data/date/:date
// @access  Private
router.get('/date/:date', protect, async (req, res, next) => {
  try {
    const date = new Date(req.params.date);
    
    // Validate date
    if (isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const healthData = await HealthData.findOne({
      user: req.user._id,
      date: date
    }).populate('workouts', 'name type duration summary');

    if (!healthData) {
      return res.status(404).json({
        success: false,
        error: 'No health data found for this date'
      });
    }

    res.json({
      success: true,
      data: healthData
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get health data analytics
// @route   GET /api/v1/health-data/analytics/summary
// @access  Private
router.get('/analytics/summary', protect, async (req, res, next) => {
  try {
    const { period = 'month', metric = 'all' } = req.query;
    
    // Calculate date range based on period
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

    // Build aggregation pipeline
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
          totalEntries: { $sum: 1 },
          avgWeight: { $avg: '$metrics.weight.value' },
          minWeight: { $min: '$metrics.weight.value' },
          maxWeight: { $max: '$metrics.weight.value' },
          avgSteps: { $avg: '$metrics.steps.value' },
          totalSteps: { $sum: '$metrics.steps.value' },
          maxSteps: { $max: '$metrics.steps.value' },
          avgSleep: { $avg: '$metrics.sleep.duration' },
          totalSleep: { $sum: '$metrics.sleep.duration' },
          avgSleepQuality: { $avg: '$metrics.sleep.quality' },
          avgCaloriesBurned: { $avg: '$metrics.calories.burned' },
          totalCaloriesBurned: { $sum: '$metrics.calories.burned' },
          avgCaloriesConsumed: { $avg: '$metrics.calories.consumed' },
          totalCaloriesConsumed: { $sum: '$metrics.calories.consumed' },
          avgHeartRate: { $avg: '$metrics.heartRate.resting' },
          avgMood: { $avg: '$metrics.mood.rating' },
          avgEnergy: { $avg: '$metrics.energy.level' },
          avgHydration: { $avg: '$metrics.hydration.intake' }
        }
      }
    ];

    const analytics = await HealthData.aggregate(pipeline);
    
    // Get trend data (daily averages)
    const trendPipeline = [
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: now }
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
          weight: { $avg: '$metrics.weight.value' },
          steps: { $avg: '$metrics.steps.value' },
          sleep: { $avg: '$metrics.sleep.duration' },
          caloriesBurned: { $avg: '$metrics.calories.burned' },
          caloriesConsumed: { $avg: '$metrics.calories.consumed' },
          mood: { $avg: '$metrics.mood.rating' },
          energy: { $avg: '$metrics.energy.level' }
        }
      },
      { $sort: { date: 1 } }
    ];

    const trends = await HealthData.aggregate(trendPipeline);

    res.json({
      success: true,
      data: {
        period,
        dateRange: { startDate, endDate: now },
        summary: analytics[0] || {},
        trends: trends
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Get health data insights
// @route   GET /api/v1/health-data/analytics/insights
// @access  Private
router.get('/analytics/insights', protect, async (req, res, next) => {
  try {
    const userId = req.user._id;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get recent data for analysis
    const recentData = await HealthData.find({
      user: userId,
      date: { $gte: thirtyDaysAgo }
    }).sort({ date: 1 });

    if (recentData.length === 0) {
      return res.json({
        success: true,
        data: {
          insights: ['Start tracking your health data to get personalized insights!'],
          recommendations: ['Begin by logging your daily activities, sleep, and nutrition.']
        }
      });
    }

    const insights = [];
    const recommendations = [];

    // Analyze sleep patterns
    const sleepData = recentData
      .map(d => d.metrics.sleep?.duration)
      .filter(s => s != null);
    
    if (sleepData.length > 0) {
      const avgSleep = sleepData.reduce((sum, s) => sum + s, 0) / sleepData.length;
      
      if (avgSleep < 7) {
        insights.push(`Your average sleep duration is ${avgSleep.toFixed(1)} hours, which is below the recommended 7-9 hours.`);
        recommendations.push('Try to establish a consistent bedtime routine and aim for 7-9 hours of sleep per night.');
      } else if (avgSleep > 9) {
        insights.push(`You're getting ${avgSleep.toFixed(1)} hours of sleep on average, which might be more than needed.`);
        recommendations.push('Consider evaluating your sleep quality and daily energy levels.');
      } else {
        insights.push(`Great job! You're averaging ${avgSleep.toFixed(1)} hours of sleep, which is within the healthy range.`);
      }
    }

    // Analyze step patterns
    const stepsData = recentData
      .map(d => d.metrics.steps?.value)
      .filter(s => s != null);
    
    if (stepsData.length > 0) {
      const avgSteps = stepsData.reduce((sum, s) => sum + s, 0) / stepsData.length;
      
      if (avgSteps < 8000) {
        insights.push(`Your daily step average is ${Math.round(avgSteps)} steps. The recommended goal is 8,000-10,000 steps per day.`);
        recommendations.push('Try to incorporate more walking into your daily routine, such as taking stairs or walking during breaks.');
      } else {
        insights.push(`Excellent! You're averaging ${Math.round(avgSteps)} steps per day, which meets or exceeds health recommendations.`);
      }
    }

    // Analyze weight trends
    const weightData = recentData
      .map(d => d.metrics.weight?.value)
      .filter(w => w != null);
    
    if (weightData.length > 5) {
      const firstWeight = weightData[0];
      const lastWeight = weightData[weightData.length - 1];
      const weightChange = lastWeight - firstWeight;
      
      if (Math.abs(weightChange) > 0.5) {
        const direction = weightChange > 0 ? 'gained' : 'lost';
        insights.push(`You've ${direction} ${Math.abs(weightChange).toFixed(1)} lbs over the past month.`);
        
        if (Math.abs(weightChange) > 4) {
          recommendations.push('Significant weight changes should be discussed with a healthcare provider.');
        }
      } else {
        insights.push('Your weight has remained stable over the past month.');
      }
    }

    // Analyze mood and energy correlation
    const moodEnergyData = recentData
      .map(d => ({
        mood: d.metrics.mood?.rating,
        energy: d.metrics.energy?.level,
        sleep: d.metrics.sleep?.duration
      }))
      .filter(d => d.mood != null && d.energy != null);
    
    if (moodEnergyData.length > 10) {
      const avgMood = moodEnergyData.reduce((sum, d) => sum + d.mood, 0) / moodEnergyData.length;
      const avgEnergy = moodEnergyData.reduce((sum, d) => sum + d.energy, 0) / moodEnergyData.length;
      
      if (avgMood < 6 || avgEnergy < 6) {
        insights.push('Your mood and energy levels have been below average recently.');
        recommendations.push('Consider factors like sleep quality, nutrition, and stress levels that might be affecting your wellbeing.');
      }
    }

    // Data consistency insights
    const consistencyScore = (recentData.length / 30) * 100;
    if (consistencyScore < 50) {
      recommendations.push('Try to log your health data more consistently to get better insights and track your progress.');
    } else if (consistencyScore > 80) {
      insights.push('Great job maintaining consistent health tracking! This helps identify patterns and trends.');
    }

    res.json({
      success: true,
      data: {
        insights: insights.length > 0 ? insights : ['Keep tracking your data to generate insights!'],
        recommendations: recommendations.length > 0 ? recommendations : ['Continue your healthy habits!'],
        dataPoints: recentData.length,
        analysisPeriod: '30 days'
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Bulk create/update health data
// @route   POST /api/v1/health-data/bulk
// @access  Private
router.post('/bulk', protect, async (req, res, next) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Entries array is required and must not be empty'
      });
    }

    if (entries.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 entries allowed per bulk operation'
      });
    }

    const results = {
      created: 0,
      updated: 0,
      errors: []
    };

    for (let i = 0; i < entries.length; i++) {
      try {
        const entry = { ...entries[i], user: req.user._id };
        
        // Try to find existing entry for the date
        const existingEntry = await HealthData.findOne({
          user: req.user._id,
          date: entry.date
        });

        if (existingEntry) {
          // Update existing entry
          await HealthData.findByIdAndUpdate(existingEntry._id, entry, {
            runValidators: true
          });
          results.updated++;
        } else {
          // Create new entry
          await HealthData.create(entry);
          results.created++;
        }
      } catch (error) {
        results.errors.push({
          index: i,
          entry: entries[i],
          error: error.message
        });
      }
    }

    debug(`Bulk health data operation for user: ${req.user.email} - Created: ${results.created}, Updated: ${results.updated}, Errors: ${results.errors.length}`);

    res.json({
      success: true,
      message: 'Bulk operation completed',
      data: results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;