-- Migration to fix sc_tl_plans records with NULL plans_global_id and plans_hotel_id
-- but valid plan_key data

-- This migration extracts IDs from plan_key format and updates the corresponding columns
-- plan_key formats: "1h1" (global_id=1, hotel_id=1) or "h169" (hotel_id=169 only)

BEGIN;

-- Create a temporary function to extract IDs from plan_key
CREATE OR REPLACE FUNCTION extract_ids_from_plan_key(plan_key TEXT)
RETURNS TABLE(plans_global_id INTEGER, plans_hotel_id INTEGER)
LANGUAGE plpgsql
AS $$
DECLARE
    parts TEXT[];
    global_part TEXT;
    hotel_part TEXT;
    extracted_global_id INTEGER := NULL;
    extracted_hotel_id INTEGER := NULL;
BEGIN
    -- Return NULL values if plan_key is NULL or empty
    IF plan_key IS NULL OR plan_key = '' THEN
        RETURN QUERY SELECT NULL::INTEGER, NULL::INTEGER;
        RETURN;
    END IF;
    
    -- Split by 'h' character
    parts := string_to_array(plan_key, 'h');
    
    IF array_length(parts, 1) = 2 THEN
        -- Format: "1h1" (global_id=1, hotel_id=1)
        global_part := parts[1];
        hotel_part := parts[2];
        
        -- Extract global_id if valid number
        IF global_part ~ '^\d+$' THEN
            extracted_global_id := global_part::INTEGER;
        END IF;
        
        -- Extract hotel_id if valid number
        IF hotel_part ~ '^\d+$' THEN
            extracted_hotel_id := hotel_part::INTEGER;
        END IF;
        
    ELSIF array_length(parts, 1) = 1 AND plan_key LIKE 'h%' THEN
        -- Format: "h169" (hotel_id=169 only)
        hotel_part := substring(plan_key from 2);
        
        -- Extract hotel_id if valid number
        IF hotel_part ~ '^\d+$' THEN
            extracted_hotel_id := hotel_part::INTEGER;
        END IF;
    END IF;
    
    RETURN QUERY SELECT extracted_global_id, extracted_hotel_id;
END;
$$;

-- Log the records that will be updated
DO $$
DECLARE
    record_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO record_count
    FROM sc_tl_plans 
    WHERE (plans_global_id IS NULL AND plans_hotel_id IS NULL) 
      AND plan_key IS NOT NULL 
      AND plan_key != '';
    
    RAISE NOTICE 'Found % records in sc_tl_plans with NULL IDs but valid plan_key that will be updated', record_count;
END $$;

-- Show sample records before update
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Sample records before update:';
    FOR rec IN 
        SELECT hotel_id, plangroupcode, plangroupname, plans_global_id, plans_hotel_id, plan_key
        FROM sc_tl_plans 
        WHERE (plans_global_id IS NULL AND plans_hotel_id IS NULL) 
          AND plan_key IS NOT NULL 
          AND plan_key != ''
        LIMIT 5
    LOOP
        RAISE NOTICE 'Hotel: %, Code: %, Name: %, Global: %, Hotel: %, Key: %', 
            rec.hotel_id, rec.plangroupcode, rec.plangroupname, 
            rec.plans_global_id, rec.plans_hotel_id, rec.plan_key;
    END LOOP;
END $$;

-- Update records with extracted IDs
UPDATE sc_tl_plans 
SET 
    plans_global_id = extracted.plans_global_id,
    plans_hotel_id = extracted.plans_hotel_id
FROM (
    SELECT 
        hotel_id,
        plangroupcode,
        (extract_ids_from_plan_key(plan_key)).*
    FROM sc_tl_plans 
    WHERE (plans_global_id IS NULL AND plans_hotel_id IS NULL) 
      AND plan_key IS NOT NULL 
      AND plan_key != ''
) AS extracted
WHERE sc_tl_plans.hotel_id = extracted.hotel_id 
  AND sc_tl_plans.plangroupcode = extracted.plangroupcode;

-- Log the results
DO $$
DECLARE
    updated_count INTEGER;
    remaining_null_count INTEGER;
BEGIN
    -- Count updated records (now have at least one non-NULL ID)
    SELECT COUNT(*) INTO updated_count
    FROM sc_tl_plans 
    WHERE plan_key IS NOT NULL 
      AND plan_key != ''
      AND (plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL);
    
    -- Count remaining NULL records
    SELECT COUNT(*) INTO remaining_null_count
    FROM sc_tl_plans 
    WHERE (plans_global_id IS NULL AND plans_hotel_id IS NULL) 
      AND plan_key IS NOT NULL 
      AND plan_key != '';
    
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '- Records with extracted IDs: %', updated_count;
    RAISE NOTICE '- Records still with NULL IDs: %', remaining_null_count;
END $$;

-- Show sample records after update
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Sample records after update:';
    FOR rec IN 
        SELECT hotel_id, plangroupcode, plangroupname, plans_global_id, plans_hotel_id, plan_key
        FROM sc_tl_plans 
        WHERE plan_key IS NOT NULL 
          AND plan_key != ''
          AND (plans_global_id IS NOT NULL OR plans_hotel_id IS NOT NULL)
        LIMIT 5
    LOOP
        RAISE NOTICE 'Hotel: %, Code: %, Name: %, Global: %, Hotel: %, Key: %', 
            rec.hotel_id, rec.plangroupcode, rec.plangroupname, 
            rec.plans_global_id, rec.plans_hotel_id, rec.plan_key;
    END LOOP;
END $$;

-- Clean up the temporary function
DROP FUNCTION extract_ids_from_plan_key(TEXT);

COMMIT;