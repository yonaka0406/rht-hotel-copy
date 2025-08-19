const { getPool } = require('../config/database');

const selectBillableListView = async (requestId, hotelId, dateStart, dateEnd) => {
    const pool = getPool(requestId);
    const query = `
      SELECT
        reservations.hotel_id
        ,hotels.formal_name
        ,reservations.id
        ,reservations.status
        ,reservations.reservation_client_id AS booker_id
        ,COALESCE(booker.name_kanji, booker.name_kana, booker.name) AS booker_name
        ,booker.name_kana AS booker_name_kana
        ,booker.name_kanji AS booker_name_kanji
        ,reservations.check_in
        ,reservations.check_out
        ,reservations.check_out - reservations.check_in AS number_of_nights
        ,reservations.number_of_people
        ,details.plan_price
        ,details.addon_price
        ,(details.plan_price + details.addon_price) AS price
        ,$2 AS period_start
        ,$3 AS period_end
        ,details.plan_period_price
        ,details.addon_period_price
        ,(details.plan_period_price + details.addon_period_price) AS period_price
        ,details.payment
        ,CASE 
          WHEN (details.plan_price + details.addon_price) > details.payment 
          THEN (details.plan_price + details.addon_price - details.payment) 
          ELSE 0 
        END AS balance
        ,GREATEST(
          0, 
          LEAST(
            (details.plan_period_price + details.addon_period_price), 
            (details.plan_price + details.addon_price - details.payment)
          )
        ) AS period_payable
        ,details.clients_json
        ,details.payers_json
      FROM
        reservations
        ,hotels
        ,clients AS booker
        ,(
          SELECT 
            reservation_details.hotel_id
            ,reservation_details.reservation_id
            ,rc.clients_json::TEXT AS clients_json
            ,rpc.clients_json::TEXT AS payers_json
            ,COALESCE(rp.payment,0) as payment            
            ,SUM(
              CASE WHEN reservation_details.plan_type = 'per_room' 
                  THEN reservation_details.price
                  ELSE reservation_details.price * reservation_details.number_of_people 
              END
            ) AS plan_price
            ,SUM(
              CASE WHEN reservation_details.billable = TRUE 
                        AND reservation_details.cancelled IS NULL 
                  THEN COALESCE(ra.addon_sum,0) 
                  ELSE 0 
              END
            ) AS addon_price
            ,SUM(
              CASE WHEN reservation_details.date BETWEEN $2 AND $3 THEN
                CASE WHEN reservation_details.plan_type = 'per_room' 
                    THEN reservation_details.price
                    ELSE reservation_details.price * reservation_details.number_of_people 
                END
              ELSE 0 END
            ) AS plan_period_price
            ,SUM(
              CASE WHEN reservation_details.date BETWEEN $2 AND $3 THEN
                CASE WHEN reservation_details.billable = TRUE 
                          AND reservation_details.cancelled IS NULL 
                    THEN COALESCE(ra.addon_sum,0) 
                    ELSE 0 
                END
              ELSE 0 END
            ) AS addon_period_price
          FROM
            reservation_details 

            LEFT JOIN
            (
              SELECT 
                ra.hotel_id
                ,ra.reservation_detail_id
                ,SUM(COALESCE(ra.quantity,0) * COALESCE(ra.price,0)) as addon_sum
              FROM reservation_addons ra
              GROUP BY ra.hotel_id, ra.reservation_detail_id
            ) ra
              ON reservation_details.hotel_id = ra.hotel_id 
            AND reservation_details.id = ra.reservation_detail_id

            LEFT JOIN 
            (
              SELECT 
                rc.reservation_id,
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'client_id', rc.client_id,
                    'name', c.name,
                    'name_kana', c.name_kana,
                    'name_kanji', c.name_kanji,
                    'email', c.email,
                    'phone', c.phone
                  )
                ) AS clients_json
              FROM 
                (SELECT DISTINCT reservation_id, client_id 
                FROM reservation_clients rc 
                JOIN reservation_details rd 
                  ON rc.reservation_details_id = rd.id
                ) rc
                JOIN clients c ON rc.client_id = c.id
              GROUP BY rc.reservation_id
            ) rc 
              ON rc.reservation_id = reservation_details.reservation_id

            LEFT JOIN
            (
              SELECT
                reservation_id
                ,SUM(value) as payment
              FROM 
                reservation_payments 
                JOIN payment_types 
                  ON reservation_payments.payment_type_id = payment_types.id
              GROUP BY reservation_id
            ) rp 
              ON rp.reservation_id = reservation_details.reservation_id

            LEFT JOIN
            (
              SELECT 
                rpc.reservation_id,
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'client_id', c.id,
                    'name', c.name,
                    'name_kana', c.name_kana,
                    'name_kanji', c.name_kanji,
                    'email', c.email,
                    'phone', c.phone
                  )
                ) AS clients_json
              FROM 
                (SELECT DISTINCT reservation_id, client_id 
                FROM reservation_payments rp 
                JOIN reservations r ON rp.reservation_id = r.id
                ) rpc
                JOIN clients c ON rpc.client_id = c.id
              GROUP BY rpc.reservation_id
            ) rpc 
              ON rpc.reservation_id = reservation_details.reservation_id

          WHERE
            reservation_details.hotel_id = $1
          GROUP BY
            reservation_details.hotel_id,
            reservation_details.reservation_id,
            rc.clients_json::TEXT,
            rpc.clients_json::TEXT,
            rp.payment
        ) AS details
      WHERE
        reservations.hotel_id = $1
        AND reservations.check_out > $2
        AND reservations.check_in <= $3
        AND reservations.status not in ('block', 'hold')
        AND reservations.reservation_client_id = booker.id
        AND reservations.id = details.reservation_id
        AND reservations.hotel_id = details.hotel_id
        AND reservations.hotel_id = hotels.id
        AND (details.plan_price + details.addon_price - details.payment) > 0
      ORDER BY 5, 7;
    `;
    const values = [hotelId, dateStart, dateEnd];

    try {
      const result = await pool.query(query, values);    
      return result.rows;
    } catch (err) {
      console.error('Error retrieving data:', err);
      throw new Error('Database error');
    }
};

