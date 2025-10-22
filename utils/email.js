import sgMail from '@sendgrid/mail'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables - prioritize .env.local over .env
const envLocalPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envLocalPath)) {
  console.log('Loading SendGrid credentials from .env.local')
  dotenv.config({ path: envLocalPath })
} else {
  console.log('No .env.local found for SendGrid, using .env')
  dotenv.config()
}

// Initialize SendGrid
const apiKey = process.env.SENDGRID_API_KEY
const fromEmail = process.env.FROM_EMAIL || 'manoranjann028@gmail.com'

// Debug environment variables
console.log('SendGrid Environment Variables:')
console.log('SENDGRID_API_KEY:', apiKey ? `Found (${apiKey.substring(0, 15)}...)` : 'Not found')
console.log('FROM_EMAIL:', fromEmail ? `Found (${fromEmail})` : 'Not found')

// Initialize SendGrid client if API key is available
let isEmailInitialized = false
if (apiKey) {
  try {
    sgMail.setApiKey(apiKey)
    isEmailInitialized = true
    console.log('SendGrid initialized successfully')
  } catch (error) {
    console.error('Error initializing SendGrid:', error.message)
  }
} else {
  console.warn('SendGrid API key not found. Email functionality will be disabled.')
}

/**
 * Create HTML email template for RedZone notifications
 * @param {Object} redZone - The RedZone object
 * @param {string} type - Type of notification ('approved', 'safe', 'new')
 * @param {string} serverUrl - Server URL for image links
 * @returns {string} HTML email content
 */
