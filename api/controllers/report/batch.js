const { selectCountReservation, selectForecastData, selectAccountingData } = require('../../models/report');
const logger = require('../../config/logger');
const { validateNumericParam } = require('../../utils/validationUtils');
const { getPool } = require('../../config/database');

/**
 * Helper function to process batch requests for multiple hotels.
 * Handles validation, DB connection, loop, and error handling.
 * 
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} dataFetcher - Model function to fetch data (e.g., selectCountReservation)
 * @param {String} operationName - Name of the operation for logging
 */
const processBatchRequest = async (req, res, dataFetcher, operationName) => {
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
            validateNumericParam(hotelId, 'hotelId');
        }

        const pool = getPool(req.requestId);
        const client = await pool.connect();

        try {
            const results = {};
            const errors = {};

            // Use single client for all queries sequentially
            for (const hotelId of hotelIds) {
                try {
                    const data = await dataFetcher(req.requestId, hotelId, startDate, endDate, client);
                    results[hotelId] = data || [];
                } catch (err) {
                    logger.error(`[${operationName}] Failed for hotel ${hotelId}, Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
                    errors[hotelId] = err.message;
                    results[hotelId] = [];
                }
            }

            res.json({ results, errors: Object.keys(errors).length > 0 ? errors : undefined });
        } finally {
            client.release();
        }
    } catch (err) {
        logger.error(`[${operationName}] Failed for Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
        const statusCode = err.statusCode || 500;
        const errorMessage = statusCode === 500 ? 'Internal server error' : err.message;
        res.status(statusCode).json({ error: errorMessage });
    }
};

/**
 * Batch endpoint to fetch reservation count data for multiple hotels
 * POST /report/batch/count
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchCountReservation = async (req, res) => {
    return processBatchRequest(req, res, selectCountReservation, 'getBatchCountReservation');
};

/**
 * Batch endpoint to fetch forecast data for multiple hotels
 * POST /report/batch/forecast
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchForecastData = async (req, res) => {
    return processBatchRequest(req, res, selectForecastData, 'getBatchForecastData');
};

/**
 * Batch endpoint to fetch accounting data for multiple hotels
 * POST /report/batch/accounting
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchAccountingData = async (req, res) => {
    return processBatchRequest(req, res, selectAccountingData, 'getBatchAccountingData');
};

module.exports = {
    getBatchCountReservation,
    getBatchForecastData,
    getBatchAccountingData
};