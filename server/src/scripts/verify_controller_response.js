const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
require('dotenv').config();

// Mock req, res objects
const mockReq = (body, user) => ({
    body,
    user,
    params: {}
});

const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

async function verifyServiceController() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Service = require('../models/Service');
        const Provider = require('../models/Provider');
        const { createService } = require('../controllers/serviceController'); // Ensure path is correct

        // 1. Find a provider and user
        const provider = await Provider.findOne();
        if (!provider) throw new Error('No provider found');

        // Mock user object (needs id to match provider.user_id)
        // We need to fetch the User associated with this provider to get the ID right if the controller checks it
        // Controller: const provider = await Provider.findOne({ user_id: userId });
        const user = { id: provider.user_id };

        console.log(`Testing with Provider: ${provider.provider_name} (User ID: ${user.id})`);

        // 2. Mock Request with Duration
        const req = mockReq({
            name: `Controller Test Service ${Date.now()}`,
            category: 'tests',
            description: 'Testing duration field return',
            price: 5000,
            duration: 90, // 90 minutes
            metadata: { note: 'test' }
        }, user);

        const res = mockRes();

        // 3. Call Controller
        console.log('Calling serviceController.createService...');
        await createService(req, res);

        // 4. Verify Response
        if (res.data && res.data.success) {
            const createdService = res.data.data;
            console.log('Response Data:', JSON.stringify(createdService, null, 2));

            if (createdService.duration === 90) {
                console.log('SUCCESS: Duration field (90) is present in the response.');
            } else {
                console.error(`FAILURE: Duration field is missing or incorrect: ${createdService.duration}`);
            }

            // Cleanup
            await Service.deleteOne({ _id: createdService._id });
        } else {
            console.error('Controller failed:', res.data);
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verifyServiceController();
