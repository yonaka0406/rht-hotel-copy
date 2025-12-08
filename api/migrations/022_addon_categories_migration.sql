-- UP: Addon Categories Migration

-- 1. Create addon_categories table (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS addon_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    addon_type TEXT NOT NULL UNIQUE,     -- For mapping old addon_type values
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

-- 2. Seed addon_categories table
INSERT INTO addon_categories (name, addon_type, color, display_order, created_by)
VALUES
    ('朝食', 'breakfast', '#FFD700', 1, 1),
    ('昼食', 'lunch', '#FFA500', 2, 1),
    ('夕食', 'dinner', '#FF6347', 3, 1),
    ('駐車場', 'parking', '#808080', 4, 1),
    ('その他', 'other', '#D3D3D3', 5, 1)
ON CONFLICT (addon_type) DO NOTHING;

ALTER TABLE addons_hotel ADD COLUMN addon_category_id INT;
ALTER TABLE addons_hotel ADD COLUMN display_order INTEGER DEFAULT 0;
ALTER TABLE addons_hotel ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 3. Populate addons_hotel with copies from addons_global for each hotel
-- This ensures each hotel has its own set of base addons, using addon_category_id
INSERT INTO addons_hotel (
    hotel_id,
    addons_global_id,
    name,
    addon_category_id,
    description,
    price,
    tax_type_id,
    tax_rate,
    visible,
    created_at,
    created_by,
    updated_by
)
SELECT
    h.id AS hotel_id,
    ag.id AS addons_global_id,
    ag.name,
    ac.id AS addon_category_id,
    ag.description,
    ag.price,
    ag.tax_type_id,
    ag.tax_rate,
    ag.visible,
    ag.created_at,
    ag.created_by,
    ag.updated_by
FROM
    hotels h
JOIN
    addons_global ag ON TRUE -- Cartesian product to get all combinations
JOIN addon_categories ac ON ag.addon_type = ac.addon_type
ON CONFLICT (hotel_id, name) DO NOTHING; -- Handle potential conflicts if addons_hotel already has entries with same name for a hotel

-- Add a foreign key constraint
ALTER TABLE addons_hotel
ADD CONSTRAINT fk_addon_category
FOREIGN KEY (addon_category_id) REFERENCES addon_categories(id)
ON DELETE SET NULL;

-- Make the column NOT NULL after all existing rows are updated, if desired.
-- This requires careful consideration and might not be suitable if NULL is a valid state.
-- ALTER TABLE addons_hotel ALTER COLUMN addon_category_id SET NOT NULL;


-- 4. Drop addons_global_id column from addons_hotel as it's being deprecated
ALTER TABLE addons_hotel DROP CONSTRAINT IF EXISTS addons_hotel_addons_global_id_fkey;
ALTER TABLE addons_hotel DROP COLUMN IF EXISTS addons_global_id;


-- Note: addon_category_id, display_order, is_active columns and indexes are assumed to already exist on addons_hotel
-- based on prior database state.
-- No need to drop addon_type column or its constraint as it is assumed to be already dropped.

-- DOWN: Revert Addon Categories Migration

-- 1. Drop fk_addon_category constraint from addons_hotel
ALTER TABLE addons_hotel DROP CONSTRAINT IF EXISTS fk_addon_category;

-- 2. Drop addon_category_id, display_order, is_active columns from addons_hotel
ALTER TABLE addons_hotel DROP COLUMN IF EXISTS addon_category_id;
ALTER TABLE addons_hotel DROP COLUMN IF EXISTS display_order;
ALTER TABLE addons_hotel DROP COLUMN IF EXISTS is_active;

-- 3. Re-add the addons_global_id column to addons_hotel
-- This is necessary if the system relies on it when this migration is reverted.
ALTER TABLE addons_hotel ADD COLUMN IF NOT EXISTS addons_global_id INT;


-- 4. Delete data from addons_hotel that was populated by this migration
-- This assumes that entries with NULL addons_global_id were added by this migration,
-- which might not be entirely accurate if other parts of the system also create such entries.
-- A more precise revert would depend on how the initial INSERT was done.
-- For now, this line will be kept but with a comment to re-evaluate if necessary.
DELETE FROM addons_hotel WHERE addons_global_id IS NULL; -- Re-evaluate this condition if it removes too much data

-- 5. Drop addon_categories table
DROP TABLE IF EXISTS addon_categories;