# Finance Import Revamp Strategy

## 1. Overview
This document outlines the strategy to modernize the financial data import process at `http://localhost:5173/admin/finances`. The goal is to transition the **Budget (Forecast)** management from rigid CSV uploads to an interactive on-screen grid with **Smart Paste from Excel**, while keeping **Actuals (Accounting)** strictly synchronized with external Yayoi data.

## 2. Current State ("As-Is")
-   Users download a CSV template, fill it in Excel, and re-upload.
-   No support for granular cost/expense budgeting at the individual account level.
-   Manual entry for Actuals was possible but inconsistent with the Accounting Module's ledger.

## 3. Objectives ("To-Be")
-   **On-Screen Budgeting:** Interactive PrimeVue DataTable for **Forecast** data only.
-   **Actuals Integrity:** Actual financial data (`du_accounting_entries`) is populated exclusively via Yayoi imports or automated PMS synchronization to ensure accuracy.
-   **Smart Paste (Budgeting):** Copy/Paste multiple rows from Excel directly into the Forecast grid using **Account Names**.
-   **Centralized Routes:** All finance import endpoints are consolidated in `api/routes/importRoutes.js`.

## 4. Proposed Features

### 4.1. Interactive Forecast Grid
A specialized grid for Budgeting:
1.  **Operational Metrics:** Days, Capacity (Stored in `du_forecast`).
2.  **Financial Entries:** Granular Revenue and Costs (Stored in `du_forecast_entries`).
    -   Row headers use the **Account Name** (`acc_account_codes.name`).

### 4.2. Smart Paste (Excel to Forecast)
**Mapping logic based on Account Names.**
-   **Action:** User copies a range from their Excel budget.
-   **Processing:**
    1.  Frontend parses tab-separated data.
    2.  Matches the first column string against system Account Names.
    3.  Updates the grid state for budgeting purposes.
-   **Validation:** Unmapped rows trigger a remapping dialog to ensure every budget line is correctly attributed.

### 4.3. Automated Synchronization
-   **PMS Sync:** Aggregates reservation data into `du_accounting_entries` based on account mappings.
-   **Yayoi Sync:** Aggregates ledger data from `acc_yayoi_data` directly into the Actuals tables.
-   *Note:* These processes are triggered via the Import panels or the Accounting Module, not via manual grid editing.

## 5. Technical Architecture

### Database Schema
-   `du_forecast_entries` and `du_accounting_entries` tables store granular data.
-   Linked by `account_name` to `acc_account_codes` for system-wide consistency.

### API Routes (`api/routes/importRoutes.js`)
-   `GET /api/import/finance/data`: Fetch grid data (Forecast).
-   `POST /api/import/finance/upsert`: Save/Update Forecast entries.
-   `POST /api/import/finance/sync-yayoi`: Populate Actuals from Yayoi.
-   `POST /api/import/finance/sync-pms`: Populate Actuals from PMS.

## 6. Implementation Plan
1.  **Database:** (Completed) Normalized entry tables created.
2.  **API:** (Completed) Endpoints for granular data and sync engines implemented.
3.  **UI:** (Modified) Implement the grid for **Forecasts only**, removing the manual Actuals grid to prevent data corruption.
