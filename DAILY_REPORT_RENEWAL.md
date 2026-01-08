# Daily Report Renewal Context

This document tracks the technical details and planned changes for the renewal of the Daily Report system.

## Current Implementation: `dailyTemplateService.js`

The `api/controllers/report/services/dailyTemplateService.js` is the core service responsible for generating daily reports. It uses an Excel-based templating approach.

### Key Technical Details

- **Template Source:** `api/components/デイリーテンプレート.xlsx`
- **Engine:** `xlsx-populate` (chosen for chart and style preservation).
- **Output Formats:**
  - **XLSX:** Direct output from `xlsx-populate`.
  - **PDF:** Converted from XLSX using `libreOfficeService`.

### Data Mapping Summary (Current)

| Sheet Name | Target Cell/Range | Data Type | Description |
| :--- | :--- | :--- | :--- |
| **レポート** | `A39` | String | `selectionMessage` (dynamic footer/note). |
| **合計データ** | `M10` | Object | **KPI Data**: Actual/Forecast ADR and RevPAR. |
| **合計データ** | Row 2 onwards | Array | **Outlook Data**: Monthly trends (sales, occ, room nights). |
| **合計データ** | Row 10 onwards | Array | **Facility Performance**: Side-by-side revenue and occupancy comparison. |
| **合計データ** | Cols O, P, Q | Formula | Dynamic scaling (e.g., `/10000`) for chart compatibility. |

### Challenges for Renewal

- **Hardcoded Coordinates:** Current logic relies heavily on fixed cell references (e.g., `A39`, `M10`, `B${currentRow}`).
- **Template Dependency:** Any layout change in the `.xlsx` file requires corresponding code updates in the service.

  - *Approach:* Use dynamic named ranges or programmatically adjust chart series ranges in `xlsx-populate` if possible.
  - *Challenge (Dynamic Charts per Hotel):* `xlsx-populate` does not natively support copying charts or creating new ones. Creating one chart per hotel dynamically is difficult.
  - *Proposed Solution for Multiple Charts:* Pre-create a fixed "pool" of charts (e.g., 20) in the template. Hide unused charts or rows if the number of hotels is smaller. Alternatively, investigate if direct XML manipulation within the `.xlsx` (OpenXML) is feasible to duplicate chart objects.

### Template & UI Updates

- [ ] **Data Sheet Formatting:** Overhaul the "合計データ" (Summary Data) sheet to improve readability and professional appearance.
- [ ] **Chart Integration:** Ensure the new 3-month and 6-month data series are correctly reflected in the template's charts.

### Service Logic Updates

- [ ] **Coordinate Adjustments:** Update `dailyTemplateService.js` to map data to the new template structure.
- [ ] **Formatting Logic:** Add logic to handle any new conditional formatting or styling required in the "合計データ" sheet.

### Data Acquisition & Processing

- [ ] **3-Month Historical Data:** Fetch 3 months of occupancy and sales data for each hotel (per-facility breakdown).

- [ ] **6-Month KPI Alignment:** Add ADR and RevPAR data for a 6-month period to the first page to ensure consistency with other outlook information.

- [ ] **Dynamic Chart Ranges:** Implement a solution for charts to dynamically fetch the data range.

  - *Constraint:* Excel Tables (`ListObjects`) cannot be used because they are not preserved/supported during the LibreOffice to PDF conversion process.

  - *Approach:* Use dynamic named ranges or programmatically adjust chart series ranges in `xlsx-populate` if possible, otherwise ensure fixed-size blocks are large enough or exactly matched.

### Template & UI Updates

- [ ] **Data Sheet Formatting:** Overhaul the "合計データ" (Summary Data) sheet to improve readability and professional appearance.

- [ ] **Chart Integration:** Ensure the new 3-month and 6-month data series are correctly reflected in the template's charts.

### Service Logic Updates

- [ ] **Coordinate Adjustments:** Update `dailyTemplateService.js` to map data to the new template structure.

- [ ] **Formatting Logic:** Add logic to handle any new conditional formatting or styling required in the "合計データ" sheet.
