let getPool = require('../../config/database').getPool;
const format = require('pg-format');

const updateReservationRoomsPeriod = async (requestId, { reservationId, hotelId, newCheckIn, newCheckOut, roomIds, userId }) => {
    const pool = getPool(requestId);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        await client.query(format(`SET SESSION "my_app.user_id" = %L;`, userId));

        // 1. Get original reservation
        const reservationResult = await client.query('SELECT * FROM reservations WHERE id = $1', [reservationId]);
        const reservation = reservationResult.rows[0];

        // 2. Calculate total people being moved
        const peopleQuery = `
            SELECT room_id, number_of_people
            FROM reservation_details
            WHERE reservation_id = $1 AND room_id = ANY($2::int[])
            GROUP BY room_id, number_of_people;
        `;
        const peopleResult = await client.query(peopleQuery, [reservationId, roomIds]);
        const totalPeopleMoved = peopleResult.rows.reduce((sum, row) => sum + row.number_of_people, 0);

        // 3. Create new reservation
        const newReservationQuery = `
            INSERT INTO reservations (hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, type, agent, ota_reservation_id, payment_timing, comment, has_important_comment, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
            RETURNING id;
        `;
        const newReservationResult = await client.query(newReservationQuery, [
            hotelId, reservation.reservation_client_id, newCheckIn, newCheckOut, totalPeopleMoved,
            reservation.status, reservation.type, reservation.agent, reservation.ota_reservation_id,
            reservation.payment_timing, reservation.comment, reservation.has_important_comment, userId
        ]);
        const newReservationId = newReservationResult.rows[0].id;

        // 4. Move reservation_details
        const dateShift = new Date(newCheckIn) - new Date(reservation.check_in);
        const interval = `${dateShift / (1000 * 60 * 60 * 24)} days`;

        const updateDetailsQuery = `
            UPDATE reservation_details
            SET reservation_id = $1,
                date = date + $2::interval,
                updated_by = $3
            WHERE reservation_id = $4 AND room_id = ANY($5::int[])
        `;
        await client.query(updateDetailsQuery, [newReservationId, interval, userId, reservationId, roomIds]);

        // 5. Update people count on original reservation
        const updateOrigQuery = 'UPDATE reservations SET number_of_people = number_of_people - $1, updated_by = $2 WHERE id = $3';
        await client.query(updateOrigQuery, [totalPeopleMoved, userId, reservationId]);

        // Check if original reservation is now empty
        const remainingDetails = await client.query('SELECT 1 FROM reservation_details WHERE reservation_id = $1 LIMIT 1', [reservationId]);
        if (remainingDetails.rows.length === 0) {
            await client.query('DELETE FROM reservations WHERE id = $1', [reservationId]);
        }

        await client.query('COMMIT');
        return { success: true, newReservationId };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in updateReservationRoomsPeriod:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    updateReservationRoomsPeriod,
};
