// Main application entry point
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
let admin;

try {
    admin = require('firebase-admin');
} catch (error) {
    console.log('Firebase Admin SDK not available, push notifications will be disabled');
}

// Load environment variables
dotenv.config();

// Initialize Firebase Admin for push notifications if credential available
let firebaseInitialized = false;
if (admin && process.env.FIREBASE_CREDENTIAL) {
    try {
        const credentialJson = process.env.FIREBASE_CREDENTIAL;
        // Check if it looks like a placeholder
        if (!credentialJson.includes('your-private-key')) {
            const serviceAccount = JSON.parse(credentialJson);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            firebaseInitialized = true;
            console.log('Firebase Admin initialized successfully');
        } else {
            console.log('Firebase credential contains placeholders, skipping initialization');
        }
    } catch (error) {
        console.error('Firebase Admin initialization failed:', error);
        console.log('Push notifications will be disabled');
    }
} else {
    console.log('Firebase Admin SDK or credentials not available, push notifications are disabled');
}

// Import routes
const authRoutes = require('./routes/authRoutes');
const providerRoutes = require('./routes/providerRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const providerAdminRoutes = require('./routes/providerAdminRoutes');
const offerRoutes = require('./routes/offerRoutes');
const locationRoutes = require('./routes/locationRoutes');

// Import middleware
const { notFound, errorHandler } = require('./middleware/error');

// Import database connections
const connectDB = require('./config/db');
const { connectRedis } = require('./config/redis');

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB().then(() => {
    console.log('MongoDB connection complete');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit if MongoDB connection fails as it's critical
});

// Connect to Redis - application can still function without Redis
connectRedis().then((client) => {
    if (client) {
        console.log('Redis connection complete');
    } else {
        console.log('Application running without Redis - some features may be limited');
    }
}).catch(err => {
    console.error('Redis connection error:', err);
    console.log('Continuing without Redis - some features may be limited');
});

// Middleware
app.use(compression()); // Compress responses for faster transfer
app.use(express.json()); // Parse JSON request body
app.use(express.urlencoded({ extended: false })); // Parse URL-encoded request body
app.use(cors()); // Enable CORS
app.use(helmet()); // Security headers

// Request logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// Welcome route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to the Simple Node.js API',
        documentation: '/api-docs',
        version: '1.0.0',
        environment: process.env.NODE_ENV
    });
});

// Test route for basic functionality
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working correctly',
        timestamp: new Date().toISOString()
    });
});

// Routes with versioning (primary)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/providers/admin', providerAdminRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/services', serviceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/offers', offerRoutes);
app.use('/api/v1/locations', locationRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
}); 