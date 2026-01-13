const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const getAccountCodes = async (requestId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT * FROM acc_account_codes 
        ORDER BY code ASC
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
        SELECT am.*, ac.code as account_code, ac.name as account_name, ac.category as account_category
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
        WITH sales_data AS (
            SELECT 
                rd.hotel_id,
                rd.plans_hotel_id,
                ph.plan_type_category_id,
                rr.tax_rate,
                SUM(rr.price) as amount
            FROM reservation_details rd
            JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
            JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
            WHERE rd.date BETWEEN $1 AND $2
            AND rd.hotel_id = ANY($3::int[])
            AND rd.cancelled IS NULL
            GROUP BY rd.hotel_id, rd.plans_hotel_id, ph.plan_type_category_id, rr.tax_rate
        ),
        mapped_sales AS (
            SELECT 
                sd.*,
                (
                    SELECT am.account_code_id
                    FROM acc_accounting_mappings am
                    WHERE (
                        (am.target_type = 'plan_hotel' AND am.target_id = sd.plans_hotel_id AND am.hotel_id = sd.hotel_id)
                        OR
                        (am.target_type = 'plan_type_category' AND am.target_id = sd.plan_type_category_id AND (am.hotel_id = sd.hotel_id OR am.hotel_id IS NULL))
                    )
                    ORDER BY 
                        CASE 
                            WHEN am.target_type = 'plan_hotel' THEN 1
                            WHEN am.target_type = 'plan_type_category' AND am.hotel_id IS NOT NULL THEN 2
                            WHEN am.target_type = 'plan_type_category' AND am.hotel_id IS NULL THEN 3
                            ELSE 4
                        END ASC
                    LIMIT 1
                ) as account_code_id
            FROM sales_data sd
        )
        SELECT 
            h.id as hotel_id,
            h.name as hotel_name,
            ptc.id as plan_type_category_id,
            ptc.name as plan_type_category_name,
            ac.code as account_code,
            ac.name as account_name,
            ms.tax_rate,
            COALESCE(atc.yayoi_name, '対象外') as tax_category,
            SUM(ms.amount) as total_amount
        FROM mapped_sales ms
        JOIN hotels h ON ms.hotel_id = h.id
        JOIN plan_type_categories ptc ON ms.plan_type_category_id = ptc.id
        LEFT JOIN acc_account_codes ac ON ms.account_code_id = ac.id
        LEFT JOIN acc_tax_classes atc ON ms.tax_rate = atc.tax_rate AND atc.yayoi_name LIKE '課税売上%'
        GROUP BY h.id, h.name, ptc.id, ptc.name, ac.code, ac.name, ms.tax_rate, atc.yayoi_name
        ORDER BY h.id, ptc.id, ms.tax_rate DESC
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

module.exports = {
    getAccountCodes,
    getMappings,
    getLedgerPreview
};
