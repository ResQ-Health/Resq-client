// Appointment model schema
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');

// Define the form data schema
const formDataSchema = new mongoose.Schema({
    forWhom: {
        type: String,
        enum: ['Self', 'Other'],
        required: true
    },
    visitedBefore: {
        type: Boolean,
        required: true
    },
    identificationNumber: {
        type: String,
        trim: true
    },
    comments: {
        type: String,
        trim: true
    },
    // Communication preference for who receives emails
    communicationPreference: {
        type: String,
        enum: ['Booker', 'Patient', 'Both'],
        default: 'Booker'
    },
    // Additional fields for when booking for someone else
    patientName: {
        type: String,
        trim: true
    },
    patientEmail: {
        type: String,
        trim: true
    },
    patientPhone: {
        type: String,
        trim: true
    },
    patientAddress: {
        type: String,
        trim: true
    },
    patientGender: {
        type: String,
        enum: ['Male', 'Female', 'Other', ''],
        default: ''
    },
    patientDOB: {
        type: String,
        trim: true
    },
    // Clinician booking fields
    bookedByClinician: {
        type: Boolean,
        default: false
    },
    clinicianId: {
        type: String,
        trim: true
    },
    clinicianName: {
        type: String,
        trim: true
    },
    clinicianEmail: {
        type: String,
        trim: true
    }
}, { _id: false });

// Define the payment schema
const paymentSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    method: {
        type: String,
        trim: true
    },
    paystackReference: {
        type: String,
        trim: true
    },
    amount: {
        type: Number,
        min: 0
    },
    paidAt: {
        type: Date
    }
}, { _id: false });

// Define the Appointment schema
const appointmentSchema = new mongoose.Schema({
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
    clinician_id: {
        type: String,
        ref: 'User',
        required: false,
        index: true
    },
    time_slot_id: {
        type: String,
        required: false // No longer required as we're using date and time directly
    },
    service_id: {
        type: String,
        required: false,
        index: true
    },
    formData: {
        type: formDataSchema,
        required: false
    },
    payment: {
        type: paymentSchema,
        default: () => ({})
    },
    appointment_date: {
        type: Date,
        required: true
    },
    start_time: {
        type: String,
        required: true
    },
    end_time: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'cancelled', 'completed', 'no-show', 'rejected'],
        default: 'pending'
    },
    review: {
        rating: { type: Number, min: 1, max: 5 },
        comment: { type: String, trim: true },
        reviewDate: { type: Date }
    },
    notes: {
        type: String,
        trim: true
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



// Pre-validate middleware to normalize forWhom values
appointmentSchema.pre('validate', function (next) {
    if (this.formData && this.formData.forWhom) {
        if (this.formData.forWhom.toLowerCase() === 'myself') {
            this.formData.forWhom = 'Self';
        } else if (['others', 'someoneelse'].includes(this.formData.forWhom.toLowerCase())) {
            this.formData.forWhom = 'Other';
        }
    }
    next();
});

// Create compound indexes for faster queries
appointmentSchema.index({ patient_id: 1, appointment_date: 1 });
appointmentSchema.index({ provider_id: 1, appointment_date: 1 });
appointmentSchema.index({ service_id: 1, status: 1 });
appointmentSchema.index({ provider_id: 1, start_time: 1, end_time: 1, appointment_date: 1 });
appointmentSchema.index({ clinician_id: 1, appointment_date: 1 });

// Virtual for populating patient details
appointmentSchema.virtual('patient', {
    ref: 'User',
    localField: 'patient_id',
    foreignField: 'id',
    justOne: true
});

// Virtual for populating clinician details
appointmentSchema.virtual('clinician', {
    ref: 'User',
    localField: 'clinician_id',
    foreignField: 'id',
    justOne: true
});

// Virtual for populating service details
appointmentSchema.virtual('service', {
    ref: 'Service',
    localField: 'service_id',
    foreignField: 'id',
    justOne: true
});

// Set virtuals to be included in toJSON and toObject
appointmentSchema.set('toJSON', { virtuals: true });
appointmentSchema.set('toObject', { virtuals: true });

// Create and export the Appointment model
const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment; 