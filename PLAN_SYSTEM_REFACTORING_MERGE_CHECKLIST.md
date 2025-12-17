# Plan System Refactoring: Hotel-Exclusive Plans Merge Checklist

## ✅ CURRENT STATUS (Migrations Completed - Dec 17, 2024)

**Database State**: Migrations 020-028 successfully applied manually
**Completed Actions**:
- ✅ Category tables created and populated
- ✅ Plan and addon data migrated to hotel-specific structure
- ✅ Daily plan metrics updated with categories (35,571 records)
- ✅ Plan-addon relationships migrated (249 records)
- ✅ Pattern templates updated (137 templates)
- ✅ Missing hotel plans created (28 new plans for templates)
- ✅ Invalid plan templates cleaned up (21 NULL hotel_id records deleted)

**Remaining Tasks**:
1. Run final cleanup migration 028
2. Update reservation_details to use plans_hotel_id
3. Code review and frontend updates

## IMMEDIATE ACTIONS REQUIRED (Fresh Production Import)

### 1. Create Migration Runner
- [ ] **Create migration runner script** - No automated migration system exists
- [ ] **Test migration runner** in development environment first
- [ ] **Document rollback procedure** for each migration step

### 2. Critical Data Issues Status
- [ ] **124,888 reservation records** still need `plans_hotel_id` populated *(Next priority)*
- [x] **Multiple hotels missing hotel-specific plans** - 28 new plans created for templates
- [x] **Pattern templates reference missing hotel plans** - All resolved
- [x] **Category tables created** - migrations 020-027 applied successfully

### 3. Migration Strategy Decision ✅ COMPLETED
- [x] **Option B**: Ran migrations individually with verification between each *(Successfully completed)*
- [x] **Created missing hotel plans** during migration process as needed
- [ ] **Final cleanup**: Run migration 028 to drop deprecated columns

## Pre-Merge Preparation

### 1. Data Backup (CRITICAL - DO FIRST)
- [x] **Full database backup** before any migration *(Fresh production import completed)*
- [x] Backup specific tables: *(All tables backed up in production import)*
  - [x] `plans_global`
  - [x] `plans_hotel` 
  - [x] `addons_global`
  - [x] `addons_hotel`
  - [x] `plan_addons`
  - [x] `reservation_details`
  - [x] `daily_plan_metrics`
  - [x] `sc_tl_plans`
  - [x] `plan_templates`

### 2. Data Migration Sequence (MUST BE DONE IN ORDER)

**STATUS**: Migration files 020-028 exist but NOT YET APPLIED to database

#### Phase 1: Create New Structure ✅ COMPLETED
- [x] **Migration 020**: Create plan categories tables (`plan_type_categories`, `plan_package_categories`) *(5 type categories, 2 package categories created)*
- [x] **Migration 021**: Migrate existing plan data to categories and enforce NOT NULL constraints *(167 plans updated)*
- [x] **Migration 022**: Create addon categories and migrate addon data to hotel-specific *(5 addon categories created)*

#### Phase 2: Migrate Plan-Addon Relationships ✅ COMPLETED
- [x] **Migration 023**: Add category columns to `daily_plan_metrics` and resolve duplicates *(35,571 records updated)*
- [x] **Migration 024**: Fix `get_available_plans_with_rates_and_addons` function *(Function updated)*
- [x] **Migration 025**: Migrate `plan_addons` to remove `addons_global_id` dependency *(249 relationships migrated)*

#### Phase 3: Clean Up Legacy References ✅ COMPLETED
- [x] **Migration 026**: Create missing plans for `sc_tl_plans` references *(2 new plans created)*
- [x] **Migration 027**: Update pattern templates to use `plans_hotel_id` instead of `plan_key` *(137 templates updated, 28 new plans created)*
- [ ] **Migration 028**: Final cleanup - drop deprecated columns and functions *(Ready to run)*

**✅ COMPLETED**: All migrations 020-027 successfully applied manually

### 3. Create Missing Hotel Plans ⚠️ URGENT
**CURRENT STATUS**: 124,888 reservation records have `plans_global_id` but no `plans_hotel_id`

Before migrating historical data, ensure all plans used in reservations AND pattern templates exist as hotel-specific plans:

