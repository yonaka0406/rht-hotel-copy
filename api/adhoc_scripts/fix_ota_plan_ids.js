/**
 * Script to fix sc_tl_plans records with NULL plans_global_id and plans_hotel_id
 * but valid plan_key data by running the migration
 */

require('dotenv').config();
const { getPool } = require('../config/database');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    const requestId = 'fix-ota-plan-ids';
    const pool = getPool(requestId);
    
    try {
        console.log('🔧 Starting OTA Plan ID fix migration...');
        
        // Read the migration file
        const migrationPath = path.join(__dirname, '../migrations/027_fix_sc_tl_plans_null_ids.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        // Execute the migration
        console.log('📊 Executing migration...');
        await pool.query(migrationSQL);
        
        console.log('✅ Migration completed successfully!');
        
        // Verify the results
        console.log('\n📈 Verification:');
        const verificationQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL THEN 1 END) as records_with_ids,
                COUNT(CASE WHEN plans_global_id IS NULL AND plans_hotel_id IS NULL AND plan_key IS NOT NULL THEN 1 END) as records_still_null
            FROM sc_tl_plans;
        `;
        
        const result = await pool.query(verificationQuery);
        const stats = result.rows[0];
        
        console.log(`Total records: ${stats.total_records}`);
        console.log(`Records with IDs: ${stats.records_with_ids}`);
        console.log(`Records still NULL: ${stats.records_still_null}`);
        
        // Show some examples of fixed records
        console.log('\n🔍 Sample fixed records:');
        const sampleQuery = `
            SELECT hotel_id, plangroupcode, plangroupname, plans_global_id, plans_hotel_id, plan_key
            FROM sc_tl_plans 
            WHERE plan_key IS NOT NULL 
              AND (plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL)
            ORDER BY hotel_id, plangroupcode
            LIMIT 10;
        `;
        
        const sampleResult = await pool.query(sampleQuery);
        sampleResult.rows.forEach(row => {
            console.log(`  Hotel ${row.hotel_id}: ${row.plangroupcode} "${row.plangroupname}" -> Global: ${row.plans_global_id}, Hotel: ${row.plans_hotel_id} (Key: ${row.plan_key})`);
        });
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
};

// Run the migration
if (require.main === module) {
    runMigration()
        .then(() => {
            console.log('\n🎉 OTA Plan ID fix completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Migration failed:', error);
            process.exit(1);
        });
}

module.exports = { runMigration };