const { getPool } = require('../../../config/database');
const logger = require('../../../config/logger');

/**
 * Fetches all sub-accounts under '売掛金' with their cumulative balances.
 * @param {string} requestId 
 * @param {object} options Filter options (e.g., minBalance)
 * @param {object} dbClient Optional database client for transactions
 */
const getReceivableBalances = async (requestId, options = {}, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    try {
        const { minBalance = 0 } = options;
        
        logger.debug(`[ReceivablesModel] getReceivableBalances called. RequestId: ${requestId}, Options: ${JSON.stringify(options)}`);
        
        // We aggregate ALL data up to the current state to get the actual balance.
        const query = `
            SELECT 
                sub_account,
                -SUM(total_amount) as balance,
                MAX(month) as last_activity_month
            FROM acc_monthly_account_summary
            WHERE account_name = '売掛金'
            GROUP BY sub_account
            HAVING -SUM(total_amount) != 0
            ORDER BY balance DESC;
        `;
        
        const result = await client.query(query);
        logger.debug(`[ReceivablesModel] Query executed. Found ${result.rows.length} rows.`);
        
        return result.rows;
    } catch (err) {
        logger.error(`[ReceivablesModel] Error in getReceivableBalances: ${err.message}`, { stack: err.stack });
        throw err;
    } finally {
        if (!dbClient) client.release();
    }
};

/**
 * Fetches the monthly history of a specific sub-account under '売掛金'.
 */
const getReceivableSubAccountHistory = async (requestId, subAccount, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    try {
        const query = `
            WITH monthly_sums AS (
                SELECT 
                    DATE_TRUNC('month', transaction_date)::DATE as month,
                    SUM(CASE WHEN debit_account_code = '売掛金' AND debit_sub_account = $1 THEN debit_amount ELSE 0 END) as total_increase,
                    SUM(CASE WHEN credit_account_code = '売掛金' AND credit_sub_account = $1 THEN credit_amount ELSE 0 END) as total_decrease
                FROM acc_yayoi_data
                WHERE (debit_account_code = '売掛金' AND debit_sub_account = $1)
                   OR (credit_account_code = '売掛金' AND credit_sub_account = $1)
                GROUP BY month
            ),
            cumulative AS (
                SELECT 
                    month,
                    total_increase,
                    total_decrease,
                    (total_increase - total_decrease) as monthly_change,
                    SUM(total_increase - total_decrease) OVER (ORDER BY month) as cumulative_balance
                FROM monthly_sums
            )
            SELECT * FROM cumulative
            ORDER BY month DESC;
        `;
        const result = await client.query(query, [subAccount]);
        return result.rows;
    } catch (err) {
        logger.error(`[ReceivablesModel] Error in getReceivableSubAccountHistory: ${err.message}`, { stack: err.stack });
        throw err;
    } finally {
        if (!dbClient) client.release();
    }
};

/**
 * Searches for clients across the entire system.
 * Used for linking receivables (sub-accounts) to actual client records.
 */
const searchClients = async (requestId, searchTerm, dbClient = null) => {
    const client = dbClient || await pool.get(requestId).connect();
    try {
        const query = `
            SELECT 
                id,
                name,
                name_kana,
                name_kanji,
                email,
                phone,
                customer_id,
                legal_or_natural_person
            FROM clients
            WHERE (
                name ILIKE $1 OR 
                name_kana ILIKE $1 OR 
                name_kanji ILIKE $1 OR 
                email ILIKE $1 OR 
                phone ILIKE $1 OR
                customer_id ILIKE $1
            )
            AND id NOT IN ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
            ORDER BY COALESCE(name_kanji, name_kana, name) ASC
            LIMIT 50;
        `;
        const result = await client.query(query, [`%${searchTerm}%`]);
        return result.rows;
    } finally {
        if (!dbClient) client.release();
    }
};

module.exports = {
    getReceivableBalances,
    searchClients,
    getReceivableSubAccountHistory
};
