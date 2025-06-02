-- TODO: Consider granting more granular permissions to rhtsys_user following the principle of least privilege.
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rhtsys_user;
GRANT CREATE ON SCHEMA public TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rhtsys_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO rhtsys_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO rhtsys_user;
GRANT REFERENCES ON ALL TABLES IN SCHEMA public TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_roles TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_status TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO rhtsys_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE logs_user TO rhtsys_user;


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
        ('アドミン', '{"manage_db": true, "manage_users": true, "manage_clients": true, "view_reports": true, "crud_ok": true}', '管理パネルにアクセスし、データベースとすべてのホテルの管理を含む、システムへのフルアクセス権。'),
        ('マネージャー', '{"manage_db": false, "manage_users": true, "manage_clients": true, "view_reports": true, "crud_ok": true}', '管理パネルにアクセスし、ユーザーを管理できますが、ホテル データベースを管理することはできません。'),
        ('エディター', '{"manage_db": false, "manage_users": false, "manage_clients": true, "view_reports": true, "crud_ok": true}', '顧客を編集し、レポートを閲覧できます。'),
        ('ユーザー', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": true, "crud_ok": true}', 'データ追加・編集ができます。'),
        ('閲覧者', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": true, "crud_ok": false}', 'デフォルトとして、特別な権限のないユーザーです。');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name TEXT,
    password_hash TEXT NULL,
    status_id INT REFERENCES user_status(id) DEFAULT 1,        -- Status ID (default to 1, representing 'active')
    role_id INT REFERENCES user_roles(id) DEFAULT 5,          -- Role ID (default to 5, referencing 'Viewer' role)
    auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
    provider_user_id VARCHAR(255) NULL,
    google_calendar_id TEXT NULL,
    google_access_token TEXT NULL,
    google_refresh_token TEXT NULL,
    google_token_expiry_date TIMESTAMP WITH TIME ZONE NULL,
    last_successful_google_sync TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP    
);

    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    -- TODO: Replace with a secure method for initial admin user creation in production.
    -- INSERT INTO users (email, password_hash, role_id)
    -- VALUES ('root@wehub.com', crypt('rootPassword!@123', gen_salt('bf')), 1);

    ALTER TABLE users
    ADD COLUMN created_by INT REFERENCES users(id),
    ADD COLUMN updated_by INT DEFAULT NULL REFERENCES users(id);

    ALTER TABLE user_status
    ADD COLUMN updated_by INT DEFAULT NULL REFERENCES users(id);

    ALTER TABLE user_roles
    ADD COLUMN updated_by INT DEFAULT NULL REFERENCES users(id);


    -- Temporary
   ALTER TABLE users
      ADD COLUMN auth_provider VARCHAR(50) NOT NULL DEFAULT 'local',
      ADD COLUMN provider_user_id VARCHAR(255) NULL,
      ADD COLUMN google_calendar_id TEXT NULL,
      ADD COLUMN google_access_token TEXT NULL,
      ADD COLUMN google_refresh_token TEXT NULL,
      ADD COLUMN google_token_expiry_date TIMESTAMP WITH TIME ZONE NULL,
      ADD COLUMN last_successful_google_sync TIMESTAMP WITH TIME ZONE NULL;

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
    bank_name TEXT,
    bank_branch_name TEXT,
    bank_account_type TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,    
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

CREATE TABLE client_group (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id),
  updated_by INT DEFAULT NULL REFERENCES users(id)
);

CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id INT NULL,
    name TEXT NOT NULL DEFAULT 'TBD',
    name_kana TEXT,
    name_kanji TEXT,
    date_of_birth DATE,
    legal_or_natural_person TEXT CHECK (legal_or_natural_person IN ('legal', 'natural')),
    gender TEXT DEFAULT 'other' CHECK (gender IN ('male', 'female', 'other')),
    email TEXT,
    phone TEXT,
    fax TEXT,
    client_group_id UUID DEFAULT NULL REFERENCES client_group(id),
    website TEXT NULL,
    billing_preference TEXT DEFAULT 'paper' CHECK (billing_preference IN ('paper', 'digital')),
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

