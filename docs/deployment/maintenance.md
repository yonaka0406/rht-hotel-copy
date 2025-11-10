# Maintenance Procedures

This document outlines the regular maintenance procedures required to keep the WeHub.work Hotel Management System running smoothly, securely, and efficiently.

## Maintenance Schedule Overview

### Daily Maintenance
- Log review and monitoring
- Backup verification
- Performance monitoring
- Security alert review

### Weekly Maintenance
- Performance analysis
- Security updates
- Cache optimization
- Log rotation verification

### Monthly Maintenance
- Database optimization
- Capacity planning
- Security audit
- Dependency updates

### Quarterly Maintenance
- Disaster recovery testing
- Comprehensive security audit
- Performance benchmarking
- Documentation review

## Maintenance Schedule Overview

### Daily Maintenance
- Log review and monitoring
- Backup verification
- Performance monitoring
- Security alert review

### Weekly Maintenance
- Performance analysis
- Security updates
- Cache optimization
- Log rotation verification

### Monthly Maintenance
- Database optimization
- Capacity planning
- Security audit
- Dependency updates

### Quarterly Maintenance
- Disaster recovery testing
- Comprehensive security audit
- Performance benchmarking
- Documentation review

## Post-Deployment

After a successful deployment, it's crucial to perform a series of checks and configurations to ensure the system is operating as expected and to establish ongoing operational readiness.

### Key Activities:

-   **Verification**: Confirm all services are running and accessible.
-   **Monitoring Setup**: Activate and validate monitoring and alerting systems.
-   **Integration Testing**: Verify connectivity with all external services.
-   **Documentation**: Update operational runbooks and configuration details.
-   **Handover**: Ensure the operations team is fully aware of the new deployment.

## Daily Maintenance Tasks

### Log Review and Monitoring

#### Application Logs
```bash
# Review application logs for errors
pm2 logs pms-api --lines 100 --err

# Check for critical errors
pm2 logs pms-api --lines 1000 | grep -i "error\|critical\|fatal"

# Monitor application status
pm2 status
pm2 monit
```

#### System Logs
```bash
# Check Nginx error logs
sudo tail -n 100 /var/log/nginx/error.log | grep -v "client intended to send"

# Check PostgreSQL logs
sudo tail -n 100 /var/log/postgresql/postgresql-14-main.log | grep -i "error\|fatal"

# Check Redis logs
sudo tail -n 50 /var/log/redis/redis-server.log | grep -i "error\|warning"

# Check system logs
sudo journalctl -p err -n 50
```

#### Automated Log Monitoring Script
```bash
#!/bin/bash
# /home/pms/scripts/daily-log-check.sh

LOG_FILE="/home/pms/logs/daily-check-$(date +%Y%m%d).log"

echo "=== Daily Log Check - $(date) ===" > $LOG_FILE

# Check for application errors
echo "Application Errors:" >> $LOG_FILE
pm2 logs pms-api --lines 1000 --nostream | grep -i "error" | tail -20 >> $LOG_FILE

# Check for Nginx errors
echo -e "\nNginx Errors:" >> $LOG_FILE
sudo tail -n 100 /var/log/nginx/error.log | grep -v "client intended to send" >> $LOG_FILE

# Check for database errors
echo -e "\nDatabase Errors:" >> $LOG_FILE
sudo tail -n 100 /var/log/postgresql/postgresql-14-main.log | grep -i "error" >> $LOG_FILE

# Send alert if critical errors found
if grep -qi "critical\|fatal" $LOG_FILE; then
    echo "Critical errors found! Check $LOG_FILE"
    # Add email notification here if configured
fi
```

### Backup Verification

```bash
# Verify latest database backup exists
ls -lh /home/pms/backups/database/ | tail -5

# Check backup file size (should not be 0)
LATEST_BACKUP=$(ls -t /home/pms/backups/database/*.sql.gz | head -1)
if [ -s "$LATEST_BACKUP" ]; then
    echo "Backup verified: $LATEST_BACKUP"
else
    echo "WARNING: Backup file is empty or missing!"
fi

# Test backup integrity
gunzip -t $LATEST_BACKUP
if [ $? -eq 0 ]; then
    echo "Backup integrity verified"
else
    echo "WARNING: Backup file is corrupted!"
fi
```

