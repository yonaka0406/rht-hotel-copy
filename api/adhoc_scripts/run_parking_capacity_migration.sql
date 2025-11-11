-- Script to run the parking capacity management migration
-- This script should be executed by a database administrator

-- Step 1: Run the main migration
\i api/migrations/018_parking_capacity_management.sql

-- Step 2: Verify the migration was successful
-- Check that parking_blocks table was created
SELECT 
    'parking_blocks table' AS check_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'parking_blocks'
    ) THEN 'PASS' ELSE 'FAIL' END AS status;

-- Check that virtual capacity pool spots were created
SELECT 
    'Virtual capacity pool spots' AS check_name,
    COUNT(*) AS count,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status
FROM parking_spots
WHERE spot_type = 'capacity_pool';

-- Step 3: Display summary of virtual capacity pool spots by hotel
SELECT 
    h.id AS hotel_id,
    h.name AS hotel_name,
    pl.id AS parking_lot_id,
    pl.name AS parking_lot_name,
    COUNT(ps.id) AS virtual_spots_count
FROM hotels h
LEFT JOIN parking_lots pl ON pl.hotel_id = h.id AND pl.name = 'Virtual Capacity Pool'
LEFT JOIN parking_spots ps ON ps.parking_lot_id = pl.id AND ps.spot_type = 'capacity_pool'
GROUP BY h.id, h.name, pl.id, pl.name
ORDER BY h.id;

-- Step 4: Display all virtual capacity pool spots with their vehicle categories
SELECT 
    h.id AS hotel_id,
    h.name AS hotel_name,
    ps.id AS spot_id,
    ps.spot_number,
    ps.spot_type,
    ps.capacity_units,
    vc.id AS vehicle_category_id,
    vc.name AS vehicle_category_name,
    vc.capacity_units_required
FROM parking_spots ps
JOIN parking_lots pl ON ps.parking_lot_id = pl.id
JOIN hotels h ON pl.hotel_id = h.id
LEFT JOIN vehicle_categories vc ON ps.spot_number = 'CAPACITY-POOL-' || vc.id
WHERE ps.spot_type = 'capacity_pool'
ORDER BY h.id, vc.id;

-- Step 5: Test the helper functions
-- Test get_virtual_capacity_pool_spot function for hotel 1, vehicle category 1
SELECT 
    'Test get_virtual_capacity_pool_spot' AS test_name,
    get_virtual_capacity_pool_spot(1, 1) AS virtual_spot_id,
    'Should return a valid spot ID' AS expected;
