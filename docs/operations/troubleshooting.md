# Troubleshooting and Support Documentation

## Overview

This document provides comprehensive troubleshooting guidance for the RHT Hotel Management System. It covers common issues, their symptoms, root causes, and step-by-step resolution procedures.

## Quick Reference

### Emergency Contacts and Escalation

| Issue Severity | Response Time | Contact Method | Escalation Path |
|---------------|---------------|----------------|-----------------|
| **Critical** (System Down) | 15 minutes | Phone + Email | System Admin → Technical Lead → Management |
| **High** (Major Feature Broken) | 1 hour | Email + Slack | Technical Support → Development Team |
| **Medium** (Minor Issues) | 4 hours | Support Ticket | Support Team → Development Team |
| **Low** (Enhancement Requests) | 24 hours | Support Ticket | Support Team → Product Owner |

### System Status Quick Check

```bash
# Quick system health check
curl http://localhost:3000/api/health
pm2 status
sudo systemctl status postgresql redis nginx
```

## Common Issues and Solutions

### 1. Database Connection Issues

#### Symptoms
- "RequestId is required to select the correct database pool" errors
- "Connection refused" errors
- Slow database queries
- Application timeouts

#### Diagnostic Steps

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U hotel_user -d hotel_system_db -c "SELECT 1;"

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check database locks
sudo -u postgres psql -c "SELECT * FROM pg_locks WHERE NOT granted;"

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

#### Common Causes and Solutions

**1. Database Service Not Running**
```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify startup
sudo systemctl status postgresql
```

**2. Connection Pool Exhaustion**
```bash
# Check current connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Kill idle connections (if necessary)
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';"
```

**3. Missing RequestId in API Calls**
- Check controller functions ensure `req.requestId` is passed to model functions
- Verify model functions accept `requestId` as first parameter
- For background jobs, use `getProdPool()` or `getDevPool()` directly

**4. Database Lock Issues**
```sql
-- Identify blocking queries
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted AND blocking_locks.granted;

-- Kill blocking process (use with caution)
SELECT pg_terminate_backend(blocking_pid);
```

### 2. Redis Connection Issues

#### Symptoms
- Session data not persisting
- "Redis connection failed" errors
- Users being logged out frequently

#### Diagnostic Steps

```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connectivity
redis-cli ping

# Check Redis memory usage
redis-cli info memory

# Monitor Redis commands
redis-cli monitor

# View Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

#### Solutions

**1. Redis Service Issues**
```bash
# Restart Redis
sudo systemctl restart redis

# Check Redis configuration
sudo nano /etc/redis/redis.conf

# Verify Redis is listening
netstat -tlnp | grep :6379
```

**2. Memory Issues**
```bash
# Check Redis memory usage
redis-cli info memory

# Clear Redis cache (use with caution)
redis-cli flushall

# Configure memory limits
# Edit /etc/redis/redis.conf
maxmemory 1gb
maxmemory-policy allkeys-lru
```

### 3. Application Server Issues

#### Symptoms
- API endpoints returning 500 errors
- Application not responding
- High CPU or memory usage
- PM2 processes crashing

#### Diagnostic Steps

```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs hotel-api

# Monitor system resources
htop
free -h
df -h

# Check port availability
netstat -tlnp | grep :3000

# Check Node.js processes
ps aux | grep node
```

#### Solutions

**1. Application Crashes**
```bash
# Restart application
pm2 restart hotel-api

# View crash logs
pm2 logs hotel-api --lines 100

# Check for memory leaks
pm2 monit

# Increase memory limit if needed
export NODE_OPTIONS="--max-old-space-size=2048"
pm2 restart hotel-api
```

**2. High Memory Usage**
```bash
# Check memory usage by process
pm2 monit

# Restart application to clear memory
pm2 restart hotel-api

# Check for memory leaks in logs
pm2 logs hotel-api | grep -i "memory\|heap"
```

**3. Port Conflicts**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill conflicting process
sudo kill -9 <PID>

# Start application
pm2 start ecosystem.config.js
```

### 4. Frontend Issues

#### Symptoms
- White screen on application load
- JavaScript errors in browser console
- API calls failing from frontend
- Routing not working properly

#### Diagnostic Steps

```bash
# Check if frontend is being served
curl -I http://localhost:5173

# Check web server status
sudo systemctl status nginx

# View web server logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# Test API connectivity from frontend
curl http://localhost:3000/api/health
```

#### Solutions

