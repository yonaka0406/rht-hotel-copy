-- Waitlist entries table
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, -- Changed INTEGER to UUID
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER,
    requested_check_in_date DATE NOT NULL,
    requested_check_out_date DATE NOT NULL,
    number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
    number_of_rooms INTEGER NOT NULL DEFAULT 1 CHECK (number_of_rooms > 0),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'notified', 'confirmed', 'expired', 'cancelled')),
    notes TEXT,
    confirmation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    contact_email TEXT,
    contact_phone TEXT,
    communication_preference TEXT NOT NULL DEFAULT 'email' CHECK (communication_preference IN ('email', 'phone')),
    preferred_smoking_status TEXT NOT NULL DEFAULT 'any' CHECK (preferred_smoking_status IN ('any', 'smoking', 'non_smoking')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),

    -- Business logic constraints
    CONSTRAINT chk_dates CHECK (requested_check_out_date > requested_check_in_date),
    CONSTRAINT chk_token_expiry CHECK (
        (status = 'notified' AND confirmation_token IS NOT NULL AND token_expires_at IS NOT NULL)
        OR (status != 'notified')
    )
    -- Constraint for room_types (partitioned table) will be handled by application logic or a trigger if necessary,
    -- as direct FK on room_type_id alone is not possible if room_types.id is not globally unique.
    -- If room_types primary key is (id, hotel_id), then we add:
    -- FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id)
);

-- Adding the composite foreign key after confirming room_types PK structure
-- Assuming room_types PK is (id, hotel_id) as per WAITLIST_STRATEGY.md
ALTER TABLE waitlist_entries
ADD CONSTRAINT fk_waitlist_room_types FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id);

-- Indexes for performance
CREATE INDEX idx_waitlist_hotel_status ON waitlist_entries(hotel_id, status);
CREATE INDEX idx_waitlist_dates ON waitlist_entries(requested_check_in_date, requested_check_out_date);
CREATE INDEX idx_waitlist_room_type ON waitlist_entries(room_type_id, hotel_id);
CREATE INDEX idx_waitlist_token ON waitlist_entries(confirmation_token) WHERE confirmation_token IS NOT NULL;
CREATE INDEX idx_waitlist_expiry ON waitlist_entries(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX idx_waitlist_client_id ON waitlist_entries(client_id);
CREATE INDEX idx_waitlist_created_at ON waitlist_entries(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_waitlist_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_waitlist_entries_updated_at
    BEFORE UPDATE ON waitlist_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_waitlist_entries_updated_at();

-- Grant permissions (adjust user name if necessary)

-- Add a default value for communication_preference if it wasn't included initially
-- This is added based on the WaitlistEntryDialog.vue which includes this field.
-- If the table is already created without it:
-- ALTER TABLE waitlist_entries ADD COLUMN communication_preference TEXT NOT NULL DEFAULT 'email' CHECK (communication_preference IN ('email', 'phone'));
-- Ensure this is idempotent or handled correctly if the column might already exist.
-- The CREATE TABLE statement above has been updated to include communication_preference.

COMMENT ON COLUMN waitlist_entries.room_type_id IS 'References room_types.id, part of composite FK (room_type_id, hotel_id)';
COMMENT ON CONSTRAINT fk_waitlist_room_types ON waitlist_entries IS 'Composite foreign key to the partitioned room_types table.';
COMMENT ON COLUMN waitlist_entries.communication_preference IS 'Client''s preferred method of contact: email or phone.';

-- Fix the waitlist vacancy function to properly calculate capacity
-- Drop the existing function first
DROP FUNCTION IF EXISTS is_waitlist_vacancy_available(INT, INT, DATE, DATE, INT, INT, BOOLEAN);

-- Recreate the function with corrected logic
CREATE OR REPLACE FUNCTION is_waitlist_vacancy_available(
    p_hotel_id INT,
    p_room_type_id INT,
    p_check_in DATE,
    p_check_out DATE,
    p_number_of_rooms INT,
    p_number_of_guests INT,
    p_smoking_preference BOOLEAN
) RETURNS BOOLEAN AS $$
DECLARE
    available_room_count INT;
    total_capacity INT;
    current_date DATE := CURRENT_DATE;
BEGIN
    -- Check if dates are in the past
    IF p_check_in < current_date THEN
        RETURN FALSE;
    END IF;
    
    -- Count available rooms for the specified criteria
    SELECT COUNT(*)
    INTO available_room_count
    FROM rooms r
    WHERE r.hotel_id = p_hotel_id
      AND r.for_sale = true
      AND (p_room_type_id IS NULL OR r.room_type_id = p_room_type_id)
      AND (p_smoking_preference IS NULL OR r.smoking = p_smoking_preference)
      AND r.id NOT IN (
          -- Exclude rooms that have reservations during the requested period
          SELECT DISTINCT rd.room_id
          FROM reservation_details rd
          WHERE rd.date >= p_check_in 
            AND rd.date < p_check_out
            AND rd.cancelled IS NULL
      );
    
    -- Check if we have enough rooms
    IF available_room_count >= p_number_of_rooms THEN
        -- Also check if total capacity is sufficient
        -- Get the sum of capacity for the first N rooms (ordered by capacity descending to get the best rooms first)
        SELECT COALESCE(SUM(selected_rooms.capacity), 0)
        INTO total_capacity
        FROM (
            SELECT r.capacity
            FROM rooms r
            WHERE r.hotel_id = p_hotel_id
              AND r.for_sale = true
              AND (p_room_type_id IS NULL OR r.room_type_id = p_room_type_id)
              AND (p_smoking_preference IS NULL OR r.smoking = p_smoking_preference)
              AND r.id NOT IN (
                  SELECT DISTINCT rd.room_id
                  FROM reservation_details rd
                  WHERE rd.date >= p_check_in 
                    AND rd.date < p_check_out
                    AND rd.cancelled IS NULL
              )
            ORDER BY r.capacity DESC
            LIMIT p_number_of_rooms
        ) AS selected_rooms;
        
        RETURN total_capacity >= p_number_of_guests;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
