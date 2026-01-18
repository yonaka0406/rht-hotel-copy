-- Migration 024: Update acc_accounting_mappings target_type constraint
-- Added 'cancellation' to the allowed target types

ALTER TABLE acc_accounting_mappings 
DROP CONSTRAINT acc_accounting_mappings_target_type_check;

ALTER TABLE acc_accounting_mappings 
ADD CONSTRAINT acc_accounting_mappings_target_type_check 
CHECK (target_type IN ('plan_hotel', 'plan_type_category', 'plan_package_category', 'addon_hotel', 'addon_global', 'cancellation'));
