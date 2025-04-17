const { getPool } = require('../config/database');

const selectReservationHistory = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = `
        SELECT
            lr.log_time,
            u.name,
            jsonb_object_agg(change_details.key, jsonb_build_object('from', old_details.old_value, 'to', change_details.new_value)) AS changed_fields
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

        UNION ALL

        SELECT
            lr.log_time,
            u.name,
            jsonb_build_object('insert', 'INSERT') AS changed_fields
        FROM
            logs_reservation lr
        JOIN
            users u ON lr.user_id = u.id
        WHERE
            lr.record_id = $1
            AND lr.action = 'INSERT'

        UNION ALL

        SELECT
            lr.log_time,
            u.name,
            jsonb_build_object('delete', 'DELETE') AS changed_fields
        FROM
            logs_reservation lr
        JOIN
            users u ON lr.user_id = u.id
        WHERE
            lr.record_id = $1
            AND lr.action = 'DELETE'

        ORDER BY
            log_time DESC;
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

const selectReservationInventoryChange = async (requestId, id) => {
    // console.log('selectReservationInventoryChange for id:', id)
    const pool = getPool(requestId);
    const reservationQuery = `
        SELECT
            id,
            action,
            table_name,        
            CASE
                WHEN action != 'UPDATE' THEN changes->>'check_in'
                ELSE LEAST(
                changes->'old'->>'check_in',
                changes->'new'->>'check_in'
                )
            END AS check_in, -- Unified check_in
            CASE
                WHEN action != 'UPDATE' THEN changes->>'check_out'
                ELSE GREATEST(
                changes->'old'->>'check_out',
                changes->'new'->>'check_out'
                )
            END AS check_out, -- Unified check_out
            CASE
                WHEN action != 'UPDATE' THEN (changes->>'hotel_id')::int
                ELSE (changes->'new'->>'hotel_id')::int
            END AS hotel_id -- Unified hotel_id

        FROM logs_reservation
        WHERE 
            id = $1
            AND table_name LIKE 'reservations_%'
            AND LENGTH(table_name) <= LENGTH('reservations_') + 3
            AND 
            (
                action != 'UPDATE' OR (
                    action = 'UPDATE' AND (
                        changes->'old'->>'check_in' IS DISTINCT FROM changes->'new'->>'check_in' OR
                        changes->'old'->>'check_out' IS DISTINCT FROM changes->'new'->>'check_out' OR
                        (changes->'old'->>'hotel_id')::int IS DISTINCT FROM (changes->'new'->>'hotel_id')::int
                    )
                )
            )
        ;

    `;
    const detailsQuery = `
        WITH log_data AS (
            SELECT
                lr.id,
                lr.action,
                lr.table_name,
                lr.changes->'old'->>'room_id' AS old_room_id,
                lr.changes->'new'->>'room_id' AS new_room_id,
                lr.changes->'new'->>'date' AS log_date,
                COALESCE((lr.changes->'new'->>'hotel_id')::int, (lr.changes->>'hotel_id')::int) AS hotel_id
            FROM logs_reservation lr
            WHERE 
                lr.id = $1
                AND lr.table_name LIKE 'reservation_details_%'
                AND lr.action = 'UPDATE'
                AND lr.changes->'old'->>'room_id' IS DISTINCT FROM lr.changes->'new'->>'room_id'
        )
        SELECT
            ld.id,
            ld.action,
            ld.table_name,
            ld.log_date AS check_in,
            ld.log_date AS check_out,
            ld.hotel_id
        FROM log_data ld
        LEFT JOIN rooms old_room ON 
            old_room.id = ld.old_room_id::int AND 
            old_room.hotel_id = ld.hotel_id
        LEFT JOIN rooms new_room ON 
            new_room.id = ld.new_room_id::int AND 
            new_room.hotel_id = ld.hotel_id
        WHERE old_room.room_type_id IS DISTINCT FROM new_room.room_type_id
    `;
    const values = [id];
    try {
        const result = await pool.query(reservationQuery, values);
        if (result.rows.length === 0) {
            const detailsResult = await pool.query(detailsQuery, values);
            return detailsResult.rows;
        }        
        return result.rows;
    } catch (err) {
        console.error('Error retrieving logs:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    selectReservationHistory,
    selectReservationInventoryChange,    
};
