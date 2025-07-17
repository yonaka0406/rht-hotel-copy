# PostgreSQL Monitoring and Alerting System

This directory contains the complete PostgreSQL monitoring and alerting system for the hotel management system running on Sakura VPS.

## Overview

The monitoring system provides comprehensive monitoring of PostgreSQL database health, performance, and availability. It automatically detects issues and sends notifications through multiple channels including email and Slack.

## Directory Structure

```
monitoring/
├── alerts/
│   └── postgresql-alerts.conf     # Alert configuration and thresholds
├── scripts/
│   ├── pg-monitor.sh              # Main monitoring script
│   ├── install-monitoring.sh      # Installation script
│   └── test-monitoring.sh         # Testing script
├── systemd/
│   ├── postgresql-monitor.service # Systemd service definition
│   └── postgresql-monitor.timer   # Systemd timer for scheduling
├── logrotate/
│   └── postgresql-monitoring      # Log rotation configuration
└── README.md                      # This file
```

## Features

### Monitoring Capabilities

- **System Resource Monitoring**: CPU, memory, and disk usage
- **Database Health Monitoring**: Service status, connectivity, query performance
- **Database Maintenance Monitoring**: Table bloat, dead tuples, index usage
- **Backup and Recovery Monitoring**: Backup status, integrity checks
- **Connection Monitoring**: Active connections, long-running queries, idle transactions

### Alert Channels

- **Email Notifications**: HTML formatted emails with priority levels
- **Slack Integration**: Rich message formatting with webhook support
- **Log-based Alerts**: Structured logging with syslog integration

### Alert Priorities

- **Critical**: Service down, connection failures, disk space critical (>95%)
- **High**: Resource usage above 90%, long-running queries
- **Normal**: Warning thresholds, maintenance needs

## Installation

### Prerequisites

- Ubuntu 24.04 with PostgreSQL 16
- Root access to the server
- Email server configuration (Postfix recommended)
- Slack webhook URL (optional)

### Quick Installation

1. **Run the installation script**:
   ```bash
   sudo chmod +x scripts/install-monitoring.sh
   sudo ./scripts/install-monitoring.sh
   ```

