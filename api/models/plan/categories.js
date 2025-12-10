const { getPool } = require('../../config/database');

// --- Plan Type Categories ---

const selectAllPlanTypeCategories = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_type_categories ORDER BY display_order, id';

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving plan type categories:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectPlanTypeCategoryById = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_type_categories WHERE id = $1';

    try {
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error retrieving plan type category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectPlanTypeCategoryByName = async (requestId, name, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_type_categories WHERE name = $1';

    try {
        const result = await client.query(query, [name]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error retrieving plan type category by name:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const insertPlanTypeCategory = async (requestId, name, description, color, display_order, created_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO plan_type_categories (name, description, color, display_order, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [name, description, color, display_order, created_by];

    try {
        const result = await client.query(query, values);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error inserting plan type category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updatePlanTypeCategory = async (requestId, id, name, description, color, display_order, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE plan_type_categories
        SET name = $1, description = $2, color = $3, display_order = $4, updated_by = $5
        WHERE id = $6
        RETURNING *;
    `;
    const values = [name, description, color, display_order, updated_by, id];

    try {
        const result = await client.query(query, values);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error updating plan type category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const deletePlanTypeCategory = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'DELETE FROM plan_type_categories WHERE id = $1 RETURNING *';

    try {
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error deleting plan type category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};


// --- Plan Package Categories ---

const selectAllPlanPackageCategories = async (requestId, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_package_categories ORDER BY display_order, id';

    try {
        const result = await client.query(query);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving plan package categories:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectPlanPackageCategoryById = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_package_categories WHERE id = $1';

    try {
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error retrieving plan package category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const selectPlanPackageCategoryByName = async (requestId, name, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_package_categories WHERE name = $1';

    try {
        const result = await client.query(query, [name]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error retrieving plan package category by name:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const insertPlanPackageCategory = async (requestId, name, description, color, display_order, created_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        INSERT INTO plan_package_categories (name, description, color, display_order, created_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const values = [name, description, color, display_order, created_by];

    try {
        const result = await client.query(query, values);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error inserting plan package category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const updatePlanPackageCategory = async (requestId, id, name, description, color, display_order, updated_by, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `
        UPDATE plan_package_categories
        SET name = $1, description = $2, color = $3, display_order = $4, updated_by = $5
        WHERE id = $6
        RETURNING *;
    `;
    const values = [name, description, color, display_order, updated_by, id];

    try {
        const result = await client.query(query, values);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error updating plan package category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

const deletePlanPackageCategory = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'DELETE FROM plan_package_categories WHERE id = $1 RETURNING *';

    try {
        const result = await client.query(query, [id]);
        if (result.rowCount === 0) return null;
        return result.rows[0];
    } catch (err) {
        console.error('Error deleting plan package category:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) client.release();
    }
};

module.exports = {
    selectAllPlanTypeCategories,
    selectPlanTypeCategoryById,
    selectPlanTypeCategoryByName,
    insertPlanTypeCategory,
    updatePlanTypeCategory,
    deletePlanTypeCategory,
    selectAllPlanPackageCategories,
    selectPlanPackageCategoryById,
    selectPlanPackageCategoryByName,
    insertPlanPackageCategory,
    updatePlanPackageCategory,
    deletePlanPackageCategory
};
