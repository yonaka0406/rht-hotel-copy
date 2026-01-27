const { getPool } = require('../../config/database');

async function checkHistoricalStock() {
    const requestId = 'historical-check';
    const hotelId = 14;
    const stayDate = '2026-01-31';
    const asOfTimestamp = '2026-01-26 10:15:00';

    console.log(`--- Historical Stock Check ---`);
    console.log(`Hotel: ${hotelId}`);
    console.log(`Stay Date: ${stayDate}`);
    console.log(`As Of: ${asOfTimestamp}`);

    const client = await getPool(requestId).connect();
    try {
        // 1. Get room details (including room type group labels)
        const roomsQuery = `
            SELECT 
                r.id, 
                r.room_number, 
                r.room_type_id, 
                r.for_sale, 
                r.is_staff_room,
                sc.netrmtypegroupcode
            FROM rooms r
            LEFT JOIN (
                SELECT DISTINCT hotel_id, room_type_id, netrmtypegroupcode 
                FROM sc_tl_rooms
            ) sc ON sc.hotel_id = r.hotel_id AND sc.room_type_id = r.room_type_id
            WHERE r.hotel_id = $1
        `;
        const roomsResult = await client.query(roomsQuery, [hotelId]);
        const rooms = roomsResult.rows;

        // 2. Identify reservations for stayDate that were ACTIVE as of asOfTimestamp
        const occupancyQuery = `
            WITH latest_state AS (
                SELECT DISTINCT ON (record_id)
                    record_id,
                    action,
                    log_time,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'hotel_id')::integer
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'hotel_id')::integer, (lr.changes->'old'->>'hotel_id')::integer)
                    END AS hotel_id,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'date')::date
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'date')::date, (lr.changes->'old'->>'date')::date)
                    END AS stay_date,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'room_id')::integer
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'room_id')::integer, (lr.changes->'old'->>'room_id')::integer)
                    END AS room_id,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN lr.changes->>'cancelled'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'cancelled'
                    END AS cancelled
                FROM logs_reservation lr
                WHERE 
                    table_name LIKE 'reservation_details%'
                    AND log_time <= $2
                ORDER BY record_id, log_time DESC
            )
            SELECT 
                record_id,
                room_id,
                cancelled
            FROM latest_state
            WHERE 
                action != 'DELETE'
                AND stay_date = $1
                AND hotel_id = $3
                AND (cancelled IS NULL OR cancelled = '' OR cancelled = 'null')
        `;

        const occResult = await client.query(occupancyQuery, [stayDate, asOfTimestamp, hotelId]);
        const occupiedRoomIds = new Set(occResult.rows.map(r => r.room_id));

        const occupiedRoomsList = rooms.filter(r => occupiedRoomIds.has(r.id));
        console.log(`Total active reservations found: ${occupiedRoomsList.length}`);

        console.log('\n--- Occupied Rooms ---');
        occupiedRoomsList.sort((a, b) => a.room_number.localeCompare(b.room_number)).forEach(r => {
            console.log(`Room: ${r.room_number}, Group: ${r.netrmtypegroupcode}, For Sale: ${r.for_sale}, Is Staff: ${r.is_staff_room}`);
        });

        // 3. Calculate stock by Room Type Group
        const groups = {};

        rooms.forEach(room => {
            const groupCode = room.netrmtypegroupcode || 'N/A';
            if (!groups[groupCode]) {
                groups[groupCode] = {
                    total_for_sale_no_staff: 0,
                    total_for_sale_including_staff: 0,
                    occ_for_sale_no_staff: 0,
                    occ_for_sale_including_staff: 0
                };
            }

            const isOccupied = occupiedRoomIds.has(room.id);

            // Scenario A: Filtering only by for_sale (Current DB View state)
            if (room.for_sale) {
                groups[groupCode].total_for_sale_including_staff++;
                if (isOccupied) groups[groupCode].occ_for_sale_including_staff++;
            }

            // Scenario B: Filtering by for_sale AND is_staff_room (Proposed Fix)
            if (room.for_sale && !room.is_staff_room) {
                groups[groupCode].total_for_sale_no_staff++;
                if (isOccupied) groups[groupCode].occ_for_sale_no_staff++;
            }
        });

        console.log('\n--- Results by Room Type Group ---');
        Object.entries(groups).sort().forEach(([code, data]) => {
            const stockOld = data.total_for_sale_including_staff - data.occ_for_sale_including_staff;
            const stockNew = data.total_for_sale_no_staff - data.occ_for_sale_no_staff;

            console.log(`Group ${code}:`);
            console.log(`  Current View logic (for_sale only): Total ${data.total_for_sale_including_staff}, Occ ${data.occ_for_sale_including_staff} => Stock ${stockOld}`);
            console.log(`  Fixed logic (for_sale & no staff): Total ${data.total_for_sale_no_staff}, Occ ${data.occ_for_sale_no_staff} => Stock ${stockNew}`);
        });

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        client.release();
    }
}

checkHistoricalStock();
