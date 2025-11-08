# Deployment and Setup Guide

## Overview

This guide provides comprehensive instructions for deploying and setting up the RHT Hotel Management System. The system consists of a Node.js/Express backend API and a Vue.js frontend application with PostgreSQL database and Redis for session management.

## Prerequisites

### System Requirements

- **Operating System**: Linux (Ubuntu 18.04+, CentOS 7+) or Windows Server
- **Node.js**: Version 16.x or higher (LTS recommended)
- **PostgreSQL**: Version 12.x or higher
- **Redis**: Version 6.x or higher
- **Memory**: Minimum 4GB RAM (8GB+ recommended for production)
- **Storage**: Minimum 20GB available disk space
- **Network**: Stable internet connection for package installation and updates

### Required Software

1. **Node.js and npm**
   ```bash
   # Ubuntu/Debian
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # CentOS/RHEL
   curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
   sudo yum install -y nodejs
   
   # Verify installation
   node --version
   npm --version
   ```

2. **PostgreSQL**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # CentOS/RHEL
   sudo yum install postgresql-server postgresql-contrib
   sudo postgresql-setup initdb
   
   # Start and enable PostgreSQL
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt install redis-server
   
   # CentOS/RHEL
   sudo yum install redis
   
   # Start and enable Redis
   sudo systemctl start redis
   sudo systemctl enable redis
   ```

## Database Setup

### 1. Create Database and User

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database
CREATE DATABASE hotel_system_db;

# Create user with password
CREATE USER hotel_user WITH ENCRYPTED PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hotel_system_db TO hotel_user;

# Exit psql
\q
```

### 2. Run Database Migrations

Execute the migration scripts in numerical order from the `api/migrations/` directory:

```bash
# Navigate to project directory
cd /path/to/rht-hotel

# Connect to database and run migrations
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/001_initial_schema.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/002_room_management.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/003_client_management.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/004_plans_and_addons.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/005_reservations.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/006_billing.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/007_ota_integration.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/008_views.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/009_financial_data.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/010_logs_schema_and_functions.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/011_custom_functions.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/012_triggers.sql
psql -h localhost -U hotel_user -d hotel_system_db -f api/migrations/013_waitlist.sql
```

### 3. Verify Database Setup

```bash
# Connect to database
psql -h localhost -U hotel_user -d hotel_system_db

# List tables to verify migration success
\dt

# Check if key tables exist
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

# Exit
\q
```

## Backend API Setup

### 1. Install Dependencies

```bash
# Navigate to API directory
cd api

# Install Node.js dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2. Environment Configuration

Create a `.env` file in the `api` directory:

```bash
# Copy example environment file if it exists
cp .env.example .env

# Or create new .env file
touch .env
```

Configure the following environment variables in `.env`:

```env
# Database Configuration
DB_USER=hotel_user
DB_HOST=localhost
DB_DATABASE=hotel_system_db
DB_PASSWORD=your_secure_password
DB_PORT=5432

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
REFRESH_TOKEN_SECRET=your_refresh_token_secret_here

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Email Configuration (for notifications)
EMAIL_HOST=smtp.your-email-provider.com
EMAIL_PORT=587
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-email-password

# Google OAuth Configuration (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
YOUR_WORKSPACE_DOMAIN=yourdomain.com

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379

# Server Configuration
SERVER_PORT=3000
API_BASE_URL=http://localhost:3000/api
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=production
```

### 3. Security Configuration

Generate secure secrets for JWT and session management:

```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Use the generated strings for `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, and `SESSION_SECRET`.

### 4. Start Backend Server

```bash
# For production (using PM2)
npm install -g pm2
pm2 start ecosystem.config.js

# Or start directly
npm start

# For development
npm run dev
```

### 5. Verify Backend Setup

```bash
# Check if server is running
curl http://localhost:3000/api/health

# Check PM2 status
pm2 status

# View logs
pm2 logs
```

## Frontend Setup

### 1. Install Dependencies

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

### 2. Environment Configuration

Create a `.env` file in the `frontend` directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api

# Socket.io Configuration
VITE_SOCKET_URL=http://localhost:3000

# Environment
NODE_ENV=production
```

