require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

/**
 * Debug script for specific client: 株式会社櫻井千田
 * Shows as 未収あり but drill-down shows ¥0 balance
 */

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function debugSpecificClient() {
    const startDate = '2025-12-01';
    const endDate = '2025-12-31';
    const hotelId = 41; // 士別
    const clientName = '株式会社櫻井千田';

    console.log('='.repeat(80));
    console.log('DEBUGGING SPECIFIC CLIENT STATUS');
    console.log('='.repeat(80));
    console.log('Client:', clientName);
    console.log('Hotel ID:', hotelId);
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        // 1. Get client data from hotel details query
        console.log('\n1. CLIENT DATA FROM HOTEL DETAILS QUERY');
        console.log('-'.repeat(80));

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
                COALESCE(rr.tax_rate, 0.10) as tax_rate,
                CASE 
                    WHEN rr.id IS NOT NULL THEN
                        CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END
                    ELSE 0
                END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY COALESCE(rr.tax_rate, 0.10) DESC, rr.id DESC NULLS LAST) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN res_list rl ON r.reservation_client_id = rl.reservation_client_id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
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
            ri.check_in,
            ri.is_ota_web,
            COALESCE(cs.month_sales, 0) as total_sales,
            COALESCE(cp.month_payments, 0) as total_payments,
            COALESCE(cp.advance_payments, 0) as advance_payments,
            COALESCE(cp.settlement_payments, 0) as settlement_payments,
            CASE 
                WHEN ABS(COALESCE(cp.cumulative_payments, 0) - COALESCE(cs.cumulative_sales, 0)) <= 1 THEN 0 
                ELSE COALESCE(cp.settlement_payments, 0) - COALESCE(cs.month_sales, 0) 
            END as difference,
            COALESCE(cs.cumulative_sales, 0) as cumulative_sales,
            COALESCE(cp.cumulative_payments, 0) as cumulative_payments,
            COALESCE(cp.cumulative_payments, 0) - COALESCE(cs.cumulative_sales, 0) as cumulative_difference
        FROM clients c
        JOIN res_list rl ON c.id = rl.reservation_client_id
        LEFT JOIN client_sales_agg cs ON c.id = cs.reservation_client_id
        LEFT JOIN client_payments_agg cp ON c.id = cp.reservation_client_id
        LEFT JOIN client_res_info ri ON c.id = ri.reservation_client_id
        WHERE COALESCE(c.name_kanji, c.name_kana, c.name) = $4
        `;

        const result = await pool.query(hotelDetailsQuery, [startDate, endDate, hotelId, clientName]);

        if (result.rows.length === 0) {
            console.log('Client not found!');
            return;
        }

        const client = result.rows[0];
        console.log('\nClient Data:');
        console.log('  Client ID:', client.client_id);
        console.log('  Client Name:', client.client_name);
        console.log('  Check-in:', client.check_in);
        console.log('  Is OTA/Web:', client.is_ota_web);
        console.log('\nFinancial Data:');
        console.log('  Month Sales:', Number(client.total_sales).toLocaleString(), '円');
        console.log('  Month Payments:', Number(client.total_payments).toLocaleString(), '円');
        console.log('    - Advance:', Number(client.advance_payments).toLocaleString(), '円');
        console.log('    - Settlement:', Number(client.settlement_payments).toLocaleString(), '円');
        console.log('  Month Difference:', Number(client.difference).toLocaleString(), '円');
        console.log('\nCumulative Data:');
        console.log('  Cumulative Sales:', Number(client.cumulative_sales).toLocaleString(), '円');
        console.log('  Cumulative Payments:', Number(client.cumulative_payments).toLocaleString(), '円');
        console.log('  Cumulative Difference:', Number(client.cumulative_difference).toLocaleString(), '円');

        // 2. Determine status based on cumulative_difference
        console.log('\n2. STATUS DETERMINATION');
        console.log('-'.repeat(80));

        const cumulativeDiff = Number(client.cumulative_difference);
        let status;
        let severity;

        if (Math.abs(cumulativeDiff) <= 1) {
            status = '精算済';
            severity = 'success';
        } else if (cumulativeDiff < -1) {
            status = '未収あり';
            severity = 'danger';
        } else {
            // Positive balance - check if it's advance payment
            const monthEnd = new Date(endDate);
            const checkInDate = new Date(client.check_in);
            if (checkInDate > monthEnd) {
                status = '事前払い';
                severity = 'warn';
            } else {
                status = '過入金';
                severity = 'warn';
            }
        }

        console.log('Cumulative Difference:', cumulativeDiff);
        console.log('Status:', status);
        console.log('Severity:', severity);

        // 3. Get reservation details
        console.log('\n3. RESERVATION DETAILS');
        console.log('-'.repeat(80));

        const reservationQuery = `
        WITH res_list AS (
            SELECT DISTINCT r.id
            FROM reservations r
            LEFT JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
            LEFT JOIN reservation_payments rp ON r.id = rp.reservation_id AND r.hotel_id = rp.hotel_id
            WHERE r.hotel_id = $1 AND r.reservation_client_id = $2
            AND (
                (rd.date BETWEEN $3 AND $4 AND rd.billable = TRUE)
                OR 
                (rp.date BETWEEN $3 AND $4)
            )
        ),
        rr_base AS (
            SELECT 
                r.id as reservation_id,
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
            JOIN res_list r ON rd.reservation_id = r.id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.billable = TRUE
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        res_sales_agg AS (
            SELECT 
                reservation_id,
                SUM(CASE WHEN date < $3 THEN amount ELSE 0 END) as prev_sales,
                SUM(CASE WHEN date BETWEEN $3 AND $4 THEN amount ELSE 0 END) as month_sales,
                SUM(CASE WHEN date <= $4 THEN amount ELSE 0 END) as cumulative_sales,
                SUM(amount) as total_sales
            FROM (
                SELECT 
                    b.reservation_id,
                    b.date,
                    CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
                FROM rr_base b
                JOIN rr_totals t ON b.rd_id = t.rd_id
                UNION ALL
                SELECT 
                    rd.reservation_id,
                    rd.date,
                    (ra.price * ra.quantity) as amount
                FROM reservation_addons ra
                JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
                JOIN res_list r ON rd.reservation_id = r.id
                WHERE rd.billable = TRUE
            ) s GROUP BY reservation_id
        ),
        res_payments_agg AS (
            SELECT 
                rp.reservation_id,
                SUM(CASE WHEN rp.date < $3 THEN rp.value ELSE 0 END) as prev_payments,
                SUM(CASE WHEN rp.date BETWEEN $3 AND $4 THEN rp.value ELSE 0 END) as month_payments,
                SUM(CASE WHEN rp.date <= $4 THEN rp.value ELSE 0 END) as cumulative_payments,
                SUM(rp.value) as total_payments
            FROM reservation_payments rp
            JOIN res_list rl ON rp.reservation_id = rl.id
            GROUP BY rp.reservation_id
        )
        SELECT 
            r.id as reservation_id,
            r.check_in,
            r.check_out,
            r.status,
            COALESCE(sa.month_sales, 0) as month_sales,
            COALESCE(pa.month_payments, 0) as month_payments,
            COALESCE(sa.cumulative_sales, 0) as cumulative_sales,
            COALESCE(pa.cumulative_payments, 0) as cumulative_payments,
            COALESCE(pa.cumulative_payments, 0) - COALESCE(sa.cumulative_sales, 0) as cumulative_difference,
            COALESCE(pa.prev_payments, 0) - COALESCE(sa.prev_sales, 0) as brought_forward_balance,
            COALESCE(sa.total_sales, 0) as total_sales,
            COALESCE(pa.total_payments, 0) as total_payments
        FROM res_list rl
        JOIN reservations r ON rl.id = r.id
        LEFT JOIN res_sales_agg sa ON rl.id = sa.reservation_id
        LEFT JOIN res_payments_agg pa ON rl.id = pa.reservation_id
        ORDER BY r.check_in DESC
        `;

        const resResult = await pool.query(reservationQuery, [hotelId, client.client_id, startDate, endDate]);

        console.log(`\nFound ${resResult.rows.length} reservation(s):`);
        resResult.rows.forEach((res, idx) => {
            console.log(`\n  Reservation ${idx + 1}:`);
            console.log(`    ID: ${res.reservation_id}`);
            console.log(`    Check-in: ${res.check_in}`);
            console.log(`    Check-out: ${res.check_out}`);
            console.log(`    Status: ${res.status}`);
            console.log(`    Month Sales: ${Number(res.month_sales).toLocaleString()} 円`);
            console.log(`    Month Payments: ${Number(res.month_payments).toLocaleString()} 円`);
            console.log(`    Cumulative Sales: ${Number(res.cumulative_sales).toLocaleString()} 円`);
            console.log(`    Cumulative Payments: ${Number(res.cumulative_payments).toLocaleString()} 円`);
            console.log(`    Cumulative Difference: ${Number(res.cumulative_difference).toLocaleString()} 円`);
            console.log(`    Brought Forward: ${Number(res.brought_forward_balance).toLocaleString()} 円`);
        });

        console.log('\n' + '='.repeat(80));
        console.log('ANALYSIS COMPLETE');
        console.log('='.repeat(80));

        if (Math.abs(cumulativeDiff) <= 1 && status !== '精算済') {
            console.log('\n⚠️  ISSUE FOUND:');
            console.log('Cumulative difference is ≤1 yen, but status is not showing as 精算済');
            console.log('Expected: 精算済');
            console.log('Actual:', status);
        } else if (Math.abs(cumulativeDiff) <= 1) {
            console.log('\n✓ Status is correct: 精算済');
        } else {
            console.log(`\n✓ Status is correct: ${status}`);
            console.log(`Cumulative difference: ${cumulativeDiff} 円`);
        }

    } catch (err) {
        console.error('Error during debug:', err);
    } finally {
        await pool.end();
    }
}

debugSpecificClient();
