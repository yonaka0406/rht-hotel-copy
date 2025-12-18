-- UP: Migrate existing plan data and add NOT NULL constraint to package category

-- 1. Set default package category for all records (User specified ID 1, usually 'スタンダード')
UPDATE plans_hotel
SET plan_package_category_id = 1
WHERE plan_package_category_id IS NULL;

-- 2. Update specific plans to 'マンスリー' based on name
UPDATE plans_hotel
SET plan_package_category_id = (SELECT id FROM plan_package_categories WHERE name = 'マンスリー')
WHERE name ILIKE '%マンスリー%';

-- 3. Enforce NOT NULL constraint on plan_package_category_id
ALTER TABLE plans_hotel
ALTER COLUMN plan_package_category_id SET NOT NULL;

-- Assign 素泊まり (id=1)
UPDATE plans_hotel
SET plan_type_category_id = 1
WHERE plan_type_category_id IS NULL AND name ILIKE '%素泊まり%';
-- Assign 1食 (id=2)
UPDATE plans_hotel
SET plan_type_category_id = 2
WHERE plan_type_category_id IS NULL AND name ILIKE '%朝食%';
-- Assign 2食 (id=3)
UPDATE plans_hotel
SET plan_type_category_id = 3
WHERE plan_type_category_id IS NULL AND name ILIKE '%2食%';
-- Assign 3食 (id=4)
UPDATE plans_hotel
SET plan_type_category_id = 4
WHERE plan_type_category_id IS NULL AND name ILIKE '%3食%';
-- Assign 荷物キープ (id=5)
UPDATE plans_hotel
SET plan_type_category_id = 5
WHERE plan_type_category_id IS NULL AND name ILIKE '%荷物%';

-- 4. Enforce NOT NULL constraint on plan_type_category_id
ALTER TABLE plans_hotel
ALTER COLUMN plan_type_category_id SET NOT NULL;


-- 5. Update get_available_plans_for_hotel function
DROP FUNCTION IF EXISTS get_available_plans_for_hotel(INT); 
CREATE OR REPLACE FUNCTION get_available_plans_for_hotel(p_hotel_id INT)
RETURNS TABLE(
    plans_global_id INT,
    plans_hotel_id INT,
    plan_key TEXT,
    name TEXT,
    description TEXT,
    plan_type TEXT,
    color VARCHAR(7),
    plan_type_category_id INT,
    plan_package_category_id INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ph.plans_global_id,
        ph.id AS plans_hotel_id,
        COALESCE(ph.plans_global_id::TEXT, '') || 'h' || ph.id::TEXT AS plan_key,
        ph.name,
        ph.description,
        ph.plan_type,
        ph.color,
        ph.plan_type_category_id,
        ph.plan_package_category_id
    FROM
        plans_hotel AS ph
    WHERE
        ph.hotel_id = p_hotel_id

    UNION ALL

    SELECT
        pg.id AS plans_global_id,
        NULL::INT AS plans_hotel_id,
        pg.id::TEXT || 'h' AS plan_key,
        pg.name,
        pg.description,
        pg.plan_type,
        pg.color,
        NULL::INT AS plan_type_category_id,
        NULL::INT AS plan_package_category_id 
    FROM
        plans_global AS pg
    WHERE
        NOT EXISTS (
            SELECT 1
            FROM hotel_plan_exclusions hpe
            WHERE hpe.global_plan_id = pg.id AND hpe.hotel_id = p_hotel_id
        )
        AND NOT EXISTS (
            SELECT 1
            FROM plans_hotel ph
            WHERE ph.plans_global_id = pg.id AND ph.hotel_id = p_hotel_id
        );
END;
$$ LANGUAGE plpgsql;