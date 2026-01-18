# Accounting Module Plan

## Overview

The Accounting Module is designed to manage financial operations, auditing, and reconciliation within the RHT Hotel system. It features a distinct "Lilac/Purple" theme to differentiate it from other operational modules.

**Note:** As implementation progresses, the documentation in `docs/features/accounting/` should be updated accordingly to reflect new features, technical changes, and validation procedures.

## Current Status

**Last Updated:** 2026-01-18

### Implemented Features

- **Database Schema (Migration 023)**:
  - **Master Tables**:
    - `acc_management_groups`: 10 predefined groups (売上高, 売上原価, 人件費, etc.)
    - `acc_tax_classes`: Tax categories with Yayoi names and rates (10%, 8%, non-taxable)
    - `acc_account_codes`: 100+ predefined account codes with category hierarchy
    - `acc_departments`: Hotel-to-Yayoi department code mappings with historical support
      - `is_current`: Distinguishes current vs historical mappings
      - `valid_from`/`valid_to`: Optional date ranges for historical tracking
  - **Operational Tables**:
    - `acc_accounting_mappings`: Multi-level mapping system (plan_hotel → plan_type_category → plan_package_category → addon)
    - `acc_yayoi_data`: 25-column staging table for Yayoi CSV exports
  - **Views**:
    - `acc_monthly_account_summary`: Consolidated monthly view with debit/credit aggregation and tax adjustments
    - `acc_profit_loss`: P&L statement view with hotel resolution using current and historical department mappings
  - **Indexes**: Optimized for lookup performance on mappings, date ranges, and department resolution

- **Infrastructure & Routing**:
  - Route configuration (`/accounting`) with child routes
  - Navigation integration (Desktop & Mobile sidebars)
  - Route guards protecting the module (`requiresAccounting` meta flag)
  - **Global API Utility**: Enhanced `apiService.js` to automatically handle `options.params` for GET requests using `URLSearchParams`.

- **Access Control (RBAC)**:
  - New `accounting` permission added to database roles
  - Frontend permission checks
  - Backend middleware `authMiddleware_accounting`

- **Dashboard (`AccountingDashboard.vue`)**:
  - Implemented strictly following the UI/UX design
  - "Data Export" card linked to the Ledger Export wizard
  - "Yayoi Import" card with last import info
  - "P&L Statement" card linked to Profit & Loss page
  - "Receivables" card linked to Accounts Receivable management
  - "OTA Import" card marked as *Coming Soon*
  - "At a Glance" section with metrics

- **Receivables Management (`AccountingReceivables.vue`)**:
  - **UI**: Dedicated view for managing outstanding balances per sub-account (client)
    - **Filter**: Search by sub-account name, filter by minimum balance, and a **"Exclude Latest Month"** checkbox to differentiate between current billing and historical arrears.
    - **History Sidebar**: Detailed monthly breakdown showing:
      - **加算額 (Additions)**: New sales/receivables generated.
      - **減少額 (Reductions)**: Payments collected or credit adjustments.
      - **純増減 (Net Change)**: The resulting impact on the balance.
      - **月末残高 (Ending Balance)**: The cumulative state at month-end.
    - **CRM Integration**: "Client Search" dialog to find matching clients in the system and trigger follow-up actions (notes, calls, tasks) directly.
  - **Backend**: 
    - `getReceivableBalances`: Identifies the latest available month and calculates total balance vs. current month sales.
    - `getReceivableSubAccountHistory`: Uses a `UNION ALL` strategy to correctly attribute debits (increases) and credits (decreases) to sub-accounts.

- **Master Settings (`AccountingSettings.vue`)**:
  - **Tabs**:
    - **Account Codes**: CRUD, mapping to Management Groups and Tax Classes
    - **Management Groups**: CRUD for grouping account codes
    - **Tax Classes**: CRUD for tax settings (Yayoi names, rates) with 0%/10% filter
    - **Departments**: Management of Hotel <-> Yayoi Department Code mappings with historical support
  - **UI**: Modal-based editing, confirmation dialogs, read-only hotel names in Department edit
  - **Backend**: Full CRUD endpoints in `accounting` controller and model

- **Ledger Export (Sales Journal)**:
  - **UI**: 3-Step Wizard (`LedgerExportStepper`)
    1. **Filter**: Month selection (YYYY-MM), Hotel multi-select
    2. **Review**: Preview table with Debit (Hotel) and Credit (Sales) rows. Visual warning for unmapped Departments
    3. **Confirmation**: Download button (CSV) and summary stats
  - **Backend**:
    - `getLedgerPreview`: Complex query aggregating sales data, joining with `acc_account_codes`, `acc_departments`, etc.
    - `downloadLedger`: Logic to generate Yayoi-importable CSV format
  - **Features**:
    - Auto-mapping of Hotel IDs to Department names (or fallback to Hotel Name with warning)
    - Error handling with Toast notifications
    - Robust number handling for currency totals

