# Deployment Guide

This comprehensive guide provides step-by-step instructions for deploying the WeHub.work Hotel Management System to production environments.

## Prerequisites

### System Requirements

#### Server Specifications
- **CPU**: 2+ cores (4+ recommended for production)
- **RAM**: 4GB minimum (8GB+ recommended)
- **Storage**: 50GB+ SSD storage
- **OS**: Ubuntu 20.04 LTS or later (or equivalent Linux distribution)
- **Network**: Static IP address, domain name configured

#### Software Requirements
- **Node.js**: v18.x or later (LTS version recommended)
- **PostgreSQL**: v14.x or later
- **Redis**: v6.x or later
- **Nginx**: v1.18 or later
- **PM2**: Latest version (for process management)
- **Git**: For deployment from repository

### Access Requirements
- SSH access to production server
- Database administrator credentials
- Domain name with DNS configured
- SSL certificate (or Let's Encrypt access)
- Access to external service credentials (payment gateways, OTA systems, etc.)

## Deployment Architecture

### Production Environment Structure
```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────▼────┐
                    │  Nginx  │ (Reverse Proxy, SSL Termination)
                    │  :80    │
                    │  :443   │
                    └────┬────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────▼────┐     ┌────▼────┐     ┌────▼────┐
   │Frontend │     │Backend  │     │ Static  │
   │ (Vue.js)│     │(Node.js)│     │ Assets  │
   │  :8080  │     │  :3000  │     │         │
   └─────────┘     └────┬────┘     └─────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐     ┌───▼────┐     ┌───▼────┐
   │PostgreSQL│     │ Redis  │     │  PM2   │
   │  :5432  │     │ :6379  │     │Process │
   └─────────┘     └────────┘     │Manager │
                                   └────────┘
```

## Step 1: Server Preparation

### 1.1 Initial Server Setup

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 1.2 Create Application User

```bash
# Create dedicated user for the application
sudo adduser pms --disabled-password --gecos ""

# Add user to sudo group (if needed for specific tasks)
sudo usermod -aG sudo pms

# Switch to application user
sudo su - pms
```

### 1.3 Install Node.js

```bash
# Install Node.js using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version

# Install PM2 globally
sudo npm install -g pm2
```

## Step 2: Database Setup

### 2.1 Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo systemctl status postgresql
```

### 2.2 Configure PostgreSQL

```bash
# IMPORTANT: Generate a secure password first
# NEVER use 'your_secure_password' or any example password in production
# Generate a strong, random password:
DB_PASSWORD=$(openssl rand -base64 32)
echo "Generated password: $DB_PASSWORD"
# Save this password securely - you'll need it for the .env file

# Switch to postgres user
sudo -u postgres psql << EOF
CREATE DATABASE pms_production;
CREATE USER pms_user WITH ENCRYPTED PASSWORD '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE pms_production TO pms_user;
ALTER DATABASE pms_production OWNER TO pms_user;
\q
EOF
```

**Security Best Practices**:
- ✅ **Use generated passwords**: Always use `openssl rand -base64 32` or similar
- ✅ **Store securely**: Save passwords in a password manager or secrets vault
- ✅ **Use environment variables**: Never hardcode passwords in scripts or code
- ✅ **Rotate regularly**: Change passwords periodically (quarterly recommended)
- ❌ **Never use**: 'password', 'your_secure_password', or any example passwords

### 2.3 Configure PostgreSQL for Remote Access (if needed)

```bash
# Edit postgresql.conf
sudo nano /etc/postgresql/14/main/postgresql.conf

# Update listen_addresses
listen_addresses = 'localhost'  # or '*' for all interfaces

# Edit pg_hba.conf for authentication
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add authentication rules
# local   all             all                                     peer
# host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2.4 Install Redis

```bash
# Install Redis
sudo apt install -y redis-server

# Configure Redis for production security
sudo nano /etc/redis/redis.conf
```

**Required Security Configuration**:

```conf
# Process management
supervised systemd

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# SECURITY: Enable authentication (REQUIRED for production)
requirepass your_strong_redis_password_here

# SECURITY: Bind to localhost only (prevents external access)
bind 127.0.0.1 ::1

# SECURITY: Disable dangerous commands
rename-command FLUSHDB ""
rename-command FLUSHALL ""
rename-command CONFIG ""

# Additional security settings
protected-mode yes
```

**Security Best Practices**:

1. **Enable Authentication**: Always set a strong password with `requirepass`
   - Generate strong password: `openssl rand -base64 32`
   - Update `REDIS_PASSWORD` in application `.env` file

2. **Network Binding**: 
   - For single-server deployments: `bind 127.0.0.1 ::1` (localhost only)
   - For multi-server setups: `bind <private-ip>` (private network interface)
   - Never bind to `0.0.0.0` in production

3. **Firewall Protection**:
   ```bash
   # If Redis must be accessible from other servers, restrict by IP
   sudo ufw allow from <app-server-ip> to any port 6379
   ```

4. **Disable Dangerous Commands**: Rename or disable commands that can cause data loss

**Apply Configuration**:

```bash
# Restart Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: (error) NOAUTH Authentication required

# Test with authentication
redis-cli -a your_strong_redis_password_here ping
# Should return: PONG
```

**Security Resources**:
- [Redis Security Guide](https://redis.io/docs/management/security/)
- [Redis ACL Documentation](https://redis.io/docs/management/security/acl/)

⚠️ **Warning**: Running Redis without authentication in production is a critical security vulnerability. Always enable `requirepass` and restrict network access.

## Step 3: Application Deployment

### 3.1 Clone Repository

```bash
# Switch to application user
sudo su - pms

# Create application directory
mkdir -p /home/pms/apps
cd /home/pms/apps

# Clone repository
git clone https://github.com/your-org/rht-hotel.git
cd rht-hotel

# Checkout production branch
git checkout main
```

### 3.2 Configure Environment Variables

```bash
# Create production environment file
nano .env.production

# Add configuration (see Environment Configuration section below)
```

#### Environment Configuration

⚠️ **Security Warning**: All placeholder values (e.g., `<use_generated_password>`, `your_*`) MUST be replaced with actual secure values before deployment. Never use example passwords in production.

**Password Generation Commands**:
```bash
# Generate secure passwords for all services
openssl rand -base64 32  # Database password
openssl rand -base64 32  # Redis password
openssl rand -base64 48  # JWT secret (longer for added security)
openssl rand -base64 32  # Session secret
```

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com

# Database Configuration
# IMPORTANT: Use the password generated during PostgreSQL setup (see section 2.2)
# Generate with: openssl rand -base64 32
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pms_production
DATABASE_USER=pms_user
DATABASE_PASSWORD=<use_generated_password_from_section_2.2>
DATABASE_URL=postgresql://pms_user:<use_generated_password_from_section_2.2>@localhost:5432/pms_production

# Redis Configuration
# IMPORTANT: Must match the 'requirepass' value in /etc/redis/redis.conf
# Generate with: openssl rand -base64 32
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_strong_redis_password_here
REDIS_URL=redis://:your_strong_redis_password_here@localhost:6379

# Authentication & Security
JWT_SECRET=your_jwt_secret_key_min_32_chars
JWT_EXPIRATION=24h
SESSION_SECRET=your_session_secret_key
BCRYPT_ROUNDS=10

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_email_password
EMAIL_FROM=noreply@yourdomain.com

# External Integrations
BOOKING_ENGINE_API_KEY=your_booking_engine_api_key
SQUARE_ACCESS_TOKEN=your_square_access_token
SQUARE_LOCATION_ID=your_square_location_id
SQUARE_WEBHOOK_SECRET=your_square_webhook_secret

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=/home/pms/logs/app.log

# File Upload
UPLOAD_DIR=/home/pms/uploads
MAX_FILE_SIZE=10485760

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3.3 Install Dependencies

```bash
# Install backend dependencies
cd /home/pms/apps/rht-hotel
npm install --production

# Install frontend dependencies
cd frontend
npm install --production
```

### 3.4 Run Database Migrations

```bash
# Navigate to backend directory
cd /home/pms/apps/rht-hotel

# Run migrations
npm run migrate

# Verify migrations
psql -U pms_user -d pms_production -c "\dt"
```

### 3.5 Build Frontend

```bash
# Navigate to frontend directory
cd /home/pms/apps/rht-hotel/frontend

# Build production bundle
npm run build

# Verify build output
ls -la dist/
```

### 3.6 Configure PM2

```bash
# Create PM2 ecosystem file
cd /home/pms/apps/rht-hotel
nano ecosystem.config.js
```

#### PM2 Ecosystem Configuration

```javascript
module.exports = {
  apps: [
    {
      name: 'pms-api',
      script: './api/server.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/home/pms/logs/api-error.log',
      out_file: '/home/pms/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      max_memory_restart: '1G',
      watch: false
    }
  ]
};
```

### 3.7 Start Application with PM2

```bash
# Start application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd
# Follow the instructions provided by the command

# Verify application is running
pm2 status
pm2 logs pms-api
```

## Step 4: Nginx Configuration

### 4.1 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify Nginx is running
sudo systemctl status nginx
```

### 4.2 Configure Nginx for Application

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/pms
```

#### Nginx Configuration

```nginx
# Upstream backend API
upstream pms_api {
    least_conn;
    server 127.0.0.1:3000;
    keepalive 64;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect all HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration (will be updated by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Root directory for frontend
    root /home/pms/apps/rht-hotel/frontend/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
    
    # API proxy
    location /api/ {
        proxy_pass http://pms_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # WebSocket support for Socket.io
    location /socket.io/ {
        proxy_pass http://pms_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location /uploads/ {
        alias /home/pms/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Frontend routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

### 4.3 Enable Nginx Configuration

```bash
# Create symbolic link to enable site
sudo ln -s /etc/nginx/sites-available/pms /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

## Step 5: SSL Certificate Setup

### 5.1 Install Certbot

```bash
# Install Certbot and Nginx plugin
sudo apt install -y certbot python3-certbot-nginx
```

### 5.2 Obtain SSL Certificate

```bash
# Obtain and install certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: yes)

# Verify certificate
sudo certbot certificates
```

### 5.3 Configure Auto-Renewal

```bash
# Test renewal process
sudo certbot renew --dry-run

# Certbot automatically sets up a systemd timer for renewal
# Verify timer is active
sudo systemctl status certbot.timer
```

## Step 6: Post-Deployment Configuration

### 6.1 Create Required Directories

```bash
# Create logs directory
mkdir -p /home/pms/logs

# Create uploads directory
mkdir -p /home/pms/uploads

# Set proper permissions
chmod 755 /home/pms/logs
chmod 755 /home/pms/uploads
```

### 6.2 Configure Log Rotation

```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/pms
```

```
/home/pms/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 pms pms
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

### 6.3 Setup Database Backups

```bash
# Create backup script
nano /home/pms/scripts/backup-database.sh
```

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/pms/backups/database"
DB_NAME="pms_production"
DB_USER="pms_user"
RETENTION_DAYS=30

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/pms_backup_$(date +%Y%m%d_%H%M%S).sql.gz"

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Remove old backups
find $BACKUP_DIR -name "pms_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# Log backup completion
echo "$(date): Database backup completed: $BACKUP_FILE" >> /home/pms/logs/backup.log
```

```bash
# Make script executable
chmod +x /home/pms/scripts/backup-database.sh

# Add to crontab for daily execution
crontab -e

# Add this line to run backup daily at 2 AM
0 2 * * * /home/pms/scripts/backup-database.sh
```

## Step 7: Verification and Testing

### 7.1 Health Checks

```bash
# Check application status
pm2 status

# Check application logs
pm2 logs pms-api --lines 50

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# Check Redis status
sudo systemctl status redis-server
```

### 7.2 Test Application Endpoints

```bash
# Test API health endpoint
curl https://yourdomain.com/api/health

# Test frontend
curl https://yourdomain.com

# Test WebSocket connection (if applicable)
# Use browser developer tools or WebSocket testing tool
```

### 7.3 Monitor Resource Usage

```bash
# Check system resources
htop

# Check disk usage
df -h

# Check memory usage
free -h

# Check PM2 monitoring
pm2 monit
```

## Step 8: Monitoring Setup

### 8.1 Configure PM2 Monitoring

```bash
# Enable PM2 monitoring
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### 8.2 Setup Application Monitoring

Refer to the [Monitoring & Logging Guide](monitoring-logging.md) for detailed monitoring setup instructions.

## Troubleshooting Deployment Issues

### Application Won't Start
1. Check environment variables in `.env.production`
2. Verify database connection: `psql -U pms_user -d pms_production`
3. Check PM2 logs: `pm2 logs pms-api`
4. Verify port 3000 is not in use: `sudo lsof -i :3000`

### Nginx Configuration Errors
1. Test configuration: `sudo nginx -t`
2. Check error logs: `sudo tail -f /var/log/nginx/error.log`
3. Verify file permissions on frontend dist directory
4. Check upstream backend is running

### Database Connection Issues
1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Test connection: `psql -U pms_user -d pms_production`
3. Check pg_hba.conf authentication settings
4. Verify DATABASE_URL in environment variables

### SSL Certificate Issues
1. Check certificate status: `sudo certbot certificates`
2. Test renewal: `sudo certbot renew --dry-run`
3. Verify DNS records are correct
4. Check Nginx SSL configuration

## Deployment Checklist

- [ ] Server prepared with required software
- [ ] PostgreSQL installed and configured
- [ ] Redis installed and running
- [ ] Application code deployed
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Frontend built and deployed
- [ ] PM2 configured and application started
- [ ] Nginx configured and running
- [ ] SSL certificate obtained and configured
- [ ] Log rotation configured
- [ ] Database backups configured
- [ ] Monitoring setup completed
- [ ] Health checks passing
- [ ] Documentation updated with deployment-specific details

## Related Documentation

- **[Environment Setup](environment-setup.md)** - Detailed environment configuration
- **[Monitoring & Logging](monitoring-logging.md)** - Monitoring setup and configuration
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[Maintenance](maintenance.md)** - Ongoing maintenance procedures

---

*This deployment guide provides a comprehensive approach to deploying the PMS in production. Adjust configurations based on your specific requirements and infrastructure.*
