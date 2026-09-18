require('dotenv').config();
const mongoose = require('mongoose');
const pdfService = require('./src/services/pdfService');
const notificationService = require('./src/services/notificationService');

// Mock Data
const mockPatient = {
    full_name: 'Test Patient',
    email: 'enaikeleomoh@gmail.com', // Use a real email to verify receipt
    personal_details: {
        first_name: 'Test',
        last_name: 'Patient'
    }
};

const mockProvider = {
    provider_name: 'Dr. Test Provider',
    address: '123 Test St, Health City'
};

const mockService = {
    name: 'General Consultation',
    price: 5000
};

const mockAppointment = {
    id: 'APT-TEST-12345',
    appointment_date: new Date(),
    start_time: '10:00 AM',
    end_time: '10:30 AM',
    payment: {
        status: 'completed',
        amount: 5000,
        paystackReference: 'REF-TEST-12345',
        paidAt: new Date()
    },
    formData: {
        forWhom: 'Self'
    }
};

async function testReceiptFlow() {
    try {
        console.log('Testing Receipt Generation...');
        const pdfBuffer = await pdfService.generateReceiptPDF(
            mockAppointment,
            mockPatient,
            mockProvider,
            mockService
        );
        console.log('PDF Generated successfully. Size:', pdfBuffer.length);

        console.log('Testing Email Sending...');
        await notificationService.sendReceiptEmail(
            mockPatient,
            mockAppointment,
            pdfBuffer,
            'test-receipt.pdf'
        );
        console.log('Email sent successfully!');

    } catch (error) {
        console.error('Test Failed:', error);
    } finally {
        process.exit(0);
    }
}

testReceiptFlow();
