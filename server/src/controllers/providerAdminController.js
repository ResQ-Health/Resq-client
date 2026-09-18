// Provider Admin Controller
const Provider = require('../models/Provider');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Generate JWT token
const generateToken = (providerId, adminEmail) => {
    return jwt.sign({ providerId, adminEmail }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register a new provider administrator
// @route   POST /api/v1/providers/admin/register
// @access  Public
const registerAdmin = async (req, res) => {
    try {
        const { providerId, fullname, email, phone, password, permissionLevel } = req.body;

        const provider = await Provider.findOne({ id: providerId });

        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // Salt and hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        provider.administrativedetails = {
            fullname,
            email,
            phone,
            password: hashedPassword,
            permissionLevel
        };

        await provider.save();

        const token = generateToken(provider.id, email);

        res.status(201).json({
            success: true,
            message: 'Provider administrator registered successfully',
            token
        });
    } catch (error) {
        console.error('Register provider admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Login a provider administrator
// @route   POST /api/v1/providers/admin/login
// @access  Public
const loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const provider = await Provider.findOne({ 'administrativedetails.email': email });

        if (!provider) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const adminDetails = provider.administrativedetails;
        const isMatch = await bcrypt.compare(password, adminDetails.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = generateToken(provider.id, email);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            provider
        });
    } catch (error) {
        console.error('Login provider admin error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

module.exports = {
    registerAdmin,
    loginAdmin
}; 