**1. Frontend Not Loading**
```bash
# Check if build exists
ls -la frontend/dist/

# Rebuild frontend
cd frontend
npm run build

# Restart web server
sudo systemctl restart nginx
```

**2. API Connection Issues**
```bash
# Check CORS configuration in backend
# Verify FRONTEND_URL in .env matches actual frontend URL

# Check proxy configuration in nginx/apache
# Ensure /api routes are properly proxied to backend

# Test direct API access
curl http://localhost:3000/api/health
```

**3. Routing Issues**
```bash
# Check nginx configuration for Vue.js routing
# Ensure try_files directive is set correctly:
# try_files $uri $uri/ /index.html;

# Reload nginx configuration
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Authentication and Authorization Issues

#### Symptoms
- Users cannot log in
- JWT token errors
- Google OAuth not working
- Permission denied errors

#### Diagnostic Steps

```bash
# Check JWT configuration
grep JWT_SECRET api/.env

# Test login endpoint
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Check Google OAuth configuration
grep GOOGLE_ api/.env

# View authentication logs
pm2 logs hotel-api | grep -i "auth\|login\|jwt"
```

#### Solutions

**1. JWT Token Issues**
```bash
# Regenerate JWT secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env file with new secrets
# Restart application
pm2 restart hotel-api
```

**2. Google OAuth Issues**
- Verify Google Client ID and Secret in Google Cloud Console
- Check redirect URI matches configuration
- Ensure OAuth consent screen is configured
- Verify domain is authorized in Google Cloud Console

**3. Permission Issues**
- Check user roles in database
- Verify CRUD permissions are set correctly
- Check middleware authentication logic

### 6. Email Notification Issues

#### Symptoms
- Emails not being sent
- SMTP connection errors
- Email templates not rendering

#### Diagnostic Steps

```bash
# Check email configuration
grep EMAIL_ api/.env

# Test SMTP connection
telnet smtp.your-provider.com 587

# Check email logs
pm2 logs hotel-api | grep -i "email\|smtp\|mail"
```

#### Solutions

**1. SMTP Configuration Issues**
```bash
# Verify SMTP settings in .env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# For Gmail, use App Password instead of regular password
# Enable 2FA and generate App Password in Google Account settings
```

**2. Email Template Issues**
- Check email template files exist
- Verify template syntax
- Test email rendering with sample data

### 7. File Upload Issues

#### Symptoms
- File uploads failing
- "File too large" errors
- Uploaded files not accessible

#### Diagnostic Steps

```bash
# Check upload directory permissions
ls -la uploads/

# Check disk space
df -h

# Check file size limits in nginx
grep client_max_body_size /etc/nginx/nginx.conf

# Check multer configuration
grep -r "multer" api/
```

#### Solutions

**1. Permission Issues**
```bash
# Fix upload directory permissions
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/
```

**2. File Size Limits**
```bash
# Increase nginx file size limit
sudo nano /etc/nginx/nginx.conf
# Add: client_max_body_size 50M;

# Restart nginx
sudo systemctl restart nginx
```

### 8. Performance Issues

#### Symptoms
- Slow page loading
- Database queries timing out
- High server load
- Memory usage growing over time

#### Diagnostic Steps

```bash
# Monitor system resources
htop
iotop
free -h

# Check database performance
sudo -u postgres psql -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"

# Monitor API response times
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/health

# Check for memory leaks
pm2 monit
```

#### Solutions

**1. Database Performance**
```sql
-- Analyze slow queries
EXPLAIN ANALYZE SELECT * FROM reservations WHERE hotel_id = 1;

-- Update table statistics
ANALYZE;

-- Rebuild indexes
REINDEX DATABASE hotel_system_db;

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_reservations_dates ON reservations(check_in_date, check_out_date);
```

**2. Application Performance**
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
pm2 restart hotel-api

# Enable clustering
# Update ecosystem.config.js:
instances: 'max',
exec_mode: 'cluster'

# Restart with new configuration
pm2 delete hotel-api
pm2 start ecosystem.config.js
```

**3. Frontend Performance**
```bash
# Enable gzip compression in nginx
sudo nano /etc/nginx/nginx.conf
# Add:
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Restart nginx
sudo systemctl restart nginx
```

## Known Issues and Workarounds

### Issue #1: Calendar View Scroll Position
**Problem**: Calendar view scroll position doesn't reset when date is changed
**Workaround**: Manually scroll to top after changing dates
**Status**: Open - Medium Priority

