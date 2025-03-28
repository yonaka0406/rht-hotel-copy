GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rhtsys_user;
GRANT CREATE ON SCHEMA public TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rhtsys_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rhtsys_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO rhtsys_user;
GRANT REFERENCES ON ALL TABLES IN SCHEMA public TO rhtsys_user;

/*
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_roles TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_status TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE logs_user TO rhtsys_user;
*/

CREATE TABLE user_status (
    id SERIAL PRIMARY KEY,                
    status_name VARCHAR(50) NOT NULL UNIQUE, 
    description TEXT    
);

INSERT INTO user_status (status_name, description)
    VALUES 
        ('有効', '有効アカウント'),
        ('無効', '無効アカウント');

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE, -- Role name (e.g., 'Admin', 'User')
    permissions JSONB DEFAULT '{}', -- Permissions in JSON format for flexibility
    description TEXT    
);

INSERT INTO user_roles (role_name, permissions, description)
    VALUES 
        ('Admin', '{"manage_db": true, "manage_users": true, "manage_clients": true, "view_reports": true}', '管理パネルにアクセスし、データベースとすべてのホテルの管理を含む、システムへのフルアクセス権。'),
        ('Manager', '{"manage_db": false, "manage_users": true, "manage_clients": true, "view_reports": true}', '管理パネルにアクセスし、ユーザーを管理できますが、ホテル データベースを管理することはできません。'),
        ('Editor', '{"manage_db": false, "manage_users": false, "manage_clients": true, "view_reports": true}', '顧客を編集し、レポートを閲覧できます。'),
        ('Viewer', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": true}', 'レポートを閲覧できます。'),
        ('User', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": false}', '特別な権限のないデフォルトのロール。');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    status_id INT REFERENCES user_status(id) DEFAULT 1,        -- Status ID (default to 1, representing 'active')
    role_id INT REFERENCES user_roles(id) DEFAULT 5,          -- Role ID (default to 4, referencing 'Viewer' role)    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    
);

    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    INSERT INTO users (email, password_hash, role_id)
    VALUES ('root@rht-hotel.com', crypt('rootPassword!@123', gen_salt('bf')), 1);

    ALTER TABLE users
    ADD COLUMN created_by INT REFERENCES users(id),
    ADD COLUMN updated_by INT DEFAULT NULL REFERENCES users(id);

    ALTER TABLE user_status
    ADD COLUMN updated_by INT DEFAULT NULL REFERENCES users(id);

    ALTER TABLE user_roles
    ADD COLUMN updated_by INT DEFAULT NULL REFERENCES users(id);

-- Main Hotels Table
CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    formal_name VARCHAR(255),   -- 正式名称 (Formal Name)
    name VARCHAR(255) NOT NULL,                
    facility_type VARCHAR(255), -- 施設区分 (Facility Type)
    open_date DATE,             -- オープン日 (Opening Date)
    total_rooms INT,           -- 総客室数 (Total Rooms)
    postal_code VARCHAR(20),   -- 施設郵便番号 (Facility Postal Code)
    address TEXT,              -- 住所 (Address)
    email TEXT,
    phone_number VARCHAR(20),  -- 施設電話番号 (Facility Phone Number)
    latitude DECIMAL(9, 6),    -- Latitude (coordinates)
    longitude DECIMAL(9, 6),   -- Longitude (coordinates)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

CREATE TABLE room_types (
    id SERIAL,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE, 
    name TEXT NOT NULL, -- Example: 'Deluxe', 'Suite'
    description TEXT,    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, name)
) PARTITION BY LIST (hotel_id);

CREATE TABLE rooms (
    id SERIAL,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INT NOT NULL,
    floor INT NOT NULL DEFAULT 1, -- Floor number where the room is located
    room_number TEXT NOT NULL, -- Room identifier
    capacity INT NOT NULL DEFAULT 1, -- Max number of guests
    smoking BOOLEAN NOT NULL DEFAULT FALSE,
    for_sale BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, room_type_id, room_number), -- Prevent duplicate room numbers in a single hotel
    FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);

