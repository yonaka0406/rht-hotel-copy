# Troubleshooting Guide

This guide provides solutions to common issues encountered when deploying, configuring, and operating the WeHub.work Hotel Management System.

## Quick Diagnostic Commands

```bash
# Check application status
pm2 status
pm2 logs pms-api --lines 100

# Check system services
sudo systemctl status nginx
sudo systemctl status postgresql
sudo systemctl status redis-server

# Check system resources
htop
df -h
free -h

# Check network connectivity
curl http://localhost:3000/api/health
curl https://yourdomain.com/api/health

# Check database connectivity
psql -U pms_user -d pms_production -c "SELECT version();"

# Check Redis connectivity
redis-cli ping
```

## Application Issues

### Application Won't Start

#### Symptoms
- PM2 shows application as "errored" or "stopped"
- Application crashes immediately after starting
- No response from API endpoints

#### Diagnostic Steps

```bash
# Check PM2 status and logs
pm2 status
pm2 logs pms-api --lines 50 --err

# Check if port is already in use
sudo lsof -i :3000
sudo netstat -tulpn | grep :3000

# Verify environment variables
cat .env.production | grep -v PASSWORD | grep -v SECRET

# Test Node.js application directly
cd /home/pms/apps/rht-hotel
NODE_ENV=production node api/server.js
```

#### Common Causes and Solutions

**1. Missing or Invalid Environment Variables**
```bash
# Verify all required variables are set
grep -E "^[A-Z_]+=.+" .env.production

# Check for common issues
# - Missing DATABASE_URL
# - Invalid JWT_SECRET (must be at least 32 characters)
# - Incorrect PORT number
```

**Solution**: Update `.env.production` with correct values and restart:
```bash
pm2 restart pms-api
```

**2. Database Connection Failure**
```bash
# Test database connection
psql -U pms_user -d pms_production

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database credentials in environment
echo $DATABASE_URL
```

**Solution**: Fix database credentials or start PostgreSQL:
```bash
sudo systemctl start postgresql
pm2 restart pms-api
```

**3. Port Already in Use**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill the process if needed
# Attempt graceful shutdown first (sends SIGTERM)
sudo kill <PID>
# Wait a few seconds (e.g., 5 seconds) to allow the process to terminate gracefully
sleep 5
# Verify if the process has exited
pgrep -P <PID> || echo "Process <PID> terminated."
# If the process is still running, force kill (SIGKILL) as a last resort
sudo kill -9 <PID>
```

**Solution**: Change PORT in `.env.production` or kill conflicting process.

**4. Missing Dependencies**
```bash
# Reinstall dependencies
cd /home/pms/apps/rht-hotel
rm -rf node_modules package-lock.json
npm install --production
```

**5. File Permission Issues**
```bash
# Check file ownership
ls -la /home/pms/apps/rht-hotel

# Fix ownership if needed
sudo chown -R pms:pms /home/pms/apps/rht-hotel
```

### Application Crashes Intermittently

#### Symptoms
- Application runs but crashes periodically
- PM2 shows frequent restarts
- Memory or CPU spikes before crashes

#### Diagnostic Steps

```bash
# Monitor application in real-time
pm2 monit

# Check memory usage
pm2 list
free -h

# Review error logs
pm2 logs pms-api --err --lines 200

# Check for memory leaks
pm2 describe pms-api
```

#### Common Causes and Solutions

**1. Memory Leaks**
```bash
# Check memory restart configuration
pm2 describe pms-api | grep max_memory_restart

# Increase memory limit if needed
pm2 delete pms-api
pm2 start ecosystem.config.js
```

**Solution**: Update `ecosystem.config.js`:
```javascript
{
  max_memory_restart: '2G',  // Increase from 1G
  // ... other config
}
```

**2. Unhandled Promise Rejections**
Check logs for:
- `UnhandledPromiseRejectionWarning`
- `DeprecationWarning`

**Solution**: Fix code to handle all promise rejections properly.

**3. Database Connection Pool Exhaustion**
```bash
# Check PostgreSQL connections
psql -U pms_user -d pms_production -c "SELECT count(*) FROM pg_stat_activity;"
```

**Solution**: Adjust connection pool settings in application configuration.

### Slow Application Performance

#### Symptoms
- API requests take longer than expected
- Frontend loads slowly
- Database queries are slow

#### Diagnostic Steps

```bash
# Check system resources
htop
iostat -x 1 5

