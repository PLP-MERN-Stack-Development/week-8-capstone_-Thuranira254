const mongoose = require('mongoose');

const healthDataSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    index: true
  },
  metrics: {
    weight: {
      value: {
        type: Number,
        min: [20, 'Weight must be at least 20'],
        max: [1000, 'Weight must be less than 1000']
      },
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      },
      recordedAt: Date
    },
    steps: {
      value: {
        type: Number,
        min: [0, 'Steps cannot be negative'],
        max: [100000, 'Steps must be less than 100,000']
      },
      recordedAt: Date
    },
    calories: {
      burned: {
        type: Number,
        min: [0, 'Calories burned cannot be negative'],
        max: [10000, 'Calories burned must be less than 10,000']
      },
      consumed: {
        type: Number,
        min: [0, 'Calories consumed cannot be negative'],
        max: [10000, 'Calories consumed must be less than 10,000']
      },
      recordedAt: Date
    },
    sleep: {
      duration: {
        type: Number,
        min: [0, 'Sleep duration cannot be negative'],
        max: [24, 'Sleep duration must be less than 24 hours']
      },
      quality: {
        type: Number,
        min: [1, 'Sleep quality must be between 1-10'],
        max: [10, 'Sleep quality must be between 1-10']
      },
      bedTime: Date,
      wakeTime: Date,
      recordedAt: Date
    },
    heartRate: {
      resting: {
        type: Number,
        min: [30, 'Resting heart rate must be at least 30'],
        max: [200, 'Resting heart rate must be less than 200']
      },
      average: {
        type: Number,
        min: [30, 'Average heart rate must be at least 30'],
        max: [220, 'Average heart rate must be less than 220']
      },
      max: {
        type: Number,
        min: [50, 'Max heart rate must be at least 50'],
        max: [250, 'Max heart rate must be less than 250']
      },
      recordedAt: Date
    },
    bloodPressure: {
      systolic: {
        type: Number,
        min: [70, 'Systolic pressure must be at least 70'],
        max: [250, 'Systolic pressure must be less than 250']
      },
      diastolic: {
        type: Number,
        min: [40, 'Diastolic pressure must be at least 40'],
        max: [150, 'Diastolic pressure must be less than 150']
      },
      recordedAt: Date
    },
    hydration: {
      intake: {
        type: Number,
        min: [0, 'Water intake cannot be negative'],
        max: [20, 'Water intake must be less than 20 liters']
      },
      unit: {
        type: String,
        enum: ['liters', 'cups', 'ml'],
        default: 'liters'
      },
      recordedAt: Date
    },
    mood: {
      rating: {
        type: Number,
        min: [1, 'Mood rating must be between 1-10'],
        max: [10, 'Mood rating must be between 1-10']
      },
      notes: {
        type: String,
        maxlength: [500, 'Mood notes cannot exceed 500 characters']
      },
      recordedAt: Date
    },
    energy: {
      level: {
        type: Number,
        min: [1, 'Energy level must be between 1-10'],
        max: [10, 'Energy level must be between 1-10']
      },
      recordedAt: Date
    }
  },
  workouts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workout'
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  tags: [String],
  isManualEntry: {
    type: Boolean,
    default: true
  },
  deviceData: {
    deviceId: String,
    deviceType: String,
    syncedAt: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes
healthDataSchema.index({ user: 1, date: -1 });
healthDataSchema.index({ user: 1, createdAt: -1 });
healthDataSchema.index({ date: -1 });

// Ensure one entry per user per date
healthDataSchema.index({ user: 1, date: 1 }, { unique: true });

// Virtual for calories net (consumed - burned)
healthDataSchema.virtual('caloriesNet').get(function() {
  const consumed = this.metrics.calories?.consumed || 0;
  const burned = this.metrics.calories?.burned || 0;
  return consumed - burned;
});

// Virtual for sleep efficiency
healthDataSchema.virtual('sleepEfficiency').get(function() {
  if (this.metrics.sleep?.bedTime && this.metrics.sleep?.wakeTime && this.metrics.sleep?.duration) {
    const bedTime = new Date(this.metrics.sleep.bedTime);
    const wakeTime = new Date(this.metrics.sleep.wakeTime);
    const timeInBed = (wakeTime - bedTime) / (1000 * 60 * 60); // hours
    const sleepDuration = this.metrics.sleep.duration;
    
    return Math.round((sleepDuration / timeInBed) * 100);
  }
  return null;
});

// Pre-save middleware to set recordedAt timestamps
healthDataSchema.pre('save', function(next) {
  const now = new Date();
  
  // Set recordedAt for each metric that has data
  Object.keys(this.metrics).forEach(metricKey => {
    const metric = this.metrics[metricKey];
    if (metric && typeof metric === 'object' && !metric.recordedAt) {
      metric.recordedAt = now;
    }
  });
  
  next();
});

// Static method to get user's health data for a date range
healthDataSchema.statics.getHealthDataByDateRange = function(userId, startDate, endDate) {
  return this.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 }).populate('workouts');
};

// Static method to get latest health data for user
healthDataSchema.statics.getLatestHealthData = function(userId, limit = 10) {
  return this.find({ user: userId })
    .sort({ date: -1 })
    .limit(limit)
    .populate('workouts');
};

// Instance method to calculate daily summary
healthDataSchema.methods.getDailySummary = function() {
  const summary = {
    date: this.date,
    completedMetrics: 0,
    totalMetrics: 0
  };
  
  // Count completed metrics
  Object.keys(this.metrics).forEach(metricKey => {
    const metric = this.metrics[metricKey];
    summary.totalMetrics++;
    
    if (metric && typeof metric === 'object') {
      const hasValue = Object.keys(metric).some(key => 
        key !== 'recordedAt' && key !== 'unit' && metric[key] != null
      );
      if (hasValue) summary.completedMetrics++;
    }
  });
  
  summary.completionRate = summary.totalMetrics > 0 
    ? Math.round((summary.completedMetrics / summary.totalMetrics) * 100) 
    : 0;
  
  return summary;
};

module.exports = mongoose.model('HealthData', healthDataSchema);