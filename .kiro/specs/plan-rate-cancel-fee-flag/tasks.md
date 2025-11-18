# Tasks: Plan Rate - Cancel Fee Inclusion Flag

### Phase 1: Backend Implementation

- [x] **Database**: Create a new migration file (`014_add_cancel_fee_flag_to_plan_rates.sql`) to add the `include_in_cancel_fee` column to the `plan_rates` table with a `DEFAULT FALSE` constraint.
  - [x] Create `014_add_cancel_fee_flag_to_plan_rates.sql` with `ALTER TABLE plans_rates ADD COLUMN include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE;`
  - [x] Create `015_add_cancel_fee_flag_to_reservation_rates.sql` with `ALTER TABLE reservation_rates ADD COLUMN include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE;`
  - [x] **Refactor Migration**: Integrate `include_in_cancel_fee` into `004_plans_and_addons.sql` with conditional default.
    - [x] Read `004_plans_and_addons.sql`.
    - [x] Add `include_in_cancel_fee BOOLEAN NOT NULL DEFAULT FALSE` to `plans_rates` table definition.    
        
- [x] **Model**: Update the `plan_rates` model to handle the `include_in_cancel_fee` field for all `SELECT`, `INSERT`, and `UPDATE` operations.
  - [x] Modify `createPlansRate` in `api/models/planRate.js` to include `include_in_cancel_fee`.
  - [x] Modify `updatePlansRate` in `api/models/planRate.js` to include `include_in_cancel_fee`.
  - [x] Modify `getAllPlansRates` in `api/models/planRate.js` to explicitly select `include_in_cancel_fee`.
  - [x] Modify `getPlansRateById` in `api/models/planRate.js` to explicitly select `include_in_cancel_fee`.
- [x] **Business Logic**: Locate the cancellation fee calculation service/model and update the aggregation logic to correctly factor in the `include_in_cancel_fee` flag.
  - [x] Add `calculatePriceFromRates` helper function in `api/models/reservations/main.js`.
  - [x] Modify `updateReservationDetailStatus` in `api/models/reservations/main.js` to use `include_in_cancel_fee` in cancellation logic.  
- [ ] **Testing**: Write or update unit/integration tests to verify that the cancellation fee calculation correctly includes/excludes fees based on the new flag.
  - [ ] Create/update unit tests for `planRate.js` model functions.
  - [ ] Create/update unit tests for `reservations/main.js` cancellation logic.
  - [ ] Create/update integration tests for API endpoints.

### Phase 2: Frontend Implementation

- [x] **UI Component**: Identify the Vue component used for creating and editing plan rates.
  - [x] Identified `frontend/src/pages/Admin/ManagePlansRates.vue`.
- [x] **UI Element**: Add a checkbox or switch control to the form for the `includeInCancelFee` flag.
  - [x] Add checkbox to "New Adjustment" dialog in `ManagePlansRates.vue`.
  - [x] Add checkbox to "Edit Adjustment" dialog in `ManagePlansRates.vue`.
- [x] **State Management**: Bind the control to the component's data model.
  - [x] Initialize `newAdjustment.include_in_cancel_fee` in `newAdjustmentReset`.
  - [x] Initialize `editAdjustment.include_in_cancel_fee` in `editAdjustmentReset`.
- [x] **API Integration**: Ensure the `includeInCancelFee` value is correctly sent to the backend when the form is saved.
  - [x] Verify `saveAdjustment` and `updateAdjustment` send the new field (already handled by spread operator).
- [x] **Import Checkbox**: Add `Checkbox` to PrimeVue imports in `ManagePlansRates.vue`.

### Phase 3: Reporting & Finalization

- [ ] **Reporting**: Identify and update any Excel or CSV exports related to plan rates to include the new flag as a distinct column.
  - [ ] Search for relevant report generation logic.
  - [ ] Add `include_in_cancel_fee` to identified reports/exports.
- [ ] **Documentation**: Update `docs/` and any relevant READMEs to document the new field, its purpose, and API usage.
  - [ ] Update API documentation.
  - [ ] Update frontend usage documentation.
- [ ] **QA**: Perform end-to-end testing to ensure the flag works as expected from UI to calculation.

### Phase 4: Post-Implementation Verification

- [ ] **Plan Rates UI:**
    - [ ] Navigate to the "Manage Plan Rates" page.
    - [ ] Open the "New Adjustment" dialog.
    - [ ] Verify the "Include in Cancellation Fee" checkbox is visible.
    - [ ] Verify that when "Adjustment Type" is "Base Rate", the checkbox is checked by default.
    - [ ] Verify that when "Adjustment Type" is "Percentage" or "Flat Fee", the checkbox is unchecked by default.
    - [ ] Create a new "Base Rate" adjustment and uncheck the box. Save and verify it is saved as `false`.
    - [ ] Create a new "Flat Fee" adjustment and check the box. Save and verify it is saved as `true`.
- [ ] **Reservation Creation:**
    - [ ] Create a new reservation using a plan that has a mix of rates (some with `include_in_cancel_fee` true, some false).
    - [ ] Inspect the `reservation_rates` table for the newly created reservation.
    - [ ] Verify that the `include_in_cancel_fee` flags were correctly copied from the `plan_rates`.
- [ ] **Cancellation Logic:**
    - [ ] Take the reservation created above and cancel one of the reservation details with a fee.
    - [ ] Verify that the calculated cancellation price only includes the sum of rates where `include_in_cancel_fee` was `true`.
    - [ ] Cancel another reservation detail without a fee.
    - [ ] Verify that the price for that detail is set to 0.
- [ ] **Bulk Payments:**
    - [ ] Create a scenario with at least two different reservations for the same client.
    - [ ] Use the bulk payment feature to apply a single payment across both reservations.
    - [ ] Verify that the `reservation_payments` are created correctly for each reservation.
    - [ ] Verify that the associated invoice is created correctly and linked to all payments.
- [ ] **OTA Reservations:**
    - [ ] Simulate the creation of an OTA reservation (e.g., via a test script or manual trigger).
    - [ ] Inspect the `reservations`, `reservation_details`, and `reservation_rates` tables.
    - [ ] Verify that the `reservation_rates` record created for the OTA reservation has `adjustment_type = 'base_rate'` and `include_in_cancel_fee = true`.