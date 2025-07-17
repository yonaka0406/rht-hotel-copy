#!/bin/bash

# PostgreSQL Monitoring Script
# This script monitors PostgreSQL and sends alerts when issues are detected

# Load configuration
CONFIG_FILE="/etc/postgresql-monitor/postgresql-alerts.conf"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "Error: Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Log file
LOG_FILE="/var/log/postgresql/monitoring.log"

# Create log directory if it doesn't exist
LOG_DIR=$(dirname "$LOG_FILE")
if [ ! -d "$LOG_DIR" ]; then
    mkdir -p "$LOG_DIR"
    chown postgres:postgres "$LOG_DIR"
fi

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Function to send email alerts
send_email_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" -r "$ALERT_FROM" "$ALERT_EMAIL"
        log_message "INFO: Email alert sent to $ALERT_EMAIL: $subject"
    else
        log_message "WARNING: mail command not available, could not send email alert"
    fi
}

# Function to send Slack alerts
send_slack_alert() {
    local subject="$1"
    local message="$2"
    
    if [ -n "$SLACK_WEBHOOK_URL" ] && command -v curl >/dev/null 2>&1; then
        payload="{\"channel\": \"$SLACK_CHANNEL\", \"username\": \"PostgreSQL Monitor\", \"text\": \"*$subject*\n$message\", \"icon_emoji\": \":postgres:\"}"
        curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" > /dev/null
        log_message "INFO: Slack alert sent to $SLACK_CHANNEL: $subject"
    else
        log_message "WARNING: Slack webhook URL not configured or curl not available"
    fi
}

# Function to send alerts through all configured channels
send_alert() {
    local subject="$1"
    local message="$2"
    
    send_email_alert "$subject" "$message"
    send_slack_alert "$subject" "$message"
}

# Function to check system resources
check_system_resources() {
    log_message "INFO: Checking system resources"
    
    # Check CPU usage
    CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2 + $4)}')
    if [ "$CPU_USAGE" -gt "$MAX_CPU_USAGE" ]; then
        message=$(printf "$CPU_ALERT_TEMPLATE" "$CPU_USAGE" "$MAX_CPU_USAGE")
        send_alert "PostgreSQL High CPU Usage Alert" "$message"
    fi
    
    # Check memory usage
    MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
    if [ "$MEMORY_USAGE" -gt "$MAX_MEMORY_USAGE" ]; then
        message=$(printf "$MEMORY_ALERT_TEMPLATE" "$MEMORY_USAGE" "$MAX_MEMORY_USAGE")
        send_alert "PostgreSQL High Memory Usage Alert" "$message"
    fi
    
    # Check disk usage
    DISK_USAGE=$(df -h /var/lib/postgresql | tail -n 1 | awk '{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt "$MAX_DISK_USAGE" ]; then
        message=$(printf "$DISK_ALERT_TEMPLATE" "$DISK_USAGE" "$MAX_DISK_USAGE")
        send_alert "PostgreSQL High Disk Usage Alert" "$message"
    fi
}

# Function to check PostgreSQL connections
check_postgresql_connections() {
    log_message "INFO: Checking PostgreSQL connections"
    
    # Check if PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        send_alert "PostgreSQL Service Down" "PostgreSQL service is not running."
        return
    fi
    
    # Check connection count
    CONNECTION_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$CONNECTION_COUNT_QUERY" | xargs)
    MAX_CONNECTIONS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SHOW max_connections;" | xargs)
    CONNECTION_PERCENTAGE=$((CONNECTION_COUNT * 100 / MAX_CONNECTIONS))
    
    if [ "$CONNECTION_PERCENTAGE" -gt "$MAX_CONNECTION_PERCENTAGE" ]; then
        message=$(printf "$CONNECTION_ALERT_TEMPLATE" "$CONNECTION_COUNT" "$CONNECTION_PERCENTAGE" "$MAX_CONNECTIONS")
        send_alert "PostgreSQL High Connection Count Alert" "$message"
    fi
    
    # Check long-running queries
    LONG_QUERIES=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$LONG_RUNNING_QUERY" | wc -l)
    if [ "$LONG_QUERIES" -gt 0 ]; then
        message=$(printf "$LONG_QUERY_ALERT_TEMPLATE" "$LONG_QUERIES" "$MAX_QUERY_TIME")
        send_alert "PostgreSQL Long-Running Queries Alert" "$message"
        
        # Include query details in the log
        QUERY_DETAILS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$LONG_RUNNING_QUERY")
        log_message "INFO: Long-running queries:\n$QUERY_DETAILS"
    fi
    
    # Check idle transactions
    IDLE_TRANSACTIONS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$IDLE_TRANSACTION_QUERY" | wc -l)
    if [ "$IDLE_TRANSACTIONS" -gt 0 ]; then
        message=$(printf "$IDLE_TRANSACTION_ALERT_TEMPLATE" "$IDLE_TRANSACTIONS" "$MAX_IDLE_TRANSACTION_TIME")
        send_alert "PostgreSQL Idle Transactions Alert" "$message"
        
        # Include transaction details in the log
        TRANSACTION_DETAILS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$IDLE_TRANSACTION_QUERY")
        log_message "INFO: Idle transactions:\n$TRANSACTION_DETAILS"
    fi
}

