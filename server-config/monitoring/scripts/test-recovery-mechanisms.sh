#!/bin/bash

# PostgreSQL Recovery Mechanisms Test Script
# This script implements the testing procedures documented in recovery-mechanisms.md

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_LOG="/var/log/postgresql/test-results/recovery-test-$(date +%Y%m%d-%H%M%S).log"
BACKUP_DIR="/tmp/recovery-test-backup"
TEST_DB="test_recovery"

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1" | tee -a "$TEST_LOG"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$TEST_LOG"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$TEST_LOG"
}

print_test() {
    echo -e "${BLUE}[TEST]${NC} $1" | tee -a "$TEST_LOG"
}

print_result() {
    local result="$1"
    local message="$2"
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}[PASS]${NC} $message" | tee -a "$TEST_LOG"
    else
        echo -e "${RED}[FAIL]${NC} $message" | tee -a "$TEST_LOG"
    fi
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "This script must be run as root"
        exit 1
    fi
}

# Function to create test log directory
setup_logging() {
    mkdir -p "$(dirname "$TEST_LOG")"
    echo "Recovery Mechanisms Test Report" > "$TEST_LOG"
    echo "Date: $(date)" >> "$TEST_LOG"
    echo "Tester: $(whoami)" >> "$TEST_LOG"
    echo "Environment: $(hostname)" >> "$TEST_LOG"
    echo "========================================" >> "$TEST_LOG"
}

# Function to create backup before testing
create_backup() {
    print_status "Creating backup before testing..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    if sudo -u postgres pg_dump -Fc rhthotels > "$BACKUP_DIR/pre_test_backup.dump" 2>/dev/null; then
        print_status "Database backup created successfully"
    else
        print_warning "Database backup failed, continuing with tests"
    fi
    
    # Backup configuration
    if cp -r /etc/postgresql/16/main "$BACKUP_DIR/postgresql_config_backup" 2>/dev/null; then
        print_status "Configuration backup created successfully"
    else
        print_warning "Configuration backup failed"
    fi
}

# Function to setup test environment
setup_test_environment() {
    print_status "Setting up test environment..."
    
    # Create test database
    if sudo -u postgres createdb "$TEST_DB" 2>/dev/null; then
        print_status "Test database created"
    else
        print_warning "Test database already exists or creation failed"
    fi
    
    # Create test data
    sudo -u postgres psql -d "$TEST_DB" -c "
    CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY, 
        data TEXT, 
        created_at TIMESTAMP DEFAULT NOW()
    );
    INSERT INTO test_table (data) 
    SELECT 'Test data ' || generate_series(1, 100)
    ON CONFLICT DO NOTHING;
    " >/dev/null 2>&1
    
    print_status "Test environment setup complete"
}

# Test 1.1: Normal Health Check Execution
test_health_check_normal() {
    print_test "Test 1.1: Normal Health Check Execution"
    
    # Run health check
    if /usr/local/bin/pg-health-check.sh >/dev/null 2>&1; then
        local exit_code=$?
        if [ $exit_code -eq 0 ]; then
            # Check log output
            if grep -q "INFO: PostgreSQL is healthy" /var/log/postgresql/health-check.log; then
                # Check failure count
                local failure_count=$(cat /var/run/postgresql/failure_count 2>/dev/null || echo "0")
                if [ "$failure_count" = "0" ]; then
                    print_result "PASS" "Health check executed successfully under normal conditions"
                    return 0
                else
                    print_result "FAIL" "Failure count not reset: $failure_count"
                fi
            else
                print_result "FAIL" "Health check log does not show healthy status"
            fi
        else
            print_result "FAIL" "Health check exit code: $exit_code"
        fi
    else
        print_result "FAIL" "Health check script execution failed"
    fi
    return 1
}

# Test 1.2: Health Check Performance Measurement
test_health_check_performance() {
    print_test "Test 1.2: Health Check Performance Measurement"
    
    # Measure execution time
    local start_time=$(date +%s%N)
    /usr/local/bin/pg-health-check.sh >/dev/null 2>&1
    local end_time=$(date +%s%N)
    
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
    
    if [ $duration -lt 10000 ]; then # Less than 10 seconds
        print_result "PASS" "Health check performance: ${duration}ms (< 10s)"
        return 0
    else
        print_result "FAIL" "Health check performance: ${duration}ms (>= 10s)"
        return 1
    fi
}

