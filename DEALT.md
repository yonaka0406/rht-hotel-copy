# Resolved Issues

This document contains all fixed and closed issues that were previously tracked in BUGS.md.

## August 19, 2025

#### Bug #39: Plan Price Rounding Discrepancy
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Plan prices were being rounded correctly in the Admin panel but not in the actual reservations calculation, leading to potential price discrepancies.
- **Solution**: 
  - Modified the system to avoid recalculating prices from rates and add-ons
  - Now using the pre-calculated price stored in reservation_details for consistency
  - This ensures the same price is used throughout the application
- **Technical Details**:
  - Updated `totalPrice` and `pricePerRoom` computed properties to use the price field directly
  - Removed complex rate and add-on calculations that were causing rounding inconsistencies
  - Simplified the codebase by removing redundant calculations
- **Environment**: All environments
- **Verification**: 
  - Prices now remain consistent between Admin panel and reservation calculations
  - No more rounding discrepancies in financial reports
  - Improved performance by eliminating redundant calculations

#### Bug #41: Review Sales Calculations After Price Calculation Changes
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: After the changes in Bug #39 to use pre-calculated prices from reservation_details, we need to review and update the sales calculation logic throughout the application to ensure consistency. Additionally, the price field in reservation_details needs to properly handle cases where a day is cancelled but still billable.
- **Areas to Review**:
  1. Sales reports and dashboards
  2. Financial calculations and statements
  3. Billing and invoicing modules
  4. Any other components that display or calculate prices
- **Required Changes**:
  1. Update the price calculation in reservation_details to handle cancelled but billable days
  2. Ensure all sales calculations use the same price source consistently
  3. Add validation to prevent price discrepancies
  4. Update relevant documentation
- **Environment**: All environments
- **Additional Notes**: This is a follow-up to Bug #39 and is critical for financial accuracy.

## August 18, 2025

#### Bug #33: Room Deletion Not Working in Production Environment
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: In test and local environments, room deletion works as expected. However, in the production environment, room deletion is not occurring. Note that the number of people and number of stays are being updated correctly.
- **Steps to Reproduce**:
  1. Navigate to a reservation in the production environment.
  2. Attempt to delete a room from the reservation.
  3. Save the changes.
- **Expected Behavior**: The room should be deleted from the reservation.
- **Actual Behavior**: The room is not deleted, though the number of people and stays are updated.
- **Solution**:
  - Fixed critical bug where transactions were using mixed pool/client connections
  - Added proper transaction handling with consistent client usage
  - Enhanced controller logic to properly handle model responses
  - Improved input validation and error handling
  - Added comprehensive logging for production debugging
  - Fixed variable scoping issues in the transaction flow
- **Technical Details**:
  - Changed `pool.query` calls to use the transaction client
  - Added proper error handling and response formatting
  - Improved transaction rollback on errors
  - Enhanced logging for production debugging
- **Files Modified**:
  - `api/models/reservations.js`
  - `api/controllers/reservationsController.js`
  - `frontend/src/composables/useReservationStore.js`
  - `frontend/src/pages/MainPage/components/ReservationRoomsView.vue`
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Assigned To**: 
- **Reported By**: 
- **Date Reported**: 2025-08-12
- **Date Fixed**: 2025-08-18

#### Bug #13: Inconsistent Room Reservation Behavior Between Calendar and Edit Views
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: The user opened a 3 room reservation and tried to edit one room to a different check in check out period. In the calendar view, when that happens the different room is moved to a new reservation. In the ReservationEdit the same behaviour was expected, but nothing happens.
- **Steps to Reproduce**: 
  1. Open a reservation with multiple rooms.
  2. Edit one room to have a different check-in/check-out period.
  3. Observe that the room is not moved to a new reservation.
- **Expected Behavior**: When a room's check-in/check-out period is changed to be different from the other rooms in the reservation, it should be moved to a new reservation.
- **Actual Behavior**: The room's dates are changed, but it is not moved to a new reservation.
- **Environment**: ReservationEdit
- **Additional Notes**: This behavior is inconsistent with the calendar view, where a new reservation is created in this scenario.

