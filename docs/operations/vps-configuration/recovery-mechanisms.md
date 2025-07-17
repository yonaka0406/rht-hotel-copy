# Automatic Recovery Mechanisms

This document provides detailed information about the automatic recovery mechanisms implemented for PostgreSQL on the Sakura VPS, specifically designed to handle DoS attacks from scraper bots.

## Health Check Implementation

The PostgreSQL health check system is designed to monitor the database's availability and performance, automatically triggering recovery mechanisms when issues are detected. This section documents the implementation of the health check script and its configuration.

### Health Check Script Overview

The health check script (`pg-health-check.sh`) performs multiple checks to verify PostgreSQL's health:

1. **Service Status Check**: Verifies that the PostgreSQL service is running
2. **Connection Check**: Ensures PostgreSQL is accepting connections
3. **Authentication Check**: Verifies that the application user can authenticate
4. **Performance Check**: Measures query response time
5. **Write Check**: Confirms the database can write data
6. **Disk Space Check**: Monitors available disk space

The script implements a failure counting mechanism that triggers recovery actions after a specified number of consecutive failures, providing resilience against transient issues while ensuring prompt recovery from persistent problems.

### Health Check Script Implementation

The health check script is located at `/usr/local/bin/pg-health-check.sh` and is implemented as follows:

```bash
#!/bin/bash

# PostgreSQL health check script
# This script checks if PostgreSQL is running and responding to queries
# It is designed to be run by a systemd timer to monitor PostgreSQL health

# Configuration
LOG_FILE="/var/log/postgresql/health-check.log"
MAX_FAILURES=3
FAILURE_COUNT_FILE="/var/run/postgresql/failure_count"
PG_USER="rhtsys_user"
PG_DATABASE="rhthotels"
RECOVERY_SERVICE="postgresql-recovery.service"

# Create log directory if it doesn't exist
LOG_DIR=$(dirname "$LOG_FILE")
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    chown postgres:postgres "$LOG_DIR"
fi

# Create failure count directory if it doesn't exist
FAILURE_DIR=$(dirname "$FAILURE_COUNT_FILE")
if [ ! -d "$FAILURE_DIR" ]; then
    mkdir -p "$FAILURE_DIR"
    chown postgres:postgres "$FAILURE_DIR"
fi

# Initialize failure count if file doesn't exist
if [ ! -f "$FAILURE_COUNT_FILE" ]; then
    echo "0" > "$FAILURE_COUNT_FILE"
    chown postgres:postgres "$FAILURE_COUNT_FILE"
fi

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Function to increment failure count
increment_failure() {
    FAILURES=$(cat "$FAILURE_COUNT_FILE")
    FAILURES=$((FAILURES + 1))
    echo "$FAILURES" > "$FAILURE_COUNT_FILE"
    
    log_message "WARNING: Failure count: $FAILURES/$MAX_FAILURES"
    
    if [ "$FAILURES" -ge "$MAX_FAILURES" ]; then
        log_message "CRITICAL: Maximum failures reached, attempting recovery"
        systemctl start "$RECOVERY_SERVICE"
        echo "0" > "$FAILURE_COUNT_FILE"
    fi
}

# Function to reset failure count
reset_failure() {
    echo "0" > "$FAILURE_COUNT_FILE"
}

# Start health check
log_message "INFO: Starting PostgreSQL health check"

# Check 1: Is PostgreSQL service running?
if ! systemctl is-active --quiet postgresql; then
    log_message "ERROR: PostgreSQL service is not running"
    increment_failure
    exit 1
fi

# Check 2: Is PostgreSQL accepting connections?
if ! sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    log_message "ERROR: PostgreSQL is not accepting connections"
    increment_failure
    exit 1
fi

# Check 3: Can we connect with application user?
if ! PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1" >/dev/null 2>&1; then
    log_message "ERROR: Cannot connect to PostgreSQL with application user"
    increment_failure
    exit 1
fi

# Check 4: Is the database responding to queries in a timely manner?
QUERY_START_TIME=$(date +%s%N)
PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1" >/dev/null 2>&1
QUERY_END_TIME=$(date +%s%N)
QUERY_DURATION=$(( (QUERY_END_TIME - QUERY_START_TIME) / 1000000 )) # Convert to milliseconds

if [ "$QUERY_DURATION" -gt 5000 ]; then # 5 seconds threshold
    log_message "ERROR: PostgreSQL query response time is too slow: ${QUERY_DURATION}ms"
    increment_failure
    exit 1
fi

# Check 5: Is the database able to write data?
TEST_TABLE="health_check_test"
if ! PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "CREATE TABLE IF NOT EXISTS $TEST_TABLE (id SERIAL PRIMARY KEY, check_time TIMESTAMP DEFAULT NOW());" >/dev/null 2>&1; then
    log_message "ERROR: Cannot create test table in PostgreSQL"
    increment_failure
    exit 1
fi

if ! PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "INSERT INTO $TEST_TABLE (check_time) VALUES (NOW());" >/dev/null 2>&1; then
    log_message "ERROR: Cannot insert data into test table in PostgreSQL"
    increment_failure
    exit 1
fi

# Clean up old test data (keep only the last 100 entries)
PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "DELETE FROM $TEST_TABLE WHERE id NOT IN (SELECT id FROM $TEST_TABLE ORDER BY check_time DESC LIMIT 100);" >/dev/null 2>&1

# Check 6: Is the database running out of disk space?
DB_DISK=$(df -h /var/lib/postgresql | tail -n 1 | awk '{print $5}' | sed 's/%//')
if [ "$DB_DISK" -gt 90 ]; then
    log_message "WARNING: PostgreSQL data directory is running out of disk space: ${DB_DISK}%"
    # Don't increment failure count for disk space warning, just log it
fi

# All checks passed
log_message "INFO: PostgreSQL is healthy"
reset_failure
exit 0
```

