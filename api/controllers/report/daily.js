const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Get the latest available date from the daily_report table.
 * GET /report/daily/latest-date
 */
const getLatestDailyReportDate = async (req, res) => {
    const operationName = 'getLatestDailyReportDate';
    const pool = getPool(req.requestId);

    try {
        const result = await pool.query("SELECT TO_CHAR(MAX(metric_date), 'YYYY-MM-DD') as max_date FROM daily_plan_metrics");
        const maxDate = result.rows[0]?.max_date;

        res.json(maxDate || null);
    } catch (error) {
        logger.error(`[${operationName}] Error fetching latest date:`, error);
        res.status(500).json({ error: 'Database error' });
    }
};

module.exports = {
    getLatestDailyReportDate
};
