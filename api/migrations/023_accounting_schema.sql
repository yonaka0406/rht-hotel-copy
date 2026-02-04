-- 0. Drop existing tables and views if they exist (Clean Slate)
DROP VIEW IF EXISTS acc_profit_loss CASCADE;
DROP VIEW IF EXISTS acc_monthly_account_summary CASCADE;
DROP VIEW IF EXISTS acc_accounts_with_sub_accounts CASCADE;
DROP TABLE IF EXISTS acc_departments CASCADE;
DROP TABLE IF EXISTS acc_yayoi_data CASCADE;
DROP TABLE IF EXISTS acc_accounting_mappings CASCADE;
DROP TABLE IF EXISTS acc_account_codes CASCADE;
DROP TABLE IF EXISTS acc_tax_classes CASCADE;
DROP TABLE IF EXISTS acc_management_groups CASCADE;
DROP TABLE IF EXISTS acc_department_groups CASCADE;

-- 1. Management Groups Master
-- Categorizes accounts into high-level groups for reporting and sorting.
CREATE TABLE acc_management_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_order INT NOT NULL,
    default_account_type VARCHAR(10) CHECK (default_account_type IN ('debit', 'credit')),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    UNIQUE (name)
);

COMMENT ON COLUMN acc_management_groups.default_account_type IS 'Default account type (debit/credit) for accounts in this group';

-- Seed Management Groups
INSERT INTO acc_management_groups (id, name, display_order, default_account_type, created_by) VALUES
(1, '売上高', 1, 'credit', 1),
(2, '売上原価', 2, 'debit', 1),
(3, '人件費', 3, 'debit', 1),
(4, '経費', 4, 'debit', 1),
(5, '減価償却費', 5, 'debit', 1),
(6, '営業外収入', 6, 'credit', 1),
(7, '営業外費用', 7, 'debit', 1),
(8, '特別利益', 8, 'credit', 1),
(9, '特別損失', 9, 'debit', 1),
(10, '法人税等', 10, 'debit', 1);

-- 1.1 Department Groups Master
-- Groups for accounting departments used for reporting purposes.
CREATE TABLE acc_department_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE acc_department_groups IS 'Groups for accounting departments used for reporting purposes.';

-- Seed Department Groups
INSERT INTO acc_department_groups (name, display_order) VALUES 
('WH運営', 10),
('WH販売', 20),
('コンサル店舗', 30),
('その他（本部含む）', 40);

-- 2. Tax Classes Master
-- Defines tax categories as recognized by the accounting system (e.g., Yayoi).
CREATE TABLE acc_tax_classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Visual name in the system
    yayoi_name VARCHAR(100) NOT NULL, -- Name used in CSV exports
    tax_rate DECIMAL(5, 4) NOT NULL, -- e.g., 0.1000
    is_active BOOLEAN DEFAULT true,
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    UNIQUE (name),
    UNIQUE (yayoi_name)
);

-- Seed Tax Classes
INSERT INTO acc_tax_classes (name, yayoi_name, tax_rate, display_order, created_by) VALUES
('対象外', '対象外', 0.00, 1, 1),
('課税売上10%', '課税売上10%', 0.10, 2, 1),
('課税売上8%(軽)', '課税売上8%(軽)', 0.08, 3, 1),
('非課税売上', '非課税売上', 0.00, 4, 1),
('課税対応仕入10%', '課対仕入10%', 0.10, 5, 1),
('課税対応仕入8%(軽)', '課対仕入8%(軽)', 0.08, 6, 1);

-- 3. Account Codes Master
-- Defines the chart of accounts or specific codes used for external auditing/ledger.
CREATE TABLE acc_account_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category1 VARCHAR(50), -- 区分1
    category2 VARCHAR(50), -- 区分2
    category3 VARCHAR(50), -- 区分3
    category4 VARCHAR(50), -- 区分4
    management_group_code INT, -- 順番 (Code suffix logic)
    management_group_id INT REFERENCES acc_management_groups(id), -- Reporting Group
    account_type VARCHAR(10) CHECK (account_type IN ('debit', 'credit')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    UNIQUE (code),
    UNIQUE (name)
);

COMMENT ON COLUMN acc_account_codes.account_type IS 'Account type (debit/credit) determining if the balance is naturally positive or negative in reporting';

