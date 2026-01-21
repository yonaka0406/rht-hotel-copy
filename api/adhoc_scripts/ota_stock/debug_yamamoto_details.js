require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking Yamamoto Details & Inventory Query...');

    const client = await pool.connect();
    try {
        const reservationId = '3bfb727a-ed86-441c-93cc-62ed680ee74f'; // From debug logs
        const hotelId = 25;
        const checkIn = '2026-02-02';
        const checkOut = '2026-02-06';

        // 1. Check reservation_details
        console.log('\n1. Checking reservation_details state:');
        const details = await client.query(`
            SELECT id, room_id, date, cancelled, billable 
            FROM reservation_details 
            WHERE reservation_id = $1
            ORDER BY date
        `, [reservationId]);

        console.log(`Found ${details.rows.length} details.`);
        details.rows.forEach(d => {
            console.log(`- Date: ${d.date}, RoomID: ${d.room_id}, Cancelled: ${d.cancelled}, Billable: ${d.billable}`);
        });

        // 2. Run the Inventory Query (simulated from models/report/main.js)
        console.log('\n2. Running Inventory Query for 2026-02-02...');

        const inventoryQuery = `
          WITH date_range AS (
              SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
          ),
          active_room_types AS (
              SELECT DISTINCT room_type_id
              FROM vw_room_inventory
              WHERE hotel_id = $1
              AND date BETWEEN $2 AND $3
              AND netrmtypegroupcode IS NOT NULL
          ),
          fallback_room_types AS (
              SELECT DISTINCT room_type_id
              FROM vw_room_inventory
              WHERE hotel_id = $1
              AND netrmtypegroupcode IS NOT NULL
          ),
          final_room_types AS (
              SELECT room_type_id FROM active_room_types
              UNION ALL
              SELECT room_type_id FROM fallback_room_types
              WHERE NOT EXISTS (SELECT 1 FROM active_room_types)
          ),
          room_type_details AS (
              SELECT DISTINCT ON (room_type_id) 
                  room_type_id, 
                  netrmtypegroupcode, 
                  room_type_name, 
                  total_rooms
              FROM vw_room_inventory
              WHERE hotel_id = $1
              AND room_type_id IN (SELECT room_type_id FROM final_room_types)
              AND netrmtypegroupcode IS NOT NULL
              ORDER BY room_type_id, date DESC
          )
          SELECT 
              $1 AS hotel_id,
              d.date,
              rt.room_type_id,
              rt.netrmtypegroupcode,
              rt.room_type_name,
              rt.total_rooms,
              COALESCE(inv.room_count, 0) AS room_count
          FROM 
              date_range d
          CROSS JOIN room_type_details rt
          LEFT JOIN vw_room_inventory inv ON 
              inv.hotel_id = $1
              AND inv.date = d.date 
              AND inv.room_type_id = rt.room_type_id
          ORDER BY 
              d.date, 
              rt.room_type_id;
        `;

        // Check for 2026-02-02 only
        const invResult = await client.query(inventoryQuery, [hotelId, '2026-02-02', '2026-02-02']);

        console.log(`Found ${invResult.rows.length} inventory rows for 2026-02-02.`);
        invResult.rows.forEach(r => {
            console.log(`- Type: ${r.room_type_name} (ID: ${r.room_type_id}), Total: ${r.total_rooms}, Count: ${r.room_count}, Remaining: ${r.total_rooms - r.room_count}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
