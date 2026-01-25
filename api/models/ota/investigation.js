const { pool } = require('../../config/database');
const xml2js = require('xml2js');

/**
 * OTA Stock Investigation Model
 * Handles database queries for stock investigation functionality
 */

/**
 * Get current state snapshot for the target date
 */
async function getCurrentStateSnapshot(hotelId, date) {
    const client = await pool.connect();
    try {
        // Get total rooms
        const roomsQuery = `
            SELECT COUNT(*) as total_rooms
            FROM rooms 
            WHERE hotel_id = $1 AND for_sale = true
        `;
        const roomsResult = await client.query(roomsQuery, [hotelId]);

        // Get occupied rooms from reservation_details for the specific date (only non-cancelled)
        const occupiedRoomsQuery = `
            SELECT COUNT(DISTINCT room_id) as occupied_rooms
            FROM reservation_details 
            WHERE hotel_id = $1 AND date = $2 AND cancelled IS NULL
        `;
        const occupiedRoomsResult = await client.query(occupiedRoomsQuery, [hotelId, date]);

        // Get total reservation details count for the date (including cancelled)
        const reservationDetailsQuery = `
            SELECT 
                COUNT(*) as total_reservation_details,
                COUNT(CASE WHEN cancelled IS NULL THEN 1 END) as active_reservation_details,
                COUNT(CASE WHEN cancelled IS NOT NULL THEN 1 END) as cancelled_reservation_details
            FROM reservation_details 
            WHERE hotel_id = $1 AND date = $2
        `;
        const reservationDetailsResult = await client.query(reservationDetailsQuery, [hotelId, date]);

        const totalRooms = parseInt(roomsResult.rows[0].total_rooms);
        const occupiedRooms = parseInt(occupiedRoomsResult.rows[0].occupied_rooms);
        const totalReservationDetails = parseInt(reservationDetailsResult.rows[0].total_reservation_details);
        const activeReservationDetails = parseInt(reservationDetailsResult.rows[0].active_reservation_details);
        const cancelledReservationDetails = parseInt(reservationDetailsResult.rows[0].cancelled_reservation_details);

        return {
            totalRooms,
            occupiedRooms,
            totalReservationDetails,
            activeReservationDetails,
            cancelledReservationDetails,
            calculatedAvailableStock: totalRooms - occupiedRooms,
            tlLincolnStock: null // Will be populated by real-time check if implemented
        };

    } finally {
        client.release();
    }
}

/**
 * Get reservation lifecycle summary for the target date
 * Uses CTE approach to get min/max log dates and JOIN to get creation and final state info
 * Now includes check for parent reservation DELETE logs to handle CASCADE deletions
 */
