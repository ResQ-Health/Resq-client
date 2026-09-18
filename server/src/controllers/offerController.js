// Offer controller
const { sendExclusiveOffersEmail } = require('../config/email');

// @desc    Send exclusive offers email
// @route   POST /api/v1/offers/exclusive
// @access  Public
const sendExclusiveOffers = async (req, res) => {
    try {
        const { email } = req.body;

        // Normalize email to lowercase
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email is required.'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email address format.'
            });
        }

        // Use default values for name and offer_body
        const userName = 'Valued Customer';
        const offerBody = '';

        // Send exclusive offers email
        try {
            await sendExclusiveOffersEmail(normalizedEmail, userName, offerBody);
            
            console.log(`[Exclusive Offers] Email sent successfully to: ${normalizedEmail}`);
            
            res.status(200).json({
                success: true,
                message: 'Exclusive offers email sent successfully!',
                data: {
                    email: normalizedEmail,
                    sent_at: new Date().toISOString()
                }
            });
        } catch (emailError) {
            console.error(`[Exclusive Offers] Error sending email to ${normalizedEmail}:`, emailError);
            
            // Return error response
            return res.status(500).json({
                success: false,
                message: 'Failed to send exclusive offers email. Please try again later.',
                error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
            });
        }
    } catch (error) {
        console.error('[Exclusive Offers] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    sendExclusiveOffers
};

