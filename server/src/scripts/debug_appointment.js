const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Define Appointment Schema (simplified for reading)
const appointmentSchema = new mongoose.Schema({}, { strict: false });
const Appointment = mongoose.model('Appointment', appointmentSchema);

async function debugAppointment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const appointmentId = 'rHKlbtgIRl';
        const appointment = await Appointment.findOne({ id: appointmentId });

        if (!appointment) {
            console.log('Appointment not found');
        } else {
            console.log('Appointment found:');
            console.log(JSON.stringify(appointment, null, 2));

            if (appointment.payment) {
                console.log('Payment status:', appointment.payment.status);
            } else {
                console.log('No payment object found');
            }
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

debugAppointment();
