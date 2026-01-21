require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Analyzing Inada-gumi (株式会社稲田組) logs from 2025-10-20...');

    const client = await pool.connect();
    try {
        const dateStr = '2025-10-20';
        const nameQuery = '%稲田組%';

        // 1. Get logs_reservation
        console.log(`fetching logs for ${dateStr}...`);
        const result = await client.query(`
            SELECT 
                id,
                log_time,
                action,
                table_name,
                changes
            FROM logs_reservation
            WHERE 
                DATE(log_time) = $1
                AND changes::text ILIKE $2
            ORDER BY log_time ASC
        `, [dateStr, nameQuery]);

        console.log(`Found ${result.rows.length} logs.`);

        result.rows.forEach((log, i) => {
            const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`\n${i + 1}. [${jst.toISOString()}] ${log.action} ${log.table_name} ID:${log.id}`);

            // Try to extract useful info directly from changes
            const changes = log.changes;
            const newData = changes.new || {};

            console.log(`   Room: ${newData.room_id || 'N/A'}`);
            console.log(`   Date: ${newData.date || 'N/A'}`);
            console.log(`   Hotel: ${newData.hotel_id || 'N/A'}`);
            console.log(`   Changes: ${JSON.stringify(changes).substring(0, 200)}...`);
        });

        // 2. Check XML Queue around that time (broad window)
        console.log('\nChecking OTA XML Queue around 2025-10-20 17:12...');
        const queueRes = await client.query(`
            SELECT id, created_at, status, type 
            FROM ota_xml_queue
            WHERE created_at BETWEEN '2025-10-20 17:10:00' AND '2025-10-20 17:15:00'
        `);
        console.log(`Found ${queueRes.rows.length} queue entries.`);
        queueRes.rows.forEach(row => {
            const jst = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`- [${jst.toISOString()}] ${row.type} (${row.status})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
