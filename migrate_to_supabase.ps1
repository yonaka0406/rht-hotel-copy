# Function to parse .env file and load variables
function Load-Env {
    $envPath = ".env"
    if (Test-Path $envPath) {
        Get-Content $envPath | ForEach-Object {
            $line = $_.Trim()
            if ($line -and $line -notlike '#*') {
                $parts = $line -split '=', 2
                if ($parts.Length -eq 2) {
                    $key = $parts[0].Trim()
                    $value = $parts[1].Trim()
                    [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
                }
            }
        }
    }
}

# Load .env variables
Load-Env

# PowerShell Migration Script
# Run this on Windows host where Docker is running

$ErrorActionPreference = "Stop"

# Configuration
$LOCAL_DB_USER = $env:LOCAL_DB_USER
$LOCAL_DB_NAME = $env:LOCAL_DB_NAME
$LOCAL_DB_HOST = $env:LOCAL_DB_HOST
$LOCAL_DB_PORT = $env:LOCAL_DB_PORT
$LOCAL_PASSWORD = $env:LOCAL_PASSWORD

$SUPABASE_DB_USER = $env:SUPABASE_DB_USER
$SUPABASE_DB_HOST = $env:SUPABASE_DB_HOST
$SUPABASE_DB_NAME = $env:SUPABASE_DB_NAME
$SUPABASE_PASSWORD = $env:SUPABASE_PASSWORD

$TEMP_DUMP_CONTAINER = "/tmp/vps_migration_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
$TEMP_DUMP_HOST = "temp\vps_migration_$(Get-Date -Format 'yyyyMMdd_HHmmss').dump"
$LOG_FILE = "temp\supabase_migration.log"

# Create temp directory if it doesn't exist
if (!(Test-Path "temp")) {
    New-Item -ItemType Directory -Path "temp" | Out-Null
}

# Log function
function Write-Log {
    param($Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] $Message"
    Write-Host $logMessage
    Add-Content -Path $LOG_FILE -Value $logMessage
}

Write-Log "---"
Write-Log "Migration started"

# Check if Docker container is running
$containerRunning = docker ps --filter "name=wehub-db" --format "{{.Names}}"
if ($containerRunning -ne "wehub-db") {
    Write-Log "ERROR: wehub-db container is not running"
    exit 1
}

Write-Log "Dumping local VPS database inside Docker container..."

# Dump from Docker container to a file inside the container in custom format
docker exec -e PGPASSFILE=/tmp/.pgpass wehub-db pg_dump -h host.docker.internal -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -Fc -f $TEMP_DUMP_CONTAINER

if ($LASTEXITCODE -ne 0) {
    Write-Log "Migration FAILED: Local dump failed"
    docker exec wehub-db rm -f $TEMP_DUMP_CONTAINER
    exit 1
}

# Find the most recent dump file in the temp directory
$latestDumpFile = Get-ChildItem -Path "temp" -Filter "vps_migration_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
if (-not $latestDumpFile) {
    Write-Log "ERROR: No dump file found in the 'temp' directory. Please run the dumping process first."
    exit 1
}
$TEMP_DUMP_HOST = $latestDumpFile.FullName

Write-Log "Copying dump file from container to host..."

docker cp "wehub-db:$TEMP_DUMP_CONTAINER" $TEMP_DUMP_HOST

Write-Log "Using dump file: $TEMP_DUMP_HOST for restore."

# Drop and recreate public schema in batches
Drop-PublicSchemaInBatches

Write-Log "Restoring to Supabase from host..."

# Set PGPASSWORD for pg_restore on host
$env:PGPASSWORD = $SUPABASE_PASSWORD
pg_restore -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME --no-owner --no-privileges $TEMP_DUMP_HOST 2>&1 | Tee-Object -Append -FilePath $LOG_FILE

# Cleanup
docker exec wehub-db rm -f $TEMP_DUMP_CONTAINER
Remove-Item $TEMP_DUMP_HOST
Write-Log "Migration successful"
Write-Log "Migration complete"

exit 0

# Function to drop public schema in batches to avoid "out of shared memory" error
function Drop-PublicSchemaInBatches {
    param(
        [int]$BatchSize = 100
    )

    Write-Log "Dropping public schema in batches..."

    # Create a temporary directory for batch files
    $tmpDir = Join-Path -Path $env:TEMP -ChildPath ("drop_public_" + [guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
    $originalLocation = Get-Location
    Set-Location $tmpDir
    Write-Log "Using temp dir for batch drop: $tmpDir"

    # Create a temporary .pgpass file for authentication
    $pgpassFile = Join-Path $tmpDir ".pgpass"
    $pgpassContent = "$($env:SUPABASE_DB_HOST):5432:$($env:SUPABASE_DB_NAME):$($env:SUPABASE_DB_USER):$($env:SUPABASE_PASSWORD)"
    Set-Content -Path $pgpassFile -Value $pgpassContent
    $env:PGPASSFILE = $pgpassFile

    # Set up psql connection arguments
    $psqlArgsPrefix = @("-h", $env:SUPABASE_DB_HOST, "-U", $env:SUPABASE_DB_USER, "-d", $env:SUPABASE_DB_NAME)

    function Run-SqlToFile {
        param(
            [string]$Sql,
            [string]$OutFile
        )
        $args = @()
        $args += $psqlArgsPrefix
        $args += @("-At", "-c", $Sql)
        & "psql" $args > $OutFile
    }

    # 1) Views
    Run-SqlToFile "SELECT 'DROP VIEW IF EXISTS public.' || quote_ident(table_name) || ' CASCADE;' FROM information_schema.views WHERE table_schema='public' ORDER BY table_name;" "drops_views.sql"

    # 2) Materialized views
    Run-SqlToFile "SELECT 'DROP MATERIALIZED VIEW IF EXISTS public.' || quote_ident(matviewname) || ' CASCADE;' FROM pg_matviews WHERE schemaname='public' ORDER BY matviewname;" "drops_matviews.sql"

    # 3) Foreign tables
    Run-SqlToFile "SELECT 'DROP FOREIGN TABLE IF EXISTS public.' || quote_ident(foreign_table_name) || ' CASCADE;' FROM information_schema.foreign_tables WHERE foreign_table_schema='public' ORDER BY foreign_table_name;" "drops_foreign_tables.sql"

    # 4) Tables
    Run-SqlToFile "SELECT 'DROP TABLE IF EXISTS public.' || quote_ident(tablename) || ' CASCADE;' FROM pg_tables WHERE schemaname='public' ORDER BY tablename;" "drops_tables.sql"

    # 5) Sequences
    Run-SqlToFile "SELECT 'DROP SEQUENCE IF EXISTS public.' || quote_ident(sequence_name) || ' CASCADE;' FROM information_schema.sequences WHERE sequence_schema='public' ORDER BY sequence_name;" "drops_sequences.sql"

    # 6) Functions
    Run-SqlToFile "SELECT 'DROP FUNCTION IF EXISTS public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') CASCADE;' FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e' WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p') AND d.objid IS NULL ORDER BY p.proname;" "drops_functions.sql"

    # 7) Types (user-defined composite types)
    Run-SqlToFile "SELECT 'DROP TYPE IF EXISTS public.' || t.typname || ' CASCADE;' FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname='public' AND t.typtype = 'c' ORDER BY t.typname;" "drops_types.sql"

    # 8) Extensions in public (be cautious) - SKIPPING
    "" > "drops_extensions.sql"

    # Combine files in logical order
    Get-Content drops_views.sql, drops_matviews.sql, drops_foreign_tables.sql, drops_tables.sql, drops_sequences.sql, drops_functions.sql, drops_types.sql, drops_extensions.sql |
      Where-Object { $_ -and $_.Trim() -ne "" } |
      Set-Content all_drops_nonempty.sql

    $totalDrops = (Get-Content all_drops_nonempty.sql | Measure-Object -Line).Lines
    Write-Log "Generated $totalDrops DROP statements."

    # Split into batch files
    $lines = Get-Content all_drops_nonempty.sql
    $batchIndex = 0
    for ($i = 0; $i -lt $lines.Count; $i += $BatchSize) {
        $batchIndex++
        $chunk = $lines[$i..([math]::Min($i + $BatchSize - 1, $lines.Count - 1))]
        $batchFile = ("batch_{0:0000}.sql" -f $batchIndex)
        $chunk | Set-Content $batchFile
    }

    # Execute each batch file with psql
    $batchFiles = Get-ChildItem -Path . -Filter "batch_*.sql" | Sort-Object Name
    $idx = 0
    foreach ($bf in $batchFiles) {
        $idx++
        Write-Log "Running batch ${idx}: $($bf.Name)..."
        $args = @()
        $args += $psqlArgsPrefix
        $args += @("-v", "ON_ERROR_STOP=1", "-f", $bf.FullName)
        $proc = Start-Process -FilePath "psql" -ArgumentList $args -NoNewWindow -Wait -PassThru
        if ($proc.ExitCode -ne 0) {
            Write-Log "ERROR: psql returned non-zero exit code $($proc.ExitCode) on $($bf.Name). Stopping."
            Set-Location $originalLocation
            exit $proc.ExitCode
        }
        Write-Log "Batch $idx complete."
    }

    # Recreate public schema
    Write-Log "Recreating public schema..."
    $createSqlFile = "create_schema.sql"
    "CREATE SCHEMA IF NOT EXISTS public;" | Set-Content $createSqlFile
    $args = @()
    $args += $psqlArgsPrefix
    $args += @("-v", "ON_ERROR_STOP=1", "-f", $createSqlFile)
    Start-Process -FilePath "psql" -ArgumentList $args -NoNewWindow -Wait

    Write-Log "Public schema recreated."
    Set-Location $originalLocation
    # Do not delete temp dir for inspection: Write-Log "Done. Temp dir: $tmpDir"
    Remove-Item $pgpassFile -ErrorAction SilentlyContinue
}
