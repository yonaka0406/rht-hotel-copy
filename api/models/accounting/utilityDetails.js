const { getPool } = require('../../config/database');
const logger = require('../../config/logger');
const pgFormat = require('pg-format');

/**
 * Get utility details for a specific hotel and month range
 */
const getUtilityDetails = async (requestId, hotelId, startMonth, endMonth, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `
        SELECT * FROM acc_utility_details
        WHERE hotel_id = $1 AND (month BETWEEN $2 AND $3 OR transaction_date BETWEEN $2 AND $3)
        ORDER BY transaction_date ASC, month ASC
    `;

    try {
        const result = await client.query(query, [hotelId, startMonth, endMonth]);
        return result.rows;
    } catch (err) {
        logger.error('Error fetching utility details:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Create or update utility detail
 */
const upsertUtilityDetail = async (requestId, data, userId, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        if (data.id) {
            const query = `
                UPDATE acc_utility_details
                SET
                    hotel_id = $1,
                    month = $2,
                    transaction_date = $3,
                    account_name = $4,
                    sub_account_name = $5,
                    quantity = $6,
                    total_value = $7,
                    provider_name = $8,
                    created_by = $9
                WHERE id = $10
                RETURNING *
            `;
            const result = await client.query(query, [
                data.hotel_id, data.month, data.transaction_date, data.account_name,
                data.sub_account_name, data.quantity || 0, data.total_value || 0,
                data.provider_name, userId, data.id
            ]);
            return result.rows[0];
        } else {
            const query = `
                INSERT INTO acc_utility_details (
                    hotel_id, month, transaction_date, account_name, sub_account_name,
                    quantity, total_value, provider_name, created_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING *
            `;
            const result = await client.query(query, [
                data.hotel_id, data.month, data.transaction_date, data.account_name,
                data.sub_account_name, data.quantity || 0, data.total_value || 0,
                data.provider_name, userId
            ]);
            return result.rows[0];
        }
    } catch (err) {
        logger.error('Error upserting utility detail:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Delete utility detail
 */
const deleteUtilityDetail = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    try {
        await client.query('DELETE FROM acc_utility_details WHERE id = $1', [id]);
        return true;
    } catch (err) {
        logger.error('Error deleting utility detail:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Get suggestions from Yayoi data for utility bills
 */
const getUtilitySuggestions = async (requestId, hotelId, month, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    // We look for departments associated with the hotel
    const deptQuery = `SELECT name FROM acc_departments WHERE hotel_id = $1`;

    try {
        const deptRes = await client.query(deptQuery, [hotelId]);
        const deptNames = deptRes.rows.map(r => r.name);

        if (deptNames.length === 0) return [];

        // Query acc_yayoi_data for utility accounts and these departments
        const query = `
            SELECT
                transaction_date,
                debit_account_code as account_name,
                debit_sub_account as sub_account_name,
                debit_amount as amount,
                summary
            FROM acc_yayoi_data
            WHERE (debit_account_code = '水道光熱費' OR debit_account_code = '水道光熱費原価')
            AND debit_department = ANY($1)
            AND DATE_TRUNC('month', transaction_date) = $2

            UNION ALL

            SELECT
                transaction_date,
                credit_account_code as account_name,
                credit_sub_account as sub_account_name,
                -credit_amount as amount,
                summary
            FROM acc_yayoi_data
            WHERE (credit_account_code = '水道光熱費' OR credit_account_code = '水道光熱費原価')
            AND credit_department = ANY($1)
            AND DATE_TRUNC('month', transaction_date) = $2

            ORDER BY transaction_date ASC
        `;

        const result = await client.query(query, [deptNames, month]);
        return result.rows;
    } catch (err) {
        logger.error('Error fetching utility suggestions:', err);
        throw err;
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    getUtilityDetails,
    upsertUtilityDetail,
    deleteUtilityDetail,
    getUtilitySuggestions
};