async function getReservationLifecycle(hotelId, date) {
    const client = await pool.connect();
    try {
        // CTE approach: get min/max log dates, then JOIN to get creation and final state info
        const lifecycleQuery = `
            WITH record_timeframes AS (
                -- Get min and max log times for each reservation_details record that affects the target date
                SELECT DISTINCT
                    lr.record_id,
                    MIN(lr.log_time) as first_log_time,
                    MAX(lr.log_time) as last_log_time,
                    COUNT(*) as total_operations
                FROM logs_reservation lr
                WHERE 
                    lr.table_name = $1
                    AND (
                        -- Include records where the target date is involved in any operation
                        (lr.action IN ('INSERT', 'DELETE') AND (lr.changes->>'date')::date = $2)
                        OR 
                        (lr.action = 'UPDATE' AND (
                            (lr.changes->'new'->>'date')::date = $2 
                            OR (lr.changes->'old'->>'date')::date = $2
                        ))
                    )
                GROUP BY lr.record_id
            ),
            first_log_info AS (
                -- Get information from the first log entry (creation time)
                SELECT DISTINCT
                    rt.record_id,
                    lr.action as first_action,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'room_id')::integer
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'room_id')::integer, (lr.changes->'old'->>'room_id')::integer)
                    END AS room_id,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'reservation_id')::uuid
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'reservation_id')::uuid, (lr.changes->'old'->>'reservation_id')::uuid)
                    END AS reservation_id
                FROM record_timeframes rt
                JOIN logs_reservation lr ON lr.record_id = rt.record_id AND lr.log_time = rt.first_log_time
                WHERE lr.table_name = $1
            ),
            last_log_info AS (
                -- Get information from the last log entry (final state)
                SELECT DISTINCT
                    rt.record_id,
                    lr.action as last_action,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN lr.changes->>'cancelled'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'cancelled'
                    END AS last_cancelled_status,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'room_id')::integer
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'room_id')::integer, (lr.changes->'old'->>'room_id')::integer)
                    END AS last_room_id
                FROM record_timeframes rt
                JOIN logs_reservation lr ON lr.record_id = rt.record_id AND lr.log_time = rt.last_log_time
                WHERE lr.table_name = $1
            ),
            parent_reservation_status AS (
                -- Check if parent reservations were deleted (CASCADE DELETE detection)
                SELECT DISTINCT
                    fli.reservation_id,
                    CASE 
                        WHEN parent_delete_logs.record_id IS NOT NULL THEN true
                        ELSE false
                    END as parent_was_deleted
                FROM first_log_info fli
                LEFT JOIN (
                    SELECT DISTINCT record_id::uuid
                    FROM logs_reservation
                    WHERE table_name = $4 AND action = 'DELETE'
                ) parent_delete_logs ON fli.reservation_id = parent_delete_logs.record_id
            )
            SELECT 
                rt.record_id,
                rt.first_log_time,
                rt.last_log_time,
                rt.total_operations,
                fli.first_action,
                lli.last_action,
                lli.last_cancelled_status,
                fli.room_id as first_room_id,
                lli.last_room_id,
                fli.reservation_id,
                r_first.room_number as first_room_number,
                r_last.room_number as last_room_number,
                -- Add numeric versions for sorting
                CASE 
                    WHEN COALESCE(r_last.room_number, r_first.room_number) ~ '^[0-9]+$' THEN 
                        COALESCE(r_last.room_number, r_first.room_number)::integer
                    ELSE 9999  -- Put non-numeric room numbers at the end
                END as room_number_sort,
                COALESCE(
                    c.name_kanji,
                    c.name_kana, 
                    c.name,
                    'Unknown Client'
                ) as guest_name,
                prs.parent_was_deleted,
                CASE 
                    -- First check if it was explicitly deleted
                    WHEN lli.last_action = 'DELETE' THEN 'deleted'
                    -- Then check if parent reservation was deleted (CASCADE)
                    WHEN prs.parent_was_deleted = true THEN 'deleted'
                    -- Then check if it was cancelled
                    WHEN lli.last_cancelled_status IS NOT NULL AND lli.last_cancelled_status != '' AND lli.last_cancelled_status != 'null' THEN 'cancelled'
                    -- Otherwise it's active
                    ELSE 'active'
                END as final_status
            FROM record_timeframes rt
            JOIN first_log_info fli ON rt.record_id = fli.record_id
            JOIN last_log_info lli ON rt.record_id = lli.record_id
            JOIN parent_reservation_status prs ON fli.reservation_id = prs.reservation_id
            LEFT JOIN reservations res ON fli.reservation_id = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            LEFT JOIN rooms r_first ON fli.room_id = r_first.id AND r_first.hotel_id = $3
            LEFT JOIN rooms r_last ON lli.last_room_id = r_last.id AND r_last.hotel_id = $3
            ORDER BY rt.first_log_time DESC
        `;

        const tableName = `reservation_details_${hotelId}`;
        const reservationsTableName = `reservations_${hotelId}`;
        const result = await client.query(lifecycleQuery, [tableName, date, hotelId, reservationsTableName]);

        return result.rows;

    } finally {
        client.release();
    }
}

