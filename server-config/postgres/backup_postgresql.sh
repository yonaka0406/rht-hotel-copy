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

# --- Upload to Google Drive ---
echo "Uploading $BACKUP_FILE.gz to Google Drive folder $GDRIVE_FOLDER_ID..."

# Get the global npm modules path for the current user (which will be root when run by the service or sudo)
# The 2>/dev/null suppresses errors if npm isn't found or misconfigured, though it should be fine.
NPM_GLOBAL_MODULES_PATH=$(npm root -g 2>/dev/null)

if [ -n "$NPM_GLOBAL_MODULES_PATH" ] && [ -d "$NPM_GLOBAL_MODULES_PATH" ]; then
  echo "Attempting to use NODE_PATH: $NPM_GLOBAL_MODULES_PATH"
  NODE_PATH="$NPM_GLOBAL_MODULES_PATH" "$UPLOAD_SCRIPT" "$BACKUP_FILE.gz" "$GDRIVE_FOLDER_ID"
else
  echo "Warning: Could not determine npm global modules path via 'npm root -g'."
  echo "Attempting to run upload script without explicit NODE_PATH."
  "$UPLOAD_SCRIPT" "$BACKUP_FILE.gz" "$GDRIVE_FOLDER_ID"
fi

echo "Upload to Google Drive finished."