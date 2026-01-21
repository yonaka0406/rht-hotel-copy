require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking Room Type Mapping for Hotel 25...');

    const client = await pool.connect();
    try {
        const hotelId = 25;

        // 1. Get Room Types for Room 205 (id 352) and 206 (id 353)
        console.log('Fetching Room Types for rooms 352 and 353...');
        const rooms = await client.query(`
            SELECT r.id, r.room_number, r.room_type_id, rt.name as room_type_name
            FROM rooms r
            JOIN room_types rt ON r.room_type_id = rt.id
            WHERE r.id IN (352, 353)
        `);

        rooms.rows.forEach(room => {
            console.log(`Room ${room.room_number} (ID: ${room.id}) -> Type: ${room.room_type_name} (ID: ${room.room_type_id})`);
        });

        // 2. Check sc_tl_rooms mapping
        console.log('\nChecking sc_tl_rooms mapping...');
        const mappings = await client.query(`
            SELECT * 
            FROM sc_tl_rooms 
            WHERE hotel_id = $1
        `, [hotelId]);

        console.log(`Found ${mappings.rows.length} mappings for Hotel ${hotelId}.`);
        mappings.rows.forEach(m => {
            console.log(`- RoomTypeID ${m.room_type_id} -> NetRmTypeGroupCode: ${m.netrmtypegroupcode}`);
        });

        // 3. Match
        console.log('\nMatching Analysis:');
        rooms.rows.forEach(room => {
            const map = mappings.rows.find(m => m.room_type_id === room.room_type_id);
            if (map) {
                console.log(`✅ Room ${room.room_number} (Type ${room.room_type_id}) IS mapped to ${map.netrmtypegroupcode}`);
            } else {
                console.log(`❌ Room ${room.room_number} (Type ${room.room_type_id}) is NOT mapped to any OTA code.`);
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
