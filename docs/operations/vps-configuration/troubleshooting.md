# Troubleshooting Guides

This document provides detailed troubleshooting guides for common issues with the Sakura VPS and PostgreSQL database.

## Common PostgreSQL Errors

This section provides comprehensive troubleshooting guides for common PostgreSQL errors encountered in the hotel management system, including connection failures, authentication issues, and performance problems.

### Connection Failures

#### Error: "Connection refused" (SQLSTATE: 08001)

**Symptoms**:
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: Connection refused
Is the server running on that host and accepting TCP/IP connections?
```

**Common Causes**:
1. PostgreSQL service is not running
2. PostgreSQL is not listening on the expected port
3. Firewall is blocking connections
4. PostgreSQL is configured to listen only on specific interfaces

**Troubleshooting Steps**:

1. **Check PostgreSQL Service Status**:
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # If not running, start the service
   sudo systemctl start postgresql
   
   # Enable automatic startup
   sudo systemctl enable postgresql
   ```

2. **Verify PostgreSQL is Listening**:
   ```bash
   # Check if PostgreSQL is listening on port 5432
   sudo netstat -tlnp | grep 5432
   
   # Alternative using ss command
   sudo ss -tlnp | grep 5432
   
   # Check PostgreSQL processes
   ps aux | grep postgres
   ```

3. **Check PostgreSQL Configuration**:
   ```bash
   # Check listen_addresses setting
   sudo -u postgres psql -c "SHOW listen_addresses;"
   
   # Check port setting
   sudo -u postgres psql -c "SHOW port;"
   
   # Edit configuration if needed
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Look for and modify:
   # listen_addresses = 'localhost'  # or '*' for all interfaces
   # port = 5432
   ```

4. **Check Firewall Settings**:
   ```bash
   # Check UFW status
   sudo ufw status
   
   # Allow PostgreSQL port if needed
   sudo ufw allow 5432
   
   # Check iptables rules
   sudo iptables -L -n | grep 5432
   ```

5. **Restart PostgreSQL After Changes**:
   ```bash
   sudo systemctl restart postgresql
   
   # Verify the service started successfully
   sudo systemctl status postgresql
   ```

#### Error: "Connection timed out" (SQLSTATE: 08001)

**Symptoms**:
```
psql: error: connection to server at "192.168.1.100" (192.168.1.100), port 5432 failed: Connection timed out
Is the server running on that host and accepting TCP/IP connections?
```

**Troubleshooting Steps**:

1. **Network Connectivity Test**:
   ```bash
   # Test basic connectivity
   ping [server-ip]
   
   # Test port connectivity
   telnet [server-ip] 5432
   
   # Use nmap to check port status
   nmap -p 5432 [server-ip]
   ```

2. **Check Network Configuration**:
   ```bash
   # Check server network interfaces
   ip addr show
   
   # Check routing table
   ip route show
   
   # Check DNS resolution
   nslookup [server-hostname]
   ```

3. **Firewall and Security Groups**:
   ```bash
   # Check local firewall
   sudo ufw status verbose
   
   # Check iptables rules
   sudo iptables -L -v
   
   # For cloud environments, check security groups
   # (Sakura VPS packet filter settings)
   ```

### Authentication Issues

#### Error: "Password authentication failed" (SQLSTATE: 28P01)

**Symptoms**:
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: 
FATAL: password authentication failed for user "rhtsys_user"
```

**Troubleshooting Steps**:

1. **Verify User Exists**:
   ```bash
   # Connect as postgres superuser
   sudo -u postgres psql
   
   # List all users
   \du
   
   # Check specific user
   SELECT usename, usecreatedb, usesuper FROM pg_user WHERE usename = 'rhtsys_user';
   ```

2. **Reset User Password**:
   ```bash
   # Connect as postgres superuser
   sudo -u postgres psql
   
   # Reset password
   ALTER USER rhtsys_user PASSWORD 'new_secure_password';
   
   # Exit psql
   \q
   ```

3. **Check pg_hba.conf Configuration**:
   ```bash
   # View current authentication configuration
   sudo cat /etc/postgresql/16/main/pg_hba.conf
   
   # Look for lines like:
   # host    all    rhtsys_user    127.0.0.1/32    scram-sha-256
   
   # Edit if necessary
   sudo nano /etc/postgresql/16/main/pg_hba.conf
   
   # Reload configuration
   sudo systemctl reload postgresql
   ```

4. **Test Authentication Methods**:
   ```bash
   # Test with password prompt
   psql -h localhost -U rhtsys_user -d rhthotels -W
   
   # Test with PGPASSWORD environment variable
   PGPASSWORD='your_password' psql -h localhost -U rhtsys_user -d rhthotels
   
   # Test with .pgpass file
   echo "localhost:5432:rhthotels:rhtsys_user:your_password" >> ~/.pgpass
   chmod 600 ~/.pgpass
   psql -h localhost -U rhtsys_user -d rhthotels
   ```

#### Error: "Role does not exist" (SQLSTATE: 28000)

**Symptoms**:
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: 
FATAL: role "username" does not exist
```

**Troubleshooting Steps**:

1. **Create Missing User**:
   ```bash
   # Connect as postgres superuser
   sudo -u postgres psql
   
   # Create user
   CREATE USER rhtsys_user WITH PASSWORD 'secure_password';
   
   # Grant necessary privileges
   GRANT CONNECT ON DATABASE rhthotels TO rhtsys_user;
   GRANT USAGE ON SCHEMA public TO rhtsys_user;
   GRANT CREATE ON SCHEMA public TO rhtsys_user;
   
   # For existing tables, grant permissions
   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO rhtsys_user;
   GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO rhtsys_user;
   ```

2. **Verify User Creation**:
   ```bash
   # List all users
   \du
   
   # Check user privileges on database
   \l
   
   # Check schema privileges
   \dn+
   ```

### Database Connection Issues

#### Error: "Too many connections" (SQLSTATE: 53300)

