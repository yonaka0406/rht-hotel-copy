# Bug Tracking Document

## Overview
This document tracks all reported bugs and issues in the RHT Hotel system that are currently open or in progress.

## Bug and Requests

### October 02, 2025

#### Feature Request #74: Daily Report Data Download
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add functionality to download Daily Report data showing confirmed stays by plan from current month to last reservation date.
- **Requirements**:
  - Show confirmed stays count by plan type
  - Date range: current month to last reservation
  - Include all hotels
  - Download options: CSV/Excel
  - Available in Reporting module
  - Support custom date ranges

### October 01, 2025

#### Feature Request #73: Client List Download
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical
- **Description**: Add functionality to download the complete client list from the CRM module.
- **Requirements**:
  - Handle large datasets efficiently (currently ~9,000 entries)
  - Include all client fields in the export
  - Provide download options: CSV and Excel formats
  - Add filters to customize the exported data
  - Include progress indicator for large exports
  - Add to the CRM module interface
  - Consider server-side processing for better performance
  - Implement rate limiting to prevent server overload

### September 26, 2025

#### Bug #70: Check-in/Check-out Date Update Issue for Multi-room Reservations
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical
- **Description**: 
  - When cancelling the first or last day of a reservation with multiple rooms, the check-in and check-out dates are not being updated correctly.
  - This affects the accuracy of stay duration and may cause issues with room availability and billing.
- **Steps to Reproduce**:
  1. Create a reservation with multiple rooms spanning several days
  2. Cancel the first day of the reservation
  3. Observe that the check-in date is not updated to reflect the new start date
  4. Similarly, cancelling the last day does not update the check-out date
- **Expected Behavior**:
  - When the first day is cancelled, the check-in date should update to the next available day
  - When the last day is cancelled, the check-out date should update to the previous day
  - These updates should be applied consistently across all rooms in the reservation
- **Affected Components**:
  - Reservation management system
  - Date calculation logic
  - Multi-room reservation handling
  - Billing system
- **Additional Notes**:
  - The issue appears to only affect reservations with multiple rooms
  - Single-room reservations handle the date updates correctly
  - This may be related to how the system tracks dates for each room in a multi-room reservation

### September 22, 2025

#### Feature Request #66: 宿泊者名簿 (Guest Roster) Direct Printing
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Enhance the guest roster functionality to be more user-friendly for non-technical staff
  - Instead of just downloading a PDF, provide a direct "Print" option that automatically formats and sends the roster to the printer
  - This will help staff who are not comfortable with computers to easily print the guest roster
- **Requirements**:
  - Add a prominent "Print Roster" button next to the existing download option
  - Create a print-optimized view of the guest roster
  - Automatically open the system's print dialog when clicking the print button
  - Include proper page breaks and formatting for A4 paper
  - Add hotel logo and contact information in the header
  - Ensure the print layout is clean and easy to read
  - Include date and time of printing in the footer
- **Data to Include**:
  - Guest name (as it appears on ID)
  - Room number and type
  - Check-in/check-out dates and times
  - Number of adults/children
  - Contact information
  - Special requests/notes
  - Total number of guests per room
- **Affected Components**:
  - Roster generation UI
  - Print layout templates
  - Report generation backend
- **Priority**: [ ] Low [ ] Medium [x] High [ ] Critical

### September 18, 2025

#### Feature Request #65: 耐用人数 (Capacity-based) Occupancy Indicator
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Currently, occupancy is measured based on room count only
  - Evaluate implementing a new performance metric based on 耐用人数 (total people capacity)
  - This would provide a more accurate measure of hotel utilization
- **Requirements**:
  - [ ] Analyze current occupancy calculation methods
  - [ ] Determine how to track and store people capacity per room
  - [ ] Design new occupancy calculation based on people capacity
  - [ ] Compare room-based vs people-based occupancy metrics
  - [ ] Determine if this should replace or complement existing occupancy metrics
  - [ ] Design UI to display the new metric
- **Benefits**:
  - More accurate measurement of hotel utilization
  - Better understanding of actual guest capacity usage
  - Potential for more dynamic pricing strategies
  - Improved resource allocation
- **Technical Considerations**:
  - Database schema changes may be needed to track room capacities
  - Historical data analysis for comparison
  - Impact on reporting and analytics
  - Performance implications for real-time calculations
- **Affected Components**:
  - Occupancy calculation logic
  - Reporting module
  - Analytics dashboard
  - Database schema (potential)
  - Reservation system
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

### September 10, 2025

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

#### Feature Request #63: Reservation Checklist and Room Indicator Integration
- **Status**: [x] Open [ ] In Progress [ ] Fixed [ ] Closed
- **Description**:
  - Add a visual checklist to track reservation-related tasks (e.g., self-check-in explained, ID verified, etc.)
  - Display checklist status in the room indicator for quick visual reference
  - Allow staff to update checklist items directly from the reservation panel
- **Requirements**:
  - Configurable checklist items per reservation type
  - Visual indicators (icons/colors) for each checklist item
  - Status summary in the room indicator (e.g., checkmark for completed, exclamation for pending)
  - Tooltip showing detailed checklist status on hover
  - Permission-based access to update checklist items
- **Checklist Items to Include**:
  - [ ] Self-check-in instructions provided
  - [ ] ID verification completed
  - [ ] Payment confirmed
  - [ ] Special requests addressed
  - [ ] Welcome message sent
- **Affected Components**:
  - Reservation management UI
  - Room indicator component
  - Database schema for storing checklist status
  - Backend API for checklist operations
- **Priority**: [ ] Low [x] Medium [ ] High [ ] Critical

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
- **Description**:
  - Improve log viewing to include:
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

*Last Updated: September 19, 2025*
*Total Bugs: 2* (last one #57)
*Total Feature Requests: 28* (last one #74)