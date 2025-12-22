const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const selectDailyReportData = async (requestId, metricDate) => {
    const pool = getPool(requestId);
    const query = `
        SELECT
            dpm.metric_date,
            dpm.month,
            dpm.hotel_id,
            dpm.plans_global_id,
            dpm.plans_hotel_id,
            dpm.plan_type_category_id,
            dpm.plan_package_category_id,
            h.name as hotel_name,
            dpm.plan_name,
            SUM(dpm.confirmed_stays)::INTEGER as confirmed_stays,
            SUM(dpm.pending_stays)::INTEGER as pending_stays,
            SUM(dpm.in_talks_stays)::INTEGER as in_talks_stays,
            SUM(dpm.cancelled_stays)::INTEGER as cancelled_stays,
            SUM(dpm.non_billable_cancelled_stays)::INTEGER as non_billable_cancelled_stays,
            SUM(dpm.employee_stays)::INTEGER as employee_stays,
            SUM(dpm.normal_sales)::BIGINT as normal_sales,
            SUM(dpm.cancellation_sales)::BIGINT as cancellation_sales,
            SUM(dpm.accommodation_sales)::BIGINT as accommodation_sales,
            SUM(dpm.other_sales)::BIGINT as other_sales,
            SUM(dpm.accommodation_sales_cancelled)::BIGINT as accommodation_sales_cancelled,
            SUM(dpm.other_sales_cancelled)::BIGINT as other_sales_cancelled,
            SUM(dpm.accommodation_net_sales)::BIGINT as accommodation_net_sales,
            SUM(dpm.other_net_sales)::BIGINT as other_net_sales,
            SUM(dpm.accommodation_net_sales_cancelled)::BIGINT as accommodation_net_sales_cancelled,
            SUM(dpm.other_net_sales_cancelled)::BIGINT as other_net_sales_cancelled,
            SUM(dpm.non_accommodation_stays)::INTEGER as non_accommodation_stays,
            MAX(dpm.created_at) as created_at

        FROM
            daily_plan_metrics dpm
        JOIN
            hotels h ON dpm.hotel_id = h.id
        WHERE
            dpm.metric_date = $1
        GROUP BY
            dpm.metric_date, dpm.month, dpm.hotel_id, dpm.plans_global_id, dpm.plans_hotel_id, dpm.plan_type_category_id, dpm.plan_package_category_id, h.name, dpm.plan_name
        ORDER BY
            dpm.hotel_id, dpm.month, h.name, dpm.plan_name;
    `;

    const values = [metricDate];

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error({ err }, 'Error retrieving daily report data');
        throw Object.assign(new Error(`Database error: ${err.message}`), { stack: err.stack });
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
            h.name as hotel_name,
            SUM(dpm.confirmed_stays)::INTEGER as confirmed_stays,
            SUM(dpm.pending_stays)::INTEGER as pending_stays,
            SUM(dpm.in_talks_stays)::INTEGER as in_talks_stays,
            SUM(dpm.cancelled_stays)::INTEGER as cancelled_stays,
            SUM(dpm.non_billable_cancelled_stays)::INTEGER as non_billable_cancelled_stays,
            SUM(dpm.employee_stays)::INTEGER as employee_stays,
            SUM(dpm.normal_sales)::BIGINT as normal_sales,
            SUM(dpm.cancellation_sales)::BIGINT as cancellation_sales,
            SUM(dpm.accommodation_sales)::BIGINT as accommodation_sales,
            SUM(dpm.other_sales)::BIGINT as other_sales,
            SUM(dpm.accommodation_sales_cancelled)::BIGINT as accommodation_sales_cancelled,
            SUM(dpm.other_sales_cancelled)::BIGINT as other_sales_cancelled,
            SUM(dpm.accommodation_net_sales)::BIGINT as accommodation_net_sales,
            SUM(dpm.other_net_sales)::BIGINT as other_net_sales,
            SUM(dpm.accommodation_net_sales_cancelled)::BIGINT as accommodation_net_sales_cancelled,
            SUM(dpm.other_net_sales_cancelled)::BIGINT as other_net_sales_cancelled,
            SUM(dpm.non_accommodation_stays)::INTEGER as non_accommodation_stays,
            MAX(dpm.created_at) as created_at
        FROM
            daily_plan_metrics dpm
        JOIN
            hotels h ON dpm.hotel_id = h.id
        WHERE dpm.metric_date = $1
    `;

    const values = [metricDate];

    if (hotelIds && hotelIds.length > 0) {
        query += ` AND dpm.hotel_id = ANY($2)`;
        values.push(hotelIds);
    }

    query += `
        GROUP BY dpm.metric_date, dpm.hotel_id, dpm.month, h.name
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
