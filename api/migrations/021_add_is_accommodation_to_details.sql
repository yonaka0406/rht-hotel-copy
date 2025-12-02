-- Add is_accommodation column to reservation_details
-- Default to TRUE to assume existing records are accommodation (standard hotel behavior)
ALTER TABLE reservation_details 
ADD COLUMN is_accommodation BOOLEAN DEFAULT TRUE;

-- Optional: Update based on existing rates immediately (if desired, though application logic usually handles this on next save)
-- UPDATE reservation_details rd
-- SET is_accommodation = EXISTS (
--    SELECT 1 
--    FROM reservation_rates rr 
--    WHERE rr.reservation_details_id = rd.id 
--    AND rr.sales_category = 'accommodation'
-- );
