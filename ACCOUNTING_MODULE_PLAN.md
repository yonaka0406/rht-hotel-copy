# Accounting Module Plan

## Overview

The Accounting Module is designed to manage financial operations, auditing, and reconciliation within the RHT Hotel system. It features a distinct "Lilac/Purple" theme to differentiate it from other operational modules.

## Current Status

**Last Updated:** 2026-01-13

### Implemented Features

- **Infrastructure & Routing**:
  - Route configuration (`/accounting`) with child routes.
  - Navigation integration (Desktop & Mobile sidebars).
  - Route guards protecting the module (`requiresAccounting` meta flag).
- **Access Control (RBAC)**:
  - New `accounting` permission added to database roles.
  - Frontend permission checks.
  - Backend middleware `authMiddleware_accounting`.
- **Dashboard (`AccountingDashboard.vue`)**:
  - Implemented strictly following the UI/UX design.
  - "Data Export" card linked to the Ledger Export wizard.
  - "OTA Import" and "Sales Reconciliation" cards marked as *Coming Soon*.
  - "At a Glance" section marked as *In Development*.
- **Master Settings (`AccountingSettings.vue`)**:
  - **Tabs**:
    - **Account Codes**: CRUD, mapping to Management Groups and Tax Classes.
    - **Management Groups**: CRUD for grouping account codes.
    - **Tax Classes**: CRUD for tax settings (Yayoi names, rates) with 0%/10% filter.
    - **Departments**: Management of Hotel <-> Yayoi Department Code mappings.
  - **UI**: Modal-based editing, confirmation dialogs, read-only hotel names in Department edit.
  - **Backend**: Full CRUD endpoints in `accounting` controller and model.
- **Ledger Export (Sales Journal)**:
  - **UI**: 3-Step Wizard (`LedgerExportStepper`).
    1. **Filter**: Month selection (YYYY-MM), Hotel multi-select.
    2. **Review**: Preview table with Debit (Hotel) and Credit (Sales) rows. Visual warning for unmapped Departments.
    3. **Confirmation**: Download button (CSV) and summary stats.
  - **Backend**:
    - `getLedgerPreview`: Complex query aggregating sales data, joining with `acc_account_codes`, `acc_departments`, etc.
    - `downloadLedger`: Logic to generate Yayoi-importable CSV format.
  - **Features**:
    - Auto-mapping of Hotel IDs to Department names (or fallback to Hotel Name with warning).
    - Error handling with Toast notifications.
    - Robust number handling for currency totals.

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

- **Goal**: Allow authorized users to download comprehensive hotel operation data for monthly audits.
- **Status**: **Completed**.
- **Implementation**:
  - Frontend: `AccountingLedgerExport` directory.
  - Backend: `accounting/export.js` controller, `accounting/read.js` model.

### 2. OTA Payment Reconciliation

- **Goal**: Upload OTA payment detail files to the system.
- **UI Component**: "Upload OTA Slips" Action Card.
- **Status**: **Planned** (Card placeholder implemented).

### 3. Sales Data Reconciliation

- **Goal**: Automated comparison between system sales data and uploaded payment records.
- **UI Component**: "Sales Comparison" Action Card.
- **Status**: **Planned** (Card placeholder implemented).

### 4. Dashboard Metrics (Analytics)

- **Goal**: Provide real-time visibility into financial health.
- **Status**: **Planned** (Section placeholder implemented).

## Next Steps

1. **Release v1.0 (Current Branch)**:
    - Verify CSV export format with Yayoi constraints.
    - Additional testing of Department mappings.
    - Merge current accounting features (`feat/accounting-module`) to main.
2. **Phase 2: OTA Reconciliation**:
    - Design database schema for uploaded OTA records.
    - Implement file upload and parsing (CSV/Excel) for OTA slips.
    - Implement reconciliation logic (matching PMS bookings with OTA records).
