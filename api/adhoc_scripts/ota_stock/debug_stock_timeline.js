require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Analyzing Stock Timeline for 2026-02-02 (Room Type 30)...');

    const client = await pool.connect();
    try {
        const date = '2026-02-02';
        const roomTypeId = 30; // From previous script
        const hotelId = 25;

        // Get all logs for reservation_details that affect this date and room type (indirectly via room_id)
        // We know Room 205 (352) and 206 (353) etc are Room Type 30.
        // Let's get all room IDs for this type first.
        const roomsRes = await client.query(`SELECT id FROM rooms WHERE room_type_id = $1`, [roomTypeId]);
        const roomIds = roomsRes.rows.map(r => r.id);
        console.log(`Room Type 30 has rooms: ${roomIds.join(', ')}`);

        // Query logs
        // We look for INSERT/UPDATE/DELETE on reservation_details where room_id is in list AND date is 2026-02-02
        // Note: logs_reservation stores changes in JSONB.
        // checking `changes->'new'->>'date'` or `changes->'old'->>'date'`

        const query = `
            SELECT 
                log_time, 
                action, 
                table_name,
                changes
            FROM logs_reservation
            WHERE 
                table_name = 'reservation_details_25'
                AND (
                    (changes->'new'->>'date' = $1 AND (changes->'new'->>'room_id')::int = ANY($2))
                    OR 
                    (changes->'old'->>'date' = $1 AND (changes->'old'->>'room_id')::int = ANY($2))
                )
            ORDER BY log_time ASC
        `;

        const result = await client.query(query, [date, roomIds]);

        console.log(`Found ${result.rows.length} relevant logs for 2026-02-02.`);

        // Simple simulator
        let currentStock = 9; // Total
        // We can't easily simulate "previous" state without replaying all history. 
        // But we can look at the sequence of events on 2026-01-16.

        const targetDate = '2026-01-16';

        result.rows.forEach(log => {
            const logDate = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000)).toISOString().substring(0, 10);
            if (logDate !== targetDate) return;

            const time = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000)).toISOString().substring(11, 19);
            console.log(`[${time}] ${log.action} - Room ${log.changes.new?.room_id || log.changes.old?.room_id}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
