-- Financial data

CREATE TABLE du_forecast (
   id SERIAL PRIMARY KEY,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   forecast_month DATE NOT NULL,
   accommodation_revenue NUMERIC(15, 2), -- '宿泊売上'
   operating_days INTEGER, -- '営業日数'
   available_room_nights INTEGER, -- '客室数'
   rooms_sold_nights INTEGER, -- '販売客室数'
   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   CONSTRAINT uq_hotel_month_forecast UNIQUE (hotel_id, forecast_month)
);
COMMENT ON TABLE du_forecast IS '施設ごと月ごとの売上と稼働率予算データ';
COMMENT ON COLUMN du_forecast.hotel_id IS '施設テーブルを参照する外部キー (hotels.id)';

CREATE TABLE du_accounting (
   id SERIAL PRIMARY KEY,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   accounting_month DATE NOT NULL,
   accommodation_revenue NUMERIC(15, 2), -- '宿泊売上'
   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   CONSTRAINT uq_hotel_month_accounting UNIQUE (hotel_id, accounting_month)
);
COMMENT ON TABLE du_accounting IS '施設ごと月ごとの売上会計データ';
