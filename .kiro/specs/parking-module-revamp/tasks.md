# Implementation Plan

- [x] 1. Database schema updates for capacity-based parking



  - Create migration file for parking_blocks table with partitioning by hotel_id
  - Create virtual "capacity pool" parking spots for each hotel and vehicle category combination
  - Set spot_type = 'capacity_pool' and spot_number = 'CAPACITY-POOL-{vehicle_category_id}'
  - Set high capacity_units on virtual spots to accommodate multiple simultaneous reservations
  - Create indexes on parking_blocks table for performance optimization
  - Add debug logs during migration to track virtual spot creation
  - _Requirements: 1.1, 1.4, 2.1, 6.1, 6.2_

- [x] 2. Implement Parking Capacity Service



  - [x] 2.1 Create ParkingCapacityService class with constructor


    - Create new file api/services/parkingCapacityService.js
    - Implement constructor that accepts requestId parameter
    - Add basic service structure and imports
    - _Requirements: 1.1, 1.2, 4.1_

  - [x] 2.2 Implement getAvailableCapacity method


    - Write method to calculate available capacity for date range and vehicle category
    - Query total capacity from physical parking_spots (exclude capacity_pool spots) grouped by vehicle category compatibility
    - Count reservations assigned to virtual capacity pool spots for the vehicle category
    - Subtract blocked capacity from parking_blocks records
    - Calculate available capacity as: total physical spots - capacity pool reservations - blocks
    - Return capacity availability object with breakdown by date
    - Add debug logs for total physical spots, capacity pool reservations, blocked capacity, and final available capacity per date
    - Log vehicle category compatibility calculations
    - Log which spots are being counted as physical vs virtual
    - _Requirements: 1.2, 1.4, 2.2, 5.1_

  - [x] 2.3 Implement reserveCapacity method


    - Write method to create capacity-based parking reservations
    - Validate sufficient capacity is available for all dates
    - Look up or create virtual capacity pool spot for the vehicle category
    - Create reservation_parking records pointing to the virtual capacity pool spot
    - Create corresponding reservation_addons records for billing
    - Use database transactions for atomicity
    - Add debug logs for reservation request parameters (hotel_id, dates, vehicle_category, requested capacity)
    - Log virtual capacity pool spot ID being used
    - Log capacity validation results for each date
    - Log created reservation_parking and reservation_addons record IDs
    - Log transaction commit/rollback status
    - _Requirements: 1.1, 1.3, 4.2, 5.3_

  - [x] 2.4 Implement blockCapacity method



    - Write method to block parking capacity for date ranges
    - Create records in parking_blocks table
    - Validate block parameters (dates, capacity amount, vehicle category)
    - Return warning if blocked capacity exceeds total capacity
    - _Requirements: 2.1, 2.2, 3.3_

  - [x] 2.5 Implement releaseBlockedCapacity method

    - Write method to remove capacity blocks by block ID
    - Delete records from parking_blocks table
    - Validate block exists before deletion
    - _Requirements: 2.2, 3.2_

  - [x] 2.6 Implement getCapacitySummary method

    - Write method to get comprehensive capacity overview for hotel
    - Aggregate total capacity across all parking lots
    - Calculate reserved, blocked, and available capacity
    - Group results by vehicle category
    - Include parking lot breakdown
    - _Requirements: 1.2, 5.1, 5.2_