#### Feature Request #20: Client-based Meal Count Report
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: Create a new report that shows meal counts grouped by client instead of by date.
- **Requirements**:
  - User will provide the specific format
  - Should be exportable to common formats (CSV, Excel)
- **Solution Implemented**:
  - Created a new Meal Count page with a clean, responsive design
  - Implemented date range filters with quick select options (today, this week, etc.)
  - Added a data table showing meal counts by date with separate columns for each meal type
  - Included export functionality matching the existing export feature
  - Ensured mobile responsiveness for on-the-go access
  - Maintained data consistency with the export functionality
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

## August 15, 2025

#### Bug #36: Employee Reservations Not Included in Meal Count Report
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: 
  - Meal counts for employee reservations were not being included in the meal count report.
  - This happened because the report was filtering out reservations with type 'employee'.
- **Solution Implemented**:
  - Modified the system to automatically set employee reservations to 'confirmed' status
  - This ensures they are included in all standard reports including meal counts
  - Maintains the distinction between employee and regular reservations through the 'type' field
- **Environment**: All environments
- **Additional Notes**: 
  - This approach was chosen over modifying all report queries to specifically include 'employee' type
  - Ensures consistent behavior across all reporting features
  - Simplifies future maintenance by using the standard 'confirmed' status workflow
- **Steps to Reproduce**:
  1. Create a reservation with type 'employee' that includes meals
  2. Generate a meal count report for the relevant date range
  3. Observe that the employee's meals are not included in the report
- **Expected Behavior**: 
  - Employee reservations should be included in the meal count report
  - All meals from all reservation types should be counted by default
- **Actual Behavior**: 
  - Meals from employee reservations are excluded from the report
- **Root Cause**: The report query was filtering out reservations with type 'employee'.
- **Solution**: 
  - Modified the report query to include employee reservations
  - Ensured consistent distribution of guests across all nights
  - Removed complex room adjustment logic that was causing inconsistencies
- **Files Modified**: `api/controllers/reservationsController.js`
- **Date Fixed**: 2025-08-15

#### Bug #35: Checkin/Checkout Dates Not Updating After Partial Cancellation
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: 
  - When the first day(s) or last day(s) of a reservation are cancelled, the checkin and checkout dates in the reservations table are not being updated to reflect the new date range.
  - The system should automatically adjust the checkin date if the first day(s) are cancelled, and the checkout date if the last day(s) are cancelled.
- **Steps to Reproduce**:
  1. Create a multi-day reservation (e.g., Jan 1 - Jan 5)
  2. Cancel the first day (Jan 1) of the reservation
  3. Observe that the checkin date in the reservations table still shows Jan 1
  4. Similarly, cancel the last day (Jan 5)
  5. Observe that the checkout date in the reservations table still shows Jan 5
- **Expected Behavior**: 
  - When first day(s) are cancelled, the checkin date should update to the new first day
  - When last day(s) are cancelled, the checkout date should update to the new last day
- **Actual Behavior**: 
  - The checkin/checkout dates in the reservations table remain unchanged after partial cancellation
- **Environment**: All environments
- **Solution**:
  - Modified `updateReservationDetailStatus` in `api/models/reservations.js` to:
    1. Query for the min/max dates from remaining active reservation details
    2. Update the parent reservation's check_in and check_out dates accordingly
    3. Handle edge cases like when all details are cancelled
    4. Maintain proper transaction handling throughout the process
- **Date Fixed**: 2025-08-15

### Feature Request #34: Receipt Date and Room Information
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: 
  - Added the current date to all PDF receipts for better record-keeping
  - In the receipt creation table/view, included the following information for each reservation:
    - Room number
    - Check-in date
    - Check-out date
  - Ensured the date format is consistent and follows Japanese standards (YYYY/MM/DD)
  - Made the date field clearly visible on the receipt
- **Implementation Details**:
  - Added new columns to the receipts view for room number and stay period
  - Formatted dates to show in Japanese standard format (YYYY/MM/DD) with day of week
  - Added proper handling for missing or null values
- **Date Fixed**: 2025-08-15

