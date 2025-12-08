import express from 'express'
import auth from '../middleware/auth.js'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import User from '../models/User.js'
import RedZone from '../models/RedZone.js'
import RedZoneImage from '../models/RedZoneImage.js'
import UserContact from '../models/UserContact.js'
import { sendRedZoneNotification, sendSMS, testTwilioAccount, sendUserRedZoneAlert } from '../utils/twilio.js'
import { sendRedZoneEmailNotification, sendEmail, testEmailSending, sendUserRedZoneAlert as sendUserRedZoneAlertEmail } from '../utils/email.js'

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/redzones'
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'redzone-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'), false)
  }
}

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
})

const router = express.Router()

// Test route for Twilio - No auth required for testing
router.get('/test-twilio-open', async (req, res) => {
  try {

    // Test Twilio account status
    const accountActive = await testTwilioAccount()
    
    if (!accountActive) {
      return res.status(500).json({
        success: false,
        message: 'Twilio account is not active or credentials are invalid'
      })
    }
    
    // Use phone number from query parameter or default test number
    const phoneNumber = req.query.phone || '9999999999' // Replace with a valid test number
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'No phone number provided'
      })
    }
    
    // Send test SMS
    const testMessage = 'This is a test message from RedZone Cursor app. If you received this, SMS notifications are working.'
    const result = await sendSMS(phoneNumber, testMessage)
    
    if (result) {
      res.json({
        success: true,
        message: 'Test SMS sent successfully',
        details: {
          to: phoneNumber,
          sid: result.sid,
          status: result.status
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test SMS'
      })
    }
  } catch (error) {
    console.error('Error testing Twilio:', error)
    res.status(500).json({
      success: false,
      message: 'Error testing Twilio integration',
      error: error.message
    })
  }
})

// Test route for Email - No auth required for testing
router.get('/test-email-open', async (req, res) => {
  try {
    // Use email from query parameter or default test email
    const testEmail = req.query.email || 'dibyajyotinayak063@gmail.com'
    
    if (!testEmail || !testEmail.includes('@')) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address in the query parameter: ?email=your@email.com'
      })
    }
    
    // Test email sending
    const result = await testEmailSending(testEmail)
    
    if (result) {
      res.json({
        success: true,
        message: 'Test email sent successfully',
        details: {
          to: testEmail,
          count: 1
        }
      })
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to send test email. Check server logs for details.'
      })
    }
  } catch (error) {
    console.error('Error testing email:', error)
    res.status(500).json({
      success: false,
      message: 'Error testing email integration',
      error: error.message
    })
  }
})

// Mock RedZone data for now - in a real app, this would come from a database
const mockRedZones = [
  {
    _id: '1',
    title: 'Construction Zone - Heavy Machinery',
    description: 'Active construction site with heavy machinery operating. Exercise extreme caution.',
    location: 'Downtown Business District',
    severity: 'high',
    createdAt: new Date('2024-01-15'),
    status: 'approved'
  },
  {
    _id: '2',
    title: 'Flooded Street - Deep Water',
    description: 'Street completely flooded after heavy rainfall. Avoid driving through this area.',
    location: 'Riverside Avenue',
    severity: 'medium',
    createdAt: new Date('2024-01-14'),
    status: 'approved'
  },
  {
    _id: '3',
    title: 'Broken Traffic Light',
    description: 'Traffic light malfunctioning at major intersection. Use extra caution.',
    location: 'Main Street & Oak Avenue',
    severity: 'medium',
    createdAt: new Date('2024-01-13'),
    status: 'approved'
  },
  {
    _id: '4',
    title: 'Icy Road Conditions',
    description: 'Road surface covered in ice. Dangerous driving conditions.',
    location: 'Mountain View Drive',
    severity: 'high',
    createdAt: new Date('2024-01-12'),
    status: 'approved'
  },
  {
    _id: '5',
    title: 'Downed Power Lines',
    description: 'Power lines down across the road. Do not approach, call emergency services.',
    location: 'Electric Avenue',
    severity: 'high',
    createdAt: new Date('2024-01-11'),
    status: 'approved'
  }
]

