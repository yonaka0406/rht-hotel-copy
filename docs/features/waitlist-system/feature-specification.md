# Waitlist System Feature Specification

## Overview

The Waitlist System is a comprehensive feature designed to capture and convert unmet demand in the hotel management system. It allows hotels to maintain a list of guests interested in specific room types and dates when they are unavailable, and provides tools for manual notification when rooms become available. This system helps hotels recover potential revenue that would otherwise be lost when fully booked.

## Feature Requirements Traceability

This feature addresses the following requirements from the system requirements documentation:

- **Requirement 3.2**: Feature-specific documentation with clear specifications
- **Requirement 5.3**: Business value metrics and success criteria
- **Requirement 1.4**: Current implementation status and future roadmap

## Business Value

### Revenue Recovery
- **Problem**: Hotels lose potential revenue when fully booked rooms turn away interested customers, especially when specific room preferences (smoking vs. non-smoking, room types) are unavailable
- **Solution**: Waitlist captures demand that would otherwise be lost, converting it into bookings when cancellations occur or preferred room types become available
- **Impact**: Studies show hotels can recover 15-25% of lost bookings through effective waitlist management

### Enhanced Customer Experience
- **Proactive Communication**: Customers appreciate being notified of availability rather than having to repeatedly check
- **Reduced Friction**: Seamless transition from "unavailable" to "book now" eliminates search restart
- **Builds Loyalty**: Shows hotel values customer interest and specific preferences even when unable to immediately accommodate
- **Accommodates Specific Needs**: Allows guests to wait for rooms that meet their specific requirements

### Operational Efficiency
- **Automated Matching**: System automatically finds best waitlist candidates when rooms become available
- **Staff Productivity**: Reduces manual work of tracking interested customers and making availability calls
- **Data-Driven Insights**: Provides visibility into unmet demand patterns for capacity planning

## User Stories

### Primary User Stories

**As a hotel front desk staff member, I want to add guests to a waitlist when rooms are unavailable so that I can capture potential bookings.**

**As a hotel staff member, I want to manage waitlist entries so that I can track guest preferences and contact information.**

**As a hotel staff member, I want to manually notify waitlist guests when rooms become available so that I can convert waitlist entries to reservations.**

**As a potential guest, I want to confirm my waitlist reservation through a secure link so that I can complete my booking when rooms become available.**

## Acceptance Criteria

### Waitlist Entry Creation
1. WHEN a staff member creates a waitlist entry THEN the system SHALL capture client information, room preferences, and contact details
2. WHEN creating a waitlist entry THEN the system SHALL validate that check-out date is after check-in date
3. WHEN creating a waitlist entry THEN the system SHALL require either email or phone contact information based on communication preference
4. WHEN creating a waitlist entry THEN the system SHALL set initial status to 'waiting'
5. WHEN creating a waitlist entry THEN the system SHALL validate that the specified client and hotel exist

### Waitlist Management
1. WHEN viewing waitlist entries THEN the system SHALL display entries with filtering by status, dates, and room type
2. WHEN filtering waitlist entries THEN the system SHALL support pagination for large datasets
3. WHEN viewing waitlist entries THEN the system SHALL show client name, requested dates, room preferences, and current status
4. WHEN managing waitlist entries THEN the system SHALL allow staff to cancel entries with optional reason
5. WHEN viewing waitlist entries THEN the system SHALL display smoking preference and communication preference

### Manual Notification System
1. WHEN sending manual notifications THEN the system SHALL generate secure confirmation tokens with expiry
2. WHEN sending notifications THEN the system SHALL update waitlist entry status to 'notified'
3. WHEN sending notifications THEN the system SHALL send email with confirmation link and reservation details
4. WHEN notification tokens expire THEN the system SHALL prevent reservation confirmation
5. WHEN notifications are sent THEN the system SHALL include hotel name, dates, and guest count in email

### Vacancy Checking
1. WHEN checking vacancy THEN the system SHALL validate room availability for specified dates and criteria
2. WHEN checking vacancy THEN the system SHALL consider room capacity and guest count requirements
3. WHEN checking vacancy THEN the system SHALL respect smoking preferences if specified
4. WHEN checking vacancy THEN the system SHALL exclude already reserved rooms from availability
5. WHEN checking vacancy THEN the system SHALL return boolean availability status

