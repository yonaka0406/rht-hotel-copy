# PostgreSQL Upgrade Guide (v16 → Latest)

## Should You Upgrade?

PostgreSQL 16 is an excellent, modern version that will be supported until late 2028. You aren't in any "danger" staying on 16. However, upgrading to PostgreSQL 17 is recommended if:

*   **You use JSON heavily**: v17 adds huge improvements and performance optimizations for JSON operations.
*   **High-Traffic Performance**: You have a high-traffic app where `VACUUM` processes sometimes slow things down; v17 includes significant improvements to vacuum efficiency.
*   **Incremental Backups**: You want Incremental Backups, which is a game-changer for large databases.

**Current Decision**: While the RHT Hotel system uses some JSON features, we are choosing to **remain on PostgreSQL 16** for the time being. Since it is still actively supported and stable, we are prioritizing system stability over the new features of v17 at this stage.

## Overview

This guide details the safe procedure for upgrading your PostgreSQL database from version 16 to the latest stable version (e.g., v17 or v18) on your Ubuntu/Debian VPS. This process involves installing the new version alongside the old one, migrating the data, and verifying integrity before switching over.

## Pre-Upgrade Checklist

### 1. Discovery & Verification

**Check your current version and clusters:**

```bash
# List all Postgres clusters and their status
pg_lsclusters

# Check current connection details
sudo -u postgres psql -c "SELECT version();"

# Verify extensions currently in use (CRITICAL for compatibility)
sudo -u postgres psql -d wehub -c "SELECT * FROM pg_extension;"
```

### 2. Create Comprehensive Backups

**WARNING: Do not skip this step. Upgrades can fail.**

**Option 1: Automated System Backup (Recommended)**

```bash
# Trigger your existing backup service
sudo systemctl start postgresql-backup-wehub.service

# Verify backup success
sudo systemctl status postgresql-backup-wehub.service
ls -la /var/backups/postgresql/ | tail -5
```

**Option 2: Manual Full Dump (Safety Net)**

```bash
# Create a manual dump specifically for the upgrade
cd /tmp
sudo -u postgres pg_dumpall > pre_upgrade_dump_v16.sql

# Check size to ensure it's valid
ls -lh pre_upgrade_dump_v16.sql
```

### 3. VPS Snapshot (If Available)

If your VPS provider supports snapshots (e.g., DigitalOcean, AWS, Linode), take a snapshot of the entire server now. This is the fastest rollback method.

## Upgrade Procedure

### 4. Stop Application Services

Stop all services that connect to the database to ensure data consistency during migration.

```bash
# Stop Node.js application (PM2)
pm2 stop all
pm2 save

# Stop other dependent services
sudo systemctl stop apache2
sudo systemctl stop redis-server

# Verify no active connections to the database
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'wehub';"
# Should be 0 or very low (just your connection)
```

### 5. Install New PostgreSQL Version

Update repositories and install the latest version (e.g., PostgreSQL 17).

```bash
# Update package lists
sudo apt-get update

# Search for available versions
apt-cache search postgresql | grep ^postgresql-1

# Install the new version (Replace '17' with '18' if targeting that version)
sudo apt-get install postgresql-17 postgresql-client-17
```

**What happens now?**
You now have **two** PostgreSQL clusters running:

1. v16 (Port 5432) - Your live data
2. v17 (Port 5433) - Empty, default cluster created by installation

Check this:

```bash
pg_lsclusters
```

### 6. Migrate Data (pg_upgradecluster)

We will use the Debian/Ubuntu wrapper `pg_upgradecluster`, which handles the complex `pg_upgrade` commands, config migration, and port swapping automatically.

**Step 6a: Drop the empty default cluster**
The new installation created a default cluster on port 5433. We don't need it; we want to upgrade our existing one into that slot.

```bash
# Stop the new empty cluster
sudo pg_dropcluster 17 main --stop
```

**Step 6b: Run the Upgrade**
This command upgrades the `main` cluster from version 16 to 17.

```bash
# Syntax: pg_upgradecluster <version> <cluster-name>
sudo pg_upgradecluster 16 main
```

> [!TIP]
> **Disk Space & Rolling Back**: By default, `pg_upgradecluster` **copies** all data, which is safest but requires enough free disk space for a second copy of your database.
> - **Low Disk Space?** You can use the `--link` flag (e.g., `sudo pg_upgradecluster --link 16 main`) to use hard links instead of copying. This is much faster and uses almost no extra space.
> - **The Risk**: If you use `--link`, the old cluster's data files are linked to the new ones. If the upgrade fails or you start the new cluster, you **cannot** easily go back to the old version. Stick to the default copy method for maximum safety unless disk space is critically low.

*Note: This process copies configuration files and migrates data. For large databases, it may take time.*

### 7. Switch Ports & Finalize

By default, `pg_upgradecluster` might leave the old cluster on port 5432 and the new one on 5433, or swap them depending on configuration. We need to ensure the **NEW** version is on port 5432 so your app works without config changes.

```bash
# Check current ports
pg_lsclusters
```

**If v17 is NOT on port 5432:**

```bash
# Edit config to swap ports if necessary
sudo nano /etc/postgresql/17/main/postgresql.conf
# Set: port = 5432

sudo nano /etc/postgresql/16/main/postgresql.conf
# Set: port = 5433 (or commented out)
```

**Restart the new service:**

```bash
sudo systemctl restart postgresql
```

## Post-Upgrade Verification

### 8. Verify Database Health

```bash
# Check running version
sudo -u postgres psql -c "SELECT version();"
# Output should show PostgreSQL 17.x...

# Check if 'wehub' database exists and is accessible
sudo -u postgres psql -d wehub -c "SELECT count(*) FROM users;"

# Verify extensions are still loaded
sudo -u postgres psql -d wehub -c "SELECT * FROM pg_extension;"
```

### 9. Optimize New Cluster

New statistics need to be gathered for the query planner.

```bash
# Analyze the database
sudo -u postgres vacuumdb --all --analyze-in-stages
```

### 10. Restart Application Services

```bash
# Start Apache
sudo systemctl start apache2

# Start Redis
sudo systemctl start redis-server

# Start Application
pm2 start all
```

**Test the application:**

- Login to the RHT Hotel system.
- Check the dashboard.
- Create a test reservation.
- View a report.

## Cleanup

**Only proceed once you are 100% sure everything is working.**

### 11. Remove Old Cluster

```bash
# List clusters again to be sure
pg_lsclusters

# Drop the old v16 cluster
sudo pg_dropcluster 16 main
```

### 12. Remove Old Packages

```bash
# Remove PostgreSQL 16 binaries
sudo apt-get purge postgresql-16 postgresql-client-16
sudo apt-get autoremove
```

## Rollback Plan

**If the upgrade fails:**

1. **Do NOT drop the old cluster** until verified.
2. **Revert Port**: Ensure v16 is listening on port 5432 in `/etc/postgresql/16/main/postgresql.conf`.
3. **Restart Old Service**: `sudo systemctl restart postgresql@16-main`.
4. **Restore Snapshot**: If you took a VPS snapshot, restoring it is the safest full revert.
5. **Restore SQL Dump**: If data is corrupted, drop the DB and restore from `pre_upgrade_dump_v16.sql`.

```bash
# Example SQL Restore (Emergency Only)
sudo -u postgres psql -f /tmp/pre_upgrade_dump_v16.sql postgres
```

---
**Last Updated**: 2025-12-27
**Target Version**: PostgreSQL 17+
