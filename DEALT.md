# Resolved Issues

This document contains all fixed and closed issues that were previously tracked in BUGS.md.

## December 19, 2024

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
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
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

### Bug #X: OTA Reservation Transaction Issue
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

### Bug #Y: Addon Quantity Calculation Issue
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: The quantity of addons for a reservation was calculated based on the total number of people in the reservation, instead of the number of people per room. This caused incorrect addon quantities when multiple rooms were booked under a single reservation.
- **Steps to Reproduce**:
  1. Create a reservation with multiple rooms and different numbers of people per room.
  2. Add an addon to the reservation.
  3. Observe that the addon quantity is based on the total reservation people, not per-room people.
- **Expected Behavior**: Addon quantity should be calculated based on the number of people in each room, not the total across all rooms.
- **Actual Behavior**: Addon quantity is based on the total reservation people, leading to over- or under-counts.
- **Environment**: OTA and reservation system
- **Additional Notes**: Calculation logic should be revised to use per-room people counts when determining addon quantities.

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

## July 29, 2025

### Feature Request #16: Configurable Reservation Inquiry Button
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

## August 5, 2025

### Bug #12: PrimeVue ConfirmDialog Not Closing After Actions
- **Status**: [ ] Open [ ] In Progress [x] Fixed [x] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: The PrimeVue ConfirmDialog in the ReservationPayments component did not close automatically after adding or deleting a payment, causing the dialog to remain visible and confuse users. This was fixed by programmatically closing the dialog after the action.
- **Steps to Reproduce**:
  1. Attempt to add or delete a payment in the ReservationPayments component
  2. Confirm the action in the dialog
  3. Observe that the dialog remains open after the action is completed
- **Expected Behavior**: The confirmation dialog should close automatically after the action is performed
- **Actual Behavior**: The dialog remained visible after the action
- **Environment**: ReservationPayments.vue, PrimeVue ConfirmDialog
- **Resolution**: Implemented programmatic closing of the dialog after successful action completion
- **Date Fixed**: August 5, 2025
- **Additional Notes**: This issue may affect other Confirm dialogs in the system and should be checked throughout the application