- [-] 3. Update Parking Model functions

  - [ ] 3.1 Modify saveParkingAssignments function
    - Update function to support capacity-based reservations
    - When spotId is not provided in assignment, use capacity-based mode
    - Look up or create virtual capacity pool spot for the vehicle category
    - Assign parking_spot_id to the virtual capacity pool spot
    - Maintain backward compatibility for spot-specific assignments (when spotId is provided)
    - Update transaction handling to use capacity validation
    - Add debug logs at function entry with all assignment parameters
    - Log capacity-based vs spot-based mode detection
    - Log virtual capacity pool spot ID being used for capacity-based reservations
    - Log vehicle category capacity requirements lookup
    - Log available capacity check results for each date
    - Log batch insert operations for reservation_parking and reservation_addons
    - Log any capacity conflicts or validation failures
    - _Requirements: 1.1, 1.3, 4.2, 6.3, 6.5_

  - [x] 3.2 Modify checkParkingVacancies function


    - Update function to return capacity counts instead of spot counts
    - Count physical parking spots (exclude capacity_pool type spots)
    - Count reservations assigned to virtual capacity pool spots
    - Account for blocked capacity in calculations
    - Calculate available capacity as: physical spots - capacity pool reservations - blocks
    - Return detailed capacity breakdown
    - Add debug logs for physical spot count, virtual spot reservation count, and blocks
    - _Requirements: 1.2, 1.4, 2.2, 5.1_

  - [x] 3.3 Create blockParkingCapacity function


    - Write new function to create capacity blocking records
    - Insert records into parking_blocks table
    - Validate date ranges and capacity amounts
    - Support transaction-aware operations with optional client parameter
    - _Requirements: 2.1, 2.2, 3.3_

  - [x] 3.4 Create getBlockedCapacity function

    - Write new function to retrieve blocking records for date range
    - Query parking_blocks table with date range filters
    - Join with vehicle_categories for category details
    - Return formatted blocking records
    - _Requirements: 2.2, 3.1_

  - [x] 3.5 Create removeCapacityBlock function


    - Write new function to delete blocking records
    - Remove records from parking_blocks table by block ID
    - Validate block exists and user has permission
    - _Requirements: 3.2, 3.5_

  - [ ] 3.6 Modify getParkingReservations function
    - Update function to handle capacity-based reservations
    - Group reservations by date and vehicle category
    - Show capacity counts instead of specific spot assignments
    - Maintain backward compatibility for spot-specific reservations
    - _Requirements: 1.1, 4.1, 6.5_

- [-] 4. Create API endpoints for capacity management

  - [x] 4.1 Create GET /api/parking/capacity/available endpoint


    - Add route in parking routes file
    - Implement controller method to get available capacity
    - Validate query parameters (hotelId, startDate, endDate, vehicleCategoryId)
    - Call ParkingCapacityService.getAvailableCapacity
    - Return capacity availability response
    - _Requirements: 1.2, 5.1_

  - [x] 4.2 Create POST /api/parking/capacity/block endpoint

    - Add route in parking routes file
    - Implement controller method to block capacity
    - Validate request body parameters
    - Call ParkingCapacityService.blockCapacity
    - Return block creation response with blockId
    - _Requirements: 2.1, 3.3_

  - [x] 4.3 Create GET /api/parking/capacity/blocks endpoint

    - Add route in parking routes file
    - Implement controller method to get blocked capacity
    - Validate query parameters (hotelId, startDate, endDate)
    - Call parkingModel.getBlockedCapacity
    - Return list of blocking records
    - _Requirements: 3.1_

  - [x] 4.4 Create DELETE /api/parking/capacity/blocks/:blockId endpoint

    - Add route in parking routes file
    - Implement controller method to remove capacity block
    - Validate blockId parameter
    - Call ParkingCapacityService.releaseBlockedCapacity
    - Return success response
    - _Requirements: 3.2_

  - [x] 4.5 Create GET /api/parking/capacity/summary endpoint


    - Add route in parking routes file
    - Implement controller method to get capacity summary
    - Validate query parameters (hotelId, startDate, endDate)
    - Call ParkingCapacityService.getCapacitySummary
    - Return comprehensive capacity summary
    - _Requirements: 5.1, 5.2_

  - [ ] 4.6 Update POST /api/parking/assignments endpoint



    - Modify existing endpoint to support capacity-based assignments
    - Remove requirement for spotId in request body
    - Update validation to accept assignments without spotId
    - Call updated saveParkingAssignments function
    - Maintain backward compatibility for spot-specific assignments
    - _Requirements: 1.1, 4.2, 6.5_

  - [x] 4.7 Update GET /api/parking/vacancies endpoint


    - Modify existing endpoint to return capacity counts
    - Update response format to include capacity breakdown
    - Call updated checkParkingVacancies function
    - Maintain backward compatibility with existing response structure
    - _Requirements: 1.2, 5.1, 6.5_

