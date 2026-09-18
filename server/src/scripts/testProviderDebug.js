// Script to test provider registration with both endpoints
require('dotenv').config();
const axios = require('axios');

const testProviderRegistration = async () => {
    const baseUrl = 'http://localhost:3000';

    // Provider registration data
    const providerData = {
        provider_name: "ABC Diagnostics",
        work_email: "info2@abcdiagnostics.com", // Using a different email to avoid duplicates
        work_phone: "9876543210",
        password: "password123",
        user_type: "DiagnosticProvider"
    };

    try {
        console.log('\n1. Testing debug endpoint without validation...');
        // Test the debug endpoint first
        try {
            const debugResponse = await axios.post(`${baseUrl}/api/v1/providers/debug-register`, providerData);
            console.log('Debug registration successful:', debugResponse.data);
        } catch (debugError) {
            console.error('Debug registration failed:',
                debugError.response ? debugError.response.data : debugError.message);
        }

        // Update email to avoid duplicate
        providerData.work_email = "info3@abcdiagnostics.com";

        console.log('\n2. Testing regular endpoint with validation...');
        // Test the regular endpoint with validation
        try {
            const regularResponse = await axios.post(`${baseUrl}/api/v1/providers/register`, providerData);
            console.log('Regular registration successful:', regularResponse.data);
        } catch (regularError) {
            console.error('Regular registration failed:',
                regularError.response ? regularError.response.data : regularError.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
};

// Execute the test
testProviderRegistration(); 