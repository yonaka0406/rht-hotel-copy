# Requirements Document

## Introduction

This specification defines the requirements for transitioning the application's primary database from a self-hosted PostgreSQL instance on a VPS to a managed Supabase instance. The system will implement automated backup capabilities, performance validation, and disaster recovery procedures to ensure business continuity during and after the transition.

## Glossary

- **Backup System**: The automated shell script and cron job that performs database backups
- **VPS**: Virtual Private Server hosting the current PostgreSQL database and Node.js application
- **Supabase Instance**: The managed PostgreSQL database service provided by Supabase
- **Backup File**: A compressed SQL dump file containing the complete database state
- **Testing Database**: The wehub_backup_test database on VPS used during testing phase
- **Production Database**: The wehub database on VPS used as the primary database
- **DR Plan**: Disaster Recovery Plan defining procedures to restore service during Supabase outages
- **Backup Script**: The shell script (backup.sh) that orchestrates the backup process
- **Credential File**: The .pgpass file containing database authentication credentials

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want automated weekly backups of the Supabase database restored to a VPS database, so that I can recover data in case of a Supabase service failure while staying within Supabase free tier data egress limits.

#### Acceptance Criteria

1. WHEN the scheduled time occurs, THE Backup System SHALL execute a full logical dump of the Supabase Instance
2. WHEN the database dump completes, THE Backup System SHALL restore the dump to a specified VPS PostgreSQL database
3. WHEN the restore completes during testing phase, THE Backup System SHALL restore to a database named wehub_backup_test
4. WHEN the restore completes during production phase, THE Backup System SHALL restore to the database named wehub
5. THE Backup System SHALL execute automatically once per week
6. WHEN each backup operation completes, THE Backup System SHALL record the success or failure status with timestamp to /var/log/supabase_backup.log
7. THE Backup System SHALL consume approximately 200 MB per backup operation to remain within the 5 GB monthly data egress limit

### Requirement 2

**User Story:** As a system administrator, I want database credentials stored securely, so that unauthorized users cannot access the Supabase database.

#### Acceptance Criteria

1. THE Backup Script SHALL retrieve database credentials from the Credential File located at ~/.pgpass
2. THE Credential File SHALL have file permissions set to 600 (read/write for owner only)
3. THE Backup Script SHALL NOT contain database passwords in plain text within the script file
4. WHEN the Credential File permissions are incorrect, THE Backup System SHALL refuse to use the credentials

### Requirement 3

**User Story:** As a system administrator, I want the backup script to support different target databases, so that I can test backups safely before using them in production.

#### Acceptance Criteria

1. THE Backup Script SHALL accept a command-line parameter to specify the target VPS database name
2. WHEN no parameter is provided during testing phase, THE Backup Script SHALL default to wehub_backup_test database
3. WHEN the script is configured for production, THE Backup Script SHALL restore to the wehub database
4. THE Backup Script SHALL log which target database was used for each backup operation

### Requirement 4

**User Story:** As a system administrator, I want to validate that backup operations do not degrade application performance, so that I can confirm the VPS can handle both the application and backup workload.

#### Acceptance Criteria

1. WHEN the Backup Script executes, THE Backup System SHALL complete the pg_dump and restore operations within resource constraints that do not cause application response time degradation exceeding 10 percent
2. WHILE the backup operation runs, THE VPS SHALL maintain sufficient available memory for the Node.js application to operate normally
3. WHILE the backup operation runs, THE VPS SHALL maintain CPU availability for the Node.js application to process user requests
4. THE system administrator SHALL monitor data egress from Supabase to ensure monthly usage remains below 5 GB

### Requirement 5

**User Story:** As a system administrator, I want a documented disaster recovery procedure, so that I can restore service quickly when Supabase experiences an outage and sync data back when service is restored.

#### Acceptance Criteria

1. THE DR Plan SHALL define the specific steps to switch the application from Supabase to the local VPS wehub database
2. THE DR Plan SHALL define the specific steps to reconfigure the Node.js application to use the local VPS database
3. THE DR Plan SHALL define the specific steps to migrate VPS data back to Supabase when service is restored
4. THE DR Plan SHALL define the specific steps to switch the application back to Supabase after data synchronization
5. THE DR Plan SHALL document the expected data loss window between the last backup and the outage occurrence

### Requirement 6

**User Story:** As a system administrator, I want a reusable script to migrate the complete VPS wehub database to the Supabase instance, so that I can synchronize data from VPS to Supabase whenever needed including after disaster recovery.

#### Acceptance Criteria

1. WHEN the migration script executes, THE Migration Script SHALL create a complete dump of the local VPS wehub database
2. WHEN the local database dump completes, THE Migration Script SHALL restore the dump to the Supabase Instance
3. THE Migration Script SHALL be executable multiple times without manual modification
4. WHEN the restore completes, THE Migration Script SHALL log the success or failure status with timestamp
5. WHEN the migration script is invoked, THE Migration Script SHALL use secure credential storage for both VPS and Supabase database connections

### Requirement 7

**User Story:** As a system administrator, I want to verify the backup system works correctly before automating it, so that I can identify and fix issues before they impact production operations.

#### Acceptance Criteria

1. WHEN the Backup Script is executed manually, THE Backup System SHALL create a valid compressed SQL dump file
2. WHEN the manual test completes, THE system administrator SHALL verify the Backup File exists in the backup directory
3. WHEN the manual test completes, THE system administrator SHALL verify the log file contains success entries
4. WHEN resource monitoring shows acceptable performance, THE system administrator SHALL proceed with cron automation