// GET /api/redzones/recent - Get recent approved RedZones
router.get('/recent', auth, async (req, res) => {
  try {
    const recentRedZones = await RedZone.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('reportedBy', 'name')

    res.json({
      success: true,
      redZones: recentRedZones
    })
  } catch (error) {
    console.error('Error fetching recent RedZones:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent RedZones'
    })
  }
})

// POST /api/redzones - Create a new RedZone report
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, location, landmark, severity, status } = req.body
    
    // Parse coordinates if they were sent as a string (from FormData)
    let coordinates = null
    if (req.body.coordinates) {
      try {
        // If coordinates is already an object, use it directly
        if (typeof req.body.coordinates === 'object') {
          coordinates = req.body.coordinates
        } else {
          // If it's a string, try to parse it as JSON
          coordinates = JSON.parse(req.body.coordinates)
        }
      } catch (e) {
        console.error('Error parsing coordinates:', e)
        console.log('Coordinates value:', req.body.coordinates)
        console.log('Coordinates type:', typeof req.body.coordinates)
      }
    }

    // Validate required fields
    if (!title || !description || !location || !severity) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      })
    }

    // Validate severity level
    const validSeverities = ['low', 'medium', 'high']
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: 'Severity must be low, medium, or high'
      })
    }

    // Get image URL if an image was uploaded
    // Store only the relative path for web access, not the full file system path
    const imageUrl = req.file ? `/uploads/redzones/${req.file.filename}` : null

    // Create new RedZone document
    const newRedZone = new RedZone({
      title,
      description,
      location,
      landmark,
      coordinates,
      severity,
      reportedBy: req.user.id
    })

    // If the user is an admin and status is provided as 'approved', set it directly
    if (req.user.role === 'admin' && status === 'approved') {
      newRedZone.status = 'approved'
      newRedZone.reviewedBy = req.user.id
      newRedZone.reviewedAt = Date.now()
    }

    // If an image was uploaded, add it to the RedZone document
    if (imageUrl) {
      newRedZone.imageUrl = imageUrl;
    }
    
    // Save to database
    await newRedZone.save()
    
    // If an image was uploaded, save it to the RedZoneImage collection
    if (imageUrl) {
      const newRedZoneImage = new RedZoneImage({
        title: title,
        location: location,
        date: new Date(),
        imageUrl: imageUrl, // This will now be the correct relative path
        redZoneId: newRedZone._id,
        uploadedBy: req.user.id
      })
      
      await newRedZoneImage.save()
    }

    // If created by admin and approved, send SMS and email notifications
    if (req.user.role === 'admin' && newRedZone.status === 'approved') {
      try {
        // Get all user contacts with phone numbers and emails
        const userContacts = await UserContact.find({}, 'phone email userId')
        
        if (userContacts && userContacts.length > 0) {
          // Extract phone numbers and emails from contacts
          const phoneNumbers = userContacts.map(contact => contact.phone).filter(phone => phone)
          const emailAddresses = userContacts.map(contact => contact.email).filter(email => email)
          
          // Send SMS notifications asynchronously (don't await to avoid delaying response)
          if (phoneNumbers.length > 0) {
            sendRedZoneNotification(phoneNumbers, newRedZone)
              .then(results => {
                console.log(`SMS notifications sent for new RedZone: ${newRedZone.title}`)
              })
              .catch(err => {
                console.error('Error sending SMS notifications:', err)
              })
          }
          
          // Send email notifications asynchronously
          if (emailAddresses.length > 0) {
            sendRedZoneEmailNotification(emailAddresses, newRedZone, 'approved')
              .then(results => {
                console.log(`Email notifications sent for new RedZone: ${newRedZone.title}`)
              })
              .catch(err => {
                console.error('Error sending email notifications:', err)
              })
          }
          
          // Check if any users are in this redzone and send special notifications
          if (newRedZone.coordinates && newRedZone.coordinates.lat && newRedZone.coordinates.lng) {
            // Check all users to see if they're in this redzone
            for (const contact of userContacts) {
              try {
                // Get user's last known location (this would need to be stored in the database)
                // For now, we'll check if the hardcoded test location is in this redzone
                const userLat = 19.04835900;
                const userLng = 83.83171400;
                
                // Calculate distance between user and redzone center
                const distance = calculateDistance(
                  userLat, 
                  userLng, 
                  newRedZone.coordinates.lat, 
                  newRedZone.coordinates.lng
                );
                
                // If user is within 0.2km of redzone center
                if (distance < 0.2) {
                  console.log(`User ${contact.userId} is in the new redzone, sending special notifications...`);
                  
                  const userLocation = { lat: userLat, lng: userLng };
                  
                  // Send SMS notification if phone number exists
                  if (contact.phone) {
                    console.log('Sending special SMS notification to:', contact.phone);
                    await sendUserRedZoneAlert(contact.phone, newRedZone, userLocation);
                  }
                  
                  // Send email notification if email exists
                  if (contact.email) {
                    console.log('Sending special email notification to:', contact.email);
                    await sendUserRedZoneAlertEmail(contact.email, newRedZone, userLocation);
                  }
                  
                  // Note: For dashboard notification, the frontend will check periodically
                }
              } catch (userCheckError) {
                console.error('Error checking user location for redzone:', userCheckError);
              }
            }
          }
        }
      } catch (notificationError) {
        // Log error but don't fail the creation process
        console.error('Error preparing notifications:', notificationError)
      }
    }

    const message = newRedZone.status === 'approved' 
      ? 'RedZone created and approved successfully.'
      : 'RedZone report submitted successfully. It will be reviewed by an admin.'

    res.status(201).json({
      success: true,
      message,
      redZone: newRedZone
    })
  } catch (error) {
    console.error('Error creating RedZone:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to create RedZone report'
    })
  }
})

