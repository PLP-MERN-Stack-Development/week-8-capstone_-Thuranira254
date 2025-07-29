const Joi = require('joi');
const debug = require('debug')('lifefit:validation');

// Generic validation middleware
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      debug('Validation error:', errors);

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace the original data with validated and sanitized data
    req[property] = value;
    next();
  };
};

// Common validation schemas
const commonSchemas = {
  objectId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  email: Joi.string().email().lowercase().trim(),
  password: Joi.string().min(6).max(128),
  name: Joi.string().trim().min(1).max(50),
  date: Joi.date().iso(),
  positiveNumber: Joi.number().positive(),
  nonNegativeNumber: Joi.number().min(0),
  rating: Joi.number().min(1).max(10),
  phoneNumber: Joi.string().regex(/^\+?[\d\s\-\(\)]+$/).min(10).max(20)
};

// User validation schemas
const userSchemas = {
  register: Joi.object({
    name: commonSchemas.name.required(),
    email: commonSchemas.email.required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  }),

  login: Joi.object({
    email: commonSchemas.email.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    name: commonSchemas.name,
    profile: Joi.object({
      age: Joi.number().min(13).max(120),
      height: Joi.object({
        value: commonSchemas.positiveNumber,
        unit: Joi.string().valid('cm', 'ft')
      }),
      weight: Joi.object({
        value: commonSchemas.positiveNumber,
        unit: Joi.string().valid('kg', 'lbs')
      }),
      gender: Joi.string().valid('male', 'female', 'other', 'prefer-not-to-say'),
      activityLevel: Joi.string().valid('sedentary', 'light', 'moderate', 'active', 'very-active'),
      fitnessGoals: Joi.array().items(
        Joi.string().valid('weight-loss', 'weight-gain', 'muscle-gain', 'endurance', 'strength', 'general-health')
      ),
      medicalConditions: Joi.array().items(Joi.string().trim()),
      allergies: Joi.array().items(Joi.string().trim())
    }),
    preferences: Joi.object({
      units: Joi.object({
        weight: Joi.string().valid('kg', 'lbs'),
        distance: Joi.string().valid('km', 'miles'),
        temperature: Joi.string().valid('celsius', 'fahrenheit')
      }),
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        reminders: Joi.boolean(),
        weeklyReports: Joi.boolean()
      }),
      privacy: Joi.object({
        profileVisibility: Joi.string().valid('public', 'friends', 'private'),
        dataSharing: Joi.boolean()
      })
    })
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  }),

  forgotPassword: Joi.object({
    email: commonSchemas.email.required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: commonSchemas.password.required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required()
      .messages({ 'any.only': 'Passwords do not match' })
  })
};

