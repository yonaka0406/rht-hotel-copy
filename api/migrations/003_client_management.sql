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
    loyalty_tier VARCHAR(50) DEFAULT 'prospect',
    client_group_id UUID DEFAULT NULL REFERENCES client_group(id),
    website TEXT NULL,
    billing_preference TEXT DEFAULT 'paper' CHECK (billing_preference IN ('paper', 'digital')),
    comment TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id)
);

-- Add loyalty_tier to clients table
-- This was already added in the CREATE TABLE statement above, so this is redundant.
-- ALTER TABLE clients
-- ADD COLUMN loyalty_tier VARCHAR(50) DEFAULT 'prospect';

-- Default Client for status block
INSERT INTO clients (id, name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, fax, created_by, updated_by)
VALUES
('11111111-1111-1111-1111-111111111111', '予約不可', 'ヨヤクフカ', '予約不可', NULL, 'legal', 'other', NULL, '1234567890', NULL, 1, 1),
('22222222-2222-2222-2222-222222222222', '押さえ', 'オサエ', '押さえ', NULL, 'legal', 'other', NULL, '1234567890', NULL, 1, 1);

CREATE TABLE client_relationships (
    id SERIAL PRIMARY KEY,
    source_client_id UUID NOT NULL,
    source_relationship_type VARCHAR(255) NOT NULL,
    target_client_id UUID NOT NULL,
    target_relationship_type VARCHAR(255) NOT NULL,
    comment TEXT,
    CONSTRAINT fk_source_client
        FOREIGN KEY(source_client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE,
    CONSTRAINT fk_target_client
        FOREIGN KEY(target_client_id)
        REFERENCES clients(id)
        ON DELETE CASCADE
);

-- Add indexes for performance on foreign key columns
CREATE INDEX idx_cr_source_client_id ON client_relationships(source_client_id);
CREATE INDEX idx_cr_target_client_id ON client_relationships(target_client_id);

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

CREATE TYPE crm_action_type_enum AS ENUM ('visit', 'call', 'email', 'meeting', 'task', 'note', 'other');
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

-- The original sql.sql had "ALTER TYPE crm_action_type_enum ADD VALUE 'other';"
-- However, 'other' is already in the ENUM definition above.
-- This might be from an ALTER statement applied after initial creation.
-- For a fresh install, it's already included.

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bid_date DATE,
  order_source TEXT,
  project_name TEXT NOT NULL,
  project_location TEXT,
  target_store JSONB, -- Expected structure: { "hotelId": INT, "formal_name": TEXT } or an array of such objects e.g., [{ "hotelId": 1, "formal_name": "Hotel A" }, { "hotelId": 2, "formal_name": "Hotel B" }]
  budget NUMERIC,
  assigned_work_content TEXT,
  specific_specialized_work_applicable BOOLEAN DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  related_clients JSONB, -- Array of objects: { clientId: UUID, role: TEXT, responsibility: TEXT }
  created_by INT REFERENCES users(id), -- FK to users.id, matches users.id type
  updated_by INT REFERENCES users(id), -- FK to users.id, matches users.id type
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Index on created_by (INT)
CREATE INDEX idx_projects_created_by ON projects(created_by);
-- GIN index for JSONB related_clients
CREATE INDEX idx_projects_related_clients ON projects USING GIN (related_clients);

-- Loyalty Tiers Table
CREATE TABLE loyalty_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL, -- e.g., 'REPEATER', 'HOTEL_LOYAL', 'BRAND_LOYAL'
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE, -- Nullable for REPEATER and BRAND_LOYAL
    min_bookings INTEGER,
    min_spending DECIMAL,
    time_period_months INTEGER NOT NULL, -- Formerly time_period_value, unit is now always months
    logic_operator VARCHAR(3), -- e.g., 'AND', 'OR'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT REFERENCES users(id)
);

COMMENT ON COLUMN loyalty_tiers.tier_name IS 'The name of the loyalty tier (repeater, hotel_loyal, brand_loyal)';
COMMENT ON COLUMN loyalty_tiers.hotel_id IS 'Reference to hotels(id) for HOTEL_LOYAL tier, NULL otherwise';
COMMENT ON COLUMN loyalty_tiers.min_bookings IS 'Minimum number of bookings required for the tier';
COMMENT ON COLUMN loyalty_tiers.min_spending IS 'Minimum spending required for the tier';
COMMENT ON COLUMN loyalty_tiers.time_period_months IS 'Duration of the time period in months (e.g., 6, 12)';
COMMENT ON COLUMN loyalty_tiers.logic_operator IS 'Logic to combine bookings and spending criteria (AND/OR)';

-- Add indexes for loyalty_tiers
CREATE INDEX idx_loyalty_tiers_tier_name ON loyalty_tiers(tier_name);
CREATE INDEX idx_loyalty_tiers_hotel_id ON loyalty_tiers(hotel_id);

-- Add unique constraint for UPSERT operations
ALTER TABLE loyalty_tiers
ADD CONSTRAINT loyalty_tiers_tier_name_hotel_id_key UNIQUE (tier_name, hotel_id);

-- Assuming a trigger function like 'update_updated_at_column' exists
-- CREATE TRIGGER update_loyalty_tiers_updated_at
-- BEFORE UPDATE ON loyalty_tiers
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();
-- If the function does not exist, this part will be commented out or handled in a later step.
-- (This trigger and function are defined in sql_triggers.sql, so this is fine here if sql_triggers.sql is run later)

-- Mock data generator for clients is commented out in the original, so it will be omitted here.
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