### Public Confirmation Process
1. WHEN guests access confirmation links THEN the system SHALL validate token and expiry
2. WHEN confirming reservations THEN the system SHALL create full reservation records with room assignments
3. WHEN confirming reservations THEN the system SHALL update waitlist status to 'confirmed'
4. WHEN confirming reservations THEN the system SHALL transfer waitlist notes to reservation comments
5. WHEN confirmation fails THEN the system SHALL provide clear error messages

## Current Implementation Status

### ✅ Implemented Features

#### Database Schema
- **Complete waitlist_entries table** with all required fields and constraints
- **UUID primary keys** for secure token generation
- **Composite foreign keys** to room_types with hotel partitioning
- **Status validation** with check constraints for valid status transitions
- **Date validation** ensuring check-out is after check-in
- **Indexes** optimized for common query patterns (hotel, status, dates, tokens)

#### Backend API Implementation
- **Waitlist Creation** (`POST /api/waitlist`)
  - Comprehensive input validation using validation utilities
  - Client and hotel existence verification
  - Room type validation with hotel association
  - Communication preference handling (email/phone)
  - Smoking preference support

- **Waitlist Management** (`GET /api/waitlist/hotel/:hotelId`)
  - Pagination support with configurable page size
  - Multi-criteria filtering (status, dates, room type)
  - Joined queries with client and hotel information
  - Formatted date display for frontend consumption

- **Manual Notification System** (`POST /api/waitlist/:id/manual-notify`)
  - Cryptographically secure token generation
  - Email template integration with Japanese localization
  - Token expiry management (48-hour default)
  - Status transition from 'waiting' to 'notified'

- **Vacancy Checking** (`POST /api/waitlist/check-vacancy`)
  - Real-time room availability calculation
  - Room capacity and guest count validation
  - Smoking preference filtering
  - Date range availability checking

- **Public Confirmation** (`GET/POST /api/waitlist/confirm/:token`)
  - Token validation with expiry checking
  - Automatic reservation creation from waitlist data
  - Room assignment using existing reservation algorithms
  - Status transition to 'confirmed'

#### Frontend Implementation
- **Waitlist Management Interface** (`ManageWaitList.vue`)
  - DataTable with filtering and pagination
  - Status-based color coding
  - Manual notification triggers
  - Entry cancellation with reason tracking

- **Waitlist Creation Dialog** (`WaitlistDialog.vue`)
  - Client selection with autocomplete
  - Room type and preference selection
  - Contact information management
  - Communication preference handling

- **Waitlist Display Modal** (`WaitlistDisplayModal.vue`)
  - Quick view of waitlist entry details
  - Real-time vacancy checking
  - Manual notification capabilities

- **Public Confirmation Page** (`ReservationClientConfirmation.vue`)
  - Token-based access validation
  - Reservation creation workflow
  - Error handling and user feedback

#### Advanced Features
- **Email Integration**
  - Japanese-localized email templates
  - Secure confirmation link generation
  - Hotel-specific email customization
  - Error handling for email delivery failures

- **Security Features**
  - Cryptographically secure tokens using Node.js crypto module
  - Token expiry validation
  - Input sanitization and validation
  - SQL injection prevention with parameterized queries

- **Audit Trail**
  - Complete change tracking with timestamps
  - User attribution for all modifications
  - Status transition logging
  - Notes and reason tracking for cancellations

### 🔄 Partially Implemented Features

#### Background Job Processing
- **Current Status**: Basic expiration job exists (`waitlistJob.js`) but limited functionality
- **Gap**: Comprehensive token cleanup and status maintenance
- **Impact**: Manual cleanup required for expired tokens

#### Integration with Reservation System
- **Current Status**: Manual confirmation creates reservations but no automatic processing
- **Gap**: Automatic waitlist processing when reservations are cancelled
- **Impact**: Staff must manually check waitlist when rooms become available

### ❌ Not Yet Implemented Features

#### Automatic Notification System
- **Missing**: Automatic triggering when rooms become available through cancellations
- **Impact**: Requires manual monitoring and notification by staff
- **Priority**: High - core value proposition of waitlist system

