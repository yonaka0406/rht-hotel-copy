# Booking Engine API Endpoints

This document describes the API endpoints provided by the rht-hotel Property Management System (PMS) for integration with the booking engine. These endpoints enable the booking engine to fetch hotel and room type data for caching purposes.

## Authentication

All API endpoints require authentication using an API key passed in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

The API key should be set in the `BOOKING_ENGINE_API_KEY` environment variable on the PMS server.

## Request

All requests to the Booking Engine API should be made over HTTPS. Request bodies, where applicable, should be JSON formatted with the `Content-Type: application/json` header.

## Base URL

```
https://test.wehub.work/api/booking-engine
```

## Hotel and Infrastructure Endpoints

### Get All Hotels

**Endpoint:** `GET /hotels`

**Description:** Retrieves a list of all active hotels for the booking engine. This replaces the previous cache update endpoint.

**Response:**
```json
{
  "hotels": [
    {
      "hotel_id": 1,
      "name": "Sample Hotel",
      "formal_name": "Sample Hotel & Resort",
      "facility_type": "hotel",
      "open_date": "2024-01-01",
      "total_rooms": 100,
      "postal_code": "12345",
      "address": "123 Main St",
      "email": "info@samplehotel.com",
      "phone_number": "+1-555-123-4567",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Individual Hotel Details

**Endpoint:** `GET /hotels/{hotel_id}`

**Description:** Retrieves detailed information for a specific hotel.

**Parameters:**
- `hotel_id` (path): The numeric ID of the hotel

**Response:**
```json
{
  "hotel_id": 1,
  "name": "Sample Hotel",
  "formal_name": "Sample Hotel & Resort",
  "facility_type": "hotel",
  "open_date": "2024-01-01",
  "total_rooms": 100,
  "postal_code": "12345",
  "address": "123 Main St",
  "email": "info@samplehotel.com",
  "phone_number": "+1-555-123-4567",
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### Get Room Types

**Endpoint:** `GET /room-types/{hotel_id}`

**Description:** Retrieves all room types available for a specific hotel.

**Parameters:**
- `hotel_id` (path): The numeric ID of the hotel

**Response:**
```json
{
  "hotel_id": 1,
  "room_types": [
    {
      "id": 1,
      "name": "Standard Room",
      "description": "Comfortable standard room",
      "hotel_id": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Get Available Plans

**Endpoint:** `GET /plans/{hotel_id}`

**Description:** Retrieves all available plans (packages) for a specific hotel using the `get_available_plans_for_hotel` logic.

**Parameters:**
- `hotel_id` (path): The numeric ID of the hotel

**Response:**
```json
{
  "hotel_id": 1,
  "plans": [
    {
      "global_plan_id": 1,
      "hotel_plan_id": 5,
      "plan_key": "1h5",
      "name": "Standard Plan",
      "description": "Standard accommodation plan",
      "plan_type": "accommodation/package",
      "color": "#FF5733"
    }
  ]
}
```

## Experimental / Future Endpoints
> Note: The following endpoints are referenced in architectural documents but may not be fully implemented in the current `bookingEngineRoutes.js`.

### Update Room Type Cache
**Endpoint:** `POST /cache/update-room-types`
Description: Legacy/Alternative endpoint for global room type sync. Currently handled via `GET /room-types/{hotel_id}`.

### Get Cache Status
**Endpoint:** `GET /cache/status`
Response:
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

## Error Responses

All endpoints may return the following error responses:

### 401 Unauthorized
```json
{
  "error": "Authorization header required"
}
```

### 404 Not Found
```json
{
  "error": "Hotel not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error"
}
```

## Usage Examples

### cURL Examples

#### Get All Hotels
```bash
curl -X GET https://test.wehub.work/api/booking-engine/hotels \
  -H "Authorization: Bearer YOUR_API_KEY"
```

#### Get Hotel Plans
```bash
curl -X GET https://test.wehub.work/api/booking-engine/plans/1 \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## Related Documentation

- **[Booking Engine Integration](../../integrations/booking-engine/overview.md)** - Integration strategy and architecture
- **[API Overview](../README.md)** - General API documentation

---

*For questions or issues with the API integration, please refer to the integration documentation or contact the development team.*
