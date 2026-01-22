# OTA Monitor Routine - Operations Guide

## Overview

The OTA Monitor Routine is a comprehensive system for monitoring, detecting, and automatically remedying inventory synchronization issues between the Property Management System (PMS) and Online Travel Agency (OTA) channels. This guide provides complete operational procedures for system administrators and support staff.

## System Architecture

### Core Components

1. **Main Monitor** (`api/ota_trigger_monitor.js`)
   - Real-time monitoring of reservation changes
   - Gap detection and categorization
   - Automatic remediation capabilities
   - Email notification system

2. **Job Scheduler** (`api/jobs/otaTriggerMonitorJob.js`)
   - Production-ready scheduled monitoring
   - Configurable intervals and thresholds
   - Alert management and escalation
   - Performance metrics tracking

3. **Investigation Tool** (Frontend Integration)
   - Manual investigation interface
   - Stock analysis and gap detection
   - XML queue analysis
   - Risk assessment reporting

## Daily Operations

### 1. Morning Health Check (9:00 AM JST)

**Objective**: Verify system health and review overnight activity

**Procedure**:
```bash
# 1. Check system status
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:5000/api/ota/trigger-monitor/status

# 2. Review last 12 hours of activity
node api/ota_trigger_monitor.js 12

# 3. Check email alerts from overnight
# Review dx@redhorse-group.co.jp inbox for any alerts
```

**Expected Results**:
- Success rate: ≥ 95%
- No critical alerts
- Response time: < 1000ms
- All hotels reporting normal activity

**Escalation**: If success rate < 95% or critical alerts present, proceed to **Troubleshooting Section**.

### 2. Midday Monitoring (1:00 PM JST)

**Objective**: Monitor peak reservation activity period

**Procedure**:
```bash
# 1. Run comprehensive check with auto-remediation
node api/ota_trigger_monitor.js 4 --auto-remediate

# 2. Check for any remediation activities
# Review email notifications for auto-remediation reports
```

**Expected Results**:
- Auto-remediation success rate: ≥ 90%
- No manual intervention required
- All remediated triggers successfully processed

### 3. Evening Review (6:00 PM JST)

**Objective**: End-of-day system validation and preparation for overnight processing

**Procedure**:
```bash
# 1. Full day analysis
node api/ota_trigger_monitor.js 24

# 2. Performance metrics review
# Check execution times and throughput
# Verify no degradation in system performance

# 3. Prepare for overnight monitoring
# Ensure scheduled jobs are running
# Verify email notification system is operational
```

## Weekly Operations

### Monday: System Health Assessment

**Objective**: Comprehensive system analysis and performance review

**Tasks**:
1. **Performance Analysis**
   ```bash
   # Run comprehensive audit across all hotels
   node api/comprehensive_ota_audit.js
   ```

2. **Trend Analysis**
   - Review weekly success rate trends
   - Identify patterns in silent skips vs. true failures
   - Analyze hotel-specific performance metrics

3. **Configuration Review**
   - Verify monitoring thresholds are appropriate
   - Check auto-remediation settings
   - Review email notification recipients

### Wednesday: Investigation Tool Validation

**Objective**: Validate investigation tools and manual processes

**Tasks**:
1. **Manual Investigation Test**
   - Select a hotel with recent activity
   - Use investigation tool to analyze specific dates
   - Verify gap detection accuracy
   - Test XML analysis functionality

2. **Tool Performance Check**
   - Verify response times < 3 seconds
   - Check data accuracy against database
   - Validate risk assessment calculations

### Friday: Documentation and Reporting

**Objective**: Update documentation and generate weekly reports

**Tasks**:
1. **Weekly Report Generation**
   - Success rate summary by hotel
   - Auto-remediation effectiveness
   - Performance metrics trends
   - Identified issues and resolutions

2. **Documentation Updates**
   - Update operational procedures if needed
   - Record any configuration changes
   - Document new issues and solutions

## Monthly Operations

### First Monday: Comprehensive System Review

**Objective**: Deep analysis and system optimization

**Tasks**:
1. **Performance Optimization**
   - Analyze query performance
   - Review database indexes
   - Optimize monitoring intervals if needed

2. **Threshold Adjustment**
   - Review alert thresholds based on historical data
   - Adjust auto-remediation settings if needed
   - Update escalation procedures

3. **Capacity Planning**
   - Analyze system resource usage
   - Plan for peak season capacity
   - Review scaling requirements

## Emergency Procedures

### Critical System Failure (Success Rate < 80%)

**Immediate Actions** (Within 15 minutes):
1. **Assess Scope**
   ```bash
   # Check all hotels
   node api/comprehensive_ota_audit.js --emergency
   
   # Identify affected hotels
   # Determine failure patterns
   ```