# Check database performance
psql -U pms_user -d pms_production -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Check slow queries
psql -U pms_user -d pms_production -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check Redis performance
redis-cli --latency
redis-cli info stats

# Check Nginx access logs for slow requests
sudo tail -f /var/log/nginx/access.log | grep -E "request_time\":[0-9]\."
```

#### Common Causes and Solutions

**1. Database Query Performance**
```sql
-- Identify missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
ORDER BY abs(correlation) DESC;

-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Solution**: Add indexes for frequently queried columns:
```sql
CREATE INDEX idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX idx_reservations_status ON reservations(status);
```

**2. Cache Not Working**
```bash
# Check Redis is running and accessible
redis-cli ping

# Check cache hit rate
redis-cli info stats | grep keyspace
```

**Solution**: Verify Redis connection in application and restart:
```bash
pm2 restart pms-api
```

**3. High CPU Usage**
```bash
# Identify CPU-intensive processes
top -c

# Check Node.js process CPU usage
ps aux | grep node
```

**Solution**: 
- Optimize CPU-intensive operations
- Increase PM2 instances for load distribution
- Consider upgrading server resources

**4. Network Latency**
```bash
# Test network latency to database
ping localhost

# Test API response time
time curl http://localhost:3000/api/health
```

**Solution**: Optimize network configuration or consider co-locating services.

## Deployment and Monitoring Troubleshooting

### Deployment

This section covers common issues encountered during the deployment process, from server preparation to application startup.

### Monitoring

This section addresses problems related to system monitoring, logging, and health checks.

## Database Issues

### Cannot Connect to Database

#### Symptoms
- Application logs show database connection errors
- `psql` command fails to connect
- "Connection refused" or "Connection timeout" errors

#### Diagnostic Steps

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check PostgreSQL is listening
sudo netstat -tulpn | grep 5432

# Test connection
psql -U pms_user -d pms_production -h localhost

# Check PostgreSQL logs
# Check PostgreSQL logs
# Note: The exact log filename may vary depending on your PostgreSQL version and distribution.
# You can often use a wildcard or check the actual file in the directory.
# Option 1: Use a wildcard (common for Debian/Ubuntu based systems)
sudo tail -f /var/log/postgresql/postgresql-*-main.log
# Option 2: Find the exact log file (more robust)
# First, find the PostgreSQL version and cluster name:
#   sudo pg_lsclusters
# Then, construct the path. For example, if version is 14 and cluster is main:
#   sudo tail -f /var/log/postgresql/14/main/postgresql.log
# Or, if you know the version, you can list files in the directory:
#   ls -l /var/log/postgresql/14/main/
```

#### Common Causes and Solutions

**1. PostgreSQL Not Running**
```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**2. Authentication Failure**
```bash
# Check pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Ensure this line exists:
# host    all             all             127.0.0.1/32            md5

# Reload PostgreSQL
sudo systemctl reload postgresql
```

**3. Wrong Database Credentials**
```bash
# Verify credentials
psql -U pms_user -d pms_production

# Reset password if needed
sudo -u postgres psql -c "ALTER USER pms_user WITH PASSWORD '<your_password>';"
```

**4. Database Doesn't Exist**
```bash
# List databases
psql -U postgres -c "\l"

# Create database if missing
psql -U postgres -c "CREATE DATABASE pms_production OWNER pms_user;"
```

### Database Migration Failures

#### Symptoms
- Migration scripts fail to execute
- Schema version mismatch errors
- Missing tables or columns

#### Diagnostic Steps

