# Design Document

## Overview

This design implements a bidirectional database synchronization system for transitioning from VPS PostgreSQL to Supabase. The solution provides:

1. **VPS → Supabase Migration**: Initial and on-demand data migration from VPS wehub database to Supabase
2. **Supabase → VPS Backup**: Automated weekly backups from Supabase to VPS databases (wehub_backup_test for testing, wehub for production)
3. **Disaster Recovery**: Procedures to failover to VPS during Supabase outages and sync back when restored

The design uses native PostgreSQL tools (pg_dump, psql), shell scripting, and cron scheduling. Weekly backups are scheduled to stay within Supabase free tier's 5 GB/month data egress limit (~200 MB × 4 weeks = ~800 MB/month). The design prioritizes security through credential file isolation, operational reliability through logging and error handling, and safe testing through separate database names.

## Architecture

The system follows a three-tier architecture:

1. **Credential Layer**: Secure storage of database authentication using PostgreSQL's .pgpass mechanism
2. **Execution Layer**: Shell script orchestrating backup, compression, logging, and cleanup operations
3. **Scheduling Layer**: Cron daemon triggering automated execution at defined intervals

```
┌─────────────────────────────────────────────────────────────┐
│                         Cron Daemon                          │
│                    (Hourly Trigger: 0 * * * *)              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backup Script (backup.sh)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   pg_dump    │─▶│     gzip     │─▶│  File Write  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                                      │             │
│         ▼                                      ▼             │
│  ┌──────────────┐                      ┌──────────────┐    │
│  │ Error Check  │                      │   Cleanup    │    │
│  └──────────────┘                      └──────────────┘    │
│         │                                      │             │
│         └──────────────┬───────────────────────┘             │
│                        ▼                                     │
│                 ┌──────────────┐                            │
│                 │   Logging    │                            │
│                 └──────────────┘                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Credential File                           │
│                  (~/.pgpass, mode 600)                       │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Component 0: Migration Script (migrate_to_supabase.sh)

**Purpose**: Provide a reusable script to migrate data from the local VPS PostgreSQL database to the Supabase instance (Requirement 6)

**Location**: `~/migrate_to_supabase.sh` (user home directory)

**Configuration Variables**:
```bash
# Local VPS Database (source)
LOCAL_DB_USER="your_local_user"
LOCAL_DB_NAME="wehub"  # Production VPS database
LOCAL_DB_HOST="localhost"

# Supabase Database (destination)
SUPABASE_DB_USER="postgres"
SUPABASE_DB_HOST="db.xxx.supabase.co"
SUPABASE_DB_NAME="postgres"

# Temporary storage
TEMP_DUMP="/tmp/vps_migration_$(date +%Y%m%d_%H%M%S).sql"
LOG_FILE="/var/log/supabase_migration.log"
```

**Workflow Steps**:

1. **Initialization**
   - Log migration start with timestamp
   - Set PGPASSFILE environment variable

2. **Local Database Dump**
   - Execute: `pg_dump -h $LOCAL_DB_HOST -U $LOCAL_DB_USER -d $LOCAL_DB_NAME > $TEMP_DUMP`
   - Check exit status for errors

3. **Restore to Supabase**
   - Execute: `psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME < $TEMP_DUMP`
   - Check exit status for errors

4. **Cleanup**
   - Remove temporary dump file
   - Log completion status

5. **Error Handling**
   - On failure: Log error, remove temp file, exit with code 1
   - On success: Log success message, exit with code 0

**Script Template**:
```bash
#!/bin/bash

# Configuration
LOCAL_DB_USER="your_local_user"
LOCAL_DB_NAME="wehub"  # Production VPS database
LOCAL_DB_HOST="localhost"

SUPABASE_DB_USER="postgres"
SUPABASE_DB_HOST="db.xxxxxxxx.supabase.co"
SUPABASE_DB_NAME="postgres"

TEMP_DUMP="/tmp/vps_migration_$(date +%Y%m%d_%H%M%S).sql"
LOG_FILE="/var/log/supabase_migration.log"

# Set credential file
export PGPASSFILE=~/.pgpass

echo "---" >> $LOG_FILE
echo "Migration started at $(date)" >> $LOG_FILE

# Dump local database
echo "Dumping local VPS database..." >> $LOG_FILE
pg_dump -h $LOCAL_DB_HOST -U $LOCAL_DB_USER -d $LOCAL_DB_NAME > $TEMP_DUMP

if [ $? -ne 0 ]; then
  echo "Migration FAILED: Local dump failed at $(date)" >> $LOG_FILE
  rm -f $TEMP_DUMP
  exit 1
fi

# Restore to Supabase
echo "Restoring to Supabase..." >> $LOG_FILE
psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME < $TEMP_DUMP