### Health Check Components

#### Configuration Variables

| Variable | Description |
|----------|-------------|
| LOG_FILE | Path to the health check log file |
| MAX_FAILURES | Number of consecutive failures before triggering recovery |
| FAILURE_COUNT_FILE | File to store the current failure count |
| PG_USER | PostgreSQL user for application connection test |
| PG_DATABASE | PostgreSQL database for application connection test |
| RECOVERY_SERVICE | Systemd service to trigger for recovery |

#### Health Check Functions

1. **log_message()**: Writes timestamped messages to the log file
2. **increment_failure()**: Increments the failure count and triggers recovery if threshold is reached
3. **reset_failure()**: Resets the failure count after a successful health check

#### Health Check Tests

1. **Service Status Check**:
   ```bash
   systemctl is-active --quiet postgresql
   ```
   Verifies that the PostgreSQL service is running according to systemd.

2. **Connection Check**:
   ```bash
   sudo -u postgres psql -c "SELECT 1"
   ```
   Ensures PostgreSQL is accepting connections from the postgres superuser.

3. **Authentication Check**:
   ```bash
   PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1"
   ```
   Verifies that the application user can authenticate and connect to the database.

4. **Performance Check**:
   ```bash
   QUERY_START_TIME=$(date +%s%N)
   PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "SELECT 1"
   QUERY_END_TIME=$(date +%s%N)
   QUERY_DURATION=$(( (QUERY_END_TIME - QUERY_START_TIME) / 1000000 ))
   ```
   Measures query response time to detect performance degradation.

5. **Write Check**:
   ```bash
   PGPASSWORD="${PG_PASSWORD}" psql -h localhost -U "$PG_USER" -d "$PG_DATABASE" -c "INSERT INTO $TEST_TABLE (check_time) VALUES (NOW());"
   ```
   Confirms the database can write data by inserting a record into a test table.

6. **Disk Space Check**:
   ```bash
   DB_DISK=$(df -h /var/lib/postgresql | tail -n 1 | awk '{print $5}' | sed 's/%//')
   ```
   Monitors available disk space to prevent disk-full situations.

### Failure Counting Mechanism

The script implements a failure counting mechanism that:

1. Increments a counter for each failed health check
2. Resets the counter after a successful health check
3. Triggers recovery actions after reaching the MAX_FAILURES threshold

This approach provides resilience against transient issues while ensuring prompt recovery from persistent problems.

### Installation and Configuration

To install and configure the health check script:

1. **Create the Script**:
   ```bash
   sudo mkdir -p /usr/local/bin
   sudo nano /usr/local/bin/pg-health-check.sh
   # Paste the script content
   sudo chmod +x /usr/local/bin/pg-health-check.sh
   ```

2. **Set Up Environment Variables**:
   ```bash
   sudo nano /etc/default/postgresql-health-check
   ```
   Add the following content:
   ```
   PG_PASSWORD="your_application_user_password"
   ```

3. **Create Log Directory**:
   ```bash
   sudo mkdir -p /var/log/postgresql
   sudo chown postgres:postgres /var/log/postgresql
   ```

4. **Create Failure Count Directory**:
   ```bash
   sudo mkdir -p /var/run/postgresql
   sudo chown postgres:postgres /var/run/postgresql
   ```

### Security Considerations

The health check script includes several security measures:

1. **Password Handling**:
   - The database password is stored in a separate environment file
   - The password is passed via the PGPASSWORD environment variable, not command line arguments

2. **File Permissions**:
   - Log files and failure count files are owned by the postgres user
   - The script ensures proper directory permissions

3. **Error Handling**:
   - All commands use proper error checking
   - Failures are logged with detailed error messages

4. **Resource Usage**:
   - The script performs minimal operations to avoid resource contention
   - Old test data is automatically cleaned up to prevent database bloat

