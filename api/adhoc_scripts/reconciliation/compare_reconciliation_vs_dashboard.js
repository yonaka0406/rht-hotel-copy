/**
 * Compare reconciliation sales total vs dashboard/ledger for December 2025
 */

const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});

async function compareReconciliationVsDashboard() {
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';

    console.log('='.repeat(80));
    console.log('Comparing Reconciliation vs Dashboard for December 2025');
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        // Get all hotel IDs
        const hotelsResult = await pool.query('SELECT id FROM hotels ORDER BY id');
        const hotelIds = hotelsResult.rows.map(h => h.id);

        // 1. Dashboard/Ledger calculation (includes 'cancelled' status)
        const dashboardQuery = `
        WITH rr_base AS (
            SELECT 
                rd.id as rd_id,
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN rd.price 
                    ELSE rd.price * rd.number_of_people 
                END as total_rd_price,
                rr.id as rr_id,
                COALESCE(rr.tax_rate, 0.10) as tax_rate,
                CASE 
                    WHEN rr.id IS NOT NULL THEN
                        CASE 
                            WHEN rd.plan_type = 'per_room' THEN rr.price 
                            ELSE rr.price * rd.number_of_people 
                        END
                    ELSE 0
                END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY COALESCE(rr.tax_rate, 0.10) DESC, rr.id DESC NULLS LAST) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price
            FROM rr_base
            GROUP BY rd_id
        ),
        plan_sales AS (
            SELECT 
                CASE 
                    WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price)
                    ELSE b.rr_price
                END as amount
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        ),
        addon_sales AS (
            SELECT 
                (ra.price * ra.quantity) as amount
            FROM reservation_addons ra
            JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND ra.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        combined_sales AS (
            SELECT amount FROM plan_sales
            UNION ALL
            SELECT amount FROM addon_sales
        )
        SELECT SUM(amount) as total_sales FROM combined_sales
        `;

        // 2. Reconciliation calculation (excludes 'cancelled' status)
        const reconciliationQuery = `
        WITH rr_base AS (
            SELECT 
                rd.id as rd_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
                rr.id as rr_id,
                COALESCE(rr.tax_rate, 0.10) as tax_rate,
                CASE 
                    WHEN rr.id IS NOT NULL THEN
                        CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END
                    ELSE 0
                END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY COALESCE(rr.tax_rate, 0.10) DESC, rr.id DESC NULLS LAST) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block', 'cancelled')
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        plan_sales AS (
            SELECT 
                CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        ),
        addon_sales AS (
            SELECT 
                (ra.price * ra.quantity) as amount
            FROM reservation_addons ra
            JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block', 'cancelled')
            AND r.type <> 'employee'
        ),
        combined_sales AS (
            SELECT amount FROM plan_sales
            UNION ALL
            SELECT amount FROM addon_sales
        )
        SELECT SUM(amount) as total_sales FROM combined_sales
        `;

        // 3. Check cancelled reservations sales
        const cancelledQuery = `
        WITH rr_base AS (
            SELECT 
                rd.id as rd_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
                rr.id as rr_id,
                COALESCE(rr.tax_rate, 0.10) as tax_rate,
                CASE 
                    WHEN rr.id IS NOT NULL THEN
                        CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END
                    ELSE 0
                END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY COALESCE(rr.tax_rate, 0.10) DESC, rr.id DESC NULLS LAST) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status = 'cancelled'
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        plan_sales AS (
            SELECT 
                CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        ),
        addon_sales AS (
            SELECT 
                (ra.price * ra.quantity) as amount
            FROM reservation_addons ra
            JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status = 'cancelled'
            AND r.type <> 'employee'
        ),
        combined_sales AS (
            SELECT amount FROM plan_sales
            UNION ALL
            SELECT amount FROM addon_sales
        )
        SELECT SUM(amount) as cancelled_sales FROM combined_sales
        `;

        const [dashboardResult, reconciliationResult, cancelledResult] = await Promise.all([
            pool.query(dashboardQuery, [startDate, endDate, hotelIds]),
            pool.query(reconciliationQuery, [startDate, endDate, hotelIds]),
            pool.query(cancelledQuery, [startDate, endDate, hotelIds])
        ]);

        const dashboardTotal = parseFloat(dashboardResult.rows[0].total_sales || 0);
        const reconciliationTotal = parseFloat(reconciliationResult.rows[0].total_sales || 0);
        const cancelledTotal = parseFloat(cancelledResult.rows[0].cancelled_sales || 0);

        console.log('\n1. DASHBOARD/LEDGER CALCULATION (excludes hold, block):');
        console.log('   Total:', dashboardTotal.toLocaleString('ja-JP'), '円');

        console.log('\n2. RECONCILIATION CALCULATION (excludes hold, block, cancelled):');
        console.log('   Total:', reconciliationTotal.toLocaleString('ja-JP'), '円');

        console.log('\n3. CANCELLED RESERVATIONS SALES:');
        console.log('   Total:', cancelledTotal.toLocaleString('ja-JP'), '円');

        console.log('\n' + '='.repeat(80));
        console.log('COMPARISON:');
        console.log('='.repeat(80));
        console.log('Dashboard/Ledger Total:', dashboardTotal.toLocaleString('ja-JP'), '円');
        console.log('Reconciliation Total:', reconciliationTotal.toLocaleString('ja-JP'), '円');
        console.log('Expected Reconciliation:', '121,341,540 円');
        console.log('\nDifference (Dashboard - Reconciliation):', (dashboardTotal - reconciliationTotal).toLocaleString('ja-JP'), '円');
        console.log('Cancelled Sales:', cancelledTotal.toLocaleString('ja-JP'), '円');

        // Check if the difference matches cancelled sales
        if (Math.abs((dashboardTotal - reconciliationTotal) - cancelledTotal) < 1) {
            console.log('\n✓ CONCLUSION: Difference explained by cancelled reservations');
        } else {
            console.log('\n✗ Difference not fully explained by cancelled reservations');
            console.log('Unexplained difference:', ((dashboardTotal - reconciliationTotal) - cancelledTotal).toLocaleString('ja-JP'), '円');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

compareReconciliationVsDashboard();