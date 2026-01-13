-- Accounting Schema

-- 1. Account Codes Master
-- Defines the chart of accounts or specific codes used for external auditing/ledger.
CREATE TABLE acc_account_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    category1 VARCHAR(50), -- 区分1
    category2 VARCHAR(50), -- 区分2
    category3 VARCHAR(50), -- 区分3
    category4 VARCHAR(50), -- 区分4
    management_group_code INT, -- 順番
    management_group VARCHAR(100), -- 経営グループ
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    UNIQUE (code)
);

-- Seed Account Codes
INSERT INTO acc_account_codes (code, name, category1, category2, category3, category4, management_group_code, management_group, created_by) VALUES
('11100-01', '現金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 1),
('11100-02', '普通預金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 1),
('11100-03', '当座預金', '資産', '流動資産', '現金･預金', NULL, 11100, NULL, 1),
('11200-01', '売掛金', '資産', '流動資産', '売上負債', NULL, 11200, NULL, 1),
('11400-01', '貯蔵品', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 1),
('11400-02', '商品', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 1),
('11400-03', '販売用不動産', '資産', '流動資産', '棚卸資産', NULL, 11400, NULL, 1),
('11500-01', '仮払金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-02', '仮払消費税', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-03', '前渡金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-04', '前払費用', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-05', '未収還付消費税', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-06', '未収還付法人税等', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-07', '未収入金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-08', '立替金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('11500-09', '短期貸付金', '資産', '流動資産', '他流動資産', NULL, 11500, NULL, 1),
('12100-01', '土地', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12100-02', '建物', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12100-03', '工具器具備品', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12100-04', '一括償却資産', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12100-05', '構築物', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12100-06', '附属設備', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12100-07', '車両運搬具', '資産', '固定資産', '有形固定資産', NULL, 12100, NULL, 1),
('12200-01', 'ソフトウェア', '資産', '固定資産', '無形固定資産', NULL, 12200, NULL, 1),
('12200-02', '水道加入金', '資産', '固定資産', '無形固定資産', NULL, 12200, NULL, 1),
('12300-01', '長期前払費用', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('12300-02', '出資金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('12300-03', '敷金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('12300-04', '保証金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('12300-05', '預託金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('12300-06', '借上敷金', '資産', '固定資産', '投資等', NULL, 12300, NULL, 1),
('13100-01', '下水道事業受益者負担金', '資産', '繰延資産', '繰延資産', NULL, 13100, NULL, 1),
('13100-02', 'ホームページ制作費', '資産', '繰延資産', '繰延資産', NULL, 13100, NULL, 1),
('21100-01', '買掛金', '負債', '流動負債', '仕入債務', NULL, 21100, NULL, 1),
('21200-01', '仮受金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-02', '未払金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-03', '未払消費税', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-04', '未払費用', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-05', '未払法人税等', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-06', '仮受消費税', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-07', '預り金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-08', '短期借入金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-09', '前受金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-10', '前受収益', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('21200-11', '賞与引当金', '負債', '流動負債', '他流動負債', NULL, 21200, NULL, 1),
('22100-01', '長期借入金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('22100-02', '預り敷金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('22100-03', '社債', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('22100-04', '長期未払金', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('22100-05', '転換社債', '負債', '固定負債', '固定負債', NULL, 22100, NULL, 1),
('41100-01', 'フード事業', '売上高', '売上高', '売上高', NULL, 41100, '01_売上高', 1),
('41100-02', 'ふるさと納税売上', '売上高', '売上高', '売上高', NULL, 41100, '01_売上高', 1),
('41100-03', '不動産販売収入', '売上高', '売上高', '売上高', NULL, 41100, '01_売上高', 1),
('41100-04', '宿泊事業売上', '売上高', '売上高', '売上高', NULL, 41100, '01_売上高', 1),
('41100-05', '業務受託収入', '売上高', '売上高', '売上高', NULL, 41100, '01_売上高', 1),
('41100-06', '賃貸管理事業売', '売上高', '売上高', '売上高', NULL, 41100, '01_売上高', 1),
('51110-01', '期首商品棚卸高', '売上原価', '売上原価', '売上原価', '期首商品棚卸', 51110, '02_売上原価', 1),
('51120-01', 'ふるさと納税仕入', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, '02_売上原価', 1),
('51120-02', 'その他原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, '02_売上原価', 1),
('51120-03', '飲食売上原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, '02_売上原価', 1),
('51120-04', '水道光熱費原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, '02_売上原価', 1),
('51120-05', '賃貸管理仕入', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, '02_売上原価', 1),
('51120-06', '不動産販売原価', '売上原価', '売上原価', '売上原価', '当期商品仕入', 51120, '02_売上原価', 1),
('51140-01', '期末商品棚卸高', '売上原価', '売上原価', '売上原価', '期末商品棚卸', 51140, '02_売上原価', 1),
('61100-01', '給料手当', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-02', '人件費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-03', '研修費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-04', '通勤費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-05', '福利厚生費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-06', '法定福利費', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-07', '役員報酬', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61100-08', '賞与引当金繰入額', '販売管理費', '販売管理費', '販売管理費', NULL, 61100, '03_人件費', 1),
('61101-01', '販売手数料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-02', 'リース料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-03', '交際費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-04', '広告宣伝費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-05', '水道光熱費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-06', '会議費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-07', '車両費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-08', '修繕費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-09', '諸会費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-10', '消耗品費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-11', '新聞図書費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-12', '通信費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-13', '旅費交通費', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-14', '寄付金', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-15', '支払手数料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-16', '支払報酬', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-17', '保険料', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-18', '地代家賃', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61101-19', '租税公課', '販売管理費', '販売管理費', '販売管理費', NULL, 61101, '04_経費', 1),
('61109-01', '減価償却費', '販売管理費', '販売管理費', '販売管理費', NULL, 61109, '05_減価償却費', 1),
('61109-02', '雑費', '販売管理費', '販売管理費', '販売管理費', NULL, 61109, '04_経費', 1),
('71100-01', '受取利息', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, '06_営業外収入', 1),
('71100-02', '雑収入', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, '06_営業外収入', 1),
('71100-03', '受取配当金', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, '06_営業外収入', 1),
('71100-04', '賞与引当金戻入益', '営業外収益', '営業外収益', '営業外収益', NULL, 71100, '06_営業外収入', 1),
('81100-01', 'その他営業外費用', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, '07_営業外費用', 1),
('81100-02', '支払利息', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, '07_営業外費用', 1),
('81100-03', '社債利息', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, '07_営業外費用', 1),
('81100-04', '雑損失', '営業外費用', '営業外費用', '営業外費用', NULL, 81100, '07_営業外費用', 1),
('91100-01', '補助金収入', '特別利益', '特別利益', '特別利益', NULL, 91100, '08_特別利益', 1),
('91100-02', '固定資産売却益', '特別利益', '特別利益', '特別利益', NULL, 91100, '08_特別利益', 1),
('101100-01', '固定資産売却損', '特別損失', '特別損失', '特別損失', NULL, 101100, '09_特別損失', 1),
('101100-02', '固定資産除却損', '特別損失', '特別損失', '特別損失', NULL, 101100, '09_特別損失', 1),
('101100-03', 'その他特別損失', '特別損失', '特別損失', '特別損失', NULL, 101100, '09_特別損失', 1),
('111100-01', '法人税等', '当期純損益', '当期純損益', '当期純損益', NULL, 111100, '10_法人税等', 1);

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
