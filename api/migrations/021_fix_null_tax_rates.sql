BEGIN;

-- Fix NULL tax_rate in reservation_addons
-- Default to 0 (0%) if tax_rate is missing to prevent invoice errors
UPDATE reservation_addons
SET tax_rate = 0
WHERE tax_rate IS NULL;

-- Fix NULL tax_rate in reservation_rates
-- Default to 0 (0%) if tax_rate is missing
UPDATE reservation_rates
SET tax_rate = 0
WHERE tax_rate IS NULL;

COMMIT;