```bash
# Check current migration status
npm run migrate:status

# Check database schema
psql -U pms_user -d pms_production -c "\dt"

# Review migration logs
cat logs/migration.log
```

#### Common Causes and Solutions

**1. Migration Already Applied**
```bash
# Check migration history
psql -U pms_user -d pms_production -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 10;"
```

**Solution**: Skip already applied migrations or rollback if needed.

**2. Syntax Errors in Migration**
```bash
# Test migration SQL manually
psql -U pms_user -d pms_production -f migrations/001_create_tables.sql
```

**Solution**: Fix SQL syntax errors and re-run migration.

**3. Permission Issues**
```bash
# Grant necessary permissions
psql -U postgres -d pms_production -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pms_user;"
```

### Database Performance Issues

#### Symptoms
- Slow query execution
- High database CPU usage
- Connection pool exhaustion

#### Diagnostic Steps

```sql
-- Check active queries
SELECT pid, usename, application_name, state, query, query_start
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY query_start;

-- Check slow queries
-- Note: pg_stat_statements must be enabled for this query to work.
-- To enable:
-- 1. Add 'pg_stat_statements' to shared_preload_libraries in postgresql.conf.
--    Example: shared_preload_libraries = 'pg_stat_statements'
-- 2. Restart the PostgreSQL server.
-- 3. Connect to your target database (e.g., pms_production) and run:
--    CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
SELECT query, calls, total_time, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 20;

-- Check table bloat
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

#### Solutions

**1. Add Missing Indexes**
```sql
-- Analyze query plans
EXPLAIN ANALYZE SELECT * FROM reservations WHERE hotel_id = 1 AND check_in_date >= '2024-01-01';

-- Add indexes based on analysis
CREATE INDEX idx_reservations_hotel_dates ON reservations(hotel_id, check_in_date);
```

**2. Vacuum and Analyze**
```bash
# Run vacuum analyze
psql -U pms_user -d pms_production -c "VACUUM ANALYZE;"

# Schedule regular maintenance
# Add to crontab:
0 3 * * 0 psql -U pms_user -d pms_production -c "VACUUM ANALYZE;"
```

**3. Optimize Queries**
- Use EXPLAIN ANALYZE to identify bottlenecks
- Avoid SELECT * queries
- Use appropriate JOINs
- Implement pagination for large result sets

## Nginx Issues

### 502 Bad Gateway Error

#### Symptoms
- Nginx returns 502 error
- "Bad Gateway" message in browser
- Upstream connection errors in logs

#### Diagnostic Steps

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Check if backend is running
pm2 status
curl http://localhost:3000/api/health

# Check Nginx configuration
sudo nginx -t

# Check upstream configuration
sudo cat /etc/nginx/sites-enabled/pms | grep upstream -A 5
```

#### Common Causes and Solutions

**1. Backend Not Running**
```bash
# Start backend
pm2 start pms-api

# Verify it's running
pm2 status
curl http://localhost:3000/api/health
```

**2. Wrong Upstream Port**
```bash
# Check backend port
pm2 describe pms-api | grep PORT

# Update Nginx upstream if needed
sudo nano /etc/nginx/sites-available/pms
# Update: server 127.0.0.1:3000;

sudo nginx -t
sudo systemctl reload nginx
```

**3. Firewall Blocking Connection**
```bash
# Check firewall rules
sudo ufw status

# Allow local connections if needed
sudo ufw allow from 127.0.0.1
```

### 404 Not Found for Frontend Routes

#### Symptoms
- Direct navigation to routes returns 404
- Refresh on frontend routes fails
- Only root path works

#### Diagnostic Steps

```bash
# Check Nginx configuration
sudo cat /etc/nginx/sites-enabled/pms | grep "try_files"

# Check frontend build
ls -la /home/pms/apps/rht-hotel/frontend/dist/

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

#### Solution

Ensure Nginx configuration has proper try_files directive:
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

Reload Nginx:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Certificate Issues

#### Symptoms
- Browser shows "Not Secure" warning
- Certificate expired errors
- SSL handshake failures

#### Diagnostic Steps

```bash
# Check certificate status
sudo certbot certificates