### Issue #2: Addon Reflection in Reservation Edit
**Problem**: Addons added from プラン・機関編集 button don't appear immediately
**Workaround**: Add addons from day details instead, or refresh the page
**Status**: Fixed

### Issue #3: Room Type Change Confirmation
**Problem**: No confirmation when room type changes during free move
**Workaround**: Double-check room assignments after free moves
**Status**: Open - High Priority

### Issue #4: Client Edit After Hold Reservation
**Problem**: Client cannot be edited immediately after creating hold reservation
**Workaround**: Refresh the page before editing client
**Status**: Fixed

### Issue #5: Meal Addon Count Discrepancy
**Problem**: Meal addon counts may be incorrect in exports
**Workaround**: Cross-reference with reservation_details CSV
**Status**: Fixed

## Monitoring and Alerting

### System Health Monitoring

```bash
# Create monitoring script
cat > monitor-system.sh << 'EOF'
#!/bin/bash

# Check critical services
services=("postgresql" "redis" "nginx")
for service in "${services[@]}"; do
    if ! systemctl is-active --quiet $service; then
        echo "ALERT: $service is not running"
        # Send alert notification here
    fi
done

# Check disk space
disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $disk_usage -gt 80 ]; then
    echo "ALERT: Disk usage is ${disk_usage}%"
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $memory_usage -gt 80 ]; then
    echo "ALERT: Memory usage is ${memory_usage}%"
fi

# Check PM2 processes
if ! pm2 list | grep -q "online"; then
    echo "ALERT: PM2 processes are not running"
fi
EOF

chmod +x monitor-system.sh

# Schedule monitoring
crontab -e
# Add: */5 * * * * /path/to/monitor-system.sh
```

### Application Monitoring

```bash
# Monitor API endpoints
cat > monitor-api.sh << 'EOF'
#!/bin/bash

endpoints=(
    "http://localhost:3000/api/health"
    "http://localhost:3000/api/auth/check"
)

for endpoint in "${endpoints[@]}"; do
    response=$(curl -s -o /dev/null -w "%{http_code}" $endpoint)
    if [ $response -ne 200 ]; then
        echo "ALERT: $endpoint returned $response"
    fi
done
EOF

chmod +x monitor-api.sh
```

## Log Analysis

### Common Log Patterns

**Database Connection Errors:**
```bash
grep -i "connection.*refused\|timeout\|pool" /var/log/postgresql/*.log
pm2 logs hotel-api | grep -i "database\|pool\|connection"
```

**Authentication Errors:**
```bash
pm2 logs hotel-api | grep -i "auth\|login\|jwt\|unauthorized"
```

**Performance Issues:**
```bash
pm2 logs hotel-api | grep -i "slow\|timeout\|memory\|heap"
```

**API Errors:**
```bash
pm2 logs hotel-api | grep -E "error|exception|stack trace" | tail -20
```

### Log Rotation and Cleanup

```bash
# Configure log rotation
sudo nano /etc/logrotate.d/hotel-system

# Add:
/path/to/rht-hotel/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload hotel-api
    endscript
}

# Test log rotation
sudo logrotate -d /etc/logrotate.d/hotel-system
```

## Backup and Recovery Procedures

### Emergency Database Recovery

```bash
# Stop application to prevent data corruption
pm2 stop hotel-api

# Create emergency backup
pg_dump -h localhost -U hotel_user hotel_system_db > emergency_backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from latest backup
gunzip latest_backup.sql.gz
psql -h localhost -U hotel_user -d hotel_system_db < latest_backup.sql

# Restart application
pm2 start hotel-api
```

### Application Recovery

```bash
# Backup current application state
tar -czf app_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    /path/to/rht-hotel

# Restore from backup
tar -xzf app_backup_YYYYMMDD_HHMMSS.tar.gz

# Reinstall dependencies
cd api && npm install
cd ../frontend && npm install && npm run build

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

## Security Incident Response

### Suspected Security Breach

1. **Immediate Actions**
   ```bash
   # Block suspicious IPs
   sudo ufw deny from <suspicious_ip>
   
   # Check active sessions
   sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
   
   # Review recent logins
   pm2 logs hotel-api | grep -i "login\|auth" | tail -50
   ```

2. **Investigation**
   ```bash
   # Check access logs
   sudo tail -100 /var/log/nginx/access.log
   
   # Check for unusual database activity
   sudo -u postgres psql -c "SELECT * FROM pg_stat_statements ORDER BY calls DESC LIMIT 20;"
   
   # Review system logs
   sudo journalctl -u hotel-api --since "1 hour ago"
   ```

3. **Recovery Actions**
   - Change all passwords and API keys
   - Regenerate JWT secrets
   - Review and update security configurations
   - Notify stakeholders
   - Document incident

### Failed Login Attempts

```bash
# Check failed login attempts
pm2 logs hotel-api | grep -i "failed\|invalid\|unauthorized" | tail -20