// GET /api/redzones - Get all RedZones (for admin)
router.get('/', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    // Query the database for all RedZones
    const redZones = await RedZone.find()
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name')
      .populate('reviewedBy', 'name')
    
    res.json({
      success: true,
      redZones
    })
  } catch (error) {
    console.error('Error fetching RedZones:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RedZones'
    })
  }
})

// PUT /api/redzones/:id/approve - Approve a RedZone report (admin only)
router.put('/:id/approve', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    // Find the redzone and populate the reportedBy field to get user details
    const redZone = await RedZone.findById(req.params.id).populate('reportedBy')
    
    if (!redZone) {
      return res.status(404).json({
        success: false,
        message: 'RedZone report not found'
      })
    }
    
    console.log('RedZone found:', { 
      id: redZone._id,
      title: redZone.title,
      reportedBy: redZone.reportedBy,
      reportedById: redZone.reportedBy ? redZone.reportedBy._id : 'Not available'
    })

    // Update status to approved
    redZone.status = 'approved'
    redZone.reviewedBy = req.user.id
    redZone.reviewedAt = Date.now()
    redZone.updatedAt = Date.now()
    
    await redZone.save()

    // Send SMS and email notifications to all users with registered contact details
    try {
      // Verify redZone has all required properties
      if (!redZone.title || !redZone.location) {
        console.error('Cannot send notifications: RedZone missing required properties', {
          hasTitle: Boolean(redZone.title),
          hasLocation: Boolean(redZone.location),
          redZoneId: redZone._id
        });
        throw new Error('RedZone missing required properties for notification');
      }
      
      // Get all user contacts with phone numbers and emails
      const userContacts = await UserContact.find({}, 'phone email')
      
      if (userContacts && userContacts.length > 0) {
        // Extract phone numbers and emails from contacts
        const phoneNumbers = userContacts.map(contact => contact.phone).filter(phone => phone);
        const emailAddresses = userContacts.map(contact => contact.email).filter(email => email);
        
        if (phoneNumbers.length === 0 && emailAddresses.length === 0) {
          console.log('No valid contact details found for notification');
          return;
        }
        
        // Log before sending notifications
        console.log(`Attempting to send notifications for approved RedZone: ${redZone.title} to ${phoneNumbers.length} SMS and ${emailAddresses.length} email recipients`);
        
        // Send SMS notifications asynchronously (don't await to avoid delaying response)
        if (phoneNumbers.length > 0) {
          sendRedZoneNotification(phoneNumbers, redZone)
            .then(results => {
              console.log(`SMS notifications sent for approved RedZone: ${redZone.title}. Results:`, results.length)
            })
            .catch(err => {
              console.error('Error sending SMS notifications:', err)
            })
        }
        
        // Send email notifications asynchronously
        if (emailAddresses.length > 0) {
          sendRedZoneEmailNotification(emailAddresses, redZone, 'approved')
            .then(results => {
              console.log(`Email notifications sent for approved RedZone: ${redZone.title}. Results:`, results.length)
            })
            .catch(err => {
              console.error('Error sending email notifications:', err)
            })
        }
      } else {
        console.log('No user contacts found for notification');
      }

      // Send notification to the user who reported the RedZone
      try {
        // Extract the user ID from reportedBy (handles both populated and unpopulated cases)
        let reporterId;
        
        if (redZone.reportedBy) {
          // If reportedBy is populated, it might be an object with _id
          if (typeof redZone.reportedBy === 'object' && redZone.reportedBy._id) {
            reporterId = redZone.reportedBy._id.toString();
          } 
          // If reportedBy is an ObjectId
          else if (redZone.reportedBy.toString) {
            reporterId = redZone.reportedBy.toString();
          }
          // If reportedBy is already a string
          else {
            reporterId = redZone.reportedBy;
          }
        }
        
        console.log(`Looking for contact with userId: ${reporterId}`);
        
        if (!reporterId) {
          console.log('No reporter ID found for this RedZone');
          return;
        }
        
        const reporterContact = await UserContact.findOne({ userId: reporterId })
        
        if (reporterContact) {
          console.log(`Found reporter contact: ${reporterContact.name}, phone: ${reporterContact.phone}, email: ${reporterContact.email}`);
          
          // Verify we have all required data for the message
          if (!redZone.title || !redZone.location) {
            console.error('Cannot send reporter notification: RedZone missing required properties', {
              hasTitle: Boolean(redZone.title),
              hasLocation: Boolean(redZone.location),
              redZoneId: redZone._id
            });
            return;
          }
          
          // Create a personalized message for the reporter
          const reporterMessage = `Good news! Your RedZone report "${redZone.title}" at ${redZone.location} has been approved by an admin. Thank you for helping keep our community safe.`
          
          // Send SMS notification if phone number exists
          if (reporterContact.phone) {
            console.log('Sending personalized SMS to reporter:', {
              phone: reporterContact.phone,
              message: reporterMessage
            });
            
            // Use sendSMS directly from the imported twilio.js
            // Send the personalized notification
            sendSMS(reporterContact.phone, reporterMessage)
              .then(result => {
                if (result) {
                  console.log(`SMS sent to reporter (${reporterId}) for approved RedZone: ${redZone.title}`)
                } else {
                  console.log(`Failed to send SMS to reporter (${reporterId}) - no result returned`)
                }
              })
              .catch(err => {
                console.error('Error sending SMS to reporter:', err)
              })
          }
          
          // Send email notification if email exists
          if (reporterContact.email) {
            console.log('Sending personalized email to reporter:', {
              email: reporterContact.email
            });
            
            // Send personalized email notification
            const emailSubject = `✅ Your RedZone Report Approved: ${redZone.title}`
            const emailContent = `
              <h2>Good News! Your RedZone Report Has Been Approved</h2>
              <p>Hello ${reporterContact.name},</p>
              <p>Your RedZone report "<strong>${redZone.title}</strong>" at <strong>${redZone.location}</strong> has been approved by an admin.</p>
              <p>Thank you for helping keep our community safe by reporting this issue.</p>
              <p><strong>Report Details:</strong></p>
              <ul>
                <li><strong>Title:</strong> ${redZone.title}</li>
                <li><strong>Location:</strong> ${redZone.location}</li>
                <li><strong>Severity:</strong> ${redZone.severity}</li>
                <li><strong>Description:</strong> ${redZone.description}</li>
              </ul>
              <p>Your contribution helps make our community safer for everyone!</p>
              <p>Best regards,<br>The RedZone Team</p>
            `
            
            // Send the email notification
            sendEmail(reporterContact.email, emailSubject, emailContent)
              .then(result => {
                if (result) {
                  console.log(`Email sent to reporter (${reporterId}) for approved RedZone: ${redZone.title}`)
                } else {
                  console.log(`Failed to send email to reporter (${reporterId}) - no result returned`)
                }
              })
              .catch(err => {
                console.error('Error sending email to reporter:', err)
              })
          }
        } else {
          console.log(`No contact found for reporter with userId: ${reporterId}`);
        }
      } catch (reporterNotificationError) {
        console.error('Error sending notification to reporter:', reporterNotificationError)
      }
    } catch (notificationError) {
      // Log error but don't fail the approval process
      console.error('Error preparing SMS notifications:', notificationError)
    }

    res.json({
      success: true,
      message: 'RedZone report approved successfully',
      redZone
    })
  } catch (error) {
    console.error('Error approving RedZone:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to approve RedZone report'
    })
  }
})

