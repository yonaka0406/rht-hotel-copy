-- Migration: 028_utility_details.sql
-- Description: Table for detailed utility bill tracking (Electricity, Water, Gas)

CREATE TABLE acc_utility_details (
    id SERIAL PRIMARY KEY,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    month DATE NOT NULL,
    transaction_date DATE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    sub_account_name VARCHAR(100) NOT NULL,
    quantity DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    average_price DECIMAL(15, 2) GENERATED ALWAYS AS (CASE WHEN quantity = 0 THEN 0 ELSE total_value / quantity END) STORED,
    provider_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX idx_acc_utility_details_hotel_month ON acc_utility_details (hotel_id, month);
CREATE INDEX idx_acc_utility_details_lookup ON acc_utility_details (hotel_id, transaction_date, sub_account_name);

COMMENT ON TABLE acc_utility_details IS 'Detailed tracking of utility bills for Budget-Actual comparison and unit price analysis';
