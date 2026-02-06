/**
 * Real-time OTA Trigger Monitor
 * Checks all reservation changes in the last hour for missing OTA requests
 * Designed for routine monitoring (every hour or more frequently)
 */

require('dotenv').config();
const { getProdPool } = require('./config/database');
const { sendGenericEmail } = require('./utils/emailUtils');

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
 * Send email notification for OTA trigger issues
 */
async function sendOTANotificationEmail(type, data) {
    const emailRecipient = 'dx@redhorse-group.co.jp';

    try {
        const timestamp = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });
        let subject, text, html;

        if (type === 'INCONSISTENCY') {
            const { missingTriggers, totalCandidates, successRate, hoursBack } = data;

            subject = `🚨 OTA連携エラー検出 - 成功率${successRate.toFixed(1)}%`;

            text = `OTA連携監視アラート

時刻: ${timestamp} JST
監視期間: 過去${hoursBack}時間
成功率: ${successRate.toFixed(1)}%
総候補数: ${totalCandidates}
未送信トリガー: ${missingTriggers.length}件

未送信トリガー詳細:
${missingTriggers.map((trigger, i) =>
                `${i + 1}. ホテル${trigger.hotel_id} (${trigger.hotel_name})
   操作: ${trigger.action} - 顧客: ${trigger.client_name || '不明'}
   時刻: ${new Date(trigger.log_time.getTime() + 9 * 60 * 60 * 1000).toISOString()} JST
   チェックイン: ${trigger.check_in}, ステータス: ${trigger.status}`
            ).join('\n\n')}

OTA同期システムの調査が必要です。`;

            html = `
            <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 800px; margin: 0 auto;">
                <h2 style="color: #e74c3c; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                    🚨 OTA連携エラー検出
                </h2>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>アラート概要</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 5px; font-weight: bold;">時刻:</td><td style="padding: 5px;">${timestamp} JST</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">監視期間:</td><td style="padding: 5px;">過去${hoursBack}時間</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">成功率:</td><td style="padding: 5px; color: #e74c3c; font-weight: bold;">${successRate.toFixed(1)}%</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">総候補数:</td><td style="padding: 5px;">${totalCandidates}</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">未送信トリガー:</td><td style="padding: 5px; color: #e74c3c; font-weight: bold;">${missingTriggers.length}件</td></tr>
                    </table>
                </div>

                <h3>未送信トリガー詳細</h3>
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
                    ${missingTriggers.map((trigger, i) => `
                        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #dee2e6;">
                            <strong>${i + 1}. ホテル${trigger.hotel_id} (${trigger.hotel_name})</strong><br>
                            <strong>操作:</strong> ${trigger.action} - <strong>顧客:</strong> ${trigger.client_name || '不明'}<br>
                            <strong>時刻:</strong> ${new Date(trigger.log_time.getTime() + 9 * 60 * 60 * 1000).toISOString()} JST<br>
                            <strong>チェックイン:</strong> ${trigger.check_in} - <strong>ステータス:</strong> ${trigger.status}
                        </div>
                    `).join('')}
                </div>

                <p style="margin-top: 20px; color: #6c757d;">
                    OTA同期システムの緊急調査が必要です。
                </p>
            </div>`;

        } else if (type === 'REMEDIATION') {
            const { remediationResults, missingTriggers } = data;

            subject = `⚡ OTA自動修復実行 - ${remediationResults.successful}件修復完了`;

            text = `OTA自動修復レポート

時刻: ${timestamp} JST
成功: ${remediationResults.successful}件
失敗: ${remediationResults.failed}件
スキップ: ${remediationResults.skipped}件
処理総数: ${missingTriggers}件

修復詳細:
${remediationResults.details.map((detail, i) =>
                `${i + 1}. ホテル${detail.hotel_id} - ${detail.date_range}
   ステータス: ${detail.status === 'success' ? '成功' : detail.status === 'failed' ? '失敗' : 'スキップ'}
   トリガー数: ${detail.triggers_count}件
   ${detail.error ? `エラー: ${detail.error}` : ''}
   ${detail.reason ? `理由: ${detail.reason}` : ''}`
            ).join('\n\n')}

自動修復が完了しました。`;

            html = `
            <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 800px; margin: 0 auto;">
                <h2 style="color: #28a745; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
                    ⚡ OTA自動修復実行
                </h2>
                
                <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <h3>修復概要</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr><td style="padding: 5px; font-weight: bold;">時刻:</td><td style="padding: 5px;">${timestamp} JST</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">成功:</td><td style="padding: 5px; color: #28a745; font-weight: bold;">${remediationResults.successful}件</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">失敗:</td><td style="padding: 5px; color: #dc3545; font-weight: bold;">${remediationResults.failed}件</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">スキップ:</td><td style="padding: 5px;">${remediationResults.skipped}件</td></tr>
                        <tr><td style="padding: 5px; font-weight: bold;">処理総数:</td><td style="padding: 5px;">${missingTriggers}件</td></tr>
                    </table>
                </div>

                <h3>修復詳細</h3>
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
                    ${remediationResults.details.map((detail, i) => `
                        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #dee2e6;">
                            <strong>${i + 1}. ホテル${detail.hotel_id} - ${detail.date_range}</strong><br>
                            <strong>ステータス:</strong> <span style="color: ${detail.status === 'success' ? '#28a745' : detail.status === 'failed' ? '#dc3545' : '#ffc107'};">${detail.status === 'success' ? '成功' : detail.status === 'failed' ? '失敗' : 'スキップ'}</span><br>
                            <strong>トリガー数:</strong> ${detail.triggers_count}件
                            ${detail.error ? `<br><strong>エラー:</strong> <span style="color: #dc3545;">${detail.error}</span>` : ''}
                            ${detail.reason ? `<br><strong>理由:</strong> ${detail.reason}` : ''}
                        </div>
                    `).join('')}
                </div>

                <p style="margin-top: 20px; color: #6c757d;">
                    自動修復が完了しました。結果をご確認ください。
                </p>
            </div>`;
        }

        await sendGenericEmail(emailRecipient, subject, text, html);
        console.log(`   ✅ Email notification sent to ${emailRecipient}`);

    } catch (error) {
        console.error(`   ❌ Failed to send email notification: ${error.message}`);
    }
}
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

