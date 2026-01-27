# OTA Stock Validation Scripts

This directory contains the main validation scripts for the OTA trigger monitoring system. These scripts are used to test and validate the functionality of the OTA integration components.

## Main Validation Scripts

### 1. `comprehensive_ota_audit.js`
**Purpose**: Complete system audit and health check
- Analyzes all hotels and reservation activity
- Provides comprehensive gap detection
- Performance metrics and system health assessment
- Used for: Daily/weekly system validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/comprehensive_ota_audit.js
```

### 2. `test_safe_overlap_config.js`
**Purpose**: Validates the safe overlap monitoring configuration
- Tests 55-minute interval with 60-minute monitoring window
- Verifies 5-minute overlap coverage
- Confirms auto-remediation settings
- Used for: Configuration validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/test_safe_overlap_config.js
```

### 3. `test_email_notifications.js`
**Purpose**: Tests email notification system
- Validates Japanese email templates
- Tests alert levels (INFO, WARNING, CRITICAL)
- Confirms email delivery to dx@redhorse-group.co.jp
- Used for: Email system validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/test_email_notifications.js
```

### 4. `test_cascade_delete_handling.js`
**Purpose**: Validates CASCADE DELETE trigger handling
- Tests parent reservation deletion scenarios
- Verifies child reservation_details CASCADE handling
- Confirms OTA trigger generation for deletions
- Used for: DELETE operation validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/test_cascade_delete_handling.js
```

### 5. `test_enhanced_monitoring.js`
**Purpose**: Tests enhanced monitoring capabilities
- Validates silent skip detection
- Tests categorization logic (missing vs silent skip)
- Performance and accuracy validation
- Used for: Monitoring system validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/test_enhanced_monitoring.js
```

### 6. `test_auto_remediation.js`
**Purpose**: Tests automatic remediation functionality
- Validates auto-remediation logic
- Tests date range grouping
- Confirms API call optimization
- Used for: Auto-remediation validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/test_auto_remediation.js
```

### 7. `test_phantom_delete_detection.js`
**Purpose**: Tests phantom delete detection in OTA investigation timeline
- Validates CASCADE DELETE detection for reservation_details without explicit logs
- Tests timeline calculation accuracy with phantom deletes
- Confirms room count calculations match current state
- Used for: Phantom delete handling validation

**Usage**:
```bash
node api/adhoc_scripts/ota_stock/test_phantom_delete_detection.js
```

## Validation Workflow

### Daily Validation
```bash
# 1. System health check
node api/adhoc_scripts/ota_stock/comprehensive_ota_audit.js

# 2. Configuration validation
node api/adhoc_scripts/ota_stock/test_safe_overlap_config.js
```

### Weekly Validation
```bash
# 1. Full system validation
node api/adhoc_scripts/ota_stock/comprehensive_ota_audit.js

# 2. Email system test
node api/adhoc_scripts/ota_stock/test_email_notifications.js

# 3. Enhanced monitoring validation
node api/adhoc_scripts/ota_stock/test_enhanced_monitoring.js
```

### After System Changes
```bash
# 1. CASCADE DELETE validation
node api/adhoc_scripts/ota_stock/test_cascade_delete_handling.js

# 2. Auto-remediation validation
node api/adhoc_scripts/ota_stock/test_auto_remediation.js

# 3. Configuration validation
node api/adhoc_scripts/ota_stock/test_safe_overlap_config.js

# 4. Email error handling validation
node api/adhoc_scripts/ota_stock/test_email_error_handling.js

# 5. Phantom delete detection validation
node api/adhoc_scripts/ota_stock/test_phantom_delete_detection.js
```

## Script Dependencies

All scripts require:
- Database connection (configured in `api/config/database.js`)
- Environment variables (loaded from `api/.env`)
- OTA trigger monitor (`api/ota_trigger_monitor.js`)
- Email utilities (`api/utils/emailUtils.js`)

## Expected Results

### Success Indicators
- ✅ All tests pass without errors
- ✅ Success rates ≥ 95%
- ✅ Response times < 1000ms
- ✅ Email notifications delivered
- ✅ Auto-remediation success rate ≥ 90%

### Failure Indicators
- ❌ Database connection errors
- ❌ Success rates < 95%
- ❌ Email delivery failures
- ❌ CASCADE DELETE not triggering OTA updates
- ❌ Auto-remediation failures

## Troubleshooting

### Common Issues
1. **Database Connection**: Verify `api/.env` configuration
2. **Email Failures**: Check SMTP settings and credentials
3. **Permission Errors**: Ensure proper database permissions
4. **Timeout Issues**: Check database performance and network connectivity

### Support
For issues with validation scripts, refer to:
- `docs/integrations/ota/ota-monitor-routine-guide.md`
- `docs/integrations/ota/ota-integration-requirements.md`
- Main OTA monitor: `api/ota_trigger_monitor.js`
- Job scheduler: `api/jobs/otaTriggerMonitorJob.js`

---

**Last Updated**: January 2026  
**Maintained By**: Development Team