### Feature Request #32: Accounting Export Enhancement
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: 
  - Created an enhanced export feature for the accounting department
  - Includes detailed transaction data, payment information, and client details
  - Export format is CSV for easy import into accounting software
  - Includes filters by date range, payment type, and reservation status
  - Added fields:
    - Transaction date
    - Reservation ID
    - Client name and company
    - Payment type and amount
    - Room charges and additional fees
    - Tax information
    - Payment status
- **Additional Notes**: This streamlines the accounting department's monthly closing process and financial reporting. The 備考 field is included for special notes or remarks related to the reservation.

## August 14, 2025

### Bug #34: Incorrect Room Distribution for Multi-night Reservations
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: When adding 3 rooms for 6 people in a room that fits 2 people, the distribution was inconsistent across multiple nights. For 2-night reservations, the first day showed 3 people and the second day showed 1 person, which was incorrect.
- **Root Cause**: The room assignment logic was recalculating the number of people per room for each day instead of using a consistent distribution across all nights.
- **Solution**: 
  - Implemented a "Calculate-Then-Create" pattern that first determines the final guest count for each room
  - Used a Map to track room assignments before creating any database records
  - Ensured consistent distribution of guests across all nights
  - Removed complex room adjustment logic that was causing inconsistencies
- **Files Modified**: `api/controllers/reservationsController.js`
- **Date Fixed**: 2025-08-15

### Bug #35: Duplicate Reservation Details for Same Room and Date
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Reservation ID `f73f1c35-2ed6-4503-8950-9764b4f7fc31` had duplicate dates for the same room with different plans, which was causing constraint violations in the `reservation_details` table.
- **Root Cause**: The unique constraint on `reservation_details` included a `cancelled` column that could be NULL. In PostgreSQL, NULL values are not considered equal in unique constraints, allowing multiple rows with NULL values in the `cancelled` column to bypass the unique constraint.
- **Solution**: 
  1. Removed the problematic unique constraint from `reservation_details`
  2. Implemented proper indexing to handle duplicates while allowing NULL values
  3. Updated the period change function to use transactions for data consistency
- **Date Fixed**: 2025-08-14

### Feature Request #17: Show Guest Name for OTA Reservations in Calendar
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: 
  - Modified the calendar to show the actual guest name(s) for OTA reservations instead of the booker's name
  - **Implementation Details**:
    - Verified OTA API provides guest names
    - Implemented logic to show primary guest name for OTA reservations
    - Added fallback to booker name if guest name is unavailable
  - **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
  - **Additional Notes**:
    - Improves staff efficiency by showing actual guest names instead of OTA booking references
    - Handles cases with multiple guests by showing the primary guest's name
- **Date Fixed**: 2025-08-14

### Bug #32: Room Indicator - Incorrect "Currently Staying" Status
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: The room indicator was incorrectly showing clients as "滞在中" (currently staying) for the entire day of their check-in, even if they hadn't actually checked in yet.
- **Root Cause**: The `occupiedRooms` filter was including rooms based on check-in/check-out dates without verifying the actual check-in status.
- **Solution**: Modified the filter to only include rooms with status 'checked_in' in the "滞在中" section and updated the check-in/check-out logic to properly categorize rooms.
- **Environment**: Room Indicator component
- **Date Fixed**: 2025-08-14

#### Feature Request #18: Parking Management Function
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: Add functionality to manage parking spaces and assignments for guests.
- **Requirements**:
  - Track available parking spaces
  - Assign parking spots to reservations
  - Generate parking reports
- **Solution Implemented**:
  - Added parking space management system with real-time availability tracking
  - Integrated parking assignment with reservation system
  - Created parking reports with filtering by date range and status
  - Added parking spot management interface
- **Files Modified**:
  - `frontend/src/views/ParkingManagement.vue`
  - `api/controllers/parkingController.js`
  - `api/models/parking.js`
  - `frontend/src/router/index.js`
- **Date Fixed**: 2025-08-18
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

## August 7, 2025

