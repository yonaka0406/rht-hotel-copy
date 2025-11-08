# Reference Documentation

This section provides technical reference materials, configuration options, error codes, and other reference information for the WeHub.work Hotel Management System.

## Quick Navigation

- **[Configuration Reference](configuration-reference.md)** - All configuration options and environment variables
- **[Error Codes](error-codes.md)** - System error codes and meanings
- **[Glossary](glossary.md)** - Technical terms and definitions
- **[Changelog](changelog.md)** - Version history and changes
- **[API Reference](../api/README.md)** - Complete API endpoint reference

## Configuration Reference

### Environment Variables

#### Application Configuration
```bash
# Server Configuration
NODE_ENV=production|development|test
PORT=3000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Session Configuration
SESSION_SECRET=your-session-secret
SESSION_TIMEOUT=3600000  # 1 hour in milliseconds
```

#### Database Configuration
```bash
# PostgreSQL
DATABASE_URL=postgresql://user:password@host:port/database
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_SSL=true|false

# Redis
REDIS_URL=redis://host:port
REDIS_PASSWORD=your-redis-password
REDIS_DB=0
```

#### Authentication & Security
```bash
# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Security
CORS_ORIGIN=https://yourdomain.com
RATE_LIMIT_WINDOW=900000  # 15 minutes
RATE_LIMIT_MAX=100
```

#### Integration Configuration
```bash
# Booking Engine
BOOKING_ENGINE_API_URL=https://booking-api.example.com
BOOKING_ENGINE_API_KEY=your-api-key
BOOKING_ENGINE_CACHE_TTL=300  # 5 minutes

# Payment Gateway
PAYMENT_GATEWAY_URL=https://payment-gateway.example.com
PAYMENT_GATEWAY_KEY=your-payment-key
PAYMENT_GATEWAY_SECRET=your-payment-secret

# Email Service
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
EMAIL_FROM=noreply@yourdomain.com
```

**[Complete Configuration Reference](configuration-reference.md)**

## Error Codes

### HTTP Status Codes
- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., duplicate)
- **422 Unprocessable Entity**: Validation error
- **500 Internal Server Error**: Server error
- **503 Service Unavailable**: Service temporarily unavailable

### Application Error Codes

#### Authentication Errors (AUTH_*)
- **AUTH_001**: Invalid credentials
- **AUTH_002**: Token expired
- **AUTH_003**: Token invalid
- **AUTH_004**: Insufficient permissions
- **AUTH_005**: Account locked

#### Validation Errors (VAL_*)
- **VAL_001**: Required field missing
- **VAL_002**: Invalid format
- **VAL_003**: Value out of range
- **VAL_004**: Invalid date range
- **VAL_005**: Duplicate entry

#### Business Logic Errors (BIZ_*)
- **BIZ_001**: Room not available
- **BIZ_002**: Invalid reservation dates
- **BIZ_003**: Cancellation policy violation
- **BIZ_004**: Payment processing failed
- **BIZ_005**: Insufficient inventory

#### Integration Errors (INT_*)
- **INT_001**: External API unavailable
- **INT_002**: Integration timeout
- **INT_003**: Invalid API response
- **INT_004**: Authentication failed
- **INT_005**: Rate limit exceeded

**[Complete Error Code Reference](error-codes.md)**

## Glossary

### Core Concepts

#### Hotel Management Terms
- **PMS**: Property Management System - Core hotel management software
- **OTA**: Online Travel Agency - Third-party booking platforms (Booking.com, Expedia)
- **Channel Manager**: System for managing inventory across multiple OTAs
- **Rate Plan**: Pricing structure for room types
- **Inventory**: Available room capacity
- **Occupancy**: Percentage of rooms occupied
- **ADR**: Average Daily Rate - Average revenue per occupied room
- **RevPAR**: Revenue Per Available Room - Key performance metric

#### Technical Terms
- **JWT**: JSON Web Token - Authentication token format
- **REST**: Representational State Transfer - API architectural style
- **CRUD**: Create, Read, Update, Delete - Basic data operations
- **Middleware**: Software layer between request and response
- **Composable**: Reusable Vue 3 Composition API function
- **Migration**: Database schema version control script
- **Webhook**: HTTP callback for real-time event notifications

#### System Components
- **Frontend**: Vue.js user interface application
- **Backend**: Node.js API server
- **Database**: PostgreSQL relational database
- **Cache**: Redis in-memory data store
- **Queue**: Background job processing system

**[Complete Glossary](glossary.md)**

## API Quick Reference

