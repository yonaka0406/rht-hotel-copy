const { getPool } = require('../../config/database');

// Return all plan_addons
const getAllPlanAddons = async (requestId, plans_global_id, plans_hotel_id, hotel_id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = `        
        SELECT 
            pa.*
            ,COALESCE(ag.name, ah.name) AS addon_name            
            ,tax_info.name as tax_type
            ,pa.sales_category            
        FROM 
            plan_addons AS pa
                JOIN
            tax_info
                ON pa.tax_type_id = tax_info.id
                LEFT OUTER JOIN
            addons_global AS ag
                ON pa.addons_global_id = ag.id
                LEFT OUTER JOIN
            addons_hotel AS ah
                ON pa.addons_hotel_id = ah.id
        WHERE
            (pa.plans_global_id = $1 AND pa.plans_hotel_id IS NULL) OR             
            (pa.plans_hotel_id = $2 AND pa.hotel_id = $3 AND pa.plans_global_id IS NULL)
        ORDER BY addon_name ASC
    `;

    try {
        const result = await client.query(query, [
            plans_global_id || null,
            plans_hotel_id || null,
            hotel_id || null,
        ]);
        return result.rows;
    } catch (err) {
        console.error('Error retrieving plan addons:', err);
        throw new Error('Database error');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

// Get plan_addon by ID
const getPlanAddonById = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    const query = 'SELECT * FROM plan_addons WHERE id = $1';

    try {
        const result = await client.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan addon not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error retrieving plan addon with ID ${id}:`, err);
        throw err;
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

module.exports = {
    getAllPlanAddons,
    getPlanAddonById
};