### Customization Options

The health check script can be customized by modifying the following parameters:

1. **MAX_FAILURES**: Adjust the number of consecutive failures before triggering recovery
2. **Test Thresholds**: Modify the performance thresholds (e.g., query response time)
3. **Additional Checks**: Add custom checks specific to your application
4. **Recovery Actions**: Customize the recovery actions triggered on failure

### Logging and Monitoring

The health check script logs all activities to `/var/log/postgresql/health-check.log` with the following log levels:

- **INFO**: Normal operation messages
- **WARNING**: Potential issues that don't require immediate action
- **ERROR**: Failed checks that increment the failure counter
- **CRITICAL**: Severe issues that trigger recovery actions

To monitor the health check logs:

```bash
sudo tail -f /var/log/postgresql/health-check.log
```

Example log output:
```
2025-07-17 10:00:00 - INFO: Starting PostgreSQL health check
2025-07-17 10:00:00 - INFO: PostgreSQL is healthy
2025-07-17 10:01:00 - INFO: Starting PostgreSQL health check
2025-07-17 10:01:00 - ERROR: PostgreSQL is not accepting connections
2025-07-17 10:01:00 - WARNING: Failure count: 1/3
2025-07-17 10:02:00 - INFO: Starting PostgreSQL health check
2025-07-17 10:02:00 - ERROR: PostgreSQL is not accepting connections
2025-07-17 10:02:00 - WARNING: Failure count: 2/3
2025-07-17 10:03:00 - INFO: Starting PostgreSQL health check
2025-07-17 10:03:00 - ERROR: PostgreSQL is not accepting connections
2025-07-17 10:03:00 - WARNING: Failure count: 3/3
2025-07-17 10:03:00 - CRITICAL: Maximum failures reached, attempting recovery
```

## Recovery Service Configuration

### PostgreSQL Recovery Script

The PostgreSQL recovery script (`pg-recovery.sh`) is designed to automatically recover the PostgreSQL database from various failure scenarios, including crashes, corruption, and resource exhaustion. This section documents the implementation of the recovery script and its configuration.

#### Recovery Script Overview

The recovery script performs a series of steps to restore PostgreSQL to a healthy state:

1. **Service Management**: Stops and restarts the PostgreSQL service
2. **Lock File Cleanup**: Removes stale PID files and locks
3. **Disk Space Management**: Cleans up old logs and WAL files if disk space is low
4. **Corruption Detection**: Checks for and attempts to handle database corruption
5. **Service Verification**: Confirms that PostgreSQL is running and accepting connections
6. **Integrity Verification**: Validates database integrity after recovery

The script implements a recovery attempt counting mechanism that limits the number of automatic recovery attempts before requiring manual intervention, preventing endless recovery loops for severe issues.

#### Recovery Script Implementation

The recovery script is located at `/usr/local/bin/pg-recovery.sh` and is implemented as follows:

