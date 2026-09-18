// Authentication controller
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { nanoid } = require('nanoid');
const User = require('../models/User');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const PendingRegistration = require('../models/PendingRegistration');
const { redisClient } = require('../config/redis');
const otpService = require('../services/otpService');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Import sharp with error handling
let sharp;
try {
    sharp = require('sharp');
} catch (error) {
    console.error('Warning: sharp module not found. Image compression will be disabled.');
    console.error('Please run: npm install sharp');
    sharp = null;
}

const admin = require('firebase-admin');
const PasswordResetToken = require('../models/PasswordResetToken');
const { sendPasswordResetEmail } = require('../config/email');

// Patient onboarding completion helper
const computePatientOnboardingStatus = (user) => {
    const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0;

    // Personal
    const pd = user?.personal_details || {};
    const [fn, ...lnParts] = (user?.full_name || '').split(' ');
    const firstName = pd.first_name || fn || '';
    const lastName = pd.last_name || lnParts.join(' ') || '';
    const personal_complete = isNonEmpty(firstName) && isNonEmpty(lastName) && isNonEmpty(pd.date_of_birth || '') && isNonEmpty(pd.gender || '');

    // Contact
    const cd = user?.contact_details || {};
    const emailAddr = cd.email_address || user?.email || '';
    const phoneNum = cd.phone_number || user?.phone_number || '';
    const contact_complete = isNonEmpty(emailAddr) && isNonEmpty(phoneNum);

    // Location
    const ld = user?.location_details || {};
    const location_complete = isNonEmpty(ld.address || '') && isNonEmpty(ld.city || '') && isNonEmpty(ld.state || '');

    // Metadata contacts
    const md = user?.metadata || {};
    const ec = md.emergency_contact || {};
    const nok = md.next_of_kin || {};
    const emergency_contact_complete =
        isNonEmpty(ec.first_name || '') &&
        isNonEmpty(ec.last_name || '') &&
        isNonEmpty(ec.phone_number || '') &&
        isNonEmpty(ec.relationship_to_you || '');

    // If same_as_emergency_contact is true, allow next_of_kin to be satisfied by emergency_contact
    const next_of_kin_complete_raw =
        isNonEmpty(nok.first_name || '') &&
        isNonEmpty(nok.last_name || '') &&
        isNonEmpty(nok.phone_number || '') &&
        isNonEmpty(nok.relationship_to_you || '');
    const next_of_kin_complete = next_of_kin_complete_raw || (md.same_as_emergency_contact === true && emergency_contact_complete);

    const missing_sections = [];
    if (!personal_complete) missing_sections.push('personal_details');
    if (!contact_complete) missing_sections.push('contact_details');
    if (!location_complete) missing_sections.push('location_details');
    if (!emergency_contact_complete) missing_sections.push('emergency_contact');
    if (!next_of_kin_complete) missing_sections.push('next_of_kin');

    return {
        is_onboarding_complete: missing_sections.length === 0,
        sections: {
            personal_details: personal_complete,
            contact_details: contact_complete,
            location_details: location_complete,
            emergency_contact: emergency_contact_complete,
            next_of_kin: next_of_kin_complete
        },
        missing_sections
    };
};

// Generate JWT token
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Helper function to check if a URL is a Google profile picture URL
const isGoogleProfilePictureUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.includes('googleusercontent.com') || url.includes('google.com');
};

// Custom storage that automatically compresses large images
// Performance optimizations:
// - Auto compression: Automatically compresses images larger than 5MB for faster uploads
// - Progressive compression: Multiple passes if needed to get under size limit
// - Auto quality: Cloudinary automatically optimizes quality for smaller file sizes
// - Auto format: Serves WebP when supported (smaller files, faster loading)
// - Face detection: Automatically focuses on faces for better profile pictures
// - Progressive JPEG: Better perceived performance
const TARGET_FILE_SIZE = 5 * 1024 * 1024; // 5MB - target size after compression
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB - maximum acceptable size
const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50MB - maximum upload size (will be compressed)

const storage = multer.memoryStorage();