/**
 * Get PMS events that affect the target date from reservation_details logs
 * Includes INSERT, DELETE, and UPDATE operations that affect room availability
 */
async function getPMSEvents(hotelId, date) {
    const client = await pool.connect();
    try {
        const events = [];

        // Get reservation_details logs for INSERT, DELETE, and UPDATE operations on the target date
        const reservationDetailsLogsQuery = `
            SELECT 
                allLogs.*,
                COALESCE(
                    c.name_kanji,
                    c.name_kana, 
                    c.name
                ) as guest_name,
                r.room_number as room_number
            FROM (
                SELECT 
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'hotel_id')::integer
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'hotel_id')::integer, (lr.changes->'old'->>'hotel_id')::integer)
                    END AS hotel_id,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'date')::date
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'date')::date, (lr.changes->'old'->>'date')::date)
                    END AS date,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'room_id')::integer
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'room_id')::integer, (lr.changes->'old'->>'room_id')::integer)
                    END AS room_id,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN lr.changes->>'cancelled'
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'new'->>'cancelled'
                    END AS cancelled_new,
                    CASE
                        WHEN lr.action = 'UPDATE' THEN lr.changes->'old'->>'cancelled'
                        ELSE NULL
                    END AS cancelled_old,
                    CASE
                        WHEN lr.action IN ('INSERT', 'DELETE') THEN (lr.changes->>'reservation_id')::uuid
                        WHEN lr.action = 'UPDATE' THEN COALESCE((lr.changes->'new'->>'reservation_id')::uuid, (lr.changes->'old'->>'reservation_id')::uuid)
                    END AS reservation_id,
                    lr.record_id,
                    lr.action,
                    lr.log_time,
                    'reservation_detail' as event_type
                FROM logs_reservation lr
                WHERE 
                    lr.table_name LIKE 'reservation_details%'
                    AND (
                        -- Include all INSERT and DELETE operations
                        lr.action IN ('INSERT', 'DELETE')
                        OR 
                        -- Only include UPDATE operations that change cancelled status
                        (lr.action = 'UPDATE' AND (
                            lr.changes->'old'->>'cancelled' IS DISTINCT FROM lr.changes->'new'->>'cancelled'
                        ))
                    )
                    AND (
                        (lr.action IN ('INSERT', 'DELETE') AND (lr.changes->>'date')::date = $2)
                        OR 
                        (lr.action = 'UPDATE' AND (
                            (lr.changes->'new'->>'date')::date = $2 
                            OR (lr.changes->'old'->>'date')::date = $2
                        ))
                    )
            ) allLogs
            LEFT JOIN reservations res ON allLogs.reservation_id = res.id
            LEFT JOIN clients c ON res.reservation_client_id = c.id
            LEFT JOIN rooms r ON allLogs.room_id = r.id AND r.hotel_id = $1
            WHERE 
                allLogs.date = $2 
                AND allLogs.hotel_id = $1
            ORDER BY allLogs.log_time DESC
        `;

        const logsResult = await client.query(reservationDetailsLogsQuery, [hotelId, date]);

        // Transform the results to match our expected format
        events.push(...logsResult.rows.map(row => ({
            id: row.record_id,
            event_type: row.event_type,
            action: row.action,
            timestamp: row.log_time,
            date: row.date,
            room_id: row.room_id,
            room_number: row.room_number,
            cancelled: row.cancelled_new,
            cancelled_old: row.cancelled_old,
            guest_name: row.guest_name || 'Unknown Client'
        })));

        return events;

    } finally {
        client.release();
    }
}

/**
 * Get OTA XML queue events related to stock adjustments
 */
