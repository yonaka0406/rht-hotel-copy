const { getPool } = require('../../config/database');
const logger = require('../../config/logger');
const pgFormat = require('pg-format');

/**
 * Upsert Forecast Entries
 * @param {string} requestId 
 * @param {Array} entries Array of objects { hotel_id, month, account_name, amount }
 * @param {number} userId 
 */
const upsertForecastEntries = async (requestId, entries, userId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    if (!entries || entries.length === 0) return [];

    try {
        const values = entries.map(e => [
            e.hotel_id,
            e.month,
            e.account_name,
            e.amount || 0,
            userId
        ]);

        const query = pgFormat(
            `INSERT INTO du_forecast_entries (hotel_id, month, account_name, amount, created_by)
             VALUES %L
             ON CONFLICT (hotel_id, month, account_name) DO UPDATE SET
                amount = EXCLUDED.amount,
                created_by = EXCLUDED.created_by
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
 * Upsert Accounting Entries
 * @param {string} requestId 
 * @param {Array} entries Array of objects { hotel_id, month, account_name, amount }
 * @param {number} userId 
 */
const upsertAccountingEntries = async (requestId, entries, userId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    if (!entries || entries.length === 0) return [];

    try {
        const values = entries.map(e => [
            e.hotel_id,
            e.month,
            e.account_name,
            e.amount || 0,
            userId
        ]);

        const query = pgFormat(
            `INSERT INTO du_accounting_entries (hotel_id, month, account_name, amount, created_by)
             VALUES %L
             ON CONFLICT (hotel_id, month, account_name) DO UPDATE SET
                amount = EXCLUDED.amount,
                created_by = EXCLUDED.created_by
             RETURNING *`,
            values
        );

        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        logger.error('Error upserting accounting entries:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get Entries (Forecast or Accounting) for a specific hotel and month range
 */
const getEntries = async (requestId, type, hotelId, startMonth, endMonth, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const tableName = type === 'forecast' ? 'du_forecast_entries' : 'du_accounting_entries';

    const query = `
        SELECT e.*, a.code as account_code, a.management_group_id
        FROM ${tableName} e
        LEFT JOIN acc_account_codes a ON e.account_name = a.name
        WHERE e.hotel_id = $1 AND e.month BETWEEN $2 AND $3
        ORDER BY e.month, e.account_name
    `;

    try {
        const result = await client.query(query, [hotelId, startMonth, endMonth]);
        return result.rows;
    } catch (err) {
        logger.error(`Error fetching ${type} entries:`, err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    upsertForecastEntries,
    upsertAccountingEntries,
    getEntries
};