// Provider model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Define the working hours schema
const workingHoursSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    isAvailable: {
        type: Boolean,
        default: false
    },
    startTime: {
        type: String,
        default: ''
    },
    endTime: {
        type: String,
        default: ''
    }
}, { _id: false });

// Define the administrative details schema
const administrativeDetailsSchema = new mongoose.Schema({
    fullname: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    phone: {
        type: String,
        trim: true
    },
    permissionLevel: {
        type: String,
        enum: ['Admin', 'Staff'],
        default: 'Staff'
    },
    password: {
        type: String,
        required: true
    },
    image: {
        type: String,
        default: ''
    }
}, { _id: false });

// Define the bank details schema
const bankDetailsSchema = new mongoose.Schema({
    bank_name: {
        type: String,
        trim: true
    },
    account_number: {
        type: String,
        trim: true
    },
    account_name: {
        type: String,
        trim: true
    },
    bank_code: {
        type: String,
        trim: true
    },
    is_verified: {
        type: Boolean,
        default: false
    }
}, { _id: false });

// Define the notification settings schema
const notificationSettingsSchema = new mongoose.Schema({
    email: {
        type: Boolean,
        default: true
    },
    push: {
        type: Boolean,
        default: true
    },
    sms: {
        type: Boolean,
        default: true
    }
}, { _id: false });

// Define the Provider schema
const providerSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    user_id: {
        type: String,
        required: true,
        unique: true
    },
    provider_name: {
        type: String,
        required: true,
        trim: true
    },
    work_email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true
    },
    work_phone: {
        type: String,
        required: true,
        trim: true
    },
    services: [{
        type: String,
        ref: 'Service'
    }],
    address: {
        street: String,
        city: String,
        state: String,
        country: String,
        postal_code: String
    },
    working_hours: [workingHoursSchema],
    administrativedetails: administrativeDetailsSchema,
    bank_details: {
        type: bankDetailsSchema,
        default: () => ({})
    },
    profile_complete: {
        type: Boolean,
        default: false
    },
    fcm_token: {
        type: String,
        default: ''
    },
    notification_settings: {
        type: notificationSettingsSchema,
        default: () => ({})
    },
    about: {
        type: String,
        trim: true
    },
    banner_image_url: {
        type: String,
        trim: true
    },
    logo_image_url: {
        type: String,
        trim: true,
        default: ''
    },
    gallery_image_urls: [
        {
            type: String,
            trim: true
        }
    ],
    social_links: {
        website: String,
        facebook: String,
        instagram: String,
        twitter: String
    },
    accreditations: [
        {
            name: String,
            issuing_body: String,
            year: Number
        }
    ],
    policy: {
        type: String,
        trim: true,
        default: ''
    },
    auto_confirm_appointments: {
        type: Boolean,
        default: true
    },
    request_to_book: {
        type: Boolean,
        default: false
    },
    ratings: {
        average: {
            type: Number,
            default: 0
        },
        count: {
            type: Number,
            default: 0
        }
    },
    reviews: [
        {
            patient_id: { type: String, index: true },
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String, trim: true },
            tags: [{ type: String, trim: true }],
            created_at: { type: Date, default: Date.now }
        }
    ],
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: {
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
});

// Create and export the Provider model
const Provider = mongoose.model('Provider', providerSchema);
module.exports = Provider;
