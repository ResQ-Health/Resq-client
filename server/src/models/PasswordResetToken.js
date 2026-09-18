// Password Reset Token model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Define the Password Reset Token schema
const passwordResetTokenSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true,
        index: true
    },
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true
    },
    token: {
        type: String,
        required: true,
        unique: true,
        default: () => nanoid(32) // Generate a secure random token
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Token expires after 1 hour (3600 seconds)
    },
    used: {
        type: Boolean,
        default: false
    }
});

// Create and export the Password Reset Token model
const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
module.exports = PasswordResetToken;

