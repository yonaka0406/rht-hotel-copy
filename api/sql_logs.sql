-- USER BLOCK
    CREATE TABLE logs_user (
        id SERIAL PRIMARY KEY,
        log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the log was created
        user_id INT REFERENCES users(id), -- The user who made the change
        table_name TEXT NOT NULL, -- Table where the change occurred
        action TEXT NOT NULL, -- 'INSERT', 'UPDATE', or 'DELETE'
        record_id INT NOT NULL, -- ID of the affected record
        changes JSONB, -- Changes made to the record    
        ip_address INET -- IP address of the user who made the change
    );

    CREATE OR REPLACE FUNCTION log_user_changes()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Insert a log entry with changes
        INSERT INTO logs_user (user_id, table_name, action, record_id, changes, ip_address)
        VALUES (
            NEW.updated_by, -- Assuming each table has an `updated_by` column
            TG_TABLE_NAME, -- Name of the table
            TG_OP, -- The operation: INSERT, UPDATE, or DELETE
            COALESCE(NEW.id, OLD.id), -- The affected record ID
            CASE
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb -- Log the full record for deletes
                WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb -- Log the full record for inserts
                ELSE jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb
                ) -- Log only changes for updates
            END,
            inet_client_addr() -- Get the IP address of the client
        );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- For the `users` table
    CREATE TRIGGER log_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_user_changes();

    -- For the `user_status` table
    CREATE TRIGGER log_user_status_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_status
    FOR EACH ROW EXECUTE FUNCTION log_user_changes();

    -- For the `user_roles` table
    CREATE TRIGGER log_user_roles_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION log_user_changes();

-- HOTEL BLOCK
    CREATE TABLE logs_hotel (
        id SERIAL PRIMARY KEY,
        log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the log was created
        user_id INT REFERENCES users(id), -- The user who made the change
        table_name TEXT NOT NULL, -- Table where the change occurred
        action TEXT NOT NULL, -- 'INSERT', 'UPDATE', or 'DELETE'
        record_id INT NOT NULL, -- ID of the affected record
        changes JSONB, -- Changes made to the record    
        ip_address INET -- IP address of the user who made the change
    );

    CREATE OR REPLACE FUNCTION log_hotel_changes()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Insert a log entry with changes
        INSERT INTO logs_hotel (user_id, table_name, action, record_id, changes, ip_address)
        VALUES (
            NEW.updated_by, -- Assuming each table has an `updated_by` column
            TG_TABLE_NAME, -- Name of the table
            TG_OP, -- The operation: INSERT, UPDATE, or DELETE
            COALESCE(NEW.id, OLD.id), -- The affected record ID
            CASE
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb -- Log the full record for deletes
                WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb -- Log the full record for inserts
                ELSE jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb
                ) -- Log only changes for updates
            END,
            inet_client_addr() -- Get the IP address of the client
        );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- For the `hotels` table
    CREATE TRIGGER log_hotels_trigger
    AFTER INSERT OR UPDATE OR DELETE ON hotels
    FOR EACH ROW EXECUTE FUNCTION log_hotel_changes();

    -- For the `room_types` table
    CREATE TRIGGER log_room_types_trigger
    AFTER INSERT OR UPDATE OR DELETE ON room_types
    FOR EACH ROW EXECUTE FUNCTION log_hotel_changes();

    -- For the `rooms` table
    CREATE TRIGGER log_rooms_trigger
    AFTER INSERT OR UPDATE OR DELETE ON rooms
    FOR EACH ROW EXECUTE FUNCTION log_hotel_changes();

-- HOTEL PLANS BLOCK

    CREATE TABLE logs_hotel_plans (
        id SERIAL PRIMARY KEY,
        log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the log was created
        user_id INT REFERENCES users(id), -- The user who made the change
        table_name TEXT NOT NULL, -- Table where the change occurred
        action TEXT NOT NULL, -- 'INSERT', 'UPDATE', or 'DELETE'
        record_id INT NOT NULL, -- ID of the affected record
        changes JSONB, -- Changes made to the record    
        ip_address INET -- IP address of the user who made the change
    );

    CREATE OR REPLACE FUNCTION log_hotel_plans_changes()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Insert a log entry with changes
        INSERT INTO logs_hotel_plans (user_id, table_name, action, record_id, changes, ip_address)
        VALUES (
            NEW.updated_by, -- Assuming each table has an `updated_by` column
            TG_TABLE_NAME, -- Name of the table
            TG_OP, -- The operation: INSERT, UPDATE, or DELETE
            COALESCE(NEW.id, OLD.id), -- The affected record ID
            CASE
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb -- Log the full record for deletes
                WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb -- Log the full record for inserts
                ELSE jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb
                ) -- Log only changes for updates
            END,
            inet_client_addr() -- Get the IP address of the client
        );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- For the `plans_global` table
    CREATE TRIGGER log_plans_global_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plans_global
    FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

    -- For the `plans_hotel` table
    CREATE TRIGGER log_plans_hotel_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plans_hotel
    FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

    -- For the `plans_rates` table
    CREATE TRIGGER log_plans_rates_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plans_rates
    FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

    -- For the `plan_addons` table
    CREATE TRIGGER log_plan_addons_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plan_addons
    FOR EACH ROW EXECUTE FUNCTION log_hotel_plans_changes();

