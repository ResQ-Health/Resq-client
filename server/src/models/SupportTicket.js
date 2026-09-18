const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

const ticketMessageSchema = new mongoose.Schema({
    id: {
        type: String,
        default: () => nanoid(10),
        unique: true,
        required: true
    },
    sender_role: {
        type: String,
        enum: ['provider', 'support'],
        required: true
    },
    sender_id: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    attachments: [
        {
            type: String,
            trim: true
        }
    ],
    created_at: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

const supportTicketSchema = new mongoose.Schema({
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
    provider_user_id: {
        type: String,
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: ['Payments', 'Appointments', 'Profile & verification', 'Services', 'Technical issue', 'Other'],
        default: 'Other',
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
        index: true
    },
    messages: {
        type: [ticketMessageSchema],
        default: () => ([])
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

supportTicketSchema.index({ provider_id: 1, updated_at: -1 });
supportTicketSchema.index({ provider_user_id: 1, updated_at: -1 });
supportTicketSchema.index({ provider_id: 1, status: 1, updated_at: -1 });

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
module.exports = SupportTicket;


