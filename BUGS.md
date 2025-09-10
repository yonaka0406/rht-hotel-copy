# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system that are currently open or in progress.

## Bug and Requests

### September 10, 2025

#### Feature Request #60: Meal Count Display for Easy Copy-Paste
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Currently, meal counts are only visible when exporting to Excel
  - Add a dialog that shows meal count information in a text format that can be easily copied and pasted into Slack
- **Requirements**:
  - Add a new button/option to display meal count summary in a dialog
  - Format the text in a clear, copy-paste friendly way for Slack
  - Include date range, meal types, and counts
  - Add a "Copy to Clipboard" button for easy sharing
- **Affected Components**:
  - Meal management UI
  - Report generation components
  - Frontend dialog components
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Feature Request #61: 清掃機能 (Cleaning Management)
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - New cleaning management page needed
  - Requirements gathering in progress
  - More details to be confirmed
- **Requirements**:
  - [ ] Define cleaning status tracking needs
  - [ ] Determine required cleaning task types
  - [ ] Identify necessary user roles and permissions
  - [ ] Specify room status transitions
  - [ ] Clarify reporting requirements
- **Questions to Resolve**:
  - What cleaning statuses need to be tracked?
  - What information should be visible on the cleaning dashboard?
  - Are there different cleaning types (e.g., stayover, checkout, deep clean)?
  - How should cleaning assignments be managed?
  - What notifications or alerts are needed?
- **Affected Components**:
  - New cleaning management UI
  - Room status management
  - Housekeeping workflow
- **Priority**: [ ] Low [ ] Medium [ ] High [ ] Critical

#### Feature Request #62: Check-in/Out Statistics with Gender Breakdown
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add a report showing the number of clients checking in and out within a specified date range
  - Include gender breakdown for both check-ins and check-outs
  - Provide both numerical counts and percentage breakdowns
- **Requirements**:
  - Date range selector for filtering data
  - Summary cards showing total check-ins and check-outs
  - Gender breakdown (Male/Female/Other/Not Specified)
  - Option to view data in table format
  - Export functionality (CSV/Excel)
- **Data Points to Include**:
  - Total check-ins/check-outs
  - Gender distribution
  - Daily breakdown within selected period
  - Comparison metrics (e.g., vs previous period)
- **Affected Components**:
  - Reports module
  - Analytics dashboard
  - Database queries for guest statistics
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

### September 9, 2025

#### Feature Request #59: 宿泊プラン別の稼働率・売上内訳 (Occupancy and Sales Breakdown by Plan)
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add a detailed breakdown of occupancy rates and sales by different room plans
  - This will help in analyzing which plans are most profitable and popular
- **Requirements**:
  - Group occupancy data by room plan types
  - Show both count of rooms sold and revenue per plan
  - Include percentage breakdown of total occupancy by plan
  - Option to filter by date range
  - Export functionality for the breakdown data
- **Affected Components**:
  - Reports module
  - Analytics dashboard
  - Database queries for plan-based metrics

### September 8, 2025

#### Feature Request #58: セルフチェックイン案内済のマーク (Self-Check-in Notification Mark)
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add a visual indicator to show when a guest has been sent self-check-in instructions
  - This will help staff quickly identify which guests have already received check-in information
- **Requirements**:
  - Add a clear, visible mark (e.g., icon or badge) next to guest names or in the reservation details
  - The mark should be easily noticeable but not intrusive
  - Include a tooltip or hover text indicating when the self-check-in instructions were sent
  - Consider adding the ability to toggle this status from the reservation interface
- **Affected Components**:
  - Reservation list view
  - Guest details panel
  - Reservation details dialog
  - Any related database fields for tracking self-check-in status
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical

#### Bug #57: 宿泊者名簿 Name Order Consistency and Address Display
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - The 宿泊者名簿 (Guest List) dialog is not consistently displaying names in the correct order (name_kanji, name_kana, name)
  - This inconsistency can cause confusion and affect the professional appearance of exported documents
  - Address fields for 宿泊者 (guests) are not being properly filled in the guest list
