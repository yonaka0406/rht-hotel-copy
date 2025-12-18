-- Migration to update daily_plan_metrics table to use plan categories instead of plan IDs
-- and add net price columns

-- Add new category columns
ALTER TABLE daily_plan_metrics 
ADD COLUMN plan_type_category_id INT REFERENCES plan_type_categories(id) ON DELETE SET NULL,
ADD COLUMN plan_package_category_id INT REFERENCES plan_package_categories(id) ON DELETE SET NULL;

-- Add net price columns
ALTER TABLE daily_plan_metrics 
ADD COLUMN accommodation_net_sales BIGINT DEFAULT 0,
ADD COLUMN other_net_sales BIGINT DEFAULT 0,
ADD COLUMN accommodation_net_sales_cancelled BIGINT DEFAULT 0,
ADD COLUMN other_net_sales_cancelled BIGINT DEFAULT 0;

-- Add comments for new columns
COMMENT ON COLUMN daily_plan_metrics.plan_type_category_id IS 'Plan type category ID (e.g., 素泊まり, 2食, etc.)';
COMMENT ON COLUMN daily_plan_metrics.plan_package_category_id IS 'Plan package category ID (e.g., スタンダード, プレミアム, etc.)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_net_sales IS 'Net sales from accommodation rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_net_sales IS 'Net sales from other (non-accommodation) rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_net_sales_cancelled IS 'Net sales from accommodation rates and addons (cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_net_sales_cancelled IS 'Net sales from other (non-accommodation) rates and addons (cancelled)';

-- Migrate existing data to use categories from plans_hotel
UPDATE daily_plan_metrics dpm
SET 
    plan_type_category_id = ph.plan_type_category_id,
    plan_package_category_id = ph.plan_package_category_id
FROM plans_hotel ph
WHERE dpm.plans_hotel_id = ph.id 
AND dpm.hotel_id = ph.hotel_id
AND ph.plan_type_category_id IS NOT NULL 
AND ph.plan_package_category_id IS NOT NULL;

-- For records that don't have hotel plans but have global plans, we'll leave categories as NULL
-- since global plans don't have categories in our current structure

-- Drop the old unique constraint
ALTER TABLE daily_plan_metrics 
DROP CONSTRAINT daily_plan_metrics_metric_date_month_hotel_id_plans_global_i_key;

-- Add new unique constraint with categories
ALTER TABLE daily_plan_metrics 
ADD CONSTRAINT daily_plan_metrics_unique_category 
UNIQUE (metric_date, month, hotel_id, plan_type_category_id, plan_package_category_id, plans_global_id, plans_hotel_id);

-- Note: We keep the old plan ID columns for now to maintain backward compatibility
-- They can be dropped in a future migration once all systems are updated