const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
require('dotenv').config();

// Mock objects for Controller testing
const mockReq = (body, user, params = {}) => ({
    body,
    user,
    params
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

async function verifyFullCRUD() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const Service = require('../models/Service');
        const Provider = require('../models/Provider');
        const providerController = require('../controllers/providerController');

        // 1. Setup User/Provider
        // We need a real provider ID to link the service to, to pass validation if any
        const provider = await Provider.findOne();
        if (!provider) throw new Error('No provider found');
        const user = { id: provider.user_id };

        console.log(`Using Provider: ${provider.provider_name} (${provider.id})`);

        let serviceId = null;
        let dbId = null;

        // ==========================================
        // CREATE
        // ==========================================
        console.log('\n--- TESTING CREATE ---');
        const createReq = mockReq({
            name: `CRUD Test ${Date.now()}`,
            category: 'tests',
            description: 'CRUD Description',
            price: 1000,
            duration: 60, // Send as number
            uses: 'CRUD Uses'
        }, user);

        const createRes = mockRes();
        await providerController.createService(createReq, createRes);

        if (createRes.data && createRes.data.success) {
            const created = createRes.data.data;
            serviceId = created.id;
            dbId = created._id;
            console.log('Create Success.');
            console.log(`Duration: ${created.duration}`);

            if (created.duration !== 60) console.error('FAIL: Create duration mismatch');
        } else {
            console.error('Create Failed:', createRes.data);
            // If create fails due to validation (like password), we might manually create a service to test the rest
            // provided the logic for 'create' was the one failing.
            // But we want to test the controller logic.
        }

        if (!serviceId) {
            // Fallback: Manually create if controller failed (likely due to unrelated provider-save validation)
            // This allows us to test Read/Update even if Create controller has side-effect bugs
            console.log('Manual Create fallback...');
            const newService = await Service.create({
                provider_id: provider.id,
                category: 'tests',
                name: `CRUD Test ${Date.now()}`,
                description: 'Manual Desc',
                price: 1000,
                duration: 60,
                uses: 'Manual Uses'
            });
            serviceId = newService.id;
            dbId = newService._id;
            console.log('Manually created service for testing Update/Read');
        }

        // ==========================================
        // READ (GET ALL)
        // ==========================================
        console.log('\n--- TESTING READ (GET ALL) ---');
        const readReq = mockReq({}, user);
        const readRes = mockRes();
        await providerController.getProviderServices(readReq, readRes);

        if (readRes.data && readRes.data.success) {
            const list = readRes.data.data;
            const found = list.find(s => s.id === serviceId);
            if (found) {
                console.log('Found service in list.');
                console.log(`Duration in list: ${found.duration}`);
            } else {
                console.error('FAIL: Service not found in list');
            }
        } else {
            console.error('Read Failed:', readRes.data);
        }

        // ==========================================
        // UPDATE
        // ==========================================
        console.log('\n--- TESTING UPDATE ---');
        const updateReq = mockReq({
            duration: "90" // Send as STRING to test casting
        }, user, { id: serviceId });

        const updateRes = mockRes();
        await providerController.updateService(updateReq, updateRes);

        if (updateRes.data && updateRes.data.success) {
            const updated = updateRes.data.data;
            console.log('Update Success.');
            console.log(`Updated Duration: ${updated.duration} (Type: ${typeof updated.duration})`);

            if (updated.duration === 90) {
                console.log('SUCCESS: String "90" correctly updated to Number 90');
            } else {
                console.error(`FAIL: Updated duration is ${updated.duration}`);
            }
        } else {
            console.error('Update Failed:', updateRes.data);
        }

        // ==========================================
        // READ AGAIN
        // ==========================================
        console.log('\n--- TESTING READ AFTER UPDATE ---');
        const read2Req = mockReq({}, user);
        const read2Res = mockRes();
        await providerController.getProviderServices(read2Req, read2Res);

        if (read2Res.data && read2Res.data.success) {
            const list = read2Res.data.data;
            const found = list.find(s => s.id === serviceId);
            if (found) {
                console.log(`Duration in list after update: ${found.duration}`);
            }
        }

        // Cleanup
        if (dbId) {
            await Service.deleteOne({ _id: dbId });
            console.log('\nCleanup done.');
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verifyFullCRUD();
