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
