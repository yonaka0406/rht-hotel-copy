# Requirements: Plan Rate - Cancel Fee Inclusion Flag

**Owner**: @gemini
**Status**: Open
**Priority**: Medium
**Team**: Backend, Frontend
**Related-Issues**: N/A

---

## 1. Overview

The current system excludes flat fees (e.g., `per_stay` fees) from the total amount used to calculate cancellation fees. This project introduces a mechanism to selectively include certain fees in this calculation, providing greater flexibility for rate management. This will be achieved by adding a new boolean flag, `include_in_cancel_fee`, to the `plan_rates` table.
