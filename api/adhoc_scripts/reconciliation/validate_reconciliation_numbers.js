require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

/**
 * Validation script for reconciliation page calculations
 * This script validates that the numbers displayed on the reconciliation page are correct
 */

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function validateReconciliationNumbers() {
    // Use December 2025 as example - adjust as needed
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';
    const hotelIds = [1, 2, 3, 4, 5]; // Adjust based on your hotels

    console.log('='.repeat(80));
    console.log('RECONCILIATION PAGE VALIDATION');
    console.log('='.repeat(80));
    console.log('Period:', startDate, 'to', endDate);
    console.log('Hotels:', hotelIds.join(', '));
    console.log('='.repeat(80));

    try {
        // 1. Get Overview Data (施設別 差異一覧)
        console.log('\n1. OVERVIEW - 施設別 差異一覧');
        console.log('-'.repeat(80));

        const overviewQuery = `
        WITH rr_base AS (
            SELECT 
                rd.hotel_id,
                r.reservation_client_id,
                rd.id as rd_id,
                rd.date,
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
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        client_sales_agg AS (
            SELECT 
                hotel_id,
                reservation_client_id,
                SUM(CASE WHEN date BETWEEN $1 AND $2 THEN amount ELSE 0 END) as month_sales,
                SUM(CASE WHEN date <= $2 THEN amount ELSE 0 END) as cumulative_sales
            FROM (
                SELECT 
                    b.hotel_id,
                    b.reservation_client_id,
                    b.date,
                    CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
                FROM rr_base b
                JOIN rr_totals t ON b.rd_id = t.rd_id
                UNION ALL
                SELECT 
                    rd.hotel_id,
                    r.reservation_client_id,
                    rd.date,
                    (ra.price * ra.quantity) as amount
                FROM reservation_addons ra
                JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                WHERE rd.date BETWEEN $1 AND $2
                AND rd.hotel_id = ANY($3::int[])
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ) s GROUP BY hotel_id, reservation_client_id
        ),
        client_payments_agg AS (
            SELECT 
                rp.hotel_id, 
                r.reservation_client_id,
                SUM(rp.value) as month_payments,
                SUM(CASE WHEN r.check_in > $2 THEN rp.value ELSE 0 END) as advance_payments,
                SUM(CASE WHEN r.check_in <= $2 THEN rp.value ELSE 0 END) as settlement_payments,
                SUM(CASE WHEN rp.date <= $2 THEN rp.value ELSE 0 END) as cumulative_payments
            FROM reservation_payments rp
            JOIN reservations r ON rp.reservation_id = r.id AND rp.hotel_id = r.hotel_id
            WHERE rp.date BETWEEN $1 AND $2 
            AND rp.hotel_id = ANY($3::int[])
            GROUP BY rp.hotel_id, r.reservation_client_id
        ),
        client_list AS (
            SELECT DISTINCT hotel_id, reservation_client_id FROM client_sales_agg
            UNION
            SELECT DISTINCT hotel_id, reservation_client_id FROM client_payments_agg
        )
        SELECT 
            h.id as hotel_id,
            h.name as hotel_name,
            COALESCE(SUM(cs.month_sales), 0) as total_sales,
            COALESCE(SUM(cp.month_payments), 0) as total_payments,
            COALESCE(SUM(cp.advance_payments), 0) as advance_payments,
            COALESCE(SUM(cp.settlement_payments), 0) as settlement_payments,
            COALESCE(SUM(
                CASE 
                    WHEN ABS(COALESCE(cp.cumulative_payments, 0) - COALESCE(cs.cumulative_sales, 0)) <= 1 THEN 0 
                    ELSE COALESCE(cp.settlement_payments, 0) - COALESCE(cs.month_sales, 0) 
                END
            ), 0) as difference
        FROM hotels h
        JOIN client_list cl ON h.id = cl.hotel_id
        LEFT JOIN client_sales_agg cs ON cl.hotel_id = cs.hotel_id AND cl.reservation_client_id = cs.reservation_client_id
        LEFT JOIN client_payments_agg cp ON cl.hotel_id = cp.hotel_id AND cl.reservation_client_id = cp.reservation_client_id
        WHERE h.id = ANY($3::int[])
        GROUP BY h.id, h.name
        ORDER BY h.id
        `;

        const overviewResult = await pool.query(overviewQuery, [startDate, endDate, hotelIds]);

        let totalSales = 0;
        let totalPayments = 0;
        let totalAdvance = 0;
        let totalSettlement = 0;
        let totalDifference = 0;

        console.log('\n施設別内訳:');
        overviewResult.rows.forEach(row => {
            console.log(`\n  ${row.hotel_name}:`);
            console.log(`    売上計上:     ${Number(row.total_sales).toLocaleString()} 円`);
            console.log(`    入金額:       ${Number(row.total_payments).toLocaleString()} 円`);
            console.log(`      - 事前払:   ${Number(row.advance_payments).toLocaleString()} 円`);
            console.log(`      - 精算等:   ${Number(row.settlement_payments).toLocaleString()} 円`);
            console.log(`    精算差異:     ${Number(row.difference).toLocaleString()} 円`);

            totalSales += Number(row.total_sales);
            totalPayments += Number(row.total_payments);
            totalAdvance += Number(row.advance_payments);
            totalSettlement += Number(row.settlement_payments);
            totalDifference += Number(row.difference);
        });

        console.log('\n' + '='.repeat(80));
        console.log('合計 (Summary Cards):');
        console.log('  合計売上 (税込):  ', totalSales.toLocaleString(), '円');
        console.log('  合計入金:         ', totalPayments.toLocaleString(), '円');
        console.log('    - 事前払:       ', totalAdvance.toLocaleString(), '円');
        console.log('    - 精算等:       ', totalSettlement.toLocaleString(), '円');
        console.log('  精算差異:         ', totalDifference.toLocaleString(), '円');
        console.log('='.repeat(80));

        // 2. Validation: Check if totals match
        console.log('\n2. VALIDATION CHECKS');
        console.log('-'.repeat(80));

        // Check: Total Payments = Advance + Settlement
        const paymentsCheck = Math.abs(totalPayments - (totalAdvance + totalSettlement));
        console.log(`\n✓ 入金合計 = 事前払 + 精算等?`);
        console.log(`  ${totalPayments.toLocaleString()} = ${totalAdvance.toLocaleString()} + ${totalSettlement.toLocaleString()}`);
        console.log(`  差異: ${paymentsCheck.toLocaleString()} 円 ${paymentsCheck < 1 ? '✓ OK' : '✗ ERROR'}`);

        // Check: Difference = Sales - Settlement
        const differenceCheck = Math.abs(totalDifference - (totalSales - totalSettlement));
        console.log(`\n✓ 精算差異 = 売上 - 精算等?`);
        console.log(`  ${totalDifference.toLocaleString()} = ${totalSales.toLocaleString()} - ${totalSettlement.toLocaleString()}`);
        console.log(`  差異: ${differenceCheck.toLocaleString()} 円 ${differenceCheck < 1 ? '✓ OK' : '✗ ERROR'}`);

        // 3. Sample Hotel Details Validation
        console.log('\n3. SAMPLE HOTEL DETAILS VALIDATION');
        console.log('-'.repeat(80));
        
        if (overviewResult.rows.length > 0) {
            const sampleHotel = overviewResult.rows[0];
            console.log(`\nValidating: ${sampleHotel.hotel_name} (ID: ${sampleHotel.hotel_id})`);
            
            const hotelDetailsQuery = `
            WITH res_list AS (
                SELECT DISTINCT r.reservation_client_id
                FROM reservations r
                LEFT JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
                LEFT JOIN reservation_payments rp ON r.id = rp.reservation_id AND r.hotel_id = rp.hotel_id
                WHERE r.hotel_id = $3
                AND (
                    (rd.date BETWEEN $1 AND $2 AND rd.billable = TRUE)
                    OR 
                    (rp.date BETWEEN $1 AND $2)
                )
            ),
            client_res_info AS (
                SELECT 
                    r.reservation_client_id,
                    MIN(r.check_in) as check_in,
                    BOOL_OR(r.type IN ('web', 'ota')) as is_ota_web
                FROM reservations r
                JOIN res_list rl ON r.reservation_client_id = rl.reservation_client_id
                WHERE r.hotel_id = $3
                GROUP BY r.reservation_client_id
            ),
            rr_base AS (
                SELECT 
                    r.reservation_client_id,
                    rd.id as rd_id,
                    rd.date,
                    CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
                    rr.id as rr_id,
                    CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END as rr_price,
                    ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                JOIN res_list rl ON r.reservation_client_id = rl.reservation_client_id
                JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                WHERE rd.hotel_id = $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            rr_totals AS (
                SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
            ),
            client_sales_agg AS (
                SELECT 
                    reservation_client_id,
                    SUM(CASE WHEN date BETWEEN $1 AND $2 THEN amount ELSE 0 END) as month_sales,
                    SUM(CASE WHEN date <= $2 THEN amount ELSE 0 END) as cumulative_sales
                FROM (
                    SELECT 
                        b.reservation_client_id,
                        b.date,
                        CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
                    FROM rr_base b
                    JOIN rr_totals t ON b.rd_id = t.rd_id
                    UNION ALL
                    SELECT 
                        r.reservation_client_id,
                        rd.date,
                        (ra.price * ra.quantity) as amount
                    FROM reservation_addons ra
                    JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
                    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                    JOIN res_list rl ON r.reservation_client_id = rl.reservation_client_id
                    WHERE rd.hotel_id = $3
                    AND rd.billable = TRUE
                ) s GROUP BY reservation_client_id
            ),
            client_payments_agg AS (
                SELECT 
                    r.reservation_client_id,
                    SUM(CASE WHEN rp.date BETWEEN $1 AND $2 THEN rp.value ELSE 0 END) as month_payments,
                    SUM(CASE WHEN rp.date BETWEEN $1 AND $2 AND r.check_in > $2 THEN rp.value ELSE 0 END) as advance_payments,
                    SUM(CASE WHEN rp.date BETWEEN $1 AND $2 AND r.check_in <= $2 THEN rp.value ELSE 0 END) as settlement_payments,
                    SUM(CASE WHEN rp.date <= $2 THEN rp.value ELSE 0 END) as cumulative_payments
                FROM reservation_payments rp
                JOIN reservations r ON rp.reservation_id = r.id AND rp.hotel_id = r.hotel_id
                JOIN res_list rl ON r.reservation_client_id = rl.reservation_client_id
                WHERE rp.hotel_id = $3
                GROUP BY r.reservation_client_id
            )
            SELECT 
                c.id as client_id,
                COALESCE(c.name_kanji, c.name_kana, c.name) as client_name,
                COALESCE(cs.month_sales, 0) as total_sales,
                COALESCE(cp.month_payments, 0) as total_payments,
                COALESCE(cp.advance_payments, 0) as advance_payments,
                COALESCE(cp.settlement_payments, 0) as settlement_payments,
                CASE 
                    WHEN ABS(COALESCE(cp.cumulative_payments, 0) - COALESCE(cs.cumulative_sales, 0)) <= 1 THEN 0 
                    ELSE COALESCE(cp.settlement_payments, 0) - COALESCE(cs.month_sales, 0) 
                END as difference,
                COALESCE(cp.cumulative_payments, 0) - COALESCE(cs.cumulative_sales, 0) as cumulative_difference
            FROM clients c
            JOIN res_list rl ON c.id = rl.reservation_client_id
            LEFT JOIN client_sales_agg cs ON c.id = cs.reservation_client_id
            LEFT JOIN client_payments_agg cp ON c.id = cp.reservation_client_id
            LEFT JOIN client_res_info ri ON c.id = ri.reservation_client_id
            ORDER BY ABS(COALESCE(cp.month_payments, 0) - COALESCE(cs.month_sales, 0)) DESC
            LIMIT 5
            `;

            const hotelDetailsResult = await pool.query(hotelDetailsQuery, [startDate, endDate, sampleHotel.hotel_id]);

            console.log(`\nTop 5 clients with largest differences:`);
            hotelDetailsResult.rows.forEach((client, idx) => {
                console.log(`\n  ${idx + 1}. ${client.client_name}:`);
                console.log(`     今月売上:     ${Number(client.total_sales).toLocaleString()} 円`);
                console.log(`     今月入金:     ${Number(client.total_payments).toLocaleString()} 円`);
                console.log(`       - 事前払:   ${Number(client.advance_payments).toLocaleString()} 円`);
                console.log(`       - 精算等:   ${Number(client.settlement_payments).toLocaleString()} 円`);
                console.log(`     当月精算差異: ${Number(client.difference).toLocaleString()} 円`);
                console.log(`     累計差異:     ${Number(client.cumulative_difference).toLocaleString()} 円`);
            });

            // Validate hotel totals match overview
            const hotelTotalSales = hotelDetailsResult.rows.reduce((sum, c) => sum + Number(c.total_sales), 0);
            const hotelTotalPayments = hotelDetailsResult.rows.reduce((sum, c) => sum + Number(c.total_payments), 0);
            
            console.log(`\n✓ Sample validation (top 5 clients only):`);
            console.log(`  売上合計: ${hotelTotalSales.toLocaleString()} 円`);
            console.log(`  入金合計: ${hotelTotalPayments.toLocaleString()} 円`);
        }

        console.log('\n' + '='.repeat(80));
        console.log('VALIDATION COMPLETE');
        console.log('='.repeat(80));

    } catch (err) {
        console.error('Error during validation:', err);
    } finally {
        await pool.end();
    }
}

validateReconciliationNumbers();
