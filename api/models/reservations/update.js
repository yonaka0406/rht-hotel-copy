let getPool = require('../../config/database').getPool;

const updateReservationType = async (requestId, reservationData) => {
  const { id, hotel_id, type, updated_by } = reservationData;
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    // Start the transaction
    await client.query('BEGIN');

    // 1. Get the current status from the database to use in our logic.
    const currentReservation = await client.query(
      `SELECT status FROM reservations WHERE id = $1::UUID AND hotel_id = $2`,
      [id, hotel_id]
    );

    if (currentReservation.rows.length === 0) {
      throw new Error('Reservation not found');
    }

    const { status } = currentReservation.rows[0];

    // 2. Update the reservation type and status (if applicable) in one query.
    const result = await client.query(
      `UPDATE reservations
       SET type = $1,
           updated_by = $2,
           status = CASE WHEN $1 = 'employee' THEN 'confirmed' ELSE status END
       WHERE id = $3::UUID AND hotel_id = $4
       RETURNING *`,
      [type, updated_by, id, hotel_id]
    );

    // 3. Calculate the billable status based on the new type and the original status.
    const billable = type !== 'employee' && !['hold', 'provisory'].includes(status);

    // 4. Update the billable status in reservation_details.
    await client.query(
      `UPDATE reservation_details
       SET billable = $1,
           updated_by = $2
       WHERE reservation_id = $3::UUID AND hotel_id = $4`,
      [billable, updated_by, id, hotel_id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating reservation type:', err);
    throw new Error('Database transaction failed');
  } finally {
    client.release();
  }
};

const updateReservationResponsible = async (requestId, id, updatedFields, user_id) => {
  const pool = getPool(requestId);
  const query = `
      UPDATE reservations
      SET
        reservation_client_id = $1,          
        updated_by = $2          
      WHERE id = $3::UUID AND hotel_id = $4
      RETURNING *;
  `;
  const values = [
    updatedFields.client_id,
    user_id,
    id,
    updatedFields.hotel_id,
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (err) {
    console.error('Error updating reservation:', err);
    throw new Error('Database error');
  }
};

module.exports = {
    updateReservationType,
    updateReservationResponsible    
}