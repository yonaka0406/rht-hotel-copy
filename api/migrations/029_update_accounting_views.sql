-- Migration 029: Update accounting views to include account_type and ensure correct signs

-- Drop views to recreate them
DROP VIEW IF EXISTS acc_profit_loss CASCADE;
DROP VIEW IF EXISTS acc_monthly_account_summary CASCADE;

-- Recreate acc_monthly_account_summary
CREATE OR REPLACE VIEW acc_monthly_account_summary AS
WITH adjusted_data AS (
    -- Debit legs
    SELECT
        transaction_date,
        debit_account_code as account_name,
        debit_sub_account as sub_account,
        debit_department as department,
        debit_tax_class as tax_class,
        debit_amount as amount,
        (CASE
            WHEN debit_tax_class LIKE '%控不%' THEN 0
            WHEN debit_tax_class LIKE '%80%' THEN ROUND(debit_tax_amount * 0.8)
            ELSE debit_tax_amount
        END) as tax_amount,
        'debit' as leg_type
    FROM acc_yayoi_data
    WHERE debit_account_code IS NOT NULL AND debit_account_code <> ''

    UNION ALL

    -- Credit legs
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
        END) as tax_amount,
        'credit' as leg_type
    FROM acc_yayoi_data
    WHERE credit_account_code IS NOT NULL AND credit_account_code <> ''
),
grouped_data AS (
    SELECT
        DATE_TRUNC('month', ad.transaction_date)::DATE as month,
        ad.account_name,
        ad.sub_account,
        ad.department,
        ad.tax_class,
        -- Apply sign based on leg_type: Credit is positive, Debit is negative
        SUM(CASE WHEN ad.leg_type = 'credit' THEN ad.amount ELSE -ad.amount END) as total_amount,
        SUM(CASE WHEN ad.leg_type = 'credit' THEN ad.tax_amount ELSE -ad.tax_amount END) as total_tax_amount
    FROM adjusted_data ad
    GROUP BY month, ad.account_name, ad.sub_account, ad.department, ad.tax_class
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
    mg.id as management_group_id,
    mg.name as management_group_name,
    mg.display_order as management_group_display_order,
    ac.account_type,
    gd.total_amount,
    gd.total_tax_amount,
    (gd.total_amount - gd.total_tax_amount) as total_net_amount
FROM grouped_data gd
LEFT JOIN acc_account_codes ac ON gd.account_name = ac.name
LEFT JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id AND gd.sub_account = asa.name
LEFT JOIN acc_management_groups mg ON ac.management_group_id = mg.id
ORDER BY gd.month, mg.display_order, ac.code, asa.display_order;

-- Recreate acc_profit_loss
CREATE OR REPLACE VIEW acc_profit_loss AS
WITH department_hotel_map AS (
    SELECT DISTINCT
        ad.name as department_name,
        ad.hotel_id,
        h.name as hotel_name
    FROM acc_departments ad
    JOIN hotels h ON ad.hotel_id = h.id
),
pl_data AS (
    SELECT
        amas.month,
        amas.department,
        dhm.hotel_id,
        dhm.hotel_name,
        amas.management_group_id,
        amas.management_group_name,
        amas.management_group_display_order,
        amas.account_code,
        amas.account_name,
        amas.account_type,
        SUM(amas.total_net_amount) as net_amount
    FROM acc_monthly_account_summary amas
    LEFT JOIN department_hotel_map dhm ON amas.department = dhm.department_name
    WHERE amas.management_group_name IS NOT NULL
    GROUP BY
        amas.month,
        amas.department,
        dhm.hotel_id,
        dhm.hotel_name,
        amas.management_group_id,
        amas.management_group_name,
        amas.management_group_display_order,
        amas.account_code,
        amas.account_name,
        amas.account_type
)
SELECT
    month,
    department,
    hotel_id,
    hotel_name,
    management_group_id,
    management_group_name,
    management_group_display_order,
    account_code,
    account_name,
    account_type,
    net_amount,
    CASE WHEN management_group_display_order = 1 THEN net_amount ELSE 0 END as revenue,
    CASE WHEN management_group_display_order = 2 THEN net_amount ELSE 0 END as cost_of_sales,
    CASE WHEN management_group_display_order IN (3, 4, 5) THEN net_amount ELSE 0 END as operating_expenses,
    CASE WHEN management_group_display_order = 6 THEN net_amount ELSE 0 END as non_operating_income,
    CASE WHEN management_group_display_order = 7 THEN net_amount ELSE 0 END as non_operating_expenses,
    CASE WHEN management_group_display_order = 8 THEN net_amount ELSE 0 END as extraordinary_income,
    CASE WHEN management_group_display_order = 9 THEN net_amount ELSE 0 END as extraordinary_losses,
    CASE WHEN management_group_display_order = 10 THEN net_amount ELSE 0 END as income_tax
FROM pl_data
ORDER BY month, hotel_id, management_group_display_order, account_code;
