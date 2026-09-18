// Review model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const reviewSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    patient_id: {
        type: String,
        required: true,
        index: true
    },
    provider_id: {
        type: String,
        required: true,
        index: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        trim: true,
        default: ''
    },
    likes: [{
        type: String, // Array of patient IDs who liked this review
        index: true
    }],
    saved_by: [{
        type: String, // Array of patient IDs who saved this review
        index: true
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

const Review = mongoose.model('Review', reviewSchema);
module.exports = Review;


