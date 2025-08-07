-- Migration for Parking Spot Management Module

-- 1. Vehicle Categories Table
CREATE TABLE vehicle_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    capacity_units_required INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Parking Lots Table
CREATE TABLE parking_lots (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Parking Spots Table
CREATE TABLE parking_spots (
    id SERIAL PRIMARY KEY,
    parking_lot_id INTEGER REFERENCES parking_lots(id) ON DELETE CASCADE,
    spot_number VARCHAR(50) NOT NULL,
    spot_type VARCHAR(50) DEFAULT 'standard',
    capacity_units INTEGER NOT NULL DEFAULT 100,
    blocks_parking_spot_id INTEGER REFERENCES parking_spots(id) ON DELETE SET NULL,
    layout_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Reservation Parking Table
CREATE TABLE reservation_parking (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INTEGER NOT NULL,
    reservation_id UUID NOT NULL,
    reservation_addon_id UUID,
    vehicle_category_id INTEGER REFERENCES vehicle_categories(id) ON DELETE SET NULL,
    parking_spot_id INTEGER REFERENCES parking_spots(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    comment TEXT,
    cancelled UUID DEFAULT NULL,
    price NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_id, reservation_addon_id) REFERENCES reservation_addons(hotel_id, id) ON DELETE CASCADE,
    UNIQUE (hotel_id, parking_spot_id, date, cancelled)
) PARTITION BY LIST (hotel_id);

-- Indexes for performance
CREATE INDEX idx_parking_lots_hotel_id ON parking_lots(hotel_id);
CREATE INDEX idx_parking_spots_parking_lot_id ON parking_spots(parking_lot_id);
CREATE INDEX idx_reservation_parking_hotel_id ON reservation_parking(hotel_id);
CREATE INDEX idx_reservation_parking_reservation_id ON reservation_parking(reservation_id);
CREATE INDEX idx_reservation_parking_parking_spot_id ON reservation_parking(parking_spot_id);
CREATE INDEX idx_reservation_parking_date ON reservation_parking(date);
CREATE INDEX idx_reservation_parking_addon_id ON reservation_parking(reservation_addon_id);

-- Trigger to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicle_categories_updated_at
BEFORE UPDATE ON vehicle_categories
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_parking_lots_updated_at
BEFORE UPDATE ON parking_lots
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_parking_spots_updated_at
BEFORE UPDATE ON parking_spots
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_reservation_parking_updated_at
BEFORE UPDATE ON reservation_parking
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Default Vehicle Categories
INSERT INTO vehicle_categories (name, capacity_units_required) VALUES
('普通乗用車', 100),
('軽自動車', 60),
('オートバイ', 30),
('バン・ピックアップ', 110),
('2t　トラック', 168);

CREATE TRIGGER reservation_parking_changes
AFTER INSERT OR UPDATE OR DELETE ON reservation_parking
FOR EACH ROW EXECUTE PROCEDURE log_parking_changes();

-- Grant permissions on all sequences to application user
GRANT USAGE, SELECT, UPDATE ON SEQUENCE vehicle_categories_id_seq TO rhtsys_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE parking_lots_id_seq TO rhtsys_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE parking_spots_id_seq TO rhtsys_user;


-- Migration to add reservation_addon_id column to reservation_parking table
-- This establishes the relationship between parking addons and parking spot assignments

-- Add reservation_addon_id column to reservation_parking table
-- Note: reservation_addons has a composite primary key (hotel_id, id)
-- Since reservation_parking already has hotel_id, we can create a proper foreign key
ALTER TABLE reservation_parking 
ADD COLUMN reservation_addon_id UUID;

-- Add foreign key constraint that references the composite primary key
ALTER TABLE reservation_parking 
ADD CONSTRAINT fk_reservation_parking_addon 
FOREIGN KEY (hotel_id, reservation_addon_id) 
REFERENCES reservation_addons(hotel_id, id) ON DELETE CASCADE;

-- Create index for performance on the new foreign key
CREATE INDEX idx_reservation_parking_addon_id ON reservation_parking(reservation_addon_id);

-- Update the logging trigger to include the new column
-- The existing trigger should automatically handle the new column since it logs all changes