### Authentication
```javascript
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

### Reservations
```javascript
GET    /api/reservations
POST   /api/reservations
GET    /api/reservations/:id
PUT    /api/reservations/:id
DELETE /api/reservations/:id
```

### Clients
```javascript
GET    /api/clients
POST   /api/clients
GET    /api/clients/:id
PUT    /api/clients/:id
DELETE /api/clients/:id
```

### Hotels
```javascript
GET    /api/hotels
GET    /api/hotels/:id
PUT    /api/hotels/:id
GET    /api/hotels/:id/rooms
```

**[Complete API Reference](../api/README.md)**

## Database Schema Quick Reference

### Core Tables
- **hotels**: Hotel properties and configuration
- **rooms**: Individual room inventory
- **room_types**: Room type definitions and rates
- **reservations**: Booking records
- **clients**: Guest and client information
- **payments**: Payment transactions
- **invoices**: Billing records
- **users**: System user accounts

### Relationship Overview
```
hotels → rooms → room_types
hotels → reservations → clients
reservations → payments → invoices
hotels → users (staff assignments)
```

**[Complete Database Schema](../backend/database-schema.md)**

## Version History

### Current Version: 1.0.0

#### Recent Changes
- **1.0.0** (2024-11): Initial production release
  - Complete PMS functionality
  - Booking engine integration
  - Payment processing
  - Multi-hotel support

#### Upcoming Features
- **1.1.0** (Planned): Enhanced reporting and analytics
- **1.2.0** (Planned): Mobile application
- **2.0.0** (Planned): Advanced channel manager integration

**[Complete Changelog](changelog.md)**

## Performance Benchmarks

### API Response Times (Target)
- **Simple Queries**: < 100ms
- **Complex Queries**: < 500ms
- **Report Generation**: < 2s
- **Bulk Operations**: < 5s

### Database Performance
- **Connection Pool**: 2-10 connections
- **Query Timeout**: 30s
- **Transaction Timeout**: 60s
- **Backup Duration**: < 5 minutes

### Cache Performance
- **Cache Hit Rate**: > 80%
- **Cache TTL**: 5-60 minutes (varies by data type)
- **Cache Invalidation**: Event-driven

## System Limits

### Application Limits
- **Max Request Size**: 10MB
- **Max Upload Size**: 50MB
- **Rate Limit**: 100 requests per 15 minutes per IP
- **Session Timeout**: 1 hour
- **JWT Expiration**: 24 hours

### Database Limits
- **Max Connections**: 100
- **Max Query Time**: 30 seconds
- **Max Transaction Time**: 60 seconds
- **Max Row Size**: 1GB

### Business Limits
- **Max Hotels per Account**: 50
- **Max Rooms per Hotel**: 1000
- **Max Reservation Length**: 365 days
- **Max Advance Booking**: 2 years

## Data Formats

### Date and Time
- **Format**: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Timezone**: UTC for storage, local for display
- **Date Only**: `YYYY-MM-DD`
- **Time Only**: `HH:mm:ss`

### Currency
- **Format**: ISO 4217 currency codes (USD, EUR, GBP)
- **Precision**: 2 decimal places
- **Storage**: Decimal type in database
- **Display**: Locale-specific formatting

### Phone Numbers
- **Format**: E.164 international format (`+1234567890`)
- **Validation**: Country-specific validation
- **Storage**: String without formatting
- **Display**: Locale-specific formatting

## Related Documentation

### Implementation Guides
- **[Backend Development](../backend/README.md)** - Backend implementation
- **[Frontend Development](../frontend/README.md)** - Frontend implementation
- **[API Documentation](../api/README.md)** - API endpoints

### Operations
- **[Deployment Guide](../deployment/README.md)** - Deployment procedures
- **[Monitoring](../deployment/monitoring-logging.md)** - System monitoring
- **[Troubleshooting](../deployment/troubleshooting.md)** - Issue resolution

### Development
- **[Coding Standards](../development/coding-standards.md)** - Code conventions
- **[Testing Strategy](../development/testing-strategy.md)** - Testing approach
- **[Git Workflow](../development/git-workflow.md)** - Version control

## Quick Links

- **[Main Documentation](../README.md)** - Documentation home
- **[Getting Started](../getting-started/README.md)** - Quick start guide
- **[Architecture](../architecture/README.md)** - System architecture
- **[Features](../features/README.md)** - Feature documentation

---

*For detailed technical specifications, see the specific reference documents in this section*
*For implementation details, see the [Backend](../backend/README.md) and [Frontend](../frontend/README.md) documentation*
