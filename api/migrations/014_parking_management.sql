-- Migration for Parking Spot Management Module

-- 1. Vehicle Categories Table
CREATE TABLE vehicle_categories (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    capacity_units_required INTEGER NOT NULL DEFAULT 1,
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
    capacity_units INTEGER NOT NULL DEFAULT 1,
    blocks_parking_spot_id INTEGER REFERENCES parking_spots(id) ON DELETE SET NULL,
    layout_info JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Reservation Parking Table
CREATE TABLE reservation_parking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    vehicle_category_id INTEGER REFERENCES vehicle_categories(id) ON DELETE SET NULL,
    parking_spot_id INTEGER REFERENCES parking_spots(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status VARCHAR(50) NOT NULL,
    comment TEXT,
    price NUMERIC(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX idx_vehicle_categories_hotel_id ON vehicle_categories(hotel_id);
CREATE INDEX idx_parking_lots_hotel_id ON parking_lots(hotel_id);
CREATE INDEX idx_parking_spots_parking_lot_id ON parking_spots(parking_lot_id);
CREATE INDEX idx_reservation_parking_hotel_id ON reservation_parking(hotel_id);
CREATE INDEX idx_reservation_parking_reservation_id ON reservation_parking(reservation_id);
CREATE INDEX idx_reservation_parking_parking_spot_id ON reservation_parking(parking_spot_id);
CREATE INDEX idx_reservation_parking_date ON reservation_parking(date);

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
