-- Attaching log_user_changes to user-related tables
CREATE TRIGGER log_users_trigger
AFTER INSERT OR UPDATE OR DELETE ON users
FOR EACH ROW EXECUTE FUNCTION log_user_changes();

CREATE TRIGGER log_user_status_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_status
FOR EACH ROW EXECUTE FUNCTION log_user_changes();

CREATE TRIGGER log_user_roles_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION log_user_changes();

-- Attaching log_hotel_changes to hotel-related tables
CREATE TRIGGER log_hotels_trigger
AFTER INSERT OR UPDATE OR DELETE ON hotels
FOR EACH ROW EXECUTE FUNCTION log_hotel_changes();

CREATE TRIGGER log_room_types_trigger
AFTER INSERT OR UPDATE OR DELETE ON room_types
FOR EACH ROW EXECUTE FUNCTION log_hotel_changes();

CREATE TRIGGER log_rooms_trigger
AFTER INSERT OR UPDATE OR DELETE ON rooms
FOR EACH ROW EXECUTE FUNCTION log_hotel_changes();

-- Attaching log_hotel_plans_changes to plan-related tables
CREATE TRIGGER log_plans_global_trigger
AFTER INSERT OR UPDATE OR DELETE ON plans_global
FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

CREATE TRIGGER log_plans_hotel_trigger
AFTER INSERT OR UPDATE OR DELETE ON plans_hotel
FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

CREATE TRIGGER log_plans_rates_trigger
AFTER INSERT OR UPDATE OR DELETE ON plans_rates
FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

CREATE TRIGGER log_plan_addons_trigger
AFTER INSERT OR UPDATE OR DELETE ON plan_addons
FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

-- Attaching log_hotel_addons_changes to addon-related tables
CREATE TRIGGER log_addons_global_trigger
AFTER INSERT OR UPDATE OR DELETE ON addons_global
FOR EACH ROW EXECUTE FUNCTION log_hotel_addons_changes();

CREATE TRIGGER log_addons_hotel_trigger
AFTER INSERT OR UPDATE OR DELETE ON addons_hotel
FOR EACH ROW EXECUTE FUNCTION log_hotel_addons_changes();

-- Attaching log_clients_changes to client-related tables
CREATE TRIGGER log_clients_trigger
AFTER INSERT OR UPDATE OR DELETE ON clients
FOR EACH ROW EXECUTE FUNCTION log_clients_changes();

CREATE TRIGGER log_addresses_trigger
AFTER INSERT OR UPDATE OR DELETE ON addresses
FOR EACH ROW EXECUTE FUNCTION log_clients_changes();

CREATE TRIGGER log_client_group_trigger
AFTER INSERT OR UPDATE OR DELETE ON client_group
FOR EACH ROW EXECUTE FUNCTION log_clients_changes();

-- Attaching log_reservations_changes to reservation-related tables
CREATE TRIGGER log_reservations_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

CREATE TRIGGER log_reservation_details_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservation_details
FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

CREATE TRIGGER log_reservation_addons_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservation_addons
FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

CREATE TRIGGER log_reservation_clients_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservation_clients
FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

CREATE TRIGGER log_reservation_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservation_payments
FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

CREATE TRIGGER log_reservation_rates_trigger
AFTER INSERT OR UPDATE OR DELETE ON reservation_rates
FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

-- Custom Triggers

-- Function and Trigger to update total_rooms in hotels table
CREATE OR REPLACE FUNCTION update_total_rooms() RETURNS TRIGGER AS $$
DECLARE
  current_hotel_id INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    current_hotel_id := OLD.hotel_id;
  ELSE
    current_hotel_id := NEW.hotel_id;
  END IF;

  UPDATE hotels
  SET total_rooms = (
    SELECT COUNT(*)
    FROM rooms
    WHERE hotel_id = current_hotel_id AND for_sale = TRUE
  )
  WHERE id = current_hotel_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_total_rooms_trigger
AFTER INSERT OR UPDATE OR DELETE ON rooms
FOR EACH ROW
EXECUTE FUNCTION update_total_rooms();

-- Function and Trigger for WebSocket notifications on logs_reservation changes
CREATE OR REPLACE FUNCTION notify_logs_reservation_changes()
RETURNS TRIGGER AS $$
DECLARE
  record_id_text TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    record_id_text := OLD.id::text;
  ELSE
    record_id_text := NEW.id::text;
  END IF;
  PERFORM pg_notify('logs_reservation_changed', TG_OP || ':' || record_id_text);
  RETURN NEW; -- RETURN value is ignored for AFTER triggers anyway
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER logs_reservation_changes_notification_trigger
AFTER INSERT OR UPDATE OR DELETE ON logs_reservation
FOR EACH ROW EXECUTE PROCEDURE notify_logs_reservation_changes();