async function checkMissingOTATriggers(hoursBack = 1, options = {}, dbClient = null) {
    console.log(`🔍 Checking for missing OTA triggers in the last ${hoursBack} hour(s)...\n`);

    const {
        autoRemediate = false,
        baseUrl = 'http://localhost:5000'
    } = options;

    let client = dbClient;
    let shouldRelease = false;

    try {
        if (!client) {
            const pool = getProdPool();
            client = await pool.connect();
            shouldRelease = true;
        }
        const startTime = new Date();

        // Calculate time range
        const endTime = new Date();
        const checkStartTime = new Date(endTime.getTime() - (hoursBack * 60 * 60 * 1000));

        console.log(`📅 Time Range: ${checkStartTime.toISOString()} to ${endTime.toISOString()}`);
        console.log(`   JST: ${new Date(checkStartTime.getTime() + 9 * 60 * 60 * 1000).toISOString()} to ${new Date(endTime.getTime() + 9 * 60 * 60 * 1000).toISOString()}\n`);

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
        const silentSkips = [];
        const batchSize = 10; // Process in small batches for better performance

        for (let i = 0; i < triggerCandidates.rows.length; i += batchSize) {
            const batch = triggerCandidates.rows.slice(i, i + batchSize);

            // Process batch in parallel for better performance
            const batchPromises = batch.map(async (log) => {
                // First check for OTA requests within 5 minutes
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
                    // No OTA request found - check if this might be a silent skip
                    // Look for any OTA requests within a wider window (30 minutes) to see if there was activity
                    const widerOtaCheck = await client.query(`
                        SELECT 
                            created_at,
                            service_name,
                            EXTRACT(EPOCH FROM (created_at - $2::timestamp))/60 as minutes_gap
                        FROM ota_xml_queue 
                        WHERE 
                            hotel_id = $1
                            AND created_at > $2::timestamp - interval '15 minutes'
                            AND created_at <= $2::timestamp + interval '30 minutes'
                            AND service_name LIKE '%Stock%'
                        ORDER BY ABS(EXTRACT(EPOCH FROM (created_at - $2::timestamp)))
                        LIMIT 1
                    `, [log.hotel_id, log.log_time]);

                    return {
                        ...log,
                        gap_reason: 'NO_OTA_WITHIN_5_MIN',
                        next_ota: null,
                        nearby_ota: widerOtaCheck.rows[0] || null,
                        possible_silent_skip: widerOtaCheck.rows.length === 0 // No OTA activity at all suggests silent skip
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

            // Categorize results
            batchResults.forEach(result => {
                if (result.gap_reason) {
                    if (result.possible_silent_skip) {
                        silentSkips.push(result);
                    } else {
                        missingTriggers.push(result);
                    }
                }
            });

            // Progress update for large batches
            if (triggerCandidates.rows.length > 20) {
                const processed = Math.min(i + batchSize, triggerCandidates.rows.length);
                process.stdout.write(`\r   Progress: ${processed}/${triggerCandidates.rows.length} (${Math.round(processed / triggerCandidates.rows.length * 100)}%)`);
            }
        }

        if (triggerCandidates.rows.length > 20) {
            console.log(''); // New line after progress
        }

        // 3. Generate report
        const totalCandidates = triggerCandidates.rows.length;
        const totalMissing = missingTriggers.length;
        const totalSilentSkips = silentSkips.length;
        const totalWithOTA = totalCandidates - totalMissing - totalSilentSkips;
        const successRate = ((totalWithOTA) / totalCandidates * 100);

        console.log(`\n3. MONITORING REPORT:`);
        console.log(`   Total candidates: ${totalCandidates}`);
        console.log(`   With OTA triggers: ${totalWithOTA}`);
        console.log(`   Missing triggers: ${totalMissing}`);
        console.log(`   Possible silent skips: ${totalSilentSkips}`);
        console.log(`   Success rate: ${successRate.toFixed(1)}%`);

        if (totalMissing === 0 && totalSilentSkips === 0) {
            console.log(`   ✅ All reservation changes have corresponding OTA requests`);
        } else if (totalMissing === 0 && totalSilentSkips > 0) {
            console.log(`   ⚠️  ${totalSilentSkips} possible silent skips (stocks may have already matched)`);
        } else {
            console.log(`   🚨 ${totalMissing} reservation changes are missing OTA requests`);
            if (totalSilentSkips > 0) {
                console.log(`   ℹ️  ${totalSilentSkips} additional cases may be silent skips`);
            }

            // Send email notification for inconsistency
            console.log('\n   📧 SENDING EMAIL NOTIFICATION:');
            await sendOTANotificationEmail('INCONSISTENCY', {
                missingTriggers,
                totalCandidates,
                successRate,
                hoursBack
            });

            // Show details of missing triggers
            console.log('\n   MISSING TRIGGERS:');
            missingTriggers.forEach((trigger, i) => {
                const jst = new Date(trigger.log_time.getTime() + (9 * 60 * 60 * 1000));
                console.log(`     ${i + 1}. ${jst.toISOString()} JST - Hotel ${trigger.hotel_id} (${trigger.hotel_name})`);
                console.log(`        ${trigger.action} - ${trigger.client_name || 'Unknown Client'} - Status: ${trigger.status}`);
                console.log(`        Check-in: ${trigger.check_in}, Log ID: ${trigger.id}`);
                if (trigger.nearby_ota) {
                    const nearbyGap = Math.round(trigger.nearby_ota.minutes_gap * 100) / 100;
                    console.log(`        Nearby OTA: ${nearbyGap} min gap (${trigger.nearby_ota.service_name})`);
                }
            });

            // Show silent skips if any
            if (totalSilentSkips > 0) {
                console.log('\n   POSSIBLE SILENT SKIPS:');
                silentSkips.forEach((skip, i) => {
                    const jst = new Date(skip.log_time.getTime() + (9 * 60 * 60 * 1000));
                    console.log(`     ${i + 1}. ${jst.toISOString()} JST - Hotel ${skip.hotel_id} (${skip.hotel_name})`);
                    console.log(`        ${skip.action} - ${skip.client_name || 'Unknown Client'} - Status: ${skip.status}`);
                    console.log(`        Reason: No OTA activity nearby (stocks may have matched)`);
                });
            }

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

                console.log(`     By Action: ${Object.entries(actionCounts).map(([k, v]) => `${k}:${v}`).join(', ')}`);
                console.log(`     By Status: ${Object.entries(statusCounts).map(([k, v]) => `${k}:${v}`).join(', ')}`);
                console.log(`     By Hotel: ${Object.entries(hotelCounts).map(([k, v]) => `Hotel ${k}:${v}`).join(', ')}`);
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

            // Send email notification for remediation
            console.log('\n   📧 SENDING REMEDIATION EMAIL NOTIFICATION:');
            await sendOTANotificationEmail('REMEDIATION', {
                remediationResults,
                missingTriggers: missingTriggers.length
            });
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
            silentSkips: totalSilentSkips,
            successRate,
            executionTime,
            missingTriggerDetails: missingTriggers,
            silentSkipDetails: silentSkips,
            remediationResults,
            message: totalMissing === 0 ?
                (totalSilentSkips === 0 ? 'All triggers working correctly' : `${totalSilentSkips} possible silent skips detected`) :
                `${totalMissing} missing triggers detected${autoRemediate ? ' - remediation attempted' : ''}${totalSilentSkips > 0 ? `, ${totalSilentSkips} possible silent skips` : ''}`
        };

    } catch (error) {
        console.error('Error during OTA trigger monitoring:', error);
        return {
            success: false,
            error: error.message,
            message: 'Monitoring failed due to error'
        };
    } finally {
        if (shouldRelease && client) {
            client.release();
        }
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