2. **Configure email settings**:
   ```bash
   sudo nano /etc/postgresql-monitor/postgresql-alerts.conf
   ```
   Update the following variables:
   - `ALERT_EMAIL`
   - `ALERT_FROM`
   - `SMTP_SERVER`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASSWORD`

3. **Set database password**:
   ```bash
   sudo nano /etc/default/postgresql-monitor
   ```
   Set `DB_PASSWORD` to your actual database password.

4. **Test the installation**:
   ```bash
   sudo chmod +x scripts/test-monitoring.sh
   sudo ./scripts/test-monitoring.sh
   ```

### Manual Installation

1. **Install required packages**:
   ```bash
   sudo apt update
   sudo apt install mailutils postfix curl
   ```

2. **Create directories**:
   ```bash
   sudo mkdir -p /etc/postgresql-monitor
   sudo mkdir -p /var/log/postgresql
   sudo chown postgres:postgres /var/log/postgresql
   ```

3. **Copy configuration files**:
   ```bash
   sudo cp alerts/postgresql-alerts.conf /etc/postgresql-monitor/
   sudo chmod 600 /etc/postgresql-monitor/postgresql-alerts.conf
   ```

4. **Install monitoring script**:
   ```bash
   sudo cp scripts/pg-monitor.sh /usr/local/bin/
   sudo chmod +x /usr/local/bin/pg-monitor.sh
   ```

5. **Install systemd services**:
   ```bash
   sudo cp systemd/postgresql-monitor.service /etc/systemd/system/
   sudo cp systemd/postgresql-monitor.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   ```

6. **Install log rotation**:
   ```bash
   sudo cp logrotate/postgresql-monitoring /etc/logrotate.d/
   ```

7. **Create environment file**:
   ```bash
   sudo nano /etc/default/postgresql-monitor
   ```
   Add:
   ```
   DB_PASSWORD="your_database_password"
   ```
   ```bash
   sudo chmod 600 /etc/default/postgresql-monitor
   ```

8. **Enable and start services**:
   ```bash
   sudo systemctl enable postgresql-monitor.timer
   sudo systemctl start postgresql-monitor.timer
   ```

## Configuration

### Alert Thresholds

Default thresholds can be customized in `/etc/postgresql-monitor/postgresql-alerts.conf`:

| Metric | Default Threshold | Description |
|--------|------------------|-------------|
| MAX_CPU_USAGE | 90% | CPU usage alert threshold |
| MAX_MEMORY_USAGE | 90% | Memory usage alert threshold |
| MAX_DISK_USAGE | 85% | Disk usage alert threshold |
| MAX_CONNECTION_PERCENTAGE | 80% | Connection usage alert threshold |
| MAX_QUERY_TIME | 300s | Long-running query threshold |
| MAX_IDLE_TRANSACTION_TIME | 3600s | Idle transaction threshold |
| MAX_DEAD_TUPLES_PERCENTAGE | 20% | Dead tuples alert threshold |
| MAX_INDEX_BLOAT_PERCENTAGE | 30% | Index bloat alert threshold |

### Email Configuration

Configure email settings in `/etc/postgresql-monitor/postgresql-alerts.conf`:

```bash
ALERT_EMAIL="admin@example.com"
ALERT_FROM="postgres-monitor@example.com"
SMTP_SERVER="smtp.example.com"
SMTP_PORT="587"
SMTP_USER="alerts@example.com"
SMTP_PASSWORD="your_smtp_password"
```

### Slack Configuration

Configure Slack webhook in `/etc/postgresql-monitor/postgresql-alerts.conf`:

```bash
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
SLACK_CHANNEL="#database-alerts"
```

## Usage

### Manual Monitoring

Run monitoring manually:
```bash
sudo /usr/local/bin/pg-monitor.sh
```

### Check Service Status

```bash
# Check timer status
sudo systemctl status postgresql-monitor.timer

# Check next run time
sudo systemctl list-timers postgresql-monitor.timer

# Check recent service runs
sudo journalctl -u postgresql-monitor.service -n 20
```

### Monitor Logs

```bash
# Real-time monitoring logs
sudo tail -f /var/log/postgresql/monitoring.log

# Check for recent alerts
sudo grep -i "alert\|error\|critical" /var/log/postgresql/monitoring.log | tail -20

# View systemd logs
sudo journalctl -u postgresql-monitor.service --since "1 hour ago"
```

## Testing

### Test Email Alerts

```bash
# Send test email
echo "Test message" | mail -s "Test Subject" admin@example.com

# Check mail logs
sudo tail -f /var/log/mail.log
```

### Test Slack Alerts

```bash
# Test webhook
curl -X POST -H 'Content-type: application/json' \
     --data '{"text":"Test message"}' \
     YOUR_WEBHOOK_URL
```

### Run Test Suite

```bash
sudo ./scripts/test-monitoring.sh
```

## Troubleshooting

### Common Issues

1. **Email alerts not sending**:
   - Check Postfix configuration: `sudo systemctl status postfix`
   - Test mail command: `echo "Test" | mail -s "Test" admin@example.com`
   - Check mail logs: `sudo tail -f /var/log/mail.log`

2. **Slack alerts not working**:
   - Verify webhook URL in configuration
   - Test with curl command
   - Check network connectivity to Slack

3. **Database connection issues**:
   - Verify database credentials in `/etc/default/postgresql-monitor`
   - Test connection manually: `PGPASSWORD="password" psql -h localhost -U user -d database -c "SELECT 1"`
   - Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

4. **Timer not running**:
   - Check timer status: `sudo systemctl status postgresql-monitor.timer`
   - Restart timer: `sudo systemctl restart postgresql-monitor.timer`
   - Check systemd logs: `sudo journalctl -u postgresql-monitor.timer`

### Log Locations

| Log File | Purpose |
|----------|---------|
| `/var/log/postgresql/monitoring.log` | Main monitoring log |
| `/var/log/postgresql/health-check.log` | Health check results |
| `/var/log/postgresql/recovery.log` | Recovery operations |
| `/var/log/mail.log` | Email delivery logs |
| `journalctl -u postgresql-monitor.service` | Systemd service logs |

## Maintenance

### Log Rotation

Logs are automatically rotated daily and compressed. Configuration is in `/etc/logrotate.d/postgresql-monitoring`.

### Updating Configuration

After updating configuration files:
```bash
# Reload systemd if service files changed
sudo systemctl daemon-reload

