const axios = require('axios');

async function testGuestBooking() {
    try {
        const payload = {
            "providerId": "wrjz4fT6KX",
            "serviceId": "UkFH7ckwgi",
            "date": "2025-12-19",
            "start_time": "3:00 PM",
            "end_time": "3:30 PM",
            "formData": {
                "forWhom": "Self",
                "visitedBefore": true,
                "identificationNumber": "s",
                "comments": "s",
                "communicationPreference": "Booker",
                "patientName": "abdurrahman yusuff",
                "patientEmail": "abdurrahmanyusuph@gmail.com",
                "patientPhone": "08138966213",
                "patientAddress": "15 Bode Thomas Street",
                "patientGender": "Male",
                "patientDOB": "1990-01-15"
            },
            "notes": "s"
        };

        console.log('Sending booking request...');
        const response = await axios.post('http://localhost:6000/api/v1/appointments/book', payload);

        console.log('Response Status:', response.status);
        console.log('Success:', response.data.success);
        console.log('Message:', response.data.message);
        console.log('Patient Name:', response.data.data.appointment.patient_name);
        console.log('Patient Email (in formData):', response.data.data.appointment.payment.formData.patientEmail);

    } catch (error) {
        console.error('Error:', error.response ? error.response.data : error.message);
    }
}

testGuestBooking();
