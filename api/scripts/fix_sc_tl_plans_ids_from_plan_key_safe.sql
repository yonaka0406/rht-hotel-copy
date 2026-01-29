-- SAFE VERSION: Fix sc_tl_plans table by extracting correct plan IDs from plan_key
-- This script includes backup creation and extensive validation
-- Run this version in production environments

-- Author: System  
-- Date: 2026-01-29
-- Purpose: Safely extract and populate correct plan IDs from plan_key format

-- STEP 1: Create backup table
DROP TABLE IF EXISTS sc_tl_plans_backup_20260129;
CREATE TABLE sc_tl_plans_backup_20260129 AS 
SELECT * FROM sc_tl_plans;

SELECT 'BACKUP CREATED' as status, COUNT(*) as records_backed_up 
FROM sc_tl_plans_backup_20260129;

BEGIN;

-- STEP 2: Create extraction function with enhanced validation
CREATE OR REPLACE FUNCTION extract_and_validate_plan_ids(plan_key_input TEXT)
RETURNS TABLE(
    plans_global_id INTEGER, 
    plans_hotel_id INTEGER, 
    extraction_success BOOLEAN,
    extraction_method TEXT
) AS $$
BEGIN
    -- Initialize return values
    plans_global_id := NULL;
    plans_hotel_id := NULL;
    extraction_success := FALSE;
    extraction_method := 'NONE';
    
    -- Return early if plan_key is NULL or empty
    IF plan_key_input IS NULL OR plan_key_input = '' THEN
        extraction_method := 'NULL_INPUT';
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Handle "h169" format (hotel_id only)
    IF plan_key_input ~ '^h\d+$' THEN
        BEGIN
            plans_hotel_id := CAST(SUBSTRING(plan_key_input FROM 2) AS INTEGER);
            extraction_success := TRUE;
            extraction_method := 'HOTEL_ONLY';
        EXCEPTION WHEN OTHERS THEN
            extraction_success := FALSE;
            extraction_method := 'HOTEL_ONLY_ERROR';
        END;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Handle "1h1" format (global_id + hotel_id)
    IF plan_key_input ~ '^\d+h\d+$' THEN
        BEGIN
            plans_global_id := CAST(SPLIT_PART(plan_key_input, 'h', 1) AS INTEGER);
            plans_hotel_id := CAST(SPLIT_PART(plan_key_input, 'h', 2) AS INTEGER);
            extraction_success := TRUE;
            extraction_method := 'GLOBAL_AND_HOTEL';
        EXCEPTION WHEN OTHERS THEN
            extraction_success := FALSE;
            extraction_method := 'GLOBAL_AND_HOTEL_ERROR';
        END;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- Handle "1h" format (global_id only)
    IF plan_key_input ~ '^\d+h$' THEN
        BEGIN
            plans_global_id := CAST(SUBSTRING(plan_key_input FROM 1 FOR LENGTH(plan_key_input) - 1) AS INTEGER);
            extraction_success := TRUE;
            extraction_method := 'GLOBAL_ONLY';
        EXCEPTION WHEN OTHERS THEN
            extraction_success := FALSE;
            extraction_method := 'GLOBAL_ONLY_ERROR';
        END;
        RETURN NEXT;
        RETURN;
    END IF;
    
    -- If no pattern matches
    extraction_method := 'NO_PATTERN_MATCH';
    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- STEP 3: Analysis of current state
SELECT 
    '=== CURRENT STATE ANALYSIS ===' as section,
    '' as detail;

SELECT 
    'Total Records' as metric,
    COUNT(*) as count,
    '' as details
FROM sc_tl_plans
UNION ALL
SELECT 
    'Records with NULL IDs',
    COUNT(*),
    'Both plans_global_id and plans_hotel_id are NULL'
FROM sc_tl_plans 
WHERE plans_global_id IS NULL AND plans_hotel_id IS NULL
UNION ALL
SELECT 
    'Records with plan_key but NULL IDs',
    COUNT(*),
    'Have plan_key but missing ID links'
