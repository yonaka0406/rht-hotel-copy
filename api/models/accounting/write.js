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

const upsertDepartment = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { id, hotel_id, name, is_current } = data;

    try {
        let result;

        if (id) {
            // Update existing record by ID
            const query = `
                UPDATE acc_departments 
                SET 
                    hotel_id = $1,
                    name = $2,
                    is_current = COALESCE($3, is_current),
                    updated_by = $4,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $5
                RETURNING *;
            `;
            const values = [hotel_id, name, is_current, user_id, id];
            result = await client.query(query, values);

            if (result.rows.length === 0) {
                throw new Error(`Department with id ${id} not found`);
            }
        } else {
            // Insert new record with conflict handling
            const query = `
                INSERT INTO acc_departments (hotel_id, name, is_current, created_by, updated_by)
                VALUES ($1, $2, COALESCE($3, false), $4, $4)
                ON CONFLICT (hotel_id, name) DO UPDATE SET
                    is_current = EXCLUDED.is_current,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
            `;
            const values = [hotel_id, name, is_current, user_id];
            result = await client.query(query, values);
        }

        return result.rows[0];
    } catch (err) {
        logger.error('Error upserting department:', err);
        if (err.message.includes('not found')) {
            throw err;
        }
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const deleteDepartment = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `DELETE FROM acc_departments WHERE id = $1 RETURNING *`;
    try {
        const result = await client.query(query, [id]);
        return result.rows[0];
    } catch (err) {
        logger.error('Error deleting department:', err);
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const upsertSubAccount = async (requestId, data, user_id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const { id, account_code_id, code, name, description, is_active, display_order } = data;

    try {
        let result;

        if (id) {
            // Update existing record by ID
            const query = `
                UPDATE acc_sub_accounts 
                SET 
                    account_code_id = $1,
                    code = $2,
                    name = $3,
                    description = $4,
                    is_active = COALESCE($5, is_active),
                    display_order = COALESCE($6, display_order),
                    updated_by = $7,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $8
                RETURNING *;
            `;
            const values = [account_code_id, code, name, description, is_active, display_order, user_id, id];
            result = await client.query(query, values);

            if (result.rows.length === 0) {
                throw new Error(`Sub-account with id ${id} not found`);
            }
        } else {
            // Get next display order if not provided
            let finalDisplayOrder = display_order;
            if (!finalDisplayOrder) {
                const orderQuery = `
                    SELECT COALESCE(MAX(display_order), 0) + 1 as next_order 
                    FROM acc_sub_accounts 
                    WHERE account_code_id = $1
                `;
                const orderResult = await client.query(orderQuery, [account_code_id]);
                finalDisplayOrder = orderResult.rows[0].next_order;
            }

            // Insert new record with conflict handling on (account_code_id, name)
            const query = `
                INSERT INTO acc_sub_accounts (account_code_id, code, name, description, is_active, display_order, created_by, updated_by)
                VALUES ($1, $2, $3, $4, COALESCE($5, true), $6, $7, $7)
                ON CONFLICT (account_code_id, name) DO UPDATE SET
                    code = EXCLUDED.code,
                    description = EXCLUDED.description,
                    is_active = EXCLUDED.is_active,
                    display_order = EXCLUDED.display_order,
                    updated_by = EXCLUDED.updated_by,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING *;
            `;
            const values = [account_code_id, code, name, description, is_active, finalDisplayOrder, user_id];
            result = await client.query(query, values);
        }

        return result.rows[0];
    } catch (err) {
        logger.error('Error upserting sub-account:', err);
        if (err.message.includes('not found')) {
            throw err;
        }
        if (err.constraint === 'acc_sub_accounts_account_code_id_code_key') {
            throw new Error('Sub-account code must be unique within the account');
        }
        throw new Error('Database error');
    } finally {
        if (shouldRelease) client.release();
    }
};

const deleteSubAccount = async (requestId, id, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    const query = `DELETE FROM acc_sub_accounts WHERE id = $1 RETURNING *`;
    try {
        const result = await client.query(query, [id]);
        return result.rows[0];
    } catch (err) {
        logger.error('Error deleting sub-account:', err);
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
    deleteTaxClass,
    upsertDepartment,
    deleteDepartment,
    upsertSubAccount,
    deleteSubAccount
};
