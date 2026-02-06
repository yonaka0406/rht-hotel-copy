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

CREATE OR REPLACE FUNCTION get_available_plans_for_hotel(
    p_hotel_id INTEGER,
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_date_end DATE DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    name TEXT,
    description TEXT,
    plan_type TEXT,
    color VARCHAR(7),
    plan_type_category_id INT,
    plan_package_category_id INT,
    display_order INT,
    is_active BOOLEAN,
    available_from DATE,
    available_until DATE
) AS $$
BEGIN
    RETURN QUERY
    -- Hotel-specific plans with new filtering
    SELECT
        ph.plans_global_id,
        ph.id AS plans_hotel_id,
        COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
        ph.name,
        ph.description,
        ph.plan_type,
        ph.color,
        ph.plan_type_category_id,
        ph.plan_package_category_id,
        ph.display_order,
        ph.is_active,
        ph.available_from,
        ph.available_until
    FROM
        plans_hotel AS ph
    WHERE
        ph.hotel_id = p_hotel_id
        AND (p_include_inactive OR ph.is_active = true) -- Filter by active status unless including inactive
        AND (ph.available_from IS NULL OR ph.available_from <= p_target_date) -- Plan must be available from the start date
        AND (ph.available_until IS NULL OR ph.available_until >= COALESCE(p_date_end, p_target_date)) -- Plan must be available until the end date (or target date if no end date)

    UNION ALL

    -- Global plans (still supported, not deprecated yet)
    SELECT
        pg.id AS plans_global_id,
        NULL::INT AS plans_hotel_id,
        pg.id::TEXT || 'h' AS plan_key,
        pg.name,
        pg.description,
        pg.plan_type,
        pg.color,
        NULL::INT AS plan_type_category_id,
        NULL::INT AS plan_package_category_id,
        999 AS display_order, -- Put global plans at the end
        true AS is_active, -- Global plans are always considered active
        NULL::DATE AS available_from,
        NULL::DATE AS available_until
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
        )
    
    ORDER BY display_order ASC, plan_type ASC, name ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Optional: Create the enhanced function for future use when ready to include rates and addons
