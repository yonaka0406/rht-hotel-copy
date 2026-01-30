const { getPool } = require('../../config/database');
const logger = require('../../config/logger');
const { getLedgerPreview } = require('./read');

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

module.exports = {
    validateLedgerDataIntegrity,
    transformLedgerDataToPmsFormat,
    getRawDataForIntegrityAnalysis,
    getHotelTotalsForIntegrityAnalysis,
    getPlanReservationDetails
};