// PUT /api/redzones/:id/reject - Reject a RedZone report (admin only)
router.put('/:id/reject', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    const redZone = await RedZone.findById(req.params.id)
    
    if (!redZone) {
      return res.status(404).json({
        success: false,
        message: 'RedZone report not found'
      })
    }

    // Update status to rejected
    redZone.status = 'rejected'
    redZone.reviewedBy = req.user.id
    redZone.reviewedAt = Date.now()
    redZone.updatedAt = Date.now()
    
    await redZone.save()

    res.json({
      success: true,
      message: 'RedZone report rejected successfully',
      redZone
    })
  } catch (error) {
    console.error('Error rejecting RedZone:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to reject RedZone report'
    })
  }
})

// GET /api/redzones/approved - Get approved RedZones
router.get('/approved', auth, async (req, res) => {
  try {
    const approvedRedZones = await RedZone.find({ status: 'approved' })
      .sort({ createdAt: -1 })
      .populate('reportedBy', 'name')
      .populate('reviewedBy', 'name')
    
    res.json({
      success: true,
      redZones: approvedRedZones
    })
  } catch (error) {
    console.error('Error fetching approved RedZones:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch approved RedZones'
    })
  }
})

// GET /api/redzones/:id - Get a specific RedZone by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const redZone = await RedZone.findById(req.params.id)
      .populate('reportedBy', 'name')
      .populate('reviewedBy', 'name')
    
    if (!redZone) {
      return res.status(404).json({
        success: false,
        message: 'RedZone report not found'
      })
    }

    res.json({
      success: true,
      redZone
    })
  } catch (error) {
    console.error('Error fetching RedZone:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RedZone report'
    })
  }
})

