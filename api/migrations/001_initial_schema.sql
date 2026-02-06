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
        ('アドミン', '{"manage_db": true, "manage_users": true, "manage_clients": true, "view_reports": true, "crud_ok": true, "accounting": true}', '管理パネルにアクセスし、データベースとすべてのホテルの管理を含む、システムへのフルアクセス権。'),
        ('マネージャー', '{"manage_db": false, "manage_users": true, "manage_clients": true, "view_reports": true, "crud_ok": true, "accounting": false}', '管理パネルにアクセスし、ユーザーを管理できますが、ホテル データベースを管理することはできません。'),
        ('エディター', '{"manage_db": false, "manage_users": false, "manage_clients": true, "view_reports": true, "crud_ok": true, "accounting": false}', '顧客を編集し、レポートを閲覧できます。'),
        ('ユーザー', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": true, "crud_ok": true, "accounting": false}', 'データ追加・編集ができます。'),
        ('閲覧者', '{"manage_db": false, "manage_users": false, "manage_clients": false, "view_reports": true, "crud_ok": false, "accounting": false}', 'デフォルトとして、特別な権限のないユーザーです。');

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

ALTER TABLE users ADD CONSTRAINT password_auth_consistency
  CHECK (
     (auth_provider = 'local' AND password_hash IS NOT NULL)
     OR
     (auth_provider != 'local' AND password_hash IS NULL)
  );

ALTER TABLE users ADD CONSTRAINT provider_id_consistency
  CHECK (
     (auth_provider = 'local' AND provider_user_id IS NULL)
     OR
     (auth_provider != 'local' AND provider_user_id IS NOT NULL)
  );

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
    google_drive_url TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)    
);
