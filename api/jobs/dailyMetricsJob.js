const cron = require('node-cron');
const db = require('../config/database');

const performDailyMetricsCalculation = async () => {
    console.log('Starting daily plan metrics calculation job...');    
    const client = await db.getProdPool().connect();

    try {
        await client.query('BEGIN');

        const metricDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

        await client.query('DELETE FROM daily_plan_metrics WHERE metric_date = $1', [metricDate]);
        await client.query("SELECT setval('daily_plan_metrics_id_seq', COALESCE((SELECT MAX(id) + 1 FROM daily_plan_metrics), 1), false);");

        const hotelsWithReservationsResult = await client.query(`
            SELECT r.hotel_id, MAX(r.check_out) as last_date
            FROM reservations r
            JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
            WHERE rd.date >= $1
            GROUP BY r.hotel_id;
        `, [metricDate]);

        const hotelsWithReservations = hotelsWithReservationsResult.rows;

        for (const hotel of hotelsWithReservations) {
            const hotelId = hotel.hotel_id;
            const lastDate = hotel.last_date;

            const query = `
                INSERT INTO daily_plan_metrics (metric_date, month, hotel_id, plans_global_id, plans_hotel_id, plan_name, confirmed_stays, pending_stays, in_talks_stays, cancelled_stays, non_billable_cancelled_stays, employee_stays, normal_sales, cancellation_sales, accommodation_sales, other_sales, accommodation_sales_cancelled, other_sales_cancelled)
                WITH months AS (
                    SELECT generate_series(
                        date_trunc('month', $1::date),
                        date_trunc('month', $2::date),
                        '1 month'
                    )::date AS month
                ),
                rate_sums AS (
                    SELECT
                        rr.hotel_id,
                        rr.reservation_details_id,
                        SUM(CASE WHEN COALESCE(rr.sales_category, 'accommodation') = 'accommodation' THEN rr.price ELSE 0 END) AS accommodation_rate_price,
                        SUM(CASE WHEN rr.sales_category = 'other' THEN rr.price ELSE 0 END) AS other_rate_price
                    FROM
                        reservation_rates rr
                    GROUP BY
                        rr.hotel_id, rr.reservation_details_id
                ),
                addon_sums AS (
                    SELECT
                        ra.hotel_id,
                        ra.reservation_detail_id,
                        SUM(CASE WHEN COALESCE(ra.sales_category, 'accommodation') = 'accommodation' THEN ra.price * ra.quantity ELSE 0 END) AS accommodation_addon_price,
                        SUM(CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END) AS other_addon_price,
                        SUM(ra.price * ra.quantity) AS total_addon_price
                    FROM
                        reservation_addons ra
                    GROUP BY
                        ra.hotel_id, ra.reservation_detail_id
                )
                SELECT
                    $1 AS metric_date,
                    m.month,
                    $3 AS hotel_id,
                    rd.plans_global_id,
                    rd.plans_hotel_id,
                    COALESCE(ph.name, pg.name, '未設定') AS plan_name,
                    COUNT(CASE WHEN r.status IN('confirmed', 'checked_in', 'checked_out') AND rd.cancelled IS NULL AND rd.billable IS TRUE AND r.type <> 'employee' THEN rd.id END) AS confirmed_stays,
                    COUNT(CASE WHEN r.status = 'provisory' AND rd.cancelled IS NULL AND r.type <> 'employee' THEN rd.id END) AS pending_stays,
                    COUNT(CASE WHEN r.status = 'hold' AND rd.cancelled IS NULL AND r.type <> 'employee' THEN rd.id END) AS in_talks_stays,
                    COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE AND r.type <> 'employee' THEN rd.id END) AS cancelled_stays,
                    COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS FALSE AND r.type <> 'employee' THEN rd.id END) AS non_billable_cancelled_stays,
                    COUNT(CASE WHEN r.type = 'employee' THEN rd.id END) AS employee_stays,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (rd.price + COALESCE(ads.total_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS normal_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (rd.price + COALESCE(ads.total_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS cancellation_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (COALESCE(rs.accommodation_rate_price, 0) + COALESCE(ads.accommodation_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS accommodation_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (COALESCE(rs.other_rate_price, 0) + COALESCE(ads.other_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS other_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (COALESCE(rs.accommodation_rate_price, 0) + COALESCE(ads.accommodation_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS accommodation_sales_cancelled,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (COALESCE(rs.other_rate_price, 0) + COALESCE(ads.other_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS other_sales_cancelled
                FROM
                    months m
                CROSS JOIN
                    reservation_details rd
                JOIN
                    reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                LEFT JOIN
                    plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
                LEFT JOIN
                    plans_global pg ON rd.plans_global_id = pg.id
                LEFT JOIN
                    rate_sums rs ON rd.hotel_id = rs.hotel_id AND rd.id = rs.reservation_details_id
                LEFT JOIN
                    addon_sums ads ON rd.hotel_id = ads.hotel_id AND rd.id = ads.reservation_detail_id
                WHERE
                    rd.hotel_id = $3
                    AND r.status <> 'block'
                    AND date_trunc('month', rd.date) = m.month
                GROUP BY
                    m.month, rd.plans_global_id, rd.plans_hotel_id, ph.name, pg.name;
            `;

            await client.query(query, [metricDate, lastDate, hotelId]);
        }

        await client.query('COMMIT');
        console.log('Daily plan metrics calculation job completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in daily plan metrics calculation job:', error);
    } finally {
        client.release();
    }
};

const scheduleDailyMetricsJob = () => {
    // Schedule the job to run daily at 16:30
    cron.schedule('30 16 * * *', performDailyMetricsCalculation, {
        scheduled: true,
        timezone: "Asia/Tokyo"
    });
    console.log('Daily plan metrics calculation job scheduled daily at 16:30.');
};

module.exports = { scheduleDailyMetricsJob };