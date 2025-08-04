# Design Document

## 1. Overview

This document provides the technical design for the Parking Spot Management module. It details the proposed database schema changes, API design, and frontend components required to implement the feature. The design aims to create a robust and scalable solution for managing parking inventory that integrates seamlessly with the existing reservation system.

## 2. Database Design

New tables will be added to the PostgreSQL database to manage parking infrastructure and assignments.

### 2.1. `vehicle_categories` Table

Stores user-defined categories of vehicles to standardize parking requirements.

-   **`id`**: `SERIAL PRIMARY KEY`
-   **`hotel_id`**: `INTEGER` (Foreign Key to `hotels.id`)
-   **`name`**: `VARCHAR(255)` (e.g., "Kei Car", "Normal Car", "1t Truck")
-   **`capacity_units_required`**: `INTEGER` (The number of standard parking units this vehicle type requires, e.g., Normal Car = 1, 1t Truck = 2).
-   **`created_at`**, **`updated_at`**: `TIMESTAMPTZ`

### 2.2. `parking_lots` Table

Stores information about the different parking areas a hotel might have.

-   **`id`**: `SERIAL PRIMARY KEY`
-   **`hotel_id`**: `INTEGER` (Foreign Key to `hotels.id`)
-   **`name`**: `VARCHAR(255)` (e.g., "Main Lot", "Underground Garage")
-   **`description`**: `TEXT` (Optional details)
-   **`created_at`**, **`updated_at`**: `TIMESTAMPTZ`

### 2.3. `parking_spots` Table

Stores information about each individual parking spot.

-   **`id`**: `SERIAL PRIMARY KEY`
-   **`parking_lot_id`**: `INTEGER` (Foreign Key to `parking_lots.id`)
-   **`spot_number`**: `VARCHAR(50)` (e.g., "A-01", "12")
-   **`spot_type`**: `VARCHAR(50)` (Enum-like: 'standard', 'large', 'compact', 'ev', 'accessible')
-   **`capacity_units`**: `INTEGER` (The number of standard units this spot can provide. A large spot might have a capacity of 2 or 3).
-   **`blocks_parking_spot_id`**: `INTEGER` (Nullable Foreign Key to `parking_spots.id`). This explicitly links an "inner" spot to the "outer" spot that blocks it. An outer spot will have this as `NULL`.
-   **`grid_x`**: `INTEGER` (The column position of the spot in a visual grid layout).
-   **`grid_y`**: `INTEGER` (The row position of the spot in a visual grid layout).
-   **`is_active`**: `BOOLEAN` (To easily enable/disable a spot without deleting it)
-   **`created_at`**, **`updated_at`**: `TIMESTAMPTZ`

### 2.4. `reservation_parking` Table

This table links reservations to parking spots, acting similarly to `reservation_details` for rooms.

-   **`id`**: `UUID PRIMARY KEY DEFAULT gen_random_uuid()`
-   **`hotel_id`**: `INTEGER` (Foreign Key to `hotels.id`)
-   **`reservation_id`**: `UUID` (Foreign Key to `reservations.id`, can be a real reservation or a "block" reservation)
-   **`vehicle_category_id`**: `INTEGER` (Nullable Foreign Key to `vehicle_categories.id`)
-   **`parking_spot_id`**: `INTEGER` (Foreign Key to `parking_spots.id`)
-   **`date`**: `DATE`
-   **`status`**: `VARCHAR(50)` (e.g., 'reserved', 'blocked', 'maintenance')
-   **`comment`**: `TEXT` (Optional, for block reason)
-   **`price`**: `NUMERIC(10, 2)` (Price for the spot for that day, if applicable)
-   **`created_by`**, **`updated_by`**: `INTEGER`, `TIMESTAMPTZ`

## 3. API Design

### 3.1. New Parking Controller (`parkingController.js`)

A new controller will be created to manage parking-related CRUD operations.

-   **`GET /api/vehicle_categories/:hotel_id`**: Get all vehicle categories for a hotel.
-   **`POST /api/vehicle_categories`**: Create a new vehicle category.
-   **`PUT /api/vehicle_categories/:id`**: Update a vehicle category.
-   **`DELETE /api/vehicle_categories/:id`**: Delete a vehicle category.

-   ... (endpoints for lots and spots remain the same) ...

-   **`POST /api/parking/block`**: Create a "block" reservation for a parking spot.

### 3.2. Modifications to `reservationsController.js` and `reservations.js`

#### 3.2.1. `reservations.js` (Model)

-   The `selectAvailableParkingSpots` function will be updated to accept `capacity_units_required` as a parameter. It will find spots where `parking_spots.capacity_units` is greater than or equal to this value.
-   The `addReservationHold` function will be modified to accept `vehicle_category_id` instead of `parking_spots_required`.
    -   It will first look up the `capacity_units_required` from the `vehicle_categories` table.
    -   It will then call `selectAvailableParkingSpots` with this value.
    -   When inserting into `reservation_parking`, it will store the `vehicle_category_id`.

#### 3.2.2. `reservationsController.js` (Controller)

-   The reservation creation endpoints will be updated to accept `vehicle_category_id`.

## 4. Frontend Design

### 4.1. New Parking Management Page (Admin)

-   A new UI section for managing `Vehicle Categories` will be added.
-   **Drag-and-Drop Parking Lot Editor:** A new component will be created to allow managers to visually configure the parking lot.
    -   It will feature a palette of spot types that can be dragged onto a grid.
    -   Dropping a spot on the grid will create it and set its `grid_x`/`grid_y` coordinates.
    -   Existing spots can be dragged to new positions to update their coordinates.
-   **Parking Calendar View:** A new calendar/timeline view will be created, similar to the existing room reservation calendar. The rows will be parking spots and the columns will be days, showing a timeline of bookings and blocks.

### 4.2. Reservation Creation/Editing UI

-   The reservation creation dialog will be modified to include a dropdown menu to select a `Vehicle Category`.
-   The system will use the selection to determine the required parking capacity.

## 5. Key Design Decisions

-   **Vehicle Categories:** Linking parking needs to user-defined vehicle categories provides a good balance between precision and ease of use.
-   **Drag-and-Drop Layout:** A drag-and-drop interface for configuring the parking lot layout will provide a highly intuitive and efficient user experience.
-   **Visual Management:** The addition of a visual parking lot layout and a calendar view will provide a much more intuitive and efficient user experience for managing parking inventory.
-   ... (other key decisions remain the same) ...
