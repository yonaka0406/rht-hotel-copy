require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

/**
 * Find the missing ¥5,900 in 株式会社手塚産業's cumulative sales
 * cumulative_sales shows ¥636,400 but visible reservations only total ¥630,500
 */

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function findMissing5900() {
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';
    const hotelId = 41;
    const clientId = 'f7eb5fe8-c6d4-43ee-b546-46918af8239b'; // 株式会社手塚産業

    console.log('='.repeat(80));
    console.log('FINDING MISSING ¥5,900');
    console.log('='.repeat(80));
    console.log('Client ID:', clientId);
    console.log('Expected cumulative_sales: ¥636,400');
    console.log('Visible reservations total: ¥630,500');
    console.log('Missing: ¥5,900');
    console.log('='.repeat(80));

    try {
        // Get ALL reservations for this client at this hotel
        const allReservationsQuery = `
            SELECT 
                r.id,
                r.check_in,
                r.check_out,
                r.status,
                r.type,
                (
                    SELECT SUM(
                        CASE WHEN rd.plan_type = 'per_room' 
                        THEN rd.price 
                        ELSE rd.price * rd.number_of_people 
                        END
                    )
                    FROM reservation_details rd
                    WHERE rd.reservation_id = r.id
                    AND rd.hotel_id = r.hotel_id
                    AND rd.billable = TRUE
                    AND rd.date <= $3
                ) as cumulative_sales,
                (
                    SELECT SUM(
                        CASE WHEN rd.plan_type = 'per_room' 
                        THEN rd.price 
                        ELSE rd.price * rd.number_of_people 
                        END
                    )
                    FROM reservation_details rd
                    WHERE rd.reservation_id = r.id
                    AND rd.hotel_id = r.hotel_id
                    AND rd.billable = TRUE
                    AND rd.date BETWEEN $2 AND $3
                ) as month_sales,
                (
                    SELECT SUM(rp.value)
                    FROM reservation_payments rp
                    WHERE rp.reservation_id = r.id
                    AND rp.hotel_id = r.hotel_id
                    AND rp.date <= $3
                ) as cumulative_payments,
                (
                    SELECT SUM(rp.value)
                    FROM reservation_payments rp
                    WHERE rp.reservation_id = r.id
                    AND rp.hotel_id = r.hotel_id
                    AND rp.date BETWEEN $2 AND $3
                ) as month_payments,
                (
                    SELECT COUNT(*)
                    FROM reservation_details rd
                    WHERE rd.reservation_id = r.id
                    AND rd.hotel_id = r.hotel_id
                    AND rd.billable = TRUE
                    AND rd.date BETWEEN $2 AND $3
                ) as has_december_sales,
                (
                    SELECT COUNT(*)
                    FROM reservation_payments rp
                    WHERE rp.reservation_id = r.id
                    AND rp.hotel_id = r.hotel_id
                    AND rp.date BETWEEN $2 AND $3
                ) as has_december_payments
            FROM reservations r
            WHERE r.hotel_id = $1
            AND r.reservation_client_id = $4
            ORDER BY r.check_in DESC
        `;

        const result = await pool.query(allReservationsQuery, [hotelId, startDate, endDate, clientId]);

        console.log(`\nFound ${result.rows.length} total reservation(s) for this client:\n`);

        let totalCumulativeSales = 0;
        let totalMonthSales = 0;
        let visibleReservations = 0;

        result.rows.forEach((res, idx) => {
            const cumulativeSales = Number(res.cumulative_sales || 0);
            const monthSales = Number(res.month_sales || 0);
            const cumulativePayments = Number(res.cumulative_payments || 0);
            const monthPayments = Number(res.month_payments || 0);
            const hasDecActivity = res.has_december_sales > 0 || res.has_december_payments > 0;

            console.log(`${idx + 1}. Reservation ${res.id.substring(0, 8)}`);
            console.log(`   Check-in: ${res.check_in?.toISOString().split('T')[0]}`);
            console.log(`   Status: ${res.status}, Type: ${res.type}`);
            console.log(`   Month Sales: ¥${monthSales.toLocaleString()}`);
            console.log(`   Month Payments: ¥${monthPayments.toLocaleString()}`);
            console.log(`   Cumulative Sales: ¥${cumulativeSales.toLocaleString()}`);
            console.log(`   Cumulative Payments: ¥${cumulativePayments.toLocaleString()}`);
            console.log(`   Has December Activity: ${hasDecActivity ? 'YES' : 'NO'}`);
            console.log(`   Should be visible in drill-down: ${hasDecActivity ? 'YES' : 'NO'}`);
            console.log('');

            if (hasDecActivity) {
                totalCumulativeSales += cumulativeSales;
                totalMonthSales += monthSales;
                visibleReservations++;
            }
        });

        console.log('='.repeat(80));
        console.log('SUMMARY');
        console.log('='.repeat(80));
        console.log(`Total reservations: ${result.rows.length}`);
        console.log(`Visible reservations (with Dec activity): ${visibleReservations}`);
        console.log(`Total cumulative sales (visible): ¥${totalCumulativeSales.toLocaleString()}`);
        console.log(`Total month sales (visible): ¥${totalMonthSales.toLocaleString()}`);
        console.log('');
        console.log(`Expected cumulative_sales from API: ¥636,400`);
        console.log(`Calculated cumulative_sales: ¥${totalCumulativeSales.toLocaleString()}`);
        console.log(`Difference: ¥${(636400 - totalCumulativeSales).toLocaleString()}`);

        if (Math.abs(636400 - totalCumulativeSales) > 1) {
            console.log('\n⚠️  DISCREPANCY FOUND!');
            console.log('The simple calculation doesn\'t match the API result.');
            console.log('This suggests the API is using reservation_rates, not just rd.price');
        } else {
            console.log('\n✓ Totals match!');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

findMissing5900();
