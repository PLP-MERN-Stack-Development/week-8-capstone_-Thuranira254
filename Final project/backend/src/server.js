const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const debug = require('debug')('lifefit:server');
require('dotenv').config();

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const socketHandler = require('./socket/socketHandler');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const healthDataRoutes = require('./routes/healthData');
const goalRoutes = require('./routes/goals');
const workoutRoutes = require('./routes/workouts');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = socketIo(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API routes
const apiPrefix = process.env.API_PREFIX || '/api/v1';
app.use(`${apiPrefix}/auth`, authRoutes);
app.use(`${apiPrefix}/users`, userRoutes);
app.use(`${apiPrefix}/health-data`, healthDataRoutes);
app.use(`${apiPrefix}/goals`, goalRoutes);
app.use(`${apiPrefix}/workouts`, workoutRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'LifeFit API Server',
    version: '1.0.0',
    author: 'Jesse Thuranira',
    email: 'jessythuranira@gmail.com',
    endpoints: {
      health: '/health',
      auth: `${apiPrefix}/auth`,
      users: `${apiPrefix}/users`,
      healthData: `${apiPrefix}/health-data`,
      goals: `${apiPrefix}/goals`,
      workouts: `${apiPrefix}/workouts`
    }
  });
});

// Socket.io connection handling
socketHandler(io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `The requested route ${req.originalUrl} does not exist.`
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

server.listen(PORT, HOST, () => {
  debug(`Server running on http://${HOST}:${PORT}`);
  console.log(`🚀 LifeFit API Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  console.log(`🔗 API Prefix: ${apiPrefix}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  debug('SIGTERM received, shutting down gracefully');
  server.close(() => {
    debug('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  debug('SIGINT received, shutting down gracefully');
  server.close(() => {
    debug('Process terminated');
    process.exit(0);
  });
});

module.exports = { app, server, io };