### 3. Build Frontend

```bash
# Build for production
npm run build

# Verify build
ls -la dist/
```

### 4. Serve Frontend

#### Option 1: Using a Web Server (Recommended)

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/rht-hotel/frontend/dist;
    index index.html;
    
    # Handle Vue.js routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Socket.io proxy
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Apache Configuration:**

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /path/to/rht-hotel/frontend/dist
    
    # Handle Vue.js routing
    <Directory "/path/to/rht-hotel/frontend/dist">
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # API proxy
    ProxyPass /api http://localhost:3000/api
    ProxyPassReverse /api http://localhost:3000/api
    
    # Socket.io proxy
    ProxyPass /socket.io/ http://localhost:3000/socket.io/
    ProxyPassReverse /socket.io/ http://localhost:3000/socket.io/
</VirtualHost>
```

#### Option 2: Using Node.js Static Server

```bash
# Install serve globally
npm install -g serve

# Serve the built application
serve -s dist -l 5173

# Or use PM2
pm2 serve dist 5173 --name "hotel-frontend"
```

## SSL/HTTPS Configuration

### 1. Obtain SSL Certificate

**Using Let's Encrypt (Recommended):**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. Update Configuration

Update your web server configuration to redirect HTTP to HTTPS and serve the application over SSL.

## Process Management with PM2

### 1. Install PM2

```bash
npm install -g pm2
```

### 2. Configure PM2

The project includes an `ecosystem.config.js` file for PM2 configuration:

```javascript
module.exports = {
  apps: [{
    name: 'hotel-api',
    script: './api/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_file: './logs/api-combined.log',
    time: true
  }]
};
```

### 3. Start with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by the command

# Monitor processes
pm2 monit

# View logs
pm2 logs

# Restart application
pm2 restart hotel-api

# Stop application
pm2 stop hotel-api
```

## Monitoring and Logging

### 1. Application Logs

```bash
# Create logs directory
mkdir -p logs

# View real-time logs
tail -f logs/api-combined.log

# View error logs
tail -f logs/api-error.log
```

### 2. System Monitoring

```bash
# Monitor system resources
htop

# Monitor disk usage
df -h

# Monitor database connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Monitor Redis
redis-cli info
```

### 3. Log Rotation

Configure log rotation to prevent log files from growing too large:

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/hotel-system

# Add configuration:
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
```

## Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
cat > backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="hotel_system_db_$DATE.sql"

mkdir -p $BACKUP_DIR
pg_dump -h localhost -U hotel_user hotel_system_db > $BACKUP_DIR/$BACKUP_FILE
gzip $BACKUP_DIR/$BACKUP_FILE

# Keep only last 30 days of backups
find $BACKUP_DIR -name "hotel_system_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x backup-db.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup-db.sh
```

### 2. Application Backup

```bash
# Backup application files
tar -czf hotel-system-backup-$(date +%Y%m%d).tar.gz \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    /path/to/rht-hotel
```

### 3. Database Recovery

```bash
# Restore from backup
gunzip hotel_system_db_YYYYMMDD_HHMMSS.sql.gz
psql -h localhost -U hotel_user -d hotel_system_db < hotel_system_db_YYYYMMDD_HHMMSS.sql
```

## Performance Optimization

### 1. Database Optimization

```sql
-- Create indexes for better performance
CREATE INDEX CONCURRENTLY idx_reservations_hotel_dates 
ON reservations(hotel_id, check_in_date, check_out_date);

CREATE INDEX CONCURRENTLY idx_clients_search 
ON clients(name_kanji, name_kana, name);

-- Analyze tables
ANALYZE;

-- Update statistics
VACUUM ANALYZE;
```

### 2. Redis Configuration

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Recommended settings:
maxmemory 1gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
```

### 3. Node.js Optimization

```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=2048"

# Enable production optimizations
export NODE_ENV=production
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Configure UFW (Ubuntu)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw deny 3000  # Block direct API access
sudo ufw deny 5432  # Block direct database access
sudo ufw enable
```

### 2. PostgreSQL Security

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/*/main/postgresql.conf

# Recommended settings:
listen_addresses = 'localhost'
ssl = on
log_connections = on
log_disconnections = on

# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Use md5 authentication
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

### 3. Fail2ban for PostgreSQL

```bash
# Install Fail2ban
sudo apt install fail2ban

