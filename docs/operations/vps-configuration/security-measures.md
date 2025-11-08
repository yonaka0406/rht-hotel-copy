# Security Measures

This document provides detailed information about the security measures implemented on the Sakura VPS to protect the hotel management system, with a specific focus on DoS attack mitigation.

## Packet Filtering

Sakura VPS provides a built-in packet filtering service that acts as a first line of defense against unauthorized access and DoS attacks. This section documents the configuration and management of the Sakura VPS packet filter, with a specific focus on protecting the PostgreSQL database.

### Sakura VPS Packet Filter Overview

The Sakura VPS packet filter is a network-level firewall that operates at the hypervisor level, providing protection before traffic reaches your VPS. It offers the following advantages:

- **Hypervisor-level filtering**: Blocks malicious traffic before it reaches your VPS
- **Reduced resource consumption**: Filtering happens outside your VPS, preserving system resources
- **Protection against DoS attacks**: Helps mitigate distributed denial-of-service attacks
- **Simple configuration**: Managed through the Sakura VPS control panel

### Current Packet Filter Configuration

The current packet filter configuration for the PostgreSQL server includes:

| Rule Type | Protocol | Port | Source | Action | Description |
|-----------|----------|------|--------|--------|-------------|
| Allow | TCP | 22 | Specific IPs | Accept | SSH access from authorized IPs |
| Allow | TCP | 80 | Any | Accept | HTTP traffic |
| Allow | TCP | 443 | Any | Accept | HTTPS traffic |
| Allow | TCP | 5432 | Specific IPs | Accept | PostgreSQL access from authorized IPs |
| Deny | TCP | 5432 | Any | Drop | Block all other PostgreSQL access |
| Deny | All | All | Any | Drop | Default deny rule |

### PostgreSQL-Specific Protection Rules

The following packet filter rules are specifically implemented to protect the PostgreSQL database from DoS attacks and unauthorized access:

1. **Rate Limiting for PostgreSQL Connections**:
   - Limit incoming connections to port 5432 to 20 per minute per IP address
   - This prevents connection flooding attacks while allowing legitimate access

2. **IP Whitelisting for PostgreSQL**:
   - Only allow connections to port 5432 from the following IP addresses:
     - 127.0.0.1 (localhost)
     - 153.246.150.162 (Office IP)
     - 153.127.41.18 (Developer IP)
     - 133.32.134.250 (Remote admin IP)

3. **Block Common Attack Vectors**:
   - Block IP addresses with known malicious activity
   - Block connections with invalid PostgreSQL protocol signatures

### Configuring the Sakura VPS Packet Filter

To configure the packet filter through the Sakura VPS control panel:

1. **Access the Control Panel**:
   - Log in to the [Sakura VPS control panel](https://secure.sakura.ad.jp/vps/)
   - Navigate to your VPS instance
   - Select "Packet Filter" from the menu

2. **Create a New Filter**:
   - Click "Create New Filter"
   - Enter a descriptive name (e.g., "PostgreSQL Protection")
   - Add the rules as described below

3. **Add PostgreSQL Protection Rules**:
   ```
   # Allow SSH from specific IPs
   ACCEPT tcp -- [authorized_ip]/32 0.0.0.0/0 tcp dpt:22
   
   # Allow HTTP/HTTPS from anywhere
   ACCEPT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:80
   ACCEPT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:443
   
   # Allow PostgreSQL from specific IPs
   ACCEPT tcp -- 127.0.0.1/32 0.0.0.0/0 tcp dpt:5432
   ACCEPT tcp -- 153.246.150.162/32 0.0.0.0/0 tcp dpt:5432
   ACCEPT tcp -- 153.127.41.18/32 0.0.0.0/0 tcp dpt:5432
   ACCEPT tcp -- 133.32.134.250/32 0.0.0.0/0 tcp dpt:5432
   
   # Rate limit PostgreSQL connections (using connlimit)
   ACCEPT tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:5432 -m connlimit --connlimit-above 20 --connlimit-mask 32 -j DROP
   
   # Block all other PostgreSQL access
   DROP tcp -- 0.0.0.0/0 0.0.0.0/0 tcp dpt:5432
   
   # Default policy: allow established connections, deny everything else
   ACCEPT all -- 0.0.0.0/0 0.0.0.0/0 -m state --state ESTABLISHED,RELATED
   DROP all -- 0.0.0.0/0 0.0.0.0/0
   ```

4. **Apply the Filter**:
   - Click "Save" to create the filter
   - Select your VPS instance
   - Click "Apply Filter" to activate the rules

### Managing the Packet Filter

#### Adding New Authorized IPs

To add a new authorized IP address for PostgreSQL access:

1. Log in to the Sakura VPS control panel
2. Navigate to "Packet Filter"
3. Select the "PostgreSQL Protection" filter
4. Click "Edit"
5. Add a new rule in the appropriate position:
   ```
   ACCEPT tcp -- [new_authorized_ip]/32 0.0.0.0/0 tcp dpt:5432
   ```
6. Click "Save" and "Apply Filter"

#### Temporary DoS Mitigation

During an active DoS attack, you can implement stricter filtering:

1. Log in to the Sakura VPS control panel
2. Navigate to "Packet Filter"
3. Create a new filter named "DoS Mitigation"
4. Add more restrictive rules:
   ```
   # Allow only essential services
   ACCEPT tcp -- [authorized_ip]/32 0.0.0.0/0 tcp dpt:22
   ACCEPT tcp -- [authorized_ip]/32 0.0.0.0/0 tcp dpt:5432
   
   # Block everything else
   DROP all -- 0.0.0.0/0 0.0.0.0/0
   ```
5. Apply this filter during the attack
6. Revert to the normal filter once the attack subsides

### Monitoring Packet Filter Effectiveness

To monitor the effectiveness of the packet filter:

1. **View Blocked Connections**:
   - In the Sakura VPS control panel, navigate to "Packet Filter" > "Logs"
   - Review the blocked connection attempts

2. **Analyze Traffic Patterns**:
   - Use the "Traffic" section in the control panel to identify unusual patterns
   - Look for spikes in connection attempts to port 5432

3. **Correlate with System Logs**:
   - Compare packet filter logs with PostgreSQL logs to identify potential attacks that bypassed the filter

### Integration with Local Firewall

The Sakura VPS packet filter works in conjunction with the local firewall (iptables/ufw) on the VPS:

1. **Sakura VPS Packet Filter**: First line of defense, blocks traffic at the hypervisor level
2. **Local Firewall (iptables/ufw)**: Second line of defense, provides more granular control
3. **PostgreSQL pg_hba.conf**: Final line of defense, controls database-level authentication

This defense-in-depth approach provides multiple layers of protection for the PostgreSQL database.

### Best Practices for Packet Filter Management

1. **Regular Review**:
   - Review packet filter rules monthly
   - Update authorized IP addresses as needed
   - Remove unused or outdated rules

2. **Documentation**:
   - Document all changes to packet filter rules
   - Maintain a list of authorized IP addresses and their purposes
   - Document the rationale for each rule

3. **Testing**:
   - Test packet filter rules after any changes
   - Verify that legitimate access is still allowed
   - Confirm that unauthorized access is blocked

4. **Emergency Access Plan**:
   - Maintain an emergency procedure for accessing the system if the packet filter blocks legitimate access
   - Document the steps to disable or modify the packet filter in an emergency

## Fail2ban Configuration

Fail2ban is implemented on the Sakura VPS to protect the PostgreSQL database from brute force attacks and unauthorized access attempts. This section documents the configuration and management of Fail2ban for PostgreSQL protection.

### Fail2ban Overview

Fail2ban is an intrusion prevention software that protects servers from brute force attacks. It works by monitoring log files for selected entries and taking actions based on predefined rules. For PostgreSQL protection, Fail2ban monitors the database log files for failed login attempts and blocks the source IP addresses after a specified number of failures.

### Current Fail2ban Configuration for PostgreSQL

The Fail2ban configuration for PostgreSQL consists of two main components:

1. **Filter Definition**: Defines patterns to match in PostgreSQL log files
2. **Jail Configuration**: Defines actions to take when patterns are matched

#### PostgreSQL Filter Configuration

The PostgreSQL filter is defined in `/etc/fail2ban/filter.d/postgresql.conf`:

```
# Fail2Ban filter for PostgreSQL authentication failures
[Definition]
# Common prefix for log lines
__prefix_line = \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+ \w+ \[\d+\] 

# Regex to match PostgreSQL authentication failures
failregex = ^%(__prefix_line)sFATAL:\s+no pg_hba\.conf entry for host "<HOST>", user ".*", database ".*", (SSL encryption|no encryption)$
            ^%(__prefix_line)sFATAL:\s+password authentication failed for user ".*"$
            ^%(__prefix_line)sFATAL:\s+role ".*" does not exist$
            ^%(__prefix_line)sFATAL:\s+authentication failed for user ".*"$
            ^%(__prefix_line)sFATAL:\s+unsupported frontend protocol.*$

# Ignore successful connections
ignoreregex = ^%(__prefix_line)sLOG:\s+connection received: host=<HOST> port=\d+$
             ^%(__prefix_line)sLOG:\s+connection authorized: user=.* database=.*$
             ^%(__prefix_line)sLOG:\s+checkpoint.*$
             ^%(__prefix_line)sLOG:\s+starting PostgreSQL.*$
             ^%(__prefix_line)sLOG:\s+database system.*$
             ^%(__prefix_line)sLOG:\s+received.*shutdown.*$
             ^%(__prefix_line)sLOG:\s+shutting down.*$
             ^%(__prefix_line)sLOG:\s+background worker.*$
             ^%(__prefix_line)sWARNING:\s+.*$
             ^%(__prefix_line)sERROR:\s+.*$
```

This filter configuration:
- Defines a common prefix pattern for PostgreSQL log lines
- Specifies regex patterns to match various PostgreSQL authentication failures
- Includes patterns for missing pg_hba.conf entries, password failures, and invalid protocol attempts
- Defines patterns to ignore for legitimate PostgreSQL operations

#### PostgreSQL Jail Configuration

The PostgreSQL jail is defined in `/etc/fail2ban/jail.local`:

```
# PostgreSQL protection - CUSTOM JAIL
[postgresql]
enabled = true
port = 5432
filter = postgresql
logpath = /var/log/postgresql/postgresql-*.log
maxretry = 3
bantime = 7200
findtime = 300
```

This jail configuration:
- Enables the PostgreSQL jail
- Monitors port 5432 (PostgreSQL default port)
- Uses the custom PostgreSQL filter
- Monitors PostgreSQL log files in `/var/log/postgresql/`
- Bans IP addresses after 3 failed attempts within 5 minutes (300 seconds)
- Sets the ban time to 2 hours (7200 seconds)

### PostgreSQL Log Configuration

For Fail2ban to work effectively with PostgreSQL, the database logging configuration has been optimized in `postgresql.conf`:

```
# Logging configuration for Fail2ban integration
log_destination = 'stderr'
logging_collector = on
log_directory = '/var/log/postgresql'
log_filename = 'postgresql-%Y-%m-%d.log'
log_connections = on
log_disconnections = on
log_hostname = on
log_line_prefix = '%m [%p] %q%u@%d %h '
```

This logging configuration:
- Captures connection attempts and disconnections
- Includes client hostname/IP address in log messages
- Uses a consistent log format that matches the Fail2ban filter
- Stores logs in a location monitored by Fail2ban

### Implementation Steps

The following steps were taken to implement Fail2ban for PostgreSQL:

1. **Install Fail2ban**:
   ```bash
   sudo apt update
   sudo apt install fail2ban
   ```

2. **Create PostgreSQL Filter**:
   ```bash
   sudo nano /etc/fail2ban/filter.d/postgresql.conf
   # Add the filter configuration shown above
   ```

3. **Configure PostgreSQL Jail**:
   ```bash
   sudo nano /etc/fail2ban/jail.local
   # Add the jail configuration shown above
   ```

4. **Configure PostgreSQL Logging**:
   ```bash
   sudo nano /etc/postgresql/16/main/postgresql.conf
   # Update logging configuration as shown above
   ```

5. **Restart Services**:
   ```bash
   sudo systemctl restart postgresql
   sudo systemctl restart fail2ban
   ```

### Managing Fail2ban for PostgreSQL

#### Checking Fail2ban Status

To check the status of the PostgreSQL jail:

```bash
sudo fail2ban-client status postgresql
```

Example output:
```
Status for the jail: postgresql
|- Filter
|  |- Currently failed: 2
|  |- Total failed: 27
|  `- Journal matches: _SYSTEMD_UNIT=postgresql@16-main.service + _COMM=postgres
`- Actions
   |- Currently banned: 1
   |- Total banned: 5
   `- Banned IP list: 203.0.113.42
```

#### Manually Banning an IP Address

To manually ban an IP address:

```bash
sudo fail2ban-client set postgresql banip 203.0.113.42
```

#### Manually Unbanning an IP Address

To manually unban an IP address:

```bash
sudo fail2ban-client set postgresql unbanip 203.0.113.42
```

#### Viewing Banned IP Addresses

To view all currently banned IP addresses:

```bash
sudo iptables -L -n | grep 'f2b-postgresql'
```

#### Testing Fail2ban Configuration

To test if the Fail2ban filter correctly matches PostgreSQL authentication failures:

```bash
sudo fail2ban-regex /var/log/postgresql/postgresql-2025-07-17.log /etc/fail2ban/filter.d/postgresql.conf
```

### Monitoring and Alerting

To receive alerts when Fail2ban blocks an IP address:

1. **Configure Email Notifications**:
   ```bash
   sudo nano /etc/fail2ban/action.d/mail-whois.conf
   # Update the 'actionban' section to include your email address
   ```

2. **Update the PostgreSQL Jail**:
   ```bash
   sudo nano /etc/fail2ban/jail.local
   # Add the following line to the [postgresql] section:
   action = %(action_mw)s
   ```

3. **Restart Fail2ban**:
   ```bash
   sudo systemctl restart fail2ban
   ```

### Integration with Other Security Measures

Fail2ban works in conjunction with other security measures:

1. **Sakura VPS Packet Filter**: Blocks traffic at the hypervisor level
2. **Fail2ban**: Dynamically blocks IP addresses based on log analysis
3. **Local Firewall (iptables/ufw)**: Provides static firewall rules
4. **PostgreSQL pg_hba.conf**: Controls database-level authentication

This multi-layered approach provides comprehensive protection against various types of attacks.

### Troubleshooting Fail2ban

#### Common Issues and Solutions

1. **Fail2ban Not Detecting Authentication Failures**:
   - Verify PostgreSQL logging configuration
   - Check if log format matches the filter regex
   - Test the filter with fail2ban-regex

2. **IP Addresses Not Being Banned**:
   - Check if the jail is enabled: `sudo fail2ban-client status`
   - Verify iptables is working: `sudo iptables -L`
   - Check for conflicts with other firewall rules

3. **Legitimate Users Getting Banned**:
   - Increase maxretry value in jail.local
   - Add IP addresses to ignoreip in jail.local
   - Create a custom action to notify before banning

#### Fail2ban Log Analysis

To analyze Fail2ban logs for PostgreSQL-related actions:

```bash
sudo grep postgresql /var/log/fail2ban.log
```

Example log entries:
```
2025-07-17 10:15:30,123 fail2ban.filter [12345]: INFO [postgresql] Found 203.0.113.42 - 2025-07-17 10:15:29
2025-07-17 10:15:35,456 fail2ban.filter [12345]: INFO [postgresql] Found 203.0.113.42 - 2025-07-17 10:15:34
2025-07-17 10:15:40,789 fail2ban.filter [12345]: INFO [postgresql] Found 203.0.113.42 - 2025-07-17 10:15:39
2025-07-17 10:15:40,901 fail2ban.actions [12345]: NOTICE [postgresql] Ban 203.0.113.42
```

### Best Practices for Fail2ban Management

1. **Regular Maintenance**:
   - Review Fail2ban logs weekly
   - Update filter patterns as needed
   - Adjust ban times and retry counts based on attack patterns

2. **Whitelist Management**:
   - Maintain a list of trusted IP addresses in ignoreip
   - Update the whitelist when office or developer IPs change
   - Consider using persistent bans for repeat offenders

3. **Performance Considerations**:
   - Monitor Fail2ban resource usage
   - Optimize regex patterns for efficiency
   - Consider using dbpurgeage to limit database size

4. **Documentation**:
   - Document all changes to Fail2ban configuration
   - Maintain a list of custom filters and jails
   - Document procedures for managing banned IPs

## Connection Rate Limiting

Connection rate limiting is implemented on the Sakura VPS to protect the PostgreSQL database from DoS attacks and connection flooding. This section documents the configuration and management of connection rate limiting mechanisms.

### Connection Rate Limiting Overview

Connection rate limiting restricts the number of connections that can be established to the PostgreSQL database within a specific time period. This helps prevent:

- **DoS attacks**: Flooding the server with connection requests
- **Brute force attacks**: Rapid succession of login attempts
- **Resource exhaustion**: Consuming all available database connections

The implementation uses multiple layers of protection:

1. **iptables**: Network-level connection limiting
2. **PostgreSQL configuration**: Database-level connection management
3. **PgBouncer**: Connection pooling to optimize legitimate connections

### iptables Connection Rate Limiting

iptables is configured to limit the rate of new connections to the PostgreSQL port (5432) using the following rules:

```bash
# Limit new connections to PostgreSQL to 20 per minute per IP
sudo iptables -A INPUT -p tcp --dport 5432 -m state --state NEW -m recent --set
sudo iptables -A INPUT -p tcp --dport 5432 -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP

# Limit concurrent connections to PostgreSQL to 10 per IP
sudo iptables -A INPUT -p tcp --dport 5432 -m connlimit --connlimit-above 10 --connlimit-mask 32 -j DROP
```

These rules are made persistent by saving them to `/etc/iptables/rules.v4`:

```bash
sudo sh -c "iptables-save > /etc/iptables/rules.v4"
```

### PostgreSQL Connection Limiting

PostgreSQL is configured with the following parameters in `postgresql.conf` to limit connections:

```
# Connection limits
max_connections = 100                # Maximum total connections
superuser_reserved_connections = 3    # Connections reserved for superusers
```

Additionally, connection timeouts are configured to prevent idle connections from consuming resources:

```
# Connection timeouts
tcp_keepalives_idle = 7200           # Time between keepalive probes (seconds)
tcp_keepalives_interval = 75         # Time between keepalive probes when previous probe not acknowledged
tcp_keepalives_count = 9             # Maximum number of keepalive probes before dropping connection
idle_in_transaction_session_timeout = 3600000  # Terminate sessions idle in transaction after 1 hour
```

### PgBouncer Connection Pooling

PgBouncer is implemented as a connection pooler to efficiently manage database connections and provide an additional layer of protection against connection flooding:

```ini
# /etc/pgbouncer/pgbouncer.ini
[databases]
* = host=localhost port=5432

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
reserve_pool_size = 10
reserve_pool_timeout = 5.0
max_db_connections = 50
max_user_connections = 50
```

This configuration:
- Limits the maximum number of client connections to 1000
- Sets the default pool size to 20 connections per database
- Reserves 10 additional connections for high-priority operations
- Limits connections to 50 per database and 50 per user

### Implementation Steps

The following steps were taken to implement connection rate limiting:

1. **Configure iptables Rules**:
   ```bash
   sudo iptables -A INPUT -p tcp --dport 5432 -m state --state NEW -m recent --set
   sudo iptables -A INPUT -p tcp --dport 5432 -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP
   sudo iptables -A INPUT -p tcp --dport 5432 -m connlimit --connlimit-above 10 --connlimit-mask 32 -j DROP
   sudo sh -c "iptables-save > /etc/iptables/rules.v4"
   ```

2. **Update PostgreSQL Configuration**:
   ```bash
   sudo nano /etc/postgresql/16/main/postgresql.conf
   # Update connection parameters as shown above
   sudo systemctl restart postgresql
   ```

3. **Install and Configure PgBouncer**:
   ```bash
   sudo apt update
   sudo apt install pgbouncer
   sudo nano /etc/pgbouncer/pgbouncer.ini
   # Update configuration as shown above
   sudo systemctl restart pgbouncer
   ```

4. **Configure Application Connection String**:
   ```
   # Update application to connect to PgBouncer instead of PostgreSQL directly
   DATABASE_URL=postgres://user:password@localhost:6432/database
   ```

### Monitoring Connection Limits

#### Checking Current PostgreSQL Connections

To check the current number of connections to PostgreSQL:

```bash
sudo -u postgres psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

Example output:
```
 count | state
-------+--------
     5 | active
     1 | idle
(2 rows)
```

#### Checking Connection Rate Limiting Rules

To check the current iptables rules for connection rate limiting:

```bash
sudo iptables -L -n | grep 5432
```

Example output:
```
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5432 state NEW recent: SET name: DEFAULT side: source
DROP       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5432 state NEW recent: UPDATE seconds: 60 hit_count: 20 name: DEFAULT side: source
DROP       tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:5432 connlimit over 10 mask 32
```

#### Monitoring PgBouncer

To check the current status of PgBouncer connections:

```bash
sudo -u postgres psql -p 6432 -d pgbouncer -c "SHOW POOLS;"
```

Example output:
```
 database  |   user    | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait | maxwait_us | pool_mode
-----------+-----------+-----------+------------+-----------+---------+---------+-----------+----------+---------+------------+-----------
 rhthotels | rhtsys_user |         2 |          0 |         2 |       3 |       0 |         0 |        0 |       0 |          0 | transaction
(1 row)
```

### Adjusting Connection Rate Limits

#### Modifying iptables Rules

To adjust the connection rate limits in iptables:

1. **Remove existing rules**:
   ```bash
   sudo iptables -D INPUT -p tcp --dport 5432 -m state --state NEW -m recent --set
   sudo iptables -D INPUT -p tcp --dport 5432 -m state --state NEW -m recent --update --seconds 60 --hitcount 20 -j DROP
   sudo iptables -D INPUT -p tcp --dport 5432 -m connlimit --connlimit-above 10 --connlimit-mask 32 -j DROP
   ```

2. **Add new rules with adjusted limits**:
   ```bash
   sudo iptables -A INPUT -p tcp --dport 5432 -m state --state NEW -m recent --set
   sudo iptables -A INPUT -p tcp --dport 5432 -m state --state NEW -m recent --update --seconds 60 --hitcount 30 -j DROP
   sudo iptables -A INPUT -p tcp --dport 5432 -m connlimit --connlimit-above 15 --connlimit-mask 32 -j DROP
   ```

3. **Save the changes**:
   ```bash
   sudo sh -c "iptables-save > /etc/iptables/rules.v4"
   ```

#### Modifying PostgreSQL Connection Limits

To adjust the PostgreSQL connection limits:

1. **Edit postgresql.conf**:
   ```bash
   sudo nano /etc/postgresql/16/main/postgresql.conf
   # Update max_connections parameter
   ```

2. **Restart PostgreSQL**:
   ```bash
   sudo systemctl restart postgresql
   ```

#### Modifying PgBouncer Settings

To adjust the PgBouncer connection limits:

1. **Edit pgbouncer.ini**:
   ```bash
   sudo nano /etc/pgbouncer/pgbouncer.ini
   # Update connection limit parameters
   ```

2. **Restart PgBouncer**:
   ```bash
   sudo systemctl restart pgbouncer
   ```

### Handling DoS Attacks

During an active DoS attack, the following steps can be taken to mitigate the impact:

1. **Identify the attack source**:
   ```bash
   sudo netstat -antp | grep 5432
   sudo grep "connection received" /var/log/postgresql/postgresql-*.log | grep -v "127.0.0.1"
   ```

2. **Temporarily block the attacking IP addresses**:
   ```bash
   sudo iptables -I INPUT -s <attacking_ip> -j DROP
   ```

3. **Reduce connection limits temporarily**:
   ```bash
   sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 50;"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   ```

4. **Monitor the attack**:
   ```bash
   sudo watch "netstat -antp | grep 5432 | wc -l"
   ```

5. **Restore normal settings after the attack**:
   ```bash
   sudo -u postgres psql -c "ALTER SYSTEM RESET max_connections;"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   ```

### Best Practices for Connection Rate Limiting

1. **Regular Monitoring**:
   - Monitor connection patterns to establish a baseline
   - Adjust limits based on legitimate usage patterns
   - Set up alerts for connection spikes

2. **Tiered Rate Limiting**:
   - Implement different limits for different types of clients
   - Use IP-based whitelisting for trusted clients
   - Consider geographic-based rate limiting for international access

3. **Documentation and Testing**:
   - Document all rate limiting configurations
   - Test the impact of rate limiting on legitimate traffic
   - Develop and document procedures for adjusting limits during attacks

4. **Regular Review**:
   - Review connection logs monthly
   - Adjust rate limits based on changing usage patterns
   - Update documentation with any configuration changes

## Security Incident Response

This section provides guidelines for identifying and responding to security incidents affecting the PostgreSQL database, with a specific focus on DoS attacks from scraper bots.

### Identifying Security Incidents

#### Signs of a DoS Attack

1. **Unusual Connection Patterns**:
   - Sudden spike in connection attempts to PostgreSQL
   - High number of failed authentication attempts
   - Connections from unusual geographic locations
   - Repeated connection attempts from the same IP address

2. **System Performance Degradation**:
   - Unusually high CPU usage
   - Increased memory consumption
   - Slow query response times
   - Server becoming unresponsive

3. **Log Indicators**:
   - Repeated entries in PostgreSQL logs showing connection attempts
   - Fail2ban logs showing multiple banned IP addresses
   - System logs showing resource exhaustion
   - Network traffic logs showing unusual patterns

#### Monitoring Tools for Detection

1. **Real-time Monitoring**:
   ```bash
   # Monitor PostgreSQL connections in real-time
   watch -n 1 "sudo -u postgres psql -c 'SELECT count(*), state FROM pg_stat_activity GROUP BY state;'"
   
   # Monitor system resource usage
   top
   
   # Monitor network connections to PostgreSQL
   watch -n 1 "sudo netstat -antp | grep 5432 | wc -l"
   ```

2. **Log Analysis**:
   ```bash
   # Check PostgreSQL logs for connection attempts
   sudo grep "connection received" /var/log/postgresql/postgresql-$(date +%Y-%m-%d).log | wc -l
   
   # Check Fail2ban logs for banned IPs
   sudo grep "Ban" /var/log/fail2ban.log | grep postgresql
   
   # Check authentication failures
   sudo grep "FATAL" /var/log/postgresql/postgresql-$(date +%Y-%m-%d).log | grep "authentication failed"
   ```

3. **Automated Alerting**:
   - Configure email alerts for Fail2ban actions
   - Set up monitoring thresholds for connection counts
   - Implement automated response for severe attacks

### Incident Response Procedures

#### Immediate Response to DoS Attack

1. **Assess the Situation**:
   - Identify the source IP addresses of the attack
   - Determine the attack pattern (connection flooding, authentication attempts, etc.)
   - Evaluate the impact on system performance and availability

2. **Implement Immediate Mitigation**:
   ```bash
   # Block attacking IP addresses
   sudo iptables -I INPUT -s <attacking_ip> -j DROP
   
   # Reduce PostgreSQL connection limits temporarily
   sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = 50;"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   
   # Enable more aggressive Fail2ban rules
   sudo fail2ban-client set postgresql bantime 86400  # Ban for 24 hours
   sudo fail2ban-client set postgresql findtime 600   # Look back 10 minutes
   sudo fail2ban-client set postgresql maxretry 2     # Ban after 2 failures
   ```

3. **Preserve Evidence**:
   ```bash
   # Save relevant logs
   sudo cp /var/log/postgresql/postgresql-$(date +%Y-%m-%d).log /var/log/postgresql/incident-$(date +%Y%m%d%H%M).log
   sudo cp /var/log/fail2ban.log /var/log/fail2ban-incident-$(date +%Y%m%d%H%M).log
   
   # Capture network traffic
   sudo tcpdump -i any port 5432 -w /tmp/postgresql-attack-$(date +%Y%m%d%H%M).pcap
   ```

#### Detailed Investigation

1. **Analyze Attack Patterns**:
   ```bash
   # Identify top source IPs
   sudo grep "connection received" /var/log/postgresql/postgresql-$(date +%Y-%m-%d).log | grep -v "127.0.0.1" | awk '{print $NF}' | sort | uniq -c | sort -nr | head -10
   
   # Analyze connection frequency
   sudo grep "connection received" /var/log/postgresql/postgresql-$(date +%Y-%m-%d).log | awk '{print $1, $2}' | uniq -c | sort -nr | head -20
   
   # Check for authentication attempts
   sudo grep "authentication failed" /var/log/postgresql/postgresql-$(date +%Y-%m-%d).log | awk '{print $NF}' | sort | uniq -c | sort -nr
   ```

2. **Determine Attack Vector**:
   - Review the attack pattern to identify the specific vulnerability being exploited
   - Check if the attack is targeting specific database users or applications
   - Determine if the attack is automated (bot) or manual

3. **Assess Damage**:
   ```bash
   # Check database integrity
   sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_user_tables;"
   
   # Check for unauthorized access
   sudo -u postgres psql -c "SELECT datname, usename, client_addr, backend_start, state FROM pg_stat_activity WHERE client_addr IS NOT NULL ORDER BY backend_start DESC;"
   
   # Check for unusual database activity
   sudo -u postgres psql -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
   ```

#### Recovery and Remediation

1. **Restore Normal Operation**:
   ```bash
   # Reset PostgreSQL connection limits
   sudo -u postgres psql -c "ALTER SYSTEM RESET max_connections;"
   sudo -u postgres psql -c "SELECT pg_reload_conf();"
   
   # Reset Fail2ban to normal settings
   sudo fail2ban-client set postgresql bantime 7200   # Ban for 2 hours
   sudo fail2ban-client set postgresql findtime 300   # Look back 5 minutes
   sudo fail2ban-client set postgresql maxretry 3     # Ban after 3 failures
   ```

2. **Implement Additional Protections**:
   ```bash
   # Update iptables rules for better protection
   sudo iptables -A INPUT -p tcp --dport 5432 -m hashlimit --hashlimit-name postgres --hashlimit-above 10/min --hashlimit-mode srcip --hashlimit-burst 5 -j DROP
   
   # Save the updated rules
   sudo sh -c "iptables-save > /etc/iptables/rules.v4"
   
   # Update PostgreSQL pg_hba.conf to restrict access
   sudo nano /etc/postgresql/16/main/pg_hba.conf
   sudo systemctl restart postgresql
   ```

3. **Long-term Improvements**:
   - Review and update security measures based on the attack pattern
   - Consider implementing additional monitoring tools
   - Update documentation with lessons learned

#### Post-Incident Analysis

1. **Document the Incident**:
   - Create a detailed report of the incident
   - Include timeline, attack vectors, and mitigation steps
   - Document effectiveness of response procedures

2. **Review and Improve**:
   - Identify gaps in detection and response
   - Update security measures based on lessons learned
   - Conduct a team review to improve future responses

3. **Update Documentation**:
   - Update this security incident response guide
   - Document new attack patterns and effective countermeasures
   - Share knowledge with the team

### Response Procedures for Specific Attack Types

#### Connection Flooding Attack

1. **Identification**:
   - High number of new connections to PostgreSQL
   - Connections may be from multiple source IPs
   - Each connection may be short-lived

2. **Response**:
   ```bash
   # Implement more aggressive connection rate limiting
   sudo iptables -I INPUT -p tcp --dport 5432 -m hashlimit --hashlimit-name postgres --hashlimit-above 5/min --hashlimit-mode srcip --hashlimit-burst 3 -j DROP
   
   # Enable connection pooling with reduced limits
   sudo nano /etc/pgbouncer/pgbouncer.ini
   # Set max_client_conn = 500
   # Set default_pool_size = 10
   sudo systemctl restart pgbouncer
   
   # Direct application to use connection pooler
   # Update DATABASE_URL=postgres://user:password@localhost:6432/database
   ```

3. **Recovery**:
   - Gradually increase connection limits as attack subsides
   - Monitor for recurring attack patterns
   - Consider implementing persistent IP bans for repeat offenders

#### Authentication Brute Force Attack

1. **Identification**:
   - High number of authentication failures in PostgreSQL logs
   - Attempts may target common usernames (postgres, admin, etc.)
   - Attempts may come from one or multiple IPs

2. **Response**:
   ```bash
   # Implement more aggressive Fail2ban settings
   sudo fail2ban-client set postgresql bantime 86400  # Ban for 24 hours
   sudo fail2ban-client set postgresql maxretry 1     # Ban after 1 failure
   
   # Temporarily disable non-essential database users
   sudo -u postgres psql -c "ALTER USER non_essential_user NOLOGIN;"
   
   # Implement account lockout after failed attempts
   sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pgaudit;"
   ```

3. **Recovery**:
   - Review and strengthen password policies
   - Consider implementing multi-factor authentication
   - Re-enable accounts with new, strong passwords

#### Scraper Bot Attack

1. **Identification**:
   - High number of SELECT queries from specific IPs
   - Systematic access to data tables
   - Unusual query patterns or sequences

2. **Response**:
   ```bash
   # Implement query rate limiting
   sudo -u postgres psql -c "CREATE EXTENSION IF NOT EXISTS pg_stat_statements;"
   sudo -u postgres psql -c "SELECT pg_stat_statements_reset();"
   
   # Monitor and block IPs with excessive queries
   sudo -u postgres psql -c "SELECT userid, query, calls, total_time FROM pg_stat_statements ORDER BY calls DESC LIMIT 10;"
   
   # Implement application-level rate limiting
   # Update application code to limit API requests
   ```

3. **Recovery**:
   - Implement API rate limiting
   - Consider implementing CAPTCHA for web interfaces
   - Add query complexity limits to prevent resource exhaustion

### Communication Plan

#### Internal Communication

1. **Initial Alert**:
   - Notify system administrators and database administrators immediately
   - Provide brief description of the incident and current status
   - Establish communication channel for updates

2. **Status Updates**:
   - Provide regular updates on mitigation efforts
   - Share relevant metrics (system performance, attack volume)
   - Communicate expected resolution timeline

3. **Post-Incident Report**:
   - Share detailed analysis with technical team
   - Document lessons learned and improvement opportunities
   - Schedule review meeting to discuss findings

#### External Communication

1. **User Notification**:
   - Notify users of service disruption if necessary
   - Provide estimated resolution time
   - Avoid technical details that could aid attackers

2. **Vendor Communication**:
   - Contact Sakura VPS support for assistance if needed
   - Report attack to relevant security organizations
   - Share attack patterns with trusted security communities

### Preventive Measures

1. **Regular Security Audits**:
   - Conduct monthly security audits of PostgreSQL configuration
   - Review and update firewall rules regularly
   - Test incident response procedures through simulations

2. **Proactive Monitoring**:
   - Implement automated monitoring for connection patterns
   - Set up alerts for unusual database activity
   - Regularly review security logs

3. **Continuous Improvement**:
   - Stay informed about new attack vectors
   - Update security measures based on emerging threats
   - Regularly train team members on security best practices

## S
ee Also

### Related VPS Configuration
- **[VPS Configuration Index](index.md)** - VPS configuration overview
- **[Server Architecture](server-architecture.md)** - Server architecture details
- **[Database Configuration](database-configuration.md)** - Database security
- **[Recovery Mechanisms](recovery-mechanisms.md)** - Backup and recovery
- **[VPS Troubleshooting](troubleshooting.md)** - Security troubleshooting

### Architecture Documentation
- **[System Architecture](../../design/system-architecture.md)** - System design and security
- **[Integration Patterns](../../architecture/integration-patterns.md)** - Secure integrations

### Operations Documentation
- **[Deployment Guide](../deployment-guide.md)** - Secure deployment procedures
- **[Monitoring & Logging](../../deployment/monitoring-logging.md)** - Security monitoring

### Development Documentation
- **[Coding Standards](../../development/coding-standards.md)** - Secure coding practices
- **[Testing Strategy](../../development/testing-strategy.md)** - Security testing

---

*This document is part of the [VPS Configuration Documentation](./)*