# Check Fail2ban status
sudo fail2ban-client status postgres

# Unban IP if needed
sudo fail2ban-client set postgres unbanip <ip_address>
```

## Performance Tuning

### Database Optimization

```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- Optimize frequently used queries
EXPLAIN ANALYZE SELECT * FROM reservations 
WHERE hotel_id = 1 AND check_in_date >= CURRENT_DATE;

-- Update table statistics
ANALYZE reservations;
ANALYZE clients;
ANALYZE rooms;

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename IN ('reservations', 'clients', 'rooms');
```

### Application Optimization

```bash
# Monitor memory usage
pm2 monit

# Check for memory leaks
node --inspect api/server.js
# Use Chrome DevTools to analyze memory usage

# Optimize PM2 configuration
pm2 delete hotel-api
pm2 start ecosystem.config.js --update-env
```

## Support Procedures

### User Support Workflow

1. **Initial Contact**
   - Gather user information and issue description
   - Determine issue severity and priority
   - Create support ticket with unique ID

2. **Issue Triage**
   - Categorize issue (bug, feature request, user error)
   - Assign to appropriate team member
   - Set expected resolution time

3. **Investigation**
   - Reproduce issue in development environment
   - Check logs and system status
   - Identify root cause

4. **Resolution**
   - Implement fix or workaround
   - Test solution thoroughly
   - Deploy to production if needed

5. **Follow-up**
   - Verify issue is resolved
   - Update documentation if needed
   - Close support ticket

### Escalation Matrix

| Issue Type | Level 1 | Level 2 | Level 3 |
|------------|---------|---------|---------|
| User Questions | Support Team | Senior Support | Team Lead |
| Bug Reports | Support Team | Developer | Technical Lead |
| System Issues | System Admin | Senior Admin | Infrastructure Team |
| Security Issues | Security Team | CISO | Management |

### Documentation Updates

When resolving issues:
1. Update this troubleshooting guide with new solutions
2. Update user documentation if needed
3. Create or update runbooks for complex procedures
4. Share knowledge with team through documentation

## Contact Information

### Internal Support Team
- **Technical Support**: support@company.com
- **System Administration**: sysadmin@company.com
- **Development Team**: dev-team@company.com
- **Security Team**: security@company.com

### External Vendors
- **Hosting Provider**: [Contact Information]
- **Database Support**: [Contact Information]
- **SSL Certificate Provider**: [Contact Information]

### Emergency Contacts
- **On-Call Engineer**: [Phone Number]
- **System Administrator**: [Phone Number]
- **Technical Lead**: [Phone Number]

---

*Last Updated: [Current Date]*
*Document Version: 1.0*

For additional support or to report issues with this documentation, please contact the technical support team.


## See Also

### Related Operations Documentation
- **[Deployment Guide](deployment-guide.md)** - Deployment procedures
- **[Deployment Overview](../deployment/README.md)** - Deployment documentation hub
- **[Monitoring & Logging](../deployment/monitoring-logging.md)** - System monitoring
- **[VPS Configuration](vps-configuration/)** - Server configuration details
- **[VPS Troubleshooting](vps-configuration/troubleshooting.md)** - Detailed VPS troubleshooting

### Architecture Documentation
- **[System Architecture](../design/system-architecture.md)** - System design and components
- **[Data Flow Architecture](../design/data-flow-architecture.md)** - Data flow patterns
- **[Integration Patterns](../architecture/integration-patterns.md)** - External integrations

### Development Documentation
- **[Testing Strategy](../development/testing-strategy.md)** - Testing approaches
- **[Backend Development](../backend/README.md)** - Backend implementation
- **[Frontend Development](../frontend/README.md)** - Frontend implementation

### Integration Documentation
- **[Integrations Overview](../integrations/README.md)** - External system connections
- **[Integration Troubleshooting](../integrations/troubleshooting.md)** - Integration issues

---

*This document is part of the [Operations Documentation](../operations/)*
