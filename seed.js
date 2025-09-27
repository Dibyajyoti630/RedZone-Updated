import mongoose from 'mongoose'
import dotenv from 'dotenv'
import User from './models/User.js'

// Load environment variables
dotenv.config()

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/redzoneadmin')
  .then(() => {
    console.log('Connected to MongoDB for seeding - Database: redzoneadmin')
  })
  .catch((error) => {
    console.error(' MongoDB connection error:', error)
    process.exit(1)
  })

// Demo users data
const demoUsers = [
  {
    name: 'Admin User',
    email: 'admin@redzone.com',
    password: 'admin123',
    role: 'admin',
    isActive: true
  },
  {
    name: 'Second Admin',
    email: 'admin2@redzone.com',
    password: 'admin456',
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

// Seed function
const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...')
    console.log(' Database: redzoneadmin')

    // Clear existing users
    await User.deleteMany({})
    console.log('Cleared existing users')

    // Create demo users
    for (const userData of demoUsers) {
      const user = new User(userData)
      await user.save()
      console.log(`Created user: ${userData.email} (${userData.role})`)
    }

    console.log(' Database seeding completed successfully!')
    // console.log('\n Demo Accounts:')
    // console.log('Admin: admin@redzone.com / admin123')
    // console.log('User: user@redzone.com / user123')

  } catch (error) {
    console.error(' Seeding error:', error)
  } finally {
    // Close database connection
    await mongoose.connection.close()
    console.log('🔌 Database connection closed')
    process.exit(0)
  }
}

// Run seeding
seedDatabase()
