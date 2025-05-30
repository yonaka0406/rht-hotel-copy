-- Function to update total_rooms
CREATE OR REPLACE FUNCTION update_total_rooms() RETURNS TRIGGER AS $$
BEGIN
  UPDATE hotels
  SET total_rooms = (
    SELECT COUNT(*)
    FROM rooms
    WHERE hotel_id = NEW.hotel_id AND for_sale = TRUE
  )
  WHERE id = NEW.hotel_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_total_rooms_trigger
AFTER INSERT OR UPDATE OR DELETE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_total_rooms();

-- Function for the WebSockets
CREATE OR REPLACE FUNCTION notify_logs_reservation_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to PostgreSQL log file
  RAISE NOTICE 'Trigger fired: %', TG_OP;  -- TG_OP gives INSERT, UPDATE, DELETE
  PERFORM pg_notify('logs_reservation_changed', '');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER logs_reservation_changes
AFTER INSERT OR UPDATE OR DELETE ON logs_reservation
FOR EACH ROW EXECUTE PROCEDURE notify_logs_reservation_changes();

-- Report 1: Change in Active/Confirmed Reservations
CREATE OR REPLACE FUNCTION get_active_reservations_count_at_datetime(
    p_hotel_id INT, -- Assuming you might want this per hotel, can be NULL for all
    p_snapshot_datetime TIMESTAMP
)
RETURNS BIGINT AS $$
DECLARE
    active_count BIGINT;
BEGIN
    WITH reservation_last_status AS (
        SELECT
            lr.record_id AS reservation_id,
            -- Extract the status from the JSON based on the action
            CASE
                WHEN lr.action = 'INSERT' THEN lr.changes ->> 'status'
                WHEN lr.action = 'UPDATE' THEN lr.changes -> 'new' ->> 'status'
                ELSE NULL -- Consider DELETEd as not active or handle as per business rule
            END AS status_at_snapshot,
            ROW_NUMBER() OVER (PARTITION BY lr.record_id ORDER BY lr.log_time DESC) as rn
        FROM
            logs_reservation lr
        WHERE
            lr.table_name = 'reservations'
            AND lr.log_time <= p_snapshot_datetime
            AND ( 
                  p_hotel_id IS NULL OR
                  (lr.action = 'INSERT' AND (lr.changes ->> 'hotel_id')::INT = p_hotel_id) OR
                  (lr.action = 'UPDATE' AND (lr.changes -> 'new' ->> 'hotel_id')::INT = p_hotel_id)
            )
    ),
    reservation_initial_data AS (
      SELECT
        lr.record_id as reservation_id,
        (lr.changes ->> 'hotel_id')::INT as hotel_id
      FROM logs_reservation lr
      WHERE lr.table_name = 'reservations' AND lr.action = 'INSERT'
      AND lr.log_time <= p_snapshot_datetime
      GROUP BY 1,2 
    )
    SELECT COUNT(DISTINCT rls.reservation_id)
    INTO active_count
    FROM reservation_last_status rls
    LEFT JOIN reservation_initial_data rid ON rls.reservation_id = rid.reservation_id
    WHERE rls.rn = 1 
      AND rls.status_at_snapshot IN ('confirmed', 'checked_in', 'checked_out')
      AND (p_hotel_id IS NULL OR rid.hotel_id = p_hotel_id);

    RETURN active_count;
END;
$$ LANGUAGE plpgsql;