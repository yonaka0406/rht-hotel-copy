require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking OTA XML Queue for Hotel 25 on 2026-01-16...');

    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT *
            FROM ota_xml_queue
            WHERE hotel_id = 25
            AND created_at BETWEEN '2026-01-16 11:00:00' AND '2026-01-16 11:10:00'
            ORDER BY created_at ASC
        `);

        console.log(`Found ${result.rows.length} queue entries.`);

        result.rows.forEach(row => {
            const jst = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`\nID: ${row.id}`);
            console.log(`Created: ${jst.toISOString().replace('T', ' ').substring(0, 19)} JST`);
            console.log(`Status: ${row.status}`);
            console.log(`Request ID: ${row.request_id}`);
            console.log(`Type: ${row.type}`);

            // print first 100 chars of xml to see if it's related to dates
            console.log(`XML Content (start): ${row.xml_body.substring(0, 200)}...`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