const selectBilledListView = async (requestId, hotelId, month) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      invoices.*
      ,hotels.formal_name as facility_name
      ,hotels.bank_name
      ,hotels.bank_branch_name
      ,hotels.bank_account_type
      ,hotels.bank_account_number
      ,hotels.bank_account_name
      ,reservations.check_in
      ,reservations.check_out
      ,reservation_payments.reservation_id
      ,reservation_payments.room_id
      ,reservation_payments.value
      ,reservation_payments.comment as payment_comment
      ,rooms.room_number
      ,room_types.name as room_type_name
      ,clients.name_kanji as client_kanji
      ,clients.name_kana as client_kana
      ,clients.name as client_name
      ,COALESCE(clients.name_kanji, clients.name_kana, clients.name) as display_name
      ,clients.customer_id as customer_code
      ,clients.legal_or_natural_person
      ,clients.billing_preference
      -- The subquery for total people and stays count needed to be filtered by month.
      -- This now correctly counts only the dates within the specified month.
      ,details.number_of_people as total_people
      ,details.date as stays_count
      -- The subquery for reservation details needed to be filtered by month.
      ,(
        SELECT json_agg(rd)
        FROM reservation_details rd
        WHERE rd.hotel_id = reservations.hotel_id
          AND rd.reservation_id = reservations.id
          AND rd.room_id = reservation_payments.room_id
          AND rd.billable = TRUE
          AND DATE_TRUNC('month', rd.date) = DATE_TRUNC('month', $2::date)
      ) AS reservation_details_json
      -- The subquery for reservation rates and addons also needed to be filtered by month.
      -- This ensures the total prices are correct for the billing period.
      ,(
        SELECT json_agg(taxed_group)
        FROM (
          SELECT tax_rate, SUM(total_price) as total_price, SUM(total_net_price) as total_net_price
          FROM (
            SELECT
              rr.tax_rate,
              rr.price AS total_price,
              rr.net_price AS total_net_price
            FROM
              reservation_details rd
              JOIN reservation_rates rr ON rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
            WHERE
              rd.hotel_id = reservations.hotel_id
              AND rd.reservation_id = reservations.id
              AND rd.room_id = reservation_payments.room_id
              AND rd.billable = TRUE              
              AND DATE_TRUNC('month', rd.date) = DATE_TRUNC('month', $2::date)

            UNION ALL
            SELECT
              ra.tax_rate,
              ra.price AS total_price,
              ra.net_price AS total_net_price
            FROM
              reservation_details rd
              JOIN reservation_addons ra ON ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
            WHERE
              rd.hotel_id = reservations.hotel_id
              AND rd.reservation_id = reservations.id
              AND rd.room_id = reservation_payments.room_id
              AND rd.billable = TRUE              
              AND DATE_TRUNC('month', rd.date) = DATE_TRUNC('month', $2::date)
          ) AS inside
          GROUP BY tax_rate
        ) AS taxed_group
      ) AS reservation_rates_json
    FROM
      hotels
      JOIN
      reservations
      ON reservations.hotel_id = hotels.id
        JOIN
      reservation_payments
      ON reservation_payments.hotel_id = reservations.hotel_id AND reservation_payments.reservation_id = reservations.id
        JOIN
      (SELECT hotel_id, reservation_id, room_id, MAX(number_of_people) AS number_of_people, COUNT(date) AS date
        FROM reservation_details
        WHERE billable = TRUE
          -- Add the month filter to this subquery
          AND DATE_TRUNC('month', date) = DATE_TRUNC('month', $2::date)
        GROUP BY hotel_id, reservation_id, room_id
      ) AS details
      ON details.hotel_id = reservation_payments.hotel_id AND details.reservation_id = reservation_payments.reservation_id AND details.room_id = reservation_payments.room_id
        JOIN
      invoices
      ON invoices.id = reservation_payments.invoice_id
        JOIN
      rooms
      ON rooms.id = reservation_payments.room_id
        JOIN
      room_types
      ON room_types.id = rooms.room_type_id
        JOIN
      clients
      ON clients.id = reservation_payments.client_id
    WHERE
      invoices.hotel_id = $1
      AND DATE_TRUNC('month', invoices.date) = DATE_TRUNC('month', $2::date)
  ;`;
  const values = [hotelId, month];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectMaxInvoiceNumber = async (requestId, hotelId, month) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      MAX(invoices.invoice_number) as last_invoice_number
    FROM      
      invoices

    WHERE 
      invoices.hotel_id = $1  
      AND DATE_TRUNC('month', invoices.date) = DATE_TRUNC('month', $2::date)
  ;`;
  const values = [hotelId, month];

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const updateInvoices = async (requestId, id, hotelId, date, clientId, clientName, invoiceNumber, due_date, total_stays, comment) => {  
  const pool = getPool(requestId);
  const query = `
    UPDATE invoices SET
      display_name = $1
      ,invoice_number = $2
      ,due_date = $3
      ,total_stays = $4
      ,comment = $5
    WHERE 
      invoices.id = $6
      AND invoices.hotel_id = $7
      AND DATE_TRUNC('month', invoices.date) = DATE_TRUNC('month', $8::date)
      AND client_id = $9
    RETURNING *
  ;`;
  const values = [clientName, invoiceNumber, due_date, total_stays, comment, id, hotelId, date, clientId];

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error updating data:', err);
    throw new Error('Database error');
  }
};

