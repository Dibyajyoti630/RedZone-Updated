// Simple script to test Twilio SMS functionality
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '.env.local');
console.log(`Loading environment variables from ${envPath}`);
dotenv.config({ path: envPath });

// Log Twilio credentials (partially masked for security)
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

console.log('Twilio Environment Variables:');
console.log(`TWILIO_ACCOUNT_SID: ${accountSid ? `Found (${accountSid})` : 'Not found'}`);
console.log(`TWILIO_AUTH_TOKEN: ${authToken ? 'Found (hidden for security)' : 'Not found'}`);
console.log(`TWILIO_MESSAGING_SERVICE_SID: ${messagingServiceSid ? `Found (${messagingServiceSid})` : 'Not found'}`);

// Initialize Twilio client
if (!accountSid || !authToken) {
  console.error('Twilio credentials not found in environment variables');
  process.exit(1);
}

console.log('Initializing Twilio client...');
const client = twilio(accountSid, authToken);

// Function to check account status
async function checkAccountStatus() {
  try {
    console.log('Checking Twilio account status...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`Account Status: ${account.status}`);
    console.log(`Account Type: ${account.type}`);
    console.log(`Account Name: ${account.friendlyName}`);
    return account.status === 'active';
  } catch (error) {
    console.error('Error checking account status:', error);
    return false;
  }
}

// Function to send test SMS
async function sendTestSMS(phoneNumber) {
  try {
    console.log(`Sending test SMS to ${phoneNumber}...`);
    
    // Validate phone number format
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+91${phoneNumber}`; // Add India country code if not present
    }
    
    const message = await client.messages.create({
      body: 'This is a test message from RedZone Cursor app. If you received this, SMS notifications are working.',
      messagingServiceSid: messagingServiceSid,
      to: phoneNumber
    });
    
    console.log('Message sent successfully!');
    console.log(`Message SID: ${message.sid}`);
    console.log(`Message Status: ${message.status}`);
    return message;
  } catch (error) {
    console.error('Error sending SMS:', error);
    if (error.code) {
      console.error(`Twilio Error Code: ${error.code}`);
      console.error(`Twilio Error Message: ${error.message}`);
    }
    return null;
  }
}

// Main function
async function main() {
  try {
    // Check account status
    const isActive = await checkAccountStatus();
    if (!isActive) {
      console.error('Twilio account is not active');
      process.exit(1);
    }
    
    // Phone number to test (get from command line argument)
    const testPhoneNumber = process.argv[2] || '9999999999';
    
    if (!testPhoneNumber) {
      console.error('Please provide a phone number as an argument: node test-twilio.js <phone_number>');
      process.exit(1);
    }
    
    console.log(`Using phone number: ${testPhoneNumber}`)
    
    // Send test SMS
    const result = await sendTestSMS(testPhoneNumber);
    
    if (result) {
      console.log('Test completed successfully');
    } else {
      console.error('Test failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    process.exit(1);
  }
}

// Run the main function
main();