async function getOTAEvents(hotelId, date) {
    const client = await pool.connect();
    try {
        // Get OTA XML queue entries for stock-related services
        // Look for entries that contain the target date in XML body, regardless of created_at
        const otaQuery = `
            SELECT 
                id,
                service_name,
                xml_body,
                current_request_id,
                status,
                retries,
                last_error,
                created_at,
                processed_at
            FROM ota_xml_queue 
            WHERE hotel_id = $1 
            AND service_name LIKE '%Stock%'
            AND xml_body LIKE $2
            ORDER BY created_at DESC
            LIMIT 200
        `;
        
        // Convert date to YYYYMMDD format for XML search
        const yyyymmdd = date.replace(/-/g, '');
        const xmlDatePattern = `%${yyyymmdd}%`;
        
        const otaResult = await client.query(otaQuery, [hotelId, xmlDatePattern]);
        const events = [];

        // Process each matching XML request
        for (const row of otaResult.rows) {
            try {
                const containsTargetDate = await checkXMLContainsDate(row.xml_body, date);
                if (containsTargetDate) {
                    events.push({
                        id: row.id,
                        event_type: 'ota_xml',
                        action: 'stock_adjustment',
                        service_name: row.service_name,
                        timestamp: row.created_at,
                        processed_at: row.processed_at,
                        status: row.status,
                        retries: row.retries,
                        last_error: row.last_error,
                        request_id: row.current_request_id
                    });
                }
            } catch (parseError) {
                console.warn(`Failed to parse XML for queue ID ${row.id}:`, parseError.message);
            }
        }

        return events;

    } finally {
        client.release();
    }
}

/**
 * Check if XML body contains the target date
 */
async function checkXMLContainsDate(xmlBody, targetDate) {
    try {
        // Check for various date formats in the raw XML string first (more efficient)
        const dateFormats = [
            targetDate, // YYYY-MM-DD
            targetDate.replace(/-/g, ''), // YYYYMMDD (most common in XML)
            targetDate.replace(/-/g, '/'), // YYYY/MM/DD
        ];
        
        // Quick string search first
        const hasDateInXML = dateFormats.some(format => xmlBody.includes(format));
        if (hasDateInXML) {
            return true;
        }
        
        // Fallback to XML parsing if string search fails
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlBody);
        
        // Convert to string and search for date patterns
        const xmlString = JSON.stringify(result);
        return dateFormats.some(format => xmlString.includes(format));
        
    } catch (error) {
        console.warn('XML parsing error:', error.message);
        // Fallback to simple string search
        const yyyymmdd = targetDate.replace(/-/g, '');
        return xmlBody.includes(yyyymmdd);
    }
}

/**
 * Merge PMS and OTA events into a chronological timeline with room count changes
 */
