# Database Schema

This document provides comprehensive documentation of the PostgreSQL database schema for the WeHub.work Hotel Management System.

## Overview

The database follows a normalized relational design with:
- **PostgreSQL 14+**: Primary database
- **Normalized Schema**: Third normal form (3NF)
- **Foreign Key Constraints**: Referential integrity
- **Indexes**: Optimized query performance
- **Triggers**: Automated data management
- **Views**: Simplified complex queries

## Core Entity Relationships

```
Hotels
  ├── Rooms
  │   └── Room Types
  ├── Reservations
  │   ├── Clients
  │   ├── Guests
  │   ├── Billing
  │   └── Payments
  ├── Plans
  │   ├── Plan Rates
  │   └── Plan Addons
  └── Settings

Users
  ├── Roles
  └── Permissions

Integrations
  ├── OTA Reservations
  ├── Booking Engine
  └── XML Queue
```

## Core Tables

### Hotels Table

```sql
CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    total_rooms INTEGER DEFAULT 0,
    check_in_time TIME DEFAULT '15:00:00',
    check_out_time TIME DEFAULT '11:00:00',
    currency VARCHAR(3) DEFAULT 'JPY',
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    settings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hotels_name ON hotels(name);
```

### Rooms and Room Types

```sql
CREATE TABLE room_types (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    capacity INTEGER NOT NULL,
    base_rate DECIMAL(10,2),
    amenities JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER REFERENCES room_types(id),
    room_number VARCHAR(50) NOT NULL,
    floor INTEGER,
    status VARCHAR(50) DEFAULT 'available',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(hotel_id, room_number)
);

CREATE INDEX idx_rooms_hotel ON rooms(hotel_id);
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
```

### Clients Table

```sql
CREATE TABLE clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    name_kanji VARCHAR(255),
    name_kana VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    postal_code VARCHAR(20),
    date_of_birth DATE,
    nationality VARCHAR(100),
    passport_number VARCHAR(100),
    preferences JSONB,
    loyalty_tier VARCHAR(50) DEFAULT 'standard',
    loyalty_points INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_name_kanji ON clients(name_kanji);
CREATE INDEX idx_clients_name_kana ON clients(name_kana);
CREATE INDEX idx_clients_phone ON clients(phone);
```

### Reservations Table

```sql
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_id INTEGER REFERENCES hotels(id),
    client_id INTEGER REFERENCES clients(id),
    room_id INTEGER REFERENCES rooms(id),
    room_type_id INTEGER REFERENCES room_types(id),
    confirmation_number VARCHAR(50) UNIQUE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    source VARCHAR(100),
    total_amount DECIMAL(10,2),
    paid_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT
);

CREATE INDEX idx_reservations_hotel ON reservations(hotel_id);
CREATE INDEX idx_reservations_client ON reservations(client_id);
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status ON reservations(status);
CREATE INDEX idx_reservations_confirmation ON reservations(confirmation_number);
```

### Billing and Payments

```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    reservation_id UUID REFERENCES reservations(id),
    invoice_number VARCHAR(50) UNIQUE,
    issue_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    subtotal DECIMAL(10,2) NOT NULL,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    paid_amount DECIMAL(10,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id),
    reservation_id UUID REFERENCES reservations(id),
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(50),
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    transaction_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invoices_reservation ON invoices(reservation_id);
CREATE INDEX idx_payments_invoice ON payments(invoice_id);
CREATE INDEX idx_payments_reservation ON payments(reservation_id);
```

### Plans and Addons

```sql
CREATE TABLE plans (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE plan_rates (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER REFERENCES plans(id) ON DELETE CASCADE,
    room_type_id INTEGER REFERENCES room_types(id),
    rate DECIMAL(10,2) NOT NULL,
    valid_from DATE,
    valid_to DATE,
    day_of_week INTEGER[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE addons (
    id SERIAL PRIMARY KEY,
    hotel_id INTEGER REFERENCES hotels(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Users and Authentication

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'staff',
    permissions JSONB,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

## Database Views

### Reservation Summary View

```sql
CREATE VIEW reservation_summary AS
SELECT 
    r.id,
    r.confirmation_number,
    r.check_in_date,
    r.check_out_date,
    r.status,
    COALESCE(c.name_kanji, c.name_kana, c.name) as client_name,
    c.email as client_email,
    h.name as hotel_name,
    rt.name as room_type_name,
    rm.room_number,
    r.total_amount,
    r.paid_amount,
    (r.total_amount - r.paid_amount) as balance
FROM reservations r
LEFT JOIN clients c ON r.client_id = c.id
LEFT JOIN hotels h ON r.hotel_id = h.id
LEFT JOIN room_types rt ON r.room_type_id = rt.id
LEFT JOIN rooms rm ON r.room_id = rm.id;
```

### Daily Occupancy View

```sql
CREATE VIEW daily_occupancy AS
SELECT 
    h.id as hotel_id,
    h.name as hotel_name,
    date_series.date,
    COUNT(r.id) as occupied_rooms,
    h.total_rooms,
    ROUND((COUNT(r.id)::DECIMAL / NULLIF(h.total_rooms, 0)) * 100, 2) as occupancy_rate
