const { selectCountReservation, selectForecastData, selectAccountingData, selectOccupationBreakdownByMonth, selectBatchReservationListView } = require('../../models/report');
const { getBookerTypeBreakdown } = require('../../models/metrics');
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

            // Debug logging: Show sample data from the batch
            const allRows = [];
            let totalRows = 0;

            for (const [hotelId, data] of Object.entries(results)) {
                if (Array.isArray(data) && data.length > 0) {
                    totalRows += data.length;
                    // Add hotel_id to each row for context and take first few rows
                    const rowsWithHotelId = data.slice(0, 2).map(row => ({
                        hotel_id: hotelId,
                        ...row
                    }));
                    allRows.push(...rowsWithHotelId);
                }
            }

            if (allRows.length > 0) {
                logger.debug(`[${operationName}] Sample data (first 2 rows per hotel):`, JSON.stringify(allRows, null, 2));
            } else {
                logger.debug(`[${operationName}] No data found for any hotel.`);
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

/**
 * Batch endpoint to fetch occupation breakdown data for multiple hotels
 * POST /report/batch/occupation-breakdown
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchOccupationBreakdown = async (req, res) => {
    return processBatchRequest(req, res, selectOccupationBreakdownByMonth, 'getBatchOccupationBreakdown');
};

const getBatchReservationListView = async (req, res) => {
    const { hotelIds, startDate, endDate, searchType } = req.body;

    try {
        const data = await selectBatchReservationListView(req.requestId, hotelIds, startDate, endDate, searchType);
        if (!data || data.length === 0) {
            return res.status(200).json([]);
        }
        res.json(data);
    } catch (err) {
        logger.error(`[getBatchReservationListView] Failed for Request ID: ${req.requestId}. Error: ${err.message}`, { stack: err.stack });
        res.status(500).json({ error: 'Internal server error' });
    }
};

/**
 * Batch endpoint to fetch booker type breakdown data for multiple hotels
 * POST /report/batch/booker-type
 * Body: { hotelIds: [1, 2, 3], startDate: '2024-01-01', endDate: '2024-12-31' }
 */
const getBatchBookerTypeBreakdown = async (req, res) => {
    return processBatchRequest(req, res, getBookerTypeBreakdown, 'getBatchBookerTypeBreakdown');
};

/**
 * Batch endpoint to fetch future outlook data (6 months) for multiple hotels
 * POST /report/batch/future-outlook
 * Body: { hotelIds: [1, 2, 3] }
 * Returns occupation breakdown data for current month and next 5 months.
 */
const getBatchFutureOutlook = async (req, res) => {
    const { hotelIds } = req.body;
    const operationName = 'getBatchFutureOutlook';

    logger.debug(`[${operationName}] Received request. Request ID: ${req.requestId}, Hotels: ${hotelIds}`);

    try {
        // Validate input
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            logger.debug(`[${operationName}] Validation error: 'hotelIds' must be a non-empty array. Request ID: ${req.requestId}`);
            return res.status(400).json({ error: 'hotelIds must be a non-empty array' });
        }

        // Validate each hotel ID
        for (const hotelId of hotelIds) {
            validateNumericParam(hotelId, 'hotelId');
        }

        // Calculate 6 months: start from referenceDate (or today) and next 5
        let referenceDate;
        if (req.body.referenceDate) {
            const parsedDate = new Date(req.body.referenceDate);
            if (isNaN(parsedDate.getTime())) {
                logger.debug(`[${operationName}] Validation error: 'referenceDate' is invalid. Request ID: ${req.requestId}`);
                return res.status(400).json({ error: 'Invalid referenceDate provided' });
            }
            referenceDate = parsedDate;
        } else {
            referenceDate = new Date(); // Default to new Date() if not provided
        }
        const months = [];
        for (let i = 0; i < 6; i++) {
            const year = referenceDate.getUTCFullYear();
            const month = referenceDate.getUTCMonth() + i;
            const monthDate = new Date(Date.UTC(year, month, 1));
            const startDate = monthDate.toISOString().split('T')[0];
            const lastDayDate = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0));
            const endDate = lastDayDate.toISOString().split('T')[0];
            months.push({ startDate, endDate, monthLabel: `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, '0')}` });
        }

        const pool = getPool(req.requestId);
        const client = await pool.connect();

        try {
            const results = {};
            const errors = {};

            // For each month, fetch data for all hotels
            for (const month of months) {
                results[month.monthLabel] = {};
                for (const hotelId of hotelIds) {
                    try {
                        const occupationData = await selectOccupationBreakdownByMonth(req.requestId, hotelId, month.startDate, month.endDate, client);
                        const forecastData = await selectForecastData(req.requestId, hotelId, month.startDate, month.endDate, client);
                        const accountingData = await selectAccountingData(req.requestId, hotelId, month.startDate, month.endDate, client);
                        const pmsData = await selectCountReservation(req.requestId, hotelId, month.startDate, month.endDate, client);

                        // Aggregate daily PMS data to monthly
                        let pmsTotalRevenue = 0;
                        let pmsAccommodationRevenue = 0;
                        if (Array.isArray(pmsData)) {
                            pmsTotalRevenue = pmsData.reduce((sum, day) => sum + (Number(day.price) || 0), 0);
                            pmsAccommodationRevenue = pmsData.reduce((sum, day) => sum + (Number(day.accommodation_price) || 0), 0);
                        }

                        results[month.monthLabel][hotelId] = {
                            occupation: occupationData || [],
                            forecast: forecastData || [],
                            accounting: accountingData || [],
                            pms: {
                                revenue: pmsTotalRevenue,
                                accommodation_revenue: pmsAccommodationRevenue
                            }
                        };
                    } catch (err) {
                        logger.error(`[${operationName}] Failed for hotel ${hotelId}, month ${month.monthLabel}. Error: ${err.message}`, { stack: err.stack });
                        if (!errors[month.monthLabel]) errors[month.monthLabel] = {};
                        errors[month.monthLabel][hotelId] = err.message;
                        if (!results[month.monthLabel]) results[month.monthLabel] = {};
                        results[month.monthLabel][hotelId] = { occupation: [], forecast: [], accounting: [], pms: { revenue: 0 } };
                    }
                }
            }

            logger.debug('Summarized Outlook Data Keys:', Object.keys(results));
            /*
            Object.keys(results).forEach(m => {
                logger.debug(`Month: ${m}, Hotels: ${Object.keys(results[m])}`);
            });
            */

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

module.exports = {
    getBatchCountReservation,
    getBatchForecastData,
    getBatchAccountingData,
    getBatchOccupationBreakdown,
    getBatchReservationListView,
    getBatchBookerTypeBreakdown,
    getBatchFutureOutlook,
};