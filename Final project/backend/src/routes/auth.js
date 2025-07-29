const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { protect, sensitiveOperationLimit } = require('../middleware/auth');
const { validate, userSchemas } = require('../middleware/validation');
const debug = require('debug')('lifefit:auth');

const router = express.Router();

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
router.post('/register', 
  validate(userSchemas.register),
  sensitiveOperationLimit(),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'User already exists with this email'
        });
      }

      // Create user
      const user = await User.create({
        name,
        email,
        password
      });

      // Generate tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Update last login
      await user.updateLastLogin();

      debug(`User registered: ${user.email}`);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            createdAt: user.createdAt
          },
          tokens: {
            access: token,
            refresh: refreshToken
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
router.post('/login',
  validate(userSchemas.login),
  sensitiveOperationLimit(),
  async (req, res, next) => {
    try {
      const { email, password } = req.body;

      // Check for user and include password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Account is deactivated. Please contact support.'
        });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      // Generate tokens
      const token = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Update last login
      await user.updateLastLogin();

      debug(`User logged in: ${user.email}`);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            lastLogin: user.lastLogin,
            profile: user.profile,
            preferences: user.preferences
          },
          tokens: {
            access: token,
            refresh: refreshToken
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          avatar: user.avatar,
          profile: user.profile,
          preferences: user.preferences,
          bmi: user.bmi,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
router.put('/profile',
  protect,
  validate(userSchemas.updateProfile),
  async (req, res, next) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.user._id,
        req.body,
        {
          new: true,
          runValidators: true
        }
      );

      debug(`User profile updated: ${user.email}`);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            profile: user.profile,
            preferences: user.preferences,
            bmi: user.bmi
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
router.put('/change-password',
  protect,
  validate(userSchemas.changePassword),
  sensitiveOperationLimit(),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select('+password');

      // Check current password
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(400).json({
          success: false,
          error: 'Current password is incorrect'
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      debug(`Password changed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
router.post('/forgot-password',
  validate(userSchemas.forgotPassword),
  sensitiveOperationLimit(),
  async (req, res, next) => {
    try {
      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No user found with this email address'
        });
      }

      // Generate reset token
      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      // Create reset URL
      const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/reset-password/${resetToken}`;

      debug(`Password reset requested for user: ${user.email}`);

      // In a real application, you would send an email here
      // For now, we'll just return the reset token (remove in production)
      res.json({
        success: true,
        message: 'Password reset email sent',
        ...(process.env.NODE_ENV === 'development' && {
          resetToken,
          resetUrl
        })
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:resettoken
// @access  Public
router.put('/reset-password/:resettoken',
  validate(userSchemas.resetPassword),
  sensitiveOperationLimit(),
  async (req, res, next) => {
    try {
      const { password } = req.body;

      // Get hashed token
      const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.resettoken)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: resetPasswordToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired reset token'
        });
      }

      // Set new password
      user.password = password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Generate new token
      const token = user.generateAuthToken();

      debug(`Password reset completed for user: ${user.email}`);

      res.json({
        success: true,
        message: 'Password reset successful',
        data: {
          token
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

// @desc    Refresh token
// @route   POST /api/v1/auth/refresh
// @access  Public
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token is required'
      });
    }

    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      const user = await User.findById(decoded.id);

      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Invalid refresh token'
        });
      }

      // Generate new tokens
      const newToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      res.json({
        success: true,
        data: {
          tokens: {
            access: newToken,
            refresh: newRefreshToken
          }
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
router.post('/logout', protect, async (req, res, next) => {
  try {
    debug(`User logged out: ${req.user.email}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Deactivate account
// @route   DELETE /api/v1/auth/deactivate
// @access  Private
router.delete('/deactivate',
  protect,
  sensitiveOperationLimit(),
  async (req, res, next) => {
    try {
      await User.findByIdAndUpdate(req.user._id, { isActive: false });

      debug(`User account deactivated: ${req.user.email}`);

      res.json({
        success: true,
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;