**Symptoms**:
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: 
FATAL: sorry, too many clients already
```

**Troubleshooting Steps**:

1. **Check Current Connections**:
   ```bash
   # Connect as postgres superuser (if possible)
   sudo -u postgres psql
   
   # Check current connections
   SELECT count(*) FROM pg_stat_activity;
   
   # View active connections by database
   SELECT datname, count(*) FROM pg_stat_activity GROUP BY datname;
   
   # View connections by user
   SELECT usename, count(*) FROM pg_stat_activity GROUP BY usename;
   ```

2. **Identify Long-Running Connections**:
   ```sql
   -- Find long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   ORDER BY duration DESC;
   
   -- Find idle connections
   SELECT pid, now() - state_change AS idle_duration, query 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   ORDER BY idle_duration DESC;
   ```

3. **Terminate Problematic Connections**:
   ```sql
   -- Terminate specific connection
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = [process_id];
   
   -- Terminate idle connections older than 1 hour
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND now() - state_change > interval '1 hour';
   ```

4. **Adjust Connection Limits**:
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Increase max_connections (default is usually 100)
   max_connections = 200
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

5. **Implement Connection Pooling**:
   ```bash
   # Install PgBouncer
   sudo apt install pgbouncer
   
   # Configure PgBouncer
   sudo nano /etc/pgbouncer/pgbouncer.ini
   
   # Basic configuration:
   [databases]
   rhthotels = host=localhost port=5432 dbname=rhthotels
   
   [pgbouncer]
   listen_port = 6432
   listen_addr = 127.0.0.1
   auth_type = md5
   auth_file = /etc/pgbouncer/userlist.txt
   pool_mode = transaction
   max_client_conn = 1000
   default_pool_size = 20
   ```

#### Error: "Database does not exist" (SQLSTATE: 3D000)

**Symptoms**:
```
psql: error: connection to server at "localhost" (127.0.0.1), port 5432 failed: 
FATAL: database "rhthotels" does not exist
```

**Troubleshooting Steps**:

1. **List Available Databases**:
   ```bash
   # Connect to default database
   sudo -u postgres psql
   
   # List all databases
   \l
   
   # Or using SQL
   SELECT datname FROM pg_database;
   ```

2. **Create Missing Database**:
   ```bash
   # Create database
   sudo -u postgres createdb rhthotels
   
   # Or using SQL
   sudo -u postgres psql -c "CREATE DATABASE rhthotels;"
   
   # Set owner if needed
   sudo -u postgres psql -c "ALTER DATABASE rhthotels OWNER TO rhtsys_user;"
   ```

3. **Restore Database from Backup**:
   ```bash
   # If database was accidentally dropped, restore from backup
   sudo -u postgres createdb rhthotels
   
   # Restore from SQL dump
   sudo -u postgres psql rhthotels < /var/backups/postgresql/rhthotels_backup.sql
   
   # Or restore from custom format
   sudo -u postgres pg_restore -d rhthotels /var/backups/postgresql/rhthotels_backup.dump
   ```

### Performance Issues

#### Error: "Query timeout" or Slow Query Performance

**Symptoms**:
- Queries taking unusually long time to execute
- Application timeouts
- High CPU usage on database server

**Troubleshooting Steps**:

1. **Identify Slow Queries**:
   ```sql
   -- Enable query logging (if not already enabled)
   ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log queries > 1 second
   SELECT pg_reload_conf();
   
   -- Check for long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   AND now() - pg_stat_activity.query_start > interval '5 minutes'
   ORDER BY duration DESC;
   ```

2. **Analyze Query Performance**:
   ```sql
   -- Use EXPLAIN ANALYZE for slow queries
   EXPLAIN ANALYZE SELECT * FROM reservations WHERE check_in_date BETWEEN '2025-01-01' AND '2025-01-31';
   
   -- Check for missing indexes
   SELECT schemaname, tablename, seq_scan, seq_tup_read, idx_scan, idx_tup_fetch
   FROM pg_stat_user_tables 
   WHERE seq_scan > 1000 
   ORDER BY seq_scan DESC;
   ```

3. **Check Database Statistics**:
   ```sql
   -- Update table statistics
   ANALYZE;
   
   -- Check when statistics were last updated
   SELECT schemaname, tablename, last_analyze, last_autoanalyze
   FROM pg_stat_user_tables;
   ```

4. **Monitor Resource Usage**:
   ```bash
   # Check system resources
   htop
   
   # Check I/O usage
   iostat -x 1
   
   # Check PostgreSQL-specific metrics
   sudo -u postgres psql -c "SELECT * FROM pg_stat_bgwriter;"
   ```

#### Error: "Out of memory" (SQLSTATE: 53200)

**Symptoms**:
```
ERROR: out of memory
DETAIL: Failed on request of size [number] bytes.
```

**Troubleshooting Steps**:

1. **Check System Memory**:
   ```bash
   # Check available memory
   free -h
   
   # Check memory usage by process
   ps aux --sort=-%mem | head -20
   
   # Check PostgreSQL memory usage
   ps aux | grep postgres
   ```

2. **Adjust PostgreSQL Memory Settings**:
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Adjust memory settings:
   shared_buffers = 1GB          # 25% of system RAM
   work_mem = 16MB               # Reduce if getting out of memory errors
   maintenance_work_mem = 256MB  # For maintenance operations
   effective_cache_size = 3GB    # 75% of system RAM
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

3. **Optimize Problematic Queries**:
   ```sql
   -- Identify memory-intensive queries
   SELECT query, calls, mean_time, total_time
   FROM pg_stat_statements 
   ORDER BY mean_time DESC 
   LIMIT 10;
   
   -- Optimize queries with proper indexing
   CREATE INDEX idx_reservations_date ON reservations(check_in_date, check_out_date);
   ```

### Startup and Service Issues

#### Error: PostgreSQL fails to start

**Symptoms**:
```bash
sudo systemctl start postgresql
Job for postgresql.service failed because the control process exited with error code.
```

**Troubleshooting Steps**:

1. **Check Service Status and Logs**:
   ```bash
   # Check detailed service status
   sudo systemctl status postgresql -l
   
   # Check PostgreSQL logs
   sudo journalctl -u postgresql -n 50
   
   # Check PostgreSQL error logs
   sudo tail -f /var/log/postgresql/postgresql-*.log
   ```

2. **Check Configuration Syntax**:
   ```bash
   # Test PostgreSQL configuration
   sudo -u postgres /usr/lib/postgresql/16/bin/postgres --config-file=/etc/postgresql/16/main/postgresql.conf --check-config
   
   # Check for syntax errors in pg_hba.conf
   sudo -u postgres /usr/lib/postgresql/16/bin/postgres -D /var/lib/postgresql/16/main -C config_file
   ```

3. **Check Data Directory Permissions**:
   ```bash
   # Check data directory ownership and permissions
   ls -la /var/lib/postgresql/16/main/
   
   # Fix permissions if needed
   sudo chown -R postgres:postgres /var/lib/postgresql/16/main/
   sudo chmod 700 /var/lib/postgresql/16/main/
   ```

4. **Check for Lock Files**:
   ```bash
   # Check for stale PID files
   ls -la /var/lib/postgresql/16/main/postmaster.pid
   
   # Remove stale PID file if PostgreSQL is not running
   sudo rm /var/lib/postgresql/16/main/postmaster.pid
   ```

5. **Check Disk Space**:
   ```bash
   # Check available disk space
   df -h /var/lib/postgresql/
   
   # Check for full disk
   df -i /var/lib/postgresql/
   ```

### Data Corruption Issues

#### Error: "Invalid page header" or "Checksum failure"

**Symptoms**:
```
ERROR: invalid page header in block [number] of relation base/[oid]/[relfilenode]
WARNING: page verification failed, calculated checksum [number] but expected [number]
```

**Troubleshooting Steps**:

1. **Immediate Actions**:
   ```bash
   # Stop PostgreSQL immediately
   sudo systemctl stop postgresql
   
   # Create backup of current state (if possible)
   sudo cp -r /var/lib/postgresql/16/main /var/lib/postgresql/16/main.backup
   ```

2. **Assess Corruption Extent**:
   ```bash
   # Check data checksums (if enabled)
   sudo -u postgres /usr/lib/postgresql/16/bin/pg_checksums --check --pgdata=/var/lib/postgresql/16/main
   
   # Check specific table for corruption
   sudo -u postgres psql -c "SELECT * FROM [corrupted_table] LIMIT 1;"
   ```

3. **Recovery Options**:

   **Option 1: Restore from Backup**:
   ```bash
   # Stop PostgreSQL
   sudo systemctl stop postgresql
   
   # Remove corrupted data
   sudo rm -rf /var/lib/postgresql/16/main
   
   # Restore from backup
   sudo -u postgres pg_restore -C -d postgres /var/backups/postgresql/latest_backup.dump
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

   **Option 2: Skip Corrupted Pages** (Data Loss Risk):
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Add temporary setting
   zero_damaged_pages = on
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   
   # Export uncorrupted data
   sudo -u postgres pg_dump rhthotels > /tmp/partial_recovery.sql
   
   # Remove temporary setting and restart
   # zero_damaged_pages = off
   sudo systemctl restart postgresql
   ```

### Troubleshooting Tools and Commands

#### Essential Diagnostic Commands

1. **Service and Process Information**:
   ```bash
   # PostgreSQL service status
   sudo systemctl status postgresql
   
   # PostgreSQL processes
   ps aux | grep postgres
   
   # PostgreSQL listening ports
   sudo netstat -tlnp | grep postgres
   ```

2. **Database Connection Testing**:
   ```bash
   # Test local connection
   sudo -u postgres psql -c "SELECT version();"
   
   # Test application user connection
   psql -h localhost -U rhtsys_user -d rhthotels -c "SELECT 1;"
   
   # Test connection with specific parameters
   psql "host=localhost port=5432 dbname=rhthotels user=rhtsys_user" -c "SELECT current_database();"
   ```

3. **Configuration Verification**:
   ```bash
   # Show current configuration
   sudo -u postgres psql -c "SELECT name, setting FROM pg_settings WHERE name IN ('listen_addresses', 'port', 'max_connections');"
   
   # Show authentication configuration
   sudo cat /etc/postgresql/16/main/pg_hba.conf | grep -v '^#' | grep -v '^$'
   
   # Test configuration syntax
   sudo -u postgres /usr/lib/postgresql/16/bin/postgres --config-file=/etc/postgresql/16/main/postgresql.conf --check-config
   ```

#### Log Analysis Commands

1. **PostgreSQL Logs**:
   ```bash
   # View recent PostgreSQL logs
   sudo tail -f /var/log/postgresql/postgresql-*.log
   
   # Search for specific errors
   sudo grep -i "error\|fatal\|panic" /var/log/postgresql/postgresql-*.log
   
   # Search for connection issues
   sudo grep -i "connection\|authentication" /var/log/postgresql/postgresql-*.log
   ```

2. **System Logs**:
   ```bash
   # PostgreSQL service logs
   sudo journalctl -u postgresql -f
   
   # System authentication logs
   sudo tail -f /var/log/auth.log
   
   # System messages
   sudo tail -f /var/log/syslog
   ```

#### Performance Monitoring Commands

1. **Database Performance**:
   ```sql
   -- Active connections
   SELECT count(*) FROM pg_stat_activity WHERE state = 'active';
   
   -- Database size
   SELECT pg_size_pretty(pg_database_size('rhthotels'));
   
   -- Table sizes
   SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public' 
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   
   -- Index usage
   SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
   FROM pg_stat_user_indexes 
   ORDER BY idx_scan DESC;
   ```

2. **System Performance**:
   ```bash
   # CPU and memory usage
   htop
   
   # Disk I/O
   iostat -x 1 5
   
   # Network connections
   ss -tuln | grep 5432
   ```

### Emergency Recovery Procedures

#### Complete Service Recovery

1. **Service Won't Start**:
   ```bash
   # Check and fix common issues
   sudo systemctl stop postgresql
   sudo rm -f /var/lib/postgresql/16/main/postmaster.pid
   sudo chown -R postgres:postgres /var/lib/postgresql/16/main/
   sudo chmod 700 /var/lib/postgresql/16/main/
   sudo systemctl start postgresql
   ```

2. **Database Corruption Recovery**:
   ```bash
   # Emergency backup
   sudo cp -r /var/lib/postgresql/16/main /var/lib/postgresql/16/main.emergency
   
   # Attempt repair
   sudo -u postgres /usr/lib/postgresql/16/bin/pg_resetwal /var/lib/postgresql/16/main/
   
   # Start in single-user mode for repair
   sudo -u postgres /usr/lib/postgresql/16/bin/postgres --single -D /var/lib/postgresql/16/main/ rhthotels
   ```

3. **Complete Database Restore**:
   ```bash
   # Stop PostgreSQL
   sudo systemctl stop postgresql
   
   # Backup current state
   sudo mv /var/lib/postgresql/16/main /var/lib/postgresql/16/main.corrupted
   
   # Initialize new cluster
   sudo -u postgres /usr/lib/postgresql/16/bin/initdb -D /var/lib/postgresql/16/main
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   
   # Restore from backup
   sudo -u postgres psql < /var/backups/postgresql/latest_full_backup.sql
   ```

This comprehensive troubleshooting guide covers the most common PostgreSQL errors and provides step-by-step resolution procedures for the hotel management system.

## Resource Exhaustion

This section provides comprehensive procedures for handling CPU, memory, and disk space exhaustion issues on the Sakura VPS, including early warning signs, preventive measures, and emergency recovery procedures.

### CPU Exhaustion

#### Early Warning Signs

1. **Performance Indicators**:
   - Application response times increasing
   - Database queries taking longer than usual
   - Web pages loading slowly
   - SSH connections becoming sluggish

2. **Monitoring Metrics**:
   ```bash
   # Check current CPU usage
   htop
   
   # Check load average
   uptime
   
   # Check CPU usage over time
   sar -u 1 10
   
   # Check per-process CPU usage
   ps aux --sort=-%cpu | head -20
   ```

3. **System Load Thresholds**:
   - **Normal**: Load average < 2.0 (for 4-core system)
   - **Warning**: Load average 2.0-3.0
   - **Critical**: Load average > 4.0

#### Identifying CPU-Intensive Processes

1. **Real-time Process Monitoring**:
   ```bash
   # Interactive process viewer
   htop
   
   # Sort processes by CPU usage
   top -o %CPU
   
   # Show processes using most CPU
   ps aux --sort=-%cpu | head -10
   ```

2. **PostgreSQL-Specific CPU Analysis**:
   ```sql
   -- Find CPU-intensive queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   AND now() - pg_stat_activity.query_start > interval '30 seconds'
   ORDER BY duration DESC;
   
   -- Check for long-running transactions
   SELECT pid, now() - xact_start AS duration, query
   FROM pg_stat_activity 
   WHERE xact_start IS NOT NULL 
   AND now() - xact_start > interval '5 minutes'
   ORDER BY duration DESC;
   ```

3. **System Process Analysis**:
   ```bash
   # Check Apache processes
   ps aux | grep apache2 | wc -l
   
   # Check for runaway processes
   ps aux | awk '$3 > 50.0 {print $0}'
   
   # Check process tree
   pstree -p
   ```

#### CPU Exhaustion Resolution

1. **Immediate Actions**:
   ```bash
   # Identify and terminate problematic processes
   # First, identify the process ID (PID)
   ps aux --sort=-%cpu | head -5
   
   # Terminate specific process (use with caution)
   sudo kill -TERM [PID]
   
   # Force kill if necessary (last resort)
   sudo kill -KILL [PID]
   ```

2. **PostgreSQL Query Optimization**:
   ```sql
   -- Terminate long-running queries
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   AND now() - pg_stat_activity.query_start > interval '10 minutes';
   
   -- Cancel running queries (gentler approach)
   SELECT pg_cancel_request(pid) 
   FROM pg_stat_activity 
   WHERE state != 'idle' 
   AND now() - pg_stat_activity.query_start > interval '5 minutes';
   ```

3. **Service Management**:
   ```bash
   # Restart Apache if it's consuming too much CPU
   sudo systemctl restart apache2
   
   # Restart PostgreSQL if necessary (will cause downtime)
   sudo systemctl restart postgresql
   
   # Adjust service priorities
   sudo renice -10 $(pgrep postgres)
   ```

#### CPU Optimization Strategies

1. **PostgreSQL Optimization**:
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Adjust CPU-related settings:
   max_worker_processes = 4          # Match CPU cores
   max_parallel_workers = 2          # Limit parallel workers
   max_parallel_workers_per_gather = 1
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Query Optimization**:
   ```sql
   -- Add missing indexes to reduce CPU usage
   CREATE INDEX CONCURRENTLY idx_reservations_status ON reservations(status);
   CREATE INDEX CONCURRENTLY idx_clients_email ON clients(email);
   
   -- Update table statistics
   ANALYZE;
   
   -- Vacuum tables to improve performance
   VACUUM ANALYZE;
   ```

3. **Application-Level Optimization**:
   ```bash
   # Configure Apache to limit processes
   sudo nano /etc/apache2/mods-available/mpm_prefork.conf
   
   # Adjust settings:
   StartServers 2
   MinSpareServers 2
   MaxSpareServers 5
   MaxRequestWorkers 50
   MaxConnectionsPerChild 1000
   
   # Restart Apache
   sudo systemctl restart apache2
   ```

### Memory Exhaustion

#### Early Warning Signs

1. **System Indicators**:
   - System becoming unresponsive
   - Applications crashing unexpectedly
   - Out of memory errors in logs
   - Swap usage increasing significantly

2. **Memory Monitoring**:
   ```bash
   # Check memory usage
   free -h
   
   # Check memory usage by process
   ps aux --sort=-%mem | head -20
   
   # Check swap usage
   swapon --show
   
   # Monitor memory usage over time
   vmstat 1 10
   ```

3. **Memory Thresholds**:
   - **Normal**: Memory usage < 80%
   - **Warning**: Memory usage 80-90%
   - **Critical**: Memory usage > 95% or swap usage > 50%

#### Identifying Memory-Intensive Processes

1. **Process Memory Analysis**:
   ```bash
   # Show processes by memory usage
   ps aux --sort=-%mem | head -10
   
   # Show memory usage in MB
   ps -eo pid,ppid,cmd,%mem,%cpu --sort=-%mem | head -20
   
   # Check specific process memory usage
   pmap -d [PID]
   ```

2. **PostgreSQL Memory Analysis**:
   ```sql
   -- Check PostgreSQL memory settings
   SELECT name, setting, unit FROM pg_settings 
   WHERE name IN ('shared_buffers', 'work_mem', 'maintenance_work_mem', 'effective_cache_size');
   
   -- Check connection count (each connection uses memory)
   SELECT count(*) FROM pg_stat_activity;
   
   -- Check for memory-intensive queries
   SELECT query, calls, mean_time, total_time
   FROM pg_stat_statements 
   WHERE calls > 100
   ORDER BY mean_time DESC 
   LIMIT 10;
   ```

3. **System Memory Breakdown**:
   ```bash
   # Detailed memory information
   cat /proc/meminfo
   
   # Check memory usage by category
   cat /proc/meminfo | grep -E '^(MemTotal|MemFree|MemAvailable|Buffers|Cached|SwapTotal|SwapFree)'
   
   # Check for memory leaks
   cat /proc/slabinfo | head -20
   ```

#### Memory Exhaustion Resolution

1. **Immediate Actions**:
   ```bash
   # Clear system caches (safe operation)
   sudo sync
   sudo echo 3 > /proc/sys/vm/drop_caches
   
   # Check if this freed up memory
   free -h
   ```

2. **Terminate Memory-Intensive Processes**:
   ```bash
   # Identify processes using most memory
   ps aux --sort=-%mem | head -5
   
   # Terminate specific processes
   sudo kill -TERM [PID]
   
   # Check PostgreSQL connections
   sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Terminate idle PostgreSQL connections
   sudo -u postgres psql -c "
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE state = 'idle' 
   AND now() - state_change > interval '1 hour';"
   ```

3. **Service Optimization**:
   ```bash
   # Restart services to free memory
   sudo systemctl restart apache2
   
   # Adjust PostgreSQL memory settings temporarily
   sudo -u postgres psql -c "ALTER SYSTEM SET work_mem = '16MB';"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   ```

#### Memory Optimization Strategies

1. **PostgreSQL Memory Tuning**:
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Optimize memory settings for 4GB system:
   shared_buffers = 1GB              # 25% of RAM
   work_mem = 16MB                   # Reduce from 32MB if memory issues
   maintenance_work_mem = 256MB      # Keep for maintenance operations
   effective_cache_size = 2GB        # Reduce from 3GB
   max_connections = 50              # Reduce from 100
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Connection Pooling Implementation**:
   ```bash
   # Install PgBouncer for connection pooling
   sudo apt install pgbouncer
   
   # Configure PgBouncer
   sudo nano /etc/pgbouncer/pgbouncer.ini
   
   [databases]
   rhthotels = host=localhost port=5432 dbname=rhthotels
   
   [pgbouncer]
   listen_port = 6432
   listen_addr = 127.0.0.1
   auth_type = md5
   auth_file = /etc/pgbouncer/userlist.txt
   pool_mode = transaction
   max_client_conn = 200
   default_pool_size = 10
   reserve_pool_size = 5
   
   # Start PgBouncer
   sudo systemctl start pgbouncer
   sudo systemctl enable pgbouncer
   ```

3. **System-Level Optimization**:
   ```bash
   # Configure swap settings
   sudo nano /etc/sysctl.conf
   
   # Add or modify:
   vm.swappiness = 10                # Reduce swap usage
   vm.vfs_cache_pressure = 50        # Reduce cache pressure
   
   # Apply settings
   sudo sysctl -p
   
   # Add swap file if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```

