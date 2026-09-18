// Validation middleware using Zod
const { z } = require('zod');

// User registration schema
const registerSchema = z.object({
    full_name: z.string().min(2, { message: 'Full name must be at least 2 characters long' }),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    phone_number: z.string().optional().or(z.literal('')).transform(val => val === '' ? undefined : val),
    user_type: z.enum(['Patient', 'Clinician', 'DiagnosticProvider'], {
        message: 'User type must be one of: Patient, Clinician, DiagnosticProvider'
    }),
    metadata: z.record(z.any()).optional()
});

// Provider registration schema
const providerSchema = z.object({
    provider_name: z.string().min(2, { message: 'Provider name must be at least 2 characters long' }),
    work_email: z.string().email({ message: 'Invalid work email address' }),
    work_phone: z.string().min(10, { message: 'Work phone number is required' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
    user_type: z.literal('DiagnosticProvider').optional(),
    metadata: z.record(z.any()).optional()
});

// User login schema
const loginSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(1, { message: 'Password is required' })
});

// OTP verification schema
const otpVerificationSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    otp: z.string().length(6, { message: 'OTP must be 6 digits' }).regex(/^\d+$/, { message: 'OTP must contain only digits' })
});

// Resend OTP schema
const resendOtpSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' })
});

// OAuth login schema
const oauthLoginSchema = z.object({
    idToken: z.string().min(1, { message: 'ID token is required' }),
    provider: z.enum(['google', 'facebook', 'apple'], {
        message: 'Provider must be one of: google, facebook, apple'
    }),
    email: z.string().email({ message: 'Invalid email address' }).optional(),
    name: z.string().optional(),
    photoURL: z.string().url({ message: 'Invalid photo URL' }).optional().or(z.literal('')),
    phoneNumber: z.string().optional()
});

// Forgot password schema
const forgotPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' })
});

// Reset password schema
const resetPasswordSchema = z.object({
    token: z.string().min(1, { message: 'Reset token is required' }),
    newPassword: z.string().min(6, { message: 'Password must be at least 6 characters long' })
});

// Exclusive offers schema
const exclusiveOffersSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' })
});

// Middleware to validate request body
const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: error.errors || error.message
        });
    }
};

module.exports = {
    validateRegister: validate(registerSchema),
    validateLogin: validate(loginSchema),
    validateProviderRegister: validate(providerSchema),
    validateOtpVerification: validate(otpVerificationSchema),
    validateResendOtp: validate(resendOtpSchema),
    validateOAuthLogin: validate(oauthLoginSchema),
    validateForgotPassword: validate(forgotPasswordSchema),
    validateResetPassword: validate(resetPasswordSchema),
    validateExclusiveOffers: validate(exclusiveOffersSchema)
}; 