# Restart timer to pick up new configuration
sudo systemctl restart postgresql-monitor.timer
```

### Performance Impact

The monitoring system is designed for minimal performance impact:
- CPU usage: <1% during monitoring runs
- Memory usage: 10-20MB per monitoring cycle
- Database connections: 1-2 connections during monitoring
- Network usage: Minimal for email/Slack alerts

## Integration

### Prometheus Integration

Export metrics for Prometheus monitoring:
```bash
# Add to monitoring script
echo "postgresql_cpu_usage $CPU_USAGE" > /var/lib/node_exporter/textfile_collector/postgresql.prom
```

### Grafana Dashboards

Create dashboards using the monitoring data and PostgreSQL metrics.

### External Alerting

Integrate with external systems like PagerDuty, Nagios, or Zabbix by modifying the alert functions in the monitoring script.

## Security Considerations

- Configuration files contain sensitive information (passwords, webhook URLs)
- All configuration files have restricted permissions (600)
- Database passwords are stored in environment files, not in scripts
- Email and Slack communications should use encrypted channels

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review log files for error messages
3. Test individual components using the test script
4. Verify configuration settings

## Testing

### Recovery Mechanism Testing

The monitoring system includes comprehensive testing procedures for the recovery mechanisms:

#### Test Scripts

1. **test-recovery-mechanisms.sh**: Comprehensive test suite
   ```bash
   # Run basic tests (safe for production)
   sudo ./scripts/test-recovery-mechanisms.sh basic
   
   # Run full test suite (includes service interruption)
   sudo ./scripts/test-recovery-mechanisms.sh full
   ```

2. **automated-recovery-tests.sh**: Daily automated testing
   ```bash
   # Run automated tests manually
   sudo ./scripts/automated-recovery-tests.sh
   ```

#### Test Categories

- **Health Check Testing**: Validates health check script functionality
- **Failure Simulation**: Tests recovery under various failure conditions
- **Recovery Script Testing**: Validates recovery script effectiveness
- **Alert Testing**: Verifies notification systems
- **Integration Testing**: End-to-end recovery validation

#### Automated Testing Schedule

- **Daily**: Basic health checks and system validation
- **Weekly**: Performance and alert testing
- **Monthly**: Simulated failure recovery testing
- **Quarterly**: Complete test suite execution

#### Test Installation

```bash
# Copy test scripts
sudo cp scripts/test-recovery-mechanisms.sh /usr/local/bin/
sudo cp scripts/automated-recovery-tests.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/test-recovery-mechanisms.sh
sudo chmod +x /usr/local/bin/automated-recovery-tests.sh

# Install automated testing service
sudo cp systemd/postgresql-recovery-tests.service /etc/systemd/system/
sudo cp systemd/postgresql-recovery-tests.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable postgresql-recovery-tests.timer
sudo systemctl start postgresql-recovery-tests.timer
```

## Version History

- v1.0: Initial implementation with email and Slack alerts
- v1.1: Added priority levels and HTML email formatting
- v1.2: Enhanced critical failure detection and log rotation
- v1.3: Added comprehensive testing procedures and automated testing