- **Profit & Loss Statement (`AccountingProfitLoss.vue`)**:
  - **UI**: Comprehensive P&L report with flexible filtering
    - Period selection (start/end month)
    - View by: Monthly, Hotel, Department, Hotel×Month, Department×Month
    - Hotel multi-select filter
    - Hierarchical display by Management Group
    - Calculated totals: Gross Profit, Operating Profit, Ordinary Profit, Profit Before Tax, Net Profit
    - CSV export functionality
  - **Backend**:
    - `getProfitLoss`: Detailed P&L data with flexible grouping
    - `getProfitLossSummary`: Aggregated summaries by management group
    - `getAvailableMonths`: List of available data periods
    - `getAvailableDepartments`: Department/hotel combinations
  - **Features**:
    - Automatic hotel resolution using both current and historical department mappings
    - Responsive table with sticky headers
    - Real-time calculation of P&L metrics
    - Japanese/English bilingual labels

## UI/UX Design Specification

Based on the approved HTML prototype, the UI will follow these specifications:

### Theme & Styling

- **Primary Color:** Lilac/Purple (`#7C3AED` / Tailwind `text-primary`).
- **Background:** Light/Dark mode support (`bg-background-light` / `bg-background-dark`).
- **Font:** Inter.

### Dashboard Layout (`AccountingDashboard.vue`)

The dashboard consists of the following sections:

1. **Header**:
    - Breadcrumbs: Home > Accounting.
    - Theme Toggle.
    - User Profile (Avatar & Role).

2. **Hero Section**:
    - Icon: `account_balance`.
    - Title: "Accounting Module".
    - Subtitle: "Property Management System (PMS) • Data Auditing & Reconciliation Central".

3. **Audit & Reconciliation (Action Section)**:
    - *Status Indicator:* "System Online" badge.
    - **Action Cards**:
        - **Data Export**: "Export monthly hotel data for auditing" (Icon: `download_for_offline`). **(Implemented)**
        - **Upload OTA Slips**: "Upload external OTA payment details" (Icon: `upload_file`). **(Coming Soon)**
        - **Sales Comparison**: "Reconcile PMS records vs Accounting data" (Icon: `compare_arrows`). **(Coming Soon)**

4. **At a Glance (Metrics Section)**:
    - **Status**: *In Development* (Placeholder displayed).

5. **Global Actions**:
    - Floating Action Button (FAB) for **Settings** (`settings` icon). **(Implemented)**

## Planned Features & Roadmap

### 1. Monthly Data Export (Auditing)

- **Goal**: Allow authorized users to download comprehensive hotel operation data for monthly audits
- **Status**: **Completed**
- **Implementation**:
  - Frontend: `AccountingLedgerExport` directory
  - Backend: `accounting/export.js` controller, `accounting/read.js` model
  - Database: Migration 023 with full schema support

### 2. Plan/Addon Accounting Mappings

- **Goal**: Map hotel plans and addons to specific account codes for automated journal entry generation
- **Status**: **Completed**
- **Implementation**:
  - Frontend: `AccountingSettings.vue` (Mapping Tab)
  - Backend: `accounting/settings.js` controller, `accounting/read.js` model (resolution logic)
  - Database: Migration 024 updating mapping target constraints
- **Features**:
  - Hierarchical resolution (Plan -> Type Category -> Package Category -> Account Code)
  - Hotel-specific and Global fallback mappings
  - Cancellation fee mapping support


### 3. Yayoi Data Import & Processing

- **Goal**: Import Yayoi accounting data for reconciliation and analysis
- **Status**: **Completed**
- **Implementation**:
  - Frontend: `AccountingYayoiImport.vue` (3-step wizard)
  - Backend: `accounting/import.js` controller (Shift-JIS parser, bulk insert)
  - Database: `acc_yayoi_data` table, `acc_monthly_account_summary` view
- **Features**:
  - Shift-JIS CSV/TXT support
  - Validation: Warning for unknown account codes and unmapped departments
  - Transactional logic: Overwrites data in the imported date range to prevent duplicates
  - Automatic tax adjustments in the summary view


### 4. OTA Payment Reconciliation

- **Goal**: Upload OTA payment detail files and reconcile with PMS bookings
- **UI Component**: "Upload OTA Slips" Action Card
- **Status**: **Planned** (Card placeholder implemented)
- **Next Steps**:
  - Design database schema for OTA payment records
  - Implement file upload and parsing (CSV/Excel)
  - Build matching logic (PMS bookings ↔ OTA records)