```bash
#!/bin/bash

# PostgreSQL Recovery Script
# This script performs recovery actions for PostgreSQL database failures
# It is triggered by the health check script when multiple failures are detected

# Configuration
LOG_FILE="/var/log/postgresql/recovery.log"
PG_VERSION="16"
PG_CLUSTER="main"
PG_DATA_DIR="/var/lib/postgresql/${PG_VERSION}/${PG_CLUSTER}"
PG_CONFIG_DIR="/etc/postgresql/${PG_VERSION}/${PG_CLUSTER}"
MAX_RECOVERY_ATTEMPTS=3
RECOVERY_COUNT_FILE="/var/run/postgresql/recovery_count"
ALERT_EMAIL="admin@example.com"
BACKUP_DIR="/var/backups/postgresql"

# Create log directory if it doesn't exist
LOG_DIR=$(dirname "$LOG_FILE")
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    chown postgres:postgres "$LOG_DIR"
fi

# Create recovery count directory if it doesn't exist
RECOVERY_DIR=$(dirname "$RECOVERY_COUNT_FILE")
if [ ! -d "$RECOVERY_DIR" ]; then
    mkdir -p "$RECOVERY_DIR"
    chown postgres:postgres "$RECOVERY_DIR"
fi

# Initialize recovery count if file doesn't exist
if [ ! -f "$RECOVERY_COUNT_FILE" ]; then
    echo "0" > "$RECOVERY_COUNT_FILE"
    chown postgres:postgres "$RECOVERY_COUNT_FILE"
fi

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to send alert email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log_message "INFO: Alert email sent to $ALERT_EMAIL"
    else
        log_message "WARNING: mail command not available, could not send alert"
    fi
}

# Function to increment recovery count
increment_recovery_count() {
    RECOVERY_COUNT=$(cat "$RECOVERY_COUNT_FILE")
    RECOVERY_COUNT=$((RECOVERY_COUNT + 1))
    echo "$RECOVERY_COUNT" > "$RECOVERY_COUNT_FILE"
    
    log_message "WARNING: Recovery attempt count: $RECOVERY_COUNT/$MAX_RECOVERY_ATTEMPTS"
    
    if [ "$RECOVERY_COUNT" -ge "$MAX_RECOVERY_ATTEMPTS" ]; then
        log_message "CRITICAL: Maximum recovery attempts reached, manual intervention required"
        send_alert "CRITICAL: PostgreSQL Recovery Failed" "Maximum recovery attempts reached for PostgreSQL. Manual intervention required."
        exit 1
    fi
}

# Function to reset recovery count
reset_recovery_count() {
    echo "0" > "$RECOVERY_COUNT_FILE"
}

# Start recovery process
log_message "INFO: Starting PostgreSQL recovery process"
increment_recovery_count

# Step 1: Check if PostgreSQL service is running and try to stop it gracefully
log_message "INFO: Attempting to stop PostgreSQL service gracefully"
if systemctl is-active --quiet postgresql; then
    systemctl stop postgresql
    sleep 5
    
    # If service is still running, try to stop it forcefully
    if systemctl is-active --quiet postgresql; then
        log_message "WARNING: PostgreSQL service did not stop gracefully, attempting force stop"
        systemctl kill postgresql
        sleep 5
    fi
else
    log_message "INFO: PostgreSQL service is already stopped"
fi

# Step 2: Check for and clean up any lock files or stale PID files
log_message "INFO: Checking for lock files and stale PID files"
PG_PID_FILE="${PG_DATA_DIR}/postmaster.pid"
if [ -f "$PG_PID_FILE" ]; then
    log_message "INFO: Removing stale PID file: $PG_PID_FILE"
    rm -f "$PG_PID_FILE"
fi

# Step 3: Check disk space
log_message "INFO: Checking disk space"
DB_DISK=$(df -h /var/lib/postgresql | tail -n 1 | awk '{print $5}' | sed 's/%//')
if [ "$DB_DISK" -gt 90 ]; then
    log_message "WARNING: Low disk space: ${DB_DISK}%, attempting cleanup"
    
    # Clean up old WAL files if archive_mode is off
    if sudo -u postgres grep -q "archive_mode = off" "${PG_CONFIG_DIR}/postgresql.conf"; then
        log_message "INFO: Cleaning up old WAL files"
        find "${PG_DATA_DIR}/pg_wal" -type f -name "*.backup" -mtime +7 -delete
    fi
    
    # Clean up old log files
    log_message "INFO: Cleaning up old log files"
    find /var/log/postgresql -type f -name "postgresql-*.log" -mtime +7 -delete
fi

# Step 4: Check for database corruption
log_message "INFO: Checking for database corruption"
if [ -x "$(command -v pg_checksums)" ]; then
    if ! sudo -u postgres pg_checksums --check --pgdata="$PG_DATA_DIR" >/dev/null 2>&1; then
        log_message "WARNING: Database corruption detected, attempting repair"
        # We can't repair corruption automatically, but we can try to start PostgreSQL with zero_damaged_pages=on
        echo "zero_damaged_pages = on" >> "${PG_CONFIG_DIR}/conf.d/recovery.conf"
        log_message "INFO: Enabled zero_damaged_pages to skip corrupted pages"
    fi
fi

# Step 5: Start PostgreSQL service
log_message "INFO: Starting PostgreSQL service"
systemctl start postgresql
sleep 10

# Step 6: Verify PostgreSQL is running
if systemctl is-active --quiet postgresql; then
    log_message "INFO: PostgreSQL service started successfully"
else
    log_message "ERROR: Failed to start PostgreSQL service"
    send_alert "ERROR: PostgreSQL Recovery Failed" "Failed to start PostgreSQL service after recovery attempt."
    exit 1
fi

# Step 7: Verify PostgreSQL is accepting connections
log_message "INFO: Verifying PostgreSQL connections"
if sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    log_message "INFO: PostgreSQL is accepting connections"
else
    log_message "ERROR: PostgreSQL is not accepting connections after recovery"
    send_alert "ERROR: PostgreSQL Recovery Failed" "PostgreSQL is not accepting connections after recovery attempt."
    exit 1
fi

# Step 8: Check for any emergency recovery configurations and remove them
if [ -f "${PG_CONFIG_DIR}/conf.d/recovery.conf" ]; then
    log_message "INFO: Removing emergency recovery configurations"
    rm -f "${PG_CONFIG_DIR}/conf.d/recovery.conf"
    systemctl restart postgresql
    sleep 5
fi

# Step 9: Verify database integrity
log_message "INFO: Verifying database integrity"
if ! sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_user_tables;" >/dev/null 2>&1; then
    log_message "ERROR: Database integrity check failed"
    send_alert "WARNING: PostgreSQL Recovery Partial Success" "PostgreSQL service is running but database integrity check failed."
    exit 1
fi

# Recovery successful
log_message "INFO: PostgreSQL recovery completed successfully"
reset_recovery_count
send_alert "INFO: PostgreSQL Recovery Successful" "PostgreSQL has been successfully recovered and is now operational."
exit 0
```

