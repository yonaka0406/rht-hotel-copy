-- UP: Create plan_type_categories and plan_package_categories tables

CREATE TABLE plan_type_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,           -- e.g., 素泊まり, 1食, 2食, 3食
    description TEXT,
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

-- Seed from existing plans_global names if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plans_global') THEN
        INSERT INTO plan_type_categories (name, description, color, created_by)
        SELECT name, description, COALESCE(color, '#D3D3D3'), 1
        FROM plans_global
        ON CONFLICT (name) DO NOTHING;
    END IF;
END $$;

CREATE TABLE plan_package_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,           -- e.g., スタンダード, マンスリー, ツイン専用
    description TEXT,
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

-- Seed initial packages
INSERT INTO plan_package_categories (name, description, created_by)
VALUES 
    ('スタンダード', '標準パッケージ', 1),
    ('マンスリー', '月額パッケージ', 1)
ON CONFLICT (name) DO NOTHING;

-- Modify plans_hotel table
ALTER TABLE plans_hotel 
ADD COLUMN plan_type_category_id INT REFERENCES plan_type_categories(id) ON DELETE SET NULL;

ALTER TABLE plans_hotel 
ADD COLUMN plan_package_category_id INT REFERENCES plan_package_categories(id) ON DELETE SET NULL;

ALTER TABLE plans_hotel 
ADD COLUMN display_order INTEGER DEFAULT 0;

ALTER TABLE plans_hotel 
ADD COLUMN is_active BOOLEAN DEFAULT true;

ALTER TABLE plans_hotel 
ADD COLUMN available_from DATE DEFAULT NULL;  -- NULL = always available

ALTER TABLE plans_hotel 
ADD COLUMN available_until DATE DEFAULT NULL; -- NULL = no end date

-- Create indexes
CREATE INDEX idx_plans_hotel_type_category ON plans_hotel(hotel_id, plan_type_category_id);
CREATE INDEX idx_plans_hotel_package_category ON plans_hotel(hotel_id, plan_package_category_id);
CREATE INDEX idx_plans_hotel_display_order ON plans_hotel(hotel_id, display_order);
CREATE INDEX idx_plans_hotel_availability ON plans_hotel(hotel_id, is_active, available_from, available_until);

-- Initialize display_order
WITH ranked AS (
    SELECT hotel_id, id, ROW_NUMBER() OVER (PARTITION BY hotel_id ORDER BY id) as rn
    FROM plans_hotel
)
UPDATE plans_hotel ph
SET display_order = r.rn
FROM ranked r
WHERE ph.hotel_id = r.hotel_id AND ph.id = r.id;

-- Link plans_hotel to type categories via plans_global
UPDATE plans_hotel ph
SET plan_type_category_id = (
    SELECT ptc.id 
    FROM plan_type_categories ptc
    JOIN plans_global pg ON pg.name = ptc.name
    WHERE pg.id = ph.plans_global_id
)
WHERE ph.plans_global_id IS NOT NULL;


-- DOWN: Drop tables and columns
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS plan_type_category_id;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS plan_package_category_id;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS display_order;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS available_from;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS available_until;
-- DROP TABLE IF EXISTS plan_package_categories;
-- DROP TABLE IF EXISTS plan_type_categories;