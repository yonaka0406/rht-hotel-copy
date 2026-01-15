require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const { Pool } = require('pg');

/**
 * Debug script to find the ¥79,200 discrepancy in 士別 sales
 * Header shows: ¥4,207,100
 * Table sum: ¥4,127,900
 * Difference: ¥79,200
 */

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function debugShibetsuSalesDiscrepancy() {
    // Adjust these parameters to match your test
    const startDate = '2025-12-01'; // Adjust to your test month
    const endDate = '2025-12-31';
    const hotelId = 1; // Assuming 士別 is hotel_id 1, adjust if needed

    console.log('='.repeat(80));
    console.log('DEBUGGING 士別 SALES DISCREPANCY');
    console.log('='.repeat(80));
    console.log('Period:', startDate, 'to', endDate);
    console.log('Hotel ID:', hotelId);
    console.log('');
    console.log('REPORTED ISSUE:');
    console.log('  Header shows:  ¥4,207,100');
    console.log('  Table sum:     ¥4,127,900');
    console.log('  Discrepancy:   ¥79,200');
    console.log('');
    console.log('HYPOTHESIS:');
    console.log('  The hotel details query uses INNER JOIN on reservation_rates,');
    console.log('  which excludes reservation_details without rates.');
    console.log('  The overview query uses LEFT JOIN, including all details.');
    console.log('='.repeat(80));

    try {
        // 1. Get the OVERVIEW calculation (what the header shows)
        console.log('\n1. OVERVIEW CALCULATION (Header Value)');
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
            AND rd.hotel_id = $3
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
                AND rd.hotel_id = $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ) s GROUP BY hotel_id, reservation_client_id
        ),
        client_payments_agg AS (
            SELECT 
                rp.hotel_id, 
                r.reservation_client_id,
                SUM(rp.value) as month_payments
            FROM reservation_payments rp
            JOIN reservations r ON rp.reservation_id = r.id AND rp.hotel_id = r.hotel_id
            WHERE rp.date BETWEEN $1 AND $2 
            AND rp.hotel_id = $3
            GROUP BY rp.hotel_id, r.reservation_client_id
        ),
        client_list AS (
            SELECT DISTINCT hotel_id, reservation_client_id FROM client_sales_agg
            UNION
            SELECT DISTINCT hotel_id, reservation_client_id FROM client_payments_agg
        )
        SELECT 
            COALESCE(SUM(cs.month_sales), 0) as total_sales,
            COUNT(DISTINCT cl.reservation_client_id) as client_count
        FROM client_list cl
        LEFT JOIN client_sales_agg cs ON cl.hotel_id = cs.hotel_id AND cl.reservation_client_id = cs.reservation_client_id
        WHERE cl.hotel_id = $3
        `;

        const overviewResult = await pool.query(overviewQuery, [startDate, endDate, hotelId]);
        const overviewSales = Number(overviewResult.rows[0].total_sales);
        const overviewClientCount = Number(overviewResult.rows[0].client_count);

        console.log('Overview Total Sales:', overviewSales.toLocaleString(), '円');
        console.log('Overview Client Count:', overviewClientCount);

        // 2. Get the HOTEL DETAILS calculation (what the table shows)
        console.log('\n2. HOTEL DETAILS CALCULATION (Table Values)');
        console.log('-'.repeat(80));

        const hotelDetailsQuery = `
        WITH res_list AS (
            -- Step 1: Find all clients with activity in the hotel during the month
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
        )
        SELECT 
            c.id as client_id,
            COALESCE(c.name_kanji, c.name_kana, c.name) as client_name,
            COALESCE(cs.month_sales, 0) as total_sales
        FROM clients c
        JOIN res_list rl ON c.id = rl.reservation_client_id
        LEFT JOIN client_sales_agg cs ON c.id = cs.reservation_client_id
        ORDER BY client_name
        `;

        const hotelDetailsResult = await pool.query(hotelDetailsQuery, [startDate, endDate, hotelId]);
        const tableSales = hotelDetailsResult.rows.reduce((sum, row) => sum + Number(row.total_sales), 0);
        const tableClientCount = hotelDetailsResult.rows.length;

        console.log('Table Total Sales:', tableSales.toLocaleString(), '円');
        console.log('Table Client Count:', tableClientCount);

        console.log('\nClients in table:');
        hotelDetailsResult.rows.forEach(row => {
            console.log(`  ${row.client_name}: ${Number(row.total_sales).toLocaleString()} 円`);
        });

        // 3. Find the difference
        console.log('\n3. DISCREPANCY ANALYSIS');
        console.log('-'.repeat(80));

        const salesDiff = overviewSales - tableSales;
        const clientCountDiff = overviewClientCount - tableClientCount;

        console.log('Sales Difference:', salesDiff.toLocaleString(), '円');
        console.log('Client Count Difference:', clientCountDiff);

        if (Math.abs(salesDiff) > 1) {
            console.log('\n⚠️  DISCREPANCY FOUND!');
            console.log('The overview and hotel details queries are producing different results.');
            
            // 4. Find clients that are in overview but not in hotel details
            console.log('\n4. FINDING MISSING CLIENTS');
            console.log('-'.repeat(80));

            const missingClientsQuery = `
            WITH overview_clients AS (
                SELECT DISTINCT r.reservation_client_id
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                WHERE rd.date BETWEEN $1 AND $2
                AND rd.hotel_id = $3
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            hotel_details_clients AS (
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
            missing_clients AS (
                SELECT oc.reservation_client_id
                FROM overview_clients oc
                LEFT JOIN hotel_details_clients hdc ON oc.reservation_client_id = hdc.reservation_client_id
                WHERE hdc.reservation_client_id IS NULL
            )
            SELECT 
                c.id,
                COALESCE(c.name_kanji, c.name_kana, c.name) as client_name,
                (
                    SELECT SUM(
                        CASE WHEN rd.plan_type = 'per_room' 
                        THEN rd.price 
                        ELSE rd.price * rd.number_of_people 
                        END
                    )
                    FROM reservation_details rd
                    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                    WHERE r.reservation_client_id = c.id
                    AND rd.hotel_id = $3
                    AND rd.date BETWEEN $1 AND $2
                    AND rd.billable = TRUE
                    AND r.status NOT IN ('hold', 'block')
                    AND r.type <> 'employee'
                ) as sales_amount
            FROM clients c
            JOIN missing_clients mc ON c.id = mc.reservation_client_id
            `;

            const missingClientsResult = await pool.query(missingClientsQuery, [startDate, endDate, hotelId]);

            if (missingClientsResult.rows.length > 0) {
                console.log('\nClients in OVERVIEW but NOT in HOTEL DETAILS:');
                let missingSalesTotal = 0;
                missingClientsResult.rows.forEach(row => {
                    const sales = Number(row.sales_amount || 0);
                    missingSalesTotal += sales;
                    console.log(`  ${row.client_name}: ${sales.toLocaleString()} 円`);
                });
                console.log(`\nTotal missing sales: ${missingSalesTotal.toLocaleString()} 円`);
                
                if (Math.abs(missingSalesTotal - salesDiff) < 1) {
                    console.log('✓ This explains the discrepancy!');
                }

                // Check why these clients are missing
                console.log('\n5. WHY ARE THESE CLIENTS MISSING?');
                console.log('-'.repeat(80));
                console.log('Checking if these clients have NO payments in the target month...');

                for (const client of missingClientsResult.rows) {
                    const paymentCheckQuery = `
                        SELECT COUNT(*) as payment_count
                        FROM reservation_payments rp
                        JOIN reservations r ON rp.reservation_id = r.id AND rp.hotel_id = r.hotel_id
                        WHERE r.reservation_client_id = $1
                        AND rp.hotel_id = $2
                        AND rp.date BETWEEN $3 AND $4
                    `;
                    const paymentCheck = await pool.query(paymentCheckQuery, [client.id, hotelId, startDate, endDate]);
                    const hasPayments = Number(paymentCheck.rows[0].payment_count) > 0;
                    
                    console.log(`  ${client.client_name}: ${hasPayments ? 'HAS payments' : 'NO payments'}`);
                }

                // Check for reservation_details without rates
                console.log('\n6. CHECKING FOR RESERVATION_DETAILS WITHOUT RATES');
                console.log('-'.repeat(80));
                
                const noRatesQuery = `
                    SELECT 
                        r.reservation_client_id,
                        c.name_kanji,
                        rd.id as rd_id,
                        rd.date,
                        rd.price,
                        rd.number_of_people,
                        rd.plan_type,
                        CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_price
                    FROM reservation_details rd
                    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                    JOIN clients c ON r.reservation_client_id = c.id
                    LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                    WHERE rd.hotel_id = $1
                    AND rd.date BETWEEN $2 AND $3
                    AND rd.billable = TRUE
                    AND r.status NOT IN ('hold', 'block')
                    AND r.type <> 'employee'
                    AND rr.id IS NULL
                    ORDER BY r.reservation_client_id, rd.date
                `;
                
                const noRatesResult = await pool.query(noRatesQuery, [hotelId, startDate, endDate]);
                
                if (noRatesResult.rows.length > 0) {
                    console.log(`\nFound ${noRatesResult.rows.length} reservation_details WITHOUT reservation_rates:`);
                    
                    const clientTotals = {};
                    noRatesResult.rows.forEach(row => {
                        const clientId = row.reservation_client_id;
                        const clientName = row.name_kanji;
                        const price = Number(row.total_price);
                        
                        if (!clientTotals[clientId]) {
                            clientTotals[clientId] = { name: clientName, total: 0, count: 0 };
                        }
                        clientTotals[clientId].total += price;
                        clientTotals[clientId].count += 1;
                    });
                    
                    console.log('\nGrouped by client:');
                    let totalMissing = 0;
                    Object.entries(clientTotals).forEach(([clientId, data]) => {
                        console.log(`  ${data.name}: ${data.total.toLocaleString()} 円 (${data.count} details)`);
                        totalMissing += data.total;
                    });
                    
                    console.log(`\nTotal sales from details without rates: ${totalMissing.toLocaleString()} 円`);
                    
                    if (Math.abs(totalMissing - salesDiff) < 1) {
                        console.log('✓ This EXACTLY explains the discrepancy!');
                        console.log('\nSOLUTION: Change INNER JOIN to LEFT JOIN on reservation_rates in hotel details query.');
                    }
                } else {
                    console.log('\nNo reservation_details without rates found.');
                }
            } else {
                console.log('\nNo missing clients found. The issue might be in the aggregation logic.');
            }
        } else {
            console.log('\n✓ No significant discrepancy found.');
        }

        console.log('\n' + '='.repeat(80));
        console.log('DEBUG COMPLETE');
        console.log('='.repeat(80));

    } catch (err) {
        console.error('Error during debug:', err);
    } finally {
        await pool.end();
    }
}

debugShibetsuSalesDiscrepancy();
