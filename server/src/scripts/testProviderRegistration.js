// Script to test provider registration
require('dotenv').config();
const axios = require('axios');

const testProviderRegistration = async () => {
    try {
        console.log('Testing provider registration...');

        // Provider registration data
        const providerData = {
            provider_name: "ABC Diagnostics",
            work_email: "info@abcdiagnostics.com",
            work_phone: "9876543210",
            password: "password123",
            user_type: "DiagnosticProvider"
        };

        // Make the API request
        const response = await axios.post('http://localhost:3000/api/v1/providers/register', providerData);

        console.log('Registration successful:', response.data);
    } catch (error) {
        console.error('Registration failed:', error.response ? error.response.data : error.message);
    }
};

// Execute the test
testProviderRegistration(); 