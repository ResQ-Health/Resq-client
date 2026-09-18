// OTP model schema
const mongoose = require('mongoose');

// Define the OTP schema
const otpSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: false // Optional for pending registrations
    },
    pending_registration_id: {
        type: String,
        required: false // Used for pending registrations
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // OTP expires after 1 hour
    }
});

// Create and export the OTP model
const OTP = mongoose.model('OTP', otpSchema);
module.exports = OTP; 