# Profit & Loss Statement Feature

## Overview

The P&L Statement feature provides comprehensive financial reporting based on imported Yayoi accounting data. It supports flexible viewing by department, hotel, and time period with automatic resolution of historical department name changes.

## Key Features

### 1. Historical Department Mapping

The system handles department name changes over time through the `acc_departments` table:

- **Current Mappings** (`is_current = true`): Used for exports and current operations
- **Historical Mappings** (`is_current = false`): Used for resolving imported data from previous periods
- **Date Ranges**: Optional `valid_from` and `valid_to` columns for precise period tracking

**Example Scenario:**
```
Hotel ID 24 was called "WH室蘭" in 2024
Hotel ID 24 is now called "WH室蘭本館" in 2025

acc_departments table:
| hotel_id | name        | is_current | valid_from | valid_to   |
|----------|-------------|------------|------------|------------|
| 24       | WH室蘭      | false      | 2023-01-01 | 2024-12-31 |
| 24       | WH室蘭本館  | true       | 2025-01-01 | NULL       |
```

When viewing P&L data, both mappings are used to resolve department names to hotels, ensuring historical data displays correctly.

### 2. Flexible Grouping Options

Users can view P&L data grouped by:

- **Monthly** (`groupBy: 'month'`): Aggregate all hotels by month
- **By Hotel** (`groupBy: 'hotel'`): Aggregate by hotel across all months
- **By Department** (`groupBy: 'department'`): Aggregate by department name
- **Hotel × Month** (`groupBy: 'hotel_month'`): Detailed breakdown by hotel and month
- **Department × Month** (`groupBy: 'department_month'`): Detailed breakdown by department and month

### 3. Management Group Hierarchy

Data is organized by the 10 management groups defined in the system:

1. 売上高 (Revenue)
2. 売上原価 (Cost of Sales)
3. 人件費 (Personnel Expenses)
4. 経費 (Operating Expenses)
5. 減価償却費 (Depreciation)
6. 営業外収入 (Non-Operating Income)
7. 営業外費用 (Non-Operating Expenses)
8. 特別利益 (Extraordinary Income)
9. 特別損失 (Extraordinary Losses)
10. 法人税等 (Income Tax)

### 4. Calculated Metrics

The system automatically calculates:

- **Gross Profit** = Revenue + Cost of Sales
- **Operating Profit** = Gross Profit + Personnel + Operating Expenses + Depreciation
- **Ordinary Profit** = Operating Profit + Non-Operating Income + Non-Operating Expenses
- **Profit Before Tax** = Ordinary Profit + Extraordinary Income + Extraordinary Losses
- **Net Profit** = Profit Before Tax + Income Tax

## Database Views

### acc_profit_loss

The main P&L view that:
1. Resolves department names to hotels using ALL mappings (current + historical)
2. Filters to only P&L accounts (excludes balance sheet accounts)
3. Categorizes amounts by management group
4. Provides pre-calculated columns for each P&L section

```sql
SELECT 
    month,
    department,
    hotel_id,
    hotel_name,
    management_group_name,
    account_code,
    account_name,
    net_amount,
    revenue,
    cost_of_sales,
    operating_expenses,
    -- ... other categories
FROM acc_profit_loss
WHERE month BETWEEN '2024-01-01' AND '2024-12-01'
  AND hotel_id = 24
ORDER BY month, management_group_display_order;
```

## API Endpoints

### GET /api/accounting/profit-loss
Get detailed P&L data with all account-level details.

**Query Parameters:**
- `startMonth` (string): Start month in YYYY-MM-DD format
- `endMonth` (string): End month in YYYY-MM-DD format
- `hotelIds` (array): Filter by specific hotel IDs
- `departmentNames` (array): Filter by specific department names

### GET /api/accounting/profit-loss/summary
Get summarized P&L data grouped by management group.

**Query Parameters:**
- Same as above, plus:
- `groupBy` (string): 'month' | 'hotel' | 'department' | 'hotel_month' | 'department_month'

### GET /api/accounting/profit-loss/months
Get list of available months from imported data.

### GET /api/accounting/profit-loss/departments
Get list of available departments with hotel information.

## Frontend Component

**Location:** `frontend/src/pages/Accounting/AccountingProfitLoss/AccountingProfitLoss.vue`

**Features:**
- Period selection with month dropdowns
- Hotel multi-select filter
- View grouping selector
- Hierarchical table display
- CSV export functionality
- Responsive design with sticky headers
- Real-time total calculations

## Usage Workflow

1. **Import Yayoi Data**: Use the Yayoi Import feature to load accounting data into `acc_yayoi_data`
2. **Configure Departments**: Ensure all department names are mapped in Settings > Departments
   - Add current mappings with `is_current = true`
   - Add historical mappings with `is_current = false` for old department names
3. **View P&L**: Navigate to Accounting > P&L Statement
4. **Filter Data**: Select period, hotels, and grouping option
5. **Analyze**: Review hierarchical breakdown by management group
6. **Export**: Download CSV for further analysis

## Best Practices

### Managing Historical Mappings

When a department name changes:

1. Update the existing mapping to set `is_current = false` and add `valid_to` date
2. Create a new mapping with the new name, `is_current = true`, and `valid_from` date
3. Both mappings will be used for P&L resolution, ensuring continuity

### Data Quality

- Ensure all account codes in imported Yayoi data match the `acc_account_codes.name` field
- Verify department names in imported data match entries in `acc_departments.name`
- Unmapped departments will show as "未割当" (Unassigned) in reports

### Performance

- The `acc_profit_loss` view is optimized with indexes on:
  - `acc_departments(hotel_id, is_current)`
  - `acc_departments(name)`
  - `acc_monthly_account_summary` underlying indexes
- For large datasets, consider filtering by specific hotels or shorter date ranges

## Troubleshooting

**Issue:** Historical data shows "未割当" (Unassigned)
- **Solution:** Add historical department mappings with `is_current = false`

**Issue:** Totals don't match expectations
- **Solution:** Verify tax adjustments in `acc_monthly_account_summary` view (控不 → 0%, 80% → 80%)

**Issue:** Missing months in dropdown
- **Solution:** Ensure Yayoi data has been imported for those periods

## Future Enhancements

- Comparative period analysis (YoY, MoM)
- Budget vs Actual reporting
- Drill-down to transaction details
- Chart visualizations
- Automated report scheduling
- Multi-currency support
