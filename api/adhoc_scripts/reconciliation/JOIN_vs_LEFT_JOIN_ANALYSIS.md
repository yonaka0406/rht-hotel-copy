# JOIN vs LEFT JOIN Analysis for reservation_rates

## Summary

This document analyzes all occurrences of `JOIN reservation_rates` in the accounting model to determine which need to be changed to `LEFT JOIN`.

## The Issue

When using `INNER JOIN reservation_rates`, any `reservation_details` records that don't have associated `reservation_rates` records are **completely excluded** from the query results. This causes sales calculations to be understated.

When using `LEFT JOIN reservation_rates`, all `reservation_details` are included, and the query logic handles missing rates by falling back to the `rd.price` value.

## Analysis Results

### Functions That NEEDED Fixing

#### 1. ✅ `getReconciliationHotelDetails` (line ~703)
**Status**: FIXED

**Issue**: Used `JOIN reservation_rates`, excluding details without rates from hotel-level client breakdown.

**Impact**: Table sum didn't match header total (e.g., ¥79,200 missing).

**Fix Applied**: Changed to `LEFT JOIN reservation_rates` and added proper COALESCE handling.

#### 2. ✅ `getReconciliationClientDetails` (line ~820)
**Status**: FIXED

**Issue**: Used `JOIN reservation_rates`, excluding details without rates from reservation-level breakdown.

**Impact**: Individual reservation sales could be understated in the drill-down view.

**Fix Applied**: Changed to `LEFT JOIN reservation_rates` and added proper COALESCE handling.

### Functions That Are CORRECT (No Fix Needed)

#### 3. ✅ `getDashboardMetrics` (line ~99)
**Status**: CORRECT - Already uses `LEFT JOIN`

```sql
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
```

#### 4. ✅ `getReconciliationOverview` (line ~563)
**Status**: CORRECT - Already uses `LEFT JOIN`

```sql
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
```

#### 5. ✅ `getLedgerPreview` (line ~469)
**Status**: CORRECT - Already uses `LEFT JOIN`

```sql
LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
```

#### 6. ✅ `validateLedgerDataIntegrity` (line ~302)
**Status**: CORRECT - Intentionally uses `JOIN`

**Why**: This is a **validation function** designed to identify discrepancies and missing rates. It intentionally uses:
- `rd_prices` CTE: Gets ALL reservation_details (no join to rates)
- `rr_prices` CTE: Gets rates separately with INNER JOIN (only details that HAVE rates)
- `discrepancies` CTE: LEFT JOIN to compare and identify which details are missing rates

The INNER JOIN is **by design** to isolate which reservation_details have rates vs which don't.

## Pattern for Correct Implementation

All sales calculation queries should follow this pattern:

```sql
WITH rr_base AS (
    SELECT 
        rd.id as rd_id,
        rd.date,
        CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END as total_rd_price,
        rr.id as rr_id,
        COALESCE(rr.tax_rate, 0.10) as tax_rate,
        CASE 
            WHEN rr.id IS NOT NULL THEN
                CASE WHEN rd.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd.number_of_people END
            ELSE 0
        END as rr_price,
        ROW_NUMBER() OVER (PARTITION BY rd.id ORDER BY COALESCE(rr.tax_rate, 0.10) DESC, rr.id DESC NULLS LAST) as rn
    FROM reservation_details rd
    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id  -- LEFT JOIN!
    WHERE ...
),
rr_totals AS (
    SELECT rd_id, SUM(rr_price) as sum_rr_price FROM rr_base GROUP BY rd_id
),
sales_agg AS (
    SELECT 
        ...,
        -- This handles the fallback: if rates exist, use them; otherwise use rd.price
        CASE WHEN b.rn = 1 THEN b.rr_price + (b.total_rd_price - t.sum_rr_price) ELSE b.rr_price END as amount
    FROM rr_base b
    JOIN rr_totals t ON b.rd_id = t.rd_id
    ...
)
```

## Key Points

1. **Sales Calculations**: Use `LEFT JOIN reservation_rates`
   - Ensures all billable reservation_details are included
   - Fallback logic handles missing rates

2. **Validation Functions**: May use `INNER JOIN reservation_rates`
   - When the purpose is to identify which details have/don't have rates
   - When comparing rates vs prices to find discrepancies

3. **Consistency**: All three reconciliation functions now use the same pattern:
   - `getReconciliationOverview` ✓
   - `getReconciliationHotelDetails` ✓ (fixed)
   - `getReconciliationClientDetails` ✓ (fixed)

## Testing

After applying these fixes:

1. Restart the API server
2. Check reconciliation page totals match at all levels:
   - Overview header totals
   - Hotel details table sums
   - Client details reservation sums
3. Run validation script to verify consistency

## Files Modified

- `api/models/accounting/read.js`:
  - Line ~703: `getReconciliationHotelDetails` - Changed to LEFT JOIN
  - Line ~820: `getReconciliationClientDetails` - Changed to LEFT JOIN
