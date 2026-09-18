// Script to generate time slots for all providers
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const Provider = require('../models/Provider');
const TimeSlot = require('../models/TimeSlot');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Helper functions (copied from providerController.js)
// Parse time string (e.g., "9:00 AM") to hours and minutes
function parseTimeString(timeStr) {
    try {
        const [timePart, ampm] = timeStr.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (ampm.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }

        return { hours, minutes };
    } catch (error) {
        console.error('Error parsing time string:', timeStr, error);
        return null;
    }
}

// Format time for display (e.g., "9:00 AM")
function formatTimeForDisplay(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${ampm}`;
}

// Generate slots for a specific day
function generateSlotsForDay(date, startTime, endTime, intervalMinutes, providerId) {
    const slots = [];

    // Set start and end times
    const start = new Date(date);
    start.setHours(startTime.hours, startTime.minutes, 0, 0);

    const end = new Date(date);
    end.setHours(endTime.hours, endTime.minutes, 0, 0);

    // Current slot start time
    let slotStart = new Date(start);

    while (slotStart < end) {
        // Calculate slot end time
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + intervalMinutes);

        // Don't create slots that go beyond the end time
        if (slotEnd > end) {
            break;
        }

        // Format times for display
        const formattedStartTime = formatTimeForDisplay(slotStart);
        const formattedEndTime = formatTimeForDisplay(slotEnd);

        // Create slot object
        const slot = {
            provider_id: providerId,
            date: new Date(date),
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            is_available: true,
            created_at: new Date(),
            updated_at: new Date()
        };

        slots.push(slot);

        // Move to next slot
        slotStart = new Date(slotEnd);
    }

    return slots;
}

// Main function to generate slots for all providers
async function generateAllProviderTimeSlots() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('MongoDB connected');

        // Get all providers with working hours
        const providers = await Provider.find({
            working_hours: { $exists: true, $ne: [] },
            profile_complete: true
        });

        console.log(`Found ${providers.length} providers with working hours`);

        if (providers.length === 0) {
            console.log('No providers with working hours found');
            process.exit(0);
        }

        // Settings for slot generation
        const days = 30; // Generate slots for the next 30 days
        const interval = 30; // 30-minute intervals

        let totalSlotsGenerated = 0;

        // Generate slots for each provider
        for (const provider of providers) {
            // Generate slots for the specified number of days
            const today = new Date();
            const generatedSlots = [];

            for (let i = 0; i < days; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);

                // Get day of week (0-6, where 0 is Sunday)
                const dayOfWeek = date.getDay();

                // Convert to day name
                const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const dayName = dayNames[dayOfWeek];

                // Find working hours for this day
                const workingHoursForDay = provider.working_hours.find(hours => hours.day === dayName);

                // Skip if provider doesn't work on this day
                if (!workingHoursForDay || !workingHoursForDay.isAvailable) {
                    continue;
                }

                // Parse start and end times
                const startTime = parseTimeString(workingHoursForDay.startTime);
                const endTime = parseTimeString(workingHoursForDay.endTime);

                // Skip if invalid times
                if (!startTime || !endTime) {
                    continue;
                }

                // Generate slots for this day
                const slots = generateSlotsForDay(
                    date,
                    startTime,
                    endTime,
                    interval,
                    provider.id
                );

                generatedSlots.push(...slots);
            }

            // Batch insert all slots, ignoring duplicates
            if (generatedSlots.length > 0) {
                await TimeSlot.insertMany(generatedSlots, { ordered: false })
                    .catch(err => {
                        // Ignore duplicate key errors (slots already exist)
                        if (err.code !== 11000) {
                            throw err;
                        }
                        console.log(`Skipped some duplicate slots for provider ${provider.provider_name}`);
                    });

                totalSlotsGenerated += generatedSlots.length;
                console.log(`Generated ${generatedSlots.length} slots for provider ${provider.provider_name}`);
            }
        }

        console.log(`Total slots generated: ${totalSlotsGenerated}`);
        console.log('Time slot generation complete');

        // Close MongoDB connection
        await mongoose.connection.close();
        console.log('MongoDB connection closed');

        process.exit(0);
    } catch (error) {
        console.error('Error generating time slots:', error);
        process.exit(1);
    }
}

// Run the script
generateAllProviderTimeSlots(); 