function mergeTimeline(pmsEvents, otaEvents) {
    const allEvents = [...pmsEvents, ...otaEvents];
    
    // Sort by timestamp (newest first for display)
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // Create a map to track reservation_detail records and their relationships
    const recordMap = new Map();
    
    // Group events that happen at the same time for the same client
    const groupedEvents = [];
    let currentGroup = null;
    
    allEvents.forEach((event, index) => {
        // Calculate the impact of this event on room availability
        if (event.event_type === 'reservation_detail') {
            if (event.action === 'INSERT') {
                // When a reservation_detail is inserted (room becomes occupied)
                if (event.cancelled === null || event.cancelled === '' || event.cancelled === 'null') {
                    event.room_count_change = -1; // Room becomes unavailable
                } else {
                    event.room_count_change = 0; // Cancelled reservation doesn't affect availability
                }
                
                // Track this record for future DELETE operations
                recordMap.set(event.id, {
                    guest_name: event.guest_name,
                    room_number: event.room_number,
                    insert_timestamp: event.timestamp
                });
                
            } else if (event.action === 'DELETE') {
                // When a reservation_detail is deleted (room becomes available)
                event.room_count_change = 1; // Room becomes available
                
                // Check if we have the original INSERT for this record
                const originalRecord = recordMap.get(event.id);
                if (originalRecord) {
                    event.original_guest_name = originalRecord.guest_name;
                    event.original_insert_timestamp = originalRecord.insert_timestamp;
                    event.is_related_to_insert = true;
                } else {
                    event.is_related_to_insert = false;
                }
                
            } else if (event.action === 'UPDATE') {
                // For updates, check if cancelled status changed
                const wasActive = (event.cancelled_old === null || event.cancelled_old === '' || event.cancelled_old === 'null');
                const isActive = (event.cancelled === null || event.cancelled === '' || event.cancelled === 'null');
                
                if (wasActive && !isActive) {
                    // Room was occupied, now cancelled (room becomes available)
                    event.room_count_change = 1;
                } else if (!wasActive && isActive) {
                    // Room was cancelled, now active (room becomes occupied)
                    event.room_count_change = -1;
                } else {
                    // No change in availability status
                    event.room_count_change = 0;
                }
            }
        } else if (event.event_type === 'ota_xml') {
            // OTA events don't change room count, they sync the current state
            event.room_count_change = 0;
        }
        
        // Ensure room_count_change is always set
        event.room_count_change = event.room_count_change || 0;
        
        // Group logic: same timestamp, same client, same action, same event_type
        if (currentGroup && 
            currentGroup.timestamp === event.timestamp &&
            currentGroup.guest_name === event.guest_name &&
            currentGroup.action === event.action &&
            currentGroup.event_type === event.event_type &&
            event.event_type === 'reservation_detail') {
            
            // Add to current group
            currentGroup.room_numbers = currentGroup.room_numbers || [currentGroup.room_number];
            currentGroup.room_numbers.push(event.room_number);
            currentGroup.room_count_change += event.room_count_change;
            currentGroup.grouped_count = (currentGroup.grouped_count || 1) + 1;
            
        } else {
            // Start new group or add single event
            if (currentGroup) {
                groupedEvents.push(currentGroup);
            }
            
            currentGroup = {
                ...event,
                grouped_count: 1,
                room_numbers: event.room_number ? [event.room_number] : null
            };
        }
    });
    
    // Don't forget the last group
    if (currentGroup) {
        groupedEvents.push(currentGroup);
    }
    
    return groupedEvents;
}

/**
 * Generate summary and gap analysis
 */
