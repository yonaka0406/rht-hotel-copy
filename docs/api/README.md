# API Documentation

This section provides comprehensive documentation for all APIs provided by the WeHub.work Hotel Management System, including authentication, endpoints, and integration guides.

## Quick Navigation

- **[Authentication](#authentication)** - API authentication and security
- **[Booking Engine API](endpoints/booking-engine.md)** - Booking engine integration endpoints
- **[Reservation API](#reservation-management)** - Reservation management endpoints
- **[Client Management API](#client-management)** - Client and CRM endpoints
- **[Billing API](#billing-and-payments)** - Billing and payment endpoints

## API Overview

The WeHub.work PMS provides RESTful APIs for:

### 🏨 **Core Hotel Operations**
- Room and rate management
- Reservation processing
- Guest and client management
- Billing and payment processing

### 🔗 **External Integrations**
- Booking engine connectivity
- OTA (Online Travel Agency) synchronization
- Payment gateway integration
- Channel manager connectivity

### 📊 **Reporting and Analytics**
- Occupancy and revenue reports
- Guest analytics
- Performance metrics
- Custom reporting endpoints

## API Overview

The WeHub.work PMS provides RESTful APIs for:

### 🏨 **Core Hotel Operations**
- Room and rate management
- Reservation processing
- Guest and client management
- Billing and payment processing

### 🔗 **External Integrations**
- Booking engine connectivity
- OTA (Online Travel Agency) synchronization
- Payment gateway integration
- Channel manager connectivity

### 📊 **Reporting and Analytics**
- Occupancy and revenue reports
- Guest analytics
- Performance metrics
- Custom reporting endpoints

## Service Architecture

The API is a key component of the backend's service architecture, providing the interface through which various services communicate and expose functionality. For a detailed understanding of the backend's service design, refer to the [Service Architecture](../backend/service-architecture.md) documentation.

## Database

The API interacts directly with the PostgreSQL database to retrieve and persist data. The database schema is designed to support the API's data requirements efficiently. For details on the database structure, refer to the [Database Schema](../backend/database-schema.md) documentation.

## Business Logic

The API layer often orchestrates calls to the underlying business logic services. While the API handles request/response formatting and routing, the core business rules and operations are implemented in the service layer. For an in-depth look at the business logic, consult the [Business Logic](../backend/business-logic.md) documentation.

## Authentication

All API endpoints require authentication using JWT tokens. See the [Authentication Guide](#authentication) for detailed implementation.

```javascript
// Example API request with authentication
const response = await fetch('/api/reservations', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## API Endpoints by Category

### Booking Engine Integration
- `GET /api/booking-engine/hotels` - Hotel information for booking engine
- `GET /api/booking-engine/room-types` - Room types and rates
- `POST /api/booking-engine/availability` - Check availability
- `POST /api/booking-engine/reservations` - Create reservations

**[Full Booking Engine API Documentation](endpoints/booking-engine.md)**

### Reservation Management
- `GET /api/reservations` - List reservations
- `POST /api/reservations` - Create new reservation
- `PUT /api/reservations/:id` - Update reservation
- `DELETE /api/reservations/:id` - Cancel reservation

**[Full Reservation API Documentation](#reservation-management)**

### Client Management
- `GET /api/clients` - List clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client information
- `GET /api/clients/:id/history` - Client booking history

**[Full Client API Documentation](#client-management)**

### Billing and Payments
- `GET /api/billing/invoices` - List invoices
- `POST /api/billing/invoices` - Create invoice
- `POST /api/payments/process` - Process payment
- `GET /api/payments/status/:id` - Payment status

**[Full Billing API Documentation](#billing-and-payments)**

### Parking Capacity Management
- `POST /api/parking/real-time-availability/:hotelId/:vehicleCategoryId` - Check real-time parking availability
- `POST /api/parking/capacity/block` - Block parking capacity for date range
- `GET /api/parking/capacity/blocks` - Get blocked capacity records
- `DELETE /api/parking/capacity/blocks/:blockId` - Remove capacity block
- `POST /api/parking/reservations` - Create parking assignments

**Features:**
- Real-time availability with block awareness
- Net capacity calculation (total - reserved - blocked)
- Multi-date parking reservations
- Timezone-corrected date handling

## Integration Guides

### For Booking Engine Developers
1. [Authentication setup](#authentication)
2. [Hotel data synchronization](endpoints/booking-engine.md)
3. [Availability checking](../integrations/booking-engine/overview.md#availability--inventory)
4. [Reservation creation](../integrations/booking-engine/overview.md#booking-operations)

### For OTA Integrations
1. [XML API endpoints](../integrations/ota-systems/xml-integration.md#integration-architecture)
2. [Rate and inventory updates](../integrations/ota-systems/xml-integration.md#rate-and-inventory-management)
3. [Reservation synchronization](../integrations/ota-systems/xml-integration.md#reservation-management)

### For Payment Systems
1. [Payment gateway setup](../integrations/payment-systems/payment-gateway-guide.md#configuration)
2. [Transaction processing](../integrations/payment-systems/payment-gateway-guide.md#payment-processing-flow)
3. [Webhook handling](../integrations/payment-systems/payment-gateway-guide.md#webhook-handling)

## API Standards and Conventions

### Request/Response Format
- **Content-Type**: `application/json`
- **Character Encoding**: UTF-8
- **Date Format**: ISO 8601 (`YYYY-MM-DDTHH:mm:ssZ`)
- **Currency**: ISO 4217 codes (USD, EUR, etc.)

### Error Handling
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "check_in_date",
      "issue": "Date must be in the future"
    }
  }
}
```

### Rate Limiting
- **Default**: 1000 requests per hour per API key
- **Burst**: Up to 100 requests per minute
- **Headers**: Rate limit information in response headers

## Examples

Here are some practical examples demonstrating how to interact with the API.

### Example 1: Fetching Reservations

```javascript
// Fetch all reservations
const response = await fetch('/api/reservations', {
  headers: {
    'Authorization': `Bearer YOUR_JWT_TOKEN`,
    'Content-Type': 'application/json'
  }
});
const reservations = await response.json();
console.log(reservations);
```

### Example 2: Creating a New Client

```javascript
// Create a new client
const response = await fetch('/api/clients', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer YOUR_JWT_TOKEN`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+15551234567'
  })
});
const newClient = await response.json();
console.log(newClient);
```

## Testing and Development

### API Testing Tools
- **Postman Collection**: Available for all endpoints
- **OpenAPI Specification**: Swagger documentation
- **Test Environment**: Sandbox API for development

### Development Resources
- [API Testing Guide](../development/README.md#testing-strategy)
- [Integration Examples](../integrations/README.md)
- [Error Code Reference](../reference/README.md#error-codes)

## Versioning and Updates

- **Current Version**: v1
- **Versioning Strategy**: URL-based versioning (`/api/v1/`)
- **Backward Compatibility**: Maintained for major versions
- **Update Notifications**: API changelog and notifications

## Support and Resources

- **Integration Support**: See [integration guides](../integrations/README.md)
- **Error Troubleshooting**: Check [error codes reference](../reference/README.md#error-codes)
- **Performance Optimization**: Review [API best practices](../development/README.md#security-best-practices)

---

*For implementation examples and detailed integration guides, explore the specific endpoint documentation and integration guides.*