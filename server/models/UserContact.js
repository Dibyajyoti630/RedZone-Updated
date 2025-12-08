import mongoose from 'mongoose'

const userContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'pending_removal'],
    default: 'active'
  }
}, {
  timestamps: true
})

// Index for better query performance
userContactSchema.index({ userId: 1 })
userContactSchema.index({ email: 1 })

const UserContact = mongoose.model('UserContact', userContactSchema)

export default UserContact