# Test SSL configuration
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check Nginx SSL configuration
sudo cat /etc/nginx/sites-enabled/pms | grep ssl
```

#### Common Causes and Solutions

**1. Certificate Expired**
```bash
# Renew certificate
sudo certbot renew

# Force renewal if needed
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

**2. Certificate Not Found**
```bash
# Obtain new certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

**3. Auto-Renewal Not Working**
```bash
# Test renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer

# Enable timer if disabled
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

## Redis Issues

### Cannot Connect to Redis

#### Symptoms
- Application logs show Redis connection errors
- Session data not persisting
- Cache not working

#### Diagnostic Steps

```bash
# Check Redis is running
sudo systemctl status redis-server

# Test Redis connection
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Check Redis configuration
sudo cat /etc/redis/redis.conf | grep -E "bind|port|requirepass"
```

#### Common Causes and Solutions

**1. Redis Not Running**
```bash
# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**2. Wrong Redis Configuration**
```bash
# Check application Redis configuration
grep REDIS .env.production

# Update if needed
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_URL=redis://localhost:6379
```

**3. Redis Out of Memory**
```bash
# Check Redis memory usage
redis-cli info memory

# Check maxmemory setting
redis-cli config get maxmemory

# Increase maxmemory if needed
sudo nano /etc/redis/redis.conf
# Update: maxmemory 512mb

sudo systemctl restart redis-server
```

## Integration Issues

### Booking Engine Integration Failures

#### Symptoms
- Cache updates fail
- API authentication errors
- Data synchronization issues

#### Diagnostic Steps

```bash
# Check API key configuration
grep BOOKING_ENGINE_API_KEY .env.production

# Test API endpoint
curl -H "Authorization: Bearer YOUR_API_KEY" https://yourdomain.com/api/booking-engine/cache/status

# Check integration logs
pm2 logs pms-api | grep "booking-engine"
```

#### Solutions

**1. Invalid API Key**
- Verify API key in `.env.production`
- Regenerate API key if needed
- Restart application: `pm2 restart pms-api`

**2. Network Connectivity**
```bash
# Test connectivity to booking engine
curl -I https://booking-engine-url.com

# Check firewall rules
sudo ufw status
```

**3. Cache Synchronization Issues**
- Manually trigger cache update
- Check cache status endpoint
- Review synchronization logs

### Payment Gateway Integration Issues

#### Symptoms
- Payment link generation fails
- Webhook notifications not received
- Payment status not updating

#### Diagnostic Steps

```bash
# Check Square configuration
grep SQUARE .env.production

# Test webhook endpoint
curl -X POST https://yourdomain.com/api/v1/webhooks/square \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check webhook logs
pm2 logs pms-api | grep webhook
```

#### Solutions

**1. Invalid Square Credentials**
- Verify Square access token
- Check Square location ID
- Verify webhook signing secret

**2. Webhook Endpoint Not Accessible**
```bash
# Verify endpoint is publicly accessible
curl https://yourdomain.com/api/v1/webhooks/square

# Check Nginx configuration for webhook route
sudo cat /etc/nginx/sites-enabled/pms | grep webhook
```

**3. Signature Verification Failing**
- Verify webhook signing secret matches Square dashboard
- Check signature verification logic in code
- Review webhook payload in logs

## Performance Optimization

### High Memory Usage

#### Diagnostic Steps

```bash
# Check memory usage
free -h
pm2 list

# Check process memory
ps aux --sort=-%mem | head -10

# Monitor memory over time
watch -n 5 free -h
```

#### Solutions

**1. Increase Server Memory**
- Upgrade server plan
- Add swap space (temporary solution)

**2. Optimize Application**
- Reduce PM2 instances
- Implement memory limits
- Fix memory leaks in code

**3. Optimize Database**
```sql
-- Reduce shared_buffers if too high
-- Check PostgreSQL configuration
SHOW shared_buffers;
SHOW effective_cache_size;
```

### High CPU Usage

#### Diagnostic Steps

```bash
# Check CPU usage
top -c
htop

