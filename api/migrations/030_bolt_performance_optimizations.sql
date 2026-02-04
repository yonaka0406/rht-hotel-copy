-- Migration 030: Bolt Performance Optimizations for Accounting

-- 1. Add indexes to acc_yayoi_data for faster joins and filtering
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_debit_account ON acc_yayoi_data (debit_account_code);
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_credit_account ON acc_yayoi_data (credit_account_code);
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_debit_dept ON acc_yayoi_data (debit_department);
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_credit_dept ON acc_yayoi_data (credit_department);

-- 2. Optimize acc_monthly_account_summary view
-- Using CROSS JOIN LATERAL allows a single pass over acc_yayoi_data instead of two scans for UNION ALL
DROP VIEW IF EXISTS acc_profit_loss CASCADE;
DROP VIEW IF EXISTS acc_monthly_account_summary CASCADE;

CREATE OR REPLACE VIEW acc_monthly_account_summary AS
WITH unpivoted_data AS (
    SELECT
        DATE_TRUNC('month', yd.transaction_date)::DATE as month,
        v.account_name,
        v.sub_account,
        v.department,
        v.tax_class,
        v.amount,
        v.tax_amount,
        v.leg_type
    FROM acc_yayoi_data yd
    CROSS JOIN LATERAL (
        SELECT
            yd.debit_account_code as account_name,
            yd.debit_sub_account as sub_account,
            yd.debit_department as department,
            yd.debit_tax_class as tax_class,
            yd.debit_amount as amount,
            (CASE
                WHEN yd.debit_tax_class LIKE '%控不%' THEN 0
                WHEN yd.debit_tax_class LIKE '%80%' THEN ROUND(yd.debit_tax_amount * 0.8)
                ELSE yd.debit_tax_amount
            END) as tax_amount,
            'debit' as leg_type
        WHERE yd.debit_account_code IS NOT NULL AND yd.debit_account_code <> ''
        UNION ALL
        SELECT
            yd.credit_account_code as account_name,
            yd.credit_sub_account as sub_account,
            yd.credit_department as department,
            yd.credit_tax_class as tax_class,
            yd.credit_amount as amount,
            (CASE
                WHEN yd.credit_tax_class LIKE '%控不%' THEN 0
                WHEN yd.credit_tax_class LIKE '%80%' THEN ROUND(yd.credit_tax_amount * 0.8)
                ELSE yd.credit_tax_amount
            END) as tax_amount,
            'credit' as leg_type
        WHERE yd.credit_account_code IS NOT NULL AND yd.credit_account_code <> ''
    ) v
),
grouped_data AS (
    SELECT
        month,
        account_name,
        sub_account,
        department,
        tax_class,
        SUM(CASE WHEN leg_type = 'credit' THEN amount ELSE -amount END) as total_amount,
        SUM(CASE WHEN leg_type = 'credit' THEN tax_amount ELSE -tax_amount END) as total_tax_amount
    FROM unpivoted_data
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
LEFT JOIN acc_management_groups mg ON ac.management_group_id = mg.id;

-- Recreate acc_profit_loss (no changes to logic, just following the dependency chain)
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
        amas.month, amas.department, dhm.hotel_id, dhm.hotel_name,
        amas.management_group_id, amas.management_group_name,
        amas.management_group_display_order, amas.account_code, amas.account_name, amas.account_type
)
SELECT
    month, department, hotel_id, hotel_name,
    management_group_id, management_group_name, management_group_display_order,
    account_code, account_name, account_type, net_amount,
    CASE WHEN management_group_display_order = 1 THEN net_amount ELSE 0 END as revenue,
    CASE WHEN management_group_display_order = 2 THEN net_amount ELSE 0 END as cost_of_sales,
    CASE WHEN management_group_display_order IN (3, 4, 5) THEN net_amount ELSE 0 END as operating_expenses,
    CASE WHEN management_group_display_order = 6 THEN net_amount ELSE 0 END as non_operating_income,
    CASE WHEN management_group_display_order = 7 THEN net_amount ELSE 0 END as non_operating_expenses,
    CASE WHEN management_group_display_order = 8 THEN net_amount ELSE 0 END as extraordinary_income,
    CASE WHEN management_group_display_order = 9 THEN net_amount ELSE 0 END as extraordinary_losses,
    CASE WHEN management_group_display_order = 10 THEN net_amount ELSE 0 END as income_tax
FROM pl_data;

-- 3. Add indexes to du_forecast_entries for faster budget comparison
CREATE INDEX IF NOT EXISTS idx_du_forecast_entries_month ON du_forecast_entries (month);
CREATE INDEX IF NOT EXISTS idx_du_forecast_entries_hotel_id ON du_forecast_entries (hotel_id);
