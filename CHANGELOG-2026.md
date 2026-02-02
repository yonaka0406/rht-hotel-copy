# Changelog

All notable changes to the Hotel Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.10] - 2026-02-02

- Bug Fix: Fixed invoice PDF generation issue where the company stamp image failed to load in Playwright due to Helmet's Content Security Policy restrictions. The stamp image is now embedded as a base64 data URI, eliminating the need for HTTP requests and ensuring compatibility with CSP headers.

---

## [1.4.9] - 2026-02-01

- New Feature: Modern calendar view for room reservations with responsive per-room columns, sticky left date sidebar, and a dual-mode toggle to switch between classic and modern views.
- Improvement: Enhanced performance and accuracy of client duplication detection using Japanese character normalization and corporate prefix stripping.
- New Feature: Added a "Merge" tab to the client edit page for streamlined CRM record consolidation.
- UI Improvement: Responsive Dashboard dialog layout with improved spacing and readability.
- Refactor: Restructured reservations calendar cell rendering architecture for improved responsiveness and faster display with large date ranges and room counts.
- Refactor: Enhanced cell interaction handling with expanded event support for drag and navigation operations.
- Security Improvement: Added rate limiting to authentication endpoints (login, password reset) to prevent brute-force attacks.
- Security Improvement: Enhanced security headers for improved protection against common web vulnerabilities.
- Bug Fix: Fixed a critical SQL injection vulnerability in the updateImpediment model function within api/models/clients.js. The fix involves implementing a whitelist for allowed database fields when building dynamic UPDATE queries. This prevents attackers from injecting malicious SQL through object keys in the request body.

---

## [1.4.8] - 2026-01-30

- New Feature: Added department group management capabilities for accounting settings
- New Feature: Added sub-account management functionality for detailed ledger tracking
- Bug Fix: Fixed the accumulated date-based filtering capability to sales and occupancy reporting views
- New Feature: Implemented intelligent data source prioritization for Occupancy metrics in Reports module
- Performance: Improved data loading speed through parallel fetching operations in Monthly Report
- Implementation: Dashboard data aligned with Room Indicator for consistent check-in/check-out statistics using effective date logic with edge detection for accurate room change and cancellation handling

---

## [1.4.7] - 2026-01-29

- Bug Fix: Resolved plan linking issues where plan IDs were missing or incorrectly mapped.
- Fix: Unified reservation creation timestamp formatting in `ReservationPanel.vue` by using standard `formatDateTime` utility, resolving timezone discrepancies between environments.
- Bug Fix: Financial data import was improved with global financial metric detection and aggregation to handle both zero and null values correctly.
- Improvement: Financial data import was updated paste and manual mapping behavior to replace values instead of accumulating them.
- Bug Fix: Prevented the resurrection of cancelled reservations or individual room nights when the room for that period has already been booked by another guest.
- New Feature: Enhanced OTA plan mapping interface with real-time status indicators (mapped, unmapped, errors).
- New Feature: Added intelligent plan recommendations based on name similarity matching.
- New Feature: Added a pre-emptive availability check in the reservation panel UI to warn users of conflicts before attempting to recover cancelled bookings.
- New Feature: Added Data Integrity Analysis page for detailed accounting reconciliation review with hotel-level drill-down capabilities
- New Feature: Added Monthly Sales Comparison chart on Accounting Dashboard with year navigation controls

---

## [1.4.6] - 2026-01-28

- New Feature: Added cost breakdown analytics dashboard with visualizations and configurable top expense filtering.
- New Feature: Interactive finance data grid with Excel paste support for budget entry and actuals management.
- New Feature: Sub-account categorization for granular financial tracking and reporting.
- New Feature: Introduced a new reusable KPI summary component for displaying Average Daily Rate (ADR) and Revenue Per Available Room (RevPAR) metrics with actual values, forecasts, and variance indicators in multiple layout variants.
- Refactor: Consolidated KPI display logic across multiple reporting pages to use the new unified component, improving consistency across the application.
- Bug Fix: Prevented unintended resurrection of partially cancelled rooms when confirming a reservation. Status transitions from non-cancelled states (e.g., provisory) now respect and preserve the existing 'cancelled' status of individual reservation details.
- Improvement: Enhanced parking reservation synchronization logic to ensure parking spots are only recovered if the associated room detail is not cancelled.
- Improvement: Strengthened robustness and debuggability in reservation and parking models by adding pre-update existence checks and detailed error logging with contextual identifiers (requestId, reservationId, detailId, status).

---

## [1.4.5] - 2026-01-27

- New Feature: Restructured billing interface with dedicated invoice management page.
- New Feature: Added invoice creation dialog with editable invoice details and validation.
- New Feature: New bulk billing drawer for processing multiple reservations simultaneously.
- New Feature: Added support for multi-month report views, enabling users to analyze performance across extended time periods.
- New Feature: Enhanced hotel filtering capabilities in report generation and download workflows.
- New Feature: Added provisional sales column (仮売上) to daily report Excel output.
- Improvement: Enhanced invoice generation with improved multi-tax-rate aggregation.
- Improvement: Better reservation detail aggregation and organization in invoices.
- Improvement: Improved data handling for complex billing scenarios with multiple accommodations and add-ons.
- Bug Fix: Improved reservation data filtering and handling for more accurate report calculations.
- Chore: Updated repository configuration files.

---

## [1.4.4] - 2026-01-26

