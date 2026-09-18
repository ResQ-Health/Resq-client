// OTP Service for handling OTP operations
const OTP = require('../models/OTP');
const User = require('../models/User');
const Provider = require('../models/Provider');
const PendingRegistration = require('../models/PendingRegistration');
const { redisClient } = require('../config/redis');
const { generateOTP, sendOTPEmail } = require('../config/email');

/**
 * Generate and send OTP for a user (existing user)
 * @param {string} userId - User ID
 * @param {string} email - User's email
 * @param {string} name - User's name for email personalization
 * @returns {Promise<string>} - Generated OTP
 */
const generateAndSendOTP = async (userId, email, name) => {
    try {
        // Generate OTP
        const otp = generateOTP();
        console.log(`[OTP Service] Generated OTP for user ${userId}: ${otp}`);

        // Delete any existing OTP for this user
        await OTP.deleteMany({ user_id: userId });

        // Save OTP to database
        await OTP.create({
            user_id: userId,
            email: email.toLowerCase().trim(),
            otp
        });
        console.log(`[OTP Service] OTP saved to database for user ${userId}`);

        // Send OTP via email using SMTP
        try {
            await sendOTPEmail(email.toLowerCase().trim(), otp, name);
            console.log(`[OTP Service] OTP email sent successfully to ${email}`);
        } catch (emailError) {
            console.error(`[OTP Service] Failed to send OTP email to ${email}:`, emailError);
            // Don't throw here - OTP is saved, user can request another one
            // But log the error for debugging
            throw new Error(`Failed to send email: ${emailError.message}`);
        }

        return otp;
    } catch (error) {
        console.error(`[OTP Service] Error in generateAndSendOTP for user ${userId}:`, error);
        throw error;
    }
};

/**
 * Generate and send OTP for a pending registration
 * @param {string} pendingRegistrationId - Pending Registration ID
 * @param {string} email - User's email
 * @param {string} name - User's name for email personalization
 * @returns {Promise<string>} - Generated OTP
 */
const generateAndSendOTPForPending = async (pendingRegistrationId, email, name) => {
    try {
        // Generate OTP
        const otp = generateOTP();
        console.log(`[OTP Service] Generated OTP for pending registration ${pendingRegistrationId}: ${otp}`);

        // Delete any existing OTP for this email
        await OTP.deleteMany({ email: email.toLowerCase().trim() });

        // Save OTP to database
        await OTP.create({
            pending_registration_id: pendingRegistrationId,
            email: email.toLowerCase().trim(),
            otp
        });
        console.log(`[OTP Service] OTP saved to database for pending registration ${pendingRegistrationId}`);

        // Send OTP via email using SMTP
        try {
            await sendOTPEmail(email.toLowerCase().trim(), otp, name);
            console.log(`[OTP Service] OTP email sent successfully to ${email}`);
        } catch (emailError) {
            console.error(`[OTP Service] Failed to send OTP email to ${email}:`, emailError);
            throw new Error(`Failed to send email: ${emailError.message}`);
        }

        return otp;
    } catch (error) {
        console.error(`[OTP Service] Error in generateAndSendOTPForPending for ${pendingRegistrationId}:`, error);
        throw error;
    }
};

// Helper to get default working hours
const getDefaultWorkingHours = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => {
        const isWeekend = day === 'Saturday' || day === 'Sunday';
        return {
            day,
            isAvailable: !isWeekend,
            startTime: isWeekend ? '' : '09:00 AM',
            endTime: isWeekend ? '' : '05:00 PM'
        };
    });
};

/**
 * Verify OTP and create user or update verification status
 * @param {string} email - User's email
 * @param {string} otp - OTP to verify
 * @returns {Promise<object>} - Result object with success status
 */
