const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Exercise name is required'],
    trim: true
  },
  category: {
    type: String,
    enum: [
      'cardio',
      'strength',
      'flexibility',
      'balance',
      'sports',
      'functional',
      'rehabilitation',
      'other'
    ],
    default: 'other'
  },
  muscleGroups: [{
    type: String,
    enum: [
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'obliques', 'lower-back', 'glutes', 'quadriceps',
      'hamstrings', 'calves', 'full-body', 'cardio'
    ]
  }],
  sets: [{
    reps: {
      type: Number,
      min: [0, 'Reps cannot be negative']
    },
    weight: {
      value: {
        type: Number,
        min: [0, 'Weight cannot be negative']
      },
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      }
    },
    duration: {
      type: Number, // in seconds
      min: [0, 'Duration cannot be negative']
    },
    distance: {
      value: {
        type: Number,
        min: [0, 'Distance cannot be negative']
      },
      unit: {
        type: String,
        enum: ['km', 'miles', 'm', 'ft'],
        default: 'km'
      }
    },
    restTime: {
      type: Number, // in seconds
      min: [0, 'Rest time cannot be negative']
    },
    notes: String
  }],
  totalDuration: {
    type: Number, // in seconds
    min: [0, 'Duration cannot be negative']
  },
  caloriesBurned: {
    type: Number,
    min: [0, 'Calories burned cannot be negative']
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  notes: {
    type: String,
    maxlength: [500, 'Exercise notes cannot exceed 500 characters']
  }
});

const workoutSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Workout name is required'],
    trim: true,
    maxlength: [100, 'Workout name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Workout type is required'],
    enum: [
      'strength-training',
      'cardio',
      'hiit',
      'yoga',
      'pilates',
      'crossfit',
      'running',
      'cycling',
      'swimming',
      'sports',
      'flexibility',
      'rehabilitation',
      'custom'
    ]
  },
  date: {
    type: Date,
    required: [true, 'Workout date is required'],
    index: true
  },
  startTime: {
    type: Date,
    required: [true, 'Start time is required']
  },
  endTime: Date,
  duration: {
    type: Number, // in minutes
    min: [0, 'Duration cannot be negative']
  },
  exercises: [exerciseSchema],
  summary: {
    totalSets: {
      type: Number,
      default: 0
    },
    totalReps: {
      type: Number,
      default: 0
    },
    totalWeight: {
      value: {
        type: Number,
        default: 0
      },
      unit: {
        type: String,
        enum: ['kg', 'lbs'],
        default: 'kg'
      }
    },
    totalDistance: {
      value: {
        type: Number,
        default: 0
      },
      unit: {
        type: String,
        enum: ['km', 'miles'],
        default: 'km'
      }
    },
    caloriesBurned: {
      type: Number,
      default: 0,
      min: [0, 'Calories burned cannot be negative']
    },
    averageHeartRate: {
      type: Number,
      min: [30, 'Heart rate must be at least 30'],
      max: [220, 'Heart rate must be less than 220']
    },
    maxHeartRate: {
      type: Number,
      min: [30, 'Heart rate must be at least 30'],
      max: [250, 'Heart rate must be less than 250']
    }
  },
  intensity: {
    type: String,
    enum: ['low', 'moderate', 'high', 'very-high'],
    default: 'moderate'
  },
  mood: {
    before: {
      type: Number,
      min: [1, 'Mood rating must be between 1-10'],
      max: [10, 'Mood rating must be between 1-10']
    },
    after: {
      type: Number,
      min: [1, 'Mood rating must be between 1-10'],
      max: [10, 'Mood rating must be between 1-10']
    }
  },
  energy: {
    before: {
      type: Number,
      min: [1, 'Energy level must be between 1-10'],
      max: [10, 'Energy level must be between 1-10']
    },
    after: {
      type: Number,
      min: [1, 'Energy level must be between 1-10'],
      max: [10, 'Energy level must be between 1-10']
    }
  },
  location: {
    type: String,
    enum: ['home', 'gym', 'outdoor', 'studio', 'pool', 'track', 'other'],
    default: 'gym'
  },
  weather: {
    condition: String,
    temperature: Number,
    humidity: Number
  },
  equipment: [String],
  tags: [String],
  notes: {
    type: String,
    maxlength: [1000, 'Workout notes cannot exceed 1000 characters']
  },
  isTemplate: {
    type: Boolean,
    default: false
  },
  templateName: String,
  isPublic: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: [1, 'Rating must be between 1-5'],
    max: [5, 'Rating must be between 1-5']
  },
  photos: [String], // URLs to workout photos
  completionStatus: {
    type: String,
    enum: ['planned', 'in-progress', 'completed', 'skipped'],
    default: 'planned'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
workoutSchema.index({ user: 1, date: -1 });
workoutSchema.index({ user: 1, type: 1 });
workoutSchema.index({ user: 1, completionStatus: 1 });
workoutSchema.index({ date: -1 });
workoutSchema.index({ isTemplate: 1 });

// Virtual for workout duration in minutes
workoutSchema.virtual('durationMinutes').get(function() {
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  return this.duration || 0;
});

// Virtual for total volume (sets × reps × weight)
workoutSchema.virtual('totalVolume').get(function() {
  let volume = 0;
  this.exercises.forEach(exercise => {
    exercise.sets.forEach(set => {
      if (set.reps && set.weight?.value) {
        volume += set.reps * set.weight.value;
      }
    });
  });
  return volume;
});

// Virtual for muscle groups worked
workoutSchema.virtual('muscleGroupsWorked').get(function() {
  const muscleGroups = new Set();
  this.exercises.forEach(exercise => {
    exercise.muscleGroups.forEach(group => muscleGroups.add(group));
  });
  return Array.from(muscleGroups);
});

// Pre-save middleware to calculate summary statistics
workoutSchema.pre('save', function(next) {
  // Calculate duration if endTime is set
  if (this.endTime && this.startTime && !this.duration) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  
  // Calculate summary statistics
  let totalSets = 0;
  let totalReps = 0;
  let totalWeight = 0;
  let totalDistance = 0;
  let totalCalories = 0;
  
  this.exercises.forEach(exercise => {
    totalSets += exercise.sets.length;
    
    exercise.sets.forEach(set => {
      if (set.reps) totalReps += set.reps;
      if (set.weight?.value) totalWeight += set.weight.value;
      if (set.distance?.value) totalDistance += set.distance.value;
    });
    
    if (exercise.caloriesBurned) totalCalories += exercise.caloriesBurned;
  });
  
  this.summary.totalSets = totalSets;
  this.summary.totalReps = totalReps;
  this.summary.totalWeight.value = totalWeight;
  this.summary.totalDistance.value = totalDistance;
  this.summary.caloriesBurned = totalCalories;
  
  next();
});

// Static method to get workouts by date range
workoutSchema.statics.getWorkoutsByDateRange = function(userId, startDate, endDate) {
  return this.find({
    user: userId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  }).sort({ date: -1 });
};

// Static method to get workout templates
workoutSchema.statics.getTemplates = function(userId) {
  return this.find({
    $or: [
      { user: userId, isTemplate: true },
      { isTemplate: true, isPublic: true }
    ]
  }).sort({ templateName: 1 });
};

// Static method to get workout statistics
workoutSchema.statics.getWorkoutStats = function(userId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        date: { $gte: startDate },
        completionStatus: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalWorkouts: { $sum: 1 },
        totalDuration: { $sum: '$duration' },
        totalCalories: { $sum: '$summary.caloriesBurned' },
        avgDuration: { $avg: '$duration' },
        avgCalories: { $avg: '$summary.caloriesBurned' },
        workoutTypes: { $addToSet: '$type' }
      }
    }
  ]);
};

// Instance method to complete workout
workoutSchema.methods.complete = function() {
  this.completionStatus = 'completed';
  this.endTime = this.endTime || new Date();
  return this.save();
};

// Instance method to start workout
workoutSchema.methods.start = function() {
  this.completionStatus = 'in-progress';
  this.startTime = this.startTime || new Date();
  return this.save();
};

// Instance method to create template from workout
workoutSchema.methods.createTemplate = function(templateName) {
  const template = this.toObject();
  delete template._id;
  delete template.createdAt;
  delete template.updatedAt;
  delete template.date;
  delete template.startTime;
  delete template.endTime;
  delete template.duration;
  
  template.isTemplate = true;
  template.templateName = templateName;
  template.completionStatus = 'planned';
  
  return new this.constructor(template);
};

module.exports = mongoose.model('Workout', workoutSchema);