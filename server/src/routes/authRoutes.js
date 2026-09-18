// Authentication routes
const express = require('express');
const router = express.Router();

// Import controllers
const authController = require('../controllers/authController');
const { validateRegister, validateLogin, validateOtpVerification, validateResendOtp, validateOAuthLogin, validateForgotPassword, validateResetPassword } = require('../middleware/validation');
const { protect, adminOnly, patientOnly, patientOrClinician } = require('../middleware/auth');
const { upload, compressAndUpload } = require('../controllers/authController');

// Add a basic test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Auth routes working'
    });
});

// Routes
router.post('/register', validateRegister, authController.registerUser);
router.post('/login', validateLogin, authController.loginUser);
router.post('/provider/login', validateLogin, authController.loginProvider);
router.post('/clinician/login', validateLogin, authController.loginProvider);
router.post('/oauth/login', validateOAuthLogin, authController.socialOAuthLogin);
router.post('/verify-otp', validateOtpVerification, authController.verifyOTP);
router.post('/resend-otp', validateResendOtp, authController.resendOTP);
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);
router.post('/change-password', protect, patientOrClinician, authController.changePassword);

// User Profile & Preferences
// Get user profile with favorite providers (root route)
router.get('/', protect, patientOrClinician, authController.getUserProfile);
router.get('/me', protect, patientOrClinician, authController.getUserProfile);
router.put('/me', protect, patientOrClinician, upload.single('profile_picture'), authController.handleMulterError, compressAndUpload, authController.updateUserProfile);
router.delete('/me', protect, patientOrClinician, authController.deleteAccount);

// Admin management routes
router.put('/assign-admin', protect, adminOnly, authController.assignAdminPrivileges);
router.put('/remove-admin', protect, adminOnly, authController.removeAdminPrivileges);
router.get('/users', protect, adminOnly, authController.getAllUsers);

// Favorite providers routes
router.post('/favorites/providers/toggle', protect, patientOnly, authController.toggleFavoriteProvider);
router.get('/favorites/providers', protect, patientOnly, authController.getFavoriteProviders);
router.get('/favorites/providers/:providerId/status', protect, patientOnly, authController.getFavoriteProviderStatus);

// Logout route
router.post('/logout', protect, authController.logoutUser);

module.exports = router; 