### Bug #22: Unable to Add Addons Without a Selected Plan
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Users were unable to add addons to a reservation without first selecting a plan. The system would throw an error when trying to access properties of an undefined `selectedPlanObject`.
- **Resolution**: 
  - Modified the `savePlan` function to handle cases where no plan is selected
  - Added null checks for `selectedPlanObject` before accessing its properties
  - Made plan-related operations conditional on a plan being selected
  - Ensured addons can be saved independently of plan selection
- **Date Fixed**: August 7, 2025
- **Environment**: Frontend - ReservationDayDetail.vue component

## August 6, 2025

### Bug #21: Hotel Selection Not Persisting Across Navigation
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: When changing the hotel in the TopMenu, the selected hotel was not being passed correctly to other components, causing the selection to reset when navigating between pages.
- **Resolution**: 
  - Implemented localStorage persistence for the selected hotel ID
  - Added proper initialization logic in TopMenu and SideMenu components
  - Ensured hotel selection state is maintained across component mounts
  - Added proper error handling and fallback to first available hotel
- **Date Fixed**: August 6, 2025
- **Environment**: Frontend

## August 5, 2025

### Bug #20: Billable Status Not Updated When Adding Rooms to Confirmed Reservations
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: When rooms are added to a reservation after it has been confirmed, the billable status of the new room details is not automatically set to true, even though the reservation is confirmed.
- **Steps to Reproduce**:
  1. Create a new reservation and confirm it (status changes to 'Confirmed' and billable becomes true)
  2. Add a new room to the confirmed reservation
  3. The new room's billable status remains false
- **Expected Behavior**:
  - When a room is added to a confirmed reservation, its billable status should be set to true to match the reservation's confirmed status.
  - The UI should clearly indicate when a room is not billable with a visual indicator (e.g., strikethrough text, different background color, or an icon).
- **Actual Behavior**:
  - Newly added rooms maintain billable = false even in confirmed reservations.
  - There is no visual indication in the UI that a room is not billable.
- **Affected Component**:
  - Reservation update/room addition logic
  - Room display components
- **UI Requirements**:
  - Add a visual indicator (e.g., strikethrough, different color, or icon) for non-billable rooms
  - The indicator should be visible in all relevant views (reservation details, room assignments, billing, etc.)
  - Consider adding a tooltip explaining why a room is not billable
- **Environment**: Reservation management system
- **Additional Notes**:
  - This can lead to rooms not being included in billing calculations
  - The issue likely stems from the room addition logic not checking the reservation's confirmed status
  - A workaround is to manually update the billable status in the database, but this is not a sustainable solution
- **Date Fixed**: 2025-08-05

### Feature Request #25: Show OTA Queue Table
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Show in the Admin page, OTA exchange page, hotel page, a data table with the recent entries in the ota queue table for that hotel, with the date created, status, reservation id and booker name.
- **Requirements**:
  - Add a new data table to the Admin page, OTA exchange page, and hotel page.
  - The table should show the recent entries from the ota_queue table for the selected hotel.
  - The table should include the following columns:
    - Date Created
    - Status
    - Reservation ID
    - Booker Name
- **Additional Notes**: This will help with monitoring the OTA queue and debugging any issues.
- **Date Fixed**: 2025-08-05

## August 4, 2025

### Bug #4 / Feature Request
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Romaji auto-capitalization should preserve all-uppercase input (e.g., 'NTT' should not become 'Ntt').
- **Steps to Reproduce**:
  1. Create a new client and enter an all-uppercase company name (e.g., 'NTT') in the Romaji field.
  2. Observe that it is auto-capitalized to 'Ntt'.
- **Expected Behavior**: All-uppercase input should be preserved as entered by the user.
- **Actual Behavior**: All-uppercase input is auto-capitalized to only the first letter being uppercase.
- **Environment**: 
- **Additional Notes**: This is important for company names and acronyms that are conventionally written in all caps.
- **Date Fixed**: 2025-07-17

### Bug #5
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: After creating a hold reservation and navigating to ReservationEdit, the client cannot be edited immediately without refreshing the page.
- **Steps to Reproduce**:
  1. Create a hold reservation.
  2. When redirected to the ReservationEdit page, try to edit the client.
  3. Observe that editing is not possible until the page is refreshed.
