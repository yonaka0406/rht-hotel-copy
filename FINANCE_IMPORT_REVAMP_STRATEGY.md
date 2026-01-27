# Finance Import Revamp Strategy

## 1. Overview

This document outlines the strategy to modernize the financial data import process at `http://localhost:5173/admin/finances`. The goal is to transition the **Budget (Forecast)** management from rigid CSV uploads to an interactive on-screen grid with **Smart Paste from Excel**, while keeping **Actuals (Accounting)** strictly synchronized with external Yayoi data.

## 2. Current State ("As-Is")

- Users download a CSV template, fill it in Excel, and re-upload.
- No support for granular cost/expense budgeting at the individual account level.
- Manual entry for Actuals was possible but inconsistent with the Accounting Module's ledger.

## 3. Objectives ("To-Be")

- **On-Screen Budgeting:** Interactive PrimeVue DataTable for **Forecast** data only.
- **Actuals Integrity:** Actual financial data (`du_accounting_entries`) is populated exclusively via Yayoi imports or automated PMS synchronization to ensure accuracy.
- **Smart Paste (Budgeting):** Copy/Paste multiple rows from Excel directly into the Forecast grid using **Account Names**.
- **Centralized Routes:** All finance import endpoints are consolidated in `api/routes/importRoutes.js`.

## 4. Proposed Features

### 4.1. Interactive Forecast Grid
A specialized grid for Budgeting:
1.  **Operational Metrics:** Hierarchical display where **Plan Types** (e.g., 素泊まり) act as group headers, with detailed rows for each **Package Category** and metric (販売客室数, 宿泊売上).
2.  **Financial Entries:** Granular Revenue and Costs (Stored in `du_forecast_entries`).
    - Row headers use the **Account Name** (`acc_account_codes.name`).

### 4.2. View-First Smart Paste (Excel Integration)

**Mapping logic based on current grid visibility.**

**Workflow:**

1. **Filter Context:** User clicks **「運用指標」を表示** or **「勘定科目」を表示** to filter the grid. This visually confirms which rows will be the target of the paste.
2. **Action:** User clicks the **「貼り付け」** button to open the paste dialog.
3. **Context-Aware Processing:**
    - If the grid is filtered to **Operational Metrics**, the paste logic only attempts to match metrics (Revenue, Room Nights, etc.).
    - If filtered to **Account Codes**, it only matches system accounts and provides the remapping dialog for unmatched rows.
4. **Validation:** Provides immediate feedback and ensures no accidental overwrites of data in the non-visible context.

### 4.3. Automated Synchronization

- **PMS Sync:** Aggregates reservation data into `du_accounting_entries` based on account mappings.
- **Yayoi Sync:** Aggregates ledger data from `acc_yayoi_data` directly into the Actuals tables.
- *Note:* These processes are triggered via the Import panels or the Accounting Module, not via manual grid editing.

## 5. Technical Architecture

### Database Schema

- `du_forecast_entries` and `du_accounting_entries` tables store granular data.
- Linked by `account_name` to `acc_account_codes` for system-wide consistency.

### API Routes (`api/routes/importRoutes.js`)

- `GET /api/import/finance/data`: Fetch grid data (Forecast).
- `POST /api/import/finance/upsert`: Save/Update Forecast entries.
- `POST /api/import/finance/sync-yayoi`: Populate Actuals from Yayoi.
- `POST /api/import/finance/sync-pms`: Populate Actuals from PMS.

## 6. Implementation Plan

1. **Database:** (Completed) Normalized entry tables created.
2. **API:** (Completed) Endpoints for granular data and sync engines implemented.
3. **UI:** (Modified) Implement the grid for **Forecasts only**, removing the manual Actuals grid to prevent data corruption.
