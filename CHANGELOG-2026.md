# Changelog

All notable changes to the Hotel Management System will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## Unreleased

---

## [1.3.9] - 2026-01-08

- Improvement: Updated reporting terminology from '実績' to '実績・予約' across all charts, tables, KPI cards, and export files for enhanced data accuracy.

---

## [1.3.8] - 2026-01-07

- New Feature: Reorganized dashboard with interactive charts (occupancy bar chart, gauge chart, plan stack chart) and enhanced reservation list table with status, guest details, and pricing information.
- New Feature: Improved occupancy forecasting with fallback logic using forecast data when available.
- Documentation: Added shell command execution guidance for Windows PowerShell.
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
