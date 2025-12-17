-- UP: Migrates plan_addons to remove dependency on addons_global_id, explicitly dropping constraints.

BEGIN;

-- Step 1.1: Explicitly drop the problematic check constraint by its name, if it exists.
ALTER TABLE plan_addons DROP CONSTRAINT IF EXISTS plan_addons_check1;

-- Step 1.2: Drop any other CHECK constraint related to addons_global_id, if it exists.
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT con.conname INTO con_name
    FROM pg_catalog.pg_constraint con
    JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'plan_addons' AND con.contype = 'c';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE plan_addons DROP CONSTRAINT ' || quote_ident(con_name);
    END IF;
END;
$$;

-- Step 2: Backfill addons_hotel_id for plan_addons that were linked to global addons.
-- This step requires addons_global_id to still be present.
UPDATE plan_addons pa
SET addons_hotel_id = (
    SELECT ah.id
    FROM addons_hotel ah
    WHERE ah.hotel_id = pa.hotel_id
      AND ah.name = (SELECT ag.name FROM addons_global ag WHERE ag.id = pa.addons_global_id)
    LIMIT 1
)
WHERE pa.addons_hotel_id IS NULL AND pa.addons_global_id IS NOT NULL;

-- Note: Keeping addons_global_id column for now - will be dropped in migration 028

-- Step 4: Make addons_hotel_id NOT NULL, as it is now the only foreign key for addons.
-- Any rows with null addons_hotel_id at this point are invalid links and can be removed.
DELETE FROM plan_addons WHERE addons_hotel_id IS NULL;
ALTER TABLE plan_addons
ALTER COLUMN addons_hotel_id SET NOT NULL;

COMMIT;

-- VERIFICATION QUERIES: Run these to verify migration success
/*
-- 1. Check plan_addons migration status:
SELECT COUNT(*) as total_plan_addons,
       COUNT(addons_hotel_id) as with_hotel_addon_id,
       COUNT(addons_global_id) as with_global_addon_id
FROM plan_addons;

-- 2. Verify no orphaned plan_addons (should be 0):
SELECT COUNT(*) as orphaned_plan_addons
FROM plan_addons pa
WHERE pa.addons_hotel_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM addons_hotel ah 
    WHERE ah.id = pa.addons_hotel_id 
      AND ah.hotel_id = pa.hotel_id
  );

-- 3. Sample plan-addon relationships:
SELECT pa.hotel_id,
       ph.name as plan_name,
       ah.name as addon_name,
       ac.name as addon_category
FROM plan_addons pa
JOIN plans_hotel ph ON pa.plans_hotel_id = ph.id AND pa.hotel_id = ph.hotel_id
JOIN addons_hotel ah ON pa.addons_hotel_id = ah.id AND pa.hotel_id = ah.hotel_id
LEFT JOIN addon_categories ac ON ah.addon_category_id = ac.id
LIMIT 10;
*/

-- DOWN: Reverts the changes. Note that re-populating addons_global_id is not possible
-- as the link to which addons were "global" is lost, and data loss might have occurred.

--BEGIN;

--ALTER TABLE plan_addons
--ADD COLUMN addons_global_id INT;

--ALTER TABLE plan_addons
--ALTER COLUMN addons_hotel_id DROP NOT NULL;

-- Re-add a generic check constraint. The original name 'plan_addons_check1' cannot be guaranteed.
--ALTER TABLE plan_addons
--ADD CONSTRAINT plan_addons_global_or_hotel_check_revert CHECK (
--    (addons_global_id IS NOT NULL AND addons_hotel_id IS NULL) OR
--    (addons_global_id IS NULL AND addons_hotel_id IS NOT NULL)
--);

--COMMIT;