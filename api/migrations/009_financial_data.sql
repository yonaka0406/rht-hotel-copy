-- Financial data

CREATE TABLE IF NOT EXISTS du_forecast (
   id SERIAL PRIMARY KEY,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   forecast_month DATE NOT NULL,   
   plan_type_category_id INT REFERENCES plan_type_categories(id),
   plan_package_category_id INT REFERENCES plan_package_categories(id),
   accommodation_revenue NUMERIC(15, 2), -- '宿泊売上'
   non_accommodation_revenue NUMERIC(15, 2), -- '宿泊外売上'
   operating_days INTEGER, -- '営業日数'
   available_room_nights INTEGER, -- '客室数'
   rooms_sold_nights INTEGER, -- '販売客室数'
   non_accommodation_sold_rooms INTEGER, -- '宿泊外販売客室数'
   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,   
   created_by INT REFERENCES users(id),
   CONSTRAINT uq_hotel_month_categories_forecast UNIQUE (hotel_id, forecast_month, plan_type_category_id, plan_package_category_id)
);
COMMENT ON TABLE du_forecast IS '施設ごと月ごとの売上と稼働率予算データ';
COMMENT ON COLUMN du_forecast.hotel_id IS '施設テーブルを参照する外部キー (hotels.id)';

-- Add comments for the new columns
COMMENT ON COLUMN du_forecast.plan_type_category_id IS 'プランタイプカテゴリーID (plan_type_categories.id)';
COMMENT ON COLUMN du_forecast.plan_package_category_id IS 'プランパッケージカテゴリーID (plan_package_categories.id)';
COMMENT ON COLUMN du_forecast.non_accommodation_revenue IS '宿泊外売上';
COMMENT ON COLUMN du_forecast.non_accommodation_sold_rooms IS '宿泊外販売客室数';

CREATE TABLE IF NOT EXISTS du_accounting (
   id SERIAL PRIMARY KEY,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   accounting_month DATE NOT NULL,   
   plan_type_category_id INT REFERENCES plan_type_categories(id),
   plan_package_category_id INT REFERENCES plan_package_categories(id),   
   accommodation_revenue NUMERIC(15, 2), -- '宿泊売上'
   non_accommodation_revenue NUMERIC(15, 2), -- '宿泊外売上'
   operating_days INTEGER, -- '営業日数'
   available_room_nights INTEGER, -- '客室数'
   rooms_sold_nights INTEGER, -- '販売客室数'
   non_accommodation_sold_rooms INTEGER, -- '宿泊外販売客室数'
   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,   
   created_by INT REFERENCES users(id),
   CONSTRAINT uq_hotel_month_categories_accounting UNIQUE (hotel_id, accounting_month, plan_type_category_id, plan_package_category_id)
);
COMMENT ON TABLE du_accounting IS '施設ごと月ごとの売上会計データ';
COMMENT ON COLUMN du_accounting.plan_type_category_id IS 'プランタイプカテゴリーID (plan_type_categories.id)';
COMMENT ON COLUMN du_accounting.plan_package_category_id IS 'プランパッケージカテゴリーID (plan_package_categories.id)';
COMMENT ON COLUMN du_accounting.non_accommodation_revenue IS '宿泊外売上';
COMMENT ON COLUMN du_accounting.non_accommodation_sold_rooms IS '宿泊外販売客室数';

-- 1. Budget Entries (Forecast) - Granular
CREATE TABLE IF NOT EXISTS du_forecast_entries (
    id SERIAL PRIMARY KEY,
    hotel_id INT NOT NULL REFERENCES hotels(id),
    month DATE NOT NULL, -- First day of the month
    account_code_id INT, -- Logical/FK link to acc_account_codes.id
    account_name VARCHAR(100) NOT NULL, -- Logical link to acc_account_codes.name
    sub_account_id INT, -- Physical FK link to acc_sub_accounts.id
    sub_account_name VARCHAR(100), -- Logical link for imports/paste
    amount NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    CONSTRAINT uq_hotel_month_account_sub_account_forecast UNIQUE (hotel_id, month, account_name, sub_account_name)
);

COMMENT ON TABLE du_forecast_entries IS 'Account-level budget data (Forecast), identified by account_name';
COMMENT ON COLUMN du_forecast_entries.updated_at IS 'Timestamp of the last update';
COMMENT ON COLUMN du_forecast_entries.updated_by IS 'User ID of the last person to update the entry';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_du_forecast_plan_type_category ON du_forecast(plan_type_category_id);
CREATE INDEX IF NOT EXISTS idx_du_forecast_plan_package_category ON du_forecast(plan_package_category_id);
CREATE INDEX IF NOT EXISTS idx_du_accounting_plan_type_category ON du_accounting(plan_type_category_id);
CREATE INDEX IF NOT EXISTS idx_du_accounting_plan_package_category ON du_accounting(plan_package_category_id);

CREATE INDEX IF NOT EXISTS idx_du_forecast_entries_hotel_month_name_sub ON du_forecast_entries(hotel_id, month, account_name, sub_account_name);