- **Expected Behavior**: The client should be editable immediately after creating a hold reservation, without needing to refresh the page.
- **Actual Behavior**: The client cannot be edited until the page is refreshed.
- **Environment**: 
- **Additional Notes**: This may be due to stale state or missing data reload after navigation.
- **Date Fixed**: 2025-07-17

### Bug #6
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Addon is not reflected in the reservation edit page when added from the プラン・機関編集 (Plan/Addon Edit) button, but appears when added from the day details.
- **Steps to Reproduce**:
  1. Open a reservation and use the プラン・機関編集 button to add an addon.
  2. Observe that the addon does not appear in the reservation edit page.
  3. Add an addon from the day details instead.
  4. Observe that the addon appears correctly.
- **Expected Behavior**: Addons added from either method should appear immediately in the reservation edit page.
- **Actual Behavior**: Addons added from プラン・機関編集 do not appear, but those added from day details do.
- **Environment**: 
- **Additional Notes**: This may be due to a missing state update or data fetch after editing via the plan/addon dialog.
- **Date Fixed**: 2025-07-17

### Feature Request #7
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [ ] High [ ] Critical
- **Description**: Implement a 'Copy Reservation' function that allows copying a reservation to a different booker, keeping all other reservation details the same.
- **Steps to Reproduce**:
  1. Select a reservation.
  2. Use the 'Copy to a different booker' function.
  3. Choose a new booker/client.
  4. Confirm that a new reservation is created with the same details but a different booker.
- **Expected Behavior**: The system should allow users to duplicate a reservation for a different booker, with all other details (dates, rooms, addons, etc.) copied.
- **Actual Behavior**: Backend implementation completed. Frontend UI integration in progress.
- **Environment**: 
- **Additional Notes**: Backend functionality for copying reservations including all rates, addons, and details has been implemented and tested. Spec created at `.kiro/specs/reservation-copy-feature/`.
- **Date Fixed**: 2025-07-17

### Bug #8 / Feature Request
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Description**: When exporting the meals quantity report and there are no addons, the toast response should be more informative (e.g., 'No meal data to export') instead of a generic or silent response.
- **Steps to Reproduce**:
  1. Attempt to export the meals quantity report when there are no meal addons in the selected period.
  2. Observe the toast or lack of feedback.
- **Expected Behavior**: The user should see a clear message like 'No meal data to export' if there are no relevant addons.
- **Actual Behavior**: The toast is generic or missing, which can be confusing.
- **Environment**: 
- **Additional Notes**: Improves user experience and reduces confusion when no data is available for export.
- **Date Fixed**: 2025-07-17

### Bug #9
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: The count of addons (especially meals) may not be correct in the all reservations export CSV. For the same period, reservation_details CSV showed meal addons that did not appear in the meals report, indicating a possible data extraction or filtering bug.
- **Steps to Reproduce**:
  1. Export the all reservations CSV and the reservation_details CSV for the same period.
  2. Compare the count of meal addons in both files.
  3. Observe that meal addons present in reservation_details may be missing or miscounted in the all reservations export and meals report.
- **Expected Behavior**: All meal addons should be correctly counted and appear in both the all reservations export and the meals report for the same period.
- **Actual Behavior**: Meal addons are missing or miscounted in the all reservations export and meals report.
- **Environment**: 
- **Additional Notes**: This may be due to a bug in the data extraction or filtering logic for exports and reports.
- **Date Fixed**: 2025-07-17

### Bug #10
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: After deleting a reservation, the confirmation prompt '保留中予約を削除してもよろしいですか?' remains on screen instead of closing automatically.
- **Steps to Reproduce**:
  1. Attempt to delete a hold reservation (保留中予約).
  2. Confirm the deletion in the prompt.
  3. Observe that the prompt does not close after the reservation is deleted.
- **Expected Behavior**: The confirmation prompt should close automatically after the reservation is deleted.
- **Actual Behavior**: The prompt remains visible even after deletion.
- **Environment**: 
- **Additional Notes**: This can confuse users, making them think the action was not completed.
- **Date Fixed**: 2025-07-17

### Feature Request #11
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Remove the requirement to have a reservation client in order to perform check-in.
- **Steps to Reproduce**:
  1. Attempt to check in a reservation without a client assigned.
  2. Observe that the system currently requires a client to be set.
