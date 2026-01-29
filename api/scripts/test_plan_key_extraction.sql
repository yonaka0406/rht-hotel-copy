-- Test script for plan_key extraction logic
-- Run this first to validate the extraction function before applying to real data

-- Create test function
CREATE OR REPLACE FUNCTION test_extract_ids_from_plan_key(plan_key_input TEXT)
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
    
    -- Handle "1h" format (global_id only)
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

-- Test cases based on the actual data from the issue
SELECT 
    'TEST CASES' as test_section,
    '' as plan_key,
    NULL::INTEGER as expected_global_id,
    NULL::INTEGER as expected_hotel_id,
    NULL::INTEGER as actual_global_id,
    NULL::INTEGER as actual_hotel_id,
    '' as result
WHERE FALSE

UNION ALL

-- Test case 1: h169 (should extract hotel_id = 169)
SELECT 
    'Hotel Only Format',
    'h169',
    NULL,
    169,
    (test_extract_ids_from_plan_key('h169')).plans_global_id,
    (test_extract_ids_from_plan_key('h169')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('h169')).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key('h169')).plans_hotel_id = 169 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 2: h177 (should extract hotel_id = 177)
SELECT 
    'Hotel Only Format',
    'h177',
    NULL,
    177,
    (test_extract_ids_from_plan_key('h177')).plans_global_id,
    (test_extract_ids_from_plan_key('h177')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('h177')).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key('h177')).plans_hotel_id = 177 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 3: 1h1 (should extract global_id = 1, hotel_id = 1)
SELECT 
    'Global + Hotel Format',
    '1h1',
    1,
    1,
    (test_extract_ids_from_plan_key('1h1')).plans_global_id,
    (test_extract_ids_from_plan_key('1h1')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('1h1')).plans_global_id = 1 
         AND (test_extract_ids_from_plan_key('1h1')).plans_hotel_id = 1 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 4: 3h2 (should extract global_id = 3, hotel_id = 2)
SELECT 
    'Global + Hotel Format',
    '3h2',
    3,
    2,
    (test_extract_ids_from_plan_key('3h2')).plans_global_id,
    (test_extract_ids_from_plan_key('3h2')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('3h2')).plans_global_id = 3 
         AND (test_extract_ids_from_plan_key('3h2')).plans_hotel_id = 2 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 5: h9 (should extract hotel_id = 9)
SELECT 
    'Hotel Only Format',
    'h9',
    NULL,
    9,
    (test_extract_ids_from_plan_key('h9')).plans_global_id,
    (test_extract_ids_from_plan_key('h9')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('h9')).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key('h9')).plans_hotel_id = 9 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 6: h10 (should extract hotel_id = 10)
SELECT 
    'Hotel Only Format',
    'h10',
    NULL,
    10,
    (test_extract_ids_from_plan_key('h10')).plans_global_id,
    (test_extract_ids_from_plan_key('h10')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('h10')).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key('h10')).plans_hotel_id = 10 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 7: NULL input (should return NULL, NULL)
SELECT 
    'NULL Input',
    NULL,
    NULL,
    NULL,
    (test_extract_ids_from_plan_key(NULL)).plans_global_id,
    (test_extract_ids_from_plan_key(NULL)).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key(NULL)).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key(NULL)).plans_hotel_id IS NULL 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 8: Empty string (should return NULL, NULL)
SELECT 
    'Empty String',
    '',
    NULL,
    NULL,
    (test_extract_ids_from_plan_key('')).plans_global_id,
    (test_extract_ids_from_plan_key('')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('')).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key('')).plans_hotel_id IS NULL 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

UNION ALL

-- Test case 9: Invalid format (should return NULL, NULL)
SELECT 
    'Invalid Format',
    'invalid123',
    NULL,
    NULL,
    (test_extract_ids_from_plan_key('invalid123')).plans_global_id,
    (test_extract_ids_from_plan_key('invalid123')).plans_hotel_id,
    CASE 
        WHEN (test_extract_ids_from_plan_key('invalid123')).plans_global_id IS NULL 
         AND (test_extract_ids_from_plan_key('invalid123')).plans_hotel_id IS NULL 
        THEN 'PASS' 
        ELSE 'FAIL' 
    END

ORDER BY plan_key NULLS LAST;

-- Test summary
SELECT 
    'TEST SUMMARY' as summary,
    COUNT(*) as total_tests,
    COUNT(CASE WHEN result = 'PASS' THEN 1 END) as passed_tests,
    COUNT(CASE WHEN result = 'FAIL' THEN 1 END) as failed_tests,
    CASE 
        WHEN COUNT(CASE WHEN result = 'FAIL' THEN 1 END) = 0 THEN 'ALL TESTS PASSED ✓'
        ELSE 'SOME TESTS FAILED ✗'
    END as overall_result
FROM (
    SELECT 
        CASE 
            WHEN (test_extract_ids_from_plan_key('h169')).plans_global_id IS NULL 
             AND (test_extract_ids_from_plan_key('h169')).plans_hotel_id = 169 
            THEN 'PASS' ELSE 'FAIL' 
        END as result
    UNION ALL
    SELECT 
        CASE 
            WHEN (test_extract_ids_from_plan_key('h177')).plans_global_id IS NULL 
             AND (test_extract_ids_from_plan_key('h177')).plans_hotel_id = 177 
            THEN 'PASS' ELSE 'FAIL' 
        END
    UNION ALL
    SELECT 
        CASE 
            WHEN (test_extract_ids_from_plan_key('1h1')).plans_global_id = 1 
             AND (test_extract_ids_from_plan_key('1h1')).plans_hotel_id = 1 
            THEN 'PASS' ELSE 'FAIL' 
        END
    UNION ALL
    SELECT 
        CASE 
            WHEN (test_extract_ids_from_plan_key('3h2')).plans_global_id = 3 
             AND (test_extract_ids_from_plan_key('3h2')).plans_hotel_id = 2 
            THEN 'PASS' ELSE 'FAIL' 
        END
    UNION ALL
    SELECT 
        CASE 
            WHEN (test_extract_ids_from_plan_key(NULL)).plans_global_id IS NULL 
             AND (test_extract_ids_from_plan_key(NULL)).plans_hotel_id IS NULL 
            THEN 'PASS' ELSE 'FAIL' 
        END
    UNION ALL
    SELECT 
        CASE 
            WHEN (test_extract_ids_from_plan_key('invalid123')).plans_global_id IS NULL 
             AND (test_extract_ids_from_plan_key('invalid123')).plans_hotel_id IS NULL 
            THEN 'PASS' ELSE 'FAIL' 
        END
) test_results;

-- Clean up
DROP FUNCTION test_extract_ids_from_plan_key(TEXT);

-- Instructions:
/*
1. Run this test script first to validate the extraction logic
2. All tests should PASS before proceeding with the actual update
3. If any tests FAIL, review and fix the extraction function
4. Once all tests pass, you can safely run the main update script

Expected Results:
- h169 → plans_hotel_id: 169, plans_global_id: NULL
- h177 → plans_hotel_id: 177, plans_global_id: NULL  
- 1h1 → plans_global_id: 1, plans_hotel_id: 1
- 3h2 → plans_global_id: 3, plans_hotel_id: 2
- NULL/empty/invalid → both NULL
*/