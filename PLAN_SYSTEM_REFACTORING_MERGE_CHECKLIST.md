# Plan System Refactoring: Hotel-Exclusive Plans Merge Checklist

## Pre-Merge Preparation

### 1. Data Backup (CRITICAL - DO FIRST)
- [ ] **Full database backup** before any migration
- [ ] Backup specific tables:
  - [ ] `plans_global`
  - [ ] `plans_hotel` 
  - [ ] `addons_global`
  - [ ] `addons_hotel`
  - [ ] `plan_addons`
  - [ ] `reservation_details`
  - [ ] `daily_plan_metrics`
  - [ ] `sc_tl_plans`
  - [ ] `plan_templates`

### 2. Data Migration Sequence (MUST BE DONE IN ORDER)

#### Phase 1: Create New Structure
- [ ] **Migration 020**: Create plan categories tables (`plan_type_categories`, `plan_package_categories`)
- [ ] **Migration 021**: Migrate existing plan data to categories and enforce NOT NULL constraints
- [ ] **Migration 022**: Create addon categories and migrate addon data to hotel-specific

#### Phase 2: Migrate Plan-Addon Relationships  
- [ ] **Migration 023**: Add category columns to `daily_plan_metrics` and resolve duplicates
- [ ] **Migration 024**: Fix `get_available_plans_with_rates_and_addons` function
- [ ] **Migration 025**: Migrate `plan_addons` to remove `addons_global_id` dependency

#### Phase 3: Clean Up Legacy References
- [ ] **Migration 026**: Remove deprecated `plan_key` and `plans_global_id` from `sc_tl_plans`
- [ ] **Migration 027**: Drop deprecated `get_available_plans_for_hotel` function
- [ ] **Migration 028**: Update pattern templates to use `plans_hotel_id` instead of `plan_key`

### 3. Create Missing Hotel Plans
Before migrating historical data, ensure all plans used in reservations exist as hotel-specific plans:

```sql
-- Check for plans referenced in reservations but missing in plans_hotel
SELECT DISTINCT 
    rd.hotel_id,
    rd.plans_global_id,
    pg.name as plan_name
FROM reservation_details rd
JOIN plans_global pg ON rd.plans_global_id = pg.id
WHERE NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.hotel_id = rd.hotel_id 
    AND ph.plans_global_id = rd.plans_global_id
);
```

- [ ] Create missing hotel plans for each hotel that references global plans in reservations
- [ ] Verify all hotels have the necessary plan categories assigned

### 4. Historical Data Migration
- [ ] Update `reservation_details` to use `plans_hotel_id` instead of `plans_global_id`
- [ ] Migrate `daily_plan_metrics` historical data
- [ ] Update any remaining references in reporting queries

## Backend Code Review Checklist

### Controllers to Review
- [ ] **`api/controllers/bookingEngineController.js`**
  - [ ] `getPlansForBookingEngine()` - Currently returns both `global_plan_id` and `hotel_plan_id`
  - [ ] Update to only use hotel-specific plan IDs

- [ ] **`api/controllers/plansAddonController.js`**
  - [ ] Remove deprecated `plans_global_id` references (already commented out)
  - [ ] Ensure all functions use `plans_hotel_id` and `addons_hotel_id`

- [ ] **`api/controllers/plansRateController.js`**
  - [ ] Remove deprecated `plans_global_id` parameters (already commented out)
  - [ ] Verify all rate functions use `plans_hotel_id`

- [ ] **`api/controllers/plans/main.js`**
  - [ ] Review plan creation/editing functions
  - [ ] Ensure category assignments are working correctly

- [ ] **`api/controllers/addons/main.js`**
  - [ ] Verify addon functions use `addon_category_id`
  - [ ] Check hotel-specific addon management

### Models to Review
- [ ] **Plan Models** - Check all SQL queries for:
  - [ ] Remove `plans_global` table references
  - [ ] Update to use `plans_hotel` with categories
  - [ ] Verify `get_available_plans_with_rates_and_addons` function works correctly

- [ ] **Addon Models** - Check for:
  - [ ] Remove `addons_global` table references  
  - [ ] Update to use `addons_hotel` with categories
  - [ ] Verify plan-addon relationships use hotel-specific IDs

- [ ] **Reservation Models** - Update queries that:
  - [ ] Join with `plans_global` (should use `plans_hotel`)
  - [ ] Reference `plans_global_id` in `reservation_details`
  - [ ] Use deprecated plan identification methods

### Cron Jobs to Review
- [ ] **`api/jobs/dailyMetricsJob.js`** - Check if it references plan tables
- [ ] **`api/jobs/otaReservationJob.js`** - Verify plan handling in OTA integrations
- [ ] **`api/jobs/loyaltyTierJob.js`** - Check for plan-related calculations
- [ ] Review any other jobs that might reference plans or addons

### Database Functions to Update
- [ ] **`get_available_plans_with_rates_and_addons`** - Already updated in migration 024
- [ ] **`get_available_plans_for_hotel`** - Dropped in migration 027
- [ ] Review any custom SQL functions that reference:
  - [ ] `plans_global` table
  - [ ] `addons_global` table
  - [ ] `plan_key` fields

## Frontend Pages Review Checklist

### Admin Pages
- [ ] **`frontend/src/pages/Admin/ManagePlans/`**
  - [ ] Plan creation/editing dialogs
  - [ ] Plan category management
  - [ ] Plan ordering and display
  - [ ] Pattern template management (affected by migration 028)

- [ ] **`frontend/src/pages/Admin/ManageAddons/`**
  - [ ] Addon creation/editing
  - [ ] Addon category management
  - [ ] Hotel-specific addon management

