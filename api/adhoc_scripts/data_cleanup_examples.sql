-- =====================================================================================
-- !! AD-HOC DATA CLEANUP SCRIPTS !!
-- =====================================================================================
-- These scripts are examples of ad-hoc data cleanup or processing operations.
-- They are NOT part of the standard database migration sequence and should
-- NOT be run automatically during a fresh installation or standard upgrade.
--
-- Only execute these scripts manually if you understand their purpose and are
-- sure they are applicable to your specific data situation (e.g., after a
-- particular data import or to address a known data issue).
--
-- Some of these scripts use TEMP tables, meaning they must be run entirely within
-- a single session if those TEMP tables are to be used by subsequent statements
-- in this file.
-- =====================================================================================


-- -------------------------------------------------------------------------------------
-- Example 1: Client Name Processing (based on `created_at >= '2025-06-02'`)
-- This script was originally found inline in the client table creation logic.
-- It uses a temporary table `temp_client_substitutions` to standardize client names.
-- -------------------------------------------------------------------------------------

-- First, define the temporary table and its data:
CREATE TEMP TABLE temp_client_substitutions (
    pattern TEXT,
    replacement TEXT,
    kanji_match TEXT
);

INSERT INTO temp_client_substitutions (pattern, replacement, kanji_match) VALUES
   ('japan', ' Japan ', '%ジャパン%'),
   ('nihon', ' Nihon ', '%日本%'),
   ('hokkaidou', ' Hokkaido ', '%北海道%'),
	('sapporo', ' Sapporo ', '%札幌%'),
   ('kensetsu', ' Kensetsu ', '%建設%'),
   ('setsubi', ' Setsubi ', '%設備%'),
   ('kabushikigaisha', ' K.K ', '%株式会社%'),
   ('kougyou', ' Kogyo ', '%工業%'),
   ('kougyou', ' Kogyo ', '%興業%'),
   ('kougyou', ' Kogyo ', '%鋼業%'),
   ('sangyou', ' Sangyo ', '%産業%'),
   ('tekkou', ' Tekkou ', '%鉄工%'),
   ('kikou', ' Kikou ', '%機工%'),
   ('denkou', ' Denkou ', '%電工%'),
   ('tosou', ' Tosou ', '%塗装%'),
   ('kureen', ' Crane ', '%クレーン%'),
   ('koumuten', ' Koumuten ', '%工務店%'),
   ('giken', ' Giken ', '%技研%'),
   ('gijutsu', ' Gijutsu ', '%技術%'),
   ('guruupu', ' Group ', '%グループ%'),
   ('hoomu', ' Home ', '%ホーム%'),
   ('hausu', ' House ', '%ハウス%'),
   ('shisutemu', ' System ', '%システム%'),
   ('hoorudeingusu', ' Holdings ', '%ホールディングス%'),
   ('konsarutanto', ' Consultant ', '%コンサルタント%')
   ;

-- Then, the DO block to process client names:
/*
DO $$
DECLARE
    client_row RECORD;
    sub_row RECORD;
    updated_name TEXT;
BEGIN
    RAISE NOTICE 'Starting ad-hoc client name processing for clients created on or after 2025-06-02...';
    FOR client_row IN
        SELECT * FROM clients
        WHERE created_at >= '2025-06-02' -- This date condition makes it specific
    LOOP
        updated_name := client_row.name;

        FOR sub_row IN
            SELECT * FROM temp_client_substitutions
            WHERE client_row.name ILIKE '%' || pattern || '%'
              AND client_row.name_kanji LIKE kanji_match
        LOOP
            updated_name := regexp_replace(updated_name, '(?i)' || sub_row.pattern, sub_row.replacement, 'g');
        END LOOP;

        updated_name := regexp_replace(trim(updated_name), '\s+', ' ', 'g');

        IF updated_name IS DISTINCT FROM client_row.name THEN
            RAISE NOTICE 'Updating client ID %: name from "%" to "%"', client_row.id, client_row.name, INITCAP(updated_name);
            UPDATE clients
            SET name = INITCAP(updated_name)
            WHERE id = client_row.id;
        END IF;
    END LOOP;
    RAISE NOTICE 'Finished ad-hoc client name processing.';
END $$;
*/

-- Drop the temp table if you are done with it in this session
-- DROP TABLE temp_client_substitutions;


