const { selectCountReservation, selectForecastData, selectAccountingData } = require('../../models/report');
const logger = require('../../config/logger');
const { validateNumericParam } = require('../../utils/validationUtils');
const { getPool } = require('../../config/database');

/**
 * Batch endpoint to fetch reservation count data for multiple hotels
 * POST /report/batch/count
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchCountReservation = async (req, res) => {
    const { hotelIds, startDate, endDate } = req.body;

    try {
        // Validate input
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            return res.status(400).json({ error: 'hotelIds must be a non-empty array' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        // Validate each hotel ID
        for (const hotelId of hotelIds) {
            const validationError = validateNumericParam(hotelId, 'hotelId');
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        const pool = getPool(req.requestId);
        const client = await pool.connect();

        try {
            const results = {};
            const errors = {};

            // Use single client for all queries sequentially
            for (const hotelId of hotelIds) {
                try {
                    const data = await selectCountReservation(req.requestId, hotelId, startDate, endDate, client);
                    results[hotelId] = data || [];
                } catch (err) {
                    logger.error(`[getBatchCountReservation] Failed for hotel ${hotelId}, Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
                    errors[hotelId] = err.message;
                    results[hotelId] = [];
                }
            }

            res.json({ results, errors: Object.keys(errors).length > 0 ? errors : undefined });
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`[getBatchCountReservation] Failed for Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Batch endpoint to fetch forecast data for multiple hotels
 * POST /report/batch/forecast
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchForecastData = async (req, res) => {
    const { hotelIds, startDate, endDate } = req.body;

    try {
        // Validate input
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            return res.status(400).json({ error: 'hotelIds must be a non-empty array' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        // Validate each hotel ID
        for (const hotelId of hotelIds) {
            const validationError = validateNumericParam(hotelId, 'hotelId');
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        const pool = getPool(req.requestId);
        const client = await pool.connect();

        try {
            const results = {};
            const errors = {};

            // Use single client for all queries sequentially
            for (const hotelId of hotelIds) {
                try {
                    const data = await selectForecastData(req.requestId, hotelId, startDate, endDate, client);
                    results[hotelId] = data || [];
                } catch (err) {
                    logger.error(`[getBatchForecastData] Failed for hotel ${hotelId}, Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
                    errors[hotelId] = err.message;
                    results[hotelId] = [];
                }
            }

            res.json({ results, errors: Object.keys(errors).length > 0 ? errors : undefined });
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`[getBatchForecastData] Failed for Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Batch endpoint to fetch accounting data for multiple hotels
 * POST /report/batch/accounting
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchAccountingData = async (req, res) => {
    const { hotelIds, startDate, endDate } = req.body;

    try {
        // Validate input
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            return res.status(400).json({ error: 'hotelIds must be a non-empty array' });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        // Validate each hotel ID
        for (const hotelId of hotelIds) {
            const validationError = validateNumericParam(hotelId, 'hotelId');
            if (validationError) {
                return res.status(400).json({ error: validationError });
            }
        }

        const pool = getPool(req.requestId);
        const client = await pool.connect();

        try {
            const results = {};
            const errors = {};

            // Use single client for all queries sequentially
            for (const hotelId of hotelIds) {
                try {
                    const data = await selectAccountingData(req.requestId, hotelId, startDate, endDate, client);
                    results[hotelId] = data || [];
                } catch (err) {
                    logger.error(`[getBatchAccountingData] Failed for hotel ${hotelId}, Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
                    errors[hotelId] = err.message;
                    results[hotelId] = [];
                }
            }

            res.json({ results, errors: Object.keys(errors).length > 0 ? errors : undefined });
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`[getBatchAccountingData] Failed for Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    getBatchCountReservation,
    getBatchForecastData,
    getBatchAccountingData
};
