# Setting Up Twilio SMS Functionality

This guide will help you set up Twilio SMS functionality for the RedZone application.

## Prerequisites

1. A Twilio account - [Sign up here](https://www.twilio.com/try-twilio)
2. A Twilio phone number with SMS capabilities
3. A Twilio Messaging Service (optional but recommended)

## Getting Your Twilio Credentials

1. **Account SID and Auth Token**:
   - Log in to your [Twilio Console](https://www.twilio.com/console)
   - Your Account SID and Auth Token are displayed on the dashboard
   - The Account SID always starts with "AC"

2. **Messaging Service SID** (optional but recommended):
   - In the Twilio Console, navigate to Messaging → Services
   - Create a new Messaging Service or use an existing one
   - The Messaging Service SID starts with "MG"

## Environment Setup

1. The application is already configured with Twilio credentials in the `.env` file:
   ```
   TWILIO_ACCOUNT_SID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   TWILIO_AUTH_TOKEN=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   TWILIO_MESSAGING_SERVICE_SID=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

2. These are the actual Twilio credentials being used by the application.

3. No additional setup is required for SMS functionality.

## Testing SMS Functionality

After setting up your credentials:

1. Log in to the application
2. Navigate to a page that triggers SMS notifications (e.g., reporting a RedZone)
3. Complete the action and verify that SMS messages are being sent

## Troubleshooting

- **"Twilio credentials not found or invalid" error**: 
  - Verify that the credentials in the `.env` file are correct
  - Ensure that your Account SID starts with "AC" (this is required)
  - Restart the server after making any changes to environment variables

- **SMS not sending**: 
  - Check the server logs for any Twilio-related errors
  - Verify your Twilio account has sufficient credits
  - Ensure the recipient phone numbers are in the correct format (e.g., +1XXXXXXXXXX)
  - If using a trial account, verify the recipient numbers are confirmed in your Twilio console
- **Rate limiting**: Twilio has rate limits for trial accounts; consider upgrading if you need to send more messages

## Security Notes

- The Twilio credentials are stored in the `.env` file
- Be careful when sharing this project as it contains real credentials
- If you need to share this project, consider regenerating your Auth Token in the Twilio Console afterward