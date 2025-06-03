CREATE OR REPLACE FUNCTION get_average_lead_time_for_new_bookings(
    p_hotel_id INT,
    p_lookback_days INT
)
RETURNS DECIMAL(10, 2) AS $$ -- Specify precision for the returned DECIMAL
DECLARE
    avg_lead_time DECIMAL(10, 2);
BEGIN
    -- This function calculates the average lead time for new, non-cancelled bookings
    -- for a specific hotel, looking back a defined number of days from the current date.
    -- Lead time is the difference in days between check_in date and reservation creation date.

    WITH RelevantBookings AS (
        SELECT
            r.check_in::DATE - r.created_at::DATE AS lead_time_days
        FROM
            reservations r
        WHERE
            r.hotel_id = p_hotel_id                                     -- Filter by the specific hotel
            AND r.created_at >= (CURRENT_DATE - (p_lookback_days || ' days')::INTERVAL) -- Filter for bookings within the lookback period
            AND r.created_at < (CURRENT_DATE + INTERVAL '1 day')        -- Ensure we capture bookings made today up to the end of day
            AND r.status <> 'cancelled'                                 -- Exclude cancelled reservations
    )
    SELECT
        COALESCE(AVG(rb.lead_time_days), 0.00) INTO avg_lead_time
    FROM
        RelevantBookings rb;

    RETURN avg_lead_time;

END;
$$ LANGUAGE plpgsql;

-- Example Usage (not part of the function body, just for testing):
-- Assuming you have a hotel with id 1:
-- SELECT * FROM get_average_lead_time_for_new_bookings(1, 30); -- Avg lead time for bookings made in the last 30 days for hotel 1
-- SELECT * FROM get_average_lead_time_for_new_bookings(1, 90); -- Avg lead time for bookings made in the last 90 days for hotel 1
-- SELECT * FROM get_average_lead_time_for_new_bookings(999, 30); -- Example for a hotel with no bookings, should return 0.00

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