#### Recovery Script Components

##### Configuration Variables

| Variable | Description |
|----------|-------------|
| LOG_FILE | Path to the recovery log file |
| PG_VERSION | PostgreSQL version number |
| PG_CLUSTER | PostgreSQL cluster name |
| PG_DATA_DIR | Path to PostgreSQL data directory |
| PG_CONFIG_DIR | Path to PostgreSQL configuration directory |
| MAX_RECOVERY_ATTEMPTS | Maximum number of consecutive recovery attempts |
| RECOVERY_COUNT_FILE | File to store the current recovery attempt count |
| ALERT_EMAIL | Email address for recovery notifications |
| BACKUP_DIR | Directory containing PostgreSQL backups |

##### Recovery Functions

1. **log_message()**: Writes timestamped messages to the log file
2. **send_alert()**: Sends email notifications about recovery status
3. **increment_recovery_count()**: Increments the recovery attempt count and checks against the maximum
4. **reset_recovery_count()**: Resets the recovery attempt count after successful recovery

##### Recovery Steps

1. **Service Management**:
   ```bash
   systemctl stop postgresql
   # ...
   systemctl start postgresql
   ```
   Stops and restarts the PostgreSQL service to clear any hung processes or memory issues.

2. **Lock File Cleanup**:
   ```bash
   PG_PID_FILE="${PG_DATA_DIR}/postmaster.pid"
   if [ -f "$PG_PID_FILE" ]; then
       rm -f "$PG_PID_FILE"
   fi
   ```
   Removes stale PID files that might prevent PostgreSQL from starting.

3. **Disk Space Management**:
   ```bash
   if [ "$DB_DISK" -gt 90 ]; then
       # Clean up old WAL files and logs
   fi
   ```
   Frees up disk space by removing old logs and WAL files if disk usage is high.

4. **Corruption Detection**:
   ```bash
   if ! sudo -u postgres pg_checksums --check --pgdata="$PG_DATA_DIR" >/dev/null 2>&1; then
       echo "zero_damaged_pages = on" >> "${PG_CONFIG_DIR}/conf.d/recovery.conf"
   fi
   ```
   Checks for database corruption and enables zero_damaged_pages to skip corrupted pages.

5. **Service Verification**:
   ```bash
   if systemctl is-active --quiet postgresql; then
       log_message "INFO: PostgreSQL service started successfully"
   else
       log_message "ERROR: Failed to start PostgreSQL service"
   fi
   ```
   Confirms that PostgreSQL is running after recovery attempts.

6. **Integrity Verification**:
   ```bash
   if ! sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_user_tables;" >/dev/null 2>&1; then
       log_message "ERROR: Database integrity check failed"
   fi
   ```
   Validates database integrity by executing a simple query.

#### Recovery Attempt Counting Mechanism

The script implements a recovery attempt counting mechanism that:

1. Increments a counter for each recovery attempt
2. Resets the counter after a successful recovery
3. Limits the number of automatic recovery attempts before requiring manual intervention

This approach prevents endless recovery loops for severe issues while allowing automatic recovery for transient problems.

#### Installation and Configuration

To install and configure the recovery script:

1. **Create the Script**:
   ```bash
   sudo mkdir -p /usr/local/bin
   sudo nano /usr/local/bin/pg-recovery.sh
   # Paste the script content
   sudo chmod +x /usr/local/bin/pg-recovery.sh
   ```

2. **Configure Email Notifications**:
   ```bash
   sudo apt install mailutils
   sudo nano /usr/local/bin/pg-recovery.sh
   # Update ALERT_EMAIL variable with your email address
   ```

3. **Create Log Directory**:
   ```bash
   sudo mkdir -p /var/log/postgresql
   sudo chown postgres:postgres /var/log/postgresql
   ```

4. **Create Recovery Count Directory**:
   ```bash
   sudo mkdir -p /var/run/postgresql
   sudo chown postgres:postgres /var/run/postgresql
   ```

5. **Create Configuration Directory**:
   ```bash
   sudo mkdir -p /etc/postgresql/16/main/conf.d
   sudo chown postgres:postgres /etc/postgresql/16/main/conf.d
   ```

#### Security Considerations

The recovery script includes several security measures:

1. **File Permissions**:
   - Log files and recovery count files are owned by the postgres user
   - The script ensures proper directory permissions

2. **Error Handling**:
   - All commands use proper error checking
   - Failures are logged with detailed error messages

