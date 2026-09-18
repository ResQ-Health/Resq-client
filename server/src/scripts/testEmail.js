// Test email functionality
require('dotenv').config();
const { sendPlainTextEmail } = require('../config/email');

async function testEmailSending() {
    console.log('Testing email configuration...');

    // Log environment variables (without showing actual password)
    console.log('EMAIL_USER:', process.env.EMAIL_USER);
    console.log('EMAIL_PASSWORD set:', process.env.EMAIL_PASSWORD ? 'Yes' : 'No');

    try {
        // Send a test email
        await sendPlainTextEmail(
            process.env.EMAIL_USER || 'enaikeleomoh@gmail.com', // Send to self
            'ResQ Healthcare - Email Test',
            'This is a test email to verify that the email configuration is working correctly.\n\nIf you received this email, the configuration is correct.'
        );
        console.log('Test email sent successfully!');
    } catch (error) {
        console.error('Failed to send test email:', error);
        console.error('Error details:', {
            code: error.code,
            command: error.command,
            responseCode: error.responseCode,
            response: error.response
        });
    }
}

// Run the test
testEmailSending();
