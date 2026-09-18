// Provider routes
const express = require('express');
const router = express.Router();

// Import controllers
const providerController = require('../controllers/providerController');
const { validateProviderRegister } = require('../middleware/validation');
const { protect, providerOnly, adminOnly, optionalAuth, patientOnly } = require('../middleware/auth');
const { upload, handleMulterError, compressAndUpload } = require('../controllers/authController');

// Add a basic test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Provider routes working'
    });
});

// Get all providers (public, but supports optional auth to show user's like/save status)
router.get('/all', optionalAuth, providerController.getAllProviders);

// Patient -> Report a provider
router.post('/:providerId/reports', protect, patientOnly, providerController.reportProvider);

// Regular route with validation
router.post('/register', validateProviderRegister, providerController.registerProvider);

// Add a new provider profile
router.post('/', protect, adminOnly, providerController.addProviderProfile);

// Provider profile management
router.get('/me', protect, providerOnly, providerController.getProviderProfile);
router.get('/profile/me', protect, providerOnly, providerController.getFullProviderProfile);
router.put(
    '/profile/me',
    protect,
    providerOnly,
    upload.fields([
        { name: 'profile_picture', maxCount: 1 },
        { name: 'banner_image', maxCount: 1 },
        { name: 'logo', maxCount: 1 },
        { name: 'gallery', maxCount: 10 }
    ]),
    handleMulterError,
    providerController.updateFullProviderProfile
);
// Provider Support Tickets
router.post('/me/support/tickets', protect, providerOnly, upload.array('attachments', 5), handleMulterError, providerController.createSupportTicket);
router.get('/me/support/tickets', protect, providerOnly, providerController.listMySupportTickets);
router.get('/me/support/tickets/:ticketId', protect, providerOnly, providerController.getMySupportTicket);
router.post('/me/support/tickets/:ticketId/messages', protect, providerOnly, upload.array('attachments', 5), handleMulterError, providerController.addSupportTicketMessage);
router.get('/me/transactions', protect, providerOnly, providerController.getProviderTransactions);
router.get('/me/reports', protect, providerOnly, providerController.getMyProviderReports);
router.get('/me/reviews', protect, providerOnly, providerController.getMyProviderReviews);
router.get('/me/gallery', protect, providerOnly, providerController.getMyGallery);
router.put('/me', protect, providerOnly, upload.single('image'), handleMulterError, compressAndUpload, providerController.updateProviderProfile);
router.put('/me/profile-picture', protect, providerOnly, upload.single('profile_picture'), handleMulterError, compressAndUpload, providerController.updateProviderProfilePicture);
router.put('/me/banner-image', protect, providerOnly, upload.single('banner_image'), handleMulterError, compressAndUpload, providerController.updateProviderBannerImage);
router.put('/me/logo', protect, providerOnly, upload.single('logo'), handleMulterError, compressAndUpload, providerController.updateProviderLogoImage);
router.post('/me/gallery', protect, providerOnly, upload.array('gallery', 10), handleMulterError, providerController.addProviderGalleryImages);
router.delete('/me/gallery', protect, providerOnly, providerController.removeProviderGalleryImage);
router.put('/me/social-links', protect, providerOnly, providerController.updateProviderSocialLinks);
router.put('/me/address', protect, providerOnly, providerController.updateProviderAddress);
router.put('/me/about', protect, providerOnly, providerController.updateProviderAbout);
router.post('/me/administrative-details', protect, providerOnly, upload.single('image'), handleMulterError, compressAndUpload, providerController.addAdministrativeDetails);
router.put('/me/administrative-details', protect, providerOnly, upload.single('image'), handleMulterError, compressAndUpload, providerController.updateAdministrativeDetails);

// Dashboard Stats
router.get('/me/dashboard-stats', protect, providerOnly, providerController.getProviderDashboardStats);

// Appointments Management
router.get('/appointments', protect, providerOnly, providerController.getProviderAppointments);
router.get('/appointments/pending', protect, providerOnly, providerController.getPendingAppointments);
router.post('/appointments/pending/accept-all', protect, providerOnly, providerController.acceptAllPendingAppointments);
router.post('/appointments/pending/reject-all', protect, providerOnly, providerController.rejectAllPendingAppointments);

// Patient List
router.get('/patients', protect, providerOnly, providerController.getProviderPatients);
router.post('/patients', protect, providerOnly, providerController.addPatientManually);

// Notification Settings
router.get('/me/notification-settings', protect, providerOnly, providerController.getNotificationSettings);
router.put('/me/notification-settings', protect, providerOnly, providerController.updateNotificationSettings);

// Auto-Confirm Settings
router.get('/me/auto-confirm', protect, providerOnly, providerController.getAutoConfirmSetting);
router.put('/me/auto-confirm', protect, providerOnly, providerController.updateAutoConfirmSetting);

// Request to Book Settings
router.get('/me/request-to-book', protect, providerOnly, providerController.getRequestToBookSetting);
router.put('/me/request-to-book', protect, providerOnly, providerController.updateRequestToBookSetting);

// Working Hours Management
router.put('/me/working-hours', protect, providerOnly, providerController.updateWorkingHours);
router.get('/me/working-hours', protect, providerOnly, providerController.getMyWorkingHours);

// Provider onboarding routes
router.post('/onboard/profile', protect, providerOnly, providerController.onboardProviderProfile);
router.post('/onboard/complete', protect, providerOnly, providerController.completeOnboarding);
router.put('/onboard/working-hours', protect, providerOnly, providerController.updateWorkingHours);

// Time slots management
router.post('/generate-slots', protect, providerOnly, providerController.generateTimeSlots);
router.get('/slots', protect, providerOnly, providerController.getProviderTimeSlots);

// Calendar view
router.get('/calendar', protect, providerOnly, providerController.getProviderCalendar);

// Working hours
router.get('/:providerId/working-hours', providerController.getProviderWorkingHours);

// Service Management
router.get('/services', protect, providerOnly, providerController.getProviderServices);
router.post('/services', protect, providerOnly, providerController.createService);
router.put('/services/:id', protect, providerOnly, providerController.updateService);

// Bank Account Management
router.get('/banks', protect, providerOnly, providerController.getBanks);
router.post('/bank-account/verify', protect, providerOnly, providerController.verifyBankAccount);
router.put('/bank-account', protect, providerOnly, providerController.updateBankAccount);

module.exports = router;
