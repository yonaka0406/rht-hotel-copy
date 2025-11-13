let getPool = require('../../config/database').getPool;
const { selectReservationBalance } = require('./select');

const insertReservationPayment = async (requestId, hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  let invoiceId = null;

  try {
    await client.query('BEGIN');

    if (paymentTypeId === 5) {
      // Check if an invoice already exists for the given criteria for the same month
      const existingInvoicePaymentResult = await client.query(
        `
          SELECT rp.invoice_id
          FROM reservation_payments rp
          JOIN invoices i ON rp.invoice_id = i.id
          WHERE rp.hotel_id = $1
            AND rp.reservation_id = $2
            AND rp.client_id = $3
            AND rp.invoice_id IS NOT NULL
            AND date_trunc('month', i.date) = date_trunc('month', $4::date)
          LIMIT 1;
        `,
        [hotelId, reservationId, clientId, date]
      );

      if (existingInvoicePaymentResult.rows.length > 0) {
        invoiceId = existingInvoicePaymentResult.rows[0].invoice_id;
      } else {
        // If no existing invoice_id found for the same month, create a new invoice
        const newInvoiceResult = await client.query(
          `
          INSERT INTO invoices (id, hotel_id, date, client_id, invoice_number, created_by)
          VALUES (gen_random_uuid(), $1, $2, $3, NULL, $4)
          RETURNING id;
          `,
          [hotelId, date, clientId, userId]
        );
        invoiceId = newInvoiceResult.rows[0].id;
      }
    }

    const query = `
      INSERT INTO reservation_payments (
        hotel_id, reservation_id, date, room_id, client_id, payment_type_id, value, comment, invoice_id, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
      RETURNING *;
    `;
    const values = [hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, invoiceId, userId];

    const result = await client.query(query, values);

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding payment to reservation:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

const insertBulkReservationPayment = async (requestId, data, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Always create a new single invoice ID for all reservations in the array
    const invoiceInsertResult = await client.query(
      `
        INSERT INTO invoices (id, hotel_id, date, client_id, invoice_number, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, NULL, $4)
        RETURNING *;
      `,
      [data[0].hotel_id, data[0].date, data[0].client_id, userId]
    );
    const bulkInvoiceId = invoiceInsertResult.rows[0].id;

    // Process each reservation in the data array
    for (const reservation of data) {
      const balanceRows = await selectReservationBalance(requestId, reservation.hotel_id, reservation.reservation_id, reservation.period_end);
      let remainingPayment = reservation.period_payable;
      // Insert payment for each room, distributing the period_payable amount
      for (const balanceRow of balanceRows) {
        if (remainingPayment <= 0) break;

        // Cap the payment to the room's balance
        const roomPayment = Math.min(remainingPayment, balanceRow.balance);

        if (roomPayment > 0) {
          const query = `
            INSERT INTO reservation_payments ( 
              hotel_id, reservation_id, date, room_id, client_id, payment_type_id, value, comment, invoice_id, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
            RETURNING *;
          `;

          await client.query(query, [
            reservation.hotel_id,
            reservation.reservation_id,
            reservation.date,
            balanceRow.room_id,
            reservation.client_id,
            5,
            roomPayment,
            reservation.details || null,
            bulkInvoiceId,
            userId
          ]);

          // Reduce the remaining payment amount
          remainingPayment -= roomPayment;
        }
      }
    }

    await client.query('COMMIT');
    return { success: true };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding room to reservation:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

module.exports = {
    insertReservationPayment,
    insertBulkReservationPayment,
    insertReservationRate
}