// Middleware to compress and upload images to Cloudinary
// Automatically compresses images larger than 5MB for faster uploads
const compressAndUpload = async (req, res, next) => {
    if (!req.file) {
        return next();
    }

    // Check if sharp is available
    if (!sharp) {
        console.warn('[Image Compression] Sharp module not available. Skipping compression. Images will be uploaded as-is.');
        // Continue without compression - upload directly to Cloudinary
        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'profile_pictures',
                        transformation: [
                            {
                                width: 400,
                                height: 400,
                                crop: 'fill',
                                gravity: 'face',
                                quality: 'auto:good',
                                fetch_format: 'auto'
                            }
                        ],
                        flags: 'progressive'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(req.file.buffer);
            });
            req.file.path = uploadResult.secure_url;
            req.file.cloudinary_id = uploadResult.public_id;
            return next();
        } catch (error) {
            console.error('[Image Upload Error]', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image. Please try again.'
            });
        }
    }

    try {
        const file = req.file;
        let buffer = file.buffer;
        const originalSize = buffer.length;

        // Compress if file is larger than target size (5MB) for faster uploads
        if (originalSize > TARGET_FILE_SIZE) {
            console.log(`[Image Compression] Original size: ${(originalSize / 1024 / 1024).toFixed(2)}MB - Auto-compressing for faster upload...`);

            // Get image metadata
            const metadata = await sharp(buffer).metadata();
            const hasTransparency = metadata.hasAlpha;

            // Determine output format - prefer JPEG for better compression
            let outputFormat = 'jpeg';
            let quality = 85; // Start with good quality

            // Adjust quality based on file size
            if (originalSize > 20 * 1024 * 1024) {
                quality = 65; // Very large files - more aggressive
            } else if (originalSize > 15 * 1024 * 1024) {
                quality = 70; // Large files
            } else if (originalSize > 10 * 1024 * 1024) {
                quality = 75; // Medium-large files
            }

            // Keep PNG only if it has transparency
            if (file.mimetype === 'image/png' && hasTransparency) {
                outputFormat = 'png';
                quality = 90; // PNG compression is different
            } else if (file.mimetype === 'image/webp') {
                outputFormat = 'webp';
            }

            // Calculate target dimensions - scale down if very large
            let maxDimension = 2000;
            if (originalSize > 20 * 1024 * 1024) {
                maxDimension = 1500;
            } else if (originalSize > 15 * 1024 * 1024) {
                maxDimension = 1800;
            }

            // First compression pass
            let sharpInstance = sharp(buffer)
                .resize(maxDimension, maxDimension, {
                    fit: 'inside',
                    withoutEnlargement: true
                });

            if (outputFormat === 'jpeg') {
                buffer = await sharpInstance
                    .jpeg({
                        quality: quality,
                        progressive: true,
                        mozjpeg: true // Better JPEG compression
                    })
                    .toBuffer();
            } else if (outputFormat === 'png') {
                buffer = await sharpInstance
                    .png({
                        quality: quality,
                        compressionLevel: 9 // Maximum PNG compression
                    })
                    .toBuffer();
            } else {
                buffer = await sharpInstance
                    .webp({
                        quality: quality
                    })
                    .toBuffer();
            }

            let compressedSize = buffer.length;
            let compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
            console.log(`[Image Compression] Pass 1 - Size: ${(compressedSize / 1024 / 1024).toFixed(2)}MB - Reduced by ${compressionRatio}%`);

            // Progressive compression - keep compressing until under target size
            let pass = 1;
            while (compressedSize > TARGET_FILE_SIZE && pass < 4) {
                pass++;
                console.log(`[Image Compression] Pass ${pass} - Still ${(compressedSize / 1024 / 1024).toFixed(2)}MB, compressing further...`);

                // Reduce quality and dimensions progressively
                quality = Math.max(50, quality - 10);
                maxDimension = Math.max(1000, maxDimension - 200);

                // Convert to JPEG for maximum compression if not already
                if (outputFormat !== 'jpeg' && !hasTransparency) {
                    outputFormat = 'jpeg';
                }

                buffer = await sharp(buffer)
                    .resize(maxDimension, maxDimension, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: quality,
                        progressive: true,
                        mozjpeg: true
                    })
                    .toBuffer();

                compressedSize = buffer.length;
                compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
                console.log(`[Image Compression] Pass ${pass} - Size: ${(compressedSize / 1024 / 1024).toFixed(2)}MB - Total reduction: ${compressionRatio}%`);
            }

            // Final check - if still too large, force aggressive compression
            if (compressedSize > MAX_FILE_SIZE) {
                console.log(`[Image Compression] Final aggressive pass - forcing under ${(MAX_FILE_SIZE / 1024 / 1024).toFixed(0)}MB limit...`);
                buffer = await sharp(buffer)
                    .resize(1200, 1200, {
                        fit: 'inside',
                        withoutEnlargement: true
                    })
                    .jpeg({
                        quality: 60,
                        progressive: true,
                        mozjpeg: true
                    })
                    .toBuffer();
                const finalSize = buffer.length;
                const finalRatio = ((1 - finalSize / originalSize) * 100).toFixed(1);
                console.log(`[Image Compression] Final size: ${(finalSize / 1024 / 1024).toFixed(2)}MB - Total reduction: ${finalRatio}%`);
            }
        }

        // Upload to Cloudinary with optimizations
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'profile_pictures',
                    transformation: [
                        {
                            width: 400,
                            height: 400,
                            crop: 'fill',
                            gravity: 'face', // Auto-detect and focus on face
                            quality: 'auto:good', // Auto quality optimization
                            fetch_format: 'auto' // Auto format (WebP when supported)
                        }
                    ],
                    flags: 'progressive' // Progressive JPEG
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            uploadStream.end(buffer);
        });

        // Replace req.file with Cloudinary result
        req.file.path = uploadResult.secure_url;
        req.file.cloudinary_id = uploadResult.public_id;

        next();
    } catch (error) {
        console.error('[Image Upload Error]', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process image. Please try again with a smaller image.'
        });
    }
};

