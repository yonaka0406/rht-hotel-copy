const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const getAccountCodes = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT ac.*, mg.name as management_group_name, mg.display_order as group_display_order
        FROM acc_account_codes ac
        LEFT JOIN acc_management_groups mg ON ac.management_group_id = mg.id
        ORDER BY mg.display_order ASC, ac.code::BIGINT ASC
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
                ph.plan_package_category_id,
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
                b.plan_package_category_id,
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
                NULL::int as plan_package_category_id,
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
                plan_package_category_id,
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
                                OR
                                (am.target_type = 'plan_package_category' AND am.target_id = cs.plan_package_category_id AND (am.hotel_id = cs.hotel_id OR am.hotel_id IS NULL))
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
                                WHEN am.target_type IN ('plan_type_category', 'plan_package_category', 'addon_global') AND am.hotel_id IS NOT NULL THEN 2
                                WHEN am.target_type = 'cancellation' AND am.hotel_id IS NULL THEN 2.5
                                WHEN am.target_type IN ('plan_type_category', 'plan_package_category', 'addon_global') AND am.hotel_id IS NULL THEN 3
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
        LEFT JOIN acc_departments ad ON h.id = ad.hotel_id AND ad.is_current = true
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

/**
 * Transform ledger preview data into format needed for integrity analysis
 * @param {Array} ledgerData - Raw ledger preview results
 * @param {Array} reservationCounts - Reservation count data by plan and tax rate
 * @returns {Array} - Transformed PMS data for integrity analysis
 */
const transformLedgerDataToPmsFormat = (ledgerData, reservationCounts = []) => {
    const pmsDataMap = new Map();
    
    // Create a lookup map for reservation counts
    const countLookup = new Map();
    reservationCounts.forEach(row => {
        const key = `${row.hotel_id}-${row.plan_name}-${row.tax_rate}`;
        countLookup.set(key, {
            reservation_count: parseInt(row.reservation_count) || 0,
            missing_rates_count: parseInt(row.missing_rates_count) || 0
        });
    });
    
    ledgerData.forEach(row => {
        const key = `${row.hotel_id}-${row.display_category_name}-${row.tax_rate}`;
        
        if (!pmsDataMap.has(key)) {
            // Look up reservation counts
            const countData = countLookup.get(key) || { reservation_count: 0, missing_rates_count: 0 };
            
            pmsDataMap.set(key, {
                hotel_id: row.hotel_id,
                hotel_name: row.hotel_name,
                plan_name: row.display_category_name,
                plan_type_category_id: null, // Not needed for integrity analysis
                category_name: null, // Not needed for integrity analysis
                tax_rate: row.tax_rate,
                reservation_count: countData.reservation_count,
                pms_amount: 0,
                missing_rates_count: countData.missing_rates_count
            });
        }
        
        const pmsData = pmsDataMap.get(key);
        pmsData.pms_amount += parseFloat(row.total_amount) || 0;
    });
    
    return Array.from(pmsDataMap.values());
};

/**
 * Get raw PMS and Yayoi data for integrity analysis
 * Reuses getLedgerPreview logic to ensure consistency
 * @param {string} requestId 
 * @param {object} filters { startDate, endDate, hotelIds }
 * @param {object} dbClient Optional database client for transactions
 */