// Health data validation schemas
const healthDataSchemas = {
  create: Joi.object({
    date: commonSchemas.date.required(),
    metrics: Joi.object({
      weight: Joi.object({
        value: Joi.number().min(20).max(1000),
        unit: Joi.string().valid('kg', 'lbs')
      }),
      steps: Joi.object({
        value: Joi.number().min(0).max(100000)
      }),
      calories: Joi.object({
        burned: Joi.number().min(0).max(10000),
        consumed: Joi.number().min(0).max(10000)
      }),
      sleep: Joi.object({
        duration: Joi.number().min(0).max(24),
        quality: commonSchemas.rating,
        bedTime: Joi.date(),
        wakeTime: Joi.date()
      }),
      heartRate: Joi.object({
        resting: Joi.number().min(30).max(200),
        average: Joi.number().min(30).max(220),
        max: Joi.number().min(50).max(250)
      }),
      bloodPressure: Joi.object({
        systolic: Joi.number().min(70).max(250),
        diastolic: Joi.number().min(40).max(150)
      }),
      hydration: Joi.object({
        intake: Joi.number().min(0).max(20),
        unit: Joi.string().valid('liters', 'cups', 'ml')
      }),
      mood: Joi.object({
        rating: commonSchemas.rating,
        notes: Joi.string().max(500)
      }),
      energy: Joi.object({
        level: commonSchemas.rating
      })
    }),
    notes: Joi.string().max(1000),
    tags: Joi.array().items(Joi.string().trim())
  }),

  update: Joi.object({
    metrics: Joi.object({
      weight: Joi.object({
        value: Joi.number().min(20).max(1000),
        unit: Joi.string().valid('kg', 'lbs')
      }),
      steps: Joi.object({
        value: Joi.number().min(0).max(100000)
      }),
      calories: Joi.object({
        burned: Joi.number().min(0).max(10000),
        consumed: Joi.number().min(0).max(10000)
      }),
      sleep: Joi.object({
        duration: Joi.number().min(0).max(24),
        quality: commonSchemas.rating,
        bedTime: Joi.date(),
        wakeTime: Joi.date()
      }),
      heartRate: Joi.object({
        resting: Joi.number().min(30).max(200),
        average: Joi.number().min(30).max(220),
        max: Joi.number().min(50).max(250)
      }),
      bloodPressure: Joi.object({
        systolic: Joi.number().min(70).max(250),
        diastolic: Joi.number().min(40).max(150)
      }),
      hydration: Joi.object({
        intake: Joi.number().min(0).max(20),
        unit: Joi.string().valid('liters', 'cups', 'ml')
      }),
      mood: Joi.object({
        rating: commonSchemas.rating,
        notes: Joi.string().max(500)
      }),
      energy: Joi.object({
        level: commonSchemas.rating
      })
    }),
    notes: Joi.string().max(1000),
    tags: Joi.array().items(Joi.string().trim())
  })
};

// Goal validation schemas
const goalSchemas = {
  create: Joi.object({
    title: Joi.string().trim().min(1).max(100).required(),
    description: Joi.string().max(500),
    category: Joi.string().valid(
      'weight-loss', 'weight-gain', 'muscle-gain', 'endurance', 'strength',
      'flexibility', 'nutrition', 'sleep', 'steps', 'hydration', 'general-health', 'custom'
    ).required(),
    type: Joi.string().valid('target', 'habit', 'milestone').required(),
    target: Joi.when('type', {
      is: 'target',
      then: Joi.object({
        metric: Joi.string().valid(
          'weight', 'steps', 'calories-burned', 'calories-consumed',
          'sleep-duration', 'water-intake', 'workout-frequency',
          'heart-rate', 'blood-pressure', 'custom'
        ).required(),
        value: commonSchemas.positiveNumber.required(),
        unit: Joi.string().required(),
        operator: Joi.string().valid('>=', '<=', '=', 'between'),
        rangeMax: Joi.when('operator', {
          is: 'between',
          then: commonSchemas.positiveNumber.required(),
          otherwise: Joi.forbidden()
        })
      }).required(),
      otherwise: Joi.forbidden()
    }),
    timeframe: Joi.object({
      type: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly', 'custom', 'ongoing').required(),
      startDate: commonSchemas.date,
      endDate: Joi.when('type', {
        is: 'ongoing',
        then: Joi.forbidden(),
        otherwise: commonSchemas.date.required()
      }),
      duration: Joi.object({
        value: commonSchemas.positiveNumber,
        unit: Joi.string().valid('days', 'weeks', 'months', 'years')
      })
    }).required(),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    reminders: Joi.object({
      enabled: Joi.boolean(),
      frequency: Joi.string().valid('daily', 'weekly', 'custom'),
      time: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      days: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      ),
      message: Joi.string().max(200)
    }),
    tags: Joi.array().items(Joi.string().trim()),
    isPublic: Joi.boolean()
  }),

  update: Joi.object({
    title: Joi.string().trim().min(1).max(100),
    description: Joi.string().max(500),
    priority: Joi.string().valid('low', 'medium', 'high', 'critical'),
    status: Joi.string().valid('active', 'paused', 'completed', 'cancelled', 'failed'),
    reminders: Joi.object({
      enabled: Joi.boolean(),
      frequency: Joi.string().valid('daily', 'weekly', 'custom'),
      time: Joi.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      days: Joi.array().items(
        Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')
      ),
      message: Joi.string().max(200)
    }),
    tags: Joi.array().items(Joi.string().trim()),
    isPublic: Joi.boolean(),
    notes: Joi.string().max(1000)
  }),

  updateProgress: Joi.object({
    value: commonSchemas.nonNegativeNumber.required(),
    note: Joi.string().max(200)
  })
};

