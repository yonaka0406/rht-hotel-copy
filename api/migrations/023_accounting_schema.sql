-- 1. Management Groups Master
-- Categorizes accounts into high-level groups for reporting and sorting.
CREATE TABLE acc_management_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    display_order INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    UNIQUE (name)
);

-- Seed Management Groups
INSERT INTO acc_management_groups (id, name, display_order, created_by) VALUES
(1, '売上高', 1, 1),
(2, '売上原価', 2, 1),
(3, '人件費', 3, 1),
(4, '経費', 4, 1),
(5, '減価償却費', 5, 1),
(6, '営業外収入', 6, 1),
(7, '営業外費用', 7, 1),
(8, '特別利益', 8, 1),
(9, '特別損失', 9, 1),
(10, '法人税等', 10, 1);

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
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    UNIQUE (code),
    UNIQUE (name)
);

-- Seed Account Codes
INSERT INTO acc_account_codes (code, name, category1, category2, category3, category4, management_group_code, management_group_id, created_by) VALUES
('1110001', '現金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 1),
('1110002', '普通預金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 1),
('1110003', '当座預金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 1),
('1120001', '売掛金', '資産', '流動資産', '売上負債', NULL, 11200, NULL, 1),
('1140001', '貯蔵品', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 1),
('1140002', '商品', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 1),
('1140003', '販売用不動産', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 1),
('1150001', '仮払金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150002', '仮払消費税', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150003', '前渡金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150004', '前払費用', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150005', '未収還付消費税', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150006', '未収還付法人税等', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150007', '未収入金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150008', '立替金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1150009', '短期貸付金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('1210001', '土地', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1210002', '建物', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1210003', '工具器具備品', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1210004', '一括償却資産', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1210005', '構築物', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1210006', '附属設備', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1210007', '車両運搬具', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('1220001', 'ソフトウェア', '資産', '固定資産', '無形固定資産', NULL, 12200, NULL, 1),
('1220002', '水道加入金', '資産', '固定資産', '無形固定資産', NULL, 12200, NULL, 1),
('1230001', '長期前払費用', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('1230002', '出資金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('1230003', '敷金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('1230004', '保証金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('1230005', '預託金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('1230006', '借上敷金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('1310001', '下水道事業受益者負担金', '資産', '繰延資産', '繰延資産', NULL, 13100, NULL, 1),
('1310002', 'ホームページ制作費', '資産', '繰延資産', '繰延資産', NULL, 13100, NULL, 1),
('2110001', '買掛金', '負債', '流動負債', '仕入債務', NULL, 21100, NULL, 1),
('2120001', '仮受金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120002', '未払金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120003', '未払消費税', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120004', '未払費用', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120005', '未払法人税等', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120006', '仮受消費税', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120007', '預り金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120008', '短期借入金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120009', '前受金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120010', '前受収益', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2120011', '賞与引当金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('2210001', '長期借入金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('2210002', '預り敷金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('2210003', '社債', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('2210004', '長期未払金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('2210005', '転換社債', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('4110001', 'フード事業', '売上高', '売上高', '売上高', NULL, 41100, 1, 1),
('4110002', 'ふるさと納税売上', '売上高', '売上高', '売上高', NULL, 41100, 1, 1),
('4110003', '不動産販売収入', '売上高', '売上高', '売上高', NULL, 41100, 1, 1),
('4110004', '宿泊事業売上', '売上高', '売上高', '売上高', NULL, 41100, 1, 1),
('4110005', '業務受託収入', '売上高', '売上高', '売上高', NULL, 41100, 1, 1),
('4110006', '賃貸管理事業売', '売上高', '売上高', '売上高', NULL, 41100, 1, 1),
('5111001', '期首商品棚卸高', '売上原価', '売上原価', '売上原価', '期首商品棚卸', 51110, 2, 1),
('5112001', 'ふるさと納税仕入', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 1),
('5112002', 'その他原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 1),
('5112003', '飲食売上原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 1),
('5112004', '水道光熱費原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 1),
('5112005', '賃貸管理仕入', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 1),
('5112006', '不動産販売原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, 2, 1),
('5114001', '期末商品棚卸高', '売上原価', '売上原価', '売上原価', '期末商品棚卸', 51140, 2, 1),
('6110001', '給料手当', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110002', '人件費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110003', '研修費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110004', '通勤費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110005', '福利厚生費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110006', '法定福利費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110007', '役員報酬', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110008', '賞与引当金繰入額', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, 3, 1),
('6110101', '販売手数料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110102', 'リース料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110103', '交際費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110104', '広告宣伝費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110105', '水道光熱費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110106', '会議費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110107', '車両費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110108', '修繕費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110109', '諸会費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110110', '消耗品費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110111', '新聞図書費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110112', '通信費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110113', '旅費交通費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110114', '寄付金', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110115', '支払手数料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110116', '支払報酬', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110117', '保険料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110118', '地代家賃', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110119', '租税公課', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, 4, 1),
('6110901', '減価償却費', '販売管理費', '販売管理費', '販売管理費', NULL, 61109, 5, 1),
('6110902', '雑費', '販売管理費', '販売管理費', '販売管理費', NULL, 61109, 4, 1),
('7110001', '受取利息', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 1),
('7110002', '雑収入', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 1),
('7110003', '受取配当金', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 1),
('7110004', '賞与引当金戻入益', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, 6, 1),
('8110001', 'その他営業外費用', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 1),
('8110002', '支払利息', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 1),
('8110003', '社債利息', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 1),
('8110004', '雑損失', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, 7, 1),
('9110001', '補助金収入', '特別利益', '特別利益', '特別利益', NULL, 91100, 8, 1),
('9110002', '固定資産売却益', '特別利益', '特別利益', '特別利益', NULL, 91100, 8, 1),
('10110001', '固定資産売却損', '特別損失', '特別損失', '特別損失', NULL, 101100, 9, 1),
('10110002', '固定資産除却損', '特別損失', '特別損失', '特別損失', NULL, 101100, 9, 1),
('10110003', 'その他特別損失', '特別損失', '特別損失', '特別損失', NULL, 101100, 9, 1),
('11110001', '法人税等', '当期純損益', '当期純損益', '当期純損益', NULL, 111100, 10, 1);

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
    
    -- 1(A) [必須] 識別フラグ (Identification Flag) | 4文字
    -- 2000:伝票以外, 2111:1行伝票, 2110:複数行1行目, 2100:中間行, 2101:最終行
    identification_flag VARCHAR(4) DEFAULT '2111' NOT NULL, 
    
    -- 2(B) 伝票No (Slip Number) | 6数字
    -- 複数行の場合は1行目を反映
    slip_number VARCHAR(6), 
    
    -- 3(C) 決算 (Settlement/Closing) | 4文字
    -- Blank:通常, 中決:中間決算, 本決:本決算
    settlement_type VARCHAR(4), 
    
    -- 4(D) [必須] 取引日付 (Transaction Date) | 10日付
    -- 西暦または和暦 (YYYY/MM/DD等)
    transaction_date DATE NOT NULL,
    
    -- 5(E) [必須] 借方勘定科目 (Debit Account) | 24文字
    -- 複数行で科目がない場合は空白可
    debit_account_code VARCHAR(24), 
    
    -- 6(F) 借方補助科目 (Debit Sub-Account) | 24文字
    debit_sub_account VARCHAR(24),
    
    -- 7(G) 借方部門 (Debit Department) | 24文字
    debit_department VARCHAR(24),
    
    -- 8(H) [必須] 借方税区分 (Debit Tax Class) | 32文字
    -- 科目がない場合は「対象外」
    debit_tax_class VARCHAR(32) NOT NULL DEFAULT '対象外',
    
    -- 9(I) [必須] 借方金額 (Debit Amount) | 11金額
    -- 整数(税込)。科目がない場合は0
    debit_amount NUMERIC(11, 0) NOT NULL DEFAULT 0,
    
    -- 10(J) 借方税金額 (Debit Tax Amount) | 11金額
    -- 整数。税抜処理の場合は入力必須
    debit_tax_amount NUMERIC(11, 0) DEFAULT 0,
    
    -- 11(K) [必須] 貸方勘定科目 (Credit Account) | 24文字
    -- 複数行で科目がない場合は空白可
    credit_account_code VARCHAR(24),
    
    -- 12(L) 貸方補助科目 (Credit Sub-Account) | 24文字
    credit_sub_account VARCHAR(24),
    
    -- 13(M) 貸方部門 (Credit Department) | 24文字
    credit_department VARCHAR(24),
    
    -- 14(N) [必須] 貸方税区分 (Credit Tax Class) | 32文字
    -- 「借方税区分」と同じルール
    credit_tax_class VARCHAR(32) NOT NULL DEFAULT '対象外',
    
    -- 15(O) [必須] 貸方金額 (Credit Amount) | 11金額
    -- 整数(税込)。科目がない場合は0
    credit_amount NUMERIC(11, 0) NOT NULL DEFAULT 0,
    
    -- 16(P) 貸方税金額 (Credit Tax Amount) | 11金額
    -- 整数
    credit_tax_amount NUMERIC(11, 0) DEFAULT 0,
    
    -- 17(Q) 摘要 (Summary) | 64文字
    -- 半角64桁を超える文字は切り捨て
    summary VARCHAR(64),
    
    -- 18(R) 番号 (Journal Number) | 10文字
    -- 手形番号等。半角10桁超は切り捨て
    journal_number VARCHAR(10),
    
    -- 19(S) 期日 (Due Date) | 10日付
    due_date DATE,
    
    -- 20(T) [必須] タイプ (Type) | 1数字
    -- 0:仕訳, 1:出金伝票, 2:入金伝票, 3:振替伝票
    ledger_type VARCHAR(1) NOT NULL DEFAULT '0',
    
    -- 21(U) 生成元 (Source) | 4文字
    -- 全角2桁(受手,給与等)
    source_name VARCHAR(4),
    
    -- 22(V) 仕訳メモ (Journal Memo) | 180文字
    -- 半角180桁超は切り捨て
    journal_memo VARCHAR(180),
    
    -- 23(W) 付箋1 (Sticky Note 1) | 3数字
    -- 0～5。空欄は0
    sticky_note1 VARCHAR(3) DEFAULT '0',
    
    -- 24(X) 付箋2 (Sticky Note 2) | 1数字
    -- 0は付箋なし
    sticky_note2 VARCHAR(1) DEFAULT '0',
    
    -- 25(Y) [必須] 調整 (Adjustment) | 文字
    -- yes/true/on/1/-1 or no
    adjustment_flag VARCHAR(5) NOT NULL DEFAULT 'no', 
    
    -- Internal Metadata (Not exported to Yayoi)
    source_type VARCHAR(50), -- 'reservation', 'pos', 'manual'
    source_id VARCHAR(50),   -- ID of the source record
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id)
);

CREATE INDEX idx_acc_yayoi_export_date ON acc_yayoi_export_data (hotel_id, transaction_date);
CREATE INDEX idx_acc_yayoi_export_batch ON acc_yayoi_export_data (export_batch_id);
-- Create accounting departments table
-- Maps hotels to their accounting department codes (部門) for Yayoi exports

CREATE TABLE acc_departments (
    id SERIAL PRIMARY KEY,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(24) NOT NULL, -- Yayoi department name (部門) e.g., "WH室蘭"
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    UNIQUE (hotel_id),
    UNIQUE (name)
);

COMMENT ON TABLE acc_departments IS 'Maps hotels to accounting department codes for Yayoi exports';
COMMENT ON COLUMN acc_departments.name IS 'Accounting department name (部門) used in Yayoi CSV exports';

-- Create index for lookups
CREATE INDEX idx_acc_departments_hotel ON acc_departments(hotel_id);

-- Seed department codes for existing hotels
-- Update these values according to your actual hotel-to-department mapping
INSERT INTO acc_departments (hotel_id, name, created_by) VALUES
(24, 'WH室蘭', 1)
ON CONFLICT (hotel_id) DO NOTHING;
-- Add more INSERT statements as needed for other hotels
