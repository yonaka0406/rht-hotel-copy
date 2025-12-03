-- Add is_accommodation column to reservation_details
-- Default to TRUE to assume existing records are accommodation (standard hotel behavior)
ALTER TABLE reservation_details 
ADD COLUMN IF NOT EXISTS is_accommodation BOOLEAN DEFAULT TRUE;

-- Add sales category columns to daily_plan_metrics
ALTER TABLE daily_plan_metrics
ADD COLUMN IF NOT EXISTS accommodation_sales BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_sales BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS accommodation_sales_cancelled BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS other_sales_cancelled BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS non_accommodation_stays INT DEFAULT 0;

-- Add comments to explain the new columns
COMMENT ON COLUMN daily_plan_metrics.non_accommodation_stays IS 'Count of confirmed non-accommodation reservation details (e.g., parking-only, meal-only reservations)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_sales IS 'Sales from accommodation rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_sales IS 'Sales from other (non-accommodation) rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_sales_cancelled IS 'Sales from accommodation rates and addons (cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_sales_cancelled IS 'Sales from other (non-accommodation) rates and addons (cancelled)';

-- Optional: Update based on existing rates immediately (if desired, though application logic usually handles this on next save)
-- UPDATE reservation_details rd
-- SET is_accommodation = EXISTS (
--    SELECT 1 
--    FROM reservation_rates rr 
--    WHERE rr.reservation_details_id = rd.id 
--    AND rr.sales_category = 'accommodation'
-- );
