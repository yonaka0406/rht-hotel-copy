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

    console.log(`[DEBUG] selectDailyReportData - Executing query for metricDate: ${metricDate}`);
    console.log(`[DEBUG] Query:`, query.replace(/\s+/g, ' ').trim());

    try {
        const result = await pool.query(query, values);
        
        // Log the exact result for our target record to see what the query returns
        const targetResult = result.rows.find(r => 
            r.hotel_id == 10 && 
            r.plan_type_category_id == 3 && 
            r.plan_package_category_id == 1 &&
            r.plan_name === '2食付き'
        );
        
        if (targetResult) {
            console.log(`[DEBUG] Query result for target record:`, {
                accommodation_sales_cancelled: targetResult.accommodation_sales_cancelled,
                accommodation_sales_cancelled_type: typeof targetResult.accommodation_sales_cancelled,
                accommodation_net_sales_cancelled: targetResult.accommodation_net_sales_cancelled,
                accommodation_net_sales_cancelled_type: typeof targetResult.accommodation_net_sales_cancelled,
                month: targetResult.month,
                plans_global_id: targetResult.plans_global_id,
                plans_hotel_id: targetResult.plans_hotel_id
            });
        }
        
        // Debug log for ALL records with this hotel to see what's being aggregated
        const allHotel10Records = result.rows.filter(r => r.hotel_id == 10);
        console.log(`[DEBUG] selectDailyReportData - Total records for hotel 10: ${allHotel10Records.length}`);
        
        // Debug log for ALL records with this plan and category
        const debugRecords = result.rows.filter(r => 
            r.hotel_id == 10 && 
            r.plan_type_category_id == 3 && 
            r.plan_package_category_id == 1 &&
            r.plan_name === '2食付き'
        );
        
        if (debugRecords.length > 0) {
            console.log(`[DEBUG] selectDailyReportData - Found ${debugRecords.length} records for plan '2食付き' with category 3,1:`);
            debugRecords.forEach((record, index) => {
                console.log(`[DEBUG] Record ${index + 1}:`, {
                    metric_date: record.metric_date,
                    hotel_id: record.hotel_id,
                    plan_name: record.plan_name,
                    month: record.month,
                    accommodation_sales_cancelled: record.accommodation_sales_cancelled,
                    accommodation_net_sales_cancelled: record.accommodation_net_sales_cancelled,
                    plan_type_category_id: record.plan_type_category_id,
                    plan_package_category_id: record.plan_package_category_id,
                    plans_global_id: record.plans_global_id,
                    plans_hotel_id: record.plans_hotel_id
                });
            });
            
            // Calculate totals
            const totalCancelled = debugRecords.reduce((sum, r) => sum + parseFloat(r.accommodation_sales_cancelled || 0), 0);
            const totalNetCancelled = debugRecords.reduce((sum, r) => sum + parseFloat(r.accommodation_net_sales_cancelled || 0), 0);
            console.log(`[DEBUG] Calculated totals - Cancelled: ${totalCancelled}, Net Cancelled: ${totalNetCancelled}`);
        }
        
        // Also check if there are other records with similar plan names that might be getting grouped
        const similarPlanRecords = result.rows.filter(r => 
            r.hotel_id == 10 && 
            (r.plan_name.includes('2食') || r.accommodation_sales_cancelled > 0)
        );
        
        if (similarPlanRecords.length > debugRecords.length) {
            console.log(`[DEBUG] Found ${similarPlanRecords.length} records with similar plan names or cancelled sales:`);
            similarPlanRecords.forEach((record, index) => {
                if (parseFloat(record.accommodation_sales_cancelled || 0) > 0) {
                    console.log(`[DEBUG] Similar Record ${index + 1}:`, {
                        plan_name: record.plan_name,
                        month: record.month,
                        accommodation_sales_cancelled: record.accommodation_sales_cancelled,
                        accommodation_net_sales_cancelled: record.accommodation_net_sales_cancelled,
                        plan_type_category_id: record.plan_type_category_id,
                        plan_package_category_id: record.plan_package_category_id
                    });
                }
            });
        }
        
        console.log(`[DEBUG] selectDailyReportData - Total records returned: ${result.rows.length} for date: ${metricDate}`);
        
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
