# Parking Capacity Management API

## Overview
The Parking Capacity Management API provides real-time parking availability checking, capacity blocking, and parking reservations with block awareness.

## Base URL
All endpoints are relative to: `/api/parking`

## Authentication
All endpoints require JWT authentication via Bearer token in the Authorization header.

## Endpoints

### 1. Check Real-Time Availability
Get real-time parking availability for specific dates, accounting for reservations and blocks.

**Endpoint:** `POST /parking/real-time-availability/:hotelId/:vehicleCategoryId`

**Parameters:**
- `hotelId` (path, required): Hotel ID
- `vehicleCategoryId` (path, required): Vehicle category ID

**Request Body:**
```json
{
  "dates": ["2025-11-17", "2025-11-18"],
  "excludeReservationId": "uuid-optional"
}
```

**Response:**
```json
{
  "hotelId": 23,
  "vehicleCategoryId": 1,
  "vehicleCategoryName": "普通乗用車",
  "dateAvailability": {
    "2025-11-17": {
      "date": "2025-11-17",
      "availableSpots": 10,
      "totalCompatibleSpots": 14,
      "occupiedSpots": 4,
      "blockedSpots": 0,
      "availabilityRate": "71.4",
      "availableSpotIds": [247, 248, 252],
      "blocks": []
    }
  },
  "fullyAvailableSpots": []
}
```

### 2. Block Parking Capacity
Block parking capacity for a date range.

**Endpoint:** `POST /parking/capacity/block`

**Request Body:**
```json
{
  "hotel_id": 23,
  "vehicle_category_id": 1,
  "start_date": "2025-11-17",
  "end_date": "2025-11-20",
  "blocked_capacity": 5,
  "reason": "Maintenance",
  "comment": "Parking lot resurfacing"
}
```

**Response:**
```json
{
  "blockId": "uuid",
  "success": true,
  "message": "Capacity blocked successfully"
}
```

### 3. Get Blocked Capacity
Retrieve blocked capacity records for a date range.

**Endpoint:** `GET /parking/capacity/blocks`

**Query Parameters:**
- `hotelId` (required): Hotel ID
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "blockId": "uuid",
    "hotel_id": 23,
    "vehicle_category_id": 1,
    "start_date": "2025-11-17",
    "end_date": "2025-11-20",
    "blocked_capacity": 5,
    "reason": "Maintenance",
    "comment": "Parking lot resurfacing"
  }
]
```

### 4. Remove Capacity Block
Remove a capacity block.

**Endpoint:** `DELETE /parking/capacity/blocks/:blockId`

**Parameters:**
- `blockId` (path, required): Block ID to remove

**Response:**
```json
{
  "success": true,
  "message": "Block removed successfully"
}
```

### 5. Save Parking Assignments
Create parking assignments for a reservation.

**Endpoint:** `POST /parking/reservations`

**Request Body:**
```json
{
  "assignments": [
    {
      "hotel_id": 23,
      "reservation_id": "uuid",
      "vehicle_category_id": 1,
      "roomId": "uuid-or-null",
      "check_in": "2025-11-17",
      "check_out": "2025-11-18",
      "numberOfSpots": 6,
      "unit_price": "0",
      "status": "reserved"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Parking assignments saved successfully"
}
```

## Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 400 | Invalid parameters | Missing or invalid request parameters |
| 404 | Vehicle category not found | Specified vehicle category doesn't exist |
| 409 | Insufficient capacity | Not enough parking spots available |
| 500 | Internal server error | Server-side error occurred |

## Key Features

### Timezone Handling
All dates use `formatDate` utility to ensure consistent YYYY-MM-DD format without timezone issues.

### Block Awareness
- Real-time availability automatically accounts for blocked capacity
- Net available = Total spots - Reserved spots - Blocked spots
- Blocks are checked per parking lot and vehicle category

### Reservation Linking
- Parking assignments can be linked to specific reservation_details via `roomId`
- If `roomId` is null, parking is linked to any reservation_details for that reservation
- Multiple spots can be assigned in a single request

## Usage Examples

### Creating a Reservation with Parking
```javascript
// 1. Check availability
const availability = await fetch('/api/parking/real-time-availability/23/1', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    dates: ['2025-11-17', '2025-11-18']
  })
});

// 2. Create room reservation (separate API)

// 3. Save parking assignments
const parking = await fetch('/api/parking/reservations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    assignments: [{
      hotel_id: 23,
      reservation_id: reservationId,
      vehicle_category_id: 1,
      check_in: '2025-11-17',
      check_out: '2025-11-18',
      numberOfSpots: 2,
      unit_price: '0',
      status: 'reserved'
    }]
  })
});
```

### Blocking Capacity
```javascript
// Create block
const block = await fetch('/api/parking/capacity/block', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    hotel_id: 23,
    vehicle_category_id: 1,
    start_date: '2025-11-17',
    end_date: '2025-11-20',
    blocked_capacity: 5,
    reason: 'Maintenance'
  })
});

// Verify in availability check (blocked spots will reduce net available)

// Remove block when no longer needed
await fetch(`/api/parking/capacity/blocks/${blockId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```
