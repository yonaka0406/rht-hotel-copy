# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system that are currently open or in progress.

## Bug and Requests

### August 25, 2025

#### Feature Request #44: Customize Room Assignment Order by Hotel
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Allow customization of the room assignment order for each hotel
  - Enable specific room assignment sequences (e.g., assign room 227 before 201 for a specific hotel)
  - Support different assignment orders for different hotels
- **Key Features**:
  - Hotel-specific room assignment order configuration
  - Drag-and-drop interface for setting room priority
  - Default assignment order for hotels without custom configuration
  - Clear visual indication of the current assignment order
- **Implementation Requirements**:
  - Create a new configuration section in the admin panel for room assignment order
  - Store hotel-specific room priorities in the database
  - Update the auto-assignment logic to respect the configured order
  - Add validation to prevent duplicate or invalid room assignments
  - Include an option to reset to default order
- **UI/UX Considerations**:
  - Intuitive drag-and-drop interface for reordering rooms
  - Visual preview of the current assignment order
  - Ability to test the assignment order
  - Clear documentation of the assignment logic
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Initial request is for Kushiro hotel 2F (rooms 227 before 201)
  - Should be extensible for other hotels and floors
  - Consider adding bulk import/export for room order configurations
  - Ensure the system handles cases where configured rooms are unavailable

#### Bug #46: Duplicate Checkout Indicator in Room Status
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - When a reservation has 2 rooms, the checkout indicator is shown twice in the room status display
  - This creates confusion about the actual number of checkouts
- **Reproduction Steps**:
  1. Create a reservation with 2 rooms
  2. Check the room status/indicator display
  3. Observe duplicate checkout indicators
- **Expected Behavior**:
  - Should show only one checkout indicator per reservation
  - The indicator should clearly represent the total number of checkouts
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Issue appears to be in the frontend display logic
  - May affect reporting accuracy if indicators are being counted
  - Check if this occurs with more than 2 rooms as well

### August 22, 2025

#### Feature Request #41: Parking Inventory Check in Reservation Inquiry
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add parking space availability information to the reservation inquiry screen
  - Help staff quickly check parking allocation without leaving the reservation view
- **Key Features**:
  - Display current parking space allocation status
  - Show remaining parking capacity
  - Visual indicators for parking availability (e.g., color-coded)
- **Implementation Requirements**:
  - Add parking inventory display to the reservation inquiry view
  - Ensure real-time updates of parking availability
  - Include parking information in relevant reservation exports
  - Add appropriate access controls for viewing parking information
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Feature Request #40: Temporary Blocking with Notes
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Currently, temporary blocks only show the name of the person who created the block
  - Need to enhance this to include additional notes for better communication
- **Key Features**:
  - Add an optional notes field to the temporary block creation form
  - Display both the creator's name and any additional notes in the calendar view
  - Include the notes in the Notifications Drawer for better visibility
- **Implementation Requirements**:
  - Update the temporary block creation form to include an optional notes field
  - Modify the calendar display to show:
     - Creator's name (as currently shown)
     - Any additional notes (if provided)
  - Update the Notifications Drawer to display the notes for temporary blocks
  - Show notes as tooltips or in the event details view
  - Include notes in relevant exports and reports
- **UI/UX Considerations**:
  - Keep the creator's name visible at all times
  - Show notes on hover or in an expanded view
  - Ensure the interface remains clean and uncluttered
  - In the Notifications Drawer, display the notes in a clear and readable format
  - Consider adding a visual indicator when a temporary block has additional notes
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical

#### Feature Request #39: Reservation List Search Enhancements
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Enhance the existing date range search in the reservation list to support different search types
  - Replace the static "滞在期間選択：" label with a dropdown for selecting search criteria
- **Key Features**:
  1. **Search Type Selection**
     - Dropdown with options:
       - 滞在期間 (Stay Period)
       - チェックイン日 (Check-in Date)
       - 作成日 (Creation Date)
     - Default selection: 滞在期間 (to maintain current behavior)
  2. **Date Range Picker**
     - Dynamic label updates based on selected search type
     - Support for single date or date range selection
     - Quick select options (Today, This Week, This Month, etc.)
- **Implementation Requirements**:
  - Replace the current static label with a dropdown component
  - Update the date picker behavior based on the selected search type
  - Ensure the search updates in real-time when either the search type or dates change
  - Make the search criteria persist across page navigation
  - Update any relevant API endpoints to handle the new search parameters
- **UI/UX Considerations**:
  - Place the dropdown immediately to the left of the date picker
  - Ensure the dropdown is clearly labeled
  - Add a small help icon explaining the different search types
  - Make the control responsive for different screen sizes
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Feature Request #38: Quote Creator System
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Currently using spreadsheets for creating and sending quotes to clients
  - Need a dual-purpose system:
    1. Quick calculation tool for phone/instant quotes
    2. Formal invoice generation based on 'hold' reservations
  - Should allow conversion of quotes to actual reservations
- **Key Features**:
  - **Quick Quote Mode**:
    - Fast, simplified interface for instant quotes
    - Basic room rate calculations with common add-ons
    - Save as draft or convert to formal quote
  - **Formal Quote/Invoice Mode**:
    - Detailed quote creation with full customization
    - Integration with 'hold' reservations
    - Professional PDF generation with company branding
  - **Common Features**:
    - Save and manage multiple quote versions
    - Track quote status (draft, sent, viewed, accepted, expired)
    - Convert quotes to reservations with one click
    - Email quotes directly to clients
