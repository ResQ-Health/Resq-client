// User model schema
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { nanoid } = require('nanoid');

// Define the User schema
const userSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    phone_number: {
        type: String,
        trim: true
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
    email_verified: {
        type: Boolean,
        default: false
    },
    password: {
        type: String,
        required: false, // Made optional to support OAuth users
        minlength: 6 // Only enforced if password is provided
    },
    // OAuth fields
    oauth_provider: {
        type: String,
        enum: ['google', 'facebook', 'apple'],
        default: null
    },
    oauth_id: {
        type: String,
        default: null,
        sparse: true // Allows multiple nulls but enforces uniqueness for non-null values
    },
    oauth_metadata: {
        // Store additional OAuth information
        provider_user_id: { type: String, default: null },
        provider_email: { type: String, default: null },
        provider_name: { type: String, default: null },
        provider_photo: { type: String, default: null },
        last_oauth_login: { type: Date, default: null },
        oauth_account_created: { type: Date, default: null }
    },
    profile_picture: {
        url: { type: String, default: '' }
    },
    personal_details: {
        first_name: { type: String, trim: true },
        last_name: { type: String, trim: true },
        date_of_birth: { type: String, trim: true },
        gender: { type: String, trim: true }
    },
    contact_details: {
        email_address: { type: String, trim: true },
        phone_number: { type: String, trim: true }
    },
    location_details: {
        address: { type: String, trim: true },
        city: { type: String, trim: true },
        state: { type: String, trim: true }
    },
    metadata: {
        emergency_contact: {
            first_name: { type: String, trim: true },
            last_name: { type: String, trim: true },
            phone_number: { type: String, trim: true },
            relationship_to_you: { type: String, trim: true }
        },
        next_of_kin: {
            first_name: { type: String, trim: true },
            last_name: { type: String, trim: true },
            phone_number: { type: String, trim: true },
            relationship_to_you: { type: String, trim: true }
        },
        same_as_emergency_contact: { type: Boolean, default: false },
        added_by_provider: { type: String, trim: true }, // Store provider ID for manually added patients
        added_at: { type: Date }, // Store timestamp when added by provider
        identification_number: { type: String, trim: true }, // Store auto-generated identification number
        notification_settings: {
            email: { type: Boolean, default: true },
            push: { type: Boolean, default: true },
            sms: { type: Boolean, default: false }
        }
    },
    payment_methods: [{
        id: { type: String, required: true }, // Payment method ID from payment provider
        type: { type: String, default: 'card' }, // 'card', 'bank', etc.
        provider: { type: String, required: true }, // 'paystack', 'flutterwave', etc.
        last4: { type: String }, // Last 4 digits of card
        brand: { type: String }, // 'visa', 'mastercard', etc.
        expiry_month: { type: Number },
        expiry_year: { type: Number },
        authorization_code: { type: String }, // Authorization code from payment provider
        card_type: { type: String }, // 'debit', 'credit', etc.
        bank: { type: String }, // Bank name if applicable
        account_name: { type: String }, // Account name if applicable
        is_default: { type: Boolean, default: false }, // Default payment method
        created_at: { type: Date, default: Date.now }
    }],
    favorite_providers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Provider'
    }],
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

// Virtual or embedded reviews for user history (optional simple log)
userSchema.add({
    reviews: [
        {
            provider_id: { type: String, index: true },
            rating: { type: Number, min: 1, max: 5 },
            comment: { type: String, trim: true },
            tags: [{ type: String, trim: true }],
            created_at: { type: Date, default: Date.now }
        }
    ]
});

// Pre-save middleware to hash the password
userSchema.pre('save', async function (next) {
    // Skip if password is not modified
    if (!this.isModified('password')) return next();

    // If password is empty, skip hashing
    if (!this.password) return next();

    // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
    // This prevents double-hashing
    if (this.password.startsWith('$2a$') ||
        this.password.startsWith('$2b$') ||
        this.password.startsWith('$2y$')) {
        return next();
    }

    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        // Hash the password
        this.password = await bcrypt.hash(this.password, salt);
        console.log(`[User Model] Password hashed for user ${this.id || 'new'}`);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password for login
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Note: id field already has unique: true which automatically creates an index
// No need to explicitly create another index on id

// Create partial unique index for phone_number - only for patients
// This ensures phone numbers are unique only for patients, not for providers/clinicians
userSchema.index(
    { phone_number: 1 },
    { 
        unique: true, 
        sparse: true, // Allows multiple null/empty values
        partialFilterExpression: { 
            user_type: 'Patient',
            phone_number: { $exists: true, $ne: null, $ne: '' }
        }
    }
);

// Create compound index for common queries
userSchema.index({ user_type: 1, email: 1 });

// Create and export the User model
const User = mongoose.model('User', userSchema);
module.exports = User; 