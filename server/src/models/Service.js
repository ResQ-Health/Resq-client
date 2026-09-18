// Service model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Define the Service schema
const serviceSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    provider_id: {
        type: String,
        required: true,
        index: true
    },
    category: {
        type: String,
        required: true,
        enum: ['scans', 'tests', 'consultation'],
        index: true
    },
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    uses: {
        type: String,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    duration: {
        type: Number,
        min: 0,
        default: 0
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
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

// Create index for faster queries
serviceSchema.index({ category: 1, name: 1 });

// Create and export the Service model
const Service = mongoose.model('Service', serviceSchema);
module.exports = Service; 