if [ $? -ne 0 ]; then
  echo "Migration FAILED: Supabase restore failed at $(date)" >> $LOG_FILE
  rm -f $TEMP_DUMP
  exit 1
fi

# Cleanup
rm -f $TEMP_DUMP
echo "Migration successful at $(date)" >> $LOG_FILE
echo "Migration complete." >> $LOG_FILE

exit 0
```

**Usage**: Can be executed manually whenever VPS-to-Supabase synchronization is needed

### Component 1: Credential File (~/.pgpass)

**Purpose**: Securely store Supabase database credentials outside the backup script (Requirement 2)

**Location**: `~/.pgpass` in the home directory of the user executing the backup script

**Format**:
```
hostname:port:database:username:password
```

**Example** (supports multiple database connections):
```
localhost:5432:wehub:your_local_user:local_password
localhost:5432:wehub_backup_test:your_local_user:local_password
db.xxxxxxxx.supabase.co:5432:postgres:postgres:supabase_password
```

**Security Requirements**:
- File permissions MUST be set to 600 (owner read/write only)
- PostgreSQL client tools will refuse to use the file if permissions are more permissive
- No credentials stored in script files or environment variables visible to process listings

**Interface**: The backup script sets the `PGPASSFILE` environment variable to point to this file before invoking pg_dump

### Component 2: Backup Script (backup_supabase_to_vps.sh)

**Purpose**: Orchestrate the complete backup workflow from Supabase to VPS database (Requirements 1, 3)

**Location**: `~/backup_supabase_to_vps.sh` (user home directory)

**Configuration Variables**:
```bash
# Source: Supabase
SUPABASE_DB_USER="postgres"
SUPABASE_DB_HOST="db.xxx.supabase.co"
SUPABASE_DB_NAME="postgres"

# Destination: VPS
LOCAL_DB_USER="your_local_user"
LOCAL_DB_HOST="localhost"
LOCAL_DB_NAME="${1:-wehub_backup_test}"  # Default to test DB, accept parameter

# Temporary storage
TEMP_DUMP="/tmp/supabase_backup_$(date +%Y%m%d_%H%M%S).sql"
LOG_FILE="/var/log/supabase_backup.log"
```

**Workflow Steps**:

1. **Initialization**
   - Parse command-line parameter for target database (defaults to wehub_backup_test)
   - Log backup start with timestamp and target database
   - Set PGPASSFILE environment variable

2. **Supabase Dump**
   - Execute: `pg_dump -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME > $TEMP_DUMP`
   - Check exit status for errors

3. **VPS Restore**
   - Drop and recreate target database to ensure clean restore
   - Execute: `psql -h $LOCAL_DB_HOST -U $LOCAL_DB_USER -d $LOCAL_DB_NAME < $TEMP_DUMP`
   - Check exit status for errors

4. **Cleanup**
   - Remove temporary dump file
   - Log completion status

5. **Error Handling**
   - On failure: Log error, remove temp file, exit with code 1
   - On success: Log success message with target database, exit with code 0

**Script Template**:
```bash
#!/bin/bash

# Configuration
SUPABASE_DB_USER="postgres"
SUPABASE_DB_HOST="db.xxxxxxxx.supabase.co"
SUPABASE_DB_NAME="postgres"

LOCAL_DB_USER="your_local_user"
LOCAL_DB_HOST="localhost"
LOCAL_DB_NAME="${1:-wehub_backup_test}"  # Default to test, or use first parameter

TEMP_DUMP="/tmp/supabase_backup_$(date +%Y%m%d_%H%M%S).sql"
LOG_FILE="/var/log/supabase_backup.log"

# Set credential file
export PGPASSFILE=~/.pgpass

echo "---" >> $LOG_FILE
echo "Backup started at $(date) - Target: $LOCAL_DB_NAME" >> $LOG_FILE

# Dump Supabase database
echo "Dumping Supabase database..." >> $LOG_FILE
pg_dump -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME > $TEMP_DUMP

if [ $? -ne 0 ]; then
  echo "Backup FAILED: Supabase dump failed at $(date)" >> $LOG_FILE
  rm -f $TEMP_DUMP
  exit 1
fi

# Drop and recreate target database for clean restore
echo "Preparing target database $LOCAL_DB_NAME..." >> $LOG_FILE
psql -h $LOCAL_DB_HOST -U $LOCAL_DB_USER -d postgres -c "DROP DATABASE IF EXISTS $LOCAL_DB_NAME;"
psql -h $LOCAL_DB_HOST -U $LOCAL_DB_USER -d postgres -c "CREATE DATABASE $LOCAL_DB_NAME;"

# Restore to VPS
echo "Restoring to VPS database $LOCAL_DB_NAME..." >> $LOG_FILE
psql -h $LOCAL_DB_HOST -U $LOCAL_DB_USER -d $LOCAL_DB_NAME < $TEMP_DUMP

