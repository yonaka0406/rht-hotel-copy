# Changelog

All notable changes to the Hotel Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
## Unreleased

---
## Future Releases

### Planned Features
- Advanced reporting dashboard with customizable metrics
- Advanced analytics and business intelligence features

### Backlog

---

## [0.1.0] - 2025-02-21

### Added
- Calendar: Reservation calendar now color-coded by plan, similar to reservation inquiry. (#001)
- Reservation Edit: Employee stay index added. (#007)

## [0.2.0] - 2025-03-07

### Added
- Reservation Calendar: Warning design changed for drag-and-drop operations. (#009)
- Reservation Calendar: Date and room number font size increased. (#013)
- Date Selection: Primevue Japanese display and date range separation. (#015)
- Reservation: Ability to add/reduce rooms even for confirmed reservations. (#022)

### User Requests
- Reservation Edit: Date change method. (Partial solution) (#020)

## [0.3.0] - 2025-03-11

### Added
- Reservation Calendar: Room movement (exchange) for full rooms. (#010)
- Reservation Calendar: Grid lines for calendar. (#014)
- Reservation: Ability to drag-and-drop room changes during stay. (#021)
- Reservation Calendar: Vacancy count display. (#024)

## [0.4.0] - 2025-03-13

### Added
- Output: Reservation information and details can now be output as CSV. (#002)

## [0.5.0] - 2025-03-14

### Added
- Reservation Edit: Add-on details now reflected similarly to yadomaster. (#005)
- Reservation Edit: Display method changed for split room movements. (#006)
- Reservation: Ability to reactivate after cancellation. (#023)

## [0.6.0] - 2025-03-27

### Added
- New Reservation: Changed input method. (#016)

## [0.7.0] - 2025-03-28

### User Requests
- Reservation History: View update history and 担当者 (person in charge). (Partial solution) (#019)

## [0.8.0] - 2025-03-31

### Added
- New Reservation: Automatic adjustment of check-in and check-out dates. (#026)

## [0.9.0] - 2025-04-01

### Added
- Add-ons: Category settings and meal count output. (#025)

## [0.9.1] - 2025-04-07

### Added
- New Reservation: Duplicate reservation with same content. (Unresolved) (#003)
- New Reservation: Plan pattern settings. (#018)

### User Requests
- Reservation Edit: Maintain plan patterns when changing reservation period. (Partial solution) (#008)

## [0.9.2] - 2025-04-17

### Added
- Reservation Edit: Plan color-coding in reservation details. (#027)
- Customer: Select by phone number/email address. (#030)

## [0.9.3] - 2025-04-22

### Added
- Reservation Calendar: Temporary unassigned free room movement. (#028)
- PMS API: Google Sheets and PMS integration for reservation inquiry. (#029)

## [0.9.4] - 2025-05-15

### Added
- Notifications: Make alert notifications more prominent. (#031)

## [0.9.5] - 2025-05-28

### Added
- Function: Receipt issuance. (#032)

## [0.9.6] - 2025-06-10

### Added
- Function: Receipt issuance (continued from 0.9.5). (#032)

---

## [1.0.0] - 2025-06-01

### 🎉 Initial Release

This marks the first stable release of the comprehensive Hotel Management System, featuring a complete property management solution built with modern web technologies.

### Added

#### Core Features
- **Reservation Management** - Complete booking lifecycle with intuitive calendar interface
- **Client Management & CRM** - Advanced customer relationship management with communication tracking
- **Waitlist System** - Comprehensive guest waitlist management with automated notifications
- **Billing & Invoicing** - Flexible pricing, plans, addons, and automated invoice generation
- **Reporting & Analytics** - Comprehensive operational metrics and business insights
- **User Management** - Role-based access control with Google OAuth integration

#### Technical Features
- **Real-time Updates** - Socket.io integration for live notifications and updates
- **Data Import/Export** - CSV and Excel support for various data sources
- **Email Notifications** - Automated communications via nodemailer
- **Japanese Language Support** - Full text processing and conversion capabilities
- **Comprehensive Logging** - System and audit trail capabilities
- **OTA Integration** - XML-based communication with Online Travel Agencies

#### Architecture & Technology Stack
- **Backend**: Node.js with Express.js framework
- **Database**: PostgreSQL with Redis caching
- **Frontend**: Vue.js 3 with PrimeVue 4+ components
- **Styling**: Tailwind CSS 4 with modern utility-first approach
- **Build Tools**: Vite for optimized development and production builds
- **Charts**: ECharts integration for data visualization
- **Authentication**: JWT-based security with bcryptjs hashing

#### Documentation System
- **Structured Documentation** - Comprehensive docs organized by requirements, design, features, and operations
- **Documentation Standards** - Established guidelines for creating and maintaining project documentation
- **Template System** - Standardized templates for requirements, design, and feature specifications
- **Validation Tools** - Automated documentation validation and link checking

### 🏗️ Infrastructure

#### Database Features
- **Migration System** - Versioned SQL scripts for schema evolution (13 migration files)
- **Data Aggregation** - Materialized views and summary tables for reporting performance
- **Connection Pooling** - Optimized database connections with context-aware pool selection
- **Background Jobs** - Scheduled tasks for maintenance and data processing

#### Development Tools
- **PM2 Integration** - Production process management
- **Development Scripts** - Comprehensive npm scripts for development and deployment
- **Environment Configuration** - Flexible environment variable management
- **Code Quality** - ESLint configuration and development guidelines

### 📋 Key Metrics & Reporting
- Daily reservation summaries and operational counts
- Occupancy rate tracking and forecasting
- Revenue Per Available Room (RevPAR) calculations
- Average lead time and length of stay analytics
- Cancellation tracking and trend analysis

### 🔧 Operations & Maintenance
- **Deployment Guides** - Complete setup and deployment instructions
- **Troubleshooting Documentation** - Common issues and solutions
- **Security Features** - Input validation, SQL injection prevention, and secure authentication
- **Performance Optimization** - Caching strategies and query optimization

### 📱 User Experience
- **Responsive Design** - Mobile-compatible interface
- **Japanese UI** - Complete Japanese language interface
- **Role-based Permissions** - Granular access control system
- **Real-time Notifications** - Live updates and system alerts

### 🔗 Integration Capabilities
- **Google Services** - OAuth authentication and API integrations
- **Payment Processing** - Secure payment gateway integration
- **Email Services** - SMTP integration for automated notifications
- **File Processing** - PDF generation with Puppeteer, image processing with Sharp

---

## [1.0.1] - 2025-06-11

### Fixed
- Production Environment: Add-ons not reflected. (#033)
- Production Environment: Customer name display order changed. (#035)
- CRM: Editing sales actions. (#038)

---

## [1.0.2] - 2025-06-23

### Added
- Reservation: Check-in cancellation. (#043)
- Production Environment: Global plan hidden. (#034)
- CRM: Added related companies/related construction tabs. (#039)
- CRM: Loyal customers. (#040)

### Fixed
- Production Environment: Add-ons not reflected. (#033)
- Production Environment: Calendar scroll not displaying data. (#036)

### User Requests
- Production Environment: Customer name display order changed. (#035)
- CRM: Editing sales actions. (#038)

---

## [1.0.3] - 2025-07-16

### Added
- **About/FAQ System** - Comprehensive help system with searchable FAQ and changelog display
- **System Help Documentation** - Step-by-step instructions for all major system functions
- **Japanese FAQ Content** - Complete FAQ coverage for reservations, clients, reports, billing, and system management
- **Interactive Search** - Real-time FAQ search with highlighting and filtering capabilities
- **Changelog Display** - Version history with filtering by type and version
- **Mobile-Responsive Design** - Optimized layout for all device sizes
- **Accessibility Features** - ARIA labels, keyboard navigation, and screen reader support

### Improved
- **Documentation System** - Enhanced codebase documentation and structured help content
- **User Experience** - Intuitive tabbed interface for help content navigation
- **Content Management** - External JSON files for easy FAQ and changelog updates

---

## [1.0.4] - 2025-07-17
- Feature: Implemented 'Copy Reservation' function allowing users to duplicate a reservation for a different booker, preserving all other reservation details. (Feature Request #7)
- Bugfix: Calendar View now resets scroll position to top when date is changed. (Bug #1)
- Enhancement: Calendar View now displays visual lines/borders in room cells for better visibility. (Bug #2)
- Enhancement: Romaji auto-capitalization now preserves all-uppercase input (e.g., 'NTT'). (Bug #4)
- Bugfix: Client is now editable immediately after creating a hold reservation, without needing to refresh the page. (Bug #5)
- Bugfix: Addons added from Plan/Addon Edit now appear immediately in the reservation edit page. (Bug #6)
- Enhancement: When exporting the meals quantity report with no addons, a clear toast message is shown ('No meal data to export'). (Bug #8)
- Bugfix: Meal addons are now correctly counted and appear in both the all reservations export and the meals report. (Bug #9)
- Enhancement: Removed the requirement to have a reservation client in order to perform check-in. (Feature Request #11)
- Enhancement: Added a legend to the Calendar view explaining the meaning of all icons used. (Feature Request #13)
- Bugfix: After deleting a reservation, the confirmation prompt now closes automatically. (Bug #10, July 15, 2025)

---

## [1.0.5] - 2025-07-23

- Bugfix: PrimeVue ConfirmDialog did not close after add/delete; all Confirm dialogs in the system now close properly after actions. (Bug #12)
- Global reservation search in the top menu.
- Small design change in reservation list
- OTA reservations are now wrapped in a transaction to prevent duplicate bookings when processing multiple requests simultaneously.
- Addon quantity calculation now correctly uses the number of people per room instead of the total reservation people, fixing incorrect addon counts for multi-room bookings.

---

## [1.0.6] - 2025-07-28

- Bugfix: Frontend: Fixed a bug where the frontend was not displaying the right calculation of plan rates.
- Bugfix: Reservation Calendar: Fixed an issue where check-in and check-out dates were not being updated after a free move operation in the calendar view.
- Optimization: Build Process: Optimized Vite build configuration for low-memory VPS environments by disabling minification and source maps, implementing smart chunking, and using ES2015 target to reduce memory usage during frontend builds.

---

## [1.0.7] - 2025-07-29

- Bugfix: Fixed the unresponsive 'Return to Confirmed' button in the reservation panel. The button now properly allows changing the status from 'Checked In' back to 'Confirmed'. (Bug #14)
- Bugfix: Fixed the disappearing scrollbar issue in the reservation calendar by updating the table container's CSS, improving navigation between dates. (Bug #18)
- Bugfix: Resolved an issue preventing confirmation of employee reservations without a plan/price and implemented restrictions to prevent changing reservation type after confirmation. (Bug #17)
- Bugfix: Fixed cancelled reservations appearing in the Room Indicator view by updating the filtering logic to properly exclude them and ensure rooms with only cancelled reservations appear as available. (Bug #19)
- Enhancement: Added toast notifications in Japanese for permission-denied (403) errors to improve user feedback.
- Enhancement: Added support for employee reservations without requiring a plan/price, including visual distinction in the UI and confirmation dialogs for type changes.

---

## [1.1.0] - 2025-08-04

- Feature: Fixed transaction handling for OTA reservations to prevent duplicate bookings and ensure data consistency. Added proper error handling and transaction rollback on failures.
- UI/UX: Added Japanese labels for OTA transaction types (NewBookReport → 新規予約, ModificationReport → 予約変更, CancellationReport → 予約キャンセル) in the notifications drawer.
- Bugfix: Resolved issue where hotelId was not being properly passed through the OTA reservation processing pipeline.
- Feature: Added functionality to open reservation inquiries in a Google Drive spreadsheet. The Google Drive link is now configurable per hotel in the admin interface, with a dedicated field in the hotel edit screen. The button is available in the Side Menu.
- Feature: Added the ability to set the display order of hotels in the top menu. A `sort_order` field has been added to the hotels table, and the admin panel has been updated to allow editing of this new field.
- Feature: Added quick temp block functionality in the calendar drawer for faster room holds. (#017)
  - Users can now quickly create and remove temporary blocks directly from the calendar view
  - Visual indicators show which rooms are temporarily blocked
  - Streamlined workflow for holding rooms during high-demand periods
- UI: Renamed mode from "予約移動" to "デフォルト" (Default) in the reservation calendar for better clarity (#1)
- Refactor: Extracted client selection and details form into a reusable `ClientForReservationDialog` component. (#042)
  - Improved code organization and maintainability by separating concerns
  - Encapsulated client search and selection logic within the dialog component
  - Enhanced form validation and error handling
  - Streamlined the reservation creation workflow

---

## [1.1.1] - 2025-08-12

- Bugfix: Fixed issue where users couldn't add addons without selecting a plan first. The system now properly handles cases where no plan is selected. (Bug #22)
- Feature: Show OTA Queue Table in Admin page.
- Bugfix: Copy billable status as well when adding new rooms to existing reservations.
- Bugfix: Fixed an issue where the Google Drive link in the side menu would navigate to a 'Not Found' page.
- Bugfix: Fixed hotel selection not persisting across navigation by implementing localStorage persistence and proper initialization in TopMenu and SideMenu components.

---

## [1.1.2] - 2025-08-14

- Feature: Improved JWT token verification to be more resilient to network errors, preventing accidental logouts during temporary network issues. The system now only clears tokens on authentication-specific errors (401/403).
- Feature: Updated access control for the 仮ブロック (temporary block) function to be available to all users with CRUD access instead of just database managers.
- Feature: Enhanced calendar to display actual guest names for OTA reservations instead of booker names, improving staff efficiency when identifying guests. (Feature #17)
- Feature: Added comment column to the exported reservation data from Reservation List, providing more comprehensive data in exports.
- Bugfix: Fixed duplicate reservation details for the same room and date by removing the problematic unique constraint on `reservation_details` that included a nullable `cancelled` column. Implemented proper indexing and transaction handling in the period change function. (Bug #35)
- Bugfix: Fixed incorrect "Currently Staying" status display in RoomIndicator.vue, which was showing guests as checked-in on their scheduled check-in date rather than after actual check-in. (Bug #32)
- Bugfix: Fixed incorrect room distribution in multi-night reservations where the system was showing inconsistent guest counts across different nights. Implemented a "Calculate-Then-Create" pattern to ensure consistent distribution of guests across all nights. (Bug #34)
- Bugfix: Resolved XML parsing error in otaRoomMaster.vue that occurred when handling single room type responses from the API.
- Feature: Added comprehensive parking management system with real-time availability tracking and assignment. (Feature #18)  

---

## [1.1.3] - 2025-08-15

- Feature: Billing: Fixed client name display order in billing page to show name_kanji, name_kana, then name
- Feature: Receipts: Added room number and stay period (check-in to check-out) to receipt generation view
- Feature: Room Indicator: Updated to fetch plan names directly from plans tables instead of reservation_details for consistency
- Feature: Reports: Enhanced reservation details export
- Bugfix: Dashboard: Fixed the plans and addons chart to properly display data from the API
- Bugfix: Dashboard: Fixed occupancy rate chart to correctly show 0% when there are no available rooms
- Bugfix: Fixed an issue where addons would persist when changing a room plan from a plan with addons to a plan without addons
- Bugfix: Fixed parking assignment to correctly handle addon details and user tracking
- Bugfix: Fixed check-in/check-out dates not updating after partial cancellations by recalculating date ranges from active reservation details (Bug #35)
- Bugfix: Fixed employee reservations not being included in meal count reports by setting them to 'confirmed' status
- Bugfix: Improved reservation cancellation and recovery logic with transaction support to ensure data consistency
- Bugfix: Included parking reservation updates in the same transaction as reservation status changes to prevent data inconsistencies

---

## [1.1.4] - 2025-08-20

- Feature: Added new dedicated sheet for viewing meal counts by client and room, improving reporting capabilities. (Feature #28)
- Bugfix: Fixed employee reservations to correctly set billable=false when type is changed to employee, ensuring proper financial reporting.
- Bugfix: Fixed incorrect addon selection in bulk add functionality, ensuring the correct addon is assigned to each room. (Bug #37)
- Bugfix: Updated all sales-related pages and exports to display prices directly from reservation_details, ensuring consistency with pre-calculated values. (Bug #41)
- Bugfix: Fixed price calculation issues by implementing consistent 100 yen rounding and using pre-calculated values from reservation_details. (Bug #39)
- Bugfix: Fixed inconsistent behavior when editing room dates in multi-room reservations, ensuring rooms with different dates are properly moved to a new reservation. (Bug #13)
- Bugfix: Resolved critical production issue where room deletion was failing due to transaction handling errors. (Bug #33)
- UI: Enhanced visual indicators for non-billable stays across all reservation views, making it easier to identify employee and complimentary stays.
- UI: Updated Google Drive integration to properly handle client names for OTA and web reservations, showing guest names from reservation_clients when available.

---

## [1.1.5] - 2025-08-20

- Feature: Added per-room guest list export functionality (宿泊者名簿) with pre-filled guest information. (Feature #31)
- Bugfix: Fixed pattern-based plan application issues by correcting the [selectPlanByKey] function in plan.js to properly handle plan keys and validate both global and hotel plan IDs. (Bug #41)

---

## [1.1.6] - 2025-08-22

- Feature: Added client name standardization function that automatically abbreviates Japanese company types (e.g., '株式会社' to '㈱') in calendar view and Google exports, ensuring consistent formatting across the system.
- Feature: Added confirmation dialog with billable option when cancelling individual reservation days, improving billing accuracy.
- UI: Enhanced Room Indicator to prioritize displaying the name of the client staying in the room rather than the booker's name, improving clarity for front desk operations.
- Feature: Implemented bulk room cancellation with billable option in the bulk edit menu, streamlining group reservation management. (Feature #26)

---

## [1.1.7] - 2025-08-25

- Feature: Updated Google Drive export view to use default plan names from the plans_global and plans_hotel tables instead of reservation_details, ensuring consistent plan naming across exports.
- Feature: Added manual update command in the Admin panel for Google Drive spreadsheet exports, with date range validation (max 31 days) and loading state indicators.
- Feature: Enhanced invoice comment formatting with proper line breaks and improved Excel invoice generation to better match the template layout.
- Feature: Added visual indicators for cancelled days in room view accordion, showing count of cancelled days or a full cancellation badge. (Feature #43)

---

## [1.1.8] - 2025-08-26

- Feature: Implemented Winston logging system with file rotation and error tracking for Google Sheets API integration, improving error monitoring and debugging capabilities.
- Feature: Added Excel export functionality for invoices and reservation details, providing users with more flexible reporting options.
- Feature: Enhanced temporary blocking with editable notes, allowing block creators to add and modify comments for better team communication.
- Fix: Resolved issue with stay reservation consolidation where parking reservations were incorrectly counted as rooms, ensuring accurate room availability calculations.
- Fix: Fixed duplicate checkout indicators in room status display by implementing room ID deduplication in the room grouping logic.
- Feature: Enhanced duplicate client identification and merge functionality in CRM with improved address handling, proper UUID type casting, and fixed relationship updates during merges.

---

## [1.1.9] - 2025-08-28

- Feature: Added parking space availability information display in Google Drive (Feature #41)
- Feature: Enhanced reservations and parking calendar with row pinning and overlay-based row/column highlighting
- Feature: Added search type selection (stay period/check-in date/creation date) to reservation list filters
- Fix: Updated reservations calendar to correctly map check-in/check-out dates by including reservation ID in addition to room and date
- Fix: Fixed infinite scroll in parking calendar to properly load additional dates when scrolling

---

## [1.1.10] - 2025-09-01

- Feature: Added Payment Timing field to track payment methods (Prepaid, Pay at property, Postpaid) for reservations
- Feature: Added date range selection for room cancellations, allowing partial cancellation of multi-day reservations
- Feature: Implemented cancellation fee calculator for long-term reservations (30+ nights) with dynamic fee application date calculation
- Fix: Added status check to ensure rooms added to confirmed reservations are marked as billable
- Fix: Resolved issue where cart items would persist when switching between calendar modes, preventing potential booking errors
- Fix: Fixed address button visibility in CRM client addresses section to ensure it's always visible
- Fix: Added temporary workaround for multiple payment deletion confirmation dialogs

---

## [1.1.11] - 2025-09-03

- Feature: Added support for displaying multiple plan types with day counts and tooltips showing active days of the week for each plan in Room Indicator
- Feature: Implemented customizable room assignment order with new `assignment_priority` column in rooms table for hotel-specific room prioritization
- Feature: Partially implemented CRM Client Impediment Tracking with management interface (main page integration pending)
- Fix: Changed the billable list filter from check-in and check-out date to actual stay date to cover cases where cancelled dates are outside the in and out range
- Fix: Resolved issue in CRM Actions dialog where action date/time and subject weren't being properly loaded when editing an action

---

## [1.1.12] - 2025-09-08

- Bugfix: Fixed WebSocket-triggered update of room indicator
- Bugfix: Fixed sales calculation to properly exclude cancelled reservations from revenue totals by only including non-cancelled reservation details in the price sum. (Bug #52)
- Bugfix: Fixed an issue where changing the hotel would not update the parking availability information.
- Feature: Added comment flag system to highlight reservations with important comments (Feature #54)
- Feature: Added check-out date display in room indicator for better at-a-glance information (Feature #53)

---

## [1.1.13] - 2025-09-16

- Feature: Added toast notifications for better user feedback during client merge operations in CRM
- Feature: Enhanced Yadomaster data import with better data validation and error handling
- Feature: Improved reservation edit UI by disabling action buttons during form submission to prevent duplicate actions
- Feature: Optimized database queries for long reservation operations, significantly improving performance for reservations with extended stays
- Fix: Resolved issue where new reservation client dropdown was not displaying all available clients

---

## [1.1.14] - 2025-09-17

- Feature: Implemented multi-room temporary block functionality, allowing users to block multiple rooms simultaneously from the "Add New Reservation" dropdown. (#51)
- Feature: Enhanced ReportMonthly with plan breakdown for both plans and occupancy data, providing more detailed reporting capabilities.
- Bugfix: Reporting: Fixed an issue where the total room count for the 'All Hotels' summary in the reporting page was incorrectly calculated as zero.
- Bugfix: Reporting: Updated all financial reports to display pre-tax values (税抜き) for consistency with accounting practices and forecast data.

---

## [1.1.15] - 2025-09-18

- Bugfix: Fixed Guest List not marking client's plan when reservation is from OTA
- Bugfix: Modified Guest List Dialog to pass payment_timing and use it to define on site payment status.
- Bugfix: Set default payment_timing to 'prepaid' for OTA reservations and improved website reservation identification
- Bugfix: Addressed issues with date parsing and single-day blocking in the hotel calendar functionality.
- Feature: Color theming and changes to charts in Monthly Report.

---

## [1.1.16] - 2025-09-19

- Bugfix: Resolved data persistence and duplicate key issues by ensuring `reservedRoomsDayView` is correctly updated and cleared.
- Feature: Added a button to the reservation list drawer to navigate to the reservation edit page.
- Feature: Implemented date persistence via URL parameter (`/reservations/day/:date`), allowing page refreshes to maintain the selected date.
- Feature: Added Channel reports to the Reporting module.
- Feature: Added Payment Timing reports to the Reporting module.
- Bugfix: Fixed the meal count report summary date and the lunch serve date.
- Bugfix: Fixed cases where it was not possible to add guests to the reservation.

---

## [1.1.17] - 2025-09-24

- Bugfix: Fixed date handling in meal count export to correctly include all meals for the selected date range and properly format dates in Japanese locale.
- Bugfix: Fixed count of available spots on new data load for the Parking Calendar.
- Feature: Added Static Calendar page.
- Feature: Added Booker and Guests to the Room Indicator with gender indicative.
- Feature: Check-in/Out Statistics with Gender Breakdown to the Dashboard.
- Feature: Added a new metric showing the average length of stay and distribution of types of person for each hotel monthly report.

---

## [1.1.18] - 2025-09-29

- Feature: Added Excel roster download for check-ins with guest details and room information
- Feature: Added OTA reservation default parking setting (1 car per reservation)
- Feature: Added check-out cancellation functionality
- Feature: Added a new metric showing the average length of stay and distribution of types of person in the Reporting module
- Feature: Added override for rounding logic in plan price calculation

---

## [1.1.19] - 2025-10-01

- Bugfix: Refactored `recalculatePlanPrice` to default `disableRounding` to `false` and corrected a buggy internal call.
- Bugfix: Check-in based Excel roster was showing only one room per reservation.

---

## [1.1.20] - 2025-10-06

- Bugfix: Fixed invoice number not appearing in downloaded PDF files.
- Bugfix: Fixed gender selection for OTA clients to use the correct XML fields.
- Feature: Added client name to invoice PDF files for better identification.
- Feature: Added breakdown of forecast by plan for comparison in the reports.
- Feature: Added Admin panel validation screen to detect and manage empty reservations and double bookings.

---

## [1.1.21] - 2025-10-14

- Bugfix: Fixed an issue where sales report was not including addon sales in the final total amount. Now properly includes all addon sales (e.g., parking, breakfast) in the total calculation.
- Feature: Added tax-exclusive values to all data exports, including plan prices and addon charges, with clear labeling of tax-inclusive and tax-exclusive amounts.
- Bugfix: Fixed addon quantities not matching room capacity when applying plans to all rooms
- Bugfix: Disabled guest number increment/decrement buttons appropriately and added loading state to prevent multiple changes.
- Bugfix: Refactor room update to update only changed reservation duration plans
- Feature: Separated Addon rate and Plan rate in Monthly Report Sales by Plan view

---

## [1.1.22] - 2025-10-14

- Feature: Added Daily Report Data Download functionality for viewing confirmed stays by plan type
- Bugfix: Resolved issue where Room Indicator showed both original and new rooms after a room change
- Bugfix: Disabled reservation plan recalculation when changing rooms to maintain original pricing

---

## [1.1.23] - 2025-10-15

- Feature: Added 水回り (Wet Area) boolean field to rooms for better room facility tracking
- Enhancement: Improved static calendar organization with room type grouping and numerical ordering
- Bugfix: Multi-room reservation single room period change creates a new reservation
- Feature: Added sales information to the daily metrics routine.

---

## [1.1.24] - 2025-10-20

- Bugfix: Ensured the hotel rooms were being updated on Room Indicator page load to solve a problem where some users were not seeing the available rooms.
- Bugfix: Client selection in the room view was not filtering the clients correctly.
- Feature: Added to the Reservation Edit page a button to copy the reservation information to Slack.

---

## [1.1.25] - 2025-10-21

- Bugfix: Fixed date range cancellation to correctly update check-in/check-out dates and number of people in the reservation when cancelling specific dates.
- Feature: Added `google_sheets_queue` table to manage and optimize Google Sheets API requests, improving reliability and performance of Google Drive exports.

---

## [1.1.26] - 2025-10-23

- Feature: Daily Digest email routine added and table to check the logs in Admin panel.
- Feature: Prefilled template download feature for finance imports via a new backend endpoint and CSV generator service. 
- Bugfix: Fix addon quantity calculation per room.

---

## [1.1.27] - 2025-10-27

- Feature: Added to room indicator the clients changing room information.
- Feature: Partial multiple rooms period change became possible.
- Feature: Updated invoice generation to include 5-digit customer code in filenames and content.
- Bugfix: On reservation split, keep the basic information such as comment, OTA ID and payment timing.
- Bugfix: Static Calendar now displays the correct number of people in the reservation on double click Drawer.

---

## [1.1.28] - 2025-10-30

- Feature: Added separate OTA notifications drawer with dedicated icon in the main navigation for better organization of OTA-related alerts and failures.
- Bugfix: Fixed Room Indicator date cancellation handling to properly manage room status when dates within a stay are cancelled.
- Bugfix: Fixed an issue where bulk cancellation of reservation days did not correctly exclude flat-fee rates from the cancellation price, ensuring that bulk cancellations now match the pricing logic of single-day cancellations.

---

## [1.1.29] - 2025-10-31

- Feature: Added ability to change cancellation type (with or without fee) directly from the date details dialog.
- Feature: Added client list download functionality in CRM module with CSV/Excel export options and filtering capabilities.
- Feature: Enhanced OTA reservation display with plan-based coloring while maintaining visual distinction for OTA bookings.
- Bugfix: Fixed an issue where multiple clients sharing the same reservation were incorrectly receiving identical invoice IDs in the payment section, ensuring each client now gets a unique invoice ID for proper financial tracking.
- Bugfix: Fixed payment calculation for cancelled dates by ensuring non-billable cancelled days don't affect the total price in bulk operations.
- Bugfix: Resolved authentication issues with Google Sheets API by implementing proper refresh token handling for web-based requests, ensuring reliable data synchronization.

---

## [1.1.30] - 2025-11-05

- Feature: Implemented split reservation functionality, allowing reservations to be divided into multiple parts while maintaining all associated data and history.
- Bugfix: Fixed an issue where reservations with invoices spanning different months were not appearing for invoice creation, ensuring all eligible reservations are now properly included.
- Bugfix: Fixed invoice payment distribution to correctly include the last day of the billing period by ensuring consistent date formatting and proper timezone handling between frontend and backend.

---

## [1.1.31] - 2025-11-06

- Bugfix: Fixed the vw_room_inventory view to exclude 'not for sale' rooms from the occupied rooms count, preventing incorrect room availability data being sent to the site controller.
- Performance: Changed Puppeteer to create new browser instances per request instead of using a singleton browser, resolving memory leaks and heap errors caused by browser instances not being properly closed.
- Bugfix: Fixed an issue where the rooms dialog was not opening in the ManageHotel.vue component, improving hotel management functionality.
- Feature: Created reusable phone and email validation utilities for frontend forms, centralizing validation rules and ensuring consistent validation behavior across all components.
- Feature: Enhanced the reservation list to open reservations in a new tab, improving workflow efficiency by allowing users to maintain their place in the list while viewing reservation details.
- Feature: Added custom scrollbar styling for sidebars to improve usability on screens with limited height, ensuring better navigation and content visibility.

---

## [1.1.32] - 2025-11-07

- Request: Updated PDF invoice template to change text from '顧客コード' to '取引先コード' for better clarity and consistency with business terminology.
- Improvement: Separated reservation comment section into read-only and edit dialogs to prevent WebSocket update interruptions during editing.

---

## [1.2.0] - 2025-11-11

- Feature: Introduced comprehensive Parking Module with spot blocking for external hotel integration and basic parking space number management.
- Feature: Enhanced reservation calendar with room swapping capability, allowing users to switch rooms even when the target room is occupied, improving room management flexibility.
- Bugfix: Fixed memory leak in plan pattern bulk edit that was causing JavaScript heap out of memory errors for large reservations. The system now uses a single database client connection for all operations during bulk edits, preventing connection pool exhaustion.

---

## [1.2.1] - 2025-11-19

- Bugfix: Fixed a database pooling issue where getRatesForTheDay and getPriceForReservation were not consistently using the same database client within a transaction. This could lead to schema mismatches or incorrect data access, particularly in environments with separate development and production databases.
  - Updated getRatesForTheDay (api/models/planRate.js) to accept an optional dbClient and release it only when locally acquired.
  - Updated getPriceForReservation (api/models/planRate.js) to correctly use the passed transaction client.
  - Updated recalculatePlanPrice (api/models/reservations/main.js) to pass through the active transaction client.
  - Updated controller calls (api/controllers/plansRateController.js) to pass null when no transaction-specific client is provided.
- Bugfix: Restored missing guest name and gender information in the room indicator after the recent UI update.
- Refactor: Improved selectRoomsForIndicator with “islands of stays” logic to more accurately detect checkout rooms, including cases with intermediate cancelled dates. Redefined early_checkout and late_checkin flags accordingly.
- Feature: Enhanced Guest List Excel Export to include room-specific check-in and check-out dates. This ensures accuracy for reservations with room changes or partial day cancellations. Query now filters out cancelled dates and derives correct stay dates from active daily rates.
- Feature: Added OTA XML queuing with asynchronous polling to handle TL-Lincoln API rate limits. Outgoing requests are now stored and processed from ota_xml_queue to improve system robustness.
- Feature: Expanded static calendar with additional month navigation and a “Load More” button to extend the on-screen calendar range.

---

## [1.2.2] - 2025-11-25

- Feature: Added `is_staff_room` field to rooms table for better room categorization
- Enhancement: Updated calendar UI to visually distinguish staff rooms from regular rooms
- Bugfix: Fixed room indicator to correctly identify 'check-in today' status for rooms with interrupted continuous stays (due to cancellations)
- Bugfix: Corrected check-out date calculation in room indicator by adding one day to effective_check_out to show the actual checkout day (day after last stay)
- Cleanup: Removed temporary debug logs from frontend and backend code

---

## [1.2.3] - 2025-12-01

- Feature: Enhanced OTA notifications with failed XML queue and combined data display
- Feature: Migrated from Puppeteer to Playwright for PDF generation, improving reliability and performance
- Feature: Added versioning system for receipts with customizable templates, allowing for better tracking and management of receipt formats
- Fix: Resolved issue where parking addons were being erased when changing reservation plans
- Fix: Fixed issue where temporary blocked rooms were not saving the correct number of people when converted to reservations

---

## [1.2.4] - 2025-12-03

- Fix: Resolved issue where addons were being duplicated when added through the day detail dialog
- Refactor: Moved addon management logic to a dedicated module for better maintainability
- Fix: Fixed issue where addons were not being summed to the billable value for cancelled dates in the billing page

---

## [1.3.0] - 2025-12-04

- Refactor: Rewrote the SQL query in selectCountReservation (api/models/report/main.js) to use materialized CTEs for better performance and readability
- Feature: Added sales category to plan rates to track non-accommodation sales and adjusted occupancy rate calculations accordingly
- Feature: Enhanced Reporting module with the ability to download occupation data breakdown for detailed analysis

---

## Version History
- **1.3.0** (2025-12-04) - Enhanced reporting with sales categories and materialized CTEs for better performance. Fixed addon duplication and billing calculation issues.
- **1.2.4** (2025-12-03) - Fixed addon duplication in day detail dialog and resolved billing calculation issues for cancelled dates. Refactored addon management into a dedicated module for better code organization and maintainability.
- **1.2.3** (2025-12-01) – Enhanced OTA notifications with failed XML queue, migrated to Playwright for more reliable PDF generation, and introduced receipt versioning with customizable templates. Fixed issues with parking addons during plan changes and improved handling of temporary room blocks.
- **1.2.2** (2025-11-25) – Added staff room categorization with visual distinction in the calendar and improved room indicator accuracy for check-in/check-out status. Fixed date calculation issues and cleaned up debug logs.
- **1.2.1** (2025-11-19) – Fixed critical database client pooling inconsistencies affecting rate calculations, restored missing guest and gender details in the room indicator, and improved stay-date logic for checkout detection. Added room-specific stay dates to Guest List Excel export, implemented OTA XML queuing for rate-limit-safe integrations, expanded calendar month navigation, optimized websockets for hotel-specific updates, and refactored the guest list dialog for consistency.
- **1.2.0** (2025-11-11) – Introduced comprehensive Parking Module with spot blocking for external hotel integration and room swapping capability in the reservation calendar. Fixed memory leaks in plan pattern bulk edit operations, significantly improving performance for large reservation batches.
- **1.1.31** (2025-11-06) - Fixed room inventory view to exclude 'not for sale' rooms, resolved memory leaks in Puppeteer, improved form validation with reusable utilities, and enhanced UI with custom scrollbar styling for sidebars. Added new tab functionality for reservation details.
- **1.1.30** (2025-11-05) - Implemented reservation splitting while maintaining related data and history. Fixed invoice display for reservations spanning multiple months and ensured consistent date formatting between frontend and backend for billing periods.
- **1.1.29** (2025-10-31) - Enhanced reservation management with cancellation type controls and client list exports. Improved OTA booking visualization, fixed payment calculations for cancelled dates, and resolved invoice ID generation for shared reservations. Added reliable Google Sheets API authentication.
- **1.1.28** (2025-10-30) - Added OTA notifications drawer for better alert management and fixed bulk cancellation pricing. Improved date cancellation handling in Room Indicator to properly manage room status during partial stay cancellations.
- **1.1.27** (2025-10-27) - Enhanced room indicator with client change information and enabled partial period changes for multiple rooms. Improved reservation split functionality and fixed guest count display in Static Calendar. Updated invoice generation to include 5-digit customer code.
- **1.1.26** (2025-10-23) - Added Daily Digest email routine with admin panel logs and prefilled template download for finance imports. Fixed addon quantity calculation per room.
- **1.1.25** (2025-10-21) - Fixed date range cancellation issues and added Google Sheets queue table for optimized API request handling, improving export reliability.
- **1.1.24** (2025-10-20) - Improved Room Indicator loading, fixed client filtering, and added Slack integration for reservation information sharing.
- **1.1.23** (2025-10-15) - Added Wet Area field for rooms, improved static calendar organization, fixed multi-room reservation issues, and enhanced daily metrics with sales information.
- **1.1.22** (2025-10-14) - Introduced Daily Report Data Download for plan-based stay analysis. Fixed room indicator display to show only current room after changes and disabled plan recalculations during room modifications to preserve original pricing.
- **1.1.21** (2025-10-14) - Enhanced financial reporting with accurate addon sales totals and tax-exclusive values in exports. Improved room management with better addon quantity handling and UI state management for guest number controls. Added plan/addon rate separation in Monthly Reports.
- **1.1.20** (2025-10-06) - Fixed invoice PDF issues and OTA client gender selection. Enhanced PDFs with client names, added plan-based forecast reports, and introduced Admin validation tools.
- **1.1.19** (2025-10-01) - Fixed plan price rounding issues and improved Excel roster to show multiple rooms per reservation.
- **1.1.18** (2025-09-29) - Introduced Excel roster downloads, default parking for OTA reservations, check-out cancellation, and new reporting metrics for length of stay. Also added an override for plan price rounding.
- **1.1.17** (2025-09-24) - Enhanced dashboard with check-in/out statistics and gender breakdown. Added static calendar view and improved room indicators with guest information. Fixed meal count export and parking calendar spot availability.
- **1.1.16** (2025-09-19) - Enhanced reservation management with improved guest handling and data persistence. Added comprehensive reporting features including Channel and Payment Timing reports, and resolved meal count report date issues.
- **1.1.15** (2025-09-18) - Improved OTA reservation handling and payment timing management. Enhanced calendar functionality and added visual theming to monthly reports.
- **1.1.14** (2025-09-17) - Introduced multi-room temporary block functionality and enhanced reporting with detailed plan breakdowns. Fixed reporting issues including room count calculations and updated financial reports to display pre-tax values for consistency with accounting standards.
- **1.1.13** (2025-09-16) - Improved CRM operations with toast notifications and enhanced Yadomaster data import. Optimized reservation management with UI improvements for form submission and database queries for extended stays. Fixed client dropdown display in new reservations.
- **1.1.12** (2025-09-08) - Enhanced reservation management with comment flag system for important notes and improved room indicator with check-out date display. Fixed WebSocket updates, sales calculations for cancelled reservations, and hotel change handling for parking availability.
- **1.1.11** (2025-09-03) - Enhanced room management with multiple plan type displays, customizable room assignment order, and partial CRM Client Impediment Tracking. Improved billing accuracy with stay date filtering and fixed CRM Actions dialog issues.
- **1.1.10** (2025-09-01) - Added payment timing tracking, partial room cancellations, and long-term stay cancellation fee calculator. Improved reservation management and fixed various UI/UX issues.
- **1.1.9** (2025-08-28) - Enhanced parking and reservation management with Google Drive integration, improved calendar features, and advanced search filters. Fixed date mapping in reservations and parking calendar scrolling.
- **1.1.8** (2025-08-26) - Enhanced system reliability with Winston logging and improved CRM client merge functionality. Added Excel exports for invoices and reservation details, and fixed room reservation counting for accurate availability.
- **1.1.7** (2025-08-25) - Enhanced Google Drive exports with consistent plan naming and manual update capabilities. Improved billing page UI for better usability.
- **1.1.6** (2025-08-22) - Added client name standardization with Japanese company abbreviations, enhanced reservation management with billable cancellation options, and improved room indicators for better front desk operations. Streamlined group reservation handling with bulk cancellation features.
- **1.1.5** (2025-08-20) - Added per-room guest list export functionality (宿泊者名簿) with pre-filled guest information. Enhanced data privacy and protection for guest information.
- **1.1.4** (2025-08-20) - Added meal count reporting and fixed critical financial calculation issues. Improved reservation management with better handling of non-billable stays and room date changes. Enhanced UI for better visibility of employee and complimentary stays.
- **1.1.3** (2025-08-15) - Improved billing and receipt generation with better client name handling and stay period display. Enhanced room indicator and dashboard charts with accurate data representation. Fixed addon persistence and parking assignment issues.
- **1.1.2** (2025-08-14) - Improved JWT token verification, enhanced calendar display for OTA reservations, and fixed critical issues with reservation details and room distribution. Added temporary block access for all users with CRUD permissions.
- **1.1.1** (2025-08-12) - Fixed addon selection without plan, added OTA Queue Table, and resolved issues with billable status and Google Drive link navigation.
- **1.1.0** (2025-08-04) - Refactored client reservation dialog for better maintainability. Enhanced OTA reservation handling with transaction support and Japanese UI improvements. Added hotel display ordering and calendar temp block functionality.
- **1.0.7** (2025-07-29) - Fixed issues with reservation management UI and calendar navigation. Improved employee reservation handling and room indicator filtering. Added Japanese error notifications for better user feedback.
- **1.0.6** (2025-07-28) - Fixed frontend plan rate calculations and reservation calendar date updates. Optimized build process for low-memory VPS environments by disabling minification and source maps, implementing smart chunking, and using ES2015 target to reduce memory usage during frontend builds.
- **1.0.5** (2025-07-23) - OTA reservations are now wrapped in a transaction to prevent duplicate bookings when processing multiple requests simultaneously. Addon quantity calculation now correctly uses the number of people per room instead of the total reservation people, fixing incorrect addon counts for multi-room bookings.
- **1.0.4** (2025-07-17) - Added reservation copy function, calendar UI/UX improvements, bugfixes for client/edit/addon/meal exports, and new calendar legend.
- **1.0.3** (2025-07-16) - Added comprehensive About/FAQ system with searchable help documentation and enhanced codebase documentation.
- **1.0.2** (2025-06-23) - Added post-release features including production fixes, CRM enhancements, and new integrations.
- **1.0.1** (2025-06-11) - Addressed production environment issues and introduced new CRM features.
- **1.0.0** (2025-06-01) - Initial stable release with comprehensive hotel management features
- **0.9.5** (2025-05-28) - Implemented receipt issuance.
- **0.9.4** (2025-05-15) - Enhanced alert notification prominence.
- **0.9.3** (2025-04-22) - Added temporary unassigned free room movement and Google Sheets/PMS integration.
- **0.9.2** (2025-04-17) - Implemented plan color-coding in reservation details and customer selection by contact info.
- **0.9.1** (2025-04-07) - Addressed duplicate reservation, plan pattern maintenance, and plan pattern settings.
- **0.9.0** (2025-04-01) - Implemented add-on category settings and meal count output.
- **0.8.0** (2025-03-31) - Added automatic adjustment of check-in and check-out dates.
- **0.7.0** (2025-03-28) - Partially resolved reservation history viewing.
- **0.6.0** (2025-03-27) - Changed new reservation input method.
- **0.5.0** (2025-03-14) - Reflected add-on details, changed display for split room movements, and added reactivation after cancellation.
- **0.4.0** (2025-03-13) - Enabled CSV output for reservation information.
- **0.3.0** (2025-03-11) - Implemented room movement for full rooms, calendar grid lines, drag-and-drop room changes, and vacancy count display.
- **0.2.0** (2025-03-07) - Changed warning design for drag-and-drop, increased date/room font size, separated Primevue Japanese display/date range, partially resolved date change method, and added ability to add/reduce rooms in confirmed reservations.
- **0.1.0** (2025-02-21) - Initial pre-release with color-coded reservation calendar, alert notification settings (not started), and employee stay index.

---

## Contributing

For information about contributing to this project, please see our [Development Guidelines](instructions.md).

## Support

For support and troubleshooting, please refer to our [Documentation](docs/) or contact the development team.