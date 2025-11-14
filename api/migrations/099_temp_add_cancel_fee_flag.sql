-- Add include_in_cancel_fee to plans_rates table
ALTER TABLE plans_rates
ADD COLUMN include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment to plan_rates table
ALTER TABLE plans_rates
ADD COLUMN comment TEXT;

-- Batch update existing base_rate entries to set the new flag to TRUE
UPDATE plans_rates
SET include_in_cancel_fee = TRUE
WHERE adjustment_type IN('base_rate','percentage');

-- Add include_in_cancel_fee to reservation_rates table
ALTER TABLE reservation_rates
ADD COLUMN include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE;

-- Disable the logging trigger before the batch update
ALTER TABLE reservation_rates DISABLE TRIGGER log_reservation_rates_trigger;

-- Batch update existing base_rate entries to set the new flag to TRUE
UPDATE reservation_rates
SET include_in_cancel_fee = TRUE
WHERE adjustment_type  IN('base_rate','percentage');

-- Enable the logging trigger after the batch update
ALTER TABLE reservation_rates ENABLE TRIGGER log_reservation_rates_trigger;