-- Default Client for status block
INSERT INTO clients (id, name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
VALUES
('11111111-1111-1111-1111-111111111111', '予約不可', 'ヨヤクフカ', '予約不可', NULL, 'legal', 'other', NULL, '1234567890', NULL, 1, 1)

-- Mock data generator
/*
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
*/

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

CREATE TYPE crm_action_type_enum AS ENUM ('visit', 'call', 'email', 'meeting', 'task', 'note');
CREATE TYPE crm_action_status_enum AS ENUM ('pending', 'scheduled', 'completed', 'cancelled', 'rescheduled');
CREATE TABLE crm_actions (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
   action_type crm_action_type_enum NOT NULL,
   action_datetime TIMESTAMP WITH TIME ZONE NULL,
   subject VARCHAR(255) NOT NULL,
   details TEXT,
   outcome TEXT,
   assigned_to INT REFERENCES users(id),
   due_date TIMESTAMP WITH TIME ZONE,
   status crm_action_status_enum DEFAULT 'pending',
   google_calendar_event_id TEXT NULL,
   google_calendar_html_link TEXT,
   synced_with_google_calendar BOOLEAN DEFAULT FALSE,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   updated_by INT DEFAULT NULL REFERENCES users(id)
);
CREATE INDEX idx_crm_actions_client_id ON crm_actions(client_id);
CREATE INDEX idx_crm_actions_action_type ON crm_actions(action_type);

CREATE TABLE tax_info (
   id SERIAL PRIMARY KEY,
   name TEXT NOT NULL,
   description TEXT,
   percentage DECIMAL(10,4) NOT NULL,
   visible BOOLEAN DEFAULT true,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   updated_by INT DEFAULT NULL REFERENCES users(id),
   UNIQUE (name)
);
INSERT INTO tax_info (name, percentage, created_by)
VALUES
    ('非課税', 0, 1),
    ('課税8%', 0.08, 1),
    ('課税10%', 0.10, 1);

CREATE TABLE plan_templates (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id) ON DELETE CASCADE NULL,
    name TEXT NOT NULL,
    template JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (hotel_id, name)
);

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

INSERT INTO plans_global (name, description, created_by)
VALUES
    ('素泊まり', '', 1),
    ('1食', '', 1),
    ('2食', '', 1),
    ('3食', '', 1),
    ('荷物キープ', '', 1);

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
    adjustment_value DECIMAL(10, 2) NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (
         CASE 
            WHEN adjustment_type IN ('base_rate', 'flat_fee') 
            THEN FLOOR(adjustment_value / (1 + tax_rate)) 
            ELSE NULL 
         END
    ) STORED,
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
    name TEXT NOT NULL,
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other')) DEFAULT 'other',
    description TEXT,
    price DECIMAL NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
    visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);

INSERT INTO addons_global (name, description, price, created_by)
VALUES
    ('朝食', '', 0, 1),
    ('夕食', '', 0, 1),
    ('駐車場', '', 0, 1),
    ('お弁当', '', 0, 1);

