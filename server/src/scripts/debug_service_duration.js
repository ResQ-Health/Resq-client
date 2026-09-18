const axios = require('axios');

async function debugServiceCreation() {
    try {
        console.log('1. Logging in...');
        // Using credentials seen in previous logs/code or generic ones (assuming dev env)
        // If this fails, I'll need to use a known user or create one, but for now assuming typical dev flow
        // Or I can pick a user from the database directly if I had access, but via API is better.
        // I'll try to use the one from the user request metadata if available?
        // User email in Step 0 request: "enaikeleomoh@gmail.com"

        // I'll assume I can't login easily without password. 
        // Instead, I will use the code to manually create a service entry in DB and check retrieval
        // This bypasses auth but verifies the Model and Query logic.

        const mongoose = require('mongoose');
        require('dotenv').config();

        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(process.env.MONGODB_URI);
            console.log('Connected to MongoDB');
        }

        const Service = require('../models/Service');
        const Provider = require('../models/Provider');

        // Find a provider
        const provider = await Provider.findOne();
        if (!provider) {
            console.log('No provider found to attach service to.');
            process.exit(1);
        }
        console.log(`Using provider: ${provider.provider_name} (${provider.id})`);

        // 2. Create Service via Model directly (Backend Logic Check)
        const serviceData = {
            provider_id: provider.id,
            category: 'tests',
            name: `Debug Service ${Date.now()}`,
            description: 'Debug Description',
            price: 1000,
            duration: 45, // Number as requested
            uses: 'Debug Uses'
        };

        console.log('Creating service with data:', serviceData);
        const newService = await Service.create(serviceData);
        console.log('Service created directly in DB:', newService.toObject());

        // 3. Fetch Service via Query (Controller Logic Check)
        const fetchedService = await Service.findById(newService._id);
        console.log('Fetched service from DB:', fetchedService.toObject());

        if (fetchedService.duration === 45) {
            console.log('SUCCESS: Duration field persisted correctly as 45.');
        } else {
            console.log(`FAILURE: Duration field is ${fetchedService.duration}`);
        }

        // 4. Cleanup
        await Service.deleteOne({ _id: newService._id });
        console.log('Cleanup done.');

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debugServiceCreation();
