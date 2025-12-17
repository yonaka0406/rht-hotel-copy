-- Migration: Update views to use hotel-specific plan structure
-- This migration updates views that reference plans_global_id to use the new hotel-specific structure

-- Update vw_booking_for_google view to use only hotel-specific plans
CREATE OR REPLACE VIEW vw_booking_for_google AS
SELECT
    h.id AS hotel_id,
    h.formal_name AS hotel_name,
    rd.id AS reservation_detail_id,
    rd.date,
    rt.name AS room_type_name,
    rd.room_id,
    rooms.room_number,
    CASE 
        WHEN r.type IN ('ota', 'web') AND rg.client_id IS NOT NULL 
        THEN COALESCE(rg.name_kanji, rg.name_kana, rg.name)
        ELSE COALESCE(c.name_kanji, c.name_kana, c.name)
    END AS client_name,
    -- Updated to use only hotel-specific plans
    COALESCE(ph.name, rd.plan_name) AS plan_name,
    r.status,
    r.type,
    r.agent
FROM
    hotels h
JOIN reservations r ON h.id = r.hotel_id
JOIN clients c ON c.id = r.reservation_client_id
JOIN reservation_details rd ON r.hotel_id = rd.hotel_id AND r.id = rd.reservation_id
JOIN rooms ON rooms.hotel_id = rd.hotel_id AND rooms.id = rd.room_id
JOIN room_types rt ON rooms.room_type_id = rt.id AND rt.hotel_id = rooms.hotel_id
-- Updated to use only hotel-specific plans
LEFT JOIN plans_hotel ph ON ph.id = rd.plans_hotel_id AND ph.hotel_id = rd.hotel_id
LEFT JOIN (
    SELECT DISTINCT ON (reservation_details_id, hotel_id)
        hotel_id,
        reservation_details_id,
        c.id as client_id,
        c.name_kanji,
        c.name_kana,
        c.name
    FROM
        reservation_clients rc
        JOIN clients c ON rc.client_id = c.id
    ORDER BY
        reservation_details_id, hotel_id, rc.created_at
) rg ON rg.reservation_details_id = rd.id AND rg.hotel_id = rd.hotel_id
WHERE
    rd.cancelled IS NULL
ORDER BY
    h.id, rd.date, rooms.room_number;

-- Note: vw_room_inventory doesn't need updates as it doesn't reference plan data
-- Note: common_relationship_pairs doesn't need updates as it's client-relationship focused

-- VERIFICATION QUERIES: Run these to verify view updates
/*
-- 1. Test the updated view works correctly:
SELECT hotel_id, hotel_name, plan_name, COUNT(*) as booking_count
FROM vw_booking_for_google 
WHERE plan_name IS NOT NULL
GROUP BY hotel_id, hotel_name, plan_name
ORDER BY hotel_id, booking_count DESC
LIMIT 10;

-- 2. Check for any NULL plan names that might indicate missing data:
SELECT hotel_id, COUNT(*) as null_plan_count
FROM vw_booking_for_google 
WHERE plan_name IS NULL
GROUP BY hotel_id
ORDER BY null_plan_count DESC;
*/