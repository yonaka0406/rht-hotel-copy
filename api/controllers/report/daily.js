const { selectLatestDailyReportDate, selectDailyReportDataByHotel } = require('../../models/report');
const logger = require('../../config/logger');

/**
 * Get the latest available date from the daily_report table.
 * GET /report/daily/latest-date
 */
const getLatestDailyReportDate = async (req, res) => {
    const operationName = 'getLatestDailyReportDate';
    try {
        const maxDate = await selectLatestDailyReportDate(req.requestId);
        res.json(maxDate);
    } catch (error) {
        logger.error(`[${operationName}] Error fetching latest date:`, error);
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Get aggregated daily report data for a specific date.
 * GET /report/daily/data/:date
 */
const getDailyReportData = async (req, res) => {
    const operationName = 'getDailyReportData';
    const { date } = req.params;

    try {
        // Use the aggregated query by hotel
        const data = await selectDailyReportDataByHotel(req.requestId, date);
        const processedData = data.map(row => ({
            ...row,
            normal_sales: row.normal_sales ? Math.round(row.normal_sales / 1.1) : row.normal_sales,
            cancellation_sales: row.cancellation_sales ? Math.round(row.cancellation_sales / 1.1) : row.cancellation_sales,
            accommodation_sales: row.accommodation_sales ? Math.round(row.accommodation_sales / 1.1) : row.accommodation_sales,
            other_sales: row.other_sales ? Math.round(row.other_sales / 1.1) : row.other_sales,
            accommodation_sales_cancelled: row.accommodation_sales_cancelled ? Math.round(row.accommodation_sales_cancelled / 1.1) : row.accommodation_sales_cancelled,
            other_sales_cancelled: row.other_sales_cancelled ? Math.round(row.other_sales_cancelled / 1.1) : row.other_sales_cancelled,
        }));
        res.json(processedData);
    } catch (error) {
        logger.error(`[${operationName}] Error fetching daily report data:`, error);
        res.status(500).json({ error: 'Database error' });
    }
};

/**
 * Get daily report data aggregated by hotel for a specific date and hotel IDs.
 * POST /report/daily/data-by-hotel
 */
const getDailyReportDataByHotel = async (req, res) => {
    const operationName = 'getDailyReportDataByHotel';
    const { date, hotelIds } = req.body;

    if (!date) {
        return res.status(400).json({ error: 'Date is required' });
    }

    try {
        const data = await selectDailyReportDataByHotel(req.requestId, date, hotelIds);
        const processedData = data.map(row => ({
            ...row,
            normal_sales: row.normal_sales ? Math.round(row.normal_sales / 1.1) : row.normal_sales,
            cancellation_sales: row.cancellation_sales ? Math.round(row.cancellation_sales / 1.1) : row.cancellation_sales,
            accommodation_sales: row.accommodation_sales ? Math.round(row.accommodation_sales / 1.1) : row.accommodation_sales,
            other_sales: row.other_sales ? Math.round(row.other_sales / 1.1) : row.other_sales,
            accommodation_sales_cancelled: row.accommodation_sales_cancelled ? Math.round(row.accommodation_sales_cancelled / 1.1) : row.accommodation_sales_cancelled,
            other_sales_cancelled: row.other_sales_cancelled ? Math.round(row.other_sales_cancelled / 1.1) : row.other_sales_cancelled,
        }));
        res.json(processedData);
    } catch (error) {
        logger.error(`[${operationName}] Error fetching daily report data by hotel:`, error);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = {
    getLatestDailyReportDate,
    getDailyReportData,
    getDailyReportDataByHotel
};