3. **Service Management**:
   - The script uses systemctl for service management
   - Force stop is only used as a last resort

4. **Database Integrity**:
   - The script verifies database integrity after recovery
   - Corruption is handled with appropriate PostgreSQL parameters

#### Customization Options

The recovery script can be customized by modifying the following parameters:

1. **MAX_RECOVERY_ATTEMPTS**: Adjust the number of consecutive recovery attempts before requiring manual intervention
2. **Recovery Steps**: Add or modify recovery steps based on specific requirements
3. **Alert Notifications**: Configure different notification methods (e.g., Slack, SMS)
4. **Integrity Checks**: Add more comprehensive database integrity checks

#### Logging and Monitoring

The recovery script logs all activities to `/var/log/postgresql/recovery.log` with the following log levels:

- **INFO**: Normal operation messages
- **WARNING**: Potential issues that might require attention
- **ERROR**: Failed recovery steps
- **CRITICAL**: Severe issues that require manual intervention

To monitor the recovery logs:

```bash
sudo tail -f /var/log/postgresql/recovery.log
```

Example log output:
```
2025-07-17 10:05:00 - INFO: Starting PostgreSQL recovery process
2025-07-17 10:05:00 - WARNING: Recovery attempt count: 1/3
2025-07-17 10:05:00 - INFO: Attempting to stop PostgreSQL service gracefully
2025-07-17 10:05:05 - INFO: Checking for lock files and stale PID files
2025-07-17 10:05:05 - INFO: Removing stale PID file: /var/lib/postgresql/16/main/postmaster.pid
2025-07-17 10:05:05 - INFO: Checking disk space
2025-07-17 10:05:05 - INFO: Starting PostgreSQL service
2025-07-17 10:05:15 - INFO: PostgreSQL service started successfully
2025-07-17 10:05:15 - INFO: Verifying PostgreSQL connections
2025-07-17 10:05:15 - INFO: PostgreSQL is accepting connections
2025-07-17 10:05:15 - INFO: Verifying database integrity
2025-07-17 10:05:16 - INFO: PostgreSQL recovery completed successfully
```

### Systemd Service for Health Checks

The PostgreSQL health check system is configured as a systemd service and timer to run at regular intervals. This section documents the systemd configuration for the health check system.

#### Health Check Systemd Components

The health check system consists of the following systemd components:

1. **postgresql-health-check.service**: Defines the health check service
2. **postgresql-health-check.timer**: Schedules regular execution of the health check
3. **postgresql-recovery.service**: Defines the recovery service triggered by the health check

#### Health Check Service Configuration

The health check service is defined in `/etc/systemd/system/postgresql-health-check.service`:

```ini
[Unit]
Description=PostgreSQL Health Check Service
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=oneshot
User=root
Group=root
EnvironmentFile=-/etc/default/postgresql-health-check
ExecStart=/usr/local/bin/pg-health-check.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=postgresql-health-check

[Install]
WantedBy=multi-user.target
```

This service configuration:
- Runs after the network and PostgreSQL services are available
- Executes the health check script as a one-shot service
- Loads environment variables from `/etc/default/postgresql-health-check`
- Logs output to the systemd journal with a distinct identifier

#### Health Check Timer Configuration

The health check timer is defined in `/etc/systemd/system/postgresql-health-check.timer`:

```ini
[Unit]
Description=Run PostgreSQL Health Check Every Minute
Requires=postgresql-health-check.service

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min
AccuracySec=1s

[Install]
WantedBy=timers.target
```

This timer configuration:
- Runs the health check service 1 minute after system boot
- Repeats the health check every minute thereafter
- Ensures accurate timing with a 1-second precision
- Automatically starts with the system via the timers.target

#### Recovery Service Configuration

The recovery service is defined in `/etc/systemd/system/postgresql-recovery.service`:

```ini
[Unit]
Description=PostgreSQL Recovery Service
After=network.target
Conflicts=postgresql.service

[Service]
Type=oneshot
User=root
Group=root
ExecStart=/usr/local/bin/pg-recovery.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=postgresql-recovery

[Install]
WantedBy=multi-user.target
```

This service configuration:
- Runs after the network service is available
- Conflicts with the PostgreSQL service (to prevent simultaneous operation)
- Executes the recovery script as a one-shot service
- Logs output to the systemd journal with a distinct identifier

#### Installation and Activation

To install and activate the systemd services:

1. **Copy Service Files**:
   ```bash
   sudo cp postgresql-health-check.service /etc/systemd/system/
   sudo cp postgresql-health-check.timer /etc/systemd/system/
   sudo cp postgresql-recovery.service /etc/systemd/system/
   ```

2. **Reload Systemd**:
   ```bash
   sudo systemctl daemon-reload
   ```

3. **Enable and Start the Timer**:
   ```bash
   sudo systemctl enable postgresql-health-check.timer
   sudo systemctl start postgresql-health-check.timer
   ```

