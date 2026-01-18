const { pool } = require('../../../config/database');

/**
 * Fetches all sub-accounts under '売掛金' with their cumulative balances.
 * @param {string} requestId 
 * @param {object} options Filter options (e.g., minBalance)
 * @param {object} dbClient Optional database client for transactions
 */
const getReceivableBalances = async (requestId, options = {}, dbClient = null) => {
    const client = dbClient || await pool.get(requestId).connect();
    try {
        const { minBalance = 0 } = options;
        
        // We aggregate ALL data up to the current state to get the actual balance.
        // Debit (amount < 0 in our view for assets) means increase in Receivables?
        // Wait, let's check acc_monthly_account_summary logic:
        // Debit legs: -(debit_amount) as amount -> So debits are negative.
        // Credit legs: credit_amount as amount -> So credits are positive.
        // For Assets (like 売掛金):
        // Increase (Debit) is negative in our view.
        // Decrease (Credit) is positive in our view.
        // Balance = Sum(Debits) - Sum(Credits).
        // In our view: Sum(amount) will be (Credits - Debits).
        // If we want Balance = Debits - Credits, we need -Sum(amount).
        
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
        return result.rows;
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
    searchClients
};