### Disk Space Exhaustion

#### Early Warning Signs

1. **System Indicators**:
   - Applications failing to write files
   - Database write operations failing
   - Log files not being created
   - Backup operations failing

2. **Disk Space Monitoring**:
   ```bash
   # Check disk usage
   df -h
   
   # Check inode usage
   df -i
   
   # Check specific directories
   du -sh /var/lib/postgresql/
   du -sh /var/log/
   du -sh /var/www/
   
   # Find largest directories
   du -h / | sort -rh | head -20
   ```

3. **Disk Space Thresholds**:
   - **Normal**: Disk usage < 80%
   - **Warning**: Disk usage 80-90%
   - **Critical**: Disk usage > 95%

#### Identifying Disk Space Usage

1. **Large File Analysis**:
   ```bash
   # Find largest files
   find / -type f -size +100M -exec ls -lh {} \; 2>/dev/null | head -20
   
   # Find files larger than 1GB
   find / -type f -size +1G -exec ls -lh {} \; 2>/dev/null
   
   # Check PostgreSQL data directory
   du -sh /var/lib/postgresql/16/main/*
   
   # Check log files
   du -sh /var/log/*
   ```

2. **PostgreSQL-Specific Analysis**:
   ```sql
   -- Check database sizes
   SELECT datname, pg_size_pretty(pg_database_size(datname)) as size
   FROM pg_database 
   ORDER BY pg_database_size(datname) DESC;
   
   -- Check table sizes
   SELECT schemaname, tablename, 
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables 
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   
   -- Check WAL file usage
   SELECT pg_size_pretty(sum(size)) FROM pg_ls_waldir();
   ```

3. **Log File Analysis**:
   ```bash
   # Check log file sizes
   ls -lah /var/log/postgresql/
   ls -lah /var/log/apache2/
   ls -lah /var/log/
   
   # Find old log files
   find /var/log -name "*.log" -mtime +30 -ls
   find /var/log -name "*.gz" -mtime +90 -ls
   ```

#### Disk Space Exhaustion Resolution

1. **Immediate Cleanup Actions**:
   ```bash
   # Clean package cache
   sudo apt clean
   sudo apt autoremove
   
   # Clean temporary files
   sudo rm -rf /tmp/*
   sudo rm -rf /var/tmp/*
   
   # Clean old log files
   sudo find /var/log -name "*.log.*" -mtime +7 -delete
   sudo find /var/log -name "*.gz" -mtime +30 -delete
   ```

2. **PostgreSQL-Specific Cleanup**:
   ```bash
   # Clean old WAL files (if archiving is disabled)
   sudo -u postgres psql -c "SELECT pg_switch_wal();"
   sudo -u postgres psql -c "CHECKPOINT;"
   
   # Vacuum full on large tables (causes downtime)
   sudo -u postgres psql -d rhthotels -c "VACUUM FULL VERBOSE;"
   
   # Clean old PostgreSQL logs
   sudo find /var/log/postgresql -name "postgresql-*.log" -mtime +7 -delete
   ```

3. **Application Data Cleanup**:
   ```bash
   # Clean old backup files
   find /var/backups/postgresql -name "*.dump" -mtime +30 -delete
   find /var/backups/postgresql -name "*.sql" -mtime +30 -delete
   
   # Clean web server logs
   sudo find /var/log/apache2 -name "*.log.*" -mtime +14 -delete
   
   # Clean application temporary files
   sudo find /var/www/html -name "*.tmp" -mtime +1 -delete
   ```

