# Reconciliation Debug & Validation Scripts

This folder contains scripts for debugging and validating the accounting reconciliation module.

## Scripts

### Validation Scripts

- **`validate_reconciliation_numbers.js`** - Validates reconciliation calculations for consistency
  - Checks overview totals match hotel details
  - Verifies mathematical consistency (payments = advance + settlement)
  - Validates difference calculations
  - Usage: `node api/adhoc_scripts/reconciliation/validate_reconciliation_numbers.js`

### Debug Scripts

- **`debug_shibetsu_sales_discrepancy.js`** - Identifies sales discrepancies between overview and hotel details
  - Compares overview vs hotel details calculations
  - Finds missing clients
  - Identifies reservation_details without rates
  - Usage: `node api/adhoc_scripts/reconciliation/debug_shibetsu_sales_discrepancy.js`

- **`debug_specific_client.js`** - Analyzes a specific client's status and calculations
  - Shows client financial data
  - Determines status based on cumulative_difference
  - Lists all reservations with details
  - Usage: Update client ID and hotel ID in script, then run

- **`find_missing_5900.js`** - Finds discrepancies in cumulative sales calculations
  - Lists all reservations for a client
  - Identifies which reservations have December activity
  - Calculates cumulative totals
  - Usage: Update client ID in script, then run

### Comparison Scripts

- **`compare_reconciliation_vs_dashboard.js`** - Compares reconciliation totals with dashboard/ledger
  - Validates that reconciliation excludes cancelled reservations
  - Checks if differences are explained by status filters
  - Usage: `node api/adhoc_scripts/reconciliation/compare_reconciliation_vs_dashboard.js`

## Documentation

- **`JOIN_vs_LEFT_JOIN_ANALYSIS.md`** - Analysis of all JOIN vs LEFT JOIN occurrences in accounting queries
  - Documents which functions needed fixing
  - Explains the pattern for correct implementation
  - Lists functions that are correct as-is

- **`test_reconciliation_pagination.md`** - Guide for testing the pagination feature
  - Explains how to access the new controls
  - Shows usage examples
  - Documents interaction with filters

## Configuration

Most scripts require database configuration from `api/.env`:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`

## Common Parameters to Adjust

When running these scripts, you typically need to adjust:
- `startDate` and `endDate` - The period to analyze (e.g., '2025-12-01' to '2025-12-31')
- `hotelId` or `hotelIds` - Which hotel(s) to analyze (e.g., 41 for 士別)
- `clientId` - For client-specific scripts

## Related Documentation

See the root-level documentation files:
- `RECONCILIATION_FIX_SUMMARY.md` - Quick reference for fixes applied
- `RECONCILIATION_VALIDATION.md` - Detailed validation guide and reconciliation logic explanation
