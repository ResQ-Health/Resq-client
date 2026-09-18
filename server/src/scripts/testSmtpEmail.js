// Script to test SMTP email sending
require('dotenv').config();
const { sendEmail } = require('../config/email');

const testEmail = async () => {
    try {
        console.log('Sending test email via SMTP...');
        const to = 'test@example.com'; // Replace with your test email
        const subject = 'Test Email from ResQ App via SMTP';
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
                <h2 style="color: #333333;">Test Email</h2>
                <p>Hello there,</p>
                <p>This is a test email from ResQ App using Elastic Email SMTP.</p>
                <p>Best regards,<br>The ResQ Team</p>
            </div>
        `;

        const result = await sendEmail(to, subject, htmlContent);
        console.log('Email sent successfully:', result);
    } catch (error) {
        console.error('Failed to send test email:', error);
    }
};

// Execute the test
testEmail(); 