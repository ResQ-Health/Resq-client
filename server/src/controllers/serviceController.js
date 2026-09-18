// Service controller
const Service = require('../models/Service');
const Provider = require('../models/Provider');
const { nanoid } = require('nanoid');

// @desc    Get all services
// @route   GET /api/services
// @access  Public
const getAllServices = async (req, res) => {
    try {
        const services = await Service.find().sort({ category: 1, name: 1 });

        res.json({
            success: true,
            count: services.length,
            data: services
        });
    } catch (error) {
        console.error('Get all services error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get services by category
// @route   GET /api/services/category/:category
// @access  Public
const getServicesByCategory = async (req, res) => {
    try {
        const { category } = req.params;

        // Validate category
        if (!['scans', 'tests', 'consultation'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be one of: scans, tests, consultation'
            });
        }

        const services = await Service.find({ category }).sort({ name: 1 });

        res.json({
            success: true,
            category,
            count: services.length,
            data: services
        });
    } catch (error) {
        console.error('Get services by category error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get service by ID
// @route   GET /api/services/:serviceId
// @access  Public
const getServiceById = async (req, res) => {
    try {
        const { serviceId } = req.params;

        const service = await Service.findOne({ id: serviceId });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            data: service
        });
    } catch (error) {
        console.error('Get service by ID error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Get all services by a provider
// @route   GET /api/services/provider/:providerId
// @access  Public
const getServicesByProvider = async (req, res) => {
    try {
        const { providerId } = req.params;

        // Check if provider exists
        const provider = await Provider.findOne({ id: providerId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider not found'
            });
        }

        const services = await Service.find({ provider_id: providerId }).sort({ name: 1 });

        res.json({
            success: true,
            provider: {
                id: provider.id,
                name: provider.provider_name
            },
            count: services.length,
            data: services
        });
    } catch (error) {
        console.error('Get services by provider error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


// @desc    Create a new service
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res) => {
    try {
        const { category, name, description, uses, price } = req.body;
        const userId = req.user.id;

        // Find the provider associated with the logged-in user
        const provider = await Provider.findOne({ user_id: userId });
        if (!provider) {
            return res.status(404).json({
                success: false,
                message: 'Provider profile not found for the logged-in user.'
            });
        }

        // Validate required fields
        if (!category || !name || !description || !price) {
            return res.status(400).json({
                success: false,
                message: 'Category, name, description, and price are required'
            });
        }

        // Validate category
        if (!['scans', 'tests', 'consultation'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be one of: scans, tests, consultation'
            });
        }

        // Check if service with same name already exists for this provider
        const existingService = await Service.findOne({ name, provider_id: provider.id });
        if (existingService) {
            return res.status(400).json({
                success: false,
                message: 'You already have a service with this name.'
            });
        }

        // Create new service
        const service = await Service.create({
            id: nanoid(10),
            provider_id: provider.id, // Link service to provider
            category,
            name,
            description,
            uses: uses || '',
            price,
            duration: req.body.duration ? Number(req.body.duration) : 0,
            metadata: req.body.metadata || {}
        });

        // Add service to provider's list of services
        provider.services.push(service._id);
        await provider.save();

        res.status(201).json({
            success: true,
            message: 'Service created and assigned to your profile successfully',
            data: service
        });
    } catch (error) {
        console.error('Create service error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Update a service
// @route   PUT /api/services/:serviceId
// @access  Private/Admin
const updateService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { category, name, description, uses, price } = req.body;

        // Find service
        const service = await Service.findOne({ id: serviceId });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        // Validate category if provided
        if (category && !['scans', 'tests', 'consultation'].includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category. Must be one of: scans, tests, consultation'
            });
        }

        // Check if name is already taken by another service
        if (name && name !== service.name) {
            const existingService = await Service.findOne({ name });
            if (existingService) {
                return res.status(400).json({
                    success: false,
                    message: 'Service with this name already exists'
                });
            }
        }

        // Update service
        if (category) service.category = category;
        if (name) service.name = name;
        if (description) service.description = description;
        if (uses !== undefined) service.uses = uses;
        if (price !== undefined) service.price = price;
        if (req.body.duration !== undefined) service.duration = Number(req.body.duration);
        if (req.body.metadata !== undefined) service.metadata = req.body.metadata;

        await service.save();

        res.json({
            success: true,
            message: 'Service updated successfully',
            data: service
        });
    } catch (error) {
        console.error('Update service error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// @desc    Delete a service
// @route   DELETE /api/services/:serviceId
// @access  Private/Admin
const deleteService = async (req, res) => {
    try {
        const { serviceId } = req.params;

        // Find and delete service
        const service = await Service.findOneAndDelete({ id: serviceId });

        if (!service) {
            return res.status(404).json({
                success: false,
                message: 'Service not found'
            });
        }

        res.json({
            success: true,
            message: 'Service deleted successfully',
            data: {}
        });
    } catch (error) {
        console.error('Delete service error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

module.exports = {
    getAllServices,
    getServicesByCategory,
    getServiceById,
    getServicesByProvider,
    createService,
    updateService,
    deleteService
}; 