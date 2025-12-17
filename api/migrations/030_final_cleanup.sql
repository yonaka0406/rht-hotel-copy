-- Migration: Drop deprecated get_available_plans_for_hotel function
-- This migration removes the deprecated function that was generating plan_key
-- The system now uses get_available_plans_with_rates_and_addons for plan retrieval

DROP FUNCTION IF EXISTS get_available_plans_for_hotel(INT);

-- Final cleanup: Drop deprecated columns after all migrations are complete
-- Drop addons_global_id column from addons_hotel (moved from migration 022)
ALTER TABLE addons_hotel DROP CONSTRAINT IF EXISTS addons_hotel_addons_global_id_fkey;
ALTER TABLE addons_hotel DROP COLUMN IF EXISTS addons_global_id;

-- Drop addons_global_id column from plan_addons (moved from migration 025)
ALTER TABLE plan_addons DROP COLUMN IF EXISTS addons_global_id;

-- Drop deprecated columns from sc_tl_plans (moved from migration 026)
ALTER TABLE sc_tl_plans DROP COLUMN IF EXISTS plan_key;
ALTER TABLE sc_tl_plans DROP COLUMN IF EXISTS plans_global_id;

-- Drop plans_global_id columns from all tables (after migration to plans_hotel_id)
-- (Uncomment when all records have been migrated to use plans_hotel_id)

-- Drop from main tables
-- ALTER TABLE reservation_details DROP COLUMN IF EXISTS plans_global_id;
-- ALTER TABLE daily_plan_metrics DROP COLUMN IF EXISTS plans_global_id;
-- ALTER TABLE plans_rates DROP COLUMN IF EXISTS plans_global_id;
-- ALTER TABLE plan_addons DROP COLUMN IF EXISTS plans_global_id;

-- Drop from plans_hotel (keep for reference or drop when fully migrated)
-- ALTER TABLE plans_hotel DROP CONSTRAINT IF EXISTS plans_hotel_plans_global_id_fkey;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS plans_global_id;

-- Note: Partitioned tables (plans_hotel_XX, reservation_details_XX) will inherit 
-- the column drops from their parent tables automatically

-- Note: sc_tl_plans already handled above (plan_key and plans_global_id)
-- Note: addons_hotel and plan_addons addons_global_id already handled above

-- Views will be handled in migration 031