// Provider controller
const mongoose = require('mongoose');
const { nanoid } = require('nanoid');
const User = require('../models/User');
const Provider = require('../models/Provider');
const PendingRegistration = require('../models/PendingRegistration');
const TimeSlot = require('../models/TimeSlot');
const jwt = require('jsonwebtoken');
const { redisClient } = require('../config/redis');
const otpService = require('../services/otpService');
const Appointment = require('../models/Appointment');
const cloudinary = require('../config/cloudinary');
const crypto = require('crypto');
const Service = require('../models/Service');
const Review = require('../models/Review');
const axios = require('axios');
const ProviderReport = require('../models/ProviderReport');
const SupportTicket = require('../models/SupportTicket');

// Generate JWT token - same as in authController
const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// Helper to get default working hours
const getDefaultWorkingHours = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days.map(day => {
        const isWeekend = day === 'Saturday' || day === 'Sunday';
        return {
            day,
            isAvailable: !isWeekend,
            startTime: isWeekend ? '' : '09:00 AM',
            endTime: isWeekend ? '' : '05:00 PM'
        };
    });
};

// @desc    Register a new provider
// @route   POST /api/providers/register
// @access  Public
const registerProvider = async (req, res) => {
    try {
        // Log the incoming request body for debugging
        console.log('Provider registration request body:', req.body);

        const {
            provider_name,
            work_email,
            work_phone,
            password,
            user_type = 'DiagnosticProvider', // Default to DiagnosticProvider if not provided
            metadata
        } = req.body;

        // Validate required fields explicitly
        if (!provider_name) {
            return res.status(400).json({
                success: false,
                message: 'Provider name is required'
            });
        }

        if (!work_email) {
            return res.status(400).json({
                success: false,
                message: 'Work email is required'
            });
        }

        if (!work_phone) {
            return res.status(400).json({
                success: false,
                message: 'Work phone number is required'
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'Password is required'
            });
        }

        // Normalize email to lowercase
        const normalizedEmail = work_email ? work_email.toLowerCase().trim() : null;

        // Check if user already exists with the work email
        const userExists = await User.findOne({ email: normalizedEmail });

        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Check if provider with work email already exists
        const providerExists = await Provider.findOne({ work_email: normalizedEmail });

        if (providerExists) {
            return res.status(400).json({
                success: false,
                message: 'Provider with this work email already exists'
            });
        }

        // Check if there's already a pending registration for this email
        const pendingRegistrationExists = await PendingRegistration.findOne({ email: normalizedEmail });

        if (pendingRegistrationExists) {
            // Delete the old pending registration and create a new one
            await PendingRegistration.deleteOne({ id: pendingRegistrationExists.id });
            console.log(`[Provider Registration] Deleted old pending registration for: ${normalizedEmail}`);
        }

        // Get default working hours
        const defaultWorkingHours = getDefaultWorkingHours();

        // Create pending registration instead of creating user/provider directly
        const pendingRegistration = await PendingRegistration.create({
            full_name: provider_name,
            email: normalizedEmail,
            password,
            phone_number: work_phone,
            user_type: 'DiagnosticProvider',
            metadata: {
                ...metadata,
                working_hours: defaultWorkingHours
            },
            provider_name,
            work_email: normalizedEmail,
            work_phone
        });

        // Generate and send OTP for pending registration (don't await - run in background)
        otpService.generateAndSendOTPForPending(pendingRegistration.id, normalizedEmail, provider_name)
            .then(() => {
                console.log(`[Provider Registration] OTP email sent successfully to ${normalizedEmail}`);
            })
            .catch((emailError) => {
                console.error(`[Provider Registration] Error sending OTP email to ${normalizedEmail}:`, emailError.message || emailError);
                // Don't throw - user can request another OTP later via resend-otp endpoint
            });

        // Return success response - no token yet, user needs to verify email first
        res.status(201).json({
            success: true,
            data: {
                email: pendingRegistration.email,
                message: 'Provider registration initiated. Please verify your email with the OTP sent to your email address to complete registration.'
            },
            message: 'Provider registration initiated. Please verify your email with the OTP sent to your email address to complete registration.'
        });
    } catch (error) {
        console.error('Provider registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Add a new provider profile for an existing user
// @route   POST /api/v1/providers
// @access  Private/Admin
const addProviderProfile = async (req, res) => {
    try {
        const { fullname, email, phone, role } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found. A provider profile can only be created for an existing user.'
            });
        }

        // If user exists, update their role to be a provider
        user.user_type = role || 'DiagnosticProvider'; // Default to DiagnosticProvider
        await user.save();


        // Check if a provider profile already exists for this user
        let provider = await Provider.findOne({ user_id: user.id });

        if (provider) {
            return res.status(400).json({
                success: false,
                message: 'Provider profile already exists for this user'
            });
        }

        // Create a new provider profile
        const defaultWorkingHours = getDefaultWorkingHours();

        provider = await Provider.create({
            user_id: user.id,
            provider_name: fullname,
            work_email: email,
            work_phone: phone,
            working_hours: defaultWorkingHours
        });

        res.status(201).json({
            success: true,
            message: 'Provider profile added successfully',
            data: provider
        });
    } catch (error) {
        console.error('Add provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider profile
// @route   GET /api/providers/me
// @access  Private
const getProviderProfile = async (req, res) => {
    try {
        // User is already available in req.user from the protect middleware
        // Fetch the provider details
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found'
            });
        }

        // Lazy migration: If working_hours is empty, populate it with default values
        if (!provider.working_hours || provider.working_hours.length === 0) {
            console.log(`[getProviderProfile] Initializing default working hours for provider ${provider.id}`);
            provider.working_hours = getDefaultWorkingHours();
            await provider.save();
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: req.user.id,
                    full_name: req.user.full_name,
                    email: req.user.email,
                    phone_number: req.user.phone_number,
                    user_type: req.user.user_type,
                    email_verified: req.user.email_verified,
                    created_at: req.user.created_at
                },
                provider: {
                    id: provider.id,
                    provider_name: provider.provider_name,
                    work_email: provider.work_email,
                    work_phone: provider.work_phone,
                    services: provider.services,
                    address: provider.address,
                    working_hours: provider.working_hours,
                    profile_complete: provider.profile_complete,
                    bank_details: provider.bank_details,
                    about: provider.about,
                    banner_image_url: provider.banner_image_url,
                    // profile picture and logo are the same
                    logo_image_url: req.user?.profile_picture?.url || provider.logo_image_url || '',
                    gallery_image_urls: provider.gallery_image_urls || [],
                    social_links: provider.social_links || {},
                    accreditations: provider.accreditations || []
                }
            }
        });
    } catch (error) {
        console.error('Get provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider profile (full details)
// @route   GET /api/v1/providers/profile/me
// @access  Private
const getFullProviderProfile = async (req, res) => {
    try {
        // User is already available in req.user from the protect middleware
        // Fetch the provider details
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found'
            });
        }

        // Lazy migration: If working_hours is empty, populate it with default values
        if (!provider.working_hours || provider.working_hours.length === 0) {
            console.log(`[getFullProviderProfile] Initializing default working hours for provider ${provider.id}`);
            provider.working_hours = getDefaultWorkingHours();
            // Don't wait for save to complete before responding (optimistic)
            // But we do need to save it to persist the fix
            await provider.save();
        }

        // Return combined user and provider data structure similar to auth/me but for providers
        res.json({
            success: true,
            data: {
                id: req.user.id,
                is_onboarding_complete: provider.profile_complete,
                full_name: req.user.full_name,
                email: req.user.email,
                phone_number: req.user.phone_number,
                user_type: req.user.user_type,
                email_verified: req.user.email_verified,
                created_at: req.user.created_at,
                profile_picture: req.user.profile_picture || { url: '' },
                provider: {
                    id: provider.id,
                    provider_name: provider.provider_name,
                    work_email: provider.work_email,
                    work_phone: provider.work_phone,
                    services: provider.services,
                    address: provider.address,
                    working_hours: provider.working_hours,
                    profile_complete: provider.profile_complete,
                    bank_details: provider.bank_details,
                    about: provider.about,
                    banner_image_url: provider.banner_image_url,
                    // profile picture and logo are the same
                    logo_image_url: req.user?.profile_picture?.url || provider.logo_image_url || '',
                    gallery_image_urls: provider.gallery_image_urls || [],
                    social_links: provider.social_links || {},
                    accreditations: provider.accreditations || [],
                    notification_settings: provider.notification_settings,
                    administrativedetails: provider.administrativedetails
                }
            }
        });
    } catch (error) {
        console.error('Get full provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider profile (onboarding)
// @route   POST /api/providers/onboard/profile
// @access  Private
const onboardProviderProfile = async (req, res) => {
    try {
        const {
            provider_name,
            work_email,
            work_phone,
            services,
            address
        } = req.body;

        // Fetch the provider
        let provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found'
            });
        }

        // Update the provider record
        const updateData = {};
        if (provider_name) updateData.provider_name = provider_name;
        if (work_email) updateData.work_email = work_email;
        if (work_phone) updateData.work_phone = work_phone;
        if (services) updateData.services = services;
        if (address) updateData.address = address;

        // Update the fcm_token if provided
        if (req.body.fcm_token) {
            updateData.fcm_token = req.body.fcm_token;
        }

        // Update the profile
        provider = await Provider.findOneAndUpdate(
            { user_id: req.user.id },
            { $set: updateData },
            { new: true }
        );

        res.json({
            success: true,
            data: {
                provider: {
                    id: provider.id,
                    provider_name: provider.provider_name,
                    work_email: provider.work_email,
                    work_phone: provider.work_phone,
                    services: provider.services,
                    address: provider.address,
                    profile_complete: provider.profile_complete
                }
            },
            message: 'Provider profile updated successfully'
        });
    } catch (error) {
        console.error('Update provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider profile
// @route   PUT /api/v1/providers/me
// @access  Private
const updateProviderProfile = async (req, res) => {
    try {
        const { fullname, email, phone, role } = req.body;
        const { id: userId } = req.user;

        // Find the user and provider
        let user = await User.findOne({ id: userId });
        let provider = await Provider.findOne({ user_id: userId });

        if (!user || !provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Handle image upload
        if (req.file) {
            user.profile_picture = { url: req.file.path };
        }

        // Update user fields
        if (fullname) user.full_name = fullname;
        if (email) user.email = email;
        if (phone) user.phone_number = phone;
        if (role) user.user_type = role;

        // Update provider fields
        if (fullname) provider.provider_name = fullname;
        if (email) provider.work_email = email;
        if (phone) provider.work_phone = phone;

        await user.save();
        await provider.save();

        res.json({
            success: true,
            message: 'Provider profile updated successfully',
            data: {
                user,
                provider
            }
        });
    } catch (error) {
        console.error('Update provider profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Upload helper (multer memoryStorage -> Cloudinary)
const uploadBufferToCloudinary = async (file, { folder, transformation } = {}) => {
    if (!file?.buffer) return null;
    const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder || 'provider_media',
                resource_type: 'image',
                ...(transformation ? { transformation } : {})
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(file.buffer);
    });
    return uploadResult.secure_url;
};

// @desc    Update full provider profile (info + media)
// @route   PUT /api/v1/providers/profile/me
// @access  Private (Provider)
const updateFullProviderProfile = async (req, res) => {
    try {
        const { id: userId } = req.user;

        const user = await User.findOne({ id: userId });
        const provider = await Provider.findOne({ user_id: userId });

        if (!user || !provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // Text fields (user)
        const {
            full_name,
            email,
            phone_number,

            // provider fields
            provider_name,
            work_email,
            work_phone,
            about,

            // address
            street,
            city,
            state,
            country,
            postal_code,

            // social
            website,
            instagram,
            facebook,
            twitter,

            // provider credentials
            accreditations
        } = req.body;

        if (full_name !== undefined) user.full_name = full_name;
        if (email !== undefined) user.email = email;
        if (phone_number !== undefined) user.phone_number = phone_number;

        if (provider_name !== undefined) provider.provider_name = provider_name;
        if (work_email !== undefined) provider.work_email = work_email;
        if (work_phone !== undefined) provider.work_phone = work_phone;
        if (about !== undefined) provider.about = String(about).trim();

        // Accreditations: accept array or JSON string
        if (accreditations !== undefined) {
            let acc = accreditations;
            if (typeof acc === 'string') {
                try { acc = JSON.parse(acc); } catch (_) { /* ignore */ }
            }
            if (Array.isArray(acc)) {
                provider.accreditations = acc.map(a => ({
                    name: a?.name,
                    issuing_body: a?.issuing_body,
                    year: a?.year
                }));
                provider.markModified('accreditations');
            }
        }

        // Address patch
        provider.address = {
            ...(provider.address || {}),
            ...(street !== undefined ? { street } : {}),
            ...(city !== undefined ? { city } : {}),
            ...(state !== undefined ? { state } : {}),
            ...(country !== undefined ? { country } : {}),
            ...(postal_code !== undefined ? { postal_code } : {})
        };
        provider.markModified('address');

        // Social links patch
        provider.social_links = {
            ...(provider.social_links || {}),
            ...(website !== undefined ? { website } : {}),
            ...(instagram !== undefined ? { instagram } : {}),
            ...(facebook !== undefined ? { facebook } : {}),
            ...(twitter !== undefined ? { twitter } : {})
        };
        provider.markModified('social_links');

        // Media uploads (multipart)
        const files = req.files || {};

        const profilePicFile = files.profile_picture?.[0];
        const bannerFile = files.banner_image?.[0];
        const logoFile = files.logo?.[0];
        const galleryFiles = files.gallery || [];

        if (profilePicFile?.buffer) {
            const url = await uploadBufferToCloudinary(profilePicFile, {
                folder: 'profile_pictures',
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto:good', fetch_format: 'auto' }
                ]
            });
            if (url) user.profile_picture = { url };
        }

        if (bannerFile?.buffer) {
            const url = await uploadBufferToCloudinary(bannerFile, {
                folder: 'provider_banner',
                transformation: [
                    { width: 1400, height: 500, crop: 'fill', gravity: 'auto', quality: 'auto:good', fetch_format: 'auto' }
                ]
            });
            if (url) provider.banner_image_url = url;
        }

        if (logoFile?.buffer) {
            const url = await uploadBufferToCloudinary(logoFile, {
                folder: 'provider_logo',
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:good', fetch_format: 'auto' }
                ]
            });
            if (url) {
                provider.logo_image_url = url;
                user.profile_picture = { url };
            }
        }

        // Always keep logo == profile_picture
        if (user.profile_picture?.url) {
            provider.logo_image_url = user.profile_picture.url;
        }

        if (Array.isArray(galleryFiles) && galleryFiles.length > 0) {
            const urls = (await Promise.all(
                galleryFiles.map(f => uploadBufferToCloudinary(f, { folder: 'provider_gallery' }))
            )).filter(Boolean);

            provider.gallery_image_urls = Array.from(new Set([...(provider.gallery_image_urls || []), ...urls]));
        }

        await user.save();
        await provider.save();

        return res.json({
            success: true,
            message: 'Provider profile updated successfully',
            data: {
                id: user.id,
                is_onboarding_complete: provider.profile_complete,
                full_name: user.full_name,
                email: user.email,
                phone_number: user.phone_number,
                user_type: user.user_type,
                email_verified: user.email_verified,
                created_at: user.created_at,
                profile_picture: user.profile_picture || { url: '' },
                provider: {
                    id: provider.id,
                    provider_name: provider.provider_name,
                    work_email: provider.work_email,
                    work_phone: provider.work_phone,
                    services: provider.services,
                    address: provider.address,
                    working_hours: provider.working_hours,
                    profile_complete: provider.profile_complete,
                    bank_details: provider.bank_details,
                    about: provider.about,
                    banner_image_url: provider.banner_image_url,
                    // profile picture and logo are the same
                    logo_image_url: user.profile_picture?.url || provider.logo_image_url || '',
                    gallery_image_urls: provider.gallery_image_urls || [],
                    social_links: provider.social_links || {},
                    accreditations: provider.accreditations || [],
                    notification_settings: provider.notification_settings,
                    administrativedetails: provider.administrativedetails
                }
            }
        });
    } catch (error) {
        console.error('Update full provider profile error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update provider profile picture
// @route   PUT /api/v1/providers/me/profile-picture
// @access  Private
const updateProviderProfilePicture = async (req, res) => {
    try {
        const { id: userId } = req.user;

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No image file provided'
            });
        }

        // Find the user
        let user = await User.findOne({ id: userId });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update profile picture
        user.profile_picture = { url: req.file.path };

        await user.save();

        // Keep provider.logo_image_url in sync with user profile picture
        try {
            const provider = await Provider.findOne({ user_id: userId });
            if (provider) {
                provider.logo_image_url = user.profile_picture?.url || '';
                await provider.save();
            }
        } catch (_) {
            // non-critical
        }

        // Clear Redis cache if User ID is used there
        try {
            if (redisClient.isReady) {
                await redisClient.del(`user:${userId}`);
            }
        } catch (redisError) {
            // Continue without Redis
        }

        res.json({
            success: true,
            message: 'Profile picture updated successfully',
            data: {
                profile_picture: user.profile_picture
            }
        });
    } catch (error) {
        console.error('Update provider profile picture error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Add provider administrative details
// @route   POST /api/v1/providers/me/administrative-details
// @access  Private
const addAdministrativeDetails = async (req, res) => {
    try {
        const { fullname, email, phone, role } = req.body;
        const { id: userId } = req.user;

        // Find the provider
        let provider = await Provider.findOne({ user_id: userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Check if administrative details already exist
        if (provider.administrativedetails) {
            return res.status(400).json({
                success: false,
                message: 'Administrative details already exist for this provider'
            });
        }

        // Handle image upload
        let imageUrl = '';
        if (req.file && req.file.path) {
            imageUrl = req.file.path;
        }

        // Add administrative details
        provider.administrativedetails = {
            fullname,
            email,
            phone,
            role,
            image: imageUrl
        };

        await provider.save();

        res.json({
            success: true,
            message: 'Administrative details added successfully',
            data: provider.administrativedetails
        });
    } catch (error) {
        console.error('Add administrative details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider administrative details
// @route   PUT /api/v1/providers/me/administrative-details
// @access  Private
const updateAdministrativeDetails = async (req, res) => {
    try {
        const { fullname, email, phone, role } = req.body;
        const { id: userId } = req.user;

        // Find the provider
        let provider = await Provider.findOne({ user_id: userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Handle image upload
        let imageUrl = provider.administrativedetails?.image || '';
        if (req.file && req.file.path) {
            imageUrl = req.file.path;
        }

        // Update administrative details
        provider.administrativedetails = {
            fullname: fullname || provider.administrativedetails?.fullname,
            email: email || provider.administrativedetails?.email,
            phone: phone || provider.administrativedetails?.phone,
            role: role || provider.administrativedetails?.role,
            image: imageUrl
        };

        await provider.save();

        res.json({
            success: true,
            message: 'Administrative details updated successfully',
            data: provider.administrativedetails
        });
    } catch (error) {
        console.error('Update administrative details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider working hours
// @route   PUT /api/providers/onboard/working-hours
// @access  Private
const updateWorkingHours = async (req, res) => {
    try {
        const { working_hours } = req.body;

        if (!working_hours || !Array.isArray(working_hours)) {
            return res.status(400).json({
                success: false,
                message: 'Working hours must be provided as an array'
            });
        }

        // Ensure all days of the week are included
        const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const providedDays = working_hours.map(hour => hour.day);

        // Check if all days are provided
        const missingDays = allDays.filter(day => !providedDays.includes(day));

        if (missingDays.length > 0) {
            // Add missing days as not available
            missingDays.forEach(day => {
                working_hours.push({
                    day,
                    isAvailable: false
                });
            });
        }

        // Validate the working hours format
        for (const hour of working_hours) {
            if (!hour.day || !allDays.includes(hour.day)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid day format. Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday'
                });
            }

            if (hour.isAvailable === true) {
                if (!hour.startTime || !hour.endTime) {
                    return res.status(400).json({
                        success: false,
                        message: `Start time and end time are required for ${hour.day} when isAvailable is true`
                    });
                }

                // Validate time format (e.g., "9:00 AM", "5:30 PM")
                const timeRegex = /^(1[0-2]|0?[1-9]):([0-5][0-9]) (AM|PM)$/;
                if (!timeRegex.test(hour.startTime) || !timeRegex.test(hour.endTime)) {
                    return res.status(400).json({
                        success: false,
                        message: `Invalid time format for ${hour.day}. Use format like "9:00 AM" or "5:30 PM".`
                    });
                }
            }
        }

        // Update the provider's working hours
        const provider = await Provider.findOneAndUpdate(
            { user_id: req.user.id },
            {
                $set: {
                    working_hours,
                    profile_complete: true // Mark profile as complete when working hours are set
                }
            },
            { new: true }
        );

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            data: {
                working_hours: provider.working_hours,
                profile_complete: provider.profile_complete
            },
            message: 'Working hours updated successfully'
        });
    } catch (error) {
        console.error('Update working hours error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Generate time slots based on working hours
// @route   POST /api/providers/generate-slots
// @access  Private
// This function is no longer needed as we're using the provider's working hours directly
// Keeping this as a placeholder in case we need to re-implement it in the future
const generateTimeSlots = async (req, res) => {
    return res.status(410).json({
        success: false,
        message: 'This endpoint is no longer supported. The system now uses provider working hours directly.'
    });
};

// @desc    Complete provider onboarding
// @route   POST /api/v1/providers/onboard/complete
// @access  Private
const completeOnboarding = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Validate critical fields
        if (!provider.provider_name || !provider.work_email || !provider.work_phone) {
            return res.status(400).json({
                success: false,
                message: 'Please complete your profile details first'
            });
        }

        if (!provider.working_hours || provider.working_hours.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please set your working hours first'
            });
        }

        // Mark profile as complete
        provider.profile_complete = true;
        await provider.save();

        res.json({
            success: true,
            message: 'Onboarding completed successfully',
            data: {
                provider: {
                    id: provider.id,
                    provider_name: provider.provider_name,
                    profile_complete: provider.profile_complete
                }
            }
        });
    } catch (error) {
        console.error('Complete onboarding error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider's time slots
// @route   GET /api/providers/slots
// @access  Private
const getProviderTimeSlots = async (req, res) => {
    try {
        const { date } = req.query;

        // Fetch the provider
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'Date parameter is required'
            });
        }

        // Validate date format
        const selectedDate = new Date(date);
        if (isNaN(selectedDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid date format. Please use YYYY-MM-DD format.'
            });
        }

        // Get day information
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 6 = Saturday
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

        // Check if provider works on this day of the week based on their calendar
        const workingHoursForDay = provider.working_hours.find(hours => hours.day === dayName);
        const isWorkingDay = workingHoursForDay && workingHoursForDay.isAvailable;

        if (!isWorkingDay) {
            return res.json({
                success: true,
                data: {
                    date: date,
                    dayName: dayName,
                    isWorkingDay: false,
                    message: `You do not work on ${dayName}s.`,
                    slots: []
                }
            });
        }

        // Set time bounds for the query
        const startOfDay = new Date(selectedDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(selectedDate);
        endOfDay.setHours(23, 59, 59, 999);

        // Get booked appointments for this day
        const bookedAppointments = await Appointment.find({
            provider_id: provider.id,
            appointment_date: {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $nin: ['cancelled', 'rejected'] }
        }).sort({ start_time: 1 });

        // Create a map of booked time slots
        const bookedTimeSlots = {};
        bookedAppointments.forEach(appointment => {
            const key = `${appointment.start_time}-${appointment.end_time}`;
            bookedTimeSlots[key] = {
                id: appointment.id,
                patient_id: appointment.patient_id,
                service_id: appointment.service_id,
                status: appointment.status
            };
        });

        // Generate time slots based on provider's working hours
        const interval = 30; // 30-minute intervals
        const slots = [];

        // Parse start and end times
        const startTimeParts = workingHoursForDay.startTime.match(/(\d+):(\d+) ([AP]M)/);
        const endTimeParts = workingHoursForDay.endTime.match(/(\d+):(\d+) ([AP]M)/);

        if (!startTimeParts || !endTimeParts) {
            return res.status(400).json({
                success: false,
                message: 'Invalid time format in provider working hours'
            });
        }

        let startHour = parseInt(startTimeParts[1]);
        const startMinute = parseInt(startTimeParts[2]);
        const startAmPm = startTimeParts[3];

        let endHour = parseInt(endTimeParts[1]);
        const endMinute = parseInt(endTimeParts[2]);
        const endAmPm = endTimeParts[3];

        // Convert to 24-hour format
        if (startAmPm === 'PM' && startHour < 12) startHour += 12;
        if (startAmPm === 'AM' && startHour === 12) startHour = 0;

        if (endAmPm === 'PM' && endHour < 12) endHour += 12;
        if (endAmPm === 'AM' && endHour === 12) endHour = 0;

        // Set start and end times for the selected date
        const startTime = new Date(selectedDate);
        startTime.setHours(startHour, startMinute, 0, 0);

        const endTime = new Date(selectedDate);
        endTime.setHours(endHour, endMinute, 0, 0);

        // Generate slots
        let slotStart = new Date(startTime);
        let slotId = 1;

        while (slotStart < endTime) {
            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotStart.getMinutes() + interval);

            // Don't create slots that go beyond the end time
            if (slotEnd > endTime) {
                break;
            }

            // Format times for display
            const startHour = slotStart.getHours();
            const startMinutes = slotStart.getMinutes();
            const endHour = slotEnd.getHours();
            const endMinutes = slotEnd.getMinutes();

            const formattedStartTime = `${startHour % 12 || 12}:${startMinutes.toString().padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`;
            const formattedEndTime = `${endHour % 12 || 12}:${endMinutes.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`;

            // Check if this slot is already booked
            const slotKey = `${formattedStartTime}-${formattedEndTime}`;
            const bookedInfo = bookedTimeSlots[slotKey];
            const isAvailable = !bookedInfo;

            // Add slot to the list
            slots.push({
                id: isAvailable ? `${provider.id}_${date}_${slotId}` : bookedInfo.id,
                start_time: formattedStartTime,
                end_time: formattedEndTime,
                is_available: isAvailable,
                booking_info: isAvailable ? null : {
                    patient_id: bookedInfo.patient_id,
                    service_id: bookedInfo.service_id,
                    status: bookedInfo.status
                }
            });

            if (isAvailable) {
                slotId++;
            }

            // Move to next slot
            slotStart = new Date(slotEnd);
        }

        res.json({
            success: true,
            data: {
                date: date,
                dayName: dayName,
                isWorkingDay: true,
                working_hours: `${workingHoursForDay.startTime} - ${workingHoursForDay.endTime}`,
                slots: slots,
                slots_count: slots.length,
                available_count: slots.filter(slot => slot.is_available).length,
                booked_count: slots.filter(slot => !slot.is_available).length
            }
        });
    } catch (error) {
        console.error('Get provider time slots error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Helper function to parse time string (e.g., "9:00 AM") to hours and minutes
function parseTimeString(timeStr) {
    try {
        const [timePart, ampm] = timeStr.split(' ');
        let [hours, minutes] = timePart.split(':').map(Number);

        if (ampm.toUpperCase() === 'PM' && hours < 12) {
            hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
            hours = 0;
        }

        return { hours, minutes };
    } catch (error) {
        console.error('Error parsing time string:', timeStr, error);
        return null;
    }
}

// Helper function to generate slots for a specific day
function generateSlotsForDay(date, startTime, endTime, intervalMinutes, providerId) {
    const slots = [];

    // Set start and end times
    const start = new Date(date);
    start.setHours(startTime.hours, startTime.minutes, 0, 0);

    const end = new Date(date);
    end.setHours(endTime.hours, endTime.minutes, 0, 0);

    // Current slot start time
    let slotStart = new Date(start);

    while (slotStart < end) {
        // Calculate slot end time
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotStart.getMinutes() + intervalMinutes);

        // Don't create slots that go beyond the end time
        if (slotEnd > end) {
            break;
        }

        // Format times for display
        const formattedStartTime = formatTimeForDisplay(slotStart);
        const formattedEndTime = formatTimeForDisplay(slotEnd);

        // Create slot object
        const slot = {
            provider_id: providerId,
            date: new Date(date),
            start_time: formattedStartTime,
            end_time: formattedEndTime,
            is_available: true,
            created_at: new Date(),
            updated_at: new Date()
        };

        slots.push(slot);

        // Move to next slot
        slotStart = new Date(slotEnd);
    }

    return slots;
}

// Helper function to format time for display (e.g., "9:00 AM")
function formatTimeForDisplay(date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();

    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12; // Convert 0 to 12 for 12 AM
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${ampm}`;
}

// @desc    Get all active providers
// @route   GET /api/v1/providers/all
// @access  Public
const getAllProviders = async (req, res) => {
    try {
        // Add pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Find active providers with completed profiles
        const filter = { profile_complete: true };

        // Add search by name if provided
        if (req.query.search) {
            filter.provider_name = { $regex: req.query.search, $options: 'i' };
        }

        // Find providers first without populating (to handle invalid ObjectIds)
        const providers = await Provider.find(filter, 'id user_id provider_name work_email work_phone services address working_hours administrativedetails bank_details profile_complete about banner_image_url logo_image_url gallery_image_urls social_links accreditations policy auto_confirm_appointments request_to_book ratings reviews created_at updated_at')
            .sort({ provider_name: 1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Manually populate services and reviews
        const providersWithServices = await Promise.all(
            providers.map(async (provider) => {
                let services = [];
                let reviews = [];

                // Fetch services by provider_id (more robust than relying on provider.services array)
                try {
                    services = await Service.find({ provider_id: provider.id }).select('-__v').lean();
                } catch (serviceError) {
                    console.error(`Error fetching services for provider ${provider.id}:`, serviceError);
                    services = [];
                }

                // Fetch reviews from Review collection with patient information
                try {
                    const reviewDocs = await Review.find({ provider_id: provider.id })
                        .select('-__v')
                        .sort({ created_at: -1 })
                        .lean();

                    // Get current user ID if authenticated (optional)
                    const currentUserId = req.user?.id || null;

                    // Populate patient names and check like/save status for each review
                    reviews = await Promise.all(
                        reviewDocs.map(async (review) => {
                            try {
                                const patient = await User.findOne({ id: review.patient_id })
                                    .select('id full_name profile_picture')
                                    .lean();

                                // Check if current user has liked this review
                                const isLiked = currentUserId && review.likes && review.likes.includes(currentUserId);

                                // Check if current user has saved this review
                                const isSaved = currentUserId && review.saved_by && review.saved_by.includes(currentUserId);

                                return {
                                    ...review,
                                    patient: patient ? {
                                        id: patient.id,
                                        full_name: patient.full_name,
                                        profile_picture: patient.profile_picture
                                    } : null,
                                    is_liked: isLiked || false,
                                    is_saved: isSaved || false,
                                    likes_count: review.likes ? review.likes.length : 0,
                                    saved_count: review.saved_by ? review.saved_by.length : 0
                                };
                            } catch (patientError) {
                                console.error(`Error fetching patient for review ${review.id}:`, patientError);
                                return {
                                    ...review,
                                    patient: null,
                                    is_liked: false,
                                    is_saved: false,
                                    likes_count: review.likes ? review.likes.length : 0,
                                    saved_count: review.saved_by ? review.saved_by.length : 0
                                };
                            }
                        })
                    );
                } catch (reviewError) {
                    console.error(`Error fetching reviews for provider ${provider.id}:`, reviewError);
                    reviews = [];
                }

                return {
                    ...provider,
                    services: services || [],
                    reviews: reviews || []
                };
            })
        );

        // Count total
        const total = await Provider.countDocuments(filter);

        res.json({
            success: true,
            count: providersWithServices.length,
            total,
            pagination: {
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            data: providersWithServices
        });
    } catch (error) {
        console.error('Get all providers error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider's calendar view
// @route   GET /api/providers/calendar
// @access  Private
const getProviderCalendar = async (req, res) => {
    try {
        const { month, year } = req.body;

        // Get current month and year if not provided
        const currentMonth = month ? parseInt(month) : new Date().getMonth() + 1; // 1-12
        const currentYear = year ? parseInt(year) : new Date().getFullYear();

        // Fetch the provider
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Calculate start and end dates for the query (entire month)
        const startDate = new Date(currentYear, currentMonth - 1, 1); // Month is 0-indexed in Date
        const endDate = new Date(currentYear, currentMonth, 0); // Last day of the month
        endDate.setHours(23, 59, 59, 999);

        // Get today's date for filtering past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to beginning of current day

        // Count available slots by date
        const availableSlots = await TimeSlot.aggregate([
            {
                $match: {
                    provider_id: provider.id,
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    },
                    is_available: true
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);

        // Create a map of dates with available slots
        const datesWithSlots = {};
        availableSlots.forEach(item => {
            datesWithSlots[item._id] = item.count;
        });

        // Calculate all days in the month with availability information
        const calendarDays = [];
        const totalDays = new Date(currentYear, currentMonth, 0).getDate();

        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(currentYear, currentMonth - 1, day);

            // Get day of week (0-6, where 0 is Sunday)
            const dayOfWeek = date.getDay();
            const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

            // Check if provider works on this day
            const workingHoursForDay = provider.working_hours.find(hours => hours.day === dayName);
            const isWorkingDay = workingHoursForDay && workingHoursForDay.isAvailable;

            // Format date as YYYY-MM-DD
            const dateStr = date.toISOString().split('T')[0];

            // Check if date is in the past
            const isPastDate = date < today;

            // Check if there are available slots for this date
            const hasSlots = !isPastDate && datesWithSlots[dateStr] > 0;
            const slotsCount = !isPastDate ? (datesWithSlots[dateStr] || 0) : 0;

            calendarDays.push({
                date: dateStr,
                day,
                dayOfWeek,
                dayName,
                isWorkingDay,
                isPastDate,
                hasAvailableSlots: hasSlots,
                availableSlotsCount: slotsCount,
                workingHours: isWorkingDay ? {
                    startTime: workingHoursForDay.startTime,
                    endTime: workingHoursForDay.endTime
                } : null
            });
        }

        res.json({
            success: true,
            data: {
                provider: {
                    id: provider.id,
                    provider_name: provider.provider_name
                },
                calendar: {
                    year: currentYear,
                    month: currentMonth,
                    days: calendarDays
                }
            }
        });
    } catch (error) {
        console.error('Get provider calendar error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider notification settings
// @route   GET /api/v1/providers/me/notification-settings
// @access  Private
const getNotificationSettings = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id }).select('notification_settings');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            data: provider.notification_settings
        });
    } catch (error) {
        console.error('Get notification settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider notification settings
// @route   PUT /api/v1/providers/me/notification-settings
// @access  Private
const updateNotificationSettings = async (req, res) => {
    try {
        const { email, push, sms } = req.body;

        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Update settings
        if (typeof email === 'boolean') {
            provider.notification_settings.email = email;
        }
        if (typeof push === 'boolean') {
            provider.notification_settings.push = push;
        }
        if (typeof sms === 'boolean') {
            provider.notification_settings.sms = sms;
        }

        await provider.save();

        res.json({
            success: true,
            message: 'Notification settings updated successfully',
            data: provider.notification_settings
        });
    } catch (error) {
        console.error('Update notification settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider auto-confirm setting
// @route   GET /api/v1/providers/me/auto-confirm
// @access  Private/Provider
const getAutoConfirmSetting = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            data: {
                auto_confirm_appointments: provider.auto_confirm_appointments || false
            }
        });
    } catch (error) {
        console.error('Get auto-confirm setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider auto-confirm setting
// @route   PUT /api/v1/providers/me/auto-confirm
// @access  Private/Provider
const updateAutoConfirmSetting = async (req, res) => {
    try {
        const { auto_confirm_appointments } = req.body;

        if (typeof auto_confirm_appointments !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'auto_confirm_appointments must be a boolean value (true or false)'
            });
        }

        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Update the auto-confirm setting
        provider.auto_confirm_appointments = auto_confirm_appointments;
        await provider.save();

        const message = auto_confirm_appointments
            ? 'Auto-confirm appointments enabled successfully'
            : 'Auto-confirm appointments disabled successfully';

        res.json({
            success: true,
            message,
            data: {
                auto_confirm_appointments: provider.auto_confirm_appointments
            }
        });
    } catch (error) {
        console.error('Update auto-confirm setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider request to book setting
// @route   GET /api/v1/providers/me/request-to-book
// @access  Private
const getRequestToBookSetting = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            data: {
                request_to_book: provider.request_to_book
            }
        });
    } catch (error) {
        console.error('Get request to book setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update provider request to book setting
// @route   PUT /api/v1/providers/me/request-to-book
// @access  Private
const updateRequestToBookSetting = async (req, res) => {
    try {
        const { request_to_book } = req.body;

        if (typeof request_to_book !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'request_to_book must be a boolean value (true or false)'
            });
        }

        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        // Update the request to book setting
        provider.request_to_book = request_to_book;
        await provider.save();

        const message = request_to_book
            ? 'Request to book enabled successfully'
            : 'Request to book disabled successfully';

        res.json({
            success: true,
            message,
            data: {
                request_to_book: provider.request_to_book
            }
        });
    } catch (error) {
        console.error('Update request to book setting error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider working hours
// @route   GET /api/v1/providers/:providerId/working-hours
// @access  Public
const getProviderWorkingHours = async (req, res) => {
    try {
        const { providerId } = req.params;

        const provider = await Provider.findOne({ id: providerId }).select('working_hours');

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            data: provider.working_hours
        });
    } catch (error) {
        console.error('Get provider working hours error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get my working hours (for logged in provider)
// @route   GET /api/v1/providers/me/working-hours
// @access  Private
const getMyWorkingHours = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        res.json({
            success: true,
            data: provider.working_hours || getDefaultWorkingHours()
        });
    } catch (error) {
        console.error('Get my working hours error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
};

// Helper to sanitize services before saving
const sanitizeProviderServices = (provider) => {
    if (provider.services && Array.isArray(provider.services)) {
        // Filter out invalid IDs
        const validServices = provider.services.filter(id => {
            const idStr = String(id);
            // Allow 24-char Hex (ObjectId) OR 10-char Alphanumeric (Nanoid from Service model)
            const isObjectId = /^[0-9a-fA-F]{24}$/.test(idStr);
            const isNanoid = /^[A-Za-z0-9_-]{10,21}$/.test(idStr);
            return isObjectId || isNanoid;
        });

        // Only update if changes were made to avoid unnecessary writes
        if (validServices.length !== provider.services.length) {
            console.warn(`[Sanitization] Removed ${provider.services.length - validServices.length} invalid service IDs from provider ${provider.id}`);
            provider.services = validServices;
            provider.markModified('services');
        }
    }
    return provider;
};

// @desc    Get provider dashboard statistics
// @route   GET /api/v1/providers/me/dashboard-stats
// @access  Private
const getProviderDashboardStats = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday as start of week
        startOfWeek.setHours(0, 0, 0, 0);

        const providerId = provider.id;

        // Helper pipelines
        const getOverviewPipeline = (dateFilter = {}) => [
            { $match: { provider_id: providerId, ...dateFilter } },
            {
                $group: {
                    _id: null,
                    total_appointments: { $sum: 1 },
                    completed_appointments: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ["$status", "completed"] },
                                        { $and: [{ $eq: ["$status", "confirmed"] }, { $lt: ["$appointment_date", now] }] }
                                    ]
                                }, 1, 0
                            ]
                        }
                    },
                    upcoming_appointments: {
                        $sum: { $cond: [{ $and: [{ $gte: ["$appointment_date", now] }, { $ne: ["$status", "cancelled"] }] }, 1, 0] }
                    },
                    cancelled_appointments: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }
                }
            }
        ];

        const serviceAggPipeline = (dateFilter = {}) => [
            {
                $match: {
                    provider_id: providerId,
                    ...dateFilter,
                    $or: [{ status: "confirmed" }, { status: "completed" }, { "payment.status": "completed" }]
                }
            },
            {
                $group: {
                    _id: "$service_id",
                    count: { $sum: 1 },
                    amount: { $sum: { $cond: [{ $eq: ["$payment.status", "completed"] }, "$payment.amount", 0] } }
                }
            },
            { $sort: { count: -1 } }
        ];

        // Execute Independent Queries in Parallel
        const [
            overviewTotal,
            overviewMonthly,
            overviewWeekly,
            financialsAgg,
            revenueByMonthAgg,
            visitsTotal,
            visitsMonthly,
            visitsWeekly,
            uniquePatientIds,
            newPatientIds,
            svcTotal,
            svcMonthly,
            svcWeekly
        ] = await Promise.all([
            // 1-3. Overviews
            Appointment.aggregate(getOverviewPipeline()),
            Appointment.aggregate(getOverviewPipeline({ appointment_date: { $gte: startOfMonth } })),
            Appointment.aggregate(getOverviewPipeline({ appointment_date: { $gte: startOfWeek } })),

            // 4. Financials Total
            Appointment.aggregate([
                { $match: { provider_id: providerId, "payment.status": "completed" } },
                {
                    $group: {
                        _id: null,
                        total_revenue: { $sum: "$payment.amount" },
                        first_payment_date: { $min: { $ifNull: ["$payment.paid_at", "$created_at"] } },
                        last_payment_date: { $max: { $ifNull: ["$payment.paid_at", "$created_at"] } }
                    }
                }
            ]),

            // 5. Revenue By Month
            Appointment.aggregate([
                { $match: { provider_id: providerId, "payment.status": "completed" } },
                {
                    $group: {
                        _id: {
                            year: { $year: { $ifNull: ["$payment.paid_at", "$created_at"] } },
                            month: { $month: { $ifNull: ["$payment.paid_at", "$created_at"] } }
                        },
                        amount: { $sum: "$payment.amount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1 } }
            ]),

            // 6-8. Patient Visits
            Appointment.countDocuments({ provider_id: providerId, $or: [{ status: "completed" }, { $and: [{ status: "confirmed" }, { appointment_date: { $lt: now } }] }] }),
            Appointment.countDocuments({ provider_id: providerId, appointment_date: { $gte: startOfMonth }, $or: [{ status: "completed" }, { $and: [{ status: "confirmed" }, { appointment_date: { $lt: now } }] }] }),
            Appointment.countDocuments({ provider_id: providerId, appointment_date: { $gte: startOfWeek }, $or: [{ status: "completed" }, { $and: [{ status: "confirmed" }, { appointment_date: { $lt: now } }] }] }),

            // 9-10. Patients
            Appointment.distinct("patient_id", { provider_id: providerId }),
            Appointment.distinct("patient_id", { provider_id: providerId, created_at: { $gte: startOfMonth } }),

            // 11-13. Services
            Appointment.aggregate(serviceAggPipeline()),
            Appointment.aggregate(serviceAggPipeline({ appointment_date: { $gte: startOfMonth } })),
            Appointment.aggregate(serviceAggPipeline({ appointment_date: { $gte: startOfWeek } }))
        ]);

        // Fetch Demographics separately (much lighter now)
        let demographics = { male: 0, female: 0, other: 0, unknown: 0 };
        if (uniquePatientIds.length > 0) {
            const demoStats = await User.aggregate([
                { $match: { id: { $in: uniquePatientIds } } },
                {
                    $group: {
                        _id: { $toLower: "$personal_details.gender" },
                        count: { $sum: 1 }
                    }
                }
            ]);

            demoStats.forEach(d => {
                const gender = d._id || 'unknown';
                if (demographics[gender] !== undefined) demographics[gender] = d.count;
                else demographics.unknown += d.count;
            });
        }

        // Fetch Service Names ONE TIME for all service IDs
        const allServiceIds = new Set([
            ...svcTotal.map(s => s._id),
            ...svcMonthly.map(s => s._id),
            ...svcWeekly.map(s => s._id)
        ]);

        const serviceMap = {};
        if (allServiceIds.size > 0) {
            const services = await Service.find({ id: { $in: Array.from(allServiceIds) } }).lean();
            services.forEach(s => serviceMap[s.id] = s.name);
        }

        // Formatting Helpers
        const defaultOverview = { total_appointments: 0, completed_appointments: 0, upcoming_appointments: 0, cancelled_appointments: 0 };
        const cleanStats = (arr) => {
            const obj = arr[0] || defaultOverview;
            const newObj = { ...obj };
            delete newObj._id;
            return newObj;
        };

        const formatServices = (data) => data.map(item => ({
            service_id: item._id,
            service_name: serviceMap[item._id] || 'Unknown Service',
            count: item.count,
            amount: item.amount || 0
        }));

        // Format Revenue By Month
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const revenue_by_month = revenueByMonthAgg.map(item => ({
            year: item._id.year,
            month: item._id.month,
            month_name: months[(item._id.month || 1) - 1],
            amount: item.amount,
            count: item.count,
            period: `${months[(item._id.month || 1) - 1]} ${item._id.year}`
        }));

        const financialsRaw = financialsAgg[0] || { total_revenue: 0, first_payment_date: null, last_payment_date: null };
        const financials = { ...financialsRaw };
        delete financials._id;

        res.json({
            success: true,
            data: {
                overview: {
                    total: cleanStats(overviewTotal),
                    monthly: cleanStats(overviewMonthly),
                    weekly: cleanStats(overviewWeekly),
                    user_stats: {
                        total_unique_patients: uniquePatientIds.length,
                        new_patients_this_month: newPatientIds.length,
                        demographics
                    }
                },
                financials: {
                    ...financials,
                    revenue_by_month,
                    revenue_by_service: {
                        total: formatServices(svcTotal),
                        monthly: formatServices(svcMonthly),
                        weekly: formatServices(svcWeekly)
                    }
                },
                patient_visits: {
                    total: visitsTotal,
                    monthly: visitsMonthly,
                    weekly: visitsWeekly
                },
                top_services: {
                    total: formatServices(svcTotal.slice(0, 5)),
                    monthly: formatServices(svcMonthly.slice(0, 5)),
                    weekly: formatServices(svcWeekly.slice(0, 5))
                }
            }
        });

    } catch (error) {
        console.error('Get provider dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get provider appointments
// @route   GET /api/v1/providers/appointments
// @access  Private
const getProviderAppointments = async (req, res) => {
    try {
        const { period, status, search, page = 1, limit = 10 } = req.query;
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const query = { provider_id: provider.id };

        // Period Filter
        const now = new Date();
        if (period === 'today') {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0));
            const endOfDay = new Date(now.setHours(23, 59, 59, 999));
            query.appointment_date = { $gte: startOfDay, $lte: endOfDay };
        } else if (period === 'week') {
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);
            query.appointment_date = { $gte: startOfWeek };
        } else if (period === 'month') {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            query.appointment_date = { $gte: startOfMonth };
        }

        // Status Filter
        if (status && status !== 'all') {
            query.status = status;
        }

        // Search Filter (Requires Lookup or complex aggregation, sticking to basic regex on populated fields or pre-fetch)
        // Ideally we filter by ID if it matches regex, or perform finding users first.
        // For simplicity and performance, we'll filter by ID or fetch all matches if search is small.
        // Actually, Appointment has patient_id. We can find users matching name/email then query appointments.
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Find patients matching search
            const patients = await User.find({
                $or: [
                    { full_name: searchRegex },
                    { email: searchRegex },
                    { phone_number: searchRegex },
                    { 'metadata.identification_number': searchRegex }
                ]
            }).select('id');
            const patientIds = patients.map(p => p.id);

            query.$or = [
                { id: searchRegex }, // Appointment ID
                { patient_id: { $in: patientIds } }
            ];
        }

        const skip = (page - 1) * limit;
        const appointments = await Appointment.find(query)
            .sort({ appointment_date: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        const total = await Appointment.countDocuments(query);

        // Collect all unique IDs for batch fetching
        const serviceIds = [...new Set(appointments.map(a => a.service_id).filter(Boolean))];
        const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

        // Fetch Services and Users in parallel batch queries
        const [services, users] = await Promise.all([
            Service.find({ id: { $in: serviceIds } }).select('id name').lean(),
            User.find({ id: { $in: patientIds } }).select('id full_name email phone_number personal_details location_details').lean()
        ]);

        // Create lookup maps
        const serviceMap = {};
        services.forEach(s => serviceMap[s.id] = s);

        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        // Populate details in-memory
        const enrichedAppointments = appointments.map(appt => {
            const service = serviceMap[appt.service_id];
            const patient = userMap[appt.patient_id];

            return {
                ...appt,
                service_name: service ? service.name : 'Unknown Service',
                patient_name: patient ? patient.full_name : (appt.formData?.patientName || 'Guest User'),
                patient_email: patient ? patient.email : (appt.formData?.patientEmail || 'N/A'),
                patient_phone: patient ? patient.phone_number : (appt.formData?.patientPhone || 'N/A'),
                patient_dob: patient?.personal_details?.date_of_birth,
                patient_gender: patient?.personal_details?.gender,
                patient_address: patient?.location_details ? `${patient.location_details.address}, ${patient.location_details.city}` : (appt.formData?.patientAddress || '')
            };
        });

        res.json({
            success: true,
            data: enrichedAppointments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: Math.ceil(total / limit)
            }
        });

    } catch (error) {
        console.error('Get provider appointments error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get provider patients list
// @route   GET /api/v1/providers/patients
// @access  Private
const getProviderPatients = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search
        } = req.query;

        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
        const providerId = provider.id;
        const now = new Date();

        // If search is provided, we need to find matching users first
        if (search) {
            const searchLower = search.toLowerCase();
            const searchRegex = new RegExp(search, 'i');

            // Find matching patients in User collection
            const matchingUsers = await User.find({
                $or: [
                    { full_name: searchRegex },
                    { email: searchRegex },
                    { phone_number: searchRegex },
                    { 'metadata.identification_number': searchRegex }
                ]
            }).select('id full_name email phone_number personal_details location_details metadata created_at').lean();

            const matchingUserIds = matchingUsers.map(u => u.id);

            // Get appointment stats for these users only
            const pipeline = [
                {
                    $match: {
                        provider_id: providerId,
                        patient_id: { $in: matchingUserIds }
                    }
                },
                { $sort: { appointment_date: 1 } },
                {
                    $group: {
                        _id: "$patient_id",
                        last_appointment: { $max: { $cond: [{ $lt: ["$appointment_date", now] }, "$appointment_date", null] } },
                        next_appointment: { $min: { $cond: [{ $gte: ["$appointment_date", now] }, "$appointment_date", null] } },
                        registered: { $min: "$created_at" },
                        latest_form_data: { $last: "$formData" }
                    }
                }
            ];

            const patientStats = await Appointment.aggregate(pipeline);
            const statsMap = {};
            patientStats.forEach(stat => statsMap[stat._id] = stat);

            // Filter users to only those who are patients of this provider (either have appointments or are manually added)
            // Note: Manual check is needed if they have no appointments but were added manually
            const manuallyAddedPatients = await User.find({
                user_type: 'Patient',
                'metadata.added_by_provider': providerId,
                $or: [
                    { full_name: searchRegex },
                    { email: searchRegex },
                    { phone_number: searchRegex },
                    { 'metadata.identification_number': searchRegex }
                ]
            }).select('id').lean();

            const manuallyAddedIds = new Set(manuallyAddedPatients.map(p => p.id));
            const appointmentPatientIds = new Set(patientStats.map(p => p._id));

            // Final list of users (intersection of search matches AND (has appointments OR manually added))
            let patients = matchingUsers.filter(user =>
                appointmentPatientIds.has(user.id) || manuallyAddedIds.has(user.id)
            ).map(user => {
                const stat = statsMap[user.id];
                return {
                    id: user.id,
                    name: user.full_name || 'Unknown',
                    email: user.email || 'N/A',
                    phone: user.phone_number || 'N/A',
                    address: user.location_details?.address ? `${user.location_details.address}, ${user.location_details.city || ''}` : 'N/A',
                    date_of_birth: user.personal_details?.date_of_birth || '',
                    gender: user.personal_details?.gender || '',
                    city: user.location_details?.city || '',
                    state: user.location_details?.state || '',
                    identification_number: user.metadata?.identification_number || '',
                    registered: stat?.registered || user.created_at || new Date(),
                    last_appointment: stat?.last_appointment || null,
                    next_appointment: stat?.next_appointment || null
                };
            });

            // Sort
            patients.sort((a, b) => {
                const dateA = a.next_appointment || a.last_appointment || a.registered || new Date(0);
                const dateB = b.next_appointment || b.last_appointment || b.registered || new Date(0);
                return new Date(dateB) - new Date(dateA);
            });

            // Paginate
            const total = patients.length;
            const pageNum = parseInt(page);
            const limitNum = parseInt(limit);
            const startIndex = (pageNum - 1) * limitNum;
            const endIndex = startIndex + limitNum;
            const paginatedPatients = patients.slice(startIndex, endIndex);

            return res.json({
                success: true,
                data: paginatedPatients,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            });
        }

        // NO SEARCH - Optimized Path
        // 1. Get stats from Appointments (Lightweight)
        const pipeline = [
            { $match: { provider_id: providerId } },
            { $sort: { appointment_date: 1 } },
            {
                $group: {
                    _id: "$patient_id",
                    last_appointment: { $max: { $cond: [{ $lt: ["$appointment_date", now] }, "$appointment_date", null] } },
                    next_appointment: { $min: { $cond: [{ $gte: ["$appointment_date", now] }, "$appointment_date", null] } },
                    registered: { $min: "$created_at" }, // First appointment date as proxy for registration
                    latest_form_data: { $last: "$formData" } // Keep this to fallback for name if user not found later
                }
            }
        ];
        const patientStats = await Appointment.aggregate(pipeline);

        // 2. Get manually added patients (Lightweight - ID and created_at only)
        const manuallyAddedPatients = await User.find({
            user_type: 'Patient',
            'metadata.added_by_provider': providerId
        }).select('id created_at').lean();

        const manualPatientMap = {};
        manuallyAddedPatients.forEach(p => manualPatientMap[p.id] = p.created_at);

        // 3. Combine and Sort identifiers
        // We create a lightweight object for sorting: { id, sortDate }
        const allPatientIds = new Set([...patientStats.map(p => p._id), ...manuallyAddedPatients.map(p => p.id)]);
        const statsMap = {};
        patientStats.forEach(stat => statsMap[stat._id] = stat);

        const sortablePatients = Array.from(allPatientIds).map(id => {
            const stat = statsMap[id];
            const manualCreatedAt = manualPatientMap[id];

            // Prioritize dates for sorting: Next Appt > Last Appt > Registration Date
            const nextAppt = stat?.next_appointment;
            const lastAppt = stat?.last_appointment;
            // Use appointment registration date or manual user creation date
            const regDate = stat?.registered || manualCreatedAt || new Date(0);

            // Sort Key
            const sortDate = nextAppt || lastAppt || regDate;

            return {
                id,
                sortDate: new Date(sortDate),
                stat // Keep stat ref
            };
        });

        // Sort in memory (lightweight objects)
        sortablePatients.sort((a, b) => b.sortDate - a.sortDate);

        // 4. Paginate IDs
        const total = sortablePatients.length;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const startIndex = (pageNum - 1) * limitNum;
        const slicedPatients = sortablePatients.slice(startIndex, startIndex + limitNum);

        // 5. Fetch Details ONLY for current page
        const idsToFetch = slicedPatients.map(p => p.id);
        const users = await User.find({ id: { $in: idsToFetch } }).lean();
        const userMap = {};
        users.forEach(user => userMap[user.id] = user);

        // 6. Build Final Response
        const finalPatients = slicedPatients.map(item => {
            const { id, stat } = item;
            const user = userMap[id];

            let name = user ? user.full_name : (stat?.latest_form_data?.patientName || 'Unknown');
            // Name fallback logic
            if ((!name || name === 'Guest User' || name === 'Unknown') && user && user.personal_details) {
                const constructedName = `${user.personal_details.first_name || ''} ${user.personal_details.last_name || ''}`.trim();
                if (constructedName) name = constructedName;
            }
            if ((!name || name === 'Guest User') && stat?.latest_form_data?.patientName) {
                name = stat.latest_form_data.patientName;
            }

            const email = user ? (user.email || user.contact_details?.email_address) : (stat?.latest_form_data?.patientEmail || 'N/A');
            const phone = user ? (user.phone_number || user.contact_details?.phone_number) : (stat?.latest_form_data?.patientPhone || 'N/A');

            let address = 'N/A';
            if (user && user.location_details && user.location_details.address) {
                address = `${user.location_details.address}, ${user.location_details.city || ''} ${user.location_details.state || ''}`.trim().replace(/,\s*$/, '');
            } else if (stat?.latest_form_data?.patientAddress) {
                address = stat.latest_form_data.patientAddress;
            }

            return {
                id,
                name,
                email,
                phone,
                address,
                date_of_birth: user?.personal_details?.date_of_birth || '',
                gender: user?.personal_details?.gender || '',
                city: user?.location_details?.city || '',
                state: user?.location_details?.state || '',
                identification_number: user?.metadata?.identification_number || '',
                registered: stat?.registered || user?.created_at || new Date(),
                last_appointment: stat?.last_appointment || null,
                next_appointment: stat?.next_appointment || null
            };
        });

        res.json({
            success: true,
            data: finalPatients,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Get provider patients error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Manually add a patient
// @route   POST /api/v1/providers/patients
// @access  Private
const addPatientManually = async (req, res) => {
    try {
        const {
            full_name,
            email,
            phone_number,
            date_of_birth,
            gender,
            address,
            city,
            state,
            notes
        } = req.body;

        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        if (!full_name) return res.status(400).json({ success: false, message: 'Full name is required' });

        // Check if user exists
        let existingUser = null;
        if (email) existingUser = await User.findOne({ email: email.toLowerCase() });
        if (!existingUser && phone_number) existingUser = await User.findOne({ phone_number });

        let patientId;
        const identification_number = nanoid(10).toUpperCase();

        if (existingUser) {
            patientId = existingUser.id;

            // Update details if guest/incomplete
            const updates = {};
            if (existingUser.full_name === 'Guest User' || !existingUser.full_name) updates.full_name = full_name;
            if (!existingUser.personal_details) existingUser.personal_details = {};
            if (!existingUser.location_details) existingUser.location_details = {};

            if (date_of_birth) existingUser.personal_details.date_of_birth = date_of_birth;
            if (gender) existingUser.personal_details.gender = gender;
            if (address) existingUser.location_details.address = address;
            if (city) existingUser.location_details.city = city;
            if (state) existingUser.location_details.state = state;

            // Ensure linked to provider
            if (!existingUser.metadata) existingUser.metadata = {};
            existingUser.metadata.added_by_provider = provider.id;
            existingUser.metadata.added_at = new Date();
            if (!existingUser.metadata.identification_number) {
                existingUser.metadata.identification_number = identification_number;
            }

            existingUser.markModified('metadata');
            existingUser.markModified('personal_details');
            existingUser.markModified('location_details');

            Object.assign(existingUser, updates);
            await existingUser.save();

        } else {
            // Create new guest user
            const tempPassword = nanoid(12); // Random password
            const newUser = new User({
                full_name,
                email: email ? email.toLowerCase() : `guest-${nanoid(10)}@resq.com`,
                phone_number: phone_number || '',
                password: tempPassword,
                user_type: 'Patient',
                is_verified: false,
                personal_details: {
                    date_of_birth,
                    gender
                },
                location_details: {
                    address,
                    city,
                    state
                },
                metadata: {
                    added_by_provider: provider.id,
                    added_at: new Date(),
                    identification_number,
                    notes
                }
            });
            await newUser.save();
            patientId = newUser.id;
        }

        res.status(201).json({
            success: true,
            message: 'Patient added successfully',
            data: {
                id: patientId,
                identification_number: existingUser?.metadata?.identification_number || identification_number
            }
        });

    } catch (error) {
        console.error('Add patient manually error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Create a new service
// @route   POST /api/v1/providers/services
// @access  Private
const createService = async (req, res) => {
    try {
        const { name, category, description, price, uses, duration, metadata } = req.body;
        if (!name || !category || !description || !price) {
            return res.status(400).json({ success: false, message: 'Please provide all required fields' });
        }
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const newService = await Service.create({
            provider_id: provider.id,
            name,
            category,
            description,
            price,
            uses,
            duration: duration ? Number(duration) : 0,
            metadata: metadata || {}
        });

        if (!provider.services) provider.services = [];
        provider.services.push(newService.id);
        provider.markModified('services');
        await provider.save();

        res.status(201).json({ success: true, data: newService });
    } catch (error) {
        console.error('Create service error:', error);
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Service with this name already exists' });
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
};

// @desc    Get all provider services
// @route   GET /api/v1/providers/services
// @access  Private
const getProviderServices = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });
        const services = await Service.find({ provider_id: provider.id }).sort({ created_at: -1 });
        res.json({ success: true, count: services.length, data: services });
    } catch (error) {
        console.error('Get services error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update a service
// @route   PUT /api/v1/providers/services/:id
// @access  Private
const updateService = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const service = await Service.findOne({ id, provider_id: provider.id });
        if (!service) return res.status(404).json({ success: false, message: 'Service not found or unauthorized' });

        const allowedUpdates = ['name', 'category', 'description', 'price', 'uses', 'duration', 'metadata'];
        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) service[field] = updates[field];
        });
        await service.save();

        res.json({ success: true, data: service });
    } catch (error) {
        console.error('Update service error:', error);
        if (error.code === 11000) return res.status(400).json({ success: false, message: 'Service with this name already exists' });
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get list of banks
// @route   GET /api/v1/providers/banks
// @access  Private
const getBanks = async (req, res) => {
    try {
        // Check cache first (banks don't change often)
        const cacheKey = 'paystack_banks';
        let banks;

        try {
            if (redisClient.isReady) {
                const cachedBanks = await redisClient.get(cacheKey);
                if (cachedBanks) {
                    banks = JSON.parse(cachedBanks);
                }
            }
        } catch (cacheError) {
            console.error('Redis cache error:', cacheError);
        }

        if (!banks) {
            const response = await axios.get('https://api.paystack.co/bank', {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            });

            if (response.data.status) {
                banks = response.data.data;
                // Cache for 24 hours
                try {
                    if (redisClient.isReady) {
                        await redisClient.setEx(cacheKey, 86400, JSON.stringify(banks));
                    }
                } catch (cacheError) {
                    // Ignore cache errors
                }
            } else {
                throw new Error('Failed to fetch banks from Paystack');
            }
        }

        res.json({
            success: true,
            data: banks
        });
    } catch (error) {
        console.error('Get banks error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch banks',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Verify bank account number
// @route   POST /api/v1/providers/bank-account/verify
// @access  Private
const verifyBankAccount = async (req, res) => {
    try {
        const { account_number, bank_code } = req.body;

        if (!account_number || !bank_code) {
            return res.status(400).json({
                success: false,
                message: 'Account number and bank code are required'
            });
        }

        const response = await axios.get(
            `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
                }
            }
        );

        if (response.data.status) {
            res.json({
                success: true,
                message: 'Account verified successfully',
                data: response.data.data // contains account_name and account_number
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Could not verify account details'
            });
        }
    } catch (error) {
        console.error('Verify bank account error:', error.response?.data || error.message);
        const errorMessage = error.response?.data?.message || 'Verification failed. Please check your details.';
        res.status(400).json({
            success: false,
            message: errorMessage
        });
    }
};

// @desc    Save/Update bank account details
// @route   PUT /api/v1/providers/bank-account
// @access  Private
const updateBankAccount = async (req, res) => {
    try {
        const { bank_name, account_number, account_name, bank_code } = req.body;
        const { id: userId } = req.user;

        if (!bank_name || !account_number || !account_name || !bank_code) {
            return res.status(400).json({
                success: false,
                message: 'All bank details are required'
            });
        }

        const provider = await Provider.findOne({ user_id: userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        provider.bank_details = {
            bank_name,
            account_number,
            account_name,
            bank_code,
            is_verified: true
        };

        await provider.save();

        res.json({
            success: true,
            message: 'Bank account details updated successfully',
            data: provider.bank_details
        });
    } catch (error) {
        console.error('Update bank account error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get provider transactions (paid appointments)
// @route   GET /api/v1/providers/me/transactions
// @access  Private
const getProviderTransactions = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        const {
            page = 1,
            limit = 10,
            service_id,
            start_date,
            end_date,
            search
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Base filter: only completed payments for this provider
        const query = {
            provider_id: provider.id,
            'payment.status': 'completed'
        };

        // Date filter: by payment date when available, fallback to created_at
        if (start_date || end_date) {
            const dateFilter = {};
            if (start_date) {
                const start = new Date(start_date);
                if (!isNaN(start.getTime())) dateFilter.$gte = start;
            }
            if (end_date) {
                const end = new Date(end_date);
                if (!isNaN(end.getTime())) dateFilter.$lte = end;
            }
            if (Object.keys(dateFilter).length > 0) {
                // Use paidAt if present else created_at via $or
                query.$or = [
                    { 'payment.paidAt': dateFilter },
                    { 'payment.paidAt': { $exists: false }, created_at: dateFilter }
                ];
            }
        }

        if (service_id) {
            query.service_id = service_id;
        }

        // Optional search: match appointment id or paystack reference, or patient fields
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // Find patients matching search (name/email/phone/id number)
            const patients = await User.find({
                $or: [
                    { full_name: searchRegex },
                    { email: searchRegex },
                    { phone_number: searchRegex },
                    { 'metadata.identification_number': searchRegex }
                ]
            }).select('id').lean();
            const patientIds = patients.map(p => p.id);

            // Combine with existing $or if we already have date filter
            const searchOr = [
                { id: searchRegex },
                { 'payment.paystackReference': searchRegex },
                { patient_id: { $in: patientIds } }
            ];

            if (query.$or) {
                // Preserve existing date $or by wrapping in $and
                const dateOr = query.$or;
                delete query.$or;
                query.$and = [
                    { $or: dateOr },
                    { $or: searchOr }
                ];
            } else {
                query.$or = searchOr;
            }
        }

        // Fetch page of transactions
        const [appointments, total] = await Promise.all([
            Appointment.find(query)
                // Most recent transactions first:
                // 1) payment date (paidAt) when present
                // 2) updated_at (payment updates bump this via timestamps)
                // 3) created_at fallback
                .sort({ 'payment.paidAt': -1, updated_at: -1, created_at: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Appointment.countDocuments(query)
        ]);

        // Batch fetch service + patient details for this page
        const serviceIds = [...new Set(appointments.map(a => a.service_id).filter(Boolean))];
        const patientIds = [...new Set(appointments.map(a => a.patient_id).filter(Boolean))];

        const [services, users] = await Promise.all([
            Service.find({ id: { $in: serviceIds } }).select('id name category price').lean(),
            User.find({ id: { $in: patientIds } }).select('id full_name email phone_number').lean()
        ]);

        const serviceMap = {};
        services.forEach(s => serviceMap[s.id] = s);

        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        const transactions = appointments.map(appt => {
            const service = serviceMap[appt.service_id];
            const patient = userMap[appt.patient_id];

            return {
                appointment_id: appt.id,
                provider_id: appt.provider_id,
                patient: {
                    id: appt.patient_id,
                    name: patient?.full_name || appt.formData?.patientName || 'Guest User',
                    email: patient?.email || appt.formData?.patientEmail || 'N/A',
                    phone: patient?.phone_number || appt.formData?.patientPhone || 'N/A'
                },
                service: {
                    id: appt.service_id,
                    name: service?.name || 'Unknown Service',
                    category: service?.category,
                    price: service?.price
                },
                appointment: {
                    date: appt.appointment_date,
                    start_time: appt.start_time,
                    end_time: appt.end_time,
                    status: appt.status
                },
                payment: {
                    status: appt.payment?.status,
                    amount: appt.payment?.amount,
                    reference: appt.payment?.paystackReference,
                    paid_at: appt.payment?.paidAt,
                    payment_method: appt.payment?.method || 'paystack'
                },
                created_at: appt.created_at
            };
        });

        // Summary across ALL matching transactions (not only current page)
        const summaryAgg = await Appointment.aggregate([
            { $match: query },
            {
                $group: {
                    _id: '$service_id',
                    count: { $sum: 1 },
                    amount: { $sum: { $ifNull: ['$payment.amount', 0] } }
                }
            },
            { $sort: { amount: -1 } }
        ]);

        const summaryServiceIds = summaryAgg.map(s => s._id).filter(Boolean);
        const summaryServices = await Service.find({ id: { $in: summaryServiceIds } }).select('id name category').lean();
        const summaryServiceMap = {};
        summaryServices.forEach(s => summaryServiceMap[s.id] = s);

        const by_service = summaryAgg.map(item => ({
            service_id: item._id,
            service_name: summaryServiceMap[item._id]?.name || 'Unknown Service',
            category: summaryServiceMap[item._id]?.category,
            count: item.count,
            amount: item.amount || 0
        }));

        const total_amount = by_service.reduce((sum, s) => sum + (s.amount || 0), 0);
        const total_count = by_service.reduce((sum, s) => sum + (s.count || 0), 0);

        res.json({
            success: true,
            data: {
                transactions,
                summary: {
                    total_amount,
                    total_count,
                    by_service
                }
            },
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('Get provider transactions error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Report a provider (by patient)
// @route   POST /api/v1/providers/:providerId/reports
// @access  Private (Patient)
const reportProvider = async (req, res) => {
    try {
        const { providerId } = req.params;
        const { category, message, anonymous = false } = req.body;

        if (!providerId) {
            return res.status(400).json({ success: false, message: 'Provider ID is required' });
        }

        if (!message || String(message).trim().length < 10) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message (at least 10 characters)'
            });
        }

        const provider = await Provider.findOne({ id: providerId }).select('id provider_name').lean();
        if (!provider) {
            return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // Ensure patient has had at least one appointment with this provider
        const hasAppointment = await Appointment.exists({
            provider_id: providerId,
            patient_id: req.user.id
        });

        if (!hasAppointment) {
            return res.status(403).json({
                success: false,
                message: 'You can only report a provider you have booked with.'
            });
        }

        const report = await ProviderReport.create({
            provider_id: providerId,
            patient_id: req.user.id,
            category: category || 'Other',
            message: String(message).trim(),
            anonymous: !!anonymous,
            status: 'open'
        });

        res.status(201).json({
            success: true,
            message: 'Report submitted successfully',
            data: {
                report: {
                    id: report.id,
                    provider_id: report.provider_id,
                    category: report.category,
                    message: report.message,
                    anonymous: report.anonymous,
                    status: report.status,
                    created_at: report.created_at
                }
            }
        });
    } catch (error) {
        console.error('Report provider error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get reports made against me (provider only)
// @route   GET /api/v1/providers/me/reports
// @access  Private (Provider)
const getMyProviderReports = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { page = 1, limit = 10, status, category } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = { provider_id: provider.id };
        if (status) query.status = status;
        if (category) query.category = category;

        const [reports, total] = await Promise.all([
            ProviderReport.find(query)
                .sort({ created_at: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ProviderReport.countDocuments(query)
        ]);

        // Batch fetch patient details for non-anonymous reports
        const patientIds = [...new Set(reports.filter(r => !r.anonymous).map(r => r.patient_id).filter(Boolean))];
        const users = patientIds.length > 0
            ? await User.find({ id: { $in: patientIds } }).select('id full_name email phone_number').lean()
            : [];

        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        const formatted = reports.map(r => ({
            id: r.id,
            provider_id: r.provider_id,
            category: r.category,
            message: r.message,
            anonymous: r.anonymous,
            status: r.status,
            created_at: r.created_at,
            patient: r.anonymous ? null : {
                id: r.patient_id,
                name: userMap[r.patient_id]?.full_name || 'Unknown',
                email: userMap[r.patient_id]?.email || 'N/A',
                phone: userMap[r.patient_id]?.phone_number || 'N/A'
            }
        }));

        res.json({
            success: true,
            data: formatted,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get provider reports error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all reviews and rating summary for me (provider only)
// @route   GET /api/v1/providers/me/reviews
// @access  Private (Provider)
const getMyProviderReviews = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { page = 1, limit = 10, rating } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = { provider_id: provider.id };
        if (rating) query.rating = parseInt(rating);

        const [reviews, total] = await Promise.all([
            Review.find(query).sort({ created_at: -1 }).skip(skip).limit(limitNum).lean(),
            Review.countDocuments(query)
        ]);

        // Batch fetch patient details for this page
        const patientIds = [...new Set(reviews.map(r => r.patient_id).filter(Boolean))];
        const users = patientIds.length > 0
            ? await User.find({ id: { $in: patientIds } }).select('id full_name profile_picture email phone_number').lean()
            : [];

        const userMap = {};
        users.forEach(u => userMap[u.id] = u);

        const formattedReviews = reviews.map(r => ({
            id: r.id,
            provider_id: r.provider_id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at,
            likes_count: r.likes ? r.likes.length : 0,
            saved_count: r.saved_by ? r.saved_by.length : 0,
            patient: userMap[r.patient_id] ? {
                id: userMap[r.patient_id].id,
                full_name: userMap[r.patient_id].full_name,
                profile_picture: userMap[r.patient_id].profile_picture || { url: '' },
                email: userMap[r.patient_id].email,
                phone_number: userMap[r.patient_id].phone_number
            } : null
        }));

        // Summary (across ALL reviews)
        const ratingAgg = await Review.aggregate([
            { $match: { provider_id: provider.id } },
            {
                $group: {
                    _id: '$rating',
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingAgg.forEach(r => { counts[r._id] = r.count; });
        const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);
        const avg = totalCount === 0
            ? 0
            : (
                (1 * counts[1] + 2 * counts[2] + 3 * counts[3] + 4 * counts[4] + 5 * counts[5]) / totalCount
            );

        res.json({
            success: true,
            data: {
                summary: {
                    average: Number(avg.toFixed(2)),
                    count: totalCount,
                    breakdown: counts
                },
                reviews: formattedReviews
            },
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Get provider reviews error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update provider banner image
// @route   PUT /api/v1/providers/me/banner-image
// @access  Private
const updateProviderBannerImage = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No banner image file provided' });
        }

        provider.banner_image_url = req.file.path;
        await provider.save();

        res.json({
            success: true,
            message: 'Banner image updated successfully',
            data: { banner_image_url: provider.banner_image_url }
        });
    } catch (error) {
        console.error('Update banner image error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update provider logo image
// @route   PUT /api/v1/providers/me/logo
// @access  Private
const updateProviderLogoImage = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No logo image file provided' });
        }

        // Keep logo and user profile picture the same
        provider.logo_image_url = req.file.path;
        await provider.save();

        try {
            const user = await User.findOne({ id: req.user.id });
            if (user) {
                user.profile_picture = { url: req.file.path };
                await user.save();
            }
        } catch (_) {
            // non-critical
        }

        res.json({
            success: true,
            message: 'Logo updated successfully',
            data: { logo_image_url: provider.logo_image_url }
        });
    } catch (error) {
        console.error('Update logo error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add gallery images (multiple)
// @route   POST /api/v1/providers/me/gallery
// @access  Private
const addProviderGalleryImages = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const files = req.files || [];
        if (!Array.isArray(files) || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No gallery image files provided' });
        }

        // Multer memoryStorage gives us buffers; upload each to Cloudinary
        const uploadOne = async (file) => {
            // If another middleware already uploaded it and set path, use it
            if (file?.path) return file.path;
            if (!file?.buffer) return null;

            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'provider_gallery',
                        resource_type: 'image'
                    },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                uploadStream.end(file.buffer);
            });
            return uploadResult.secure_url;
        };

        const urls = (await Promise.all(files.map(uploadOne))).filter(Boolean);
        provider.gallery_image_urls = Array.from(new Set([...(provider.gallery_image_urls || []), ...urls]));
        await provider.save();

        res.status(201).json({
            success: true,
            message: 'Gallery images added successfully',
            data: { gallery_image_urls: provider.gallery_image_urls }
        });
    } catch (error) {
        console.error('Add gallery images error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    List gallery images
// @route   GET /api/v1/providers/me/gallery
// @access  Private
const getMyGallery = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id }).select('gallery_image_urls');
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        res.json({
            success: true,
            data: { gallery_image_urls: provider.gallery_image_urls || [] }
        });
    } catch (error) {
        console.error('Get gallery error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Remove a gallery image by url
// @route   DELETE /api/v1/providers/me/gallery
// @access  Private
const removeProviderGalleryImage = async (req, res) => {
    try {
        const { url } = req.body;
        if (!url) return res.status(400).json({ success: false, message: 'url is required' });

        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        provider.gallery_image_urls = (provider.gallery_image_urls || []).filter(u => u !== url);
        await provider.save();

        res.json({
            success: true,
            message: 'Gallery image removed successfully',
            data: { gallery_image_urls: provider.gallery_image_urls || [] }
        });
    } catch (error) {
        console.error('Remove gallery image error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update social media links (website, instagram, facebook)
// @route   PUT /api/v1/providers/me/social-links
// @access  Private
const updateProviderSocialLinks = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { website, instagram, facebook } = req.body;

        provider.social_links = {
            ...(provider.social_links || {}),
            ...(website !== undefined ? { website } : {}),
            ...(instagram !== undefined ? { instagram } : {}),
            ...(facebook !== undefined ? { facebook } : {})
        };

        provider.markModified('social_links');
        await provider.save();

        res.json({
            success: true,
            message: 'Social links updated successfully',
            data: { social_links: provider.social_links }
        });
    } catch (error) {
        console.error('Update social links error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update provider address/location (street, city, state, country, postal_code)
// @route   PUT /api/v1/providers/me/address
// @access  Private (Provider)
const updateProviderAddress = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { street, city, state, country, postal_code } = req.body;

        provider.address = {
            ...(provider.address || {}),
            ...(street !== undefined ? { street } : {}),
            ...(city !== undefined ? { city } : {}),
            ...(state !== undefined ? { state } : {}),
            ...(country !== undefined ? { country } : {}),
            ...(postal_code !== undefined ? { postal_code } : {})
        };

        provider.markModified('address');
        await provider.save();

        res.json({
            success: true,
            message: 'Address updated successfully',
            data: { address: provider.address }
        });
    } catch (error) {
        console.error('Update provider address error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update provider description/about
// @route   PUT /api/v1/providers/me/about
// @access  Private (Provider)
const updateProviderAbout = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { about } = req.body;
        if (about === undefined) {
            return res.status(400).json({ success: false, message: 'about is required' });
        }

        const aboutStr = String(about).trim();
        if (aboutStr.length < 10) {
            return res.status(400).json({ success: false, message: 'Description must be at least 10 characters.' });
        }
        if (aboutStr.length > 2000) {
            return res.status(400).json({ success: false, message: 'Description must be 2000 characters or less.' });
        }

        provider.about = aboutStr;
        await provider.save();

        res.json({
            success: true,
            message: 'Description updated successfully',
            data: { about: provider.about }
        });
    } catch (error) {
        console.error('Update provider about error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// Support attachments upload helper
const uploadSupportAttachment = async (file) => {
    if (!file?.buffer) return null;
    const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: 'support_attachments',
                resource_type: 'auto'
            },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        uploadStream.end(file.buffer);
    });
    return uploadResult.secure_url;
};

// @desc    Create support ticket
// @route   POST /api/v1/providers/me/support/tickets
// @access  Private (Provider)
const createSupportTicket = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { category, subject, message, attachments } = req.body;

        if (!subject || String(subject).trim().length < 3) {
            return res.status(400).json({ success: false, message: 'subject is required (min 3 characters)' });
        }
        if (!message || String(message).trim().length < 10) {
            return res.status(400).json({ success: false, message: 'message is required (min 10 characters)' });
        }

        // Accept attachments via JSON array OR multipart upload
        let attachmentUrls = [];
        if (Array.isArray(attachments)) {
            attachmentUrls = attachments.filter(Boolean).map(String);
        } else if (typeof attachments === 'string') {
            // allow attachments to be sent as JSON string in form-data
            try {
                const parsed = JSON.parse(attachments);
                if (Array.isArray(parsed)) attachmentUrls = parsed.filter(Boolean).map(String);
            } catch (_) {
                // ignore
            }
        }

        const files = req.files || [];
        if (Array.isArray(files) && files.length > 0) {
            const uploaded = (await Promise.all(files.map(uploadSupportAttachment))).filter(Boolean);
            attachmentUrls = Array.from(new Set([...attachmentUrls, ...uploaded]));
        }

        const ticket = await SupportTicket.create({
            provider_id: provider.id,
            provider_user_id: req.user.id,
            category: category || 'Other',
            subject: String(subject).trim(),
            status: 'open',
            messages: [
                {
                    sender_role: 'provider',
                    sender_id: req.user.id,
                    message: String(message).trim(),
                    attachments: attachmentUrls
                }
            ]
        });

        return res.status(201).json({
            success: true,
            message: 'Support ticket created successfully',
            data: {
                ticket_id: ticket.id,
                status: ticket.status,
                created_at: ticket.created_at
            }
        });
    } catch (error) {
        console.error('Create support ticket error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    List provider support tickets
// @route   GET /api/v1/providers/me/support/tickets?page=&limit=&status=
// @access  Private (Provider)
const listMySupportTickets = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { page = 1, limit = 10, status } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const query = { provider_id: provider.id };
        if (status) query.status = status;

        const [tickets, total] = await Promise.all([
            SupportTicket.find(query)
                .sort({ updated_at: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            SupportTicket.countDocuments(query)
        ]);

        const mapped = tickets.map(t => {
            const lastMsg = (t.messages && t.messages.length > 0) ? t.messages[t.messages.length - 1] : null;
            return {
                ticket_id: t.id,
                category: t.category,
                subject: t.subject,
                status: t.status,
                created_at: t.created_at,
                updated_at: t.updated_at,
                messages_count: t.messages ? t.messages.length : 0,
                last_message: lastMsg ? lastMsg.message : '',
                last_message_at: lastMsg ? lastMsg.created_at : null
            };
        });

        return res.json({
            success: true,
            data: {
                tickets: mapped,
                pagination: {
                    total,
                    page: pageNum,
                    limit: limitNum,
                    pages: Math.ceil(total / limitNum)
                }
            }
        });
    } catch (error) {
        console.error('List support tickets error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    View a support ticket
// @route   GET /api/v1/providers/me/support/tickets/:ticketId
// @access  Private (Provider)
const getMySupportTicket = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { ticketId } = req.params;
        const ticket = await SupportTicket.findOne({ id: ticketId, provider_id: provider.id }).lean();
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        return res.json({
            success: true,
            data: {
                ticket_id: ticket.id,
                provider_id: ticket.provider_id,
                category: ticket.category,
                subject: ticket.subject,
                status: ticket.status,
                created_at: ticket.created_at,
                updated_at: ticket.updated_at,
                messages: (ticket.messages || []).map(m => ({
                    id: m.id,
                    sender_role: m.sender_role,
                    sender_id: m.sender_id,
                    message: m.message,
                    attachments: m.attachments || [],
                    created_at: m.created_at
                }))
            }
        });
    } catch (error) {
        console.error('Get support ticket error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add message / reply to a ticket
// @route   POST /api/v1/providers/me/support/tickets/:ticketId/messages
// @access  Private (Provider)
const addSupportTicketMessage = async (req, res) => {
    try {
        const provider = await Provider.findOne({ user_id: req.user.id });
        if (!provider) return res.status(404).json({ success: false, message: 'Provider not found' });

        const { ticketId } = req.params;
        const { message, attachments } = req.body;

        if (!message || String(message).trim().length < 2) {
            return res.status(400).json({ success: false, message: 'message is required' });
        }

        let attachmentUrls = [];
        if (Array.isArray(attachments)) {
            attachmentUrls = attachments.filter(Boolean).map(String);
        } else if (typeof attachments === 'string') {
            try {
                const parsed = JSON.parse(attachments);
                if (Array.isArray(parsed)) attachmentUrls = parsed.filter(Boolean).map(String);
            } catch (_) {
                // ignore
            }
        }

        const files = req.files || [];
        if (Array.isArray(files) && files.length > 0) {
            const uploaded = (await Promise.all(files.map(uploadSupportAttachment))).filter(Boolean);
            attachmentUrls = Array.from(new Set([...attachmentUrls, ...uploaded]));
        }

        const ticket = await SupportTicket.findOne({ id: ticketId, provider_id: provider.id });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found' });

        if (ticket.status === 'closed') {
            return res.status(400).json({ success: false, message: 'This ticket is closed' });
        }

        ticket.messages.push({
            sender_role: 'provider',
            sender_id: req.user.id,
            message: String(message).trim(),
            attachments: attachmentUrls
        });

        // If resolved/closed, keep as-is; otherwise mark as open to indicate provider replied
        if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
            ticket.status = 'open';
        }

        await ticket.save();

        return res.json({
            success: true,
            message: 'Message sent successfully',
            data: {
                ticket_id: ticket.id,
                status: ticket.status,
                updated_at: ticket.updated_at
            }
        });
    } catch (error) {
        console.error('Add support ticket message error:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get all pending appointments for the provider
// @route   GET /api/v1/providers/appointments/pending
// @access  Private (Provider)
const getPendingAppointments = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const provider = await Provider.findOne({ user_id: userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found'
            });
        }

        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const startIndex = (page - 1) * limit;

        const total = await Appointment.countDocuments({
            provider_id: provider.id,
            status: 'pending'
        });
        const appointments = await Appointment.find({
            provider_id: provider.id,
            status: 'pending'
        })
            .populate('patient', 'full_name email phone_number profile_picture personal_details location_details')
            .populate('service', 'name category duration price')
            .sort({ created_at: -1 })
            .skip(startIndex)
            .limit(limit);

        // Transform appointments to include populated details in patient_id/service_id for frontend compatibility
        // And ensure formData is populated with patient details
        const formattedAppointments = appointments.map(appt => {
            const apptObj = appt.toObject ? appt.toObject() : appt;

            // Logic to determine patient name - prioritize formData, fallback to patient record
            let patientName = apptObj.formData?.patientName;
            if (!patientName && apptObj.patient) {
                patientName = apptObj.patient.full_name;
            }

            // Also ensure other formData fields are populated for the frontend if needed
            // But primarily we want to return a simplified structure

            return {
                id: apptObj.id,
                _id: apptObj._id,
                patient_name: patientName || 'Unknown Patient',
                service_name: apptObj.service?.name || 'Unknown Service',
                appointment_date: apptObj.appointment_date,
                start_time: apptObj.start_time,
                end_time: apptObj.end_time,
                duration: apptObj.service?.duration,
                payment: apptObj.payment,
                status: apptObj.status,
                // Keep the original IDs just in case frontend needs them for linking
                patient_id: apptObj.patient?.id || apptObj.patient_id,
                service_id: apptObj.service?.id || apptObj.service_id,
                // Keep formData as user asked for it "i should be getting the data also inthe formdata"
                formData: {
                    ...apptObj.formData,
                    patientName: patientName,
                    patientEmail: apptObj.formData?.patientEmail || apptObj.patient?.email || '',
                    patientPhone: apptObj.formData?.patientPhone || apptObj.patient?.phone_number || '',
                    patientGender: apptObj.formData?.patientGender || apptObj.patient?.personal_details?.gender || '',
                    patientDOB: apptObj.formData?.patientDOB || apptObj.patient?.personal_details?.date_of_birth || '',
                    patientAddress: apptObj.formData?.patientAddress ||
                        (apptObj.patient?.location_details ?
                            [apptObj.patient.location_details.address, apptObj.patient.location_details.city, apptObj.patient.location_details.state].filter(Boolean).join(', ') : '')
                }
            };
        });

        res.json({
            success: true,
            count: formattedAppointments.length,
            total,
            pagination: {
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            data: formattedAppointments
        });
    } catch (error) {
        console.error('Get pending appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Accept all pending appointments
// @route   POST /api/v1/providers/appointments/pending/accept-all
// @access  Private (Provider)
const acceptAllPendingAppointments = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const provider = await Provider.findOne({ user_id: userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found'
            });
        }

        // Update all pending appointments to confirmed
        const result = await Appointment.updateMany(
            { provider_id: provider.id, status: 'pending' },
            { $set: { status: 'confirmed', updated_at: Date.now() } }
        );

        // TODO: In a real production system, we should trigger notifications for each confirmed appointment.
        // For bulk operations, this might need a background job or a batch email service.
        // For now, we just update the status.

        res.json({
            success: true,
            message: `Successfully accepted ${result.modifiedCount} pending appointments`,
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Accept all pending appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Reject all pending appointments
// @route   POST /api/v1/providers/appointments/pending/reject-all
// @access  Private (Provider)
const rejectAllPendingAppointments = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const provider = await Provider.findOne({ user_id: userId });

        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found'
            });
        }

        // Update all pending appointments to cancelled
        const result = await Appointment.updateMany(
            { provider_id: provider.id, status: 'pending' },
            { $set: { status: 'cancelled', updated_at: Date.now() } }
        );

        // TODO: Similarly, trigger cancellation notifications here.

        res.json({
            success: true,
            message: `Successfully rejected ${result.modifiedCount} pending appointments`,
            data: {
                modifiedCount: result.modifiedCount
            }
        });
    } catch (error) {
        console.error('Reject all pending appointments error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    registerProvider,
    getProviderProfile,
    getFullProviderProfile,
    onboardProviderProfile,
    updateWorkingHours,
    generateTimeSlots,
    completeOnboarding,
    getProviderTimeSlots,
    getAllProviders,
    getProviderCalendar,
    addProviderProfile,
    updateProviderProfile,
    updateProviderProfilePicture,
    addAdministrativeDetails,
    updateAdministrativeDetails,
    getNotificationSettings,
    updateNotificationSettings,
    getAutoConfirmSetting,
    updateAutoConfirmSetting,
    getRequestToBookSetting,
    updateRequestToBookSetting,
    getProviderWorkingHours,
    getMyWorkingHours,
    sanitizeProviderServices,
    getProviderDashboardStats,
    getProviderAppointments,
    getProviderPatients,
    addPatientManually,
    createService,
    getProviderServices,
    updateService,
    getBanks,
    verifyBankAccount,
    updateBankAccount,
    getProviderTransactions,
    reportProvider,
    getMyProviderReports,
    getMyProviderReviews,
    updateFullProviderProfile,
    updateProviderBannerImage,
    updateProviderLogoImage,
    addProviderGalleryImages,
    getMyGallery,
    removeProviderGalleryImage,
    updateProviderSocialLinks,
    updateProviderAddress,
    updateProviderAbout,
    createSupportTicket,
    listMySupportTickets,
    getMySupportTicket,
    addSupportTicketMessage,
    getPendingAppointments,
    acceptAllPendingAppointments,
    rejectAllPendingAppointments
};
