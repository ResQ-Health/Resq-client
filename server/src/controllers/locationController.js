const nigeriaStates = require('../data/nigeriaStates');

// @desc    List supported countries
// @route   GET /api/v1/locations/countries
// @access  Public
const getCountries = async (req, res) => {
    // Keep this simple and explicit for now
    return res.json({
        success: true,
        data: [
            { name: 'Nigeria', code: 'NG' }
        ]
    });
};

// @desc    List states for a country
// @route   GET /api/v1/locations/states?country=Nigeria
// @access  Public
const getStates = async (req, res) => {
    const country = (req.query.country || '').toString().trim().toLowerCase();
    const countryCode = (req.query.country_code || '').toString().trim().toUpperCase();

    const isNigeria = country === 'nigeria' || countryCode === 'NG';
    if (!isNigeria) {
        return res.status(400).json({
            success: false,
            message: 'Unsupported country. Supported: Nigeria (NG)'
        });
    }

    return res.json({
        success: true,
        data: nigeriaStates
    });
};

module.exports = { getCountries, getStates };


