# Booking Engine Integration Overview

This document outlines the integration strategy for connecting the rht-hotel Property Management System (PMS) with the Next.js Booking Engine. The integration enables real-time synchronization of availability, bookings, and hotel information between the two systems.

## Integration Goals

### Primary Objectives
1. **Real-time Data Synchronization** - Ensure booking engine always has current availability and pricing
2. **Bidirectional Booking Management** - Allow bookings to be created and managed from both systems
3. **Unified User Experience** - Seamless integration without system boundaries
4. **Data Integrity** - Maintain consistency across both systems
5. **Performance** - Fast, reliable communication without impacting existing operations

### Business Benefits
- **Increased Revenue** - Direct bookings through modern booking engine
- **Reduced Manual Work** - Automated synchronization eliminates double-entry
- **Better Guest Experience** - Real-time availability and instant booking confirmation
- **Operational Efficiency** - Single source of truth for booking data
- **Scalability** - Support for multiple hotels and booking channels

## Integration Architecture

### Approach: RESTful API Integration
**Rationale**: Modern, efficient, and secure approach that leverages existing rht-hotel infrastructure while providing the performance and reliability needed for real-time booking operations.

### Architecture Overview
```
┌─────────────────┐    RESTful API    ┌─────────────────┐
│   Booking       │ ◄──────────────► │   rht-hotel     │
│   Engine        │                  │   PMS           │
│                 │                  │                 │
│ • Next.js 15    │                  │ • Node.js/Express│
│ • Supabase      │                  │ • PostgreSQL    │
│ • TypeScript    │                  │ • Vue.js        │
└─────────────────┘                  └─────────────────┘
```

### Key Design Principles
1. **Loose Coupling** - Systems can operate independently
2. **High Availability** - Graceful degradation when one system is unavailable
3. **Data Consistency** - Conflict resolution and data validation
4. **Security First** - Secure authentication and data transmission
5. **Performance Optimized** - Hybrid caching strategy with manual and automatic updates
6. **Data Ownership** - PMS maintains control over hotel and room type data
7. **Bidirectional Integration** - PMS can trigger cache updates and check status

## Caching Strategy

### Hybrid Caching Approach

The integration implements a **hybrid caching strategy** with different update mechanisms for different data types:

#### Hotel & Room Type Cache (Manual Updates Only)
- **Manual Control**: Updates only triggered by administrators or PMS system
- **No Automatic Sync**: No background synchronization for hotel/room type data
- **PMS Ownership**: PMS maintains full control over hotel and room type data
- **Smart Cleanup**: Only removes cache entries not linked to active hotels/room types
- **Admin Control**: All hotel/room type cache updates must be triggered manually

#### Availability Cache (Automatic + Manual)
- **TTL-based**: 15-minute Time-To-Live for availability data
- **Automatic Refresh**: Background service refreshes expired availability entries
- **Manual Override**: Admin can manually trigger availability cache refresh
- **Real-time Updates**: Immediate availability updates for critical operations
- **Smart Cleanup**: Removes availability data older than 1 month

### Cache Management API

#### PMS-Triggered Cache Updates
```bash
# PMS can trigger hotel cache updates
POST /api/booking-engine/cache/update-hotels
Authorization: Bearer PMS_API_KEY
Content-Type: application/json

# PMS can trigger room type cache updates
POST /api/booking-engine/cache/update-room-types
Authorization: Bearer PMS_API_KEY
Content-Type: application/json

# PMS can check cache status
GET /api/booking-engine/cache/status
Authorization: Bearer PMS_API_KEY

# PMS can trigger availability cache refresh
POST /api/booking-engine/cache/refresh-availability
Authorization: Bearer PMS_API_KEY
Content-Type: application/json
{
  "hotel_id": "uuid",
  "room_type_id": "uuid",
  "start_date": "2024-01-15",
  "end_date": "2024-01-20"
}
```

