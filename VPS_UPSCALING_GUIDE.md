# VPS Upscaling Guide

## Overview
This guide covers the complete process of upscaling your VPS for the RHT Hotel application, including database backup, service management, memory allocation, and Node.js upgrade considerations.

## Pre-Upscale Checklist

### 1. Discover Your Server Setup

**First, check what's actually on your server:**

```bash
# Check if backup scripts exist
find / -name "*backup*" -type f 2>/dev/null | grep -E "\.(sh|js)$"
find /usr/local/bin -name "*backup*" -type f 2>/dev/null
find /var/backups -type d 2>/dev/null

# Check PostgreSQL user and databases
sudo -u postgres psql -l
sudo -u postgres psql -c "\du"

# Check if rhtsys_user exists
sudo -u postgres psql -c "SELECT rolname FROM pg_roles WHERE rolname = 'rhtsys_user';"

# Check current backup directory
ls -la /var/backups/postgresql/ 2>/dev/null || echo "Directory doesn't exist"

# Check cron jobs for automated backups
sudo crontab -l
crontab -l

# Check systemd services for backups
sudo systemctl list-units --type=service | grep -i backup
sudo systemctl list-timers | grep -i backup

# Check what PostgreSQL version and config
sudo -u postgres psql -c "SELECT version();"
sudo find /etc -name "postgresql.conf" 2>/dev/null
```

**Check your current server setup:**
```bash
# Your application is at:
cd /var/www/html/rht-hotel
pwd

# Check current working directory and permissions
ls -la /var/www/html/rht-hotel/
whoami

# Test database connections
sudo -u postgres psql -d wehub -c "SELECT current_user, current_database();"
psql -h localhost -U rhtsys_user -d wehub -c "SELECT current_user, current_database();" 2>/dev/null || echo "rhtsys_user connection failed"

# Check backup directory
ls -la /var/backups/postgresql/ 2>/dev/null || echo "Backup directory doesn't exist yet"

# Check .pgpass files
ls -la ~/.pgpass /root/.pgpass 2>/dev/null || echo "No .pgpass files found"

# Check if Google Drive upload script exists
ls -la /usr/local/bin/upload_to_google_drive.js 2>/dev/null || echo "Google Drive upload script not found"
```

### 2. Create PostgreSQL Backup

**Your automated backup system:**
- **Schedule**: 3 times daily (2:00 AM, 12:00 PM, 5:00 PM JST)
- **Timer**: `postgresql-backup-wehub.timer` (systemd)
- **Service**: `postgresql-backup-wehub.service`

**Option 1: Wait for next scheduled backup (recommended if timing allows)**
```bash
# Check when next backup runs
sudo systemctl list-timers | grep postgresql-backup

# Check recent backup files
ls -la /var/backups/postgresql/
```

**Option 2: Trigger manual backup before upscale (RECOMMENDED)**

**If your upscale is soon**: Trigger a manual backup using:
```bash
sudo systemctl start postgresql-backup-wehub.service
```

**Complete manual backup process:**
```bash
# Manually trigger your automated backup system
sudo systemctl start postgresql-backup-wehub.service

# Check backup status
sudo systemctl status postgresql-backup-wehub.service

# Check backup logs
sudo journalctl -u postgresql-backup-wehub.service --since "10 minutes ago"

# Verify backup was created
ls -la /var/backups/postgresql/ | tail -5
```

**Option 3: Manual backup using your scripts**
```bash
# Use your backup scripts directly
cd /var/www/html/rht-hotel
sudo ./server-config/postgres/backup_postgresql.sh wehub YOUR_GDRIVE_FOLDER_ID
```

**Test which method works:**
```bash
# Test postgres user connection
sudo -u postgres psql -d wehub -c "SELECT 1;" && echo "postgres user works"

# Test rhtsys_user connection (may need password)
psql -h localhost -U rhtsys_user -d wehub -c "SELECT 1;" && echo "rhtsys_user works"

# Check if backup directory exists
ls -la /var/backups/postgresql/ && echo "Backup directory exists"
```

