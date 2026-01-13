const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const upsertAccountCode = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { id, code, name, category1, category2, category3, category4, management_group_code, management_group_id, is_active } = data;

    const query = `
        INSERT INTO acc_account_codes (
            id, code, name, category1, category2, category3, category4, 
            management_group_code, management_group_id, is_active, created_by, updated_by
        )
        VALUES (COALESCE($1, nextval('acc_account_codes_id_seq')), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
        ON CONFLICT (code) DO UPDATE SET
            name = EXCLUDED.name,
            category1 = EXCLUDED.category1,
            category2 = EXCLUDED.category2,
            category3 = EXCLUDED.category3,
            category4 = EXCLUDED.category4,
            management_group_code = EXCLUDED.management_group_code,
            management_group_id = EXCLUDED.management_group_id,
            is_active = EXCLUDED.is_active,
            updated_by = EXCLUDED.updated_by,
            updated_at = CURRENT_TIMESTAMP
        RETURNING *;
    `;
    const values = [id, code, name, category1, category2, category3, category4, management_group_code, management_group_id, is_active, user_id];

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

const deleteAccountCode = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `DELETE FROM acc_account_codes WHERE id = $1 RETURNING *`;
    try {
        const result = await client.query(query, [id]);
        return result.rows[0];
    } catch (err) {
        logger.error('Error deleting account code:', err);
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

const upsertManagementGroup = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { id, name, display_order } = data;

    const query = `
        INSERT INTO acc_management_groups (id, name, display_order, created_by)
        VALUES (COALESCE($1, nextval('acc_management_groups_id_seq')), $2, $3, $4)
        ON CONFLICT (name) DO UPDATE SET
            display_order = EXCLUDED.display_order
        RETURNING *;
    `;
    const values = [id, name, display_order, user_id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error upserting management group:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const deleteManagementGroup = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `DELETE FROM acc_management_groups WHERE id = $1 RETURNING *`;
    try {
        const result = await client.query(query, [id]);
        return result.rows[0];
    } catch (err) {
        logger.error('Error deleting management group:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const upsertTaxClass = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { id, name, yayoi_name, tax_rate, is_active, display_order } = data;

    const query = `
        INSERT INTO acc_tax_classes (id, name, yayoi_name, tax_rate, is_active, display_order, created_by)
        VALUES (COALESCE($1, nextval('acc_tax_classes_id_seq')), $2, $3, $4, $5, $6, $7)
        ON CONFLICT (name) DO UPDATE SET
            yayoi_name = EXCLUDED.yayoi_name,
            tax_rate = EXCLUDED.tax_rate,
            is_active = EXCLUDED.is_active,
            display_order = EXCLUDED.display_order
        RETURNING *;
    `;
    const values = [id, name, yayoi_name, tax_rate, is_active, display_order, user_id];

    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        logger.error('Error upserting tax class:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const deleteTaxClass = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `DELETE FROM acc_tax_classes WHERE id = $1 RETURNING *`;
    try {
        const result = await client.query(query, [id]);
        return result.rows[0];
    } catch (err) {
        logger.error('Error deleting tax class:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

module.exports = {
    upsertAccountCode,
    deleteAccountCode,
    upsertMapping,
    deleteMapping,
    upsertManagementGroup,
    deleteManagementGroup,
    upsertTaxClass,
    deleteTaxClass
};
