const { getPool } = require('../config/database');

const getGuestListDetails = async (requestId, hotelId, reservationId) => {
    const pool = getPool(requestId);
    const query = `
        SELECT
            r.id AS reservation_id,
            r.check_in,
            r.check_out,
            r.comment,
            b.name AS booker_name,
            -- alternative_name placeholder
            '' AS alternative_name,
            (
                SELECT array_agg(ps.spot_name)
                FROM reservation_parking_spots rps
                JOIN parking_spots ps ON rps.parking_spot_id = ps.id
                WHERE rps.reservation_id = r.id
            ) AS parking_lot_names,
            (
                SELECT SUM(rp.value)
                FROM reservation_payments rp
                WHERE rp.reservation_id = r.id
            ) AS payment_total,
            (
                SELECT array_agg(DISTINCT rm.room_number)
                FROM reservation_details rd_rooms
                JOIN rooms rm ON rd_rooms.room_id = rm.id
                WHERE rd_rooms.reservation_id = r.id
            ) AS room_numbers,
            (
                SELECT array_agg(DISTINCT p.name)
                FROM reservation_details rd_plans
                LEFT JOIN plans_hotel p ON rd_plans.plans_hotel_id = p.id
                WHERE rd_plans.reservation_id = r.id
            ) AS plan_names,
            (
                SELECT json_agg(
                    json_build_object(
                        'name', c.name,
                        'address', c.address,
                        'phone', c.phone,
                        'car_number_plate', c.car_number_plate
                    )
                )
                FROM reservation_clients rc
                JOIN clients c ON rc.client_id = c.id
                WHERE rc.reservation_id = r.id
            ) AS guests
        FROM
            reservations r
        JOIN
            clients b ON r.reservation_client_id = b.id
        WHERE
            r.hotel_id = $1 AND r.id = $2;
    `;
    const values = [hotelId, reservationId];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error retrieving guest list details:', err);
        throw new Error('Database error');
    }
};

module.exports = {
    getGuestListDetails,
};