- **Requirements**:
  - Ensure the name fields are consistently displayed in the order: name_kanji, name_kana, name
  - Verify the order is maintained in both the dialog display and any exported files
  - Add input validation to prevent empty or incorrectly formatted names
  - Update any related tooltips or help text to clarify the expected name format
  - Ensure all address fields (postal_code, address1, address2, city, prefecture, country) are properly included in the guest list
  - Validate that address information is correctly mapped from the guest profile to the guest list
- **Affected Components**:
  - Guest List dialog component
  - Name and address display components in the reservation interface
  - Any related export functionality for guest lists
  - Guest profile data mapping logic
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Bug #53: 宿泊者名簿 Should Use payment_timing Field for 現地決済
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - The 宿泊者名簿 (Guest List) dialog's 現地決済 (On-site Payment) field should be determined by the `payment_timing` field from the reservations table
  - Currently, the payment timing information is not being properly reflected in the guest list dialog
- **Affected Component**: 
  - `frontend/src/pages/MainPage/components/ReservationRoomsView.vue`
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical

#### Feature Request #56: Room Indicator 平日/土日 プラン表記
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add visual indicators to room displays showing whether the current rate is based on 平日 (weekday) or 土日 (weekend/holiday) pricing
  - This will help staff quickly identify which rate plan is being applied to each room
- **Requirements**:
  - Add clear visual indicators (e.g., "平日" or "土日") next to or as part of the room rate display
  - Consider using different colors or icons to distinguish between weekday and weekend rates
  - Ensure the indicator is visible but not overwhelming in the room display
  - Update any relevant tooltips or hover states to include rate plan information
- **Affected Components**:
  - Room indicator component(s) in the reservation/room management interface
  - Rate display components
  - Any related styling for rate displays
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Feature Request #55: Display Booker and Client in Room Indicator
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Enhance the room indicator to show both the booker's name and the client's name who is staying in the room
  - This will help staff quickly identify both who made the booking and who is actually staying in the room
- **Requirements**:
  - Update the room indicator UI to accommodate both names
  - Consider using a format like "Booker: [Name] | Guest: [Name]" or similar
  - Ensure the text remains readable in the available space
  - Add tooltips for full names if truncated
- **Affected Components**:
  - Room indicator component(s) in the reservation/room management interface
  - Any related styling for the room indicators
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

#### Feature Request #54: 団体用名簿 (Group Guest List) Export
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add functionality to generate a single guest list file for all rooms in a reservation at once
  - This will be particularly useful for group reservations where multiple rooms are booked under the same reservation
- **Requirements**:
  - Create a new "Export Group Guest List" button/option in the reservation interface
  - Combine guest information from all rooms in the reservation into a single file
  - Include all necessary guest details in the exported file
  - Support common export formats (PDF, Excel, CSV)
- **Affected Component**:
  - `frontend/src/pages/MainPage/components/ReservationRoomsView.vue`
  - Backend API endpoints for guest list generation
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

### September 5, 2025

#### Feature Request #52: Slack Integration for Reservation Updates
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Integrate the PMS with Slack to automatically send real-time notifications about reservation updates
  - This will improve team communication and ensure staff are immediately aware of important reservation changes
- **Requirements**:
  - Create a Slack app and obtain necessary API credentials
  - Configure webhook integration with the PMS
  - Send notifications for key reservation events (new bookings, modifications, cancellations, check-ins, check-outs)
  - Include relevant reservation details in notifications (guest name, dates, room type, special requests)
- **UI/UX Considerations**:
  - Add Slack configuration section in admin settings
  - Allow customization of notification preferences (which events trigger notifications)
  - Enable/disable notifications per channel or user
  - Include deep links back to the reservation in the PMS
- **Implementation Details**:
  - Use Slack's Web API for sending messages
  - Implement rate limiting and error handling for Slack API calls
  - Ensure secure storage of Slack credentials
  - Add logging for sent notifications
- **Priority**: [x] Low [ ] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Consider adding @mentions for specific staff members based on reservation details
  - Include option to test the Slack integration
  - Should support multiple Slack channels for different departments
  - Add message formatting with emojis for better readability

### September 4, 2025

#### Feature Request #51: Multi-Room Temporary Block
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add functionality to create temporary blocks for multiple rooms simultaneously from the "Add New Reservation" combo box
  - This will improve efficiency when needing to block multiple rooms at once for the same time period
