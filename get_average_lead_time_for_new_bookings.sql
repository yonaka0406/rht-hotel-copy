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
