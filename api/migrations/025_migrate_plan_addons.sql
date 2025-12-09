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
    WHERE rel.relname = 'plan_addons' AND con.contype = 'c' AND con.consrc LIKE '%addons_global_id%';

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

-- Step 3: Drop the now-redundant addons_global_id column, if it still exists.
ALTER TABLE plan_addons DROP COLUMN IF EXISTS addons_global_id;

-- Step 4: Make addons_hotel_id NOT NULL, as it is now the only foreign key for addons.
-- Any rows with null addons_hotel_id at this point are invalid links and can be removed.
DELETE FROM plan_addons WHERE addons_hotel_id IS NULL;
ALTER TABLE plan_addons
ALTER COLUMN addons_hotel_id SET NOT NULL;

COMMIT;

-- DOWN: Reverts the changes. Note that re-populating addons_global_id is not possible
-- as the link to which addons were "global" is lost, and data loss might have occurred.

BEGIN;

ALTER TABLE plan_addons
ADD COLUMN addons_global_id INT;

ALTER TABLE plan_addons
ALTER COLUMN addons_hotel_id DROP NOT NULL;

-- Re-add a generic check constraint. The original name 'plan_addons_check1' cannot be guaranteed.
ALTER TABLE plan_addons
ADD CONSTRAINT plan_addons_global_or_hotel_check_revert CHECK (
    (addons_global_id IS NOT NULL AND addons_hotel_id IS NULL) OR
    (addons_global_id IS NULL AND addons_hotel_id IS NOT NULL)
);

COMMIT;