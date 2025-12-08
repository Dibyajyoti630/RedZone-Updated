import mongoose from 'mongoose'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables - prioritize .env.local over .env
// Use the correct path for .env.local (in the same directory as this file)
const envLocalPath = path.resolve(__dirname, '.env.local')
console.log('Looking for .env.local at:', envLocalPath)
if (fs.existsSync(envLocalPath)) {
  console.log('Loading environment variables from .env.local')
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found')
}

// Verify the connection
const verifyConnection = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI
    console.log('Using MongoDB URI:', mongoURI)
    
    // Check if it's an Atlas connection
    if (mongoURI && mongoURI.includes('mongodb+srv')) {
      console.log('✅ This is an Atlas connection string')
    } else if (mongoURI && mongoURI.includes('localhost')) {
      console.log('❌ This is a local connection string')
    } else {
      console.log('⚠️  Unknown connection type')
    }
    
    console.log('Attempting to connect...')
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    
    console.log('✅ Successfully connected to MongoDB')
    
    // Check connection details
    const db = mongoose.connection
    console.log('Database name:', db.name)
    console.log('Host:', db.host)
    console.log('Port:', db.port)
    
    // List collections
    const collections = await db.db.listCollections().toArray()
    console.log('Available collections:', collections.map(c => c.name))
    
    // Count users
    try {
      const User = db.model('User', new mongoose.Schema({}), 'users')
      const userCount = await User.countDocuments()
      console.log(`Total users in database: ${userCount}`)
    } catch (error) {
      console.log('Could not count users:', error.message)
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
  }
}

verifyConnection()