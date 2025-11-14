# Implementation Plan

- [ ] 1. Create credential file and directory structure
  - Create ~/.pgpass file with both local VPS and Supabase connection details
  - Add local VPS entry: localhost:5432:dbname:username:password
  - Add Supabase entry: hostname:port:database:username:password
  - Set file permissions to 600 using chmod
  - Create /opt/supabase_backups directory with appropriate ownership
  - Create /var/log directory if it doesn't exist
  - Create /var/log/supabase_backup.log file with appropriate ownership
  - Create /var/log/supabase_migration.log file with appropriate ownership
  - _Requirements: 2.1, 2.2, 2.3, 6.5_

- [ ] 2. Implement VPS-to-Supabase migration script
  - [ ] 2.1 Create migrate_to_supabase.sh script with configuration variables
    - Write shell script at ~/migrate_to_supabase.sh
    - Define local VPS database variables: LOCAL_DB_USER, LOCAL_DB_HOST, LOCAL_DB_NAME
    - Define Supabase database variables: SUPABASE_DB_USER, SUPABASE_DB_HOST, SUPABASE_DB_NAME
    - Define temporary dump file path with timestamp
    - Add shebang line and make script executable
    - _Requirements: 6.1, 6.3, 6.5_
  
  - [ ] 2.2 Implement local database dump logic
    - Set PGPASSFILE environment variable
    - Add logging for migration start
    - Implement pg_dump command for local VPS database
    - Add error checking for dump operation
    - _Requirements: 6.1, 6.4_
  
  - [ ] 2.3 Implement Supabase restore logic
    - Implement psql restore command to Supabase instance
    - Add error checking for restore operation
    - Add logging for restore progress
    - _Requirements: 6.2, 6.4_
  
  - [ ] 2.4 Implement cleanup and error handling
    - Add logic to remove temporary dump file after completion
    - Implement error handling to remove temp file on failure
    - Add success and failure logging with timestamps
    - _Requirements: 6.4_

- [ ] 3. Execute initial data migration
  - Run migrate_to_supabase.sh script manually
  - Verify migration log shows success
  - Verify Supabase database contains all tables and data
  - Document any migration issues or data discrepancies
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 4. Implement Supabase-to-VPS backup script
  - [ ] 4.1 Create backup_supabase_to_vps.sh script with configuration variables
    - Write shell script at ~/backup_supabase_to_vps.sh
    - Define Supabase source variables: SUPABASE_DB_USER, SUPABASE_DB_HOST, SUPABASE_DB_NAME
    - Define VPS destination variables: LOCAL_DB_USER, LOCAL_DB_HOST, LOCAL_DB_NAME (with parameter support)
    - Define temporary dump file path with timestamp
    - Add shebang line and make script executable
    - _Requirements: 1.1, 1.2, 3.1_
  
  - [ ] 4.2 Implement Supabase dump logic
    - Set PGPASSFILE environment variable
    - Add logging for backup start with target database name
    - Implement pg_dump command for Supabase database to temp file
    - Add error checking for dump operation
    - _Requirements: 1.1, 1.6_
  
  - [ ] 4.3 Implement VPS restore logic
    - Add logic to drop and recreate target VPS database for clean restore
    - Implement psql restore command to VPS database
    - Add error checking for restore operation
    - Add logging for restore progress
    - _Requirements: 1.2, 1.3, 1.4_
  
  - [ ] 4.4 Implement cleanup and error handling
    - Add logic to remove temporary dump file after completion
    - Implement error handling to remove temp file on failure
    - Add success and failure logging with timestamps and target database
    - _Requirements: 1.6, 3.4_

- [ ] 5. Validate backup script functionality
  - [ ] 5.1 Execute manual test of backup script to test database
    - Run backup_supabase_to_vps.sh manually from command line (defaults to wehub_backup_test)
    - Verify log file contains success entry with target database name
    - Verify wehub_backup_test database exists and contains data
    - Query wehub_backup_test to verify table structure and sample data
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 5.2 Perform resource monitoring test
    - Open two SSH terminals
    - Run htop in first terminal
    - Execute backup script in second terminal
    - Monitor CPU and memory usage during pg_dump and restore operations
    - Verify Node.js application remains responsive
    - Document peak resource usage and backup duration
    - Note approximate data transfer size for egress calculation
    - _Requirements: 4.1, 4.2, 4.3, 7.4_

- [ ] 6. Configure automated scheduling
  - [ ] 6.1 Create cron job entry for weekly backups
    - Execute crontab -e command
    - Add cron entry for testing: 0 2 * * 0 /home/username/backup_supabase_to_vps.sh (Sunday 2 AM to wehub_backup_test)
    - Verify cron entry with crontab -l
    - _Requirements: 1.5_
  
  - [ ] 6.2 Monitor automated execution over 2-3 weeks
    - Allow cron job to run for 2-3 weeks
    - Check log file for consistent success entries after each Sunday backup
    - Verify weekly backup completes successfully
    - Monitor VPS performance during backup execution
    - Check Supabase dashboard for data egress metrics (should be ~200 MB per week, ~800 MB per month)
    - Verify data egress stays well under 5 GB monthly limit
    - _Requirements: 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 4.4_
  
  - [ ] 6.3 Update cron for production phase
    - After successful testing period, update cron entry
    - Change to: 0 2 * * 0 /home/username/backup_supabase_to_vps.sh wehub (backup to production database)
    - Verify cron entry with crontab -l
    - _Requirements: 1.4_

- [ ] 7. Document disaster recovery procedures
  - Create DR documentation in design.md or separate runbook
  - Document Phase 1: Failover to VPS during Supabase outage
  - Document steps to reconfigure application from Supabase to VPS wehub database
  - Document Phase 2: Return to Supabase after service restoration
  - Document steps to migrate VPS data back to Supabase using migrate_to_supabase.sh
  - Document steps to reconfigure application back to Supabase
  - Document expected data loss window (maximum 7 days) and RTO (5-10 minutes)
  - Note weekly backup schedule rationale (Supabase free tier 5 GB/month egress limit)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
