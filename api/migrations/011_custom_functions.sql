-- Functions from the original api/sql_functions.sql file

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
            AND r.created_at >= (p_reference_date - p_lookback_days)
            AND r.created_at < (p_reference_date + INTERVAL '1 day')
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
            AND r.check_in >= (p_reference_date - p_lookback_days)
            AND r.check_in < (p_reference_date + INTERVAL '1 day')
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
    RETURN QUERY
    WITH RelevantReservations AS (
        SELECT
            r.id AS reservation_id,
            r.hotel_id
        FROM
            reservations r
        WHERE
            r.hotel_id = p_hotel_id
            AND r.created_at >= p_target_date
            AND r.created_at < (p_target_date + INTERVAL '1 day')
            AND r.status <> 'cancelled'
    )
    SELECT
        COALESCE(COUNT(DISTINCT rr.reservation_id), 0::BIGINT) AS total_reservations_count,
        COALESCE(SUM(rd.price), 0::DECIMAL) AS total_reservations_value
    FROM
        RelevantReservations rr
    LEFT JOIN
        reservation_details rd ON rr.reservation_id = rd.reservation_id AND rr.hotel_id = rd.hotel_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_room_inventory_comparison_for_date_range(
    p_hotel_id INT,
    p_snapshot_date DATE
)
RETURNS TABLE (
    inventory_date DATE,
    count_as_of_previous_day_end BIGINT,
    count_as_of_snapshot_day_end BIGINT
) AS $$
DECLARE
    snapshot_day_end_ts TIMESTAMP;
    previous_day_end_ts TIMESTAMP;
