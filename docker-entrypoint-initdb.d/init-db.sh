#!/bin/bash
set -e

# First, restore the database
pg_restore --verbose --no-acl --no-owner \
  --create \
  -U "$POSTGRES_USER" \
  -d postgres \
  /docker-entrypoint-initdb.d/wehub-backup.dump

# Wait for the database to be fully restored and available
sleep 5

# Apply necessary permissions
echo "Setting up database user and permissions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname wehub <<-EOSQL
    -- Only create the user if it doesn't exist
    DO \$\$
    BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rhtsys_user') THEN
            CREATE USER rhtsys_user WITH PASSWORD '${POSTGRES_PASSWORD:-password}';
        ELSE
            ALTER USER rhtsys_user WITH PASSWORD '${POSTGRES_PASSWORD:-password}';
        END IF;
    END
    \$\$;

    GRANT ALL PRIVILEGES ON DATABASE wehub TO rhtsys_user;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO rhtsys_user;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO rhtsys_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO rhtsys_user;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO rhtsys_user;
EOSQL

echo "Database initialization completed successfully!"