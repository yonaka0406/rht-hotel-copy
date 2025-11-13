-- Add include_in_cancel_fee to plan_rates table
ALTER TABLE plan_rates
ADD COLUMN include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE;

-- Batch update existing base_rate entries to set the new flag to TRUE
UPDATE plan_rates
SET include_in_cancel_fee = TRUE
WHERE adjustment_type = 'base_rate';