#### Advanced Matching Logic
- **Missing**: Complex date overlap and preference matching algorithms
- **Impact**: Limited ability to match partial date overlaps or alternative room types
- **Priority**: Medium - affects conversion efficiency

#### Real-time Updates
- **Missing**: WebSocket integration for live status changes
- **Impact**: Users must refresh to see status updates
- **Priority**: Low - primarily affects user experience

#### Bulk Operations
- **Missing**: Mass actions on multiple waitlist entries
- **Impact**: Individual processing required for multiple entries
- **Priority**: Low - operational efficiency improvement

## Technical Architecture

### Database Design

The waitlist system uses a robust database design with comprehensive constraints:

```sql
CREATE TABLE waitlist_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER,
    requested_check_in_date DATE NOT NULL,
    requested_check_out_date DATE NOT NULL,
    number_of_guests INTEGER NOT NULL CHECK (number_of_guests > 0),
    number_of_rooms INTEGER NOT NULL DEFAULT 1 CHECK (number_of_rooms > 0),
    status TEXT NOT NULL DEFAULT 'waiting'
        CHECK (status IN ('waiting', 'notified', 'confirmed', 'expired', 'cancelled')),
    confirmation_token TEXT UNIQUE,
    token_expires_at TIMESTAMPTZ,
    contact_email TEXT,
    contact_phone TEXT,
    communication_preference TEXT NOT NULL DEFAULT 'email' 
        CHECK (communication_preference IN ('email', 'phone')),
    preferred_smoking_status TEXT NOT NULL DEFAULT 'any' 
        CHECK (preferred_smoking_status IN ('any', 'smoking', 'non_smoking')),
    -- Additional audit and constraint fields...
);
```

### API Architecture

The waitlist API provides comprehensive CRUD operations with security considerations:

- **Authentication**: JWT-based authentication for all operations
- **Authorization**: Role-based access control for waitlist management
- **Validation**: Comprehensive input validation using utility functions
- **Error Handling**: Structured error responses with appropriate HTTP status codes

### Frontend Architecture

The frontend uses Vue.js with PrimeVue components:

- **State Management**: Composable stores for waitlist data management
- **Component Architecture**: Modular components for different waitlist operations
- **Form Validation**: Client-side validation with server-side verification
- **User Experience**: Responsive design with loading states and error handling

## Integration Points

### Client Management System
- **Integration**: Seamless client lookup and association with waitlist entries
- **Data Flow**: Client information flows from CRM to waitlist system
- **Validation**: Client existence validation during waitlist creation

### Reservation System
- **Integration**: Automatic reservation creation from confirmed waitlist entries
- **Data Flow**: Waitlist data transforms into reservation data structure
- **Validation**: Room availability validation during confirmation process

### Email System
- **Integration**: Email notification system with template management
- **Data Flow**: Waitlist data populates email templates for notifications
- **Validation**: Email delivery confirmation and error handling

### Room Management System
- **Integration**: Real-time room availability checking
- **Data Flow**: Room status affects waitlist vacancy calculations
- **Validation**: Room capacity and preference matching

## Security Considerations

### Token Security
- **Cryptographic Tokens**: Uses Node.js crypto.randomBytes for secure token generation
- **Token Expiry**: Configurable expiry times with automatic validation
- **Unique Constraints**: Database-level uniqueness enforcement for tokens
- **Rate Limiting**: Protection against token enumeration attacks

### Data Privacy
- **Contact Information**: Secure storage of email and phone contact details
- **Client Data**: Integration with existing client privacy controls
- **Audit Trail**: Complete tracking of data access and modifications
- **Data Retention**: Configurable retention policies for waitlist data

### Access Control
- **Authentication**: JWT-based authentication for all API endpoints
- **Authorization**: Role-based permissions for waitlist operations
- **Hotel Isolation**: Hotel-specific data access controls
- **Public Endpoints**: Secure public confirmation endpoints with token validation

## Performance Considerations

### Database Performance
- **Indexing Strategy**: Optimized indexes for common query patterns
  - Hotel and status combinations
  - Date range queries
  - Token lookups
  - Client associations

- **Query Optimization**: Efficient queries with proper joins and filtering
- **Constraint Validation**: Database-level constraints for data integrity

