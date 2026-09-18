// Script to test Brevo API email sending
require('dotenv').config();
const brevoApi = require('../config/brevoApi');

const testEmail = async () => {
    try {
        console.log('Sending test email...');
        const to = 'test@example.com'; // Replace with your test email
        const subject = 'Test Email from ResQ App';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333333;">Test Email</h2>
                <p>Hello there,</p>
                <p>This is a test email from ResQ App using the Brevo API.</p>
                <p>Best regards,<br>The ResQ Team</p>
            </div>
        `;

        const result = await brevoApi.sendEmail(to, subject, htmlContent);
        console.log('Email sent successfully:', result);
    } catch (error) {
        console.error('Failed to send test email:', error);
    }
};

// Execute the test
testEmail(); 