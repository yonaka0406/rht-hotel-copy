# Design: Plan Rate - Cancel Fee Inclusion Flag

## 2.1. Database Schema

A new column will be added to the `plan_rates` table.

- **Table**: `plan_rates`
- **Column**: `include_in_cancel_fee`
- **Type**: `BOOLEAN`
- **Default**: `FALSE`
- **Nullable**: `NOT NULL`

The `DEFAULT FALSE` value ensures backward compatibility. Existing rates will continue to be excluded from cancellation fee calculations unless explicitly updated.

## 2.2. Backend Logic

### 2.2.1. Cancellation Fee Calculation

The primary logic for calculating cancellation fees must be updated. The current implementation sums specific rate types. The new logic will conditionally add rates to this sum based on the `include_in_cancel_fee` flag.

- **Location**: The core calculation logic resides within the reservation or billing models/services.
- **Modification**: The query that aggregates fees for cancellation will be updated to include rates where `include_in_cancel_fee` is `TRUE`, regardless of their type.

### 2.2.2. API Endpoints

The `plan_rates` CRUD endpoints will be updated to manage the new flag.

- **Controller**: `plansRateController.js`
- **Model**: `plansRateModel.js` (or equivalent)

- **`POST /api/plans/:planId/rates` (Create)**: The request body will accept the optional `includeInCancelFee` boolean. If not provided, it will default to `false` at the database level.
- **`PUT /api/plans/:planId/rates/:rateId` (Update)**: The request body will accept the optional `includeInCancelFee` boolean to toggle the setting.
- **`GET /api/plans/:planId/rates` (Read)**: The response objects for each rate will include the `includeInCancelFee` field.

## 2.3. Frontend UI

A new control will be added to the plan rate creation and editing forms.

- **Location**: The Vue component responsible for managing plan rate details (likely within `frontend/src/pages/Plans/` or a related directory).
- **Control**: A PrimeVue `<Checkbox>` or `<InputSwitch>` component will be used, labeled "Include in Cancellation Fee" (or similar).
- **Behavior**: The control will be bound to the `includeInCancelFee` property of the plan rate data model. The state will be sent to the API upon saving.

## 2.4. Reporting & Exports

Reports and data exports that include plan rate information will be updated to display the new flag.

- **Identification**: Locate all reporting features (e.g., Excel/CSV exports) that list plan rates.
- **Modification**: Add a new column to these reports, "Included in Cancel Fee," displaying a `Yes`/`No` or `TRUE`/`FALSE` value.
