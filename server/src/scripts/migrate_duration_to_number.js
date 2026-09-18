// Migration script to update duration field from string to number
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✓ Connected to MongoDB'))
    .catch(err => {
        console.error('✗ MongoDB connection error:', err);
        process.exit(1);
    });

const Service = require('../models/Service');

async function migrateDurationField() {
    try {
        console.log('\n🔄 Starting duration field migration...\n');

        // Find all services
        const services = await Service.find({});
        console.log(`Found ${services.length} services to check\n`);

        let updatedCount = 0;
        let alreadyCorrectCount = 0;

        for (const service of services) {
            // Check if duration is a string or not a number
            if (typeof service.duration === 'string' || isNaN(service.duration)) {
                console.log(`Updating service: ${service.name}`);
                console.log(`  Old duration: "${service.duration}" (${typeof service.duration})`);

                // Set duration to 0 for services with empty string or invalid values
                service.duration = 0;
                await service.save();

                console.log(`  New duration: ${service.duration} (${typeof service.duration})`);
                console.log('  ✓ Updated\n');
                updatedCount++;
            } else {
                console.log(`✓ Service "${service.name}" already has numeric duration: ${service.duration}`);
                alreadyCorrectCount++;
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('Migration Summary:');
        console.log('='.repeat(50));
        console.log(`Total services: ${services.length}`);
        console.log(`Updated: ${updatedCount}`);
        console.log(`Already correct: ${alreadyCorrectCount}`);
        console.log('='.repeat(50) + '\n');

        console.log('✓ Migration completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n✗ Migration error:', error);
        process.exit(1);
    }
}

// Run migration
migrateDurationField();
