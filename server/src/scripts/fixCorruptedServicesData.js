// Script to fix corrupted services data in provider documents
// This should be run once to clean up the corrupted services field

const mongoose = require('mongoose');
require('dotenv').config();

async function fixCorruptedServicesData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('providers');

        // Find providers with corrupted services data
        const corruptedProviders = await collection.find({
            services: { $type: 'string' } // Find documents where services is a string
        }).toArray();

        console.log(`Found ${corruptedProviders.length} providers with corrupted services data`);

        for (const provider of corruptedProviders) {
            console.log(`Fixing provider: ${provider.provider_name} (${provider.id})`);

            try {
                // Parse the stringified services array
                let servicesArray;
                try {
                    servicesArray = JSON.parse(provider.services);
                } catch (parseError) {
                    console.log(`Could not parse services for ${provider.provider_name}, setting to empty array`);
                    servicesArray = [];
                }

                // Filter out non-ObjectId values and keep only valid ObjectIds
                const validServices = servicesArray.filter(service => {
                    if (typeof service === 'string') {
                        return mongoose.Types.ObjectId.isValid(service);
                    }
                    return mongoose.Types.ObjectId.isValid(service);
                });

                // Update the provider with cleaned services
                await collection.updateOne(
                    { _id: provider._id },
                    {
                        $set: {
                            services: validServices,
                            updated_at: new Date()
                        }
                    }
                );

                console.log(`Fixed services for ${provider.provider_name}: ${validServices.length} valid services`);
            } catch (error) {
                console.error(`Error fixing provider ${provider.provider_name}:`, error);

                // If we can't fix it, set services to empty array
                await collection.updateOne(
                    { _id: provider._id },
                    {
                        $set: {
                            services: [],
                            updated_at: new Date()
                        }
                    }
                );
                console.log(`Set services to empty array for ${provider.provider_name}`);
            }
        }

        console.log('Data cleanup completed successfully');
    } catch (error) {
        console.error('Error during data cleanup:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the cleanup
fixCorruptedServicesData();