#### Cache Status Response
```json
{
  "hotels": {
    "last_updated": "2024-01-15T10:30:00Z",
    "is_active": true,
    "cache_ttl_minutes": 1440
  },
  "room_types": {
    "last_updated": "2024-01-15T10:30:00Z",
    "is_active": true,
    "cache_ttl_minutes": 1440
  },
  "availability": {
    "last_updated": "2024-01-15T10:25:00Z",
    "is_active": true,
    "cache_ttl_minutes": 15
  }
}
```

### Cache Data Flow

#### Hotel & Room Type Cache Flow
1. **PMS Data Change** → PMS triggers cache update via API
2. **Booking Engine** → Receives update request and fetches fresh data
3. **Cache Update** → Updates local cache with new hotel/room type data
4. **Status Response** → Returns update status to PMS
5. **Manual Control** → No automatic background sync for hotel/room type data

#### Availability Cache Flow
1. **Client Request** → Booking engine checks local availability cache
2. **Cache Hit (Valid)** → Returns cached availability immediately
3. **Cache Miss/Expired** → Fetches from PMS API → Updates cache → Returns data
4. **Background Sync** → Periodically refreshes expired availability entries
5. **Manual Override** → Admin can manually trigger availability cache refresh

### Cache Benefits

#### Performance Benefits
- **Fast Response Times**: Cached data provides sub-200ms response times
- **Reduced PMS Load**: Minimizes API calls to PMS system
- **High Availability**: Booking engine continues operating during PMS downtime
- **Scalability**: Supports high-volume booking operations

#### Operational Benefits
- **Data Ownership**: PMS maintains control over hotel and room type data
- **Manual Control**: Hotel/room type updates only when explicitly requested
- **Automatic Availability**: Availability cache refreshes automatically
- **Bidirectional Integration**: PMS can trigger cache updates and check status
- **Smart Cleanup**: Intelligent cache cleanup preserves linked data

## Technical Implementation

### API Endpoints

#### Availability & Inventory
- `GET /api/booking-engine/availability/:hotel_id` - Check room availability
- `GET /api/booking-engine/room-types/:hotel_id` - Get room types
- `GET /api/booking-engine/amenities/:hotel_id` - Get amenities
- `GET /api/booking-engine/hotels/:hotel_id` - Get hotel information

#### Booking Operations
- `POST /api/booking-engine/bookings` - Create new booking
- `GET /api/booking-engine/bookings/:booking_id` - Get booking details
- `PUT /api/booking-engine/bookings/:booking_id` - Update booking
- `DELETE /api/booking-engine/bookings/:booking_id` - Cancel booking

#### Authentication & Validation
- `POST /api/booking-engine/auth/validate-token` - Validate authentication token
- `GET /api/booking-engine/auth/user/:user_id` - Get user information

#### Hotel Information
- `GET /api/booking-engine/hotels/:hotel_id/images` - Get hotel images
- `GET /api/booking-engine/hotels/:hotel_id/pricing` - Get pricing information

#### Cache Management
- `POST /api/booking-engine/cache/update-hotels` - Update hotel cache
- `POST /api/booking-engine/cache/update-room-types` - Update room type cache
- `POST /api/booking-engine/cache/refresh-availability` - Refresh availability cache
- `GET /api/booking-engine/cache/status` - Get cache status

### Authentication & Security

#### JWT Token Authentication
- Secure API access with short-lived tokens
- Token validation on every request
- Automatic token refresh mechanism

#### Rate Limiting
- Prevent API abuse
- Ensure system stability
- Configurable limits per endpoint

#### Request Validation
- Validate all incoming requests
- Schema validation for payloads
- Type checking and sanitization

#### Audit Logging
- Track all API interactions
- Security event logging
- Performance monitoring

### Database Schema Extensions

#### API Access Management
```sql
CREATE TABLE booking_engine_api_keys (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    api_key_hash TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP,
    expires_at TIMESTAMP
);
```