2. **Emergency Notification**
   - Notify development team immediately
   - Alert hotel management for affected properties
   - Document failure timeline and symptoms

3. **Immediate Mitigation**
   ```bash
   # Disable auto-remediation to prevent cascading issues
   # Manual inventory sync for critical hotels
   # Implement manual monitoring procedures
   ```

**Recovery Actions** (Within 1 hour):
1. **Root Cause Analysis**
   - Check database connectivity
   - Verify OTA service availability
   - Analyze system logs for errors

2. **Manual Remediation**
   ```bash
   # Manual trigger for affected reservations
   curl -X POST -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"hoursBack": 6, "autoRemediate": true}' \
        http://localhost:5000/api/ota/trigger-monitor/check
   ```

3. **System Recovery Verification**
   - Verify success rate returns to normal
   - Confirm all hotels are synchronized
   - Re-enable automated monitoring

### High Silent Skip Rate (> 50% of activity)

**Investigation Steps**:
1. **Pattern Analysis**
   ```bash
   # Analyze silent skip patterns
   node api/ota_trigger_monitor.js 24 | grep "Silent Skip"
   
   # Check for systematic issues
   # Identify affected hotels and date ranges
   ```

2. **Stock Reconciliation**
   - Manual comparison of PMS vs OTA stock
   - Identify pre-existing discrepancies
   - Document reconciliation requirements

3. **Corrective Actions**
   - Schedule manual stock synchronization
   - Implement enhanced monitoring for affected hotels
   - Update silent skip detection logic if needed

## Monitoring Thresholds and Alerts

### Success Rate Thresholds

| Threshold | Status | Action Required |
|-----------|--------|-----------------|
| ≥ 99% | ✅ Excellent | Continue monitoring |
| 95-98% | ⚠️ Good | Review specific failures |
| 90-94% | 🟡 Degraded | Investigate patterns |
| 80-89% | 🟠 Poor | Immediate investigation |
| < 80% | 🚨 Critical | Emergency procedures |

### Performance Thresholds

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Execution Time | < 500ms | > 1000ms | > 3000ms |
| Throughput | > 95/sec | < 50/sec | < 25/sec |
| Memory Usage | < 100MB | > 200MB | > 500MB |
| API Response | < 2sec | > 5sec | > 10sec |

### Email Alert Configuration

**Recipients**: `dx@redhorse-group.co.jp`

**Alert Types**:
1. **Inconsistency Detection** (Success rate < 100%)
   - Subject: `🚨 OTA連携エラー検出 - 成功率XX.X%`
   - Frequency: Immediate
   - Content: Detailed failure analysis

2. **Auto-Remediation Execution**
   - Subject: `⚡ OTA自動修復実行 - X件修復完了`
   - Frequency: After each remediation
   - Content: Success/failure counts and details

3. **System Health Alerts**
   - Subject: `OTA連携アラート [レベル] - 成功率XX.X%`
   - Frequency: Based on severity
   - Content: System status and recommendations

## Configuration Management

### Hardcoded Configuration Values

The following configuration values are hardcoded in the system to avoid environment variable complexity:

```javascript
// Hardcoded Monitor Configuration
const DEFAULT_CONFIG = {
  OTA_MONITOR_ENABLED: true,
  OTA_AUTO_REMEDIATE: true,
  OTA_CHECK_INTERVAL: 3600000,  // 1 hour in milliseconds
  OTA_ALERT_THRESHOLD: 95,      // Alert if success rate < 95%
  OTA_CRITICAL_THRESHOLD: 80,   // Critical if success rate < 80%
  EMAIL_NOTIFICATIONS: true
};
```

### Runtime Configuration

```javascript
// Monitor Configuration (hardcoded defaults)
const monitorConfig = {
  checkIntervalHours: 1,        // Derived from OTA_CHECK_INTERVAL
  alertThreshold: 95,           // OTA_ALERT_THRESHOLD
  criticalThreshold: 80,        // OTA_CRITICAL_THRESHOLD
  enableAlerts: true,           // EMAIL_NOTIFICATIONS
  enableLogging: true,
  autoRemediate: true,          // OTA_AUTO_REMEDIATE
  baseUrl: 'http://localhost:5000'
};

// Auto-Remediation Settings
const remediationConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  batchSize: 10,
  maxConcurrent: 5,
  timeoutMs: 30000
};
```

### Configuration Notes

- **No Environment Variables Required**: All OTA monitoring settings are hardcoded for simplicity
- **Production Ready**: Default values are optimized for production use
- **Consistent Behavior**: Eliminates configuration drift across environments
- **Easy Deployment**: No additional configuration files or environment setup needed

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. High False Positive Rate