-- HOTEL PLANS ADDONS BLOCK

    CREATE TABLE logs_hotel_addons (
        id SERIAL PRIMARY KEY,
        log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the log was created
        user_id INT REFERENCES users(id), -- The user who made the change
        table_name TEXT NOT NULL, -- Table where the change occurred
        action TEXT NOT NULL, -- 'INSERT', 'UPDATE', or 'DELETE'
        record_id INT NOT NULL, -- ID of the affected record
        changes JSONB, -- Changes made to the record    
        ip_address INET -- IP address of the user who made the change
    );

    CREATE OR REPLACE FUNCTION log_hotel_addons_changes()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Insert a log entry with changes
        INSERT INTO logs_hotel_addons (user_id, table_name, action, record_id, changes, ip_address)
        VALUES (
            NEW.updated_by, -- Assuming each table has an `updated_by` column
            TG_TABLE_NAME, -- Name of the table
            TG_OP, -- The operation: INSERT, UPDATE, or DELETE
            COALESCE(NEW.id, OLD.id), -- The affected record ID
            CASE
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb -- Log the full record for deletes
                WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb -- Log the full record for inserts
                ELSE jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb
                ) -- Log only changes for updates
            END,
            inet_client_addr() -- Get the IP address of the client
        );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- For the `plan_addons` table
    CREATE TRIGGER log_addons_global_trigger
    AFTER INSERT OR UPDATE OR DELETE ON addons_global
    FOR EACH ROW EXECUTE FUNCTION log_hotel_addons_changes();

    -- For the `addons_hotel` table
    CREATE TRIGGER log_addons_hotel_trigger
    AFTER INSERT OR UPDATE OR DELETE ON addons_hotel
    FOR EACH ROW EXECUTE FUNCTION log_hotel_addons_changes();

-- RESERVATION BLOCK

    CREATE TABLE logs_reservation (
        id SERIAL PRIMARY KEY,
        log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- When the log was created
        user_id INT REFERENCES users(id), -- The user who made the change
        table_name TEXT NOT NULL, -- Table where the change occurred
        action TEXT NOT NULL, -- 'INSERT', 'UPDATE', or 'DELETE'
        record_id UUID NOT NULL, -- ID of the affected record
        changes JSONB, -- Changes made to the record    
        ip_address INET -- IP address of the user who made the change
    ); 

    CREATE OR REPLACE FUNCTION log_reservations_changes()
    RETURNS TRIGGER AS $$
    BEGIN
        -- Insert a log entry with changes
        INSERT INTO logs_reservation (user_id, table_name, action, record_id, changes, ip_address)
        VALUES (
            NEW.updated_by, -- Assuming each table has an `updated_by` column
            TG_TABLE_NAME, -- Name of the table
            TG_OP, -- The operation: INSERT, UPDATE, or DELETE
            COALESCE(NEW.id, OLD.id), -- The affected record ID
            CASE
                WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb -- Log the full record for deletes
                WHEN TG_OP = 'INSERT' THEN row_to_json(NEW)::jsonb -- Log the full record for inserts
                ELSE jsonb_build_object(
                    'old', row_to_json(OLD)::jsonb,
                    'new', row_to_json(NEW)::jsonb
                ) -- Log only changes for updates
            END,
            inet_client_addr() -- Get the IP address of the client
        );
        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- For the `reservations` table
    CREATE TRIGGER log_reservations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reservations
    FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

    -- For the `reservation_details` table
    CREATE TRIGGER log_reservation_details_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reservation_details
    FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

    -- For the `reservation_addons` table
    CREATE TRIGGER log_reservation_addons_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reservation_addons
    FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();

    -- For the `reservation_clients` table
    CREATE TRIGGER log_reservation_clients_trigger
    AFTER INSERT OR UPDATE OR DELETE ON reservation_clients
    FOR EACH ROW EXECUTE FUNCTION log_reservations_changes();