#### Integration Configuration
```sql
CREATE TABLE booking_engine_config (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    booking_engine_url TEXT NOT NULL,
    sync_enabled BOOLEAN DEFAULT true,
    sync_interval_minutes INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Sync Status Tracking
```sql
CREATE TABLE booking_sync_status (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES reservations(id),
    booking_engine_id TEXT,
    sync_status TEXT DEFAULT 'pending',
    last_sync_attempt TIMESTAMP,
    error_message TEXT,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Integration Audit Log
```sql
CREATE TABLE booking_engine_audit_log (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    request_data JSONB,
    response_data JSONB,
    status TEXT NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Cache Management Tables
```sql
CREATE TABLE booking_engine_cache_status (
    id SERIAL PRIMARY KEY,
    cache_type TEXT NOT NULL,
    hotel_id INT REFERENCES hotels(id),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cache_ttl_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE booking_engine_cache_triggers (
    id SERIAL PRIMARY KEY,
    trigger_type TEXT NOT NULL,
    cache_type TEXT NOT NULL,
    hotel_id INT REFERENCES hotels(id),
    triggered_by TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);
```

## Data Synchronization Strategy

### Hybrid Sync Approach

#### Hotel & Room Type Sync (Manual Only)
- **PMS-Triggered Updates** - PMS initiates cache updates when data changes
- **Manual Admin Control** - Administrators can trigger cache updates
- **No Automatic Background Sync** - Hotel/room type data only updates when explicitly requested
- **Smart Cleanup** - Preserves linked data, removes only orphaned cache entries

#### Availability Sync (Automatic + Manual)
- **TTL-Based Automatic Sync** - 15-minute automatic refresh of expired availability data
- **Real-time Updates** - Critical availability changes sync immediately
- **Background Service** - Periodically refreshes expired availability entries
- **Manual Override** - Admin can manually trigger availability cache refresh

### Cache-Aware Synchronization
- **Intelligent Caching** - Different cache strategies for different data types
- **PMS Control** - PMS maintains ownership of hotel and room type data
- **Performance Optimization** - Cached data provides fast response times
- **Reliability** - Booking engine continues operating during PMS downtime

### Fallback Mechanisms
- **Offline Mode** - Continue operation when integration is down
- **Cached Data Usage** - Use cached data during PMS outages
- **Retry Logic** - Automatic retry for failed operations
- **Manual Sync** - Manual sync tools for critical operations
- **Smart Cache Management** - Intelligent cleanup and preservation of linked data

## Performance Requirements

### Response Time Targets
- **Availability Queries**: < 200ms
- **Booking Creation**: < 500ms
- **Booking Updates**: < 300ms
- **Hotel Information**: < 100ms

### Throughput Requirements
- **Concurrent Requests**: Support 100+ concurrent API calls
- **Daily Volume**: Handle 10,000+ API requests per day
- **Peak Load**: Maintain performance during booking spikes

### Reliability Targets
- **Uptime**: 99.9% availability
- **Error Rate**: < 0.1% error rate
- **Data Consistency**: 99.99% data accuracy

## Integration Monitoring

### Health Checks
- Real-time API health monitoring
- Cache status monitoring
- Database connection monitoring
- External service availability

### Logging and Alerting
- Comprehensive event logging
- Error tracking and alerting
- Performance metrics collection
- Security event monitoring

### Dashboard
- Real-time integration status
- Cache performance metrics
- API usage statistics
- Error rate tracking

## Success Metrics

### Technical Metrics
- **API Response Time** - Average response time < 200ms
- **Error Rate** - < 0.1% error rate
- **Uptime** - 99.9% availability
- **Sync Latency** - Real-time sync within 5 seconds

### Business Metrics
- **Booking Volume** - Increase in direct bookings
- **Revenue Impact** - Measurable revenue increase
- **Operational Efficiency** - Reduced manual work
- **User Satisfaction** - Improved guest experience

## Related Documentation

- **[Booking Engine API Endpoints](../../api/endpoints/booking-engine.md)** - Detailed API documentation
- **[Caching Strategy](caching-strategy.md)** - Detailed caching implementation
- **[API Specification](api-specification.md)** - Complete API specifications
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[Integration Patterns](../../architecture/integration-patterns.md)** - General integration approaches

---

*This integration strategy provides a comprehensive roadmap for connecting the rht-hotel PMS with the booking engine, ensuring a robust, secure, and scalable integration.*