if [ $? -ne 0 ]; then
  echo "Backup FAILED: VPS restore failed at $(date)" >> $LOG_FILE
  rm -f $TEMP_DUMP
  exit 1
fi

# Cleanup
rm -f $TEMP_DUMP
echo "Backup successful to $LOCAL_DB_NAME at $(date)" >> $LOG_FILE
echo "Backup complete." >> $LOG_FILE

exit 0
```

**Usage**:
- Testing phase: `./backup_supabase_to_vps.sh` (defaults to wehub_backup_test)
- Production phase: `./backup_supabase_to_vps.sh wehub` (restores to wehub database)

### Component 3: Cron Scheduler

**Purpose**: Automate backup execution at weekly intervals (Requirement 1)

**Configuration**: User crontab entry

**Schedule Syntax**:

Testing phase (backup to wehub_backup_test every Sunday at 2 AM):
```
0 2 * * 0 /home/username/backup_supabase_to_vps.sh
```

Production phase (backup to wehub every Sunday at 2 AM):
```
0 2 * * 0 /home/username/backup_supabase_to_vps.sh wehub
```

**Schedule Breakdown**:
- Minute: 0
- Hour: 2 (2 AM, low-traffic time)
- Day of Month: * (any day)
- Month: * (every month)
- Day of Week: 0 (Sunday)

**Rationale**: Weekly schedule keeps data egress within Supabase free tier limits (5 GB/month). With ~200 MB database size, 4 weekly backups = ~800 MB/month, well under the limit.

**Setup Command**:
```bash
crontab -e
```

**Verification**:
```bash
crontab -l  # List current cron jobs
```

## Data Models

### Backup File Naming Convention

**Format**: `backup-YYYY-MM-DD-HHMMSS.sql.gz`

**Components**:
- Prefix: `backup-` (identifies file type)
- Date: `YYYY-MM-DD` (ISO 8601 date format)
- Time: `HHMMSS` (24-hour time format)
- Extension: `.sql.gz` (indicates compressed SQL dump)

**Example**: `backup-2025-11-14-150000.sql.gz` (backup created at 3:00 PM on November 14, 2025)

**Sorting**: Lexicographic sorting naturally orders files chronologically

### Log File Format

**Location**: `/var/log/supabase_backup.log`

**Entry Format**:
```
---
Backup started at [timestamp]
Backup successful: [filename]
Cleaning up backups older than [days] days...
Backup and cleanup complete.
```

**Error Format**:
```
---
Backup started at [timestamp]
Backup FAILED at [timestamp]
```

## Error Handling

### Credential File Errors

**Scenario**: .pgpass file has incorrect permissions or doesn't exist

**Detection**: pg_dump will fail with authentication error

**Handling**: 
- Script logs failure to log file
- Removes incomplete backup file
- Exits with code 1
- Cron will email error output to user (if configured)

**Prevention**: Document setup steps clearly in tasks (Requirement 6)

### Disk Space Errors

**Scenario**: VPS runs out of disk space during backup

**Detection**: gzip or file write operation fails

**Handling**:
- Script detects failure via exit code
- Logs error
- Removes incomplete file
- Exits with code 1

**Prevention**: Cleanup operation removes old backups before disk fills

### Network Errors

**Scenario**: Cannot connect to Supabase database

**Detection**: pg_dump fails with connection error

**Handling**:
- Script logs failure
- Removes incomplete file
- Exits with code 1
- Next hourly run will retry

**Mitigation**: Hourly schedule means maximum 1-hour gap in backups

### Performance Degradation

**Scenario**: Backup operation consumes excessive resources (Requirement 4)

**Detection**: Manual monitoring during test phase using htop

**Handling**:
- If degradation detected during testing, adjust approach:
  - Use pg_dump with --compress option instead of piping to gzip
  - Add nice/ionice to reduce process priority
  - Schedule backups during low-traffic periods
  - Consider incremental backups for very large databases

**Validation**: Test phase (Task 1.6) specifically monitors resource usage

## Testing Strategy

### Phase 1: Manual Testing (Requirement 6)

**Objective**: Validate backup functionality and measure resource impact before automation

**Test Steps**:
1. Install postgresql-client on VPS
2. Create and configure .pgpass file
3. Create backup script with correct Supabase credentials
4. Make script executable
5. Open two SSH terminals
6. Terminal 1: Run `htop` to monitor CPU and memory
7. Terminal 2: Execute `~/backup.sh` manually
8. Observe resource usage during pg_dump and gzip operations
9. Verify backup file created in /opt/supabase_backups
10. Verify log entries in /var/log/supabase_backup.log
11. Verify backup file can be decompressed: `gunzip -t backup-*.sql.gz`

**Success Criteria**:
- Backup file created successfully
- Log shows success message
- CPU usage spike is temporary and acceptable
- Memory usage does not cause OOM conditions
- Node.js application remains responsive

### Phase 2: Automated Testing

**Objective**: Validate cron automation and long-term stability

**Test Steps**:
1. Add cron entry for weekly execution (Sunday 2 AM)
2. Monitor for 2-3 weeks
3. Check log file for consistent success entries
4. Verify weekly backup completes successfully
5. Monitor VPS performance during backup execution
6. Monitor Supabase data egress metrics to confirm staying under 5 GB/month

**Success Criteria**:
- Weekly backups execute successfully
- No backup failures in log
- Data egress remains under 1 GB per month
- No performance degradation during backup execution
- VPS disk space sufficient for database restore

### Phase 3: Disaster Recovery Testing

**Objective**: Validate DR procedures work correctly

**Test Steps** (in non-production environment):
1. Identify latest backup file
2. Stop application
3. Restore backup to local PostgreSQL: `gunzip < backup-latest.sql.gz | psql -U user -d dbname`
4. Reconfigure application to use local database
5. Restart application
6. Verify application functionality

**Success Criteria**:
- Backup restores without errors
- Application connects to restored database
- Data integrity verified (spot checks)
- DR procedure documented and understood

## Disaster Recovery Plan

### Trigger Conditions

Execute DR plan when:
- Supabase status page reports outage affecting your region
- Application cannot connect to Supabase database
- Supabase support confirms extended downtime

### DR Procedure (Requirement 5)

#### Phase 1: Failover to VPS (During Supabase Outage)

**Step 1: Confirm Outage**
- Check Supabase status page
- Verify application cannot connect to Supabase
- Confirm outage is not a local network issue

**Step 2: Stop Application**
```bash
pm2 stop app
# or
sudo systemctl stop your-app-service
```

**Step 3: Verify Latest Backup**
The wehub database should already contain the most recent hourly backup from Supabase. Verify:
```bash
psql -U your_local_user -d wehub -c "SELECT NOW();"
```

**Step 4: Reconfigure Application to Use VPS**

Edit application .env file:
```bash
# Change from:
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres

