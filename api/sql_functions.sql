CREATE OR REPLACE FUNCTION get_booking_based_lead_time(
    p_hotel_id INT,
    p_lookback_days INT,
    p_reference_date DATE
)
RETURNS TABLE(
    average_lead_time NUMERIC(10, 2),
    total_nights NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH RelevantReservations AS (
        SELECT
            r.id AS reservation_id,
            r.hotel_id,
            (r.check_in::DATE - r.created_at::DATE) AS lead_time
        FROM
            reservations r
        WHERE
            r.hotel_id = p_hotel_id
            AND r.created_at::DATE BETWEEN (p_reference_date - p_lookback_days) AND p_reference_date
            AND r.status <> 'cancelled'
    ),
    RoomNights AS (
        SELECT
            rd.reservation_id,
            COUNT(*) AS nights
        FROM reservation_details rd
        WHERE
            rd.hotel_id = p_hotel_id
            AND rd.billable = TRUE
        GROUP BY rd.reservation_id
    )
    SELECT
        COALESCE(SUM(rr.lead_time * rn.nights)::NUMERIC / NULLIF(SUM(rn.nights), 0), 0)::NUMERIC(10, 2) AS average_lead_time,
        COALESCE(SUM(rn.nights), 0) AS total_nights
    FROM RelevantReservations rr
    JOIN RoomNights rn ON rr.reservation_id = rn.reservation_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_checkin_based_lead_time(
    p_hotel_id INT,
    p_lookback_days INT,
    p_reference_date DATE
)
RETURNS TABLE(
    average_lead_time NUMERIC(10, 2),
    total_nights NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    WITH RelevantReservations AS (
        SELECT
            r.id AS reservation_id,
            r.hotel_id,
            (r.check_in::DATE - r.created_at::DATE) AS lead_time
        FROM
            reservations r
        WHERE
            r.hotel_id = p_hotel_id
            AND r.check_in::DATE BETWEEN (p_reference_date - p_lookback_days) AND p_reference_date
            AND r.status <> 'cancelled'
    ),
    RoomNights AS (
        SELECT
            rd.reservation_id,
            COUNT(*) AS nights
        FROM reservation_details rd
        WHERE
            rd.hotel_id = p_hotel_id
            AND rd.billable = TRUE
        GROUP BY rd.reservation_id
    )
    SELECT
        COALESCE(SUM(rr.lead_time * rn.nights)::NUMERIC / NULLIF(SUM(rn.nights), 0), 0)::NUMERIC(10, 2) AS average_lead_time,
        COALESCE(SUM(rn.nights), 0) AS total_nights
    FROM RelevantReservations rr
    JOIN RoomNights rn ON rr.reservation_id = rn.reservation_id;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION get_reservations_made_on_date(
    p_target_date DATE,
    p_hotel_id INT
)
RETURNS TABLE (
    total_reservations_count BIGINT,
    total_reservations_value DECIMAL
) AS $$
BEGIN
    -- This function calculates the total count and value of new, non-cancelled reservations
    -- created on a specific date for a specific hotel.
    -- It joins reservations with their details to sum the price from reservation_details.

    RETURN QUERY
    WITH RelevantReservations AS (
        -- Select reservations created on the target date for the specific hotel,
        -- excluding cancelled ones.
        -- The hotel_id filter is applied here as it's the partition key and essential for performance.
        SELECT
            r.id AS reservation_id,
            r.hotel_id -- Included for joining with reservation_details
        FROM
            reservations r
        WHERE
            r.hotel_id = p_hotel_id -- Filter by hotel_id first (partition key)
            AND r.created_at::DATE = p_target_date
            AND r.status <> 'cancelled'
    )
    -- Aggregate the count of distinct reservations and the sum of their prices.
    -- A LEFT JOIN is used from a single-row CTE (for aggregation) to RelevantReservations
    -- and then to reservation_details to ensure we get 0/0 if no reservations are found,
    -- instead of an empty result set.
    SELECT
        COALESCE(COUNT(DISTINCT rr.reservation_id), 0::BIGINT) AS total_reservations_count,
        COALESCE(SUM(rd.price), 0::DECIMAL) AS total_reservations_value
    FROM
        RelevantReservations rr
    LEFT JOIN
        reservation_details rd ON rr.reservation_id = rd.reservation_id AND rr.hotel_id = rd.hotel_id;
        -- Both reservation_id and hotel_id are used in the join condition
        -- as hotel_id is part of the foreign key and primary key due to partitioning.

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_room_inventory_comparison_for_target_date(
    p_hotel_id INT, -- Hotel ID to filter by, NULL for all hotels
    p_snapshot_date DATE, -- The "current day" of observation
    p_target_date_for_inventory DATE -- The future date for which inventory is being checked
)
RETURNS BIGINT[] AS $$ -- Returns: [count_as_of_previous_day_end, count_as_of_snapshot_day_end]
DECLARE
    count_as_of_snapshot_day_end BIGINT;
    count_as_of_previous_day_end BIGINT;

    -- Define the precise end-of-day timestamps for log filtering
    snapshot_day_end_ts TIMESTAMP;
    previous_day_end_ts TIMESTAMP;
BEGIN
    snapshot_day_end_ts := (p_snapshot_date + INTERVAL '1 day' - INTERVAL '1 microsecond');
    previous_day_end_ts := (p_snapshot_date - INTERVAL '1 microsecond');

    -- Calculate count of active (non-deleted, non-cancelled) details as of previous_day_end_ts
    WITH relevant_reservation_details_base AS (
        SELECT
            lrd.record_id AS reservation_detail_id -- This is assumed to be reservation_details.id
        FROM
            logs_reservation lrd
        WHERE
            lrd.action = 'INSERT' -- Anchor on original insertions
            -- Filter for logs pertaining to reservation_details table for the specific hotel or all hotels
            AND (
                (p_hotel_id IS NOT NULL AND lrd.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND lrd.table_name LIKE 'reservation_details_%')
            )
            -- Ensure the INSERT log's 'changes' JSON matches the hotel and target date
            AND ((lrd.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)
            AND (lrd.changes ->> 'date')::DATE = p_target_date_for_inventory
    )
    SELECT COUNT(DISTINCT base.reservation_detail_id)
    INTO count_as_of_previous_day_end
    FROM relevant_reservation_details_base base
    LEFT JOIN LATERAL (
        -- Find the last relevant log entry for this detail up to previous_day_end_ts
        SELECT
            sub_lrd.action,
            CASE
                WHEN sub_lrd.action = 'INSERT' THEN (sub_lrd.changes ->> 'cancelled')
                WHEN sub_lrd.action = 'UPDATE' THEN (sub_lrd.changes -> 'new' ->> 'cancelled')
                ELSE NULL
            END AS cancelled_uuid_text,
            sub_lrd.log_time AS last_log_time
        FROM logs_reservation sub_lrd
        WHERE sub_lrd.record_id = base.reservation_detail_id -- Assumes record_id is reservation_details.id
          AND sub_lrd.log_time <= previous_day_end_ts
          -- Filter for logs pertaining to reservation_details table
          AND (
                (p_hotel_id IS NOT NULL AND sub_lrd.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND sub_lrd.table_name LIKE 'reservation_details_%')
            )
          -- Ensure the log entry's hotel_id (if present in JSON) matches, or p_hotel_id is NULL
          AND (
                (sub_lrd.action = 'INSERT' AND ((sub_lrd.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)) OR
                (sub_lrd.action = 'UPDATE' AND ((sub_lrd.changes -> 'new' ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)) OR
                (sub_lrd.action = 'DELETE') -- For DELETE, hotel_id might not be in 'changes' but is known from 'base'
             )
        ORDER BY sub_lrd.log_time DESC -- Removed log_id for tie-breaking
        LIMIT 1
    ) latest_status_prev ON TRUE
    WHERE
        latest_status_prev.last_log_time IS NOT NULL
        AND latest_status_prev.action <> 'DELETE'
        AND latest_status_prev.cancelled_uuid_text IS NULL;

    -- Calculate count of active (non-deleted, non-cancelled) details as of snapshot_day_end_ts
    WITH relevant_reservation_details_base AS (
        SELECT
            lrd.record_id AS reservation_detail_id -- This is assumed to be reservation_details.id
        FROM
            logs_reservation lrd
        WHERE
            lrd.action = 'INSERT' -- Anchor on original insertions
            -- Filter for logs pertaining to reservation_details table for the specific hotel or all hotels
            AND (
                (p_hotel_id IS NOT NULL AND lrd.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND lrd.table_name LIKE 'reservation_details_%')
            )
            -- Ensure the INSERT log's 'changes' JSON matches the hotel and target date
            AND ((lrd.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)
            AND (lrd.changes ->> 'date')::DATE = p_target_date_for_inventory
    )
    SELECT COUNT(DISTINCT base.reservation_detail_id)
    INTO count_as_of_snapshot_day_end
    FROM relevant_reservation_details_base base
    LEFT JOIN LATERAL (
        -- Find the last relevant log entry for this detail up to snapshot_day_end_ts
        SELECT
            sub_lrd.action,
            CASE
                WHEN sub_lrd.action = 'INSERT' THEN (sub_lrd.changes ->> 'cancelled')
                WHEN sub_lrd.action = 'UPDATE' THEN (sub_lrd.changes -> 'new' ->> 'cancelled')
                ELSE NULL
            END AS cancelled_uuid_text,
            sub_lrd.log_time AS last_log_time
        FROM logs_reservation sub_lrd
        WHERE sub_lrd.record_id = base.reservation_detail_id -- Assumes record_id is reservation_details.id
          AND sub_lrd.log_time <= snapshot_day_end_ts
          -- Filter for logs pertaining to reservation_details table
          AND (
                (p_hotel_id IS NOT NULL AND sub_lrd.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND sub_lrd.table_name LIKE 'reservation_details_%')
            )
          AND (
                (sub_lrd.action = 'INSERT' AND ((sub_lrd.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)) OR
                (sub_lrd.action = 'UPDATE' AND ((sub_lrd.changes -> 'new' ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)) OR
                (sub_lrd.action = 'DELETE')
             )
        ORDER BY sub_lrd.log_time DESC -- Removed log_id for tie-breaking
        LIMIT 1
    ) latest_status_snap ON TRUE
    WHERE
        latest_status_snap.last_log_time IS NOT NULL
        AND latest_status_snap.action <> 'DELETE'
        AND latest_status_snap.cancelled_uuid_text IS NULL;

    RETURN ARRAY[count_as_of_previous_day_end, count_as_of_snapshot_day_end];
END;
$$ LANGUAGE plpgsql;

-- Example Usage for get_room_inventory_comparison_for_target_date:
--
-- This function calculates the number of non-cancelled rooms for a specific future date ('p_target_date_for_inventory')
-- by reconstructing the state from 'logs_reservation' (assuming it logs changes to 'reservation_details')
-- at two points in time:
-- 1. As of the end of 'p_snapshot_date - 1 day'.
-- 2. As of the end of 'p_snapshot_date'.
--
-- Assumptions:
-- 1. 'logs_reservation' table logs changes to 'reservation_details'.
--    - 'record_id' in logs is 'reservation_details.id' when logging a detail change.
--    - 'table_name' in logs is like 'reservation_details_<hotel_id>' for detail logs.
--    - 'changes' JSON contains relevant fields like 'cancelled' (UUID), 'hotel_id', 'date' for detail logs.
--    - 'action' can be 'INSERT', 'UPDATE', 'DELETE'.
-- 2. A room detail is considered "active" or "booked" if its latest state before the snapshot point
--    was not 'DELETE' and its 'cancelled' field (UUID) was NULL.
-- 3. The function returns an array of two BIGINTs:
--    - result[1]: Count of rooms for 'p_target_date_for_inventory' as of end of ('p_snapshot_date' - 1 DAY).
--    - result[2]: Count of rooms for 'p_target_date_for_inventory' as of end of 'p_snapshot_date'.
--
-- Scenario:
-- p_hotel_id = 7
-- p_snapshot_date = '2025-06-03' (observing "today" and "yesterday")
-- p_target_date_for_inventory = '2025-07-08' (the future date we care about inventory for)
--
-- If, based on logs up to end of '2025-06-02', there were 3 rooms for hotel 7 on '2025-07-08'.
-- And, due to a cancellation logged on '2025-06-03', based on logs up to end of '2025-06-03',
-- there are now 0 rooms for hotel 7 on '2025-07-08'.
-- SELECT get_room_inventory_comparison_for_target_date(7, '2025-06-03', '2025-07-08');
-- Expected output: ARRAY[3, 0]