### 5. Sales Data Reconciliation

- **Goal**: Automated comparison between system sales data and uploaded payment records.
- **UI Component**: "Sales Comparison" Action Card.
- **Status**: **Planned** (Card placeholder implemented).
- **Expansion**: Extend the existing reconciliation screen to include `現金` (Cash) and `預金` (Bank/Deposit) accounts from the accounting data to match against payments registered in the PMS.
- **Dependencies**: Requires OTA Payment Reconciliation (#4) and Yayoi Import (#3).

### 6. Dashboard Metrics (Analytics)

- **Goal**: Provide real-time visibility into financial health
- **Status**: **Planned** (Section placeholder implemented)
- **Potential Metrics**:
  - Monthly revenue by management group
  - Tax summary by class
  - Unmapped transactions count
  - Reconciliation status indicators

### 7. UI/UX Consistency & Dark Mode Support

- **Goal**: Ensure consistent navigation and visual fidelity across all accounting module pages, including full dark mode support.
- **Status**: **Completed**
- **Requirements**:
  - All sub-pages include a standardized "Back to Dashboard" button in the header/hero section.
  - Standardized Hero sections across all main pages (P&L, Reconciliation, Ledger Export, Settings).
  - Robust Dark Mode support for all PrimeVue components (DatePicker, Select) using Pass-Through props and scoped CSS overrides.
  - Replaced `Listbox` with custom HTML implementation in `LedgerExportFilterStep` for better dark mode compatibility and scroll control.
- **Implementation**:
  - Navigation standardization in `feat(accounting): standardize navigation UI`
  - Hero area standardization in `style(accounting): standardized hero areas`
  - Dark mode fixes across `AccountingLedgerExport`, `AccountingProfitLoss`, `AccountingReconciliation`, and `SettingsDialog`.

### 8. Receivables Management (Client Accounts)

- **Goal**: Track outstanding balances per client by analyzing the `売掛金` (Accounts Receivable) sub-account cumulative data.
- **Status**: **Completed**
- **Implementation**:
  - Frontend: `AccountingReceivables` directory
  - Backend: `accounting/receivables/` controller, `accounting/receivables/` model
- **Features**: 
  - Dynamic filtering to exclude the latest month's sales (differentiating current from overdue).
  - Detailed monthly history with separate tracking of additions (sales) and reductions (payments).
  - Integrated client search and CRM action triggering.

## Technical Architecture

### Mapping Resolution Logic
... (existing content) ...

### Receivables Calculation Logic

To ensure precision in client balances and history, the system uses a `UNION ALL` strategy rather than netting movements within a single grouping. This correctly captures scenarios where '売掛金' appears on both the debit and credit side of a transaction (e.g., transfers between clients or internal adjustments).

```sql
WITH movements AS (
    SELECT debit_sub_account as sub_account, debit_amount as increase, 0 as decrease
    FROM acc_yayoi_data WHERE debit_account_code = '売掛金'
    UNION ALL
    SELECT credit_sub_account as sub_account, 0 as increase, credit_amount as decrease
    FROM acc_yayoi_data WHERE credit_account_code = '売掛金'
)
...
```

### Yayoi CSV Format
... (existing content) ...


The `acc_yayoi_data` table mirrors the 25-column Yayoi import format:
- Columns A-Y: Identification flag, slip number, dates, debit/credit accounts, tax classes, amounts, etc.
- Supports multi-line journal entries (identification_flag: 2110, 2100, 2101)
- Tax adjustments: 控不 → 0%, 80% → 80% of original tax amount

### Monthly Summary View

`acc_monthly_account_summary` provides consolidated reporting:
- Debits are negated, Credits are positive
- Tax adjustments applied based on tax class
- Net Amount = Inclusive Amount - Adjusted Tax
- Grouped by: month, account, sub-account, department, tax class
- Joined with management groups for hierarchical reporting

## Next Steps

1. **Phase 3: OTA Reconciliation**:
   - Design schema for OTA payment records
   - File upload and parsing (CSV/Excel)
   - Matching logic (PMS ↔ OTA)

2. **Phase 4: Analytics Dashboard**:
   - Real-time metrics using monthly summary view
   - Visual charts and trend analysis
   - Export capabilities for management reports

3. **Phase 6: Payment Reconciliation Expansion**:
   - Integrate `現金` (Cash) and `預金` (Bank) accounts into the Sales Comparison screen
   - Develop matching logic for PMS payments vs. accounting ledger entries
