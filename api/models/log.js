const { getPool } = require('../config/database');

const selectReservationHistory = async (id) => {
    const pool = getPool(requestId);
    const query = `
        SELECT
            lr.log_time,
            u.name,
            jsonb_object_agg(change_details.key, change_details.new_value) AS changed_fields
        FROM
            logs_reservation lr
        JOIN
            users u ON lr.user_id = u.id,
            jsonb_each(lr.changes -> 'new') AS change_details(key, new_value),
            jsonb_each(lr.changes -> 'old') AS old_details(old_key, old_value)
        WHERE
            lr.record_id = $1
            AND lr.action = 'UPDATE'
            AND change_details.key = old_details.old_key
            AND change_details.new_value IS DISTINCT FROM old_details.old_value
        GROUP BY
            lr.log_time, u.name
        ORDER BY
            lr.log_time DESC;
    `;
    const values = [id];
    try {
        const result = await pool.query(query, values);   
        return result.rows;
    } catch (err) {
        console.error('Error retrieving logs:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    selectReservationHistory,    
  };
