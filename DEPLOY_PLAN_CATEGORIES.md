# Plan Categories Implementation Guide

## Overview

This guide outlines the steps to implement **plan categories** and the "Luggage Keep" feature. This is an additive change designed to enhance plan management without breaking existing functionality.

- ✅ Categories as optional metadata to `plans_hotel`
- ✅ Foundation for "Plan Copy Between Hotels"
- ✅ "Luggage Keep" (荷物キープ) plan automation

## Implementation Steps

### 1. Database Migrations
Apply the following migrations in order:

- [ ] **020**: `create_plan_categories_tables.sql` (Creates category lookup tables)
- [ ] **021**: `migrate_plan_categories.sql` (Migrates existing data and creates "荷物キープ" plans)
- [ ] **022**: `add_plan_categories_to_financial_tables.sql` (Updates reporting tables)
- [ ] **023**: `update_daily_plan_metrics_categories.sql` (Updates daily metrics structure)
- [ ] **024**: `update_get_available_plans_for_hotel_with_filtering.sql` (Updates availability logic)

> [!IMPORTANT]  
> **Migration 021 Note**: The "荷物キープ" (Luggage Keep) hotel plans created automatically for each hotel **do not have plan rates initialized**. You must manually set these rates after deployment if they are to be bookable.

### 2. Global Plan Naming (Cleanup)
- [ ] Prepend **"【共通】"** to the start of all `plans_global` names to clearly distinguish them from hotel-specific plans in the UI.

### 3. Backend Implementation
- [ ] **Model Layer**: Update `api/models/plan/` to support category fields and the new filtering logic.
- [ ] **Controller Layer**: Update `api/controllers/plans/` to handle category IDs and validation.
- [ ] **Routes**: Register new endpoints for categories and deletion logic.

### 4. Frontend Integration
- [ ] **Plan Management**: Update UI to select categories and display badges.
- [ ] **Plan Copy**: Enable the "Copy Plans Between Hotels" dialog.
- [ ] **Reservation Flow**: Ensure plan selection is filtered by availability dates and status.

## Verification & Testing

Perform the following manual tests to ensure system integrity:

### 1. Plan & Rates Management
- [ ] **Create Plan**: Create a new hotel plan with specific type and package categories.
- [ ] **Set Rates**: Create and update rates for the new plan. Verify they are correctly saved.
- [ ] **Luggage Keep**: Verify that the "荷物キープ" plan exists for each hotel and try setting a rate for it.

### 2. Reservation Integration
- [ ] **Selection**: Create a reservation and verify that only active plans within their `available_from`/`available_until` range are selectable.
- [ ] **Editing**: Change a plan in an existing reservation. Verify that categories and rates are correctly applied.
- [ ] **Add-ons**: Verify that add-ons associated with the new plans are correctly handled.

### 3. Plan Operations
- [ ] **Plan Deletion**: 
    - [ ] Attempt to delete a plan with active reservations (should be blocked).
    - [ ] Delete a plan with no dependencies (should succeed).
- [ ] **Plan Copy**: 
    - [ ] Copy a plan from Hotel A to Hotel B.
    - [ ] Verify that categories and basic metadata are correctly replicated.

### 4. Reporting & Metrics
- [ ] Verify that `daily_plan_metrics` correctly captures the new category associations for new reservations.

## Backward Compatibility
- Existing API endpoints remain functional.
- Old global plans remain intact (names updated with prefix).
- No immediate changes required to existing reservation data.

## Support
If issues arise:
1. Check `api` logs for SQL errors.
2. Verify `plan_type_category_id` and `plan_package_category_id` are not NULL for existing hotel plans (enforced by Migration 021).
3. Contact the development team for database reconciliation steps.
