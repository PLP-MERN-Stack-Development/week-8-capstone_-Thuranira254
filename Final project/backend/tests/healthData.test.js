const request = require('supertest');
const { app } = require('../src/server');
const HealthData = require('../src/models/HealthData');

describe('Health Data Endpoints', () => {
  let user, token;

  beforeEach(async () => {
    user = await testUtils.createTestUser();
    token = user.generateAuthToken();
  });

  describe('POST /api/v1/health-data', () => {
    it('should create health data entry', async () => {
      const healthData = {
        date: new Date().toISOString(),
        metrics: {
          weight: { value: 70, unit: 'kg' },
          steps: { value: 10000 },
          sleep: { duration: 8, quality: 8 }
        },
        notes: 'Feeling great today!'
      };

      const response = await request(app)
        .post('/api/v1/health-data')
        .set('Authorization', `Bearer ${token}`)
        .send(healthData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics.weight.value).toBe(70);
    });

    it('should not create duplicate entry for same date', async () => {
      const date = new Date().toISOString();
      
      // Create first entry
      await testUtils.createTestHealthData(user._id, new Date(date));

      const healthData = {
        date: date,
        metrics: {
          weight: { value: 75, unit: 'kg' }
        }
      };

      const response = await request(app)
        .post('/api/v1/health-data')
        .set('Authorization', `Bearer ${token}`)
        .send(healthData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/health-data', () => {
    beforeEach(async () => {
      // Create test data
      await testUtils.createTestHealthData(user._id, new Date('2024-01-01'));
      await testUtils.createTestHealthData(user._id, new Date('2024-01-02'));
      await testUtils.createTestHealthData(user._id, new Date('2024-01-03'));
    });

    it('should get all health data for user', async () => {
      const response = await request(app)
        .get('/api/v1/health-data')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(3);
    });

    it('should filter health data by date range', async () => {
      const response = await request(app)
        .get('/api/v1/health-data')
        .set('Authorization', `Bearer ${token}`)
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-02'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/api/v1/health-data')
        .set('Authorization', `Bearer ${token}`)
        .query({
          page: 1,
          limit: 2
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBe(2);
      expect(response.body.pagination.total).toBe(3);
    });
  });

  describe('PUT /api/v1/health-data/:id', () => {
    let healthDataEntry;

    beforeEach(async () => {
      healthDataEntry = await testUtils.createTestHealthData(user._id);
    });

    it('should update health data entry', async () => {
      const updateData = {
        metrics: {
          weight: { value: 72, unit: 'kg' },
          steps: { value: 12000 }
        },
        notes: 'Updated notes'
      };

      const response = await request(app)
        .put(`/api/v1/health-data/${healthDataEntry._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics.weight.value).toBe(72);
      expect(response.body.data.notes).toBe('Updated notes');
    });

    it('should not update another user\'s health data', async () => {
      const otherUser = await User.create({
        name: 'Other User',
        email: 'other@example.com',
        password: 'password123'
      });
      const otherToken = otherUser.generateAuthToken();

      const updateData = {
        metrics: {
          weight: { value: 72, unit: 'kg' }
        }
      };

      const response = await request(app)
        .put(`/api/v1/health-data/${healthDataEntry._id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/health-data/analytics/summary', () => {
    beforeEach(async () => {
      // Create test data with different metrics
      const dates = [
        new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      ];

      for (const date of dates) {
        await HealthData.create({
          user: user._id,
          date: date,
          metrics: {
            weight: { value: 70 + Math.random() * 5, unit: 'kg' },
            steps: { value: 8000 + Math.random() * 4000 },
            sleep: { duration: 7 + Math.random() * 2, quality: 7 + Math.random() * 3 },
            calories: { burned: 2000 + Math.random() * 500, consumed: 1800 + Math.random() * 400 }
          }
        });
      }
    });

    it('should get health data analytics summary', async () => {
      const response = await request(app)
        .get('/api/v1/health-data/analytics/summary')
        .set('Authorization', `Bearer ${token}`)
        .query({ period: 'week' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.summary.totalEntries).toBe(3);
    });
  });
});