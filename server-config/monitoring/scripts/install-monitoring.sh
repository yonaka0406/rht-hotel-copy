#!/bin/bash

# PostgreSQL Monitoring Installation Script
# This script installs and configures the PostgreSQL monitoring and alerting system

set -e

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

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    print_error "This script must be run as root"
    exit 1
fi

print_status "Starting PostgreSQL monitoring system installation..."

# Step 1: Install required packages
print_status "Installing required packages..."
apt update
apt install -y mailutils postfix curl

# Step 2: Create directories
print_status "Creating directories..."
mkdir -p /etc/postgresql-monitor
mkdir -p /var/log/postgresql
mkdir -p /usr/local/bin
chown postgres:postgres /var/log/postgresql

# Step 3: Copy configuration files
print_status "Installing configuration files..."
cp postgresql-alerts.conf /etc/postgresql-monitor/
chmod 600 /etc/postgresql-monitor/postgresql-alerts.conf

# Step 4: Copy monitoring script
print_status "Installing monitoring script..."
cp pg-monitor.sh /usr/local/bin/
chmod +x /usr/local/bin/pg-monitor.sh

# Step 5: Install systemd service files
print_status "Installing systemd service files..."
cp ../systemd/postgresql-monitor.service /etc/systemd/system/
cp ../systemd/postgresql-monitor.timer /etc/systemd/system/

# Step 6: Install log rotation configuration
print_status "Installing log rotation configuration..."
cp ../logrotate/postgresql-monitoring /etc/logrotate.d/

# Step 7: Create environment file
print_status "Creating environment file..."
cat > /etc/default/postgresql-monitor << EOF
# PostgreSQL monitoring environment variables
DB_PASSWORD="your_database_password_here"
EOF
chmod 600 /etc/default/postgresql-monitor

# Step 8: Reload systemd and enable services
print_status "Enabling systemd services..."
systemctl daemon-reload
systemctl enable postgresql-monitor.timer

# Step 9: Configure email settings
print_status "Configuring email settings..."
print_warning "Please configure your email settings in /etc/postgresql-monitor/postgresql-alerts.conf"
print_warning "Update the following variables:"
echo "  - ALERT_EMAIL"
echo "  - ALERT_FROM"
echo "  - SMTP_SERVER"
echo "  - SMTP_PORT"
echo "  - SMTP_USER"
echo "  - SMTP_PASSWORD"

# Step 10: Configure database password
print_warning "Please update the database password in /etc/default/postgresql-monitor"
print_warning "Set DB_PASSWORD to your actual database password"

# Step 11: Test configuration
print_status "Testing configuration..."
if /usr/local/bin/pg-monitor.sh; then
    print_status "Monitoring script test completed successfully"
else
    print_warning "Monitoring script test failed - please check configuration"
fi

# Step 12: Start the timer
print_status "Starting monitoring timer..."
systemctl start postgresql-monitor.timer

# Step 13: Display status
print_status "Installation completed!"
echo ""
print_status "Service status:"
systemctl status postgresql-monitor.timer --no-pager -l

echo ""
print_status "Next run time:"
systemctl list-timers postgresql-monitor.timer --no-pager

echo ""
print_status "To check monitoring logs:"
echo "  sudo tail -f /var/log/postgresql/monitoring.log"

echo ""
print_status "To manually run monitoring:"
echo "  sudo /usr/local/bin/pg-monitor.sh"

echo ""
print_warning "Don't forget to:"
echo "  1. Update email configuration in /etc/postgresql-monitor/postgresql-alerts.conf"
echo "  2. Set the correct database password in /etc/default/postgresql-monitor"
echo "  3. Test email alerts by running the monitoring script manually"
echo "  4. Configure Slack webhook URL if desired"

print_status "Installation complete!"