// Database connection configuration
const mongoose = require('mongoose');
require('dotenv').config();

let cachedConn = null;

// Connect to MongoDB with optimized connection pool settings and serverless connection reuse
const connectDB = async () => {
    if (cachedConn && mongoose.connection.readyState === 1) {
        return cachedConn;
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
            maxPoolSize: 10, // Maintain up to 10 socket connections
            minPoolSize: 1, // Maintain at least 1 socket connection
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        });
        cachedConn = conn;
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        return conn;
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        throw error; // Propagate the error for handling by the caller
    }
};

module.exports = connectDB; 