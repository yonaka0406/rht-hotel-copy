# Testing the New Pagination Controls

## Location

The new pagination controls appear in the **hotel details view** when you click on a hotel from the 施設別 差異一覧 table.

## How to Access

1. Go to: `http://localhost:5173/accounting/reconciliation`
2. Click on any hotel row in the 施設別 差異一覧 table
3. You'll see the hotel details table with the new controls

## New Controls Layout

The filter section now has three rows:

```
┌─────────────────────────────────────────────────────────────┐
│ 入金状況: [全て] [未収あり] [過入金あり] [精算済]              │
├─────────────────────────────────────────────────────────────┤
│ 予約種別: [全て] [OTA/WEB] [その他]                          │
├─────────────────────────────────────────────────────────────┤
│ 表示件数: [10件] [25件] [50件] [100件] [全て表示]            │  ← NEW!
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Show 10 rows per page (default)
- Click **10件** button
- Pagination controls appear at the bottom of the table

### Show 25 rows per page
- Click **25件** button
- Useful for medium-sized client lists

### Show 50 rows per page
- Click **50件** button
- Good for larger hotels

### Show 100 rows per page
- Click **100件** button
- For very large hotels

### Show all rows (no pagination)
- Click **全て表示** button
- Pagination controls disappear
- All rows are displayed at once
- Useful for:
  - Exporting/printing the full list
  - Getting a complete overview
  - Using browser search (Ctrl+F) across all rows

## Interaction with Filters

The pagination works seamlessly with the existing filters:

1. **Status filters** (入金状況) still work
2. **Type filters** (予約種別) still work
3. Pagination applies to the **filtered results**

Example:
- If you select "未収あり" (Outstanding) and get 45 results
- With "10件" selected, you'll see 5 pages
- With "全て表示", you'll see all 45 rows at once

## Technical Details

- When pagination is enabled (`rowsPerPage > 0`), PrimeVue DataTable shows pagination controls
- When `rowsPerPage = 0`, pagination is disabled and all rows are shown
- The selected option is highlighted with primary color
- State is preserved when switching between filters
