# Finance Import Revamp Strategy

## 1. Overview

This document outlines the strategy to modernize the financial data import process at `http://localhost:5173/admin/finances`. The goal is to transition the **Budget (Forecast)** management from rigid CSV uploads to an interactive on-screen grid with **Smart Paste from Excel**, while keeping **Actuals (Accounting)** strictly synchronized with external Yayoi data.

## 2. Current State ("As-Is")

- Users download a CSV template, fill it in Excel, and re-upload.
- No support for granular cost/expense budgeting at the individual account level.
- The system relies heavily on `acc_account_codes.name` to join with external Yayoi data.

## 3. Objectives ("To-Be")

- **On-Screen Budgeting:** Interactive PrimeVue DataTable for **Forecast** data (Operational + Financial).
- **Actuals Integrity:** Actual financial data is pulled directly from **Yayoi** (`acc_monthly_account_summary`) and displayed as operational metrics only.
- **Data Deduplication:** Removed the redundant `du_accounting_entries` table; Yayoi ledger remains the single source of truth for actual financial entries.
- **Smart Paste (Budgeting):** Copy/Paste multiple rows from Excel directly into the Forecast grid using **Account Names**.

## 4. Proposed Features

### 4.1. Interactive Grids

1. **Forecast Grid (予算):**
    - **Operational Metrics:** Hierarchical display where **Plan Types** act as group headers, with sub-rows for packages and metrics.
    - **Financial Entries:** Granular Cost/Revenue tracking in `du_forecast_entries` using Account Names.
2. **Actuals Grid (実績):**
    - **Operational Metrics ONLY:** Displays revenue and occupancy realized in the system.
    - **Financial Data:** Managed via the Accounting Module (P&L, Ledger), not manually edited in this grid.

### 4.2. View-First Smart Paste (Excel Integration)

**Mapping logic based on current grid visibility.**

**Workflow:**

1. **Filter Context:** User selects the view (運用指標 or 勘定科目).
2. **Action:** User clicks the **「貼り付け」** button.
3. **Context-Aware Processing:** Matches data strictly against the visible rows.
4. **Validation:** Remapping dialog for unmatched account names.

### 4.3. Automated Synchronization (Actuals)

- **PMS Sync:** Aggregates reservation data into `du_accounting` (Operational).
- **Yayoi Sync:** Aggregates ledger data from `acc_yayoi_data` directly into Actuals.

## 5. Technical Architecture

### Database Schema

- `du_forecast_entries`: Stores granular budget data.
- Operational metrics remain in `du_forecast` and `du_accounting`.
- `du_accounting_entries`: TABLE REMOVED (Redundant with Yayoi data).

### API Routes (`api/routes/importRoutes.js`)

- `GET /api/import/finance/data`: Fetch grid data.
- `POST /api/import/finance/upsert`: Save Forecast data.
- `POST /api/import/finance/sync-yayoi`: Populate Actuals from Yayoi.
- `POST /api/import/finance/sync-pms`: Populate Actuals from PMS.
