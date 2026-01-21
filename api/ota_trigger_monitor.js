/**
 * Real-time OTA Trigger Monitor
 * Checks all reservation changes in the last hour for missing OTA requests
 * Designed for routine monitoring (every hour or more frequently)
 */

require('dotenv').config();
const { pool } = require('./config/database');

/**
 * Group missing triggers by overlapping date ranges to avoid duplicate requests
 */
function groupTriggersByDateRanges(missingTriggers) {
    const groups = [];
    
    // Sort triggers by hotel_id and check_in date
    const sortedTriggers = [...missingTriggers].sort((a, b) => {
        if (a.hotel_id !== b.hotel_id) return a.hotel_id - b.hotel_id;
        return new Date(a.check_in) - new Date(b.check_in);
    });
    
    for (const trigger of sortedTriggers) {
        // Find existing group with overlapping dates for the same hotel
        const existingGroup = groups.find(group => 
            group.hotel_id === trigger.hotel_id &&
            group.check_in <= trigger.check_out &&
            group.check_out >= trigger.check_in
        );
        
        if (existingGroup) {
            // Extend the existing group's date range
            existingGroup.check_in = new Date(Math.min(
                new Date(existingGroup.check_in),
                new Date(trigger.check_in)
            )).toISOString().split('T')[0];
            
            existingGroup.check_out = new Date(Math.max(
                new Date(existingGroup.check_out),
                new Date(trigger.check_out)
            )).toISOString().split('T')[0];
            
            existingGroup.triggers.push(trigger);
        } else {
            // Create new group
            groups.push({
                hotel_id: trigger.hotel_id,
                hotel_name: trigger.hotel_name,
                check_in: trigger.check_in,
                check_out: trigger.check_out,
                triggers: [trigger]
            });
        }
    }
    
    return groups;
}

/**
 * Perform automatic remediation for missing OTA triggers
 */
async function performAutoRemediation(missingTriggers, baseUrl) {
    const results = {
        successful: 0,
        failed: 0,
        skipped: 0,
        details: []
    };
    
    // Group triggers by overlapping date ranges
    const groups = groupTriggersByDateRanges(missingTriggers);
    
    console.log(`   Grouped ${missingTriggers.length} triggers into ${groups.length} date range groups`);
    
    for (const group of groups) {
        try {
            console.log(`   Processing Hotel ${group.hotel_id}: ${group.check_in} to ${group.check_out} (${group.triggers.length} triggers)`);
            
            // Make the inventory request through the same channel as the main application
            const inventoryUrl = `${baseUrl}/api/report/res/inventory/${group.hotel_id}/${group.check_in}/${group.check_out}`;
            
            const response = await fetch(inventoryUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Internal calls may not need Authorization header depending on your setup
                }
            });
            
            if (response.ok) {
                const inventoryData = await response.json();
                
                // If we have inventory data, trigger the site controller update
                // This follows the same pattern as in api/index.js listenForTableChanges
                if (inventoryData && inventoryData.length > 0) {
                    const scUrl = `${baseUrl}/api/sc/tl/inventory/multiple/${group.hotel_id}/remediation`;
                    
                    const scResponse = await fetch(scUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(inventoryData),
                    });
                    
                    if (scResponse.ok) {
                        results.successful++;
                        results.details.push({
                            hotel_id: group.hotel_id,
                            date_range: `${group.check_in} to ${group.check_out}`,
                            status: 'success',
                            triggers_count: group.triggers.length
                        });
                        console.log(`     ✅ Successfully remediated Hotel ${group.hotel_id}`);
                    } else {
                        throw new Error(`Site controller update failed: ${scResponse.status} ${scResponse.statusText}`);
                    }
                } else {
                    results.skipped++;
                    results.details.push({
                        hotel_id: group.hotel_id,
                        date_range: `${group.check_in} to ${group.check_out}`,
                        status: 'skipped',
                        reason: 'No inventory data returned',
                        triggers_count: group.triggers.length
                    });
                    console.log(`     ⚠️  Skipped Hotel ${group.hotel_id} - no inventory data`);
                }
            } else {
                throw new Error(`Inventory request failed: ${response.status} ${response.statusText}`);
            }
            
        } catch (error) {
            results.failed++;
            results.details.push({
                hotel_id: group.hotel_id,
                date_range: `${group.check_in} to ${group.check_out}`,
                status: 'failed',
                error: error.message,
                triggers_count: group.triggers.length
            });
            console.log(`     ❌ Failed Hotel ${group.hotel_id}: ${error.message}`);
        }
        
        // Small delay between requests to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
}

