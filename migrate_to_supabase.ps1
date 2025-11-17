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

# Write-Log "Dumping local VPS database inside Docker container..."

# Dump from Docker container to a file inside the container in custom format
# docker exec -e PGPASSFILE=/tmp/.pgpass wehub-db pg_dump -h host.docker.internal -U $LOCAL_DB_USER -d $LOCAL_DB_NAME -Fc -f $TEMP_DUMP_CONTAINER

# if ($LASTEXITCODE -ne 0) {
#     Write-Log "Migration FAILED: Local dump failed"
#     docker exec wehub-db rm -f $TEMP_DUMP_CONTAINER
#     exit 1
# }

# Write-Log "Copying dump file from container to host..."
# docker cp "wehub-db:$TEMP_DUMP_CONTAINER" $TEMP_DUMP_HOST

# Find the most recent dump file in the temp directory
$latestDumpFile = Get-ChildItem -Path "temp" -Filter "vps_migration_*.dump" | Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $latestDumpFile) {
    Write-Log "ERROR: No dump file found in the 'temp' directory. Please run the dumping process first."
    exit 1
}

$TEMP_DUMP_HOST = $latestDumpFile.FullName

Write-Log "Using dump file: $TEMP_DUMP_HOST for restore."
Write-Log "Dropping and recreating public schema on Supabase..."
$env:PGPASSWORD = $SUPABASE_PASSWORD
psql -h $SUPABASE_DB_HOST -U $SUPABASE_DB_USER -d $SUPABASE_DB_NAME -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>&1 | Out-Null

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
