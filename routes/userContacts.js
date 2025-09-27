import express from 'express'
import { body, validationResult } from 'express-validator'
import jwt from 'jsonwebtoken'
import UserContact from '../models/UserContact.js'
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

// Middleware to verify admin role
const authenticateAdmin = async (req, res, next) => {
  try {
    await authenticateToken(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' })
      }
      next()
    })
  } catch (error) {
    res.status(500).json({ message: 'Authentication failed' })
  }
}

// Create a new user contact (notify me)
router.post('/notify', [
  authenticateToken,
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .trim(),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { phone, email } = req.body
    const userId = req.user._id
    const userName = req.user.name

    // Check if user already has a contact entry
    const existingContact = await UserContact.findOne({ userId })

    if (existingContact) {
      // Update existing contact
      existingContact.phone = phone
      existingContact.email = email || req.user.email
      await existingContact.save()

      return res.status(200).json({
        message: 'Contact information updated successfully',
        contact: existingContact
      })
    }

    // Create new contact
    const newContact = new UserContact({
      name: userName,
      email: email || req.user.email,
      phone,
      userId
    })

    await newContact.save()

    res.status(201).json({
      message: 'Contact information saved successfully',
      contact: newContact
    })

  } catch (error) {
    console.error('Save contact error:', error)
    res.status(500).json({ 
      message: 'Error saving contact information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get all user contacts (admin only)
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const contacts = await UserContact.find().sort({ createdAt: -1 })
    
    res.json({
      contacts
    })
  } catch (error) {
    console.error('Get contacts error:', error)
    res.status(500).json({ 
      message: 'Error fetching contacts',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Delete a user contact (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const contact = await UserContact.findByIdAndDelete(req.params.id)
    
    if (!contact) {
      return res.status(404).json({ message: 'Contact not found' })
    }

    res.json({
      message: 'Contact deleted successfully'
    })
  } catch (error) {
    console.error('Delete contact error:', error)
    res.status(500).json({ 
      message: 'Error deleting contact',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Get user's own contact information
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id
    const contact = await UserContact.findOne({ userId })
    
    if (!contact) {
      return res.status(404).json({ 
        message: 'No contact information found',
        exists: false
      })
    }

    res.json({
      exists: true,
      contact
    })
  } catch (error) {
    console.error('Get user contact error:', error)
    res.status(500).json({ 
      message: 'Error fetching contact information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Request removal of user's own contact information
router.put('/me/request-removal', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id;
    const contact = await UserContact.findOneAndUpdate(
      { userId },
      { status: 'pending_removal' },
      { new: true }
    );

    if (!contact) {
      return res.status(404).json({ message: 'No contact information found' });
    }

    res.json({
      message: 'Your contact information removal request has been submitted for review.',
      contact
    });
  } catch (error) {
    console.error('Request contact removal error:', error.message, error.stack);
    res.status(500).json({
      message: 'Error submitting contact removal request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Delete user's own contact information
router.delete('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user._id
    const contact = await UserContact.findOneAndDelete({ userId })
    
    if (!contact) {
      return res.status(404).json({ message: 'No contact information found' })
    }

    res.json({
      message: 'Your contact information has been removed successfully'
    })
  } catch (error) {
    console.error('Delete user contact error:', error.message, error.stack)
    res.status(500).json({ 
      message: 'Error removing contact information',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

export default router