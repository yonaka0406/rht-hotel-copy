-- Rename acc_yayoi_export_data to acc_yayoi_data
ALTER TABLE acc_yayoi_export_data RENAME TO acc_yayoi_data;

-- Rename indexes for consistency
ALTER INDEX idx_acc_yayoi_export_date RENAME TO idx_acc_yayoi_date;
ALTER INDEX idx_acc_yayoi_export_batch RENAME TO idx_acc_yayoi_batch;

-- Add a column to distinguish between system-generated (export) and user-imported data if needed,
-- but for now we'll just use it as is.
ALTER TABLE acc_yayoi_data ADD COLUMN IF NOT EXISTS import_batch_id UUID;
ALTER TABLE acc_yayoi_data ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ;
ALTER TABLE acc_yayoi_data ADD COLUMN IF NOT EXISTS imported_by INT REFERENCES users(id);

-- Make hotel_id optional since imports might not have a direct mapping immediately
ALTER TABLE acc_yayoi_data ALTER COLUMN hotel_id DROP NOT NULL;