- **Implementation Requirements**:
  - Two distinct but integrated interfaces (quick quote vs. formal quote)
  - Template system for different quote formats and purposes
  - Integration with existing room rates, inventory, and reservation system
  - Email notification system for quote updates
  - Dashboard to track all quotes and their statuses
  - Reporting on quote conversion rates
- **Technical Considerations**:
  - Ensure data consistency with existing reservation system
  - Implement proper access controls for sensitive pricing information
  - Support for multiple languages and currencies
  - PDF generation with proper formatting
  - Responsive design for use on different devices
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should maintain history of all quote versions
  - Include expiration dates for quotes
  - Allow for discounts and special pricing
  - Integration with customer management system
  - Quick quote mode should be accessible with minimal clicks
  - Formal quotes should support detailed terms and conditions

#### Feature Request #37: Selective Date Range for Room Bulk Cancellation
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Currently, the room bulk cancellation feature cancels all days for the selected room
  - Need to add the ability to select a specific date range for cancellation
  - Will implement a date range picker to select start and end dates
- **Implementation Requirements**:
  - Add a date range picker component to select start and end dates
  - Include a "Select All" option to maintain current behavior (cancel all dates)
  - Show a visual calendar view with the selected range highlighted
  - Update the confirmation dialog to clearly show the exact date range being cancelled
  - Display the number of nights being cancelled in the confirmation dialog
- **Technical Considerations**:
  - Ensure the backend can handle partial date range cancellations
  - Validate that the selected date range falls within the reservation period
  - Update any affected calculations (e.g., cancellation fees, revenue reports)
  - Maintain existing transaction handling and error recovery
  - Ensure proper handling of timezone differences
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Additional Notes**:
  - The date range picker should be intuitive and prevent invalid selections
  - Consider adding a summary of the changes before final confirmation
  - Should work consistently with the existing bulk cancellation functionality
  - Include clear visual feedback for the selected date range

#### Feature Request #36: Display Cancellation Fee Application Date for Long-term Reservations
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: For long-term reservations (30 days or more), implement a cancellation fee calculator and display the cancellation fee application date (キャンセル料発生日).
- **Implementation Details**:
  - **Trigger**: Applies to reservations of 30+ nights
  - **Calculation**: 
    - `Cancellation Fee Date = Stay Start Date - 30 days`
    - For partial cancellations: Calculate based on the specific dates being cancelled
  - **UI Components**:
    1. **Reservation Overview**:
       - Show dynamic message based on current date: 
         - If before cancellation period: "If cancelled before [date], no fee applies"
         - If within cancellation period: "If cancelled today, Cancel Fee will apply for the period from [start_date] to [end_date]"
       - Visual indicator (red text/icon) when within cancellation fee period
       - Hover tooltip explaining the 30-day rule

    2. **Cancellation Calculator**:
       - Date picker to select cancellation date
       - Dynamic message showing: "If cancelled on [selected_date], Cancel Fee will apply for the period from [start_date] to [end_date]"
       - Clear display of:
         - Total nights being cancelled
         - Total cancellation fee amount
         - Breakdown of fees by date range if applicable

  - **Example Scenarios**:
    - 90-day reservation (Jan 1 - Mar 31):
      - Full cancellation: "Cancel Fee Applies From: Dec 2"
      - Partial cancellation (last 20 days in March):
        - If cancelled before Feb 1: No fee
        - If cancelled Feb 1-28: Partial fee for affected days
        - If cancelled after Mar 1: Full fee for all 20 days

- **Technical Considerations**:
  - Handle timezone differences for accurate date calculations
  - Support partial cancellations with prorated fees
  - Consider edge cases (month/year boundaries, leap years, DST)
  - Cache calculation results for better performance

- **Acceptance Criteria**:
  - [ ] Display cancellation fee date for reservations ≥30 nights
  - [ ] Implement cancellation calculator in Reservation Panel
  - [ ] Show clear explanation of fee calculations
  - [ ] Handle partial cancellations with prorated fees
  - [ ] Support all date/time formats used in the system
  - [ ] Include tests for various reservation lengths and scenarios

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

#### Feature Request #27: Payment Timing Indicator in Reservation Panel
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - Add a payment timing indicator in the Reservation Panel to show the payment method (前払い, 現地清算, 後払い)
  - This field must be set before a reservation can be confirmed
  - Helps staff quickly identify payment arrangements for each reservation
- **Implementation Requirements**:
  - Add a required dropdown/selector in the Reservation Panel with options:
    - 前払い (Prepaid)
    - 現地清算 (Pay at property)
    - 後払い (Postpaid)
  - Make this field mandatory when changing reservation status to 'confirmed'
  - Add visual indicator (icon + text) in the reservation overview
  - Include a tooltip or help text explaining each payment timing option
  - **Display a cash payment icon in the Room Indicator when 現地清算 is selected**
    - Icon should be clearly visible but not intrusive
    - Add hover state showing "現地清算 (Pay at property)" as tooltip
- **Validation Rules**:
  - Field must be set before confirming a reservation
  - Field should be editable until the reservation is checked in
  - Changes to this field after confirmation should be logged
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should be consistent with existing UI/UX patterns
  - Consider accessibility for the new indicator
  - Add appropriate validation messages if the field is missing during confirmation
  - Include this field in reservation exports and reports
  - The cash payment icon should update in real-time when the payment timing is changed

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

*Last Updated: August 25, 2025*
*Total Bugs: 3* (last one #47)
*Total Feature Requests: 19* (last one #44)