/**
 * Script to check what data is returned by selectSalesByPlan
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

async function checkSalesByPlanData() {
    const hotelId = 15;
    const startDate = '2026-01-01';
    const endDate = '2026-01-31';

    console.log('='.repeat(80));
    console.log('Sales By Plan Data for Hotel ID:', hotelId);
    console.log('Period:', startDate, 'to', endDate);
    console.log('='.repeat(80));

    try {
        const query = `
            -- Plan Sales
            SELECT
              COALESCE(pg.name, ph.name, 'プラン未設定') AS plan_name,
              ph.plan_type_category_id,
              ph.plan_package_category_id,
              COALESCE(ptc.name, '未設定') AS plan_type_category_name,
              COALESCE(ppc.name, '未設定') AS plan_package_category_name,
              rd.cancelled IS NOT NULL AND rd.billable = TRUE AS is_cancelled_billable,
              SUM(
                CASE 
                  WHEN COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
                    CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END
                  ELSE 0 
                END
              ) AS accommodation_sales,
              SUM(
                CASE 
                  WHEN COALESCE(rd.is_accommodation, TRUE) = FALSE THEN 
                    CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END
                  ELSE 0 
                END
              ) AS other_sales,
              SUM(COALESCE(rr.accommodation_net_price, 0)) AS accommodation_sales_net,
              SUM(COALESCE(rr.other_net_price, 0)) AS other_sales_net
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
            LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
            LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
            LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
            LEFT JOIN (
                SELECT
                    hotel_id,
                    reservation_details_id,
                    SUM(accommodation_price) AS accommodation_price,
                    SUM(other_price) AS other_price,
                    SUM(accommodation_net_price) AS accommodation_net_price,
                    SUM(other_net_price) AS other_net_price
                FROM (
                    SELECT
                        rd_inner.hotel_id,
                        rd_inner.id AS reservation_details_id,
                        (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END) as normalized_rate,
                        SUM(CASE WHEN rd_inner.is_accommodation = TRUE AND (rr.sales_category = 'accommodation' OR rr.sales_category IS NULL) THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END) AS accommodation_price,
                        SUM(CASE WHEN rd_inner.is_accommodation = FALSE OR rr.sales_category = 'other' THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END) AS other_price,
                        FLOOR(SUM(CASE WHEN rd_inner.is_accommodation = TRUE AND (rr.sales_category = 'accommodation' OR rr.sales_category IS NULL) THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END)::numeric / (1 + (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END))::numeric) AS accommodation_net_price,
                        FLOOR(SUM(CASE WHEN rd_inner.is_accommodation = FALSE OR rr.sales_category = 'other' THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END)::numeric / (1 + (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END))::numeric) AS other_net_price
                    FROM
                        reservation_details rd_inner
                    LEFT JOIN reservation_rates rr ON rr.reservation_details_id = rd_inner.id AND rr.hotel_id = rd_inner.hotel_id
                    GROUP BY
                        rd_inner.hotel_id, rd_inner.id, (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END)
                ) AS per_detail_tax
                GROUP BY
                    hotel_id, reservation_details_id
            ) rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.hotel_id = $1
              AND rd.date BETWEEN $2 AND $3
              AND rd.billable = TRUE
              AND r.status NOT IN ('hold', 'block')
              AND r.type <> 'employee'
            GROUP BY
              pg.name, ph.name, ph.plan_type_category_id, ph.plan_package_category_id, 
              ptc.name, ppc.name, is_cancelled_billable

            UNION ALL

            -- Addon Sales by Type and Tax
            SELECT
              'アドオン：' || CASE ra.addon_type
                WHEN 'breakfast' THEN '朝食'
                WHEN 'lunch' THEN '昼食'
                WHEN 'dinner' THEN '夕食'
                WHEN 'parking' THEN '駐車場'
                WHEN 'other' THEN 'その他'
                ELSE ra.addon_type
              END || '(' || (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) ELSE COALESCE(ra.tax_rate, 0) * 100 END)::integer::text || '%)' AS plan_name,
              NULL AS plan_type_category_id,
              NULL AS plan_package_category_id,
              'アドオン' AS plan_type_category_name,
              CASE ra.addon_type
                WHEN 'breakfast' THEN '朝食'
                WHEN 'lunch' THEN '昼食'
                WHEN 'dinner' THEN '夕食'
                WHEN 'parking' THEN '駐車場'
                WHEN 'other' THEN 'その他'
                ELSE ra.addon_type
              END AS plan_package_category_name,
              rd.cancelled IS NOT NULL AND rd.billable = TRUE AS is_cancelled_billable,
              SUM(CASE WHEN ra.sales_category = 'accommodation' OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END) AS accommodation_sales,
              SUM(CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END) AS other_sales,
              FLOOR(SUM(CASE WHEN ra.sales_category = 'accommodation' OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END)::numeric / (1 + (CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END))::numeric) AS accommodation_sales_net,
              FLOOR(SUM(CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END)::numeric / (1 + (CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END))::numeric) AS other_sales_net
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN reservation_addons ra ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
            WHERE rd.hotel_id = $1
              AND rd.date BETWEEN $2 AND $3
              AND rd.billable = TRUE
              AND r.status NOT IN ('hold', 'block')
              AND r.type <> 'employee'
            GROUP BY
              ra.addon_type,
              ra.tax_rate,
              is_cancelled_billable
            HAVING SUM(ra.price * ra.quantity) <> 0

            ORDER BY
              plan_name, is_cancelled_billable;
        `;

        const result = await pool.query(query, [hotelId, startDate, endDate]);
        
        console.log('\nTotal rows returned:', result.rows.length);
        console.log('\n' + '='.repeat(80));
        
        let totalAccommodation = 0;
        let totalOther = 0;
        let totalAccommodationNet = 0;
        let totalOtherNet = 0;
        
        result.rows.forEach((row, index) => {
            const accom = parseFloat(row.accommodation_sales || 0);
            const other = parseFloat(row.other_sales || 0);
            const accomNet = parseFloat(row.accommodation_sales_net || 0);
            const otherNet = parseFloat(row.other_sales_net || 0);
            
            totalAccommodation += accom;
            totalOther += other;
            totalAccommodationNet += accomNet;
            totalOtherNet += otherNet;
            
            console.log(`\nRow ${index + 1}:`);
            console.log('  Plan Name:', row.plan_name);
            console.log('  Type Category:', row.plan_type_category_name);
            console.log('  Package Category:', row.plan_package_category_name);
            console.log('  Is Cancelled:', row.is_cancelled_billable);
            console.log('  Accommodation Sales:', accom.toLocaleString('ja-JP'), '円');
            console.log('  Other Sales:', other.toLocaleString('ja-JP'), '円');
            console.log('  Accommodation Sales (Net):', accomNet.toLocaleString('ja-JP'), '円');
            console.log('  Other Sales (Net):', otherNet.toLocaleString('ja-JP'), '円');
            console.log('  Total:', (accom + other).toLocaleString('ja-JP'), '円');
        });
        
        console.log('\n' + '='.repeat(80));
        console.log('TOTALS:');
        console.log('  Total Accommodation Sales:', totalAccommodation.toLocaleString('ja-JP'), '円');
        console.log('  Total Other Sales:', totalOther.toLocaleString('ja-JP'), '円');
        console.log('  Total Accommodation Sales (Net):', totalAccommodationNet.toLocaleString('ja-JP'), '円');
        console.log('  Total Other Sales (Net):', totalOtherNet.toLocaleString('ja-JP'), '円');
        console.log('  Grand Total:', (totalAccommodation + totalOther).toLocaleString('ja-JP'), '円');
        console.log('  Grand Total (Net):', (totalAccommodationNet + totalOtherNet).toLocaleString('ja-JP'), '円');
        console.log('\n  Expected Total: 8,975,100 円');
        console.log('  Match:', (totalAccommodation + totalOther) === 8975100 ? '✓' : '✗');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkSalesByPlanData();
