#!/bin/bash
set -e

# This command connects to the default 'postgres' database,
# creates the new database from the dump file's metadata,
# and then restores the data into it.
pg_restore --verbose --no-acl --no-owner \
  --create \
  -U "$POSTGRES_USER" \
  -d postgres \
  /docker-entrypoint-initdb.d/wehub-backup.dump

echo "✅ Database restore from wehub-backup.dump is complete."