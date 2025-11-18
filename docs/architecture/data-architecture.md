# Data Architecture

This document describes the data architecture of the Hotel Management System, including database design, data flow patterns, caching strategies, and data integrity mechanisms.

## Database Design Overview

The system uses PostgreSQL as the primary relational database with a normalized schema design that ensures data integrity, consistency, and efficient querying.

### Design Principles

#### Normalization
- **Third Normal Form (3NF)**: Eliminates data redundancy
- **Foreign Key Constraints**: Enforces referential integrity
- **Unique Constraints**: Prevents duplicate data
- **Check Constraints**: Validates data at database level

#### Performance Optimization
- **Strategic Indexing**: Optimized query performance
- **Materialized Views**: Pre-computed aggregations for reporting
- **Query Optimization**: Efficient query patterns
- **Connection Pooling**: Efficient database connection management

#### Data Integrity
- **ACID Transactions**: Ensures data consistency
- **Cascade Rules**: Maintains referential integrity
- **Audit Trails**: Tracks data changes
- **Soft Deletes**: Preserves historical data

## Core Data Entities

### Hotel Management Entities

#### Hotels
**Purpose**: Store property information and configuration

**Key Attributes**:
- `id`: Unique identifier
- `name`: Hotel name
- `address`: Physical location
- `contact_info`: Phone, email, website
- `configuration`: JSON field for flexible settings
- `status`: Active, inactive, maintenance
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- One-to-many with Rooms
- One-to-many with Reservations
- One-to-many with Users (staff assignments)
- One-to-many with Plans (pricing)

#### Rooms
**Purpose**: Manage room inventory and attributes

**Key Attributes**:
- `id`: Unique identifier
- `hotel_id`: Foreign key to Hotels
- `room_number`: Room identifier
- `room_type`: Single, double, suite, etc.
- `capacity`: Maximum occupancy
- `amenities`: JSON array of features
- `status`: Available, occupied, maintenance, cleaning
- `floor`: Floor number
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- Many-to-one with Hotels
- One-to-many with Reservations

### Reservation Entities

#### Reservations
**Purpose**: Store booking information and lifecycle

**Key Attributes**:
- `id`: Unique identifier
- `hotel_id`: Foreign key to Hotels
- `room_id`: Foreign key to Rooms
- `client_id`: Foreign key to Clients
- `check_in_date`: Arrival date
- `check_out_date`: Departure date
- `status`: Pending, confirmed, checked_in, checked_out, cancelled
- `number_of_guests`: Guest count
- `special_requests`: Text field for notes
- `source`: Direct, OTA, booking engine, etc.
- `confirmation_number`: Unique booking reference
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- Many-to-one with Hotels
- Many-to-one with Rooms
- Many-to-one with Clients
- One-to-many with Billing records
- One-to-many with Reservation addons

**Business Rules**:
- Check-out date must be after check-in date
- Room must be available for the date range
- Cannot modify confirmed reservations without authorization
- Cancellation policies apply based on timing

### Client Management Entities

#### Clients
**Purpose**: Store customer information and preferences

**Key Attributes**:
- `id`: Unique identifier
- `first_name`, `last_name`: Personal information
- `email`: Contact email (unique)
- `phone`: Contact phone
- `address`: Physical address
- `date_of_birth`: Birth date
- `nationality`: Country of origin
- `preferences`: JSON field for guest preferences
- `loyalty_tier`: Standard, silver, gold, platinum
- `notes`: Internal notes about the client
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- One-to-many with Reservations
- One-to-many with Billing records
- One-to-many with Communication logs

**Privacy Considerations**:
- PII (Personally Identifiable Information) protection
- GDPR compliance for data retention
- Secure storage of sensitive information

### Financial Entities

#### Billing
**Purpose**: Track financial transactions and invoices

**Key Attributes**:
- `id`: Unique identifier
- `reservation_id`: Foreign key to Reservations
- `client_id`: Foreign key to Clients
- `amount`: Total amount
- `currency`: Currency code (USD, EUR, JPY, etc.)
- `status`: Pending, paid, partially_paid, refunded, cancelled
- `payment_method`: Cash, credit card, bank transfer, etc.
- `payment_date`: Date of payment
- `invoice_number`: Unique invoice reference
- `line_items`: JSON array of charges
- `taxes`: Tax calculations
- `discounts`: Applied discounts
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- Many-to-one with Reservations
- Many-to-one with Clients
- One-to-many with Payment transactions

#### Plans
**Purpose**: Define pricing structures and rate plans

**Key Attributes**:
- `id`: Unique identifier
- `hotel_id`: Foreign key to Hotels
- `name`: Plan name
- `description`: Plan details
- `base_rate`: Base price per night
- `room_type`: Applicable room types
- `season`: High, low, shoulder season
- `min_stay`: Minimum nights required
- `max_stay`: Maximum nights allowed
- `cancellation_policy`: Cancellation rules
- `addons`: Available add-ons (breakfast, parking, etc.)
- `valid_from`, `valid_to`: Date range
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- Many-to-one with Hotels
- Many-to-many with Reservations (through reservation_plans)

