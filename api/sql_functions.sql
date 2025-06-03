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

-- Example Usage (not part of the function body, just for testing):
-- Assuming you have a hotel with id 1:
-- SELECT * FROM get_average_lead_time_for_new_bookings(1, 30); -- Avg lead time for bookings made in the last 30 days for hotel 1
-- SELECT * FROM get_average_lead_time_for_new_bookings(1, 90); -- Avg lead time for bookings made in the last 90 days for hotel 1
-- SELECT * FROM get_average_lead_time_for_new_bookings(999, 30); -- Example for a hotel with no bookings, should return 0.00
-- Compute a weighted average across hotels
-- SELECT SUM(lead_time_avg * reservation_count) / SUM(reservation_count) AS weighted_avg_lead_time FROM (SELECT * FROM get_average_lead_time_for_new_bookings(hotel_id, 30) FROM (SELECT unnest(ARRAY[7, 8, 9]) AS hotel_id) AS hotels) t;

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

-- Example Usage (not part of the function body, just for testing):
-- Assuming you have hotels with id 1 and some reservations for 2023-10-26:
-- SELECT * FROM get_reservations_made_on_date('2023-10-26', 1);

