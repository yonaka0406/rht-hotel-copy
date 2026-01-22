# OTA Integration Requirements (EARS Format)

## 1. System Overview

**WHEN** the hotel management system receives reservation changes from the Property Management System (PMS)  
**THEN** the system **SHALL** automatically synchronize inventory data with Online Travel Agency (OTA) channels  
**AND** the system **SHALL** maintain accurate room availability across all booking channels.

## 2. Trigger Monitoring Requirements

### 2.1 Real-time Monitoring

**WHEN** a reservation is created, modified, or cancelled in the PMS  
**THEN** the system **SHALL** detect the change within 5 seconds  
**AND** the system **SHALL** trigger an OTA inventory update within 5 minutes  
**WHERE** the reservation affects current or future inventory (check_out >= current_date).

**WHEN** the monitoring system runs its scheduled checks  
**THEN** the system **SHALL** execute every 55 minutes  
**AND** the system **SHALL** analyze the last 60 minutes of activity  
**AND** the system **SHALL** provide 5-minute overlap between monitoring cycles  
**AND** the system **SHALL** ensure no gaps in monitoring coverage even if one check fails.

**WHEN** an OTA inventory update fails to trigger within the specified timeframe  
**THEN** the system **SHALL** categorize the failure as either:
- Missing trigger (true system failure)
- Silent skip (correct behavior when PMS stock matches OTA stock)  
**AND** the system **SHALL** log the categorization for monitoring purposes.

### 2.2 Automatic Remediation

**WHEN** missing OTA triggers are detected  
**AND** auto-remediation is enabled  
**THEN** the system **SHALL** automatically group overlapping date ranges by hotel  
**AND** the system **SHALL** call the inventory update API to synchronize stock  
**AND** the system **SHALL** reduce API calls by 25-75% through intelligent date range merging.

**WHEN** auto-remediation is executed  
**THEN** the system **SHALL** send email notifications to `dx@redhorse-group.co.jp`  
**AND** the notification **SHALL** include success/failure counts and affected hotels  
**AND** the notification **SHALL** be formatted in Japanese.

### 2.3 Performance Requirements

**WHEN** monitoring 100+ reservation changes across multiple hotels  
**THEN** the system **SHALL** complete analysis within 1000ms  
**AND** the system **SHALL** process at least 95 candidates per second  
**AND** the system **SHALL** use batched processing to optimize database queries.

## 3. Investigation Tool Requirements

### 3.1 Stock Investigation Interface

**WHEN** an administrator accesses the OTA management interface  
**THEN** the system **SHALL** provide a stock investigation tool  
**AND** the tool **SHALL** allow selection of hotel and target date  
**AND** the tool **SHALL** display current state snapshot including:
- Total rooms and maintenance blocks
- Confirmed reservations
- Calculated available stock

### 3.2 Gap Detection

**WHEN** the investigation tool analyzes a specific date  
**THEN** the system **SHALL** compare PMS events with OTA transmissions  
**AND** the system **SHALL** identify gaps within 5-minute windows  
**AND** the system **SHALL** provide risk level assessment (LOW/MEDIUM/HIGH)  
**AND** the system **SHALL** display chronological event timeline.

### 3.3 XML Analysis

**WHEN** analyzing OTA XML queue events  
**THEN** the system **SHALL** parse XML payloads to check for target date inclusion  
**AND** the system **SHALL** support multiple date formats (YYYY-MM-DD, YYYYMMDD, YYYY/MM/DD)  
**AND** the system **SHALL** handle XML parsing errors gracefully  
**AND** the system **SHALL** limit analysis to 3-day window and 200 records maximum.

## 4. Rate Synchronization Requirements

### 4.1 Rate Data Integrity

**WHEN** an OTA reservation is processed  
**AND** the reservation contains rate information in `RoomAndRoomRateInformation`  
**THEN** the system **SHALL** create corresponding records in the `reservation_rates` table  
**AND** the system **SHALL** ensure total price calculation is accurate.

**WHEN** rate insertion fails for an OTA reservation  
**THEN** the system **SHALL** log the failure with reservation details  
**AND** the system **SHALL** provide remediation tools to fix missing rates  
**AND** the system **SHALL** support batch processing of affected reservations.

### 4.2 Rate Remediation

**WHEN** existing reservations have missing rate data  
**AND** original `reservation_data` is available in `ota_reservation_queue`  
**THEN** the system **SHALL** provide automated remediation script  
**AND** the script **SHALL** extract rate information from original XML data  
**AND** the script **SHALL** insert missing `reservation_rates` records  
**AND** the script **SHALL** recalculate total prices where necessary.

## 5. Waitlist Management Requirements

### 5.1 Conflict Detection

**WHEN** multiple OTA reservations are received in a single XML file  
**AND** processing reservations sequentially would cause room availability conflicts  
**THEN** the system **SHALL** pre-validate all reservations against current PMS availability  
**AND** the system **SHALL** identify which reservations would fail due to room unavailability  
**AND** the system **SHALL** group failed reservations by room type and date.

### 5.2 OTA Status Management

**WHEN** reservation conflicts are detected  
**THEN** the system **SHALL** set the OTA's `salesStatus` to "Not for Sale" for affected room types and dates  
**AND** the system **SHALL** prevent new reservations from being accepted for those specific combinations  
**AND** the system **SHALL** provide manual override capability with manager approval  
**AND** the system **SHALL** maintain audit log of all status changes.

### 5.3 User Notifications

