# Provisory Reservation Implementation Summary

## Overview
This document summarizes the implementation of separate tracking for provisory (仮予約) reservations in the daily report system, completed on 2026-01-14.

## Business Requirement
Track and display provisional reservations separately from confirmed reservations in the daily Excel report, including:
- Sales with provisory reservations
- Occupancy rate with provisory reservations
- Room nights with provisory reservations
- Total planned rooms (forecast denominator)

## Excel Column Changes

### Before (Old Layout)
| Column | Field |
| :--- | :--- |
| A | 月度 |
| B | 計画売上 |
| C | 売上 |
| D | 確定泊数 |
| E | 計画稼働率 |
| F | 稼働率 |
| G | 前日集計日 |
| H | 前日実績売上 |
| I | 前日稼働率 |
| J | 前日確定泊数 |
| K | 確定泊数 |
| L | 販売可能室数 |
| M | ブロック数 |
| N | 正味販売可能室数 |

ADR/RevPAR: Columns V-AA

### After (New Layout)
| Column | Field | Description |
| :--- | :--- | :--- |
| A | 月度 | Month |
| B | 計画売上 | Forecast Sales |
| C | 売上 | Sales (confirmed only) |
| D | 売上（仮予約含む） | **NEW**: Sales including provisory |
| E | 計画稼働率 | Forecast Occupancy Rate |
| F | 稼働率 | Occupancy Rate (confirmed only) |
| G | 稼働率（仮予約含む） | **NEW**: Occupancy including provisory |
| H | 前日集計日 | Previous Day Metric Date |
| I | 前日実績売上 | Previous Day Actual Sales |
| J | 前日稼働率 | Previous Day Occupancy Rate |
| K | 前日確定泊数 | Previous Day Confirmed Stays |
| L | 確定泊数 | Confirmed Nights (confirmed only) |
| M | 確定泊数（仮予約含む） | **NEW**: Nights including provisory |
| N | 計画総室数 | **NEW**: Total Planned Rooms |

ADR/RevPAR: **Moved to Columns W-AB** (from V-AA)

## Technical Implementation

### 1. Database Layer Changes

#### File: `api/models/report/main.js`
**Function**: `selectCountReservation`

**Changes**:
- Added `reservation_status` field to `rd_base` CTE to track reservation status
- Added separate counts for confirmed and provisory reservations:
  - `confirmed_room_count`: Rooms with status 'confirmed', 'checked_in', 'checked_out'
  - `provisory_room_count`: Rooms with status 'provisory'
- Added separate revenue tracking:
  - `confirmed_accommodation_price`: Revenue from confirmed reservations
  - `provisory_accommodation_price`: Revenue from provisory reservations

**SQL Changes**:
```sql
-- Added to rd_base CTE
r.status AS reservation_status

-- Added to final SELECT
COUNT(
  CASE WHEN NOT rdb.cancelled AND rdb.is_accommodation 
       AND rdb.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
      THEN rdb.reservation_detail_id END
) AS confirmed_room_count,

COUNT(
  CASE WHEN NOT rdb.cancelled AND rdb.is_accommodation 
       AND rdb.reservation_status = 'provisory'
      THEN rdb.reservation_detail_id END
) AS provisory_room_count,

SUM(
  CASE WHEN rdb.reservation_status IN ('confirmed', 'checked_in', 'checked_out')
  THEN COALESCE(rr.accommodation_net_price, 0)
       + COALESCE(ra.accommodation_net_price_sum, 0)
  ELSE 0 END
) AS confirmed_accommodation_price,

SUM(
  CASE WHEN rdb.reservation_status = 'provisory'
  THEN COALESCE(rr.accommodation_net_price, 0)
       + COALESCE(ra.accommodation_net_price_sum, 0)
  ELSE 0 END
) AS provisory_accommodation_price
```

#### File: `api/models/report/occupation.js`
**Function**: `selectOccupationBreakdownByMonth`

**Changes**:
- Added `provisory_nights` field to track provisory reservations separately from hold status
- Updated both detail rows and summary rows to include provisory count

**SQL Changes**:
```sql
-- Added to plan_data CTE
COUNT(CASE WHEN r.status = 'provisory'
          AND r.type <> 'employee'
          AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS provisory_nights,

-- Added to summary UNION
SUM(pd.provisory_nights) AS provisory_nights,
```

### 2. Service Layer Changes

#### File: `api/jobs/services/frontendCompatibleReportService.js`

**Changes**:

1. **PMS Data Mapping** (lines ~170-180):
   - Added `confirmed_accommodation_revenue` field mapping
   - Added `provisory_accommodation_revenue` field mapping
   - Added `confirmed_room_count` field mapping
   - Added `provisory_room_count` field mapping

2. **Monthly Aggregates Initialization** (lines ~270-285):
   - Added `pms_confirmed_accommodation_revenue` to aggregate structure
   - Added `pms_provisory_accommodation_revenue` to aggregate structure

3. **PMS Data Aggregation** (lines ~290-350):
   - Added aggregation logic for confirmed accommodation revenue
   - Added aggregation logic for provisory accommodation revenue

4. **Revenue Data Building** (lines ~400-420):
   - Added `confirmed_accommodation_revenue` to revenue data output
   - Added `provisory_accommodation_revenue` to revenue data output

