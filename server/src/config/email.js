// Email configuration and utility functions
const nodemailer = require('nodemailer');

// Cache transporter to reuse connections (connection pooling)
let cachedTransporter = null;

// Create a transporter object using Gmail SMTP or alternative SMTP
const createTransporter = () => {
    // Return cached transporter if available and still valid
    if (cachedTransporter) {
        return cachedTransporter;
    }

    // Check if required environment variables are set
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error('EMAIL_USER or EMAIL_PASSWORD environment variables are not set');
        console.error('Email functionality will not work properly');
    }

    // Support alternative SMTP providers (ElasticEmail, etc.) via environment variables
    const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
    const smtpPort = parseInt(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'enaikeleomoh@gmail.com';
    const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;
    const useSecure = smtpPort === 465 || process.env.SMTP_SECURE === 'true';

    const transporterConfig = {
        host: smtpHost,
        port: smtpPort,
        secure: useSecure, // true for 465, false for other ports
        auth: {
            user: smtpUser,
            pass: smtpPass
        },
        // Increased timeout settings for cloud environments like Render
        connectionTimeout: 60000, // 60 seconds (default is 2 seconds)
        greetingTimeout: 30000, // 30 seconds
        socketTimeout: 60000, // 60 seconds
        // Connection pool settings
        pool: true, // Use connection pooling
        maxConnections: 5, // Maximum number of connections in pool
        maxMessages: 100, // Maximum number of messages per connection
        rateDelta: 1000, // Rate limiting
        rateLimit: 5, // Maximum 5 messages per rateDelta
        tls: {
            rejectUnauthorized: false
        },
        // Retry settings
        retry: {
            attempts: 3, // Retry 3 times
            delay: 2000 // Wait 2 seconds between retries
        }
    };

    // If using Gmail service, use service instead of host
    if (smtpHost === 'smtp.gmail.com' && !process.env.SMTP_HOST) {
        transporterConfig.service = 'gmail';
        delete transporterConfig.host;
    }

    cachedTransporter = nodemailer.createTransport(transporterConfig);

    // Handle transporter errors and reset cache
    cachedTransporter.on('error', (error) => {
        console.error('Transporter error:', error);
        cachedTransporter = null; // Reset cache on error
    });

    return cachedTransporter;
};

/**
 * Send an email with retry logic
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {number} retries - Number of retry attempts (default: 3)
 * @returns {Promise} - Nodemailer send result
 */
const sendEmail = async (to, subject, html, retries = 3) => {
    const maxRetries = retries;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const transporter = createTransporter();

            // Reset cached transporter if previous attempt failed
            if (attempt > 1) {
                cachedTransporter = null;
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
            }

            const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'enaikeleomoh@gmail.com';
            const mailOptions = {
                from: `"ResQ Healthcare" <${emailFrom}>`,
                to,
                subject,
                html
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId);
            return info;
        } catch (error) {
            lastError = error;
            console.error(`Error sending email (attempt ${attempt}/${maxRetries}):`, error.message);

            // Log specific error details for debugging
            if (error.code) {
                console.error('Error details:', {
                    code: error.code,
                    command: error.command,
                    responseCode: error.responseCode,
                    response: error.response
                });
            }

            // Don't retry on certain errors (authentication, invalid recipient, etc.)
            if (error.code === 'EAUTH' || error.code === 'EENVELOPE' || error.responseCode === 550) {
                throw error;
            }

            // If this is the last attempt, throw the error
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }

    throw lastError || new Error('Failed to send email after multiple attempts');
};

/**
 * Send a plain text email with retry logic
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Email plain text content
 * @returns {Promise} - Nodemailer send result
 */
const sendPlainTextEmail = async (to, subject, text) => {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const transporter = createTransporter();

            // Reset cached transporter if previous attempt failed
            if (attempt > 1) {
                cachedTransporter = null;
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
            }

            const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'enaikeleomoh@gmail.com';
            const mailOptions = {
                from: `"ResQ Healthcare" <${emailFrom}>`,
                to,
                subject,
                text
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email sent: %s', info.messageId);
            return info;
        } catch (error) {
            lastError = error;
            console.error(`Error sending email (attempt ${attempt}/${maxRetries}):`, error.message);

            // Log specific error details for debugging
            if (error.code) {
                console.error('Error details:', {
                    code: error.code,
                    command: error.command,
                    responseCode: error.responseCode,
                    response: error.response
                });
            }

            // Don't retry on certain errors
            if (error.code === 'EAUTH' || error.code === 'EENVELOPE' || error.responseCode === 550) {
                throw error;
            }

            // If this is the last attempt, throw the error
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }

    throw lastError || new Error('Failed to send email after multiple attempts');
};

