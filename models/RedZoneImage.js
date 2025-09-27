import mongoose from 'mongoose'

const redZoneImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  imageUrl: {
    type: String,
    required: [true, 'Image URL is required']
  },
  redZoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RedZone',
    required: true
  },
  uploadedBy: {
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
    default: Date.now
  }
}, {
  timestamps: true
})

const RedZoneImage = mongoose.model('RedZoneImage', redZoneImageSchema)

export default RedZoneImage