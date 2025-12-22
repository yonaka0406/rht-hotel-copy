-- UP: Add plan category references to financial tables

-- Add plan category columns to du_forecast
ALTER TABLE du_forecast 
ADD COLUMN plan_type_category_id INT REFERENCES plan_type_categories(id),
ADD COLUMN plan_package_category_id INT REFERENCES plan_package_categories(id),
ADD COLUMN non_accommodation_revenue NUMERIC(15, 2),
ADD COLUMN non_accommodation_sold_rooms INTEGER;

-- Add plan category columns to du_accounting
ALTER TABLE du_accounting 
ADD COLUMN plan_type_category_id INT REFERENCES plan_type_categories(id),
ADD COLUMN plan_package_category_id INT REFERENCES plan_package_categories(id),
ADD COLUMN non_accommodation_revenue NUMERIC(15, 2),
ADD COLUMN non_accommodation_sold_rooms INTEGER;

-- Update existing records in du_forecast with category IDs from plans_global
UPDATE du_forecast df
SET 
    plan_type_category_id = (
        SELECT ptc.id 
        FROM plan_type_categories ptc 
        JOIN plans_global pg ON pg.name = ptc.name 
        WHERE pg.id = df.plan_global_id
    ),
    plan_package_category_id = 1  -- Default to 'スタンダード' package category
WHERE df.plan_global_id IS NOT NULL;

-- Update existing records in du_accounting with category IDs from plans_global
UPDATE du_accounting da
SET 
    plan_type_category_id = (
        SELECT ptc.id 
        FROM plan_type_categories ptc 
        JOIN plans_global pg ON pg.name = ptc.name 
        WHERE pg.id = da.plan_global_id
    ),
    plan_package_category_id = 1  -- Default to 'スタンダード' package category
WHERE da.plan_global_id IS NOT NULL;

-- Add comments for the new columns
COMMENT ON COLUMN du_forecast.plan_type_category_id IS 'プランタイプカテゴリーID (plan_type_categories.id)';
COMMENT ON COLUMN du_forecast.plan_package_category_id IS 'プランパッケージカテゴリーID (plan_package_categories.id)';
COMMENT ON COLUMN du_forecast.non_accommodation_revenue IS '宿泊外売上';
COMMENT ON COLUMN du_forecast.non_accommodation_sold_rooms IS '宿泊外販売客室数';
COMMENT ON COLUMN du_accounting.plan_type_category_id IS 'プランタイプカテゴリーID (plan_type_categories.id)';
COMMENT ON COLUMN du_accounting.plan_package_category_id IS 'プランパッケージカテゴリーID (plan_package_categories.id)';
COMMENT ON COLUMN du_accounting.non_accommodation_revenue IS '宿泊外売上';
COMMENT ON COLUMN du_accounting.non_accommodation_sold_rooms IS '宿泊外販売客室数';

-- Create indexes for better query performance
CREATE INDEX idx_du_forecast_plan_type_category ON du_forecast(plan_type_category_id);
CREATE INDEX idx_du_forecast_plan_package_category ON du_forecast(plan_package_category_id);
CREATE INDEX idx_du_accounting_plan_type_category ON du_accounting(plan_type_category_id);
CREATE INDEX idx_du_accounting_plan_package_category ON du_accounting(plan_package_category_id);

-- Drop the old unique constraints that reference plan_global_id
ALTER TABLE du_forecast DROP CONSTRAINT uq_hotel_month_plan_forecast;
ALTER TABLE du_accounting DROP CONSTRAINT uq_hotel_month_plan_accounting;

-- Drop the old plan_global_id columns after migrating data to categories
ALTER TABLE du_forecast DROP COLUMN plan_global_id;
ALTER TABLE du_accounting DROP COLUMN plan_global_id;

-- Add new unique constraints using category IDs
ALTER TABLE du_forecast ADD CONSTRAINT uq_hotel_month_categories_forecast 
    UNIQUE (hotel_id, forecast_month, plan_type_category_id, plan_package_category_id);

ALTER TABLE du_accounting ADD CONSTRAINT uq_hotel_month_categories_accounting 
    UNIQUE (hotel_id, accounting_month, plan_type_category_id, plan_package_category_id);