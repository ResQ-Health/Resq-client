// Pending Registration model schema - stores registration data before email verification
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Define the Pending Registration schema
const pendingRegistrationSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    phone_number: {
        type: String,
        trim: true,
        default: ''
    },
    user_type: {
        type: String,
        required: true,
        enum: ['Patient', 'Clinician', 'DiagnosticProvider']
    },
    is_admin: {
        type: Boolean,
        default: false
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    // Provider-specific fields (only for DiagnosticProvider)
    provider_name: {
        type: String,
        trim: true
    },
    work_email: {
        type: String,
        lowercase: true,
        trim: true
    },
    work_phone: {
        type: String,
        trim: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600 // Pending registration expires after 1 hour
    }
});

// Create and export the Pending Registration model
const PendingRegistration = mongoose.model('PendingRegistration', pendingRegistrationSchema);
module.exports = PendingRegistration;

