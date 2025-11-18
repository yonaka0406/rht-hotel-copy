# Booking Engine API Documentation - rht-hotel PMS

**NOTE: This document describes API endpoints for the TEST environment only and is part of an archived pre-migration phase. Production and staging environments may have different base URLs and authentication configurations.**

## Overview

This document describes the API endpoints provided by the rht-hotel Property Management System (PMS) for integration with the booking engine. These endpoints enable the booking engine to fetch hotel and room type data for caching purposes.

## Authentication

All API endpoints require authentication using an API key passed in the Authorization header:

```
Authorization: Bearer YOUR_API_KEY
```

The API key should be set in the `BOOKING_ENGINE_API_KEY` environment variable on the PMS server.

## Base URL

```
https://test.wehub.work/api/booking-engine
```

## Endpoints

### 1. Get Individual Hotel

**Endpoint:** `GET /hotels/{hotel_id}`

**Description:** Retrieves information for a specific hotel.

**Parameters:**
**Response (200 OK):**
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

### 2. Get Individual Hotel Room Types

**Endpoint:** `GET /room-types/{hotel_id}`

**Parameters:**
- `hotel_id` (path): The ID of the hotel

**Response (200 OK):**
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

### 3. Get Individual Hotel Plans

**Endpoint:** `GET /plans/{hotel_id}`

**Description:** Retrieves all available plans for a specific hotel.

**Parameters:**
- `hotel_id` (path): The ID of the hotel

**Response (200 OK):**
```json
{
  "hotel_id": 1,
  "plans": [
    {
      "global_plan_id": 1,
      "hotel_plan_id": null,
      "plan_key": "1h",
      "name": "Standard Plan",
      "description": "Standard accommodation plan",
      "plan_type": "per_room",
      "color": "#FF5733"
    },
    {
      "global_plan_id": 2,
      "hotel_plan_id": 5,
      "plan_key": "2h5",
      "name": "Premium Plan",
      "description": "Premium accommodation with amenities",
      "plan_type": "per_room",
      "color": "#33FF57"
    }
  ]
}
```

### 4. Update Hotel Cache

**Endpoint:** `POST /cache/update-hotels`

**Request Body:** Empty (no body required)

**Response (200 OK):**
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
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 5. Update Room Type Cache

**Endpoint:** `POST /cache/update-room-types`

**Description:** Retrieves all active room types for cache update. This endpoint returns comprehensive room type data that the booking engine can use to update its local cache.

**Request Body:** Empty (no body required)

**Response (200 OK):**
```json
{
  "room_types": [
    {
      "id": 1,
      "name": "Standard Room",
      "description": "Comfortable standard room",
      "hotel_id": 1,
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "count": 1,
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 6. Get Cache Status

**Endpoint:** `GET /cache/status`

**Description:** Returns the current status of various cache types and their TTL settings.

**Response (200 OK):**
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

### 401 Unauthorized (Invalid API Key)
```json
{
  "error": "Invalid API key"
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

## Cache Update Strategy

The booking engine uses a hybrid caching strategy:

### Hotel & Room Type Cache (Manual Updates Only)
- **Manual Control**: Updates only triggered by administrators or PMS system
- **No Automatic Sync**: No background synchronization for hotel/room type data
- **PMS Ownership**: PMS maintains full control over hotel and room type data
- **Smart Cleanup**: Only removes cache entries not linked to active hotels/room types
- **Admin Control**: All hotel/room type cache updates must be triggered manually

### Availability Cache (Automatic + Manual)
- **TTL-based**: 15-minute Time-To-Live for availability data
- **Automatic Refresh**: Background service refreshes expired availability entries
- **Manual Override**: Admin can manually trigger availability cache refresh
- **Real-time Updates**: Immediate availability updates for critical operations
- **Smart Cleanup**: Removes availability data older than 1 month

## Usage Examples

### cURL Examples

#### Update Hotel Cache
```bash
curl -X POST https://test.wehub.work/api/booking-engine/cache/update-hotels \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### Update Room Type Cache
```bash
curl -X POST https://test.wehub.work/api/booking-engine/cache/update-room-types \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### Get Hotel Plans
```bash
curl -X GET https://test.wehub.work/api/booking-engine/plans/1 \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

#### Get Cache Status
```bash
curl -X GET https://test.wehub.work/api/booking-engine/cache/status \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

const PMS_API_URL = 'https://test.wehub.work/api/booking-engine';
const API_KEY = 'your_api_key_here';

async function updateHotelCache() {
  try {
    const response = await axios.post(`${PMS_API_URL}/cache/update-hotels`, {}, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Hotels updated:', response.data.count);
    return response.data.hotels;
  } catch (error) {
    console.error('Error updating hotel cache:', error.response?.data || error.message);
    throw error;
  }
}

async function updateRoomTypeCache() {
  try {
    const response = await axios.post(`${PMS_API_URL}/cache/update-room-types`, {}, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Room types updated:', response.data.count);
    return response.data.room_types;
  } catch (error) {
    console.error('Error updating room type cache:', error.response?.data || error.message);
    throw error;
  }
}
```

## Testing

A test script is provided to verify the API endpoints:

```bash
# Set the API key environment variable
export BOOKING_ENGINE_API_KEY="your_api_key_here"

# Run the test script
node test-booking-engine-cache-api.js
```

The test script will:
- Test authentication with and without API keys
- Test hotel cache update endpoint
- Test room type cache update endpoint
- Test cache status endpoint
- Test individual hotel and room type endpoints
- Validate response structures and data integrity

## Security Considerations

1. **API Key Security**: Keep the API key secure and rotate it regularly
2. **HTTPS Only**: All API communication should use HTTPS
3. **Rate Limiting**: To ensure fair usage and system stability, API requests are subject to rate limits.
   - **Limit**: 100 requests per minute per API key.
   - **Response Headers**:
     - `X-RateLimit-Limit`: The maximum number of requests allowed in the current window.
     - `X-RateLimit-Remaining`: The number of requests remaining in the current window.
     - `X-RateLimit-Reset`: The time (in UTC epoch seconds) at which the current rate limit window resets.
   - **Exceeded Limit**: If the rate limit is exceeded, the API will return a `429 Too Many Requests` HTTP status code.
   - **Retry Behavior**: Clients should implement an exponential backoff strategy and respect the `Retry-After` header (if present) which indicates how long to wait before making a new request.
   - **Example 429 Response**:
     ```
     HTTP/1.1 429 Too Many Requests
     Content-Type: application/json
     X-RateLimit-Limit: 100
     X-RateLimit-Remaining: 0
     X-RateLimit-Reset: 1678886400
     Retry-After: 60

     {
       "error": "Too Many Requests",
       "message": "Rate limit exceeded. Please try again after 60 seconds."
     }
     ```
4. **IP Whitelisting**: Consider restricting API access to specific IP addresses
5. **Audit Logging**: All API interactions are logged for security and debugging

## Integration Notes

1. **Data Format**: All responses use consistent JSON formatting
2. **Timestamps**: All timestamps are in ISO 8601 format with timezone information
3. **Error Handling**: Implement proper error handling for all API calls
4. **Retry Logic**: Consider implementing retry logic for failed requests
5. **Cache Management**: The booking engine handles cache management based on the data received

## Support

For questions or issues with the API integration, please refer to the integration documentation or contact the development team. 