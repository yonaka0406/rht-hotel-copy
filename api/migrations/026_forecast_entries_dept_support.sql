-- Migration to support non-hotel departments in budget entries (du_forecast_entries)

-- 1. Remove NOT NULL constraint from hotel_id
ALTER TABLE du_forecast_entries ALTER COLUMN hotel_id DROP NOT NULL;

-- 2. Add department_name column for linking with acc_departments by name
-- This allows entries for "WH運営", "WH販売", etc., which might not be tied to a specific hotel_id
ALTER TABLE du_forecast_entries ADD COLUMN department_name VARCHAR(24);

-- 3. Update the unique constraint to include department_name and handle NULL hotel_id
-- We drop the old constraint first
ALTER TABLE du_forecast_entries DROP CONSTRAINT uq_hotel_month_account_sub_account_forecast;

-- Create a new unique constraint that handles both cases:
-- a) Hotel-specific entries (hotel_id set, department_name optional or matches hotel's dept)
-- b) Non-hotel/Global entries (hotel_id NULL, department_name set)
ALTER TABLE du_forecast_entries 
    ADD CONSTRAINT uq_hotel_dept_month_account_sub_forecast 
    UNIQUE NULLS NOT DISTINCT (hotel_id, department_name, month, account_name, sub_account_name);

-- 4. Add index for performance on department_name lookups
CREATE INDEX idx_du_forecast_entries_dept_name ON du_forecast_entries(department_name);

-- 5. Update index for combined lookups
DROP INDEX IF EXISTS idx_du_forecast_entries_hotel_month_name_sub;
CREATE INDEX idx_du_forecast_entries_hotel_dept_month_name_sub 
ON du_forecast_entries(COALESCE(hotel_id, 0), COALESCE(department_name, ''), month, account_name, COALESCE(sub_account_name, ''));

-- Add comments
COMMENT ON COLUMN du_forecast_entries.hotel_id IS 'Hotel ID (optional for global/office departments)';
COMMENT ON COLUMN du_forecast_entries.department_name IS 'Accounting department name (部門) as used in Yayoi exports/imports';