```sql
-- Check for plans referenced in reservations but missing in plans_hotel
SELECT DISTINCT 
    rd.hotel_id,
    rd.plans_global_id,
    pg.name as plan_name,
    'reservation' as source
FROM reservation_details rd
JOIN plans_global pg ON rd.plans_global_id = pg.id
WHERE NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.hotel_id = rd.hotel_id 
    AND ph.plans_global_id = rd.plans_global_id
)

UNION

-- Check for plans referenced in pattern templates but missing in plans_hotel
SELECT DISTINCT
    pt.hotel_id,
    (day_value->>'plans_global_id')::int as plans_global_id,
    pg.name as plan_name,
    'pattern_template' as source
FROM plan_templates pt,
     jsonb_each(pt.template) AS t(day_key, day_value)
JOIN plans_global pg ON pg.id = (day_value->>'plans_global_id')::int
WHERE day_value ? 'plans_global_id'
  AND (day_value->>'plans_global_id')::int IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM plans_hotel ph 
      WHERE ph.hotel_id = pt.hotel_id 
        AND ph.plans_global_id = (day_value->>'plans_global_id')::int
  );
```

- [ ] Create missing hotel plans for each hotel that references global plans in reservations
- [ ] Create missing hotel plans for each hotel that references global plans in pattern templates
- [ ] Verify all hotels have the necessary plan categories assigned
- [ ] **CRITICAL**: Migration 028 now automatically creates missing hotel plans for pattern templates

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
-- CURRENT RESULT: 124,888 orphaned records

-- Check for missing hotel plans
SELECT DISTINCT rd.hotel_id, rd.plans_global_id 
FROM reservation_details rd
WHERE NOT EXISTS (
    SELECT 1 FROM plans_hotel ph 
    WHERE ph.hotel_id = rd.hotel_id 
    AND ph.plans_global_id = rd.plans_global_id
);
-- CURRENT RESULT: Multiple hotels missing plans (10,11,12,13,14,15,21+ confirmed)
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

-- Verify all pattern templates have valid plans_hotel_id references
SELECT pt.hotel_id, day_key, day_value
FROM plan_templates pt,
     jsonb_each(pt.template) AS t(day_key, day_value)
WHERE day_value ? 'plans_hotel_id'
  AND NOT EXISTS (
      SELECT 1 FROM plans_hotel ph 
      WHERE ph.id = (day_value->>'plans_hotel_id')::int
        AND ph.hotel_id = pt.hotel_id
  );

-- Verify no orphaned global plan references in templates
SELECT pt.hotel_id, day_key, day_value
FROM plan_templates pt,
     jsonb_each(pt.template) AS t(day_key, day_value)
WHERE day_value ? 'plans_global_id'
  AND NOT EXISTS (
      SELECT 1 FROM plans_hotel ph 
      WHERE ph.hotel_id = pt.hotel_id 
        AND ph.plans_global_id = (day_value->>'plans_global_id')::int
  );
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

## Migration Runner Creation (URGENT)

Since no automated migration system exists, create one:

```javascript
// scripts/run-migrations.js
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'wehub',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function runMigration(migrationFile) {
  const sql = fs.readFileSync(path.join(__dirname, '../api/migrations', migrationFile), 'utf8');
  console.log(`Running ${migrationFile}...`);
  await pool.query(sql);
  console.log(`✓ ${migrationFile} completed`);
}

async function runMigrations() {
  const migrations = [
    '020_create_plan_categories_tables.sql',
    '021_migrate_plan_categories.sql', 
    '022_addon_categories_migration.sql',
    '023_add_plan_category_to_daily_plan_metrics.sql',
    '024_fix_get_available_plans_function.sql',
    '025_migrate_plan_addons.sql',
    '026_remove_plan_key_from_sc_tl_plans.sql',
    '027_update_get_available_plans_function.sql',
    '028_update_pattern_templates.sql'
  ];
  
  for (const migration of migrations) {
    await runMigration(migration);
  }
}
```

**⚠️ CRITICAL REMINDERS:**
1. **BACKUP FIRST** - No exceptions *(DONE - Fresh production import)*
2. **Create migration runner** before proceeding
3. **Run migrations in exact order** (020→021→022→023→024→025→026→027→028)
4. **Create missing hotel plans** before migrating historical data
5. **Test rollback procedure** in staging environment first
6. **Have database admin available** during migration window