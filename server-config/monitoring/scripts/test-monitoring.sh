#!/bin/bash

# PostgreSQL Monitoring Test Script
# This script tests the monitoring and alerting system

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_test() {
    echo -e "${YELLOW}[TEST]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
fi

print_status "Starting PostgreSQL monitoring system tests..."

# Test 1: Check if configuration file exists
print_test "Checking configuration file..."
if [ -f "/etc/postgresql-monitor/postgresql-alerts.conf" ]; then
    print_status "Configuration file found"
else
    print_error "Configuration file not found at /etc/postgresql-monitor/postgresql-alerts.conf"
    exit 1
fi

# Test 2: Check if monitoring script exists and is executable
print_test "Checking monitoring script..."
if [ -x "/usr/local/bin/pg-monitor.sh" ]; then
    print_status "Monitoring script found and executable"
else
    print_error "Monitoring script not found or not executable at /usr/local/bin/pg-monitor.sh"
    exit 1
fi

# Test 3: Check systemd service files
print_test "Checking systemd service files..."
if [ -f "/etc/systemd/system/postgresql-monitor.service" ]; then
    print_status "Monitor service file found"
else
    print_error "Monitor service file not found"
    exit 1
fi

if [ -f "/etc/systemd/system/postgresql-monitor.timer" ]; then
    print_status "Monitor timer file found"
else
    print_error "Monitor timer file not found"
    exit 1
fi

# Test 4: Check if timer is enabled and active
print_test "Checking timer status..."
if systemctl is-enabled postgresql-monitor.timer >/dev/null 2>&1; then
    print_status "Timer is enabled"
else
    print_warning "Timer is not enabled"
fi

if systemctl is-active postgresql-monitor.timer >/dev/null 2>&1; then
    print_status "Timer is active"
else
    print_warning "Timer is not active"
fi

# Test 5: Check log directory
print_test "Checking log directory..."
if [ -d "/var/log/postgresql" ]; then
    print_status "Log directory exists"
    ls -la /var/log/postgresql/
else
    print_error "Log directory not found"
fi

# Test 6: Test database connectivity
print_test "Testing database connectivity..."
source /etc/default/postgresql-monitor 2>/dev/null || true
source /etc/postgresql-monitor/postgresql-alerts.conf 2>/dev/null || true

if [ -n "$DB_PASSWORD" ] && [ -n "$DB_USER" ] && [ -n "$DB_NAME" ]; then
    if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
        print_status "Database connectivity test passed"
    else
        print_error "Database connectivity test failed"
        print_warning "Check database credentials in /etc/default/postgresql-monitor"
    fi
else
    print_warning "Database credentials not configured, skipping connectivity test"
fi

# Test 7: Test email configuration
print_test "Testing email configuration..."
if command -v mail >/dev/null 2>&1; then
    print_status "Mail command available"
    
    # Test email sending (optional)
    read -p "Do you want to send a test email? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -n "$ALERT_EMAIL" ]; then
            echo "This is a test email from the PostgreSQL monitoring system." | \
            mail -s "PostgreSQL Monitoring Test" "$ALERT_EMAIL"
            print_status "Test email sent to $ALERT_EMAIL"
        else
            print_warning "ALERT_EMAIL not configured"
        fi
    fi
else
    print_error "Mail command not available"
fi

# Test 8: Test Slack configuration (if configured)
print_test "Testing Slack configuration..."
if [ -n "$SLACK_WEBHOOK_URL" ] && command -v curl >/dev/null 2>&1; then
    read -p "Do you want to send a test Slack message? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        payload='{"channel": "'$SLACK_CHANNEL'", "username": "PostgreSQL Monitor", "text": "Test message from PostgreSQL monitoring system", "icon_emoji": ":postgres:"}'
        if curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$SLACK_WEBHOOK_URL" >/dev/null; then
            print_status "Test Slack message sent"
        else
            print_error "Failed to send Slack message"
        fi
    fi
else
    print_warning "Slack webhook not configured or curl not available"
fi

# Test 9: Run monitoring script manually
print_test "Running monitoring script manually..."
if /usr/local/bin/pg-monitor.sh; then
    print_status "Monitoring script executed successfully"
else
    print_error "Monitoring script execution failed"
fi

# Test 10: Check recent logs
print_test "Checking recent monitoring logs..."
if [ -f "/var/log/postgresql/monitoring.log" ]; then
    print_status "Recent monitoring log entries:"
    tail -10 /var/log/postgresql/monitoring.log
else
    print_warning "No monitoring log file found yet"
fi

# Test 11: Display timer information
print_test "Displaying timer information..."
systemctl list-timers postgresql-monitor.timer --no-pager

print_status "Test completed!"
echo ""
print_status "Summary:"
echo "  - Configuration: $([ -f "/etc/postgresql-monitor/postgresql-alerts.conf" ] && echo "✓" || echo "✗")"
echo "  - Monitoring Script: $([ -x "/usr/local/bin/pg-monitor.sh" ] && echo "✓" || echo "✗")"
echo "  - Systemd Services: $([ -f "/etc/systemd/system/postgresql-monitor.service" ] && echo "✓" || echo "✗")"
echo "  - Timer Active: $(systemctl is-active postgresql-monitor.timer >/dev/null 2>&1 && echo "✓" || echo "✗")"
echo "  - Mail Available: $(command -v mail >/dev/null 2>&1 && echo "✓" || echo "✗")"

echo ""
print_status "Next steps:"
echo "  1. Review and update configuration in /etc/postgresql-monitor/postgresql-alerts.conf"
echo "  2. Set correct database password in /etc/default/postgresql-monitor"
echo "  3. Monitor logs at /var/log/postgresql/monitoring.log"
echo "  4. Test alerts by temporarily lowering thresholds"