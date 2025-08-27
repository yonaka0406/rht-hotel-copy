# Changelog

All notable changes to the Hotel Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---
## Unreleased
- Feature: Added parking space availability information display in Google Drive (Feature #41)

---
## Future Releases

### Planned Features
- Advanced reporting dashboard with customizable metrics
- Advanced analytics and business intelligence features

### Backlog
- Notifications: Alert notification settings (e.g., alert for large bookings 1 month after receiving order for bookings several months out). (#004)
- CRM: Data recording via upload method. (#037)
- CRM: Sales cool performance report. (#041)
- Feature Request #16: Implement room type hierarchy for systematic upgrades and improve OTA import logic (convert XML to PMS format, use temp table and cache, notify user of unimported data, only clear cache on OTA confirmation success, allow PMS-side room type changes before retry, the quantity of rooms in OTA should reflect the not imported entries as well).

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

### Fixed
- Production Environment: Add-ons not reflected. (#033)
- Production Environment: Calendar scroll not displaying data. (#036)

### Added
- Production Environment: Global plan hidden. (#034)
- CRM: Added related companies/related construction tabs. (#039)
- CRM: Loyal customers. (#040)

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
- Bugfix: Fixed issue with duplicate reservation details for the same room and date by removing the problematic unique constraint on `reservation_details` that included a nullable `cancelled` column. Implemented proper indexing and transaction handling in the period change function. (Bug #35)
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
- Bugfix: Fixed pattern-based plan application issues by correcting the [getPlanByKey] function in plan.js to properly handle plan keys and validate both global and hotel plan IDs. (Bug #41)

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

## Version History

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
- **1.0.6** (2025-07-28) - Fixed frontend plan rate calculations and reservation calendar date updates. Optimized build process for low-memory VPS environments by disabling minification and source maps, implementing smart chunking, and using ES2015 target.
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