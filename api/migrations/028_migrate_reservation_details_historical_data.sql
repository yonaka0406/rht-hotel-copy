-- Migration: Migrate reservation_details historical data to use plans_hotel_id
-- This migration handles the 124,888+ reservation records that still reference plans_global_id
-- It creates missing hotel plans and updates reservation_details to use hotel-specific plan references

-- Step 1: Create missing hotel plans for reservations that reference global plans
-- This ensures every reservation has a corresponding hotel-specific plan
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
)
SELECT DISTINCT 
    rd.hotel_id,
    rd.plans_global_id,
    -- Map to correct type category based on global plan
    CASE 
        WHEN pg.name = '素泊まり' THEN 1
        WHEN pg.name = '1食' THEN 2
        WHEN pg.name = '2食' THEN 3
        WHEN pg.name = '3食' THEN 4
        WHEN pg.name = '荷物キープ' THEN 5
        ELSE 1 -- Default to 素泊まり category
    END as plan_type_category_id,
    1 as plan_package_category_id, -- Default to 'スタンダード'
    pg.name,
    pg.description,
    pg.plan_type,
    pg.color,
    COALESCE((
        SELECT MAX(display_order) + 1 
        FROM plans_hotel ph2 
        WHERE ph2.hotel_id = rd.hotel_id
    ), 1) as display_order,
    true as is_active,
    NULL::DATE as available_from,
    NULL::DATE as available_until,
    CURRENT_TIMESTAMP,
    1 as created_by, -- System user
    1 as updated_by
FROM reservation_details rd
JOIN plans_global pg ON rd.plans_global_id = pg.id
WHERE rd.plans_hotel_id IS NULL 
  AND rd.plans_global_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM plans_hotel ph 
      WHERE ph.hotel_id = rd.hotel_id 
        AND ph.plans_global_id = rd.plans_global_id
  );

-- Step 2: Update reservation_details to use plans_hotel_id instead of plans_global_id
UPDATE reservation_details rd
SET plans_hotel_id = (
    SELECT ph.id
    FROM plans_hotel ph
    WHERE ph.hotel_id = rd.hotel_id
      AND ph.plans_global_id = rd.plans_global_id
    LIMIT 1
)
WHERE rd.plans_hotel_id IS NULL 
  AND rd.plans_global_id IS NOT NULL;

-- VERIFICATION QUERIES: Run these to verify migration success
/*
-- 1. Check reservation_details migration status:
SELECT COUNT(*) as total_reservations,
       COUNT(plans_hotel_id) as with_hotel_plan_id,
       COUNT(plans_global_id) as with_global_plan_id
FROM reservation_details;

-- 2. Verify no orphaned reservation_details (should be 0):
SELECT COUNT(*) as orphaned_reservations
FROM reservation_details rd
WHERE rd.plans_hotel_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.id = rd.plans_hotel_id 
      AND ph.hotel_id = rd.hotel_id
  );

-- 3. Check remaining NULL plans_hotel_id records:
SELECT COUNT(*) as remaining_nulls
FROM reservation_details 
WHERE plans_hotel_id IS NULL AND plans_global_id IS NOT NULL;

-- 4. Sample migrated reservations:
SELECT rd.hotel_id,
       rd.reservation_id,
       ph.name as plan_name,
       ptc.name as type_category,
       ppc.name as package_category
FROM reservation_details rd
JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
WHERE rd.plans_hotel_id IS NOT NULL
LIMIT 10;
*/