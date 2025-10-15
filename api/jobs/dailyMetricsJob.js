const cron = require('node-cron');
const db = require('../config/database');

const performDailyMetricsCalculation = async () => {
    console.log('Starting daily plan metrics calculation job...');    
    const client = await db.getProdPool().connect();

    try {
        await client.query('BEGIN');

        const metricDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tokyo' });

        await client.query('DELETE FROM daily_plan_metrics WHERE metric_date = $1', [metricDate]);

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
                INSERT INTO daily_plan_metrics (metric_date, month, hotel_id, plans_global_id, plans_hotel_id, plan_name, confirmed_stays, pending_stays, in_talks_stays, cancelled_stays, non_billable_cancelled_stays, employee_stays, normal_sales, cancellation_sales)
                WITH months AS (
                    SELECT generate_series(
                        date_trunc('month', $1::date),
                        date_trunc('month', $2::date),
                        '1 month'
                    )::date AS month
                ),
                addon_sums AS (
                    SELECT
                        ra.hotel_id,
                        ra.reservation_detail_id,
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
                    COUNT(CASE WHEN r.status = 'confirmed' AND rd.cancelled IS NULL AND rd.billable IS TRUE AND r.type <> 'employee' THEN rd.id END) AS confirmed_stays,
                    COUNT(CASE WHEN r.status = 'provisory' AND rd.cancelled IS NULL AND r.type <> 'employee' THEN rd.id END) AS pending_stays,
                    COUNT(CASE WHEN r.status = 'hold' AND rd.cancelled IS NULL AND r.type <> 'employee' THEN rd.id END) AS in_talks_stays,
                    COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE AND r.type <> 'employee' THEN rd.id END) AS cancelled_stays,
                    COUNT(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS FALSE AND r.type <> 'employee' THEN rd.id END) AS non_billable_cancelled_stays,
                    COUNT(CASE WHEN r.type = 'employee' THEN rd.id END) AS employee_stays,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NULL AND rd.billable IS TRUE THEN (rd.price + COALESCE(ads.total_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS normal_sales,
                    COALESCE(SUM(CASE WHEN rd.cancelled IS NOT NULL AND rd.billable IS TRUE THEN (rd.price + COALESCE(ads.total_addon_price, 0)) ELSE 0 END), 0)::BIGINT AS cancellation_sales
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