-- 026_add_sub_accounts_table_only.sql
-- Add sub-accounts table without dropping existing data

-- Create Sub-Accounts Master Table
-- Defines sub-accounts (補助科目) that can be used with specific account codes
CREATE TABLE IF NOT EXISTS acc_sub_accounts (
    id SERIAL PRIMARY KEY,
    account_code_id INT NOT NULL REFERENCES acc_account_codes(id) ON DELETE CASCADE,
    code VARCHAR(50), -- Optional: Sub-account code for structured identification
    name VARCHAR(100) NOT NULL, -- Sub-account name (e.g., "ガス", "水道", "電気" for utilities)
    description TEXT, -- Optional: Detailed description
    is_active BOOLEAN DEFAULT true,
    display_order INT, -- For ordering sub-accounts within an account
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    
    -- Ensure unique sub-account names per account code
    UNIQUE (account_code_id, name),
    -- If code is provided, ensure it's unique per account
    UNIQUE (account_code_id, code)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_acc_sub_accounts_account_code ON acc_sub_accounts(account_code_id);
CREATE INDEX IF NOT EXISTS idx_acc_sub_accounts_name ON acc_sub_accounts(name);
CREATE INDEX IF NOT EXISTS idx_acc_sub_accounts_active ON acc_sub_accounts(account_code_id, is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE acc_sub_accounts IS 'Sub-accounts (補助科目) for detailed account tracking';
COMMENT ON COLUMN acc_sub_accounts.code IS 'Optional structured code for the sub-account';
COMMENT ON COLUMN acc_sub_accounts.name IS 'Sub-account name as used in Yayoi exports/imports';
COMMENT ON COLUMN acc_sub_accounts.display_order IS 'Display order within the parent account';

-- Create a view to easily see account codes with their sub-accounts
CREATE OR REPLACE VIEW acc_accounts_with_sub_accounts AS
SELECT 
    ac.id as account_id,
    ac.code as account_code,
    ac.name as account_name,
    ac.category1,
    ac.category2,
    ac.category3,
    ac.category4,
    asa.id as sub_account_id,
    asa.code as sub_account_code,
    asa.name as sub_account_name,
    asa.description as sub_account_description,
    asa.display_order as sub_account_display_order,
    asa.is_active as sub_account_is_active
FROM acc_account_codes ac
LEFT JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id
ORDER BY ac.code, asa.display_order, asa.name;

COMMENT ON VIEW acc_accounts_with_sub_accounts IS 'Combined view of account codes and their sub-accounts';

-- Add function to get or create sub-accounts dynamically
-- This is useful for importing data where sub-accounts might not exist yet
CREATE OR REPLACE FUNCTION get_or_create_sub_account(
    p_account_name VARCHAR(100),
    p_sub_account_name VARCHAR(100),
    p_created_by INT DEFAULT 1
) RETURNS INT AS $$
DECLARE
    v_account_id INT;
    v_sub_account_id INT;
    v_max_display_order INT;
BEGIN
    -- Get the account code ID
    SELECT id INTO v_account_id 
    FROM acc_account_codes 
    WHERE name = p_account_name;
    
    IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'Account code not found: %', p_account_name;
    END IF;
    
    -- Check if sub-account already exists
    SELECT id INTO v_sub_account_id
    FROM acc_sub_accounts
    WHERE account_code_id = v_account_id AND name = p_sub_account_name;
    
    -- If not found, create it
    IF v_sub_account_id IS NULL THEN
        -- Get the next display order
        SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_max_display_order
        FROM acc_sub_accounts
        WHERE account_code_id = v_account_id;
        
        -- Insert new sub-account
        INSERT INTO acc_sub_accounts (account_code_id, name, display_order, created_by)
        VALUES (v_account_id, p_sub_account_name, v_max_display_order, p_created_by)
        RETURNING id INTO v_sub_account_id;
    END IF;
    
    RETURN v_sub_account_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_sub_account IS 'Get existing or create new sub-account for an account code';

-- Update the monthly summary view to include sub-account information
-- Drop and recreate the view with sub-account details
DROP VIEW IF EXISTS acc_monthly_account_summary CASCADE;

CREATE VIEW acc_monthly_account_summary AS
WITH adjusted_data AS (
    -- Debit legs (negated)
    SELECT 
        transaction_date, 
        debit_account_code as account_name, 
        debit_sub_account as sub_account, 
        debit_department as department, 
        debit_tax_class as tax_class, 
        -(debit_amount) as amount,
        -(CASE 
            WHEN debit_tax_class LIKE '%控不%' THEN 0 
            WHEN debit_tax_class LIKE '%80%' THEN ROUND(debit_tax_amount * 0.8) 
            ELSE debit_tax_amount 
        END) as tax_amount
    FROM acc_yayoi_data
    WHERE debit_account_code IS NOT NULL AND debit_account_code <> ''

    UNION ALL

    -- Credit legs (positive)
    SELECT 
        transaction_date, 
        credit_account_code as account_name, 
        credit_sub_account as sub_account, 
        credit_department as department, 
        credit_tax_class as tax_class, 
        credit_amount as amount,
        (CASE 
            WHEN credit_tax_class LIKE '%控不%' THEN 0 
            WHEN credit_tax_class LIKE '%80%' THEN ROUND(credit_tax_amount * 0.8) 
            ELSE credit_tax_amount 
        END) as tax_amount
    FROM acc_yayoi_data
    WHERE credit_account_code IS NOT NULL AND credit_account_code <> ''
),
grouped_data AS (
    SELECT 
        DATE_TRUNC('month', transaction_date)::DATE as month,
        account_name,
        sub_account,
        department,
        tax_class,
        SUM(amount) as total_amount,
        SUM(tax_amount) as total_tax_amount,
        SUM(amount - tax_amount) as total_net_amount
    FROM adjusted_data
    GROUP BY month, account_name, sub_account, department, tax_class
)
SELECT 
    gd.month,
    ac.code as account_code,
    gd.account_name,
    gd.sub_account,
    asa.code as sub_account_code,
    asa.name as sub_account_name,
    gd.department,
    gd.tax_class,
    mg.name as management_group_name,
    mg.display_order as management_group_display_order,
    gd.total_amount,
    gd.total_tax_amount,
    gd.total_net_amount
FROM grouped_data gd
LEFT JOIN acc_account_codes ac ON gd.account_name = ac.name
LEFT JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id AND gd.sub_account = asa.name
LEFT JOIN acc_management_groups mg ON ac.management_group_id = mg.id
ORDER BY gd.month, mg.display_order, ac.code, asa.display_order;

COMMENT ON VIEW acc_monthly_account_summary IS 'Consolidated view of monthly account activity with sub-account details';