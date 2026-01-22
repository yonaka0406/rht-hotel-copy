require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Analyzing Inada-gumi (株式会社稲田組) logs from 2025-10-20...');

    const client = await pool.connect();
    try {
        const dateStr = '2025-10-20';
        const nameQuery = '%稲田組%';

        // 1. Get logs_reservation
        console.log(`fetching logs for ${dateStr} around 17:12...`);
        const result = await client.query(`
            SELECT 
                id,
                log_time,
                action,
                table_name,
                changes
            FROM logs_reservation
            WHERE 
                log_time BETWEEN '2025-10-20 00:00:00' AND '2025-10-20 23:59:59'
            ORDER BY log_time ASC
        `, []);
        // Note: 17:12 JST is 08:12 UTC. log_time is likely stored in UTC or local? 
        // logs_reservation usually uses current_timestamp which is DB time.
        // If DB is UTC, then 17:12 JST = 08:12 UTC.
        // If query DATE(log_time) = '2025-10-20' works, it assumes timezone align.
        // Let's broaden the time search or use JST conversion in query?
        // Let's just select * for the whole hour 17:00 JST (08:00 UTC)

        console.log(`Found ${result.rows.length} logs.`);

        result.rows.forEach((log, i) => {
            const jst = new Date(log.log_time.getTime() + (9 * 60 * 60 * 1000));
            console.log(`\n${i + 1}. [${jst.toISOString()}] ${log.action} ${log.table_name} ID:${log.id}`);
            console.log(`Changes: ${JSON.stringify(log.changes).substring(0, 200)}...`);
        });

        // 2. Check XML Queue around that time (broad window)
        console.log('\nChecking OTA XML Queue around 2025-10-20 17:12...');
        const queueRes = await client.query(`
            SELECT id, created_at, status, service_name 
            FROM ota_xml_queue
            WHERE created_at BETWEEN '2025-10-20 17:10:00' AND '2025-10-20 17:15:00'
        `);
        console.log(`Found ${queueRes.rows.length} queue entries.`);
        queueRes.rows.forEach(row => {
            const jst = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`- [${jst.toISOString()}] ${row.service_name} (${row.status})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
