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

CREATE OR REPLACE FUNCTION get_available_plans_with_rates(
    p_hotel_id INT,
    p_target_date DATE DEFAULT CURRENT_DATE,
    p_date_end DATE DEFAULT NULL  -- Optional: for date range queries
)
RETURNS TABLE (
    plan_id INT,
    plan_name TEXT,
    type_category TEXT,
    package_category TEXT,
    display_order INT,
    rate_date DATE,
    adjustment_type TEXT,
    adjustment_value DECIMAL,
    tax_rate DECIMAL,
    sales_category TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ph.id AS plan_id,
        ph.name AS plan_name,
        ptc.name AS type_category,
        ppc.name AS package_category,
        ph.display_order,
        d.date AS rate_date,
        pr.adjustment_type,
        pr.adjustment_value,
        pr.tax_rate,
        pr.sales_category
    FROM plans_hotel ph
    LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
    CROSS JOIN generate_series(
        p_target_date, 
        COALESCE(p_date_end, p_target_date), 
        '1 day'::interval
    ) AS d(date)
    LEFT JOIN LATERAL (
        SELECT pr2.*
        FROM plans_rates pr2
        WHERE pr2.plans_hotel_id = ph.id
          AND pr2.hotel_id = ph.hotel_id
          AND pr2.date_start <= d.date
          AND (pr2.date_end IS NULL OR pr2.date_end >= d.date)
          AND pr2.adjustment_type = 'base_rate'
        ORDER BY pr2.condition_type DESC, pr2.date_start DESC
        LIMIT 1
    ) pr ON true
    WHERE ph.hotel_id = p_hotel_id
      AND ph.is_active = true
      AND (ph.available_from IS NULL OR ph.available_from <= d.date)
      AND (ph.available_until IS NULL OR ph.available_until >= d.date)
    ORDER BY ph.display_order, d.date;
END;
$$ LANGUAGE plpgsql STABLE;
-- Usage examples:
-- Single date: SELECT * FROM get_available_plans_with_rates(1, '2025-01-15');
-- Date range:  SELECT * FROM get_available_plans_with_rates(1, '2025-01-15', '2025-01-20');