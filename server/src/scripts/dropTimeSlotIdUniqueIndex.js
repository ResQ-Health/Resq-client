// Script to drop the unique index on time_slot_id field
// This should be run once to fix the duplicate key error issue

const mongoose = require('mongoose');
require('dotenv').config();

async function dropTimeSlotIdUniqueIndex() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const collection = db.collection('appointments');

        // Get current indexes
        const indexes = await collection.indexes();
        console.log('Current indexes:');
        indexes.forEach((index, i) => {
            console.log(`${i + 1}. ${JSON.stringify(index.key)} - unique: ${index.unique || false}`);
        });

        // Check if time_slot_id unique index exists
        const timeSlotIdIndex = indexes.find(index =>
            index.key &&
            index.key.time_slot_id === 1 &&
            index.unique === true
        );

        if (timeSlotIdIndex) {
            console.log('Found unique index on time_slot_id, dropping it...');
            await collection.dropIndex(timeSlotIdIndex.name);
            console.log('Successfully dropped unique index on time_slot_id');
        } else {
            console.log('No unique index found on time_slot_id');
        }

        // Verify the index was dropped
        const updatedIndexes = await collection.indexes();
        console.log('Updated indexes:');
        updatedIndexes.forEach((index, i) => {
            console.log(`${i + 1}. ${JSON.stringify(index.key)} - unique: ${index.unique || false}`);
        });

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the migration
dropTimeSlotIdUniqueIndex();
