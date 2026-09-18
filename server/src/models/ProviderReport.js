// Provider Report model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const providerReportSchema = new mongoose.Schema({
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
    patient_id: {
        type: String,
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: ['Service quality', 'Fraud/Scam', 'Abuse/Harassment', 'No show', 'Other'],
        default: 'Other'
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000
    },
    anonymous: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['open', 'reviewing', 'resolved'],
        default: 'open',
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

providerReportSchema.index({ provider_id: 1, created_at: -1 });
providerReportSchema.index({ provider_id: 1, status: 1, created_at: -1 });
providerReportSchema.index({ patient_id: 1, provider_id: 1, created_at: -1 });

const ProviderReport = mongoose.model('ProviderReport', providerReportSchema);
module.exports = ProviderReport;


