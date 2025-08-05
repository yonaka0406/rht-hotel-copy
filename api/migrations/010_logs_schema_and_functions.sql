-- USER BLOCK LOGS
CREATE TABLE logs_user (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id INT NOT NULL, -- Assuming most user-related tables use INT IDs
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_user_record_id ON logs_user(record_id);

CREATE OR REPLACE FUNCTION log_user_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_user (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by), -- Prioritize updated_by if available
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW; -- Changed from RETURN NULL to allow chained triggers if any, and more conventional.
END;
$$ LANGUAGE plpgsql;

-- HOTEL BLOCK LOGS
CREATE TABLE logs_hotel (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id INT NOT NULL, -- Assuming most hotel-related tables use INT IDs
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_hotel_record_id ON logs_hotel(record_id);

CREATE OR REPLACE FUNCTION log_hotel_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_hotel (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- HOTEL PLANS BLOCK LOGS
CREATE TABLE logs_hotel_plans (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id INT NOT NULL, -- Assuming most plan-related tables use INT IDs
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_hotel_plans_record_id ON logs_hotel_plans(record_id);

CREATE OR REPLACE FUNCTION log_hotel_plans_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_hotel_plans (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- HOTEL ADDONS BLOCK LOGS (Combined from original sql_logs.sql 'HOTEL PLANS ADDONS BLOCK')
CREATE TABLE logs_hotel_addons (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id INT NOT NULL, -- Assuming most addon-related tables use INT IDs
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_hotel_addons_record_id ON logs_hotel_addons(record_id);

CREATE OR REPLACE FUNCTION log_hotel_addons_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_hotel_addons (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- CLIENTS BLOCK LOGS
CREATE TABLE logs_clients (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id UUID NOT NULL, -- Client related tables often use UUID
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_clients_record_id ON logs_clients(record_id);

CREATE OR REPLACE FUNCTION log_clients_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_clients (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- RESERVATION BLOCK LOGS
CREATE TABLE logs_reservation (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL, -- Will store specific partitioned table name e.g. reservation_details_1
    action TEXT NOT NULL,
    record_id UUID NOT NULL, -- Reservation related tables use UUID
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_reservation_record_id ON logs_reservation(record_id);

CREATE OR REPLACE FUNCTION log_reservations_changes()
RETURNS TRIGGER AS $$
DECLARE
    _user_id INT;
    _log_id INT;
BEGIN
    -- Get the user ID from the temporary variable only for DELETE operations or if NEW.updated_by is null
    IF TG_OP = 'DELETE' OR NEW.updated_by IS NULL THEN
        _user_id := current_setting('my_app.user_id', true)::INT;
    END IF;

    INSERT INTO logs_reservation (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, NEW.created_by, _user_id), -- Check NEW values first, then fallback for DELETE
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    )
    RETURNING id INTO _log_id;

    PERFORM pg_notify('reservation_log_inserted', _log_id::text);

    RETURN NEW; -- Changed from RETURN NULL
END;
$$ LANGUAGE plpgsql;

-- PARKING BLOCK LOGS
CREATE TABLE logs_parking (
    id SERIAL PRIMARY KEY,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT REFERENCES users(id),
    table_name TEXT NOT NULL,
    action TEXT NOT NULL,
    record_id UUID NOT NULL, -- reservation_parking uses UUID
    changes JSONB,
    ip_address INET
);
CREATE INDEX idx_logs_parking_record_id ON logs_parking(record_id);

CREATE OR REPLACE FUNCTION log_parking_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO logs_parking (user_id, table_name, action, record_id, changes, ip_address)
    VALUES (
        COALESCE(NEW.updated_by, OLD.updated_by, NEW.created_by),
        TG_TABLE_NAME,
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
            WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb
            ELSE jsonb_build_object('old', row_to_json(OLD)::jsonb, 'new', row_to_json(NEW)::jsonb)
        END,
        inet_client_addr()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
