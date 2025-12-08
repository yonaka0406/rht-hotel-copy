const { getPool } = require('../../config/database');

// Create a new plans_rate
const createPlansRate = async (requestId, plansRate) => {
    const pool = getPool(requestId);
    const query = `
        INSERT INTO plans_rates (
            hotel_id, 
            plans_hotel_id, 
            adjustment_type, 
            adjustment_value, 
            tax_type_id,
            tax_rate,
            condition_type, 
            condition_value, 
            date_start, 
            date_end, 
            created_by,
            updated_by,
            include_in_cancel_fee,
            sales_category,
            comment
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
    `;

    const values = [
        plansRate.hotel_id,
        plansRate.plans_hotel_id,
        plansRate.adjustment_type,
        plansRate.adjustment_value,
        plansRate.tax_type_id,
        plansRate.tax_rate,
        plansRate.condition_type,
        plansRate.condition_value,
        plansRate.date_start,
        plansRate.date_end,
        plansRate.created_by,
        plansRate.updated_by,
        plansRate.include_in_cancel_fee || false,
        plansRate.sales_category || 'accommodation',
        plansRate.comment
    ];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error creating plan rate:', err);
        throw err;
    }
};

// Update an existing plans_rate
const updatePlansRate = async (requestId, id, plansRate) => {
    const pool = getPool(requestId);
    const query = `
        UPDATE plans_rates
        SET 
            hotel_id = $1,
            plans_hotel_id = $2,
            adjustment_type = $3,
            adjustment_value = $4,
            tax_type_id = $5,
            tax_rate = $6,
            condition_type = $7,
            condition_value = $8,
            date_start = $9,
            date_end = $10,
            updated_by = $11,
            include_in_cancel_fee = $12,
            sales_category = $13,
            comment = $14
        WHERE id = $15
        RETURNING *
    `;

    const values = [
        plansRate.hotel_id,
        plansRate.plans_hotel_id,
        plansRate.adjustment_type,
        plansRate.adjustment_value,
        plansRate.tax_type_id,
        plansRate.tax_rate,
        plansRate.condition_type,
        plansRate.condition_value,
        plansRate.date_start,
        plansRate.date_end,
        plansRate.updated_by,
        plansRate.include_in_cancel_fee || false,
        plansRate.sales_category || 'accommodation',
        plansRate.comment,
        id
    ];

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error updating plan rate with ID ${id}:`, err);
        throw err;
    }
};

// Delete a plans_rate by ID
const deletePlansRate = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'DELETE FROM plans_rates WHERE id = $1 RETURNING *';

    try {
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            throw new Error('Plan rate not found');
        }
        return result.rows[0];
    } catch (err) {
        console.error(`Error deleting plan rate with ID ${id}:`, err);
        throw err;
    }
};

module.exports = {
    createPlansRate,
    updatePlansRate,
    deletePlansRate,
};
