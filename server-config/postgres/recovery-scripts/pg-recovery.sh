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