-- This can be used when you want to reduce database calls by getting everything in one query
CREATE OR REPLACE FUNCTION get_available_plans_with_rates_and_addons(
    p_hotel_id INT,
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_date_end DATE DEFAULT NULL,
    p_include_inactive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    plan_name TEXT,
    plan_type TEXT,
    description TEXT,
    type_category TEXT,
    package_category TEXT,
    display_order INT,
    is_active BOOLEAN,
    color VARCHAR(7),
    rates JSONB,
    addons JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Hotel-specific plans with rates and addons
    SELECT
        ph.plans_global_id,
        ph.id AS plans_hotel_id,
        COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
        ph.name AS plan_name,
        ph.plan_type,
        ph.description,
        ptc.name AS type_category,
        ppc.name AS package_category,
        ph.display_order,
        ph.is_active,
        ph.color,
        -- Aggregate rates as JSONB array
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rate_id', pr.id,
                    'date_start', pr.date_start,
                    'date_end', pr.date_end,
                    'adjustment_type', pr.adjustment_type,
                    'adjustment_value', pr.adjustment_value,
                    'condition_type', pr.condition_type,
                    'condition_value', pr.condition_value,
                    'tax_rate', pr.tax_rate,
                    'sales_category', pr.sales_category
                ) ORDER BY pr.date_start
            )
            FROM plans_rates pr
            WHERE pr.plans_hotel_id = ph.id
                AND pr.hotel_id = ph.hotel_id
                AND pr.date_start <= COALESCE(p_date_end, p_target_date)
                AND (pr.date_end IS NULL OR pr.date_end >= p_target_date)
        ), '[]'::jsonb) AS rates,
        -- Aggregate addons as JSONB array (including both hotel and global addons)
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'addon_id', COALESCE(ah.id, ag.id),
                    'addon_name', COALESCE(ah.name, ag.name),
                    'addon_type', ac.addon_type,
                    'price', COALESCE(ah.price, ag.price),
                    'tax_rate', COALESCE(ah.tax_rate, ag.tax_rate),
                    'net_price', COALESCE(ah.net_price, ag.net_price),
                    'visible', COALESCE(ah.visible, ag.visible),
                    'is_global', CASE WHEN ag.id IS NOT NULL THEN true ELSE false END
                ) ORDER BY COALESCE(ah.display_order, ag.display_order, 999)
            )
            FROM plan_addons pa
            LEFT JOIN addons_hotel ah ON pa.addons_hotel_id = ah.id AND pa.hotel_id = ah.hotel_id
            LEFT JOIN addons_global ag ON pa.addons_global_id = ag.id
            LEFT JOIN addon_categories ac ON COALESCE(ah.addon_category_id, ag.addon_category_id) = ac.id
            WHERE pa.plans_hotel_id = ph.id
                AND pa.hotel_id = ph.hotel_id
                AND (ah.is_active = true OR ag.id IS NOT NULL) -- Hotel addons must be active, global addons are always considered active
        ), '[]'::jsonb) AS addons
    FROM plans_hotel ph
    LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
    WHERE ph.hotel_id = p_hotel_id
        AND (p_include_inactive OR ph.is_active = true)
        AND (ph.available_from IS NULL OR ph.available_from <= p_target_date)
        AND (ph.available_until IS NULL OR ph.available_until >= COALESCE(p_date_end, p_target_date))

    UNION ALL

    -- Global plans with their rates and addons
    SELECT
        pg.id AS plans_global_id,
        NULL::INT AS plans_hotel_id,
        pg.id::TEXT || 'h' AS plan_key,
        pg.name AS plan_name,
        pg.plan_type,
        pg.description,
        NULL::TEXT AS type_category,
        NULL::TEXT AS package_category,
        999 AS display_order,
        true AS is_active,
        pg.color,
        -- Global plan rates
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'rate_id', pr.id,
                    'date_start', pr.date_start,
                    'date_end', pr.date_end,
                    'adjustment_type', pr.adjustment_type,
                    'adjustment_value', pr.adjustment_value,
                    'condition_type', pr.condition_type,
                    'condition_value', pr.condition_value,
                    'tax_rate', pr.tax_rate,
                    'sales_category', pr.sales_category
                ) ORDER BY pr.date_start
            )
            FROM plans_rates pr
            WHERE pr.plans_global_id = pg.id
                AND pr.hotel_id = p_hotel_id
                AND pr.date_start <= COALESCE(p_date_end, p_target_date)
                AND (pr.date_end IS NULL OR pr.date_end >= p_target_date)
        ), '[]'::jsonb) AS rates,
        -- Global plan addons
        COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'addon_id', ag.id,
                    'addon_name', ag.name,
                    'addon_type', ac.addon_type,
                    'price', ag.price,
                    'tax_rate', ag.tax_rate,
                    'net_price', ag.net_price,
                    'visible', ag.visible,
                    'is_global', true
                ) ORDER BY ag.display_order
            )
            FROM plan_addons pa
            JOIN addons_global ag ON pa.addons_global_id = ag.id
            JOIN addon_categories ac ON ag.addon_category_id = ac.id
            WHERE pa.plans_global_id = pg.id
                AND pa.hotel_id = p_hotel_id
        ), '[]'::jsonb) AS addons
    FROM plans_global pg
    WHERE NOT EXISTS (
            SELECT 1
            FROM hotel_plan_exclusions hpe
            WHERE hpe.global_plan_id = pg.id AND hpe.hotel_id = p_hotel_id
        )
        AND NOT EXISTS (
            SELECT 1
            FROM plans_hotel ph
            WHERE ph.plans_global_id = pg.id AND ph.hotel_id = p_hotel_id
        )
    
    ORDER BY display_order ASC, plan_type ASC, plan_name ASC;
END;
$$ LANGUAGE plpgsql STABLE;
