// TimeSlot model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Define the TimeSlot schema
const timeSlotSchema = new mongoose.Schema({
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
    date: {
        type: Date,
        required: true,
        index: true
    },
    start_time: {
        type: String,
        required: true
    },
    end_time: {
        type: String,
        required: true
    },
    is_available: {
        type: Boolean,
        default: true,
        index: true
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

// Create a compound index for faster queries
timeSlotSchema.index({ provider_id: 1, date: 1, is_available: 1 });

// Create and export the TimeSlot model
const TimeSlot = mongoose.model('TimeSlot', timeSlotSchema);
module.exports = TimeSlot; 