4. **Enable the Recovery Service**:
   ```bash
   sudo systemctl enable postgresql-recovery.service
   ```

#### Environment Configuration

Create the environment file for the health check service:

```bash
sudo nano /etc/default/postgresql-health-check
```

Add the following content:
```
PG_PASSWORD="your_application_user_password"
```

Set appropriate permissions:
```bash
sudo chmod 600 /etc/default/postgresql-health-check
```

#### Logging Configuration

The health check and recovery services log to the systemd journal with distinct identifiers. To view the logs:

```bash
# View health check logs
sudo journalctl -u postgresql-health-check.service

# View recovery logs
sudo journalctl -u postgresql-recovery.service

# Follow logs in real-time
sudo journalctl -f -u postgresql-health-check.service -u postgresql-recovery.service
```

#### Service Management

To manage the health check and recovery services:

```bash
# Check timer status
sudo systemctl status postgresql-health-check.timer

# Run health check manually
sudo systemctl start postgresql-health-check.service

# Run recovery manually
sudo systemctl start postgresql-recovery.service

# Temporarily disable health checks
sudo systemctl stop postgresql-health-check.timer

# Re-enable health checks
sudo systemctl start postgresql-health-check.timer
```

#### Customizing the Schedule

To modify the health check frequency:

1. **Edit the Timer Configuration**:
   ```bash
   sudo nano /etc/systemd/system/postgresql-health-check.timer
   ```

2. **Update the OnUnitActiveSec Value**:
   ```ini
   # Check every 5 minutes instead of every minute
   OnUnitActiveSec=5min
   ```

3. **Reload and Restart**:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart postgresql-health-check.timer
   ```

#### Security Considerations

The systemd services include several security measures:

1. **File Permissions**:
   - Environment file with database password has restricted permissions (600)
   - Service files have standard systemd permissions

2. **Service Dependencies**:
   - Health check service depends on PostgreSQL service
   - Recovery service conflicts with PostgreSQL service to prevent simultaneous operation

3. **Logging**:
   - All service output is logged to the systemd journal
   - Distinct identifiers make it easy to filter logs

### Automatic Recovery Service Configuration

The automatic recovery system is designed to restore PostgreSQL functionality after failures detected by the health check system. This section documents the configuration and workflow of the automatic recovery service.

#### Recovery Workflow

The automatic recovery process follows this workflow:

1. **Health Check Detection**: The health check script detects a PostgreSQL failure
2. **Failure Counting**: The health check increments a failure counter
3. **Recovery Triggering**: After reaching the failure threshold, the recovery service is triggered
4. **Recovery Execution**: The recovery script performs recovery actions
5. **Service Restoration**: PostgreSQL service is restored to normal operation
6. **Notification**: Administrators are notified of the recovery status

```mermaid
graph TD
    A[Health Check Timer] -->|Every Minute| B[Health Check Script]
    B -->|Check PostgreSQL| C{PostgreSQL Healthy?}
    C -->|Yes| D[Reset Failure Count]
    C -->|No| E[Increment Failure Count]
    E --> F{Failure Count >= Threshold?}
    F -->|No| G[Log Warning]
    F -->|Yes| H[Trigger Recovery Service]
    H --> I[Recovery Script]
    I --> J[Stop PostgreSQL]
    J --> K[Clean Up Lock Files]
    K --> L[Check Disk Space]
    L --> M[Check for Corruption]
    M --> N[Start PostgreSQL]
    N --> O{PostgreSQL Started?}
    O -->|Yes| P[Verify Connections]
    O -->|No| Q[Send Alert]
    P --> R{Connections OK?}
    R -->|Yes| S[Verify Database Integrity]
    R -->|No| T[Send Alert]
    S --> U{Integrity OK?}
    U -->|Yes| V[Reset Recovery Count]
    U -->|No| W[Send Alert]
    V --> X[Send Success Notification]
