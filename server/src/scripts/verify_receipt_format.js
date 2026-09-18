const axios = require('axios');
const fs = require('fs');

async function verifyReceipt() {
    const appointmentId = 'rHKlbtgIRl';
    const url = `http://localhost:6000/api/v1/payments/receipt/${appointmentId}`;

    console.log(`Requesting receipt from: ${url}`);

    try {
        const response = await axios.get(url);
        const data = response.data;

        console.log('Response Status:', response.status);
        console.log('Success:', data.success);
        console.log('Message:', data.message);

        if (data.data && data.data.pdf) {
            console.log('PDF Data Present: Yes');
            console.log('Filename:', data.data.filename);
            console.log('Content Type:', data.data.contentType);

            console.log('Patient Name:', data.data.patient?.name);
            console.log('Appointment Location:', JSON.stringify(data.data.appointment?.location));
            console.log('Payment Total:', data.data.payment_summary?.total);

            // Decode and save to verify it's a valid PDF
            const pdfBuffer = Buffer.from(data.data.pdf, 'base64');
            fs.writeFileSync('test_receipt.pdf', pdfBuffer);
            console.log('Saved test_receipt.pdf for manual inspection');
        } else {
            console.log('PDF Data Present: No');
            console.log('Response Data:', JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
        }
    }
}

verifyReceipt();
