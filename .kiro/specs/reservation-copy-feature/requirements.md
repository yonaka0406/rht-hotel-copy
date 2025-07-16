# Requirements Document

## Introduction

This document outlines the requirements for implementing a comprehensive reservation copy feature that allows users to duplicate existing reservations for different clients while preserving all reservation details including room assignments, dates, plans, addons, and pricing information.

## Requirements

### Requirement 1

**User Story:** As a hotel staff member, I want to copy an existing reservation to a different client, so that I can quickly create similar bookings without manually re-entering all the details.

#### Acceptance Criteria

1. WHEN a user selects a reservation THEN the system SHALL provide a "Copy Reservation" option in the reservation actions
2. WHEN the copy function is initiated THEN the system SHALL display a dialog to select the new client/booker
3. WHEN a new client is selected THEN the system SHALL allow mapping of rooms from the original reservation to available rooms
4. WHEN room mapping is completed THEN the system SHALL create a new reservation with all original details except the client

### Requirement 2

**User Story:** As a hotel staff member, I want to map rooms when copying a reservation, so that I can assign the copied reservation to different available rooms while maintaining the same room configuration.

#### Acceptance Criteria

1. WHEN copying a reservation THEN the system SHALL display available rooms for the same date range
2. WHEN multiple rooms are in the original reservation THEN the system SHALL allow individual room mapping for each room
3. WHEN room mapping is incomplete THEN the system SHALL prevent the copy operation from proceeding
4. WHEN room mapping is complete THEN the system SHALL validate room availability before creating the copy

### Requirement 3

**User Story:** As a hotel staff member, I want all reservation details to be copied accurately, so that the new reservation maintains the same service level and pricing as the original.

#### Acceptance Criteria

1. WHEN a reservation is copied THEN the system SHALL copy all reservation details including dates, room assignments, plans, and addons
2. WHEN a reservation is copied THEN the system SHALL copy all pricing information including base rates, taxes, and adjustments
3. WHEN a reservation is copied THEN the system SHALL NOT copy payment records or guest assignments
4. WHEN a reservation is copied THEN the system SHALL set the new reservation status to "hold" by default

### Requirement 4

**User Story:** As a hotel staff member, I want to be redirected to the new reservation after copying, so that I can immediately review and modify the copied reservation if needed.

#### Acceptance Criteria

1. WHEN a reservation copy is successfully created THEN the system SHALL redirect the user to the new reservation edit page
2. WHEN the copy operation fails THEN the system SHALL display an appropriate error message
3. WHEN the copy operation is cancelled THEN the system SHALL return to the original reservation view
4. WHEN the copy is completed THEN the system SHALL display a success confirmation message