# Configure PostgreSQL jail
sudo nano /etc/fail2ban/jail.local

# Add:
[postgres]
enabled  = true
port     = 5432
filter   = postgres
logpath  = /var/log/postgresql/postgresql-*-main.log
maxretry = 5
bantime  = 3600
findtime = 600
```

## Troubleshooting Common Issues

### 1. Database Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U hotel_user -d hotel_system_db -c "SELECT 1;"

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log
```

### 2. Redis Connection Issues

```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connectivity
redis-cli ping

# View Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### 3. Application Issues

```bash
# Check PM2 processes
pm2 status

# View application logs
pm2 logs hotel-api

# Restart application
pm2 restart hotel-api

# Check port usage
netstat -tlnp | grep :3000
```

### 4. Frontend Issues

```bash
# Check if frontend is being served
curl -I http://localhost:5173

# Check web server configuration
nginx -t
sudo systemctl status nginx

# View web server logs
sudo tail -f /var/log/nginx/error.log
```

## Maintenance Procedures

### 1. Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade

# Update Node.js dependencies
cd api && npm audit && npm update
cd ../frontend && npm audit && npm update

# Restart services
pm2 restart all
sudo systemctl restart nginx
```

### 2. Database Maintenance

```bash
# Weekly maintenance
psql -h localhost -U hotel_user -d hotel_system_db -c "VACUUM ANALYZE;"

# Monthly maintenance
psql -h localhost -U hotel_user -d hotel_system_db -c "REINDEX DATABASE hotel_system_db;"
```

### 3. Log Cleanup

```bash
# Clean old PM2 logs
pm2 flush

# Clean old system logs
sudo journalctl --vacuum-time=30d
```

## Deployment Checklist

- [ ] System requirements met
- [ ] PostgreSQL installed and configured
- [ ] Redis installed and configured
- [ ] Database created and migrations run
- [ ] Backend dependencies installed
- [ ] Environment variables configured
- [ ] Frontend built and deployed
- [ ] Web server configured
- [ ] SSL certificate installed
- [ ] PM2 configured and running
- [ ] Monitoring and logging set up
- [ ] Backup procedures implemented
- [ ] Security hardening applied
- [ ] Performance optimization completed
- [ ] Testing completed
- [ ] Documentation updated

## Support and Maintenance

For ongoing support and maintenance:

1. Monitor system logs regularly
2. Perform regular backups
3. Keep dependencies updated
4. Monitor system performance
5. Review security configurations periodically
6. Test disaster recovery procedures

## Additional Resources

- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [PostgreSQL Administration](https://www.postgresql.org/docs/current/admin.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Redis Configuration](https://redis.io/documentation)

##
 See Also

### Related Operations Documentation
- **[Deployment Overview](../deployment/README.md)** - Deployment documentation hub
- **[Environment Setup](../deployment/environment-setup.md)** - Environment configuration
- **[Monitoring & Logging](../deployment/monitoring-logging.md)** - System monitoring
- **[Troubleshooting](troubleshooting.md)** - Common deployment issues
- **[VPS Configuration](vps-configuration/)** - Server configuration details

### Architecture Documentation
- **[System Architecture](../design/system-architecture.md)** - System design and components
- **[Component Architecture](../design/component-diagrams.md)** - Component structure
- **[Integration Patterns](../architecture/integration-patterns.md)** - External integrations

### Development Documentation
- **[Development Environment](../getting-started/development-environment.md)** - Local development setup
- **[Backend Development](../backend/README.md)** - Backend implementation
- **[Frontend Development](../frontend/README.md)** - Frontend implementation

### Security & Maintenance
- **[Security Measures](vps-configuration/security-measures.md)** - Security configuration
- **[Maintenance](../deployment/maintenance.md)** - Maintenance procedures
- **[Recovery Mechanisms](vps-configuration/recovery-mechanisms.md)** - Disaster recovery

---

*This document is part of the [Operations Documentation](../operations/)*