### Main Application Pages
- [ ] **`frontend/src/pages/MainPage/Reservation/`**
  - [ ] `ReservationPanel.vue` - Plan selection and display
  - [ ] `ReservationRoomsView.vue` - Plan information in room views
  - [ ] `dialogs/ReservationGuestListDialog.vue` - Plan details in guest dialogs

- [ ] **`frontend/src/pages/MainPage/ReservationsCalendar.vue`**
  - [ ] Plan display in calendar view
  - [ ] Plan color coding

- [ ] **`frontend/src/pages/MainPage/DashboardPage.vue`**
  - [ ] Plan metrics and statistics

### Reporting Pages
- [ ] **`frontend/src/pages/Reporting/`** - All reporting components that show:
  - [ ] Plan-based metrics
  - [ ] Revenue by plan type
  - [ ] Plan category analysis

### Composables and Stores
- [ ] **`frontend/src/composables/usePlansStore.js`**
  - [ ] Update API calls to use hotel-specific endpoints
  - [ ] Remove global plan references
  - [ ] Update plan data structure handling

## API Endpoints to Test

### Plan Endpoints
- [ ] `GET /api/hotels/:hotel_id/plans` - Hotel-specific plans
- [ ] `GET /api/hotels/:hotel_id/plans/:hid/rates` - Plan rates (using hotel plan ID)
- [ ] `GET /api/hotels/:hotel_id/plans/:hid/addons` - Plan addons (using hotel plan ID)
- [ ] `POST /api/hotels/:hotel_id/plans` - Create hotel plan
- [ ] `PUT /api/hotels/:hotel_id/plans/:id` - Update hotel plan

### Addon Endpoints  
- [ ] `GET /api/hotels/:hotel_id/addons` - Hotel-specific addons
- [ ] `POST /api/hotels/:hotel_id/addons` - Create hotel addon
- [ ] `PUT /api/hotels/:hotel_id/addons/:id` - Update hotel addon

### Booking Engine Endpoints
- [ ] `GET /api/booking-engine/hotels/:hotel_id/plans` - Verify returns hotel-specific data
- [ ] Test integration with external booking systems

## Database Verification Queries

### Pre-Migration Checks
```sql
-- Verify no orphaned plan references
SELECT COUNT(*) FROM reservation_details 
WHERE plans_global_id IS NOT NULL 
AND plans_hotel_id IS NULL;

-- Check for missing hotel plans
SELECT DISTINCT rd.hotel_id, rd.plans_global_id 
FROM reservation_details rd
WHERE NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.hotel_id = rd.hotel_id 
    AND ph.plans_global_id = rd.plans_global_id
);
```

### Post-Migration Verification
```sql
-- Verify all plans have categories
SELECT COUNT(*) FROM plans_hotel 
WHERE plan_type_category_id IS NULL 
OR plan_package_category_id IS NULL;

-- Verify all addons have categories  
SELECT COUNT(*) FROM addons_hotel 
WHERE addon_category_id IS NULL;

-- Check plan-addon relationships
SELECT COUNT(*) FROM plan_addons 
WHERE addons_hotel_id IS NULL;
```

## Testing Checklist

### Functional Testing
- [ ] **Plan Management**
  - [ ] Create new hotel plan with categories
  - [ ] Edit existing hotel plan
  - [ ] Reorder plans within hotel
  - [ ] Activate/deactivate plans

- [ ] **Addon Management**
  - [ ] Create hotel-specific addons
  - [ ] Assign addons to plans
  - [ ] Edit addon categories

- [ ] **Reservations**
  - [ ] Create new reservation with hotel plans
  - [ ] Edit existing reservations
  - [ ] Verify plan colors and information display correctly

- [ ] **Reporting**
  - [ ] Daily metrics generation
  - [ ] Plan-based reports
  - [ ] Category-based analysis

### Performance Testing
- [ ] Plan loading performance with categories
- [ ] Reservation creation with hotel-specific plans
- [ ] Reporting query performance

## Production Deployment Steps

### 1. Maintenance Mode
- [ ] Enable maintenance mode
- [ ] Notify users of planned downtime

### 2. Final Backup
- [ ] Complete database backup
- [ ] Backup application files

### 3. Deploy and Migrate
- [ ] Deploy new application code
- [ ] Run migrations in sequence (020-028)
- [ ] Verify migration success

### 4. Verification
- [ ] Run post-migration verification queries
- [ ] Test critical user flows
- [ ] Check error logs

### 5. Go Live
- [ ] Disable maintenance mode
- [ ] Monitor application performance
- [ ] Monitor error rates

## Rollback Plan

### If Issues Occur
- [ ] **Immediate**: Enable maintenance mode
- [ ] **Database**: Restore from pre-migration backup
- [ ] **Application**: Revert to previous code version
- [ ] **Verification**: Test rollback success
- [ ] **Communication**: Notify stakeholders

### Rollback Considerations
- [ ] Any new data created after migration will be lost
- [ ] Plan to re-run migration after fixing issues
- [ ] Document lessons learned for next attempt

## Post-Deployment Monitoring

### First 24 Hours
- [ ] Monitor error logs for plan-related issues
- [ ] Check reservation creation success rates
- [ ] Verify reporting data accuracy
- [ ] Monitor database performance

### First Week
- [ ] User feedback on plan management
- [ ] Performance metrics comparison
- [ ] Data integrity spot checks

---

**⚠️ CRITICAL REMINDERS:**
1. **BACKUP FIRST** - No exceptions
2. **Run migrations in exact order** (020→021→022→023→024→025→026→027→028)
3. **Create missing hotel plans** before migrating historical data
4. **Test rollback procedure** in staging environment first
5. **Have database admin available** during migration window