FROM sc_tl_plans 
WHERE plan_key IS NOT NULL AND plans_global_id IS NULL AND plans_hotel_id IS NULL
UNION ALL
SELECT 
    'Records without plan_key and NULL IDs',
    COUNT(*),
    'No plan_key available for extraction'
FROM sc_tl_plans 
WHERE plan_key IS NULL AND plans_global_id IS NULL AND plans_hotel_id IS NULL;

-- STEP 4: Preview extraction results
SELECT 
    '=== EXTRACTION PREVIEW ===' as section,
    '' as detail;

-- Create temporary table for preview to avoid set-returning function issues
CREATE TEMP TABLE temp_preview_extractions AS
SELECT 
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id as current_global_id,
    plans_hotel_id as current_hotel_id,
    (extract_and_validate_plan_ids(plan_key)).plans_global_id as new_global_id,
    (extract_and_validate_plan_ids(plan_key)).plans_hotel_id as new_hotel_id,
    (extract_and_validate_plan_ids(plan_key)).extraction_success as will_update,
    (extract_and_validate_plan_ids(plan_key)).extraction_method as method
FROM sc_tl_plans 
WHERE plan_key IS NOT NULL 
  AND (plans_global_id IS NULL AND plans_hotel_id IS NULL);

SELECT 
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    current_global_id,
    current_hotel_id,
    new_global_id,
    new_hotel_id,
    will_update,
    method
FROM temp_preview_extractions
ORDER BY hotel_id, plangroupcode;

-- STEP 5: Validation of extraction methods
SELECT 
    '=== EXTRACTION METHOD SUMMARY ===' as section,
    '' as detail;

SELECT 
    method,
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT plan_key) as sample_plan_keys
FROM temp_preview_extractions
GROUP BY method
ORDER BY count DESC;

-- STEP 6: Perform the update (only successful extractions)
-- Use the existing temp_preview_extractions table
SELECT 
    'RECORDS THAT WILL BE UPDATED' as info,
    COUNT(*) as count
FROM temp_preview_extractions 
WHERE will_update = TRUE;

-- Perform the actual update using the temporary table
UPDATE sc_tl_plans 
SET 
    plans_global_id = COALESCE(plans_global_id, temp.new_global_id),
    plans_hotel_id = COALESCE(plans_hotel_id, temp.new_hotel_id)
FROM temp_preview_extractions temp
WHERE sc_tl_plans.hotel_id = temp.hotel_id
  AND sc_tl_plans.plangroupcode = temp.plangroupcode
  AND temp.will_update = TRUE;

-- STEP 7: Report results
SELECT 
    '=== UPDATE RESULTS ===' as section,
    '' as detail;

SELECT 
    'Records Updated' as metric,
    COUNT(*) as count,
    'Successfully extracted and populated IDs'
FROM sc_tl_plans 
WHERE plan_key IS NOT NULL 
  AND (plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL);

-- STEP 8: Show updated records by type
SELECT 
    '=== UPDATED RECORDS BY TYPE ===' as section,
    '' as detail;

SELECT 
    CASE 
        WHEN plan_key ~ '^h\d+$' THEN 'Hotel Plan Only (h###)'
        WHEN plan_key ~ '^\d+h\d+$' THEN 'Global + Hotel Plan (#h#)'
        WHEN plan_key ~ '^\d+h$' THEN 'Global Plan Only (#h)'
        ELSE 'Other Format'
    END as plan_type,
    COUNT(*) as count,
    ARRAY_AGG(DISTINCT CONCAT(hotel_id, ':', plangroupcode)) as samples
FROM sc_tl_plans 
WHERE plan_key IS NOT NULL 
  AND (plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL)
GROUP BY 
    CASE 
        WHEN plan_key ~ '^h\d+$' THEN 'Hotel Plan Only (h###)'
        WHEN plan_key ~ '^\d+h\d+$' THEN 'Global + Hotel Plan (#h#)'
        WHEN plan_key ~ '^\d+h$' THEN 'Global Plan Only (#h)'
        ELSE 'Other Format'
    END