-- -------------------------------------------------------------------------------------
-- Example 2: Client Deduplication (based on `created_at >= '2025-03-25'`)
-- These scripts were originally commented out in the main sql.sql file.
-- They aim to identify duplicate client records based on name, kana, kanji, and phone,
-- and then update related tables before deleting the duplicates.
-- -------------------------------------------------------------------------------------

/*
--------------------------------------------------------------------
-- Ad-hoc: Imported clients, update reservations FK for duplicates
RAISE NOTICE 'Starting ad-hoc client deduplication: updating reservations table...';
WITH duplicate_clients AS (
  SELECT
    name,
    name_kana,
    name_kanji,
    phone,
    array_agg(id ORDER BY created_at) AS duplicate_ids -- Keep the earliest created as canonical
  FROM clients
  WHERE created_at >= '2025-03-25' -- Date condition for specific import
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
-- For each duplicate group, identify the canonical ID (first one created)
-- and the IDs to be merged/deleted (the rest)
ids_to_update AS (
  SELECT
    duplicate_ids[1] AS canonical_id,
    u.id_to_remove
  FROM duplicate_clients
  CROSS JOIN LATERAL unnest(duplicate_ids[2:]) AS u(id_to_remove) -- IDs from the 2nd one onwards
)
UPDATE reservations res
SET reservation_client_id = upd.canonical_id
FROM ids_to_update upd
WHERE res.reservation_client_id = upd.id_to_remove;
RAISE NOTICE 'Finished ad-hoc client deduplication: reservations table updated.';
--------------------------------------------------------------------

-- Ad-hoc: Imported clients, update reservation_clients FK for duplicates
RAISE NOTICE 'Starting ad-hoc client deduplication: updating reservation_clients table...';
WITH duplicate_clients AS (
  SELECT
    name,
    name_kana,
    name_kanji,
    phone,
    array_agg(id ORDER BY created_at) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
ids_to_update AS (
  SELECT
    duplicate_ids[1] AS canonical_id,
    u.id_to_remove
  FROM duplicate_clients
  CROSS JOIN LATERAL unnest(duplicate_ids[2:]) AS u(id_to_remove)
)
UPDATE reservation_clients rc
SET client_id = upd.canonical_id
FROM ids_to_update upd
WHERE rc.client_id = upd.id_to_remove;
RAISE NOTICE 'Finished ad-hoc client deduplication: reservation_clients table updated.';
--------------------------------------------------------------------

-- Ad-hoc: Imported clients, update reservation_payments FK for duplicates
RAISE NOTICE 'Starting ad-hoc client deduplication: updating reservation_payments table...';
WITH duplicate_clients AS (
  SELECT
    name,
    name_kana,
    name_kanji,
    phone,
    array_agg(id ORDER BY created_at) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
ids_to_update AS (
  SELECT
    duplicate_ids[1] AS canonical_id,
    u.id_to_remove
  FROM duplicate_clients
  CROSS JOIN LATERAL unnest(duplicate_ids[2:]) AS u(id_to_remove)
)
UPDATE reservation_payments rp
SET client_id = upd.canonical_id
FROM ids_to_update upd
WHERE rp.client_id = upd.id_to_remove;
RAISE NOTICE 'Finished ad-hoc client deduplication: reservation_payments table updated.';
--------------------------------------------------------------------

-- Ad-hoc: Imported clients, delete the duplicates (keeping the first one created)
RAISE NOTICE 'Starting ad-hoc client deduplication: deleting duplicate client entries...';
WITH duplicate_clients AS (
  SELECT
    name,
    name_kana,
    name_kanji,
    phone,
    array_agg(id ORDER BY created_at) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
ids_to_delete AS (
  SELECT
    u.id_to_remove
  FROM duplicate_clients
  CROSS JOIN LATERAL unnest(duplicate_ids[2:]) AS u(id_to_remove) -- IDs from the 2nd one onwards
)
DELETE FROM clients c
WHERE c.id IN (SELECT id_to_remove FROM ids_to_delete);
RAISE NOTICE 'Finished ad-hoc client deduplication: duplicate client entries deleted.';
--------------------------------------------------------------------
*/

RAISE NOTICE 'Ad-hoc script file processing complete. Review logs for any actions taken if scripts were uncommented.';
