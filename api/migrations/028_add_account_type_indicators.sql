-- Migration 028: Add account type indicators (debit/credit)

-- 1. Add default_account_type to acc_management_groups
ALTER TABLE acc_management_groups ADD COLUMN default_account_type VARCHAR(10) CHECK (default_account_type IN ('debit', 'credit'));

-- 2. Add account_type to acc_account_codes
ALTER TABLE acc_account_codes ADD COLUMN account_type VARCHAR(10) CHECK (account_type IN ('debit', 'credit'));

-- 3. Seed defaults for management groups
-- 1: 売上高 (Credit)
-- 6: 営業外収入 (Credit)
-- 8: 特別利益 (Credit)
UPDATE acc_management_groups SET default_account_type = 'credit' WHERE id IN (1, 6, 8);
UPDATE acc_management_groups SET default_account_type = 'debit' WHERE id NOT IN (1, 6, 8);

-- 4. Update existing account codes based on their management group
UPDATE acc_account_codes ac
SET account_type = mg.default_account_type
FROM acc_management_groups mg
WHERE ac.management_group_id = mg.id;

-- 5. Set default for accounts without a management group (fallback to debit or assets/liabilities logic if possible)
-- For now, let's just make sure we don't have NULLs for active codes
UPDATE acc_account_codes SET account_type = 'debit' WHERE account_type IS NULL;

-- 6. Add comments
COMMENT ON COLUMN acc_management_groups.default_account_type IS 'Default account type (debit/credit) for accounts in this group';
COMMENT ON COLUMN acc_account_codes.account_type IS 'Account type (debit/credit) determining if the balance is naturally positive or negative in reporting';
