CREATE TABLE daily_plan_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL,
    month DATE NOT NULL, -- The month being projected
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE SET NULL,
    plans_hotel_id INT,
    plan_type_category_id INT REFERENCES plan_type_categories(id) ON DELETE SET NULL,
    plan_package_category_id INT REFERENCES plan_package_categories(id) ON DELETE SET NULL,
    plan_name TEXT NOT NULL,
    confirmed_stays INT NOT NULL DEFAULT 0,
    pending_stays INT NOT NULL DEFAULT 0,
    in_talks_stays INT NOT NULL DEFAULT 0,
    cancelled_stays INT NOT NULL DEFAULT 0,
    non_billable_cancelled_stays INT NOT NULL DEFAULT 0,
    employee_stays INT NOT NULL DEFAULT 0,
    normal_sales BIGINT NOT NULL DEFAULT 0,
    cancellation_sales BIGINT NOT NULL DEFAULT 0,
    accommodation_sales BIGINT DEFAULT 0,
    other_sales BIGINT DEFAULT 0,
    accommodation_net_sales BIGINT DEFAULT 0,
    other_net_sales BIGINT DEFAULT 0,
    accommodation_sales_cancelled BIGINT DEFAULT 0,
    other_sales_cancelled BIGINT DEFAULT 0,
    accommodation_net_sales_cancelled BIGINT DEFAULT 0,
    other_net_sales_cancelled BIGINT DEFAULT 0,
    non_accommodation_stays INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE,
    UNIQUE (metric_date, month, hotel_id, plan_type_category_id, plan_package_category_id, plans_global_id, plans_hotel_id)
);

-- Add comments to explain the new columns
COMMENT ON COLUMN daily_plan_metrics.plan_type_category_id IS 'Plan type category ID (e.g., 素泊まり, 2食, etc.)';
COMMENT ON COLUMN daily_plan_metrics.plan_package_category_id IS 'Plan package category ID (e.g., スタンダード, プレミアム, etc.)';
COMMENT ON COLUMN daily_plan_metrics.non_accommodation_stays IS 'Count of confirmed non-accommodation reservation details (e.g., parking-only, meal-only reservations)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_sales IS 'Sales from accommodation rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_sales IS 'Sales from other (non-accommodation) rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_net_sales IS 'Net sales from accommodation rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_net_sales IS 'Net sales from other (non-accommodation) rates and addons (confirmed, not cancelled)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_sales_cancelled IS 'Sales from accommodation rates and addons (cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_sales_cancelled IS 'Sales from other (non-accommodation) rates and addons (cancelled)';
COMMENT ON COLUMN daily_plan_metrics.accommodation_net_sales_cancelled IS 'Net sales from accommodation rates and addons (cancelled)';
COMMENT ON COLUMN daily_plan_metrics.other_net_sales_cancelled IS 'Net sales from other (non-accommodation) rates and addons (cancelled)';

-- Optional: Update based on existing rates immediately (if desired, though application logic usually handles this on next save)
-- UPDATE reservation_details rd
-- SET is_accommodation = EXISTS (
--    SELECT 1 
--    FROM reservation_rates rr 
--    WHERE rr.reservation_details_id = rd.id 
--    AND rr.sales_category = 'accommodation'
-- );