/**
 * Send OTP verification email
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 * @param {string} providerName - Provider's name
 * @returns {Promise} - Email send result
 */
const sendOTPEmail = async (to, otp, providerName) => {
    const subject = 'Email Verification - Your OTP Code';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #333333;">Email Verification</h2>
            <p>Hello ${providerName},</p>
            <p>Thank you for registering with our service. To complete your registration, please use the following OTP code:</p>
            <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
                ${otp}
            </div>
            <p>This code is valid for 1 hour. If you did not request this OTP, please ignore this email.</p>
            <p>Best regards,<br>The ResQ Team</p>
        </div>
    `;

    return await sendEmail(to, subject, html);
};

/**
 * Generate a random 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Test the email configuration on startup (with timeout)
const testEmailConfiguration = async () => {
    try {
        const transporter = createTransporter();
        // Use Promise.race to add a timeout to the verification
        const verifyPromise = transporter.verify();
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Verification timeout')), 5000) // Reduced to 5 seconds
        );

        await Promise.race([verifyPromise, timeoutPromise]);
        console.log('Email server connection established successfully');
    } catch (error) {
        // Silently fail - don't log timeout errors as they're expected in cloud environments
        // Email will be tested on first actual send attempt
        if (error.message !== 'Verification timeout') {
            console.error('Email server connection failed:', error.message);
        }
    }
};

// Run the test if not in production (and don't block startup)
// Skip email verification in production to avoid startup delays
if (process.env.NODE_ENV !== 'production') {
    // Run asynchronously without blocking
    testEmailConfiguration().catch(() => {
        // Silently fail - email will be tested on first send
    });
}

/**
 * Send password reset email
 * @param {string} to - Recipient email
 * @param {string} resetToken - Password reset token
 * @param {string} userName - User's name
 * @param {string} resetUrl - Password reset URL (optional, defaults to frontend URL)
 * @returns {Promise} - Email send result
 */
const sendPasswordResetEmail = async (to, resetToken, userName, resetUrl = null, requestOrigin = null) => {
    let resetLink;

    // If resetUrl is explicitly provided, use it directly
    if (resetUrl) {
        resetLink = resetUrl;
    } else {
        const isProduction = process.env.NODE_ENV === 'production';
        const prodDomain = (
            process.env.PRODUCTION_FRONTEND_URL ||
            process.env.PATIENT_PORTAL_URL ||
            process.env.STAGING_URL ||
            'https://resq-client.vercel.app'
        ).replace(/\/+$/, '');

        let frontendUrl;

        if (isProduction) {
            // IN PRODUCTION: Strictly use the production domain and never localhost
            if (requestOrigin && !requestOrigin.includes('localhost') && !requestOrigin.includes('127.0.0.1')) {
                try {
                    frontendUrl = new URL(requestOrigin).origin;
                } catch (e) {
                    frontendUrl = prodDomain;
                }
            } else {
                frontendUrl = prodDomain;
            }
        } else {
            // IN DEVELOPMENT:
            // 1. If client request has an origin header (e.g. from Vite dev server or testing portal)
            if (requestOrigin) {
                try {
                    frontendUrl = new URL(requestOrigin).origin;
                } catch (e) {
                    // ignore parse error
                }
            }
            // 2. If DEV_FRONTEND_URL is explicitly configured for local testing
            if (!frontendUrl && process.env.DEV_FRONTEND_URL) {
                frontendUrl = process.env.DEV_FRONTEND_URL;
            }
            // 3. Fallback to FRONTEND_URL or production domain
            if (!frontendUrl && process.env.FRONTEND_URL) {
                frontendUrl = process.env.FRONTEND_URL;
            }
            if (!frontendUrl) {
                frontendUrl = prodDomain;
            }
        }

        frontendUrl = frontendUrl.replace(/\/+$/, '');
        resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
    }

    // Log the URL being used (helpful for debugging and auditing)
    console.log(`[Password Reset Email] Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Password Reset Email] Base URL: ${resetLink.split('/reset-password')[0]}`);
    console.log(`[Password Reset Email] Reset link: ${resetLink.substring(0, 65)}...`);

    const subject = 'Password Reset Request - ResQ Healthcare';
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <h2 style="color: #333333;">Password Reset Request</h2>
            <p>Hello ${userName},</p>
            <p>We received a request to reset your password for your ResQ Healthcare account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666; font-size: 12px;">${resetLink}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            <p>For security reasons, if you continue to receive password reset emails you did not request, please contact our support team.</p>
            <p>Best regards,<br>The ResQ Healthcare Team</p>
        </div>
    `;

    return await sendEmail(to, subject, html);
};

