# Requirements Document

## Introduction

This feature integrates the existing parking management system with the reservation editing interface. Currently, the hotel has a comprehensive parking system with parking lots, spots, and reservation_parking table, as well as an addon system that includes 駐車場 (parking) addons (global addon ID 3). The goal is to seamlessly connect these systems so that when users add parking addons to a reservation, they can also assign specific parking spots and manage parking reservations directly from the ReservationEdit.vue interface.

## Requirements

### Requirement 1

**User Story:** As a hotel staff member, I want to see parking information in the reservation edit interface, so that I can manage both room and parking reservations in one place.

#### Acceptance Criteria

1. WHEN viewing a reservation in ReservationEdit.vue THEN the system SHALL display a parking section alongside rooms and payments sections
2. WHEN a reservation has parking addons THEN the system SHALL show the associated parking spot assignments
3. WHEN a reservation has no parking addons THEN the system SHALL show an option to add parking services

### Requirement 2

**User Story:** As a hotel staff member, I want to add parking services to a reservation, so that I can assign parking spots to guests.

#### Acceptance Criteria

1. WHEN adding a parking addon to a reservation THEN the system SHALL allow selection of available parking spots for the reservation dates
2. WHEN selecting a parking spot THEN the system SHALL check availability for the entire reservation period
3. WHEN a parking spot is unavailable for any date in the reservation period THEN the system SHALL prevent selection and show alternative options
4. WHEN a parking addon is added THEN the system SHALL create corresponding entries in the reservation_parking table
5. WHEN detecting parking addons THEN the system SHALL identify them by global addon ID 3 (駐車場)

### Requirement 3

**User Story:** As a hotel staff member, I want to modify existing parking assignments, so that I can accommodate changes in guest needs or parking availability.

#### Acceptance Criteria

1. WHEN viewing existing parking assignments THEN the system SHALL allow editing of parking spot assignments
2. WHEN changing a parking spot assignment THEN the system SHALL validate availability of the new spot for all reservation dates
3. WHEN removing a parking addon THEN the system SHALL also remove the corresponding reservation_parking entries
4. WHEN modifying parking assignments THEN the system SHALL update both the addon and reservation_parking records
5. WHEN removing parking assignments THEN the system SHALL maintain referential integrity between addons and reservation_parking tables

### Requirement 4

**User Story:** As a hotel staff member, I want to see parking availability while managing reservations, so that I can make informed decisions about parking assignments.

#### Acceptance Criteria

1. WHEN selecting parking spots THEN the system SHALL display real-time availability for each spot during the reservation period
2. WHEN viewing parking options THEN the system SHALL show parking lot names and spot numbers clearly
3. WHEN a parking spot is partially available THEN the system SHALL indicate which specific dates are unavailable
4. WHEN multiple vehicle categories are available THEN the system SHALL filter parking spots by vehicle category compatibility

### Requirement 5

**User Story:** As a hotel staff member, I want parking changes to be reflected in real-time, so that other staff members see updated parking availability immediately.

#### Acceptance Criteria

1. WHEN parking assignments are modified THEN the system SHALL broadcast updates via WebSocket to other connected clients
2. WHEN receiving parking updates THEN the system SHALL refresh the parking availability display
3. WHEN concurrent users modify parking THEN the system SHALL prevent conflicts and show appropriate error messages
4. WHEN parking data changes THEN the system SHALL update both the reservation view and parking calendar view

### Requirement 6

**User Story:** As a hotel staff member, I want to see pricing information for parking services, so that I can inform guests about costs and ensure accurate billing.

#### Acceptance Criteria

1. WHEN adding parking addons THEN the system SHALL display the price from the addon configuration
2. WHEN parking prices differ by vehicle category THEN the system SHALL show category-specific pricing
3. WHEN parking assignments change THEN the system SHALL update the total reservation cost automatically
4. WHEN viewing parking assignments THEN the system SHALL show both individual parking costs and total parking charges

### Requirement 7

**User Story:** As a hotel staff member, I want the system to automatically link parking addons with parking spot assignments, so that there is clear traceability between billing and physical parking allocation.

#### Acceptance Criteria

1. WHEN a parking addon (ID 3) is added to a reservation THEN the system SHALL require assignment of a specific parking spot
2. WHEN viewing reservation addons THEN parking addons SHALL display the associated parking spot information
3. WHEN a parking spot assignment exists THEN the system SHALL prevent deletion of the corresponding parking addon without first removing the spot assignment
4. WHEN generating reports THEN the system SHALL be able to correlate parking revenue with specific parking spot utilization

### Requirement 8

**User Story:** As a hotel staff member, I want parking functionality integrated across all reservation components, so that I can manage parking consistently throughout the reservation workflow.

#### Acceptance Criteria

1. WHEN using ReservationDayDetail component THEN the system SHALL allow adding and editing parking addons with spot assignments for individual days
2. WHEN using ReservationPanel component THEN the system SHALL display parking information in the reservation summary
3. WHEN using ReservationRoomsView component THEN the system SHALL show parking assignments alongside room information
4. WHEN bulk editing reservations THEN the system SHALL allow applying parking changes to multiple days or rooms simultaneously
5. WHEN viewing reservation history THEN the system SHALL track changes to parking assignments and spot allocations

### Requirement 9

**User Story:** As a hotel staff member, I want parking spot assignment functionality in all addon editing dialogs, so that I can efficiently manage parking across different editing contexts.

#### Acceptance Criteria

1. WHEN using 全部部屋一括編集 (bulk edit all rooms) dialog THEN the system SHALL allow adding parking addons with spot assignments that apply to all rooms for selected dates
2. WHEN using 〇号室一括編集 (individual room bulk edit) dialog THEN the system SHALL allow adding parking addons with spot assignments specific to that room's reservation period
3. WHEN using 日付詳細 (day detail) dialog THEN the system SHALL allow adding parking addons with spot assignments for that specific date
4. WHEN adding parking addons in any dialog THEN the system SHALL show available parking spots filtered by the relevant date range
5. WHEN parking addons are added through dialogs THEN the system SHALL create corresponding reservation_parking entries with proper date associations
6. WHEN editing existing parking addons in dialogs THEN the system SHALL allow changing parking spot assignments while maintaining data consistency
7. WHEN removing parking addons through dialogs THEN the system SHALL also remove the associated reservation_parking entries