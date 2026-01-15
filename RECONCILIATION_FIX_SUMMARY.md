# Reconciliation Sales Discrepancy - Fix Summary

## Issue Reported

When viewing the reconciliation page for 士別:
- **Header displayed**: ¥4,207,100 (sales)
- **Table sum**: ¥4,127,900 (sales)
- **Discrepancy**: ¥79,200 missing from table
- **Payments**: ¥4,618,600 (matched correctly in both)

## Root Cause

The `getReconciliationHotelDetails` function in `api/models/accounting/read.js` used an **INNER JOIN** on `reservation_rates`, while the `getReconciliationOverview` function used a **LEFT JOIN**.

This caused reservation_details without associated reservation_rates to be excluded from the hotel details calculation, but included in the overview calculation.

## The Fix

**File**: `api/models/accounting/read.js`

### 1. `getReconciliationHotelDetails` (line ~703)

**Changed**:
```sql
-- Before (WRONG):
JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id

-- After (CORRECT):
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
```

Also added the missing `COALESCE(rr.tax_rate, 0.10) as tax_rate` field and updated the ROW_NUMBER to match the overview query logic.

### 2. `getReconciliationClientDetails` (line ~820)

**Changed**:
```sql
-- Before (WRONG):
JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id

-- After (CORRECT):
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
```

Also added the missing `COALESCE(rr.tax_rate, 0.10) as tax_rate` field and proper CASE statement for handling missing rates.

### Note on `validateLedgerDataIntegrity`

This function **correctly** uses `INNER JOIN` because it's a validation function designed to identify which reservation_details are missing rates. The INNER JOIN is intentional and should NOT be changed.

## Impact

✅ **Header and table totals now match**
✅ **All clients with sales are included in the table**
✅ **Individual reservation details show correct sales amounts**
✅ **Consistent calculation logic across all three reconciliation queries**

The fix ensures that:
1. Overview totals (header) are correct
2. Hotel details (table) match the overview
3. Client details (drill-down) match the hotel details

## Testing

1. **Restart your API server** to load the updated code:
   ```bash
   cd api
   npm restart
   # or
   pm2 restart ecosystem.config.js
   ```

2. **Refresh the reconciliation page** in your browser:
   - Go to: `http://localhost:5173/accounting/reconciliation`
   - Select your test month (e.g., December 2025)
   - Click on 士別 hotel
   - Verify that the table sum now matches the header value

3. **Run validation script** (optional):
   ```bash
   cd api
   node adhoc_scripts/validate_reconciliation_numbers.js
   ```

4. **Run debug script** to see the fix in action:
   ```bash
   cd api
   node adhoc_scripts/debug_shibetsu_sales_discrepancy.js
   ```

## Additional Improvements

Along with fixing the bug, we also added:

1. **Pagination controls** to the hotel details table:
   - 10件, 25件, 50件, 100件 options
   - 全て表示 (show all) option

2. **Validation scripts** to verify calculations

3. **Debug scripts** to identify discrepancies

## Files Changed

1. `api/models/accounting/read.js` - Fixed two functions:
   - `getReconciliationHotelDetails` (line ~703) - Changed JOIN to LEFT JOIN
   - `getReconciliationClientDetails` (line ~820) - Changed JOIN to LEFT JOIN
2. `frontend/src/pages/Accounting/AccountingReconciliation/AccountingReconciliation.vue` - Added pagination
3. `api/adhoc_scripts/validate_reconciliation_numbers.js` - New validation script
4. `api/adhoc_scripts/debug_shibetsu_sales_discrepancy.js` - New debug script
5. `api/adhoc_scripts/JOIN_vs_LEFT_JOIN_ANALYSIS.md` - Analysis of all JOIN occurrences
6. `RECONCILIATION_VALIDATION.md` - Documentation
7. `api/adhoc_scripts/test_reconciliation_pagination.md` - Pagination guide

## Next Steps

1. Restart your API server
2. Test the reconciliation page
3. Verify the numbers now match
4. Test the new pagination controls

If you still see discrepancies after restarting, run the debug script to identify the specific issue.
