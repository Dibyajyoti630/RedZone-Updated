import express from 'express'
import jwt from 'jsonwebtoken'
import { body, validationResult } from 'express-validator'
import User from '../models/User.js'
import UserContact from '../models/UserContact.js'

const router = express.Router()

// Middleware to verify JWT token and admin role
const authenticateAdmin = async (req, res, next) => {
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

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' })
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

// Get admin dashboard statistics
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const activeUsers = await User.countDocuments({ isActive: true })
    const adminUsers = await User.countDocuments({ role: 'admin' })
    const recentUsers = await User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    })

    // Get users who logged in today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const activeToday = await User.countDocuments({
      lastLogin: { $gte: today }
    })

    res.json({
      stats: {
        totalUsers,
        activeUsers,
        adminUsers,
        recentUsers,
        activeToday
      }
    })

  } catch (error) {
    console.error('Get admin stats error:', error)
    res.status(500).json({ 
      message: 'Error fetching statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get all users (with pagination)
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const filter = {}
    if (req.query.role) filter.role = req.query.role
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true'

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await User.countDocuments(filter)

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ 
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get user by ID
router.get('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user })

  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ 
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get all user contacts (admin only)
router.get('/user-contacts', authenticateAdmin, async (req, res) => {
  try {
    const contacts = await UserContact.find().populate('userId', 'name email');
    res.json({ contacts });
  } catch (error) {
    console.error('Error fetching user contacts:', error);
    res.status(500).json({ message: 'Error fetching user contacts', error: error.message });
  }
});

// Get pending contact removal requests
router.get('/pending-contact-removals', authenticateAdmin, async (req, res) => {
  try {
    // Assuming UserContact model has a field like 'status' or 'pendingRemoval'
    // and a reference to the user who requested removal
    const pendingRequests = await UserContact.find({ status: 'pending_removal' }).populate('userId', 'name email'); // Populate user info
    res.json({ pendingRequests });
  } catch (error) {
    console.error('Error fetching pending contact removal requests:', error);
    res.status(500).json({ message: 'Error fetching pending contact removal requests', error: error.message });
  }
});

// Approve contact removal request
router.put('/user-contacts/:id/approve-removal', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await UserContact.findByIdAndUpdate(id, { status: 'active' }, { new: true });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ message: 'Contact removal request approved, status set to active', contact });
  } catch (error) {
    console.error('Error approving contact removal:', error.message, error.stack);
    res.status(500).json({ message: 'Error approving contact removal', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
  }
});

// Reject contact removal request
router.put('/user-contacts/:id/reject-removal', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await UserContact.findByIdAndUpdate(id, { status: 'active' }, { new: true });

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ message: 'Contact removal request rejected, status set back to active', contact });
  } catch (error) {
    console.error('Error rejecting contact removal:', error.message, error.stack);
    res.status(500).json({ message: 'Error rejecting contact removal', error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' });
  }
});

// Delete user contact (admin only)
router.delete('/user-contacts/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await UserContact.findByIdAndDelete(id);

    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ message: 'Error deleting contact', error: error.message });
  }
});

// Update user (admin only)
router.put('/users/:id', [
  authenticateAdmin,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
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
    const allowedUpdates = ['name', 'email', 'role', 'isActive']

    // Filter out non-allowed updates
    const filteredUpdates = {}
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key]
      }
    })

    // Check if email is being updated and if it's already taken
    if (filteredUpdates.email) {
      const existingUser = await User.findOne({ 
        email: filteredUpdates.email, 
        _id: { $ne: req.params.id } 
      })
      if (existingUser) {
        return res.status(400).json({ 
          message: 'Email is already taken by another user' 
        })
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).select('-password')

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      message: 'User updated successfully',
      user
    })

  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ 
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Delete user (admin only)
router.delete('/users/:id', authenticateAdmin, async (req, res) => {
  try {
    // Prevent admin from deleting themselves
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ 
        message: 'Cannot delete your own account' 
      })
    }

    const user = await User.findByIdAndDelete(req.params.id)
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ 
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get recent activity
router.get('/activity', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20

    // Get recent user registrations
    const recentRegistrations = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)

    // Get recent logins
    const recentLogins = await User.find({ lastLogin: { $exists: true } })
      .select('name email role lastLogin')
      .sort({ lastLogin: -1 })
      .limit(limit)

    res.json({
      recentRegistrations,
      recentLogins
    })

  } catch (error) {
    console.error('Get activity error:', error)
    res.status(500).json({ 
      message: 'Error fetching activity',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

export default router
