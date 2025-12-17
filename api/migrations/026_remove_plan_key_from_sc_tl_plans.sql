-- Migration: Remove deprecated plan_key and plans_global_id columns from sc_tl_plans table
-- This migration removes the plan_key and plans_global_id columns which are no longer used.
-- The system now uses plans_hotel_id for plan identification.

-- Check for any rows where plans_hotel_id is still NULL before dropping deprecated columns.
-- This helps identify if any data migration or update is needed before proceeding.
SELECT *
FROM sc_tl_plans
WHERE plans_hotel_id IS NULL;

-- If the above SELECT returns any rows, it indicates plans that were previously mapped
-- using plan_key or plans_global_id might not have been correctly migrated to plans_hotel_id.
-- Manual intervention or data migration might be required before dropping these columns
-- to avoid data loss or inconsistent state.

-- Check what plans exist for hotels 25 and 10
SELECT hotel_id, id, name, plans_global_id 
FROM plans_hotel 
WHERE hotel_id IN (25, 10)
ORDER BY hotel_id, name;

-- Create missing plan for hotel 25: "3食付き_2名"
INSERT INTO plans_hotel (
    hotel_id,
    plans_global_id,
    plan_type_category_id,
    plan_package_category_id,
    name,
    description,
    plan_type,
    color,
    display_order,
    is_active,
    available_from,
    available_until,
    created_at,
    created_by,
    updated_by
) VALUES (
    25,
    4, -- 3食 global plan
    4, -- 3食 type category
    1, -- スタンダード package category
    '3食付き_2名',
    '3食付きプラン（2名利用）',
    'per_room',
    '#D3D3D3',
    (SELECT COALESCE(MAX(display_order) + 1, 1) FROM plans_hotel WHERE hotel_id = 25),
    true,
    NULL::DATE,
    NULL::DATE,
    CURRENT_TIMESTAMP,
    1,
    1
);

-- Create missing plan for hotel 10: "3食付き（2名利用）"
INSERT INTO plans_hotel (
    hotel_id,
    plans_global_id,
    plan_type_category_id,
    plan_package_category_id,
    name,
    description,
    plan_type,
    color,
    display_order,
    is_active,
    available_from,
    available_until,
    created_at,
    created_by,
    updated_by
) VALUES (
    10,
    4, -- 3食 global plan
    4, -- 3食 type category
    1, -- スタンダード package category
    '3食付き（2名利用）',
    '3食付きプラン（2名利用）',
    'per_room',
    '#D3D3D3',
    (SELECT COALESCE(MAX(display_order) + 1, 1) FROM plans_hotel WHERE hotel_id = 10),
    true,
    NULL::DATE,
    NULL::DATE,
    CURRENT_TIMESTAMP,
    1,
    1
);

-- Update sc_tl_plans to use the newly created plans
UPDATE sc_tl_plans 
SET plans_hotel_id = (
    SELECT id FROM plans_hotel 
    WHERE hotel_id = 25 AND id = 188
)
WHERE hotel_id = 25 AND plans_hotel_id IS NULL AND plangroupcode = 9 AND plan_key IS NULL;

UPDATE sc_tl_plans 
SET plans_hotel_id = (
    SELECT id FROM plans_hotel 
    WHERE hotel_id = 10 AND id = 189
)
WHERE hotel_id = 10 AND plans_hotel_id IS NULL AND plangroupname = '3食付き（2名利用）';


-- Note: Column drops moved to migration 028 for final cleanup