### Backup Retention Policy

**Retention Period**: 30 days

**Rationale**:
- **Restore Window**: Typical production issues are identified and resolved within 7-14 days
- **Compliance**: Meets standard data retention requirements for operational backups
- **Storage Constraints**: Balances safety with available disk space (daily backups = ~30 files)
- **Risk Mitigation**: Provides sufficient time to identify and recover from data corruption or accidental deletions

**Configuration Variables**:
```bash
# Recommended to set in environment or configuration file
BACKUP_RETENTION_DAYS=30        # Adjust based on your requirements
BACKUP_AUDIT_LOG_MAX_SIZE=10    # MB before rotation
BACKUP_DIR="/home/pms/backups/database"
```

**Adjusting Retention Period**:
- **Increase to 60-90 days** if:
  - Compliance requires longer retention
  - Storage capacity allows
  - Historical data analysis is needed
- **Decrease to 14-21 days** if:
  - Storage is constrained
  - Backups are very large
  - Off-site backups provide longer-term retention

**Best Practices**:
1. **Always test restore** before deleting old backups
2. **Maintain audit logs** of all deletions
3. **Use interactive confirmation** for manual cleanup
4. **Monitor disk space** regularly
5. **Archive critical backups** off-site for long-term retention
6. **Document any retention policy changes** in change log

**Audit Log Management**:
- Location: `/home/pms/logs/backup-deletion-audit.log`
- Rotation: Automatic when exceeds 10MB
- Retention: Rotated logs kept for 1 year
- Review: Monthly audit of deletion patterns

### Performance Monitoring

```bash
# Check system resources
free -h
df -h
uptime

# Check application performance
pm2 list
pm2 describe pms-api | grep -E "uptime|restarts|memory|cpu"

# Check database connections
psql -U pms_user -d pms_production -c "SELECT count(*) as active_connections FROM pg_stat_activity WHERE state = 'active';"

# Check Redis memory usage
redis-cli info memory | grep used_memory_human
```

### Security Alert Review

```bash
# Check for failed SSH login attempts
sudo grep "Failed password" /var/log/auth.log | tail -20

# Check for suspicious Nginx access
sudo tail -n 1000 /var/log/nginx/access.log | grep -E "404|500|502|503" | tail -20

# Check firewall status
sudo ufw status

# Check for security updates
sudo apt list --upgradable | grep -i security
```

## Weekly Maintenance Tasks

### Performance Analysis

#### Database Performance
```sql
-- Connect to database
psql -U pms_user -d pms_production

-- Check slow queries
SELECT query, calls, total_time, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Check table sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check database bloat
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

#### Application Performance
```bash
# Check PM2 metrics
pm2 describe pms-api

# Check response times from Nginx logs
sudo cat /var/log/nginx/access.log | awk '{print $NF}' | sort -n | tail -100

# Check memory trends
pm2 list | grep pms-api
```

### Security Updates

```bash
# Update package lists
sudo apt update

# Check for security updates
sudo apt list --upgradable | grep -i security

# Apply security updates
sudo apt upgrade -y

# Update Node.js dependencies (check for vulnerabilities first)
cd /home/pms/apps/rht-hotel
npm audit
npm audit fix --production

# Restart application if updates were applied
pm2 restart pms-api

# Verify application is running
pm2 status
curl http://localhost:3000/api/health
```

### Cache Optimization

#### Redis Cache Maintenance
```bash
# Check Redis memory usage
redis-cli info memory

# Check cache hit rate
redis-cli info stats | grep keyspace

# Check key distribution
redis-cli --scan --pattern '*' | wc -l

# Clear expired keys (if needed)
redis-cli --scan --pattern 'expired:*' | xargs redis-cli del

# Optimize Redis memory
redis-cli BGREWRITEAOF
```

#### Application Cache Review
```bash
# Check cache configuration
grep -E "CACHE|REDIS" .env.production

# Monitor cache performance in application logs
pm2 logs pms-api | grep -i cache | tail -50
```

### Log Rotation Verification

```bash
# Check logrotate configuration
sudo cat /etc/logrotate.d/pms

# Verify log rotation is working
ls -lh /home/pms/logs/

