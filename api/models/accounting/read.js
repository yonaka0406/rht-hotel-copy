const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const getAccountCodes = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT * FROM acc_account_codes 
        ORDER BY code::BIGINT ASC
    `;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving account codes:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getMappings = async (requestId, hotel_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    // Fetch mappings for the specific hotel AND global mappings (hotel_id IS NULL)
    // We might want to filter or prioritize in the query, but fetching all relevant is safer.
    const query = `
        SELECT am.*, ac.code as account_code, ac.name as account_name, ac.category1 as account_category
        FROM acc_accounting_mappings am
        JOIN acc_account_codes ac ON am.account_code_id = ac.id
        WHERE am.hotel_id = $1 OR am.hotel_id IS NULL
        ORDER BY am.target_type, am.hotel_id NULLS FIRST -- Global first, then specific
    `;
    const values = [hotel_id];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving accounting mappings:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get aggregated ledger data for preview and export
 * @param {string} requestId 
 * @param {object} filters { startDate, endDate, hotelIds, planTypeCategoryIds }
 * @param {object} dbClient Optional database client for transactions
 */
const getLedgerPreview = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { startDate, endDate, hotelIds } = filters;

    const query = `
        WITH rr_base AS (
            /* Get all rate lines and identify the one with the highest tax rate per detail */
            /* We include billable cancelled reservations here if they have rates (cancel fees) */
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
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            /* Calculate the sum of rate prices to detect discrepancies */
            SELECT rd_id, SUM(rr_price) as sum_rr_price
            FROM rr_base
            GROUP BY rd_id
        ),
        plan_sales AS (
            /* Combined adjusted plan sales */
            SELECT 
                b.hotel_id,
                'plan' as source_type,
                b.plans_hotel_id as target_id,
                b.plan_type_category_id,
                CASE 
                    WHEN b.is_cancelled THEN 'キャンセル' 
                    WHEN b.plan_name LIKE '%マンスリー%' THEN COALESCE(b.category_name || ' - ', '') || 'マンスリー'
                    ELSE COALESCE(b.category_name, b.plan_name)
                END as display_name,
                b.tax_rate,
                CASE 
                    WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price)
                    ELSE b.rr_price
                END as amount,
                b.is_cancelled
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        ),
        addon_sales AS (
            /* Get addon sales */
            SELECT 
                ra.hotel_id,
                'addon' as source_type,
                COALESCE(ra.addons_hotel_id, ra.addons_global_id) as target_id,
                ra.addons_global_id,
                NULL::int as plan_type_category_id,
                CASE WHEN rd.cancelled IS NOT NULL THEN 'キャンセル' ELSE ra.addon_name END as display_name,
                ra.tax_rate,
                (ra.price * ra.quantity) as amount,
                ra.addons_hotel_id,
                (rd.cancelled IS NOT NULL) as is_cancelled
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
            /* Unify target for cancelled rows to force single row grouping in ledger */
            SELECT 
                hotel_id, 
                CASE WHEN is_cancelled THEN 'cancellation' ELSE 'plan_hotel' END as mapping_target,
                CASE WHEN is_cancelled THEN 0 ELSE target_id END as target_id,
                NULL::int as addons_global_id, 
                plan_type_category_id, 
                display_name, 
                tax_rate, 
                amount 
            FROM plan_sales
            UNION ALL
            SELECT 
                hotel_id, 
                CASE WHEN is_cancelled THEN 'cancellation' ELSE (CASE WHEN addons_hotel_id IS NOT NULL THEN 'addon_hotel' ELSE 'addon_global' END) END, 
                CASE WHEN is_cancelled THEN 0 ELSE target_id END, 
                addons_global_id, 
                NULL, 
                display_name, 
                tax_rate, 
                amount 
            FROM addon_sales
        ),
        mapped_sales AS (
            SELECT 
                cs.*,
                COALESCE(
                    (
                        SELECT am.account_code_id
                        FROM acc_accounting_mappings am
                        WHERE (
                            (cs.mapping_target = 'plan_hotel' AND (
                                (am.target_type = 'plan_hotel' AND am.target_id = cs.target_id AND am.hotel_id = cs.hotel_id)
                                OR
                                (am.target_type = 'plan_type_category' AND am.target_id = cs.plan_type_category_id AND (am.hotel_id = cs.hotel_id OR am.hotel_id IS NULL))
                            ))
                            OR
                            (cs.mapping_target = 'addon_hotel' AND (
                                (am.target_type = 'addon_hotel' AND am.target_id = cs.target_id AND am.hotel_id = cs.hotel_id)
                                OR
                                (am.target_type = 'addon_global' AND am.target_id = cs.addons_global_id AND (am.hotel_id = cs.hotel_id OR am.hotel_id IS NULL))
                            ))
                            OR
                            (cs.mapping_target = 'addon_global' AND am.target_type = 'addon_global' AND am.target_id = cs.target_id AND (am.hotel_id = cs.hotel_id OR am.hotel_id IS NULL))
                            OR
                            (cs.mapping_target = 'cancellation' AND am.target_type = 'cancellation' AND (am.hotel_id = cs.hotel_id OR am.hotel_id IS NULL))
                        )
                        ORDER BY 
                            CASE 
                                WHEN am.target_type IN ('plan_hotel', 'addon_hotel') THEN 1
                                WHEN am.target_type = 'cancellation' AND am.hotel_id IS NOT NULL THEN 1.5
                                WHEN am.target_type IN ('plan_type_category', 'addon_global') AND am.hotel_id IS NOT NULL THEN 2
                                WHEN am.target_type = 'cancellation' AND am.hotel_id IS NULL THEN 2.5
                                WHEN am.target_type IN ('plan_type_category', 'addon_global') AND am.hotel_id IS NULL THEN 3
                                ELSE 4
                            END ASC
                        LIMIT 1
                    ),
                    (SELECT id FROM acc_account_codes b WHERE b.code = '4110004' LIMIT 1)
                ) as account_code_id
            FROM combined_sales cs
        )
        SELECT 
            h.id as hotel_id,
            h.name as hotel_name,
            COALESCE(ad.name, h.name) as department_code,
            (ad.name IS NOT NULL) as is_dept_configured,
            ms.account_code_id,
            ac.code as account_code,
            ac.name as account_name,
            ms.tax_rate,
            COALESCE(atc.yayoi_name, '対象外') as tax_category,
            SUM(ms.amount) as total_amount,
            ms.display_name as display_category_name
        FROM mapped_sales ms
        JOIN hotels h ON ms.hotel_id = h.id
        LEFT JOIN acc_departments ad ON h.id = ad.hotel_id
        LEFT JOIN acc_account_codes ac ON ms.account_code_id = ac.id
        LEFT JOIN acc_tax_classes atc ON ms.tax_rate = atc.tax_rate AND atc.yayoi_name LIKE '課税売上%'
        GROUP BY h.id, h.name, ad.name, ms.account_code_id, ac.code, ac.name, ms.tax_rate, atc.yayoi_name, ms.display_name, ms.mapping_target
        HAVING SUM(ms.amount) != 0
        ORDER BY h.id, ms.mapping_target, ms.display_name, ms.tax_rate DESC
    `;

    const values = [startDate, endDate, hotelIds];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving ledger preview:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Validate data integrity between reservation_details and reservation_rates
 * Returns discrepancies and missing rates for the given period
 */
const validateLedgerDataIntegrity = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { startDate, endDate, hotelIds } = filters;

    const query = `
        WITH rd_prices AS (
            SELECT 
                rd.id as rd_id,
                rd.reservation_id,
                rd.date,
                rd.hotel_id,
                h.name as hotel_name,
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
            JOIN hotels h ON rd.hotel_id = h.id
            LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
            LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
            WHERE rd.hotel_id = ANY($3::int[])
            AND rd.date BETWEEN $1 AND $2
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
            WHERE rd.hotel_id = ANY($3::int[])
            AND rd.date BETWEEN $1 AND $2
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
            GROUP BY rd.id, rd.plan_type
        ),
        discrepancies AS (
            SELECT 
                rdp.rd_id,
                rdp.reservation_id,
                rdp.date,
                rdp.hotel_id,
                rdp.hotel_name,
                rdp.plan_name,
                rdp.plan_type,
                rdp.number_of_people,
                rdp.rd_price,
                rdp.rd_total_price,
                COALESCE(rrp.rr_total_price, 0) as rr_total_price,
                rdp.rd_total_price - COALESCE(rrp.rr_total_price, 0) as difference,
                CASE WHEN rrp.rr_total_price IS NULL THEN TRUE ELSE FALSE END as missing_rates
            FROM rd_prices rdp
            LEFT JOIN rr_prices rrp ON rdp.rd_id = rrp.rd_id
            WHERE rdp.rd_total_price != COALESCE(rrp.rr_total_price, 0)
                AND (
                    rrp.rr_total_price IS NULL  -- Missing rates
                    OR ABS(rdp.rd_total_price - COALESCE(rrp.rr_total_price, 0)) > 100  -- Significant discrepancy (>100 yen)
                )
        )
        SELECT 
            hotel_id,
            hotel_name,
            COUNT(*) as discrepancy_count,
            SUM(CASE WHEN missing_rates THEN 1 ELSE 0 END) as missing_rates_count,
            SUM(difference) as total_difference,
            SUM(CASE WHEN missing_rates THEN rd_total_price ELSE 0 END) as missing_rates_amount,
            json_agg(
                json_build_object(
                    'rd_id', rd_id,
                    'reservation_id', reservation_id,
                    'date', date,
                    'plan_name', plan_name,
                    'rd_total_price', rd_total_price,
                    'rr_total_price', rr_total_price,
                    'difference', difference,
                    'missing_rates', missing_rates
                ) ORDER BY ABS(difference) DESC
            ) as significant_issues
        FROM discrepancies
        GROUP BY hotel_id, hotel_name
        HAVING SUM(CASE WHEN missing_rates THEN 1 ELSE 0 END) > 0  -- Only return hotels with missing rates
        ORDER BY hotel_id
    `;

    const values = [startDate, endDate, hotelIds];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error validating ledger data integrity:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getManagementGroups = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `SELECT * FROM acc_management_groups ORDER BY display_order ASC, name ASC`;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving management groups:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getTaxClasses = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `SELECT * FROM acc_tax_classes ORDER BY display_order ASC, name ASC`;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving tax classes:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getDepartments = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT 
            h.id as hotel_id, 
            h.name as hotel_name, 
            ad.id, 
            ad.name, 
            ad.created_at, 
            ad.updated_at
        FROM hotels h
        LEFT JOIN acc_departments ad ON h.id = ad.hotel_id
        ORDER BY h.id ASC
    `;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving departments:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getDashboardMetrics = async (requestId, startDate, endDate, hotelIds, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        logger.debug(`[Accounting] Model getDashboardMetrics: Range[${startDate} to ${endDate}] Hotels[${hotelIds}]`);

        /**
         * 1. Total Sales (Revenue)
         * CRITICAL: Using the exact same CTE logic as getLedgerPreview to ensure matching totals.
         */
        const salesQuery = `
        WITH rr_base AS (
            SELECT 
                rd.id as rd_id,
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN rd.price 
                    ELSE rd.price * rd.number_of_people 
                END as total_rd_price,
                rr.id as rr_id,
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN rr.price 
                    ELSE rr.price * rd.number_of_people 
                END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
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

        // 2. Total Payments (Cash Flow)
        const paymentsQuery = `
            SELECT SUM(value) as total_payments
            FROM reservation_payments
            WHERE date BETWEEN $1 AND $2
            AND hotel_id = ANY($3::int[])
        `;

        const [salesRes, paymentsRes] = await Promise.all([
            client.query(salesQuery, [startDate, endDate, hotelIds]),
            client.query(paymentsQuery, [startDate, endDate, hotelIds])
        ]);

        return {
            totalSales: parseInt(salesRes.rows[0]?.total_sales || 0),
            totalPayments: parseInt(paymentsRes.rows[0]?.total_payments || 0)
        };

    } catch (err) {
        logger.error('Error calculating dashboard metrics:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Reconciliation Model: Overview (Grouped by Hotel)
 */
const getReconciliationOverview = async (requestId, startDate, endDate, hotelIds, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        const query = `
        WITH rr_base AS (
            SELECT 
                rd.hotel_id,
                r.reservation_client_id,
                rd.id as rd_id,
                rd.date,
                CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
                rr.id as rr_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block', 'cancelled')
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
                AND r.status NOT IN ('hold', 'block', 'cancelled')
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

        const result = await client.query(query, [startDate, endDate, hotelIds]);
        return result.rows;
    } catch (err) {
        logger.error('Error in getReconciliationOverview:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Reconciliation Model: Hotel Details (Grouped by Client)
 */
const getReconciliationHotelDetails = async (requestId, hotelId, startDate, endDate, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        const query = `
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
        client_res_info AS (
            -- Get min check-in date and activity type for relevant reservations
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
        ORDER BY ABS(COALESCE(cp.month_payments, 0) - COALESCE(cs.month_sales, 0)) DESC
        `;

        const result = await client.query(query, [startDate, endDate, hotelId]);
        return result.rows;
    } catch (err) {
        logger.error('Error in getReconciliationHotelDetails:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Reconciliation Model: Client Details (Reservations)
 */
const getReconciliationClientDetails = async (requestId, hotelId, clientId, startDate, endDate, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        const query = `
        WITH res_list AS (
            -- Step 1: Find reservations with activity in the target month
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
                CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn
            FROM reservation_details rd
            JOIN res_list r ON rd.reservation_id = r.id
            JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.billable = TRUE
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        -- Multi-perspective Sales (Month vs Cumulative vs Total)
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
        -- Multi-perspective Payments (Month vs Cumulative vs Total)
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
            COALESCE(pa.total_payments, 0) as total_payments,
            COALESCE(pa.total_payments, 0) - COALESCE(sa.total_sales, 0) as total_difference
        FROM res_list rl
        JOIN reservations r ON rl.id = r.id
        LEFT JOIN res_sales_agg sa ON rl.id = sa.reservation_id
        LEFT JOIN res_payments_agg pa ON rl.id = pa.reservation_id
        ORDER BY r.check_in DESC
        `;

        const result = await client.query(query, [hotelId, clientId, startDate, endDate]);
        return result.rows;
    } catch (err) {
        logger.error('Error in getReconciliationClientDetails:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    getAccountCodes,
    getMappings,
    getLedgerPreview,
    validateLedgerDataIntegrity,
    getManagementGroups,
    getTaxClasses,
    getDepartments,
    getDashboardMetrics,
    getReconciliationOverview,
    getReconciliationHotelDetails,
    getReconciliationClientDetails
};
