#!/bin/sh
set -e

echo "=== Starting database initialization ==="

# First, connect to the default 'postgres' database to drop and create our target database
echo "Dropping existing database 'wehub' if it exists..."
psql -U "$POSTGRES_USER" -d postgres -c "DROP DATABASE IF EXISTS wehub;"

echo "Creating database 'wehub'..."
createdb -U "$POSTGRES_USER" wehub

# Restore from backup if available
echo "Checking for backup file..."
if [ -f "/docker-entrypoint-initdb.d/wehub-backup.dump" ]; then
    echo "Restoring database from backup..."
    if ! pg_restore --verbose --no-acl --no-owner \
      --dbname=wehub \
      -U "$POSTGRES_USER" \
      /docker-entrypoint-initdb.d/wehub-backup.dump; then
        echo "Warning: Failed to restore from backup. Continuing with empty database."
    fi
else
    echo "No backup file found at /docker-entrypoint-initdb.d/wehub-backup.dump"
    echo "Initializing with empty database."
fi

echo "Setting up database user and permissions..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname wehub <<-EOSQL
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

echo "=== Database initialization completed successfully! ==="