- **Expected Behavior**: It should be possible to perform check-in even if no reservation client is assigned.
- **Actual Behavior**: The system currently blocks check-in if there is no client assigned.
- **Environment**: 
- **Additional Notes**: This will make the check-in process more flexible for cases where a client is not yet registered or known at the time of check-in.
- **Date Fixed**: 2025-07-17

### Feature Request #13
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add a legend to the Calendar view explaining the meaning of all icons used.
- **Steps to Reproduce**:
  1. Open the calendar view.
  2. Observe the icons used for reservations, statuses, and indicators.
  3. Look for a legend explaining their meaning.
- **Expected Behavior**: There is a clear, accessible legend in the calendar view that explains all icons and their meanings.
- **Actual Behavior**: No such legend currently exists.
- **Environment**: 
- **Additional Notes**: This will help users quickly understand the meaning of icons and improve usability.
- **Date Fixed**: 2025-07-17

### Bug #11
- **Status**: [x] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: After a psql server DoS and restart, OTA reservations were added multiple times because confirmation was not sent to the OTA. This resulted in duplicate reservations and failures when attempting to edit the reservation.
- **Steps to Reproduce**:
  1. Experience a psql server outage (e.g., due to DoS).
  2. Restart the psql server.
  3. Observe that OTA reservations are added, but confirmation is not sent to the OTA.
  4. Multiple copies of the same reservation are created.
  5. Attempt to edit the reservation and observe that the edit fails.
- **Expected Behavior**: OTA reservations should be confirmed and not duplicated after a server restart. Editing should work as expected.
- **Actual Behavior**: Multiple copies of the same reservation are created, and editing fails.
- **Environment**: psql server outage and restart, OTA integration
- **Additional Notes**: This can cause significant data integrity issues and confusion for both staff and clients. Needs a mechanism to prevent duplicate OTA reservations after server recovery.
- **Date Fixed**: 2025-08-04

### Feature Request #15
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add a FAQ page of the system with instructions for the use of the system.
- **Steps to Reproduce**:
  1. Access the system.
  2. Navigate to the FAQ page.
  3. View instructions and answers to common questions about system usage.
- **Expected Behavior**: Users can easily find instructions and answers to common questions about system usage.
- **Actual Behavior**: No FAQ page currently exists.
- **Environment**: 
- **Additional Notes**: This will help new and existing users understand how to use the system efficiently. Comprehensive spec created at `.kiro/specs/about-and-faq-system/` including FAQ functionality and Japanese changelog display.
- **Date Fixed**: 2025-08-04

### Feature Request #16: Improved OTA Import Logic
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Improve the OTA import logic: convert OTA XML reservation data to PMS format and save in a temp table, attempt to add to PMS reservations, and if any fail, cache the data and only clear the cache upon successful confirmation to the OTA. Notify users of unimported data in PMS, allowing them to change room types before the next OTA retry, which would use the updated mapping.
- **Steps to Reproduce**:
  1. OTA XML data is converted and saved in a temp table.
  2. If PMS import fails, data is cached and not cleared until OTA confirmation is successful.
  3. User is notified of unimported data and can adjust room types in PMS.
  4. On next OTA retry, the updated mapping is used.
- **Expected Behavior**: OTA import is robust, and users are notified of and can resolve import issues.
- **Actual Behavior**: OTA keeps sending duplicate reservations if import fails, and users are not notified of unimported data.
- **Environment**: OTA integration, PMS import logic
- **Additional Notes**: This will prevent duplicate reservations, improve upgrade handling, and provide better user feedback and control over OTA import issues.
- **Date Fixed**: 2025-08-04

## July 31, 2025

### Bug #21: Meal Counts Query Not Returning
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: The meal counts query was not returning any results due to incorrect join conditions in the query.
- **Resolution**: Fixed the SQL query to properly join the reservations and meal count tables.
- **Environment**: Reporting module

### UI Change Request #1: Rename Mode
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: Change the name of the mode from "予約移動" to "デフォルト" (Default)
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Additional Notes**: This is a simple UI text change to improve clarity.

