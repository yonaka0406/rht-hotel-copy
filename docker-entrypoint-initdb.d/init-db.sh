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

# Wait for the database to be fully restored and available
sleep 5

# Apply necessary permissions
echo "Applying database permissions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname wehub <<-EOSQL
    GRANT USAGE ON SCHEMA public TO rhtsys_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rhtsys_user;
    GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO rhtsys_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rhtsys_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO rhtsys_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO rhtsys_user;
EOSQL

echo "Database initialization completed successfully!"

echo "✅ Database restore from wehub-backup.dump is complete."