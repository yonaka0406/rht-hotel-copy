-- Update net_price calculation logic to: Total Amount - floor(Total Amount * tax_rate / (1 + tax_rate))
-- This ensures that tax is calculated first and truncated, then subtracted from the total.
-- Handled both decimal (0.1) and percentage (10) tax_rate formats.

BEGIN;

-- 1. reservation_addons
ALTER TABLE reservation_addons DROP COLUMN net_price;
ALTER TABLE reservation_addons ADD COLUMN net_price NUMERIC(12,0) GENERATED ALWAYS AS (
    price - FLOOR(price * (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END) / (1 + (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END)))
) STORED;

-- 2. reservation_rates
ALTER TABLE reservation_rates DROP COLUMN net_price;
ALTER TABLE reservation_rates ADD COLUMN net_price NUMERIC(12,0) GENERATED ALWAYS AS (
    price - FLOOR(price * (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END) / (1 + (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END)))
) STORED;

-- 3. plans_rates
ALTER TABLE plans_rates DROP COLUMN net_price;
ALTER TABLE plans_rates ADD COLUMN net_price NUMERIC(12,0) GENERATED ALWAYS AS (
     CASE
        WHEN adjustment_type IN ('base_rate', 'flat_fee')
        THEN adjustment_value - FLOOR(adjustment_value * (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END) / (1 + (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END)))
        ELSE NULL
     END
) STORED;

-- 4. addons_global
ALTER TABLE addons_global DROP COLUMN net_price;
ALTER TABLE addons_global ADD COLUMN net_price NUMERIC(12,0) GENERATED ALWAYS AS (
    price - FLOOR(price * (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END) / (1 + (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END)))
) STORED;

-- 5. addons_hotel
ALTER TABLE addons_hotel DROP COLUMN net_price;
ALTER TABLE addons_hotel ADD COLUMN net_price NUMERIC(12,0) GENERATED ALWAYS AS (
    price - FLOOR(price * (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END) / (1 + (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END)))
) STORED;

-- 6. plan_addons
ALTER TABLE plan_addons DROP COLUMN net_price;
ALTER TABLE plan_addons ADD COLUMN net_price NUMERIC(12,0) GENERATED ALWAYS AS (
    price - FLOOR(price * (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END) / (1 + (CASE WHEN tax_rate > 1 THEN tax_rate / 100.0 ELSE COALESCE(tax_rate, 0) END)))
) STORED;

COMMIT;
