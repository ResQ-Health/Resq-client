// Reviews controller
const Review = require('../models/Review');
const Provider = require('../models/Provider');

// Create a review (patients only via route middleware)
const createReview = async (req, res) => {
    try {
        const { provider_id, rating, comment } = req.body;

        if (!provider_id || !rating) {
            return res.status(400).json({ success: false, message: 'Provider and rating are required.' });
        }

        const review = await Review.create({
            patient_id: req.user.id,
            provider_id,
            rating,
            comment: comment || ''
        });

        // Update provider aggregated ratings
        const provider = await Provider.findOne({ id: provider_id });
        if (provider) {
            const currentCount = provider.ratings?.count || 0;
            const currentAvg = provider.ratings?.average || 0;
            const newCount = currentCount + 1;
            const newAvg = ((currentAvg * currentCount) + rating) / newCount;
            
            // Use findOneAndUpdate to avoid validation issues with other fields
            await Provider.findOneAndUpdate(
                { id: provider_id },
                { 
                    ratings: { 
                        average: Number(newAvg.toFixed(2)), 
                        count: newCount 
                    } 
                },
                { runValidators: false }
            );
        }

        return res.status(201).json({ success: true, data: review });
    } catch (error) {
        console.error('Create review error:', error);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// Get reviews for a provider
const getProviderReviews = async (req, res) => {
    try {
        const { providerId } = req.params;
        const reviews = await Review.find({ provider_id: providerId }).sort({ created_at: -1 });
        return res.json({ success: true, data: reviews });
    } catch (error) {
        console.error('Get provider reviews error:', error);
        return res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// Like/Unlike a review
const likeReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const patientId = req.user.id;

        // Find review by MongoDB _id or custom id
        const review = await Review.findOne({
            $or: [
                { _id: reviewId },
                { id: reviewId }
            ]
        });

        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: 'Review not found' 
            });
        }

        // Initialize arrays if they don't exist
        if (!review.likes) {
            review.likes = [];
        }

        // Check if patient already liked the review
        const isLiked = review.likes.includes(patientId);
        
        if (isLiked) {
            // Unlike: remove patient ID from likes array
            review.likes = review.likes.filter(id => id !== patientId);
            await review.save();
            
            return res.json({
                success: true,
                message: 'Review unliked successfully',
                data: {
                    review_id: review.id,
                    liked: false,
                    likes_count: review.likes.length
                }
            });
        } else {
            // Like: add patient ID to likes array
            review.likes.push(patientId);
            await review.save();
            
            return res.json({
                success: true,
                message: 'Review liked successfully',
                data: {
                    review_id: review.id,
                    liked: true,
                    likes_count: review.likes.length
                }
            });
        }
    } catch (error) {
        console.error('Like review error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Something went wrong.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Save/Unsave a review
const saveReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const patientId = req.user.id;

        // Find review by MongoDB _id or custom id
        const review = await Review.findOne({
            $or: [
                { _id: reviewId },
                { id: reviewId }
            ]
        });

        if (!review) {
            return res.status(404).json({ 
                success: false, 
                message: 'Review not found' 
            });
        }

        // Initialize arrays if they don't exist
        if (!review.saved_by) {
            review.saved_by = [];
        }

        // Check if patient already saved the review
        const isSaved = review.saved_by.includes(patientId);
        
        if (isSaved) {
            // Unsave: remove patient ID from saved_by array
            review.saved_by = review.saved_by.filter(id => id !== patientId);
            await review.save();
            
            return res.json({
                success: true,
                message: 'Review unsaved successfully',
                data: {
                    review_id: review.id,
                    saved: false,
                    saved_count: review.saved_by.length
                }
            });
        } else {
            // Save: add patient ID to saved_by array
            review.saved_by.push(patientId);
            await review.save();
            
            return res.json({
                success: true,
                message: 'Review saved successfully',
                data: {
                    review_id: review.id,
                    saved: true,
                    saved_count: review.saved_by.length
                }
            });
        }
    } catch (error) {
        console.error('Save review error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Something went wrong.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = { 
    createReview, 
    getProviderReviews, 
    likeReview, 
    saveReview 
};