// Workout validation schemas
const workoutSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(1).max(100).required(),
    type: Joi.string().valid(
      'strength-training', 'cardio', 'hiit', 'yoga', 'pilates', 'crossfit',
      'running', 'cycling', 'swimming', 'sports', 'flexibility', 'rehabilitation', 'custom'
    ).required(),
    date: commonSchemas.date.required(),
    startTime: Joi.date().required(),
    endTime: Joi.date().min(Joi.ref('startTime')),
    duration: commonSchemas.positiveNumber,
    exercises: Joi.array().items(
      Joi.object({
        name: Joi.string().trim().required(),
        category: Joi.string().valid(
          'cardio', 'strength', 'flexibility', 'balance', 'sports', 'functional', 'rehabilitation', 'other'
        ),
        muscleGroups: Joi.array().items(
          Joi.string().valid(
            'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
            'abs', 'obliques', 'lower-back', 'glutes', 'quadriceps',
            'hamstrings', 'calves', 'full-body', 'cardio'
          )
        ),
        sets: Joi.array().items(
          Joi.object({
            reps: commonSchemas.nonNegativeNumber,
            weight: Joi.object({
              value: commonSchemas.nonNegativeNumber,
              unit: Joi.string().valid('kg', 'lbs')
            }),
            duration: commonSchemas.nonNegativeNumber,
            distance: Joi.object({
              value: commonSchemas.nonNegativeNumber,
              unit: Joi.string().valid('km', 'miles', 'm', 'ft')
            }),
            restTime: commonSchemas.nonNegativeNumber,
            notes: Joi.string().max(200)
          })
        ),
        totalDuration: commonSchemas.nonNegativeNumber,
        caloriesBurned: commonSchemas.nonNegativeNumber,
        difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced', 'expert'),
        notes: Joi.string().max(500)
      })
    ),
    intensity: Joi.string().valid('low', 'moderate', 'high', 'very-high'),
    mood: Joi.object({
      before: commonSchemas.rating,
      after: commonSchemas.rating
    }),
    energy: Joi.object({
      before: commonSchemas.rating,
      after: commonSchemas.rating
    }),
    location: Joi.string().valid('home', 'gym', 'outdoor', 'studio', 'pool', 'track', 'other'),
    weather: Joi.object({
      condition: Joi.string(),
      temperature: Joi.number(),
      humidity: Joi.number().min(0).max(100)
    }),
    equipment: Joi.array().items(Joi.string().trim()),
    tags: Joi.array().items(Joi.string().trim()),
    notes: Joi.string().max(1000),
    rating: Joi.number().min(1).max(5)
  })
};

// Query parameter validation schemas
const querySchemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('-createdAt'),
    fields: Joi.string()
  }),

  dateRange: Joi.object({
    startDate: commonSchemas.date,
    endDate: commonSchemas.date,
    period: Joi.string().valid('day', 'week', 'month', 'year')
  }),

  healthDataQuery: Joi.object({
    startDate: commonSchemas.date,
    endDate: commonSchemas.date,
    metrics: Joi.string(), // comma-separated list
    tags: Joi.string() // comma-separated list
  }).concat(querySchemas.pagination)
};

module.exports = {
  validate,
  commonSchemas,
  userSchemas,
  healthDataSchemas,
  goalSchemas,
  workoutSchemas,
  querySchemas
};