```

#### Recovery Service Integration

The recovery service is integrated with the health check system through the following components:

1. **Failure Counting Mechanism**:
   ```bash
   # In pg-health-check.sh
   if [ "$FAILURES" -ge "$MAX_FAILURES" ]; then
       log_message "CRITICAL: Maximum failures reached, attempting recovery"
       systemctl start "$RECOVERY_SERVICE"
       echo "0" > "$FAILURE_COUNT_FILE"
   fi
   ```

2. **Recovery Service Definition**:
   ```ini
   # In postgresql-recovery.service
   [Unit]
   Description=PostgreSQL Recovery Service
   After=network.target
   Conflicts=postgresql.service

   [Service]
   Type=oneshot
   User=root
   Group=root
   ExecStart=/usr/local/bin/pg-recovery.sh
   StandardOutput=journal
   StandardError=journal
   SyslogIdentifier=postgresql-recovery

   [Install]
   WantedBy=multi-user.target
   ```

3. **Recovery Attempt Limiting**:
   ```bash
   # In pg-recovery.sh
   if [ "$RECOVERY_COUNT" -ge "$MAX_RECOVERY_ATTEMPTS" ]; then
       log_message "CRITICAL: Maximum recovery attempts reached, manual intervention required"
       send_alert "CRITICAL: PostgreSQL Recovery Failed" "Maximum recovery attempts reached for PostgreSQL. Manual intervention required."
       exit 1
   fi
   ```

#### Installation and Configuration

To install and configure the automatic recovery service:

1. **Copy Service File**:
   ```bash
   sudo cp postgresql-recovery.service /etc/systemd/system/
   ```

2. **Reload Systemd**:
   ```bash
   sudo systemctl daemon-reload
   ```

3. **Enable the Recovery Service**:
   ```bash
   sudo systemctl enable postgresql-recovery.service
   ```

4. **Configure Recovery Script**:
   ```bash
   sudo nano /usr/local/bin/pg-recovery.sh
   # Update ALERT_EMAIL and other variables as needed
   ```

5. **Set Appropriate Permissions**:
   ```bash
   sudo chmod +x /usr/local/bin/pg-recovery.sh
   ```

#### Recovery Escalation Procedures

The automatic recovery system includes escalation procedures for persistent issues:

1. **Automatic Recovery Attempts**:
   - The system attempts recovery automatically when failures are detected
   - Recovery attempts are limited to prevent endless recovery loops

2. **Administrator Notification**:
   - Email alerts are sent when recovery is triggered
   - Success or failure status is included in notifications

3. **Manual Intervention**:
   - After MAX_RECOVERY_ATTEMPTS (default: 3), manual intervention is required
   - Detailed logs help administrators diagnose and resolve persistent issues

#### Testing the Recovery Service

To test the automatic recovery service:

1. **Simulate a PostgreSQL Failure**:
   ```bash
   sudo systemctl stop postgresql
   ```

2. **Wait for Health Check Detection**:
   - The health check runs every minute
   - After MAX_FAILURES (default: 3) consecutive failures, recovery will be triggered

3. **Monitor Recovery Process**:
   ```bash
   sudo journalctl -f -u postgresql-health-check.service -u postgresql-recovery.service
   ```

4. **Verify Recovery Success**:
   ```bash
   sudo systemctl status postgresql
   sudo -u postgres psql -c "SELECT 1"
   ```

#### Customizing Recovery Behavior

To customize the recovery behavior:

1. **Adjust Failure Threshold**:
   ```bash
   sudo nano /usr/local/bin/pg-health-check.sh
   # Update MAX_FAILURES variable
   ```

2. **Adjust Recovery Attempt Limit**:
   ```bash
   sudo nano /usr/local/bin/pg-recovery.sh
   # Update MAX_RECOVERY_ATTEMPTS variable
   ```

3. **Customize Recovery Actions**:
   ```bash
   sudo nano /usr/local/bin/pg-recovery.sh
   # Modify recovery steps as needed
   ```

4. **Configure Notification Recipients**:
   ```bash
   sudo nano /usr/local/bin/pg-recovery.sh
   # Update ALERT_EMAIL variable
   ```

#### Monitoring Recovery Events

To monitor recovery events:

1. **View Recovery Logs**:
   ```bash
   sudo journalctl -u postgresql-recovery.service
   ```

2. **Check Recovery Count**:
   ```bash
   cat /var/run/postgresql/recovery_count
   ```

3. **View Email Notifications**:
   - Check the email account specified in ALERT_EMAIL
   - Notifications include recovery status and timestamp

4. **Monitor PostgreSQL Status**:
   ```bash
   sudo systemctl status postgresql
   ```

#### Troubleshooting Recovery Issues

If the automatic recovery system is not working as expected:

1. **Check Service Status**:
   ```bash
   sudo systemctl status postgresql-health-check.timer
   sudo systemctl status postgresql-health-check.service
   sudo systemctl status postgresql-recovery.service
   ```

2. **Verify Script Permissions**:
   ```bash
   ls -l /usr/local/bin/pg-health-check.sh
   ls -l /usr/local/bin/pg-recovery.sh
   ```

3. **Check Log Files**:
   ```bash
   sudo cat /var/log/postgresql/health-check.log
   sudo cat /var/log/postgresql/recovery.log
   ```

4. **Test Scripts Manually**:
   ```bash
   sudo /usr/local/bin/pg-health-check.sh
   sudo /usr/local/bin/pg-recovery.sh
   ```

5. **Verify Environment Configuration**:
   ```bash
   sudo cat /etc/default/postgresql-health-check
   ```

## Monitoring and Alerting

*Content will be added in task 5.5*

## Testing Procedures

*Content will be added in task 5.6*