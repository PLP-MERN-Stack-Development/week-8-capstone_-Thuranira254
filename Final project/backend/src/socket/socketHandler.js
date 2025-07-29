const jwt = require('jsonwebtoken');
const User = require('../models/User');
const debug = require('debug')('lifefit:socket');

// Store active connections
const activeConnections = new Map();

// Socket authentication middleware
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return next(new Error('Authentication error: Invalid user'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    debug('Socket authentication error:', error.message);
    next(new Error('Authentication error: Invalid token'));
  }
};

// Main socket handler
const socketHandler = (io) => {
  // Apply authentication middleware
  io.use(authenticateSocket);

  io.on('connection', (socket) => {
    const userId = socket.userId;
    debug(`User ${userId} connected with socket ${socket.id}`);

    // Store connection
    activeConnections.set(userId, {
      socketId: socket.id,
      socket: socket,
      connectedAt: new Date(),
      user: socket.user
    });

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to LifeFit real-time server',
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // Handle health data updates
    socket.on('health-data:update', (data) => {
      debug(`Health data update from user ${userId}:`, data);
      
      // Broadcast to user's other devices
      socket.to(`user:${userId}`).emit('health-data:updated', {
        ...data,
        updatedBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Handle goal progress updates
    socket.on('goal:progress', (data) => {
      debug(`Goal progress update from user ${userId}:`, data);
      
      // Broadcast to user's other devices
      socket.to(`user:${userId}`).emit('goal:progress-updated', {
        ...data,
        updatedBy: socket.id,
        timestamp: new Date().toISOString()
      });

      // Check if goal is completed
      if (data.completed) {
        socket.emit('goal:completed', {
          goalId: data.goalId,
          title: data.title,
          completedAt: new Date().toISOString(),
          celebration: true
        });
      }
    });

    // Handle workout session updates
    socket.on('workout:start', (data) => {
      debug(`Workout started by user ${userId}:`, data);
      
      socket.to(`user:${userId}`).emit('workout:started', {
        ...data,
        startedBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('workout:update', (data) => {
      debug(`Workout update from user ${userId}:`, data);
      
      socket.to(`user:${userId}`).emit('workout:updated', {
        ...data,
        updatedBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('workout:complete', (data) => {
      debug(`Workout completed by user ${userId}:`, data);
      
      socket.to(`user:${userId}`).emit('workout:completed', {
        ...data,
        completedBy: socket.id,
        timestamp: new Date().toISOString()
      });

      // Send completion celebration
      socket.emit('workout:celebration', {
        workoutId: data.workoutId,
        duration: data.duration,
        caloriesBurned: data.caloriesBurned,
        completedAt: new Date().toISOString()
      });
    });

    // Handle real-time notifications
    socket.on('notification:read', (data) => {
      debug(`Notification read by user ${userId}:`, data);
      
      socket.to(`user:${userId}`).emit('notification:marked-read', {
        notificationId: data.notificationId,
        readBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Handle typing indicators for notes/comments
    socket.on('typing:start', (data) => {
      socket.to(`user:${userId}`).emit('typing:user-started', {
        userId: userId,
        context: data.context,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`user:${userId}`).emit('typing:user-stopped', {
        userId: userId,
        context: data.context,
        timestamp: new Date().toISOString()
      });
    });

    // Handle device sync requests
    socket.on('sync:request', (data) => {
      debug(`Sync request from user ${userId}:`, data);
      
      socket.to(`user:${userId}`).emit('sync:requested', {
        requestedBy: socket.id,
        dataTypes: data.dataTypes,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('sync:response', (data) => {
      debug(`Sync response from user ${userId}:`, data);
      
      socket.to(`user:${userId}`).emit('sync:data', {
        ...data,
        respondedBy: socket.id,
        timestamp: new Date().toISOString()
      });
    });

    // Handle presence updates
    socket.on('presence:update', (data) => {
      const connection = activeConnections.get(userId);
      if (connection) {
        connection.lastActivity = new Date();
        connection.status = data.status || 'active';
      }

      socket.to(`user:${userId}`).emit('presence:updated', {
        userId: userId,
        status: data.status,
        lastActivity: new Date().toISOString()
      });
    });

    // Handle custom events
    socket.on('custom:event', (data) => {
      debug(`Custom event from user ${userId}:`, data);
      
      // Validate and forward custom events
      if (data.type && data.payload) {
        socket.to(`user:${userId}`).emit('custom:event', {
          type: data.type,
          payload: data.payload,
          from: socket.id,
          timestamp: new Date().toISOString()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      debug(`User ${userId} disconnected: ${reason}`);
      
      // Remove from active connections
      activeConnections.delete(userId);
      
      // Notify other devices
      socket.to(`user:${userId}`).emit('device:disconnected', {
        socketId: socket.id,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      debug(`Socket error for user ${userId}:`, error);
      console.error(`Socket error for user ${userId}:`, error);
    });
  });

  // Periodic cleanup of inactive connections
  setInterval(() => {
    const now = new Date();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [userId, connection] of activeConnections.entries()) {
      const lastActivity = connection.lastActivity || connection.connectedAt;
      if (now - lastActivity > inactiveThreshold) {
        debug(`Cleaning up inactive connection for user ${userId}`);
        connection.socket.disconnect(true);
        activeConnections.delete(userId);
      }
    }
  }, 5 * 60 * 1000); // Check every 5 minutes

  return io;
};

// Helper functions for sending notifications
const sendToUser = (userId, event, data) => {
  const connection = activeConnections.get(userId);
  if (connection) {
    connection.socket.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    return true;
  }
  return false;
};

const sendToAllUsers = (event, data) => {
  for (const [userId, connection] of activeConnections.entries()) {
    connection.socket.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }
};

const getActiveUsers = () => {
  return Array.from(activeConnections.keys());
};

const getUserConnection = (userId) => {
  return activeConnections.get(userId);
};

module.exports = {
  socketHandler,
  sendToUser,
  sendToAllUsers,
  getActiveUsers,
  getUserConnection
};