# To:
DATABASE_URL=postgresql://your_local_user:password@localhost:5432/wehub
```

**Step 5: Restart Application**
```bash
pm2 start app
# or
sudo systemctl start your-app-service
```

**Step 6: Verify Operation**
- Check application logs
- Test critical functionality
- Monitor error rates
- Application is now running on VPS wehub database

**Data Loss**: Maximum 7 days of data (time since last weekly backup)

#### Phase 2: Return to Supabase (After Service Restoration)

**Step 1: Confirm Supabase Service Restored**
- Check Supabase status page shows operational
- Test connection to Supabase database

**Step 2: Stop Application**
```bash
pm2 stop app
# or
sudo systemctl stop your-app-service
```

**Step 3: Migrate VPS Data Back to Supabase**
Run the VPS-to-Supabase migration script to sync any data created during the outage:
```bash
./migrate_to_supabase.sh
```

Verify migration log shows success:
```bash
tail -20 /var/log/supabase_migration.log
```

**Step 4: Reconfigure Application to Use Supabase**

Edit application .env file:
```bash
# Change from:
DATABASE_URL=postgresql://your_local_user:password@localhost:5432/wehub

# Back to:
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

**Step 5: Restart Application**
```bash
pm2 start app
# or
sudo systemctl start your-app-service
```

**Step 6: Verify Operation**
- Check application logs
- Test critical functionality
- Verify data created during outage is present
- Monitor error rates

**Step 7: Resume Normal Backup Operations**
Weekly Supabase-to-VPS backups will resume automatically via cron (every Sunday at 2 AM).

### Data Loss Window

**Expected Data Loss**: All data created or modified between the last successful weekly backup and the time of Supabase failure.

**Maximum Data Loss**: 7 days (if failure occurs immediately before the next scheduled backup)

**Typical Data Loss**: 3.5 days (average case)

**Note**: Weekly backup schedule is a trade-off to stay within Supabase free tier's 5 GB/month data egress limit. For critical data, consider upgrading to a paid Supabase plan to enable more frequent backups.

### Recovery Time Objective (RTO)

**Estimated RTO**: 5-10 minutes
- 2 minutes: Identify and confirm outage
- 1 minute: Reconfigure application (database already restored via weekly backup)
- 2 minutes: Application restart and verification
- 5 minutes: Buffer for unexpected issues

### Return to Supabase

When Supabase service is restored:
1. Assess data created during local operation
2. Decide on data migration strategy (manual export/import or accept loss)
3. Reconfigure application back to Supabase connection string
4. Restart application
5. Resume normal backup operations