- [ ] 5. Update ParkingAddonService for capacity integration
  - [x] 5.1 Modify checkParkingVacancies method


    - Update method to use capacity-based availability logic
    - Call new capacity calculation functions
    - Update response format to include capacity details
    - _Requirements: 1.2, 4.1_

  - [x] 5.2 Modify getAvailableSpotsForDates method


    - Update method to work with capacity-based system
    - Return capacity availability instead of specific spots
    - Maintain compatibility with existing callers
    - _Requirements: 1.2, 4.1_

  - [x] 5.3 Modify checkRealTimeAvailability method



    - Update method to calculate capacity-based availability
    - Include blocked capacity in calculations
    - Update response format with capacity details
    - _Requirements: 1.2, 2.2, 5.1_

- [ ] 6. Virtual capacity pool setup and backward compatibility
  - [ ] 6.1 Create virtual capacity pool spots
    - Write function to create or ensure virtual capacity pool spots exist for each hotel
    - Create one virtual spot per vehicle category per hotel
    - Set spot_type = 'capacity_pool' and spot_number = 'CAPACITY-POOL-{vehicle_category_id}'
    - Set capacity_units to a high value (e.g., 9999) to accommodate multiple reservations
    - Set is_active = true
    - Add to a special parking lot named 'Virtual Capacity Pool' or use existing lot
    - Log creation of each virtual spot with hotel_id and vehicle_category_id
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 6.2 Implement feature flag system
    - Add configuration for capacity-based vs spot-based mode
    - Create utility function to check feature flag
    - Update functions to branch based on feature flag
    - Allow per-hotel feature flag configuration
    - _Requirements: 6.5_

  - [ ] 6.3 Add backward compatibility layer
    - Ensure existing spot-based reservations continue to work
    - Support mixed mode where some reservations are spot-based and others capacity-based
    - Update queries to distinguish between physical spots and virtual capacity pool spots
    - Filter out capacity_pool spots when displaying physical spot assignments
    - Maintain existing API response formats
    - Add debug logs to show which reservations are capacity-based vs spot-based
    - _Requirements: 6.1, 6.2, 6.5_

- [ ] 7. Error handling and validation
  - [x] 7.1 Implement capacity validation functions


    - Create validateCapacityAvailability function
    - Check sufficient capacity exists for reservation
    - Return detailed error messages with available capacity
    - Suggest alternative dates when capacity insufficient
    - _Requirements: 1.2, 5.2, 5.3_

  - [ ] 7.2 Implement database transaction error handling
    - Add try-catch blocks with rollback for all capacity operations
    - Implement database-level locking to prevent race conditions
    - Handle concurrent reservation conflicts with 409 Conflict response
    - Log all transaction errors for debugging
    - _Requirements: 5.3_

  - [x] 7.3 Add input validation for all endpoints



    - Validate date formats and ranges
    - Validate capacity amounts are positive integers
    - Validate vehicle category IDs exist
    - Validate hotel IDs and user permissions
    - Return 400 Bad Request with clear error messages
    - _Requirements: 1.2, 2.1, 3.3_

  - [x] 7.4 Implement custom error classes


    - Create InsufficientCapacityError class
    - Create InvalidDateRangeError class
    - Create CapacityBlockConflictError class
    - Add error serialization for API responses
    - _Requirements: 5.2_

- [ ]* 8. Testing implementation
  - [ ]* 8.1 Write unit tests for ParkingCapacityService
    - Test getAvailableCapacity with various scenarios
    - Test reserveCapacity with sufficient and insufficient capacity
    - Test blockCapacity with valid and invalid inputs
    - Test releaseBlockedCapacity
    - Test getCapacitySummary with multiple parking lots
    - _Requirements: 1.1, 1.2, 2.1, 5.1_

  - [ ]* 8.2 Write unit tests for updated Parking Model functions
    - Test saveParkingAssignments with capacity-based reservations
    - Test checkParkingVacancies capacity calculations
    - Test blockParkingCapacity function
    - Test getBlockedCapacity function
    - Test removeCapacityBlock function
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 3.2_

  - [ ]* 8.3 Write integration tests for capacity reservation flow
    - Test end-to-end reservation creation with capacity
    - Test reservation cancellation and capacity restoration
    - Test reservation modification with capacity adjustments
    - Test concurrent reservations for same capacity
    - _Requirements: 1.1, 1.3, 4.2, 5.3_

  - [ ]* 8.4 Write integration tests for blocking functionality
    - Test capacity blocking and availability reduction
    - Test block removal and capacity restoration
    - Test overlapping blocks
    - Test blocking during active reservations
    - _Requirements: 2.1, 2.2, 3.1, 3.2_

  - [ ]* 8.5 Write migration tests
    - Test data migration script with sample data
    - Verify capacity_units_reserved is correctly populated
    - Test backward compatibility with existing reservations
    - Verify no data loss during migration
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ]* 8.6 Write API endpoint tests
    - Test all new capacity endpoints with valid inputs
    - Test error handling with invalid inputs
    - Test authentication and authorization
    - Test response formats match specifications
    - _Requirements: 1.2, 2.1, 3.1, 3.2, 5.1_

