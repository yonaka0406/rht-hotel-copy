-- Accounting Schema

-- 1. Account Codes Master
-- Defines the chart of accounts or specific codes used for external auditing/ledger.
CREATE TABLE acc_account_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'sales', -- sales, payment, tax, adjustment, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    UNIQUE (code)
);

-- Seed some default Japanese account codes (Standard Hotel Accounting)
-- These are placeholders and should be updated by the user/admin.
INSERT INTO acc_account_codes (code, name, category, created_by) VALUES
('1000', '宿泊売上', 'sales', 1),
('1100', '宿泊売上（プラン）', 'sales', 1),
('2000', '料飲売上', 'sales', 1),
('2100', '朝食売上', 'sales', 1),
('2200', '夕食売上', 'sales', 1),
('3000', 'その他売上', 'sales', 1),
('3100', '駐車場売上', 'sales', 1),
('4000', '入湯税', 'tax', 1),
('5000', '消費税', 'tax', 1),
('9000', '現金', 'payment', 1),
('9100', 'クレジットカード', 'payment', 1),
('9200', '売掛金（OTA）', 'payment', 1);

-- 2. Accounting Mappings
-- Maps system entities (Plans, Addons, Categories) to Account Codes.
-- Resolution Logic (to be implemented in code/query):
-- 1. Check for specific Item mapping for the Hotel (e.g. Plan A in Hotel 1).
-- 2. Check for Category mapping for the Hotel (e.g. "Overnight" category in Hotel 1).
-- 3. Check for Global Category mapping (e.g. "Overnight" category default).
CREATE TABLE acc_accounting_mappings (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE, -- NULL for Global Defaults
    
    -- Target Definition
    -- 'plan_hotel': Specific Plan (requires hotel_id)
    -- 'plan_type_category': Plan Type (e.g. '1 Night', '2 Meals')
    -- 'plan_package_category': Plan Package (e.g. 'Standard', 'Monthly')
    -- 'addon_hotel': Specific Hotel Addon
    -- 'addon_global': Global Addon definition
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('plan_hotel', 'plan_type_category', 'plan_package_category', 'addon_hotel', 'addon_global')),
    target_id INT NOT NULL, 
    
    account_code_id INT NOT NULL REFERENCES acc_account_codes(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    
    -- Ensure unique mapping for a specific target context
    UNIQUE (hotel_id, target_type, target_id)
);

-- Indexes for performance
CREATE INDEX idx_acc_accounting_mappings_lookup ON acc_accounting_mappings (hotel_id, target_type, target_id);
CREATE INDEX idx_acc_accounting_mappings_account_code ON acc_accounting_mappings (account_code_id);

-- 3. Yayoi Export Data
-- Stores aggregated transaction data ready for export in Yayoi format.
-- This can be populated periodically or on-demand before export.
CREATE TABLE acc_yayoi_export_data (
    id SERIAL PRIMARY KEY,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    export_batch_id UUID, -- To group records by export session
    
    -- Yayoi Import Fields
    -- 識別フラグ (Identify Flag): '2000', '2111' etc. Default usually '2111' for generic journals? 
    -- We will store component parts and format on select if needed, or store raw import format.
    -- Common Yayoi CSV columns:
    -- 1. IdentifyFlag (識別フラグ) - e.g. "2111"
    -- 2. Date (日付) - YYYY/MM/DD
    -- 3. DebitAccount (借方勘定科目)
    -- 4. DebitSubAccount (借方補助科目)
    -- 5. DebitDepartment (借方部門)
    -- 6. DebitTaxClass (借方税区分)
    -- 7. DebitAmount (借方金額)
    -- 8. DebitTaxAmount (借方消費税額)
    -- 9. CreditAccount (貸方勘定科目)
    -- 10. CreditSubAccount (貸方補助科目)
    -- 11. CreditDepartment (貸方部門)
    -- 12. CreditTaxClass (貸方税区分)
    -- 13. CreditAmount (貸方金額)
    -- 14. CreditTaxAmount (貸方消費税額)
    -- 15. Summary (摘要)
    -- 16. SettlementCode (決済)
    
    transaction_date DATE NOT NULL,
    
    debit_account_code VARCHAR(50), -- Link to acc_account_codes if needed, but string for CSV
    debit_sub_account VARCHAR(50),
    debit_department VARCHAR(50),
    debit_tax_class VARCHAR(50), -- e.g. "課税売上10%"
    debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    debit_tax_amount NUMERIC(15, 2) DEFAULT 0,
    
    credit_account_code VARCHAR(50),
    credit_sub_account VARCHAR(50),
    credit_department VARCHAR(50),
    credit_tax_class VARCHAR(50),
    credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    credit_tax_amount NUMERIC(15, 2) DEFAULT 0,
    
    summary TEXT, -- Description of the transaction
    
    -- Metadata
    source_type VARCHAR(50), -- 'reservation', 'pos', 'manual', etc.
    source_id VARCHAR(50), -- ID of the source record
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX idx_acc_yayoi_export_date ON acc_yayoi_export_data (hotel_id, transaction_date);
CREATE INDEX idx_acc_yayoi_export_batch ON acc_yayoi_export_data (export_batch_id);