5. **Occupancy Aggregates** (lines ~460-470):
   - Added `confirmed_sold_rooms` tracking
   - Added `provisory_sold_rooms` tracking

6. **PMS Sold Rooms Processing** (lines ~475-495):
   - Added confirmed room count aggregation
   - Added provisory room count aggregation

7. **Future Outlook Data** (lines ~720-750):
   - Added `pmsConfirmedRevenue` and `pmsProvisoryRevenue` tracking
   - Updated `pms` object structure to include confirmed and provisory revenue

8. **Outlook Data Generation** (lines ~770-850):
   - Added `accommodationProvisoryNights` tracking
   - Added `totalActualSalesWithProvisory` calculation
   - Added new fields to outlookData:
     - `sales_with_provisory`
     - `occ_with_provisory`
     - `confirmed_nights_with_provisory`

### 3. Excel Template Service Changes

#### File: `api/controllers/report/services/dailyTemplateService.js`

**Changes**:

1. **Outlook Data Column Mapping** (lines ~90-105):
   - Updated column mapping to new layout:
     - Column D: `sales_with_provisory`
     - Column G: `occ_with_provisory`
     - Column M: `confirmed_nights_with_provisory`
     - Column N: `forecast_rooms` (total planned rooms)
   - Adjusted all subsequent columns accordingly

2. **KPI Data Column Range** (lines ~75-85):
   - Changed from columns V-AA (22-27) to W-AB (23-28)
   - Updated comment to reflect new range

## Field Definitions

### New Fields

1. **売上（仮予約含む）** (`sales_with_provisory`)
   - Calculation: Confirmed sales + Provisory sales
   - Source: PMS `confirmed_accommodation_price` + `provisory_accommodation_price`

2. **稼働率（仮予約含む）** (`occ_with_provisory`)
   - Calculation: (Confirmed nights + Provisory nights) ÷ Total planned rooms × 100
   - Source: `(confirmed_nights + provisory_nights) / forecast_rooms * 100`

3. **確定泊数（仮予約含む）** (`confirmed_nights_with_provisory`)
   - Calculation: Confirmed nights + Provisory nights
   - Source: `confirmed_room_count` + `provisory_room_count`

4. **計画総室数** (`forecast_rooms`)
   - Description: Total planned rooms used as denominator in occupancy calculations
   - Source: `forecast_rooms` from forecast data, fallback to `total_bookable_room_nights`

## Data Flow

```
Database (selectCountReservation)
  ↓ Returns: confirmed_room_count, provisory_room_count, 
             confirmed_accommodation_price, provisory_accommodation_price
frontendCompatibleReportService.js
  ↓ Aggregates: Monthly totals for confirmed and provisory data
  ↓ Calculates: occupancy rates, sales totals with/without provisory
dailyTemplateService.js
  ↓ Maps to Excel columns: D, G, M, N
Excel Template (デイリーテンプレート.xlsx)
  ↓ Displays: Separate columns for confirmed-only and with-provisory data
```

## Testing Recommendations

1. **Database Query Testing**:
   - Verify `confirmed_room_count` + `provisory_room_count` = `room_count`
   - Verify `confirmed_accommodation_price` + `provisory_accommodation_price` ≤ `accommodation_price`
   - Test with hotels having only confirmed, only provisory, and mixed reservations

2. **Service Layer Testing**:
   - Verify monthly aggregation correctly sums confirmed and provisory data
   - Test with multiple hotels and multiple months
   - Verify fallback logic when accounting data is present

3. **Excel Output Testing**:
   - Verify column D shows higher or equal value to column C
   - Verify column G shows higher or equal percentage to column F
   - Verify column M shows higher or equal count to column L
   - Verify ADR/RevPAR data appears in columns W-AB

4. **Edge Cases**:
   - Hotels with no provisory reservations (should show same values in C/D, F/G, L/M)
   - Hotels with only provisory reservations
   - Months with no reservations at all

## Backward Compatibility

- Existing fields remain unchanged (columns A-C, E-F, H-L)
- New fields are additions, not replacements
- Old reports will continue to work but won't show provisory data
- Excel template must be updated to include new columns

## Performance Considerations

- Added CASE statements in SQL queries have minimal performance impact
- Monthly aggregation logic processes additional fields but maintains O(n) complexity
- No additional database queries required (data fetched in existing queries)

## Future Enhancements

1. Add provisory data to previous year comparison
2. Add provisory breakdown by plan type
3. Add trend analysis for provisory-to-confirmed conversion rates
4. Add alerts when provisory percentage exceeds threshold

## Related Files Modified

1. `rht-hotel/api/models/report/main.js`
2. `rht-hotel/api/models/report/occupation.js`
3. `rht-hotel/api/jobs/services/frontendCompatibleReportService.js`
4. `rht-hotel/api/controllers/report/services/dailyTemplateService.js`
5. `rht-hotel/DAILY_REPORT_RENEWAL.md` (documentation)

## Deployment Notes

1. Database schema changes: None (uses existing status field)
2. Excel template: Must be updated with new column layout
3. API changes: Backward compatible (adds new fields, doesn't remove old ones)
4. Testing: Recommended to test with production-like data before deployment
