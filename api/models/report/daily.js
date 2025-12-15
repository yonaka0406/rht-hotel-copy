const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const selectDailyReportData = async (requestId, metricDate) => {
    const pool = getPool(requestId);
    const query = `
        SELECT
            dpm.metric_date,
            dpm.month,
            dpm.hotel_id,
            dpm.plans_global_id,  -- Added plans_global_id here
            dpm.plans_hotel_id,   -- Added plans_hotel_id here
            h.name as hotel_name,
            dpm.plan_name,
            SUM(dpm.confirmed_stays) as confirmed_stays,
            SUM(dpm.pending_stays) as pending_stays,
            SUM(dpm.in_talks_stays) as in_talks_stays,
            SUM(dpm.cancelled_stays) as cancelled_stays,
            SUM(dpm.non_billable_cancelled_stays) as non_billable_cancelled_stays,
            SUM(dpm.employee_stays) as employee_stays,
            SUM(dpm.normal_sales) as normal_sales,
            SUM(dpm.cancellation_sales) as cancellation_sales,
            SUM(dpm.accommodation_sales) as accommodation_sales,
            SUM(dpm.other_sales) as other_sales,
            SUM(dpm.accommodation_sales_cancelled) as accommodation_sales_cancelled,
            SUM(dpm.other_sales_cancelled) as other_sales_cancelled,
            SUM(dpm.non_accommodation_stays) as non_accommodation_stays,
            MAX(dpm.created_at) as created_at

        FROM
            daily_plan_metrics dpm
        JOIN
            hotels h ON dpm.hotel_id = h.id
        WHERE
            dpm.metric_date = $1
        GROUP BY
            dpm.metric_date, dpm.month, dpm.hotel_id, dpm.plans_global_id, dpm.plans_hotel_id, h.name, dpm.plan_name, dpm.created_at
        ORDER BY
            dpm.hotel_id, dpm.month, h.name, dpm.plan_name;
    `;

    const values = [metricDate];

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving daily report data:', err);
        throw new Error('Database error');
    }
};

const selectLatestDailyReportDate = async (requestId) => {
    const pool = getPool(requestId);
    try {
        const result = await pool.query("SELECT TO_CHAR(MAX(metric_date), 'YYYY-MM-DD') as max_date FROM daily_plan_metrics");
        return result.rows[0]?.max_date || null;
    } catch (error) {
        logger.error(`[selectLatestDailyReportDate] Error executing query:`, error);
        throw error;
    }
};

const selectDailyReportDataByHotel = async (requestId, metricDate, hotelIds) => {
    const pool = getPool(requestId);
    let query = `
        SELECT 
            TO_CHAR(dpm.metric_date, 'YYYY-MM-DD') as metric_date,
            TO_CHAR(dpm.month, 'YYYY-MM-DD') as month,
            dpm.hotel_id,
            SUM(dpm.confirmed_stays) as confirmed_stays,
            SUM(dpm.pending_stays) as pending_stays,
            SUM(dpm.in_talks_stays) as in_talks_stays,
            SUM(dpm.cancelled_stays) as cancelled_stays,
            SUM(dpm.non_billable_cancelled_stays) as non_billable_cancelled_stays,
            SUM(dpm.employee_stays) as employee_stays,
            ROUND(SUM(dpm.normal_sales) / 1.1) as normal_sales,
            ROUND(SUM(dpm.cancellation_sales) / 1.1) as cancellation_sales,
            ROUND(SUM(dpm.accommodation_sales) / 1.1) as accommodation_sales,
            ROUND(SUM(dpm.other_sales) / 1.1) as other_sales,
            ROUND(SUM(dpm.accommodation_sales_cancelled) / 1.1) as accommodation_sales_cancelled,
            ROUND(SUM(dpm.other_sales_cancelled) / 1.1) as other_sales_cancelled,
            SUM(dpm.non_accommodation_stays) as non_accommodation_stays,
            MAX(dpm.created_at) as created_at
        FROM
            daily_plan_metrics dpm
        JOIN
            hotels h ON dpm.hotel_id = h.id
        WHERE metric_date = $1
    `;

    const values = [metricDate];

    if (hotelIds && hotelIds.length > 0) {
        query += ` AND hotel_id = ANY($2)`;
        values.push(hotelIds);
    }

    query += `
        GROUP BY dpm.metric_date, dpm.hotel_id, dpm.month
        ORDER BY dpm.hotel_id, dpm.month;
    `;

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (error) {
        logger.error(`[selectDailyReportDataByHotel] Error executing query:`, error);
        throw error;
    }
};

module.exports = {
    selectDailyReportData,
    selectDailyReportDataByHotel,
    selectLatestDailyReportDate
};
