const { utilityDetails } = require('../../models/accounting');
const logger = require('../../config/logger');

/**
 * Get utility details
 */
exports.getUtilityDetails = async (req, res) => {
    const { hotelId, startMonth, endMonth, filterBy } = req.query;
    const requestId = req.requestId;

    if (!hotelId || !startMonth || !endMonth) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const details = await utilityDetails.getUtilityDetails(requestId, hotelId, startMonth, endMonth, filterBy);
        res.json(details);
    } catch (err) {
        logger.error('Controller error in getUtilityDetails:', err);
        res.status(500).json({ error: 'Failed to fetch utility details' });
    }
};

/**
 * Upsert utility detail
 */
exports.upsertUtilityDetail = async (req, res) => {
    const data = req.body;
    const requestId = req.requestId;
    const userId = req.user?.id || 1; // Fallback for dev

    if (!data.hotel_id || !data.month || !data.transaction_date || !data.account_name) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const detail = await utilityDetails.upsertUtilityDetail(requestId, data, userId);
        res.json(detail);
    } catch (err) {
        logger.error('Controller error in upsertUtilityDetail:', err);
        res.status(500).json({ error: 'Failed to save utility detail' });
    }
};

/**
 * Delete utility detail
 */
exports.deleteUtilityDetail = async (req, res) => {
    const { id } = req.params;
    const requestId = req.requestId;

    if (!id) {
        return res.status(400).json({ error: 'Missing ID' });
    }

    try {
        await utilityDetails.deleteUtilityDetail(requestId, id);
        res.json({ success: true });
    } catch (err) {
        logger.error('Controller error in deleteUtilityDetail:', err);
        res.status(500).json({ error: 'Failed to delete utility detail' });
    }
};

/**
 * Get utility suggestions
 */
exports.getUtilitySuggestions = async (req, res) => {
    const { hotelId, month } = req.query;
    const requestId = req.requestId;

    if (!hotelId || !month) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        const suggestions = await utilityDetails.getUtilitySuggestions(requestId, hotelId, month);
        res.json(suggestions);
    } catch (err) {
        logger.error('Controller error in getUtilitySuggestions:', err);
        res.status(500).json({ error: 'Failed to fetch utility suggestions' });
    }
};