CREATE TABLE addons_hotel (
    id SERIAL,    
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    addons_global_id INT REFERENCES addons_global(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- Name of the add-on (e.g., Breakfast, Dinner, etc.)
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other')) DEFAULT 'other',
    description TEXT, -- Optional description
    price DECIMAL NOT NULL, -- Price of the add-on service
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
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
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other')) DEFAULT 'other',
    price DECIMAL(10, 2) NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
    date_start DATE NOT NULL,
    date_end DATE DEFAULT NULL,
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
INSERT INTO payment_types (name, transaction, created_by)
VALUES
    ('現金', 'cash', 1),
    ('ネットポイント', 'point', 1),
    ('事前振り込み', 'wire', 1),
    ('クレジットカード', 'credit', 1),
    ('請求書', 'bill', 1),
    ('割引', 'discount', 1);

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
    ota_reservation_id TEXT NULL,
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id)    
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_details (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE, -- Reservation's hotel
    reservation_id UUID NOT NULL,    
    date DATE NOT NULL,
    room_id INT,
    plans_global_id INT REFERENCES plans_global(id),
    plans_hotel_id INT,
    plan_name TEXT,
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',
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

CREATE TABLE reservation_addons (
    id UUID DEFAULT gen_random_uuid(),
    hotel_id INT NOT NULL REFERENCES hotels(id), -- Reservation's hotel
    reservation_detail_id UUID NOT NULL,
    addons_global_id INT REFERENCES addons_global(id),
    addons_hotel_id INT,
    addon_name TEXT,
    addon_type TEXT CHECK (addon_type IN ('breakfast', 'lunch', 'dinner', 'other')) DEFAULT 'other',
    quantity INT NOT NULL DEFAULT 1, 
    price DECIMAL NOT NULL,
    tax_type_id INT REFERENCES tax_info(id),
    tax_rate DECIMAL(12,4),
    net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
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
    invoice_id UUID DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    FOREIGN KEY (reservation_id, hotel_id) REFERENCES reservations(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);

CREATE TABLE reservation_rates (
   id UUID DEFAULT gen_random_uuid(),
   hotel_id INT NOT NULL REFERENCES hotels(id),
   reservation_details_id UUID NOT NULL,
   adjustment_type TEXT CHECK (adjustment_type IN ('base_rate', 'percentage', 'flat_fee')) DEFAULT 'base_rate',
   adjustment_value DECIMAL(10, 2) NOT NULL,
   tax_type_id INT REFERENCES tax_info(id),
   tax_rate DECIMAL(12,4),
   price NUMERIC(12,0) NOT NULL,
   net_price NUMERIC(12,0) GENERATED ALWAYS AS (FLOOR(price / (1 + tax_rate))) STORED,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   updated_by INT DEFAULT NULL REFERENCES users(id),
   PRIMARY KEY (hotel_id, id),
   FOREIGN KEY (reservation_details_id, hotel_id) REFERENCES reservation_details(id, hotel_id) ON DELETE CASCADE
) PARTITION BY LIST (hotel_id);

CREATE TABLE invoices (
   id UUID,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   date DATE NOT NULL,
   client_id UUID NOT NULL REFERENCES clients(id),
   invoice_number TEXT,   
   status TEXT CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')) NOT NULL DEFAULT 'draft',
   display_name TEXT NULL,
   due_date DATE NULL,
   total_stays INT NULL,
   comment TEXT NULL,
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   UNIQUE (id, hotel_id, date, client_id, invoice_number)
) PARTITION BY LIST (hotel_id);

-- OTA / Site Controller

CREATE TABLE sc_user_info (
    hotel_id INT NOT NULL REFERENCES hotels(id),
    name TEXT NOT NULL,    
    user_id TEXT NOT NULL,
    password TEXT NOT NULL,    
    PRIMARY KEY (hotel_id, name)
);

CREATE TABLE sc_tl_rooms (
   hotel_id INT NOT NULL REFERENCES hotels(id),
   room_type_id INT NULL,
   rmTypeCode TEXT NOT NULL, --室タイプコード
   rmTypeName TEXT, --室タイプ名
   netRmTypeGroupCode TEXT NOT NULL, --ネット室タイプグループコード
   netRmTypeGroupName TEXT, --ネット室タイプグループ名
   agtCode TEXT, --販売先コード
   netAgtRmTypeCode TEXT, --ネット販売先室タイプコード
   netAgtRmTypeName TEXT, --ネット販売先室タイプ名
   isStockAdjustable TEXT, --在庫調整操作可否
   lincolnUseFlag TEXT, --リンカーン上で扱うフラグ
   FOREIGN KEY (room_type_id, hotel_id) REFERENCES room_types(id, hotel_id)
);

CREATE TABLE sc_tl_plans (
   hotel_id INT NOT NULL REFERENCES hotels(id),
   plans_global_id INT REFERENCES plans_global(id),
   plans_hotel_id INT,
   planGroupCode TEXT NOT NULL, --プラングループコード
   planGroupName TEXT NOT NULL, --プラングループ名      
   FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)
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
               <systemCode>1</systemCode>
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
               <netRmTypeGroupCode>{{netRmTypeGroupCode}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <remainingCount>{{remainingCount}}</remainingCount>
               <salesStatus>{{salesStatus}}</salesStatus>               
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode2}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode2}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <remainingCount>{{remainingCount2}}</remainingCount>
               <salesStatus>{{salesStatus2}}</salesStatus>               
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
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <priceRange1>{{priceRange1}}</priceRange1>
               <salesStatus>{{salesStatus}}</salesStatus>
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode_2}}</adjustmentProcedureCode>
               <planGroupCode>{{planGroupCode_2}}</planGroupCode>
               <adjustmentDate>{{adjustmentDate_2}}</adjustmentDate>
               <priceRange1>{{priceRange1_2}}</priceRange1>
               <salesStatus>{{salesStatus_2}}</salesStatus>
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