const verifyUserOTP = async (email, otp) => {
    // Find the OTP record
    const otpRecord = await OTP.findOne({ email: email.toLowerCase().trim(), otp });

    if (!otpRecord) {
        return { success: false, message: 'Invalid OTP or OTP expired' };
    }

    // Check if this is for a pending registration
    if (otpRecord.pending_registration_id) {
        // Find the pending registration
        const pendingRegistration = await PendingRegistration.findOne({
            id: otpRecord.pending_registration_id
        });

        if (!pendingRegistration) {
            return { success: false, message: 'Registration data not found. Please register again.' };
        }

        // Create the user from pending registration
        const user = await User.create({
            full_name: pendingRegistration.full_name,
            email: pendingRegistration.email,
            password: pendingRegistration.password,
            phone_number: pendingRegistration.phone_number,
            user_type: pendingRegistration.user_type,
            metadata: pendingRegistration.metadata,
            is_admin: pendingRegistration.is_admin,
            email_verified: true // Mark as verified since OTP is verified
        });

        // If it's a provider, create provider record
        let provider = null;
        if (pendingRegistration.user_type === 'DiagnosticProvider') {
            const defaultWorkingHours = getDefaultWorkingHours();
            provider = await Provider.create({
                user_id: user.id,
                provider_name: pendingRegistration.provider_name || pendingRegistration.full_name,
                work_email: pendingRegistration.work_email || pendingRegistration.email,
                work_phone: pendingRegistration.work_phone || pendingRegistration.phone_number,
                working_hours: defaultWorkingHours
            });
        }

        // Delete the pending registration
        await PendingRegistration.deleteOne({ id: pendingRegistration.id });

        // Delete the OTP record
        await OTP.deleteOne({ _id: otpRecord._id });

        // Store user data in Redis cache if Redis is connected
        try {
            if (redisClient.isReady) {
                await redisClient.set(`user:${user.id}`, JSON.stringify({
                    id: user.id,
                    full_name: user.full_name,
                    email: user.email,
                    phone_number: user.phone_number,
                    user_type: user.user_type,
                    is_admin: user.is_admin,
                    email_verified: user.email_verified,
                    created_at: user.created_at
                }), { EX: 60 * 60 * 24 }); // Expire in 24 hours
            }
        } catch (redisError) {
            console.error('Redis caching error:', redisError);
            // Continue without Redis caching
        }

        return {
            success: true,
            user,
            user_type: user.user_type,
            provider: provider,
            isNewUser: true
        };
    } else if (otpRecord.user_id) {
        // Existing user - just update verification status
        const user = await User.findOne({ id: otpRecord.user_id });

        if (!user) {
            return { success: false, message: 'User not found' };
        }

        // Update user's email verification status
        user.email_verified = true;
        await user.save();

        // Delete the OTP record
        await OTP.deleteOne({ _id: otpRecord._id });

        // Update user in Redis if available
        try {
            if (redisClient.isReady) {
                const userData = await redisClient.get(`user:${user.id}`);
                if (userData) {
                    const parsedData = JSON.parse(userData);
                    parsedData.email_verified = true;
                    await redisClient.set(`user:${user.id}`, JSON.stringify(parsedData), { EX: 60 * 60 * 24 });
                }
            }
        } catch (redisError) {
            console.error('Redis update error:', redisError);
            // Continue without Redis update
        }

        return {
            success: true,
            user,
            user_type: user.user_type,
            isNewUser: false
        };
    } else {
        return { success: false, message: 'Invalid OTP record' };
    }
};

/**
 * Request a new OTP for a user or pending registration
 * @param {string} email - User's email
 * @returns {Promise<object>} - Result object with success status
 */
const requestNewOTP = async (email) => {
    try {
        // Normalize email to lowercase
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        if (!normalizedEmail) {
            return { success: false, message: 'Email is required' };
        }

        console.log(`[OTP Service] Requesting new OTP for: ${normalizedEmail}`);

        // First check for pending registration
        const pendingRegistration = await PendingRegistration.findOne({ email: normalizedEmail });

        if (pendingRegistration) {
            console.log(`[OTP Service] Pending registration found: ${pendingRegistration.id}`);
            let name = pendingRegistration.full_name;
            if (pendingRegistration.provider_name) {
                name = pendingRegistration.provider_name;
            }

            // Generate and send OTP for pending registration
            await generateAndSendOTPForPending(pendingRegistration.id, normalizedEmail, name);

            console.log(`[OTP Service] OTP sent successfully to: ${normalizedEmail}`);
            return {
                success: true,
                message: 'OTP sent successfully',
                email: normalizedEmail
            };
        }

        // Check for existing user
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            console.log(`[OTP Service] User not found for email: ${normalizedEmail}`);
            return { success: false, message: 'No registration found with this email address. Please register first.' };
        }

        console.log(`[OTP Service] User found: ${user.id}, verified: ${user.email_verified}`);

        // Check if user is already verified
        if (user.email_verified) {
            console.log(`[OTP Service] Email already verified for: ${normalizedEmail}`);
            return { success: false, message: 'Email is already verified' };
        }

        let name = user.full_name;

        // If the user is a provider, get the provider name
        if (user.user_type === 'DiagnosticProvider') {
            const provider = await Provider.findOne({ user_id: user.id });
            if (provider) {
                name = provider.provider_name;
            }
        }

        // Generate and send new OTP
        console.log(`[OTP Service] Generating and sending OTP for user: ${user.id}`);
        await generateAndSendOTP(user.id, normalizedEmail, name);

        console.log(`[OTP Service] OTP sent successfully to: ${normalizedEmail}`);
        return {
            success: true,
            message: 'OTP sent successfully',
            email: normalizedEmail
        };
    } catch (error) {
        console.error('[OTP Service] Error in requestNewOTP:', error);
        return {
            success: false,
            message: error.message || 'Failed to send OTP. Please try again later.'
        };
    }
};

module.exports = {
    generateAndSendOTP,
    generateAndSendOTPForPending,
    verifyUserOTP,
    requestNewOTP
}; 