/**
 * Comprehensive OTA trigger audit for all hotels from today to today + 6 months
 * Optimized for large-scale analysis with progress tracking and batching
 */

require('dotenv').config();
const { pool } = require('./config/database');

async function main() {
    console.log('🔍 Starting comprehensive OTA trigger audit...\n');
    
    const client = await pool.connect();
    try {
        // Calculate date range
        const today = new Date();
        const sixMonthsLater = new Date();
        sixMonthsLater.setMonth(today.getMonth() + 6);
        
        const startDate = today.toISOString().split('T')[0];
        const endDate = sixMonthsLater.toISOString().split('T')[0];
        
        console.log(`📅 Date Range: ${startDate} to ${endDate} (6 months)`);
        
        // 1. Get all hotels
        console.log('\n1. GETTING ALL HOTELS:');
        
        const hotelsResult = await client.query(`
            SELECT id, name 
            FROM hotels 
            ORDER BY id
        `);
        
        console.log(`   Found ${hotelsResult.rows.length} hotels:`);
        hotelsResult.rows.forEach(hotel => {
            console.log(`     Hotel ${hotel.id}: ${hotel.name}`);
        });
        
        // 2. Performance test with sample data
        console.log('\n2. PERFORMANCE ESTIMATION:');
        
        const sampleResult = await client.query(`
            SELECT COUNT(*) as total_logs
            FROM logs_reservation lr
            WHERE 
                lr.log_time >= $1::date
                AND lr.log_time < $2::date + interval '1 day'
                AND lr.table_name LIKE 'reservations_%'
                AND LENGTH(lr.table_name) <= LENGTH('reservations_') + 3
        `, [startDate, endDate]);
        
        const totalLogs = parseInt(sampleResult.rows[0].total_logs);
        console.log(`   Total logs in period: ${totalLogs.toLocaleString()}`);
        
        if (totalLogs > 100000) {
            console.log('   ⚠️  Large dataset detected - using batched processing');
        }
        
        // 3. Create optimized query with batching
        console.log('\n3. STARTING COMPREHENSIVE AUDIT:');
        
        const allMissingTriggers = [];
        const hotelSummary = {};
        let totalProcessed = 0;
        
        // Process each hotel separately to manage memory
        for (let i = 0; i < hotelsResult.rows.length; i++) {
            const hotel = hotelsResult.rows[i];
            console.log(`\n   Processing Hotel ${hotel.id} (${hotel.name}) - ${i + 1}/${hotelsResult.rows.length}:`);
            
            try {
                // Get trigger candidates for this hotel
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
                            lr.log_time >= $1::date
                            AND lr.log_time < $2::date + interval '1 day'
                            AND lr.table_name LIKE 'reservations_%'
                            AND LENGTH(lr.table_name) <= LENGTH('reservations_') + 3
                            AND (lr.changes->>'hotel_id')::int = $3
                            AND 
                            (
                                lr.action != 'UPDATE' 
                                OR 
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
                        COALESCE(c.name_kanji, c.name_kana, c.name) as client_name
                    FROM filtered_logs fl
                    LEFT JOIN clients c ON fl.client_id = c.id
                    ORDER BY fl.log_time ASC
                `, [startDate, endDate, hotel.id]);
                
                const candidateCount = triggerCandidates.rows.length;
                console.log(`     Found ${candidateCount} trigger candidates`);
                
                if (candidateCount === 0) {
                    hotelSummary[hotel.id] = {
                        name: hotel.name,
                        candidates: 0,
                        missing: 0,
                        successRate: 100
                    };
                    continue;
                }
                
                // Check for missing OTA requests in batches
                const batchSize = 50;
                const hotelMissingTriggers = [];
                
                for (let j = 0; j < triggerCandidates.rows.length; j += batchSize) {
                    const batch = triggerCandidates.rows.slice(j, j + batchSize);
                    
                    // Process batch
                    for (const log of batch) {
                        const otaCheck = await client.query(`
                            SELECT 1
                            FROM ota_xml_queue 
                            WHERE 
                                hotel_id = $1
                                AND created_at > $2::timestamp
                                AND created_at <= $2::timestamp + interval '5 minutes'
                                AND service_name LIKE '%Stock%'
                            LIMIT 1
                        `, [hotel.id, log.log_time]);
                        
                        if (otaCheck.rows.length === 0) {
                            hotelMissingTriggers.push({
                                hotel_id: hotel.id,
                                hotel_name: hotel.name,
                                log_id: log.id,
                                log_time: log.log_time,
                                action: log.action,
                                status: log.status,
                                client_name: log.client_name,
                                check_in: log.check_in,
                                check_out: log.check_out
                            });
                        }
                    }
                    
                    // Progress update
                    const processed = Math.min(j + batchSize, candidateCount);
                    if (candidateCount > 20) {
                        process.stdout.write(`\r     Progress: ${processed}/${candidateCount} (${Math.round(processed/candidateCount*100)}%)`);
                    }
                }
                
                if (candidateCount > 20) {
                    console.log(''); // New line after progress
                }
                
                // Store results
                allMissingTriggers.push(...hotelMissingTriggers);
                totalProcessed += candidateCount;
                
                const successRate = ((candidateCount - hotelMissingTriggers.length) / candidateCount * 100);
                hotelSummary[hotel.id] = {
                    name: hotel.name,
                    candidates: candidateCount,
                    missing: hotelMissingTriggers.length,
                    successRate: successRate
                };
                
                console.log(`     Missing triggers: ${hotelMissingTriggers.length}/${candidateCount} (${(100-successRate).toFixed(1)}% failure rate)`);
                
            } catch (error) {
                console.log(`     ❌ Error processing hotel ${hotel.id}: ${error.message}`);
                hotelSummary[hotel.id] = {
                    name: hotel.name,
                    candidates: 0,
                    missing: 0,
                    successRate: 0,
                    error: error.message
                };
            }
        }
        
        // 4. Generate comprehensive report
        console.log('\n\n4. COMPREHENSIVE AUDIT REPORT:');
        console.log('=' .repeat(80));
        
        // Overall summary
        const totalMissing = allMissingTriggers.length;
        const overallSuccessRate = ((totalProcessed - totalMissing) / totalProcessed * 100);
        
        console.log(`\n📊 OVERALL SUMMARY:`);
        console.log(`   Period: ${startDate} to ${endDate} (6 months)`);
        console.log(`   Hotels analyzed: ${hotelsResult.rows.length}`);
        console.log(`   Total trigger candidates: ${totalProcessed.toLocaleString()}`);
        console.log(`   Missing OTA triggers: ${totalMissing.toLocaleString()}`);
        console.log(`   Overall success rate: ${overallSuccessRate.toFixed(1)}%`);
        
        // Hotel-by-hotel breakdown
        console.log(`\n🏨 HOTEL BREAKDOWN:`);
        Object.entries(hotelSummary).forEach(([hotelId, summary]) => {
            const status = summary.error ? '❌ ERROR' : 
                          summary.successRate === 100 ? '✅ PERFECT' :
                          summary.successRate >= 95 ? '🟢 GOOD' :
                          summary.successRate >= 80 ? '🟡 MODERATE' : '🔴 POOR';
            
            console.log(`   Hotel ${hotelId} (${summary.name}): ${status}`);
            if (summary.error) {
                console.log(`     Error: ${summary.error}`);
            } else {
                console.log(`     ${summary.missing}/${summary.candidates} missing (${(100-summary.successRate).toFixed(1)}% failure rate)`);
            }
        });
        
        // Critical issues
        if (totalMissing > 0) {
            console.log(`\n🚨 CRITICAL ISSUES FOUND:`);
            
            // Group by hotel for critical analysis
            const criticalByHotel = {};
            allMissingTriggers.forEach(trigger => {
                if (!criticalByHotel[trigger.hotel_id]) {
                    criticalByHotel[trigger.hotel_id] = [];
                }
                criticalByHotel[trigger.hotel_id].push(trigger);
            });
            
            Object.entries(criticalByHotel).forEach(([hotelId, triggers]) => {
                console.log(`\n   Hotel ${hotelId} (${triggers[0].hotel_name}): ${triggers.length} missing triggers`);
                
                // Show recent critical cases
                const recentTriggers = triggers
                    .filter(t => new Date(t.log_time) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
                    .slice(0, 5);
                
                if (recentTriggers.length > 0) {
                    console.log(`     Recent cases (last 7 days):`);
                    recentTriggers.forEach(trigger => {
                        const jst = new Date(trigger.log_time.getTime() + (9 * 60 * 60 * 1000));
                        console.log(`       ${jst.toISOString()} JST - ${trigger.action} - ${trigger.client_name || 'Unknown'}`);
                        console.log(`         Status: ${trigger.status}, Check-in: ${trigger.check_in}`);
                    });
                }
            });
        }
        
        // Pattern analysis
        if (totalMissing > 0) {
            console.log(`\n📈 PATTERN ANALYSIS:`);
            
            const actionCounts = {};
            const statusCounts = {};
            const hotelCounts = {};
            
            allMissingTriggers.forEach(trigger => {
                actionCounts[trigger.action] = (actionCounts[trigger.action] || 0) + 1;
                if (trigger.status) {
                    statusCounts[trigger.status] = (statusCounts[trigger.status] || 0) + 1;
                }
                hotelCounts[trigger.hotel_id] = (hotelCounts[trigger.hotel_id] || 0) + 1;
            });
            
            console.log(`\n   By Action:`);
            Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).forEach(([action, count]) => {
                console.log(`     ${action}: ${count} (${(count/totalMissing*100).toFixed(1)}%)`);
            });
            
            console.log(`\n   By Status:`);
            Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([status, count]) => {
                console.log(`     ${status}: ${count} (${(count/totalMissing*100).toFixed(1)}%)`);
            });
            
            console.log(`\n   Most affected hotels:`);
            Object.entries(hotelCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).forEach(([hotelId, count]) => {
                const hotelName = hotelSummary[hotelId]?.name || 'Unknown';
                console.log(`     Hotel ${hotelId} (${hotelName}): ${count} missing`);
            });
        }
        
        // Recommendations
        console.log(`\n🔧 RECOMMENDATIONS:`);
        
        if (overallSuccessRate < 95) {
            console.log(`   🚨 URGENT: Overall success rate is ${overallSuccessRate.toFixed(1)}% - immediate action required`);
            console.log(`   1. Implement real-time OTA trigger monitoring`);
            console.log(`   2. Add automatic retry mechanism for failed triggers`);
            console.log(`   3. Set up alerts for missing OTA requests`);
            console.log(`   4. Review and fix infrastructure issues`);
        } else if (overallSuccessRate < 99) {
            console.log(`   ⚠️  Moderate issues detected - preventive action recommended`);
            console.log(`   1. Set up periodic monitoring (daily checks)`);
            console.log(`   2. Investigate specific failure patterns`);
            console.log(`   3. Add logging for OTA trigger failures`);
        } else {
            console.log(`   ✅ System performing well - maintain current monitoring`);
            console.log(`   1. Continue periodic audits`);
            console.log(`   2. Monitor for any degradation trends`);
        }
        
        console.log(`\n   Performance optimization:`);
        console.log(`   1. Add index: CREATE INDEX idx_logs_reservation_hotel_time ON logs_reservation (hotel_id, log_time) WHERE table_name LIKE 'reservations_%';`);
        console.log(`   2. Consider partitioning logs_reservation by date`);
        console.log(`   3. Implement materialized view for recent trigger candidates`);
        
        // Save results option
        console.log(`\n💾 DATA EXPORT:`);
        console.log(`   Total missing triggers found: ${totalMissing}`);
        if (totalMissing > 0) {
            console.log(`   Consider exporting detailed results to CSV for further analysis`);
            console.log(`   Missing triggers data available in allMissingTriggers array`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
}

main();