const getRawDataForIntegrityAnalysis = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { startDate, endDate, hotelIds } = filters;

    try {
        // Reuse the exact same logic as getLedgerPreview for PMS data
        logger.debug(`[${requestId}] Getting PMS data via getLedgerPreview for integrity analysis`);
        const ledgerData = await getLedgerPreview(requestId, filters, client);
        
        // Get reservation counts separately for the dialog functionality
        const reservationCountQuery = `
            WITH rr_base AS (
                -- Same base logic as getLedgerPreview
                SELECT 
                    rd.id as rd_id,
                    rd.hotel_id,
                    rd.plans_hotel_id,
                    rd.plans_global_id,
                    ph.plan_type_category_id,
                    ph.plan_package_category_id,
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
                    (rd.cancelled IS NOT NULL) as is_cancelled,
                    CASE WHEN NOT EXISTS(
                        SELECT 1 FROM reservation_rates rr2 
                        WHERE rr2.reservation_details_id = rd.id 
                        AND rr2.hotel_id = rd.hotel_id
                    ) THEN 1 ELSE 0 END as missing_rates_count
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
            plan_counts AS (
                -- Count reservations by display name (same grouping as ledger)
                SELECT 
                    b.hotel_id,
                    h.name as hotel_name,
                    CASE 
                        WHEN b.is_cancelled THEN 'キャンセル' 
                        WHEN b.plan_name LIKE '%マンスリー%' THEN COALESCE(b.category_name || ' - ', '') || 'マンスリー'
                        ELSE COALESCE(b.category_name, b.plan_name)
                    END as plan_name,
                    b.tax_rate,
                    COUNT(DISTINCT b.rd_id) as reservation_count,
                    SUM(b.missing_rates_count) as missing_rates_count
                FROM rr_base b
                JOIN hotels h ON b.hotel_id = h.id
                WHERE b.rn = 1  -- Only count each reservation_detail once
                GROUP BY b.hotel_id, h.name, 
                         CASE 
                             WHEN b.is_cancelled THEN 'キャンセル' 
                             WHEN b.plan_name LIKE '%マンスリー%' THEN COALESCE(b.category_name || ' - ', '') || 'マンスリー'
                             ELSE COALESCE(b.category_name, b.plan_name)
                         END, 
                         b.tax_rate
            ),
            addon_counts AS (
                -- Count addon reservations
                SELECT 
                    ra.hotel_id,
                    h.name as hotel_name,
                    CASE WHEN rd.cancelled IS NOT NULL THEN 'キャンセル' ELSE ra.addon_name END as plan_name,
                    ra.tax_rate,
                    COUNT(DISTINCT rd.id) as reservation_count,
                    0 as missing_rates_count
                FROM reservation_addons ra
                JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                JOIN hotels h ON ra.hotel_id = h.id
                WHERE rd.date BETWEEN $1 AND $2
                AND ra.hotel_id = ANY($3::int[])
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
                GROUP BY ra.hotel_id, h.name, 
                         CASE WHEN rd.cancelled IS NOT NULL THEN 'キャンセル' ELSE ra.addon_name END,
                         ra.tax_rate
            )
            SELECT 
                hotel_id,
                hotel_name,
                plan_name,
                tax_rate,
                SUM(reservation_count) as reservation_count,
                SUM(missing_rates_count) as missing_rates_count
            FROM (
                SELECT * FROM plan_counts
                UNION ALL
                SELECT * FROM addon_counts
            ) combined
            GROUP BY hotel_id, hotel_name, plan_name, tax_rate
            ORDER BY hotel_id, plan_name
        `;
        
        const values = [startDate, endDate, hotelIds];
        const reservationCountResult = await client.query(reservationCountQuery, values);
        
        // Transform ledger data into the format needed for integrity analysis
        const pmsData = transformLedgerDataToPmsFormat(ledgerData, reservationCountResult.rows);
        
        logger.debug(`[${requestId}] Transformed ${ledgerData.length} ledger rows into ${pmsData.length} PMS data rows`);

        // Get Yayoi main account data (sum of all subaccounts by account)
        const yayoiMainQuery = `
            SELECT 
                d.hotel_id,
                h.name as hotel_name,
                ac.name as account_name,
                COALESCE(tc.tax_rate, 0.10) as tax_rate,
                COUNT(*) as transaction_count,
                SUM(yd.credit_amount)::numeric as yayoi_amount
            FROM acc_yayoi_data yd
            JOIN acc_departments d ON yd.credit_department = d.name
            JOIN hotels h ON d.hotel_id = h.id
            JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
            LEFT JOIN acc_tax_classes tc ON yd.credit_tax_class = tc.yayoi_name
            WHERE yd.transaction_date BETWEEN $1 AND $2
            AND d.hotel_id = ANY($3::int[])
            AND ac.management_group_id = 1  -- Sales accounts only
            AND yd.credit_amount > 0
            AND d.id = (
                SELECT d2.id 
                FROM acc_departments d2 
                WHERE d2.name = d.name 
                ORDER BY d2.is_current DESC, d2.id DESC 
                LIMIT 1
            )
            GROUP BY d.hotel_id, h.name, ac.name, COALESCE(tc.tax_rate, 0.10)
            ORDER BY d.hotel_id, ac.name
        `;

        // Get Yayoi subaccount data
        const yayoiSubQuery = `
            SELECT 
                d.hotel_id,
                h.name as hotel_name,
                ac.name as account_name,
                yd.credit_sub_account as subaccount_name,
                COALESCE(tc.tax_rate, 0.10) as tax_rate,
                COUNT(*) as transaction_count,
                SUM(yd.credit_amount)::numeric as yayoi_amount
            FROM acc_yayoi_data yd
            JOIN acc_departments d ON yd.credit_department = d.name
            JOIN hotels h ON d.hotel_id = h.id
            JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
            LEFT JOIN acc_tax_classes tc ON yd.credit_tax_class = tc.yayoi_name
            WHERE yd.transaction_date BETWEEN $1 AND $2
            AND d.hotel_id = ANY($3::int[])
            AND ac.management_group_id = 1  -- Sales accounts only
            AND yd.credit_amount > 0
            AND yd.credit_sub_account IS NOT NULL AND yd.credit_sub_account != ''  -- Subaccounts only
            AND d.id = (
                SELECT d2.id 
                FROM acc_departments d2 
                WHERE d2.name = d.name 
                ORDER BY d2.is_current DESC, d2.id DESC 
                LIMIT 1
            )
            GROUP BY d.hotel_id, h.name, ac.name, yd.credit_sub_account, COALESCE(tc.tax_rate, 0.10)
            ORDER BY d.hotel_id, ac.name, yd.credit_sub_account
        `;

        const [yayoiMainResult, yayoiSubResult] = await Promise.all([
            client.query(yayoiMainQuery, values),
            client.query(yayoiSubQuery, values)
        ]);

        logger.debug(`[${requestId}] Raw data results:`, {
            pmsRows: pmsData.length,
            yayoiMainRows: yayoiMainResult.rows.length,
            yayoiSubRows: yayoiSubResult.rows.length,
            reservationCountRows: reservationCountResult.rows.length,
            period: `${startDate} to ${endDate}`,
            hotelIds
        });

        // Log sample data for debugging
        if (pmsData.length > 0) {
            logger.debug(`[${requestId}] Sample PMS data:`, pmsData[0]);
        }
        if (yayoiMainResult.rows.length > 0) {
            logger.debug(`[${requestId}] Sample Yayoi main data:`, yayoiMainResult.rows[0]);
        } else {
            logger.warn(`[${requestId}] No Yayoi main account data found for period ${startDate} to ${endDate}`);
        }
        if (yayoiSubResult.rows.length > 0) {
            logger.debug(`[${requestId}] Sample Yayoi sub data:`, yayoiSubResult.rows[0]);
        } else {
            logger.warn(`[${requestId}] No Yayoi subaccount data found for period ${startDate} to ${endDate}`);
        }

        // Calculate totals by hotel for summary
        const pmsTotalsByHotel = new Map();
        const yayoiTotalsByHotel = new Map();

        // Calculate PMS totals by hotel
        pmsData.forEach(row => {
            const hotelId = row.hotel_id;
            if (!pmsTotalsByHotel.has(hotelId)) {
                pmsTotalsByHotel.set(hotelId, {
                    hotel_id: hotelId,
                    hotel_name: row.hotel_name,
                    total_pms_amount: 0,
                    total_reservations: 0,
                    total_missing_rates: 0
                });
            }
            const hotelTotal = pmsTotalsByHotel.get(hotelId);
            hotelTotal.total_pms_amount += parseFloat(row.pms_amount) || 0;
            hotelTotal.total_reservations += parseInt(row.reservation_count) || 0;
            hotelTotal.total_missing_rates += parseInt(row.missing_rates_count) || 0;
        });

        // Calculate Yayoi totals by hotel (from main accounts which are sums of subaccounts)
        yayoiMainResult.rows.forEach(row => {
            const hotelId = row.hotel_id;
            if (!yayoiTotalsByHotel.has(hotelId)) {
                yayoiTotalsByHotel.set(hotelId, {
                    hotel_id: hotelId,
                    hotel_name: row.hotel_name,
                    total_yayoi_amount: 0,
                    total_transactions: 0
                });
            }
            const hotelTotal = yayoiTotalsByHotel.get(hotelId);
            hotelTotal.total_yayoi_amount += parseFloat(row.yayoi_amount) || 0;
            hotelTotal.total_transactions += parseInt(row.transaction_count) || 0;
        });

        // Combine hotel totals
        const hotelTotals = [];
        const allHotelIds = new Set([...pmsTotalsByHotel.keys(), ...yayoiTotalsByHotel.keys()]);
        
        allHotelIds.forEach(hotelId => {
            const pmsTotal = pmsTotalsByHotel.get(hotelId);
            const yayoiTotal = yayoiTotalsByHotel.get(hotelId);
            
            const pmsTotalAmount = pmsTotal?.total_pms_amount || 0;
            const yayoiTotalAmount = yayoiTotal?.total_yayoi_amount || 0;
            
            hotelTotals.push({
                hotel_id: hotelId,
                hotel_name: pmsTotal?.hotel_name || yayoiTotal?.hotel_name || `Hotel ${hotelId}`,
                total_pms_amount: pmsTotalAmount,
                total_yayoi_amount: yayoiTotalAmount,
                total_difference: pmsTotalAmount - yayoiTotalAmount,
                total_reservations: pmsTotal?.total_reservations || 0,
                total_transactions: yayoiTotal?.total_transactions || 0,
                missing_rates_count: pmsTotal?.total_missing_rates || 0
            });
        });

        logger.debug(`[${requestId}] Calculated hotel totals:`, hotelTotals);

        return {
            // Raw details for drill-down analysis
            details: {
                pmsData: pmsData,
                yayoiMainAccounts: yayoiMainResult.rows,
                yayoiSubAccounts: yayoiSubResult.rows
            },
            // Pre-calculated totals for hotel summary
            totals: {
                hotelTotals: hotelTotals.sort((a, b) => a.hotel_name.localeCompare(b.hotel_name))
            }
        };

    } catch (err) {
        logger.error('Error getting raw data for integrity analysis:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get available years from Yayoi data for chart navigation
 * @param {string} requestId 
 * @param {object} dbClient Optional database client for transactions
 */
const getHotelsWithDepartments = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT DISTINCT d.hotel_id, h.name as hotel_name
        FROM acc_departments d
        JOIN hotels h ON d.hotel_id = h.id
        ORDER BY d.hotel_id
    `;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error getting hotels with departments:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get hotel totals for summary table in data integrity analysis
 * @param {string} requestId 
 * @param {object} filters { startDate, endDate, hotelIds }
 * @param {object} dbClient Optional database client for transactions
 */
const getHotelTotalsForIntegrityAnalysis = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { startDate, endDate, hotelIds } = filters;

    const query = `
        WITH pms_hotel_totals AS (
            -- Get PMS totals by hotel (tax-included amounts)
            SELECT 
                rd.hotel_id,
                h.name as hotel_name,
                SUM(
                    CASE 
                        WHEN rd.plan_type = 'per_room' THEN rd.price
                        ELSE rd.price * rd.number_of_people 
                    END
                )::numeric as total_pms_amount,
                COUNT(DISTINCT rd.id) as total_reservations,
                COUNT(CASE WHEN rr.id IS NULL THEN 1 END) as missing_rates_count
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            JOIN hotels h ON rd.hotel_id = h.id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
            GROUP BY rd.hotel_id, h.name
        ),
        pms_addon_totals AS (
            -- Get addon totals by hotel (tax-included amounts)
            SELECT 
                ra.hotel_id,
                SUM(ra.price * ra.quantity)::numeric as total_addon_amount
            FROM reservation_addons ra
            JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND ra.hotel_id = ANY($3::int[])
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
            GROUP BY ra.hotel_id
        ),
        yayoi_hotel_totals AS (
            -- Get Yayoi totals by hotel
            SELECT 
                d.hotel_id,
                h.name as hotel_name,
                SUM(yd.credit_amount)::numeric as total_yayoi_amount,
                COUNT(*) as total_transactions
            FROM acc_yayoi_data yd
            JOIN acc_departments d ON yd.credit_department = d.name
            JOIN hotels h ON d.hotel_id = h.id
            JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
            WHERE yd.transaction_date BETWEEN $1 AND $2
            AND d.hotel_id = ANY($3::int[])
            AND ac.management_group_id = 1  -- Sales accounts only
            AND yd.credit_amount > 0
            -- Use the most current department mapping for each department name
            AND d.id = (
                SELECT d2.id 
                FROM acc_departments d2 
                WHERE d2.name = d.name 
                ORDER BY d2.is_current DESC, d2.id DESC 
                LIMIT 1
            )
            GROUP BY d.hotel_id, h.name
        )
        SELECT 
            COALESCE(p.hotel_id, y.hotel_id) as hotel_id,
            COALESCE(p.hotel_name, y.hotel_name) as hotel_name,
            (COALESCE(p.total_pms_amount, 0) + COALESCE(a.total_addon_amount, 0))::numeric as total_pms_amount,
            COALESCE(y.total_yayoi_amount, 0) as total_yayoi_amount,
            ((COALESCE(p.total_pms_amount, 0) + COALESCE(a.total_addon_amount, 0)) - COALESCE(y.total_yayoi_amount, 0))::numeric as total_difference,
            COALESCE(p.total_reservations, 0) as total_reservations,
            COALESCE(y.total_transactions, 0) as total_transactions,
            COALESCE(p.missing_rates_count, 0) as missing_rates_count
        FROM pms_hotel_totals p
        FULL OUTER JOIN pms_addon_totals a ON p.hotel_id = a.hotel_id
        FULL OUTER JOIN yayoi_hotel_totals y ON COALESCE(p.hotel_id, a.hotel_id) = y.hotel_id
        ORDER BY COALESCE(p.hotel_name, y.hotel_name)
    `;

    const values = [startDate, endDate, hotelIds];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error getting hotel totals for integrity analysis:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get available months from Yayoi data for period selection
 * @param {string} requestId 
 * @param {object} dbClient Optional database client for transactions
 */
const getAvailableYayoiMonths = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT DISTINCT
            to_char(yd.transaction_date, 'YYYY-MM') as month_key,
            to_char(yd.transaction_date, 'YYYY年MM月') as month_label,
            EXTRACT(YEAR FROM yd.transaction_date) as year,
            EXTRACT(MONTH FROM yd.transaction_date) as month,
            COUNT(*) as transaction_count,
            MIN(yd.transaction_date) as earliest_date,
            MAX(yd.transaction_date) as latest_date
        FROM acc_yayoi_data yd
        JOIN acc_departments d ON yd.credit_department = d.name
        JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
        WHERE ac.management_group_id = 1  -- Sales accounts only
        AND yd.credit_amount > 0
        -- Use the most current department mapping for each department name
        AND d.id = (
            SELECT d2.id 
            FROM acc_departments d2 
            WHERE d2.name = d.name 
            ORDER BY d2.is_current DESC, d2.id DESC 
            LIMIT 1
        )
        GROUP BY 
            to_char(yd.transaction_date, 'YYYY-MM'),
            to_char(yd.transaction_date, 'YYYY年MM月'),
            EXTRACT(YEAR FROM yd.transaction_date),
            EXTRACT(MONTH FROM yd.transaction_date)
        ORDER BY year DESC, month DESC
    `;

    try {
        const result = await client.query(query);
        logger.debug(`[${requestId}] Available Yayoi months:`, result.rows);
        return result.rows;
    } catch (err) {
        logger.error('Error getting available Yayoi months:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getAvailableYayoiYears = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    // Include both current and historical department mappings for year detection
    const query = `
        SELECT 
            EXTRACT(YEAR FROM yd.transaction_date) as year,
            MIN(yd.transaction_date) as earliest_date,
            MAX(yd.transaction_date) as latest_date,
            COUNT(*) as transaction_count
        FROM acc_yayoi_data yd
        JOIN acc_departments d ON yd.credit_department = d.name  -- Remove is_current filter for year detection
        JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
        WHERE ac.management_group_id = 1  -- Sales accounts only
        AND yd.credit_amount > 0
        GROUP BY EXTRACT(YEAR FROM yd.transaction_date)
        ORDER BY year DESC
    `;

    try {
        const result = await client.query(query);
        logger.debug(`[${requestId}] Available Yayoi years (including historical departments):`, result.rows);
        
        return result.rows;
    } catch (err) {
        logger.error('Error getting available Yayoi years:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get monthly sales comparison data for chart display
 * @param {string} requestId 
 * @param {object} filters { year, hotelIds }
 * @param {object} dbClient Optional database client for transactions
 */
const getMonthlySalesComparison = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { year, hotelIds } = filters;

    const query = `
        WITH months AS (
            SELECT 
                generate_series(1, 12) as month_num,
                to_char(make_date($1, generate_series(1, 12), 1), 'YYYY-MM') as month_key,
                to_char(make_date($1, generate_series(1, 12), 1), 'MM月') as month_label
        ),
        pms_monthly AS (
            -- Get PMS calculated sales totals by month for hotels with department mappings
            SELECT 
                to_char(rd.date, 'YYYY-MM') as month_key,
                SUM(
                    CASE 
                        WHEN rd.plan_type = 'per_room' THEN COALESCE(rr.price, rd.price)
                        ELSE COALESCE(rr.price, rd.price) * rd.number_of_people 
                    END
                )::numeric as pms_amount
            FROM reservation_details rd
            JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE EXTRACT(YEAR FROM rd.date) = $1
            AND rd.hotel_id IN (
                -- Only include hotels that have department mappings
                SELECT DISTINCT d.hotel_id 
                FROM acc_departments d 
                WHERE d.hotel_id = ANY($2::int[])
            )
            AND rd.billable = TRUE
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
            GROUP BY to_char(rd.date, 'YYYY-MM')
        ),
        yayoi_monthly AS (
            -- Get Yayoi imported sales totals by month 
            -- Use proper JOIN to get the best matching department for each record
            SELECT 
                to_char(yd.transaction_date, 'YYYY-MM') as month_key,
                SUM(yd.credit_amount)::numeric as yayoi_amount,
                COUNT(DISTINCT yd.batch_id) as import_batches,
                COUNT(*) as transaction_count
            FROM acc_yayoi_data yd
            JOIN acc_departments d ON yd.credit_department = d.name
            JOIN acc_account_codes ac ON yd.credit_account_code = ac.name
            WHERE EXTRACT(YEAR FROM yd.transaction_date) = $1
            AND d.hotel_id = ANY($2::int[])  -- Filter by hotel IDs
            AND ac.management_group_id = 1  -- Sales accounts only
            AND yd.credit_amount > 0
            -- Use the most current department mapping for each department name
            AND d.id = (
                SELECT d2.id 
                FROM acc_departments d2 
                WHERE d2.name = d.name 
                ORDER BY d2.is_current DESC, d2.id DESC 
                LIMIT 1
            )
            GROUP BY to_char(yd.transaction_date, 'YYYY-MM')
        )
        SELECT 
            m.month_num,
            m.month_key,
            m.month_label,
            COALESCE(p.pms_amount, 0) as pms_amount,
            COALESCE(y.yayoi_amount, 0) as yayoi_amount,
            COALESCE(y.import_batches, 0) as import_batches,
            COALESCE(y.transaction_count, 0) as transaction_count,
            (COALESCE(p.pms_amount, 0) - COALESCE(y.yayoi_amount, 0))::numeric as difference,
            CASE 
                WHEN p.pms_amount IS NULL AND y.yayoi_amount IS NULL THEN 'no_data'
                WHEN p.pms_amount IS NULL THEN 'yayoi_only'
                WHEN y.yayoi_amount IS NULL THEN 'pms_only'
                WHEN ABS(COALESCE(p.pms_amount, 0) - COALESCE(y.yayoi_amount, 0)) > 10000 THEN 'significant_diff'
                ELSE 'matched'
            END as status
        FROM months m
        LEFT JOIN pms_monthly p ON m.month_key = p.month_key
        LEFT JOIN yayoi_monthly y ON m.month_key = y.month_key
        ORDER BY m.month_num
    `;

    const values = [year, hotelIds];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error getting monthly sales comparison:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Compare PMS calculated sales vs imported Yayoi data for the same period
 * @param {string} requestId 
 * @param {object} filters { startDate, endDate, hotelIds }
 * @param {object} dbClient Optional database client for transactions
 */
const comparePmsVsYayoiData = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { startDate, endDate, hotelIds } = filters;

    const query = `
        SELECT 
            rd.hotel_id,
            h.name as hotel_name,
            COUNT(*) as total_comparisons,
            0 as matched_count,
            0 as discrepancy_count,
            COUNT(*) as pms_only_count,
            0 as yayoi_only_count,
            SUM(
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN COALESCE(rr.price, rd.price)
                    ELSE COALESCE(rr.price, rd.price) * rd.number_of_people 
                END
            ) as total_pms_amount,
            0 as total_yayoi_amount,
            SUM(
                CASE 
                    WHEN rd.plan_type = 'per_room' THEN COALESCE(rr.price, rd.price)
                    ELSE COALESCE(rr.price, rd.price) * rd.number_of_people 
                END
            ) as total_difference,
            0 as total_yayoi_transactions,
            NULL as earliest_import,
            NULL as latest_import
        FROM reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        JOIN hotels h ON rd.hotel_id = h.id
        LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
        WHERE rd.date BETWEEN $1 AND $2
        AND rd.hotel_id = ANY($3::int[])
        AND rd.billable = TRUE
        AND r.status NOT IN ('hold', 'block')
        AND r.type <> 'employee'
        GROUP BY rd.hotel_id, h.name
        ORDER BY rd.hotel_id
    `;

    const values = [startDate, endDate, hotelIds];

    try {
        const result = await client.query(query, values);
        return result.rows;
    } catch (err) {
        logger.error('Error comparing PMS vs Yayoi data:', err);
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
            ad.id, 
            ad.name, 
            ad.hotel_id,
            h.name as hotel_name,
            ad.is_current,
            ad.department_group_id,
            dg.name as department_group_name,
            ad.created_at, 
            ad.updated_at
        FROM acc_departments ad
        LEFT JOIN hotels h ON ad.hotel_id = h.id
        LEFT JOIN acc_department_groups dg ON ad.department_group_id = dg.id
        ORDER BY ad.hotel_id ASC NULLS FIRST, ad.is_current DESC NULLS LAST, ad.name ASC
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

/**
 * Get detailed reservation data for a specific plan in the integrity analysis
 * Uses the same rate adjustment logic as getLedgerPreview for consistency
 * Includes both reservation details and addon details
 * @param {string} requestId 
 * @param {object} filters { hotelId, planName, selectedMonth, taxRate }
 * @param {object} dbClient Optional database client for transactions
 */
const getPlanReservationDetails = async (requestId, filters, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { hotelId, planName, selectedMonth, taxRate } = filters;
    
    // Parse the selected month to get start and end dates
    const [year, month] = selectedMonth.split('-');
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0]; // Last day of month

    try {
        // Use the same logic as getLedgerPreview for consistency
        const query = `
            WITH rr_base AS (
                -- Get all rate lines and identify the one with the highest tax rate per detail
                -- Same logic as getLedgerPreview to ensure consistency
                SELECT 
                    rd.id as rd_id,
                    rd.reservation_id,
                    rd.hotel_id,
                    rd.date,
                    rd.plans_hotel_id,
                    rd.plans_global_id,
                    ph.plan_type_category_id,
                    ph.plan_package_category_id,
                    ptc.name as category_name,
                    COALESCE(ph.name, pg.name, '未設定') as plan_name,
                    rd.plan_type,
                    rd.number_of_people,
                    rd.price,
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
                    CASE WHEN NOT EXISTS(
                        SELECT 1 FROM reservation_rates rr2 
                        WHERE rr2.reservation_details_id = rd.id 
                        AND rr2.hotel_id = rd.hotel_id
                    ) THEN true ELSE false END as missing_rates,
                    (rd.cancelled IS NOT NULL) as is_cancelled
                FROM reservation_details rd
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
                LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
                LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
                LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                WHERE rd.date BETWEEN $2 AND $3
                AND rd.hotel_id = $1
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            rr_totals AS (
                -- Calculate the sum of rate prices to detect discrepancies
                SELECT rd_id, SUM(rr_price) as sum_rr_price
                FROM rr_base
                GROUP BY rd_id
            ),
            plan_sales AS (
                -- Combined adjusted plan sales (same logic as getLedgerPreview)
                -- Only take the primary rate (rn = 1) and apply adjustment
                SELECT 
                    b.reservation_id,
                    b.date,
                    b.number_of_people,
                    b.price as unit_price,
                    CASE 
                        WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price)
                        ELSE b.rr_price
                    END as total_amount,
                    b.tax_rate,
                    b.missing_rates,
                    b.is_cancelled,
                    b.plan_name,
                    b.category_name,
                    -- Apply the same display name logic as getLedgerPreview
                    CASE 
                        WHEN b.is_cancelled THEN 'キャンセル' 
                        WHEN b.plan_name LIKE '%マンスリー%' THEN COALESCE(b.category_name || ' - ', '') || 'マンスリー'
                        ELSE COALESCE(b.category_name, b.plan_name)
                    END as display_name,
                    'plan' as item_type
                FROM rr_base b
                JOIN rr_totals t ON b.rd_id = t.rd_id
                WHERE b.rn = 1  -- Only take the primary rate to avoid duplicates
            ),
            addon_sales AS (
                -- Get addon sales (same logic as getLedgerPreview)
                SELECT 
                    rd.reservation_id,
                    rd.date,
                    1 as number_of_people, -- Addons don't have people count
                    ra.price as unit_price,
                    (ra.price * ra.quantity) as total_amount,
                    ra.tax_rate,
                    false as missing_rates, -- Addons don't have missing rates
                    (rd.cancelled IS NOT NULL) as is_cancelled,
                    ra.addon_name as plan_name,
                    NULL as category_name,
                    CASE WHEN rd.cancelled IS NOT NULL THEN 'キャンセル' ELSE ra.addon_name END as display_name,
                    'addon' as item_type
                FROM reservation_addons ra
                JOIN reservation_details rd ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
                JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
                WHERE rd.date BETWEEN $2 AND $3
                AND ra.hotel_id = $1
                AND rd.billable = TRUE
                AND r.status NOT IN ('hold', 'block')
                AND r.type <> 'employee'
            ),
            combined_sales AS (
                SELECT * FROM plan_sales
                UNION ALL
                SELECT * FROM addon_sales
            )
            SELECT 
                cs.reservation_id,
                cs.date,
                cs.number_of_people,
                cs.unit_price,
                cs.total_amount,
                cs.tax_rate,
                cs.missing_rates,
                cs.is_cancelled,
                cs.plan_name,
                cs.category_name,
                cs.display_name,
                cs.item_type,
                COALESCE(c.name_kanji, c.name_kana, c.name, '未設定') as client_name,
                r.check_in,
                r.check_out
            FROM combined_sales cs
            JOIN reservations r ON cs.reservation_id = r.id AND r.hotel_id = $1
            LEFT JOIN clients c ON r.reservation_client_id = c.id
            WHERE cs.display_name = $4  -- Match against the display name (same as ledger export)
            AND ABS(cs.tax_rate - $5) < 0.001  -- Match tax rate with small tolerance
            ORDER BY cs.date DESC, cs.reservation_id DESC, cs.item_type DESC -- Plans first, then addons
        `;

        const values = [hotelId, startDate, endDate, planName, parseFloat(taxRate) || 0.10];

        const result = await client.query(query, values);
        
        logger.debug(`[${requestId}] Plan reservation details:`, {
            hotelId,
            planName,
            selectedMonth,
            taxRate,
            resultCount: result.rows.length
        });

        return result.rows;
    } catch (err) {
        logger.error('Error getting plan reservation details:', err);
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
                COALESCE(rr.tax_rate, 0.10) as tax_rate,
                CASE 
                    WHEN rr.id IS NOT NULL THEN
                        CASE 
                            WHEN rd.plan_type = 'per_room' THEN rr.price 
                            ELSE rr.price * rd.number_of_people 
                        END
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

        // 3. Last Yayoi Import Info
        const lastImportQuery = `
            SELECT y.batch_id, y.created_at, y.created_by, u.name as user_name
            FROM acc_yayoi_data y
            LEFT JOIN users u ON y.created_by = u.id
            ORDER BY y.created_at DESC
            LIMIT 1
        `;

        const [salesRes, paymentsRes, lastImportRes] = await Promise.all([
            client.query(salesQuery, [startDate, endDate, hotelIds]),
            client.query(paymentsQuery, [startDate, endDate, hotelIds]),
            client.query(lastImportQuery)
        ]);

        const lastImport = lastImportRes.rows[0] || null;
        let lastImportPeriod = null;

        if (lastImport && lastImport.batch_id) {
            const periodRes = await client.query(
                `SELECT MIN(transaction_date) as min_date, MAX(transaction_date) as max_date 
                 FROM acc_yayoi_data 
                 WHERE batch_id = $1`,
                [lastImport.batch_id]
            );
            lastImportPeriod = periodRes.rows[0];
        }

        return {
            totalSales: parseInt(salesRes.rows[0]?.total_sales || 0),
            totalPayments: parseInt(paymentsRes.rows[0]?.total_payments || 0),
            lastImport: lastImport ? {
                ...lastImport,
                min_date: lastImportPeriod?.min_date,
                max_date: lastImportPeriod?.max_date
            } : null
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
            -- Step 1: Find all reservations (not just clients) with activity in the hotel during the month
            SELECT DISTINCT r.id as reservation_id, r.reservation_client_id
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
                rl.reservation_client_id,
                MIN(r.check_in) as check_in,
                BOOL_OR(r.type IN ('web', 'ota')) as is_ota_web
            FROM res_list rl
            JOIN reservations r ON rl.reservation_id = r.id
            WHERE r.hotel_id = $3
            GROUP BY rl.reservation_client_id
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
            JOIN res_list rl ON r.id = rl.reservation_id
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
                JOIN res_list rl ON r.id = rl.reservation_id
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
            JOIN res_list rl ON r.id = rl.reservation_id
            WHERE rp.hotel_id = $3
            AND r.status NOT IN ('hold', 'block')
            AND r.type <> 'employee'
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

/**
 * Cost Breakdown Model: Analytics for top expense accounts
 */
const getCostBreakdownData = async (requestId, topN = 5, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        // Step 1: Find the top N representative accounts (Management Groups 2, 3, 4, 5)
        // Strictly join with acc_departments to only consider costs assigned to facilities
        const topAccountsQuery = `
            SELECT 
                ac.code,
                ac.name,
                SUM(ayd.debit_amount) as total_historical_cost
            FROM acc_yayoi_data ayd
            JOIN acc_account_codes ac ON ayd.debit_account_code = ac.name
            JOIN acc_departments ad ON ayd.debit_department = ad.name AND ad.is_current = TRUE
            WHERE ac.management_group_id IN (2, 3, 4, 5)
            GROUP BY ac.code, ac.name
            ORDER BY total_historical_cost DESC
            LIMIT $1
        `;
        const topAccountsResult = await client.query(topAccountsQuery, [topN]);
        const topAccounts = topAccountsResult.rows;

        if (topAccounts.length === 0) return { topAccounts: [], timeSeries: [], occupancyData: [] };

        const topNames = topAccounts.map(a => a.name);

        // Step 2: Get monthly metrics (Cost and Sales) per hotel
        // Strictly use departmental mapping to exclude non-hotel data
        const monthDataQuery = `
            WITH hotel_depts AS (
                SELECT hotel_id, name FROM acc_departments WHERE is_current = TRUE
            ),
            monthly_sales AS (
                SELECT 
                    hd.hotel_id,
                    date_trunc('month', ayd.transaction_date)::date as month,
                    SUM(ayd.credit_amount) as sales
                FROM acc_yayoi_data ayd
                JOIN acc_account_codes ac ON ayd.credit_account_code = ac.name
                JOIN hotel_depts hd ON ayd.credit_department = hd.name
                WHERE ac.management_group_id = 1
                GROUP BY hd.hotel_id, date_trunc('month', ayd.transaction_date)
            ),
            monthly_costs AS (
                SELECT 
                    ac.code as account_code,
                    hd.hotel_id,
                    date_trunc('month', ayd.transaction_date)::date as month,
                    SUM(ayd.debit_amount) as cost
                FROM acc_yayoi_data ayd
                JOIN acc_account_codes ac ON ayd.debit_account_code = ac.name
                JOIN hotel_depts hd ON ayd.debit_department = hd.name
                WHERE ac.name = ANY($1::varchar[])
                GROUP BY ac.code, hd.hotel_id, date_trunc('month', ayd.transaction_date)
            )
            SELECT 
                mc.account_code,
                mc.hotel_id,
                h.name as hotel_name,
                mc.month,
                mc.cost,
                COALESCE(ms.sales, 0) as sales
            FROM monthly_costs mc
            LEFT JOIN monthly_sales ms ON mc.hotel_id = ms.hotel_id AND mc.month = ms.month
            JOIN hotels h ON mc.hotel_id = h.id
            ORDER BY mc.month ASC
        `;
        const monthDataResult = await client.query(monthDataQuery, [topNames]);
        const timeSeries = monthDataResult.rows;

        // Step 3: Get occupancy data from du_accounting table
        const occupancyDataQuery = `
            WITH hotel_depts AS (
                SELECT hotel_id, name FROM acc_departments WHERE is_current = TRUE
            ),
            monthly_occupancy AS (
                SELECT 
                    hd.hotel_id,
                    date_trunc('month', dua.accounting_month)::date as month,
                    SUM(dua.available_room_nights) as total_available_rooms,
                    SUM(dua.rooms_sold_nights) as total_sold_rooms
                FROM du_accounting dua
                JOIN hotel_depts hd ON dua.hotel_id = hd.hotel_id
                GROUP BY hd.hotel_id, date_trunc('month', dua.accounting_month)
            )
            SELECT 
                mo.hotel_id,
                h.name as hotel_name,
                mo.month,
                mo.total_available_rooms,
                mo.total_sold_rooms,
                CASE 
                    WHEN mo.total_available_rooms > 0 
                    THEN (mo.total_sold_rooms::decimal / mo.total_available_rooms::decimal) * 100 
                    ELSE 0 
                END as occupancy_percentage
            FROM monthly_occupancy mo
            JOIN hotels h ON mo.hotel_id = h.id
            WHERE mo.total_available_rooms > 0
            ORDER BY mo.month ASC, mo.hotel_id ASC
        `;
        const occupancyDataResult = await client.query(occupancyDataQuery);
        const occupancyData = occupancyDataResult.rows;

        return {
            topAccounts,
            timeSeries,
            occupancyData
        };
    } catch (err) {
        logger.error('Error in getCostBreakdownData:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

const getDepartmentGroups = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `SELECT * FROM acc_department_groups ORDER BY display_order ASC, name ASC`;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving department groups:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const getSubAccounts = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT 
            sub_account_id as id,
            sub_account_name as name,
            sub_account_code as code,
            sub_account_description as description,
            sub_account_display_order as display_order,
            sub_account_is_active as is_active,
            account_id as account_code_id,
            account_name,
            account_code
        FROM acc_accounts_with_sub_accounts
        WHERE sub_account_id IS NOT NULL
        ORDER BY account_code ASC, sub_account_display_order ASC, sub_account_name ASC
    `;

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error retrieving sub accounts:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    getAccountCodes,
    getMappings,
    getLedgerPreview,
    validateLedgerDataIntegrity,
    comparePmsVsYayoiData,
    getMonthlySalesComparison,
    getAvailableYayoiYears,
    getAvailableYayoiMonths,
    getRawDataForIntegrityAnalysis,
    getPlanReservationDetails,
    getHotelTotalsForIntegrityAnalysis,
    getManagementGroups,
    getTaxClasses,
    getDepartments,
    getDepartmentGroups,
    getDashboardMetrics,
    getReconciliationOverview,
    getReconciliationHotelDetails,
    getReconciliationClientDetails,
    getCostBreakdownData,
    getSubAccounts,
    getHotelsWithDepartments
};