-- 4. Sub-Accounts Master Table
-- Defines sub-accounts (補助科目) that can be used with specific account codes
CREATE TABLE acc_sub_accounts (
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
CREATE INDEX idx_acc_sub_accounts_account_code ON acc_sub_accounts(account_code_id);
CREATE INDEX idx_acc_sub_accounts_name ON acc_sub_accounts(name);
CREATE INDEX idx_acc_sub_accounts_active ON acc_sub_accounts(account_code_id, is_active) WHERE is_active = true;

-- Add comments
COMMENT ON TABLE acc_sub_accounts IS 'Sub-accounts (補助科目) for detailed account tracking';
COMMENT ON COLUMN acc_sub_accounts.code IS 'Optional structured code for the sub-account';
COMMENT ON COLUMN acc_sub_accounts.name IS 'Sub-account name as used in Yayoi exports/imports';
COMMENT ON COLUMN acc_sub_accounts.display_order IS 'Display order within the parent account';

-- Add foreign key constraints to finance entry tables (created in 009)
-- Linking by account_name as per system requirement
ALTER TABLE du_forecast_entries 
    ADD CONSTRAINT fk_du_forecast_entries_account_name 
    FOREIGN KEY (account_name) REFERENCES acc_account_codes(name) ON UPDATE CASCADE;

-- Link to master tables
ALTER TABLE du_forecast_entries
    ADD CONSTRAINT fk_du_forecast_entries_account_code_id
    FOREIGN KEY (account_code_id) REFERENCES acc_account_codes(id) ON UPDATE CASCADE;

ALTER TABLE du_forecast_entries
    ADD CONSTRAINT fk_du_forecast_entries_sub_account_id
    FOREIGN KEY (sub_account_id) REFERENCES acc_sub_accounts(id) ON DELETE SET NULL;

-- 4.1 Forecast Entry Indexes (Bolt Optimization)
CREATE INDEX IF NOT EXISTS idx_du_forecast_entries_month ON du_forecast_entries (month);
CREATE INDEX IF NOT EXISTS idx_du_forecast_entries_hotel_id ON du_forecast_entries (hotel_id);

-- Seed Account Codes
INSERT INTO acc_account_codes (code, name, category1, category2, category3, category4, management_group_code, management_group_id, account_type, created_by) VALUES
('1110001', '現金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 'debit', 1),
('1110002', '普通預金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 'debit', 1),
('1110003', '当座預金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 'debit', 1),
('1120001', '売掛金', '資産', '流動資産', '売上負債', NULL, 11200, NULL, 'debit', 1),
('1140001', '貯蔵品', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 'debit', 1),
('1140002', '商品', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 'debit', 1),
('1140003', '販売用不動産', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 'debit', 1),
('1150001', '仮払金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150002', '仮払消費税', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150003', '前渡金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150004', '前払費用', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150005', '未収還付消費税', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150006', '未収還付法人税等', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150007', '未収入金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150008', '立替金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1150009', '短期貸付金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 'debit', 1),
('1210001', '土地', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1210002', '建物', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1210003', '工具器具備品', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1210004', '一括償却資産', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1210005', '構築物', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1210006', '附属設備', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1210007', '車両運搬具', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 'debit', 1),
('1220001', 'ソフトウェア', '資産', '固定資産', '無形固定資産', NULL, 12200, NULL, 'debit', 1),
('1220002', '水道加入金', '資産', '固定資産', '無形固定資産', NULL, 12200, NULL, 'debit', 1),
('1230001', '長期前払費用', '資産', '固定資産', '投資等', NULL, 12300, NULL, 'debit', 1),
('1230002', '出資金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 'debit', 1),
('1230003', '敷金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 'debit', 1),
('1230004', '保証金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 'debit', 1),
('1230005', '預託金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 'debit', 1),
('1230006', '借上敷金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 'debit', 1),
('1310001', '下水道事業受益者負担金', '資産', '繰延資産', '繰延資産', NULL, 13100, NULL, 'debit', 1),
('1310002', 'ホームページ制作費', '資産', '繰延資産', '繰延資産', NULL, 13100, NULL, 'debit', 1),
('2110001', '買掛金', '負債', '流動負債', '仕入債務', NULL, 21100, NULL, 'credit', 1),
('2120001', '仮受金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120002', '未払金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120003', '未払消費税', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120004', '未払費用', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120005', '未払法人税等', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120006', '仮受消費税', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120007', '預り金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120008', '短期借入金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120009', '前受金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120010', '前受収益', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2120011', '賞与引当金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 'credit', 1),
('2210001', '長期借入金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 'credit', 1),
('2210002', '預り敷金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 'credit', 1),
('2210003', '社債', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 'credit', 1),
('2210004', '長期未払金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 'credit', 1),
('2210005', '転換社債', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 'credit', 1),
('4110001', 'フード事業', '売上高', '売上高', '売上高', NULL, 41100, 1, 'credit', 1),
('4110002', 'ふるさと納税売上', '売上高', '売上高', '売上高', NULL, 41100, 1, 'credit', 1),
('4110003', '不動産販売収入', '売上高', '売上高', '売上高', NULL, 41100, 1, 'credit', 1),
('4110004', '宿泊事業売上', '売上高', '売上高', '売上高', NULL, 41100, 1, 'credit', 1),
('4110005', '業務受託収入', '売上高', '売上高', '売上高', NULL, 41100, 1, 'credit', 1),
('4110006', '賃貸管理事業売', '売上高', '売上高', '売上高', NULL, 41100, 1, 'credit', 1),
('5111001', '期首商品棚卸高', '売上原価', '売上原価', '売上原価', '期首商品棚卸', 51110, 2, 'debit', 1),
('5112001', 'ふるさと納税仕入', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 'debit', 1),
('5112002', 'その他原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 'debit', 1),
('5112003', '飲食売上原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 'debit', 1),
('5112004', '水道光熱費原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 'debit', 1),
('5112005', '賃貸管理仕入', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 'debit', 1),
('5112006', '不動産販売原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 'debit', 1),
('5114001', '期末商品棚卸高', '売上原価', '売上原価', '売上原価', '期末商品棚卸', 51140, 2, 'debit', 1),
('6110001', '給料手当', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110002', '人件費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110003', '研修費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110004', '通勤費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110005', '福利厚生費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110006', '法定福利費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110007', '役員報酬', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110008', '賞与引当金繰入額', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 'debit', 1),
('6110101', '販売手数料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110102', 'リース料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110103', '交際費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110104', '広告宣伝費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110105', '水道光熱費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110106', '会議費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110107', '車両費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110108', '修繕費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110109', '諸会費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110110', '消耗品費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110111', '新聞図書費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110112', '通信費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110113', '旅費交通費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110114', '寄付金', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110115', '支払手数料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110116', '支払報酬', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110117', '保険料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110118', '地代家賃', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110119', '租税公課', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 'debit', 1),
('6110901', '減価償却費', '販売管理費', '販売管理費', '販売管理費', NULL, 61109, 5, 'debit', 1),
('6110902', '雑費', '販売管理費', '販売管理費', '販売管理費', NULL, 61109, 4, 'debit', 1),
('7110001', '受取利息', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 'credit', 1),
('7110002', '雑収入', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 'credit', 1),
('7110003', '受取配当金', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 'credit', 1),
('7110004', '賞与引当金戻入益', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 'credit', 1),
('8110001', 'その他営業外費用', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 'debit', 1),
('8110002', '支払利息', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 'debit', 1),
('8110003', '社債利息', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 'debit', 1),
('8110004', '雑損失', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 'debit', 1),
('9110001', '補助金収入', '特別利益', '特別利益', '特別利益', NULL, 91100, 8, 'credit', 1),
('9110002', '固定資産売却益', '特別利益', '特別利益', '特別利益', NULL, 91100, 8, 'credit', 1),
('10110001', '固定資産売却損', '特別損失', '特別損失', '特別損失', NULL, 101100, 9, 'debit', 1),
('10110002', '固定資産除却損', '特別損失', '特別損失', '特別損失', NULL, 101100, 9, 'debit', 1),
('10110003', 'その他特別損失', '特別損失', '特別損失', '特別損失', NULL, 101100, 9, 'debit', 1),
('11110001', '法人税等', '当期純損益', '当期純損益', '当期純損益', NULL, 111100, 10, 'debit', 1);

-- Seed common sub-accounts based on current usage
-- Note: Run api/scripts/seed_sub_accounts_from_yayoi_data.sql after importing Yayoi data
-- to automatically create all sub-accounts from actual transaction data

-- 5. Accounting Mappings
-- Maps system entities (Plans, Addons, Categories) to Account Codes.
CREATE TABLE acc_accounting_mappings (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE, -- NULL for Global Defaults
    
    -- Target Definition
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('plan_hotel', 'plan_type_category', 'plan_package_category', 'addon_hotel', 'addon_global', 'cancellation')),
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

-- 6. Yayoi Export Data
-- Stores aggregated transaction data ready for export in Yayoi format (25 Columns).
CREATE TABLE acc_yayoi_data (
    batch_id UUID, -- To group records by export session
    identification_flag VARCHAR(4) DEFAULT '2111' NOT NULL, 
    slip_number VARCHAR(6), 
    settlement_type VARCHAR(4), 
    transaction_date DATE NOT NULL,
    debit_account_code VARCHAR(24), 
    debit_sub_account VARCHAR(24),
    debit_department VARCHAR(24),
    debit_tax_class VARCHAR(32) NOT NULL DEFAULT '対象外',
    debit_amount NUMERIC(11, 0) NOT NULL DEFAULT 0,
    debit_tax_amount NUMERIC(11, 0) DEFAULT 0,
    credit_account_code VARCHAR(24),
    credit_sub_account VARCHAR(24),
    credit_department VARCHAR(24),
    credit_tax_class VARCHAR(32) NOT NULL DEFAULT '対象外',
    credit_amount NUMERIC(11, 0) NOT NULL DEFAULT 0,
    credit_tax_amount NUMERIC(11, 0) DEFAULT 0,
    summary VARCHAR(64),
    journal_number VARCHAR(10),
    due_date DATE,
    ledger_type VARCHAR(1) NOT NULL DEFAULT '0',
    source_name VARCHAR(4),
    journal_memo VARCHAR(180),
    sticky_note1 VARCHAR(3) DEFAULT '0',
    sticky_note2 VARCHAR(1) DEFAULT '0',
    adjustment_flag VARCHAR(5) NOT NULL DEFAULT 'no', 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX idx_acc_yayoi_date ON acc_yayoi_data (transaction_date);
CREATE INDEX idx_acc_yayoi_batch ON acc_yayoi_data (batch_id);

-- Bolt Performance Indexes
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_debit_account ON acc_yayoi_data (debit_account_code);
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_credit_account ON acc_yayoi_data (credit_account_code);
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_debit_dept ON acc_yayoi_data (debit_department);
CREATE INDEX IF NOT EXISTS idx_acc_yayoi_credit_dept ON acc_yayoi_data (credit_department);

-- 7. Accounting Departments Master
CREATE TABLE acc_departments (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE, -- Nullable for global/office departments
    department_group_id INT REFERENCES acc_department_groups(id) ON DELETE SET NULL,
    name VARCHAR(24) NOT NULL, -- Yayoi department name (部門) e.g., "WH室蘭"
    is_current BOOLEAN DEFAULT false, -- true = current name for exports, false = historical name for import matching
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id)
);

CREATE UNIQUE INDEX idx_acc_departments_hotel_name_unique ON acc_departments (COALESCE(hotel_id, 0), name);
CREATE INDEX idx_acc_departments_hotel ON acc_departments(hotel_id);
CREATE INDEX idx_acc_departments_name ON acc_departments(name);
CREATE INDEX idx_acc_departments_group ON acc_departments(department_group_id);
CREATE UNIQUE INDEX idx_acc_departments_one_current ON acc_departments(hotel_id) WHERE is_current = true AND hotel_id IS NOT NULL;

-- Seed department codes for existing hotels
INSERT INTO acc_departments (hotel_id, name, is_current, created_by) VALUES
(24, 'WH室蘭', true, 1)
ON CONFLICT (hotel_id, name) DO NOTHING;

-- Views
CREATE VIEW acc_accounts_with_sub_accounts AS
SELECT 
    ac.id as account_id,
    ac.code as account_code,
    ac.name as account_name,
    ac.category1, ac.category2, ac.category3, ac.category4,
    asa.id as sub_account_id,
    asa.code as sub_account_code,
    asa.name as sub_account_name,
    asa.description as sub_account_description,
    asa.display_order as sub_account_display_order,
    asa.is_active as sub_account_is_active
FROM acc_account_codes ac
LEFT JOIN acc_sub_accounts asa ON ac.id = asa.account_code_id
ORDER BY ac.code, asa.display_order, asa.name;

-- Sub-account dynamic helper function
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
    SELECT id INTO v_account_id FROM acc_account_codes WHERE name = p_account_name;
    IF v_account_id IS NULL THEN RAISE EXCEPTION 'Account code not found: %', p_account_name; END IF;
    SELECT id INTO v_sub_account_id FROM acc_sub_accounts WHERE account_code_id = v_account_id AND name = p_sub_account_name;
    IF v_sub_account_id IS NULL THEN
        SELECT COALESCE(MAX(display_order), 0) + 1 INTO v_max_display_order FROM acc_sub_accounts WHERE account_code_id = v_account_id;
        INSERT INTO acc_sub_accounts (account_code_id, name, display_order, created_by)
        VALUES (v_account_id, p_sub_account_name, v_max_display_order, p_created_by)
        RETURNING id INTO v_sub_account_id;
    END IF;
    RETURN v_sub_account_id;
END;
$$ LANGUAGE plpgsql;

-- 8. Monthly Account Summary View (Optimized with LATERAL)
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

-- 9. Profit & Loss View (with Account Type support)
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
