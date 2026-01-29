-- Fix sc_tl_plans table by extracting correct plan IDs from plan_key
-- This script addresses the issue where plans_global_id and plans_hotel_id are NULL
-- but plan_key contains valid plan information that can be parsed

-- Author: System
-- Date: 2026-01-29
-- Purpose: Extract and populate correct plan IDs from plan_key format

BEGIN;

-- Create a temporary function to extract IDs from plan_key
CREATE OR REPLACE FUNCTION extract_ids_from_plan_key(plan_key_input TEXT)
RETURNS TABLE(plans_global_id INTEGER, plans_hotel_id INTEGER) AS $$
BEGIN
    -- Initialize return values
    plans_global_id := NULL;
    plans_hotel_id := NULL;
    
    -- Return early if plan_key is NULL or empty
    IF plan_key_input IS NULL OR plan_key_input = '' THEN
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Handle "h169" format (hotel_id only)
    IF plan_key_input ~ '^h\d+$' THEN
        plans_hotel_id := CAST(SUBSTRING(plan_key_input FROM 2) AS INTEGER);
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Handle "1h1" format (global_id + hotel_id)
    IF plan_key_input ~ '^\d+h\d+$' THEN
        plans_global_id := CAST(SPLIT_PART(plan_key_input, 'h', 1) AS INTEGER);
        plans_hotel_id := CAST(SPLIT_PART(plan_key_input, 'h', 2) AS INTEGER);
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Handle "1h" format (global_id only) - less common but possible
    IF plan_key_input ~ '^\d+h$' THEN
        plans_global_id := CAST(SUBSTRING(plan_key_input FROM 1 FOR LENGTH(plan_key_input) - 1) AS INTEGER);
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- If no pattern matches, return NULLs
    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Show current state before update
SELECT 
    'BEFORE UPDATE' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 1 END) as null_ids_count,
    COUNT(CASE WHEN plan_key IS NOT NULL AND (plans_global_id IS NULL AND plans_hotel_id IS NULL) THEN 1 END) as fixable_records
FROM sc_tl_plans;

-- Show records that will be updated
SELECT 
    'RECORDS TO BE UPDATED' as info,
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id as current_global_id,
    plans_hotel_id as current_hotel_id,
    (extract_ids_from_plan_key(plan_key)).plans_global_id as extracted_global_id,
    (extract_ids_from_plan_key(plan_key)).plans_hotel_id as extracted_hotel_id
FROM sc_tl_plans 
WHERE plan_key IS NOT NULL 
  AND (plans_global_id IS NULL AND plans_hotel_id IS NULL)
ORDER BY hotel_id, plangroupcode;

-- Update records where both IDs are NULL but plan_key exists
UPDATE sc_tl_plans 
SET 
    plans_global_id = COALESCE(plans_global_id, (extract_ids_from_plan_key(plan_key)).plans_global_id),
    plans_hotel_id = COALESCE(plans_hotel_id, (extract_ids_from_plan_key(plan_key)).plans_hotel_id)
WHERE plan_key IS NOT NULL 
  AND (plans_global_id IS NULL AND plans_hotel_id IS NULL);

-- Show results after update
SELECT 
    'AFTER UPDATE' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 1 END) as null_ids_count,
    COUNT(CASE WHEN plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL THEN 1 END) as records_with_ids
FROM sc_tl_plans;

-- Show updated records
SELECT 
    'UPDATED RECORDS' as info,
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id,
    plans_hotel_id,
    CASE 
        WHEN plan_key ~ '^h\d+$' THEN 'Hotel Plan Only'
        WHEN plan_key ~ '^\d+h\d+$' THEN 'Global + Hotel Plan'
        WHEN plan_key ~ '^\d+h$' THEN 'Global Plan Only'
        ELSE 'Unknown Format'
    END as plan_type
FROM sc_tl_plans 
WHERE plan_key IS NOT NULL 
  AND (plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL)
ORDER BY hotel_id, plangroupcode;

-- Validation: Check for any remaining issues
SELECT 
    'VALIDATION - REMAINING ISSUES' as info,
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id,
    plans_hotel_id,
    CASE 
        WHEN plan_key IS NOT NULL AND plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 'Failed to extract IDs'
        WHEN plan_key IS NULL AND plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 'No plan_key available'
        ELSE 'OK'
    END as issue
FROM sc_tl_plans 
WHERE plans_global_id IS NULL AND plans_hotel_id IS NULL
ORDER BY hotel_id, plangroupcode;

-- Clean up the temporary function
DROP FUNCTION extract_ids_from_plan_key(TEXT);

-- Summary report
SELECT 
    'SUMMARY REPORT' as report_type,
    'Total records processed' as metric,
    COUNT(*) as value
FROM sc_tl_plans
UNION ALL
SELECT 
    'SUMMARY REPORT',
    'Records with extracted hotel IDs',
    COUNT(*)
FROM sc_tl_plans 
WHERE plans_hotel_id IS NOT NULL AND plan_key ~ '^h\d+$'
UNION ALL
SELECT 
    'SUMMARY REPORT',
    'Records with extracted global IDs',
    COUNT(*)
FROM sc_tl_plans 
WHERE plans_global_id IS NOT NULL AND plan_key ~ '^\d+h'
UNION ALL
SELECT 
    'SUMMARY REPORT',
    'Records still needing manual review',
    COUNT(*)
FROM sc_tl_plans 
WHERE plans_global_id IS NULL AND plans_hotel_id IS NULL;

COMMIT;

-- Instructions for manual verification:
/*
After running this script, you should:

1. Verify the results by checking a few sample records:
   SELECT * FROM sc_tl_plans WHERE plangroupcode IN ('11', '12', '15') AND hotel_id = 10;

2. Test OTA reservation processing with the updated data

3. Monitor logs for any remaining plan ID resolution issues

4. Consider creating a backup before running this script:
   CREATE TABLE sc_tl_plans_backup AS SELECT * FROM sc_tl_plans;

Plan Key Formats Handled:
- "h169" → plans_hotel_id = 169, plans_global_id = NULL
- "1h1" → plans_global_id = 1, plans_hotel_id = 1  
- "3h2" → plans_global_id = 3, plans_hotel_id = 2
- "1h" → plans_global_id = 1, plans_hotel_id = NULL (rare case)

This script only updates records where BOTH plans_global_id AND plans_hotel_id are NULL,
preserving any existing valid data.
*/