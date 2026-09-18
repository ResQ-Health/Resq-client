// Provider Admin Routes
const express = require('express');
const router = express.Router();
const { registerAdmin, loginAdmin } = require('../controllers/providerAdminController');

// @route   POST /api/v1/providers/admin/register
// @desc    Register a new provider administrator
// @access  Public
router.post('/register', registerAdmin);

// @route   POST /api/v1/providers/admin/login
// @desc    Login a provider administrator
// @access  Public
router.post('/login', loginAdmin);

module.exports = router; 