**Verify backup was created:**
```bash
# Check recent backups
find /tmp /var/backups -name "*wehub*" -type f -mtime -1 2>/dev/null
ls -la /tmp/wehub_backup_* 2>/dev/null || echo "No backup in /tmp"
ls -la /var/backups/postgresql/wehub-* 2>/dev/null || echo "No backup in /var/backups"
```

### 3. Stop Application and Create Final Backup

**To prevent any data changes after backup:**

```bash
# 1. Stop PM2 processes first (prevents new data changes)
pm2 stop all
pm2 save

# 2. Create final backup immediately before upscale
sudo systemctl start postgresql-backup-wehub.service

# 3. Monitor backup completion
sudo journalctl -u postgresql-backup-wehub.service --since "2 minutes ago" -f
# Press Ctrl+C when you see backup completion message

# 4. Verify backup was created
ls -la /var/backups/postgresql/ | tail -3

# 5. Stop remaining system services
sudo systemctl stop apache2
sudo systemctl stop postgresql
sudo systemctl stop redis-server

# 6. Verify all services are stopped
pm2 status
sudo systemctl status apache2
sudo systemctl status postgresql
sudo systemctl status redis-server
```

**This sequence ensures:**
- No new data changes after backup
- Clean, consistent backup state
- Proper service shutdown order

### 4. Document Current Resource Usage

**Your current VPS specs (baseline):**
- **Memory**: 3.8GB total (1.7GB used, 2.1GB available)
- **Disk**: 197GB total (72GB used, 116GB available)
- **Swap**: 2GB (212MB used)

```bash
# Check current memory usage
free -h
htop

# Check disk usage
df -h

# Check current Node.js version
node --version
npm --version

# Check current PM2 memory usage
pm2 monit
pm2 list

# Check PostgreSQL memory usage
sudo -u postgres psql -c "SHOW shared_buffers;"
sudo -u postgres psql -c "SHOW effective_cache_size;"
```

## VPS Provider Upscale Process

### 5. Pre-Upscale Provider Checks

**CRITICAL: Check with your VPS provider BEFORE upscaling:**

```bash
# Document current IP address
ip addr show
curl -4 ifconfig.me  # Your public IP
```

**Questions to ask your provider:**
1. **IP Address**: Will my IP address change during upscale?
2. **Migration**: Does upscale require moving to new physical hardware?
3. **Snapshot**: Can you create a snapshot before upscale (faster rollback than backup)?
4. **Downtime**: How long will the server be offline?

**If IP might change:**
- Update DNS records preparation
- Note any firewall rules or API integrations using your IP
- Prepare to update external services pointing to your server

### 6. Create VPS Snapshot (Recommended)

**Best practice**: Take a provider snapshot (not just database backup) for instant rollback:

```bash
# Through your provider's dashboard or API
# This allows near-instant "undo" if OS fails to boot after upscale
```

### 7. Trigger VPS Upscale
- Log into your VPS provider dashboard
- Create snapshot/backup through provider (if available)
- Navigate to your server instance
- Select "Resize" or "Upscale" option
- Choose new plan with increased resources
- Confirm the upscale (server will reboot)
- Wait for completion notification

### 8. Post-Upscale Verification

**CRITICAL: Verify IP Address First**

```bash
# Check if IP address changed
curl -4 ifconfig.me
ip addr show

# If IP changed, update:
# - DNS records (A records, AAAA records)
# - Firewall rules
# - API integrations
# - SSL certificates (if IP-based)
```

**CRITICAL: Disk Space Expansion**

Most VPS providers increase virtual disk size but don't automatically expand the filesystem.

```bash
# Check current disk usage
df -h

# Check partition layout
lsblk
fdisk -l

# If disk shows larger size but filesystem doesn't:
# 1. Expand the partition (if needed)
sudo growpart /dev/sda 1  # Adjust device/partition as needed

# 2. Resize the filesystem
# For ext4 filesystems:
sudo resize2fs /dev/sda1

# For XFS filesystems:
sudo xfs_growfs /

# Verify expansion worked
df -h
```

**Resource Verification:**
```bash
# Verify new resources
free -h
lscpu
df -h

# Check if services auto-started
sudo systemctl status apache2
sudo systemctl status postgresql
sudo systemctl status redis-server
```

