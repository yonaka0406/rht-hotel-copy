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

-- It is assumed that by this point, all necessary data has been migrated to `plans_hotel_id`.
-- The following statements will remove the deprecated columns.
ALTER TABLE sc_tl_plans DROP COLUMN IF EXISTS plan_key;
ALTER TABLE sc_tl_plans DROP COLUMN IF EXISTS plans_global_id;