- [-] 9. Implement Parking Blocked Dates UI (Admin)

  - [x] 9.1 Create ManageParkingCalendar.vue page


    - Create new page at frontend/src/pages/Admin/ManageParkingCalendar.vue
    - Follow the structure and pattern of ManageCalendar.vue
    - Import necessary PrimeVue components (Panel, Card, Select, MultiSelect, DatePicker, InputText, Button, DataTable, Column, ConfirmDialog)
    - Set up basic page layout with header "駐車場カレンダー設定"
    - _Requirements: 2.1, 3.1_

  - [x] 9.2 Implement parking lot and vehicle category selection



    - Add hotel selection dropdown using useHotelStore
    - Add parking lot multi-select dropdown
    - Add vehicle category multi-select dropdown
    - Fetch parking lots and vehicle categories when hotel is selected
    - Update form state when selections change
    - _Requirements: 2.1, 3.3_

  - [x] 9.3 Implement date range and capacity input form

    - Add start date picker
    - Add end date picker
    - Add capacity amount input field (number of spots to block)
    - Add comment/reason text input field
    - Validate date range (end date must be after start date)
    - Validate capacity amount (must be positive integer)
    - _Requirements: 2.1, 3.3_

  - [x] 9.4 Implement block creation actions

    - Add "全ホテルに適用" button to apply blocks to all hotels
    - Add "選択ホテルに適用" button to apply blocks to selected hotel
    - Implement confirmation dialogs with formatted messages showing:
      - Selected hotel(s)
      - Selected parking lot(s) or "全駐車場"
      - Selected vehicle category(ies) or "全車両タイプ"
      - Date range
      - Capacity amount
    - Call POST /api/parking/capacity/block endpoint
    - Show success/error toast messages
    - Refresh blocked dates list after successful creation
    - _Requirements: 2.1, 3.3_

  - [x] 9.5 Implement blocked dates DataTable display

    - Create DataTable to display existing parking blocks
    - Add columns for: Hotel, Parking Lot, Vehicle Category, Start Date, End Date, Blocked Capacity, Comment
    - Format dates using formatDate helper function
    - Add pagination with rows per page options [10, 30, 50, 100]
    - Enable scrolling and striped rows
    - Fetch blocked dates when hotel is selected
    - _Requirements: 3.1_

  - [x] 9.6 Implement block deletion functionality

    - Add delete button (trash icon) in each DataTable row
    - Implement confirmation dialog before deletion showing:
      - Parking lot name
      - Vehicle category
      - Date range
      - Blocked capacity amount
    - Call DELETE /api/parking/capacity/blocks/:blockId endpoint
    - Show success/error toast messages
    - Refresh blocked dates list after successful deletion
    - _Requirements: 3.2, 3.5_

  - [x] 9.7 Add parking store methods for blocked dates






    - Add fetchParkingBlocks method to useParkingStore
    - Add createParkingBlock method to useParkingStore
    - Add deleteParkingBlock method to useParkingStore
    - Add reactive state for parkingBlocks list
    - Handle API calls and error responses
    - _Requirements: 2.1, 3.1, 3.2_

  - [x] 9.8 Add route and navigation for parking calendar page


    - Add route in router configuration for /admin/parking-calendar
    - Add navigation menu item in admin section
    - Set appropriate permissions/guards for admin access
    - _Requirements: 2.1_

