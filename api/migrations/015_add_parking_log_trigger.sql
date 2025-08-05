CREATE TRIGGER reservation_parking_changes
AFTER INSERT OR UPDATE OR DELETE ON reservation_parking
FOR EACH ROW EXECUTE PROCEDURE log_parking_changes();
