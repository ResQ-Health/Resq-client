const axios = require('axios');
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
require('dotenv').config();

// Import actual models
const User = require('../models/User');
const Provider = require('../models/Provider');
const Appointment = require('../models/Appointment');
const Service = require('../models/Service');

const PORT = process.env.PORT || 6000;
const API_URL = `http://localhost:${PORT}/api/v1`;

async function runTest() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Create a Test Provider
        const testEmail = `test-provider-${nanoid(5).toLowerCase()}@example.com`;
        const testPassword = 'password123';
        const userId = nanoid(10);

        console.log(`Creating test provider with email: ${testEmail}`);

        const user = await User.create({
            id: userId,
            full_name: 'Test Bulk Provider',
            email: testEmail,
            password: testPassword,
            user_type: 'DiagnosticProvider',
            email_verified: true,
            phone_number: '1234567890'
        });



        // Create Provider BEFORE login
        const provider = await Provider.create({
            id: nanoid(10),
            user_id: user.id,
            provider_name: 'Test Bulk Provider',
            work_email: testEmail,
            work_phone: '1234567890',
            working_hours: []
        });
        console.log('Provider created:', provider.id);

        console.log('Logging in to get token...');

        // Login to get valid token from server
        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/provider/login`, {
                email: testEmail,
                password: testPassword
            });
            token = loginRes.data.data.token;
            if (!token) throw new Error('Token not found in login response');
            console.log('Login successful. Token received.');
        } catch (loginError) {
            console.error('Login failed:', loginError.response?.data || loginError.message);
            // Fallback to manual token if login fails, to verify middleware
            console.log('Falling back to manual token generation...');
            const jwt = require('jsonwebtoken');
            // Ensure we use the correct secret - hopefully env is loaded correctly
            if (!process.env.JWT_SECRET) console.error('WARNING: JWT_SECRET is missing in env!');
            token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1d' });
        }

        console.log('Test provider created. Token generated.');

        // 2. Create Pending Appointments
        console.log('Creating 3 pending appointments...');
        const service = await Service.create({
            id: nanoid(10),
            provider_id: provider.id,
            name: `Test Service ${nanoid(5)}`,
            description: 'Test Service Description',
            category: 'consultation',
            price: 1000
        });

        const apptIds = [];
        for (let i = 0; i < 3; i++) {
            const appt = await Appointment.create({
                id: nanoid(10),
                provider_id: provider.id,
                patient_id: user.id, // Self booking for simplicity
                service_id: service.id,
                time_slot_id: nanoid(15), // Unique time slot ID
                status: 'pending',
                appointment_date: new Date(),
                start_time: '10:00 AM',
                end_time: '10:30 AM',
                payment: { status: 'pending', amount: 1000 },
                formData: {
                    forWhom: 'Self',
                    visitedBefore: false,
                    patientName: 'Test User',
                    patientEmail: testEmail,
                    patientPhone: '1234567890'
                }
            });
            apptIds.push(appt.id);
        }
        console.log('Appointments created:', apptIds);

        // 3. Test GET pending appointments
        console.log('\n--- Testing GET pending appointments ---');
        try {
            const res = await axios.get(`${API_URL}/providers/appointments/pending`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Status:', res.status);
            console.log('Count:', res.data.count);
            if (res.data.count === 3) {
                console.log('PASS: Retrieved correct number of pending appointments');
            } else {
                console.error('FAIL: Expected 3 pending appointments, got', res.data.count);
            }
        } catch (e) {
            console.error('Error getting pending appointments:', e.message);
            if (e.response) {
                console.error('Status:', e.response.status);
                console.error('Headers:', JSON.stringify(e.response.headers));
                console.error('Data:', e.response.data);
            }
        }

        // 4. Test Accept All
        console.log('\n--- Testing Accept All ---');
        try {
            const res = await axios.post(`${API_URL}/providers/appointments/pending/accept-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Status:', res.status);
            console.log('Message:', res.data.message);
            console.log('Modified Count:', res.data.data.modifiedCount);

            // Verify in DB
            const pendingCount = await Appointment.countDocuments({ provider_id: provider.id, status: 'pending' });
            const confirmedCount = await Appointment.countDocuments({ provider_id: provider.id, status: 'confirmed' });

            if (pendingCount === 0 && confirmedCount === 3) {
                console.log('PASS: All appointments accepted');
            } else {
                console.error('FAIL: Appointments not accepted properly. Pending:', pendingCount, 'Confirmed:', confirmedCount);
            }

        } catch (e) {
            console.error('Error accepting all:', e.response?.data || e.message);
        }

        // 5. Reset and Test Reject All
        console.log('\n--- Resetting and Testing Reject All ---');
        // Reset to pending
        await Appointment.updateMany({ provider_id: provider.id }, { status: 'pending' });

        try {
            const res = await axios.post(`${API_URL}/providers/appointments/pending/reject-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Status:', res.status);
            console.log('Modified Count:', res.data.data.modifiedCount);

            const cancelledCount = await Appointment.countDocuments({ provider_id: provider.id, status: 'cancelled' });
            if (cancelledCount === 3) {
                console.log('PASS: All appointments rejected');
            } else {
                console.error('FAIL: Appointments not rejected properly. Cancelled:', cancelledCount);
            }

        } catch (e) {
            console.error('Error rejecting all:', e.response?.data || e.message);
        }

        // Clean up
        console.log('\nCleaning up...');
        await Appointment.deleteMany({ provider_id: provider.id });
        await Service.deleteMany({ provider_id: provider.id });
        await Provider.deleteMany({ _id: provider._id });
        await User.deleteMany({ _id: user._id });

        console.log('Done.');

    } catch (error) {
        console.error('Script Failed:', error);
    } finally {
        await mongoose.disconnect();
    }
}

runTest();
