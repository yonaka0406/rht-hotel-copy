require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking DB Timezone...');

    const client = await pool.connect();
    try {
        const res = await client.query('SHOW timezone');
        console.log('Timezone:', res.rows[0].timezone);

        const now = await client.query('SELECT NOW()');
        console.log('Current DB Time:', now.rows[0].now);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