ORDER BY count DESC;

-- STEP 9: Identify remaining issues
SELECT 
    '=== REMAINING ISSUES ===' as section,
    '' as detail;

-- Create temporary table for remaining issues analysis
CREATE TEMP TABLE temp_remaining_issues AS
SELECT 
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id,
    plans_hotel_id,
    CASE 
        WHEN plan_key IS NOT NULL AND plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 'Extraction Failed'
        WHEN plan_key IS NULL AND plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 'No plan_key Available'
        ELSE 'Unknown Issue'
    END as issue_type,
    (extract_and_validate_plan_ids(plan_key)).extraction_method as attempted_method
FROM sc_tl_plans 
WHERE plans_global_id IS NULL AND plans_hotel_id IS NULL;

SELECT 
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id,
    plans_hotel_id,
    issue_type,
    attempted_method
FROM temp_remaining_issues
ORDER BY issue_type, hotel_id, plangroupcode;

-- STEP 10: Final validation
SELECT 
    '=== FINAL VALIDATION ===' as section,
    '' as detail;

-- Check specific test cases mentioned in the original issue
SELECT 
    'Test Case Validation' as check_type,
    hotel_id,
    plangroupcode,
    plangroupname,
    plan_key,
    plans_global_id,
    plans_hotel_id,
    CASE 
        WHEN plan_key = 'h169' AND plans_hotel_id = 169 THEN 'PASS'
        WHEN plan_key = 'h177' AND plans_hotel_id = 177 THEN 'PASS'
        WHEN plan_key = '1h1' AND plans_global_id = 1 AND plans_hotel_id = 1 THEN 'PASS'
        WHEN plan_key = '3h2' AND plans_global_id = 3 AND plans_hotel_id = 2 THEN 'PASS'
        ELSE 'NEEDS REVIEW'
    END as validation_result
FROM sc_tl_plans 
WHERE plangroupcode IN ('11', '12', '15', '1', '2', '14') 
  AND hotel_id = 10
ORDER BY plangroupcode;

-- Clean up the function and temporary tables
DROP FUNCTION extract_and_validate_plan_ids(TEXT);
DROP TABLE IF EXISTS temp_preview_extractions;
DROP TABLE IF EXISTS temp_remaining_issues;

COMMIT;

-- STEP 11: Final summary
SELECT 
    '=== FINAL SUMMARY ===' as section,
    '' as detail;

SELECT 
    'BEFORE (from backup)' as state,
    COUNT(*) as total_records,
    COUNT(CASE WHEN plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 1 END) as null_id_records
FROM sc_tl_plans_backup_20260129
UNION ALL
SELECT 
    'AFTER (current)',
    COUNT(*),
    COUNT(CASE WHEN plans_global_id IS NULL AND plans_hotel_id IS NULL THEN 1 END)
FROM sc_tl_plans;

-- Instructions for rollback if needed:
/*
TO ROLLBACK THIS UPDATE (if something goes wrong):

DROP TABLE IF EXISTS sc_tl_plans_rollback_temp;
CREATE TABLE sc_tl_plans_rollback_temp AS SELECT * FROM sc_tl_plans;

DELETE FROM sc_tl_plans;
INSERT INTO sc_tl_plans SELECT * FROM sc_tl_plans_backup_20260129;

-- Verify rollback
SELECT 'Rollback completed' as status, COUNT(*) as records FROM sc_tl_plans;
*/

-- Post-execution checklist:
/*
1. ✓ Backup created: sc_tl_plans_backup_20260129
2. ✓ Extraction function tested and validated
3. ✓ Only successful extractions were applied
4. ✓ Existing valid data was preserved (COALESCE used)
5. ✓ Test cases validated
6. ✓ Remaining issues identified

Next steps:
- Test OTA reservation processing
- Monitor application logs for plan ID resolution
- Review any remaining issues manually
- Consider running the frontend fix to prevent future occurrences
*/