### Feature Request #21: Hotel Display Order in Top Menu
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Description**: Add the ability to set the display order of hotels in the top menu.
- **Requirements**:
  - Add a sort order field to the hotels table
  - Update the menu generation to respect this order
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Resolution**: Added a `sort_order` column to the `hotels` table and updated the API to sort hotels by this field. The admin panel was also updated to allow editing of the sort order.
- **Date Fixed**: 2025-08-03

## July 29, 2025

### Bug #19: Cancelled Reservations Show in Room Indicator
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Cancelled reservations were incorrectly displayed in the Room Indicator page. The system was not properly filtering out reservations with 'cancelled' status from the room indicator view.
- **Steps to Reproduce**:
  1. Create a reservation and cancel it.
  2. Navigate to the Room Indicator page.
  3. Observe that the cancelled reservation is still visible.
- **Expected Behavior**: Cancelled reservations should not appear in the Room Indicator page.
- **Affected Component**: `frontend/src/pages/MainPage/RoomIndicator.vue`
- **Resolution**:
  - Updated filtering logic in RoomIndicator.vue to exclude cancelled reservations from all room groups
  - Modified reservedRoomIds to only include non-cancelled reservations when determining room availability
- **Date Fixed**: 2025-07-29
- **Additional Notes**: The fix ensures that rooms with only cancelled reservations now correctly appear in the 空室 (available) section.

### Bug #18: Calendar Scrollbar Disappears on Date Selection
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: The horizontal scrollbar in the reservation calendar disappears when a date is selected, making it difficult to navigate between dates.
- **Steps to Reproduce**:
  1. Open the reservation calendar
  2. Select a date
  3. Observe that the horizontal scrollbar disappears
- **Expected Behavior**: The horizontal scrollbar should remain visible and functional at all times
- **Actual Behavior**: The scrollbar disappears after date selection
- **Environment**: 
  - Reservation Calendar view
  - May be related to screen resolution
- **Resolution**:
  - Updated table container CSS to use `overflow-y: auto`
  - Added scrollbar styling for better visibility
  - Adjusted container height calculation
- **Date Fixed**: 2025-07-29
- **Additional Notes**:
  - The scrollbar now remains visible when needed
  - Improved scrollbar styling for better user experience

### Feature Request #22: Configurable Reservation Inquiry Button
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: 
  - Added a button to open reservation inquiry in a Google Drive spreadsheet
  - Made the Google Drive link configurable per hotel in the admin interface
  - Added a new field in the hotel edit screen for the Google Drive URL
  - **Button Locations**:
    1. Reservation Edit page
    2. Reservation Calendar page
- **Implementation Notes**: 
  - Each hotel can now have its own reservation inquiry spreadsheet without hardcoding the link in the application
  - The button is clearly visible and consistently placed in both locations
- **Date Implemented**: July 29, 2025

## July 27, 2025

### Bug #17: Employee Reservation Price Requirement
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: The system currently requires a plan/price for employee reservations, but users want to allow confirming employee stays without pricing. However, this could be exploited by marking a reservation as employee to bypass pricing, then changing it back to a regular guest.
- **Current Behavior**: System blocks confirmation of employee reservations without a plan/price.
- **Requested Change**: Allow confirming employee reservations without a plan/price.
- **Security Concern**: Potential bypass if users can change reservation type after confirmation.
- **Resolution**:
  - Updated the system to allow employee reservations without a plan/price
  - Implemented restrictions to prevent changing reservation type after confirmation
  - Added visual distinction for employee reservations in the UI
  - Added confirmation dialogs for type changes
- **Date Fixed**: 2025-07-29

### Bug #14: Unresponsive 'Return to Confirmed' Button
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [ ] High [ ] Critical
- **Description**: The 'Return to Confirmed' (確定に戻す) button does not respond when clicked after check-in. This appears to be related to the PrimeVue ConfirmDialog implementation.
- **Steps to Reproduce**:
  1. Check in a reservation
  2. Click on the 'Return to Confirmed' (確定に戻す) button
  3. Observe that no confirmation dialog appears and no action is taken
