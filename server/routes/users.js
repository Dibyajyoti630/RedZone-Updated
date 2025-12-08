import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'

const router = express.Router()

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      return res.status(401).json({ message: 'Access token required' })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key')
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(401).json({ message: 'User not found' })
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' })
    }

    req.user = user
    next()
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' })
    }
    res.status(500).json({ message: 'Token verification failed' })
  }
}

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: req.user.getPublicProfile()
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ 
      message: 'Error fetching profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Update user profile
router.put('/profile', [
  authenticateToken,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('profile.phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('profile.address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address too long'),
  body('profile.address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City name too long'),
  body('profile.emergencyContact.name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Emergency contact name must be between 2 and 50 characters'),
  body('profile.emergencyContact.phone')
    .optional()
    .trim()
    .isMobilePhone()
    .withMessage('Please provide a valid emergency contact phone number')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const updates = req.body
    const allowedUpdates = [
      'name', 
      'profile.phone', 
      'profile.address', 
      'profile.emergencyContact',
      'preferences'
    ]

    // Filter out non-allowed updates
    const filteredUpdates = {}
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    // Update user
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    )

    res.json({
      message: 'Profile updated successfully',
      user: user.getPublicProfile()
    })

  } catch (error) {
    console.error('Update profile error:', error)
    res.status(500).json({ 
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Change password
router.put('/change-password', [
  authenticateToken,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { currentPassword, newPassword } = req.body

    // Get user with password
    const user = await User.findById(req.user._id).select('+password')

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword)
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ 
        message: 'Current password is incorrect' 
      })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({
      message: 'Password changed successfully'
    })

  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ 
      message: 'Error changing password',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Deactivate account
router.delete('/deactivate', authenticateToken, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { isActive: false })
    
    res.json({
      message: 'Account deactivated successfully'
    })

  } catch (error) {
    console.error('Deactivate account error:', error)
    res.status(500).json({ 
      message: 'Error deactivating account',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

export default router
