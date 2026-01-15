/**
 * Compare dashboard sales total vs ledger export preview for December 2025
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

async function compareDashboardVsLedger() {
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';

    console.log('='.repeat(80));
    console.log('Comparing Dashboard vs Ledger Export for December 2025');
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        // Get all hotel IDs
        const hotelsResult = await pool.query('SELECT id FROM hotels ORDER BY id');
        const hotelIds = hotelsResult.rows.map(h => h.id);
        
        console.log('Hotels included:', hotelIds.join(', '));

        // 1. Dashboard calculation using the updated query (should match ledger now)
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

        const dashboardResult = await pool.query(dashboardQuery, [startDate, endDate, hotelIds]);
        const dashboardTotal = parseFloat(dashboardResult.rows[0].total_sales || 0);

        // 2. Ledger export calculation (uses the complex query with rates and addons)
        const ledgerQuery = `
            WITH rr_base AS (
                SELECT 
                    rd.id as rd_id,
                    rd.hotel_id,
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
                    ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY COALESCE(rr.tax_rate, 0.10) DESC, rr.id DESC NULLS LAST) as rn,
                    (rd.cancelled IS NOT NULL) as is_cancelled
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
            )
            SELECT 
                (SELECT SUM(amount) FROM plan_sales) as plan_total,
                (SELECT SUM(amount) FROM addon_sales) as addon_total,
                (SELECT SUM(amount) FROM plan_sales) + COALESCE((SELECT SUM(amount) FROM addon_sales), 0) as grand_total
        `;

        const ledgerResult = await pool.query(ledgerQuery, [startDate, endDate, hotelIds]);
        const ledgerData = ledgerResult.rows[0];
        const planTotal = parseFloat(ledgerData.plan_total || 0);
        const addonTotal = parseFloat(ledgerData.addon_total || 0);
        const ledgerTotal = parseFloat(ledgerData.grand_total || 0);

        // 3. Check addon sales separately
        const addonOnlyQuery = `
            SELECT 
                SUM(ra.price * ra.quantity) as addon_total
            FROM reservation_addons ra
            JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND ra.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        `;

        const addonOnlyResult = await pool.query(addonOnlyQuery, [startDate, endDate, hotelIds]);
        const addonOnlyTotal = parseFloat(addonOnlyResult.rows[0].addon_total || 0);

        console.log('\n1. DASHBOARD CALCULATION (reservation_details only):');
        console.log('   Total:', dashboardTotal.toLocaleString('ja-JP'), '円');

        console.log('\n2. LEDGER EXPORT CALCULATION (with rates adjustment):');
        console.log('   Plan Sales:', planTotal.toLocaleString('ja-JP'), '円');
        console.log('   Addon Sales:', addonTotal.toLocaleString('ja-JP'), '円');
        console.log('   Total:', ledgerTotal.toLocaleString('ja-JP'), '円');

        console.log('\n3. ADDON SALES (separate query):');
        console.log('   Total:', addonOnlyTotal.toLocaleString('ja-JP'), '円');

        console.log('\n' + '='.repeat(80));
        console.log('COMPARISON:');
        console.log('='.repeat(80));
        console.log('Dashboard Total:', dashboardTotal.toLocaleString('ja-JP'), '円');
        console.log('Ledger Export Total:', ledgerTotal.toLocaleString('ja-JP'), '円');
        console.log('Expected Dashboard:', '119,013,940 円');
        console.log('Expected Ledger:', '121,969,940 円');
        console.log('\nDifference (Ledger - Dashboard):', (ledgerTotal - dashboardTotal).toLocaleString('ja-JP'), '円');
        console.log('Expected Difference:', '2,956,000 円');

        // Check if the difference matches addons
        console.log('\nAddon Analysis:');
        console.log('Addon Total:', addonOnlyTotal.toLocaleString('ja-JP'), '円');
        console.log('Dashboard + Addons:', (dashboardTotal + addonOnlyTotal).toLocaleString('ja-JP'), '円');
        console.log('Matches Ledger?', Math.abs((dashboardTotal + addonOnlyTotal) - ledgerTotal) < 1 ? '✓' : '✗');

        // Hypothesis: Dashboard doesn't include addons, Ledger does
        if (Math.abs((dashboardTotal + addonOnlyTotal) - ledgerTotal) < 1) {
            console.log('\n✓ CONCLUSION: Dashboard excludes addons, Ledger includes them');
        } else {
            console.log('\n✗ The difference is not explained by addons alone');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

compareDashboardVsLedger();