# Accounting Module Plan

## Overview

The Accounting Module is designed to manage financial operations, auditing, and reconciliation within the RHT Hotel system. It features a distinct "Lilac/Purple" theme to differentiate it from other operational modules.

**Note:** As implementation progresses, the documentation in `docs/features/accounting/` should be updated accordingly to reflect new features, technical changes, and validation procedures.

## Current Status

**Last Updated:** 2026-01-16

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

- **Access Control (RBAC)**:
  - New `accounting` permission added to database roles
  - Frontend permission checks
  - Backend middleware `authMiddleware_accounting`

- **Dashboard (`AccountingDashboard.vue`)**:
  - Implemented strictly following the UI/UX design
  - "Data Export" card linked to the Ledger Export wizard
  - "Yayoi Import" card with last import info
  - "P&L Statement" card linked to Profit & Loss page
  - "OTA Import" card marked as *Coming Soon*
  - "At a Glance" section with metrics

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
- **Problem**: The accounting system uses sub-accounts for client names, but there is no direct mapping to the system's client IDs. A single client might also have multiple IDs in the CRM.
- **Solution**: 
  - Create a view that lists clients with outstanding balances based on `売掛金` sub-accounts.
  - Instead of complex auto-mapping, provide a "Client Search" feature within this view.
  - Allow the accounting user to search for the corresponding client in the CRM and trigger follow-up actions (e.g., set status, add note) directly from the accounting interface.
- **Status**: **Planned**

## Technical Architecture

### Mapping Resolution Logic

The system uses a hierarchical resolution strategy for account code mappings:

```
1. Check: Specific Item + Hotel (e.g., Plan A in Hotel 1)
   └─> acc_accounting_mappings WHERE hotel_id = X AND target_type = 'plan_hotel' AND target_id = Y

2. Fallback: Category + Hotel (e.g., "Overnight" category in Hotel 1)
   └─> acc_accounting_mappings WHERE hotel_id = X AND target_type = 'plan_type_category' AND target_id = Z

3. Fallback: Global Category (e.g., "Overnight" category default)
   └─> acc_accounting_mappings WHERE hotel_id IS NULL AND target_type = 'plan_type_category' AND target_id = Z

4. Error: No mapping found
```

### Yayoi CSV Format

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

1. **Phase 1.5: Mapping Management** (Current Priority):
   - Build UI for Plan/Addon → Account Code mappings
   - Implement backend resolution logic
   - Test with sample booking data

2. **Phase 2: Yayoi Integration**:
   - CSV import functionality for `acc_yayoi_data`
   - Validation and error reporting
   - Monthly summary reports using the view

3. **Phase 3: OTA Reconciliation**:
   - Design schema for OTA payment records
   - File upload and parsing (CSV/Excel)
   - Matching logic (PMS ↔ OTA)

4. **Phase 4: Analytics Dashboard**:
   - Real-time metrics using monthly summary view
   - Visual charts and trend analysis
   - Export capabilities for management reports

5. **Phase 5: Receivables Management**:
   - Build view for `売掛金` sub-account analysis
   - Implement client search functionality connecting to CRM
   - Add action triggers for client follow-up

6. **Phase 6: Payment Reconciliation Expansion**:
   - Integrate `現金` (Cash) and `預金` (Bank) accounts into the Sales Comparison screen
   - Develop matching logic for PMS payments vs. accounting ledger entries
