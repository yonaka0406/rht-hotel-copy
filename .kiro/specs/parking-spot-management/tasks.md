# Implementation Plan

This plan breaks down the development of the Parking Spot Management module into a series of actionable tasks.

## Phase 1: Database and Backend Core

-   [ ] **1. Create Database Migrations:**
    -   [ ] Create a new SQL migration file (e.g., `014_parking_management.sql`).
    -   [ ] Add `CREATE TABLE` statements for `vehicle_categories`, `parking_lots`, `parking_spots`, and `reservation_parking`.
    -   [ ] Ensure the `parking_spots` table includes `grid_x` and `grid_y` coordinate fields, the `blocks_parking_spot_id` foreign key, and `capacity_units`.
    -   [ ] Ensure the `reservation_parking` table includes a foreign key to `vehicle_categories`.
    -   [ ] Ensure all foreign keys, indexes, and constraints are correctly defined.

-   [ ] **2. Implement Parking Management API:**
    -   [ ] Create a new `api/controllers/parkingController.js` file.
    -   [ ] Create a new `api/models/parking.js` file with functions for CRUD operations on the new tables.
    -   [ ] Create a new `api/routes/parkingRoutes.js` file and define endpoints for managing vehicle categories, lots, and spots.
    -   [ ] Add a new endpoint `/api/parking/block` to create "block" reservations for parking spots.
    -   [ ] Add the new parking routes to the main API entry point (`api/index.js`).

-   [ ] **3. Implement Core Backend Logic:**
    -   [ ] In `api/models/reservations.js`, update the `selectAvailableParkingSpots` function to find spots with sufficient `capacity_units`.
    -   [ ] In `api/models/reservations.js`, modify `addReservationHold` to accept a `vehicle_category_id`, look up the required capacity, and assign a suitable spot.
    -   [ ] In `api/models/reservations.js`, update the reservation cancellation logic to release assigned parking spots.
    -   [ ] In `api/controllers/reservationsController.js`, update the reservation creation endpoints to handle the `vehicle_category_id` parameter.

## Phase 2: Frontend Implementation

-   [ ] **4. Create Parking Management Admin UI:**
    -   [ ] Create a new Vue page component (e.g., `src/pages/Admin/ManageParking.vue`).
    -   [ ] Add a new section to the admin UI for managing `Vehicle Categories`.
    -   [ ] **Implement Drag-and-Drop Layout Editor:** Create a component that allows users to drag spot types onto a grid to create and position them. Dragging existing spots should update their coordinates.
    -   [ ] **Implement Parking Calendar View:** Create a timeline view for parking spots.
    -   [ ] Create a UI for blocking spots for certain date ranges.
    -   [ ] Create a new composable store (`src/composables/useParkingStore.js`).

-   [ ] **5. Integrate Parking with Reservation UI:**
    -   [ ] Modify the reservation creation/editing component to include a dropdown to select a `Vehicle Category`.
    -   [ ] Update the `useReservationStore.js` composable to pass the `vehicle_category_id` to the API.
    -   [ ] Display assigned parking spot information in the reservation details view.
    -   [ ] Implement user feedback for cases where parking is requested but not available.

## Phase 3: Testing and Refinement

-   [ ] **6. Write Backend Tests:**
    -   [ ] Write unit tests for the new functions in `api/models/parking.js`.
    -   [ ] Write integration tests for the new API endpoints.
    -   [ ] Write tests to ensure the reservation logic correctly uses vehicle categories to assign spots.

-   [ ] **7. Write Frontend Tests:**
    -   [ ] Write component tests for the new drag-and-drop layout editor.
    -   [ ] Write component tests for the new parking and vehicle category management UI, including the layout and calendar views.
    -   [ ] Write tests for the modified reservation creation form.

-   [ ] **8. Documentation and Final Review:**
    -   [ ] Update the main `README.md` and any relevant documentation to reflect the new feature.
    -   [ ] Perform a final code review and user acceptance testing (UAT).