async function selectPaymentsForReceiptsView(requestId, hotelId, startDate, endDate) {
  const pool = getPool(requestId);
  const query = `    
    SELECT
      res.check_in
      ,res.check_out		
      ,p.id as payment_id		
      ,rs.room_number
      ,TO_CHAR(p.date, 'YYYY-MM-DD') as payment_date
      ,p.value as amount
      ,COALESCE(c.name_kanji, c.name_kana, c.name) as client_name
      ,p.comment
      ,r.receipt_number as existing_receipt_number
    FROM
      reservation_payments p
        JOIN
      clients c ON p.client_id = c.id
        JOIN
      reservations res ON res.id = p.reservation_id
        JOIN 
      rooms rs ON rs.id = p.room_id
        LEFT JOIN
      receipts r ON p.receipt_id = r.id AND p.hotel_id = r.hotel_id
    WHERE
      p.hotel_id = $1 AND
      p.date >= $2 AND
      p.date <= $3
    ORDER BY
      p.date DESC;
  `;
  try {
    const result = await pool.query(query, [hotelId, startDate, endDate]);
    return result.rows;
  } catch (err) {
    console.error('Error in selectPaymentsForReceiptsView:', err);
    // It's often better to throw the error to be handled by the controller,
    // allowing for more specific error responses.
    throw new Error('Database error while fetching payments for receipts view.');
  }
}

// Actual implementations
async function getPaymentById(requestId, paymentId) {
  const pool = getPool(requestId);
  const paymentQuery = `
    SELECT
      p.id,
      p.value AS amount,
      TO_CHAR(p.date, 'YYYY-MM-DD') as payment_date,
      p.comment AS notes,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.name AS client_name_regular,
      c.name_kanji AS client_name_kanji,
      c.id as customer_code,
      h.name AS facility_name,
      h.bank_name,
      h.bank_branch_name,
      h.bank_account_type,
      h.bank_account_number,
      h.bank_account_name
    FROM reservation_payments p
    JOIN clients c ON p.client_id = c.id
    JOIN hotels h ON p.hotel_id = h.id
    WHERE p.id = $1;
  `;

  try {
    const paymentResult = await pool.query(paymentQuery, [paymentId]);
    if (paymentResult.rows.length === 0) {
      return null;
    }
    const paymentData = paymentResult.rows[0];
    
    return {
      id: paymentData.id,
      amount: parseFloat(paymentData.amount),
      payment_date: paymentData.payment_date,
      client_name: paymentData.client_name,
      client_name_regular: paymentData.client_name_regular,
      client_name_kanji: paymentData.client_name_kanji,
      customer_code: paymentData.customer_code,
      facility_name: paymentData.facility_name,
      notes: paymentData.notes,
      hotel_details: {
        bank_name: paymentData.bank_name,
        bank_branch_name: paymentData.bank_branch_name,
        bank_account_type: paymentData.bank_account_type,
        bank_account_number: paymentData.bank_account_number,
        bank_account_name: paymentData.bank_account_name
      },
      items: [] // No separate payment_items table
    };
  } catch (err) {
    console.error('Error in getPaymentById:', err);
    throw new Error('Database error while fetching payment details.');
  }
}

