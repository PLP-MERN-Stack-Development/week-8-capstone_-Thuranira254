const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Cleanup after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test utilities
global.testUtils = {
  createTestUser: async () => {
    const User = require('../src/models/User');
    return await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
  },
  
  createTestHealthData: async (userId, date = new Date()) => {
    const HealthData = require('../src/models/HealthData');
    return await HealthData.create({
      user: userId,
      date: date,
      metrics: {
        weight: { value: 70, unit: 'kg' },
        steps: { value: 10000 },
        sleep: { duration: 8, quality: 8 },
        calories: { burned: 2200, consumed: 2000 }
      }
    });
  },
  
  createTestGoal: async (userId) => {
    const Goal = require('../src/models/Goal');
    return await Goal.create({
      user: userId,
      title: 'Test Goal',
      description: 'A test goal',
      category: 'weight-loss',
      type: 'target',
      target: {
        metric: 'weight',
        value: 65,
        unit: 'kg',
        operator: '<='
      },
      timeframe: {
        type: 'monthly',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    });
  },
  
  createTestWorkout: async (userId) => {
    const Workout = require('../src/models/Workout');
    return await Workout.create({
      user: userId,
      name: 'Test Workout',
      type: 'strength-training',
      date: new Date(),
      startTime: new Date(),
      exercises: [{
        name: 'Push-ups',
        category: 'strength',
        sets: [{
          reps: 10,
          weight: { value: 0, unit: 'kg' }
        }]
      }]
    });
  }
};