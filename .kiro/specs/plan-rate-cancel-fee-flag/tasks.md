# Tasks: Plan Rate - Cancel Fee Inclusion Flag

### Phase 1: Backend Implementation

- [ ] **Database**: Create a new migration file (`014_add_cancel_fee_flag_to_plan_rates.sql`) to add the `include_in_cancel_fee` column to the `plan_rates` table with a `DEFAULT FALSE` constraint.
- [ ] **Model**: Update the `plan_rates` model to handle the `include_in_cancel_fee` field for all `SELECT`, `INSERT`, and `UPDATE` operations.
- [ ] **Controller**: Modify `plansRateController.js` to accept `includeInCancelFee` in create/update payloads and return it in responses.
- [ ] **Business Logic**: Locate the cancellation fee calculation service/model and update the aggregation logic to correctly factor in the `include_in_cancel_fee` flag.
- [ ] **Testing**: Write or update unit/integration tests to verify that the cancellation fee calculation correctly includes/excludes fees based on the new flag.

### Phase 2: Frontend Implementation

- [ ] **UI Component**: Identify the Vue component used for creating and editing plan rates.
- [ ] **UI Element**: Add a checkbox or switch control to the form for the `includeInCancelFee` flag.
- [ ] **State Management**: Bind the control to the component's data model.
- [ ] **API Integration**: Ensure the `includeInCancelFee` value is correctly sent to the backend when the form is saved.

### Phase 3: Reporting & Finalization

- [ ] **Reporting**: Identify and update any Excel or CSV exports related to plan rates to include the new flag as a distinct column.
- [ ] **Documentation**: Update `docs/` and any relevant READMEs to document the new field, its purpose, and API usage.
- [ ] **QA**: Perform end-to-end testing to ensure the flag works as expected from UI to calculation.
