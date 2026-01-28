-- Migration: Apply accommodation tax to April 2026+ reservations
-- Purpose: Update existing reservation rates and prices to include accommodation tax
-- for non-monthly, non-OTA, non-web reservations from April 1, 2026 onwards
-- 
-- Background: Accommodation tax was added to plans_rates starting April 1, 2026,
-- but existing reservations need to be updated to reflect the tax-inclusive pricing.
-- This only applies to direct reservations (type = 'default' or 'employee'), 
-- excluding OTA and web bookings.

BEGIN;

-- Step 1: Create a temporary table to store the accommodation tax rates by plan
CREATE TEMP TABLE temp_accommodation_tax_rates AS
SELECT 
    pr.hotel_id,
    pr.plans_global_id,
    pr.plans_hotel_id,
    pr.adjustment_type,
    pr.adjustment_value,
    pr.tax_type_id,
    pr.tax_rate,
    pr.sales_category,
    pr.include_in_cancel_fee
FROM plans_rates pr
WHERE pr.date_start = '2026-04-01'
  AND pr.tax_rate = 0  -- Accommodation tax rates have tax_rate = 0
  AND pr.sales_category = 'other'  -- Accommodation tax is in 'other' category
  AND pr.adjustment_type = 'flat_fee';  -- Accommodation tax is flat_fee

-- Step 2: Insert new reservation_rates for accommodation tax
-- Only for non-monthly reservations that don't already have the tax
WITH monthly_plan_category AS (
    SELECT id FROM plan_package_categories WHERE name = 'マンスリー'
),
reservations_needing_tax AS (
    SELECT DISTINCT
        rd.id as reservation_detail_id,
        rd.hotel_id,
        rd.plans_global_id,
        rd.plans_hotel_id
    FROM reservation_details rd
    INNER JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
    WHERE rd.date >= '2026-04-01'
      AND rd.cancelled IS NULL
      AND rd.billable = TRUE
      AND r.type NOT IN ('ota', 'web')  -- Exclude OTA and web reservations
      AND (ph.plan_package_category_id IS NULL 
           OR ph.plan_package_category_id NOT IN (SELECT id FROM monthly_plan_category))
      -- Don't add if accommodation tax already exists
      AND NOT EXISTS (
          SELECT 1 FROM reservation_rates rr 
          WHERE rr.reservation_details_id = rd.id 
            AND rr.hotel_id = rd.hotel_id
            AND rr.sales_category = 'other'
      )
)
INSERT INTO reservation_rates (
    hotel_id,
    reservation_details_id,
    adjustment_type,
    adjustment_value,
    include_in_cancel_fee,
    tax_type_id,
    tax_rate,
    price,
    sales_category,
    created_by
)
SELECT 
    rnt.hotel_id,
    rnt.reservation_detail_id,
    tatr.adjustment_type,
    tatr.adjustment_value,
    tatr.include_in_cancel_fee,
    tatr.tax_type_id,
    tatr.tax_rate,
    tatr.adjustment_value as price,  -- For flat_fee, price = adjustment_value
    tatr.sales_category,
    1  -- System user
FROM reservations_needing_tax rnt
INNER JOIN temp_accommodation_tax_rates tatr
    ON rnt.hotel_id = tatr.hotel_id
    AND (
        (rnt.plans_global_id IS NOT NULL AND rnt.plans_global_id = tatr.plans_global_id)
        OR (rnt.plans_hotel_id IS NOT NULL AND rnt.plans_hotel_id = tatr.plans_hotel_id)
    );

-- Step 3: Update reservation_details prices
-- Add the accommodation tax amount to the existing price
WITH monthly_plan_category AS (
    SELECT id FROM plan_package_categories WHERE name = 'マンスリー'
),
details_with_new_tax AS (
    SELECT DISTINCT
        rd.id,
        rd.hotel_id,
        rd.price as current_price,
        tatr.adjustment_value as tax_amount,
        rd.price + tatr.adjustment_value as new_price
    FROM reservation_details rd
    INNER JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
    INNER JOIN temp_accommodation_tax_rates tatr
        ON rd.hotel_id = tatr.hotel_id
        AND (
            (rd.plans_global_id IS NOT NULL AND rd.plans_global_id = tatr.plans_global_id)
            OR (rd.plans_hotel_id IS NOT NULL AND rd.plans_hotel_id = tatr.plans_hotel_id)
        )
    WHERE rd.date >= '2026-04-01'
      AND rd.cancelled IS NULL
      AND rd.billable = TRUE
      AND r.type NOT IN ('ota', 'web')  -- Exclude OTA and web reservations
      AND (ph.plan_package_category_id IS NULL 
           OR ph.plan_package_category_id NOT IN (SELECT id FROM monthly_plan_category))
      -- Only update if accommodation tax was just added
      AND EXISTS (
          SELECT 1 FROM reservation_rates rr 
          WHERE rr.reservation_details_id = rd.id 
            AND rr.hotel_id = rd.hotel_id
            AND rr.sales_category = 'other'
            AND rr.created_by = 1
            AND rr.created_at >= NOW() - INTERVAL '1 minute'  -- Just created
      )
)
UPDATE reservation_details rd
SET 
    price = dwnt.new_price,
    updated_by = 1  -- System update
FROM details_with_new_tax dwnt
WHERE rd.id = dwnt.id
  AND rd.hotel_id = dwnt.hotel_id;

-- Step 4: Log the changes for audit purposes
DO $$
DECLARE
    rates_added INTEGER;
    details_updated INTEGER;
    total_tax_amount NUMERIC;
BEGIN
    -- Count newly added accommodation tax rates
    SELECT COUNT(*) INTO rates_added
    FROM reservation_rates rr
    INNER JOIN reservation_details rd ON rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
    INNER JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
    WHERE rd.date >= '2026-04-01'
      AND rr.sales_category = 'other'
      AND rr.created_by = 1
      AND rr.created_at >= NOW() - INTERVAL '1 minute'
      AND r.type NOT IN ('ota', 'web')
      AND (ph.plan_package_category_id IS NULL 
           OR ph.plan_package_category_id != (SELECT id FROM plan_package_categories WHERE name = 'マンスリー'));
    
    -- Count updated details
    SELECT COUNT(*) INTO details_updated
    FROM reservation_details rd
    INNER JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
    WHERE rd.date >= '2026-04-01'
      AND rd.cancelled IS NULL
      AND rd.billable = TRUE
      AND rd.updated_by = 1
      AND r.type NOT IN ('ota', 'web')
      AND (ph.plan_package_category_id IS NULL 
           OR ph.plan_package_category_id != (SELECT id FROM plan_package_categories WHERE name = 'マンスリー'))
      AND EXISTS (
          SELECT 1 FROM reservation_rates rr 
          WHERE rr.reservation_details_id = rd.id 
            AND rr.hotel_id = rd.hotel_id
            AND rr.sales_category = 'other'
      );
    
    -- Calculate total tax amount added
    SELECT COALESCE(SUM(rr.price), 0) INTO total_tax_amount
    FROM reservation_rates rr
    INNER JOIN reservation_details rd ON rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
    WHERE rr.sales_category = 'other'
      AND rr.created_by = 1
      AND rr.created_at >= NOW() - INTERVAL '1 minute';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Accommodation tax rates added: %', rates_added;
    RAISE NOTICE 'Reservation details updated: %', details_updated;
    RAISE NOTICE 'Total accommodation tax amount: ¥%', total_tax_amount;
    RAISE NOTICE '========================================';
END $$;

-- Clean up
DROP TABLE IF EXISTS temp_accommodation_tax_rates;

COMMIT;
