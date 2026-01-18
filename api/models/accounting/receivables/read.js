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
        
        const query = `
            WITH all_movements AS (
                SELECT debit_sub_account as sub_account, debit_amount as amount, transaction_date
                FROM acc_yayoi_data WHERE debit_account_code = '売掛金'
                UNION ALL
                SELECT credit_sub_account as sub_account, -credit_amount as amount, transaction_date
                FROM acc_yayoi_data WHERE credit_account_code = '売掛金'
            ),
            latest_date AS (
                SELECT DATE_TRUNC('month', MAX(transaction_date))::DATE as max_month 
                FROM all_movements
            ),
            balances AS (
                SELECT 
                    sub_account,
                    SUM(amount) as balance,
                    MAX(transaction_date) as last_activity_date
                FROM all_movements
                WHERE sub_account IS NOT NULL
                GROUP BY sub_account
            ),
            latest_sales AS (
                SELECT 
                    sub_account,
                    SUM(amount) as amount
                FROM all_movements, latest_date
                WHERE amount > 0 
                  AND DATE_TRUNC('month', transaction_date)::DATE = latest_date.max_month
                GROUP BY sub_account
            )
            SELECT 
                b.sub_account,
                b.balance,
                b.last_activity_date as last_activity_month,
                COALESCE(ls.amount, 0) as latest_month_sales,
                (SELECT max_month FROM latest_date) as latest_data_month
            FROM balances b
            LEFT JOIN latest_sales ls ON b.sub_account = ls.sub_account
            WHERE b.balance != 0
            ORDER BY b.balance DESC;
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
            WITH movements AS (
                SELECT transaction_date, debit_amount as increase, 0 as decrease
                FROM acc_yayoi_data 
                WHERE debit_account_code = '売掛金' AND debit_sub_account = $1
                UNION ALL
                SELECT transaction_date, 0 as increase, credit_amount as decrease
                FROM acc_yayoi_data 
                WHERE credit_account_code = '売掛金' AND credit_sub_account = $1
            ),
            monthly_sums AS (
                SELECT 
                    DATE_TRUNC('month', transaction_date)::DATE as month,
                    SUM(increase) as total_increase,
                    SUM(decrease) as total_decrease
                FROM movements
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
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
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
                customer_id::TEXT ILIKE $1
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