### API Performance
- **Pagination**: Configurable pagination for large datasets
- **Filtering**: Efficient server-side filtering to reduce data transfer
- **Caching**: Potential for caching frequently accessed data
- **Connection Pooling**: Database connection management for concurrent requests

### Frontend Performance
- **Lazy Loading**: Components loaded on demand
- **Data Caching**: Client-side caching of waitlist data
- **Optimistic Updates**: Immediate UI feedback with server confirmation
- **Debounced Search**: Efficient search and filtering implementation

## Testing Strategy

### Unit Testing
- **Model Testing**: Database model validation and business logic testing
- **API Testing**: Comprehensive endpoint testing with various scenarios
- **Component Testing**: Frontend component testing with mock data
- **Utility Testing**: Validation utility function testing

### Integration Testing
- **Email Integration**: Email sending and template rendering testing
- **Reservation Integration**: Waitlist-to-reservation conversion testing
- **Client Integration**: Client lookup and association testing
- **Token Validation**: Confirmation token lifecycle testing

### Security Testing
- **Token Security**: Token generation and validation security testing
- **Input Validation**: Comprehensive input sanitization testing
- **Access Control**: Permission and authorization testing
- **SQL Injection**: Database query security testing

## Monitoring and Maintenance

### System Monitoring
- **API Performance**: Response time and error rate monitoring
- **Email Delivery**: Email sending success rate tracking
- **Token Usage**: Confirmation token usage and expiry monitoring
- **Database Performance**: Query performance and index usage monitoring

### Data Maintenance
- **Token Cleanup**: Automated cleanup of expired tokens
- **Status Maintenance**: Periodic status validation and cleanup
- **Audit Data**: Retention policies for audit trail data
- **Performance Optimization**: Regular index and query optimization

### Error Handling
- **Email Failures**: Comprehensive error handling for email delivery issues
- **Database Errors**: Proper error handling and user feedback
- **Token Validation**: Clear error messages for invalid or expired tokens
- **System Failures**: Graceful degradation and error recovery

## Success Metrics

### Business Metrics
- **Conversion Rate**: Percentage of waitlist entries that convert to bookings
- **Revenue Recovery**: Revenue generated from waitlist conversions
- **Customer Satisfaction**: Feedback scores on waitlist experience
- **Operational Efficiency**: Reduction in manual waitlist management time

### Technical Metrics
- **Response Time**: API endpoint performance (< 200ms target)
- **Email Delivery**: Notification email success rate (> 99%)
- **System Uptime**: Availability during peak booking periods
- **Error Rate**: Application error frequency (< 0.1%)

### Usage Metrics
- **Waitlist Creation**: Number of waitlist entries created per period
- **Notification Success**: Percentage of successful manual notifications
- **Confirmation Rate**: Percentage of notified entries that confirm reservations
- **Token Expiry**: Rate of token expiry before confirmation

## Future Enhancements

### Short-term Improvements (Next 3 months)
1. **Automatic Notification System**: Implement automatic triggering when rooms become available
2. **Enhanced Background Jobs**: Comprehensive token cleanup and status maintenance
3. **Bulk Operations**: Mass actions for multiple waitlist entries

### Medium-term Improvements (3-6 months)
1. **Advanced Matching Logic**: Complex date overlap and preference matching
2. **Real-time Updates**: WebSocket integration for live status changes
3. **Enhanced Reporting**: Comprehensive waitlist analytics and reporting

### Long-term Improvements (6+ months)
1. **Machine Learning Integration**: Predictive analytics for demand forecasting
2. **Multi-channel Notifications**: SMS and other notification channels
3. **Advanced Automation**: Intelligent waitlist processing and optimization

## Conclusion

The Waitlist System represents a strategic feature for revenue recovery and customer experience enhancement. The current implementation provides a solid foundation with comprehensive database design, secure API endpoints, and user-friendly interfaces. The system successfully captures unmet demand and provides tools for manual conversion to reservations.

Key strengths include robust security implementation, comprehensive data validation, and seamless integration with existing hotel management systems. The architecture supports scalability and maintainability while providing the flexibility needed for diverse hotel operations.

Future development should focus on implementing automatic notification capabilities, enhancing matching algorithms, and adding advanced analytics features to maximize the business value of the waitlist system. The foundation is strong, and strategic enhancements will significantly improve operational efficiency and revenue recovery potential.