# Test 2.1: PostgreSQL Service Stop Simulation
test_service_stop_simulation() {
    print_test "Test 2.1: PostgreSQL Service Stop Simulation"
    
    print_status "Stopping PostgreSQL service..."
    systemctl stop postgresql
    
    # Wait for health checks to detect failure
    print_status "Waiting for health check failure detection..."
    sleep 180
    
    # Check if recovery was triggered
    local recovery_triggered=false
    if journalctl -u postgresql-recovery.service --since "3 minutes ago" | grep -q "Starting PostgreSQL recovery"; then
        recovery_triggered=true
    fi
    
    # Wait for recovery completion
    print_status "Waiting for recovery completion..."
    sleep 300
    
    # Verify PostgreSQL is running
    if systemctl is-active --quiet postgresql; then
        # Test database connectivity
        if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
            # Check failure count reset
            local failure_count=$(cat /var/run/postgresql/failure_count 2>/dev/null || echo "0")
            if [ "$failure_count" = "0" ] && [ "$recovery_triggered" = true ]; then
                print_result "PASS" "Service stop simulation and recovery successful"
                return 0
            else
                print_result "FAIL" "Recovery triggered: $recovery_triggered, Failure count: $failure_count"
            fi
        else
            print_result "FAIL" "Database connectivity test failed after recovery"
        fi
    else
        print_result "FAIL" "PostgreSQL service not running after recovery"
    fi
    
    # Ensure PostgreSQL is started for subsequent tests
    systemctl start postgresql
    return 1
}

# Test 2.4: Corrupted PID File Simulation
test_corrupted_pid_file() {
    print_test "Test 2.4: Corrupted PID File Simulation"
    
    # Stop PostgreSQL cleanly
    systemctl stop postgresql
    
    # Create corrupted PID file
    echo "invalid_pid_12345" | tee /var/lib/postgresql/16/main/postmaster.pid >/dev/null
    
    # Run recovery script
    if /usr/local/bin/pg-recovery.sh >/dev/null 2>&1; then
        # Check if PostgreSQL is running
        if systemctl is-active --quiet postgresql; then
            # Test connectivity
            if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
                # Verify PID file was cleaned up
                if [ ! -f /var/lib/postgresql/16/main/postmaster.pid ] || ! grep -q "invalid_pid" /var/lib/postgresql/16/main/postmaster.pid 2>/dev/null; then
                    print_result "PASS" "Corrupted PID file handled successfully"
                    return 0
                else
                    print_result "FAIL" "Corrupted PID file not cleaned up"
                fi
            else
                print_result "FAIL" "Database connectivity failed after PID file recovery"
            fi
        else
            print_result "FAIL" "PostgreSQL not running after PID file recovery"
        fi
    else
        print_result "FAIL" "Recovery script failed to handle corrupted PID file"
    fi
    
    # Cleanup and ensure PostgreSQL is running
    rm -f /var/lib/postgresql/16/main/postmaster.pid
    systemctl start postgresql
    return 1
}

# Test 3.1: Manual Recovery Script Execution
test_manual_recovery() {
    print_test "Test 3.1: Manual Recovery Script Execution"
    
    # Ensure PostgreSQL is running
    systemctl start postgresql
    
    # Get initial recovery count
    local initial_count=$(cat /var/run/postgresql/recovery_count 2>/dev/null || echo "0")
    
    # Run recovery script manually
    if /usr/local/bin/pg-recovery.sh >/dev/null 2>&1; then
        # Check if PostgreSQL is still running
        if systemctl is-active --quiet postgresql; then
            # Check if recovery count was incremented
            local final_count=$(cat /var/run/postgresql/recovery_count 2>/dev/null || echo "0")
            if [ "$final_count" -gt "$initial_count" ]; then
                print_result "PASS" "Manual recovery script execution successful"
                return 0
            else
                print_result "FAIL" "Recovery count not incremented: $initial_count -> $final_count"
            fi
        else
            print_result "FAIL" "PostgreSQL not running after manual recovery"
        fi
    else
        print_result "FAIL" "Manual recovery script execution failed"
    fi
    
    return 1
}

# Test 4.1: Email Alert Testing
test_email_alerts() {
    print_test "Test 4.1: Email Alert Testing"
    
    # Check if mail command is available
    if command -v mail >/dev/null 2>&1; then
        # Send test email
        if echo "Test email from PostgreSQL recovery testing" | mail -s "Recovery Test Alert" admin@example.com 2>/dev/null; then
            print_result "PASS" "Email alert system functional"
            return 0
        else
            print_result "FAIL" "Failed to send test email"
        fi
    else
        print_result "FAIL" "Mail command not available"
    fi
    
    return 1
}

# Test 5.1: End-to-End Recovery Testing
test_end_to_end_recovery() {
    print_test "Test 5.1: End-to-End Recovery Testing"
    
    # Record initial state
    local initial_connections=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
    
    # Simulate failure
    print_status "Simulating database failure..."
    systemctl stop postgresql
    
    # Monitor recovery with timeout
    print_status "Monitoring recovery process..."
    local recovery_timeout=600 # 10 minutes
    local elapsed=0
    
    while [ $elapsed -lt $recovery_timeout ]; do
        if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
            break
        fi
        sleep 10
        elapsed=$((elapsed + 10))
    done
    
    # Verify recovery
    if sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1; then
        local final_connections=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null | xargs)
        
        if [ $elapsed -lt $recovery_timeout ]; then
            print_result "PASS" "End-to-end recovery completed in ${elapsed}s"
            print_status "Initial connections: $initial_connections, Final connections: $final_connections"
            return 0
        else
            print_result "FAIL" "Recovery took longer than ${recovery_timeout}s"
        fi
    else
        print_result "FAIL" "Database not accessible after recovery timeout"
    fi
    
    # Ensure PostgreSQL is started
    systemctl start postgresql
    return 1
}

