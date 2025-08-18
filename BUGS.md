# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system that are currently open or in progress.

## Bug and Requests

### August 13, 2025

#### Feature Request #33: Editable Receipts with Version History
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: 
  - Allow editing of 領収書 (receipts) after they have been issued
  - Implement a version control system to track all changes made to receipts
  - Each edit should create a new version while preserving previous versions
  - Version history should be accessible and show:
    - Timestamp of each version
    - User who made the changes
    - Specific fields that were modified
  - System should allow comparison between different versions
  - Option to revert to a previous version if needed
- **Additional Notes**:
  - Important for audit trails and compliance
  - Should include a clear indication of the current active version
  - Consider adding a reason field for modifications
  - Ensure all versions remain accessible in the system even if not visible in the main interface

### August 8, 2025

#### Feature Request #27: Cash Payment Indicator in Room Indicator
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Add a visual indicator in the Room Indicator to show if clients are paying by cash for the facility
  - This will help staff quickly identify which guests are using cash payments
- **Implementation Requirements**:
  - Add a cash payment icon or indicator in the Room Indicator component
  - Ensure the indicator is clearly visible but not intrusive
  - Consider adding a tooltip or hover state for additional payment details
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should be consistent with existing UI/UX patterns
  - Consider accessibility for the new indicator

#### Feature Request #28: Dedicated Meal Count Page
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Currently, meal count data is only available through export functionality
  - Add a dedicated page to view meal counts directly in the application
  - This will provide better accessibility for local staff who need to check meal counts regularly
- **Implementation Requirements**:
  - Create a new Meal Count page in the application
  - Display meal counts in a clean, filterable table format
  - Include date range filters similar to the export functionality
  - Option to still export the data if needed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should maintain the same data accuracy as the export functionality
  - Consider adding quick view options for common date ranges (today, this week, etc.)
  - Ensure the page is mobile-responsive for on-the-go access

#### Feature Request #31: Export 宿泊者名簿 (Guest List) by Check-in Date
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Add functionality to export the 宿泊者名簿 (Guest List/Register) directly from the Room Indicator
  - Export should be filterable by check-in date
  - Include all available pre-filled guest information in the export
- **Implementation Requirements**:
  - Add an export button in the Room Indicator interface
  - Allow selection of date range for the export
  - Include all available guest information (name, nationality, passport details, etc.)
  - Support common export formats (PDF, Excel, CSV)
  - Pre-fill any available guest information from the reservation
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should match the official 宿泊者名簿 format requirements
  - Consider adding a preview function before exporting
  - Ensure data privacy and protection of sensitive guest information

### August 6, 2025

#### Feature Request #26: Bulk Room Cancellation in 一括編集 (2025/08/06)
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Currently, users can cancel individual days in a reservation
  - Add functionality to cancel an entire room using the 一括編集 (Bulk Edit) button
- **Implementation Requirements**:
  - Add a "Cancel Entire Room" option in the bulk edit menu
  - Show confirmation dialog before cancellation
  - Update the reservation status and UI to reflect the cancellation
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Additional Notes**:
  - This will provide a more efficient workflow for staff when needing to cancel an entire room's reservation
  - Should maintain consistency with the existing cancellation workflow for individual days

### July 31, 2025

#### Feature Request #19: Enhanced Log Viewing
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Improve log viewing to include:
  - Plans and addons changes
  - Room number changes
  - Client information modifications
- **Priority**: [ ] Low [x] Medium [ ] Critical
- **Additional Notes**: This will help with auditing and tracking changes in the system.

#### Feature Request #35: Room Type Change Confirmation in Free Move Mode
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

#### Feature Request #10: Part-time Staff Dashboard
- **Status**: [ ] Open [x] In Progress [ ] Fixed [ ] Closed
- **Description**: Create a page for part-time staff that displays only limited, essential information in a defined format, focusing on:
  - Number of guests checking in/out
  - Payment information (amount and method)
  - Important comments or special requests
  - Room numbers and status
- **Implementation Requirements**:
  - Simple, clean interface with clear data presentation
  - Filter by date range (default to current day)
  - Quick view of totals for check-ins/check-outs
  - Option to print or export the daily report
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should be easily readable at a glance
  - Include visual indicators for special cases (e.g., VIP, special requests)
  - Ensure sensitive information is appropriately restricted

#### Feature Request #12: Calendar Visual Indicators for Room Flexibility
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

### July 24, 2025

#### Feature Request #15: Plan Display Order and Categories
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Allow setting the display order of plans
  - Enable configuration of facility display order in dropdowns
  - Implement global plan categories and organize hotel plans by room type
  - **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
  - **Additional Notes**: This is part of the plan management system revamp to improve plan organization and selection.

### July 15, 2025

#### Feature Request #14: Fax Sending Functionality via Reservation Panel
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: Add a function to send fax (via email) to the client through the reservation Panel splitbutton.
- **Steps to Reproduce**:
  1. Open the reservation Panel.
  2. Use the splitbutton for reservation actions.
  3. Select the new 'Send Fax' option.
- **Expected Behavior**: The system should allow sending a fax (via email gateway) to the client directly from the reservation panel.
- **Actual Behavior**: This functionality does not currently exist.
- **Environment**: 
- **Additional Notes**: Useful for quickly sending reservation confirmations or details to clients who require fax communication.

#### Feature Request #16: Room Type Hierarchy for Systematic Upgrades
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

---

*Last Updated: August 18, 2025*
*Total Bugs: 0* (last one #36)
*Total Feature Requests: 12* (last one #35)