### User Management Entities

#### Users
**Purpose**: System user accounts and authentication

**Key Attributes**:
- `id`: Unique identifier
- `username`: Login username (unique)
- `email`: User email (unique)
- `password_hash`: Hashed password (bcrypt)
- `first_name`, `last_name`: Personal information
- `role`: Admin, manager, staff, viewer
- `hotel_id`: Assigned hotel (null for multi-hotel access)
- `permissions`: JSON array of specific permissions
- `last_login`: Last login timestamp
- `is_active`: Account status
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- Many-to-one with Hotels (optional)
- One-to-many with Audit logs

**Security**:
- Password hashing with bcrypt
- JWT token-based authentication
- Role-based access control (RBAC)
- Session management with Redis

### Waitlist Entities

#### Waitlist
**Purpose**: Manage guest waiting list and notifications

**Key Attributes**:
- `id`: Unique identifier
- `hotel_id`: Foreign key to Hotels
- `client_id`: Foreign key to Clients
- `room_type`: Desired room type
- `check_in_date`: Desired arrival date
- `check_out_date`: Desired departure date
- `number_of_guests`: Guest count
- `priority`: Priority level
- `status`: Waiting, notified, converted, expired
- `notification_sent`: Notification status
- `created_at`, `updated_at`: Timestamps

**Relationships**:
- Many-to-one with Hotels
- Many-to-one with Clients

## Data Flow Architecture

### Reservation Booking Flow

```
1. Client Request → Frontend Form
2. Frontend Validation → API Request
3. API Controller → Reservation Service
4. Reservation Service:
   - Validate availability (Room Repository)
   - Check business rules (Validation Service)
   - Create reservation (Reservation Repository)
   - Update room status (Room Repository)
   - Create billing record (Billing Service)
   - Send confirmation (Notification Service)
5. Transaction Commit → Response to Frontend
6. Real-time Update → WebSocket Broadcast
7. Cache Update → Redis Cache
```

### Data Synchronization Flow

```
1. External System (OTA) → Webhook/API Call
2. Integration Service → Parse Request
3. Validation → Business Rules Check
4. Data Transformation → Internal Format
5. Service Layer → Update Database
6. Cache Invalidation → Redis Update
7. Event Broadcast → WebSocket Notification
8. Response → External System Confirmation
```

### Reporting Data Flow

```
1. Report Request → API Endpoint
2. Report Service → Check Cache (Redis)
3. If Cache Miss:
   - Query Materialized Views
   - Aggregate Data (PostgreSQL)
   - Transform Results
   - Store in Cache (Redis)
4. Return Data → Frontend
5. Frontend → Render Charts (ECharts)
```

## Caching Strategy

### Redis Caching Layers

#### Session Cache
**Purpose**: Store user session data
- **TTL**: 24 hours (configurable)
- **Key Pattern**: `session:{sessionId}`
- **Data**: User authentication, preferences, permissions

#### API Response Cache
**Purpose**: Cache frequently accessed data
- **TTL**: 5-60 minutes (varies by endpoint)
- **Key Pattern**: `api:{endpoint}:{params}`
- **Data**: Hotel lists, room availability, pricing

#### Computed Data Cache
**Purpose**: Store expensive calculations
- **TTL**: 1-24 hours
- **Key Pattern**: `computed:{type}:{id}`
- **Data**: Dashboard metrics, aggregated reports

#### Real-time Data Cache
**Purpose**: Temporary storage for real-time updates
- **TTL**: 1-5 minutes
- **Key Pattern**: `realtime:{type}:{id}`
- **Data**: Live occupancy, current reservations

### Cache Invalidation Strategies

#### Time-Based Expiration
- Automatic expiration using Redis TTL
- Suitable for data that changes predictably

#### Event-Based Invalidation
- Invalidate cache on data modifications
- Triggered by create, update, delete operations

#### Manual Invalidation
- Admin-triggered cache clearing
- Used for troubleshooting or forced updates

## Data Aggregation Strategies

### Materialized Views

#### Occupancy Summary View
**Purpose**: Pre-computed occupancy statistics
```sql
CREATE MATERIALIZED VIEW occupancy_summary AS
SELECT 
    hotel_id,
    DATE(check_in_date) as date,
    COUNT(*) as total_reservations,
    SUM(number_of_guests) as total_guests,
    COUNT(DISTINCT room_id) as occupied_rooms
FROM reservations
WHERE status IN ('confirmed', 'checked_in')
GROUP BY hotel_id, DATE(check_in_date);
```

#### Revenue Summary View
**Purpose**: Pre-computed revenue metrics
```sql
CREATE MATERIALIZED VIEW revenue_summary AS
SELECT 
    hotel_id,
    DATE_TRUNC('month', payment_date) as month,
    SUM(amount) as total_revenue,
    COUNT(*) as transaction_count,
    AVG(amount) as average_transaction
FROM billing
WHERE status = 'paid'
GROUP BY hotel_id, DATE_TRUNC('month', payment_date);
```

