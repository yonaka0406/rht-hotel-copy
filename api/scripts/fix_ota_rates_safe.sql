-- Safe Fix for Missing OTA Reservation Rates
-- This version uses transactions and provides rollback capability

BEGIN;

-- Step 1: Check what we're about to fix
DO $$
DECLARE
    affected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO affected_count
    FROM reservations r 
    JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id 
    WHERE r.type = 'ota' 
    AND (rd.plans_hotel_id IS NOT NULL OR rd.plans_global_id IS NOT NULL) 
    AND NOT EXISTS (
        SELECT 1 FROM reservation_rates rr 
        WHERE rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
    ) 
    AND rd.cancelled IS NULL;
    
    RAISE NOTICE 'Found % reservation details missing rates', affected_count;
    
    IF affected_count = 0 THEN
        RAISE NOTICE 'No records need fixing. Rolling back transaction.';
        ROLLBACK;
        RETURN;
    END IF;
END $$;

-- Step 2: Show sample of what will be affected (first 10 records)
SELECT 
    r.id AS reservation_id, 
    r.hotel_id, 
    r.ota_reservation_id,
    rd.id AS reservation_detail_id, 
    rd.price AS detail_price,
    rd.date
FROM reservations r 
JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id 
WHERE r.type = 'ota' 
AND (rd.plans_hotel_id IS NOT NULL OR rd.plans_global_id IS NOT NULL) 
AND NOT EXISTS (
    SELECT 1 FROM reservation_rates rr 
    WHERE rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
) 
AND rd.cancelled IS NULL
ORDER BY r.created_at DESC
LIMIT 10;

-- Step 3: Insert the missing rates
INSERT INTO reservation_rates (
    hotel_id,
    reservation_details_id,
    adjustment_type,
    adjustment_value,
    tax_type_id,
    tax_rate,
    price,
    include_in_cancel_fee,
    sales_category,
    created_by,
    updated_by,
    created_at    
)
SELECT 
    rd.hotel_id,
    rd.id AS reservation_details_id,
    'base_rate' AS adjustment_type,
    rd.price AS adjustment_value,
    3 AS tax_type_id,           -- Default tax type as per main.js
    0.1 AS tax_rate,            -- Default tax rate as per main.js  
    rd.price AS price,
    true AS include_in_cancel_fee,
    'accommodation' AS sales_category,
    1 AS created_by,            -- System/Admin user
    1 AS updated_by,            -- System/Admin user
    NOW() AS created_at
FROM reservations r 
JOIN reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id 
WHERE r.type = 'ota' 
AND (rd.plans_hotel_id IS NOT NULL OR rd.plans_global_id IS NOT NULL) 
AND NOT EXISTS (
    SELECT 1 FROM reservation_rates rr 
    WHERE rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
) 
AND rd.cancelled IS NULL;

-- Step 4: Show results
DO $$
DECLARE
    inserted_count INTEGER;
BEGIN
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    RAISE NOTICE 'Inserted % reservation rate records', inserted_count;
END $$;

-- Step 5: Verify the fix
SELECT 
    COUNT(*) AS rates_inserted,
    COUNT(DISTINCT r.id) AS reservations_affected,
    MIN(rr.created_at) AS first_rate_created,
    MAX(rr.created_at) AS last_rate_created
FROM reservation_rates rr
JOIN reservation_details rd ON rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
WHERE r.type = 'ota'
AND rr.adjustment_type = 'base_rate'
AND rr.created_by = 1
AND rr.created_at >= NOW() - INTERVAL '1 minute';

-- IMPORTANT: 
-- If you're satisfied with the results, run: COMMIT;
-- If something looks wrong, run: ROLLBACK;

-- Uncomment ONE of these lines:
-- COMMIT;    -- Use this to make changes permanent
-- ROLLBACK;  -- Use this to undo all changes