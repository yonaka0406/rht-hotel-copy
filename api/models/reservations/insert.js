let getPool = require('../../config/database').getPool;
const { selectReservationBalance } = require('./select');
const logger = require('../../config/logger');

const insertReservationPaymentWithInvoice = async (requestId, hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, userId) => {
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

    const result = await insertReservationPayment(requestId, hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, invoiceId, userId, client);

    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding payment to reservation:', err);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

const insertReservationPayment = async (requestId, hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, invoiceId, userId, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  const query = `
    INSERT INTO reservation_payments (
      hotel_id, reservation_id, date, room_id, client_id, payment_type_id, value, comment, invoice_id, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
    RETURNING *;
  `;

  const values = [hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, invoiceId, userId];

  try {
    if (shouldReleaseClient) {
      await dbClient.query('BEGIN');
    }

    const result = await dbClient.query(query, values);

    if (shouldReleaseClient) {
      await dbClient.query('COMMIT');
    }

    return result.rows[0];
  } catch (err) {
    if (shouldReleaseClient) {
      await dbClient.query('ROLLBACK');
    }
    console.error('Error inserting reservation payment:', err);
    throw new Error('Database error');
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
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
      const balanceRows = await selectReservationBalance(requestId, reservation.hotel_id, reservation.reservation_id, reservation.period_end, client);
      let remainingPayment = reservation.period_payable;
      // Insert payment for each room, distributing the period_payable amount
      for (const balanceRow of balanceRows) {
        if (remainingPayment <= 0) break;

        // Cap the payment to the room's balance
        const roomPayment = Math.min(remainingPayment, balanceRow.balance);

        if (roomPayment > 0) {
          await insertReservationPayment(
            requestId,
            reservation.hotel_id,
            reservation.reservation_id,
            reservation.date,
            balanceRow.room_id,
            reservation.client_id,
            5, // Payment type for bulk payments
            roomPayment,
            reservation.details || null,
            bulkInvoiceId,
            userId,
            client
          );

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

const insertReservationRate = async (requestId, rateData, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  const query = `
    INSERT INTO reservation_rates (
      hotel_id,
      reservation_details_id,
      adjustment_type,
      adjustment_value,
      tax_type_id,
      tax_rate,
      price,
      include_in_cancel_fee,
      created_by,
      updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
    RETURNING *;
  `;

  const values = [
    rateData.hotel_id,
    rateData.reservation_details_id,
    rateData.adjustment_type,
    rateData.adjustment_value,
    rateData.tax_type_id,
    rateData.tax_rate,
    rateData.price,
    rateData.include_in_cancel_fee,
    rateData.created_by
  ];

  try {
    if (shouldReleaseClient) {
      await dbClient.query('BEGIN');
    }

    const result = await dbClient.query(query, values);

    if (shouldReleaseClient) {
      await dbClient.query('COMMIT');
    }

    return result.rows[0];
  } catch (err) {
    if (shouldReleaseClient) {
      await dbClient.query('ROLLBACK');
    }
    console.error('Error adding reservation rate:', err);
    throw new Error('Database error');
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const insertAggregatedRates = async (requestId, rates, hotel_id, reservation_details_id, user_id, disableRounding = false, client = null) => {
  if (!rates || rates.length === 0) {
    return;
  }
  
  // Aggregate rates by adjustment_type and tax_type_id
  const aggregatedRates = {};
  rates.forEach((rate) => {
    const key = `${rate.adjustment_type}-${rate.tax_type_id}-${rate.include_in_cancel_fee}`;
    if (!aggregatedRates[key]) {
      aggregatedRates[key] = {
        adjustment_type: rate.adjustment_type,
        tax_type_id: rate.tax_type_id,
        tax_rate: rate.tax_rate,
        include_in_cancel_fee: rate.include_in_cancel_fee,
        adjustment_value: 0,
      };
    }
    aggregatedRates[key].adjustment_value += parseFloat(rate.adjustment_value || 0);
  });

  // Calculate total base rate first
  let totalBaseRate = 0;
  Object.values(aggregatedRates).forEach((rate) => {
    if (rate.adjustment_type === 'base_rate') {
      totalBaseRate += rate.adjustment_value;
    }
  });

  // Insert aggregated rates with consistent price calculation
  const insertPromises = Object.values(aggregatedRates).map(async (rate) => {
    let price = 0;

    if (rate.adjustment_type === 'base_rate') {
      price = rate.adjustment_value;
    } else if (rate.adjustment_type === 'percentage') {
      if (!disableRounding) {
        price = Math.round((totalBaseRate * (rate.adjustment_value / 100)) * 100) / 100;
      } else {
        price = totalBaseRate * (rate.adjustment_value / 100);
      }
    } else if (rate.adjustment_type === 'flat_fee') {
      price = rate.adjustment_value;
    }

    const rateData = {
      hotel_id,
      reservation_details_id,
      adjustment_type: rate.adjustment_type,
      adjustment_value: rate.adjustment_value,
      tax_type_id: rate.tax_type_id,
      tax_rate: rate.tax_rate,
      price,
      include_in_cancel_fee: rate.include_in_cancel_fee,
      created_by: user_id
    };

    return insertReservationRate(requestId, rateData, client);
  });

  await Promise.all(insertPromises);
};

module.exports = {
  insertReservationPaymentWithInvoice,
  insertReservationPayment,
  insertBulkReservationPayment,
  insertReservationRate,
  insertAggregatedRates
}