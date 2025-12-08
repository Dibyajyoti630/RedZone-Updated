import mongoose from 'mongoose'

const redZoneSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  landmark: {
    type: String,
    trim: true
  },
  coordinates: {
    lat: {
      type: Number,
      default: null
    },
    lng: {
      type: Number,
      default: null
    }
  },
  imageUrl: {
    type: String,
    default: null
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: [true, 'Severity level is required']
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'safe'],
    default: 'pending'
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
})

const RedZone = mongoose.model('RedZone', redZoneSchema)

export default RedZone