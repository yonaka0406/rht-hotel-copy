-- Add sales_category to plans_rates
ALTER TABLE plans_rates
ADD COLUMN sales_category TEXT CHECK (sales_category IN ('accommodation', 'other')) DEFAULT 'accommodation';

-- Add sales_category to plan_addons
ALTER TABLE plan_addons
ADD COLUMN sales_category TEXT CHECK (sales_category IN ('accommodation', 'other')) DEFAULT 'accommodation';

-- Add sales_category to reservation_rates
ALTER TABLE reservation_rates
ADD COLUMN sales_category TEXT CHECK (sales_category IN ('accommodation', 'other')) DEFAULT 'accommodation';

-- Add sales_category to reservation_addons
ALTER TABLE reservation_addons
ADD COLUMN sales_category TEXT CHECK (sales_category IN ('accommodation', 'other')) DEFAULT 'accommodation';

-- Add split sales columns to daily_plan_metrics
ALTER TABLE daily_plan_metrics
ADD COLUMN accommodation_sales DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN other_sales DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN accommodation_sales_cancelled DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN other_sales_cancelled DECIMAL(12, 2) DEFAULT 0;
