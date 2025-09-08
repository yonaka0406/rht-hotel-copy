-- Add has_important_comment column to reservations table
ALTER TABLE reservations 
ADD COLUMN has_important_comment BOOLEAN NOT NULL DEFAULT false;

-- Create an index for better performance when querying important comments
CREATE INDEX idx_reservations_important_comment ON reservations(hotel_id, has_important_comment) 
WHERE has_important_comment = true;

-- Update the comment to include information about the new column
COMMENT ON COLUMN reservations.has_important_comment IS 'Flag indicating if this reservation has an important comment that requires attention';
