# LifeFit Backend API

A comprehensive health and fitness tracking backend application built with Express.js, MongoDB, and Socket.io for real-time updates.

## Features

- **User Authentication & Authorization**: JWT-based authentication with role-based access control
- **Health Data Management**: Track weight, steps, calories, sleep, heart rate, and more
- **Goal Setting & Tracking**: Create and monitor fitness goals with progress tracking
- **Workout Management**: Plan, track, and analyze workouts with detailed metrics
- **Real-time Updates**: Socket.io integration for live data synchronization
- **Data Analytics**: Comprehensive insights and trend analysis
- **Input Validation**: Robust data validation using Joi
- **Error Handling**: Centralized error handling with detailed logging
- **Testing**: Comprehensive test suite with Jest
- **Security**: Rate limiting, CORS, helmet, and other security measures

## Tech Stack

- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Validation**: Joi
- **Testing**: Jest with Supertest
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan, Debug
- **Environment**: dotenv

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/lifefit
JWT_SECRET=your_super_secret_jwt_key_here
# ... other variables
```

4. Start MongoDB service on your system

5. Run the application:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## API Documentation

### Base URL
```
http://localhost:5000/api/v1
```

### Authentication Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /auth/me
Authorization: Bearer <token>
```

### Health Data Endpoints

#### Create Health Data Entry
```http
POST /health-data
Authorization: Bearer <token>
Content-Type: application/json

{
  "date": "2024-01-15",
  "metrics": {
    "weight": { "value": 70, "unit": "kg" },
    "steps": { "value": 10000 },
    "sleep": { "duration": 8, "quality": 8 },
    "calories": { "burned": 2200, "consumed": 2000 }
  },
  "notes": "Feeling great today!"
}
```

#### Get Health Data
```http
GET /health-data?page=1&limit=10&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <token>
```

#### Get Health Analytics
```http
GET /health-data/analytics/summary?period=month
Authorization: Bearer <token>
```

### Goal Endpoints

#### Create Goal
```http
POST /goals
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Lose 5kg",
  "description": "Weight loss goal for summer",
  "category": "weight-loss",
  "type": "target",
  "target": {
    "metric": "weight",
    "value": 65,
    "unit": "kg",
    "operator": "<="
  },
  "timeframe": {
    "type": "monthly",
    "startDate": "2024-01-01",
    "endDate": "2024-03-01"
  }
}
```

#### Update Goal Progress
```http
PUT /goals/:id/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "value": 67,
  "note": "Making good progress!"
}
```

### Workout Endpoints

#### Create Workout
```http
POST /workouts
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Morning Strength Training",
  "type": "strength-training",
  "date": "2024-01-15",
  "startTime": "2024-01-15T07:00:00Z",
  "exercises": [
    {
      "name": "Push-ups",
      "category": "strength",
      "sets": [
        { "reps": 15, "weight": { "value": 0, "unit": "kg" } },
        { "reps": 12, "weight": { "value": 0, "unit": "kg" } }
      ]
    }
  ]
}
```

#### Complete Workout
```http
PUT /workouts/:id/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 4,
  "notes": "Great workout!",
  "mood": { "after": 8 },
  "energy": { "after": 7 }
}
```

## Real-time Features

The application supports real-time updates via Socket.io. Connect to the WebSocket server and authenticate:

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Listen for health data updates
socket.on('health-data:updated', (data) => {
  console.log('Health data updated:', data);
});

// Listen for goal completions
socket.on('goal:completed', (data) => {
  console.log('Goal completed:', data);
});
```

## Data Models

### User Model
- Personal information (name, email, profile)
- Health preferences and settings
- Authentication data
- Activity tracking preferences

### Health Data Model
- Daily health metrics (weight, steps, sleep, etc.)
- Mood and energy levels
- Hydration and nutrition data
- Device sync information

### Goal Model
- Goal details and targets
- Progress tracking
- Reminders and notifications
- Achievement milestones

### Workout Model
- Workout plans and templates
- Exercise details and sets
- Performance metrics
- Completion tracking

## Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent abuse with configurable rate limits
- **Input Validation**: Comprehensive validation using Joi
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet**: Security headers for Express applications
- **Password Hashing**: Bcrypt for secure password storage

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Server port | `5000` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/lifefit` |
| `JWT_SECRET` | JWT signing secret | Required |
| `JWT_EXPIRE` | JWT expiration time | `7d` |
| `BCRYPT_SALT_ROUNDS` | Bcrypt salt rounds | `12` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Error Handling

The application includes comprehensive error handling:

- **Validation Errors**: Detailed field-level validation messages
- **Authentication Errors**: Clear authentication failure messages
- **Database Errors**: Handled MongoDB connection and query errors
- **Rate Limiting**: Proper rate limit exceeded responses
- **Server Errors**: Graceful handling of unexpected errors

## Logging

Logging is implemented using:
- **Morgan**: HTTP request logging
- **Debug**: Namespace-based debug logging
- **Console**: Error and info logging

Enable debug logging:
```bash
DEBUG=lifefit:* npm run dev
```

## Deployment

### Production Setup

1. Set environment to production:
```bash
NODE_ENV=production
```

2. Use a process manager like PM2:
```bash
npm install -g pm2
pm2 start src/server.js --name "lifefit-api"
```

3. Set up MongoDB replica set for production
4. Configure reverse proxy (nginx) for SSL termination
5. Set up monitoring and logging

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Email: jessythuranira@gmail.com
- Create an issue in the repository

## Changelog

### v1.0.0
- Initial release
- User authentication and authorization
- Health data tracking
- Goal management
- Workout tracking
- Real-time updates
- Comprehensive API documentation
- Test suite implementation