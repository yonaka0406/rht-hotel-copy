-- Function and Trigger for WebSocket notifications on logs_reservation changes
-- This function is an update of the one in 012_triggers.sql
-- It adds the hotel_id to the notification payload
CREATE OR REPLACE FUNCTION notify_logs_reservation_changes()
RETURNS TRIGGER AS $$
DECLARE
  record_id_text TEXT;
  hotel_id_val INT;
  payload TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_id_text := OLD.id::text;
    hotel_id_val := (OLD.changes->>'hotel_id')::INT;
  ELSE
    record_id_text := NEW.id::text;
    IF TG_OP = 'UPDATE' THEN
      hotel_id_val := (NEW.changes->'new'->>'hotel_id')::INT;
    ELSE -- INSERT
      hotel_id_val := (NEW.changes->>'hotel_id')::INT;
    END IF;
  END IF;

  -- If hotel_id is null, we can't send a targeted notification, so we don't send anything.
  -- This could happen if a table that doesn't have hotel_id is logged to logs_reservation.
  IF hotel_id_val IS NULL THEN
    RETURN NEW;
  END IF;

  payload := json_build_object(
      'table', TG_TABLE_NAME,
      'action', TG_OP,
      'record_id', record_id_text,
      'hotel_id', hotel_id_val
  )::text;

  PERFORM pg_notify('logs_reservation_changed', payload);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;