// Test script for payment history endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api/v1';

// Test data
const testUser = {
    email: 'joshuanasiru@aol.com',
    password: 'password123'
};

async function testPaymentHistory() {
    try {
        console.log('🧪 Testing Payment History Endpoints...\n');

        // 1. Login to get auth token
        console.log('1. Logging in...');
        const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
        const token = loginResponse.data.data.token;
        console.log('✅ Login successful\n');

        const headers = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        // 2. Test get payment history
        console.log('2. Getting payment history...');
        const historyResponse = await axios.get(`${BASE_URL}/payments/history`, { headers });
        console.log('✅ Payment history retrieved:');
        console.log(JSON.stringify(historyResponse.data, null, 2));
        console.log('\n');

        // 3. Test get individual payment receipt (if any appointments exist)
        if (historyResponse.data.data && historyResponse.data.data.length > 0) {
            const appointmentId = historyResponse.data.data[0].appointment_id;
            console.log(`3. Getting payment receipt for appointment ${appointmentId}...`);
            const receiptResponse = await axios.get(`${BASE_URL}/payments/receipt/${appointmentId}`, { headers });
            console.log('✅ Payment receipt retrieved:');
            console.log(JSON.stringify(receiptResponse.data, null, 2));
        } else {
            console.log('3. No payment history found to test receipt endpoint\n');
        }

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
testPaymentHistory();
