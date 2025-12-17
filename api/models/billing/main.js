const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

const selectBillableListView = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
      SELECT
        reservations.hotel_id
        ,hotels.formal_name
        ,reservations.id
        ,reservations.status
        ,reservations.payment_timing
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
          (details.plan_upto_price + details.addon_upto_price - details.payment)
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
                  THEN COALESCE(ra.addon_sum,0)
                  ELSE 0
              END
            ) AS addon_price
            ,SUM(
              CASE WHEN reservation_details.date BETWEEN $2 AND $3 AND reservation_details.billable = TRUE THEN
                CASE WHEN reservation_details.plan_type = 'per_room' 
                    THEN reservation_details.price
                    ELSE reservation_details.price * reservation_details.number_of_people 
                END
              ELSE 0 END
            ) AS plan_period_price
            ,SUM(
              CASE WHEN reservation_details.date BETWEEN $2 AND $3 AND reservation_details.billable = TRUE THEN
                COALESCE(ra.addon_sum,0)
              ELSE 0 END
            ) AS addon_period_price
            ,SUM(
              CASE WHEN reservation_details.date <= $3 AND reservation_details.billable = TRUE THEN
                CASE WHEN reservation_details.plan_type = 'per_room' 
                    THEN reservation_details.price
                    ELSE reservation_details.price * reservation_details.number_of_people 
                END
              ELSE 0 END
            ) AS plan_upto_price
            ,SUM(
              CASE WHEN reservation_details.date <= $3 AND reservation_details.billable = TRUE THEN
                COALESCE(ra.addon_sum,0)
              ELSE 0 END
            ) AS addon_upto_price
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
            AND reservation_details.billable = true  
          GROUP BY
            reservation_details.hotel_id,
            reservation_details.reservation_id,
            rc.clients_json::TEXT,
            rpc.clients_json::TEXT,
            rp.payment
        ) AS details
      WHERE
        reservations.hotel_id = details.hotel_id
        AND EXISTS (SELECT 1 FROM reservation_details rd WHERE rd.reservation_id = reservations.id AND rd.hotel_id = reservations.hotel_id AND rd.date BETWEEN $2 AND $3 AND rd.billable = true)
        AND reservations.status not in ('block', 'hold')
        AND reservations.reservation_client_id = booker.id
        AND reservations.id = details.reservation_id
        AND reservations.hotel_id = details.hotel_id
        AND reservations.hotel_id = hotels.id
        AND (details.plan_upto_price + details.addon_upto_price - details.payment) > 0
      ORDER BY 5, 7;
    `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error retrieving data:', err);
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
      ,COALESCE(details.number_of_people, 0) as total_people
      ,COALESCE(details.date, 0) as stays_count
      -- The subquery for reservation details needed to be filtered by month.
      ,(
        SELECT json_agg(rd)
        FROM reservation_details rd
        WHERE rd.hotel_id = reservations.hotel_id
          AND rd.reservation_id = reservations.id
          AND rd.room_id = reservation_payments.room_id
          AND rd.billable = TRUE
          AND rd.hotel_id = $1
          AND rd.date >= date_trunc('month', $2::date)
          AND rd.date < date_trunc('month', $2::date) + interval '1 month'
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
              AND rd.hotel_id = $1           
              AND rd.date >= date_trunc('month', $2::date)
              AND rd.date < date_trunc('month', $2::date) + interval '1 month'

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
              AND rd.hotel_id = $1           
              AND rd.date >= date_trunc('month', $2::date)
              AND rd.date < date_trunc('month', $2::date) + interval '1 month'
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
        LEFT JOIN
      (SELECT hotel_id, reservation_id, room_id, MAX(number_of_people) AS number_of_people, COUNT(date) AS date
        FROM reservation_details
        WHERE billable = TRUE AND hotel_id = $1
          -- Add the month filter to this subquery
          AND date >= date_trunc('month', $2::date)
          AND date < date_trunc('month', $2::date) + interval '1 month'
        GROUP BY hotel_id, reservation_id, room_id
      ) AS details
      ON details.hotel_id = reservation_payments.hotel_id AND details.reservation_id = reservation_payments.reservation_id AND details.room_id = reservation_payments.room_id
        JOIN
      invoices
      ON invoices.id = reservation_payments.invoice_id AND invoices.hotel_id = reservation_payments.hotel_id
        JOIN
      rooms
      ON rooms.id = reservation_payments.room_id AND rooms.hotel_id = reservation_payments.hotel_id
        JOIN
      room_types
      ON room_types.id = rooms.room_type_id AND room_types.hotel_id = rooms.hotel_id
        JOIN
      clients
      ON clients.id = reservation_payments.client_id
    WHERE
      invoices.hotel_id = $1
      AND reservation_payments.date >= date_trunc('month', $2::date)
      AND reservation_payments.date < date_trunc('month', $2::date) + interval '1 month'
  ;`;
  const values = [hotelId, month];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectMaxInvoiceNumber = async (requestId, hotelId, date) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      MAX(invoice_number) AS last_invoice_number
    FROM
      invoices
    WHERE
      hotel_id = $1
      AND EXTRACT(YEAR FROM date) = EXTRACT(YEAR FROM $2::date)
      AND EXTRACT(MONTH FROM date) = EXTRACT(MONTH FROM $2::date)
  `;
  const values = [hotelId, date];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error retrieving data:', err);
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
    logger.error('Error updating data:', err);
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
      ,latest_r.receipt_number as existing_receipt_number
      ,latest_r.honorific as existing_honorific
      ,latest_r.custom_proviso as existing_custom_proviso
      ,latest_r.is_reissue as existing_is_reissue
      ,TO_CHAR(latest_r.receipt_date, 'YYYY-MM-DD') as existing_receipt_date
      ,latest_r.version as version
      ,latest_r.tax_breakdown as existing_tax_breakdown
      ,rtb.reservation_tax_breakdown
    FROM
      reservation_payments p
        JOIN
      clients c ON p.client_id = c.id
        JOIN
      reservations res ON res.id = p.reservation_id AND res.hotel_id = p.hotel_id
        JOIN
      rooms rs ON rs.id = p.room_id
        LEFT JOIN
      receipts r_linked ON p.receipt_id = r_linked.id AND p.hotel_id = r_linked.hotel_id -- Linked receipt
        LEFT JOIN LATERAL (
            SELECT r_latest.*
            FROM receipts r_latest
            WHERE r_latest.hotel_id = r_linked.hotel_id
              AND r_latest.receipt_number = r_linked.receipt_number
            ORDER BY r_latest.version DESC
            LIMIT 1
        ) latest_r ON r_linked.id IS NOT NULL -- Only join if r_linked exists
        LEFT JOIN LATERAL (
            WITH tax_rates_data AS (
                SELECT
                    ROUND((CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END), 4) AS tax_rate,
                    SUM(rr.price) AS total_amount
                FROM
                    reservation_details rd
                JOIN
                    reservation_rates rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
                WHERE
                    rd.reservation_id = p.reservation_id
                    AND rd.hotel_id = p.hotel_id
                    AND rd.date >= res.check_in AND rd.date < res.check_out
                GROUP BY
                    ROUND((CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END), 4)
                HAVING
                    ROUND((CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END), 4) IS NOT NULL
            ),
            tax_addons_data AS (
                SELECT
                    ROUND((CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END), 4) AS tax_rate,
                    SUM(ra.price * ra.quantity) AS total_amount
                FROM
                    reservation_details rd
                JOIN
                    reservation_addons ra ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
                WHERE
                    rd.reservation_id = p.reservation_id
                    AND rd.hotel_id = p.hotel_id
                    AND rd.date >= res.check_in AND rd.date < res.check_out
                GROUP BY
                    ROUND((CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END), 4)
                HAVING
                    ROUND((CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END), 4) IS NOT NULL
            ),
            combined_tax_data AS (
                SELECT tax_rate, total_amount FROM tax_rates_data
                UNION ALL
                SELECT tax_rate, total_amount FROM tax_addons_data
            ),
            final_aggregated_tax AS (
                SELECT
                    tax_rate,
                    SUM(total_amount) AS total_amount
                FROM
                    combined_tax_data
                GROUP BY
                    tax_rate
                HAVING
                    SUM(total_amount) IS NOT NULL
            )
            SELECT
                json_agg(
                    json_build_object(
                        'tax_rate', fat.tax_rate,
                        'total_amount', fat.total_amount
                    ) ORDER BY fat.tax_rate
                ) AS reservation_tax_breakdown
            FROM
                final_aggregated_tax fat
        ) rtb ON TRUE
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
    logger.error('Error in selectPaymentsForReceiptsView:', err);
    // It's often better to throw the error to be handled by the controller,
    // allowing for more specific error responses.
    throw new Error('Database error while fetching payments for receipts view.');
  }
}

// Actual implementations
async function getPaymentById(requestId, paymentId, hotelId, dbClient = null) {
  const client = dbClient || getPool(requestId);
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
    WHERE p.id = $1 AND p.hotel_id = $2;
  `;

  try {
    const paymentResult = await client.query(paymentQuery, [paymentId, hotelId]);
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
    logger.error('Error in getPaymentById:', err);
    throw new Error('Database error while fetching payment details.');
  }
}

async function linkPaymentToReceipt(requestId, paymentId, receiptId, hotelId, dbClient = null) {
  const client = dbClient || getPool(requestId);
  const query = 'UPDATE reservation_payments SET receipt_id = $1 WHERE id = $2 AND hotel_id = $3';
  try {
    const result = await client.query(query, [receiptId, paymentId, hotelId]);
    // Log if no row was updated, but still consider it a success if query executed
    if (result.rowCount === 0) {
      console.warn(`Attempted to link payment ${paymentId} to receipt ${receiptId}, but no payment row was updated. Payment ID might be incorrect or already linked.`);
    }
    return { success: true, rowCount: result.rowCount };
  } catch (err) {
    logger.error(`Error in linkPaymentToReceipt for paymentId ${paymentId}, receiptId ${receiptId}:`, err);
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
  selectPaymentsForReceiptsView,
  linkPaymentToReceipt,
};