function generateSummary(pmsEvents, otaEvents, timeline, reservationLifecycle = null) {
    const pmsEventCount = pmsEvents.length;
    const otaEventCount = otaEvents.length;
    
    // Calculate detailed operation statistics using CASCADE DELETE aware lifecycle data
    const operationStats = {
        totalInserts: 0,
        totalDeletes: 0,
        totalUpdates: 0,
        updatesCancelledToActive: 0,  // cancelled -> active (room becomes occupied)
        updatesActiveToCancelled: 0,  // active -> cancelled (room becomes available)
        netRoomChange: 0,
        // Add CASCADE DELETE aware counts
        totalActive: 0,
        totalCancelled: 0,
        totalDeleted: 0,
        cascadeDeleted: 0
    };
    
    // If we have CASCADE DELETE aware lifecycle data, use it for accurate statistics
    if (reservationLifecycle && reservationLifecycle.length > 0) {
        // Count by final status from lifecycle analysis
        reservationLifecycle.forEach(record => {
            if (record.final_status === 'active') {
                operationStats.totalActive++;
            } else if (record.final_status === 'cancelled') {
                operationStats.totalCancelled++;
            } else if (record.final_status === 'deleted') {
                operationStats.totalDeleted++;
                if (record.parent_was_deleted) {
                    operationStats.cascadeDeleted++;
                }
            }
        });
        
        // Calculate operations from lifecycle data
        reservationLifecycle.forEach(record => {
            if (record.first_action === 'INSERT') {
                operationStats.totalInserts++;
            }
            if (record.last_action === 'DELETE') {
                operationStats.totalDeletes++;
            }
            if (record.last_action === 'UPDATE') {
                operationStats.totalUpdates++;
                // Determine if it's a cancellation change
                const isCancelled = record.last_cancelled_status && 
                                  record.last_cancelled_status !== '' && 
                                  record.last_cancelled_status !== 'null';
                if (record.final_status === 'cancelled' && isCancelled) {
                    operationStats.updatesActiveToCancelled++;
                }
            }
        });
        
        // Calculate net room change: active records reduce availability
        operationStats.netRoomChange = -operationStats.totalActive;
        
    } else {
        // Fallback to old calculation method if no lifecycle data
        pmsEvents.forEach(event => {
            if (event.event_type === 'reservation_detail') {
                if (event.action === 'INSERT') {
                    operationStats.totalInserts++;
                    // Only count as room change if not cancelled at insertion
                    if (event.cancelled === null || event.cancelled === '' || event.cancelled === 'null') {
                        operationStats.netRoomChange -= 1;
                    }
                } else if (event.action === 'DELETE') {
                    operationStats.totalDeletes++;
                    operationStats.netRoomChange += 1;
                } else if (event.action === 'UPDATE') {
                    operationStats.totalUpdates++;
                    
                    const wasActive = (event.cancelled_old === null || event.cancelled_old === '' || event.cancelled_old === 'null');
                    const isActive = (event.cancelled === null || event.cancelled === '' || event.cancelled === 'null');
                    
                    if (wasActive && !isActive) {
                        // Room was occupied, now cancelled (room becomes available)
                        operationStats.updatesActiveToCancelled++;
                        operationStats.netRoomChange += 1;
                    } else if (!wasActive && isActive) {
                        // Room was cancelled, now active (room becomes occupied)
                        operationStats.updatesCancelledToActive++;
                        operationStats.netRoomChange -= 1;
                    }
                }
            }
        });
    }
    
    // Simple gap detection: look for PMS events without corresponding OTA events within a time window
    const gaps = [];
    const timeWindow = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    pmsEvents.forEach(pmsEvent => {
        const pmsTime = new Date(pmsEvent.timestamp);
        const hasCorrespondingOTA = otaEvents.some(otaEvent => {
            const otaTime = new Date(otaEvent.timestamp);
            return Math.abs(otaTime - pmsTime) <= timeWindow;
        });
        
        if (!hasCorrespondingOTA && pmsEvent.event_type === 'reservation_detail') {
            gaps.push({
                pmsEvent,
                expectedOTATime: new Date(pmsTime.getTime() + 60000), // Expected 1 minute later
                message: `予約詳細${pmsEvent.action === 'INSERT' ? '追加' : pmsEvent.action === 'DELETE' ? '削除' : '更新'}から${timeWindow/60000}分以内にOTA在庫調整が見つかりませんでした`
            });
        }
    });
    
    return {
        totalPMSEvents: pmsEventCount,
        totalOTAEvents: otaEventCount,
        potentialGaps: gaps.length,
        gaps,
        operationStats,
        analysis: {
            hasStockAdjustments: otaEventCount > 0,
            hasRecentActivity: pmsEventCount > 0,
            riskLevel: gaps.length > 0 ? 'HIGH' : otaEventCount === 0 ? 'MEDIUM' : 'LOW'
        }
    };
}

/**
 * Get OTA XML data for a specific queue entry
 */
async function getOTAXMLData(queueId) {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                id,
                service_name,
                xml_body,
                current_request_id,
                status,
                retries,
                last_error,
                created_at,
                processed_at,
                hotel_id
            FROM ota_xml_queue 
            WHERE id = $1
        `;
        
        const result = await client.query(query, [queueId]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return result.rows[0];

    } finally {
        client.release();
    }
}

module.exports = {
    getCurrentStateSnapshot,
    getPMSEvents,
    getOTAEvents,
    getReservationLifecycle,
    mergeTimeline,
    generateSummary,
    getOTAXMLData
};