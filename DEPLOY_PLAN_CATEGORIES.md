# Plan Categories Deployment Guide

## Overview

This deployment adds **plan categories** to the existing system without breaking any current functionality. It's a safe, additive change that:

- ✅ Keeps all existing plans_global functionality intact
- ✅ Adds categories as optional metadata to plans_hotel
- ✅ Doesn't require immediate frontend changes
- ✅ Provides foundation for future plan management improvements

## What Gets Added

### New Tables
- `plan_type_categories` - Categories like 素泊まり, 1食, 2食, 3食
- `plan_package_categories` - Package types like スタンダード, マンスリー

### New Columns in plans_hotel
- `plan_type_category_id` (nullable) - Links to plan type
- `plan_package_category_id` (nullable) - Links to package type  
- `display_order` - For custom plan ordering
- `is_active` - Enable/disable plans
- `available_from` / `available_until` - Date-based availability

## Pre-Deployment Checklist

- [ ] **Database backup completed** (automatic in script)
- [ ] **Verify plans_hotel table exists**
- [ ] **Test database connection**
- [ ] **Confirm low-traffic time window**

## Task List

### 1. Database & Infrastructure
- [x] **Migrations**: Verify `api/migrations/020_create_plan_categories_tables.sql` through `api/migrations/024_update_get_available_plans_for_hotel_with_filtering.sql`. (Manually Applied)
- [ ] **Deployment Script**: (Not needed - Manual migration performed)
- [ ] **Package.json**: (Not needed - Manual migration performed)

### 2. Backend Model Layer
- [x] **New Category Model**: Create `api/models/plan/categories.js` for `plan_type_categories` and `plan_package_categories`.
- [x] **Update Main Plan Model**: Update `api/models/plan/main.js` (`insertHotelPlan`, `updateHotelPlan`, `selectHotelPlanById`, `selectAvailablePlansByHotel`) with new fields and date filtering.
- [x] **Model Aggregation**: Export new category functions from `api/models/plan/index.js`.
- [x] **Financial Models**: Update `api/models/import.js` and `api/models/report/forecast.js` to use category fields and net sales.

### 3. Backend Controller & API
- [x] **Update Plan Controller**: Update `api/controllers/plans/main.js` to handle category IDs, new plan metadata, and date-based filtering.
- [x] **Validation**: Update controllers to validate category IDs and date parameters.
- [x] **New Endpoints**: Added routes for categories in `api/routes/plansRoutes.js`.

### 4. Verification & Testing
- [x] **Date-Aware Filtering**: Verified `get_available_plans_for_hotel` correctly filters by `available_from`, `available_until`, and `is_active`.

### 5. Frontend (UI)
- [x] **Plan Management**: Update UI to allow selecting type/package categories.
- [x] **Plan List**: Add badges for plan categories.
- [x] **Plan Copy**: Implemented "Plan Copy Between Hotels" feature (`CopyPlansDialog.vue`).
- [x] **Reservation Edit**: Updated `ReservationDayDetail.vue`, `ReservationPanel.vue`, and `ReservationRoomsView.vue` to be plan date aware (only shows plans available for the specific reservation or stay date range).
- [x] **Admin Tools**: Updated `otaPlanMaster.vue` and `ManagePlansPatterns.vue` to use unfiltered plan fetching (`fetchHotelPlans`) to allow mapping/pattern creation for all plans regardless of current availability.

## Post-Deployment

### Immediate (Optional)
- Update admin interface to show plan categories
- Add category filtering to plan lists

### Future Enhancements
- Category-based plan management
- Advanced plan ordering and grouping
- Category-specific reporting

## Monitoring

Watch for:
- **Error logs** related to plan queries
- **Admin interface** plan management functionality
- **Reservation creation** success rates
- **Database performance** (new indexes added)

## Technical Details

### Database Changes
```sql
-- New tables created
CREATE TABLE plan_type_categories (...)
CREATE TABLE plan_package_categories (...)

-- New columns added (all nullable, non-breaking)
ALTER TABLE plans_hotel ADD COLUMN plan_type_category_id INT
ALTER TABLE plans_hotel ADD COLUMN plan_package_category_id INT
-- ... other columns

-- Indexes created for performance
CREATE INDEX idx_plans_hotel_type_category ON plans_hotel(hotel_id, plan_type_category_id)
-- ... other indexes
```

### Backward Compatibility
- All existing API endpoints continue working
- Frontend can ignore new category fields
- plans_global remains fully functional
- No changes to reservation_details table

## Support

If you encounter issues:
1. Check deployment script output for specific errors
2. Verify database connection and permissions
3. Run rollback script if needed
4. Contact development team with error logs

---

**This is a safe, incremental improvement that adds value without risk.**