# Function to cleanup test environment
cleanup_test_environment() {
    print_status "Cleaning up test environment..."
    
    # Remove test database
    sudo -u postgres dropdb "$TEST_DB" 2>/dev/null || true
    
    # Reset failure and recovery counts
    echo "0" > /var/run/postgresql/failure_count 2>/dev/null || true
    echo "0" > /var/run/postgresql/recovery_count 2>/dev/null || true
    
    # Ensure PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        systemctl start postgresql
    fi
    
    print_status "Cleanup complete"
}

# Function to generate test report
generate_report() {
    local total_tests=$1
    local passed_tests=$2
    local failed_tests=$((total_tests - passed_tests))
    
    echo "" | tee -a "$TEST_LOG"
    echo "========================================" | tee -a "$TEST_LOG"
    echo "TEST SUMMARY" | tee -a "$TEST_LOG"
    echo "========================================" | tee -a "$TEST_LOG"
    echo "Total Tests: $total_tests" | tee -a "$TEST_LOG"
    echo "Passed: $passed_tests" | tee -a "$TEST_LOG"
    echo "Failed: $failed_tests" | tee -a "$TEST_LOG"
    echo "Success Rate: $(( (passed_tests * 100) / total_tests ))%" | tee -a "$TEST_LOG"
    echo "" | tee -a "$TEST_LOG"
    
    if [ $failed_tests -eq 0 ]; then
        print_status "All tests passed successfully!"
    else
        print_warning "$failed_tests test(s) failed. Check the log for details."
    fi
    
    print_status "Test report saved to: $TEST_LOG"
}

# Main test execution function
run_tests() {
    local test_mode="$1"
    local total_tests=0
    local passed_tests=0
    
    print_status "Starting PostgreSQL Recovery Mechanisms Testing"
    print_status "Test mode: $test_mode"
    
    case "$test_mode" in
        "basic")
            print_status "Running basic tests..."
            
            # Test 1.1: Normal Health Check
            total_tests=$((total_tests + 1))
            if test_health_check_normal; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Test 1.2: Performance Test
            total_tests=$((total_tests + 1))
            if test_health_check_performance; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Test 3.1: Manual Recovery
            total_tests=$((total_tests + 1))
            if test_manual_recovery; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Test 4.1: Email Alerts
            total_tests=$((total_tests + 1))
            if test_email_alerts; then
                passed_tests=$((passed_tests + 1))
            fi
            ;;
            
        "full")
            print_status "Running full test suite..."
            
            # Basic tests
            total_tests=$((total_tests + 1))
            if test_health_check_normal; then
                passed_tests=$((passed_tests + 1))
            fi
            
            total_tests=$((total_tests + 1))
            if test_health_check_performance; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Failure simulation tests
            total_tests=$((total_tests + 1))
            if test_service_stop_simulation; then
                passed_tests=$((passed_tests + 1))
            fi
            
            total_tests=$((total_tests + 1))
            if test_corrupted_pid_file; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Recovery tests
            total_tests=$((total_tests + 1))
            if test_manual_recovery; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Alert tests
            total_tests=$((total_tests + 1))
            if test_email_alerts; then
                passed_tests=$((passed_tests + 1))
            fi
            
            # Integration tests
            total_tests=$((total_tests + 1))
            if test_end_to_end_recovery; then
                passed_tests=$((passed_tests + 1))
            fi
            ;;
            
        *)
            print_error "Invalid test mode. Use 'basic' or 'full'"
            exit 1
            ;;
    esac
    
    generate_report $total_tests $passed_tests
}

# Function to display usage
show_usage() {
    echo "Usage: $0 [basic|full]"
    echo ""
    echo "Test modes:"
    echo "  basic  - Run basic health check and recovery tests (safe for production)"
    echo "  full   - Run complete test suite including failure simulations (use with caution)"
    echo ""
    echo "Examples:"
    echo "  $0 basic    # Run basic tests"
    echo "  $0 full     # Run full test suite"
    echo ""
    echo "Note: Full tests will temporarily stop PostgreSQL service"
}

# Main script execution
main() {
    local test_mode="${1:-basic}"
    
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    check_root
    setup_logging
    
    print_status "PostgreSQL Recovery Mechanisms Test Script"
    print_status "=========================================="
    
    # Confirm destructive tests
    if [ "$test_mode" = "full" ]; then
        echo ""
        print_warning "Full test mode will temporarily stop PostgreSQL service!"
        print_warning "This may cause service interruption."
        echo ""
        read -p "Are you sure you want to continue? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Test cancelled by user"
            exit 0
        fi
    fi
    
    create_backup
    setup_test_environment
    
    # Run tests
    run_tests "$test_mode"
    
    cleanup_test_environment
    
    print_status "Testing completed!"
}

# Execute main function with all arguments
main "$@"