FROM hotels h
CROSS JOIN generate_series(
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE + INTERVAL '90 days',
    '1 day'::interval
) AS date_series(date)
LEFT JOIN reservations r ON 
    r.hotel_id = h.id AND
    r.status IN ('confirmed', 'checked_in') AND
    date_series.date >= r.check_in_date AND
    date_series.date < r.check_out_date
GROUP BY h.id, h.name, date_series.date, h.total_rooms
ORDER BY h.id, date_series.date;
```

## Database Functions

### Calculate Nights Function

```sql
CREATE OR REPLACE FUNCTION calculate_nights(
    check_in DATE,
    check_out DATE
) RETURNS INTEGER AS $$
BEGIN
    RETURN (check_out - check_in);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

### Generate Confirmation Number

```sql
CREATE OR REPLACE FUNCTION generate_confirmation_number()
RETURNS VARCHAR AS $$
DECLARE
    new_number VARCHAR;
    is_duplicate BOOLEAN;
    lock_id INTEGER := hashtext('generate_confirmation_number');
    lock_acquired BOOLEAN;
    retry_count INTEGER := 0;
    max_retries INTEGER := 5;
    retry_delay_ms INTEGER := 100;
BEGIN
    -- Try to acquire a transaction-level advisory lock with retries to prevent race conditions.
    LOOP
        SELECT pg_try_advisory_xact_lock(lock_id) INTO lock_acquired;
        IF lock_acquired THEN
            EXIT; -- Lock acquired, proceed.
        END IF;

        retry_count := retry_count + 1;
        IF retry_count >= max_retries THEN
            RAISE EXCEPTION 'Could not acquire lock to generate confirmation number after % retries.', max_retries;
        END IF;

        -- Wait before retrying (e.g., 100ms with slight jitter).
        PERFORM pg_sleep(retry_delay_ms / 1000.0 * (1 + random() * 0.1));
    END LOOP;

    -- Once lock is acquired, generate a unique number.
    LOOP
        new_number := 'RES' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        
        SELECT EXISTS(
            SELECT 1 FROM reservations WHERE confirmation_number = new_number
        ) INTO is_duplicate;
        
        IF NOT is_duplicate THEN
            -- The transaction-level lock is released automatically on COMMIT or ROLLBACK.
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;
```

## Database Triggers

### Update Timestamp Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
CREATE TRIGGER update_hotels_updated_at
    BEFORE UPDATE ON hotels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reservations_updated_at
    BEFORE UPDATE ON reservations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### Audit Log Trigger

```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100),
    record_id VARCHAR(100),
    action VARCHAR(50),
    old_data JSONB,
    new_data JSONB,
    user_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (table_name, record_id, action, new_data)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'INSERT', row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES (TG_TABLE_NAME, NEW.id::TEXT, 'UPDATE', row_to_json(OLD), row_to_json(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data)
        VALUES (TG_TABLE_NAME, OLD.id::TEXT, 'DELETE', row_to_json(OLD));
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## Migration Management

### Migration File Structure

```
api/migrations/
├── 001_initial_schema.sql
├── 002_room_management.sql
├── 003_client_management.sql
├── 004_plans_and_addons.sql
├── 005_reservations.sql
├── 006_billing.sql
├── 007_ota_integration.sql
├── 008_views.sql
├── 009_financial_data.sql
├── 010_logs_schema_and_functions.sql
├── 011_custom_functions.sql
├── 012_triggers.sql
├── 013_waitlist.sql
├── 014_parking_management.sql
├── 015_missing_indexes.sql
├── 016_daily_plan_metrics.sql
└── 017_google_sheets_queue.sql
```

### Running Migrations

The following script can be used to run all migrations in numerical order. It is designed to stop immediately if any migration file fails.

For more robust and stateful migration management, consider using a dedicated database migration tool like [Flyway](https://flywaydb.org/), [Liquibase](https://www.liquibase.org/), or the migration tools built into frameworks like Ruby on Rails or Django.

```bash
#!/bin/bash
# This script runs all .sql files in the migrations directory in order.
# It will exit immediately if any command fails.
set -e

cd api

