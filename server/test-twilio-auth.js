// Simple script to test Twilio authentication
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

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

// Run the test
checkAccountStatus().then(isActive => {
  if (isActive) {
    console.log('Twilio account is active and credentials are valid!');
  } else {
    console.log('Twilio account is not active or credentials are invalid!');
  }
});