- **Requirements**:
  - Add a "Temporary Block" option in the "Add New Reservation" dropdown
  - Allow selecting multiple rooms when creating a temporary block
  - Enable setting a single date range that applies to all selected rooms
  - Include an optional note field for the reason of the block
- **UI/UX Considerations**:
  - Add a checkbox or multi-select interface for room selection
  - Show a summary of selected rooms before confirming the block
  - Provide visual feedback for successfully created blocks
  - Allow quick modification of the block if needed
- **Implementation Details**:
  - Extend the existing temporary block functionality to handle multiple rooms
  - Ensure proper validation of room availability
  - Update the calendar view to clearly show temporary blocks
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should maintain existing temporary block features (duration, reason, etc.)
  - Consider adding a "Select All" option for rooms
  - Should work consistently with the existing room filtering system

### September 2, 2025

## Feature Request #50: Enhanced Calendar View for Client Visualization
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**: 
  - The current calendar view can be difficult to read when a single client has multiple or consecutive bookings.
  - The goal is to improve the visual representation of these bookings to be more like an existing Google Sheet view, which is clearer.
- **Suggested approaches**:
  - Adapt the current calendar to match the layout of the Google Sheet view.
  - Create a new, view-only page that mimics the Google Sheet.
  - Implement a "client highlight" function that visually groups bookings from the same client. For example, by making the cells thinner and only displaying the client's name once.
- **Key Features / Requirements**:
  - Client Grouping Logic:
    - Identify consecutive or overlapping reservations made by the same client.
  - Visual Representation (Client Highlight option):
    - Display the client's name only in the first reservation block of a group.
    - Subsequent blocks for the same client should be visually connected but condensed (e.g., thinner, without the repeated name).
    - Use a consistent color or border to link all parts of a single client's stay.
  - View Options:
    - Could be a new, dedicated view ("Client View", "Condensed View").
    - Alternatively, a toggle on the existing calendar to switch the highlight function on/off.
- **UI/UX Considerations**:
  - Hovering over a condensed block should reveal the full reservation details.
  - The visual grouping should be clear and intuitive, improving readability at a glance.
  - The feature should not negatively impact the performance of the calendar view.
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

### August 29, 2025

#### Feature Request #46: Reservation Consolidation
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Allow merging of separate reservations into a single reservation when certain conditions are met
  - Improve booking management by reducing the number of separate reservations for the same guest
- **Requirements**:
  - Only allow consolidation if the booker is the same for all reservations
  - Consolidation should be possible when:
    1. The check-in and check-out dates are identical, or
    2. The room is the same and the reservation periods are contiguous
  - All reservations being merged must be of the same type (e.g., cannot merge 'default' with 'employee' type)
  - If any reservation has an ota_reservation_id, all reservations must have the same ota_reservation_id to be merged
  - Preserve all reservation details and history during consolidation
  - Handle comment fields by concatenating them with clear separation
- **Implementation Details**:
  - Add a "Merge Reservations" option in the reservation management interface
  - Show visual indicators for reservations that can be consolidated
  - Validate all business rules before allowing consolidation (including type matching)
  - Update all related records and references to maintain data integrity, including:
    - reservation_details.reservation_id
    - reservation_payments.reservation_id    
  - Combine comments from all merged reservations with clear separation (e.g., "--- Merged from Reservation ID: [ID] ---")
- **UI/UX Considerations**:
  - Add a "Merge" button in the reservation panel that only appears when there are mergeable reservations
  - When clicked, open a dialog showing:
    - List of all mergeable reservations with key details (dates, room, status)
    - Preview of how the merged reservation will look
    - Editable comment field pre-filled with concatenated comments from all reservations
    - Option to edit/clean up the combined comment before confirming
  - Clear visual indicators for which reservations can be merged together
  - Preview of what the consolidated reservation will look like
  - Confirmation dialog showing all changes before applying consolidation
  - Option to undo the consolidation if needed
  - Loading state during the merge operation
  - Success/error notifications after the operation
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Additional Notes**:
  - Should handle various edge cases (different rates, special requests, etc.)
  - Consider impact on reporting and analytics
  - Ensure proper audit logging of consolidation actions

### August 22, 2025

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

*Last Updated: September 10, 2025*
*Total Bugs: 1* (last one #57)
*Total Feature Requests: 23* (last one #62)