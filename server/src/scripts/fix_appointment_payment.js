const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define Appointment Schema (simplified)
const appointmentSchema = new mongoose.Schema({}, { strict: false });
const Appointment = mongoose.model('Appointment', appointmentSchema);

async function fixAppointment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const appointmentId = 'rHKlbtgIRl';
        const appointment = await Appointment.findOne({ id: appointmentId });

        if (!appointment) {
            console.log('Appointment not found');
            return;
        }

        // Update payment details
        appointment.payment.status = 'completed';
        appointment.payment.paidAt = new Date();
        // Ensure amount is correct (3000)
        appointment.payment.amount = 3000;

        // Mark modified because payment is a mixed type or nested object
        appointment.markModified('payment');

        await appointment.save();
        console.log('Appointment payment status updated to completed');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

fixAppointment();