- New Feature: Enhanced OTA reservation queue with search functionality and status filtering (All/Failed).
- New Feature: Improved reservation queue details with formatted communication logs (line break support) and classification badges (New/Mod/Can).
- Chore: Added to inventory calculations exclusion of staff rooms indicator in available stock counts in addition to not for sale indicator.
- Bug Fix: Improved reservation deletion logic to ensure data logging.
- New Feature: Added phantom delete detection visualization in OTA investigation interface with visual indicators.
- New Feature: Enhanced hotel ID validation for blocked room operations.
- Chore: Added diagnostic utilities for OTA stock auditing and historical stock analysis.

---

## [1.4.3] - 2026-01-23

- New Feature: Added OTA Stock Investigation Tool for diagnosing stock discrepancies between PMS and OTA systems, with event timeline analysis and gap detection.
- New Feature: Added OTA Trigger Monitoring System with automatic remediation, email alerts, and manual check capabilities.
- New Feature: Added cron job logging infrastructure for tracking scheduled task execution and performance metrics.

---

## [1.4.2] - 2026-01-19

- New Feature: Introduced detailed CSV export for profit & loss data.
- New Feature: Added Receivables Management interface with sub-account balance tracking, monthly history, filtering, and client follow-up actions via CRM integration.
- New Feature: New accounting mappings management feature with support for multiple mapping types including cancellation fees.
- New Feature: Import preview now validates accounts and departments against master data.
- Fix: Improved dark mode styling consistency across accounting pages.
- Fix: Fixed CRM actions to include unassigned follow-ups.
- Fix: Fixed missing reservation rate records for OTA reservations.

---

## [1.4.1] - 2026-01-16

- New Feature: Added Profit & Loss Statement feature with flexible grouping (by month, hotel, or department), date range filtering, and CSV export.
- New Feature: Added support for importing raw Yayoi accounting data (25-column format) with a dedicated import panel including preview and validation.
- New Feature: Enhanced Accounting settings management for account codes, tax classes, and departments (including validity tracking).
- New Feature: Implemented previous year occupancy calculation logic in backend to match frontend consistency.
- New Feature: Aligned future outlook aggregation logic with Net Accommodation Sales for accurate performance tracking in Daily Report.
- Improvement: Enhanced daily report template with updated layout and improved cell mapping.
- Fix: Improved accuracy of reconciliation calculations across summary and detailed views.
- Fix: Improved transaction and database connection handling for reservation holds to prevent orphaned holds and ensure proper cleanup.
- Fix: Resolved temporary file resource leak in the daily report background generation job.
- Fix: Improved numeric data safety in Excel reports by correctly handling zero values using nullish coalescing.

---

## [1.4.0] - 2026-01-15

- New Feature: Added Accounting Module with Sales Data Export functionality.

---

## [1.3.12] - 2026-01-15

- New Feature: Added display of creation date and creator name in temporary blocked dates.

---

## [1.3.11] - 2026-01-14

- New Feature: Added provisory accommodation metrics (revenue and room count totals) to reporting.
- New Feature: Provisory sales and night aggregations are now computed and displayed in future outlook reports.
- New Feature: Enhanced reporting dashboards to track pending reservations alongside confirmed bookings.
- Fix: Error when adding a new plan rate was fixed.
- Fix: Add loading indicator to Dashboard page.
- Fix: Fixed double percentage sign in occupancy charts tooltip and improved variance formatting.
- Improvement: Aligned the numbers displayed in the report for accommodation only both in the chart and the future outlook.

---

## [1.3.10] - 2026-01-09

- Fix: Resolved password reset errors by aligning frontend and backend validation rules, including mandatory special characters.
- New Feature: Added a confirmation dialog in the forgot password flow for Google-linked accounts to transition to local password-based accounts.
- Improvement: Integrated comprehensive Japanese translations for all backend validation and authentication-related error messages.
- Improvement: Simplified the password reset UI by removing redundant feedback from the confirmation input and streamlining error display via popups and on-screen text.
- Refactor: Enhanced database logic to ensure all social provider tokens and IDs are fully cleared when a user resets their local password.

---

## [1.3.9] - 2026-01-08

- Improvement: Updated reporting terminology from '実績' to '実績・予約' across all charts, tables, KPI cards, and export files for enhanced data accuracy.
- Fix: Updated category-wise monthly sales report to use reservation detail prices for accurate tax-included totals and renamed '通常売上' to '宿泊売上'.

---

## [1.3.8] - 2026-01-07

- New Feature: Reorganized dashboard with interactive charts (occupancy bar chart, gauge chart, plan stack chart) and enhanced reservation list table with status, guest details, and pricing information.
- New Feature: Improved occupancy forecasting with fallback logic using forecast data when available.
- Refactor: Dashboard component restructured into modular, reusable chart and table components for improved maintainability.
- Refactor: Enhanced occupancy calculations across reporting pages to prioritize forecast data.
- Improvement: Enhanced daily sales and occupancy reports with improved data aggregation across multiple sources, providing comprehensive revenue, occupancy, and KPI metrics.
- Improvement: Downloaded daily report files now consistently use today's date in the filename.
- Improvement: Improved application build stability and performance.

---

## [1.3.7] - 2026-01-06

- Fix: Removed button hide rules from print styles to ensure client and plan names are visible, specifically by removing `button:not(.print-keep)` from the global CSS.
- New Feature: Configured daily report routine job to automatically send reports every weekday at 17:00.

---

## Contributing

For information about contributing to this project, please see our [Development Guidelines](instructions.md).

## Support

For support and troubleshooting, please refer to our [Documentation](docs/) or contact the development team.
