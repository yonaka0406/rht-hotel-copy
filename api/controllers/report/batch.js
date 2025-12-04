const { selectCountReservation, selectForecastData, selectAccountingData, fetchOccupationBreakdown } = require('../../models/report');
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
    logger.debug(`[${operationName}] Received batch request. Request ID: ${req.requestId}, Hotels: ${hotelIds}, Dates: ${startDate} to ${endDate}`);

    try {
        // Validate input
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            logger.debug(`[${operationName}] Validation error: 'hotelIds' must be a non-empty array. Request ID: ${req.requestId}`);
            return res.status(400).json({ error: 'hotelIds must be a non-empty array' });
        }

        if (!startDate || !endDate) {
            logger.debug(`[${operationName}] Validation error: 'startDate' and 'endDate' are required. Request ID: ${req.requestId}`);
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        // Validate each hotel ID
        for (const hotelId of hotelIds) {
            validateNumericParam(hotelId, 'hotelId');
        }

        const pool = getPool(req.requestId);
        const client = await pool.connect();
        logger.debug(`[${operationName}] Database client connected. Request ID: ${req.requestId}`);

        try {
            const results = {};
            const errors = {};

            // Use single client for all queries sequentially
            for (const hotelId of hotelIds) {
                logger.debug(`[${operationName}] Fetching data for hotel ${hotelId}. Request ID: ${req.requestId}`);
                try {
                    const data = await dataFetcher(req.requestId, hotelId, startDate, endDate, client);
                    results[hotelId] = data || [];
                    logger.debug(`[${operationName}] Successfully fetched data for hotel ${hotelId}. Request ID: ${req.requestId}`);
                } catch (err) {
                    logger.error(`[${operationName}] Failed for hotel ${hotelId}, Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
                    errors[hotelId] = err.message;
                    results[hotelId] = [];
                }
            }

            res.json({ results, errors: Object.keys(errors).length > 0 ? errors : undefined });
        } finally {
            client.release();
            logger.debug(`[${operationName}] Database client released. Request ID: ${req.requestId}`);
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

/**
 * Batch endpoint to fetch occupation breakdown data for multiple hotels
 * POST /report/batch/occupation-breakdown
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchOccupationBreakdown = async (req, res) => {
    return processBatchRequest(req, res, fetchOccupationBreakdown, 'getBatchOccupationBreakdown');
};

module.exports = {
    getBatchCountReservation,
    getBatchForecastData,
    getBatchAccountingData,
    getBatchOccupationBreakdown
};