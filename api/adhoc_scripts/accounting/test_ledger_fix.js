/**
 * Test the updated ledger query with LEFT JOIN for reservation_rates
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

async function testLedgerFix() {
    const hotelId = 15;
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    console.log('='.repeat(80));
    console.log('Testing Updated Ledger Query for Hotel ID:', hotelId);
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        const query = `
            WITH rr_base AS (
                /* Get all rate lines and identify the one with the highest tax rate per detail */
                /* LEFT JOIN to include reservation_details without rates */
                SELECT 
                    rd.id as rd_id,
                    rd.hotel_id,
                    rd.plans_hotel_id,
                    rd.plans_global_id,
                    ph.plan_type_category_id,
                    ptc.name as category_name,
                    COALESCE(ph.name, pg.name, '未設定') as plan_name,
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
                LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
                LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
                LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
                LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                WHERE rd.date BETWEEN $1 AND $2
                AND rd.hotel_id = $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            rr_totals AS (
                /* Calculate the sum of rate prices to detect discrepancies */
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

        const result = await pool.query(query, [startDate, endDate, hotelId]);
        const total = parseFloat(result.rows[0].total_amount || 0);

        console.log('\nUpdated Ledger Query Total:', total.toLocaleString('ja-JP'), '円');
        console.log('Expected Total:', '8,975,100 円');
        console.log('Match:', Math.abs(total - 8975100) < 1 ? '✓' : '✗');

        if (Math.abs(total - 8975100) < 1) {
            console.log('\n✓ SUCCESS! The ledger query now matches the monthly report.');
        } else {
            console.log('\n✗ Still a discrepancy of:', (total - 8975100).toLocaleString('ja-JP'), '円');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

testLedgerFix();
