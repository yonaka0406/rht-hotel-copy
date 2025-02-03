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

CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE, -- Role name (e.g., 'Admin', 'User')
    permissions JSONB DEFAULT '{}', -- Permissions in JSON format for flexibility
    description TEXT    
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NOT NULL,
    status_id INT REFERENCES user_status(id) DEFAULT 1,        -- Status ID (default to 1, representing 'active')
    role_id INT REFERENCES user_roles(id) DEFAULT 5,          -- Role ID (default to 4, referencing 'Viewer' role)    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    
);

ALTER TABLE users ADD COLUMN name TEXT NOT NULL;

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

    INSERT INTO user_status (status_name, description)
    VALUES 
        ('有効', '有効アカウント'),
        ('無効', '無効アカウント');

    INSERT INTO user_roles (role_name, permissions, description)
    VALUES 
        ('Admin', '{"manage_db": true, "manage_users": true, "manage_clients": true, "view_reports": true}', '管理パネルにアクセスし、データベースとすべてのホテルの管理を含む、システムへのフルアクセス権。'),
        ('Manager', '{"manage_db": false, "manage_users": true, "manage_clients": true, "view_reports": true}', '管理パネルにアクセスし、ユーザーを管理できますが、ホテル データベースを管理することはできません。'),
        ('Editor', '{"manage_db": false, "manage_users": false, "manage_clients": true, "view_reports": true}', '顧客を編集し、レポートを閲覧できます。'),
        ('Viewer', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": true}', 'レポートを閲覧できます。'),
        ('User', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": false}', '特別な権限のないデフォルトのロール。');

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

-- Mock data for 'clients' table
    INSERT INTO clients (id, name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
    VALUES
    -- Natural persons with different gender options
    ('11111111-1111-1111-1111-111111111111', 'John Doe', 'ジョン・ドウ', 'ジョン道', '1980-05-15', 'natural', 'male', 'johndoe@example.com', '+1234567890', '+1234567891', 1, 2),
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
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Link to the clients table
    address_name TEXT, -- Name or label for the address (e.g., "Headquarters", "Tokyo Subsidiary")
    representative_name TEXT, -- Representative for the address location (e.g., office manager, branch head)
    street TEXT NOT NULL,
    city TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    phone TEXT, -- Phone number for the address
    fax TEXT, -- Fax number for the address
    email TEXT, -- Email for the address (could be a general address-specific email)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

CREATE TABLE plans_global (
    id SERIAL PRIMARY KEY,    
    name TEXT NOT NULL,
    description TEXT,     
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);

CREATE TABLE plans_hotel (
    id SERIAL,
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    plans_global_id INT REFERENCES plans_global(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT, -- Description of the plan (optional)    
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',  
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
    check_out DATE NOT NULL,  
    number_of_people INT NOT NULL,  
    status TEXT CHECK (status IN ('hold', 'provisory', 'confirmed', 'checked_in', 'checked_out', 'cancelled')) NOT NULL DEFAULT 'hold',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id)
) PARTITION BY LIST (hotel_id);

ALTER TABLE reservations DROP COLUMN room_type_id;

CREATE TABLE reservation_details (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Reservation's hotel
    reservation_id UUID NOT NULL,
    payer_client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- Link to the client responsible for paying (payer)    
    date DATE NOT NULL,
    room_id INT,
    plans_global_id INT REFERENCES plans_global(id),
    plans_hotel_id INT,
    number_of_people INT NOT NULL,
    price DECIMAL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, reservation_id, room_id, date),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE,
    FOREIGN KEY (room_id, hotel_id) REFERENCES rooms(id, hotel_id),
    FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)
) PARTITION BY LIST (hotel_id);

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
    client_id UUID NOT NULL REFERENCES clients(id),              -- Reference to clients table    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_details_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE    
) PARTITION BY LIST (hotel_id);

ALTER TABLE reservation_clients
DROP CONSTRAINT reservation_clients_reservation_details_id_hotel_id_fkey;

ALTER TABLE reservation_clients
ADD CONSTRAINT reservation_clients_reservation_details_id_hotel_id_fkey
FOREIGN KEY (reservation_details_id, hotel_id)
REFERENCES reservation_details(id, hotel_id)
ON DELETE CASCADE;

--Ainda nao esta certo que vai ser usada

    CREATE TABLE user_hotels (
        user_id INT REFERENCES users(id) ON DELETE CASCADE,  -- User's ID
        hotel_id VARCHAR(6) NOT NULL,  -- Hotel ID (e.g., "0001", "0002", etc.)
        PRIMARY KEY (user_id, hotel_id)  -- Composite key to prevent duplicates
    );

--Reservations Schema Candidate


CREATE TABLE parking_spots (
    id SERIAL PRIMARY KEY,
    spot_number TEXT NOT NULL UNIQUE,
    reserved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE xml_exchanges (
    id SERIAL PRIMARY KEY,
    reservation_id INT REFERENCES reservations(id) ON DELETE CASCADE,
    ota_name TEXT NOT NULL,
    xml_request TEXT NOT NULL,
    xml_response TEXT,
    status TEXT CHECK (status IN ('pending', 'success', 'error')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO xml_exchanges (reservation_id, ota_name, xml_request, status)
VALUES (123, 'Booking.com', '<xml>...</xml>', 'pending');