# Check Node.js processes
ps aux | grep node | sort -k3 -r

# Profile application
pm2 monit
```

#### Solutions

**1. Optimize Code**
- Profile CPU-intensive operations
- Implement caching
- Optimize algorithms

**2. Scale Horizontally**
- Increase PM2 instances
- Use load balancer
- Distribute workload

**3. Optimize Database Queries**
- Add indexes
- Optimize query plans
- Use connection pooling

## Getting Help

### **🚨 IMPORTANT SECURITY WARNING: NEVER SHARE SENSITIVE INFORMATION 🚨**

When collecting diagnostic information, it is CRITICAL that you **NEVER** share sensitive values. This includes, but is not limited to:
- API keys (e.g., Google API Key, payment gateway keys)
- Access tokens and refresh tokens
- Private keys (e.g., SSL private keys, SSH keys)
- Webhook secrets and signing secrets
- Passwords and database credentials
- Any other confidential information that could compromise your system or data.

Always ensure that any diagnostic output is thoroughly sanitized before sharing.

### Collecting Diagnostic Information

When reporting issues, collect the following information:

```bash
# System information
uname -a
cat /etc/os-release

# Application status
pm2 status
pm2 describe pms-api

# Recent logs
pm2 logs pms-api --lines 100 --nostream > app-logs.txt
sudo tail -n 100 /var/log/nginx/error.log > nginx-error.txt
sudo tail -n 100 /var/log/postgresql/postgresql-14-main.log > postgres.txt

# Configuration (sanitized)

# When collecting configuration, NEVER share raw .env files.

# Instead, either:

# 1. Whitelist safe environment variables (e.g., `APP_ENV`, `PORT`, `FRONTEND_URL`).

#    Example: `grep -E '^(APP_ENV|PORT|FRONTEND_URL)=' .env.production > config.txt`

# 2. Filter out sensitive patterns using a comprehensive list.

#    Example: `cat .env.production | grep -v -E 'APIKEY|API_KEY|ACCESS_TOKEN|TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET|PASSWORD|KEY|SECRET_KEY|CLIENT_SECRET' > config.txt`

# 3. Use a small helper script that outputs only allowlisted variables.

#    (e.g., a script that reads .env, filters, and prints to stdout)



# Resource usage

free -h > resources.txt

df -h >> resources.txt



---



**Before submitting diagnostic information, please perform the following steps:**



1.  **Review all generated files:** Open `app-logs.txt`, `nginx-error.txt`, `postgres.txt`, `config.txt`, and `resources.txt` in a text editor.

2.  **Redact any remaining sensitive values:** Manually search for and replace any API keys, passwords, tokens, or other secrets with `[REDACTED]`.

3.  **Confirm no secrets included:** Double-check that no sensitive data, even partial, is present.

4.  **Sanitize filenames:** Ensure filenames themselves do not contain sensitive information.



Only submit diagnostic information after you have thoroughly sanitized it.
```

### Support Resources

- **Documentation**: Review [deployment guide](deployment-guide.md) and [maintenance procedures](maintenance.md)
- **Logs**: Check application, Nginx, PostgreSQL, and Redis logs
- **Monitoring**: Use PM2 monitoring and system monitoring tools
- **Community**: Consult project documentation and issue tracker

## Related Documentation

- **[Deployment Guide](deployment-guide.md)** - Complete deployment instructions
- **[Monitoring & Logging](monitoring-logging.md)** - Monitoring setup and log analysis
- **[Maintenance](maintenance.md)** - Regular maintenance procedures
- **[Environment Setup](environment-setup.md)** - Environment configuration

---

*This troubleshooting guide covers common issues. For specific problems not covered here, consult the detailed documentation or collect diagnostic information for support.*