- [ ] 10. Integrate blocked dates with reservation flow
  - [x] 10.1 Update ParkingSpotSelector to show blocked capacity


    - Modify capacity display to show "利用可能: X台 (ブロック: Y台)"
    - Show warning when blocked capacity reduces availability
    - Disable date selection when all capacity is blocked
    - Update real-time availability checks to include blocked capacity
    - _Requirements: 2.2, 5.1_

  - [x] 10.2 Update reservation validation to check blocked capacity

    - Modify saveParkingAssignments to validate against blocked capacity
    - Return clear error message when capacity is blocked
    - Suggest alternative dates when capacity is insufficient due to blocks
    - _Requirements: 2.2, 5.2, 5.3_

  - [x] 10.3 Update capacity summary displays


    - Show blocked capacity in capacity breakdown views
    - Add visual indicators (colors/icons) for blocked dates
    - Update tooltips to explain blocked capacity
    - _Requirements: 2.2, 5.1_

- [ ] 11. Documentation and deployment preparation
  - [ ] 11.1 Update API documentation
    - Document all new capacity endpoints
    - Update existing endpoint documentation
    - Add request/response examples
    - Document error codes and messages
    - _Requirements: 6.5_

  - [ ] 11.2 Create deployment runbook
    - Document database migration steps
    - Document feature flag configuration
    - Document rollback procedures
    - Create deployment checklist
    - _Requirements: 6.5_

  - [ ] 11.3 Add monitoring and logging
    - Add capacity utilization metrics
    - Add reservation success/failure rate tracking
    - Add error logging for capacity operations
    - Create alerts for capacity overbooking
    - _Requirements: 5.2, 5.3_


## Phase 3: ReservationsNewCombo Integration

- [x] 12. Update ReservationsNewCombo.vue to use new parking capacity calculation



  - [x] 12.1 Replace maxParkingSpots calculation with checkRealTimeAvailability API


    - Remove old parking availability logic that doesn't account for blocks
    - Call checkRealTimeAvailability API with proper parameters (hotelId, dates, vehicleCategoryId)
    - Use excludeReservationId when editing existing reservations
    - Update reactive state to store net available capacity per date
    - _Requirements: 1.2, 2.2, 5.1_

  - [x] 12.2 Update parking capacity validation logic


    - Replace old capacity checks with net available capacity (gross - blocked)
    - Validate requested parking spots against net available capacity for each date
    - Show clear error messages when capacity is insufficient due to blocks
    - Prevent form submission when parking capacity is exceeded
    - _Requirements: 2.2, 5.2, 5.3_

  - [x] 12.3 Update parking capacity display in UI

    - Show net available capacity with block information (e.g., "利用可能: 5台 (ブロック: 2台)")
    - Add visual indicators when capacity is limited by blocks
    - Update tooltips to explain blocked capacity impact
    - Disable parking selection when all capacity is blocked for selected dates
    - _Requirements: 2.2, 5.1_

  - [x] 12.4 Ensure timezone-corrected date comparisons


    - Use formatDate utility for all date comparisons
    - Ensure consistency with backend date handling
    - Fix any timezone-related bugs in date range selection
    - _Requirements: 1.2, 5.1_

  - [x] 12.5 Handle multi-date reservations with parking lot capacity limits


    - Validate capacity per parking lot for each date in the reservation
    - Show which dates have insufficient capacity
    - Allow partial date selection when some dates lack capacity
    - Update assignment algorithm to respect parking lot capacity limits
    - _Requirements: 1.2, 1.4, 5.2_

  - [x] 12.6 Add debug logging for troubleshooting

    - Log API calls to checkRealTimeAvailability with parameters
    - Log capacity validation results for each date
    - Log parking block information affecting availability
    - Log any capacity conflicts or validation failures
    - _Requirements: 5.1, 5.2_

  - [x] 12.7 Test integration with existing reservation flow

    - Test creating new reservations with parking capacity limits
    - Test editing existing reservations with excludeReservationId
    - Test multi-date reservations across different parking lots
    - Test error handling when capacity is exceeded
    - Verify blocked capacity is properly respected
    - _Requirements: 1.1, 1.3, 2.2, 4.2_

## Next Steps

The ReservationsNewCombo.vue component currently uses older parking availability logic that doesn't account for:
- Parking blocks reducing available capacity
- Timezone-corrected date comparisons
- Parking lot specific capacity limits
- The new checkRealTimeAvailability API with excludeReservationId support

This phase will integrate all the improvements from Phase 1 and Phase 2 into the main reservation creation flow.
