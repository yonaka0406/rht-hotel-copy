const { getPool } = require('../../config/database');
const logger = require('../../config/logger');
const pgFormat = require('pg-format');

/**
 * Upsert Forecast Entries
 * @param {string} requestId 
 * @param {Array} entries Array of objects { hotel_id, department_name, month, account_name, sub_account_name, amount }
 * @param {number} userId 
 */
const upsertForecastEntries = async (requestId, entries, userId, dbClient = null) => {
    if (!entries || entries.length === 0) return [];

    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        // 1. Resolve account_code_ids and sub_account_ids from names
        const accountNames = [...new Set(entries.map(e => e.account_name))];
        const subAccountNames = [...new Set(entries.filter(e => e.sub_account_name).map(e => e.sub_account_name))];

        const [accountResult, subAccountResult] = await Promise.all([
            client.query(`SELECT id, name FROM acc_account_codes WHERE name = ANY($1)`, [accountNames]),
            client.query(`SELECT id, name, account_code_id FROM acc_sub_accounts WHERE name = ANY($1)`, [subAccountNames])
        ]);

        const accountMap = Object.fromEntries(accountResult.rows.map(r => [r.name, r.id]));
        const subAccountMap = {}; // { "account_id:sub_name": id }
        subAccountResult.rows.forEach(r => {
            subAccountMap[`${r.account_code_id}:${r.name}`] = r.id;
        });

        const values = entries.map(e => {
            const accountId = accountMap[e.account_name] || null;
            const subAccountId = accountId && e.sub_account_name ? subAccountMap[`${accountId}:${e.sub_account_name}`] : null;

            return [
                e.hotel_id || null,
                e.department_name || null,
                e.month,
                accountId,
                e.account_name,
                subAccountId,
                e.sub_account_name || null,
                e.amount || 0,
                userId, // created_by
                userId  // updated_by
            ];
        });

        const query = pgFormat(
            `INSERT INTO du_forecast_entries (
                hotel_id, department_name, month, account_code_id, account_name, 
                sub_account_id, sub_account_name, amount, created_by, updated_by
             )
             VALUES %L
             ON CONFLICT (hotel_id, department_name, month, account_name, sub_account_name) DO UPDATE SET
                account_code_id = EXCLUDED.account_code_id,
                sub_account_id = EXCLUDED.sub_account_id,
                amount = EXCLUDED.amount,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            values
        );

        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error upserting forecast entries:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get Entries (Forecast) for a specific hotel/department and month range
 */
const getEntries = async (requestId, type, hotelId, startMonth, endMonth, departmentName = null, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    // Actuals entries table removed; return empty if type is accounting
    if (type !== 'forecast') {
        if (shouldRelease) client.release();
        return [];
    }

    const query = `
        SELECT e.*, a.code as account_code, a.management_group_id
        FROM du_forecast_entries e
        LEFT JOIN acc_account_codes a ON e.account_name = a.name
        WHERE (e.hotel_id = $1 OR ($1 IS NULL AND e.hotel_id IS NULL))
        AND (e.department_name = $4 OR ($4 IS NULL AND e.department_name IS NULL))
        AND e.month BETWEEN $2 AND $3
        ORDER BY e.month, e.account_name, e.sub_account_name
    `;

    try {
        const result = await client.query(query, [hotelId, startMonth, endMonth, departmentName]);
        return result.rows;
    } catch (err) {
        logger.error(`Error fetching forecast entries:`, err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    upsertForecastEntries,
    getEntries
};
