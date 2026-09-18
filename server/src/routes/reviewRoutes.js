// Review routes
const express = require('express');
const router = express.Router();

const { protect, patientOnly } = require('../middleware/auth');
const reviewController = require('../controllers/reviewController');

// Create a review (outside appointments)
router.post('/', protect, patientOnly, reviewController.createReview);

// Get all reviews for a provider
router.get('/provider/:providerId', reviewController.getProviderReviews);

// Like/Unlike a review
router.post('/:reviewId/like', protect, patientOnly, reviewController.likeReview);

// Save/Unsave a review
router.post('/:reviewId/save', protect, patientOnly, reviewController.saveReview);

module.exports = router;