# Function to check database maintenance needs
check_database_maintenance() {
    log_message "INFO: Checking database maintenance needs"
    
    # Check for tables with high dead tuple percentages
    DEAD_TUPLE_RESULTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$DEAD_TUPLE_QUERY")
    echo "$DEAD_TUPLE_RESULTS" | while read -r line; do
        SCHEMA=$(echo "$line" | awk '{print $1}')
        TABLE=$(echo "$line" | awk '{print $2}')
        DEAD_PERCENTAGE=$(echo "$line" | awk '{print $5}')
        
        if [ "$DEAD_PERCENTAGE" -gt "$MAX_DEAD_TUPLES_PERCENTAGE" ]; then
            message=$(printf "$DEAD_TUPLE_ALERT_TEMPLATE" "$SCHEMA" "$TABLE" "$DEAD_PERCENTAGE" "$MAX_DEAD_TUPLES_PERCENTAGE")
            send_alert "PostgreSQL Table Maintenance Alert" "$message"
        fi
    done
    
    # Check for table bloat
    BLOAT_RESULTS=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "$BLOAT_QUERY")
    echo "$BLOAT_RESULTS" | while read -r line; do
        SCHEMA=$(echo "$line" | awk '{print $1}')
        TABLE=$(echo "$line" | awk '{print $2}')
        BLOAT_RATIO=$(echo "$line" | awk '{print $3}' | sed 's/\..*$//')
        
        if [ "$BLOAT_RATIO" -gt "$MAX_INDEX_BLOAT_PERCENTAGE" ]; then
            message=$(printf "$BLOAT_ALERT_TEMPLATE" "$SCHEMA" "$TABLE" "$BLOAT_RATIO" "$MAX_INDEX_BLOAT_PERCENTAGE")
            send_alert "PostgreSQL Table Bloat Alert" "$message"
        fi
    done
}

# Function to check backup status
check_backup_status() {
    log_message "INFO: Checking backup status"
    
    # Check for recent backup files
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "*.dump.gz" -type f -mtime -1 | wc -l)
    if [ "$LATEST_BACKUP" -eq 0 ]; then
        # Find the most recent backup
        MOST_RECENT=$(find "$BACKUP_DIR" -name "*.dump.gz" -type f -printf '%T@ %p\n' | sort -n | tail -1 | cut -d' ' -f2-)
        if [ -n "$MOST_RECENT" ]; then
            BACKUP_AGE=$((($(date +%s) - $(date -r "$MOST_RECENT" +%s)) / 86400))
            message=$(printf "$BACKUP_FAILURE_TEMPLATE" "$BACKUP_AGE days")
        else
            message="No PostgreSQL backups found in $BACKUP_DIR."
        fi
        send_alert "PostgreSQL Backup Failure Alert" "$message"
    fi
    
    # Check backup log for errors
    if [ -f "/var/log/postgresql/backup.log" ]; then
        BACKUP_ERRORS=$(grep -i "error\|fail" /var/log/postgresql/backup.log | tail -5)
        if [ -n "$BACKUP_ERRORS" ]; then
            send_alert "PostgreSQL Backup Error Alert" "Errors detected in backup log:\n$BACKUP_ERRORS"
        fi
    fi
}

# Function to check replication status (if applicable)
check_replication_status() {
    log_message "INFO: Checking replication status"
    
    # Check if replication is configured
    REPLICATION_CONFIGURED=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT count(*) FROM pg_stat_replication;" | xargs)
    
    if [ "$REPLICATION_CONFIGURED" -gt 0 ]; then
        # Check replication lag
        REPLICATION_LAG=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)/1024/1024 as lag_mb FROM pg_stat_replication;" | xargs)
        
        if [ "$REPLICATION_LAG" -gt 100 ]; then
            message=$(printf "$REPLICATION_LAG_TEMPLATE" "$REPLICATION_LAG" "100")
            send_alert "PostgreSQL Replication Lag Alert" "$message"
        fi
    fi
}

# Main monitoring function
main() {
    log_message "INFO: Starting PostgreSQL monitoring"
    
    # Check system resources
    check_system_resources
    
    # Check PostgreSQL connections
    check_postgresql_connections
    
    # Check database maintenance needs
    check_database_maintenance
    
    # Check backup status
    check_backup_status
    
    # Check replication status (if applicable)
    check_replication_status
    
    log_message "INFO: PostgreSQL monitoring completed"
}

# Run the main function
main