// Configure multer with memory storage
const upload = multer({
    storage,
    limits: {
        fileSize: MAX_UPLOAD_SIZE, // Allow up to 50MB, will auto-compress if larger than 5MB
    },
    fileFilter: (req, file, cb) => {
        // Accept only image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Multer error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum file size is ${(MAX_UPLOAD_SIZE / 1024 / 1024).toFixed(0)}MB. Images larger than 5MB will be automatically compressed.`
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files. Please upload only one image.'
            });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
                success: false,
                message: 'Unexpected file field. Please use the correct field name.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }
    if (err) {
        // Handle other multer-related errors (like fileFilter errors)
        return res.status(400).json({
            success: false,
            message: err.message || 'File upload error'
        });
    }
    next();
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    try {
        const { full_name, email, password, phone_number, user_type, metadata, is_admin } = req.body;

        // Normalize email to lowercase
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email is required.'
            });
        }

        // Normalize phone_number - set to empty string if not provided or empty
        const normalizedPhoneNumber = phone_number && phone_number.trim() ? phone_number.trim() : '';

        // Check if user already exists - first by email, then by phone (for patients)
        let userExists = null;
        if (normalizedEmail) {
            userExists = await User.findOne({ email: normalizedEmail });
        }

        // If not found by email and phone is provided, check by phone (for patients only)
        if (!userExists && normalizedPhoneNumber && user_type === 'Patient') {
            userExists = await User.findOne({
                phone_number: normalizedPhoneNumber,
                user_type: 'Patient'
            });
        }

        if (userExists) {
            // Check if this is a guest user (created from guest booking or manually added) - allow them to complete registration
            // Guest users: have password, not email_verified, no oauth_provider, user_type is Patient
            const isGuestUser = userExists.password &&
                !userExists.email_verified &&
                !userExists.oauth_provider &&
                userExists.user_type === 'Patient';

            if (isGuestUser) {
                console.log(`[Registration] Guest user completing registration: ${userExists.email || normalizedPhoneNumber}, id: ${userExists.id}`);

                // Update user with new password and details
                userExists.password = password; // Will be hashed by pre-save middleware

                // Update email if it was a temporary one or missing
                if (normalizedEmail && (!userExists.email || userExists.email.includes('@temp.local'))) {
                    userExists.email = normalizedEmail;
                }

                if (full_name && full_name.trim()) {
                    // Only update if current name is generic
                    if (!userExists.full_name || userExists.full_name === 'Guest User') {
                        userExists.full_name = full_name;
                    }
                }
                if (normalizedPhoneNumber && !userExists.phone_number) {
                    userExists.phone_number = normalizedPhoneNumber;
                }
                if (metadata) {
                    userExists.metadata = { ...userExists.metadata, ...metadata };
                }

                await userExists.save();

                // Generate and send OTP (non-blocking) - use the email from userExists (which might have been updated)
                const emailToUse = userExists.email || normalizedEmail;
                otpService.generateAndSendOTP(userExists.id, emailToUse, userExists.full_name)
                    .then(() => {
                        console.log(`[Registration] OTP email sent successfully to ${emailToUse}`);
                    })
                    .catch((emailError) => {
                        console.error(`[Registration] Error sending OTP email to ${emailToUse}:`, emailError.message || emailError);
                    });

                // Generate token
                const token = generateToken(userExists.id);

                // Clear cache
                try {
                    if (redisClient.isReady) {
                        await redisClient.del(`user:${userExists.id}`);
                    }
                } catch (redisError) {
                    // Continue even if cache clear fails
                }

                // Return success response
                return res.status(201).json({
                    success: true,
                    data: {
                        id: userExists.id,
                        full_name: userExists.full_name,
                        email: userExists.email,
                        phone_number: userExists.phone_number,
                        user_type: userExists.user_type,
                        is_admin: userExists.is_admin,
                        email_verified: userExists.email_verified,
                        created_at: userExists.created_at,
                        token
                    },
                    message: 'Registration completed successfully. Your account has been linked to your previous bookings/appointments. Please verify your email with the OTP sent to your email address.'
                });
            }

            // Log for debugging
            console.log(`[Registration] User already exists with email: ${userExists.email || normalizedEmail}, user_type: ${userExists.user_type}, id: ${userExists.id}`);

            // Provide more helpful error message
            const existingUserType = userExists.user_type || 'user';
            return res.status(400).json({
                success: false,
                message: `An account with this ${normalizedEmail ? 'email' : 'phone number'} already exists. Please try logging in instead.`,
                hint: existingUserType === 'Patient'
                    ? 'If you registered with Google, please use Google Sign In.'
                    : 'If you forgot your password, use the forgot password feature.'
            });
        }

        // Check if there's already a pending registration for this email
        const pendingRegistrationExists = await PendingRegistration.findOne({ email: normalizedEmail });

        if (pendingRegistrationExists) {
            // Delete the old pending registration and create a new one
            await PendingRegistration.deleteOne({ id: pendingRegistrationExists.id });
            console.log(`[Registration] Deleted old pending registration for: ${normalizedEmail}`);
        }

        // For patients, check if phone number is already in use (only if phone number is provided and not already found above)
        // This is a double-check in case the phone lookup above didn't catch it
        if (user_type === 'Patient' && normalizedPhoneNumber) {
            const phoneExists = await User.findOne({
                phone_number: normalizedPhoneNumber,
                user_type: 'Patient',
                email: { $ne: normalizedEmail } // Different email
            });

            if (phoneExists) {
                // Check if it's a guest user that can be linked
                const isGuestUser = phoneExists.password &&
                    !phoneExists.email_verified &&
                    !phoneExists.oauth_provider;

                if (!isGuestUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Phone number is already registered. Please use a different phone number or sign in with your existing account.'
                    });
                }
            }
        }

        // Create pending registration instead of creating user directly
        const pendingRegistration = await PendingRegistration.create({
            full_name,
            email: normalizedEmail,
            password,
            phone_number: normalizedPhoneNumber,
            user_type,
            metadata,
            is_admin: is_admin || false
        });

        // Generate and send OTP for pending registration (don't await - run in background to avoid blocking response)
        // This prevents email timeouts from affecting the registration response
        otpService.generateAndSendOTPForPending(pendingRegistration.id, normalizedEmail, full_name)
            .then(() => {
                console.log(`[Registration] OTP email sent successfully to ${normalizedEmail}`);
            })
            .catch((emailError) => {
                console.error(`[Registration] Error sending OTP email to ${normalizedEmail}:`, emailError.message || emailError);
                // Don't throw - user can request another OTP later via resend-otp endpoint
            });

        // Return success response - no token yet, user needs to verify email first
        res.status(201).json({
            success: true,
            data: {
                email: pendingRegistration.email,
                message: 'Registration initiated. Please verify your email with the OTP sent to your email address to complete registration.'
            },
            message: 'Registration initiated. Please verify your email with the OTP sent to your email address to complete registration.'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong.'
        });
    }
};

// @desc    Verify email with OTP
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const result = await otpService.verifyUserOTP(email, otp);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Invalid code.'
            });
        }

        // Generate token for the newly created or verified user
        const token = generateToken(result.user.id);

        // Prepare response data
        const responseData = {
            id: result.user.id,
            full_name: result.user.full_name,
            email: result.user.email,
            phone_number: result.user.phone_number,
            user_type: result.user.user_type,
            is_admin: result.user.is_admin,
            email_verified: result.user.email_verified,
            created_at: result.user.created_at,
            token
        };

        // If it's a provider, include provider data
        if (result.provider) {
            responseData.provider = {
                id: result.provider.id,
                provider_name: result.provider.provider_name,
                work_email: result.provider.work_email,
                work_phone: result.provider.work_phone
            };
        }

        res.status(200).json({
            success: true,
            message: result.isNewUser
                ? 'Email verified successfully. Your account has been created.'
                : 'Email verified successfully',
            data: responseData
        });
    } catch (error) {
        console.error('[Verify OTP] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Resend OTP verification code
// @route   POST /api/auth/resend-otp
// @access  Public
const resendOTP = async (req, res) => {
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

        const result = await otpService.requestNewOTP(normalizedEmail);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message || 'Could not send code.'
            });
        }
        res.status(200).json({
            success: true,
            message: 'OTP sent successfully',
            data: {
                email: result.email
            }
        });
    } catch (error) {
        console.error('[Resend OTP] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Authenticate user & get token (Patients only)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Normalize email to lowercase for consistent matching
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email is required.'
            });
        }

        // Check Redis cache first for user data
        let user = null;
        let cachedUserData = null;
        try {
            if (redisClient.isReady) {
                // Try to find user by email in cache (we need to maintain an email->id mapping or query DB)
                // For login, we still need DB query but can cache the result
                const cacheKey = `user:email:${normalizedEmail}`;
                const cachedId = await redisClient.get(cacheKey);
                if (cachedId) {
                    const userCacheKey = `user:${cachedId}`;
                    cachedUserData = await redisClient.get(userCacheKey);
                    if (cachedUserData) {
                        cachedUserData = JSON.parse(cachedUserData);
                    }
                }
            }
        } catch (redisError) {
            // Continue without cache
        }

        // Find user by email - use direct lookup since email is stored lowercase and indexed
        // Don't use lean() because we need to call matchPassword method
        if (!cachedUserData) {
            user = await User.findOne({ email: normalizedEmail }).select('+password');
        } else {
            // Use cached data but still need to verify password from DB
            user = await User.findOne({ email: normalizedEmail }).select('+password');
        }

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check if user has a password (not OAuth-only)
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'This account uses social login. Please sign in with your social provider.'
            });
        }

        // Check if password matches
        const passwordMatches = await user.matchPassword(password);

        if (passwordMatches) {
            // Enforce Patient-only login for this endpoint
            if (user.user_type !== 'Patient') {
                return res.status(403).json({
                    success: false,
                    message: 'Patients only.'
                });
            }
            // Generate token
            const token = generateToken(user.id);

            // Compute onboarding status (patients)
            const onboarding = computePatientOnboardingStatus(user);

            // Prepare user data for response and cache
            // Include profile_picture in cached data to prevent inconsistencies
            const userData = {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number,
                user_type: user.user_type,
                is_admin: user.is_admin,
                email_verified: user.email_verified,
                created_at: user.created_at,
                profile_picture: user.profile_picture || { url: '' },
                is_onboarding_complete: onboarding.is_onboarding_complete,
                onboarding_missing_sections: onboarding.missing_sections
            };

            // Store user data in Redis cache if Redis is connected
            try {
                if (redisClient.isReady) {
                    // Cache user by ID - include profile_picture to prevent cache inconsistencies
                    await redisClient.set(`user:${user.id}`, JSON.stringify(userData), { EX: 60 * 60 * 24 }); // Expire in 24 hours
                    // Cache email to ID mapping for faster lookups
                    await redisClient.set(`user:email:${normalizedEmail}`, user.id, { EX: 60 * 60 * 24 });
                }
            } catch (redisError) {
                // Continue without Redis caching
            }

            return res.json({
                success: true,
                data: {
                    ...userData,
                    token
                }
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong.'
        });
    }
};

