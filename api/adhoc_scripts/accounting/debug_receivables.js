const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { getReceivableBalances } = require('../../models/accounting/receivables/read');

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
});

async function run() {
    const requestId = 'debug-request';

    try {
        console.log('--- Debugging Receivable Balances ---');
        
        // 1. Check global max date and month
        const maxDateQuery = `
            WITH all_movements AS (
                SELECT debit_sub_account as sub_account, debit_amount as amount, transaction_date
                FROM acc_yayoi_data WHERE debit_account_code = '売掛金'
                UNION ALL
                SELECT credit_sub_account as sub_account, -credit_amount as amount, transaction_date
                FROM acc_yayoi_data WHERE credit_account_code = '売掛金'
            )
            SELECT 
                MAX(transaction_date) as max_date,
                DATE_TRUNC('month', MAX(transaction_date))::DATE as max_month 
            FROM all_movements;
        `;
        const maxDateResult = await pool.query(maxDateQuery);
        console.log('Global Max Date info:', maxDateResult.rows[0]);

        const maxMonth = maxDateResult.rows[0].max_month;

        // 2. Check "阿部建設㈱" specifically
        const subAccount = '阿部建設㈱';
        const subAccountQuery = `
            WITH all_movements AS (
                SELECT debit_sub_account as sub_account, debit_amount as amount, transaction_date
                FROM acc_yayoi_data WHERE debit_account_code = '売掛金'
                UNION ALL
                SELECT credit_sub_account as sub_account, -credit_amount as amount, transaction_date
                FROM acc_yayoi_data WHERE credit_account_code = '売掛金'
            )
            SELECT 
                transaction_date,
                amount,
                DATE_TRUNC('month', transaction_date)::DATE as t_month
            FROM all_movements
            WHERE sub_account = $1
            ORDER BY transaction_date DESC
            LIMIT 10;
        `;
        const subAccountResult = await pool.query(subAccountQuery, [subAccount]);
        console.log(`Recent transactions for ${subAccount}:`);
        console.table(subAccountResult.rows);

        // 3. Run the actual model function
        const client = await pool.connect();
        try {
            const balances = await getReceivableBalances(requestId, {}, client);
            const target = balances.find(b => b.sub_account === subAccount);
            console.log(`Model output for ${subAccount}:`, target);

            // 4. Check if there are ANY sales in the max_month for this sub-account
            if (target && target.latest_month_sales === 0) {
                console.log(`\nWhy is latest_month_sales 0? Checking for amount > 0 in ${maxMonth} for ${subAccount}...`);
                const checkSalesQuery = `
                    WITH all_movements AS (
                        SELECT debit_sub_account as sub_account, debit_amount as amount, transaction_date
                        FROM acc_yayoi_data WHERE debit_account_code = '売掛金'
                        UNION ALL
                        SELECT credit_sub_account as sub_account, -credit_amount as amount, transaction_date
                        FROM acc_yayoi_data WHERE credit_account_code = '売掛金'
                    )
                    SELECT * FROM all_movements 
                    WHERE sub_account = $1 
                    AND amount > 0 
                    AND DATE_TRUNC('month', transaction_date)::DATE = $2;
                `;
                const checkSalesResult = await pool.query(checkSalesQuery, [subAccount, maxMonth]);
                console.log(`Sales found in ${maxMonth}:`, checkSalesResult.rows.length);
            }
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Error during debug:', err);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();