#### Disk Space Optimization Strategies

1. **Log Rotation Configuration**:
   ```bash
   # Configure PostgreSQL log rotation
   sudo nano /etc/logrotate.d/postgresql
   
   /var/log/postgresql/*.log {
       daily
       rotate 7
       compress
       delaycompress
       missingok
       notifempty
       create 644 postgres postgres
       postrotate
           systemctl reload postgresql > /dev/null 2>&1 || true
       endscript
   }
   
   # Configure Apache log rotation
   sudo nano /etc/logrotate.d/apache2
   
   /var/log/apache2/*.log {
       daily
       rotate 14
       compress
       delaycompress
       missingok
       notifempty
       create 644 root adm
       postrotate
           systemctl reload apache2 > /dev/null 2>&1 || true
       endscript
   }
   ```

2. **PostgreSQL Optimization**:
   ```bash
   # Configure WAL archiving and cleanup
   sudo nano /etc/postgresql/16/main/postgresql.conf
   
   # Add or modify:
   wal_level = replica
   archive_mode = off                # If not using replication
   max_wal_size = 1GB               # Limit WAL size
   min_wal_size = 80MB
   checkpoint_timeout = 15min        # More frequent checkpoints
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

3. **Automated Cleanup Scripts**:
   ```bash
   # Create cleanup script
   sudo nano /usr/local/bin/disk-cleanup.sh
   
   #!/bin/bash
   # Automated disk cleanup script
   
   # Clean package cache
   apt clean
   apt autoremove -y
   
   # Clean temporary files
   find /tmp -type f -mtime +7 -delete
   find /var/tmp -type f -mtime +7 -delete
   
   # Clean old logs
   find /var/log -name "*.log.*" -mtime +14 -delete
   find /var/log -name "*.gz" -mtime +30 -delete
   
   # Clean old backups
   find /var/backups/postgresql -name "*.dump" -mtime +30 -delete
   
   # Log cleanup results
   echo "$(date): Disk cleanup completed" >> /var/log/disk-cleanup.log
   df -h >> /var/log/disk-cleanup.log
   
   # Make script executable
   sudo chmod +x /usr/local/bin/disk-cleanup.sh
   
   # Add to crontab for weekly execution
   echo "0 2 * * 0 /usr/local/bin/disk-cleanup.sh" | sudo crontab -
   ```

### Preventive Measures

#### Monitoring and Alerting

1. **Resource Monitoring Script**:
   ```bash
   # Create monitoring script
   sudo nano /usr/local/bin/resource-monitor.sh
   
   #!/bin/bash
   # Resource monitoring script
   
   # Thresholds
   CPU_THRESHOLD=80
   MEM_THRESHOLD=85
   DISK_THRESHOLD=85
   
   # Get current usage
   CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2 + $4)}')
   MEM_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
   DISK_USAGE=$(df / | tail -1 | awk '{print int($5)}' | sed 's/%//')
   
   # Check thresholds and alert
   if [ $CPU_USAGE -gt $CPU_THRESHOLD ]; then
       echo "WARNING: CPU usage is ${CPU_USAGE}%" | mail -s "CPU Alert" admin@example.com
   fi
   
   if [ $MEM_USAGE -gt $MEM_THRESHOLD ]; then
       echo "WARNING: Memory usage is ${MEM_USAGE}%" | mail -s "Memory Alert" admin@example.com
   fi
   
   if [ $DISK_USAGE -gt $DISK_THRESHOLD ]; then
       echo "WARNING: Disk usage is ${DISK_USAGE}%" | mail -s "Disk Alert" admin@example.com
   fi
   
   # Log current status
   echo "$(date): CPU=${CPU_USAGE}% MEM=${MEM_USAGE}% DISK=${DISK_USAGE}%" >> /var/log/resource-monitor.log
   
   # Make executable
   sudo chmod +x /usr/local/bin/resource-monitor.sh
   
   # Add to crontab for every 5 minutes
   echo "*/5 * * * * /usr/local/bin/resource-monitor.sh" | sudo crontab -
   ```

2. **PostgreSQL-Specific Monitoring**:
   ```sql
   -- Create monitoring function
   CREATE OR REPLACE FUNCTION check_database_health()
   RETURNS TABLE(metric text, value text, status text) AS $$
   BEGIN
       -- Check connection count
       RETURN QUERY
       SELECT 'connections'::text, 
              (SELECT count(*)::text FROM pg_stat_activity),
              CASE WHEN (SELECT count(*) FROM pg_stat_activity) > 80 
                   THEN 'WARNING' ELSE 'OK' END;
       
       -- Check database size
       RETURN QUERY
       SELECT 'database_size'::text,
              pg_size_pretty(pg_database_size(current_database())),
              'OK'::text;
       
       -- Check long-running queries
       RETURN QUERY
       SELECT 'long_queries'::text,
              (SELECT count(*)::text FROM pg_stat_activity 
               WHERE state != 'idle' 
               AND now() - query_start > interval '5 minutes'),
              CASE WHEN (SELECT count(*) FROM pg_stat_activity 
                        WHERE state != 'idle' 
                        AND now() - query_start > interval '5 minutes') > 0
                   THEN 'WARNING' ELSE 'OK' END;
   END;
   $$ LANGUAGE plpgsql;
   ```

#### Capacity Planning

1. **Growth Trend Analysis**:
   ```bash
   # Create capacity monitoring script
   sudo nano /usr/local/bin/capacity-monitor.sh
   
   #!/bin/bash
   # Capacity monitoring and trend analysis
   
   LOG_FILE="/var/log/capacity-trends.log"
   
   # Collect metrics
   CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
   MEM_USED=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
   DISK_USED=$(df / | tail -1 | awk '{print int($5)}' | sed 's/%//')
   DB_SIZE=$(sudo -u postgres psql -t -c "SELECT pg_size_pretty(pg_database_size('rhthotels'));" | xargs)
   
   # Log metrics with timestamp
   echo "$(date '+%Y-%m-%d %H:%M:%S'),${CPU_LOAD},${MEM_USED},${DISK_USED},${DB_SIZE}" >> $LOG_FILE
   
   # Keep only last 30 days of data
   tail -n 8640 $LOG_FILE > ${LOG_FILE}.tmp && mv ${LOG_FILE}.tmp $LOG_FILE
   
   # Make executable and schedule
   sudo chmod +x /usr/local/bin/capacity-monitor.sh
   echo "0 */4 * * * /usr/local/bin/capacity-monitor.sh" | sudo crontab -
   ```

2. **Scaling Recommendations**:
   ```bash
   # Create scaling analysis script
   sudo nano /usr/local/bin/scaling-analysis.sh
   
   #!/bin/bash
   # Analyze trends and provide scaling recommendations
   
   LOG_FILE="/var/log/capacity-trends.log"
   
   if [ -f "$LOG_FILE" ]; then
       # Analyze last 7 days of data
       RECENT_DATA=$(tail -n 42 $LOG_FILE)  # 7 days * 6 samples per day
       
       # Calculate averages
       AVG_CPU=$(echo "$RECENT_DATA" | awk -F',' '{sum+=$2} END {print sum/NR}')
       AVG_MEM=$(echo "$RECENT_DATA" | awk -F',' '{sum+=$3} END {print sum/NR}')
       AVG_DISK=$(echo "$RECENT_DATA" | awk -F',' '{sum+=$4} END {print sum/NR}')
       
       # Generate recommendations
       echo "Scaling Analysis Report - $(date)"
       echo "================================="
       echo "7-day averages:"
       echo "CPU Load: $AVG_CPU"
       echo "Memory Usage: $AVG_MEM%"
       echo "Disk Usage: $AVG_DISK%"
       echo ""
       
       # Provide recommendations
       if (( $(echo "$AVG_CPU > 2.0" | bc -l) )); then
           echo "RECOMMENDATION: Consider CPU upgrade (current load: $AVG_CPU)"
       fi
       
       if (( $(echo "$AVG_MEM > 75" | bc -l) )); then
           echo "RECOMMENDATION: Consider memory upgrade (current usage: $AVG_MEM%)"
       fi
       
       if (( $(echo "$AVG_DISK > 70" | bc -l) )); then
           echo "RECOMMENDATION: Consider storage upgrade (current usage: $AVG_DISK%)"
       fi
   fi
   ```

This comprehensive resource exhaustion handling guide provides proactive monitoring, immediate resolution procedures, and long-term optimization strategies for maintaining optimal system performance.

## DoS Attack Identification and Response

This section provides comprehensive procedures for identifying ongoing DoS (Denial of Service) attacks from scraper bots and other malicious traffic, along with immediate response procedures to protect the hotel management system.

### DoS Attack Identification

#### Common Attack Patterns

1. **HTTP Flood Attacks**:
   - High volume of HTTP requests from multiple IPs
   - Requests targeting resource-intensive pages
   - Unusual user agent strings or patterns
   - Rapid-fire requests from single sources

2. **Database Connection Attacks**:
   - Excessive database connection attempts
   - Connection exhaustion attacks
   - SQL injection attempts
   - Authentication brute force attacks

3. **Scraper Bot Attacks**:
   - Automated crawling of entire website
   - Ignoring robots.txt directives
   - High-frequency requests for data extraction
   - Unusual request patterns and timing

#### Early Warning Signs

1. **Performance Indicators**:
   ```bash
   # Check system load
   uptime
   
   # Monitor active connections
   netstat -an | grep :80 | wc -l
   netstat -an | grep :443 | wc -l
   
   # Check PostgreSQL connections
   sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"
   
   # Monitor network traffic
   iftop -i eth0
   ```

2. **Application Symptoms**:
   - Website becomes slow or unresponsive
   - Database queries timing out
   - High CPU and memory usage
   - Increased error rates in logs
   - Legitimate users unable to access services

3. **Log Pattern Analysis**:
   ```bash
   # Check Apache access logs for unusual patterns
   tail -f /var/log/apache2/access.log
   
   # Count requests per IP
   awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -nr | head -20
   
   # Check for rapid requests
   grep "$(date '+%d/%b/%Y:%H:%M')" /var/log/apache2/access.log | wc -l
   
   # Check PostgreSQL logs for connection attempts
   grep "connection" /var/log/postgresql/postgresql-*.log | tail -20
   ```

#### Attack Detection Scripts

1. **Real-time Attack Detection**:
   ```bash
   # Create attack detection script
   sudo nano /usr/local/bin/detect-dos-attack.sh
   
   #!/bin/bash
   # DoS Attack Detection Script
   
   # Configuration
   LOG_FILE="/var/log/dos-detection.log"
   ALERT_EMAIL="admin@example.com"
   
   # Thresholds
   MAX_CONNECTIONS_PER_IP=50
   MAX_REQUESTS_PER_MINUTE=100
   MAX_DB_CONNECTIONS=80
   
   # Function to log messages
   log_message() {
       echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
   }
   
   # Function to send alerts
   send_alert() {
       local subject="$1"
       local message="$2"
       echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
       log_message "ALERT: $subject"
   }
   
   log_message "Starting DoS attack detection scan"
   
   # Check HTTP connections per IP
   HIGH_CONN_IPS=$(netstat -an | grep :80 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | awk -v max=$MAX_CONNECTIONS_PER_IP '$1 > max {print $2 " (" $1 " connections)"}')
   
   if [ -n "$HIGH_CONN_IPS" ]; then
       send_alert "DoS Attack Detected - High HTTP Connections" "IPs with excessive connections:\n$HIGH_CONN_IPS"
   fi
   
   # Check recent requests per IP
   CURRENT_MINUTE=$(date '+%d/%b/%Y:%H:%M')
   HIGH_REQ_IPS=$(grep "$CURRENT_MINUTE" /var/log/apache2/access.log | awk '{print $1}' | sort | uniq -c | awk -v max=$MAX_REQUESTS_PER_MINUTE '$1 > max {print $2 " (" $1 " requests)"}')
   
   if [ -n "$HIGH_REQ_IPS" ]; then
       send_alert "DoS Attack Detected - High Request Rate" "IPs with excessive requests in last minute:\n$HIGH_REQ_IPS"
   fi
   
   # Check database connections
   DB_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
   if [ "$DB_CONNECTIONS" -gt "$MAX_DB_CONNECTIONS" ]; then
       send_alert "DoS Attack Detected - Database Connection Exhaustion" "Current database connections: $DB_CONNECTIONS (threshold: $MAX_DB_CONNECTIONS)"
   fi
   
   # Check for common attack patterns
   ATTACK_PATTERNS=$(grep -E "(sqlmap|nikto|nmap|masscan|zmap)" /var/log/apache2/access.log | tail -10)
   if [ -n "$ATTACK_PATTERNS" ]; then
       send_alert "Security Scan Detected" "Attack tool signatures found in logs:\n$ATTACK_PATTERNS"
   fi
   
   log_message "DoS attack detection scan completed"
   
   # Make script executable
   sudo chmod +x /usr/local/bin/detect-dos-attack.sh
   
   # Schedule to run every minute
   echo "* * * * * /usr/local/bin/detect-dos-attack.sh" | sudo crontab -
   ```

2. **Advanced Pattern Analysis**:
   ```bash
   # Create advanced analysis script
   sudo nano /usr/local/bin/analyze-attack-patterns.sh
   
   #!/bin/bash
   # Advanced Attack Pattern Analysis
   
   LOG_FILE="/var/log/apache2/access.log"
   ANALYSIS_LOG="/var/log/attack-analysis.log"
   
   echo "Attack Pattern Analysis - $(date)" >> "$ANALYSIS_LOG"
   echo "=================================" >> "$ANALYSIS_LOG"
   
   # Top requesting IPs in last hour
   echo "Top 10 IPs by request count (last hour):" >> "$ANALYSIS_LOG"
   grep "$(date -d '1 hour ago' '+%d/%b/%Y:%H')" "$LOG_FILE" | \
   awk '{print $1}' | sort | uniq -c | sort -nr | head -10 >> "$ANALYSIS_LOG"
   
   # Most requested URLs
   echo -e "\nMost requested URLs:" >> "$ANALYSIS_LOG"
   awk '{print $7}' "$LOG_FILE" | sort | uniq -c | sort -nr | head -10 >> "$ANALYSIS_LOG"
   
   # Suspicious user agents
   echo -e "\nSuspicious User Agents:" >> "$ANALYSIS_LOG"
   grep -E "(bot|crawler|spider|scraper)" "$LOG_FILE" | \
   awk -F'"' '{print $6}' | sort | uniq -c | sort -nr | head -10 >> "$ANALYSIS_LOG"
   
   # HTTP status code distribution
   echo -e "\nHTTP Status Codes:" >> "$ANALYSIS_LOG"
   awk '{print $9}' "$LOG_FILE" | sort | uniq -c | sort -nr >> "$ANALYSIS_LOG"
   
   # Geographic analysis (if GeoIP is available)
   if command -v geoiplookup >/dev/null 2>&1; then
       echo -e "\nTop countries by request count:" >> "$ANALYSIS_LOG"
       awk '{print $1}' "$LOG_FILE" | head -100 | \
       while read ip; do geoiplookup "$ip" | cut -d: -f2; done | \
       sort | uniq -c | sort -nr | head -10 >> "$ANALYSIS_LOG"
   fi
   
   echo -e "\n" >> "$ANALYSIS_LOG"
   ```

### Immediate Response Procedures

#### Emergency Response Steps

1. **Immediate Threat Mitigation**:
   ```bash
   # Block attacking IPs immediately
   # First, identify the attacking IPs
   ATTACKING_IPS=$(netstat -an | grep :80 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | awk '$1 > 50 {print $2}')
   
   # Block IPs using UFW
   for ip in $ATTACKING_IPS; do
       sudo ufw deny from "$ip"
       echo "Blocked IP: $ip"
   done
   
   # Or block using iptables for immediate effect
   for ip in $ATTACKING_IPS; do
       sudo iptables -I INPUT -s "$ip" -j DROP
       echo "Blocked IP with iptables: $ip"
   done
   ```

2. **Service Protection**:
   ```bash
   # Limit Apache connections
   sudo nano /etc/apache2/mods-available/evasive.conf
   
   # Enable mod_evasive if not already enabled
   sudo a2enmod evasive
   
   # Configure mod_evasive
   <IfModule mod_evasive24.c>
       DOSHashTableSize    2048
       DOSPageCount        5
       DOSSiteCount        50
       DOSPageInterval     1
       DOSSiteInterval     1
       DOSBlockingPeriod   600
       DOSEmailNotify      admin@example.com
       DOSLogDir           /var/log/apache2/dos
   </IfModule>
   
   # Restart Apache
   sudo systemctl restart apache2
   ```

3. **Database Protection**:
   ```bash
   # Limit PostgreSQL connections temporarily
   sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 50;"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   
   # Terminate suspicious database connections
   sudo -u postgres psql -c "
   SELECT pg_terminate_backend(pid) 
   FROM pg_stat_activity 
   WHERE usename != 'postgres' 
   AND state = 'idle' 
   AND now() - state_change > interval '5 minutes';"
   ```

#### Fail2ban Configuration for DoS Protection

1. **Enhanced Fail2ban Setup**:
   ```bash
   # Create custom fail2ban filter for DoS attacks
   sudo nano /etc/fail2ban/filter.d/apache-dos.conf
   
   [Definition]
   failregex = ^<HOST> -.*"(GET|POST).*" (200|404|301|302) .*$
   ignoreregex =
   
   # Create jail for DoS protection
   sudo nano /etc/fail2ban/jail.d/apache-dos.conf
   
   [apache-dos]
   enabled = true
   port = http,https
   filter = apache-dos
   logpath = /var/log/apache2/access.log
   maxretry = 100
   findtime = 60
   bantime = 3600
   action = iptables[name=HTTP, port=http, protocol=tcp]
            sendmail-whois[name=HTTP, dest=admin@example.com]
   
   # Create filter for scraper bots
   sudo nano /etc/fail2ban/filter.d/apache-scraper.conf
   
   [Definition]
   failregex = ^<HOST> -.*"(GET|POST).*" 200 .*"(.*bot.*|.*crawler.*|.*spider.*|.*scraper.*)"$
   ignoreregex =
   
   # Create jail for scrapers
   sudo nano /etc/fail2ban/jail.d/apache-scraper.conf
   
   [apache-scraper]
   enabled = true
   port = http,https
   filter = apache-scraper
   logpath = /var/log/apache2/access.log
   maxretry = 20
   findtime = 300
   bantime = 7200
   action = iptables[name=SCRAPER, port=http, protocol=tcp]
   
   # Restart fail2ban
   sudo systemctl restart fail2ban
   ```

2. **PostgreSQL-Specific Protection**:
   ```bash
   # Create PostgreSQL DoS filter
   sudo nano /etc/fail2ban/filter.d/postgresql-dos.conf
   
   [Definition]
   failregex = ^.*LOG:.*connection received: host=<HOST> port=.*$
               ^.*FATAL:.*too many connections for role.*host=<HOST>.*$
               ^.*FATAL:.*remaining connection slots are reserved.*host=<HOST>.*$
   ignoreregex =
   
   # Create PostgreSQL DoS jail
   sudo nano /etc/fail2ban/jail.d/postgresql-dos.conf
   
   [postgresql-dos]
   enabled = true
   port = 5432
   filter = postgresql-dos
   logpath = /var/log/postgresql/postgresql-*.log
   maxretry = 10
   findtime = 60
   bantime = 1800
   action = iptables[name=POSTGRES-DOS, port=5432, protocol=tcp]
   
   # Restart fail2ban
   sudo systemctl restart fail2ban
   ```

#### Rate Limiting Implementation

1. **Apache Rate Limiting**:
   ```bash
   # Enable mod_limitipconn
   sudo a2enmod limitipconn
   
   # Configure rate limiting
   sudo nano /etc/apache2/sites-available/000-default.conf
   
   # Add inside VirtualHost:
   <Location />
       # Limit to 10 concurrent connections per IP
       MaxConnPerIP 10
       
       # Limit requests per second
       <RequireAll>
           Require all granted
           Require expr %{HTTP:X-Forwarded-For} != ""
       </RequireAll>
   </Location>
   
   # Restart Apache
   sudo systemctl restart apache2
   ```

2. **Nginx Rate Limiting** (if using Nginx):
   ```bash
   # Configure rate limiting in nginx.conf
   sudo nano /etc/nginx/nginx.conf
   
   http {
       # Define rate limiting zones
       limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
       limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
       limit_req_zone $binary_remote_addr zone=general:10m rate=5r/s;
       
       # Connection limiting
       limit_conn_zone $binary_remote_addr zone=conn_limit_per_ip:10m;
       limit_conn conn_limit_per_ip 10;
   }
   
   # Apply in server block
   server {
       location /api/ {
           limit_req zone=api burst=20 nodelay;
       }
       
       location /login {
           limit_req zone=login burst=5 nodelay;
       }
       
       location / {
           limit_req zone=general burst=10 nodelay;
       }
   }
   ```

### Attack Response Automation

#### Automated Response Script

1. **Comprehensive Response Automation**:
   ```bash
   # Create automated response script
   sudo nano /usr/local/bin/dos-response.sh
   
   #!/bin/bash
   # Automated DoS Attack Response Script
   
   # Configuration
   LOG_FILE="/var/log/dos-response.log"
   ALERT_EMAIL="admin@example.com"
   BACKUP_DIR="/var/backups/emergency"
   
   # Thresholds for automatic response
   CRITICAL_LOAD_THRESHOLD=8.0
   CRITICAL_CONNECTIONS=200
   CRITICAL_DB_CONNECTIONS=90
   
   # Function to log messages
   log_message() {
       echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
   }
   
   # Function to send critical alerts
   send_critical_alert() {
       local subject="$1"
       local message="$2"
       echo "$message" | mail -s "CRITICAL: $subject" "$ALERT_EMAIL"
       log_message "CRITICAL ALERT: $subject"
   }
   
   # Check system load
   CURRENT_LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
   if (( $(echo "$CURRENT_LOAD > $CRITICAL_LOAD_THRESHOLD" | bc -l) )); then
       log_message "CRITICAL: System load is $CURRENT_LOAD (threshold: $CRITICAL_LOAD_THRESHOLD)"
       
       # Emergency response actions
       log_message "Initiating emergency response procedures"
       
       # 1. Block top attacking IPs
       TOP_ATTACKERS=$(netstat -an | grep :80 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -5 | awk '$1 > 20 {print $2}')
       for ip in $TOP_ATTACKERS; do
           sudo iptables -I INPUT -s "$ip" -j DROP
           log_message "Emergency block: $ip"
       done
       
       # 2. Reduce Apache processes
       sudo systemctl reload apache2
       
       # 3. Limit database connections
       sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 30;" >/dev/null 2>&1
       sudo -u postgres psql -c "SELECT pg_reload_conf();" >/dev/null 2>&1
       
       # 4. Enable maintenance mode (if available)
       if [ -f "/var/www/html/maintenance.html" ]; then
           sudo cp /var/www/html/maintenance.html /var/www/html/index.html.maintenance
           log_message "Maintenance mode activated"
       fi
       
       # 5. Send critical alert
       send_critical_alert "DoS Attack - Emergency Response Activated" "System load: $CURRENT_LOAD\nEmergency measures activated:\n- Top attackers blocked\n- Services limited\n- Database connections reduced"
   fi
   
   # Check HTTP connections
   HTTP_CONNECTIONS=$(netstat -an | grep :80 | wc -l)
   if [ "$HTTP_CONNECTIONS" -gt "$CRITICAL_CONNECTIONS" ]; then
       log_message "CRITICAL: HTTP connections: $HTTP_CONNECTIONS (threshold: $CRITICAL_CONNECTIONS)"
       
       # Block IPs with most connections
       netstat -an | grep :80 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -10 | awk '$1 > 30 {print $2}' | while read ip; do
           sudo iptables -I INPUT -s "$ip" -j DROP
           log_message "Blocked high-connection IP: $ip"
       done
   fi
   
   # Check database connections
   DB_CONNECTIONS=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
   if [ "$DB_CONNECTIONS" -gt "$CRITICAL_DB_CONNECTIONS" ]; then
       log_message "CRITICAL: Database connections: $DB_CONNECTIONS (threshold: $CRITICAL_DB_CONNECTIONS)"
       
       # Terminate idle connections
       sudo -u postgres psql -c "
       SELECT pg_terminate_backend(pid) 
       FROM pg_stat_activity 
       WHERE state = 'idle' 
       AND now() - state_change > interval '2 minutes';" >/dev/null 2>&1
       
       log_message "Terminated idle database connections"
   fi
   
   log_message "DoS response check completed"
   
   # Make script executable
   sudo chmod +x /usr/local/bin/dos-response.sh
   
   # Schedule to run every 2 minutes during attacks
   echo "*/2 * * * * /usr/local/bin/dos-response.sh" | sudo crontab -
   ```

#### Recovery Procedures

1. **Post-Attack Recovery**:
   ```bash
   # Create recovery script
   sudo nano /usr/local/bin/post-attack-recovery.sh
   
   #!/bin/bash
   # Post-Attack Recovery Script
   
   LOG_FILE="/var/log/post-attack-recovery.log"
   
   log_message() {
       echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
   }
   
   log_message "Starting post-attack recovery procedures"
   
   # 1. Restore normal service limits
   log_message "Restoring normal service configuration"
   
   # Restore PostgreSQL connection limit
   sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 100;"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   
   # 2. Remove temporary IP blocks (keep permanent ones)
   log_message "Reviewing IP blocks"
   
   # List current iptables rules
   sudo iptables -L INPUT -n --line-numbers | grep DROP
   
   # 3. Disable maintenance mode
   if [ -f "/var/www/html/index.html.maintenance" ]; then
       sudo rm /var/www/html/index.html.maintenance
       log_message "Maintenance mode disabled"
   fi
   
   # 4. Restart services for clean state
   log_message "Restarting services"
   sudo systemctl restart apache2
   sudo systemctl restart fail2ban
   
   # 5. Generate attack report
   log_message "Generating attack report"
   
   REPORT_FILE="/var/log/attack-report-$(date +%Y%m%d-%H%M%S).txt"
   
   cat > "$REPORT_FILE" << EOF
   DoS Attack Report - $(date)
   ===========================
   
   Attack Duration: [Manual entry required]
   Peak System Load: $(uptime)
   
   Top Attacking IPs:
   $(awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -nr | head -20)
   
   Blocked IPs:
   $(sudo iptables -L INPUT -n | grep DROP)
   
   Fail2ban Status:
   $(sudo fail2ban-client status)
   
   Current System Status:
   CPU Load: $(uptime)
   Memory Usage: $(free -h)
   Disk Usage: $(df -h /)
   Database Connections: $(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)
   
   EOF
   
   log_message "Attack report generated: $REPORT_FILE"
   
   # 6. Send recovery notification
   echo "DoS attack recovery completed. System restored to normal operation." | \
   mail -s "DoS Attack Recovery Complete" admin@example.com
   
   log_message "Post-attack recovery completed"
   ```

### Monitoring and Prevention

#### Continuous Monitoring Setup

1. **Real-time Monitoring Dashboard**:
   ```bash
   # Create monitoring dashboard script
   sudo nano /usr/local/bin/security-dashboard.sh
   
   #!/bin/bash
   # Security Monitoring Dashboard
   
   clear
   echo "Security Monitoring Dashboard - $(date)"
   echo "======================================="
   
   # System load
   echo "System Load:"
   uptime
   echo ""
   
   # Network connections
   echo "Network Connections:"
   echo "HTTP (port 80): $(netstat -an | grep :80 | wc -l)"
   echo "HTTPS (port 443): $(netstat -an | grep :443 | wc -l)"
   echo "PostgreSQL (port 5432): $(netstat -an | grep :5432 | wc -l)"
   echo ""
   
   # Top connecting IPs
   echo "Top 10 Connecting IPs:"
   netstat -an | grep :80 | awk '{print $5}' | cut -d: -f1 | sort | uniq -c | sort -nr | head -10
   echo ""
   
   # Database connections
   echo "Database Status:"
   echo "Active connections: $(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)"
   echo "Long-running queries: $(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state != 'idle' AND now() - query_start > interval '1 minute';" | xargs)"
   echo ""
   
   # Fail2ban status
   echo "Fail2ban Status:"
   sudo fail2ban-client status | grep "Jail list" | cut -d: -f2 | tr ',' '\n' | while read jail; do
       if [ -n "$jail" ]; then
           banned=$(sudo fail2ban-client status "$jail" 2>/dev/null | grep "Currently banned" | awk '{print $4}')
           echo "$jail: $banned banned IPs"
       fi
   done
   echo ""
   
   # Recent attacks
   echo "Recent Attack Indicators (last 5 minutes):"
   grep "$(date -d '5 minutes ago' '+%H:%M')" /var/log/apache2/access.log | \
   awk '{print $1}' | sort | uniq -c | sort -nr | head -5
   
   # Make executable
   sudo chmod +x /usr/local/bin/security-dashboard.sh
   
   # Create alias for easy access
   echo "alias security='sudo /usr/local/bin/security-dashboard.sh'" >> ~/.bashrc
   ```

2. **Automated Threat Intelligence**:
   ```bash
   # Create threat intelligence script
   sudo nano /usr/local/bin/threat-intelligence.sh
   
   #!/bin/bash
   # Threat Intelligence and IP Reputation Check
   
   LOG_FILE="/var/log/threat-intelligence.log"
   SUSPICIOUS_IPS="/tmp/suspicious_ips.txt"
   
   # Extract unique IPs from recent logs
   awk '{print $1}' /var/log/apache2/access.log | sort -u > "$SUSPICIOUS_IPS"
   
   # Check IPs against threat intelligence (example using AbuseIPDB API)
   # Note: Requires API key from AbuseIPDB
   API_KEY="your_abuseipdb_api_key"
   
   while read -r ip; do
       if [[ $ip =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
           # Check IP reputation (example - replace with actual API call)
           # REPUTATION=$(curl -s "https://api.abuseipdb.com/api/v2/check" \
           #   -H "Key: $API_KEY" \
           #   -H "Accept: application/json" \
           #   --data-urlencode "ipAddress=$ip")
           
           # For now, just log the IP for manual review
           echo "$(date): Checking IP $ip" >> "$LOG_FILE"
       fi
   done < "$SUSPICIOUS_IPS"
   
   # Clean up
   rm "$SUSPICIOUS_IPS"
   ```

This comprehensive DoS attack identification and response guide provides proactive detection, immediate response procedures, and automated protection mechanisms to safeguard the hotel management system from various types of attacks.

## Log Analysis Guide

This section provides comprehensive guidance on analyzing important log files and their locations, including examples of critical log patterns to monitor for the hotel management system.

### Log File Locations and Purposes

#### System Logs

1. **System Messages**:
   ```bash
   # Main system log
   /var/log/syslog                    # General system messages
   /var/log/messages                  # System messages (on some distributions)
   
   # Authentication logs
   /var/log/auth.log                  # Authentication attempts and sudo usage
   /var/log/secure                    # Security-related messages (on some distributions)
   
   # Kernel messages
   /var/log/kern.log                  # Kernel messages
   /var/log/dmesg                     # Boot messages
   
   # System service logs (systemd)
   journalctl                         # Systemd journal (all services)
   ```

2. **Application Logs**:
   ```bash
   # Web server logs
   /var/log/apache2/access.log        # Apache access log
   /var/log/apache2/error.log         # Apache error log
   /var/log/nginx/access.log          # Nginx access log (if using Nginx)
   /var/log/nginx/error.log           # Nginx error log (if using Nginx)
   
   # Database logs
   /var/log/postgresql/postgresql-*.log  # PostgreSQL logs
   
   # Security logs
   /var/log/fail2ban.log              # Fail2ban activity
   /var/log/ufw.log                   # UFW firewall logs
   
   # Application-specific logs
   /var/log/hotel-management/         # Custom application logs
   ```

#### Log File Characteristics

| Log File | Update Frequency | Typical Size | Retention Period |
|----------|------------------|--------------|------------------|
| /var/log/syslog | Continuous | 10-100MB/day | 7-30 days |
| /var/log/auth.log | Per authentication | 1-10MB/day | 30-90 days |
| /var/log/apache2/access.log | Per request | 50-500MB/day | 14-30 days |
| /var/log/apache2/error.log | Per error | 1-50MB/day | 30-90 days |
| /var/log/postgresql/*.log | Continuous | 10-100MB/day | 7-30 days |
| /var/log/fail2ban.log | Per action | 1-10MB/day | 30-90 days |

### Critical Log Patterns to Monitor

#### Security-Related Patterns

1. **Authentication Failures**:
   ```bash
   # SSH brute force attempts
   grep "Failed password" /var/log/auth.log
   
   # Example patterns to watch for:
   # Failed password for root from 192.168.1.100 port 22 ssh2
   # Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
   
   # Multiple failures from same IP
   grep "Failed password" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr
   
   # Successful logins after failures (potential breach)
   grep -A5 -B5 "Accepted password" /var/log/auth.log | grep -E "(Failed|Accepted)"
   ```

2. **Privilege Escalation Attempts**:
   ```bash
   # Sudo usage monitoring
   grep "sudo:" /var/log/auth.log
   
   # Failed sudo attempts
   grep "sudo:.*COMMAND" /var/log/auth.log | grep -v "successful"
   
   # Root access attempts
   grep "su:" /var/log/auth.log
   
   # Example patterns:
   # user : TTY=pts/0 ; PWD=/home/user ; USER=root ; COMMAND=/bin/bash
   # user : 3 incorrect password attempts ; TTY=pts/0
   ```

3. **Suspicious Network Activity**:
   ```bash
   # Port scanning attempts
   grep -E "(nmap|masscan|zmap)" /var/log/apache2/access.log
   
   # SQL injection attempts
   grep -iE "(union|select|insert|delete|drop|exec)" /var/log/apache2/access.log
   
   # Directory traversal attempts
   grep -E "\.\./\.\." /var/log/apache2/access.log
   
   # Common attack tools
   grep -iE "(sqlmap|nikto|dirb|gobuster|wpscan)" /var/log/apache2/access.log
   ```

#### Performance-Related Patterns

1. **High Resource Usage**:
   ```bash
   # Out of memory errors
   grep -i "out of memory" /var/log/syslog
   grep -i "killed process" /var/log/syslog
   
   # Disk space issues
   grep -i "no space left" /var/log/syslog
   grep -i "disk full" /var/log/syslog
   
   # High load warnings
   grep -i "load average" /var/log/syslog
   ```

2. **Database Performance Issues**:
   ```bash
   # Slow queries
   grep -i "slow query" /var/log/postgresql/postgresql-*.log
   
   # Connection issues
   grep -i "too many connections" /var/log/postgresql/postgresql-*.log
   grep -i "connection refused" /var/log/postgresql/postgresql-*.log
   
   # Lock timeouts
   grep -i "deadlock" /var/log/postgresql/postgresql-*.log
   grep -i "lock timeout" /var/log/postgresql/postgresql-*.log
   
   # Example patterns:
   # LOG: duration: 5432.123 ms statement: SELECT * FROM large_table
   # FATAL: sorry, too many clients already
   # ERROR: deadlock detected
   ```

3. **Web Server Performance**:
   ```bash
   # 5xx server errors
   awk '$9 ~ /^5/ {print $0}' /var/log/apache2/access.log
   
   # Slow response times (if logged)
   awk '$NF > 5000000 {print $0}' /var/log/apache2/access.log  # > 5 seconds
   
   # High traffic patterns
   awk '{print $4}' /var/log/apache2/access.log | cut -d: -f2 | sort | uniq -c | sort -nr
   ```

### Log Analysis Tools and Techniques

#### Command-Line Analysis Tools

1. **Basic Text Processing**:
   ```bash
   # View recent log entries
   tail -f /var/log/syslog
   tail -n 100 /var/log/apache2/access.log
   
   # Search for specific patterns
   grep -i "error" /var/log/apache2/error.log
   grep -E "^$(date '+%b %d')" /var/log/syslog
   
   # Count occurrences
   grep -c "Failed password" /var/log/auth.log
   
   # Extract specific fields
   awk '{print $1, $4, $5}' /var/log/syslog
   cut -d' ' -f1,4,5 /var/log/syslog
   ```

2. **Advanced Pattern Analysis**:
   ```bash
   # Time-based analysis
   grep "$(date '+%b %d %H')" /var/log/syslog  # Current hour
   grep "$(date -d '1 hour ago' '+%b %d %H')" /var/log/syslog  # Previous hour
   
   # Statistical analysis
   awk '{print $1}' /var/log/apache2/access.log | sort | uniq -c | sort -nr | head -20
   
   # Complex pattern matching
   grep -E "^[A-Za-z]{3} [0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}" /var/log/syslog
   ```

3. **Log Correlation**:
   ```bash
   # Correlate events across multiple logs
   TIMESTAMP="Jul 17 10:30"
   grep "$TIMESTAMP" /var/log/syslog /var/log/auth.log /var/log/apache2/error.log
   
   # Find related events
   IP="192.168.1.100"
   grep "$IP" /var/log/apache2/access.log /var/log/auth.log /var/log/fail2ban.log
   ```

#### Automated Log Analysis Scripts

1. **Security Analysis Script**:
   ```bash
   # Create security log analysis script
   sudo nano /usr/local/bin/security-log-analysis.sh
   
   #!/bin/bash
   # Security Log Analysis Script
   
   REPORT_FILE="/var/log/security-analysis-$(date +%Y%m%d).txt"
   
   echo "Security Log Analysis Report - $(date)" > "$REPORT_FILE"
   echo "=======================================" >> "$REPORT_FILE"
   
   # Failed SSH attempts
   echo -e "\nFailed SSH Login Attempts (Top 10 IPs):" >> "$REPORT_FILE"
   grep "Failed password" /var/log/auth.log | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head -10 >> "$REPORT_FILE"
   
   # Successful logins
   echo -e "\nSuccessful SSH Logins:" >> "$REPORT_FILE"
   grep "Accepted password" /var/log/auth.log | tail -20 >> "$REPORT_FILE"
   
   # Sudo usage
   echo -e "\nSudo Command Usage:" >> "$REPORT_FILE"
   grep "sudo:" /var/log/auth.log | tail -20 >> "$REPORT_FILE"
   
   # Web attack attempts
   echo -e "\nWeb Attack Attempts:" >> "$REPORT_FILE"
   grep -iE "(union|select|insert|delete|drop|exec|\.\./\.\.)" /var/log/apache2/access.log | tail -20 >> "$REPORT_FILE"
   
   # Fail2ban actions
   echo -e "\nFail2ban Actions:" >> "$REPORT_FILE"
   grep -E "(Ban|Unban)" /var/log/fail2ban.log | tail -20 >> "$REPORT_FILE"
   
   # UFW blocked connections
   echo -e "\nFirewall Blocked Connections:" >> "$REPORT_FILE"
   grep "UFW BLOCK" /var/log/ufw.log | tail -20 >> "$REPORT_FILE"
   
   echo "Security analysis completed. Report saved to: $REPORT_FILE"
   
   # Make executable
   sudo chmod +x /usr/local/bin/security-log-analysis.sh
   ```

2. **Performance Analysis Script**:
   ```bash
   # Create performance log analysis script
   sudo nano /usr/local/bin/performance-log-analysis.sh
   
   #!/bin/bash
   # Performance Log Analysis Script
   
   REPORT_FILE="/var/log/performance-analysis-$(date +%Y%m%d).txt"
   
   echo "Performance Log Analysis Report - $(date)" > "$REPORT_FILE"
   echo "=========================================" >> "$REPORT_FILE"
   
   # System errors
   echo -e "\nSystem Errors:" >> "$REPORT_FILE"
   grep -i "error" /var/log/syslog | tail -20 >> "$REPORT_FILE"
   
   # Memory issues
   echo -e "\nMemory-Related Issues:" >> "$REPORT_FILE"
   grep -iE "(out of memory|killed process|oom)" /var/log/syslog >> "$REPORT_FILE"
   
   # Disk space issues
   echo -e "\nDisk Space Issues:" >> "$REPORT_FILE"
   grep -iE "(no space left|disk full)" /var/log/syslog >> "$REPORT_FILE"
   
   # Apache errors
   echo -e "\nApache Errors (Last 50):" >> "$REPORT_FILE"
   tail -50 /var/log/apache2/error.log >> "$REPORT_FILE"
   
   # PostgreSQL errors
   echo -e "\nPostgreSQL Errors:" >> "$REPORT_FILE"
   grep -iE "(error|fatal|panic)" /var/log/postgresql/postgresql-*.log | tail -20 >> "$REPORT_FILE"
   
   # Slow queries
   echo -e "\nSlow PostgreSQL Queries:" >> "$REPORT_FILE"
   grep -E "duration: [0-9]{4,}" /var/log/postgresql/postgresql-*.log | tail -10 >> "$REPORT_FILE"
   
   # HTTP 5xx errors
   echo -e "\nHTTP 5xx Errors:" >> "$REPORT_FILE"
   awk '$9 ~ /^5/ {print $0}' /var/log/apache2/access.log | tail -20 >> "$REPORT_FILE"
   
   echo "Performance analysis completed. Report saved to: $REPORT_FILE"
   
   # Make executable
   sudo chmod +x /usr/local/bin/performance-log-analysis.sh
   ```

3. **Traffic Analysis Script**:
   ```bash
   # Create traffic analysis script
   sudo nano /usr/local/bin/traffic-log-analysis.sh
   
   #!/bin/bash
   # Traffic Log Analysis Script
   
   REPORT_FILE="/var/log/traffic-analysis-$(date +%Y%m%d).txt"
   ACCESS_LOG="/var/log/apache2/access.log"
   
   echo "Traffic Log Analysis Report - $(date)" > "$REPORT_FILE"
   echo "=====================================" >> "$REPORT_FILE"
   
   # Top requesting IPs
   echo -e "\nTop 20 Requesting IPs:" >> "$REPORT_FILE"
   awk '{print $1}' "$ACCESS_LOG" | sort | uniq -c | sort -nr | head -20 >> "$REPORT_FILE"
   
   # Most requested URLs
   echo -e "\nMost Requested URLs:" >> "$REPORT_FILE"
   awk '{print $7}' "$ACCESS_LOG" | sort | uniq -c | sort -nr | head -20 >> "$REPORT_FILE"
   
   # HTTP status code distribution
   echo -e "\nHTTP Status Code Distribution:" >> "$REPORT_FILE"
   awk '{print $9}' "$ACCESS_LOG" | sort | uniq -c | sort -nr >> "$REPORT_FILE"
   
   # User agent analysis
   echo -e "\nTop User Agents:" >> "$REPORT_FILE"
   awk -F'"' '{print $6}' "$ACCESS_LOG" | sort | uniq -c | sort -nr | head -20 >> "$REPORT_FILE"
   
   # Hourly traffic distribution
   echo -e "\nHourly Traffic Distribution:" >> "$REPORT_FILE"
   awk '{print $4}' "$ACCESS_LOG" | cut -d: -f2 | sort | uniq -c | sort -k2n >> "$REPORT_FILE"
   
   # Bandwidth usage (if size is logged)
   echo -e "\nBandwidth Usage by IP (Top 10):" >> "$REPORT_FILE"
   awk '{ip[$1]+=$10} END {for (i in ip) print ip[i], i}' "$ACCESS_LOG" | sort -nr | head -10 >> "$REPORT_FILE"
   
   echo "Traffic analysis completed. Report saved to: $REPORT_FILE"
   
   # Make executable
   sudo chmod +x /usr/local/bin/traffic-log-analysis.sh
   ```

### Real-Time Log Monitoring

#### Live Log Monitoring Setup

1. **Multi-Log Monitoring**:
   ```bash
   # Monitor multiple logs simultaneously
   sudo multitail /var/log/syslog /var/log/auth.log /var/log/apache2/access.log
   
   # Or use tmux/screen for multiple terminals
   tmux new-session -d -s logs
   tmux split-window -h
   tmux split-window -v
   tmux send-keys -t 0 'sudo tail -f /var/log/syslog' Enter
   tmux send-keys -t 1 'sudo tail -f /var/log/auth.log' Enter
   tmux send-keys -t 2 'sudo tail -f /var/log/apache2/access.log' Enter
   tmux attach-session -t logs
   ```

2. **Filtered Real-Time Monitoring**:
   ```bash
   # Monitor only errors
   sudo tail -f /var/log/syslog | grep -i error
   
   # Monitor authentication events
   sudo tail -f /var/log/auth.log | grep -E "(Failed|Accepted|sudo)"
   
   # Monitor web attacks
   sudo tail -f /var/log/apache2/access.log | grep -iE "(union|select|\.\.)"
   
   # Monitor database issues
   sudo tail -f /var/log/postgresql/postgresql-*.log | grep -iE "(error|fatal|slow)"
   ```

3. **Alert-Based Monitoring**:
   ```bash
   # Create real-time alert script
   sudo nano /usr/local/bin/log-alert-monitor.sh
   
   #!/bin/bash
   # Real-time Log Alert Monitor
   
   ALERT_EMAIL="admin@example.com"
   
   # Function to send alert
   send_alert() {
       local subject="$1"
       local message="$2"
       echo "$message" | mail -s "$subject" "$ALERT_EMAIL"
   }
   
   # Monitor authentication failures
   tail -f /var/log/auth.log | while read line; do
       if echo "$line" | grep -q "Failed password"; then
           IP=$(echo "$line" | awk '{print $(NF-3)}')
           FAILURES=$(grep "Failed password.*$IP" /var/log/auth.log | wc -l)
           if [ "$FAILURES" -gt 10 ]; then
               send_alert "Security Alert: Brute Force Attack" "IP $IP has $FAILURES failed login attempts"
           fi
       fi
   done &
   
   # Monitor system errors
   tail -f /var/log/syslog | while read line; do
       if echo "$line" | grep -qi "out of memory"; then
           send_alert "System Alert: Memory Exhaustion" "$line"
       elif echo "$line" | grep -qi "no space left"; then
           send_alert "System Alert: Disk Full" "$line"
       fi
   done &
   
   # Monitor database errors
   tail -f /var/log/postgresql/postgresql-*.log | while read line; do
       if echo "$line" | grep -qi "fatal"; then
           send_alert "Database Alert: Fatal Error" "$line"
       elif echo "$line" | grep -E "duration: [0-9]{5,}"; then
           send_alert "Database Alert: Slow Query" "$line"
       fi
   done &
   
   wait
   
   # Make executable
   sudo chmod +x /usr/local/bin/log-alert-monitor.sh
   ```

### Log Rotation and Management

#### Log Rotation Configuration

1. **System Log Rotation**:
   ```bash
   # Configure logrotate for application logs
   sudo nano /etc/logrotate.d/hotel-management
   
   /var/log/hotel-management/*.log {
       daily
       rotate 30
       compress
       delaycompress
       missingok
       notifempty
       create 644 www-data www-data
       postrotate
           systemctl reload apache2 > /dev/null 2>&1 || true
       endscript
   }
   
   # Test logrotate configuration
   sudo logrotate -d /etc/logrotate.d/hotel-management
   
   # Force rotation for testing
   sudo logrotate -f /etc/logrotate.d/hotel-management
   ```

2. **Custom Log Cleanup**:
   ```bash
   # Create log cleanup script
   sudo nano /usr/local/bin/log-cleanup.sh
   
   #!/bin/bash
   # Log Cleanup Script
   
   LOG_DIR="/var/log"
   RETENTION_DAYS=30
   
   # Clean old compressed logs
   find "$LOG_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
   
   # Clean old rotated logs
   find "$LOG_DIR" -name "*.log.*" -mtime +$RETENTION_DAYS -delete
   
   # Clean empty log files
   find "$LOG_DIR" -name "*.log" -size 0 -mtime +7 -delete
   
   # Clean temporary log files
   find "$LOG_DIR" -name "*.tmp" -mtime +1 -delete
   
   # Report cleanup results
   echo "$(date): Log cleanup completed" >> /var/log/log-cleanup.log
   df -h "$LOG_DIR" >> /var/log/log-cleanup.log
   
   # Make executable and schedule
   sudo chmod +x /usr/local/bin/log-cleanup.sh
   echo "0 2 * * 0 /usr/local/bin/log-cleanup.sh" | sudo crontab -
   ```

### Log Analysis Best Practices

#### Regular Analysis Schedule

1. **Daily Tasks**:
   ```bash
   # Daily log review checklist
   - Check authentication logs for failed attempts
   - Review system error logs
   - Monitor database performance logs
   - Check web server error logs
   - Review security alerts
   ```

2. **Weekly Tasks**:
   ```bash
   # Weekly log analysis
   - Generate security analysis report
   - Analyze traffic patterns
   - Review performance trends
   - Check log rotation status
   - Update log analysis scripts
   ```

3. **Monthly Tasks**:
   ```bash
   # Monthly log maintenance
   - Archive old logs
   - Review log retention policies
   - Update monitoring thresholds
   - Test log analysis scripts
   - Generate comprehensive reports
   ```

#### Log Analysis Automation

1. **Automated Reporting**:
   ```bash
   # Create automated daily report
   sudo nano /usr/local/bin/daily-log-report.sh
   
   #!/bin/bash
   # Daily Log Report Generator
   
   REPORT_DATE=$(date +%Y-%m-%d)
   REPORT_FILE="/var/log/reports/daily-report-$REPORT_DATE.txt"
   
   mkdir -p /var/log/reports
   
   {
       echo "Daily Log Analysis Report - $REPORT_DATE"
       echo "======================================="
       echo ""
       
       echo "System Summary:"
       echo "- Uptime: $(uptime)"
       echo "- Disk Usage: $(df -h / | tail -1 | awk '{print $5}')"
       echo "- Memory Usage: $(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')"
       echo ""
       
       echo "Security Events:"
       echo "- Failed SSH attempts: $(grep -c "Failed password" /var/log/auth.log)"
       echo "- Successful logins: $(grep -c "Accepted password" /var/log/auth.log)"
       echo "- Sudo usage: $(grep -c "sudo:" /var/log/auth.log)"
       echo ""
       
       echo "Web Traffic:"
       echo "- Total requests: $(wc -l < /var/log/apache2/access.log)"
       echo "- Unique visitors: $(awk '{print $1}' /var/log/apache2/access.log | sort -u | wc -l)"
       echo "- 4xx errors: $(awk '$9 ~ /^4/ {count++} END {print count+0}' /var/log/apache2/access.log)"
       echo "- 5xx errors: $(awk '$9 ~ /^5/ {count++} END {print count+0}' /var/log/apache2/access.log)"
       echo ""
       
       echo "Database Activity:"
       echo "- Current connections: $(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" | xargs)"
       echo "- Slow queries: $(grep -c "duration:" /var/log/postgresql/postgresql-*.log)"
       echo ""
       
   } > "$REPORT_FILE"
   
   # Email the report
   mail -s "Daily Log Report - $REPORT_DATE" admin@example.com < "$REPORT_FILE"
   
   # Make executable and schedule
   sudo chmod +x /usr/local/bin/daily-log-report.sh
   echo "0 6 * * * /usr/local/bin/daily-log-report.sh" | sudo crontab -
   ```

This comprehensive log analysis guide provides the tools and knowledge needed to effectively monitor, analyze, and respond to events in the hotel management system's log files.