const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define Appointment Schema (simplified)
const appointmentSchema = new mongoose.Schema({}, { strict: false });
const Appointment = mongoose.model('Appointment', appointmentSchema);

async function updateAppointmentData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const appointmentId = 'rHKlbtgIRl';
        const appointment = await Appointment.findOne({ id: appointmentId });

        if (!appointment) {
            console.log('Appointment not found');
            return;
        }

        // Simulate guest data in formData
        if (!appointment.formData) appointment.formData = {};

        appointment.formData.patientName = "Test Guest";
        appointment.formData.patientEmail = "test.guest@example.com";
        appointment.formData.patientPhone = "08012345678";
        appointment.formData.patientAddress = "123 Guest St";

        // Mark modified
        appointment.markModified('formData');

        await appointment.save();
        console.log('Appointment updated with guest data');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

updateAppointmentData();