**⚠️ Warning**: You might pay for 100GB but your OS still thinks it only has the original size until you manually resize!

## Disk Space Management

### 9. Expand Filesystem (CRITICAL STEP)

**Why this matters**: VPS providers increase virtual disk size but rarely auto-expand the filesystem. You might pay for 100GB but your OS still sees only 50GB.

**Step-by-step disk expansion:**

```bash
# 1. Check current situation
df -h                    # Shows filesystem size
lsblk                    # Shows disk/partition layout
sudo fdisk -l            # Shows actual disk size

# 2. Identify your root partition
# Common patterns: /dev/sda1, /dev/vda1, /dev/xvda1
# Look for the partition mounted on "/"

# 3. Expand the partition (if needed)
# Replace /dev/sda and 1 with your actual device and partition number
sudo growpart /dev/sda 1

# 4. Resize the filesystem
# For ext4 (most common):
sudo resize2fs /dev/sda1

# For XFS:
sudo xfs_growfs /

# For ext3:
sudo resize2fs /dev/sda1

# 5. Verify the expansion
df -h                    # Should now show full disk size
```

**Troubleshooting disk expansion:**

```bash
# If growpart is not installed:
sudo apt-get update
sudo apt-get install -y cloud-guest-utils

# Check filesystem type:
df -T

# If partition table is GPT instead of MBR:
sudo parted /dev/sda
(parted) print
(parted) resizepart 1 100%
(parted) quit
sudo resize2fs /dev/sda1

# Verify no errors:
sudo e2fsck -f /dev/sda1  # Only run on unmounted partitions!
```

## Memory Allocation Strategy

### 10. PostgreSQL Memory Configuration

**CRITICAL: Your database won't automatically use new RAM until you update config files**

