-- Migration: Complete daily_plan_metrics migration for remaining records
-- This migration handles any remaining daily_plan_metrics records that still have NULL plans_hotel_id
-- It creates missing hotel plans and updates the metrics to use hotel-specific plan references

-- Step 1: Create missing hotel plans for daily_plan_metrics that reference global plans
-- This ensures every metric has a corresponding hotel-specific plan
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
    dpm.hotel_id,
    dpm.plans_global_id,
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
        WHERE ph2.hotel_id = dpm.hotel_id
    ), 1) as display_order,
    true as is_active,
    NULL::DATE as available_from,
    NULL::DATE as available_until,
    CURRENT_TIMESTAMP,
    1 as created_by, -- System user
    1 as updated_by
FROM daily_plan_metrics dpm
JOIN plans_global pg ON dpm.plans_global_id = pg.id
WHERE dpm.plans_hotel_id IS NULL 
  AND dpm.plans_global_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM plans_hotel ph 
      WHERE ph.hotel_id = dpm.hotel_id 
        AND ph.plans_global_id = dpm.plans_global_id
  );

-- Step 2: Update daily_plan_metrics to use plans_hotel_id instead of plans_global_id
UPDATE daily_plan_metrics dpm
SET plans_hotel_id = (
    SELECT ph.id
    FROM plans_hotel ph
    WHERE ph.hotel_id = dpm.hotel_id
      AND ph.plans_global_id = dpm.plans_global_id
    LIMIT 1
)
WHERE dpm.plans_hotel_id IS NULL 
  AND dpm.plans_global_id IS NOT NULL;

-- Step 3: Update category columns for newly migrated records
UPDATE daily_plan_metrics dpm
SET 
    plan_type_category_id = ph.plan_type_category_id,
    plan_package_category_id = ph.plan_package_category_id
FROM plans_hotel ph
WHERE dpm.plans_hotel_id = ph.id 
  AND dpm.hotel_id = ph.hotel_id
  AND (dpm.plan_type_category_id IS NULL OR dpm.plan_package_category_id IS NULL);

-- VERIFICATION QUERIES: Run these to verify migration success
/*
-- 1. Check daily_plan_metrics final status:
SELECT COUNT(*) as total_metrics,
       COUNT(plans_hotel_id) as with_hotel_plan_id,
       COUNT(plans_global_id) as with_global_plan_id,
       COUNT(plan_type_category_id) as with_type_category,
       COUNT(plan_package_category_id) as with_package_category
FROM daily_plan_metrics;

-- 2. Verify no orphaned daily_plan_metrics (should be 0):
SELECT COUNT(*) as orphaned_metrics
FROM daily_plan_metrics dpm
WHERE dpm.plans_hotel_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.id = dpm.plans_hotel_id 
      AND ph.hotel_id = dpm.hotel_id
  );

-- 3. Check remaining NULL plans_hotel_id records:
SELECT COUNT(*) as remaining_nulls
FROM daily_plan_metrics 
WHERE plans_hotel_id IS NULL AND plans_global_id IS NOT NULL;

-- 4. Sample migrated metrics:
SELECT dpm.hotel_id,
       dpm.metric_date,
       ph.name as plan_name,
       ptc.name as type_category,
       ppc.name as package_category,
       dpm.confirmed_stays
FROM daily_plan_metrics dpm
JOIN plans_hotel ph ON dpm.plans_hotel_id = ph.id AND dpm.hotel_id = ph.hotel_id
LEFT JOIN plan_type_categories ptc ON dpm.plan_type_category_id = ptc.id
LEFT JOIN plan_package_categories ppc ON dpm.plan_package_category_id = ppc.id
WHERE dpm.plans_hotel_id IS NOT NULL
LIMIT 10;
*/