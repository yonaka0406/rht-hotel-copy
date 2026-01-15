const fs = require('fs');

const rawData = `勘定科目\t区分1\t区分2\t区分3\t区分4\t順番\t経営グループ
現金\t資産\t流動資産\t現金･預金\t\t11100\t
普通預金\t資産\t流動資産\t現金･預金\t\t11100\t
当座預金\t資産\t流動資産\t現金･預金\t\t11100\t
売掛金\t資産\t流動資産\t売上負債\t\t11200\t
貯蔵品\t資産\t流動資産\t棚卸資産\t\t11400\t
商品\t資産\t流動資産\t棚卸資産\t\t11400\t
販売用不動産\t資産\t流動資産\t棚卸資産\t\t11400\t
仮払金\t資産\t流動資産\t他流動資産\t\t11500\t
仮払消費税\t資産\t流動資産\t他流動資産\t\t11500\t
前渡金\t資産\t流動資産\t他流動資産\t\t11500\t
前払費用\t資産\t流動資産\t他流動資産\t\t11500\t
未収還付消費税\t資産\t流動資産\t他流動資産\t\t11500\t
未収還付法人税等\t資産\t流動資産\t他流動資産\t\t11500\t
未収入金\t資産\t流動資産\t他流動資産\t\t11500\t
立替金\t資産\t流動資産\t他流動資産\t\t11500\t
短期貸付金\t資産\t流動資産\t他流動資産\t\t11500\t
土地\t資産\t固定資産\t有形固定資産\t\t12100\t
建物\t資産\t固定資産\t有形固定資産\t\t12100\t
工具器具備品\t資産\t固定資産\t有形固定資産\t\t12100\t
一括償却資産\t資産\t固定資産\t有形固定資産\t\t12100\t
構築物\t資産\t固定資産\t有形固定資産\t\t12100\t
附属設備\t資産\t固定資産\t有形固定資産\t\t12100\t
車両運搬具\t資産\t固定資産\t有形固定資産\t\t12100\t
ソフトウェア\t資産\t固定資産\t無形固定資産\t\t12200\t
水道加入金\t資産\t固定資産\t無形固定資産\t\t12200\t
長期前払費用\t資産\t固定資産\t投資等\t\t12300\t
出資金\t資産\t固定資産\t投資等\t\t12300\t
敷金\t資産\t固定資産\t投資等\t\t12300\t
保証金\t資産\t固定資産\t投資等\t\t12300\t
預託金\t資産\t固定資産\t投資等\t\t12300\t
借上敷金\t資産\t固定資産\t投資等\t\t12300\t
下水道事業受益者負担金\t資産\t繰延資産\t繰延資産\t\t13100\t
ホームページ制作費\t資産\t繰延資産\t繰延資産\t\t13100\t
買掛金\t負債\t流動負債\t仕入債務\t\t21100\t
仮受金\t負債\t流動負債\t他流動負債\t\t21200\t
未払金\t負債\t流動負債\t他流動負債\t\t21200\t
未払消費税\t負債\t流動負債\t他流動負債\t\t21200\t
未払費用\t負債\t流動負債\t他流動負債\t\t21200\t
未払法人税等\t負債\t流動負債\t他流動負債\t\t21200\t
仮受消費税\t負債\t流動負債\t他流動負債\t\t21200\t
預り金\t負債\t流動負債\t他流動負債\t\t21200\t
短期借入金\t負債\t流動負債\t他流動負債\t\t21200\t
前受金\t負債\t流動負債\t他流動負債\t\t21200\t
前受収益\t負債\t流動負債\t他流動負債\t\t21200\t
賞与引当金\t負債\t流動負債\t他流動負債\t\t21200\t
長期借入金\t負債\t固定負債\t固定負債\t\t22100\t
預り敷金\t負債\t固定負債\t固定負債\t\t22100\t
社債\t負債\t固定負債\t固定負債\t\t22100\t
長期未払金\t負債\t固定負債\t固定負債\t\t22100\t
転換社債\t負債\t固定負債\t固定負債\t\t22100\t
フード事業\t売上高\t売上高\t売上高\t\t41100\t01_売上高
ふるさと納税売上\t売上高\t売上高\t売上高\t\t41100\t01_売上高
不動産販売収入\t売上高\t売上高\t売上高\t\t41100\t01_売上高
宿泊事業売上\t売上高\t売上高\t売上高\t\t41100\t01_売上高
業務受託収入\t売上高\t売上高\t売上高\t\t41100\t01_売上高
賃貸管理事業売\t売上高\t売上高\t売上高\t\t41100\t01_売上高
期首商品棚卸高\t売上原価\t売上原価\t売上原価\t期首商品棚卸\t51110\t02_売上原価
ふるさと納税仕入\t売上原価\t売上原価\t売上原価\t当期商品仕入\t51120\t02_売上原価
その他原価\t売上原価\t売上原価\t売上原価\t当期商品仕入\t51120\t02_売上原価
飲食売上原価\t売上原価\t売上原価\t売上原価\t当期商品仕入\t51120\t02_売上原価
水道光熱費原価\t売上原価\t売上原価\t売上原価\t当期商品仕入\t51120\t02_売上原価
賃貸管理仕入\t売上原価\t売上原価\t売上原価\t当期商品仕入\t51120\t02_売上原価
不動産販売原価\t売上原価\t売上原価\t売上原価\t当期商品仕入\t51120\t02_売上原価
期末商品棚卸高\t売上原価\t売上原価\t売上原価\t期末商品棚卸\t51140\t02_売上原価
給料手当\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
人件費\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
研修費\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
通勤費\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
福利厚生費\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
法定福利費\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
役員報酬\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
賞与引当金繰入額\t販売管理費\t販売管理費\t販売管理費\t\t61100\t03_人件費
販売手数料\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
リース料\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
交際費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
広告宣伝費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
水道光熱費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
会議費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
車両費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
修繕費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
諸会費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
消耗品費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
新聞図書費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
通信費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
旅費交通費\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
寄付金\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
支払手数料\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
支払報酬\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
保険料\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
地代家賃\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
租税公課\t販売管理費\t販売管理費\t販売管理費\t\t61101\t04_経費
減価償却費\t販売管理費\t販売管理費\t販売管理費\t\t61109\t05_減価償却費
雑費\t販売管理費\t販売管理費\t販売管理費\t\t61109\t04_経費
受取利息\t営業外収益\t営業外収益\t営業外収益\t\t71100\t06_営業外収入
雑収入\t営業外収益\t営業外収益\t営業外収益\t\t71100\t06_営業外収入
受取配当金\t営業外収益\t営業外収益\t営業外収益\t\t71100\t06_営業外収入
賞与引当金戻入益\t営業外収益\t営業外収益\t営業外収益\t\t71100\t06_営業外収入
その他営業外費用\t営業外費用\t営業外費用\t営業外費用\t\t81100\t07_営業外費用
支払利息\t営業外費用\t営業外費用\t営業外費用\t\t81100\t07_営業外費用
社債利息\t営業外費用\t営業外費用\t営業外費用\t\t81100\t07_営業外費用
雑損失\t営業外費用\t営業外費用\t営業外費用\t\t81100\t07_営業外費用
補助金収入\t特別利益\t特別利益\t特別利益\t\t91100\t08_特別利益
固定資産売却益\t特別利益\t特別利益\t特別利益\t\t91100\t08_特別利益
固定資産売却損\t特別損失\t特別損失\t特別損失\t\t101100\t09_特別損失
固定資産除却損\t特別損失\t特別損失\t特別損失\t\t101100\t09_特別損失
その他特別損失\t特別損失\t特別損失\t特別損失\t\t101100\t09_特別損失
法人税等\t当期純損益\t当期純損益\t当期純損益\t\t111100\t10_法人税等`;

