-- UP: Add Category Columns to daily_plan_metrics and resolve duplicate key conflicts
DO $$
DECLARE
    rec RECORD;
    target_metric_id INT;
    new_hotel_id INT;
BEGIN
    -- Loop through each metric that has a null plans_hotel_id but a valid plans_global_id
    FOR rec IN 
        SELECT * FROM daily_plan_metrics 
        WHERE plans_hotel_id IS NULL AND plans_global_id IS NOT NULL
    LOOP
        -- Find the corresponding plans_hotel.id
        SELECT id INTO new_hotel_id
        FROM plans_hotel ph
        WHERE ph.hotel_id = rec.hotel_id
          AND ph.plans_global_id = rec.plans_global_id
        ORDER BY ph.id
        LIMIT 1;

        IF new_hotel_id IS NOT NULL THEN
            -- Check if a conflicting record already exists
            SELECT id INTO target_metric_id
            FROM daily_plan_metrics
            WHERE metric_date = rec.metric_date
              AND month = rec.month
              AND hotel_id = rec.hotel_id
              AND plans_global_id = rec.plans_global_id
              AND plans_hotel_id = new_hotel_id;

            IF target_metric_id IS NOT NULL THEN
                -- Conflict found: aggregate metrics and delete the source record
                UPDATE daily_plan_metrics
                SET 
                    confirmed_stays = confirmed_stays + rec.confirmed_stays,
                    pending_stays = pending_stays + rec.pending_stays,
                    in_talks_stays = in_talks_stays + rec.in_talks_stays,
                    cancelled_stays = cancelled_stays + rec.cancelled_stays,
                    non_billable_cancelled_stays = non_billable_cancelled_stays + rec.non_billable_cancelled_stays,
                    employee_stays = employee_stays + rec.employee_stays,
                    normal_sales = normal_sales + rec.normal_sales,
                    cancellation_sales = cancellation_sales + rec.cancellation_sales,
                    accommodation_sales = COALESCE(accommodation_sales, 0) + COALESCE(rec.accommodation_sales, 0),
                    other_sales = COALESCE(other_sales, 0) + COALESCE(rec.other_sales, 0),
                    accommodation_sales_cancelled = COALESCE(accommodation_sales_cancelled, 0) + COALESCE(rec.accommodation_sales_cancelled, 0),
                    other_sales_cancelled = COALESCE(other_sales_cancelled, 0) + COALESCE(rec.other_sales_cancelled, 0),
                    non_accommodation_stays = COALESCE(non_accommodation_stays, 0) + COALESCE(rec.non_accommodation_stays, 0)
                WHERE id = target_metric_id;

                DELETE FROM daily_plan_metrics WHERE id = rec.id;
            ELSE
                -- No conflict: just update the plans_hotel_id
                UPDATE daily_plan_metrics
                SET plans_hotel_id = new_hotel_id
                WHERE id = rec.id;
            END IF;
        END IF;
    END LOOP;
END $$;


-- Add category columns to daily_plan_metrics
ALTER TABLE daily_plan_metrics
ADD COLUMN plan_type_category_id INT REFERENCES plan_type_categories(id) ON DELETE SET NULL;
ALTER TABLE daily_plan_metrics
ADD COLUMN plan_package_category_id INT REFERENCES plan_package_categories(id) ON DELETE SET NULL;

-- Create index for category-based queries
CREATE INDEX idx_daily_plan_metrics_type_category ON daily_plan_metrics(hotel_id, plan_type_category_id);
CREATE INDEX idx_daily_plan_metrics_package_category ON daily_plan_metrics(hotel_id, plan_package_category_id);

-- Backfill existing data from plans_hotel
UPDATE daily_plan_metrics dpm
SET 
    plan_type_category_id = ph.plan_type_category_id,
    plan_package_category_id = ph.plan_package_category_id
FROM plans_hotel ph
WHERE dpm.plans_hotel_id = ph.id 
  AND dpm.hotel_id = ph.hotel_id;

-- VERIFICATION QUERIES: Run these to verify migration success
/*
-- 1. Check that plans_hotel_id was populated correctly:
SELECT COUNT(*) as total_metrics,
       COUNT(plans_hotel_id) as with_hotel_id,
       COUNT(plans_global_id) as with_global_id
FROM daily_plan_metrics;

-- 2. Check that category columns were populated:
SELECT COUNT(*) as total_metrics,
       COUNT(plan_type_category_id) as with_type_category,
       COUNT(plan_package_category_id) as with_package_category
FROM daily_plan_metrics;

-- 3. Verify no orphaned records (should be 0):
SELECT COUNT(*) as orphaned_records
FROM daily_plan_metrics dpm
WHERE dpm.plans_hotel_id IS NOT NULL 
  AND NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.id = dpm.plans_hotel_id 
      AND ph.hotel_id = dpm.hotel_id
  );

-- 4. Sample the data to see categories:
SELECT dpm.hotel_id, 
       dpm.metric_date,
       ph.name as plan_name,
       ptc.name as type_category,
       ppc.name as package_category
FROM daily_plan_metrics dpm
JOIN plans_hotel ph ON dpm.plans_hotel_id = ph.id AND dpm.hotel_id = ph.hotel_id
LEFT JOIN plan_type_categories ptc ON dpm.plan_type_category_id = ptc.id
LEFT JOIN plan_package_categories ppc ON dpm.plan_package_category_id = ppc.id
LIMIT 10;
*/

-- DOWN: Remove category columns from daily_plan_metrics
-- Note: The data merging in the UP script is irreversible.
--ALTER TABLE daily_plan_metrics DROP COLUMN IF EXISTS plan_type_category_id;
--ALTER TABLE daily_plan_metrics DROP COLUMN IF EXISTS plan_package_category_id;
--DROP INDEX IF EXISTS idx_daily_plan_metrics_type_category;
--DROP INDEX IF EXISTS idx_daily_plan_metrics_package_category;
