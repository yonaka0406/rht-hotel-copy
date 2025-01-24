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