CREATE TABLE room_inventory (
    id SERIAL,
    hotel_id INT NOT NULL REFERENCES hotels(id),
    room_type_id INT NOT NULL,
    date DATE NOT NULL,  
    quantity INT NOT NULL CHECK (quantity >= 0), -- Number of reservations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, room_type_id, date), -- Ensures one record per room type per day
    FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),    
    name TEXT NOT NULL DEFAULT 'TBD', -- Placeholder until check-in    
    name_kana TEXT, -- Kana (phonetic) version of first name
    name_kanji TEXT,  -- Kanji version of last name
    date_of_birth DATE, -- Client's date of birth (optional)
    legal_or_natural_person TEXT CHECK (legal_or_natural_person IN ('legal', 'natural')), -- Indicates if the client is a legal entity or a natural person
    gender TEXT DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other')), -- Client's gender (optional)
    email TEXT, -- Nullable
    phone TEXT, -- Nullable
    fax TEXT, -- Fax number for the client
    client_group_id UUID DEFAULT NULL REFERENCES client_group(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);
-- Default Client for status block
INSERT INTO clients (id, name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
VALUES
('11111111-1111-1111-1111-111111111111', '予約不可', 'ヨヤクフカ', '予約不可', NULL, 'legal', 'other', NULL, '1234567890', NULL, 1, 1)

-- Mock data generator
INSERT INTO clients (
    name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, 
    gender, email, phone, fax, created_by
)
SELECT 
    ('Client ' || random_number) AS name,
    ('クライアント' || random_number) AS name_kana,
    ('顧客' || random_number) AS name_kanji,
    (CURRENT_DATE - (floor(random() * 365 * 50) || ' days')::INTERVAL)::DATE AS date_of_birth,
    CASE WHEN random_boolean THEN 'natural' ELSE 'legal' END AS legal_or_natural_person,
    CASE 
        WHEN random() < 0.8 AND random_boolean THEN 'male' 
        WHEN random() >= 0.2 AND random_boolean THEN 'female' 
        ELSE 'other' 
    END AS gender,
    ('client' || random_number || '@example.com') AS email,
    ('050-' || floor(random() * 9000 + 1000)::TEXT || '-' || floor(random() * 9000 + 1000)::TEXT) AS phone,
    ('03-' || floor(random() * 9000 + 1000)::TEXT || '-' || floor(random() * 9000 + 1000)::TEXT) AS fax,
    1 AS created_by
FROM (
    SELECT 
        generate_series(1, 100000) AS id,
        floor(random() * 99000)::TEXT AS random_number,
		CASE WHEN random() < 0.5 THEN TRUE ELSE FALSE END AS random_boolean
) AS random_data;


-- Mock data for 'clients' table
    INSERT INTO clients (id, name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
    VALUES
    -- Natural persons with different gender options    
    ('22222222-2222-2222-2222-222222222222', 'Jane Smith', 'ジェーン・スミス', 'ジェーン氏', '1990-07-25', 'natural', 'female', 'janesmith@example.com', '+9876543210', NULL, 2, NULL),
    ('33333333-3333-3333-3333-333333333333', 'Alex Taylor', 'アレックス・テイラー', 'アレックス太郎', '2000-01-10', 'natural', 'other', 'alextaylor@example.com', NULL, '+1234509876', 3, 1),

    -- Legal entities
    ('44444444-4444-4444-4444-444444444444', 'TechCorp', NULL, NULL, NULL, 'legal', NULL, 'info@techcorp.com', '+1234901234', '+1234901235', 1, NULL),
    ('55555555-5555-5555-5555-555555555555', 'Finance Ltd.', NULL, NULL, NULL, 'legal', NULL, 'contact@financeltd.com', '+9876509876', NULL, 2, NULL),

    -- Clients with minimal data
    ('66666666-6666-6666-6666-666666666666', 'TBD', NULL, NULL, NULL, 'natural', 'other', NULL, NULL, NULL, 1, NULL),
    ('77777777-7777-7777-7777-777777777777', 'TBD', NULL, NULL, NULL, 'legal', NULL, NULL, NULL, NULL, 1, NULL),

    -- Clients with updated data
    ('88888888-8888-8888-8888-888888888888', 'Emily Brown', 'エミリー・ブラウン', 'エミリ茶', '1985-09-30', 'natural', 'female', 'emilybrown@example.com', '+1234987654', NULL, 3, 2),
    ('99999999-9999-9999-9999-999999999999', 'Global Trade Co.', NULL, NULL, NULL, 'legal', NULL, 'support@globaltrade.com', NULL, '+1234909876', 1, 1),

    -- Unique combinations with edge cases
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Chris Lee', 'クリス・リー', 'クリス李', NULL, 'natural', 'male', 'chrislee@example.com', NULL, NULL, 1, NULL),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TBD', NULL, NULL, NULL, 'natural', 'other', NULL, NULL, NULL, 1, NULL);

    -- Mock data for 'clients' table with Japanese names
    INSERT INTO clients (name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
    VALUES
    ('Yamada Taro', 'ヤマダ タロウ', '山田 太郎', '1985-06-12', 'natural', 'male', 'yamada.taro@example.com', '+819012345678', '+819012345679', 1, NULL),
    ('Tanaka Hanako', 'タナカ ハナコ', '田中 花子', '1992-04-20', 'natural', 'female', 'tanaka.hanako@example.com', '+819876543210', NULL, 2, NULL),
    ('Suzuki Ichiro', 'スズキ イチロウ', '鈴木 一郎', '1978-03-15', 'natural', 'male', 'suzuki.ichiro@example.com', NULL, NULL, 3, 1),
    ('Kobayashi Sakura', 'コバヤシ サクラ', '小林 桜', '2000-07-10', 'natural', 'female', 'kobayashi.sakura@example.com', '+818012345678', '+818012345679', 1, 2),
    ('Fujimoto Hiroshi', 'フジモト ヒロシ', '藤本 弘', '1965-11-25', 'natural', 'male', 'fujimoto.hiroshi@example.com', '+817012345678', NULL, 2, NULL),
    ('Shimizu Akira', 'シミズ アキラ', '清水 明', NULL, 'natural', 'other', 'shimizu.akira@example.com', '+819876543212', '+819876543213', 3, NULL),
    ('Kato Mai', 'カトウ マイ', '加藤 舞', '1999-02-14', 'natural', 'female', 'kato.mai@example.com', NULL, NULL, 1, 3),
    ('Nakamura Sota', 'ナカムラ ソウタ', '中村 壮太', '1987-12-01', 'natural', 'male', 'nakamura.sota@example.com', '+819012345676', NULL, 2, NULL),
    ('Sato Haruki', 'サトウ ハルキ', '佐藤 陽輝', '1995-09-22', 'natural', 'other', 'sato.haruki@example.com', '+818765432109', NULL, 3, 1),
    ('Matsumoto Yuki', 'マツモト ユキ', '松本 優希', NULL, 'natural', 'female', 'matsumoto.yuki@example.com', NULL, NULL, 1, NULL),
    ('Ota Takumi', 'オオタ タクミ', '太田 匠', '1980-01-30', 'natural', 'male', 'ota.takumi@example.com', '+819012345670', '+819012345671', 2, NULL),
    ('Ishikawa Rina', 'イシカワ リナ', '石川 里奈', '2001-08-05', 'natural', 'female', 'ishikawa.rina@example.com', NULL, NULL, 3, 2),
    ('Hasegawa Kenji', 'ハセガワ ケンジ', '長谷川 健二', '1975-05-14', 'natural', 'male', 'hasegawa.kenji@example.com', '+817654321098', '+817654321099', 1, NULL),
    ('Yoshida Nao', 'ヨシダ ナオ', '吉田 奈緒', '1990-10-18', 'natural', 'female', 'yoshida.nao@example.com', '+818012345672', NULL, 2, NULL),
    ('Takeda Sho', 'タケダ ショウ', '武田 翔', NULL, 'natural', 'other', 'takeda.sho@example.com', NULL, '+818765432100', 3, 1);

    -- Mock data for 'clients' table with Japanese companies
    INSERT INTO clients (name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
    VALUES
    -- Companies with full contact information
    ('Sumitomo Corporation', 'スミトモ コーポレーション', '住友商事', NULL, 'legal', NULL, 'info@sumitomo.co.jp', '+81312345678', '+81312345679', 1, NULL),
    ('Mitsui & Co., Ltd.', 'ミツイ', '三井物産', NULL, 'legal', NULL, 'contact@mitsui.co.jp', '+81398765432', '+81398765433', 2, NULL),
    ('SoftBank Group Corp.', 'ソフトバンク', 'ソフトバンクグループ', NULL, 'legal', NULL, 'support@softbank.jp', '+81387654321', '+81387654322', 3, 1),
    ('Rakuten, Inc.', 'ラクテン', '楽天', NULL, 'legal', NULL, 'help@rakuten.jp', '+81376543210', '+81376543211', 1, 2),
    ('Toyota Motor Corporation', 'トヨタ', 'トヨタ自動車', NULL, 'legal', NULL, 'contact@toyota.jp', '+81562345678', '+81562345679', 2, NULL),

    -- Companies with partial contact information
    ('Sony Group Corporation', 'ソニー', 'ソニーグループ', NULL, 'legal', NULL, 'sony@example.jp', '+81354321098', NULL, 3, NULL),
    ('Nintendo Co., Ltd.', 'ニンテンドウ', '任天堂', NULL, 'legal', NULL, NULL, '+81612345678', '+81612345679', 1, NULL),
    ('Panasonic Holdings Corporation', 'パナソニック', 'パナソニックホールディングス', NULL, 'legal', NULL, 'support@panasonic.jp', NULL, NULL, 2, 3),
    ('Shiseido Company, Limited', 'シセイドウ', '資生堂', NULL, 'legal', NULL, NULL, NULL, NULL, 3, 1),
    ('Hitachi, Ltd.', 'ヒタチ', '日立製作所', NULL, 'legal', NULL, 'info@hitachi.co.jp', '+81234567890', '+81234567891', 1, 2),

    -- Companies with minimal data
    ('TBD', NULL, NULL, NULL, 'legal', NULL, NULL, NULL, NULL, 2, NULL),
    ('Kirin Holdings Company, Limited', 'キリン', 'キリンホールディングス', NULL, 'legal', NULL, NULL, '+81365432109', NULL, 3, NULL),
    ('Nippon Steel Corporation', 'ニッポン スチール', '日本製鉄', NULL, 'legal', NULL, 'support@nipponsteel.jp', '+81343210987', '+81343210988', 1, NULL),

    -- Unique cases
    ('Dentsu Group Inc.', 'デンツウ', '電通グループ', NULL, 'legal', NULL, 'dentsu@example.com', NULL, '+81356789012', 2, 3),
    ('Nippon Telegraph and Telephone Corporation', 'エヌティティ', '日本電信電話', NULL, 'legal', NULL, 'ntt@ntt.co.jp', '+81323456789', '+81323456790', 3, NULL),
    ('Takeda Pharmaceutical Company Limited', 'タケダ', '武田薬品工業', NULL, 'legal', NULL, 'info@takeda.co.jp', '+81334567890', NULL, 1, NULL),
    ('Seven & I Holdings Co., Ltd.', 'セブンアンドアイ', 'セブン&アイ・ホールディングス', NULL, 'legal', NULL, 'seven@example.co.jp', NULL, '+81345678901', 2, NULL),
    ('Asahi Group Holdings, Ltd.', 'アサヒ', 'アサヒグループホールディングス', NULL, 'legal', NULL, NULL, NULL, '+81367890123', 3, 1);

--https://wanakana.com/ ??
--npm install jisho-api
--npm install kanji-lookup
--npm install japaneasy

CREATE TABLE addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
    address_name TEXT,
    representative_name TEXT,
    street TEXT,
    state TEXT,
    city TEXT,
    postal_code TEXT,
    country TEXT,
    phone TEXT,
    fax TEXT,
    email TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

CREATE TABLE client_group (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id),
  updated_by INT DEFAULT NULL REFERENCES users(id)
);

ALTER TABLE clients 
ADD COLUMN client_group_id UUID DEFAULT NULL REFERENCES client_group(id);

CREATE TABLE plans_global (
    id SERIAL PRIMARY KEY,    
    name TEXT NOT NULL,
    description TEXT,     
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);

INSERT INTO plans_global (id, name, description, created_by)
VALUES
    (1, '素泊まり', '', 1),
    (2, '1食', '', 1),
    (3, '2食', '', 1),
    (4, '3食', '', 1),
    (5, '荷物キープ', '', 1);

CREATE TABLE plans_hotel (
    id SERIAL,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',  
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, name)
) PARTITION BY LIST (hotel_id);

CREATE TABLE plans_rates (
    id SERIAL PRIMARY KEY,
    hotel_id INT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- hotel, NULL for global adjustments
    plans_global_id INT REFERENCES plans_global(id) ON DELETE CASCADE,
    plans_hotel_id INT,
    adjustment_type TEXT CHECK (adjustment_type IN ('base_rate', 'percentage', 'flat_fee')) NOT NULL,  -- Type of adjustment
    adjustment_value DECIMAL(10, 2) NOT NULL,  -- The value of the adjustment (e.g., 10% or $20)
    condition_type TEXT CHECK (condition_type IN ('no_restriction', 'day_of_week', 'month')) NOT NULL,  -- Type of condition
    condition_value TEXT NULL,  -- The specific condition (e.g., '土曜日', '2024-12-25', etc.)
    date_start DATE NOT NULL, -- Start of the applicable rate
    date_end DATE DEFAULT NULL, -- End of the applicable rate (NULL = no end date)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),    
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE,
    CHECK (
        (plans_global_id IS NOT NULL AND plans_hotel_id IS NULL) OR 
        (plans_global_id IS NULL AND plans_hotel_id IS NOT NULL)
    )
);

