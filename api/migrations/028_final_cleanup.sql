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

-- Drop plans_global_id column from plans_hotel if no longer needed
-- (Uncomment when ready to fully remove global plan references)
-- ALTER TABLE plans_hotel DROP CONSTRAINT IF EXISTS plans_hotel_plans_global_id_fkey;
-- ALTER TABLE plans_hotel DROP COLUMN IF EXISTS plans_global_id;