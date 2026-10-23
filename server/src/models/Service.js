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
    service_type: {
        type: String,
        enum: ['radiology', 'laboratory', 'consultation', 'other'],
        default: 'radiology'
    },
    modality: {
        type: String,
        trim: true,
        default: null
    },
    name: {
        type: String,
        required: true,
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
    codes: [{
        system: {
            type: String,
            default: 'CPT'
        },
        code: {
            type: String,
            required: true
        }
    }],
    body_part: {
        type: String,
        trim: true,
        default: null
    },
    procedure_details: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    price: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'NGN'
    },
    duration: {
        type: Number,
        min: 0,
        default: 30
    },
    preparation: {
        type: String,
        trim: true,
        default: ''
    },
    requirements: [{
        type: String,
        trim: true
    }],
    report_turnaround: {
        min: {
            type: Number,
            default: 24
        },
        max: {
            type: Number,
            default: 48
        },
        unit: {
            type: String,
            default: 'hours'
        }
    },
    is_available: {
        type: Boolean,
        default: true
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
serviceSchema.index({ provider_id: 1, name: 1 });
serviceSchema.index({ 'codes.code': 1 });
serviceSchema.index({ modality: 1 });
serviceSchema.index({ service_type: 1 });

// Create and export the Service model
const Service = mongoose.model('Service', serviceSchema);
module.exports = Service; 