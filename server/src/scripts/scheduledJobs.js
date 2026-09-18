// Scheduled jobs script using node-cron
const cron = require('node-cron');
const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Function to run the time slot generation script
function generateTimeSlots() {
    console.log('Starting time slot generation job...');

    const scriptPath = path.join(__dirname, 'generateTimeSlots.js');
    const child = spawn('node', [scriptPath], {
        stdio: 'inherit'
    });

    child.on('close', (code) => {
        if (code === 0) {
            console.log('Time slot generation job completed successfully');
        } else {
            console.error(`Time slot generation job failed with code ${code}`);
        }
    });
}

// Schedule time slot generation job to run daily at 12:00 AM
// Syntax: sec min hour day-of-month month day-of-week
cron.schedule('0 0 * * *', () => {
    console.log('Running scheduled time slot generation job');
    generateTimeSlots();
});

// Optional: Run the job when the scheduler starts
if (process.env.RUN_ON_STARTUP === 'true') {
    console.log('Running time slot generation job on startup');
    generateTimeSlots();
}

console.log('Scheduled jobs initialized');
console.log('Time slot generation will run daily at 12:00 AM');

// Keep the process running
process.stdin.resume(); 