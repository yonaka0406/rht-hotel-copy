/**
 * Script to run the parking capacity management migration
 * This creates the parking_blocks table and virtual capacity pool spots
 * 
 * Usage: node api/adhoc_scripts/run_parking_capacity_migration.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
    const pool = new Pool({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    const client = await pool.connect();

    try {
        console.log('[Migration] Starting parking capacity management migration...');
        console.log('[Migration] Database:', process.env.DB_NAME);
        console.log('[Migration] Host:', process.env.DB_HOST);
        console.log('');

        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/018_parking_capacity_management.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('[Migration] Executing migration SQL...');
        await client.query('BEGIN');

        // Execute the migration
        await client.query(migrationSQL);

        await client.query('COMMIT');
        console.log('[Migration] ✓ Migration executed successfully');
        console.log('');

        // Verify the migration
        console.log('[Migration] Verifying migration results...');
        console.log('');

        // Check parking_blocks table
        const tableCheck = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'parking_blocks'
            ) AS exists
        `);
        console.log('[Verification] parking_blocks table:', tableCheck.rows[0].exists ? '✓ CREATED' : '✗ FAILED');

        // Check virtual capacity pool spots
        const spotsCheck = await client.query(`
            SELECT COUNT(*) AS count
            FROM parking_spots
            WHERE spot_type = 'capacity_pool'
        `);
        console.log('[Verification] Virtual capacity pool spots:', spotsCheck.rows[0].count, 'created');
        console.log('');

        // Display summary by hotel
        console.log('[Summary] Virtual capacity pool spots by hotel:');
        const summary = await client.query(`
            SELECT 
                h.id AS hotel_id,
                h.name AS hotel_name,
                COUNT(ps.id) AS virtual_spots_count
            FROM hotels h
            LEFT JOIN parking_lots pl ON pl.hotel_id = h.id AND pl.name = 'Virtual Capacity Pool'
            LEFT JOIN parking_spots ps ON ps.parking_lot_id = pl.id AND ps.spot_type = 'capacity_pool'
            GROUP BY h.id, h.name
            ORDER BY h.id
        `);

        summary.rows.forEach(row => {
            console.log(`  Hotel ${row.hotel_id} (${row.hotel_name}): ${row.virtual_spots_count} virtual spots`);
        });
        console.log('');

        // Display detailed spot information
        console.log('[Details] Virtual capacity pool spots:');
        const details = await client.query(`
            SELECT 
                h.id AS hotel_id,
                h.name AS hotel_name,
                ps.id AS spot_id,
                ps.spot_number,
                vc.id AS vehicle_category_id,
                vc.name AS vehicle_category_name
            FROM parking_spots ps
            JOIN parking_lots pl ON ps.parking_lot_id = pl.id
            JOIN hotels h ON pl.hotel_id = h.id
            LEFT JOIN vehicle_categories vc ON ps.spot_number = 'CAPACITY-POOL-' || vc.id
            WHERE ps.spot_type = 'capacity_pool'
            ORDER BY h.id, vc.id
        `);

        details.rows.forEach(row => {
            console.log(`  Hotel ${row.hotel_id}: Spot ${row.spot_id} (${row.spot_number}) - ${row.vehicle_category_name}`);
        });
        console.log('');

        // Test the helper function
        console.log('[Test] Testing get_virtual_capacity_pool_spot function...');
        try {
            const testResult = await client.query(`
                SELECT get_virtual_capacity_pool_spot(1, 1) AS virtual_spot_id
            `);
            console.log('[Test] ✓ Function returned spot ID:', testResult.rows[0].virtual_spot_id);
        } catch (error) {
            console.log('[Test] ✗ Function test failed:', error.message);
        }
        console.log('');

        console.log('[Migration] ✓ Migration completed successfully!');
        console.log('');
        console.log('Next steps:');
        console.log('1. Review the virtual capacity pool spots created above');
        console.log('2. Proceed with implementing the ParkingCapacityService (Task 2)');
        console.log('3. Update the parking model functions to use capacity-based logic (Task 3)');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[Migration] ✗ Migration failed:', error.message);
        console.error('[Migration] Stack trace:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
runMigration()
    .then(() => {
        console.log('[Migration] Script completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('[Migration] Script failed:', error.message);
        process.exit(1);
    });
