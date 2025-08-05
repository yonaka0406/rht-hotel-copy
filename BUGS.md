# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system that are currently open or in progress.

## Bug Reports

### July 31, 2025

#### Bug #20: Billable Status Not Updated When Adding Rooms to Confirmed Reservations
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
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

#### Feature Request #18: Parking Management Function
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Add functionality to manage parking spaces and assignments for guests.
- **Requirements**:
  - Track available parking spaces
  - Assign parking spots to reservations
  - Generate parking reports
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Feature Request #19: Enhanced Log Viewing
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Improve log viewing to include:
  - Plans and addons changes
  - Room number changes
  - Client information modifications
- **Priority**: [ ] Low [x] Medium [ ] Critical
- **Additional Notes**: This will help with auditing and tracking changes in the system.

#### Feature Request #20: Client-based Meal Count Report
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Create a new report that shows meal counts grouped by client instead of by date.
- **Requirements**:
  - User will provide the specific format
  - Should be exportable to common formats (CSV, Excel)
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Bug #3 / Feature Request
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: When a room change is made in フリー移動 (Free Move) mode and the room type changes, show a confirmation prompt summarizing the change before applying it.
- **Steps to Reproduce**:
  1. Enter フリー移動 (Free Move) mode in the calendar view.
  2. Change a reservation to a room with a different room type.
  3. Observe that no confirmation is currently shown.
- **Expected Behavior**: If the room type changes during a free move, a confirmation dialog should appear, summarizing the old and new room types, and only proceed if the user confirms.
- **Actual Behavior**: No confirmation is shown; the change is applied immediately.
- **Environment**: 
- **Additional Notes**: This is to prevent accidental room type changes during free move operations. Spec created at `.kiro/specs/room-change-confirmation/`.

#### Feature Request #10
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Create a page for part-time staff that displays only limited, essential information in a defined format, such as in/out clients and rooms for the week.
- **Steps to Reproduce**:
  1. Log in as a part-time staff member.
  2. Access the dedicated part-time staff page.
  3. View a simple, clear list of clients/rooms checking in and out for the week.
- **Expected Behavior**: Part-time staff see only the information they need (e.g., in/out clients and rooms for the week) in a clear, defined format.
- **Actual Behavior**: No such dedicated page currently exists.
- **Environment**: 
- **Additional Notes**: This will help part-time staff focus on their tasks without being overwhelmed by unnecessary details. Spec created at `.kiro/specs/part-time-staff-dashboard/`.

#### Feature Request #12
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Add indicators in the calendar view for (1) clients who can have their room moved, and (2) clients who do not have a preference for room type. These indicators should be easily visible in the calendar.
- **Steps to Reproduce**:
  1. Open the calendar view.
  2. Look for reservations with clients who can have their room moved or have no room type preference.
- **Expected Behavior**: There are clear, easily visible indicators in the calendar for these two client types.
- **Actual Behavior**: No such indicators currently exist.
- **Environment**: 
- **Additional Notes**: This will help staff quickly identify flexible clients and optimize room assignments. Spec created at `.kiro/specs/calendar-visual-indicators/`.

### July 21, 2025

#### Bug #13
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
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

### July 15, 2025

#### Feature Request #14
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add a function to send fax (via email) to the client through the reservation Panel splitbutton.
- **Steps to Reproduce**:
  1. Open the reservation Panel.
  2. Use the splitbutton for reservation actions.
  3. Select the new 'Send Fax' option.
- **Expected Behavior**: The system should allow sending a fax (via email gateway) to the client directly from the reservation panel.
- **Actual Behavior**: This functionality does not currently exist.
- **Environment**: 
- **Additional Notes**: Useful for quickly sending reservation confirmations or details to clients who require fax communication.

#### Feature Request #16
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: Implement a room type hierarchy to systematically identify upgrades and support business logic for OTA reservations. When a requested room type is unavailable, the system should be able to upgrade the client based on the hierarchy. 
- **Steps to Reproduce**:
  1. Receive an OTA reservation for an unavailable room type.
  2. System should identify possible upgrades using the room type hierarchy.
- **Expected Behavior**: Room upgrades are handled systematically.
- **Actual Behavior**: No room type hierarchy.
- **Environment**: OTA integration, PMS import logic
- **Additional Notes**: This will prevent duplicate reservations and improve upgrade handling.

---

## Bug Status Legend
- **Open**: Bug reported, not yet assigned
- **In Progress**: Bug is being worked on
- **Fixed**: Bug has been resolved, pending verification
- **Closed**: Bug has been verified as fixed

## Priority Levels
- **Low**: Minor issue, doesn't affect core functionality
- **Medium**: Noticeable issue, affects user experience
- **High**: Significant issue, affects core functionality
- **Critical**: Blocking issue, prevents system from working properly

### August 4, 2025

#### Feature Request #25: Show OTA Queue Table
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
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

---

*Last Updated: August 4, 2025*
*Total Bugs: 3*
*Total Feature Requests: 10*

# Backlog

The following bugs and feature requests are not yet completed (status: Open or In Progress):

#### Bug #3 / Feature Request
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: When a room change is made in フリー移動 (Free Move) mode and the room type changes, show a confirmation prompt summarizing the change before applying it.

#### Feature Request #10
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: Create a page for part-time staff that displays only limited, essential information in a defined format, such as in/out clients and rooms for the week.

#### Feature Request #12
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: Add indicators in the calendar view for (1) clients who can have their room moved, and (2) clients who do not have a preference for room type.

#### Feature Request #14
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Add a function to send fax (via email) to the client through the reservation Panel splitbutton. 

#### Feature Request #15: Plan Display Order and Categories (2025/07/24)
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Allow setting the display order of plans
  - Enable configuration of facility display order in dropdowns
  - Implement global plan categories and organize hotel plans by room type
  - **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
  - **Additional Notes**: This is part of the plan management system revamp to improve plan organization and selection.

#### Feature Request #17: Show Guest Name for OTA Reservations in Calendar (2025/07/29)
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Currently, the calendar shows the booker's name for all reservations
  - For OTA reservations, show the name of the actual guest(s) instead
  - **Implementation Considerations**:
    - Need to verify if OTA API provides guest names
    - Handle cases with multiple guests (show primary guest or all names?)
    - Consider adding a fallback to booker name if guest name is unavailable
  - **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
  - **Additional Notes**:
    - This will help staff quickly identify actual guests rather than seeing the OTA's booking reference name
    - Need to investigate what guest information is currently being captured from OTA bookings
