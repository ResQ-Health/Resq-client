// Test script to create a service with duration field
const axios = require('axios');

async function testCreateServiceWithDuration() {
    try {
        // First, login as a provider to get the token
        console.log('Testing service creation with duration field...\n');

        // Note: You'll need to replace this with actual provider credentials
        const loginResponse = await axios.post('http://localhost:5173/api/v1/auth/login', {
            email: 'enaikeleomoh@gmail.com',
            password: 'your_password_here'
        });

        const token = loginResponse.data.token;
        console.log('✓ Logged in successfully\n');

        // Create a new service with duration
        const serviceData = {
            name: 'Complete Blood Count (CBC)',
            category: 'tests',
            description: 'A comprehensive blood test that measures different components of blood',
            uses: 'Diagnosis of anemia, infections, and blood disorders',
            price: 8000,
            duration: '45 minutes',
            metadata: {
                preparation: 'Fasting for 8-12 hours recommended',
                report_time: '24 hours',
                equipment_needed: ['blood analyzer', 'centrifuge']
            }
        };

        const createResponse = await axios.post(
            'http://localhost:5173/api/v1/providers/services',
            serviceData,
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('✓ Service created successfully:');
        console.log(JSON.stringify(createResponse.data, null, 2));

        // Verify it appears in the providers list
        const providersResponse = await axios.get('http://localhost:5173/api/v1/providers/all');
        const provider = providersResponse.data.data[0];
        const newService = provider.services.find(s => s.name === serviceData.name);

        if (newService && newService.duration) {
            console.log('\n✓ Duration field is present in /api/v1/providers/all response:');
            console.log(`  Service: ${newService.name}`);
            console.log(`  Duration: ${newService.duration}`);
            console.log(`  Price: ₦${newService.price}`);
        } else {
            console.log('\n✗ Duration field not found in response');
        }

    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

testCreateServiceWithDuration();
