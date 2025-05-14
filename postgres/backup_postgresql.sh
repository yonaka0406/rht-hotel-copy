#!/bin/bash

# --- Configuration ---
# Database name is passed as argument
DB_NAME="$1"
BACKUP_DIR="/var/backups/postgresql"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${DATE_FORMAT}.dump"
PGUSER="rhtsys_user"

# --- Validate Input ---
if [ -z "$DB_NAME" ]; then
  echo "Error: No database name provided."
  echo "Usage: $0 <database_name>"
  exit 1
fi

# --- Perform Backup ---
set -e # Exit immediately if any command fails

echo "Starting PostgreSQL backup for database: $DB_NAME at $DATE_FORMAT"

# Note: Password should be handled via .pgpass or environment variable.
# Ensure your /root/.pgpass file has an entry for this database and user.
pg_dump -U "$PG_USER" -Fc "$DB_NAME" | gzip > "$BACKUP_FILE.gz"

echo "Backup completed successfully: $BACKUP_FILE.gz"

# Optional: Add cleanup for old backups here later if needed per database
# Example: find "$BACKUP_DIR" -name "${DB_NAME}-*.gz" -mtime +7 -delete