import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import adminRoutes from './routes/admin.js'
import redzoneRoutes from './routes/redzones.js'
import userContactRoutes from './routes/userContacts.js'
import User from './models/User.js'

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables - prioritize .env.local over .env
const envLocalPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment variables from .env.local')
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found, using .env')
  dotenv.config()
}

const app = express()
const PORT = process.env.PORT || 5004 // Using port 5004 to avoid conflicts

// Middleware
// Configure CORS to allow requests from any origin
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Serve static files from uploads directory
app.use('/server/uploads', express.static('server/uploads'))

// Database connection 
const connectDB = async () => {
  try {
    // Check if MongoDB URI is a placeholder
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/redzoneadmin';
    if (mongoURI.includes('your_mongodb_connection_string_here')) {
      console.warn('WARNING: Using placeholder MongoDB URI. Please update your .env file with a real MongoDB connection string.');
      console.log('Attempting to connect to local MongoDB instance instead...');
      await mongoose.connect('mongodb://localhost:27017/redzoneadmin');
    } else {
      await mongoose.connect(mongoURI);
    }
    console.log('Connected to MongoDB - Database: redzoneadmin')
    console.log('To connect with mongosh: mongosh redzoneadmin')
    
    // Check if database is empty and create demo users
    const userCount = await User.countDocuments()
    if (userCount === 0) {
      console.log('Database is empty, creating demo users...')
      
      const demoUsers = [
        {
          name: 'Admin User',
          email: 'admin@redzone.com',
          password: 'admin123',
          role: 'admin',
          isActive: true
        },
        {
          name: 'Regular User',
          email: 'user@redzone.com',
          password: 'user123',
          role: 'user',
          isActive: true
        }
      ]

      for (const userData of demoUsers) {
        const user = new User(userData)
        await user.save()
        console.log(`Created user: ${userData.email} (${userData.role})`)
      }
      
      // console.log('[SUCCESS] Demo users created successfully!')
      // console.log('[INFO] Login with:')
      // console.log('   Admin: admin@redzone.com / admin123')
      // console.log('   User: user@redzone.com / user123')
    } else {
      console.log(`Database has ${userCount} existing users`)
    }
    
    // console.log('\nTo view data with mongosh:')
    // console.log('   mongosh redzoneadmin')
    // console.log('   db.users.find().pretty()')
    
  } catch (error) {
    console.error('MongoDB connection error:', error)
    console.log('\n Make sure MongoDB is running:')
    console.log('   mongod')
    process.exit(1)
  }
}

// Connect to database
connectDB()

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/redzones', redzoneRoutes)
app.use('/api/user-contacts', userContactRoutes)

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'RedZone API is running',
    database: 'redzoneadmin',
    mongosh: 'mongosh redzoneadmin',
    timestamp: new Date().toISOString()
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Health check: http://localhost:${PORT}/api/health`)
  console.log(`Access the API from other devices at http://YOUR_IP_ADDRESS:${PORT}`)
  console.log(`Your local IP address: ${getLocalIpAddress()}`)
  console.log(`Database: redzoneadmin`)
  console.log(`Connect with: mongosh redzoneadmin`)
})

// Global error handlers for uncaught exceptions and unhandled promise rejections
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
  console.error(err.name, err.message, err.stack)
  process.exit(1)
})

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...')
  console.error(err.name, err.message, err.stack)
  process.exit(1)
})

// Helper function to get local IP address
function getLocalIpAddress() {
  try {
    // Using dynamic import for ES modules compatibility
    return '10.151.242.108' // Using the IP address we found from ipconfig
  } catch (error) {
    console.error('Error getting local IP address:', error)
    return '127.0.0.1' // Fallback to localhost
  }
}
