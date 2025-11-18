# Parking Capacity Management Migration

## Overview

This migration adds support for capacity-based parking reservations, allowing the system to manage parking availability by counting available spots rather than assigning specific parking spots to each reservation.

## What This Migration Does

1. **Creates `parking_blocks` table**: Stores capacity blocking records for date ranges when parking is unavailable (e.g., winter closures, maintenance)

2. **Creates virtual capacity pool spots**: For each hotel and vehicle category, creates a virtual parking spot that represents the capacity pool for that category

3. **Adds helper functions**:
   - `create_virtual_capacity_pool_spots(hotel_id)`: Creates virtual spots for all vehicle categories in a hotel
   - `get_virtual_capacity_pool_spot(hotel_id, vehicle_category_id)`: Returns the virtual spot ID for capacity-based reservations

4. **Adds automatic triggers**:
   - When a new vehicle category is created, automatically creates virtual capacity pool spots for that category in all hotels
   - When a new hotel is created, automatically creates virtual capacity pool spots for all vehicle categories in that hotel

## Database Changes

### New Table: parking_blocks

```sql
CREATE TABLE parking_blocks (
    id UUID PRIMARY KEY,
    hotel_id INTEGER NOT NULL,
    vehicle_category_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    blocked_capacity INTEGER NOT NULL,
    reason VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    created_by INTEGER,
    updated_by INTEGER
) PARTITION BY LIST (hotel_id);
```

### New Parking Spots

For each hotel, creates virtual spots with:
- `spot_type = 'capacity_pool'`
- `spot_number = 'CAPACITY-POOL-{vehicle_category_id}'`
- `capacity_units = 9999` (high value to accommodate multiple reservations)

Example: For hotel 1 with 5 vehicle categories, creates 5 virtual spots:
- CAPACITY-POOL-1 (普通乗用車)
- CAPACITY-POOL-2 (軽自動車)
- CAPACITY-POOL-3 (オートバイ)
- CAPACITY-POOL-4 (バン・ピックアップ)
- CAPACITY-POOL-5 (2t　トラック)

## How to Run the Migration

### Option 1: Using Node.js Script (Recommended)

```bash
node api/adhoc_scripts/run_parking_capacity_migration.js
```

This script will:
- Execute the migration
- Verify the results
- Display a summary of created virtual spots
- Test the helper functions

### Option 2: Using psql

```bash
psql -h localhost -U your_user -d your_database -f api/migrations/018_parking_capacity_management.sql
```

Then verify with:
```bash
psql -h localhost -U your_user -d your_database -f api/adhoc_scripts/run_parking_capacity_migration.sql
```

## Verification

After running the migration, verify:

1. **parking_blocks table exists**:
```sql
SELECT * FROM information_schema.tables WHERE table_name = 'parking_blocks';
```

2. **Virtual capacity pool spots created**:
```sql
SELECT h.name AS hotel, ps.spot_number, vc.name AS vehicle_category
FROM parking_spots ps
JOIN parking_lots pl ON ps.parking_lot_id = pl.id
JOIN hotels h ON pl.hotel_id = h.id
LEFT JOIN vehicle_categories vc ON ps.spot_number = 'CAPACITY-POOL-' || vc.id
WHERE ps.spot_type = 'capacity_pool'
ORDER BY h.id, vc.id;
```

3. **Helper functions work**:
```sql
SELECT get_virtual_capacity_pool_spot(1, 1); -- Should return a spot ID
```

## Impact on Existing Data

- **No changes to existing tables**: The `reservation_parking` table schema remains unchanged
- **No changes to existing reservations**: All existing spot-based reservations continue to work
- **Additive only**: This migration only adds new tables, spots, and functions

## Rollback

If you need to rollback this migration:

```sql
-- Drop the helper functions
DROP FUNCTION IF EXISTS get_virtual_capacity_pool_spot(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS create_virtual_capacity_pool_spots(INTEGER);

-- Delete virtual capacity pool spots
DELETE FROM parking_spots WHERE spot_type = 'capacity_pool';

-- Delete virtual capacity pool parking lots
DELETE FROM parking_lots WHERE name = 'Virtual Capacity Pool';

-- Drop the parking_blocks table
DROP TABLE IF EXISTS parking_blocks;
```

## Next Steps

After running this migration:

1. Implement `ParkingCapacityService` (Task 2)
2. Update parking model functions to support capacity-based reservations (Task 3)
3. Create API endpoints for capacity management (Task 4)
4. Update frontend to use capacity-based booking (separate task)

## Automatic Virtual Spot Creation

After this migration, virtual capacity pool spots are automatically created in the following scenarios:

### When a New Vehicle Category is Added

The trigger `trigger_create_virtual_spots_for_new_vehicle_category` automatically creates virtual capacity pool spots for the new vehicle category in all existing hotels.

Example:
```sql
-- This will automatically create CAPACITY-POOL-6 spots in all hotels
INSERT INTO vehicle_categories (name, capacity_units_required) 
VALUES ('Large Truck', 200);
```

### When a New Hotel is Added

The trigger `trigger_create_virtual_spots_for_new_hotel` automatically creates virtual capacity pool spots for all vehicle categories in the new hotel.

Additionally, the `createPartitionsSequentially` function in `hotelsController.js` has been updated to automatically create the `parking_blocks` partition for the new hotel.

Example:
```sql
-- This will automatically:
-- 1. Create parking_blocks partition for the hotel
-- 2. Create virtual spots for all 5 vehicle categories
INSERT INTO hotels (name, ...) 
VALUES ('New Hotel', ...);
```

## Troubleshooting

### Issue: Virtual spots not created for a hotel

**Solution**: Manually run the function:
```sql
SELECT * FROM create_virtual_capacity_pool_spots(YOUR_HOTEL_ID);
```

### Issue: Function returns error "Virtual capacity pool spot not found"

**Cause**: Virtual spots may not have been created for that hotel/category combination

**Solution**: 
```sql
-- Check if virtual spots exist
SELECT * FROM parking_spots 
WHERE spot_type = 'capacity_pool' 
  AND parking_lot_id IN (SELECT id FROM parking_lots WHERE hotel_id = YOUR_HOTEL_ID);

-- If not, create them
SELECT * FROM create_virtual_capacity_pool_spots(YOUR_HOTEL_ID);
```

### Issue: Migration fails with partition error

**Cause**: Partitions may not be set up for the hotel_id

**Solution**: Ensure hotel partitions exist for both `parking_blocks` and `reservation_parking` tables. Contact your DBA to set up partitions for new hotels.

## Debug Logging

The migration includes extensive RAISE NOTICE statements for debugging. To see these logs:

```sql
SET client_min_messages TO NOTICE;
-- Then run the migration
```

Look for log messages like:
- `[create_virtual_capacity_pool_spots] Starting for hotel_id: X`
- `[create_virtual_capacity_pool_spots] Created virtual spot id: X for vehicle category: Y`
- `[Migration] Completed initialization of virtual capacity pool spots`
