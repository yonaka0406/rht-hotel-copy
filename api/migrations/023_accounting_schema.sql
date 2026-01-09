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
-- Stores aggregated transaction data ready for export in Yayoi format (25 Columns).
-- This table is a staging area that mirrors the standard Yayoi Import CSV format.
CREATE TABLE acc_yayoi_export_data (
    id SERIAL PRIMARY KEY,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    export_batch_id UUID, -- To group records by export session
    
    -- 1. 識別フラグ (Identification Flag) [必須]
    -- 2000: 伝票以外の仕訳データ (Journal data other than slips)
    -- 2111: 1行の伝票データ (Single-line slip)
    -- 複数行の伝票データ (Multi-line slip):
    --   2110: 1行目 (First line)
    --   2100: 間の行 (Middle lines)
    --   2101: 最終行 (Last line)
    identification_flag VARCHAR(20) DEFAULT '2111' NOT NULL, 
    
    -- 2. 伝票No (Slip Number)
    -- 事業所データの［帳簿・伝票設定］で伝票No.の付番方法が「手入力」の場合に記述した伝票No.を反映。
    -- ※複数行の伝票データの場合は1行目を反映。
    slip_number VARCHAR(50), 
    
    -- 3. 決算 (Settlement/Closing): '決算' or NULL
    settlement_type VARCHAR(20), 
    
    -- 4. 取引日付 (Transaction Date) [必須]: YYYY/MM/DD
    transaction_date DATE NOT NULL,
    
    -- 5. 借方勘定科目 (Debit Account) [必須]
    debit_account_code VARCHAR(50) NOT NULL, 
    
    -- 6. 借方補助科目 (Debit Sub-Account)
    debit_sub_account VARCHAR(50),
    
    -- 7. 借方部門 (Debit Department)
    debit_department VARCHAR(50),
    
    -- 8. 借方税区分 (Debit Tax Class) [必須]: e.g. "課税売上10%"
    debit_tax_class VARCHAR(50) NOT NULL,
    
    -- 9. 借方金額 (Debit Amount) [必須]
    debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- 10. 借方税金額 (Debit Tax Amount)
    debit_tax_amount NUMERIC(15, 2) DEFAULT 0,
    
    -- 11. 貸方勘定科目 (Credit Account) [必須]
    credit_account_code VARCHAR(50) NOT NULL,
    
    -- 12. 貸方補助科目 (Credit Sub-Account)
    credit_sub_account VARCHAR(50),
    
    -- 13. 貸方部門 (Credit Department)
    credit_department VARCHAR(50),
    
    -- 14. 貸方税区分 (Credit Tax Class) [必須]
    credit_tax_class VARCHAR(50) NOT NULL,
    
    -- 15. 貸方金額 (Credit Amount) [必須]
    credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    
    -- 16. 貸方税金額 (Credit Tax Amount)
    credit_tax_amount NUMERIC(15, 2) DEFAULT 0,
    
    -- 17. 摘要 (Summary)
    summary TEXT,
    
    -- 18. 番号 (Journal Number/Daily Serial): Daily sequential number
    journal_number VARCHAR(20),
    
    -- 19. 期日 (Due Date)
    due_date DATE,
    
    -- 20. タイプ (Type) [必須]: e.g. "仕訳" (Journal), "掛け" (Credit), "現金" (Cash)
    ledger_type VARCHAR(50) NOT NULL DEFAULT '仕訳',
    
    -- 21. 生成元 (Source): e.g. "RHT-PMS"
    source_name VARCHAR(50),
    
    -- 22. 仕訳メモ (Journal Memo): Internal notes not in summary
    journal_memo TEXT,
    
    -- 23. 付箋1 (Sticky Note 1)
    sticky_note1 VARCHAR(20),
    
    -- 24. 付箋2 (Sticky Note 2)
    sticky_note2 VARCHAR(20),
    
    -- 25. 調整 (Adjustment) [必須]
    -- 調整にチェックを付ける場合は「yes」（または「true」「on」「1」「-1」）を記述。
    -- チェックを付けない場合は「no」（または「yes」「true」「on」「1」「-1」以外の文字）を記述。
    -- ※空欄の場合もチェックは付かない。
    adjustment_flag VARCHAR(20) NOT NULL DEFAULT 'no', 
    
    -- Internal Metadata (Not exported to Yayoi)
    source_type VARCHAR(50), -- 'reservation', 'pos', 'manual'
    source_id VARCHAR(50),   -- ID of the source record
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX idx_acc_yayoi_export_date ON acc_yayoi_export_data (hotel_id, transaction_date);
CREATE INDEX idx_acc_yayoi_export_batch ON acc_yayoi_export_data (export_batch_id);