/**
 * Send an email with attachment and retry logic
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email HTML content
 * @param {Object} attachment - Attachment object with filename and content (Buffer)
 * @returns {Promise} - Nodemailer send result
 */
const sendEmailWithAttachment = async (to, subject, html, attachment) => {
    const maxRetries = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const transporter = createTransporter();

            // Reset cached transporter if previous attempt failed
            if (attempt > 1) {
                cachedTransporter = null;
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
            }

            const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER || 'enaikeleomoh@gmail.com';
            const mailOptions = {
                from: `"ResQ Healthcare" <${emailFrom}>`,
                to,
                subject,
                html,
                attachments: [
                    {
                        filename: attachment.filename,
                        content: attachment.content
                    }
                ]
            };

            const info = await transporter.sendMail(mailOptions);
            console.log('Email with attachment sent: %s', info.messageId);
            return info;
        } catch (error) {
            lastError = error;
            console.error(`Error sending email with attachment (attempt ${attempt}/${maxRetries}):`, error.message);

            // Don't retry on certain errors
            if (error.code === 'EAUTH' || error.code === 'EENVELOPE' || error.responseCode === 550) {
                throw error;
            }

            // If this is the last attempt, throw the error
            if (attempt === maxRetries) {
                throw error;
            }
        }
    }

    throw lastError || new Error('Failed to send email after multiple attempts');
};

/**
 * Send exclusive offers email
 * @param {string} to - Recipient email
 * @param {string} userName - User's name (optional)
 * @param {string} offerBody - The body/content of the exclusive offer
 * @returns {Promise} - Email send result
 */
const sendExclusiveOffersEmail = async (to, userName = 'Valued Customer', offerBody = '') => {
    const subject = 'Exclusive Offers - ResQ Healthcare';

    // Default offer body if none provided
    const defaultOfferBody = `
        <h3 style="color: #4CAF50; margin-top: 20px;">🎉 Special Discounts Available!</h3>
        <p>We're excited to offer you exclusive deals on our healthcare services:</p>
        <ul style="line-height: 1.8;">
            <li><strong>20% OFF</strong> on all diagnostic services</li>
            <li><strong>15% OFF</strong> on specialist consultations</li>
            <li><strong>Free</strong> health check-up for new patients</li>
        </ul>
        <p>Don't miss out on these limited-time offers! Book your appointment today.</p>
    `;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4CAF50; margin: 0;">ResQ Healthcare</h1>
                <p style="color: #666; margin: 5px 0;">Your Health, Our Priority</p>
            </div>
            
            <h2 style="color: #333333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">Exclusive Offers Just For You!</h2>
            
            <p>Hello ${userName},</p>
            <p>Thank you for your interest in our exclusive offers. We're delighted to share special deals tailored just for you!</p>
            
            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50;">
                ${offerBody || defaultOfferBody}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">View Offers & Book Now</a>
            </div>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
                <strong>Terms & Conditions:</strong><br>
                Offers are subject to availability and may vary by location. Some restrictions may apply. 
                Please contact us for more details about these exclusive offers.
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 20px;">
                If you have any questions, feel free to reach out to our support team.<br>
                Best regards,<br>
                <strong>The ResQ Healthcare Team</strong>
            </p>
        </div>
    `;

    return await sendEmail(to, subject, html);
};

module.exports = {
    sendEmail,
    sendPlainTextEmail,
    sendOTPEmail,
    sendPasswordResetEmail,
    sendEmailWithAttachment,
    generateOTP,
    sendExclusiveOffersEmail
}; 