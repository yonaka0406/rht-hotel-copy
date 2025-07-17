# Sakura VPS Control Panel

This document provides detailed information about using the Sakura VPS control panel for managing the hotel management system server.

## Server Management

The Sakura VPS control panel provides a comprehensive interface for managing server operations, including power management, monitoring, and configuration. This section details the procedures for common server management tasks.

### Power Management Operations

#### Server Restart Procedure

1. Log in to the [Sakura VPS control panel](https://secure.sakura.ad.jp/vps/) using your account credentials
2. Navigate to the VPS server list and select the hotel management system server
3. Click on the "Power" dropdown menu in the server details page
4. Select "Restart" from the dropdown options
5. In the confirmation dialog, click "Confirm" to proceed with the restart
6. The server status will change to "Restarting" and then return to "Running" when complete
7. Allow approximately 1-2 minutes for all services to fully initialize after restart

> **Note:** A server restart will cause a brief downtime of approximately 1-3 minutes. Schedule restarts during low-traffic periods when possible.

#### Server Shutdown Procedure

1. Log in to the Sakura VPS control panel
2. Navigate to the server list and select the hotel management system server
3. Click on the "Power" dropdown menu
4. Select "Shutdown" from the dropdown options
5. In the confirmation dialog, click "Confirm" to proceed with the shutdown
6. The server status will change to "Shutting down" and then to "Stopped" when complete

> **Warning:** Before shutting down the server, ensure all database transactions are complete and users are notified of the planned downtime.

#### Server Power-On Procedure

1. Log in to the Sakura VPS control panel
2. Navigate to the server list and select the hotel management system server (status should show "Stopped")
3. Click on the "Power" dropdown menu
4. Select "Power On" from the dropdown options
5. The server status will change to "Starting" and then to "Running" when complete
6. Allow approximately 2-3 minutes for all services to fully initialize after power-on

### Server Status Monitoring

The control panel provides real-time monitoring of server status and resource utilization:

1. Log in to the Sakura VPS control panel
2. Navigate to the server list and select the hotel management system server
3. Click on the "Monitoring" tab to view:
   - CPU utilization graph
   - Memory usage graph
   - Disk I/O performance
   - Network traffic statistics

> **Best Practice:** Check server resource utilization weekly to identify trends and potential resource constraints before they impact performance.

### Control Panel Interface

![Sakura VPS Control Panel - Server Management](../images/sakura-vps-server-management.png)

*Note: The above image is a placeholder. Actual screenshots should be added when implementing this documentation.*

The server management interface includes the following key elements:

1. **Server Information Panel** - Displays basic server information including:
   - Server name and ID
   - IP address
   - Plan details (4 cores, 4GB RAM, 200GB SSD)
   - Current status

2. **Action Buttons** - Located in the top-right corner:
   - Power dropdown (Restart, Shutdown, Power On)
   - Console access button
   - Settings button

3. **Monitoring Tabs** - Provides access to:
   - Overview dashboard
   - Resource monitoring graphs
   - Alert settings
   - Log viewer

4. **Configuration Section** - Allows modification of:
   - Network settings
   - Firewall rules
   - Backup settings
   - Additional storage options

### Emergency Power Management

In case of emergency situations (such as unresponsive server or suspected security breach):

1. Log in to the Sakura VPS control panel
2. Navigate to the server list and select the affected server
3. Click on the "Power" dropdown menu
4. Select "Force Shutdown" (only use in emergencies when normal shutdown fails)
5. In the confirmation dialog, acknowledge the warning and click "Confirm"
6. After the server status changes to "Stopped", wait at least 30 seconds
7. Click "Power On" to restart the server
8. Document the incident and check system logs after restart to identify the cause

> **Warning:** Force shutdown may result in data loss or filesystem corruption. Use only when absolutely necessary and when normal shutdown procedures fail.

### Server Resource Management

#### CPU and Memory Monitoring

The Sakura VPS control panel provides detailed resource monitoring capabilities:

1. **Real-time Resource Monitoring**:
   - Navigate to the server details page
   - Click on the "Monitoring" tab
   - View real-time graphs for:
     - CPU utilization (%)
     - Memory usage (MB/GB)
     - Load average
     - Process count

2. **Historical Data Analysis**:
   - Select time range (1 hour, 6 hours, 24 hours, 7 days, 30 days)
   - Analyze usage patterns to identify peak usage times
   - Export data for capacity planning

3. **Resource Alerts Configuration**:
   - Click on "Alert Settings" in the monitoring section
   - Configure thresholds for:
     - CPU usage > 80% for 5 minutes
     - Memory usage > 90% for 5 minutes
     - Load average > 4.0 for 10 minutes
   - Set notification email addresses

#### Disk Space Management

1. **Disk Usage Monitoring**:
   - View current disk usage in the server overview
   - Monitor disk I/O performance graphs
   - Check for disk space alerts

2. **Disk Cleanup Procedures** (via control panel):
   - Access the file manager (if available)
   - Identify large files and directories
   - Clean up temporary files and logs
   - Monitor PostgreSQL data directory growth

#### Network Traffic Monitoring

1. **Network Statistics**:
   - View inbound/outbound traffic graphs
   - Monitor bandwidth utilization
   - Identify traffic spikes or unusual patterns

2. **Network Configuration**:
   - Review current IP address assignments
   - Check firewall rule status
   - Monitor connection counts

### Maintenance Operations

#### Scheduled Maintenance

1. **Planning Maintenance Windows**:
   - Use the control panel to schedule maintenance
   - Set maintenance notifications
   - Configure automatic restart after maintenance

2. **Maintenance Checklist**:
   - [ ] Notify users of planned downtime
   - [ ] Create database backup
   - [ ] Document current system state
   - [ ] Perform maintenance operations
   - [ ] Verify system functionality
   - [ ] Update documentation

#### System Updates and Patches

1. **OS Update Management**:
   - Check for available OS updates in the control panel
   - Schedule updates during low-traffic periods
   - Monitor update progress and logs

2. **Security Patch Management**:
   - Review security advisories
   - Apply critical patches promptly
   - Test system functionality after patches

### Backup and Snapshot Management

#### Automated Backup Configuration

1. **Enable Automatic Backups**:
   - Navigate to "Backup Settings" in the control panel
   - Configure backup schedule (daily/weekly)
   - Set retention period (7-30 days)
   - Specify backup storage location

2. **Manual Backup Creation**:
   - Click "Create Backup" in the backup section
   - Provide descriptive backup name
   - Wait for backup completion confirmation
   - Verify backup integrity

#### Snapshot Management

1. **Creating System Snapshots**:
   - Navigate to "Snapshots" section
   - Click "Create Snapshot"
   - Provide snapshot name and description
   - Monitor snapshot creation progress

2. **Restoring from Snapshots**:
   - Select desired snapshot from the list
   - Click "Restore" and confirm the operation
   - Monitor restoration progress
   - Verify system functionality after restore

> **Important:** Snapshot restoration will overwrite current system state. Ensure you have recent backups before proceeding.

### Performance Optimization

#### Resource Scaling

1. **Plan Upgrade Procedures**:
   - Monitor current resource utilization trends
   - Identify when upgrades are needed
   - Plan upgrade during maintenance windows

2. **Vertical Scaling Options**:
   - CPU upgrade: 4 cores → 6 cores → 8 cores
   - Memory upgrade: 4GB → 8GB → 16GB
   - Storage upgrade: 200GB → 400GB → 800GB

3. **Upgrade Process**:
   - Navigate to "Plan Change" in the control panel
   - Select new plan configuration
   - Schedule upgrade time
   - Confirm upgrade and monitor progress

#### Performance Monitoring

1. **Baseline Performance Metrics**:
   - Document current performance baselines
   - Set up regular performance monitoring
   - Create performance reports

2. **Performance Alerts**:
   - Configure alerts for performance degradation
   - Set up automated notifications
   - Create escalation procedures

### Troubleshooting Common Issues

#### Server Unresponsive

1. **Diagnosis Steps**:
   - Check server status in control panel
   - Review resource utilization graphs
   - Check for recent alerts or notifications

2. **Resolution Steps**:
   - Try normal restart first
   - If unresponsive, use force restart
   - Check system logs after restart
   - Investigate root cause

#### High Resource Usage

1. **CPU Usage Issues**:
   - Identify high CPU processes via monitoring
   - Check for runaway processes
   - Consider process optimization or server upgrade

2. **Memory Usage Issues**:
   - Monitor memory usage patterns
   - Identify memory leaks
   - Optimize application memory usage
   - Consider memory upgrade if needed

3. **Disk Space Issues**:
   - Identify large files and directories
   - Clean up unnecessary files
   - Implement log rotation
   - Consider storage upgrade

#### Network Connectivity Issues

1. **Network Diagnostics**:
   - Check network interface status
   - Review firewall rules
   - Test connectivity from control panel

2. **Resolution Steps**:
   - Restart network services
   - Review and update firewall rules
   - Contact Sakura support if needed

### Security Management

#### Access Control

1. **Control Panel Access Security**:
   - Use strong passwords for control panel access
   - Enable two-factor authentication if available
   - Regularly review access logs

2. **Server Access Management**:
   - Monitor SSH access logs
   - Review user accounts and permissions
   - Implement key-based authentication

#### Security Monitoring

1. **Security Alerts**:
   - Configure security-related alerts
   - Monitor for suspicious activities
   - Set up automated responses

2. **Log Monitoring**:
   - Review system logs regularly
   - Monitor authentication attempts
   - Check for security-related events

### Documentation and Reporting

#### Maintenance Logs

1. **Operation Documentation**:
   - Document all maintenance operations
   - Record configuration changes
   - Maintain change history

2. **Incident Reporting**:
   - Document all incidents and resolutions
   - Create post-incident reports
   - Update procedures based on lessons learned

#### Performance Reports

1. **Regular Reporting**:
   - Generate monthly performance reports
   - Track resource utilization trends
   - Plan capacity upgrades based on trends

2. **Capacity Planning**:
   - Analyze growth patterns
   - Forecast resource requirements
   - Plan upgrade schedules

### Best Practices

#### Daily Operations

1. **Daily Checks**:
   - [ ] Review server status and alerts
   - [ ] Check resource utilization
   - [ ] Verify backup completion
   - [ ] Monitor application performance

2. **Weekly Tasks**:
   - [ ] Review performance trends
   - [ ] Check for system updates
   - [ ] Analyze security logs
   - [ ] Update documentation

3. **Monthly Tasks**:
   - [ ] Generate performance reports
   - [ ] Review capacity planning
   - [ ] Test backup restoration
   - [ ] Update disaster recovery procedures

#### Emergency Procedures

1. **Emergency Contacts**:
   - Sakura Support: [Support contact information]
   - Internal escalation contacts
   - Emergency notification procedures

2. **Emergency Response**:
   - Immediate assessment procedures
   - Escalation criteria
   - Communication protocols
   - Recovery procedures

### Integration with Monitoring Systems

#### External Monitoring Integration

1. **API Access**:
   - Configure API access for external monitoring
   - Set up automated monitoring scripts
   - Integrate with alerting systems

2. **Third-party Tools**:
   - Configure monitoring tools to use Sakura API
   - Set up automated reporting
   - Create custom dashboards

## OS Reinstallation

Operating system reinstallation is a critical procedure that completely wipes the server and installs a fresh OS. This section provides detailed procedures for safely performing OS reinstallation on the Sakura VPS.

> **Critical Warning:** OS reinstallation will completely erase all data on the server. Ensure comprehensive backups are completed before proceeding.

### Pre-Installation Backup Procedures

#### Complete System Backup

Before initiating OS reinstallation, perform a comprehensive backup of all critical data and configurations:

1. **Database Backup**:
   ```bash
   # Create full database backup
   sudo -u postgres pg_dumpall > /tmp/full_database_backup_$(date +%Y%m%d).sql
   
   # Create compressed backup
   sudo -u postgres pg_dump -Fc rhthotels > /tmp/rhthotels_backup_$(date +%Y%m%d).dump
   
   # Verify backup integrity
   sudo -u postgres pg_restore --list /tmp/rhthotels_backup_$(date +%Y%m%d).dump
   ```

2. **Configuration Files Backup**:
   ```bash
   # Create configuration backup directory
   mkdir -p /tmp/config_backup_$(date +%Y%m%d)
   
   # Backup PostgreSQL configuration
   cp -r /etc/postgresql/ /tmp/config_backup_$(date +%Y%m%d)/
   
   # Backup system configuration
   cp -r /etc/apache2/ /tmp/config_backup_$(date +%Y%m%d)/
   cp -r /etc/fail2ban/ /tmp/config_backup_$(date +%Y%m%d)/
   cp /etc/hosts /tmp/config_backup_$(date +%Y%m%d)/
   cp /etc/hostname /tmp/config_backup_$(date +%Y%m%d)/
   
   # Backup application configuration
   cp -r /var/www/html/config/ /tmp/config_backup_$(date +%Y%m%d)/
   ```

3. **Application Data Backup**:
   ```bash
   # Backup web application files
   tar -czf /tmp/webapp_backup_$(date +%Y%m%d).tar.gz /var/www/html/
   
   # Backup uploaded files and media
   tar -czf /tmp/uploads_backup_$(date +%Y%m%d).tar.gz /var/www/html/uploads/
   
   # Backup logs (if needed)
   tar -czf /tmp/logs_backup_$(date +%Y%m%d).tar.gz /var/log/
   ```

4. **System Information Documentation**:
   ```bash
   # Document current system state
   echo "System Information Backup - $(date)" > /tmp/system_info_$(date +%Y%m%d).txt
   echo "=================================" >> /tmp/system_info_$(date +%Y%m%d).txt
   
   # OS information
   echo "OS Version:" >> /tmp/system_info_$(date +%Y%m%d).txt
   lsb_release -a >> /tmp/system_info_$(date +%Y%m%d).txt
   
   # Installed packages
   echo -e "\nInstalled Packages:" >> /tmp/system_info_$(date +%Y%m%d).txt
   dpkg --get-selections >> /tmp/system_info_$(date +%Y%m%d).txt
   
   # Network configuration
   echo -e "\nNetwork Configuration:" >> /tmp/system_info_$(date +%Y%m%d).txt
   ip addr show >> /tmp/system_info_$(date +%Y%m%d).txt
   
   # Services status
   echo -e "\nServices Status:" >> /tmp/system_info_$(date +%Y%m%d).txt
   systemctl list-units --type=service --state=running >> /tmp/system_info_$(date +%Y%m%d).txt
   ```

#### Backup Transfer to External Storage

1. **Upload to Google Drive** (using existing backup script):
   ```bash
   # Upload database backup
   /usr/local/bin/upload_to_google_drive.js /tmp/full_database_backup_$(date +%Y%m%d).sql 1Yf-69S4xFV7wRavBnybcef8Q539uidc0
   
   # Upload configuration backup
   tar -czf /tmp/config_backup_$(date +%Y%m%d).tar.gz /tmp/config_backup_$(date +%Y%m%d)/
   /usr/local/bin/upload_to_google_drive.js /tmp/config_backup_$(date +%Y%m%d).tar.gz 1Yf-69S4xFV7wRavBnybcef8Q539uidc0
   
   # Upload application backup
   /usr/local/bin/upload_to_google_drive.js /tmp/webapp_backup_$(date +%Y%m%d).tar.gz 1Yf-69S4xFV7wRavBnybcef8Q539uidc0
   ```

2. **Alternative Backup Methods**:
   - SCP to another server
   - FTP upload to backup server
   - External storage device (if physical access available)

#### Pre-Installation Checklist

Before proceeding with OS reinstallation, verify the following:

- [ ] Complete database backup created and verified
- [ ] All configuration files backed up
- [ ] Application data backed up
- [ ] Backups uploaded to external storage
- [ ] System information documented
- [ ] Stakeholders notified of planned downtime
- [ ] Maintenance window scheduled
- [ ] Recovery procedures reviewed
- [ ] Emergency contacts available

### OS Reinstallation Procedure

#### Step 1: Access Sakura VPS Control Panel

1. Log in to the [Sakura VPS control panel](https://secure.sakura.ad.jp/vps/)
2. Navigate to the VPS server list
3. Select the hotel management system server
4. Ensure server status is "Running" before proceeding

#### Step 2: Initiate OS Reinstallation

1. In the server details page, locate the "OS" or "Reinstall" section
2. Click on "OS Reinstallation" or "Reinstall OS" button
3. **Warning Dialog**: Read the warning carefully - this will erase all data
4. Confirm that backups are complete before proceeding

#### Step 3: Select Operating System

1. **Choose OS Distribution**: Select "Ubuntu"
2. **Select Version**: Choose "Ubuntu 24.04 LTS (amd64)"
3. **Verify Selection**: Ensure the correct OS version is selected
4. **Review Configuration**: Check that the server specifications remain the same

#### Step 4: Configure Installation Options

1. **Root Password**: Set a strong root password
   - Use a combination of uppercase, lowercase, numbers, and symbols
   - Minimum 12 characters
   - Document the password securely

2. **SSH Key Configuration** (if available):
   - Upload SSH public key for secure access
   - Disable password authentication if using keys

3. **Network Configuration**:
   - Verify IP address assignment
   - Confirm network settings

#### Step 5: Confirm and Execute Reinstallation

1. **Final Review**:
   - Verify all settings are correct
   - Confirm backup completion
   - Ensure maintenance window is active

2. **Execute Reinstallation**:
   - Click "Confirm" or "Execute Reinstallation"
   - Monitor the progress in the control panel
   - Reinstallation typically takes 10-30 minutes

3. **Monitor Progress**:
   - Server status will change to "Reinstalling"
   - Progress bar will show installation status
   - Do not interrupt the process

#### Step 6: Post-Installation Verification

1. **Server Status Check**:
   - Wait for server status to change to "Running"
   - Verify server is accessible via control panel

2. **Initial Connection Test**:
   - Test SSH connection to the server
   - Verify root access with new password
   - Check basic system functionality

### Post-Installation Configuration

#### Step 1: Initial System Setup

1. **Update System Packages**:
   ```bash
   # Update package lists
   apt update
   
   # Upgrade all packages
   apt upgrade -y
   
   # Install essential packages
   apt install -y curl wget vim htop unzip
   ```

2. **Configure Timezone**:
   ```bash
   # Set timezone to Asia/Tokyo
   timedatectl set-timezone Asia/Tokyo
   
   # Verify timezone setting
   timedatectl status
   ```

3. **Configure Hostname**:
   ```bash
   # Set hostname
   hostnamectl set-hostname rht-hotel-server
   
   # Update /etc/hosts
   echo "127.0.0.1 rht-hotel-server" >> /etc/hosts
   ```

#### Step 2: User Account Setup

1. **Create Application User**:
   ```bash
   # Create user for application
   useradd -m -s /bin/bash rhtuser
   
   # Set password
   passwd rhtuser
   
   # Add to sudo group
   usermod -aG sudo rhtuser
   ```

2. **Configure SSH Access**:
   ```bash
   # Configure SSH for security
   nano /etc/ssh/sshd_config
   
   # Recommended settings:
   # PermitRootLogin no
   # PasswordAuthentication yes (initially, change to no after key setup)
   # Port 22 (consider changing for security)
   
   # Restart SSH service
   systemctl restart sshd
   ```

#### Step 3: Install Required Software

1. **Install PostgreSQL**:
   ```bash
   # Install PostgreSQL
   apt install -y postgresql postgresql-contrib
   
   # Start and enable PostgreSQL
   systemctl start postgresql
   systemctl enable postgresql
   
   # Verify installation
   sudo -u postgres psql -c "SELECT version();"
   ```

2. **Install Web Server**:
   ```bash
   # Install Apache
   apt install -y apache2
   
   # Start and enable Apache
   systemctl start apache2
   systemctl enable apache2
   
   # Configure firewall
   ufw allow 'Apache Full'
   ```

3. **Install PHP** (if needed):
   ```bash
   # Install PHP and modules
   apt install -y php php-pgsql php-curl php-json php-mbstring
   
   # Restart Apache
   systemctl restart apache2
   ```

#### Step 4: Restore Data and Configuration

1. **Download Backups**:
   ```bash
   # Create restore directory
   mkdir -p /tmp/restore
   cd /tmp/restore
   
   # Download backups from Google Drive or other storage
   # (Use appropriate method based on backup location)
   ```

2. **Restore Database**:
   ```bash
   # Create database user
   sudo -u postgres createuser -s rhtuser
   sudo -u postgres psql -c "ALTER USER rhtuser PASSWORD 'secure_password';"
   
   # Create database
   sudo -u postgres createdb rhthotels
   
   # Restore database from backup
   sudo -u postgres psql < /tmp/restore/full_database_backup_YYYYMMDD.sql
   
   # Or restore from compressed backup
   sudo -u postgres pg_restore -C -d postgres /tmp/restore/rhthotels_backup_YYYYMMDD.dump
   ```

3. **Restore Configuration Files**:
   ```bash
   # Extract configuration backup
   tar -xzf /tmp/restore/config_backup_YYYYMMDD.tar.gz -C /tmp/restore/
   
   # Restore PostgreSQL configuration
   cp -r /tmp/restore/config_backup_YYYYMMDD/postgresql/* /etc/postgresql/
   
   # Restore other configurations
   cp -r /tmp/restore/config_backup_YYYYMMDD/apache2/* /etc/apache2/
   cp -r /tmp/restore/config_backup_YYYYMMDD/fail2ban/* /etc/fail2ban/
   
   # Restart services
   systemctl restart postgresql
   systemctl restart apache2
   ```

4. **Restore Application Files**:
   ```bash
   # Extract application backup
   tar -xzf /tmp/restore/webapp_backup_YYYYMMDD.tar.gz -C /
   
   # Set proper permissions
   chown -R www-data:www-data /var/www/html/
   chmod -R 755 /var/www/html/
   ```

#### Step 5: Security Configuration

1. **Configure Firewall**:
   ```bash
   # Enable UFW
   ufw enable
   
   # Allow SSH
   ufw allow ssh
   
   # Allow HTTP/HTTPS
   ufw allow 'Apache Full'
   
   # Allow PostgreSQL (if needed)
   ufw allow 5432
   ```

2. **Install and Configure Fail2ban**:
   ```bash
   # Install fail2ban
   apt install -y fail2ban
   
   # Restore fail2ban configuration
   systemctl start fail2ban
   systemctl enable fail2ban
   ```

#### Step 6: Monitoring and Recovery Setup

1. **Install Monitoring Scripts**:
   ```bash
   # Copy monitoring scripts from backup
   cp /tmp/restore/monitoring_scripts/* /usr/local/bin/
   chmod +x /usr/local/bin/*.sh
   
   # Install systemd services
   cp /tmp/restore/systemd_services/* /etc/systemd/system/
   systemctl daemon-reload
   
   # Enable monitoring services
   systemctl enable postgresql-health-check.timer
   systemctl start postgresql-health-check.timer
   ```

2. **Configure Email Alerts**:
   ```bash
   # Install mail utilities
   apt install -y mailutils postfix
   
   # Configure postfix for email alerts
   dpkg-reconfigure postfix
   ```

### Post-Installation Testing

#### Functional Testing

1. **Database Connectivity Test**:
   ```bash
   # Test PostgreSQL connection
   sudo -u postgres psql -c "SELECT count(*) FROM pg_database;"
   
   # Test application database
   psql -h localhost -U rhtuser -d rhthotels -c "SELECT count(*) FROM reservations;"
   ```

2. **Web Application Test**:
   ```bash
   # Test Apache status
   systemctl status apache2
   
   # Test web server response
   curl -I http://localhost/
   
   # Test application functionality
   curl http://localhost/api/health
   ```

3. **Security Test**:
   ```bash
   # Test firewall status
   ufw status
   
   # Test fail2ban status
   fail2ban-client status
   
   # Test SSH configuration
   ssh -T rhtuser@localhost
   ```

#### Performance Testing

1. **Resource Usage Check**:
   ```bash
   # Check CPU and memory usage
   htop
   
   # Check disk usage
   df -h
   
   # Check network connectivity
   ping -c 4 google.com
   ```

2. **Database Performance Test**:
   ```bash
   # Run basic performance test
   sudo -u postgres pgbench -i -s 10 rhthotels
   sudo -u postgres pgbench -c 10 -j 2 -t 1000 rhthotels
   ```

### Rollback Procedures

If the reinstallation fails or issues are discovered:

#### Emergency Rollback

1. **If Reinstallation Fails**:
   - Contact Sakura support immediately
   - Request restoration from their backup (if available)
   - Provide backup files for manual restoration

2. **If Post-Installation Issues Occur**:
   - Document all issues encountered
   - Attempt to resolve configuration issues
   - If unresolvable, repeat reinstallation process

#### Disaster Recovery

1. **Alternative Server Setup**:
   - Provision new VPS instance
   - Restore from backups to new instance
   - Update DNS and network configuration

2. **Data Recovery**:
   - Restore database from most recent backup
   - Verify data integrity
   - Test application functionality

### Documentation and Reporting

#### Post-Installation Documentation

1. **Update System Documentation**:
   - Record new OS version and configuration
   - Update network and security settings
   - Document any changes from previous setup

2. **Create Installation Report**:
   ```
   OS Reinstallation Report
   Date: [DATE]
   Performed by: [NAME]
   
   Pre-Installation:
   - Backup completion: [TIMESTAMP]
   - Backup verification: [STATUS]
   - Downtime start: [TIMESTAMP]
   
   Installation:
   - OS Version: Ubuntu 24.04 LTS
   - Installation duration: [DURATION]
   - Issues encountered: [NONE/DESCRIPTION]
   
   Post-Installation:
   - Service restoration: [TIMESTAMP]
   - Testing completion: [TIMESTAMP]
   - Downtime end: [TIMESTAMP]
   
   Total downtime: [DURATION]
   ```

#### Lessons Learned

1. **Process Improvements**:
   - Document any issues encountered
   - Update procedures based on experience
   - Improve backup and restoration processes

2. **Future Recommendations**:
   - Suggest improvements to backup procedures
   - Recommend additional monitoring
   - Plan for automation improvements

### Best Practices

#### Planning and Preparation

1. **Schedule During Low Traffic**:
   - Plan reinstallation during maintenance windows
   - Notify users well in advance
   - Prepare for extended downtime if needed

2. **Test Procedures**:
   - Test backup and restore procedures regularly
   - Practice reinstallation on staging environment
   - Validate all scripts and procedures

#### Risk Mitigation

1. **Multiple Backup Locations**:
   - Store backups in multiple locations
   - Verify backup integrity regularly
   - Test restoration procedures

2. **Emergency Contacts**:
   - Maintain updated contact list
   - Include Sakura support information
   - Prepare escalation procedures

#### Documentation Maintenance

1. **Keep Procedures Updated**:
   - Update documentation after each reinstallation
   - Incorporate lessons learned
   - Review procedures quarterly

2. **Version Control**:
   - Maintain version history of procedures
   - Track changes and improvements
   - Share updates with team members

## Console Access

The Sakura VPS control panel provides multiple methods for accessing the server console, including web-based console access and remote console connections. This section details the various console access methods and troubleshooting procedures.

### Web Console Access

#### Accessing the Web Console

1. **Navigate to Console**:
   - Log in to the [Sakura VPS control panel](https://secure.sakura.ad.jp/vps/)
   - Select the hotel management system server from the server list
   - Click on the "Console" button or tab in the server details page

2. **Console Interface**:
   - The web console opens in a new browser window or tab
   - Provides direct access to the server's console interface
   - Functions as if you were physically connected to the server

3. **Console Features**:
   - Full keyboard input support
   - Copy and paste functionality (browser dependent)
   - Screen resolution adjustment
   - Full-screen mode option

#### Web Console Usage

1. **Login Process**:
   ```
   Ubuntu 24.04 LTS rht-hotel-server tty1
   
   rht-hotel-server login: root
   Password: [enter root password]
   
   Welcome to Ubuntu 24.04 LTS (GNU/Linux 5.15.0-xxx-generic x86_64)
   
   root@rht-hotel-server:~#
   ```

2. **Basic Console Commands**:
   ```bash
   # Check system status
   systemctl status
   
   # View system information
   uname -a
   
   # Check disk usage
   df -h
   
   # Check memory usage
   free -h
   
   # View running processes
   ps aux
   ```

3. **Emergency Access**:
   - Use when SSH access is unavailable
   - Access during network configuration issues
   - Troubleshoot boot problems
   - Perform emergency system recovery

#### Web Console Limitations

1. **Performance Considerations**:
   - May have slight input lag compared to direct SSH
   - Dependent on internet connection quality
   - Limited by browser capabilities

2. **Security Considerations**:
   - Console sessions may timeout after inactivity
   - Ensure secure browser environment
   - Close console sessions when finished

3. **Functionality Limitations**:
   - Copy/paste may not work in all browsers
   - Some special key combinations may not function
   - Screen resolution may be limited

### Remote Console Access (VNC)

#### VNC Console Setup

1. **Enable VNC Console** (if available):
   - Navigate to console settings in the control panel
   - Enable VNC console access
   - Set VNC password for secure access
   - Note the VNC connection details (IP and port)

2. **VNC Client Configuration**:
   ```
   VNC Server: [server-ip]:5900
   Password: [vnc-password]
   Encryption: Use if available
   ```

3. **Connecting via VNC Client**:
   - Use VNC client software (TightVNC, RealVNC, etc.)
   - Enter server connection details
   - Authenticate with VNC password
   - Access full graphical console interface

#### VNC Console Features

1. **Graphical Interface Access**:
   - Full desktop environment (if installed)
   - Graphical application support
   - Mouse and keyboard input
   - Screen sharing capabilities

2. **Advanced Functionality**:
   - File transfer capabilities (client dependent)
   - Multiple monitor support
   - Clipboard sharing
   - Remote printing support

### Serial Console Access

#### Serial Console Configuration

1. **Enable Serial Console**:
   ```bash
   # Edit GRUB configuration
   nano /etc/default/grub
   
   # Add or modify the following lines:
   GRUB_CMDLINE_LINUX="console=tty0 console=ttyS0,115200n8"
   GRUB_TERMINAL="console serial"
   GRUB_SERIAL_COMMAND="serial --speed=115200 --unit=0 --word=8 --parity=no --stop=1"
   
   # Update GRUB
   update-grub
   ```

2. **Configure Getty for Serial Console**:
   ```bash
   # Enable serial console getty
   systemctl enable serial-getty@ttyS0.service
   systemctl start serial-getty@ttyS0.service
   ```

3. **Access Serial Console**:
   - Available through Sakura control panel
   - Provides low-level system access
   - Useful for boot troubleshooting

### SSH Console Access

#### Standard SSH Access

1. **SSH Connection**:
   ```bash
   # Connect via SSH
   ssh root@[server-ip]
   
   # Or with specific user
   ssh rhtuser@[server-ip]
   
   # With custom port (if configured)
   ssh -p [port] rhtuser@[server-ip]
   ```

2. **SSH Key Authentication**:
   ```bash
   # Generate SSH key pair (on client)
   ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
   
   # Copy public key to server
   ssh-copy-id rhtuser@[server-ip]
   
   # Connect using key authentication
   ssh -i ~/.ssh/id_rsa rhtuser@[server-ip]
   ```

3. **SSH Configuration**:
   ```bash
   # Client SSH config (~/.ssh/config)
   Host rht-hotel-server
       HostName [server-ip]
       User rhtuser
       Port 22
       IdentityFile ~/.ssh/id_rsa
       ServerAliveInterval 60
   
   # Connect using config
   ssh rht-hotel-server
   ```

#### SSH Tunneling and Port Forwarding

1. **Local Port Forwarding**:
   ```bash
   # Forward local port to remote service
   ssh -L 8080:localhost:80 rhtuser@[server-ip]
   
   # Access via http://localhost:8080
   ```

2. **Remote Port Forwarding**:
   ```bash
   # Forward remote port to local service
   ssh -R 9090:localhost:3000 rhtuser@[server-ip]
   ```

3. **Dynamic Port Forwarding (SOCKS Proxy)**:
   ```bash
   # Create SOCKS proxy
   ssh -D 1080 rhtuser@[server-ip]
   ```

### Console Access Troubleshooting

#### Common Connection Issues

1. **Web Console Not Loading**:
   - **Symptoms**: Console window doesn't open or shows blank screen
   - **Troubleshooting Steps**:
     ```
     1. Check browser compatibility (Chrome, Firefox recommended)
     2. Disable browser extensions that might interfere
     3. Clear browser cache and cookies
     4. Try incognito/private browsing mode
     5. Check if popup blockers are preventing console window
     ```

2. **Console Session Timeout**:
   - **Symptoms**: Console becomes unresponsive after period of inactivity
   - **Resolution**:
     ```
     1. Refresh the console window
     2. Close and reopen console session
     3. Check control panel session timeout settings
     4. Ensure stable internet connection
     ```

3. **Keyboard Input Issues**:
   - **Symptoms**: Certain keys don't work or produce wrong characters
   - **Solutions**:
     ```
     1. Check browser keyboard layout settings
     2. Try different browser
     3. Use on-screen keyboard if available
     4. Switch to SSH access for complex input
     ```

#### SSH Connection Troubleshooting

1. **Connection Refused**:
   ```bash
   # Check SSH service status via web console
   systemctl status sshd
   
   # Start SSH service if stopped
   systemctl start sshd
   
   # Check SSH configuration
   sshd -T
   
   # Check firewall rules
   ufw status
   iptables -L
   ```

2. **Authentication Failures**:
   ```bash
   # Check SSH logs
   tail -f /var/log/auth.log
   
   # Verify user account
   id username
   
   # Check SSH key permissions
   ls -la ~/.ssh/
   chmod 600 ~/.ssh/id_rsa
   chmod 644 ~/.ssh/id_rsa.pub
   ```

3. **Network Connectivity Issues**:
   ```bash
   # Test network connectivity
   ping [server-ip]
   
   # Check port accessibility
   telnet [server-ip] 22
   nmap -p 22 [server-ip]
   
   # Trace network route
   traceroute [server-ip]
   ```

#### VNC Connection Troubleshooting

1. **VNC Service Issues**:
   ```bash
   # Check VNC service status
   systemctl status vncserver@:1.service
   
   # Start VNC service
   systemctl start vncserver@:1.service
   
   # Check VNC configuration
   cat ~/.vnc/xstartup
   ```

2. **VNC Authentication Problems**:
   ```bash
   # Reset VNC password
   vncpasswd
   
   # Check VNC password file
   ls -la ~/.vnc/passwd
   ```

3. **VNC Display Issues**:
   ```bash
   # Check available displays
   vncserver -list
   
   # Kill and restart VNC session
   vncserver -kill :1
   vncserver :1
   ```

### Emergency Console Access Procedures

#### When SSH is Unavailable

1. **Use Web Console**:
   - Access via Sakura control panel
   - Login with root credentials
   - Diagnose and fix SSH issues

2. **Common SSH Recovery Steps**:
   ```bash
   # Check SSH service
   systemctl status sshd
   systemctl restart sshd
   
   # Check SSH configuration
   sshd -T
   
   # Reset SSH configuration if corrupted
   cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
   systemctl restart sshd
   
   # Check firewall rules
   ufw status
   ufw allow ssh
   ```

#### Boot Issues and Recovery

1. **GRUB Recovery**:
   - Access console during boot process
   - Select recovery mode from GRUB menu
   - Use recovery shell to fix boot issues

2. **Single User Mode**:
   ```bash
   # Boot into single user mode
   # Add 'single' to kernel parameters in GRUB
   
   # Or use systemd rescue mode
   systemctl rescue
   ```

3. **File System Recovery**:
   ```bash
   # Check file system integrity
   fsck /dev/sda1
   
   # Mount file systems manually
   mount -a
   
   # Check disk space
   df -h
   ```

### Console Security Best Practices

#### Access Control

1. **Strong Authentication**:
   - Use strong passwords for console access
   - Implement SSH key authentication
   - Enable two-factor authentication where possible

2. **Session Management**:
   - Close console sessions when finished
   - Set appropriate session timeouts
   - Monitor active console sessions

3. **Network Security**:
   - Use VPN for remote console access when possible
   - Restrict console access by IP address
   - Monitor console access logs

#### Monitoring and Logging

1. **Console Access Logging**:
   ```bash
   # Monitor SSH access logs
   tail -f /var/log/auth.log
   
   # Check console login attempts
   last
   lastb
   
   # Monitor active sessions
   who
   w
   ```

2. **Security Monitoring**:
   ```bash
   # Check for suspicious activities
   grep "Failed password" /var/log/auth.log
   
   # Monitor root access
   grep "root" /var/log/auth.log
   
   # Check for privilege escalation
   grep "sudo" /var/log/auth.log
   ```

### Console Access Documentation

#### Access Credentials Management

1. **Credential Storage**:
   - Store console passwords securely
   - Use password managers for credential management
   - Regularly rotate passwords

2. **Access Documentation**:
   ```
   Console Access Information
   ========================
   
   Web Console:
   - URL: [Sakura Control Panel URL]
   - Login: [Control Panel Credentials]
   
   SSH Access:
   - Server IP: [Server IP Address]
   - SSH Port: 22
   - Users: root, rhtuser
   - Key Location: ~/.ssh/id_rsa
   
   VNC Access (if configured):
   - VNC Server: [Server IP]:5900
   - VNC Password: [Stored Securely]
   
   Emergency Contacts:
   - Sakura Support: [Support Information]
   - System Administrator: [Contact Information]
   ```

#### Procedure Documentation

1. **Standard Operating Procedures**:
   - Document common console access procedures
   - Create troubleshooting checklists
   - Maintain emergency access procedures

2. **Training Materials**:
   - Create console access training guides
   - Document best practices
   - Provide troubleshooting examples

### Integration with Monitoring Systems

#### Console Access Monitoring

1. **Automated Monitoring**:
   ```bash
   # Monitor SSH connections
   #!/bin/bash
   # Check for active SSH sessions
   ACTIVE_SESSIONS=$(who | wc -l)
   if [ $ACTIVE_SESSIONS -gt 5 ]; then
       echo "High number of active console sessions: $ACTIVE_SESSIONS"
   fi
   ```

2. **Alert Configuration**:
   - Set up alerts for failed console access attempts
   - Monitor for unusual console activity
   - Alert on emergency console access usage

#### Performance Monitoring

1. **Console Performance Metrics**:
   - Monitor console response times
   - Track console session durations
   - Measure console availability

2. **Capacity Planning**:
   - Monitor concurrent console sessions
   - Plan for console access scaling
   - Optimize console performance

## Startup Script Configuration

Sakura VPS provides startup script functionality that allows automatic execution of custom scripts during server boot. This section documents how to configure and use startup scripts for automating PostgreSQL configuration and system initialization.

### Startup Script Overview

#### What are Startup Scripts?

Startup scripts in Sakura VPS are custom scripts that execute automatically during the server boot process. They can be used to:

- Configure system settings automatically
- Install and configure software
- Set up database configurations
- Initialize application environments
- Perform security hardening
- Configure monitoring and alerting

#### Startup Script Execution

1. **Execution Timing**: Scripts run during the initial boot process after OS installation
2. **Execution Environment**: Scripts run with root privileges
3. **Execution Context**: Scripts execute before user login is available
4. **Logging**: Script output is logged for troubleshooting

### Configuring Startup Scripts via Control Panel

#### Accessing Startup Script Configuration

1. **Navigate to Startup Scripts**:
   - Log in to the [Sakura VPS control panel](https://secure.sakura.ad.jp/vps/)
   - Select the hotel management system server
   - Click on "Settings" or "Configuration" tab
   - Locate "Startup Script" or "Boot Script" section

2. **Script Configuration Interface**:
   - Text editor for script content
   - Script validation tools
   - Execution log viewer
   - Script management options

#### Creating Startup Scripts

1. **Basic Script Structure**:
   ```bash
   #!/bin/bash
   
   # Startup Script for Hotel Management System
   # This script configures PostgreSQL and system settings
   
   # Set error handling
   set -e
   set -o pipefail
   
   # Log function
   log_message() {
       echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> /var/log/startup-script.log
   }
   
   log_message "Starting hotel management system configuration"
   
   # Script content goes here
   
   log_message "Hotel management system configuration completed"
   ```

2. **Script Upload Methods**:
   - **Direct Input**: Copy and paste script content into the control panel
   - **File Upload**: Upload script file from local computer
   - **URL Import**: Import script from a URL (if supported)

### PostgreSQL Configuration Startup Script

#### Complete PostgreSQL Setup Script

```bash
#!/bin/bash

# Hotel Management System PostgreSQL Configuration Script
# This script automatically configures PostgreSQL for the hotel management system

# Configuration variables
POSTGRES_VERSION="16"
DB_NAME="rhthotels"
DB_USER="rhtsys_user"
DB_PASSWORD="$(openssl rand -base64 32)"
BACKUP_DIR="/var/backups/postgresql"

# Logging function
log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a /var/log/startup-script.log
}

# Error handling
handle_error() {
    log_message "ERROR: $1"
    exit 1
}

log_message "Starting PostgreSQL configuration for hotel management system"

# Update system packages
log_message "Updating system packages"
apt update || handle_error "Failed to update package lists"
apt upgrade -y || handle_error "Failed to upgrade packages"

# Install required packages
log_message "Installing required packages"
apt install -y postgresql postgresql-contrib postgresql-client || handle_error "Failed to install PostgreSQL"
apt install -y apache2 php php-pgsql php-curl php-json php-mbstring || handle_error "Failed to install web server"
apt install -y fail2ban ufw htop curl wget unzip || handle_error "Failed to install utilities"

# Configure timezone
log_message "Configuring timezone"
timedatectl set-timezone Asia/Tokyo || handle_error "Failed to set timezone"

# Configure hostname
log_message "Configuring hostname"
hostnamectl set-hostname rht-hotel-server || handle_error "Failed to set hostname"
echo "127.0.0.1 rht-hotel-server" >> /etc/hosts

# Start and enable PostgreSQL
log_message "Starting PostgreSQL service"
systemctl start postgresql || handle_error "Failed to start PostgreSQL"
systemctl enable postgresql || handle_error "Failed to enable PostgreSQL"

# Configure PostgreSQL
log_message "Configuring PostgreSQL database"

# Create database user
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || handle_error "Failed to create database user"
sudo -u postgres psql -c "ALTER USER $DB_USER CREATEDB;" || handle_error "Failed to grant database creation privileges"

# Create database
sudo -u postgres createdb -O $DB_USER $DB_NAME || handle_error "Failed to create database"

# Configure PostgreSQL settings
log_message "Optimizing PostgreSQL configuration"
PG_CONFIG="/etc/postgresql/$POSTGRES_VERSION/main/postgresql.conf"

# Backup original configuration
cp "$PG_CONFIG" "$PG_CONFIG.backup"

# Apply optimized settings
cat >> "$PG_CONFIG" << EOF

# Hotel Management System Optimizations
# Added by startup script on $(date)

# Memory Configuration
shared_buffers = 1GB
work_mem = 32MB
maintenance_work_mem = 256MB
effective_cache_size = 3GB

# Connection Settings
max_connections = 100
listen_addresses = '*'

# Write-Ahead Log Settings
wal_level = replica
max_wal_size = 1GB
min_wal_size = 80MB

# Query Tuning (optimized for SSD)
random_page_cost = 1.1
effective_io_concurrency = 200

# Autovacuum Settings
autovacuum = on
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05

# Logging
log_destination = 'stderr'
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_min_duration_statement = 1000
log_connections = on
log_disconnections = on
log_line_prefix = '%m [%p] %q%u@%d '
EOF

# Configure client authentication
log_message "Configuring PostgreSQL authentication"
PG_HBA="/etc/postgresql/$POSTGRES_VERSION/main/pg_hba.conf"
cp "$PG_HBA" "$PG_HBA.backup"

# Add application access rules
cat >> "$PG_HBA" << EOF

# Hotel Management System Access Rules
# Added by startup script on $(date)
host    $DB_NAME    $DB_USER    127.0.0.1/32    scram-sha-256
host    $DB_NAME    $DB_USER    ::1/128         scram-sha-256
EOF

# Restart PostgreSQL to apply changes
log_message "Restarting PostgreSQL to apply configuration"
systemctl restart postgresql || handle_error "Failed to restart PostgreSQL"

# Create backup directory
log_message "Setting up backup directory"
mkdir -p "$BACKUP_DIR"
chown postgres:postgres "$BACKUP_DIR"
chmod 755 "$BACKUP_DIR"

# Configure firewall
log_message "Configuring firewall"
ufw --force enable
ufw allow ssh
ufw allow 'Apache Full'
ufw allow from 127.0.0.1 to any port 5432

# Configure fail2ban
log_message "Configuring fail2ban"
systemctl start fail2ban
systemctl enable fail2ban

# Create fail2ban PostgreSQL filter
cat > /etc/fail2ban/filter.d/postgresql.conf << EOF
[Definition]
failregex = ^%(__prefix_line)s.*FATAL:.*password authentication failed for user.*$
            ^%(__prefix_line)s.*FATAL:.*no pg_hba.conf entry for host.*$
ignoreregex =
EOF

# Create fail2ban PostgreSQL jail
cat > /etc/fail2ban/jail.d/postgresql.conf << EOF
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-*.log
maxretry = 5
bantime = 3600
findtime = 600
EOF

systemctl restart fail2ban

# Configure Apache
log_message "Configuring Apache web server"
systemctl start apache2
systemctl enable apache2

# Create application directory
mkdir -p /var/www/html/hotel-management
chown -R www-data:www-data /var/www/html/
chmod -R 755 /var/www/html/

# Save database credentials securely
log_message "Saving database credentials"
cat > /etc/hotel-management/database.conf << EOF
# Database Configuration
# Generated by startup script on $(date)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
EOF

chmod 600 /etc/hotel-management/database.conf
chown root:root /etc/hotel-management/database.conf

# Create system user for application
log_message "Creating application user"
useradd -m -s /bin/bash -G www-data rhtuser
echo "rhtuser:$(openssl rand -base64 12)" | chpasswd

# Install monitoring scripts (if available)
log_message "Setting up monitoring"
mkdir -p /usr/local/bin/monitoring

# Create basic health check script
cat > /usr/local/bin/monitoring/health-check.sh << 'EOF'
#!/bin/bash
# Basic health check script

# Check PostgreSQL
if ! systemctl is-active --quiet postgresql; then
    echo "CRITICAL: PostgreSQL is not running"
    exit 1
fi

# Check Apache
if ! systemctl is-active --quiet apache2; then
    echo "CRITICAL: Apache is not running"
    exit 1
fi

# Check database connectivity
if ! sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
    echo "CRITICAL: Cannot connect to PostgreSQL"
    exit 1
fi

echo "OK: All services are running"
exit 0
EOF

chmod +x /usr/local/bin/monitoring/health-check.sh

# Create startup completion marker
log_message "Creating startup completion marker"
echo "$(date)" > /var/log/startup-script-completed

# Final system status check
log_message "Performing final system status check"
systemctl status postgresql --no-pager
systemctl status apache2 --no-pager
systemctl status fail2ban --no-pager

log_message "Hotel management system startup configuration completed successfully"

# Display important information
cat << EOF

========================================
Hotel Management System Setup Complete
========================================

Database Information:
- Database Name: $DB_NAME
- Database User: $DB_USER
- Database Password: $DB_PASSWORD

Important Files:
- Database Config: /etc/hotel-management/database.conf
- PostgreSQL Config: $PG_CONFIG
- Startup Log: /var/log/startup-script.log

Next Steps:
1. Deploy application files to /var/www/html/hotel-management/
2. Configure application database connection
3. Set up SSL certificates
4. Configure backup procedures
5. Set up monitoring and alerting

========================================

EOF

log_message "Startup script execution completed"
```

#### Script Components Explanation

1. **System Updates**:
   - Updates package lists and upgrades system
   - Ensures latest security patches are installed

2. **Package Installation**:
   - Installs PostgreSQL and related packages
   - Installs web server (Apache) and PHP
   - Installs security tools (fail2ban, ufw)

3. **PostgreSQL Configuration**:
   - Creates database user and database
   - Applies performance optimizations
   - Configures authentication settings

4. **Security Configuration**:
   - Configures firewall rules
   - Sets up fail2ban for intrusion prevention
   - Creates secure credential storage

5. **Monitoring Setup**:
   - Creates basic health check scripts
   - Sets up logging and monitoring directories

### Advanced Startup Script Examples

#### Database Restoration Script

```bash
#!/bin/bash

# Database Restoration Startup Script
# Restores database from backup during server initialization

BACKUP_URL="https://backup-server.example.com/latest-backup.sql.gz"
DB_NAME="rhthotels"
DB_USER="rhtsys_user"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a /var/log/startup-script.log
}

log_message "Starting database restoration process"

# Download backup file
log_message "Downloading database backup"
wget -O /tmp/database-backup.sql.gz "$BACKUP_URL" || {
    log_message "ERROR: Failed to download backup"
    exit 1
}

# Verify backup integrity
log_message "Verifying backup integrity"
gunzip -t /tmp/database-backup.sql.gz || {
    log_message "ERROR: Backup file is corrupted"
    exit 1
}

# Restore database
log_message "Restoring database"
gunzip -c /tmp/database-backup.sql.gz | sudo -u postgres psql "$DB_NAME" || {
    log_message "ERROR: Database restoration failed"
    exit 1
}

# Cleanup
rm -f /tmp/database-backup.sql.gz

log_message "Database restoration completed successfully"
```

#### SSL Certificate Setup Script

```bash
#!/bin/bash

# SSL Certificate Setup Script
# Automatically configures SSL certificates using Let's Encrypt

DOMAIN="hotel.example.com"
EMAIL="admin@example.com"

log_message() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a /var/log/startup-script.log
}

log_message "Starting SSL certificate setup"

# Install Certbot
apt update
apt install -y certbot python3-certbot-apache

# Obtain SSL certificate
log_message "Obtaining SSL certificate for $DOMAIN"
certbot --apache --non-interactive --agree-tos --email "$EMAIL" -d "$DOMAIN" || {
    log_message "ERROR: Failed to obtain SSL certificate"
    exit 1
}

# Configure automatic renewal
log_message "Configuring automatic certificate renewal"
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

log_message "SSL certificate setup completed"
```

### Startup Script Management

#### Script Validation

1. **Syntax Checking**:
   ```bash
   # Validate script syntax before upload
   bash -n startup-script.sh
   
   # Check for common issues
   shellcheck startup-script.sh
   ```

2. **Testing Procedures**:
   - Test scripts in a staging environment first
   - Use minimal test scripts to verify functionality
   - Validate script execution logs

#### Script Versioning

1. **Version Control**:
   ```bash
   # Add version information to scripts
   SCRIPT_VERSION="1.2.0"
   SCRIPT_DATE="2025-01-15"
   
   log_message "Startup script version $SCRIPT_VERSION ($SCRIPT_DATE)"
   ```

2. **Change Management**:
   - Document all script changes
   - Maintain backup copies of working scripts
   - Test new versions thoroughly

#### Script Monitoring

1. **Execution Logging**:
   ```bash
   # Enhanced logging function
   log_message() {
       local level="$1"
       local message="$2"
       echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $message" | tee -a /var/log/startup-script.log
   }
   
   # Usage examples
   log_message "INFO" "Starting configuration"
   log_message "ERROR" "Configuration failed"
   log_message "SUCCESS" "Configuration completed"
   ```

2. **Status Reporting**:
   ```bash
   # Create status report
   create_status_report() {
       cat > /var/log/startup-status.json << EOF
   {
       "timestamp": "$(date -Iseconds)",
       "script_version": "$SCRIPT_VERSION",
       "execution_status": "success",
       "services_configured": [
           "postgresql",
           "apache2",
           "fail2ban"
       ],
       "database_created": true,
       "ssl_configured": false
   }
   EOF
   }
   ```

### Troubleshooting Startup Scripts

#### Common Issues and Solutions

1. **Script Execution Failures**:
   ```bash
   # Check startup script logs
   cat /var/log/startup-script.log
   
   # Check system logs for errors
   journalctl -u startup-script --since "1 hour ago"
   
   # Verify script permissions
   ls -la /path/to/startup-script.sh
   ```

2. **Service Configuration Issues**:
   ```bash
   # Check service status
   systemctl status postgresql
   systemctl status apache2
   
   # Review service logs
   journalctl -u postgresql --since "1 hour ago"
   journalctl -u apache2 --since "1 hour ago"
   ```

3. **Network and Connectivity Issues**:
   ```bash
   # Check network configuration
   ip addr show
   
   # Test external connectivity
   ping -c 4 google.com
   
   # Check firewall rules
   ufw status verbose
   ```

#### Recovery Procedures

1. **Script Failure Recovery**:
   - Access server via console
   - Review startup script logs
   - Manually execute failed script sections
   - Fix configuration issues

2. **Service Recovery**:
   ```bash
   # Restart failed services
   systemctl restart postgresql
   systemctl restart apache2
   
   # Check service dependencies
   systemctl list-dependencies postgresql
   ```

### Best Practices

#### Script Development

1. **Error Handling**:
   - Use `set -e` to exit on errors
   - Implement proper error logging
   - Provide meaningful error messages
   - Include recovery procedures

2. **Idempotency**:
   - Make scripts safe to run multiple times
   - Check for existing configurations
   - Use conditional logic for installations

3. **Security**:
   - Generate secure passwords
   - Set proper file permissions
   - Avoid hardcoding sensitive information
   - Use secure communication channels

#### Deployment Strategy

1. **Testing**:
   - Test scripts in staging environment
   - Validate all script components
   - Verify service functionality after execution

2. **Rollback Planning**:
   - Maintain backup configurations
   - Document rollback procedures
   - Test recovery scenarios

3. **Documentation**:
   - Document script functionality
   - Maintain change logs
   - Provide troubleshooting guides

### Integration with Infrastructure as Code

#### Terraform Integration

```hcl
# Terraform configuration for Sakura VPS with startup script
resource "sakura_vps" "hotel_management" {
  name = "hotel-management-server"
  plan = "4core-4gb"
  
  startup_script = file("${path.module}/startup-scripts/hotel-setup.sh")
  
  tags = {
    Environment = "production"
    Application = "hotel-management"
  }
}
```

#### Ansible Integration

```yaml
# Ansible playbook for startup script deployment
- name: Deploy startup script to Sakura VPS
  hosts: sakura_vps
  tasks:
    - name: Upload startup script
      copy:
        src: startup-scripts/hotel-setup.sh
        dest: /tmp/startup-script.sh
        mode: '0755'
    
    - name: Execute startup script
      shell: /tmp/startup-script.sh
      register: startup_result
    
    - name: Display startup results
      debug:
        var: startup_result.stdout
```

This comprehensive startup script configuration documentation provides the foundation for automating PostgreSQL configuration and system initialization on Sakura VPS, ensuring consistent and reliable server deployments.