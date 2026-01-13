-- Create accounting departments table
-- Maps hotels to their accounting department codes (部門) for Yayoi exports

CREATE TABLE acc_departments (
    id SERIAL PRIMARY KEY,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(24) NOT NULL, -- Yayoi department name (部門) e.g., "WH室蘭"
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    UNIQUE (hotel_id),
    UNIQUE (name)
);

COMMENT ON TABLE acc_departments IS 'Maps hotels to accounting department codes for Yayoi exports';
COMMENT ON COLUMN acc_departments.name IS 'Accounting department name (部門) used in Yayoi CSV exports';

-- Create index for lookups
CREATE INDEX idx_acc_departments_hotel ON acc_departments(hotel_id);

-- Seed department codes for existing hotels
-- Update these values according to your actual hotel-to-department mapping
INSERT INTO acc_departments (hotel_id, name, created_by) VALUES
(24, 'WH室蘭', 1)
ON CONFLICT (hotel_id) DO NOTHING;
-- Add more INSERT statements as needed for other hotels