### Refresh Strategy
- **Scheduled Refresh**: Nightly refresh for historical data
- **On-Demand Refresh**: Triggered by admin or specific events
- **Incremental Refresh**: Update only changed data (where possible)

## Data Integrity Mechanisms

### Database Constraints

#### Foreign Key Constraints
```sql
ALTER TABLE reservations
ADD CONSTRAINT fk_hotel
FOREIGN KEY (hotel_id) REFERENCES hotels(id)
ON DELETE RESTRICT ON UPDATE CASCADE;
```

#### Check Constraints
```sql
ALTER TABLE reservations
ADD CONSTRAINT check_dates
CHECK (check_out_date > check_in_date);
```

#### Unique Constraints
```sql
ALTER TABLE clients
ADD CONSTRAINT unique_email
UNIQUE (email);
```

### Transaction Management

#### ACID Compliance
- **Atomicity**: All-or-nothing operations
- **Consistency**: Data integrity maintained
- **Isolation**: Concurrent transaction handling
- **Durability**: Committed data persists

#### Transaction Patterns
```javascript
// Service layer transaction example
async createReservationWithBilling(reservationData, billingData) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const reservation = await createReservation(client, reservationData);
        const billing = await createBilling(client, billingData);
        await updateRoomStatus(client, reservationData.room_id);
        
        await client.query('COMMIT');
        return { reservation, billing };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
```

### Audit Trails

#### Audit Log Table
**Purpose**: Track all data modifications

**Attributes**:
- `id`: Unique identifier
- `table_name`: Affected table
- `record_id`: Affected record ID
- `action`: INSERT, UPDATE, DELETE
- `old_values`: Previous data (JSON)
- `new_values`: New data (JSON)
- `user_id`: User who made the change
- `timestamp`: When the change occurred
- `ip_address`: Source IP address

#### Trigger-Based Auditing
```sql
CREATE TRIGGER audit_reservations
AFTER INSERT OR UPDATE OR DELETE ON reservations
FOR EACH ROW EXECUTE FUNCTION audit_log_function();
```

## Data Migration and Versioning

### Migration System

#### Version Control
- Sequential migration scripts
- Up and down migrations
- Migration tracking table

#### Migration Script Pattern
```sql
-- migrations/001_create_hotels_table.sql
-- Up Migration
CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    -- ... other columns
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Down Migration
-- DROP TABLE hotels;
```

### Data Backup Strategy

#### Backup Types
- **Full Backup**: Complete database backup (daily)
- **Incremental Backup**: Changes since last backup (hourly)
- **Transaction Log Backup**: Continuous transaction logging

#### Backup Retention
- Daily backups: 30 days
- Weekly backups: 12 weeks
- Monthly backups: 12 months

## Performance Optimization

### Indexing Strategy

#### Primary Indexes
- Primary keys (automatic)
- Foreign keys
- Unique constraints

#### Secondary Indexes
```sql
-- Frequently queried columns
CREATE INDEX idx_reservations_dates 
ON reservations(check_in_date, check_out_date);

CREATE INDEX idx_reservations_status 
ON reservations(status);

CREATE INDEX idx_clients_email 
ON clients(email);
```

#### Composite Indexes
```sql
-- Multi-column queries
CREATE INDEX idx_reservations_hotel_dates 
ON reservations(hotel_id, check_in_date, check_out_date);
```

### Query Optimization

#### Query Patterns
- Use prepared statements
- Avoid N+1 queries
- Use JOINs efficiently
- Limit result sets
- Use pagination

#### Connection Pooling
```javascript
const pool = new Pool({
    max: 20,                    // Maximum connections
    idleTimeoutMillis: 30000,   // Close idle connections
    connectionTimeoutMillis: 2000 // Connection timeout
});
```

## Data Security

### Encryption

#### At Rest
- Database encryption (PostgreSQL)
- Encrypted backups
- Secure file storage

#### In Transit
- TLS/SSL for database connections
- HTTPS for API communication
- Encrypted WebSocket connections

### Access Control

#### Database Users
- Application user: Limited permissions
- Admin user: Full access
- Read-only user: Reporting and analytics
- Backup user: Backup operations only

#### Row-Level Security
```sql
-- Example: Users can only see their hotel's data
CREATE POLICY hotel_isolation ON reservations
FOR ALL TO app_user
USING (hotel_id = current_setting('app.current_hotel_id')::int);
```

## Related Documentation

- **[System Overview](system-overview.md)** - High-level architecture
- **[Component Architecture](component-architecture.md)** - Component design
- **[Backend Development](../backend/README.md)** - Backend implementation
- **[Database Schema](../backend/database-schema.md)** - Detailed schema documentation
- **[API Documentation](../api/README.md)** - API specifications

---

*This data architecture ensures data integrity, performance, and scalability while maintaining security and compliance.*