const createEmailTemplate = (redZone, type = 'approved', serverUrl = 'http://localhost:5004') => {
  const typeConfig = {
    approved: {
      color: '#e74c3c',
      bgColor: 'rgba(231, 76, 60, 0.1)',
      title: 'URGENT ALERT',
      subtitle: 'Verified RedZone Area',
      message: 'A verified dangerous area has been confirmed. Please exercise extreme caution.'
    },
    safe: {
      color: '#27ae60',
      bgColor: 'rgba(39, 174, 96, 0.1)',
      title: 'SAFETY UPDATE',
      subtitle: 'Area Now Safe',
      message: 'This area has been cleared and is now safe for normal activities.'
    },
    new: {
      color: '#f39c12',
      bgColor: 'rgba(243, 156, 18, 0.1)',
      title: 'NEW REPORT',
      subtitle: 'Under Review',
      message: 'A new RedZone has been reported and is under review by authorities.'
    }
  }

  const config = typeConfig[type] || typeConfig.approved
  const severityColors = {
    low: '#f39c12',
    medium: '#e67e22',
    high: '#e74c3c'
  }

  const severityColor = severityColors[redZone.severity] || '#e74c3c'
  const imageUrl = redZone.imageUrl ? `${serverUrl}${redZone.imageUrl}` : null

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>RedZone Alert - ${redZone.title}</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
            .header { background: linear-gradient(135deg, ${config.color}, ${config.color}dd); color: white; padding: 24px; text-align: center; }
            .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: bold; margin-bottom: 8px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 16px; margin: 8px 0 0; opacity: 0.9; }
            .content { padding: 32px 24px; }
            .alert-box { background: ${config.bgColor}; border-left: 4px solid ${config.color}; padding: 16px; margin-bottom: 24px; border-radius: 4px; }
            .location { font-size: 18px; font-weight: bold; color: #2c3e50; margin-bottom: 8px; }
            .severity { display: inline-block; background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .description { font-size: 16px; line-height: 1.6; color: #34495e; margin: 16px 0; }
            .landmark { font-size: 14px; color: #7f8c8d; margin-bottom: 16px; }
            .image { text-align: center; margin: 24px 0; }
            .image img { max-width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1); }
            .safety-tips { background: #ecf0f1; padding: 20px; border-radius: 8px; margin: 24px 0; }
            .safety-title { font-weight: bold; color: #2c3e50; margin-bottom: 12px; }
            .tip { margin: 8px 0; color: #34495e; }
            .footer { background: #2c3e50; color: white; padding: 24px; text-align: center; font-size: 14px; }
            .timestamp { color: #7f8c8d; font-size: 12px; margin-top: 16px; }
            @media (max-width: 600px) { .container { margin: 0; } .content { padding: 20px 16px; } }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="badge">${config.title}</div>
                <h1 class="title">${config.subtitle}</h1>
                <p class="subtitle">${config.message}</p>
            </div>
            
            <div class="content">
                <div class="alert-box">
                    <div class="location">${redZone.title}</div>
                    <div>
                        <span class="severity">${redZone.severity} Risk</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <strong>📍 Location:</strong> ${redZone.location}
                    ${redZone.landmark ? `<div class="landmark"><strong>🏛️ Landmark:</strong> ${redZone.landmark}</div>` : ''}
                </div>
                
                <div class="description">
                    <strong>📝 Description:</strong><br>
                    ${redZone.description}
                </div>
                
                ${imageUrl ? `
                <div class="image">
                    <img src="${imageUrl}" alt="RedZone Image: ${redZone.title}" />
                </div>
                ` : ''}
                
                <div class="safety-tips">
                    <div class="safety-title">🛡️ Safety Recommendations:</div>
                    ${type === 'safe' ? `
                        <div class="tip">✅ This area has been cleared by authorities</div>
                        <div class="tip">✅ Normal activities can be resumed</div>
                        <div class="tip">ℹ️ Continue to follow general safety guidelines</div>
                    ` : `
                        <div class="tip">⚠️ Avoid this area if possible</div>
                        <div class="tip">🚨 Follow instructions from local authorities</div>
                        <div class="tip">📱 Stay alert and informed about updates</div>
                        <div class="tip">🚑 Contact emergency services if needed: 911</div>
                    `}
                </div>
                
                <div class="timestamp">
                    Alert issued: ${new Date().toLocaleString()}
                </div>
            </div>
            
            <div class="footer">
                <strong>RedZone</strong><br>
                Keeping communities safe through real-time alerts<br>
                <small>This is an automated safety notification. Stay vigilant and stay safe.</small>
            </div>
        </div>
    </body>
    </html>
  `
}

/**
 * Send email notification
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML email content
 * @returns {Promise} - Promise that resolves with message details or rejects with error
 */
export const sendEmail = async (toEmail, subject, htmlContent) => {
  try {
    if (!isEmailInitialized) {
      console.warn('Email not sent: SendGrid not initialized due to missing API key')
      return null
    }

    // Validate email address
    if (!toEmail || typeof toEmail !== 'string' || !toEmail.includes('@')) {
      throw new Error('Invalid email address')
    }

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject: subject,
      html: htmlContent
    }

    console.log(`Attempting to send email to ${toEmail}`)
    const result = await sgMail.send(msg)
    
    console.log(`Email sent successfully to ${toEmail}`)
    return result

  } catch (error) {
    console.error('SendGrid error details:', {
      code: error.code,
      message: error.message,
      response: error.response?.body
    })
    return null
  }
}

/**
 * Send RedZone notification emails to multiple users
 * @param {Array} emailAddresses - Array of email addresses to notify
 * @param {Object} redZone - The RedZone object with details
 * @param {string} type - Type of notification ('approved', 'safe', 'new')
 * @returns {Promise} - Promise that resolves when all emails are sent
 */
export const sendRedZoneEmailNotification = async (emailAddresses, redZone, type = 'approved') => {
  try {
    if (!isEmailInitialized) {
      console.warn('RedZone email notifications not sent: SendGrid not initialized')
      return []
    }
    
    if (!emailAddresses || !Array.isArray(emailAddresses) || emailAddresses.length === 0) {
      console.warn('No email addresses provided for RedZone notification')
      return []
    }

    if (!redZone || !redZone.title || !redZone.location) {
      console.warn('Invalid RedZone data for email notification')
      return []
    }

    // Create email subject based on type
    const subjectMap = {
      approved: `🚨 URGENT: RedZone Alert - ${redZone.title}`,
      safe: `✅ SAFETY UPDATE: ${redZone.title} - Area Now Safe`,
      new: `📢 NEW REPORT: ${redZone.title} - Under Review`
    }

    const subject = subjectMap[type] || subjectMap.approved
    const serverUrl = process.env.BACKEND_URL || 'http://localhost:5004'
    const htmlContent = createEmailTemplate(redZone, type, serverUrl)

    // Send to all email addresses
    const promises = emailAddresses
      .filter(email => email && email.includes('@'))
      .map(email => sendEmail(email, subject, htmlContent))
    
    const results = await Promise.allSettled(promises)

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length
    console.log(`Email notifications sent to ${successful}/${emailAddresses.length} recipients`)
    
    return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value)
  } catch (error) {
    console.error('Error sending RedZone email notifications:', error)
    return []
  }
}

/**
 * Send special notification to user when they enter a redzone
 * @param {string} emailAddress - The user's email address
 * @param {Object} redZone - The RedZone object with details
 * @param {Object} userLocation - The user's current location
 * @returns {Promise} - Promise that resolves with message details or rejects with error
 */
export const sendUserRedZoneAlert = async (emailAddress, redZone, userLocation) => {
  try {
    if (!isEmailInitialized) {
      console.warn('User RedZone alert not sent: SendGrid not initialized')
      return null
    }

    if (!emailAddress || typeof emailAddress !== 'string' || !emailAddress.includes('@')) {
      throw new Error('Invalid email address')
    }

    if (!redZone || !redZone.title || !redZone.location) {
      throw new Error('Invalid RedZone data')
    }

    if (!userLocation || typeof userLocation.lat !== 'number' || typeof userLocation.lng !== 'number') {
      throw new Error('Invalid user location')
    }

    // Create email subject
    const subject = `🚨 URGENT ALERT: You've Entered a RedZone - ${redZone.title}`
    
    // Create HTML email content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>URGENT ALERT: RedZone Detected</title>
          <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
              .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
              .header { background: linear-gradient(135deg, #e74c3c, #c0392b); color: white; padding: 24px; text-align: center; }
              .title { font-size: 24px; font-weight: bold; margin: 0; }
              .subtitle { font-size: 16px; margin: 8px 0 0; opacity: 0.9; }
              .content { padding: 32px 24px; }
              .alert-box { background: rgba(231, 76, 60, 0.1); border-left: 4px solid #e74c3c; padding: 16px; margin-bottom: 24px; border-radius: 4px; }
              .location { font-size: 18px; font-weight: bold; color: #2c3e50; margin-bottom: 8px; }
              .severity { display: inline-block; background: ${redZone.severity === 'high' ? '#e74c3c' : redZone.severity === 'medium' ? '#f39c12' : '#f1c40f'}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
              .description { font-size: 16px; line-height: 1.6; color: #34495e; margin: 16px 0; }
              .user-location { background-color: #ecf0f1; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .footer { background: #2c3e50; color: white; padding: 24px; text-align: center; font-size: 14px; }
              .timestamp { color: #7f8c8d; font-size: 12px; margin-top: 16px; }
              @media (max-width: 600px) { .container { margin: 0; } .content { padding: 20px 16px; } }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1 class="title">🚨 URGENT ALERT</h1>
                  <p class="subtitle">RedZone Detected Near Your Location</p>
              </div>
              
              <div class="content">
                  <div class="alert-box">
                      <div class="location">${redZone.title}</div>
                      <div>
                          <span class="severity">${redZone.severity} Risk</span>
                      </div>
                  </div>
                  
                  <p>Hello,</p>
                  
                  <p>We've detected that you've entered a <strong>${redZone.severity.toUpperCase()}</strong> risk area:</p>
                  
                  <div style="margin-bottom: 24px;">
                      <strong>📍 RedZone Location:</strong> ${redZone.location}<br>
                      ${redZone.landmark ? `<strong>🏛️ Landmark:</strong> ${redZone.landmark}<br>` : ''}
                      <strong>⚠️ Your Current Location:</strong> ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
                  </div>
                  
                  <div class="description">
                      <strong>📝 Description:</strong><br>
                      ${redZone.description}
                  </div>
                  
                  <div class="user-location">
                      <strong>⚠️ Safety Recommendation:</strong><br>
                      Please take immediate precautions and leave this area if possible. 
                      Avoid this area until authorities declare it safe.
                  </div>
                  
                  <div class="timestamp">
                      Alert issued: ${new Date().toLocaleString()}
                  </div>
              </div>
              
              <div class="footer">
                  <strong>RedZone</strong><br>
                  Keeping communities safe through real-time alerts<br>
                  <small>This is an automated safety notification. Stay vigilant and stay safe.</small>
              </div>
          </div>
      </body>
      </html>
    `;

    // Send email
    return await sendEmail(emailAddress, subject, htmlContent);
  } catch (error) {
    console.error('Error sending user RedZone alert:', error);
    return null;
  }
}

// Test function to verify SendGrid integration
export const testEmailSending = async (testEmail) => {
  try {
    if (!isEmailInitialized) {
      console.error('Cannot test email: SendGrid not initialized')
      return false
    }

    const testSubject = 'RedZone Cursor - Email Test'
    const testContent = `
      <h1>Email Test Successful!</h1>
      <p>This is a test email from RedZone Cursor application.</p>
      <p>If you received this email, the email notification system is working correctly.</p>
      <p>Timestamp: ${new Date().toLocaleString()}</p>
    `;

    const result = await sendEmail(testEmail, testSubject, testContent)
    return !!result
  } catch (error) {
    console.error('Error testing email:', error)
    return false
  }
}

export default {
  sendEmail,
  sendRedZoneEmailNotification,
  sendUserRedZoneAlert,
  testEmailSending
}