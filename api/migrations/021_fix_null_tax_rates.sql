BEGIN;

-- Fix NULL tax_rate in reservation_addons

-- Case 1: Reduced tax rate (8%) for 'Bento' (addons_global_id = 5)
-- Set tax_rate to 0.08 and tax_type_id to 2 (Reduced Tax)
UPDATE reservation_addons
SET tax_rate = 0.08, tax_type_id = 2
WHERE tax_rate IS NULL AND addons_global_id = 5;

-- Case 2: Standard tax rate (10%) for other addons
-- Set tax_rate to 0.10 and tax_type_id to 3 (Standard Tax)
UPDATE reservation_addons
SET tax_rate = 0.10, tax_type_id = 3
WHERE tax_rate IS NULL AND addons_global_id != 5;

COMMIT;
