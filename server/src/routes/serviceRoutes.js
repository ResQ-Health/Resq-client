// Service routes
const express = require('express');
const router = express.Router();

// Import controllers
const serviceController = require('../controllers/serviceController');
const { protect, adminOnly, providerOnly } = require('../middleware/auth');

// Get all services
router.get('/', serviceController.getAllServices);

// Get services by category
router.get('/category/:category', serviceController.getServicesByCategory);

// Get service by ID
router.get('/:serviceId', serviceController.getServiceById);

// Get all services by a provider
router.get('/provider/:providerId', serviceController.getServicesByProvider);

// Admin routes
// Create a new service
router.post('/', protect, providerOnly, serviceController.createService);

// Update a service
router.put('/:serviceId', protect, adminOnly, serviceController.updateService);

// Delete a service
router.delete('/:serviceId', protect, adminOnly, serviceController.deleteService);

module.exports = router; 