BEGIN
    snapshot_day_end_ts := (p_snapshot_date + INTERVAL '1 day' - INTERVAL '1 microsecond');
    previous_day_end_ts := (p_snapshot_date - INTERVAL '1 microsecond');

    RETURN QUERY
    WITH base_reservation_details AS (
        SELECT DISTINCT
            lrd.record_id AS reservation_detail_id,
            (lrd.changes ->> 'date')::DATE AS original_inventory_date
        FROM logs_reservation lrd
        WHERE lrd.action = 'INSERT'
          AND (
                (p_hotel_id IS NOT NULL AND lrd.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND lrd.table_name LIKE 'reservation_details_%')
              )
          AND ((lrd.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL)
    ),
    latest_log_entries_prev AS (
        SELECT DISTINCT ON (lr.record_id)
            lr.record_id AS reservation_detail_id,
            lr.action,
            CASE
                WHEN lr.action = 'INSERT' THEN (lr.changes ->> 'cancelled')
                WHEN lr.action = 'UPDATE' THEN (lr.changes -> 'new' ->> 'cancelled')
                ELSE NULL
            END AS cancelled_uuid_text,
            COALESCE((lr.changes -> 'new' ->> 'date')::DATE, (lr.changes ->> 'date')::DATE) AS effective_inventory_date
        FROM logs_reservation lr
        JOIN base_reservation_details brd ON lr.record_id = brd.reservation_detail_id
        WHERE lr.log_time <= previous_day_end_ts
          AND (
                (p_hotel_id IS NOT NULL AND lr.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND lr.table_name LIKE 'reservation_details_%')
              )
          AND (
                ((lr.action = 'INSERT' AND ((lr.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL))) OR
                ((lr.action = 'UPDATE' AND ((lr.changes -> 'new' ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL))) OR
                (lr.action = 'DELETE')
             )
        ORDER BY lr.record_id, lr.log_time DESC, lr.id DESC
    ),
    latest_log_entries_snap AS (
        SELECT DISTINCT ON (lr.record_id)
            lr.record_id AS reservation_detail_id,
            lr.action,
            CASE
                WHEN lr.action = 'INSERT' THEN (lr.changes ->> 'cancelled')
                WHEN lr.action = 'UPDATE' THEN (lr.changes -> 'new' ->> 'cancelled')
                ELSE NULL
            END AS cancelled_uuid_text,
            COALESCE((lr.changes -> 'new' ->> 'date')::DATE, (lr.changes ->> 'date')::DATE) AS effective_inventory_date
        FROM logs_reservation lr
        JOIN base_reservation_details brd ON lr.record_id = brd.reservation_detail_id
        WHERE lr.log_time <= snapshot_day_end_ts
          AND (
                (p_hotel_id IS NOT NULL AND lr.table_name = ('reservation_details_' || p_hotel_id::TEXT))
                OR
                (p_hotel_id IS NULL AND lr.table_name LIKE 'reservation_details_%')
              )
          AND (
                ((lr.action = 'INSERT' AND ((lr.changes ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL))) OR
                ((lr.action = 'UPDATE' AND ((lr.changes -> 'new' ->> 'hotel_id')::INT = p_hotel_id OR p_hotel_id IS NULL))) OR
                (lr.action = 'DELETE')
             )
        ORDER BY lr.record_id, lr.log_time DESC, lr.id DESC
    )
    SELECT
        COALESCE(snap.effective_inventory_date, prev.effective_inventory_date, brd.original_inventory_date) AS grouping_inventory_date,
        COUNT(DISTINCT CASE
                  WHEN prev.action IS NOT NULL AND prev.action <> 'DELETE' AND prev.cancelled_uuid_text IS NULL
                  THEN brd.reservation_detail_id
                  ELSE NULL
              END) AS count_as_of_previous_day_end,
        COUNT(DISTINCT CASE
                  WHEN snap.action IS NOT NULL AND snap.action <> 'DELETE' AND snap.cancelled_uuid_text IS NULL
                  THEN brd.reservation_detail_id
                  ELSE NULL
              END) AS count_as_of_snapshot_day_end
    FROM base_reservation_details brd
    LEFT JOIN latest_log_entries_prev prev ON brd.reservation_detail_id = prev.reservation_detail_id
    LEFT JOIN latest_log_entries_snap snap ON brd.reservation_detail_id = snap.reservation_detail_id
    WHERE COALESCE(snap.effective_inventory_date, prev.effective_inventory_date, brd.original_inventory_date) >= p_snapshot_date
    GROUP BY grouping_inventory_date
    HAVING
        COUNT(DISTINCT CASE
                  WHEN prev.action IS NOT NULL AND prev.action <> 'DELETE' AND prev.cancelled_uuid_text IS NULL
                  THEN brd.reservation_detail_id
                  ELSE NULL
              END) > 0
        OR
        COUNT(DISTINCT CASE
                  WHEN snap.action IS NOT NULL AND snap.action <> 'DELETE' AND snap.cancelled_uuid_text IS NULL
                  THEN brd.reservation_detail_id
                  ELSE NULL
              END) > 0
    ORDER BY grouping_inventory_date;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_available_plans_for_hotel(p_hotel_id INT)
RETURNS TABLE(
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    name TEXT,
    description TEXT,
    plan_type TEXT,
    color VARCHAR(7)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ph.plans_global_id,
        ph.id AS plans_hotel_id,
        COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
        ph.name,
        ph.description,
        ph.plan_type,
        ph.color
    FROM
        plans_hotel AS ph
    WHERE
        ph.hotel_id = p_hotel_id

    UNION ALL

    SELECT
        pg.id AS plans_global_id,
        NULL::INT AS plans_hotel_id,
        pg.id::TEXT || 'h' AS plan_key,
        pg.name,
        pg.description,
        pg.plan_type,
        pg.color
    FROM
        plans_global AS pg
    WHERE
        NOT EXISTS (
            SELECT 1
            FROM hotel_plan_exclusions hpe
            WHERE hpe.global_plan_id = pg.id AND hpe.hotel_id = p_hotel_id
        )
        AND NOT EXISTS (
            SELECT 1
            FROM plans_hotel ph
            WHERE ph.plans_global_id = pg.id AND ph.hotel_id = p_hotel_id
        );
END;
$$ LANGUAGE plpgsql;
