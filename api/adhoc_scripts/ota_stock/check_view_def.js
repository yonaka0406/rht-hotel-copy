require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking vw_room_inventory Definition...');

    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT definition 
            FROM pg_views 
            WHERE viewname = 'vw_room_inventory'
        `);

        if (result.rows.length > 0) {
            console.log('Definition:', result.rows[0].definition);
        } else {
            console.log('View not found in pg_views.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
