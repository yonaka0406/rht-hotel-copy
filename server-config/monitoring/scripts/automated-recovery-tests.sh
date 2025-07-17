#!/bin/bash

# Automated PostgreSQL Recovery Tests
# This script runs basic recovery mechanism tests on a schedule

# Configuration
LOG_FILE="/var/log/postgresql/test-results/automated-tests-$(date +%Y%m%d).log"
ALERT_EMAIL="admin@example.com"
MAX_FAILURES=3

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Function to log messages
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to send alert email
send_alert() {
    local subject="$1"
    local message="$2"
    
    if command -v mail >/dev/null 2>&1; then
        echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
        log_message "Alert sent: $subject"
    fi
}

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

log_message "Starting automated recovery mechanism tests"

# Test 1: Health Check Script Execution
log_message "Testing health check script execution..."
if /usr/local/bin/pg-health-check.sh >/dev/null 2>&1; then
    log_message "✓ Health check script executed successfully"
    health_check_result="PASS"
else
    log_message "✗ Health check script failed"
    health_check_result="FAIL"
fi

# Test 2: PostgreSQL Service Status
log_message "Checking PostgreSQL service status..."
if systemctl is-active --quiet postgresql; then
    log_message "✓ PostgreSQL service is running"
    service_status="PASS"
else
    log_message "✗ PostgreSQL service is not running"
    service_status="FAIL"
fi

# Test 3: Database Connectivity
log_message "Testing database connectivity..."
if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
    log_message "✓ Database connectivity test passed"
    connectivity_test="PASS"
else
    log_message "✗ Database connectivity test failed"
    connectivity_test="FAIL"
fi

# Test 4: Recovery System Components
log_message "Checking recovery system components..."

# Check health check timer
if systemctl is-active --quiet postgresql-health-check.timer; then
    log_message "✓ Health check timer is active"
    timer_status="PASS"
else
    log_message "✗ Health check timer is not active"
    timer_status="FAIL"
fi

# Check recovery service
if systemctl list-unit-files | grep -q postgresql-recovery.service; then
    log_message "✓ Recovery service is installed"
    recovery_service="PASS"
else
    log_message "✗ Recovery service is not installed"
    recovery_service="FAIL"
fi

# Test 5: Log File Accessibility
log_message "Checking log file accessibility..."
if [ -r "/var/log/postgresql/health-check.log" ]; then
    log_message "✓ Health check log is accessible"
    log_access="PASS"
else
    log_message "✗ Health check log is not accessible"
    log_access="FAIL"
fi

# Test 6: Configuration Files
log_message "Checking configuration files..."
config_status="PASS"

if [ ! -f "/etc/default/postgresql-health-check" ]; then
    log_message "✗ Health check environment file missing"
    config_status="FAIL"
fi

if [ ! -x "/usr/local/bin/pg-health-check.sh" ]; then
    log_message "✗ Health check script not executable"
    config_status="FAIL"
fi

if [ ! -x "/usr/local/bin/pg-recovery.sh" ]; then
    log_message "✗ Recovery script not executable"
    config_status="FAIL"
fi

if [ "$config_status" = "PASS" ]; then
    log_message "✓ All configuration files are present and accessible"
fi

# Test 7: Monitoring System
log_message "Checking monitoring system..."
if [ -x "/usr/local/bin/pg-monitor.sh" ]; then
    log_message "✓ Monitoring script is available"
    monitoring_status="PASS"
else
    log_message "✗ Monitoring script is not available"
    monitoring_status="FAIL"
fi

# Calculate overall results
total_tests=7
failed_tests=0

for test_result in "$health_check_result" "$service_status" "$connectivity_test" "$timer_status" "$recovery_service" "$log_access" "$config_status" "$monitoring_status"; do
    if [ "$test_result" = "FAIL" ]; then
        failed_tests=$((failed_tests + 1))
    fi
done

passed_tests=$((total_tests - failed_tests))
success_rate=$(( (passed_tests * 100) / total_tests ))

# Generate summary
log_message "========================================="
log_message "AUTOMATED TEST SUMMARY"
log_message "========================================="
log_message "Total Tests: $total_tests"
log_message "Passed: $passed_tests"
log_message "Failed: $failed_tests"
log_message "Success Rate: $success_rate%"

# Send alerts if there are failures
if [ $failed_tests -gt 0 ]; then
    alert_message="Automated PostgreSQL recovery tests failed.

Test Results:
- Health Check Script: $health_check_result
- PostgreSQL Service: $service_status
- Database Connectivity: $connectivity_test
- Health Check Timer: $timer_status
- Recovery Service: $recovery_service
- Log File Access: $log_access
- Configuration Files: $config_status
- Monitoring System: $monitoring_status

Total: $passed_tests/$total_tests passed ($success_rate%)

Please check the system and review logs at: $LOG_FILE"

    send_alert "PostgreSQL Recovery Tests Failed" "$alert_message"
    log_message "Alert sent due to test failures"
else
    log_message "All tests passed - no alerts sent"
fi

# Check for repeated failures
failure_count_file="/var/run/postgresql/automated_test_failures"
if [ $failed_tests -gt 0 ]; then
    # Increment failure count
    current_failures=$(cat "$failure_count_file" 2>/dev/null || echo "0")
    new_failures=$((current_failures + 1))
    echo "$new_failures" > "$failure_count_file"
    
    if [ $new_failures -ge $MAX_FAILURES ]; then
        critical_alert="CRITICAL: PostgreSQL recovery system has failed automated tests $new_failures times in a row.

This indicates a persistent issue that requires immediate attention.

Last test results: $passed_tests/$total_tests passed ($success_rate%)

Please investigate immediately and check:
1. PostgreSQL service status
2. Recovery script functionality
3. System resources and logs
4. Configuration files

Log file: $LOG_FILE"

        send_alert "CRITICAL: Repeated PostgreSQL Recovery Test Failures" "$critical_alert"
        log_message "CRITICAL alert sent for repeated failures: $new_failures"
    fi
else
    # Reset failure count on success
    echo "0" > "$failure_count_file"
fi

log_message "Automated recovery mechanism tests completed"

# Exit with appropriate code
if [ $failed_tests -eq 0 ]; then
    exit 0
else
    exit 1
fi