CREATE TABLE addons_global (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL, -- Name of the add-on (e.g., Breakfast, Dinner, etc.)
    description TEXT, -- Optional description
    price DECIMAL NOT NULL, -- Price of the add-on service
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name) -- Ensure global add-ons have unique names
);

INSERT INTO addons_global (id, name, description, price, created_by)
VALUES
    (1, '朝食', '', 0, 1),
    (2, '夕食', '', 0, 1),
    (3, '駐車場', '', 0, 1),
    (4, 'お弁当', '', 0, 1);

CREATE TABLE addons_hotel (
    id SERIAL,    
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    addons_global_id INT REFERENCES addons_global(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- Name of the add-on (e.g., Breakfast, Dinner, etc.)
    description TEXT, -- Optional description
    price DECIMAL NOT NULL, -- Price of the add-on service
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, name)
) PARTITION BY LIST (hotel_id);

CREATE TABLE plan_addons (
    id SERIAL PRIMARY KEY,
    hotel_id INT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE CASCADE,
    plans_hotel_id INT,
    addons_global_id INT REFERENCES addons_global(id) ON DELETE CASCADE,
    addons_hotel_id INT,
    price DECIMAL(10, 2) NOT NULL, -- Add the price column, ensuring non-null values
    date_start DATE NOT NULL, -- Start of the applicable rate
    date_end DATE DEFAULT NULL, -- End of the applicable rate (NULL = no end date)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),    
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (addons_hotel_id, hotel_id) REFERENCES addons_hotel(id, hotel_id) ON DELETE CASCADE,
    CHECK (
        (plans_global_id IS NOT NULL AND plans_hotel_id IS NULL) OR 
        (plans_global_id IS NULL AND plans_hotel_id IS NOT NULL)
    ),
    CHECK (
        (addons_global_id IS NOT NULL AND addons_hotel_id IS NULL) OR 
        (addons_global_id IS NULL AND addons_hotel_id IS NOT NULL)
    )
);