// PUT /api/redzones/:id/safe-now - Mark a RedZone as safe (admin only)
router.put('/:id/safe-now', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      })
    }

    const redZone = await RedZone.findById(req.params.id)
    
    if (!redZone) {
      return res.status(404).json({
        success: false,
        message: 'RedZone report not found'
      })
    }

    // Update status to safe
    redZone.status = 'safe'
    redZone.updatedAt = Date.now()
    
    await redZone.save()

    // Send SMS and email notifications to all users with registered contact details
    try {
      // Get all user contacts with phone numbers and emails
      const userContacts = await UserContact.find({}, 'phone email')
      
      if (userContacts && userContacts.length > 0) {
        // Extract phone numbers and emails from contacts
        const phoneNumbers = userContacts.map(contact => contact.phone).filter(phone => phone)
        const emailAddresses = userContacts.map(contact => contact.email).filter(email => email)
        
        if (phoneNumbers.length === 0 && emailAddresses.length === 0) {
          console.log('No valid contact details found for notification');
          return;
        }
        
        // Create a message for the safe notification
        const safeMessage = `SAFETY UPDATE: The area "${redZone.title}" at ${redZone.location} is now marked as SAFE by authorities. You can resume normal activities in this area.`
        
        // Send SMS notifications asynchronously
        if (phoneNumbers.length > 0) {
          Promise.all(phoneNumbers.map(phone => sendSMS(phone, safeMessage)))
            .then(results => {
              console.log(`SMS notifications sent for safe RedZone: ${redZone.title}. Results:`, results.length)
            })
            .catch(err => {
              console.error('Error sending SMS notifications:', err)
            })
        }
        
        // Send email notifications asynchronously
        if (emailAddresses.length > 0) {
          sendRedZoneEmailNotification(emailAddresses, redZone, 'safe')
            .then(results => {
              console.log(`Email notifications sent for safe RedZone: ${redZone.title}. Results:`, results.length)
            })
            .catch(err => {
              console.error('Error sending email notifications:', err)
            })
        }
      } else {
        console.log('No user contacts found for notification')
      }
    } catch (notificationError) {
      // Log error but don't fail the process
      console.error('Error preparing notifications:', notificationError)
    }

    res.json({
      success: true,
      message: 'RedZone marked as safe successfully',
      redZone
    })
  } catch (error) {
    console.error('Error marking RedZone as safe:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to mark RedZone as safe'
    })
  }
})

