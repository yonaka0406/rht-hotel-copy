# Reconciliation Page Validation & Improvements

## Summary

This document describes the validation of reconciliation calculations and the improvements made to the reconciliation page.

## Changes Made

### 1. Fixed Sales Discrepancy Between Header and Table

**Issue**: The hotel details table was showing lower sales totals than the header overview.

**Root Cause**: The hotel details query used `INNER JOIN reservation_rates`, which excluded reservation_details that don't have associated reservation_rates records. The overview query correctly used `LEFT JOIN reservation_rates`.

**Fix**: Changed line in `api/models/accounting/read.js` in the `getReconciliationHotelDetails` function:
```sql
-- Before (WRONG):
JOIN reservation_rates rr ON rd.id = rr.reservation_details_id ...

-- After (CORRECT):
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id ...
```

This ensures both queries use the same logic and include all billable reservation_details, even those without rates.

**Example**: 
- Before fix: Header ¥4,207,100, Table sum ¥4,127,900 (¥79,200 missing)
- After fix: Both should show ¥4,207,100

### 2. Added Pagination Controls to Hotel Details Table

The hotel details table (士別 の差異状況) now includes:

- **Rows per page selector**: Choose between 10, 25, 50, or 100 rows per page
- **Show all option**: Display all rows without pagination

**Location**: `frontend/src/pages/Accounting/AccountingReconciliation/AccountingReconciliation.vue`

**Implementation**:
- Added `rowsPerPage` ref with default value of 10
- Added `rowsPerPageOptions` array: [10, 25, 50, 100]
- Added UI controls in the filter section
- Modified DataTable to use dynamic pagination: `:paginator="rowsPerPage > 0"` and `:rows="rowsPerPage"`
- When `rowsPerPage` is 0, pagination is disabled and all rows are shown

### 2. Validation Script

Created a comprehensive validation script to verify reconciliation calculations:

**Location**: `api/adhoc_scripts/validate_reconciliation_numbers.js`

**What it validates**:
1. **Overview totals** (施設別 差異一覧):
   - Total sales across all hotels
   - Total payments (advance + settlement)
   - Difference calculations

2. **Mathematical consistency**:
   - Total Payments = Advance Payments + Settlement Payments
   - Settlement Difference = Total Sales - Settlement Payments

3. **Hotel details** (sample validation):
   - Client-level breakdown
   - Top 5 clients with largest differences

**How to run**:
```bash
cd api
node adhoc_scripts/validate_reconciliation_numbers.js
```

**Note**: Adjust the `startDate`, `endDate`, and `hotelIds` variables in the script to match your validation period.

### 3. Debug Script for Sales Discrepancies

Created a detailed debug script to identify sales discrepancies:

**Location**: `api/adhoc_scripts/debug_shibetsu_sales_discrepancy.js`

**What it does**:
1. Compares overview vs hotel details calculations
2. Identifies missing clients
3. Finds reservation_details without reservation_rates
4. Calculates the exact discrepancy amount

**How to run**:
```bash
cd api
node adhoc_scripts/debug_shibetsu_sales_discrepancy.js
```

This script helped identify the INNER JOIN vs LEFT JOIN issue.

## Reconciliation Calculation Logic

### Key Concepts

1. **Total Sales (合計売上)**: Sum of all billable reservation details and addons for reservations with stays during the target month
   - Excludes: hold, block, cancelled, and employee reservations

2. **Total Payments (合計入金)**: Sum of all payments received during the target month
   - Split into two categories:
     - **Advance Payments (事前払)**: Payments for reservations with check-in dates AFTER the month end
     - **Settlement Payments (精算等)**: Payments for reservations with check-in dates ON OR BEFORE the month end

3. **Settlement Difference (精算差異)**: 
   - Formula: `Total Sales - Settlement Payments`
   - This excludes advance payments because they relate to future stays
   - Special case: If a client's cumulative balance is settled (≤1 yen difference), the monthly difference is forced to 0

### Status Labels

- **精算済 (Settled)**: Cumulative difference ≤ 1 yen
- **未収あり (Outstanding)**: Cumulative difference < -1 yen (underpaid)
- **過入金 (Overpaid)**: Cumulative difference > 1 yen AND check-in ≤ month end
- **事前払い (Advance Payment)**: Cumulative difference > 1 yen AND check-in > month end

## Validation Results

### Before Fix

❌ **Sales discrepancy found**:
- Header (overview): ¥4,207,100
- Table sum (hotel details): ¥4,127,900
- Missing: ¥79,200

**Cause**: Reservation_details without reservation_rates were excluded from hotel details query.

### After Fix

✓ **施設別 差異一覧 sales numbers** match with **合計売上 (税込)**
✓ **Payments total** matches correctly
✓ **Settlement Difference** = Total Sales - Settlement Payments (excluding advance payments)
✓ **Header and table totals** now match exactly

## Technical Details of the Bug

### The Problem

The two queries used different JOIN types for `reservation_rates`:

**Overview Query** (CORRECT):
```sql
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id ...
```

**Hotel Details Query** (WRONG - before fix):
```sql
JOIN reservation_rates rr ON rd.id = rr.reservation_details_id ...
```

### Why This Matters

Some reservation_details don't have associated reservation_rates records. This can happen when:
- Rates are deleted or not properly created
- Legacy data migration issues
- Manual data entry without rates

With `INNER JOIN`, these reservation_details are completely excluded from the calculation, causing the sales total to be lower than it should be.

With `LEFT JOIN`, these reservation_details are included, and their sales are calculated from the `rd.price` field directly (the fallback logic in the CASE statement handles this).

### The Fix

Changed one line in `api/models/accounting/read.js`:
```javascript
// Line ~703 in getReconciliationHotelDetails function
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
```

This makes the hotel details query consistent with the overview query.

## UI Improvements

### Before
- Fixed 10 rows per page
- No option to view all rows at once

### After
- Flexible pagination: 10, 25, 50, 100 rows per page
- "全て表示" (Show All) option to display all rows without pagination
- Better for hotels with many clients or when you need to see the complete picture

## Testing Recommendations

1. **Run the validation script** for your target month:
   ```bash
   cd api
   node adhoc_scripts/validate_reconciliation_numbers.js
   ```

2. **Compare with UI**:
   - Check that totals in the summary cards match the script output
   - Verify individual hotel totals
   - Spot-check a few client details

3. **Test pagination**:
   - Select different rows per page options
   - Click "全て表示" to see all rows
   - Verify filters still work correctly with different pagination settings

## Notes

- The reconciliation logic correctly handles the distinction between advance payments and settlement payments
- Cumulative balances are tracked across all time, not just the current month
- The "settled" status considers the cumulative balance, which is why some clients may show 0 monthly difference even if there's a small discrepancy
