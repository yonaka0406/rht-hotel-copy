# Daily Report Renewal Context

This document tracks the technical details and current implementation of the renewed Daily Report system.

## Current Implementation Overview

The Daily Report system has been renewed with a frontend-compatible backend service that replicates the Vue.js component logic for consistent data processing across frontend and backend systems.

### Core Services

1. **`frontendCompatibleReportService.js`** - New data processing service that replicates frontend logic
2. **`dailyTemplateService.js`** - Excel template generation service (updated to use new data structure)
3. **`dailySalesOccPdfJob.js`** - Background job service for automated report generation

### Key Technical Details

- **Template Source:** `api/components/デイリーテンプレート.xlsx`
- **Engine:** `xlsx-populate` (chosen for chart and style preservation)
- **Data Processing:** Frontend-compatible logic ensuring consistency between UI and backend reports
- **Output Formats:**
  - **XLSX:** Direct output from `xlsx-populate`
  - **PDF:** Converted from XLSX using `libreOfficeService`

## Data Flow Architecture

```
frontendCompatibleReportService.js
    ↓ (processes raw data with frontend logic)
dailyTemplateService.js
    ↓ (maps processed data to Excel template)
Excel Template (デイリーテンプレート.xlsx)
    ↓ (converts to PDF if needed)
libreOfficeService.js
```

### Data Structure (Updated)

The `frontendCompatibleReportService.js` returns a comprehensive data object:

```javascript
{
    targetDate: string,           // Formatted target date
    period: string,              // 'month' or 'year'
    revenueData: Array,          // Current year revenue data
    occupancyData: Array,        // Current year occupancy data
    prevYearRevenueData: Array,  // Previous year revenue comparison
    prevYearOccupancyData: Array, // Previous year occupancy comparison
    dayOverDayChange: Object,    // Day-over-day changes (rooms, occ, sales)
    occupationBreakdownAllHotels: Array, // Detailed occupation breakdown
    kpiData: Object,             // 6-month KPI data (ADR, RevPAR)
    outlookData: Array,          // Future outlook data (6 months)
    selectionMessage: string,    // Dynamic report description
    allHotelNames: Array        // List of all hotel names
}
```

### Data Mapping Summary (Current)

| Sheet Name | Target Cell/Range | Data Type | Description |
| :--- | :--- | :--- | :--- |
| **レポート** | `A45` | String | `selectionMessage` (dynamic footer/note) |
| **合計データ** | Rows 2,4,7,8 Cols V-AA | Object | **KPI Data**: 6-month Actual/Forecast ADR and RevPAR |
| **合計データ** | Row 2 onwards | Array | **Outlook Data**: 6-month trends (sales, occ, room nights) |
| **合計データ** | Row 10 onwards | Array | **Facility Performance**: Side-by-side revenue and occupancy comparison |
| **合計データ** | Cols O, P, Q | Formula | Dynamic scaling (e.g., `/10000`) for chart compatibility |

## Implementation Status

### ✅ Completed Features

#### Frontend-Compatible Data Processing
- **Multi-period Support**: Handles both 'month' and 'year' periods with appropriate date range calculations
- **Complete Revenue Aggregation**: PMS, forecast, and accounting data with proper null handling
- **Comprehensive Occupancy Calculations**: Including forecast occupancy and detailed room capacity calculations
- **Previous Year Comparisons**: Full previous year revenue and occupancy data with date adjustments
- **Day-over-Day Changes**: Rooms, occupancy, and sales changes with hotel aggregation
- **Future Outlook**: 6-month outlook data with accommodation-specific occupancy calculations
- **KPI Calculations**: 6-month ADR and RevPAR data for actual and forecast values

#### Template Integration
- **Updated Data Structure**: `dailyTemplateService.js` updated to handle new comprehensive data object
- **Enhanced KPI Mapping**: 6-month KPI data properly mapped to template cells (Rows 2,4,7,8 Cols V-AA)
- **Improved Data Processing**: Handles new fields like `dayOverDayChange`, `occupationBreakdownAllHotels`, `period`
- **Backward Compatibility**: Maintains existing template structure while supporting new data

#### Data Quality & Consistency
- **Frontend Logic Replication**: Exact same aggregation and calculation logic as Vue.js component
- **Hotel Filtering**: Proper hotel relevance and zero-metrics filtering
- **Sorting Logic**: Consistent sorting across revenue and occupancy data
- **Error Handling**: Graceful handling of missing data and individual hotel failures

### 🔄 Current Implementation Details

#### Data Processing Flow
1. **Raw Data Fetching**: Batch processing for all hotels (PMS, forecast, accounting, occupation breakdown)
2. **Frontend-Compatible Aggregation**: Monthly/yearly aggregation with null-safe operations
3. **Previous Year Processing**: Parallel processing of previous year data with date adjustments
4. **KPI Calculation**: 6-month ADR/RevPAR calculations matching frontend logic
5. **Template Mapping**: Direct mapping to Excel template with proper formatting