- **Expected Behavior**: A confirmation dialog should appear, and upon confirmation, the reservation status should change back to 'Confirmed'.
- **Actual Behavior**: No response when clicking the button.
- **Environment**: Reservation management interface, PrimeVue components
- **Resolution**: Fixed by ensuring the correct ConfirmDialog instance ('recovery' group) is used for the confirmation dialog. The issue was caused by a mismatch between the dialog group in the template and the one referenced in the code.
- **Date Fixed**: 2025-07-29

## July 23, 2025

### Bug #23: OTA Reservation Transaction Issue
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: OTA reservations were not wrapped inside a database transaction. As a result, when multiple OTA reservation requests were processed, reservations without errors could be registered multiple times in the system, leading to duplicate bookings.
- **Steps to Reproduce**:
  1. Make an OTA reservation with valid data.
  2. Trigger multiple reservation requests in parallel or in quick succession.
  3. Observe that the same reservation is registered more than once.
- **Expected Behavior**: Each reservation should be registered only once, and all operations should be atomic to prevent duplicates.
- **Actual Behavior**: Multiple identical reservations are created if requests are processed simultaneously.
- **Environment**: OTA integration
- **Additional Notes**: Ensure all reservation creation logic is wrapped in a transaction to maintain data integrity.

### Bug #24: Addon Quantity Calculation Issue
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [ ] High [ ] Critical
- **Description**: The quantity of addons for a reservation was calculated based on the total number of people in the reservation, instead of the number of people per room. This caused incorrect addon quantities when multiple rooms were booked under a single reservation.
- **Steps to Reproduce**:
  1. Create a reservation with multiple rooms and different numbers of people per room.
  2. Add an addon to the reservation.
  3. Observe that the addon quantity is based on the total reservation people, not per-room people.
- **Expected Behavior**: Addon quantity should be calculated based on the number of people in each room, not the total across all rooms.
- **Actual Behavior**: Addon quantity is based on the total reservation people, leading to over- or under-counts.
- **Environment**: OTA and reservation system
- **Additional Notes**: Calculation logic should be revised to use per-room people counts when determining addon quantities.

### Bug #12: PrimeVue ConfirmDialog Not Closing After Actions
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [ ] Medium [ ] High [ ] Critical
- **Description**: The PrimeVue ConfirmDialog in the ReservationPayments component did not close automatically after adding or deleting a payment, causing the dialog to remain visible and confuse users. This was fixed by programmatically closing the dialog after the action.
- **Steps to Reproduce**:
  1. Attempt to add or delete a payment in the ReservationPayments component
  2. Confirm the action in the dialog
  3. Observe that the dialog remains open after the action is completed
- **Expected Behavior**: The confirmation dialog should close automatically after the action is performed
- **Actual Behavior**: The dialog remained visible after the action
- **Environment**: ReservationPayments.vue, PrimeVue ConfirmDialog
- **Resolution**: Implemented programmatic closing of the dialog after successful action completion
- **Date Fixed**: 2025-07-23
- **Additional Notes**: This issue may affect other Confirm dialogs in the system and should be checked throughout the application

## December 19, 2024

### Bug #1: Calendar View Scroll Position Doesn't Reset on Date Change
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Calendar View scroll position doesn't reset when date is changed
- **Steps to Reproduce**: 
  1. Open calendar view
  2. Scroll down to view content lower in the page
  3. Change/update the date selection
  4. Observe that the date range updates but scroll position remains at the previous location

### Bug #2: Calendar View Needs Visual Lines/Borders
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Calendar View needs visual lines/borders in room cells for better visibility
- **Steps to Reproduce**: 
  1. Open calendar view
  2. Look at the room cells/rows
  3. Observe that there are no clear visual separators between rooms
- **Expected Behavior**: Room cells should have visible lines/borders to clearly separate and identify different rooms
- **Actual Behavior**: Room cells lack visual boundaries, making it difficult to distinguish between different rooms
- **Resolution**: Added visual lines/borders to room cells to improve visibility and distinguish between different rooms
- **Date Fixed**: December 19, 2024
- **Additional Notes**: Visual clarity of the calendar view has been improved as requested.