CREATE TABLE reservations (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Reservation's hotel    
    reservation_client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE, -- Reference to the client representing the company    
    check_in DATE NOT NULL,
    check_in_time TIME DEFAULT '16:00',
    check_out DATE NOT NULL,  
    check_out_time TIME DEFAULT '10:00',
    number_of_people INT NOT NULL,  
    status TEXT CHECK (status IN ('hold', 'provisory', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'block')) NOT NULL DEFAULT 'hold',
    type TEXT CHECK (type IN ('default', 'employee', 'ota', 'web')) NOT NULL DEFAULT 'default',
    agent TEXT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id)
) PARTITION BY LIST (hotel_id);

ALTER TABLE reservations
ADD COLUMN agent TEXT NULL;
ALTER TABLE reservations 
ADD COLUMN check_in_time TIME DEFAULT '16:00',
ADD COLUMN check_out_time TIME DEFAULT '10:00';


CREATE TABLE reservation_details (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Reservation's hotel
    reservation_id UUID NOT NULL,    
    date DATE NOT NULL,
    room_id INT,
    plans_global_id INT REFERENCES plans_global(id),
    plans_hotel_id INT,
    number_of_people INT NOT NULL,
    price DECIMAL,
    cancelled UUID DEFAULT NULL,
    billable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, reservation_id, room_id, date, cancelled),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id, hotel_id) REFERENCES rooms(id, hotel_id),
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)
) PARTITION BY LIST (hotel_id);

