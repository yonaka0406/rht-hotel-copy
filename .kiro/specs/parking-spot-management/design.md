# Design Document

## 1. Overview

This document provides the technical design for the Parking Spot Management module. It details the proposed database schema changes, API design, and frontend components required to implement the feature. The design aims to create a robust and scalable solution for managing parking inventory that integrates seamlessly with the existing reservation system.

## 2. Database Design

New tables will be added to the PostgreSQL database to manage parking infrastructure and assignments.

### 2.1. `parking_lots` Table

Stores information about the different parking areas a hotel might have.

-   **`id`**: `SERIAL PRIMARY KEY`
-   **`hotel_id`**: `INTEGER` (Foreign Key to `hotels.id`)
-   **`name`**: `VARCHAR(255)` (e.g., "Main Lot", "Underground Garage")
-   **`description`**: `TEXT` (Optional details)
-   **`created_at`**, **`updated_at`**: `TIMESTAMPTZ`

### 2.2. `parking_spots` Table

Stores information about each individual parking spot.

-   **`id`**: `SERIAL PRIMARY KEY`
-   **`parking_lot_id`**: `INTEGER` (Foreign Key to `parking_lots.id`)
-   **`spot_number`**: `VARCHAR(50)` (e.g., "A-01", "12")
-   **`spot_type`**: `VARCHAR(50)` (Enum-like: 'standard', 'large', 'compact', 'ev', 'accessible', 'in-line')
-   **`capacity_units`**: `INTEGER` (Defines how many 'standard' units the spot consumes. A large spot might be 2, an in-line spot might be 1 but have special rules).
-   **`is_active`**: `BOOLEAN` (To easily enable/disable a spot without deleting it)
-   **`created_at`**, **`updated_at`**: `TIMESTAMPTZ`

### 2.3. `reservation_parking` Table

This table links reservations to parking spots, acting similarly to `reservation_details` for rooms. It will track which spot is assigned to which reservation on which day. This table will also be used to block spots by creating a "block" reservation.

-   **`id`**: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
-   **`hotel_id`**: `INTEGER` (Foreign Key to `hotels.id`)
-   **`reservation_id`**: `UUID` (Foreign Key to `reservations.id`, can be a real reservation or a "block" reservation)
-   **`parking_spot_id`**: `INTEGER` (Foreign Key to `parking_spots.id`)
-   **`date`**: `DATE`
-   **`status`**: `VARCHAR(50)` (e.g., 'reserved', 'blocked', 'maintenance')
-   **`comment`**: `TEXT` (Optional, for block reason)
-   **`price`**: `NUMERIC(10, 2)` (Price for the spot for that day, if applicable)
-   **`created_by`**, **`updated_by`**: `INTEGER`, `TIMESTAMPTZ`

## 3. API Design

### 3.1. New Parking Controller (`parkingController.js`)

A new controller will be created to manage parking-related CRUD operations.

-   **`GET /api/parking/lots/:hotel_id`**: Get all parking lots for a hotel.
-   **`POST /api/parking/lots`**: Create a new parking lot.
-   **`PUT /api/parking/lots/:id`**: Update a parking lot.
-   **`DELETE /api/parking/lots/:id`**: Delete a parking lot.

-   **`GET /api/parking/spots/:lot_id`**: Get all parking spots for a lot.
-   **`POST /api/parking/spots`**: Create a new parking spot.
-   **`PUT /api/parking/spots/:id`**: Update a parking spot.
-   **`DELETE /api/parking/spots/:id`**: Delete a parking spot.

-   **`POST /api/parking/block`**: Create a "block" reservation for a parking spot for a date range. This will create a reservation with a special status (e.g., 'block') and then create entries in `reservation_parking` for the specified spot and dates, with the appropriate `status` and `comment`.

### 3.2. Modifications to `reservationsController.js` and `reservations.js`

This is the most critical part of the integration.

#### 3.2.1. `reservations.js` (Model)

-   A new function `selectAvailableParkingSpots(requestId, hotelId, checkIn, checkOut)` will be created.
    -   This function will query the `parking_spots` table.
    -   It will join against `reservation_parking` to exclude spots that are already assigned for the given date range.
    -   It will return a list of available `parking_spot_id`s.

-   The `addReservationHold` and `createHoldReservationCombo` functions will be modified.
    -   They will accept a new parameter, e.g., `parking_spots_required` (integer).
    -   Inside the transaction, after checking for room availability, they will call `selectAvailableParkingSpots`.
    -   If the number of available spots is less than `parking_spots_required`, the transaction will be rolled back and an error will be thrown.
    -   If spots are available, the function will loop through the required number of spots and insert records into the `reservation_parking` table for each day of the stay, with the status 'reserved'.

-   The logic for cancelling a reservation (`deleteHoldReservationById`, `updateReservationStatus` to 'cancelled') will be modified to also delete the corresponding entries from `reservation_parking`.

#### 3.2.2. `reservationsController.js` (Controller)

-   The `createReservationHold` and `createHoldReservationCombo` endpoints will be updated to accept the new `parking_spots_required` parameter in the request body.
-   The response from these endpoints will be updated to include information about the assigned parking spots.

## 4. Frontend Design

### 4.1. New Parking Management Page (Admin)

A new section will be added to the admin panel for managing parking.

-   **View:** A hierarchical view showing parking lots and the spots within them.
-   **Forms:** Modals or forms for creating/editing lots and spots.
-   **Calendar/Timeline View:** A visual tool to block spots for certain date ranges. This will call the new `/api/parking/block` endpoint, providing a reason for the block in the `comment` field.

### 4.2. Reservation Creation/Editing UI

-   The reservation creation dialog (`WaitlistDialog.vue` seems to be used for this, the name is a bit misleading, or a new component is needed) will be modified.
-   A new input field (e.g., a number input or a checkbox) will be added for "Parking Spots Required".
-   When a reservation is viewed, if it has assigned parking, the spot number(s) will be displayed.
-   The UI will need to handle errors gracefully if parking is requested but not available.

## 5. Key Design Decisions

1.  **Decoupled Design:** The parking system is designed as a separate module with its own tables and controller. It hooks into the reservation process but is not deeply entangled, making it easier to maintain.
2.  **Inventory Model:** Using a `reservation_parking` table that mirrors the `reservation_details` table is a proven pattern within this application for managing daily inventory. This is a robust way to handle assignments.
3.  **Capacity Units:** The `capacity_units` field on the `parking_spots` table provides a flexible way to handle different vehicle sizes without adding excessive complexity. A standard car requires 1 unit, while a large truck might require 2. The reservation system will then just need to check for the total available units.
4.  **Transactional Integrity:** All modifications to parking assignments will be done within the same database transaction as the reservation modifications, ensuring that a reservation cannot be created without also successfully securing the requested parking (if available).
5.  **Blocking Strategy:** Instead of a separate unavailability table, we will reuse the existing reservation system's "blocking" concept. A special type of reservation will be created to block spots, which simplifies the design and reuses existing patterns. The `status` and `comment` fields in the `reservation_parking` table will be used to distinguish between a regular reservation and a block, and to store the reason for the block.
