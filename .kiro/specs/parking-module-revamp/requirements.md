# Requirements Document

## Introduction

This document outlines the requirements for revamping the parking module to manage parking availability by counting available spots rather than tracking specific spot assignments. The current system assigns specific parking spots (parking_spot_id) to reservations through the reservation_parking table, similar to how rooms are assigned. The new system will allow parking spots to be used flexibly across consecutive dates without requiring the same physical spot, similar to how the reservation module manages room availability by counting capacity. Additionally, the system must support blocking spots for periods when they are unavailable (e.g., winter closures, non-reservation vehicle usage).

The current implementation uses:
- `saveParkingAssignments` function that assigns specific spots to reservation_details
- `reservation_parking` table that links parking_spot_id to reservation_details_id for each date
- Vehicle categories with capacity_units_required that must match parking spots with capacity_units
- Integration with reservation_addons for billing purposes

## Glossary

- **Parking System**: The software module responsible for managing parking spot availability and assignments
- **Parking Spot**: A physical parking location identified by a spot number within a parking lot
- **Vehicle Category**: A classification of vehicles based on size/type that determines capacity unit requirements (e.g., compact car, SUV, van)
- **Capacity Unit**: A numerical measure of space required by a vehicle category to occupy a parking spot
- **Blocked Spot**: A parking spot that is temporarily unavailable for reservation during a specified date range
- **Reservation Module**: The existing system component that manages room reservations and availability
- **Hotel System**: The parent application that manages hotel operations including rooms and parking

## Requirements

### Requirement 1

**User Story:** As a hotel manager, I want the parking system to track the number of available spots per date rather than specific spot assignments, so that guests can use any compatible spot during their stay without being locked to a single physical location.

#### Acceptance Criteria

1. WHEN a parking reservation is created for a date range, THE Parking System SHALL allocate parking capacity by counting available spots rather than assigning specific spot identifiers
2. WHEN checking parking availability for a date range, THE Parking System SHALL return the count of available spots that meet the vehicle category requirements
3. WHEN a guest's parking reservation spans multiple consecutive dates, THE Parking System SHALL allow different physical spots to be used on different dates
4. WHEN calculating available parking capacity for a specific date, THE Parking System SHALL subtract all reserved and blocked spots from the total spot count
5. THE Parking System SHALL maintain vehicle category compatibility rules where spots can only accommodate vehicles with capacity unit requirements less than or equal to the spot's capacity units

### Requirement 2

**User Story:** As a hotel manager, I want to block parking capacity for specific date ranges, so that I can prevent reservations when spots are unavailable due to maintenance, seasonal closures, or non-reservation vehicle usage.

#### Acceptance Criteria

1. WHEN a hotel manager blocks parking capacity for a date range, THE Parking System SHALL create blocking records that reduce available capacity without assigning specific spot identifiers
2. WHEN parking capacity is blocked for a date range, THE Parking System SHALL subtract the blocked capacity from total available capacity for all dates within the range
3. WHEN checking parking availability, THE Parking System SHALL treat blocked capacity the same as reserved capacity in availability calculations
4. THE Parking System SHALL allow multiple blocking records for the same date range with different capacity amounts
5. WHEN a hotel manager blocks capacity that would exceed total available capacity, THE Parking System SHALL allow the operation but return a warning about potential overbooking

### Requirement 3

**User Story:** As a hotel manager, I want to view and manage blocked parking capacity, so that I can track unavailable capacity and remove blocks when capacity becomes available again.

#### Acceptance Criteria

1. WHEN a hotel manager requests a list of blocked capacity for a date range, THE Parking System SHALL return all blocking records with capacity amounts, date ranges, and reason comments
2. WHEN a hotel manager removes a blocking record, THE Parking System SHALL immediately make the blocked capacity available for reservations on the previously blocked dates
3. THE Parking System SHALL allow hotel managers to modify the date range and capacity amount of existing blocking records
4. WHEN displaying blocked capacity, THE Parking System SHALL show the vehicle category, number of spots blocked, blocked date range, and blocking reason
5. THE Parking System SHALL allow deletion of blocking records regardless of existing reservations since blocks are capacity-based not spot-specific

### Requirement 4

**User Story:** As a hotel staff member, I want the parking system to work consistently with the reservation module's availability logic, so that I can manage parking and rooms using familiar patterns.

#### Acceptance Criteria

1. WHEN calculating parking availability, THE Parking System SHALL use the same date range logic as the Reservation Module where check-out dates are exclusive
2. WHEN creating parking assignments, THE Parking System SHALL link to reservation details in the same manner as the Reservation Module links rooms to reservations
3. THE Parking System SHALL maintain the same transaction handling patterns as the Reservation Module for data consistency
4. WHEN a reservation is cancelled, THE Parking System SHALL release parking capacity in the same transactional manner as the Reservation Module releases rooms
5. THE Parking System SHALL use the same user audit trail pattern as the Reservation Module for tracking who created or modified parking assignments

### Requirement 5

**User Story:** As a hotel manager, I want to ensure parking capacity is accurately tracked across all parking lots, so that I never overbook parking spots.

#### Acceptance Criteria

1. WHEN multiple parking lots exist for a hotel, THE Parking System SHALL aggregate available capacity across all lots when checking availability
2. WHEN a parking reservation is created, THE Parking System SHALL verify sufficient capacity exists before confirming the reservation
3. THE Parking System SHALL prevent concurrent reservations from exceeding total available capacity through database-level locking
4. WHEN calculating available capacity, THE Parking System SHALL account for vehicle category compatibility where larger vehicles require more capacity units
5. THE Parking System SHALL maintain accurate capacity counts even when reservations are modified or cancelled

### Requirement 6

**User Story:** As a developer, I want the parking system to maintain backward compatibility with existing parking data, so that the revamp does not break existing functionality or lose historical data.

#### Acceptance Criteria

1. THE Parking System SHALL preserve all existing parking spot records and their properties during the revamp
2. THE Parking System SHALL maintain existing relationships between parking assignments and reservation addons
3. WHEN migrating to the new capacity-based system, THE Parking System SHALL convert existing spot-specific assignments to capacity-based assignments
4. THE Parking System SHALL continue to support the existing vehicle category and capacity unit data model
5. THE Parking System SHALL maintain all existing API endpoints with backward-compatible responses