// @desc    Authenticate provider & get token
// @route   POST /api/auth/provider/login
// @access  Public
const loginProvider = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Normalize email to lowercase for consistent matching
        const normalizedEmail = email ? email.toLowerCase().trim() : null;

        if (!normalizedEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email is required.'
            });
        }

        // Find user by email - select password
        const user = await User.findOne({ email: normalizedEmail }).select('+password');

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check if user has a password
        if (!user.password) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        // Check if password matches
        const passwordMatches = await user.matchPassword(password);

        if (passwordMatches) {
            // Enforce Provider/Clinician login for this endpoint
            // Allow Clinician and DiagnosticProvider
            const allowedTypes = ['Clinician', 'DiagnosticProvider'];

            if (!allowedTypes.includes(user.user_type)) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Providers only.'
                });
            }

            // Generate token
            const token = generateToken(user.id);

            // Fetch provider details
            const provider = await Provider.findOne({ user_id: user.id });

            // Prepare user data for response
            const userData = {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number,
                user_type: user.user_type,
                is_admin: user.is_admin,
                email_verified: user.email_verified,
                created_at: user.created_at,
                profile_picture: user.profile_picture || { url: '' }
            };

            // Add provider details if found
            if (provider) {
                userData.provider = {
                    id: provider.id,
                    provider_name: provider.provider_name,
                    work_email: provider.work_email,
                    work_phone: provider.work_phone,
                    services: provider.services,
                    profile_complete: provider.profile_complete
                };
            }

            // Store user data in Redis cache if Redis is connected
            try {
                if (redisClient.isReady) {
                    await redisClient.set(`user:${user.id}`, JSON.stringify(userData), { EX: 60 * 60 * 24 }); // Expire in 24 hours
                    await redisClient.set(`user:email:${normalizedEmail}`, user.id, { EX: 60 * 60 * 24 });
                }
            } catch (redisError) {
                // Continue without Redis caching
            }

            return res.json({
                success: true,
                data: {
                    ...userData,
                    token
                }
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong.'
        });
    }
};