Based on your new VPS specs, update PostgreSQL configuration:

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/*/main/postgresql.conf
```

**Memory allocation recommendations (from your current 3.8GB):**
- **Current (3.8GB)**: PostgreSQL = 768MB, Node.js = 1.5GB, System = 1.5GB
- **6GB VPS**: PostgreSQL = 1.5GB, Node.js = 3GB, System = 1.5GB  
- **8GB VPS**: PostgreSQL = 2GB, Node.js = 4GB, System = 2GB
- **12GB VPS**: PostgreSQL = 3GB, Node.js = 6GB, System = 3GB

**Key PostgreSQL settings to update:**
```conf
# For 4GB VPS example
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 11. PM2 Memory Limits

**CRITICAL: Node.js won't use new memory until you update PM2 limits**

Update your ecosystem.config.js for new memory limits:

```javascript
module.exports = {
  apps : [
    {
      name   : 'backend-dev',
      script : './api/index.js',
      watch  : false,
      node_args: "--expose-gc --max-old-space-size=1024", // 1GB for dev
      max_memory_restart: '1G',
      env_development: { 
        "NODE_ENV": "development",
        "PORT": 3001, 
        "STAMP_COMPONENTS_DIR": "./api/components/dev"
      }
    },
    {
      name   : 'backend-prod',
      script : './api/index.js',
      node_args: "--expose-gc --max-old-space-size=2048", // 2GB for prod
      max_memory_restart: '2G',
      watch  : false,
      env_production: {
        "NODE_ENV": "production",
        "PORT": 5000,
        "STAMP_COMPONENTS_DIR": "./api/components/prod"
      }
    }
  ]
};
```

## Node.js 24 Upgrade Process

### 12. Node.js Version Upgrade (22 → 24)

**Current setup**: Node.js 22
**Target**: Node.js 24 (requires more memory - plan accordingly)

```bash
# Install Node.js 24 using NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version  # Should show v24.x.x
npm --version

# Update npm to latest
sudo npm install -g npm@latest
```

### 13. Application Dependencies Update

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules api/node_modules frontend/node_modules
rm package-lock.json api/package-lock.json frontend/package-lock.json

# Reinstall dependencies
npm install
cd api && npm install && cd ..
cd frontend && npm install && cd ..

# Update PM2 globally
sudo npm install -g pm2@latest
```

## Service Restart Process

### 14. Start Services in Order

```bash
# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl status postgresql

# Restart PostgreSQL with new config
sudo systemctl restart postgresql

# Start Redis
sudo systemctl start redis-server
sudo systemctl status redis-server

# Start Apache
sudo systemctl start apache2
sudo systemctl status apache2

# Start PM2 processes
pm2 resurrect
# Or start fresh
pm2 start ecosystem.config.js --env production --only backend-prod
```

### 15. Application Health Checks

```bash
# Check PM2 processes
pm2 status
pm2 logs

# Test database connection
sudo -u postgres psql -d wehub -c "SELECT version();"

# Test Redis connection
redis-cli ping

# Check application endpoints
curl http://localhost:5000/health  # If you have a health endpoint
curl http://localhost:3000         # Frontend
```

## Performance Monitoring

### 16. Monitor Resource Usage

```bash
# Real-time monitoring
htop
iotop
sudo netstat -tulpn

# PM2 monitoring
pm2 monit

# PostgreSQL performance
sudo -u postgres psql -d wehub -c "SELECT * FROM pg_stat_activity;"
```

### 17. Performance Tuning

**PostgreSQL optimizations:**
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

-- Analyze table statistics
ANALYZE;
```

**Node.js optimizations:**
```bash
# Enable garbage collection logging
node --expose-gc --trace-gc your-app.js

# Monitor memory usage
pm2 show backend-prod
```

## Rollback Plan

### 18. Emergency Rollback

If issues occur:

```bash
# Stop new services
cd /var/www/html/rht-hotel
pm2 stop all
sudo systemctl stop postgresql

# Restore database backup
sudo -u postgres dropdb wehub --force
sudo -u postgres createdb wehub

# Restore from your backup (adjust path to your actual backup file)
# If using compressed .dump.gz from your script:
gunzip -c /var/backups/postgresql/wehub-YYYY-MM-DD_HH-MM-SS.dump.gz | sudo -u postgres pg_restore --verbose --no-acl --no-owner --role=postgres --dbname=wehub

# Or if using uncompressed .dump:
sudo -u postgres pg_restore --verbose --no-acl --no-owner --role=postgres --dbname=wehub /tmp/wehub_backup_YYYYMMDD_HHMMSS.dump

# Downgrade Node.js if needed
# (Keep old Node.js version available via nvm)
nvm use 22
```

## Post-Upscale Optimization

### 19. Long-term Monitoring

- Set up monitoring alerts for memory usage > 80%
- Monitor database performance with pg_stat_statements
- Track application response times
- Set up automated backups with new storage capacity

### 16. Documentation Updates

- Update deployment documentation with new memory limits
- Document new server specifications
- Update monitoring thresholds
- Record performance benchmarks

## Memory Allocation Examples

### Small Upscale (3.8GB → 6GB)
- PostgreSQL: 768MB → 1.5GB
- Node.js: 1.5GB → 3GB  
- System/Cache: 1.5GB → 1.5GB

### Medium Upscale (3.8GB → 8GB)
- PostgreSQL: 768MB → 2GB
- Node.js: 1.5GB → 4GB
- System/Cache: 1.5GB → 2GB

### Large Upscale (3.8GB → 12GB)
- PostgreSQL: 768MB → 3GB
- Node.js: 1.5GB → 6GB
- System/Cache: 1.5GB → 3GB

## Troubleshooting

### Common Issues

1. **Disk space not expanded**: Run `growpart` and `resize2fs`/`xfs_growfs`
2. **PostgreSQL won't start**: Check logs in `/var/log/postgresql/`
3. **PM2 processes crash**: Check memory limits and Node.js compatibility
4. **High memory usage**: Monitor with `pm2 monit` and adjust limits
5. **Slow queries**: Use `EXPLAIN ANALYZE` and check indexes
6. **Backup restore fails**: Ensure backup format matches restore method (.dump vs .sql)

### Emergency Contacts

- VPS Provider Support: [Your provider's support contact]
- Database Admin: [Contact info]
- Application Team: [Contact info]

---

**Last Updated**: 2025-12-19
**Next Review**: Schedule quarterly review of resource allocation