for file in migrations/*.sql; do
  echo "Running migration: $file"
  # The -v ON_ERROR_STOP=1 flag tells psql to exit if it encounters an error.
  psql -U pms_user -d pms_production -v ON_ERROR_STOP=1 -f "$file"
done

echo "✅ All migrations completed successfully."

# To run a specific migration:
# psql -U pms_user -d pms_production -v ON_ERROR_STOP=1 -f migrations/001_initial_schema.sql
```

## Performance Optimization

### Index Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_reservations_hotel_dates 
    ON reservations(hotel_id, check_in_date, check_out_date);

CREATE INDEX idx_reservations_client_status 
    ON reservations(client_id, status);

-- Partial indexes for specific conditions
CREATE INDEX idx_active_reservations 
    ON reservations(hotel_id, check_in_date) 
    WHERE status IN ('confirmed', 'checked_in');

-- JSONB indexes
CREATE INDEX idx_client_preferences 
    ON clients USING GIN (preferences);
```

### Query Optimization

```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM reservations 
WHERE hotel_id = 1 
AND check_in_date >= CURRENT_DATE
AND status = 'confirmed';

-- Optimize with proper indexes and query structure
```

## Backup and Recovery

### Backup Strategy

```bash
# Full database backup
pg_dump -U pms_user -d pms_production -F c -f backup_$(date +%Y%m%d).dump

# Schema-only backup
pg_dump -U pms_user -d pms_production --schema-only -f schema_backup.sql

# Data-only backup
pg_dump -U pms_user -d pms_production --data-only -f data_backup.sql

# Specific table backup
pg_dump -U pms_user -d pms_production -t reservations -f reservations_backup.sql
```

### Restore Procedures

When restoring a PostgreSQL database, it's crucial to understand the implications of different `pg_restore` options. Always exercise caution, especially in production environments.

```bash
# 1. Destructive Restore (for fresh environments or full resets)
#    Use this when you want to drop existing database objects before recreating them.
#    WARNING: This will delete existing data and schema in the target database.
pg_restore -U pms_user -d pms_production -c backup_20240101.dump

# 2. Non-Destructive Restore (for verification or adding missing objects)
#    Use this to restore data and schema without dropping existing objects.
#    Useful for verifying backups or adding objects to an existing schema.
#    Note: May fail if objects already exist and are not identical.
pg_restore -U pms_user -d pms_production backup_20240101.dump

# 3. Restore to a Different Database (for safe testing/verification)
#    Always restore to a separate, non-production database for testing and verification.
#    First, create the new database: CREATE DATABASE pms_test;
pg_restore -U pms_user -d pms_test backup_20240101.dump

# 4. Restore Specific Tables (for targeted data recovery or migration)
#    Use the -t option to restore only specified tables.
#    Useful for recovering specific data or migrating subsets of data.
pg_restore -U pms_user -d pms_production -t reservations -t clients backup_20240101.dump

# 5. Restore from a Plain SQL File
#    Use psql for backups created with pg_dump (plain format).
#    This is generally less flexible than custom format backups.
psql -U pms_user -d pms_production -f backup.sql
```

## Backup and Recovery

### Backup Strategy

```bash
# Full database backup
pg_dump -U pms_user -d pms_production -F c -f backup_$(date +%Y%m%d).dump

# Schema-only backup
pg_dump -U pms_user -d pms_production --schema-only -f schema_backup.sql

# Data-only backup
pg_dump -U pms_user -d pms_production --data-only -f data_backup.sql

# Specific table backup
pg_dump -U pms_user -d pms_production -t reservations -f reservations_backup.sql
```

### Restore Procedures

When restoring a PostgreSQL database, it's crucial to understand the implications of different `pg_restore` options. Always exercise caution, especially in production environments.

```bash
# 1. Destructive Restore (for fresh environments or full resets)
#    Use this when you want to drop existing database objects before recreating them.
#    WARNING: This will delete existing data and schema in the target database.
pg_restore -U pms_user -d pms_production -c backup_20240101.dump

# 2. Non-Destructive Restore (for verification or adding missing objects)
#    Use this to restore data and schema without dropping existing objects.
#    Useful for verifying backups or adding objects to an existing schema.
#    Note: May fail if objects already exist and are not identical.
pg_restore -U pms_user -d pms_production backup_20240101.dump

# 3. Restore to a Different Database (for safe testing/verification)
#    Always restore to a separate, non-production database for testing and verification.
#    First, create the new database: CREATE DATABASE pms_test;
pg_restore -U pms_user -d pms_test backup_20240101.dump

# 4. Restore Specific Tables (for targeted data recovery or migration)
#    Use the -t option to restore only specified tables.
#    Useful for recovering specific data or migrating subsets of data.
pg_restore -U pms_user -d pms_production -t reservations -t clients backup_20240101.dump

# 5. Restore from a Plain SQL File
#    Use psql for backups created with pg_dump (plain format).
#    This is generally less flexible than custom format backups.
psql -U pms_user -d pms_production -f backup.sql
```

## Service Architecture

The database schema is a foundational component of the overall service architecture. It defines the data structures that backend services interact with. For a detailed understanding of how services are organized and interact, refer to the [Service Architecture](service-architecture.md) documentation.

## API

The database schema directly supports the API by providing the underlying data for various endpoints. API requests and responses are often mapped directly to database tables and views. For API specifications and endpoint details, consult the [API Documentation](../api/README.md).

## Business Logic

The database schema is designed to support the application's business logic by ensuring data integrity and providing efficient data retrieval for business operations. Business rules often dictate the relationships and constraints defined within the schema. For details on how business logic is implemented, refer to the [Business Logic](business-logic.md) documentation.

## Related Documentation

- **[Backend Development](README.md)** - Backend overview
- **[Service Architecture](service-architecture.md)** - Service design
- **[Business Logic](business-logic.md)** - Business rules
- **[Deployment Guide](../deployment/deployment-guide.md)** - Production setup

---

*This database schema documentation provides a comprehensive reference for understanding and working with the system's data layer.*
