const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const upsertAccountCode = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { code, name, description, category, is_active } = data;

    const query = `
        INSERT INTO acc_account_codes (code, name, description, category, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            is_active = EXCLUDED.is_active,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;
    const values = [code, name, description, category, is_active, user_id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error upserting account code:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const upsertMapping = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { hotel_id, target_type, target_id, account_code_id } = data;

    const query = `
        INSERT INTO acc_accounting_mappings (hotel_id, target_type, target_id, account_code_id, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $5)
        ON CONFLICT (hotel_id, target_type, target_id) DO UPDATE SET
            account_code_id = EXCLUDED.account_code_id,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;
    const values = [hotel_id, target_type, target_id, account_code_id, user_id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error upserting accounting mapping:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const deleteMapping = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `DELETE FROM acc_accounting_mappings WHERE id = $1 RETURNING *`;

    try {
        const result = await client.query(query, [id]);
        return result.rows[0];
    } catch (err) {
        logger.error('Error deleting accounting mapping:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    upsertAccountCode,
    upsertMapping,
    deleteMapping
};
