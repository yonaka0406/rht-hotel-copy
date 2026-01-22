require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking ota_xml_queue Columns...');

    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'ota_xml_queue'
        `);

        console.log(`Found ${result.rows.length} columns.`);
        result.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
