// api/controllers/loyaltyTierController.js
const db = require('../config/database'); // Assuming db is configured and exported from here
const pgFormat = require('pg-format'); // For dynamic SQL queries

// GET all loyalty tier settings
exports.getAllLoyaltyTierSettings = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM loyalty_tier_settings ORDER BY tier_name, hotel_id');
        res.status(200).json(rows);
    } catch (error) {
        console.error('Error fetching loyalty tier settings:', error);
        res.status(500).json({ message: 'Error fetching loyalty tier settings', error: error.message });
    }
};

// GET settings for a specific tier_name (and optionally hotel_id)
exports.getLoyaltyTierSettingsByTierName = async (req, res) => {
    const { tier_name } = req.params;
    const { hotel_id } = req.query;

    try {
        let query = 'SELECT * FROM loyalty_tier_settings WHERE tier_name = $1';
        const params = [tier_name];

        if (tier_name.toUpperCase() === 'HOTEL_LOYAL' && hotel_id) {
            query += ' AND hotel_id = $2';
            params.push(hotel_id);
        } else if (tier_name.toUpperCase() === 'HOTEL_LOYAL' && !hotel_id) {
             // If HOTEL_LOYAL is requested without hotel_id, we might return all hotel-specific rules for that tier
             // Or, require hotel_id. For now, let's return all for the tier.
        }


        query += ' ORDER BY hotel_id';

        const { rows } = await db.query(query, params);
        if (rows.length === 0) {
            return res.status(404).json({ message: `No settings found for tier: ${tier_name}` + (hotel_id ? ` and hotel ID: ${hotel_id}` : '') });
        }
        res.status(200).json(rows);
    } catch (error) {
        console.error(`Error fetching loyalty tier settings for ${tier_name}:`, error);
        res.status(500).json({ message: `Error fetching settings for tier ${tier_name}`, error: error.message });
    }
};

// POST to create or update loyalty tier settings
exports.createOrUpdateLoyaltyTierSettings = async (req, res) => {
    const {
        tier_name, // 'REPEATER', 'HOTEL_LOYAL', 'BRAND_LOYAL'
        hotel_id,  // Required for HOTEL_LOYAL, null otherwise
        min_bookings,
        min_spending,
        time_period_value,
        time_period_unit, // 'MONTHS', 'YEARS'
        logic_operator    // 'AND', 'OR', nullable
    } = req.body;

    // Basic Validation
    if (!tier_name || !time_period_value || !time_period_unit) {
        return res.status(400).json({ message: 'tier_name, time_period_value, and time_period_unit are required.' });
    }
    if (tier_name.toUpperCase() === 'HOTEL_LOYAL' && !hotel_id) {
        return res.status(400).json({ message: 'hotel_id is required for HOTEL_LOYAL tier.' });
    }
    if (['REPEATER', 'BRAND_LOYAL'].includes(tier_name.toUpperCase()) && hotel_id) {
        return res.status(400).json({ message: `hotel_id should be null for ${tier_name} tier.` });
    }
    if (!['MONTHS', 'YEARS'].includes(time_period_unit.toUpperCase())) {
        return res.status(400).json({ message: "time_period_unit must be 'MONTHS' or 'YEARS'." });
    }
    if (logic_operator && !['AND', 'OR'].includes(logic_operator.toUpperCase())) {
        return res.status(400).json({ message: "logic_operator must be 'AND' or 'OR'." });
    }
     if ((tier_name.toUpperCase() === 'HOTEL_LOYAL' || tier_name.toUpperCase() === 'BRAND_LOYAL') && (!min_bookings && !min_spending) ) {
        return res.status(400).json({ message: 'Either min_bookings or min_spending must be provided for HOTEL_LOYAL or BRAND_LOYAL tiers.' });
    }
    if (tier_name.toUpperCase() === 'REPEATER' && !min_bookings) {
        return res.status(400).json({ message: 'min_bookings must be provided for REPEATER tier.' });
    }


    const actualHotelId = ['REPEATER', 'BRAND_LOYAL'].includes(tier_name.toUpperCase()) ? null : hotel_id;

    const query = pgFormat(`
        INSERT INTO loyalty_tier_settings (
            tier_name, hotel_id, min_bookings, min_spending,
            time_period_value, time_period_unit, logic_operator, updated_at
        )
        VALUES (%L, %L, %L, %L, %L, %L, %L, CURRENT_TIMESTAMP)
        ON CONFLICT (tier_name, hotel_id) DO UPDATE SET
            min_bookings = EXCLUDED.min_bookings,
            min_spending = EXCLUDED.min_spending,
            time_period_value = EXCLUDED.time_period_value,
            time_period_unit = EXCLUDED.time_period_unit,
            logic_operator = EXCLUDED.logic_operator,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `, tier_name, actualHotelId, min_bookings, min_spending, time_period_value, time_period_unit, logic_operator);

    try {
        const { rows } = await db.query(query);
        res.status(201).json(rows[0]);
    } catch (error) {
        console.error('Error creating/updating loyalty tier settings:', error);
        // Consider more specific error messages based on error codes (e.g., foreign key violation for hotel_id)
        res.status(500).json({ message: 'Error creating/updating loyalty tier settings', error: error.message });
    }
};
