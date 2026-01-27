-- Migration to add updated_at and updated_by to du_forecast_entries
ALTER TABLE du_forecast_entries 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES users(id);

COMMENT ON COLUMN du_forecast_entries.updated_at IS 'Timestamp of the last update';
COMMENT ON COLUMN du_forecast_entries.updated_by IS 'User ID of the last person to update the entry';