async function getReceiptByPaymentId(requestId, paymentId) {
  const pool = getPool(requestId);
  const query = `
    SELECT
        r.receipt_number,
        TO_CHAR(r.receipt_date, 'YYYY-MM-DD') as receipt_date,
        r.amount,
        r.tax_breakdown
    FROM reservation_payments p
    JOIN receipts r ON p.receipt_id = r.id AND p.hotel_id = r.hotel_id
    WHERE p.id = $1;
  `;
  try {
    const result = await pool.query(query, [paymentId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (err) {
    console.error('Error in getReceiptByPaymentId:', err);
    throw new Error('Database error while fetching receipt by payment ID.');
  }
}

async function selectMaxReceiptNumber(requestId, hotelId, date) {
  const pool = getPool(requestId);
  // The date parameter is a JS Date object. We need to ensure it's formatted correctly for the query
  // or use date_trunc with the passed date.
  const query = `
    SELECT receipt_number as last_receipt_number
    FROM receipts
    WHERE hotel_id = $1
      AND receipt_date >= date_trunc('month', $2::date)
      AND receipt_date < date_trunc('month', $2::date) + interval '1 month'
    ORDER BY receipt_number DESC
    LIMIT 1;
  `;
  try {
    // Ensure 'date' is in a format PostgreSQL understands (e.g., YYYY-MM-DD) if it's not already a JS Date.
    // If 'date' is a JS Date, $2::date should work.
    const result = await pool.query(query, [hotelId, date]);
    return result.rows.length > 0 ? result.rows[0] : { last_receipt_number: null };
  } catch (err) {
    console.error('Error in selectMaxReceiptNumber:', err);
    throw new Error('Database error while selecting max receipt number.');
  }
}

async function saveReceiptNumber(requestId, hotelId, receiptNumber, receiptDate, amount, userId, taxBreakdownData) { 
  const pool = getPool(requestId);
  const query = `
    INSERT INTO receipts
      (hotel_id, receipt_number, receipt_date, amount, created_by, tax_breakdown, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING id;
  `;
  try {
    // Ensure taxBreakdownData is null if undefined, or an empty array if it's an empty array,
    // which are both valid for JSONB. The pg driver should handle stringifying objects/arrays.
    const values = [hotelId, receiptNumber, receiptDate, amount, userId, JSON.stringify(taxBreakdownData || [])]; // Pass taxBreakdownData
    const result = await pool.query(query, values);
    return result.rows.length > 0 ? { success: true, id: result.rows[0].id } : { success: false };
  } catch (err) {
    console.error('Error in saveReceiptNumber:', err);
    // Add more context to the error if possible
    console.error('Failed to save receipt with data:', { hotelId, receiptNumber, taxBreakdownData });
    throw new Error('Database error while saving receipt number.');
  }
}

async function linkPaymentToReceipt(requestId, paymentId, receiptId) {
  const pool = getPool(requestId);
  const query = 'UPDATE reservation_payments SET receipt_id = $1 WHERE id = $2';
  try {
    const result = await pool.query(query, [receiptId, paymentId]);
    // Log if no row was updated, but still consider it a success if query executed
    if (result.rowCount === 0) {
      console.warn(`Attempted to link payment ${paymentId} to receipt ${receiptId}, but no payment row was updated. Payment ID might be incorrect or already linked.`);
    }
    return { success: true, rowCount: result.rowCount };
  } catch (err) {
    console.error(`Error in linkPaymentToReceipt for paymentId ${paymentId}, receiptId ${receiptId}:`, err);
    // Throw a more specific error or a generic one based on policy
    throw new Error('Database error while linking payment to receipt.');
  }
}

module.exports = {
  selectBillableListView,
  selectBilledListView,
  selectMaxInvoiceNumber,
  updateInvoices,
  getPaymentById,
  selectMaxReceiptNumber,
  getReceiptByPaymentId,
  saveReceiptNumber,
  selectPaymentsForReceiptsView,
  linkPaymentToReceipt,
};


