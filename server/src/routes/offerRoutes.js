// Offer routes
const express = require('express');
const router = express.Router();

// Import controllers
const offerController = require('../controllers/offerController');
const { validateExclusiveOffers } = require('../middleware/validation');

// @route   POST /api/v1/offers/exclusive
// @desc    Send exclusive offers email
// @access  Public
router.post('/exclusive', validateExclusiveOffers, offerController.sendExclusiveOffers);

// Test endpoint
router.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'Offer routes working'
    });
});

module.exports = router;

