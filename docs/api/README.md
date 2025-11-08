# API Documentation

This section provides comprehensive documentation for all APIs provided by the WeHub.work Hotel Management System, including authentication, endpoints, and integration guides.

## Quick Navigation

- **[Authentication](authentication.md)** - API authentication and security
- **[Booking Engine API](endpoints/booking-engine.md)** - Booking engine integration endpoints
- **[Reservation API](endpoints/reservations.md)** - Reservation management endpoints
- **[Client Management API](endpoints/clients.md)** - Client and CRM endpoints
- **[Billing API](endpoints/billing.md)** - Billing and payment endpoints

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

## Authentication

All API endpoints require authentication using JWT tokens. See the [Authentication Guide](authentication.md) for detailed implementation.

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

**[Full Reservation API Documentation](endpoints/reservations.md)**

### Client Management
- `GET /api/clients` - List clients
- `POST /api/clients` - Create new client
- `PUT /api/clients/:id` - Update client information
- `GET /api/clients/:id/history` - Client booking history

**[Full Client API Documentation](endpoints/clients.md)**

### Billing and Payments
- `GET /api/billing/invoices` - List invoices
- `POST /api/billing/invoices` - Create invoice
- `POST /api/payments/process` - Process payment
- `GET /api/payments/status/:id` - Payment status

**[Full Billing API Documentation](endpoints/billing.md)**

## Integration Guides

### For Booking Engine Developers
1. [Authentication setup](authentication.md)
2. [Hotel data synchronization](endpoints/booking-engine.md)
3. [Availability checking](integration-guides/booking-engine-integration.md)
4. [Reservation creation](integration-guides/booking-engine-integration.md)

### For OTA Integrations
1. [XML API endpoints](integration-guides/ota-integration.md)
2. [Rate and inventory updates](integration-guides/ota-integration.md)
3. [Reservation synchronization](integration-guides/ota-integration.md)

### For Payment Systems
1. [Payment gateway setup](integration-guides/payment-integration.md)
2. [Transaction processing](integration-guides/payment-integration.md)
3. [Webhook handling](integration-guides/payment-integration.md)

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

## Testing and Development

### API Testing Tools
- **Postman Collection**: Available for all endpoints
- **OpenAPI Specification**: Swagger documentation
- **Test Environment**: Sandbox API for development

### Development Resources
- [API Testing Guide](../development/api-testing.md)
- [Integration Examples](integration-guides/)
- [Error Code Reference](../reference/error-codes.md)

## Versioning and Updates

- **Current Version**: v1
- **Versioning Strategy**: URL-based versioning (`/api/v1/`)
- **Backward Compatibility**: Maintained for major versions
- **Update Notifications**: API changelog and notifications

## Support and Resources

- **Integration Support**: See [integration guides](integration-guides/)
- **Error Troubleshooting**: Check [error codes reference](../reference/error-codes.md)
- **Performance Optimization**: Review [API best practices](../development/api-best-practices.md)

---

*For implementation examples and detailed integration guides, explore the specific endpoint documentation and integration guides.*