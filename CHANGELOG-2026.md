# Changelog

All notable changes to the Hotel Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Unreleased

---++++


---

## [1.4.1] - 2026-01-16

- New Feature: Added Profit & Loss Statement feature with flexible grouping (by month, hotel, or department), date range filtering, and CSV export.
- New Feature: Added support for importing raw Yayoi accounting data (25-column format) with a dedicated import panel including preview and validation.
- New Feature: Enhanced Accounting settings management for account codes, tax classes, and departments (including validity tracking).
- New Feature: Implemented previous year occupancy calculation logic in backend to match frontend consistency.
- New Feature: Aligned future outlook aggregation logic with Net Accommodation Sales for accurate performance tracking in Daily Report.
- Improvement: Enhanced daily report template with updated layout and improved cell mapping.
- Fix: Improved accuracy of reconciliation calculations across summary and detailed views.
- Fix: Resolved temporary file resource leak in the daily report background generation job.
- Fix: Improved numeric data safety in Excel reports by correctly handling zero values using nullish coalescing.

---

## [1.4.0] - 2026-01-15

- New Feature: Added Accounting Module with Sales Data Export functionality.
---

## [1.3.12] - 2026-01-15

- New Feature: Changed to display the creation date and creator name in the reservation details（予約詳細に作成日時と作成者名を表示するように変更）

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
