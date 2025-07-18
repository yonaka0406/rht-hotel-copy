#!/bin/bash

# --- Configuration ---
# Database name is passed as argument
DB_NAME="$1"
BACKUP_DIR="/var/backups/postgresql"
DATE_FORMAT=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}-${DATE_FORMAT}.dump"
PG_USER="rhtsys_user"
GDRIVE_FOLDER_ID="$2"

# Path to the upload script
UPLOAD_SCRIPT="/usr/local/bin/upload_to_google_drive.js"

# --- Perform Backup ---
# Exit immediately if any command fails (set -e)
# Make set -e apply to commands within a pipe (set -o pipefail)
set -e 
set -o pipefail

# --- Validate Input ---
if [ -z "$DB_NAME" ]; then
  echo "Error: No database name provided."
  echo "Usage: $0 <database_name>"
  exit 1
fi
# Add validation for folder ID too
if [ -z "$GDRIVE_FOLDER_ID" ]; then
  echo "Error: No Google Drive folder ID provided."
  echo "Usage: $0 <database_name> <google_drive_folder_id>"
  exit 1
fi

echo "Starting PostgreSQL backup for database: $DB_NAME at $DATE_FORMAT"

# Note: Password should be handled via .pgpass or environment variable.
# Ensure your /root/.pgpass file has an entry for this database and user.
pg_dump -h localhost -U "$PG_USER" -Fc "$DB_NAME" | gzip > "$BACKUP_FILE.gz"

echo "Backup completed successfully: $BACKUP_FILE.gz"
