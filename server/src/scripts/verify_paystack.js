const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function verifyPaystack() {
    const reference = 'RESQ-rHKlbtgIRl-1764581369189';
    const secretKey = process.env.PAYSTACK_SECRET_KEY;

    console.log(`Verifying reference: ${reference}`);

    try {
        const response = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            {
                headers: { Authorization: `Bearer ${secretKey}` },
            },
        );

        const data = response.data;
        console.log('Paystack Response Status:', data.status);
        console.log('Transaction Status:', data.data.status);
        console.log('Amount:', data.data.amount);
        console.log('Gateway Response:', data.data.gateway_response);

    } catch (error) {
        console.error('Error verifying payment:', error.response ? error.response.data : error.message);
    }
}

verifyPaystack();
