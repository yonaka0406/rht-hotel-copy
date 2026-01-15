/**
 * Script to find discrepancies between reservation_details.price and sum of reservation_rates.price
 * for hotel_id=14 in January 2026
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

async function findPriceDiscrepancy() {
    const hotelId = 14;
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    console.log('='.repeat(80));
    console.log('Finding Price Discrepancies for Hotel ID:', hotelId);
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        const query = `
            WITH rd_prices AS (
                SELECT 
                    rd.id as rd_id,
                    rd.reservation_id,
                    rd.date,
                    rd.plan_type,
                    rd.number_of_people,
                    rd.price as rd_price,
                    CASE 
                        WHEN rd.plan_type = 'per_room' THEN rd.price 
                        ELSE rd.price * rd.number_of_people 
                    END as rd_total_price,
                    COALESCE(ph.name, pg.name, 'プラン未設定') as plan_name
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
                LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
                WHERE rd.hotel_id = $1
                AND rd.date BETWEEN $2 AND $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            rr_prices AS (
                SELECT 
                    rd.id as rd_id,
                    SUM(
                        CASE 
                            WHEN rd.plan_type = 'per_room' THEN rr.price 
                            ELSE rr.price * rd.number_of_people 
                        END
                    ) as rr_total_price
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                WHERE rd.hotel_id = $1
                AND rd.date BETWEEN $2 AND $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
                GROUP BY rd.id, rd.plan_type
            )
            SELECT 
                rdp.rd_id,
                rdp.reservation_id,
                rdp.date,
                rdp.plan_name,
                rdp.plan_type,
                rdp.number_of_people,
                rdp.rd_price,
                rdp.rd_total_price,
                COALESCE(rrp.rr_total_price, 0) as rr_total_price,
                rdp.rd_total_price - COALESCE(rrp.rr_total_price, 0) as difference
            FROM rd_prices rdp
            LEFT JOIN rr_prices rrp ON rdp.rd_id = rrp.rd_id
            WHERE rdp.rd_total_price != COALESCE(rrp.rr_total_price, 0)
            ORDER BY ABS(rdp.rd_total_price - COALESCE(rrp.rr_total_price, 0)) DESC
        `;

        const result = await pool.query(query, [hotelId, startDate, endDate]);
        
        if (result.rows.length === 0) {
            console.log('\n✓ No discrepancies found! All reservation_details.price match sum of reservation_rates.price');
        } else {
            console.log(`\n✗ Found ${result.rows.length} discrepancies:\n`);
            
            let totalDifference = 0;
            
            result.rows.forEach((row, index) => {
                const diff = parseFloat(row.difference);
                totalDifference += diff;
                
                console.log(`Discrepancy ${index + 1}:`);
                console.log('  Reservation Detail ID:', row.rd_id);
                console.log('  Reservation ID:', row.reservation_id);
                console.log('  Date:', row.date);
                console.log('  Plan:', row.plan_name);
                console.log('  Plan Type:', row.plan_type);
                console.log('  Number of People:', row.number_of_people);
                console.log('  RD Price (per unit):', parseFloat(row.rd_price).toLocaleString('ja-JP'), '円');
                console.log('  RD Total Price:', parseFloat(row.rd_total_price).toLocaleString('ja-JP'), '円');
                console.log('  RR Total Price:', parseFloat(row.rr_total_price).toLocaleString('ja-JP'), '円');
                console.log('  Difference:', diff.toLocaleString('ja-JP'), '円');
                console.log('');
            });
            
            console.log('='.repeat(80));
            console.log('SUMMARY:');
            console.log('Total Difference:', totalDifference.toLocaleString('ja-JP'), '円');
            console.log('Expected Difference: 50,100 円');
            console.log('Match:', Math.abs(totalDifference - 50100) < 1 ? '✓' : '✗');
        }

        // Also check if there are any reservation_details without reservation_rates
        const missingRatesQuery = `
            SELECT 
                rd.id as rd_id,
                rd.reservation_id,
                rd.date,
                COALESCE(ph.name, pg.name, 'プラン未設定') as plan_name,
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN rd.price 
                    ELSE rd.price * rd.number_of_people 
                END as rd_total_price
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
            LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
            WHERE rd.hotel_id = $1
            AND rd.date BETWEEN $2 AND $3
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
            AND NOT EXISTS (
                SELECT 1 FROM reservation_rates rr 
                WHERE rr.reservation_details_id = rd.id 
                AND rr.hotel_id = rd.hotel_id
            )
        `;

        const missingResult = await pool.query(missingRatesQuery, [hotelId, startDate, endDate]);
        
        if (missingResult.rows.length > 0) {
            console.log('\n' + '='.repeat(80));
            console.log(`⚠ Found ${missingResult.rows.length} reservation_details WITHOUT reservation_rates:\n`);
            
            let totalMissing = 0;
            missingResult.rows.forEach((row, index) => {
                const price = parseFloat(row.rd_total_price);
                totalMissing += price;
                
                console.log(`Missing Rates ${index + 1}:`);
                console.log('  Reservation Detail ID:', row.rd_id);
                console.log('  Reservation ID:', row.reservation_id);
                console.log('  Date:', row.date);
                console.log('  Plan:', row.plan_name);
                console.log('  RD Total Price:', price.toLocaleString('ja-JP'), '円');
                console.log('');
            });
            
            console.log('Total Missing:', totalMissing.toLocaleString('ja-JP'), '円');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

findPriceDiscrepancy();