// @desc    Update user profile (all fields, including profile picture)
// @route   PUT /api/v1/auth/me
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        // Don't use lean() here because we need to save the document
        const user = await User.findOne({ id: req.user.id });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Handle profile picture upload
        let profilePictureUrl = user.profile_picture?.url || '';
        if (req.file && req.file.path) {
            profilePictureUrl = req.file.path;
        }

        // Update fields from request body
        user.profile_picture = { url: profilePictureUrl };

        // Update personal_details if provided
        if (req.body.personal_details) {
            user.personal_details = { ...user.personal_details, ...req.body.personal_details };

            // Sync full_name if first_name or last_name changed
            if (req.body.personal_details.first_name !== undefined || req.body.personal_details.last_name !== undefined) {
                const firstName = req.body.personal_details.first_name !== undefined ? req.body.personal_details.first_name : (user.personal_details.first_name || '');
                const lastName = req.body.personal_details.last_name !== undefined ? req.body.personal_details.last_name : (user.personal_details.last_name || '');
                // Simple concatenation; adjust if you have more complex logic
                if (firstName || lastName) {
                    user.full_name = `${firstName} ${lastName}`.trim();
                }
            }
        }

        // Update contact_details if provided
        if (req.body.contact_details) {
            user.contact_details = { ...user.contact_details, ...req.body.contact_details };

            // Sync email if provided in contact_details
            if (req.body.contact_details.email_address) {
                user.email = req.body.contact_details.email_address.toLowerCase();
            }

            // Sync phone_number if provided in contact_details
            if (req.body.contact_details.phone_number) {
                user.phone_number = req.body.contact_details.phone_number;
            }
        }

        // Update location_details if provided
        if (req.body.location_details) {
            user.location_details = { ...user.location_details, ...req.body.location_details };
        }

        // Update metadata if provided (including notification_settings)
        if (req.body.metadata) {
            // Carefully update metadata to avoid overwriting nested objects with undefined
            const currentMetadata = user.metadata ? user.metadata.toObject() : {};

            // Extract notification_settings to handle separately
            const { notification_settings: newNotificationSettings, ...otherNewMetadata } = req.body.metadata;

            // Merge other metadata fields
            user.metadata = {
                ...currentMetadata,
                ...otherNewMetadata
            };

            // Handle notification_settings
            if (newNotificationSettings) {
                const currentSettings = currentMetadata.notification_settings || { email: true, push: true, sms: false };
                user.metadata.notification_settings = {
                    ...currentSettings,
                    ...newNotificationSettings
                };
            }
        }

        await user.save();

        // Clear Redis cache to force refresh on next request
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${user.id}`);
            }
        } catch (redisError) {
            // Continue even if cache clear fails
        }

        // Prepare response with metadata
        const responseData = user.toObject ? user.toObject() : user;
        const responseMetadata = user.metadata || {};

        return res.json({
            success: true,
            message: 'Profile updated successfully',
            data: responseData,
            metadata: responseMetadata
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Something went wrong.' });
    }
};

// @desc    Get user profile
// @route   GET /api/auth/me
// @access  Private
const getUserProfile = async (req, res) => {
    try {
        // Try to get user from cache first
        let user = null;
        try {
            if (redisClient.isReady) {
                const cachedUser = await redisClient.get(`user:${req.user.id}`);
                if (cachedUser) {
                    user = JSON.parse(cachedUser);
                    // If cached user doesn't have profile_picture, fetch from DB to ensure consistency
                    if (!user.profile_picture || !user.profile_picture.url) {
                        user = null; // Force DB lookup
                    }
                }
            }
        } catch (redisError) {
            // Continue to DB lookup
        }

        // If not in cache or cache is incomplete, get from database with lean() for better performance
        if (!user) {
            user = await User.findOne({ id: req.user.id }).lean();
            // Update cache with complete user data including profile_picture
            if (user && redisClient.isReady) {
                try {
                    const userDataToCache = {
                        id: user.id,
                        full_name: user.full_name,
                        email: user.email,
                        phone_number: user.phone_number,
                        user_type: user.user_type,
                        is_admin: user.is_admin,
                        email_verified: user.email_verified,
                        created_at: user.created_at,
                        profile_picture: user.profile_picture || { url: '' }
                    };
                    await redisClient.set(`user:${user.id}`, JSON.stringify(userDataToCache), { EX: 60 * 60 * 24 });
                } catch (cacheError) {
                    // Continue even if cache update fails
                }
            }
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Map basic user data to the new profile structure if they're not already set
        // For personal_details
        const personalDetails = user.personal_details || {};
        if (!personalDetails.first_name && !personalDetails.last_name) {
            const [firstName, ...lastNameParts] = (user.full_name || '').split(' ');
            personalDetails.first_name = firstName || '';
            personalDetails.last_name = lastNameParts.join(' ') || '';
        }

        // For contact_details
        const contactDetails = user.contact_details || {};
        if (!contactDetails.email_address) {
            contactDetails.email_address = user.email || '';
        }
        if (!contactDetails.phone_number) {
            contactDetails.phone_number = user.phone_number || '';
        }

        // For location_details
        const locationDetails = user.location_details || {};

        // For profile_picture
        const profilePicture = user.profile_picture || { url: '' };

        // For metadata
        const metadata = user.metadata || {
            emergency_contact: {},
            next_of_kin: {},
            same_as_emergency_contact: false,
            notification_settings: {
                email: true,
                push: true,
                sms: false
            }
        };

        // Ensure notification_settings exists in metadata
        if (!metadata.notification_settings) {
            metadata.notification_settings = {
                email: true,
                push: true,
                sms: false
            };
        }

        // Populate favorite providers with full details
        let favoriteProviders = [];

        // Get favorite provider IDs from user object
        const favoriteProviderIds = (user && user.favorite_providers) ? user.favorite_providers : [];

        if (favoriteProviderIds && favoriteProviderIds.length > 0) {
            try {
                // Get providers with lean() for better performance
                const populatedUser = await User.findOne({ id: user.id })
                    .populate({
                        path: 'favorite_providers',
                        select: '-fcm_token -notification_settings -__v'
                    })
                    .lean();

                if (populatedUser && populatedUser.favorite_providers && populatedUser.favorite_providers.length > 0) {
                    // Manually populate services for each provider, filtering out invalid ObjectIds
                    favoriteProviders = await Promise.all(
                        populatedUser.favorite_providers.map(async (provider) => {
                            // Skip if provider is null or not an object (populate might return null for deleted providers)
                            if (!provider || typeof provider !== 'object') {
                                return null;
                            }

                            let services = [];

                            if (provider.services && Array.isArray(provider.services) && provider.services.length > 0) {
                                // Filter out invalid ObjectIds and convert to ObjectId instances
                                const validServiceIds = provider.services
                                    .filter(serviceId => {
                                        // Skip null, undefined, or non-string/non-ObjectId values
                                        if (!serviceId) return false;

                                        // Handle both string and ObjectId types
                                        let idString;
                                        if (serviceId instanceof mongoose.Types.ObjectId) {
                                            idString = serviceId.toString();
                                        } else if (typeof serviceId === 'string') {
                                            idString = serviceId;
                                        } else {
                                            return false;
                                        }

                                        // Check if it's a valid ObjectId (24 hex characters and valid format)
                                        return mongoose.Types.ObjectId.isValid(idString) &&
                                            idString.length === 24 &&
                                            /^[0-9a-fA-F]{24}$/.test(idString);
                                    })
                                    .map(serviceId => {
                                        // Convert to ObjectId if it's a string, otherwise return as-is
                                        if (typeof serviceId === 'string') {
                                            return new mongoose.Types.ObjectId(serviceId);
                                        }
                                        return serviceId instanceof mongoose.Types.ObjectId
                                            ? serviceId
                                            : new mongoose.Types.ObjectId(serviceId);
                                    });

                                // Populate only valid ObjectIds with lean() for better performance
                                if (validServiceIds.length > 0) {
                                    try {
                                        services = await Service.find({
                                            _id: { $in: validServiceIds }
                                        }).select('-__v').lean();
                                    } catch (serviceError) {
                                        services = [];
                                    }
                                }
                            }

                            return {
                                ...provider,
                                services: services || []
                            };
                        })
                    );

                    // Filter out null values (deleted providers)
                    favoriteProviders = favoriteProviders.filter(provider => provider !== null);
                }
            } catch (populateError) {
                favoriteProviders = [];
            }
        }

        // Always add favorite_providers to metadata (even if empty array)
        // Make sure we're creating a new metadata object to avoid reference issues
        const responseMetadata = {
            ...metadata,
            favorite_providers: favoriteProviders || []
        };

        // Compute onboarding completion from the effective/normalized structures
        const onboarding = computePatientOnboardingStatus({
            ...user,
            personal_details: personalDetails,
            contact_details: contactDetails,
            location_details: locationDetails,
            metadata: responseMetadata
        });

        res.json({
            success: true,
            data: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number,
                user_type: user.user_type,
                email_verified: user.email_verified,
                created_at: user.created_at,
                profile_picture: profilePicture,
                personal_details: personalDetails,
                contact_details: contactDetails,
                location_details: locationDetails,
                is_onboarding_complete: onboarding.is_onboarding_complete,
                onboarding: onboarding.sections,
                onboarding_missing_sections: onboarding.missing_sections
            },
            metadata: responseMetadata
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Assign admin privileges to a user
// @route   PUT /api/v1/auth/assign-admin
// @access  Private/Admin
const assignAdminPrivileges = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Find user by ID - don't use lean() because we need to save
        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user to admin
        user.is_admin = true;
        await user.save();

        // Clear Redis cache if Redis is connected
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${user.id}`);
            }
        } catch (redisError) {
            console.error('Redis error:', redisError);
            // Continue without Redis
        }

        res.status(200).json({
            success: true,
            message: 'Admin privileges assigned successfully',
            data: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                is_admin: user.is_admin
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Remove admin privileges from a user
// @route   PUT /api/v1/auth/remove-admin
// @access  Private/Admin
const removeAdminPrivileges = async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Find user by ID - don't use lean() because we need to save
        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user to remove admin status
        user.is_admin = false;
        await user.save();

        // Clear Redis cache if Redis is connected
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${user.id}`);
            }
        } catch (redisError) {
            console.error('Redis error:', redisError);
            // Continue without Redis
        }

        res.status(200).json({
            success: true,
            message: 'Admin privileges removed successfully',
            data: {
                id: user.id,
                full_name: user.full_name,
                email: user.email,
                is_admin: user.is_admin
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get all users (admin only)
// @route   GET /api/v1/auth/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        // Add pagination support
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Add filtering by user type if provided
        const filter = {};
        if (req.query.user_type && ['Patient', 'Clinician', 'DiagnosticProvider'].includes(req.query.user_type)) {
            filter.user_type = req.query.user_type;
        }

        // Add search by name or email if provided
        if (req.query.search) {
            filter.$or = [
                { full_name: { $regex: req.query.search, $options: 'i' } },
                { email: { $regex: req.query.search, $options: 'i' } }
            ];
        }

        // Get users with pagination - use lean() for better performance
        const users = await User.find(filter)
            .select('-password')
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Get total count for pagination
        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            count: users.length,
            total,
            pagination: {
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong.'
        });
    }
};

// @desc    Social OAuth login (Google, Facebook, Apple)
// @route   POST /api/auth/oauth/login
// @access  Public
const socialOAuthLogin = async (req, res) => {
    try {
        const { idToken, provider, email, name, photoURL, phoneNumber } = req.body;

        // Validate required fields
        if (!idToken || !provider) {
            return res.status(400).json({
                success: false,
                message: 'ID token and provider are required.'
            });
        }

        // Validate provider
        const validProviders = ['google', 'facebook', 'apple'];
        if (!validProviders.includes(provider.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid provider. Supported providers: google, facebook, apple.'
            });
        }

        let decodedToken;
        let userEmail = email;
        let userName = name;
        let userPhoto = photoURL;
        let userPhone = phoneNumber;
        let oauthId;

        try {
            // Ensure Firebase Admin is initialized
            if (!admin.apps.length) {
                // Firebase Admin not initialized, try to initialize it
                if (process.env.FIREBASE_CREDENTIAL) {
                    try {
                        const credentialJson = process.env.FIREBASE_CREDENTIAL;
                        if (!credentialJson.includes('your-private-key')) {
                            const serviceAccount = JSON.parse(credentialJson);
                            admin.initializeApp({
                                credential: admin.credential.cert(serviceAccount)
                            });
                            console.log('[OAuth] Firebase Admin initialized in authController');
                        }
                    } catch (initError) {
                        console.error('[OAuth] Firebase Admin initialization error:', initError);
                        return res.status(500).json({
                            success: false,
                            message: 'Firebase Admin not properly configured. Please check server configuration.'
                        });
                    }
                } else {
                    return res.status(500).json({
                        success: false,
                        message: 'Firebase Admin not configured. Please set FIREBASE_CREDENTIAL environment variable.'
                    });
                }
            }

            // Verify the Firebase ID token
            decodedToken = await admin.auth().verifyIdToken(idToken);

            // Extract user information from decoded token
            userEmail = decodedToken.email || email;
            userName = decodedToken.name || name || decodedToken.displayName || 'User';
            userPhoto = decodedToken.picture || photoURL || '';
            userPhone = decodedToken.phone_number || phoneNumber || '';
            oauthId = decodedToken.uid || decodedToken.sub;

            // Verify provider matches
            const tokenProvider = decodedToken.firebase?.sign_in_provider;
            if (tokenProvider) {
                const providerMap = {
                    'google.com': 'google',
                    'facebook.com': 'facebook',
                    'apple.com': 'apple'
                };
                const mappedProvider = providerMap[tokenProvider];
                if (mappedProvider && mappedProvider !== provider.toLowerCase()) {
                    console.warn(`Provider mismatch: token provider is ${tokenProvider}, but request provider is ${provider}`);
                }
            }
        } catch (firebaseError) {
            console.error('Firebase token verification error:', firebaseError);
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token. Please try again.'
            });
        }

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email is required for OAuth login.'
            });
        }

        // Normalize provider name
        const normalizedProvider = provider.toLowerCase();

        // Check if user exists by email or oauth_id
        let user = await User.findOne({
            $or: [
                { email: userEmail.toLowerCase() },
                { oauth_id: oauthId, oauth_provider: normalizedProvider }
            ]
        });

        if (user) {
            // User exists - update OAuth info if needed
            const isNewOAuthLink = !user.oauth_provider || !user.oauth_id;

            if (isNewOAuthLink) {
                user.oauth_provider = normalizedProvider;
                user.oauth_id = oauthId;
                // If user has no password (OAuth user), mark email as verified
                if (!user.password) {
                    user.email_verified = true;
                }
                // Store when OAuth was first linked
                if (!user.oauth_metadata) {
                    user.oauth_metadata = {};
                }
                if (!user.oauth_metadata.oauth_account_created) {
                    user.oauth_metadata.oauth_account_created = new Date();
                }
            }

            // Update OAuth metadata
            if (!user.oauth_metadata) {
                user.oauth_metadata = {};
            }
            user.oauth_metadata.provider_user_id = oauthId;
            user.oauth_metadata.provider_email = userEmail;
            user.oauth_metadata.provider_name = userName;
            user.oauth_metadata.provider_photo = userPhoto || '';
            user.oauth_metadata.last_oauth_login = new Date();

            // Update profile picture only if:
            // 1. User doesn't have a profile picture (empty/null), OR
            // 2. Current profile picture is already a Google URL (was set from OAuth before)
            // IMPORTANT: Never overwrite custom uploaded profile pictures (Cloudinary URLs)
            const currentProfilePictureUrl = user.profile_picture?.url || '';
            const hasNoProfilePicture = !currentProfilePictureUrl || currentProfilePictureUrl.trim() === '';
            const isCurrentPictureGoogle = isGoogleProfilePictureUrl(currentProfilePictureUrl);
            const isCurrentPictureCloudinary = currentProfilePictureUrl.includes('cloudinary.com') ||
                currentProfilePictureUrl.includes('res.cloudinary.com');

            // Only update if no picture exists OR if current picture is from Google OAuth
            // Never overwrite custom Cloudinary uploads
            if (userPhoto && (hasNoProfilePicture || (isCurrentPictureGoogle && !isCurrentPictureCloudinary))) {
                user.profile_picture = { url: userPhoto };
                console.log(`[OAuth Login] Updated profile picture for user ${user.id} - had no picture or was Google URL`);
            } else if (userPhoto && isCurrentPictureCloudinary) {
                console.log(`[OAuth Login] Preserved custom profile picture for user ${user.id} - not overwriting Cloudinary upload`);
            }

            // Update name if provided and different
            if (userName && user.full_name !== userName) {
                user.full_name = userName;
            }

            // Update phone if provided and user doesn't have one
            if (userPhone && !user.phone_number) {
                user.phone_number = userPhone;
            }

            // Save to MongoDB
            await user.save();

            // Clear Redis cache to ensure fresh data on next request
            try {
                if (redisClient.isReady) {
                    await redisClient.del(`user:${user.id}`);
                }
            } catch (redisError) {
                // Continue even if cache clear fails
            }
        } else {
            // New user - create account
            // Generate a random password for OAuth users (they won't use it)
            const randomPassword = nanoid(20);
            const now = new Date();

            // Create user with all OAuth data stored in MongoDB
            user = await User.create({
                full_name: userName,
                email: userEmail.toLowerCase(),
                password: randomPassword, // Random password, user won't use it
                phone_number: userPhone || '',
                user_type: 'Patient', // OAuth is only for patients
                oauth_provider: normalizedProvider,
                oauth_id: oauthId,
                email_verified: true, // OAuth emails are pre-verified
                profile_picture: { url: userPhoto || '' },
                // Store OAuth metadata in MongoDB
                oauth_metadata: {
                    provider_user_id: oauthId,
                    provider_email: userEmail,
                    provider_name: userName,
                    provider_photo: userPhoto || '',
                    last_oauth_login: now,
                    oauth_account_created: now
                }
            });
        }

        // Enforce Patient-only login for OAuth
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'OAuth login is only available for patients.'
            });
        }

        // Generate JWT token
        const token = generateToken(user.id);

        // Prepare user data for response and cache
        const userData = {
            id: user.id,
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number,
            user_type: user.user_type,
            is_admin: user.is_admin,
            email_verified: user.email_verified,
            oauth_provider: user.oauth_provider,
            created_at: user.created_at
        };

        // Store user data in Redis cache if Redis is connected
        try {
            if (redisClient.isReady) {
                await redisClient.set(`user:${user.id}`, JSON.stringify(userData), { EX: 60 * 60 * 24 }); // Expire in 24 hours
                await redisClient.set(`user:email:${normalizedUserEmail}`, user.id, { EX: 60 * 60 * 24 });
            }
        } catch (redisError) {
            // Continue without Redis caching
        }

        // Get full user data including oauth_metadata - convert to plain object for response
        const savedUser = user.toObject ? user.toObject() : user;

        return res.json({
            success: true,
            data: {
                id: savedUser.id,
                full_name: savedUser.full_name,
                email: savedUser.email,
                phone_number: savedUser.phone_number,
                user_type: savedUser.user_type,
                is_admin: savedUser.is_admin,
                email_verified: savedUser.email_verified,
                oauth_provider: savedUser.oauth_provider,
                oauth_id: savedUser.oauth_id,
                oauth_metadata: savedUser.oauth_metadata || null,
                profile_picture: savedUser.profile_picture,
                created_at: savedUser.created_at,
                token
            },
            message: savedUser.oauth_provider ? 'Login successful' : 'Account created and logged in successfully'
        });
    } catch (error) {
        console.error('OAuth login error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong during OAuth login.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Request password reset (Forgot Password)
// @route   POST /api/v1/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
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

        // Find user by email - use direct lookup since email is stored lowercase and indexed
        // Use lean() for better performance since we're not modifying the user
        const user = await User.findOne({ email: normalizedEmail }).lean();

        // For security, don't reveal if user exists or not
        // Always return success message to prevent email enumeration
        if (!user) {
            // Return success message even if user doesn't exist (security best practice)
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Only allow password reset for Patients
        if (user.user_type !== 'Patient') {
            // Still return success to prevent user enumeration
            return res.status(200).json({
                success: true,
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        }

        // Check if user has OAuth login (no password to reset)
        if (user.oauth_provider && !user.password) {
            return res.status(400).json({
                success: false,
                message: 'This account uses social login. Please sign in with your social provider.'
            });
        }

        // Delete any existing password reset tokens for this user
        await PasswordResetToken.deleteMany({ user_id: user.id });

        // Create new password reset token
        const resetToken = await PasswordResetToken.create({
            user_id: user.id,
            email: normalizedEmail
        });

        // Extract client request origin or referer (if sent from frontend client)
        const requestOrigin = req.body.redirect_url || req.get('origin') || req.get('referer') || null;

        // Send password reset email
        try {
            await sendPasswordResetEmail(
                normalizedEmail,
                resetToken.token,
                user.full_name,
                null,
                requestOrigin
            );
            console.log(`[Forgot Password] Reset email sent to: ${normalizedEmail}`);
        } catch (emailError) {
            console.error(`[Forgot Password] Failed to send email to ${normalizedEmail}:`, emailError);
            return res.status(500).json({
                success: false,
                message: 'Failed to send password reset email. Please try again later.'
            });
        }

        res.status(200).json({
            success: true,
            message: 'If an account with that email exists, a password reset link has been sent.'
        });
    } catch (error) {
        console.error('[Forgot Password] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Reset password using token
// @route   POST /api/v1/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required.'
            });
        }

        // Validate password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 6 characters long.'
            });
        }

        // Find the reset token
        const resetToken = await PasswordResetToken.findOne({ token });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token. Please request a new password reset.'
            });
        }

        // Check if token has been used
        if (resetToken.used) {
            return res.status(400).json({
                success: false,
                message: 'This reset token has already been used. Please request a new password reset.'
            });
        }

        // Find the user - don't use lean() because we need to save
        const user = await User.findOne({ id: resetToken.user_id });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Only allow password reset for Patients
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'Password reset is only available for patients.'
            });
        }

        // Update user password (will be hashed by pre-save middleware)
        // Set password directly - pre-save hook will hash it
        user.set('password', newPassword);
        // Explicitly mark password as modified to ensure pre-save hook runs
        user.markModified('password');

        await user.save();

        // Mark token as used
        resetToken.used = true;
        await resetToken.save();

        // Delete all other reset tokens for this user
        await PasswordResetToken.deleteMany({
            user_id: user.id,
            _id: { $ne: resetToken._id }
        });

        // Clear Redis cache if available
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${user.id}`);
                await redisClient.del(`user:email:${user.email}`);
            }
        } catch (redisError) {
            // Continue even if cache clear fails
        }

        return res.status(200).json({
            success: true,
            message: 'Password has been reset successfully. You can now login with your new password.'
        });
    } catch (error) {
        console.error('[Reset Password] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Change password (Patient only - requires old password)
// @route   POST /api/v1/auth/change-password
// @access  Private/Patient
const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const userId = req.user.id;

        // Validate input
        if (!oldPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Old password and new password are required.'
            });
        }

        // Validate new password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 6 characters long.'
            });
        }

        // Find the user - don't use lean() because we need to save
        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found.'
            });
        }

        // Check if user is a patient
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can change their password.'
            });
        }

        // Check if user has a password (OAuth users might not have one)
        if (!user.password) {
            return res.status(400).json({
                success: false,
                message: 'This account does not have a password. Please use social login or request a password reset.'
            });
        }

        // Verify old password
        const isOldPasswordValid = await user.matchPassword(oldPassword);
        if (!isOldPasswordValid) {
            return res.status(400).json({
                success: false,
                message: 'Old password is incorrect.'
            });
        }

        // Check if new password is the same as old password
        const isSamePassword = await user.matchPassword(newPassword);
        if (isSamePassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from your current password.'
            });
        }

        // Update password (will be hashed by pre-save middleware)
        user.set('password', newPassword);
        // Explicitly mark password as modified to ensure pre-save hook runs
        user.markModified('password');

        await user.save();

        // Clear Redis cache if available
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${user.id}`);
                await redisClient.del(`user:email:${user.email}`);
            }
        } catch (redisError) {
            // Continue even if cache clear fails
        }

        return res.status(200).json({
            success: true,
            message: 'Password changed successfully.'
        });
    } catch (error) {
        console.error('[Change Password] Error:', error);
        res.status(500).json({
            success: false,
            message: 'Something went wrong. Please try again later.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Toggle provider in favorites
// @route   POST /api/v1/auth/favorites/providers/toggle
// @access  Private (Patient only)
const toggleFavoriteProvider = async (req, res) => {
    try {
        const { provider_id } = req.body;
        const userId = req.user.id;

        if (!provider_id) {
            return res.status(400).json({
                success: false,
                message: 'Provider ID is required'
            });
        }

        // Find user - don't use lean() because we need to save the document
        const user = await User.findOne({ id: userId });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is a patient
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can manage favorite providers'
            });
        }

        // Find provider by custom id
        const provider = await Provider.findOne({ id: provider_id });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if provider is already in favorites
        const providerObjectId = provider._id;
        const isFavorite = user.favorite_providers && user.favorite_providers.some(
            favId => favId.toString() === providerObjectId.toString()
        );

        let action;
        if (isFavorite) {
            // Remove from favorites
            user.favorite_providers = user.favorite_providers.filter(
                favId => favId.toString() !== providerObjectId.toString()
            );
            action = 'removed';
        } else {
            // Add to favorites
            if (!user.favorite_providers) {
                user.favorite_providers = [];
            }
            user.favorite_providers.push(providerObjectId);
            action = 'added';
        }

        await user.save();

        // Clear Redis cache to force refresh on next request
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${user.id}`);
            }
        } catch (redisError) {
            // Continue even if cache clear fails
        }

        res.json({
            success: true,
            message: `Provider ${action} to favorites successfully`,
            data: {
                provider_id: provider_id,
                provider_name: provider.provider_name,
                action: action,
                is_favorite: !isFavorite
            }
        });
    } catch (error) {
        console.error('Toggle favorite provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get favorite providers
// @route   GET /api/v1/auth/favorites/providers
// @access  Private (Patient only)
const getFavoriteProviders = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find user - use lean() for better performance
        const user = await User.findOne({ id: userId })
            .populate({
                path: 'favorite_providers',
                select: '-fcm_token -notification_settings -__v',
                populate: {
                    path: 'services',
                    select: '-__v'
                }
            })
            .lean();

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is a patient
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can view favorite providers'
            });
        }

        const favoriteProviders = user.favorite_providers || [];

        res.json({
            success: true,
            data: {
                favorite_providers: favoriteProviders,
                count: favoriteProviders.length
            }
        });
    } catch (error) {
        console.error('Get favorite providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Check if provider is in favorites
// @route   GET /api/v1/auth/favorites/providers/:providerId/status
// @access  Private (Patient only)
const getFavoriteProviderStatus = async (req, res) => {
    try {
        const { providerId } = req.params;
        const userId = req.user.id;

        // Find user - use lean() for read-only operations
        const user = await User.findOne({ id: userId }).lean();
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is a patient
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can check favorite provider status'
            });
        }

        // Find provider by custom id
        const provider = await Provider.findOne({ id: providerId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if provider is in favorites
        const providerObjectId = provider._id;
        const isFavorite = user.favorite_providers && user.favorite_providers.some(
            favId => favId.toString() === providerObjectId.toString()
        );

        res.json({
            success: true,
            data: {
                provider_id: providerId,
                is_favorite: isFavorite
            }
        });
    } catch (error) {
        console.error('Get favorite provider status error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
    try {
        const userId = req.user?.id;

        // Clear Redis cache if user was cached
        if (userId) {
            try {
                if (redisClient.isReady) {
                    await redisClient.del(`user:${userId}`);
                    console.log(`[Logout] Cleared Redis cache for user ${userId}`);
                }
            } catch (redisError) {
                console.error('Redis cache clear error:', redisError);
                // Continue even if Redis fails
            }
        }

        // Get frontend URL from environment or use default
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/Sign-in-Patient`;

        res.json({
            success: true,
            message: 'Logged out successfully',
            data: {
                redirect_url: redirectUrl
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Delete user account (Patient only)
// @route   DELETE /api/v1/auth/me
// @access  Private/Patient
const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the user
        const user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user is a patient
        if (user.user_type !== 'Patient') {
            return res.status(403).json({
                success: false,
                message: 'Only patients can delete their accounts'
            });
        }

        // Delete the user account
        await User.deleteOne({ id: userId });

        // Clear Redis cache
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${userId}`);
            }
        } catch (redisError) {
            // Continue even if cache clear fails
        }

        res.json({
            success: true,
            message: 'Account deleted successfully.'
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Export all functions and middleware
module.exports = {
    registerUser,
    loginUser,
    loginProvider,
    verifyOTP,
    resendOTP,
    getUserProfile,
    updateUserProfile,
    assignAdminPrivileges,
    removeAdminPrivileges,
    getAllUsers,
    socialOAuthLogin,
    forgotPassword,
    resetPassword,
    changePassword,
    toggleFavoriteProvider,
    handleMulterError,
    getFavoriteProviders,
    getFavoriteProviderStatus,
    logoutUser,
    deleteAccount,
    upload, // Export the upload middleware
    compressAndUpload, // Export the compression middleware
    handleMulterError // Export the error handler
}; 