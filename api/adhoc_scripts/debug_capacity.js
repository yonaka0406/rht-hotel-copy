const { pool } = require('../config/database');

const query = `
    WITH
    dates AS (
      SELECT DISTINCT hotel_id, date
      FROM reservation_details
      WHERE hotel_id = $1
        AND date BETWEEN $2 AND $3
    ),
    blocked_rooms AS (
      SELECT
        rd.hotel_id,
        rd.date,
        COUNT(CASE WHEN r.status = 'block' THEN rd.room_id ELSE NULL END) AS blocked_count
      FROM reservations r
      JOIN reservation_details rd
        ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      JOIN rooms
        ON rd.room_id = rooms.id
      WHERE
        r.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND r.status = 'block'
        AND rooms.for_sale = TRUE
      GROUP BY rd.hotel_id, rd.date
    ),
    room_inventory AS (
      SELECT
        hotel_id,
        COUNT(*) AS total_rooms
      FROM rooms
      WHERE hotel_id = $1 AND for_sale = TRUE
      GROUP BY hotel_id
    ),
    room_total AS (
      SELECT
        d.hotel_id,
        d.date,
        ri.total_rooms,
        ri.total_rooms - COALESCE(br.blocked_count, 0) AS total_rooms_real
      FROM dates d
      CROSS JOIN room_inventory ri
      LEFT JOIN blocked_rooms br
        ON br.date = d.date AND br.hotel_id = ri.hotel_id
    )
    SELECT
      rt.date,
      rt.total_rooms,
      rt.total_rooms_real
    FROM room_total rt
    WHERE
      rt.hotel_id = $1
    ORDER BY rt.date;
`;

const run = async () => {
    try {
        // hotelId=42, December 2025
        const res = await pool.query(query, [42, '2025-12-01', '2025-12-31']);
        console.log('Data sample (first 5 rows):', res.rows.slice(0, 5));
        
        // Check if total_rooms_real < total_rooms (indicating blocks)
        const blockedDays = res.rows.filter(r => parseInt(r.total_rooms_real) < parseInt(r.total_rooms));
        console.log(`Found ${blockedDays.length} days with blocks.`);
        if (blockedDays.length > 0) {
             console.log('Sample blocked day:', blockedDays[0]);
        }
        console.log(`Total rows returned: ${res.rows.length}`);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
};

run();