const rows = rawData.split('\n').filter(r => r.trim());

let sql = `-- Accounting Schema (Updated)

-- Drop existing tables if they exist to reset
DROP TABLE IF EXISTS acc_accounting_mappings CASCADE;
DROP TABLE IF EXISTS acc_account_codes CASCADE;

-- 1. Account Codes Master
CREATE TABLE acc_account_codes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- 勘定科目
    classification1 VARCHAR(50), -- 区分1 (Assets, Liabilities, etc.)
    classification2 VARCHAR(50), -- 区分2
    classification3 VARCHAR(50), -- 区分3
    classification4 VARCHAR(50), -- 区分4
    display_code VARCHAR(20), -- 順番 (Sort Order / Group Code)
    management_group VARCHAR(50), -- 経営グループ
    
    description TEXT, 
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    
    -- Name should be unique within the same Classification1 (to avoid ambiguity)
    UNIQUE (name, classification1)
);

-- Seed Account Codes
INSERT INTO acc_account_codes (name, classification1, classification2, classification3, classification4, display_code, management_group, created_by) VALUES
`;

const values = [];

// Skip header
for (let i = 1; i < rows.length; i++) {
    const cols = rows[i].split('\t').map(c => c.trim());
    if (cols.length < 2) continue; // Skip empty lines or invalid rows
    
    const name = cols[0];
    const c1 = cols[1];
    const c2 = cols[2];
    const c3 = cols[3];
    const c4 = cols[4];
    const order = cols[5];
    const mg = cols[6];

    values.push(`('${name}', '${c1}', '${c2}', '${c3}', '${c4}', '${order}', '${mg}', 1)`);
}

sql += values.join(',\n') + ';\n\n';

sql += `-- 2. Accounting Mappings
CREATE TABLE acc_accounting_mappings (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE, -- NULL for Global Defaults
    
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('plan_hotel', 'plan_type_category', 'plan_package_category', 'addon_hotel', 'addon_global')),
    target_id INT NOT NULL, 
    
    account_code_id INT NOT NULL REFERENCES acc_account_codes(id),
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by INT REFERENCES users(id),
    
    UNIQUE (hotel_id, target_type, target_id)
);

CREATE INDEX idx_acc_accounting_mappings_lookup ON acc_accounting_mappings (hotel_id, target_type, target_id);
CREATE INDEX idx_acc_accounting_mappings_account_code ON acc_accounting_mappings (account_code_id);
`;

console.log(sql);
