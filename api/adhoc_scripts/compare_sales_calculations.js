/**
 * Script to compare sales calculations between ledger export and monthly report
 * for hotel_id=15 in January 2026
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

async function compareSalesCalculations() {
    const hotelId = 14;
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    console.log('='.repeat(80));
    console.log('Comparing Sales Calculations for Hotel ID:', hotelId);
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        // Query 1: Ledger Export Logic (using reservation_rates)
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
                    rr.tax_rate,
                    CASE 
                        WHEN rd.plan_type = 'per_room' THEN rr.price 
                        ELSE rr.price * rd.number_of_people 
                    END as rr_price,
                    ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn,
                    (rd.cancelled IS NOT NULL) as is_cancelled
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                WHERE rd.date BETWEEN $1 AND $2
                AND rd.hotel_id = $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            rr_totals AS (
                SELECT rd_id, SUM(rr_price) as sum_rr_price
                FROM rr_base
                GROUP BY rd_id
            )
            SELECT 
                SUM(
                    CASE 
                        WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price)
                        ELSE b.rr_price
                    END
                ) as total_amount
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        `;

        const ledgerResult = await pool.query(ledgerQuery, [startDate, endDate, hotelId]);
        const ledgerTotal = parseFloat(ledgerResult.rows[0].total_amount || 0);

        console.log('\n1. LEDGER EXPORT CALCULATION (using reservation_rates):');
        console.log('   Total Amount:', ledgerTotal.toLocaleString('ja-JP'), '円');

        // Query 2: Monthly Report Logic (using reservation_details.price)
        const monthlyReportQuery = `
            SELECT
                SUM(
                    CASE WHEN rd.plan_type = 'per_room' THEN rd.price 
                    ELSE rd.price * rd.number_of_people END
                ) AS accommodation_sales,
                SUM(
                    CASE 
                        WHEN COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
                            CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END
                        ELSE 0 
                    END
                ) AS accommodation_only_sales,
                SUM(
                    CASE 
                        WHEN COALESCE(rd.is_accommodation, TRUE) = FALSE THEN 
                            CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END
                        ELSE 0 
                    END
                ) AS other_sales
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.hotel_id = $1
            AND rd.date BETWEEN $2 AND $3
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        `;

        const monthlyResult = await pool.query(monthlyReportQuery, [hotelId, startDate, endDate]);
        const monthlyAccommodation = parseFloat(monthlyResult.rows[0].accommodation_only_sales || 0);
        const monthlyOther = parseFloat(monthlyResult.rows[0].other_sales || 0);
        const monthlyTotal = monthlyAccommodation + monthlyOther;

        console.log('\n2. MONTHLY REPORT CALCULATION (using reservation_details.price):');
        console.log('   Accommodation Sales:', monthlyAccommodation.toLocaleString('ja-JP'), '円');
        console.log('   Other Sales:', monthlyOther.toLocaleString('ja-JP'), '円');
        console.log('   Total:', monthlyTotal.toLocaleString('ja-JP'), '円');

        // Query 3: Check for addons
        const addonQuery = `
            SELECT
                SUM(ra.price * ra.quantity) as addon_total
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN reservation_addons ra ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
            WHERE rd.hotel_id = $1
            AND rd.date BETWEEN $2 AND $3
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        `;

        const addonResult = await pool.query(addonQuery, [hotelId, startDate, endDate]);
        const addonTotal = parseFloat(addonResult.rows[0].addon_total || 0);

        console.log('\n3. ADDON SALES:');
        console.log('   Total Addon Sales:', addonTotal.toLocaleString('ja-JP'), '円');

        console.log('\n' + '='.repeat(80));
        console.log('COMPARISON:');
        console.log('='.repeat(80));
        console.log('Expected Total (from ledger):', '8,975,100 円');
        console.log('Ledger Export Total:', ledgerTotal.toLocaleString('ja-JP'), '円');
        console.log('Monthly Report Total (accommodation + other):', monthlyTotal.toLocaleString('ja-JP'), '円');
        console.log('Monthly Report + Addons:', (monthlyTotal + addonTotal).toLocaleString('ja-JP'), '円');
        console.log('\nDifference (Ledger - Monthly):', (ledgerTotal - monthlyTotal).toLocaleString('ja-JP'), '円');
        console.log('Difference (Ledger - Monthly+Addons):', (ledgerTotal - monthlyTotal - addonTotal).toLocaleString('ja-JP'), '円');

        // Check if monthly report matches expected
        if (Math.abs(monthlyTotal + addonTotal - 8975100) < 1) {
            console.log('\n✓ Monthly report matches expected value!');
        } else if (Math.abs(ledgerTotal - 8975100) < 1) {
            console.log('\n✓ Ledger export matches expected value!');
        } else {
            console.log('\n✗ Neither calculation matches expected value of 8,975,100');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

compareSalesCalculations();
