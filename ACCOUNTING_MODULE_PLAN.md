# Accounting Module Plan

## Overview

The Accounting Module is designed to manage financial operations, auditing, and reconciliation within the RHT Hotel system. It features a distinct "Lilac/Purple" theme to differentiate it from other operational modules.

## Current Status

**Last Updated:** 2026-01-09

### Implemented Features

- **Infrastructure & Routing**:
  - Route configuration (`/accounting`) with child routes.
  - Navigation integration (Desktop & Mobile sidebars).
  - Route guards protecting the module (`requiresAccounting` meta flag).
- **Access Control (RBAC)**:
  - New `accounting` permission added to database roles.
  - Frontend permission checks.
  - Backend middleware `authMiddleware_accounting`.

## UI/UX Design Specification

Based on the approved HTML prototype, the UI will follow these specifications:

### Theme & Styling

- **Primary Color:** Lilac/Purple (`#7C3AED` / Tailwind `text-primary`).
- **Background:** Light/Dark mode support (`bg-background-light` / `bg-background-dark`).
- **Font:** Inter.

### Dashboard Layout (`AccountingDashboard.vue`)

The dashboard will consist of the following sections:

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
        - **Data Export**: "Export monthly hotel data for auditing" (Icon: `download_for_offline`).
        - **Upload OTA Slips**: "Upload external OTA payment details" (Icon: `upload_file`).
        - **Sales Comparison**: "Reconcile PMS records vs Accounting data" (Icon: `compare_arrows`).

4. **At a Glance (Metrics Section)**:
    - **Unreconciled Items**:
        - Metric: Count (e.g., 12 OTA Payments).
        - Icon: `pending_actions` (Orange).
        - Action: "Review list".
    - **Receivables**:
        - Metric: Currency (e.g., $42,850 Pending by Client).
        - Icon: `receipt_long` (Blue).
        - Action: "View breakdown".
    - **Discrepancies**:
        - Metric: Percentage (e.g., 0.4% PMS vs Accounting).
        - Icon: `warning` (Red).
        - Action: "Run diagnostics".

5. **Global Actions**:
    - Floating Action Button (FAB) for **Settings** (`settings` icon).

## Planned Features & Roadmap

### 1. Monthly Data Export (Auditing)

- **Goal**: Allow authorized users to download comprehensive hotel operation data for monthly audits.

- **UI Component**: "Data Export" Action Card -> Leads to **Ledger Sales Export by Plan** page.
- **Design Specification (3-Step Wizard)**:
  - **Step 1: Filter Selection**
    - **Date Range**: Custom date picker.
    - **Hotels**: Multi-select checkbox list for properties.
    - **Account Plans**: Multi-select checkbox list for plans.
  - **Step 2: Review & Preview**
    - **Summary Widgets**:
      - Date Range (Display).
      - Selected Hotels (Count).
      - Account Plans (List).
    - **Header Stats**: "Total Estimated" Amount.
    - **Sales Ledger Preview Table**:
      - Columns: Hotel (Name + ID), Plan (Badge), Account Code (Monospace), Total Amount (Right-aligned), Reconciliation (Status Icon).
      - Pagination Controls.
    - **Navigation**: "Back" and "Next: Choose Format" buttons.
  - **Step 3: Export Confirmation**
    - **Summary Card**:
      - "Ready for Export" status with check icon.
      - "Total Records" and "Total Amount" tiles.
    - **Format Selection**: Radio buttons (CSV, Excel, PDF, JSON).
    - **Options**: "Send a copy to my email" checkbox.
    - **Action**: Large "Download Ledger" button.
- **Status**: Planned.

### 2. OTA Payment Reconciliation

- **Goal**: Upload OTA payment detail files to the system.

- **UI Component**: "Upload OTA Slips" Action Card.
- **Status**: Planned.

### 3. Sales Data Reconciliation

- **Goal**: Automated comparison between system sales data and uploaded payment records.

- **UI Component**: "Sales Comparison" Action Card.
- **Status**: Planned.

### 4. Dashboard Metrics (Analytics)

- **Goal**: Provide real-time visibility into financial health.

- **Components**:
  - **Unreconciled Payments Query**: Backend logic to count pending reconciliations.
  - **Receivables Calculator**: Aggregation of unpaid invoices.
  - **Discrepancy Checker**: Logic to compare PMS totals vs. External inputs.
- **Status**: Planned.

## Next Steps

1. **Frontend Update**: Refactor `AccountingDashboard.vue` to match the new HTML design (Colors, Layout, Widgets).
2. **Backend Implementation**:
    - Design database schema for uploaded OTA records.
    - Implement endpoints for the "At a Glance" metrics.
3. **Feature Development**: Start with "Data Export" functionality.
