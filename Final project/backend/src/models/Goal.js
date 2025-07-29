const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Goal title is required'],
    trim: true,
    maxlength: [100, 'Goal title cannot exceed 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Goal description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Goal category is required'],
    enum: [
      'weight-loss',
      'weight-gain',
      'muscle-gain',
      'endurance',
      'strength',
      'flexibility',
      'nutrition',
      'sleep',
      'steps',
      'hydration',
      'general-health',
      'custom'
    ]
  },
  type: {
    type: String,
    required: [true, 'Goal type is required'],
    enum: ['target', 'habit', 'milestone']
  },
  target: {
    metric: {
      type: String,
      required: function() { return this.type === 'target'; },
      enum: [
        'weight',
        'steps',
        'calories-burned',
        'calories-consumed',
        'sleep-duration',
        'water-intake',
        'workout-frequency',
        'heart-rate',
        'blood-pressure',
        'custom'
      ]
    },
    value: {
      type: Number,
      required: function() { return this.type === 'target'; },
      min: [0, 'Target value must be positive']
    },
    unit: {
      type: String,
      required: function() { return this.type === 'target'; }
    },
    operator: {
      type: String,
      enum: ['>=', '<=', '=', 'between'],
      default: '>='
    },
    rangeMax: {
      type: Number,
      required: function() { return this.target?.operator === 'between'; }
    }
  },
  timeframe: {
    type: {
      type: String,
      required: [true, 'Timeframe type is required'],
      enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom', 'ongoing']
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      default: Date.now
    },
    endDate: {
      type: Date,
      required: function() { return this.timeframe?.type !== 'ongoing'; }
    },
    duration: {
      value: Number,
      unit: {
        type: String,
        enum: ['days', 'weeks', 'months', 'years']
      }
    }
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled', 'failed'],
    default: 'active'
  },
  progress: {
    current: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    },
    milestones: [{
      value: Number,
      achievedAt: Date,
      note: String
    }]
  },
  reminders: {
    enabled: {
      type: Boolean,
      default: false
    },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'custom'],
      default: 'daily'
    },
    time: {
      type: String, // Format: "HH:MM"
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format']
    },
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    message: {
      type: String,
      maxlength: [200, 'Reminder message cannot exceed 200 characters']
    }
  },
  rewards: [{
    milestone: Number,
    description: String,
    claimed: {
      type: Boolean,
      default: false
    },
    claimedAt: Date
  }],
  tags: [String],
  isPublic: {
    type: Boolean,
    default: false
  },
  completedAt: Date,
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, category: 1 });
goalSchema.index({ user: 1, createdAt: -1 });
goalSchema.index({ 'timeframe.endDate': 1, status: 1 });

// Virtual for days remaining
goalSchema.virtual('daysRemaining').get(function() {
  if (this.timeframe.type === 'ongoing' || !this.timeframe.endDate) {
    return null;
  }
  
  const now = new Date();
  const endDate = new Date(this.timeframe.endDate);
  const diffTime = endDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for total duration in days
goalSchema.virtual('totalDurationDays').get(function() {
  if (this.timeframe.type === 'ongoing') {
    return null;
  }
  
  const startDate = new Date(this.timeframe.startDate);
  const endDate = new Date(this.timeframe.endDate);
  const diffTime = endDate - startDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

// Virtual for is overdue
goalSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed' || this.timeframe.type === 'ongoing') {
    return false;
  }
  
  return this.timeframe.endDate && new Date() > new Date(this.timeframe.endDate);
});

// Pre-save middleware to update progress percentage
goalSchema.pre('save', function(next) {
  if (this.type === 'target' && this.target.value && this.progress.current !== undefined) {
    this.progress.percentage = Math.min(
      Math.round((this.progress.current / this.target.value) * 100),
      100
    );
    
    // Auto-complete goal if target is reached
    if (this.progress.percentage >= 100 && this.status === 'active') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  this.progress.lastUpdated = new Date();
  next();
});

// Static method to get active goals for user
goalSchema.statics.getActiveGoals = function(userId) {
  return this.find({
    user: userId,
    status: 'active'
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get goals by category
goalSchema.statics.getGoalsByCategory = function(userId, category) {
  return this.find({
    user: userId,
    category: category
  }).sort({ createdAt: -1 });
};

// Instance method to update progress
goalSchema.methods.updateProgress = function(newValue, note = null) {
  this.progress.current = newValue;
  this.progress.lastUpdated = new Date();
  
  // Add milestone if it's a significant achievement
  if (note || newValue % 10 === 0) { // Every 10th unit or when there's a note
    this.progress.milestones.push({
      value: newValue,
      achievedAt: new Date(),
      note: note
    });
  }
  
  return this.save();
};

// Instance method to complete goal
goalSchema.methods.complete = function(note = null) {
  this.status = 'completed';
  this.completedAt = new Date();
  this.progress.percentage = 100;
  
  if (note) {
    this.notes = this.notes ? `${this.notes}\n\nCompleted: ${note}` : `Completed: ${note}`;
  }
  
  return this.save();
};

// Instance method to pause goal
goalSchema.methods.pause = function(reason = null) {
  this.status = 'paused';
  
  if (reason) {
    this.notes = this.notes ? `${this.notes}\n\nPaused: ${reason}` : `Paused: ${reason}`;
  }
  
  return this.save();
};

// Instance method to resume goal
goalSchema.methods.resume = function() {
  this.status = 'active';
  return this.save();
};

module.exports = mongoose.model('Goal', goalSchema);