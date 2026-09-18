const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { redisClient } = require('../config/redis');

// Middleware to protect routes
const protect = async (req, res, next) => {
    try {
        let token;

        // Prefer Authorization header (case-insensitive scheme)
        if (req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                token = parts[1];
            }
        }

        // Fallback to x-access-token header
        if (!token && req.headers['x-access-token']) {
            token = req.headers['x-access-token'];
        }

        // Check if token exists
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Please sign in.'
            });
        }

        // Verify JWT token
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id;

            // Try to get user from Redis cache first
            let user = null;
            try {
                if (redisClient.isReady) {
                    const cachedUser = await redisClient.get(`user:${userId}`);
                    if (cachedUser) {
                        user = JSON.parse(cachedUser);
                        // Convert to Mongoose-like object for compatibility
                        req.user = {
                            ...user,
                            _id: user.id || user._id,
                            toObject: () => user,
                            toJSON: () => user
                        };
                        return next();
                    }
                }
            } catch (redisError) {
                // Continue to database lookup if Redis fails
            }

            // If not in cache, get from database
            if (!user) {
                const userFilters = [];
                if (userId) userFilters.push({ id: userId });
                if (userId && mongoose.Types.ObjectId.isValid(userId)) userFilters.push({ _id: userId });
                if (decoded.email) userFilters.push({ email: decoded.email.toLowerCase().trim() });

                user = await User.findOne(userFilters.length > 1 ? { $or: userFilters } : (userFilters[0] || { id: userId })).select('-password').lean();

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found'
                    });
                }

                // Cache user data for future requests
                try {
                    if (redisClient.isReady) {
                        await redisClient.set(`user:${userId}`, JSON.stringify(user), { EX: 60 * 60 * 24 }); // 24 hours
                    }
                } catch (redisError) {
                    // Continue even if caching fails
                }

                req.user = {
                    ...user,
                    _id: user.id || user._id,
                    toObject: () => user,
                    toJSON: () => user
                };
            }

            next();
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: 'Session expired. Please sign in again.' });
            }
            return res.status(401).json({ success: false, message: 'Invalid token. Please sign in.' });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Something went wrong.'
        });
    }
};

// Middleware to restrict access to admin users only
const adminOnly = (req, res, next) => {
    if (req.user && req.user.is_admin === true) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Admins only.'
        });
    }
};

// Middleware to restrict access to providers only
const providerOnly = (req, res, next) => {
    if (req.user && (req.user.user_type === 'Clinician' || req.user.user_type === 'DiagnosticProvider')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Providers only.'
        });
    }
};

// Middleware to restrict access to clinicians only
const clinicianOnly = (req, res, next) => {
    if (req.user && (req.user.user_type === 'Clinician' || req.user.user_type === 'DiagnosticProvider' || req.user.is_admin === true)) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Clinicians only.'
        });
    }
};

// Middleware to allow patients or clinicians
const patientOrClinician = (req, res, next) => {
    if (req.user && (req.user.user_type === 'Patient' || req.user.user_type === 'Clinician' || req.user.is_admin === true)) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Patients or clinicians only.'
        });
    }
};

// Middleware to restrict access to patients only
const patientOnly = (req, res, next) => {
    if (req.user && req.user.user_type === 'Patient') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'Patients only.'
        });
    }
};

// Optional auth: attaches req.user if token present; otherwise continues without error
const optionalAuth = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization) {
            const parts = req.headers.authorization.split(' ');
            if (parts.length === 2 && parts[0].toLowerCase() === 'bearer') {
                token = parts[1];
            }
        }
        if (!token && req.headers['x-access-token']) {
            token = req.headers['x-access-token'];
        }
        if (!token) return next();

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userId = decoded.userId || decoded.id;

            // Try Redis cache first
            let user = null;
            try {
                if (redisClient.isReady) {
                    const cachedUser = await redisClient.get(`user:${userId}`);
                    if (cachedUser) {
                        user = JSON.parse(cachedUser);
                        req.user = {
                            ...user,
                            _id: user.id || user._id,
                            toObject: () => user,
                            toJSON: () => user
                        };
                        return next();
                    }
                }
            } catch (redisError) {
                // Continue to DB lookup
            }

            // If not in cache, get from database
            if (!user) {
                const userFilters = [];
                if (userId) userFilters.push({ id: userId });
                if (userId && mongoose.Types.ObjectId.isValid(userId)) userFilters.push({ _id: userId });
                if (decoded.email) userFilters.push({ email: decoded.email.toLowerCase().trim() });

                user = await User.findOne(userFilters.length > 1 ? { $or: userFilters } : (userFilters[0] || { id: userId })).select('-password').lean();
                if (user) {
                    // Cache for future requests
                    try {
                        if (redisClient.isReady) {
                            await redisClient.set(`user:${userId}`, JSON.stringify(user), { EX: 60 * 60 * 24 });
                        }
                    } catch (redisError) {
                        // Continue
                    }
                    req.user = {
                        ...user,
                        _id: user.id || user._id,
                        toObject: () => user,
                        toJSON: () => user
                    };
                }
            }
        } catch (_) {
            // ignore token errors in optional auth
        }
        return next();
    } catch (e) {
        return next();
    }
};

module.exports = { protect, adminOnly, providerOnly, clinicianOnly, patientOrClinician, patientOnly, optionalAuth };