**WHEN** rooms are automatically marked as "Not for Sale" due to conflicts  
**THEN** the system **SHALL** display visual indicators in the PMS reservation calendar  
**AND** the system **SHALL** show warning banners when users attempt to create conflicting reservations  
**AND** the system **SHALL** send real-time notifications to affected hotel staff  
**AND** the system **SHALL** provide direct links to OTA inventory management screens.

## 6. Monitoring and Alerting Requirements

### 6.1 Email Notifications

**WHEN** OTA trigger inconsistencies are detected (success rate < 100%)  
**THEN** the system **SHALL** send email alert to `dx@redhorse-group.co.jp`  
**AND** the email **SHALL** include detailed statistics and affected hotel information  
**AND** the email **SHALL** be formatted in Japanese with JST timestamps  
**AND** the email **SHALL** use color-coded severity levels.

**WHEN** the monitoring system detects critical failures (success rate < 80%)  
**THEN** the system **SHALL** send high-priority email alerts  
**AND** the alert **SHALL** indicate immediate action is required  
**AND** the system **SHALL** provide specific recommendations based on failure patterns.

### 6.2 System Health Monitoring

**WHEN** the monitoring job runs on scheduled intervals  
**THEN** the system **SHALL** track success rates and performance metrics  
**AND** the system **SHALL** categorize issues by severity level:
- INFO: < 5% failure rate
- WARNING: 5-20% failure rate  
- CRITICAL: > 20% failure rate  
**AND** the system **SHALL** provide automated system health assessment.

### 6.3 Historical Analysis

**WHEN** monitoring data is collected over time  
**THEN** the system **SHALL** store results for trend analysis  
**AND** the system **SHALL** provide pattern identification capabilities  
**AND** the system **SHALL** support monthly analysis and system optimization recommendations  
**AND** the system **SHALL** maintain performance baselines for comparison.

## 7. Security and Access Control Requirements

### 7.1 Authentication

**WHEN** accessing OTA management interfaces  
**THEN** the system **SHALL** require admin-level authentication  
**AND** the system **SHALL** validate user permissions for hotel-specific operations  
**AND** the system **SHALL** log all administrative actions for audit purposes.

### 7.2 Data Protection

**WHEN** processing OTA reservation data  
**THEN** the system **SHALL** protect sensitive customer information  
**AND** the system **SHALL** use parameterized queries to prevent SQL injection  
**AND** the system **SHALL** implement proper error handling to prevent information leakage  
**AND** the system **SHALL** encrypt sensitive data in transit and at rest.

## 8. Performance and Scalability Requirements

### 8.1 Response Time

**WHEN** processing OTA inventory updates  
**THEN** the system **SHALL** complete updates within 5 seconds for single hotel operations  
**AND** the system **SHALL** complete batch operations within 30 seconds for up to 100 hotels  
**AND** the system **SHALL** provide progress indicators for long-running operations.

### 8.2 Throughput

**WHEN** handling peak reservation volumes  
**THEN** the system **SHALL** process at least 1000 reservation changes per hour  
**AND** the system **SHALL** maintain sub-second response times for monitoring queries  
**AND** the system **SHALL** scale horizontally to handle increased load.

### 8.3 Reliability

**WHEN** system components fail  
**THEN** the system **SHALL** implement automatic retry mechanisms with exponential backoff  
**AND** the system **SHALL** maintain service availability of 99.9% or higher  
**AND** the system **SHALL** provide graceful degradation when external services are unavailable  
**AND** the system **SHALL** recover automatically from transient failures.

## 9. Integration Requirements

### 9.1 Database Integration

**WHEN** integrating with existing database schema  
**THEN** the system **SHALL** use existing tables without requiring schema changes  
**AND** the system **SHALL** maintain backward compatibility with existing functionality  
**AND** the system **SHALL** use efficient queries with proper indexing.

### 9.2 API Integration

**WHEN** communicating with external OTA services  
**THEN** the system **SHALL** implement proper error handling and retry logic  
**AND** the system **SHALL** respect rate limits imposed by external services  
**AND** the system **SHALL** provide fallback mechanisms when external APIs are unavailable  
**AND** the system **SHALL** log all external API interactions for debugging purposes.

## 10. Maintenance and Support Requirements

### 10.1 Logging and Debugging

**WHEN** system issues occur  
**THEN** the system **SHALL** provide comprehensive logging with appropriate detail levels  
**AND** the system **SHALL** include correlation IDs for tracing requests across components  
**AND** the system **SHALL** provide debugging tools for investigating specific scenarios  
**AND** the system **SHALL** maintain log retention policies for compliance and analysis.

### 10.2 Configuration Management

**WHEN** system configuration needs to be managed  
**THEN** the system **SHALL** use hardcoded configuration values for OTA monitoring settings  
**AND** the system **SHALL** use the following default values with safe overlap strategy:
- Monitor enabled: true
- Auto-remediation enabled: true  
- Check interval: 55 minutes (3300000ms)
- Monitoring window: 60 minutes (3600000ms)
- Alert threshold: 95% success rate
- Critical threshold: 80% success rate
- Email notifications: enabled  
**AND** the system **SHALL** provide 5-minute overlap between monitoring cycles for fail-safe coverage  
**AND** the system **SHALL** eliminate the need for environment variable configuration  
**AND** the system **SHALL** provide consistent behavior across all environments.

---

**Document Status**: ✅ Complete  
**Last Updated**: January 2026  
**Review Cycle**: Quarterly