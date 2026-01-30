-- Migration: Add Department Groups and update acc_departments
-- Created at: 2026-01-30

-- 1. Create Department Groups table
CREATE TABLE acc_department_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE acc_department_groups IS 'Groups for accounting departments used for reporting purposes.';

-- 2. Add department_group_id to acc_departments
ALTER TABLE acc_departments ADD COLUMN department_group_id INT REFERENCES acc_department_groups(id) ON DELETE SET NULL;

-- 3. Make hotel_id nullable in acc_departments
ALTER TABLE acc_departments ALTER COLUMN hotel_id DROP NOT NULL;

-- 4. Update Unique constraint for acc_departments to handle NULL hotel_id
-- Standard UNIQUE (hotel_id, name) allows multiple NULL hotel_id records with the same name in some DBs, 
-- but we want to ensure uniqueness.
ALTER TABLE acc_departments DROP CONSTRAINT acc_departments_hotel_id_name_key;
CREATE UNIQUE INDEX idx_acc_departments_hotel_name_unique ON acc_departments (COALESCE(hotel_id, 0), name);

-- 5. Add indexes for performance
CREATE INDEX idx_acc_departments_group ON acc_departments(department_group_id);

-- 6. Insert initial groups (optional, but good for demo)
INSERT INTO acc_department_groups (name, display_order) VALUES 
('北海道エリア', 10),
('関東エリア', 20),
('管理・事務', 30);