# Check compressed logs
ls -lh /home/pms/logs/*.gz

# Manually trigger log rotation if needed
sudo logrotate -f /etc/logrotate.d/pms

# Verify PM2 log rotation
pm2 flush
```

## Monthly Maintenance Tasks

### Database Optimization

#### Vacuum and Analyze
```bash
# Run vacuum analyze on all tables
psql -U pms_user -d pms_production -c "VACUUM ANALYZE;"

# Check vacuum progress
psql -U pms_user -d pms_production -c "SELECT * FROM pg_stat_progress_vacuum;"

# Vacuum specific large tables
psql -U pms_user -d pms_production -c "VACUUM ANALYZE reservations;"
psql -U pms_user -d pms_production -c "VACUUM ANALYZE clients;"
```

#### Index Maintenance
```sql
-- Reindex tables with heavy write activity
REINDEX TABLE reservations;
REINDEX TABLE reservation_payments;

-- Check for missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_reservations_dates;
```

#### Database Statistics Update
```sql
-- Update statistics for query planner
ANALYZE;

-- Check statistics age
SELECT schemaname, tablename, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
ORDER BY last_analyze NULLS FIRST;
```

### Capacity Planning

#### Disk Space Analysis
```bash
# Check disk usage
df -h

# Check directory sizes
du -sh /home/pms/*
du -sh /var/lib/postgresql/
du -sh /var/log/

# Check database size
psql -U pms_user -d pms_production -c "SELECT pg_size_pretty(pg_database_size('pms_production'));"

# Check largest tables
psql -U pms_user -d pms_production -c "
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;"

# Project growth rate
# Compare current size with previous month
```

#### Memory Analysis
```bash
# Check memory usage trends
free -h

# Check swap usage
swapon --show

# Check PM2 memory usage over time
pm2 describe pms-api | grep memory

# Check PostgreSQL memory usage
ps aux | grep postgres | awk '{sum+=$6} END {print sum/1024 " MB"}'
```

#### CPU Analysis
```bash
# Check CPU usage
top -bn1 | head -20

# Check load average trends
uptime

# Check PM2 CPU usage
pm2 list
```

### Security Audit

#### User Access Review
```bash
# Review system users
cat /etc/passwd | grep -v nologin

# Review sudo access
sudo cat /etc/sudoers

# Review SSH keys
ls -la ~/.ssh/authorized_keys
```

#### Firewall Review
```bash
# Review firewall rules
sudo ufw status verbose

# Review open ports
sudo netstat -tulpn

# Review fail2ban status (if installed)
sudo fail2ban-client status
```

#### SSL Certificate Check
```bash
# Check certificate expiration
sudo certbot certificates

# Check certificate validity
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

#### Application Security
```bash
# Check for vulnerable dependencies
cd /home/pms/apps/rht-hotel
npm audit

# Review environment variables for exposed secrets
grep -E "PASSWORD|SECRET|KEY" /home/pms/apps/rht-hotel/.env.production | wc -l

# Check file permissions
ls -la /home/pms/apps/rht-hotel/.env.production
# Should be: -rw------- (600)
```

### Dependency Updates

```bash
# Check for outdated packages
cd /home/pms/apps/rht-hotel
npm outdated

# Update dependencies (test in staging first!)
npm update --production

# Check for breaking changes
npm audit

# Test application after updates
npm test

# Restart application
pm2 restart pms-api

# Monitor for issues
pm2 logs pms-api --lines 100
```

## Quarterly Maintenance Tasks

### Disaster Recovery Testing

#### Backup Restoration Test
```bash
# Create test database
# Using portable sudo syntax that works in restricted sudo configurations
sudo -u postgres psql -c "CREATE DATABASE pms_test_restore;"

# Restore latest backup to test database
LATEST_BACKUP=$(ls -t /home/pms/backups/database/*.sql.gz | head -1)
gunzip -c $LATEST_BACKUP | psql -U pms_user -d pms_test_restore

# Verify restoration
psql -U pms_user -d pms_test_restore -c "\dt"
psql -U pms_user -d pms_test_restore -c "SELECT count(*) FROM reservations;"

# Cleanup test database
sudo -u postgres psql -c "DROP DATABASE pms_test_restore;"
```

**Note on sudo usage:** The commands above use `sudo -u postgres psql` which is more portable than `sudo su - postgres` and works in restricted sudo configurations. If you need an interactive shell as the postgres user, use `sudo -u postgres -i` instead.

#### Application Recovery Test
```bash
# Document current application state
pm2 save

# Simulate failure and recovery
pm2 delete pms-api
pm2 resurrect

# Verify recovery
pm2 status
curl http://localhost:3000/api/health
```

### Comprehensive Security Audit

#### System Security
```bash
# Check for security updates
sudo apt update
sudo apt list --upgradable | grep -i security

# Review system logs for security events
sudo journalctl -p warning -n 100

# Check for rootkits (if rkhunter installed)
sudo rkhunter --check

# Review authentication logs
sudo grep "authentication failure" /var/log/auth.log | tail -50
```

#### Application Security
```bash
# Run security audit
npm audit

# Check for exposed secrets
grep -r "password\|secret\|key" /home/pms/apps/rht-hotel --exclude-dir=node_modules

# Review API security
# - Check rate limiting is enabled
# - Verify JWT expiration is appropriate
# - Review CORS configuration
```

#### Database Security
```sql
-- Review database users and permissions
SELECT usename, usesuper, usecreatedb, usecreaterole
FROM pg_user;

-- Check for weak passwords (if applicable)
-- Review pg_hba.conf authentication methods

-- Check for unused database objects
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT IN (
    SELECT tablename FROM pg_stat_user_tables WHERE n_tup_ins > 0 OR n_tup_upd > 0 OR n_tup_del > 0
  );
```

### Performance Benchmarking

#### Application Performance
```bash
# Run load tests (use appropriate tool like Apache Bench, wrk, or k6)
ab -n 1000 -c 10 http://localhost:3000/api/health

# Measure API response times
for i in {1..100}; do
  curl -w "%{time_total}\n" -o /dev/null -s http://localhost:3000/api/health
done | awk '{sum+=$1; count++} END {print "Average: " sum/count " seconds"}'

# Check database query performance
psql -U pms_user -d pms_production -c "
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;"
```

#### System Performance
```bash
# CPU benchmark
sysbench cpu --cpu-max-prime=20000 run

# Memory benchmark
sysbench memory --memory-total-size=10G run

# Disk I/O benchmark
sysbench fileio --file-total-size=2G prepare
sysbench fileio --file-total-size=2G --file-test-mode=rndrw run
sysbench fileio --file-total-size=2G cleanup
```

### Documentation Review

```bash
# Review and update documentation
# - Deployment procedures
# - Configuration changes
# - Known issues and workarounds
# - Contact information
# - Disaster recovery procedures

# Update runbook with any new procedures
# Document any configuration changes made during the quarter
# Review and update troubleshooting guide
```

## Maintenance Scripts

### Automated Maintenance Script

```bash
#!/bin/bash
# /home/pms/scripts/weekly-maintenance.sh

LOG_FILE="/home/pms/logs/maintenance-$(date +%Y%m%d).log"

echo "=== Weekly Maintenance - $(date) ===" | tee $LOG_FILE

# Database vacuum
echo "Running database vacuum..." | tee -a $LOG_FILE
psql -U pms_user -d pms_production -c "VACUUM ANALYZE;" >> $LOG_FILE 2>&1

# Clear old logs
echo "Cleaning old logs..." | tee -a $LOG_FILE
find /home/pms/logs -name "*.log" -mtime +30 -delete

# Clear old backups with audit logging
# Retention Policy: 30 days chosen based on:
# - Typical restore window for production issues (7-14 days)
# - Compliance requirements for data retention
# - Storage capacity constraints
# - Balance between safety and disk space management
echo "Managing backup retention..." | tee -a $LOG_FILE

# Configuration variables
BACKUP_DIR="/home/pms/backups/database"
RETENTION_DAYS=30
AUDIT_LOG="/home/pms/logs/backup-deletion-audit.log"

# Step 1: List files that would be deleted (dry run)
echo "Files older than $RETENTION_DAYS days:" | tee -a $LOG_FILE
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -ls | tee -a $LOG_FILE

# Step 2: Append to audit log with metadata
echo "=== Backup Deletion Audit - $(date) ===" >> $AUDIT_LOG
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -ls >> $AUDIT_LOG

# Step 3: Count files to be deleted
FILE_COUNT=$(find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS | wc -l)
echo "Found $FILE_COUNT backup(s) to delete" | tee -a $LOG_FILE

# Step 4: Interactive confirmation (comment out for automated cron)
# Uncomment the following lines for manual execution with confirmation:
# read -p "Delete these $FILE_COUNT backup file(s)? (yes/no): " CONFIRM
# if [ "$CONFIRM" != "yes" ]; then
#   echo "Backup deletion cancelled" | tee -a $LOG_FILE
#   exit 0
# fi

# Step 5: Perform deletion (only if FILE_COUNT > 0)
if [ $FILE_COUNT -gt 0 ]; then
  find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
  echo "Deleted $FILE_COUNT old backup(s)" | tee -a $LOG_FILE
  echo "Deleted $FILE_COUNT files on $(date)" >> $AUDIT_LOG
else
  echo "No old backups to delete" | tee -a $LOG_FILE
fi

# Step 6: Rotate audit log if it exceeds 10MB
if [ -f "$AUDIT_LOG" ] && [ $(stat -f%z "$AUDIT_LOG" 2>/dev/null || stat -c%s "$AUDIT_LOG") -gt 10485760 ]; then
  mv $AUDIT_LOG "${AUDIT_LOG}.$(date +%Y%m%d)"
  gzip "${AUDIT_LOG}.$(date +%Y%m%d)"
  echo "Audit log rotated" | tee -a $LOG_FILE
fi

# Check disk space
echo "Checking disk space..." | tee -a $LOG_FILE
df -h | tee -a $LOG_FILE

# Check application status
echo "Checking application status..." | tee -a $LOG_FILE
pm2 status | tee -a $LOG_FILE

# Restart application (if needed)
# pm2 restart pms-api

echo "=== Maintenance Complete ===" | tee -a $LOG_FILE
```

### Schedule Maintenance Scripts

```bash
# Edit crontab
crontab -e

# Add maintenance schedules
# Daily log check at 6 AM
0 6 * * * /home/pms/scripts/daily-log-check.sh

# Weekly maintenance on Sunday at 3 AM
0 3 * * 0 /home/pms/scripts/weekly-maintenance.sh

# Monthly database optimization on 1st of month at 2 AM
0 2 1 * * psql -U pms_user -d pms_production -c "VACUUM ANALYZE;"

# Daily database backup at 2 AM
0 2 * * * /home/pms/scripts/backup-database.sh
```

## Maintenance Checklist

### Daily
- [ ] Review application logs for errors
- [ ] Verify database backup completed
- [ ] Check system resource usage
- [ ] Review security alerts
- [ ] Monitor application performance

### Weekly
- [ ] Analyze database performance
- [ ] Apply security updates
- [ ] Optimize cache
- [ ] Verify log rotation
- [ ] Review Nginx access patterns

### Monthly
- [ ] Run database vacuum and analyze
- [ ] Review and optimize indexes
- [ ] Analyze capacity and growth trends
- [ ] Conduct security audit
- [ ] Update dependencies

### Quarterly
- [ ] Test disaster recovery procedures
- [ ] Comprehensive security audit
- [ ] Performance benchmarking
- [ ] Review and update documentation
- [ ] Capacity planning review

## Emergency Maintenance

### Unplanned Downtime Response

1. **Assess the situation**
   - Check application status
   - Review recent logs
   - Identify root cause

2. **Communicate**
   - Notify stakeholders
   - Update status page (if applicable)
   - Provide estimated resolution time

3. **Resolve the issue**
   - Follow troubleshooting guide
   - Apply fix or workaround
   - Test thoroughly

4. **Post-incident**
   - Document the incident
   - Conduct post-mortem
   - Implement preventive measures

## Related Documentation

- **[Deployment Guide](deployment-guide.md)** - Initial deployment procedures
- **[Troubleshooting](troubleshooting.md)** - Issue resolution guide
- **[Monitoring & Logging](monitoring-logging.md)** - Monitoring setup
- **[Environment Setup](environment-setup.md)** - Configuration reference

---

*Regular maintenance ensures system reliability, security, and optimal performance. Follow this schedule and adjust based on your specific operational requirements.*
