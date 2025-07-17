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