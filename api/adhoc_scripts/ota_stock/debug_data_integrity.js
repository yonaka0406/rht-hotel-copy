/**
 * Debug script to investigate data integrity issues
 * Check for orphaned reservation_details and missing parent reservations
 */

require('dotenv').config();
const { pool } = require('../../config/database');

async function debugDataIntegrity() {
    const client = await pool.connect();
    
    try {
        const hotelId = 25;
        const date = '2026-02-03';
        const tableName = `reservation_details_${hotelId}`;
        const reservationsTableName = `reservations_${hotelId}`;
        
        console.log('🔍 Investigating data integrity issues...');
        console.log('=' .repeat(80));
        
        // 1. Check for orphaned reservation_details (reservation_id not in reservations table)
        console.log('\n📋 Step 1: Checking for orphaned reservation_details...');
        
        const orphanedQuery = `
            SELECT 
                rd.id,
                rd.reservation_id,
                rd.room_id,
                rd.date,
                rd.cancelled,
                rd.created_at,
                r.room_number
            FROM ${tableName} rd
            LEFT JOIN ${reservationsTableName} res ON rd.reservation_id = res.id
            LEFT JOIN rooms r ON rd.room_id = r.id AND r.hotel_id = $1
            WHERE rd.date = $2 AND res.id IS NULL
            ORDER BY rd.created_at
        `;
        
        const orphanedResult = await client.query(orphanedQuery, [hotelId, date]);
        
        console.log(`   Found ${orphanedResult.rows.length} orphaned reservation_details (no parent reservation)`);
        
        if (orphanedResult.rows.length > 0) {
            console.log('   Orphaned records:');
            console.log('   ID                                   | Reservation ID                       | Room | Status    | Created At');
            console.log('   ' + '-'.repeat(100));
            
            for (const record of orphanedResult.rows) {
                const id = record.id.substring(0, 8) + '...';
                const resId = record.reservation_id.substring(0, 8) + '...';
                const room = (record.room_number || 'N/A').padEnd(4);
                const status = (record.cancelled ? 'Cancelled' : 'Active').padEnd(9);
                const created = record.created_at.toISOString().split('T')[0];
                
                console.log(`   ${id.padEnd(36)} | ${resId.padEnd(36)} | ${room} | ${status} | ${created}`);
            }
        } else {
            console.log('   ✅ No orphaned reservation_details found');
        }
        
        // 2. Check reservation_details that have logs but parent reservation doesn't exist
        console.log('\n📊 Step 2: Checking reservation_details with logs but missing parent...');
        
        const logsWithoutParentQuery = `
            WITH reservation_details_from_logs AS (
                SELECT DISTINCT
                    lr.record_id,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'reservation_id')::uuid
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'reservation_id')::uuid, (lr.changes->'old'->>'reservation_id')::uuid)
                    END AS reservation_id
                FROM logs_reservation lr
                WHERE 
                    lr.table_name = $1
                    AND (
                        (lr.action IN ('INSERT', 'DELETE') AND (lr.changes->>'date')::date = $2)
                        OR 
                        (lr.action = 'UPDATE' AND (
                            (lr.changes->'new'->>'date')::date = $2 
                            OR (lr.changes->'old'->>'date')::date = $2
                        ))
                    )
            )
            SELECT 
                rdl.record_id,
                rdl.reservation_id,
                CASE WHEN res.id IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as parent_status
            FROM reservation_details_from_logs rdl
            LEFT JOIN ${reservationsTableName} res ON rdl.reservation_id = res.id
            WHERE rdl.reservation_id IS NOT NULL
            ORDER BY parent_status, rdl.record_id
        `;
        
        const logsWithoutParentResult = await client.query(logsWithoutParentQuery, [tableName, date]);
        
        const missingParents = logsWithoutParentResult.rows.filter(r => r.parent_status === 'MISSING');
        const existingParents = logsWithoutParentResult.rows.filter(r => r.parent_status === 'EXISTS');
        
        console.log(`   Records with existing parent reservations: ${existingParents.length}`);
        console.log(`   Records with missing parent reservations: ${missingParents.length}`);
        
        if (missingParents.length > 0) {
            console.log('\n   Records with missing parent reservations:');
            console.log('   Record ID                            | Reservation ID                       | Parent Status');
            console.log('   ' + '-'.repeat(90));
            
            for (const record of missingParents.slice(0, 10)) {
                const recordId = record.record_id.substring(0, 8) + '...';
                const resId = record.reservation_id.substring(0, 8) + '...';
                
                console.log(`   ${recordId.padEnd(36)} | ${resId.padEnd(36)} | ${record.parent_status}`);
            }
            
            if (missingParents.length > 10) {
                console.log(`   ... and ${missingParents.length - 10} more`);
            }
        }
        
        // 3. Check if missing parent reservations have DELETE logs
        console.log('\n🔍 Step 3: Checking DELETE logs for missing parent reservations...');
        
        if (missingParents.length > 0) {
            const uniqueReservationIds = [...new Set(missingParents.map(r => r.reservation_id))];
            
            console.log(`   Checking ${uniqueReservationIds.length} unique missing parent reservation IDs...`);
            
            let foundDeleteLogs = 0;
            let notFoundDeleteLogs = 0;
            
            for (const reservationId of uniqueReservationIds.slice(0, 5)) { // Check first 5
                const deleteLogQuery = `
                    SELECT COUNT(*) as delete_count
                    FROM logs_reservation
                    WHERE record_id = $1 AND table_name = $2 AND action = 'DELETE'
                `;
                
                const deleteLogResult = await client.query(deleteLogQuery, [reservationId, reservationsTableName]);
                const deleteCount = parseInt(deleteLogResult.rows[0].delete_count);
                
                if (deleteCount > 0) {
                    foundDeleteLogs++;
                    console.log(`   ${reservationId.substring(0, 8)}... - ✅ HAS DELETE LOG`);
                } else {
                    notFoundDeleteLogs++;
                    console.log(`   ${reservationId.substring(0, 8)}... - ❌ NO DELETE LOG`);
                }
            }
            
            console.log(`\n   Summary of first 5 checked:`);
            console.log(`   - With DELETE logs: ${foundDeleteLogs}`);
            console.log(`   - Without DELETE logs: ${notFoundDeleteLogs}`);
            
            if (notFoundDeleteLogs > 0) {
                console.log(`   ⚠️  Found ${notFoundDeleteLogs} parent reservations that don't exist and have no DELETE logs!`);
                console.log(`   This suggests potential data integrity issues or missing logging.`);
            }
        }
        
        // 4. Check current table state vs logs state
        console.log('\n📊 Step 4: Comparing current table state vs logs analysis...');
        
        // Current table state
        const currentStateQuery = `
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN cancelled IS NULL THEN 1 END) as active_records,
                COUNT(CASE WHEN cancelled IS NOT NULL THEN 1 END) as cancelled_records
            FROM ${tableName}
            WHERE date = $1
        `;
        
        const currentStateResult = await client.query(currentStateQuery, [date]);
        const currentState = currentStateResult.rows[0];
        
        // Logs analysis (simplified version without CASCADE DELETE fix)
        const logsAnalysisQuery = `
            WITH record_timeframes AS (
                SELECT DISTINCT
                    lr.record_id,
                    MIN(lr.log_time) as first_log_time,
                    MAX(lr.log_time) as last_log_time
                FROM logs_reservation lr
                WHERE 
                    lr.table_name = $1
                    AND (
                        (lr.action IN ('INSERT', 'DELETE') AND (lr.changes->>'date')::date = $2)
                        OR 
                        (lr.action = 'UPDATE' AND (
                            (lr.changes->'new'->>'date')::date = $2 
                            OR (lr.changes->'old'->>'date')::date = $2
                        ))
                    )
                GROUP BY lr.record_id
            ),
            last_log_info AS (
                SELECT DISTINCT
                    rt.record_id,
                    lr.action as last_action,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN lr.changes->>'cancelled'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'cancelled'
                    END AS last_cancelled_status
                FROM record_timeframes rt
                JOIN logs_reservation lr ON lr.record_id = rt.record_id AND lr.log_time = rt.last_log_time
                WHERE lr.table_name = $1
            )
            SELECT 
                COUNT(*) as total_from_logs,
                COUNT(CASE WHEN 
                    lli.last_action != 'DELETE' 
                    AND (lli.last_cancelled_status IS NULL OR lli.last_cancelled_status = '' OR lli.last_cancelled_status = 'null')
                THEN 1 END) as active_from_logs_simple,
                COUNT(CASE WHEN 
                    lli.last_action = 'DELETE'
                THEN 1 END) as deleted_from_logs,
                COUNT(CASE WHEN 
                    lli.last_action != 'DELETE' 
                    AND lli.last_cancelled_status IS NOT NULL 
                    AND lli.last_cancelled_status != '' 
                    AND lli.last_cancelled_status != 'null'
                THEN 1 END) as cancelled_from_logs
            FROM record_timeframes rt
            JOIN last_log_info lli ON rt.record_id = lli.record_id
        `;
        
        const logsAnalysisResult = await client.query(logsAnalysisQuery, [tableName, date]);
        const logsAnalysis = logsAnalysisResult.rows[0];
        
        console.log('\n   Current Table State:');
        console.log(`   - Total records: ${currentState.total_records}`);
        console.log(`   - Active records: ${currentState.active_records}`);
        console.log(`   - Cancelled records: ${currentState.cancelled_records}`);
        
        console.log('\n   Logs Analysis (without CASCADE DELETE fix):');
        console.log(`   - Total from logs: ${logsAnalysis.total_from_logs}`);
        console.log(`   - Active from logs: ${logsAnalysis.active_from_logs_simple}`);
        console.log(`   - Deleted from logs: ${logsAnalysis.deleted_from_logs}`);
        console.log(`   - Cancelled from logs: ${logsAnalysis.cancelled_from_logs}`);
        
        const discrepancy = parseInt(logsAnalysis.active_from_logs_simple) - parseInt(currentState.active_records);
        
        console.log('\n   Analysis:');
        if (discrepancy > 0) {
            console.log(`   ⚠️  Discrepancy: ${discrepancy} extra active records in logs`);
            console.log(`   This suggests ${discrepancy} records were cascade deleted but not logged`);
        } else if (discrepancy < 0) {
            console.log(`   ⚠️  Discrepancy: ${Math.abs(discrepancy)} missing active records in logs`);
            console.log(`   This suggests some active records are not captured in logs`);
        } else {
            console.log(`   ✅ Perfect match between table and logs`);
        }
        
        // 5. Foreign key constraint verification
        console.log('\n🔒 Step 5: Verifying foreign key constraints...');
        
        const fkConstraintQuery = `
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = $1
                AND kcu.column_name = 'reservation_id'
        `;
        
        const fkConstraintResult = await client.query(fkConstraintQuery, [tableName]);
        
        if (fkConstraintResult.rows.length > 0) {
            console.log('   ✅ Foreign key constraint exists:');
            for (const constraint of fkConstraintResult.rows) {
                console.log(`   - ${constraint.constraint_name}: ${constraint.table_name}.${constraint.column_name} -> ${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
            }
        } else {
            console.log('   ❌ No foreign key constraint found for reservation_id');
        }
        
        console.log('\n' + '='.repeat(80));
        console.log('✅ Data integrity investigation complete!');
        
        return {
            orphanedRecords: orphanedResult.rows.length,
            missingParents: missingParents.length,
            existingParents: existingParents.length,
            currentTableActive: parseInt(currentState.active_records),
            logsAnalysisActive: parseInt(logsAnalysis.active_from_logs_simple),
            discrepancy: discrepancy,
            hasForeignKeyConstraint: fkConstraintResult.rows.length > 0
        };
        
    } catch (error) {
        console.error('❌ Error during investigation:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the investigation
if (require.main === module) {
    debugDataIntegrity()
        .then(result => {
            console.log('\n📊 Final Results:', result);
            process.exit(0);
        })
        .catch(error => {
            console.error('💥 Investigation failed:', error);
            process.exit(1);
        });
}

module.exports = { debugDataIntegrity };