CREATE TABLE xml_requests (
   id SERIAL,
   hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
   name TEXT NOT NULL,
   sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   request XML NOT NULL,
   PRIMARY KEY (id, hotel_id)
) PARTITION BY LIST (hotel_id);
CREATE TABLE xml_responses (
   id SERIAL,
   hotel_id INT NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
   name TEXT NOT NULL,
   received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   response XML NOT NULL,
   PRIMARY KEY (id, hotel_id)   
) PARTITION BY LIST (hotel_id);

-- VIEW

CREATE OR REPLACE VIEW vw_room_inventory AS
WITH roomTotal AS (
    SELECT
        hotel_id,
        room_type_id,
        COUNT(*) as total_rooms
    FROM rooms
    WHERE for_sale = true
    GROUP BY hotel_id, room_type_id
)
SELECT
    rd.hotel_id,
    rd.date,
    r.room_type_id,
	 sc.netrmtypegroupcode,
    rt.name as room_type_name,
    roomTotal.total_rooms,
    COUNT(rd.date) as room_count
FROM
    reservation_details rd
    JOIN rooms r ON r.hotel_id = rd.hotel_id AND r.id = rd.room_id
    JOIN room_types rt ON rt.hotel_id = r.hotel_id AND rt.id = r.room_type_id
	LEFT JOIN (SELECT DISTINCT hotel_id, room_type_id, netrmtypegroupcode FROM sc_tl_rooms) sc ON sc.hotel_id = rt.hotel_id AND sc.room_type_id = rt.id
    JOIN roomTotal ON roomTotal.hotel_id = rd.hotel_id AND roomTotal.room_type_id = r.room_type_id
WHERE rd.cancelled IS NULL
GROUP BY rd.hotel_id, rd.date, r.room_type_id, sc.netrmtypegroupcode, rt.name, roomTotal.total_rooms;

CREATE OR REPLACE VIEW vw_booking_for_google AS
SELECT
    h.id AS hotel_id,
    h.formal_name AS hotel_name,
    rd.id AS reservation_detail_id,
    rd.date,
    rt.name AS room_type_name,
    rd.room_id,
    rooms.room_number,
    COALESCE(c.name_kanji, c.name) AS client_name,
    rd.plan_name,
    r.status,
    r.type,
    r.agent
FROM
    hotels h
      JOIN
    reservations r ON h.id = r.hotel_id
      JOIN
    clients c ON c.id = r.reservation_client_id
      JOIN
    reservation_details rd ON r.hotel_id = rd.hotel_id AND r.id = rd.reservation_id
      JOIN
    rooms ON rooms.hotel_id = rd.hotel_id AND rooms.id = rd.room_id
      JOIN
    room_types rt ON rooms.room_type_id = rt.id
WHERE
    rd.cancelled IS NULL
ORDER BY
    h.id, rd.date, rooms.room_number;

-- Financial data

CREATE TABLE du_forecast (
   id SERIAL PRIMARY KEY,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   forecast_month DATE NOT NULL,
   accommodation_revenue NUMERIC(15, 2), -- '宿泊売上'
   operating_days INTEGER, -- '営業日数'
   available_room_nights INTEGER, -- '客室数'
   rooms_sold_nights INTEGER, -- '販売客室数'
   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   CONSTRAINT uq_hotel_month_forecast UNIQUE (hotel_id, forecast_month)
);
COMMENT ON TABLE du_forecast IS '施設ごと月ごとの売上と稼働率予算データ';
COMMENT ON COLUMN du_forecast.hotel_id IS '施設テーブルを参照する外部キー (hotels.id)';

CREATE TABLE du_accounting (
   id SERIAL PRIMARY KEY,
   hotel_id INT NOT NULL REFERENCES hotels(id),
   accounting_month DATE NOT NULL,
   accommodation_revenue NUMERIC(15, 2), -- '宿泊売上'   
   created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
   created_by INT REFERENCES users(id),
   CONSTRAINT uq_hotel_month_accounting UNIQUE (hotel_id, accounting_month)
);
COMMENT ON TABLE du_accounting IS '施設ごと月ごとの売上会計データ';

-- TODO: Review if these duplicate client handling scripts are necessary for initial production deployment. They appear to be for data cleanup after a specific import dated '2025-03-25'.
/*
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
*/