// POST /api/redzones/check-user-location - Check if user is inside any redzone
router.post('/check-user-location', auth, async (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    
    // Validate input
    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required and must be numbers'
      });
    }
    
    // Find all approved redzones
    const approvedRedZones = await RedZone.find({ status: 'approved' });
    
    // Check if user is inside any redzone (within 200m = 0.2km)
    let userInRedZone = null;
    let highestSeverity = 'low';
    
    for (const zone of approvedRedZones) {
      // Skip zones without coordinates
      if (!zone.coordinates || !zone.coordinates.lat || !zone.coordinates.lng) {
        continue;
      }
      
      // Calculate distance between user and redzone center
      const distance = calculateDistance(latitude, longitude, zone.coordinates.lat, zone.coordinates.lng);
      
      // If user is within 0.2km of redzone center
      if (distance < 0.2) {
        // If this is the first redzone or has higher severity, update
        if (!userInRedZone || 
            (zone.severity === 'high') || 
            (zone.severity === 'medium' && highestSeverity !== 'high') || 
            (zone.severity === 'low' && highestSeverity === 'low')) {
          userInRedZone = zone;
          highestSeverity = zone.severity;
        }
      }
    }
    
    // If user is in a redzone, send special notifications
    if (userInRedZone) {
      console.log('User is in redzone, sending special notifications...');
      
      // Get user contact information
      const userContact = await UserContact.findOne({ userId: req.user.id });
      
      if (userContact) {
        const userLocation = { lat: latitude, lng: longitude };
        
        // Send SMS notification if phone number exists
        if (userContact.phone) {
          console.log('Sending SMS notification to:', userContact.phone);
          await sendUserRedZoneAlert(userContact.phone, userInRedZone, userLocation);
        }
        
        // Send email notification if email exists
        if (userContact.email) {
          console.log('Sending email notification to:', userContact.email);
          await sendUserRedZoneAlertEmail(userContact.email, userInRedZone, userLocation);
        }
      } else {
        console.log('No user contact found for user ID:', req.user.id);
      }
    } else {
      console.log('User is not in any redzone');
    }
    
    res.json({
      success: true,
      inRedZone: !!userInRedZone,
      redZone: userInRedZone,
      severity: highestSeverity
    });
  } catch (error) {
    console.error('Error checking user location:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check user location'
    });
  }
});

// Helper function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default router