#### Key Algorithms Implemented
- **Monthly Aggregation**: Handles both single month and year-cumulative periods
- **Room Availability Calculation**: Daily PMS data with fallback capacity handling
- **Occupancy Rate Calculation**: Forecast vs actual with accommodation-specific breakdowns
- **Revenue Prioritization**: Accounting > PMS > Forecast with proper fallbacks
- **Date Range Handling**: Different PMS fetch ranges for monthly vs yearly reports

### 📋 Remaining Tasks & Future Enhancements

#### Template Optimization
- [ ] **Dynamic Chart Ranges**: Implement solution for charts to dynamically adjust data ranges
  - *Constraint*: Excel Tables (`ListObjects`) not supported in LibreOffice PDF conversion
  - *Current Approach*: Fixed cell ranges with formula-based scaling
- [ ] **Chart Pool Management**: Pre-create chart "pool" for dynamic hotel count handling
- [ ] **Conditional Formatting**: Enhanced styling for variance indicators and performance metrics

#### Data Enhancement
- [ ] **3-Month Historical Trends**: Extend historical data beyond current single-month comparison
- [ ] **Per-Hotel Breakdown Charts**: Individual hotel performance visualization
- [ ] **Seasonal Adjustment**: Account for seasonal patterns in year-over-year comparisons

#### Performance & Scalability
- [ ] **Caching Strategy**: Implement data caching for frequently accessed historical data
- [ ] **Parallel Processing**: Optimize batch data fetching for large hotel portfolios
- [ ] **Template Versioning**: Support multiple template versions for different report types

### 🔧 Technical Architecture

#### Service Dependencies
```
frontendCompatibleReportService.js
├── selectCountReservation (PMS data)
├── selectForecastData (forecast data)
├── selectAccountingData (accounting data)
├── selectOccupationBreakdownByMonth (occupation breakdown)
├── selectLatestDailyReportDate (latest report date)
└── selectDailyReportDataByHotel (daily report aggregation)

dailyTemplateService.js
├── XlsxPopulate (Excel manipulation)
├── libreOfficeService (PDF conversion)
└── frontendCompatibleReportService (data source)
```

#### Data Consistency Features
- **Null-Safe Aggregation**: Proper handling of missing data points
- **Date Normalization**: Consistent date handling across different data sources
- **Hotel Filtering**: Relevance checks and zero-metrics filtering
- **Sort Order Preservation**: Maintains hotel sort order from database configuration

### 🚀 Usage Examples

#### Monthly Report Generation
```javascript
const reportData = await getFrontendCompatibleReportData(
    requestId, 
    new Date('2024-01-15'), 
    'month', 
    dbClient
);
const pdfPath = await generateDailyReportPdf(reportData, requestId, 'pdf');
```

#### Yearly Cumulative Report
```javascript
const reportData = await getFrontendCompatibleReportData(
    requestId, 
    new Date('2024-12-31'), 
    'year', 
    dbClient
);
const xlsxPath = await generateDailyReportPdf(reportData, requestId, 'xlsx');
```

### 📊 Data Quality Assurance

#### Validation Checks
- **Revenue Prioritization**: Accounting > PMS > Forecast with proper fallbacks
- **Occupancy Calculations**: Forecast rooms vs actual with accommodation-specific breakdowns
- **Previous Year Alignment**: Proper date shifting and hotel opening date adjustments
- **KPI Accuracy**: ADR and RevPAR calculations match frontend component exactly

#### Error Handling
- **Individual Hotel Failures**: Graceful degradation when specific hotel data is unavailable
- **Missing Data Points**: Null-safe operations with appropriate defaults
- **Date Range Validation**: Proper handling of invalid or edge-case date ranges
- **Template Compatibility**: Fallback mechanisms for template structure changes
- **Parameter Validation**: Proper function signature validation to prevent undefined parameter errors

### 🐛 Recent Fixes

#### Selection Message Cell Position Update (2026-01-09)
- **Change**: Updated `selectionMessage` target cell from `A39` to `A45` in the 'レポート' sheet
- **Affected Files**: `dailyTemplateService.js`
- **Reason**: Template layout adjustment to accommodate additional content

#### Function Parameter Issue (2026-01-09)
- **Issue**: `TypeError: Cannot read properties of undefined (reading 'query')` in `frontendCompatibleReportService.js`
- **Root Cause**: Missing `period` parameter when calling `getFrontendCompatibleReportData()` from `dailySalesOccPdfJob.js`
- **Fix**: Updated function call to include the `period` parameter: `getFrontendCompatibleReportData(requestId, today, 'month', dbClient)`
- **Function Signature**: `getFrontendCompatibleReportData(requestId, targetDate, period = 'month', dbClient)`