async function checkMissingOTATriggers(hoursBack = 1, options = {}) {
    console.log(`🔍 Checking for missing OTA triggers in the last ${hoursBack} hour(s)...\n`);
    
    const {
        autoRemediate = false,
        baseUrl = 'http://localhost:5000'
    } = options;
    
    const client = await pool.connect();
    try {
        const startTime = new Date();
        
        // Calculate time range
        const endTime = new Date();
        const checkStartTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000));
        
        console.log(`📅 Time Range: ${checkStartTime.toISOString()} to ${endTime.toISOString()}`);
        console.log(`   JST: ${new Date(checkStartTime.getTime() + 9*60*60*1000).toISOString()} to ${new Date(endTime.getTime() + 9*60*60*1000).toISOString()}\n`);
        
        // 1. Find all trigger candidates in the last hour
        const triggerCandidates = await client.query(`
            WITH trigger_logs AS (
                SELECT
                    lr.id,
                    lr.log_time,
                    lr.action,
                    lr.table_name,
                    lr.changes,
                    CASE
                        WHEN lr.action != 'UPDATE' THEN lr.changes->>'check_in'
                        ELSE LEAST(
                            lr.changes->'old'->>'check_in',
                            lr.changes->'new'->>'check_in'
                        )
                    END AS check_in,
                    CASE
                        WHEN lr.action != 'UPDATE' THEN lr.changes->>'check_out'
                        ELSE GREATEST(
                            lr.changes->'old'->>'check_out',
                            lr.changes->'new'->>'check_out'
                        )
                    END AS check_out,
                    CASE
                        WHEN lr.action != 'UPDATE' THEN (lr.changes->>'hotel_id')::int
                        ELSE COALESCE((lr.changes->'new'->>'hotel_id')::int, (lr.changes->'old'->>'hotel_id')::int)
                    END AS hotel_id,
                    CASE
                        WHEN lr.action = 'INSERT' THEN lr.changes->>'status'
                        WHEN lr.action = 'DELETE' THEN lr.changes->>'status'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'status'
                    END AS status,
                    CASE
                        WHEN lr.action != 'UPDATE' THEN (lr.changes->>'reservation_client_id')::uuid
                        ELSE COALESCE((lr.changes->'new'->>'reservation_client_id')::uuid, (lr.changes->'old'->>'reservation_client_id')::uuid)
                    END AS client_id
                FROM logs_reservation lr
                WHERE 
                    lr.log_time >= $1
                    AND lr.log_time <= $2
                    AND lr.table_name LIKE 'reservations_%'
                    AND LENGTH(lr.table_name) <= LENGTH('reservations_') + 3
                    AND 
                    (
                        -- INSERT/DELETE actions (any status)
                        lr.action != 'UPDATE' 
                        OR 
                        -- UPDATE actions with specific changes
                        (
                            lr.action = 'UPDATE' AND (
                                lr.changes->'old'->>'check_in' IS DISTINCT FROM lr.changes->'new'->>'check_in' OR
                                lr.changes->'old'->>'check_out' IS DISTINCT FROM lr.changes->'new'->>'check_out' OR
                                (lr.changes->'old'->>'hotel_id')::int IS DISTINCT FROM (lr.changes->'new'->>'hotel_id')::int OR 
                                (
                                    lr.changes->'old'->>'status' IS DISTINCT FROM lr.changes->'new'->>'status' AND (
                                        lr.changes->'old'->>'status' = 'cancelled' OR
                                        lr.changes->'new'->>'status' = 'cancelled'
                                    )
                                )
                            )
                        )
                    )
            ),
            filtered_logs AS (
                SELECT tl.*
                FROM trigger_logs tl
                WHERE 
                    -- Only include reservations where check-out is today or later
                    -- This ensures we only monitor current and future reservations that affect inventory
                    tl.check_out::date >= CURRENT_DATE
            )
            SELECT 
                fl.*,
                COALESCE(c.name_kanji, c.name_kana, c.name) as client_name,
                h.name as hotel_name
            FROM filtered_logs fl
            LEFT JOIN clients c ON fl.client_id = c.id
            LEFT JOIN hotels h ON fl.hotel_id = h.id
            ORDER BY fl.log_time DESC
        `, [checkStartTime, endTime]);
        
        console.log(`1. TRIGGER CANDIDATES FOUND: ${triggerCandidates.rows.length}`);
        
        if (triggerCandidates.rows.length === 0) {
            console.log('   ✅ No reservation changes in the last hour - nothing to check\n');
            return {
                success: true,
                totalCandidates: 0,
                missingTriggers: 0,
                successRate: 100,
                message: 'No activity in the monitored period'
            };
        }
        
        // Show summary by hotel
        const hotelSummary = {};
        triggerCandidates.rows.forEach(candidate => {
            if (!hotelSummary[candidate.hotel_id]) {
                hotelSummary[candidate.hotel_id] = {
                    name: candidate.hotel_name,
                    count: 0
                };
            }
            hotelSummary[candidate.hotel_id].count++;
        });
        
        console.log('   By Hotel:');
        Object.entries(hotelSummary).forEach(([hotelId, summary]) => {
            console.log(`     Hotel ${hotelId} (${summary.name}): ${summary.count} changes`);
        });
        
        // 2. Check each candidate for missing OTA requests
        console.log('\n2. CHECKING FOR MISSING OTA REQUESTS:');
        
        const missingTriggers = [];
        const batchSize = 10; // Process in small batches for better performance
        
        for (let i = 0; i < triggerCandidates.rows.length; i += batchSize) {
            const batch = triggerCandidates.rows.slice(i, i + batchSize);
            
            // Process batch in parallel for better performance
            const batchPromises = batch.map(async (log) => {
                const otaCheck = await client.query(`
                    SELECT 
                        created_at,
                        current_request_id,
                        service_name,
                        EXTRACT(EPOCH FROM (created_at - $2::timestamp))/60 as minutes_gap
                    FROM ota_xml_queue 
                    WHERE 
                        hotel_id = $1
                        AND created_at > $2::timestamp
                        AND created_at <= $2::timestamp + interval '5 minutes'
                        AND service_name LIKE '%Stock%'
                    ORDER BY created_at ASC
                    LIMIT 1
                `, [log.hotel_id, log.log_time]);
                
                if (otaCheck.rows.length === 0) {
                    return {
                        ...log,
                        gap_reason: 'NO_OTA_WITHIN_5_MIN',
                        next_ota: null
                    };
                } else {
                    return {
                        ...log,
                        gap_reason: null,
                        next_ota: otaCheck.rows[0]
                    };
                }
            });
            
            const batchResults = await Promise.all(batchPromises);
            
            // Collect missing triggers
            batchResults.forEach(result => {
                if (result.gap_reason) {
                    missingTriggers.push(result);
                }
            });
            
            // Progress update for large batches
            if (triggerCandidates.rows.length > 20) {
                const processed = Math.min(i + batchSize, triggerCandidates.rows.length);
                process.stdout.write(`\r   Progress: ${processed}/${triggerCandidates.rows.length} (${Math.round(processed/triggerCandidates.rows.length*100)}%)`);
            }
        }
        
        if (triggerCandidates.rows.length > 20) {
            console.log(''); // New line after progress
        }
        
        // 3. Generate report
        const totalCandidates = triggerCandidates.rows.length;
        const totalMissing = missingTriggers.length;
        const successRate = ((totalCandidates - totalMissing) / totalCandidates * 100);
        
        console.log(`\n3. MONITORING REPORT:`);
        console.log(`   Total candidates: ${totalCandidates}`);
        console.log(`   Missing triggers: ${totalMissing}`);
        console.log(`   Success rate: ${successRate.toFixed(1)}%`);
        
        if (totalMissing === 0) {
            console.log(`   ✅ All reservation changes have corresponding OTA requests`);
        } else {
            console.log(`   🚨 ${totalMissing} reservation changes are missing OTA requests`);
            
            // Show details of missing triggers
            console.log('\n   MISSING TRIGGERS:');
            missingTriggers.forEach((trigger, i) => {
                const jst = new Date(trigger.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - Hotel ${trigger.hotel_id} (${trigger.hotel_name})`);
                console.log(`        ${trigger.action} - ${trigger.client_name || 'Unknown Client'} - Status: ${trigger.status}`);
                console.log(`        Check-in: ${trigger.check_in}, Log ID: ${trigger.id}`);
            });
            
            // Pattern analysis for missing triggers
            if (totalMissing > 1) {
                console.log('\n   PATTERN ANALYSIS:');
                
                const actionCounts = {};
                const statusCounts = {};
                const hotelCounts = {};
                
                missingTriggers.forEach(trigger => {
                    actionCounts[trigger.action] = (actionCounts[trigger.action] || 0) + 1;
                    if (trigger.status) {
                        statusCounts[trigger.status] = (statusCounts[trigger.status] || 0) + 1;
                    }
                    hotelCounts[trigger.hotel_id] = (hotelCounts[trigger.hotel_id] || 0) + 1;
                });
                
                console.log(`     By Action: ${Object.entries(actionCounts).map(([k,v]) => `${k}:${v}`).join(', ')}`);
                console.log(`     By Status: ${Object.entries(statusCounts).map(([k,v]) => `${k}:${v}`).join(', ')}`);
                console.log(`     By Hotel: ${Object.entries(hotelCounts).map(([k,v]) => `Hotel ${k}:${v}`).join(', ')}`);
            }
        }
        
        // 5. Automatic remediation if enabled
        let remediationResults = null;
        if (autoRemediate && missingTriggers.length > 0) {
            console.log(`\n5. AUTOMATIC REMEDIATION:`);
            console.log(`   Auto-remediation enabled - attempting to fix ${missingTriggers.length} missing triggers`);
            
            remediationResults = await performAutoRemediation(missingTriggers, baseUrl);
            
            console.log(`   Remediation completed:`);
            console.log(`     Successful requests: ${remediationResults.successful}`);
            console.log(`     Failed requests: ${remediationResults.failed}`);
            console.log(`     Skipped (overlapping): ${remediationResults.skipped}`);
        }
        
        // 6. Performance metrics
        const executionTime = new Date() - startTime;
        console.log(`\n${autoRemediate ? '6' : '5'}. PERFORMANCE METRICS:`);
        console.log(`   Execution time: ${executionTime}ms`);
        console.log(`   Candidates per second: ${(totalCandidates / (executionTime / 1000)).toFixed(1)}`);
        
        // 7. Recommendations based on results
        console.log(`\n${autoRemediate ? '7' : '6'}. RECOMMENDATIONS:`);
        
        if (successRate === 100) {
            console.log(`   ✅ System operating normally - continue monitoring`);
        } else if (successRate >= 95) {
            console.log(`   ⚠️  Minor issues detected - investigate specific cases`);
            console.log(`   - Check logs for the missing trigger times`);
            console.log(`   - Verify OTA service connectivity`);
        } else if (successRate >= 80) {
            console.log(`   🟡 Moderate issues - system degradation detected`);
            console.log(`   - Check Node.js application health`);
            console.log(`   - Verify database notification system`);
            console.log(`   - Consider manual OTA sync for affected reservations`);
        } else {
            console.log(`   🚨 CRITICAL: Major system failure detected`);
            console.log(`   - Immediate investigation required`);
            console.log(`   - Check if Node.js application is running`);
            console.log(`   - Verify PostgreSQL notification system`);
            console.log(`   - Manual OTA sync required for all affected reservations`);
        }
        
        return {
            success: true,
            totalCandidates,
            missingTriggers: totalMissing,
            successRate,
            executionTime,
            missingTriggerDetails: missingTriggers,
            remediationResults,
            message: totalMissing === 0 ? 'All triggers working correctly' : `${totalMissing} missing triggers detected${autoRemediate ? ' - remediation attempted' : ''}`
        };
        
    } catch (error) {
        console.error('Error during OTA trigger monitoring:', error);
        return {
            success: false,
            error: error.message,
            message: 'Monitoring failed due to error'
        };
    } finally {
        client.release();
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    // Check for help flag
    if (args.includes('--help') || args.includes('-h')) {
        console.log('🔍 OTA TRIGGER MONITORING SYSTEM');
        console.log('================================\n');
        console.log('Usage: node ota_trigger_monitor.js [hours] [--auto-remediate]');
        console.log('');
        console.log('Arguments:');
        console.log('  hours              Number of hours to look back (default: 1, max: 24)');
        console.log('  --auto-remediate   Enable automatic remediation of missing triggers');
        console.log('');
        console.log('Examples:');
        console.log('  node ota_trigger_monitor.js 1                    # Check last hour');
        console.log('  node ota_trigger_monitor.js 6                    # Check last 6 hours');
        console.log('  node ota_trigger_monitor.js 1 --auto-remediate   # Check and fix missing triggers');
        console.log('');
        console.log('Auto-remediation:');
        console.log('  - Groups overlapping date ranges to avoid duplicate requests');
        console.log('  - Calls /api/report/res/inventory/{hotel_id}/{check_in}/{check_out}');
        console.log('  - Follows same pattern as main application trigger mechanism');
        console.log('  - Use with caution in production environments');
        process.exit(0);
    }
    
    const hoursBack = args[0] ? parseInt(args[0]) : 1;
    const autoRemediate = args.includes('--auto-remediate') || args.includes('true');
    
    console.log('🔍 OTA TRIGGER MONITORING SYSTEM');
    console.log('================================\n');
    
    if (autoRemediate) {
        console.log('⚡ AUTO-REMEDIATION ENABLED\n');
    }
    
    const result = await checkMissingOTATriggers(hoursBack, {
        autoRemediate,
        baseUrl: 'http://localhost:5000'
    });
    
    console.log('\n================================');
    console.log(`📊 FINAL STATUS: ${result.success ? (result.successRate === 100 ? '✅ HEALTHY' : result.successRate >= 95 ? '⚠️  MINOR ISSUES' : result.successRate >= 80 ? '🟡 DEGRADED' : '🚨 CRITICAL') : '❌ ERROR'}`);
    
    if (result.success) {
        console.log(`   Success Rate: ${result.successRate.toFixed(1)}%`);
        console.log(`   Execution Time: ${result.executionTime}ms`);
        
        if (result.remediationResults) {
            console.log(`   Remediation: ${result.remediationResults.successful} successful, ${result.remediationResults.failed} failed, ${result.remediationResults.skipped} skipped`);
        }
    }
    
    console.log(`   Message: ${result.message}`);
    
    // Exit with appropriate code for monitoring systems
    process.exit(result.success && result.successRate === 100 ? 0 : 1);
}

// Export for use as module
module.exports = { checkMissingOTATriggers };

// Run if called directly
if (require.main === module) {
    main();
}