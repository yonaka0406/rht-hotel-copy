const { getPool } = require('../../config/database');

// Add entry
const newGlobalAddon = async (requestId, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            INSERT INTO addons_global (name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *;
        `;
        const values = [name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding global addon:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

const newHotelAddon = async (requestId, hotel_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by, addons_global_id, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            INSERT INTO addons_hotel (hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
        `;
        const values = [hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, created_by, updated_by];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error adding hotel addon:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

// Update entry
const updateGlobalAddon = async (requestId, id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            UPDATE addons_global
            SET 
                name = $1, 
                description = $2, 
                addon_type = $3,
                price = $4,
                tax_type_id = $5,
                tax_rate = $6,
                visible = $7, 
                updated_by = $8
            WHERE id = $9
            RETURNING *;
        `;
        const values = [name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, id];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error updating global addon:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

const updateHotelAddon = async (requestId, id, hotel_id, addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, dbClient = null) => {
    const isTransactionOwner = !dbClient;
    const client = dbClient || await getPool(requestId).connect();

    try {
        if (isTransactionOwner) {
            await client.query('BEGIN');
        }

        const query = `
            UPDATE addons_hotel
            SET 
                addons_global_id = $1, 
                name = $2,
                description = $3,
                addon_type = $4, 
                price = $5, 
                tax_type_id = $6, 
                tax_rate = $7, 
                visible = $8, 
                updated_by = $9 
            WHERE hotel_id = $10 AND id = $11
            RETURNING *;
        `;
        const values = [addons_global_id, name, description, addon_type, price, tax_type_id, tax_rate, visible, updated_by, hotel_id, id];

        const result = await client.query(query, values);

        if (isTransactionOwner) {
            await client.query('COMMIT');
        }
        return result.rows[0];
    } catch (err) {
        if (isTransactionOwner) {
            await client.query('ROLLBACK');
        }
        console.error('Error updating hotel addon:', err);
        throw err;
    } finally {
        if (isTransactionOwner) {
            client.release();
        }
    }
};

module.exports = {
    newGlobalAddon,
    newHotelAddon,
    updateGlobalAddon,
    updateHotelAddon
};
