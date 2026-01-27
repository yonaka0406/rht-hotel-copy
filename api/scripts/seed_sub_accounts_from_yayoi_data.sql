-- Seed acc_sub_accounts from existing Yayoi data
-- This script analyzes acc_yayoi_data to find all unique sub-accounts
-- and creates entries in acc_sub_accounts table

-- First, let's see what we're working with
-- Uncomment these queries to analyze the data before seeding:

/*
-- Analysis: Count of sub-accounts per account
SELECT 
    account_name,
    COUNT(DISTINCT sub_account) as sub_account_count,
    array_agg(DISTINCT sub_account ORDER BY sub_account) as sub_accounts
FROM (
    SELECT debit_account_code as account_name, debit_sub_account as sub_account
    FROM acc_yayoi_data 
    WHERE debit_sub_account IS NOT NULL AND debit_sub_account != ''
    UNION
    SELECT credit_account_code as account_name, credit_sub_account as sub_account
    FROM acc_yayoi_data 
    WHERE credit_sub_account IS NOT NULL AND credit_sub_account != ''
) combined
GROUP BY account_name
ORDER BY sub_account_count DESC;

-- Analysis: Top accounts with most sub-accounts
SELECT 
    account_name,
    COUNT(DISTINCT sub_account) as unique_sub_accounts
FROM (
    SELECT debit_account_code as account_name, debit_sub_account as sub_account
    FROM acc_yayoi_data 
    WHERE debit_sub_account IS NOT NULL AND debit_sub_account != ''
    UNION
    SELECT credit_account_code as account_name, credit_sub_account as sub_account
    FROM acc_yayoi_data 
    WHERE credit_sub_account IS NOT NULL AND credit_sub_account != ''
) combined
GROUP BY account_name
HAVING COUNT(DISTINCT sub_account) > 1
ORDER BY unique_sub_accounts DESC
LIMIT 20;
*/

-- Main seeding script
-- Create sub-accounts from all unique combinations in Yayoi data
WITH yayoi_sub_accounts AS (
    -- Get all unique account + sub-account combinations from both debit and credit sides
    SELECT DISTINCT
        account_name,
        sub_account
    FROM (
        SELECT 
            debit_account_code as account_name, 
            debit_sub_account as sub_account
        FROM acc_yayoi_data 
        WHERE debit_sub_account IS NOT NULL 
          AND debit_sub_account != ''
          AND debit_account_code IS NOT NULL
          AND debit_account_code != ''
        
        UNION
        
        SELECT 
            credit_account_code as account_name, 
            credit_sub_account as sub_account
        FROM acc_yayoi_data 
        WHERE credit_sub_account IS NOT NULL 
          AND credit_sub_account != ''
          AND credit_account_code IS NOT NULL
          AND credit_account_code != ''
    ) combined
),
account_sub_account_mapping AS (
    -- Join with account codes to get IDs and add row numbers for display_order
    SELECT 
        ac.id as account_code_id,
        ac.name as account_name,
        ysa.sub_account,
        ROW_NUMBER() OVER (PARTITION BY ac.id ORDER BY ysa.sub_account) as display_order
    FROM yayoi_sub_accounts ysa
    JOIN acc_account_codes ac ON ysa.account_name = ac.name
)
-- Insert into acc_sub_accounts, avoiding duplicates
INSERT INTO acc_sub_accounts (account_code_id, name, display_order, created_by)
SELECT 
    account_code_id,
    sub_account as name,
    display_order,
    1 as created_by
FROM account_sub_account_mapping
WHERE NOT EXISTS (
    -- Avoid duplicates if script is run multiple times
    SELECT 1 
    FROM acc_sub_accounts asa 
    WHERE asa.account_code_id = account_sub_account_mapping.account_code_id 
      AND asa.name = account_sub_account_mapping.sub_account
)
ORDER BY account_code_id, display_order;

-- Show summary of what was created
SELECT 
    ac.code as account_code,
    ac.name as account_name,
    COUNT(asa.id) as sub_accounts_created
FROM acc_account_codes ac
JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id
GROUP BY ac.code, ac.name
ORDER BY sub_accounts_created DESC, ac.code;

-- Show detailed breakdown for accounts with many sub-accounts
SELECT 
    ac.code as account_code,
    ac.name as account_name,
    asa.name as sub_account_name,
    asa.display_order
FROM acc_account_codes ac
JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id
WHERE ac.id IN (
    -- Only show accounts that have more than 5 sub-accounts
    SELECT account_code_id 
    FROM acc_sub_accounts 
    GROUP BY account_code_id 
    HAVING COUNT(*) > 5
)
ORDER BY ac.code, asa.display_order
LIMIT 50;

-- Verification: Check if any Yayoi sub-accounts are missing from our master table
WITH missing_sub_accounts AS (
    SELECT DISTINCT
        ysa.account_name,
        ysa.sub_account
    FROM (
        SELECT debit_account_code as account_name, debit_sub_account as sub_account
        FROM acc_yayoi_data 
        WHERE debit_sub_account IS NOT NULL AND debit_sub_account != ''
        UNION
        SELECT credit_account_code as account_name, credit_sub_account as sub_account
        FROM acc_yayoi_data 
        WHERE credit_sub_account IS NOT NULL AND credit_sub_account != ''
    ) ysa
    LEFT JOIN acc_account_codes ac ON ysa.account_name = ac.name
    LEFT JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id AND ysa.sub_account = asa.name
    WHERE ac.id IS NOT NULL -- Account exists
      AND asa.id IS NULL    -- But sub-account doesn't exist
)
SELECT 
    COUNT(*) as missing_count,
    'Missing sub-accounts (should be 0 after seeding)' as description
FROM missing_sub_accounts;