import twilio from 'twilio';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - prioritize .env.local over .env
const envLocalPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envLocalPath)) {
  console.log('Loading Twilio credentials from .env.local');
  dotenv.config({ path: envLocalPath });
} else {
  console.log('No .env.local found for Twilio, using .env');
  dotenv.config();
}

// Initialize Twilio client with credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

// Debug environment variables
console.log('Twilio Environment Variables:');
console.log('TWILIO_ACCOUNT_SID:', accountSid ? `Found (${accountSid})` : 'Not found');
console.log('TWILIO_AUTH_TOKEN:', authToken ? 'Found (hidden for security)' : 'Not found');
console.log('TWILIO_MESSAGING_SERVICE_SID:', messagingServiceSid ? `Found (${messagingServiceSid})` : 'Not found');

// Create Twilio client if credentials are available and valid
let client;
let isTestMode = false;

// Check if using test credentials
if (accountSid === 'AC00000000000000000000000000000000' && 
    authToken === '00000000000000000000000000000000') {
  console.log('Using Twilio test credentials - SMS will be simulated but not actually sent');
  isTestMode = true;
}

// Initialize Twilio client with credentials
if (accountSid && authToken && messagingServiceSid) {
  try {
    console.log('Initializing Twilio client with valid credentials');
    client = twilio(accountSid, authToken);
    console.log('Twilio client initialized successfully');
  } catch (error) {
    console.error('Error initializing Twilio client:', error.message);
    console.log('Enabling test mode for SMS simulation');
    isTestMode = true;
  }
} else {
  console.warn('Twilio credentials not found or invalid. SMS functionality will be disabled.');
  if (accountSid && !accountSid.startsWith('AC')) {
    console.warn('Account SID must start with "AC". Current value does not match this format.');
  }
}

/**
 * Send SMS notification to a user
 * @param {string} phoneNumber - The recipient's phone number
 * @param {string} message - The message to send
 * @returns {Promise} - Promise that resolves with message details or rejects with error
 */
export const sendSMS = async (phoneNumber, message) => {
  try {
    // Validate phone number format
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      throw new Error('Invalid phone number');
    }

    // Check if Twilio client is initialized
    if (!client && !isTestMode) {
      console.warn('SMS not sent: Twilio client not initialized due to missing credentials');
      return null;
    }

    // Add +91 prefix if not already present
    let formattedNumber = phoneNumber;
    if (!formattedNumber.startsWith('+')) {
      // Remove leading zeros and add +91
      formattedNumber = '+91' + formattedNumber.replace(/^0+/, '');
    } else if (formattedNumber.startsWith('+') && !formattedNumber.startsWith('+91')) {
      // If it has a different country code, replace it with +91
      // Extract the number without the country code
      const numberWithoutCode = formattedNumber.replace(/^\+\d+/, '');
      formattedNumber = '+91' + numberWithoutCode;
    }
    
    console.log(`Formatting phone number: ${phoneNumber} -> ${formattedNumber}`);

    // If in test mode, simulate SMS sending without making actual API calls
    if (isTestMode) {
      console.log(`[TEST MODE] Simulating SMS to ${formattedNumber}: "${message}"`);
      // Create a mock result similar to what Twilio would return
      const mockResult = {
        sid: `TEST${Date.now()}`,
        status: 'delivered',
        to: formattedNumber,
        body: message,
        dateCreated: new Date().toISOString(),
      };
      console.log(`[TEST MODE] SMS simulated successfully to ${phoneNumber}. SID: ${mockResult.sid}, Status: ${mockResult.status}`);
      return mockResult;
    }
    
    console.log(`Attempting to send SMS to ${formattedNumber} with messagingServiceSid: ${messagingServiceSid}`);
    
    // Send message using Twilio
    try {
      const result = await client.messages.create({
        body: message,
        messagingServiceSid: messagingServiceSid,
        to: formattedNumber
      });

      console.log(`SMS sent successfully to ${phoneNumber}. SID: ${result.sid}, Status: ${result.status}`);
      return result;
    } catch (twilioError) {
      console.error('Twilio API Error:', {
        code: twilioError.code,
        message: twilioError.message,
        moreInfo: twilioError.moreInfo,
        status: twilioError.status,
        details: twilioError.details
      });
      return null;
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    // Don't throw the error, just return null to prevent app crashes
    return null;
  }
};

/**
 * Send RedZone notification to multiple users
 * @param {Array} phoneNumbers - Array of phone numbers to notify
 * @param {Object} redZone - The RedZone object with details
 * @returns {Promise} - Promise that resolves when all messages are sent
 */
export const sendRedZoneNotification = async (phoneNumbers, redZone) => {
  try {
    // Check if Twilio client is initialized
    if (!client && !isTestMode) {
      console.warn('RedZone notifications not sent: Twilio client not initialized due to missing credentials');
      return [];
    }
    
    if (!phoneNumbers || !Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      console.warn('No phone numbers provided for RedZone notification');
      return [];
    }

    if (!redZone || !redZone.title || !redZone.location) {
      console.warn('Invalid RedZone data for notification');
      return [];
    }

    // Create message text based on redzone status
    let message;
    if (redZone.status === 'approved') {
      message = `ALERT: RedZone "${redZone.title}" at ${redZone.location} has been verified and approved. Severity: ${redZone.severity ? redZone.severity.toUpperCase() : 'HIGH'}. Please exercise caution in this area.`;
    } else {
      message = `ALERT: New RedZone "${redZone.title}" has been reported at ${redZone.location}. Severity: ${redZone.severity ? redZone.severity.toUpperCase() : 'HIGH'}. Please exercise caution in this area.`;
    }

    // Send to all phone numbers
    const promises = phoneNumbers.map(phone => sendSMS(phone, message));
    const results = await Promise.allSettled(promises);

    // Log results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
    console.log(`RedZone notification sent to ${successful}/${phoneNumbers.length} recipients`);
    
    return results.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value);
  } catch (error) {
    console.error('Error sending RedZone notifications:', error);
    return [];
  }
};

// Test function to verify Twilio account status
export const testTwilioAccount = async () => {
  try {
    if (!client) {
      console.error('Cannot test Twilio account: Client not initialized');
      return false;
    }
    
    // Check account status
    console.log('Checking Twilio account status...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log('Twilio Account Status:', {
      sid: account.sid,
      friendlyName: account.friendlyName,
      status: account.status,
      type: account.type
    });
    
    if (account.status !== 'active') {
      console.error(`Twilio account is not active. Current status: ${account.status}`);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking Twilio account:', error);
    return false;
  }
};

export default {
  sendSMS,
  sendRedZoneNotification,
  testTwilioAccount
};