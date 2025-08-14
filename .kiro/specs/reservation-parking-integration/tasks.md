# Implementation Plan

- [ ] 1. Set up database schema enhancements and core data models
  - Add reservation_addon_id column to reservation_parking table (vehicle_category_id already exists)
  - Create database migration script for adding the addon relationship
  - Update parking.js model to include new addon relationship and capacity validation methods  
  - _Requirements: 2.4, 7.1, 7.2_

- [ ] 2. Implement vehicle category and capacity management system
  - Create vehicle category API endpoints for fetching categories with capacity requirements
  - Implement capacity unit calculation logic in parking service
  - Add vehicle category compatibility checking methods

  - _Requirements: 4.4, 2.1_

- [ ] 3. Create enhanced parking availability checking system
  - Implement checkParkingVacancies method with vehicle category filtering
  - Create getCompatibleSpots method for capacity-based spot filtering
  - Add real-time availability checking with capacity unit consideration
  - Implement getAvailableSpotsForDates with capacity validation

  - _Requirements: 4.1, 4.3, 2.2, 2.3_

- [ ] 4. Develop ParkingAddonService for addon-parking integration
  - Create ParkingAddonService class with CRUD operations for parking addon assignments
  - Implement addParkingAddonWithSpot method with capacity validation
  - Implement updateParkingAddonSpot method with availability checking
  - Implement removeParkingAddonWithSpot method with cleanup logic
  - Add validateSpotCapacity method for vehicle category compatibility

  - _Requirements: 7.1, 7.3, 3.4, 2.4_

- [ ] 5. Create enhanced parking API endpoints
  - Implement GET /api/parking/vacancies/:hotelId/:startDate/:endDate/:vehicleCategoryId endpoint
  - Implement GET /api/parking/compatible-spots/:hotelId/:vehicleCategoryId endpoint
  - Implement POST /api/parking/addon-assignment endpoint with capacity validation
  - Implement PUT /api/parking/addon-assignment/:id endpoint for spot updates
  - Implement DELETE /api/parking/addon-assignment/:id endpoint with cleanup

  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3_

- [ ] 6. Enhance useParkingStore composable with addon integration
  - Add fetchVehicleCategories method to parking store
  - Implement checkParkingVacancies method with vehicle category support
  - Add getCompatibleSpots method for filtered spot retrieval
  - Implement addParkingAddonWithSpot method with validation
  - Add updateParkingAddonSpot and removeParkingAddonWithSpot methods

  - _Requirements: 4.1, 4.4, 3.1, 3.2, 3.3_

- [ ] 7. Create ParkingAddonManager composable
  - Implement ParkingAddonManager composable for coordinating addon and parking operations
  - Add data validation and consistency checking methods
  - Integrate with existing WebSocket system for real-time sync of parking changes
  - Add error handling and conflict resolution logic
  - Write unit tests for ParkingAddonManager functionality
  - _Requirements: 5.1, 5.3, 7.4_

- [ ] 8. Develop ParkingSpotSelector component
  - Create reusable ParkingSpotSelector.vue component with vehicle category support
  - Implement vehicle category dropdown with capacity unit display
  - Add filtered parking spot display based on capacity requirements
  - Implement real-time availability checking with capacity consideration
  - Add spot selection validation and error messaging  
  - _Requirements: 4.4, 2.1, 2.2, 2.3, 4.1_

- [ ] 9. Create ParkingAddonDialog component
  - Implement ParkingAddonDialog.vue for adding/editing parking addons with spot assignment
  - Add vehicle category selection with dynamic capacity calculation
  - Integrate ParkingSpotSelector component for spot selection
  - Implement form validation and error handling
  - Add pricing display and calculation logic  
  - _Requirements: 6.1, 6.2, 6.3, 2.1, 3.1_

- [ ] 10. Develop ParkingSection component for ReservationEdit
  - Create ParkingSection.vue component for main reservation edit interface
  - Implement display of existing parking assignments with spot information
  - Add "Add Parking" functionality with vehicle category and spot selection
  - Implement edit and remove functionality for existing parking assignments
  - Add real-time availability updates via WebSocket  
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 5.1, 5.2_

- [ ] 11. Integrate parking functionality into ReservationEdit.vue
  - Add ParkingSection component to ReservationEdit.vue interface
  - Implement parking addon detection by global addon ID 3
  - Add parking information display alongside rooms and payments
  - Integrate parking data loading and state management
  - Add error handling and user feedback for parking operations  
  - _Requirements: 1.1, 1.2, 2.5, 7.2_

- [ ] 12. Extend parking functionality to ReservationDayDetail component
  - Add parking addon management to ReservationDayDetail component
  - Implement day-specific parking spot assignment functionality
  - Add parking availability checking for single-day assignments
  - Integrate with existing addon editing workflow  
  - _Requirements: 8.1, 9.3_

- [ ] 13. Integrate parking into bulk editing dialogs
  - Add parking addon functionality to 全部部屋一括編集 (bulk edit all rooms) dialog
  - Implement parking addon functionality in 〇号室一括編集 (individual room bulk edit) dialog
  - Add date range filtering for parking spot availability in bulk operations
  - Implement bulk parking assignment with proper date associations  
  - _Requirements: 9.1, 9.2, 9.4, 9.5, 8.4_

- [ ] 14. Integrate with existing WebSocket system for parking updates
  - Extend existing WebSocket broadcasting to include parking assignment changes
  - Implement real-time parking availability updates across all components using existing WebSocket infrastructure
  - Add conflict detection and resolution for concurrent parking modifications
  - Implement optimistic locking for parking spot assignments
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 15. Add comprehensive error handling and validation
  - Implement client-side validation for parking addon assignments
  - Add server-side validation for capacity compatibility and availability
  - Create user-friendly error messages for all parking operation failures
  - Implement data consistency validation between addons and parking tables
  - Add recovery mechanisms for failed parking operations  
  - _Requirements: 2.3, 3.2, 5.3, 7.3_

- [ ] 16. Integrate pricing and billing functionality
  - Add parking pricing display in all parking selection interfaces
  - Implement automatic cost calculation updates when parking assignments change
  - Add category-specific pricing support for different vehicle types
  - Integrate parking costs with total reservation billing  
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 17. Create comprehensive test suite
  - Write end-to-end tests for complete parking addon workflow
  - Add integration tests for addon-parking synchronization
  - Implement multi-user concurrent access testing
  - Create performance tests for parking availability checking    
  - _Requirements: 7.4, 5.3, 3.4_

- [ ] 18. Update reservation summary and reporting components
  - Add parking information display to ReservationPanel component
  - Integrate parking assignments into ReservationRoomsView component
  - Add parking data to reservation history tracking
  - Implement parking utilization reporting capabilities  
  - _Requirements: 8.2, 8.3, 8.5, 7.4_