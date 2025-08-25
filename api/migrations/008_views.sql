-- VIEW

CREATE OR REPLACE VIEW vw_room_inventory AS
WITH roomTotal AS (
    SELECT
        hotel_id,
        room_type_id,
        COUNT(*) as total_rooms
    FROM rooms
    WHERE for_sale = true
    GROUP BY hotel_id, room_type_id
)
SELECT
    rd.hotel_id,
    rd.date,
    r.room_type_id,
	 sc.netrmtypegroupcode,
    rt.name as room_type_name,
    roomTotal.total_rooms,
    COUNT(rd.date) as room_count
FROM
    reservation_details rd
    JOIN rooms r ON r.hotel_id = rd.hotel_id AND r.id = rd.room_id
    JOIN room_types rt ON rt.hotel_id = r.hotel_id AND rt.id = r.room_type_id
	LEFT JOIN (SELECT DISTINCT hotel_id, room_type_id, netrmtypegroupcode FROM sc_tl_rooms) sc ON sc.hotel_id = rt.hotel_id AND sc.room_type_id = rt.id
    JOIN roomTotal ON roomTotal.hotel_id = rd.hotel_id AND roomTotal.room_type_id = r.room_type_id
WHERE rd.cancelled IS NULL
GROUP BY rd.hotel_id, rd.date, r.room_type_id, sc.netrmtypegroupcode, rt.name, roomTotal.total_rooms;

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
    rd.plan_name,COALESCE(ph.name, pg.name, rd.plan_name) AS plan_name,
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
LEFT JOIN plans_hotel ph ON ph.id = rd.plans_hotel_id AND ph.hotel_id = rd.hotel_id
LEFT JOIN plans_global pg ON pg.id = COALESCE(rd.plans_global_id, ph.plans_global_id)
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

-- Added from 003_client_management.sql
CREATE OR REPLACE VIEW common_relationship_pairs AS
SELECT
    source_relationship_type AS source_to_target_type,
    target_relationship_type AS target_to_source_type,
    CONCAT(source_relationship_type, ' / ', target_relationship_type) AS pair_name,
    COUNT(*) AS occurrence_count
FROM
    client_relationships
GROUP BY
    source_relationship_type,
    target_relationship_type
ORDER BY
    occurrence_count DESC, pair_name ASC;
