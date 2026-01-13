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
                rr.tax_rate,
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN rr.price 
                    ELSE rr.price * rd.number_of_people 
                END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn,
                (rd.cancelled IS NOT NULL) as is_cancelled
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
            LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
            LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
            JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
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
                rd.id as rd_id,
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
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        plan_sales AS (
            SELECT 
                b.hotel_id,
                CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        ),
        addon_sales AS (
            SELECT 
                ra.hotel_id,
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
        hotel_sales AS (
            SELECT hotel_id, SUM(amount) as total_sales FROM (
                SELECT hotel_id, amount FROM plan_sales
                UNION ALL
                SELECT hotel_id, amount FROM addon_sales
            ) s GROUP BY hotel_id
        ),
        hotel_payments AS (
            SELECT hotel_id, SUM(value) as total_payments
            FROM reservation_payments
            WHERE date BETWEEN $1 AND $2
            AND hotel_id = ANY($3::int[])
            GROUP BY hotel_id
        )
        SELECT 
            h.id as hotel_id,
            h.name as hotel_name,
            COALESCE(hs.total_sales, 0) as total_sales,
            COALESCE(hp.total_payments, 0) as total_payments,
            COALESCE(hp.total_payments, 0) - COALESCE(hs.total_sales, 0) as difference
        FROM hotels h
        LEFT JOIN hotel_sales hs ON h.id = hs.hotel_id
        LEFT JOIN hotel_payments hp ON h.id = hp.hotel_id
        WHERE h.id = ANY($3::int[])
        ORDER BY h.id
        `;

        const result = await client.query(query, [startDate, endDate, hotelIds]);
        return result.rows;
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
        WITH rr_base AS (
            SELECT 
                r.reservation_client_id,
                rd.id as rd_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
                rr.id as rr_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn
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
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        plan_sales AS (
            SELECT 
                b.reservation_client_id,
                CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
            FROM rr_base b
            JOIN rr_totals t ON b.rd_id = t.rd_id
        ),
        addon_sales AS (
            SELECT 
                r.reservation_client_id,
                (ra.price * ra.quantity) as amount
            FROM reservation_addons ra
            JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND ra.hotel_id = $3
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        client_sales AS (
            SELECT reservation_client_id, SUM(amount) as total_sales FROM (
                SELECT reservation_client_id, amount FROM plan_sales
                UNION ALL
                SELECT reservation_client_id, amount FROM addon_sales
            ) s GROUP BY reservation_client_id
        ),
        client_payments AS (
            SELECT r.reservation_client_id, SUM(rp.value) as total_payments
            FROM reservation_payments rp
            JOIN reservations r ON rp.reservation_id = r.id AND rp.hotel_id = r.hotel_id
            WHERE rp.date BETWEEN $1 AND $2
            AND rp.hotel_id = $3
            GROUP BY r.reservation_client_id
        )
        SELECT 
            c.id as client_id,
            COALESCE(c.name_kanji, c.name_kana, c.name) as client_name,
            COALESCE(cs.total_sales, 0) as total_sales,
            COALESCE(cp.total_payments, 0) as total_payments,
            COALESCE(cp.total_payments, 0) - COALESCE(cs.total_sales, 0) as difference
        FROM clients c
        LEFT JOIN client_sales cs ON c.id = cs.reservation_client_id
        LEFT JOIN client_payments cp ON c.id = cp.reservation_client_id
        WHERE (cs.total_sales IS NOT NULL OR cp.total_payments IS NOT NULL)
        AND ABS(COALESCE(cp.total_payments, 0) - COALESCE(cs.total_sales, 0)) > 1
        ORDER BY ABS(COALESCE(cp.total_payments, 0) - COALESCE(cs.total_sales, 0)) DESC
        `;

        const result = await client.query(query, [startDate, endDate, hotelId]);
        return result.rows;
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
        WITH rr_base AS (
            SELECT 
                r.id as reservation_id,
                rd.id as rd_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
                rr.id as rr_id,
                CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END as rr_price,
                ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY rr.tax_rate DESC, rr.id DESC) as rn
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = $3
            AND r.reservation_client_id = $4
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
        ),
        rr_totals AS (
            SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
        ),
        res_sales AS (
            SELECT 
                reservation_id,
                SUM(amount) as total_sales
            FROM (
                SELECT 
                    b.reservation_id,
                    CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
                FROM rr_base b
                JOIN rr_totals t ON b.rd_id = t.rd_id
                UNION ALL
                SELECT 
                    r.id as reservation_id,
                    (ra.price * ra.quantity) as amount
                FROM reservation_addons ra
                JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                WHERE rd.date BETWEEN $1 AND $2
                AND ra.hotel_id = $3
                AND r.reservation_client_id = $4
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ) s GROUP BY reservation_id
        ),
        res_payments AS (
            SELECT rp.reservation_id, SUM(rp.value) as total_payments
            FROM reservation_payments rp
            JOIN reservations r ON rp.reservation_id = r.id AND rp.hotel_id = r.hotel_id
            WHERE rp.date BETWEEN $1 AND $2
            AND rp.hotel_id = $3
            AND r.reservation_client_id = $4
            GROUP BY rp.reservation_id
        )
        SELECT 
            r.id as reservation_id,
            r.check_in,
            r.check_out,
            r.status,
            COALESCE(rs.total_sales, 0) as total_sales,
            COALESCE(rp.total_payments, 0) as total_payments,
            COALESCE(rp.total_payments, 0) - COALESCE(rs.total_sales, 0) as difference
        FROM reservations r
        LEFT JOIN res_sales rs ON r.id = rs.reservation_id
        LEFT JOIN res_payments rp ON r.id = rp.reservation_id
        WHERE r.hotel_id = $3 AND r.reservation_client_id = $4
        AND (rs.total_sales IS NOT NULL OR rp.total_payments IS NOT NULL)
        ORDER BY r.check_in DESC
        `;

        const result = await client.query(query, [startDate, endDate, hotelId, clientId]);
        return result.rows;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    getAccountCodes,
    getMappings,
    getLedgerPreview,
    getManagementGroups,
    getTaxClasses,
    getDepartments,
    getDashboardMetrics,
    getReconciliationOverview,
    getReconciliationHotelDetails,
    getReconciliationClientDetails
};
