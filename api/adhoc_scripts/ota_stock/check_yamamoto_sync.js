require('dotenv').config();
const { pool } = require('../../config/database');

async function main() {
    console.log('🔍 Checking Yamamoto Sync (NetStockBulkAdjustmentService) on 2026-01-16...');

    const client = await pool.connect();
    try {
        // 09:47 JST is 00:47 UTC. Search 00:00 to 02:00 UTC.
        const start = '2026-01-16 00:00:00';
        const end = '2026-01-16 02:00:00';

        const result = await client.query(`
            SELECT id, created_at, status, service_name, xml_body
            FROM ota_xml_queue
            WHERE created_at BETWEEN $1 AND $2
            AND service_name = 'NetStockBulkAdjustmentService'
        `, [start, end]);

        console.log(`Found ${result.rows.length} bulk adjustment logs.`);

        result.rows.forEach(row => {
            const jst = new Date(row.created_at.getTime() + (9 * 60 * 60 * 1000));
            console.log(`\nID: ${row.id} - ${jst.toISOString()} - ${row.status}`);
            console.log(`XML Body Preview: ${row.xml_body.substring(0, 300)}...`);

            // Check for date 2026-02-03 (20260203)
            if (row.xml_body.includes('20260203')) {
                const parts = row.xml_body.split('20260203');
                const afterDate = parts[1];
                const match = afterDate.match(/<remainingCount>(\d+)<\/remainingCount>/);
                if (match) {
                    console.log(`✅ [${row.id}] 20260203 Count set to: ${match[1]}`);
                }
            }
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();