**Symptoms**: Many "missing triggers" that are actually silent skips

**Diagnosis**:
```bash
# Check silent skip detection logic
node api/ota_trigger_monitor.js 6 | grep -E "(Silent Skip|Missing Trigger)"
```

**Solution**:
- Review silent skip detection algorithm
- Adjust time windows for OTA activity detection
- Update categorization logic

#### 2. Auto-Remediation Failures

**Symptoms**: Remediation attempts fail consistently

**Diagnosis**:
```bash
# Check remediation logs
tail -f logs/ota-monitor.log | grep "remediation"

# Test manual remediation
curl -X POST -H "Authorization: Bearer $TOKEN" \
     -d '{"hoursBack": 1, "autoRemediate": true}' \
     http://localhost:5000/api/ota/trigger-monitor/check
```

**Solution**:
- Verify API endpoint availability
- Check authentication tokens
- Review rate limiting settings
- Validate date range grouping logic

#### 3. Performance Degradation

**Symptoms**: Monitoring takes longer than expected

**Diagnosis**:
```bash
# Check database performance
EXPLAIN ANALYZE SELECT ... FROM logs_reservation WHERE ...

# Monitor system resources
top -p $(pgrep -f ota_trigger_monitor)
```

**Solution**:
- Optimize database queries
- Add missing indexes
- Implement query result caching
- Reduce monitoring scope if needed

#### 4. Email Notification Failures

**Symptoms**: Alerts not being sent

**Diagnosis**:
```bash
# Test email configuration
node -e "
const { sendGenericEmail } = require('./api/utils/emailUtils');
sendGenericEmail('test@example.com', 'Test', 'Test message', '<p>Test</p>')
  .then(() => console.log('Email sent'))
  .catch(err => console.error('Email failed:', err));
"
```

**Solution**:
- Verify SMTP configuration
- Check email credentials
- Review firewall settings
- Test with alternative email service

## API Reference

### Monitor Status Endpoint

```http
GET /api/ota/trigger-monitor/status
Authorization: Bearer {token}
```

**Response**:
```json
{
  "isRunning": true,
  "lastCheck": {
    "timestamp": "2026-01-22T10:00:00Z",
    "result": {
      "success": true,
      "successRate": 98.5,
      "totalCandidates": 67,
      "missingTriggers": 1
    },
    "duration": 450
  },
  "options": {
    "checkIntervalHours": 1,
    "alertThreshold": 95,
    "autoRemediate": true
  }
}
```

### Manual Check Endpoint

```http
POST /api/ota/trigger-monitor/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "hoursBack": 6,
  "autoRemediate": true
}
```

**Response**:
```json
{
  "success": true,
  "successRate": 96.2,
  "totalCandidates": 52,
  "missingTriggers": 2,
  "executionTime": 680,
  "remediationResults": {
    "successful": 2,
    "failed": 0,
    "skipped": 0
  },
  "message": "2 missing triggers detected - remediation attempted"
}
```

## Performance Metrics

### Key Performance Indicators (KPIs)

1. **System Availability**: 99.9% uptime target
2. **Success Rate**: ≥ 95% OTA synchronization success
3. **Response Time**: < 1000ms for monitoring operations
4. **Auto-Remediation Effectiveness**: ≥ 90% success rate
5. **False Positive Rate**: < 5% of detected issues

### Monitoring Dashboard Metrics

- Real-time success rate by hotel
- Hourly/daily trend analysis
- Auto-remediation statistics
- Performance metrics (execution time, throughput)
- Alert frequency and resolution times

## Security Considerations

### Access Control
- Admin-level authentication required for all operations
- API endpoints protected with JWT tokens
- Role-based access control for different operations
- Audit logging for all administrative actions

### Data Protection
- Sensitive reservation data encrypted in transit
- Database connections use SSL/TLS
- Email notifications contain minimal sensitive information
- Log files exclude personally identifiable information

### Network Security
- API endpoints behind firewall
- Rate limiting on external API calls
- Secure communication with OTA services
- Regular security updates and patches

## Backup and Recovery

### Data Backup
- Monitor configuration backed up daily
- Historical monitoring data retained for 90 days
- Email notification templates versioned
- System logs archived monthly

### Disaster Recovery
- Monitoring system can be restored within 1 hour
- Configuration restored from version control
- Historical data restored from database backups
- Email notification system has redundant configuration

---

**Document Version**: 1.0  
**Last Updated**: January 2026  
**Next Review**: April 2026  
**Owner**: Development Team  
**Approver**: System Administrator