-- Migration for Parking Capacity Management
-- This migration adds support for capacity-based parking reservations

-- 1. Parking Blocks Table
-- DROP TABLE IF EXISTS parking_blocks CASCADE;
-- Used to block parking capacity for specific date ranges (e.g., winter closures, maintenance)
CREATE TABLE parking_blocks (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INTEGER NOT NULL,
    vehicle_category_id INTEGER NOT NULL REFERENCES vehicle_categories(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    blocked_capacity INTEGER NOT NULL CHECK (blocked_capacity > 0),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    CONSTRAINT valid_date_range CHECK (end_date > start_date),
    PRIMARY KEY (id, hotel_id)
) PARTITION BY LIST (hotel_id);

-- Indexes for parking_blocks
CREATE INDEX idx_parking_blocks_hotel_id ON parking_blocks(hotel_id);
CREATE INDEX idx_parking_blocks_dates ON parking_blocks(start_date, end_date);
CREATE INDEX idx_parking_blocks_vehicle_category ON parking_blocks(vehicle_category_id);
CREATE INDEX idx_parking_blocks_hotel_dates ON parking_blocks(hotel_id, start_date, end_date);

-- Trigger to update 'updated_at' timestamp for parking_blocks
CREATE TRIGGER update_parking_blocks_updated_at
BEFORE UPDATE ON parking_blocks
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Function to create virtual capacity pool spots for a hotel
-- This function creates or ensures virtual capacity pool spots exist for each vehicle category
CREATE OR REPLACE FUNCTION create_virtual_capacity_pool_spots(p_hotel_id INTEGER)
RETURNS TABLE(
    spot_id INTEGER,
    vehicle_category_id INTEGER,
    vehicle_category_name VARCHAR(255),
    spot_number VARCHAR(50),
    message TEXT
) AS $$
DECLARE
    v_parking_lot_id INTEGER;
    v_category RECORD;
    v_spot_id INTEGER;
    v_existing_spot_id INTEGER;
BEGIN
    -- Log function entry
    RAISE NOTICE '[create_virtual_capacity_pool_spots] Starting for hotel_id: %', p_hotel_id;
    
    -- Get or create a "Virtual Capacity Pool" parking lot for this hotel
    SELECT id INTO v_parking_lot_id
    FROM parking_lots
    WHERE hotel_id = p_hotel_id AND name = 'Virtual Capacity Pool'
    LIMIT 1;
    
    IF v_parking_lot_id IS NULL THEN
        INSERT INTO parking_lots (hotel_id, name, description)
        VALUES (p_hotel_id, 'Virtual Capacity Pool', 'Virtual parking lot for capacity-based reservations')
        RETURNING id INTO v_parking_lot_id;
        
        RAISE NOTICE '[create_virtual_capacity_pool_spots] Created virtual parking lot with id: %', v_parking_lot_id;
    ELSE
        RAISE NOTICE '[create_virtual_capacity_pool_spots] Using existing virtual parking lot with id: %', v_parking_lot_id;
    END IF;
    
    -- Create virtual capacity pool spots for each vehicle category
    FOR v_category IN SELECT id, name FROM vehicle_categories ORDER BY id LOOP
        -- Check if virtual spot already exists for this category
        SELECT ps.id INTO v_existing_spot_id
        FROM parking_spots ps
        WHERE ps.parking_lot_id = v_parking_lot_id
          AND ps.spot_type = 'capacity_pool'
          AND ps.spot_number = 'CAPACITY-POOL-' || v_category.id
        LIMIT 1;
        
        IF v_existing_spot_id IS NULL THEN
            -- Create new virtual spot
            INSERT INTO parking_spots (
                parking_lot_id,
                spot_number,
                spot_type,
                capacity_units,
                is_active
            ) VALUES (
                v_parking_lot_id,
                'CAPACITY-POOL-' || v_category.id,
                'capacity_pool',
                9999,  -- High capacity to accommodate multiple reservations
                true
            ) RETURNING id INTO v_spot_id;
            
            RAISE NOTICE '[create_virtual_capacity_pool_spots] Created virtual spot id: % for vehicle category: % (%)', 
                v_spot_id, v_category.id, v_category.name;
            
            RETURN QUERY SELECT 
                v_spot_id,
                v_category.id,
                v_category.name,
                ('CAPACITY-POOL-' || v_category.id)::VARCHAR(50),
                'Created new virtual capacity pool spot'::TEXT;
        ELSE
            RAISE NOTICE '[create_virtual_capacity_pool_spots] Virtual spot already exists with id: % for vehicle category: % (%)', 
                v_existing_spot_id, v_category.id, v_category.name;
            
            RETURN QUERY SELECT 
                v_existing_spot_id,
                v_category.id,
                v_category.name,
                ('CAPACITY-POOL-' || v_category.id)::VARCHAR(50),
                'Virtual capacity pool spot already exists'::TEXT;
        END IF;
    END LOOP;
    
    RAISE NOTICE '[create_virtual_capacity_pool_spots] Completed for hotel_id: %', p_hotel_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Function to get virtual capacity pool spot for a hotel and vehicle category
CREATE OR REPLACE FUNCTION get_virtual_capacity_pool_spot(
    p_hotel_id INTEGER,
    p_vehicle_category_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
    v_spot_id INTEGER;
    v_parking_lot_id INTEGER;
BEGIN
    -- Log function entry
    RAISE NOTICE '[get_virtual_capacity_pool_spot] Looking for spot: hotel_id=%, vehicle_category_id=%', 
        p_hotel_id, p_vehicle_category_id;
    
    -- Get the virtual parking lot for this hotel
    SELECT id INTO v_parking_lot_id
    FROM parking_lots
    WHERE hotel_id = p_hotel_id AND name = 'Virtual Capacity Pool'
    LIMIT 1;
    
    IF v_parking_lot_id IS NULL THEN
        RAISE NOTICE '[get_virtual_capacity_pool_spot] Virtual parking lot not found, creating...';
        -- Create virtual spots if they don't exist
        PERFORM create_virtual_capacity_pool_spots(p_hotel_id);
        
        -- Try again to get the parking lot
        SELECT id INTO v_parking_lot_id
        FROM parking_lots
        WHERE hotel_id = p_hotel_id AND name = 'Virtual Capacity Pool'
        LIMIT 1;
    END IF;
    
    -- Get the virtual spot for this vehicle category
    SELECT ps.id INTO v_spot_id
    FROM parking_spots ps
    WHERE ps.parking_lot_id = v_parking_lot_id
      AND ps.spot_type = 'capacity_pool'
      AND ps.spot_number = 'CAPACITY-POOL-' || p_vehicle_category_id
      AND ps.is_active = true
    LIMIT 1;
    
    IF v_spot_id IS NULL THEN
        RAISE EXCEPTION '[get_virtual_capacity_pool_spot] Virtual capacity pool spot not found for hotel_id=%, vehicle_category_id=%', 
            p_hotel_id, p_vehicle_category_id;
    END IF;
    
    RAISE NOTICE '[get_virtual_capacity_pool_spot] Found virtual spot id: %', v_spot_id;
    
    RETURN v_spot_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Initialize virtual capacity pool spots for all existing hotels
DO $$
DECLARE
    v_hotel RECORD;
    v_result RECORD;
BEGIN
    RAISE NOTICE '[Migration] Starting initialization of virtual capacity pool spots for all hotels';
    
    FOR v_hotel IN SELECT id, name FROM hotels ORDER BY id LOOP
        RAISE NOTICE '[Migration] Processing hotel_id: % (%)', v_hotel.id, v_hotel.name;
        
        FOR v_result IN SELECT * FROM create_virtual_capacity_pool_spots(v_hotel.id) LOOP
            RAISE NOTICE '[Migration] Hotel %: % - Vehicle Category: % (%) - Spot: %', 
                v_hotel.id, v_result.message, v_result.vehicle_category_id, 
                v_result.vehicle_category_name, v_result.spot_number;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '[Migration] Completed initialization of virtual capacity pool spots';
END $$;

-- 4. Trigger function to automatically create virtual capacity pool spots when a new vehicle category is added
CREATE OR REPLACE FUNCTION create_virtual_spots_for_new_vehicle_category()
RETURNS TRIGGER AS $$
DECLARE
    v_hotel RECORD;
    v_parking_lot_id INTEGER;
    v_spot_id INTEGER;
BEGIN
    RAISE NOTICE '[create_virtual_spots_for_new_vehicle_category] New vehicle category created: % (ID: %)', NEW.name, NEW.id;
    
    -- Create virtual capacity pool spot for this new vehicle category in all hotels
    FOR v_hotel IN SELECT id, name FROM hotels ORDER BY id LOOP
        RAISE NOTICE '[create_virtual_spots_for_new_vehicle_category] Processing hotel_id: % (%)', v_hotel.id, v_hotel.name;
        
        -- Get or create virtual parking lot for this hotel
        SELECT id INTO v_parking_lot_id
        FROM parking_lots
        WHERE hotel_id = v_hotel.id AND name = 'Virtual Capacity Pool'
        LIMIT 1;
        
        IF v_parking_lot_id IS NULL THEN
            INSERT INTO parking_lots (hotel_id, name, description)
            VALUES (v_hotel.id, 'Virtual Capacity Pool', 'Virtual parking lot for capacity-based reservations')
            RETURNING id INTO v_parking_lot_id;
            
            RAISE NOTICE '[create_virtual_spots_for_new_vehicle_category] Created virtual parking lot with id: % for hotel: %', 
                v_parking_lot_id, v_hotel.id;
        END IF;
        
        -- Create virtual spot for the new vehicle category
        INSERT INTO parking_spots (
            parking_lot_id,
            spot_number,
            spot_type,
            capacity_units,
            is_active
        ) VALUES (
            v_parking_lot_id,
            'CAPACITY-POOL-' || NEW.id,
            'capacity_pool',
            9999,
            true
        ) RETURNING id INTO v_spot_id;
        
        RAISE NOTICE '[create_virtual_spots_for_new_vehicle_category] Created virtual spot id: % for vehicle category: % (%) in hotel: %', 
            v_spot_id, NEW.id, NEW.name, v_hotel.id;
    END LOOP;
    
    RAISE NOTICE '[create_virtual_spots_for_new_vehicle_category] Completed creating virtual spots for vehicle category: %', NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on vehicle_categories table
DROP TRIGGER IF EXISTS trigger_create_virtual_spots_for_new_vehicle_category ON vehicle_categories;
CREATE TRIGGER trigger_create_virtual_spots_for_new_vehicle_category
AFTER INSERT ON vehicle_categories
FOR EACH ROW
EXECUTE FUNCTION create_virtual_spots_for_new_vehicle_category();

-- 5. Trigger function to automatically create virtual capacity pool spots when a new hotel is added
CREATE OR REPLACE FUNCTION create_virtual_spots_for_new_hotel()
RETURNS TRIGGER AS $$
DECLARE
    v_result RECORD;
BEGIN
    RAISE NOTICE '[create_virtual_spots_for_new_hotel] New hotel created: % (ID: %)', NEW.name, NEW.id;
    
    -- Create virtual capacity pool spots for all vehicle categories in this new hotel
    FOR v_result IN SELECT * FROM create_virtual_capacity_pool_spots(NEW.id) LOOP
        RAISE NOTICE '[create_virtual_spots_for_new_hotel] % - Vehicle Category: % (%) - Spot: %', 
            v_result.message, v_result.vehicle_category_id, v_result.vehicle_category_name, v_result.spot_number;
    END LOOP;
    
    RAISE NOTICE '[create_virtual_spots_for_new_hotel] Completed creating virtual spots for hotel: %', NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on hotels table
DROP TRIGGER IF EXISTS trigger_create_virtual_spots_for_new_hotel ON hotels;
CREATE TRIGGER trigger_create_virtual_spots_for_new_hotel
AFTER INSERT ON hotels
FOR EACH ROW
EXECUTE FUNCTION create_virtual_spots_for_new_hotel();

-- Grant permissions
GRANT USAGE, SELECT ON SEQUENCE parking_spots_id_seq TO rhtsys_user;
GRANT USAGE, SELECT ON SEQUENCE parking_lots_id_seq TO rhtsys_user;

-- Add comment to document the purpose
COMMENT ON TABLE parking_blocks IS 'Stores capacity blocking records for parking spots during specific date ranges (e.g., winter closures, maintenance periods)';
COMMENT ON COLUMN parking_blocks.comment IS 'Free-text comment explaining why capacity is blocked (e.g., maintenance, seasonal closure, event)';
COMMENT ON FUNCTION create_virtual_capacity_pool_spots(INTEGER) IS 'Creates or ensures virtual capacity pool spots exist for each vehicle category in a hotel';
COMMENT ON FUNCTION get_virtual_capacity_pool_spot(INTEGER, INTEGER) IS 'Returns the virtual capacity pool spot ID for a given hotel and vehicle category';
COMMENT ON COLUMN parking_spots.spot_type IS 'Type of parking spot: standard (physical spot) or capacity_pool (virtual spot for capacity-based reservations)';


-- Additional changes for parking blocks

-- Add reservation_parking_ids column to store references to created reservation_parking records
ALTER TABLE parking_blocks 
ADD COLUMN IF NOT EXISTS reservation_parking_ids UUID[] DEFAULT '{}';

-- Add index for querying by reservation_parking_ids
CREATE INDEX IF NOT EXISTS idx_parking_blocks_reservation_parking_ids 
ON parking_blocks USING GIN (reservation_parking_ids);

-- Update the date range constraint to allow same-day blocks
ALTER TABLE parking_blocks DROP CONSTRAINT IF EXISTS valid_date_range;
ALTER TABLE parking_blocks ADD CONSTRAINT valid_date_range CHECK (end_date >= start_date);

-- Create partitions for existing hotels
DO $$
DECLARE
    v_hotel RECORD;
    v_partition_name TEXT;
BEGIN
    FOR v_hotel IN SELECT id FROM hotels ORDER BY id LOOP
        v_partition_name := 'parking_blocks_hotel_' || v_hotel.id;
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF parking_blocks FOR VALUES IN (%s)', v_partition_name, v_hotel.id);
        RAISE NOTICE 'Created partition % for hotel_id %', v_partition_name, v_hotel.id;
    END LOOP;
END $$;

-- Add comments
COMMENT ON COLUMN parking_blocks.reservation_parking_ids IS 'Array of reservation_parking IDs created for this block to mark spots as unavailable';