ALTER TABLE reservation_details
ALTER COLUMN billable SET DEFAULT FALSE;
ALTER TABLE reservation_details DROP COLUMN payer_client_id;


CREATE TABLE reservation_addons (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_detail_id UUID NOT NULL,
    addons_global_id INT REFERENCES addons_global(id),
    addons_hotel_id INT,
    quantity INT NOT NULL DEFAULT 1, 
    price DECIMAL NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_detail_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE,
	FOREIGN KEY (addons_hotel_id, hotel_id) REFERENCES addons_hotel(id, hotel_id)
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_clients (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_details_id UUID NOT NULL, -- Reference to reservation_details table
    client_id UUID NOT NULL REFERENCES clients(id), -- Reference to clients table    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_details_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE    
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_payments (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_id UUID NOT NULL, -- Reference to reservations table
    date DATE NOT NULL,
    room_id INT,
    client_id UUID NOT NULL REFERENCES clients(id), -- Reference to clients table
    payment_type_id INT NOT NULL REFERENCES payment_types(id), -- Reference to payment_types table
    value DECIMAL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);

/*ATENCAO: ADICIONAR TABELA A QUERY DA PARTITION
CREATE TABLE reservation_payments_7 
PARTITION OF reservation_payments 
FOR VALUES IN (7)
*/

CREATE TABLE payment_types (
    id SERIAL PRIMARY KEY, 
    hotel_id INT REFERENCES hotels(id) DEFAULT NULL, -- Reservation's hotel   
    name TEXT NOT NULL,
    description TEXT,     
    transaction TEXT CHECK (transaction IN ('cash', 'wire', 'credit', 'bill', 'point', 'discount')) NOT NULL DEFAULT 'cash',
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);
INSERT INTO payment_types (id, name, transaction, created_by)
VALUES
    (1, '現金', 'cash', 1),
    (2, 'ネットポイント', 'point', 1),
    (3, '事前振り込み', 'wire', 1),
    (4, 'クレジットカード', 'credit', 1),
    (5, '請求書', 'bill', 1),
    (6, '割引', 'discount', 1);

ALTER TABLE payment_types DROP CONSTRAINT payment_types_transaction_check;

ALTER TABLE payment_types 
ADD CONSTRAINT payment_types_transaction_check 
CHECK (transaction IN ('cash', 'wire', 'credit', 'bill', 'point', 'discount'));

--Ainda nao esta certo que vai ser usada

    CREATE TABLE user_hotels (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        hotel_id VARCHAR(6) NOT NULL,
        PRIMARY KEY (user_id, hotel_id)
    );

--Reservations Schema Candidate

CREATE TABLE parking_spots (
    id SERIAL PRIMARY KEY,
    spot_number TEXT NOT NULL UNIQUE,
    reserved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE xml_templates (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    template XML NOT NULL
);

INSERT INTO xml_templates (name, template) VALUES 
('NetRoomTypeMasterSearchService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc1002.pmsfc10.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockSearchService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc2002.pmsfc20.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedure>{{extractionProcedure}}</extractionProcedure>
               <searchDurationFrom>{{searchDurationFrom}}</searchDurationFrom>
               <searchDurationTo>{{searchDurationTo}}</searchDurationTo>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockAdjustmentService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3002.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <remainingCount>{{remainingCount}}</remainingCount>
               <salesStatus>{{salesStatus}}</salesStatus>
               <requestId>{{requestId}}</requestId>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockAdjustmentResponseResendService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3004.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPlanMasterSearchR2Service', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc1005.pmsfc10.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceAdjustmentService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4001.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <priceRange1>{{priceRange1}}</priceRange1>
               <salesStatus>{{salesStatus}}</salesStatus>
               <requestId>{{requestId}}</requestId>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceAdjustmentResponseResendService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4002.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('BookingInfoOutputService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc5001.pmsfc50.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <outputTarget>
               <systemCode>1</systemCode>
            </outputTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('OutputCompleteService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc5002.pmsfc50.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <outputTarget>
               <systemCode>{{systemCode}}</systemCode>
               <outputId>{{outputId}}</outputId>
            </outputTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('PlanSaleSituationSearchService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc6001.pmsfc60.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
               <searchDurationFrom>{{searchDurationFrom}}</searchDurationFrom>
               <searchDurationTo>{{searchDurationTo}}</searchDurationTo>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockBulkAdjustmentService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3005.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <adjustmentDate>{{adjustmentDate1}}</adjustmentDate>
               <remainingCount>{{remainingCount1}}</remainingCount>
               <salesStatus>{{salesStatus1}}</salesStatus>
               <PMSOutputRmTypeCode>{{PMSOutputRmTypeCode1}}</PMSOutputRmTypeCode>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <remainingCount>{{remainingCount2}}</remainingCount>
               <salesStatus>{{salesStatus2}}</salesStatus>
               <PMSOutputRmTypeCode>{{PMSOutputRmTypeCode2}}</PMSOutputRmTypeCode>
            </adjustmentTarget>
            <requestId>{{requestId}}</requestId>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetStockBulkAdjustmentResponseResendService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc3006.pmsfc30.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceBulkAdjustmentService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4003.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>3</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode1}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate1}}</adjustmentDate>
               <priceRange1>{{priceRange1_1}}</priceRange1>
               <salesStatus>1</salesStatus>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>3</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode2}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <priceRange1>{{priceRange1_2}}</priceRange1>
               <salesStatus>1</salesStatus>
            </adjustmentTarget>
            <requestId>{{requestId}}</requestId>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetPriceBulkAdjustmentResponseResendService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4004.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <resendTarget>
               <requestId>{{requestId}}</requestId>
            </resendTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetRestrictionAdjustmentService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4011.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <minLOS>{{minLOS}}</minLOS>
               <maxLOS>{{maxLOS}}</maxLOS>
               <cta>{{cta}}</cta>
               <ctd>{{ctd}}</ctd>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('NetRestrictionBulkAdjustmentService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc4013.pmsfc40.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode1}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode1}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate1}}</adjustmentDate>
               <minLOS>{{minLOS1}}</minLOS>
               <maxLOS>{{maxLOS1}}</maxLOS>
               <cta>{{cta1}}</cta>
               <ctd>{{ctd1}}</ctd>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode2}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode2}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <minLOS>{{minLOS2}}</minLOS>
               <maxLOS>{{maxLOS2}}</maxLOS>
               <cta>{{cta2}}</cta>
               <ctd>{{ctd2}}</ctd>
            </adjustmentTarget>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>'),
('RestrictionSearchService', 
'<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:pms="http://pmsfc6011.pmsfc60.pms.lincoln.seanuts.co.jp/">
   <soapenv:Header/>
   <soapenv:Body>
      <pms:execute>
         <arg0>
            <commonRequest>
               <systemId>{{systemId}}</systemId>
               <pmsUserId>{{pmsUserId}}</pmsUserId>
               <pmsPassword>{{pmsPassword}}</pmsPassword>
            </commonRequest>
            <extractionCondition>
               <extractionProcedureCode>{{extractionProcedureCode}}</extractionProcedureCode>
               <searchDurationFrom>{{searchDurationFrom}}</searchDurationFrom>
               <searchDurationTo>{{searchDurationTo}}</searchDurationTo>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
            </extractionCondition>
         </arg0>
      </pms:execute>
   </soapenv:Body>
</soapenv:Envelope>');

CREATE TABLE xml_responses (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    response XML NOT NULL
);


--------------------------------------------------------------------
--Imported clients, delete duplicates
WITH duplicate_clients AS (
  SELECT 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    array_agg(id) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
-- For each duplicate group, assign row numbers to identify which one to keep
ranked_clients AS (
  SELECT 
    id, 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    ROW_NUMBER() OVER (PARTITION BY name, name_kana, name_kanji, phone ORDER BY created_at) AS row_num
  FROM clients
  WHERE created_at >= '2025-03-25'
)
-- Now update the related tables
UPDATE reservations
SET reservation_client_id = (
  SELECT id FROM ranked_clients
  WHERE ranked_clients.id = ANY(duplicate_clients.duplicate_ids)
  AND ranked_clients.row_num = 1 -- Keep the first row only
  LIMIT 1
)
FROM duplicate_clients
WHERE reservation_client_id = ANY(duplicate_clients.duplicate_ids);
--------------------------------------------------------------------
--Imported clients, delete duplicates
WITH duplicate_clients AS (
  SELECT 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    array_agg(id) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
-- For each duplicate group, assign row numbers to identify which one to keep
ranked_clients AS (
  SELECT 
    id, 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    ROW_NUMBER() OVER (PARTITION BY name, name_kana, name_kanji, phone ORDER BY created_at) AS row_num
  FROM clients
  WHERE created_at >= '2025-03-25'
)
UPDATE reservation_clients
SET client_id = (
  SELECT id FROM ranked_clients
  WHERE ranked_clients.id = ANY(duplicate_clients.duplicate_ids)
  AND ranked_clients.row_num = 1 -- Keep the first row only
  LIMIT 1
)
FROM duplicate_clients
WHERE client_id = ANY(duplicate_clients.duplicate_ids);
--------------------------------------------------------------------
--Imported clients, delete duplicates
WITH duplicate_clients AS (
  SELECT 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    array_agg(id) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
-- For each duplicate group, assign row numbers to identify which one to keep
ranked_clients AS (
  SELECT 
    id, 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    ROW_NUMBER() OVER (PARTITION BY name, name_kana, name_kanji, phone ORDER BY created_at) AS row_num
  FROM clients
  WHERE created_at >= '2025-03-25'
)
UPDATE reservation_payments
SET client_id = (
  SELECT id FROM ranked_clients
  WHERE ranked_clients.id = ANY(duplicate_clients.duplicate_ids)
  AND ranked_clients.row_num = 1 -- Keep the first row only
  LIMIT 1
)
FROM duplicate_clients
WHERE client_id = ANY(duplicate_clients.duplicate_ids);
--------------------------------------------------------------------
--Imported clients, delete duplicates
WITH duplicate_clients AS (
  SELECT 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    array_agg(id) AS duplicate_ids
  FROM clients
  WHERE created_at >= '2025-03-25'
  GROUP BY name, name_kana, name_kanji, phone
  HAVING COUNT(*) > 1
),
-- For each duplicate group, assign row numbers to identify which one to keep
ranked_clients AS (
  SELECT 
    id, 
    name, 
    name_kana, 
    name_kanji, 
    phone, 
    ROW_NUMBER() OVER (PARTITION BY name, name_kana, name_kanji, phone ORDER BY created_at) AS row_num
  FROM clients
  WHERE created_at >= '2025-03-25'
)
-- Delete the duplicates except the first one
DELETE FROM clients
WHERE id IN (
  SELECT id FROM ranked_clients
  WHERE row_num > 1 -- Delete all but the first row in each group of duplicates
);

