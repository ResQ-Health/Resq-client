// Test file to demonstrate import functionality

// Import database connections
const connectDB = require('./src/config/db');
const { redisClient, connectRedis } = require('./src/config/redis');

// Import models
const User = require('./src/models/User');

// Import controllers
const { registerUser, loginUser, getUserProfile } = require('./src/controllers/authController');

// Import middleware
const { protect } = require('./src/middleware/auth');
const { validateRegister, validateLogin } = require('./src/middleware/validation');
const { errorHandler, notFound } = require('./src/middleware/error');

// Log imports to demonstrate successful imports
console.log('Imports successful:');
console.log('- Database modules:', !!connectDB, !!connectRedis, !!redisClient);
console.log('- Models:', !!User);
console.log('- Controllers:', !!registerUser, !!loginUser, !!getUserProfile);
console.log('- Middleware:', !!protect, !!validateRegister, !!validateLogin, !!errorHandler, !!notFound); 