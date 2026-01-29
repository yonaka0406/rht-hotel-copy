let getPool = require('../../config/database').getPool;
const logger = require('../../config/logger');

const EFF_SUBQUERY = `
  SELECT 
    reservation_id, 
    hotel_id,
    MIN(date) as min_date, 
    (MAX(date) + INTERVAL '1 day') as max_date,
    MAX(daily_people) as max_daily_people
  FROM (
    SELECT 
      reservation_id, 
      hotel_id, 
      date, 
      SUM(CASE WHEN cancelled IS NULL THEN number_of_people ELSE 0 END) as daily_people
    FROM reservation_details
    GROUP BY reservation_id, hotel_id, date
  ) sub
  GROUP BY reservation_id, hotel_id
`;

const selectReservationById = async (requestId, id, hotelId, dbClient = null) => {
  const pool = getPool(requestId);
  const executor = dbClient || pool;
  const query = `
    SELECT * FROM reservations
    WHERE id = $1::UUID AND hotel_id = $2
  `;
  const values = [id, hotelId];

  try {
    const result = await executor.query(query, values);
    return result.rows[0]; // Assuming ID is unique, return the first row
  } catch (err) {
    logger.error(`Error fetching reservation by ID ${id}:`, err);
    throw new Error('Database error');
  }
};

const selectReservation = async (requestId, id, hotel_id) => {
  const pool = getPool(requestId);
  const { validate: uuidValidate } = require('uuid');

  // Validate that id is not null or undefined
  if (!id || id === 'null' || id === 'undefined' || !uuidValidate(id)) {
    logger.error('[selectReservation] Invalid reservation ID provided', { id });
    throw new Error('Invalid reservation ID: ID cannot be null or undefined');
  }
  const query = `
    SELECT
      rd.hotel_id,
      h.formal_name AS hotel_name,
      rd.reservation_id,
      rd.cancelled,
      rd.billable,
      c.id AS client_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      c.phone as client_phone,
      c.fax as client_fax,
      r.check_in,
      r.check_in_time,
      r.check_out,
      r.check_out_time,
      r.number_of_people AS reservation_number_of_people,
      eff.min_date AS details_min_date,
      eff.max_date AS details_max_date,
      eff.max_daily_people AS details_number_of_people,
      r.status,
      r.type,
      r.payment_timing,
      r.agent,
      r.ota_reservation_id,
      r.comment,
      r.has_important_comment,
      r.created_at,
      u_creator.name AS creator_name,
      rd.id AS id,
      rd.id AS reservation_detail_id,
      rd.date,
      rm.room_type_id,
      rt.name AS room_type_name,
      rd.room_id,
      rm.room_number,
      rm.smoking,
      rm.has_wet_area,
      rm.capacity,
      rm.floor,      
      rd.plans_global_id,
      rd.plans_hotel_id,
      rd.plan_type,
      rd.plan_name,
      rd.number_of_people,
      rd.price AS plan_total_price,
      COALESCE(ra.total_price, 0) AS addon_total_price,
      CASE
          WHEN rd.plan_type = 'per_room' THEN rd.price
          ELSE rd.price * rd.number_of_people
      END + COALESCE(ra.total_price, 0) AS price,
      COALESCE(rc.clients_json, '[]'::json) AS reservation_clients,
      COALESCE(ra.addons_json, '[]'::json) AS reservation_addons,
      COALESCE(rr.rates_json, '[]'::json) AS reservation_rates
    FROM
        reservations r
    JOIN
        reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
    JOIN
        hotels h ON h.id = rd.hotel_id
    JOIN
        clients c ON c.id = r.reservation_client_id
    JOIN
        rooms rm ON rm.id = rd.room_id AND rm.hotel_id = rd.hotel_id
    JOIN
        room_types rt ON rt.id = rm.room_type_id AND rt.hotel_id = rm.hotel_id
    LEFT JOIN
        users u_creator ON u_creator.id = r.created_by
    JOIN (${EFF_SUBQUERY}) eff ON eff.reservation_id = r.id AND eff.hotel_id = r.hotel_id
    LEFT JOIN LATERAL (
        SELECT
            SUM(ra.price * ra.quantity) AS total_price,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'addon_id', ra.id,
                    'addons_global_id', ra.addons_global_id,
                    'addons_hotel_id', ra.addons_hotel_id,
                    'addon_name', ra.addon_name,
                    'addon_type', ra.addon_type,
                    'quantity', ra.quantity,
                    'price', ra.price,
                    'sales_category', ra.sales_category,
                    'tax_type_id', ra.tax_type_id,
                    'tax_rate', ra.tax_rate
                )
            ) AS addons_json
        FROM reservation_addons ra
        WHERE ra.reservation_detail_id = rd.id AND ra.hotel_id = rd.hotel_id
        GROUP BY ra.reservation_detail_id
    ) ra ON true
    LEFT JOIN LATERAL (
        SELECT
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'client_id', rc_inner.client_id,
                    'name', c_inner.name,
                    'name_kana', c_inner.name_kana,
                    'name_kanji', c_inner.name_kanji,
                    'email', c_inner.email,
                    'phone', c_inner.phone,
                    'gender', c_inner.gender,
                    'address1', ad.street,
                    'address2', ad.city,
                    'postal_code', ad.postal_code
                )
            ) AS clients_json
        FROM reservation_clients rc_inner
        JOIN clients c_inner ON rc_inner.client_id = c_inner.id
        LEFT JOIN (
            SELECT *, ROW_NUMBER() OVER(PARTITION BY client_id ORDER BY created_at ASC) as rn
            FROM addresses
        ) ad ON ad.client_id = c_inner.id AND ad.rn = 1
        WHERE rc_inner.reservation_details_id = rd.id AND rc_inner.hotel_id = rd.hotel_id
    ) rc ON true
    LEFT JOIN LATERAL (
        SELECT
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'adjustment_type', rr.adjustment_type,
                    'adjustment_value', rr.adjustment_value,
                    'tax_type_id', rr.tax_type_id,
                    'tax_rate', rr.tax_rate,
                    'price', rr.price,
                    'include_in_cancel_fee', rr.include_in_cancel_fee,
                    'sales_category', rr.sales_category
                )
            ) AS rates_json
        FROM reservation_rates rr
        WHERE rr.reservation_details_id = rd.id AND rr.hotel_id = rd.hotel_id
        GROUP BY rr.reservation_details_id
    ) rr ON true
    WHERE
        r.id = $1 AND rd.hotel_id = $2
    ORDER BY
        rm.room_number,
        rd.date;
  `;

  const values = [id, hotel_id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservation:', err);
    throw new Error('Database error');
  }
};

const selectReservationDetail = async (requestId, id, hotel_id, dbClient = null) => {
  const pool = getPool(requestId);
  const executor = dbClient || pool;
  const query = `
    SELECT
      reservation_details.id,
      reservation_details.hotel_id,
      reservation_details.reservation_id,
      clients.id AS client_id,
      COALESCE(clients.name_kanji, clients.name_kana, clients.name) AS client_name,
      reservations.check_in,
      reservations.check_out,
      reservations.number_of_people AS reservation_number_of_people,
      eff.min_date AS details_min_date,
      eff.max_date AS details_max_date,
      eff.max_daily_people AS details_number_of_people,
      reservations.status,
      reservation_details.cancelled,
      reservations.type,
      reservations.agent,
      reservations.ota_reservation_id,
      reservations.comment,
      reservations.has_important_comment,
      reservation_details.date,
      rooms.room_type_id,
      room_types.name AS room_type_name,
      reservation_details.room_id,
      rooms.room_number,
      rooms.smoking,
      rooms.has_wet_area,
      rooms.capacity,
      rooms.floor,      
      reservation_details.plans_global_id,
      reservation_details.plans_hotel_id,
      reservation_details.plan_type,
      reservation_details.plan_name,
      reservation_details.number_of_people,
      reservation_details.price AS plan_total_price,
      COALESCE(ra.total_price, 0) AS addon_total_price, 
      CASE 
        WHEN reservation_details.plan_type = 'per_room' 
        THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
      END + COALESCE(ra.total_price, 0) AS price,
      COALESCE(rc.clients_json, '[]'::json) AS reservation_clients,
      COALESCE(ra.addons_json, '[]'::json) AS reservation_addons,
      COALESCE(rr.rates_json, '[]'::json) AS reservation_rates
    FROM
      reservation_details
      JOIN reservations 
        ON reservations.id = reservation_details.reservation_id 
        AND reservations.hotel_id = reservation_details.hotel_id
      JOIN (${EFF_SUBQUERY}) eff ON eff.reservation_id = reservations.id AND eff.hotel_id = reservations.hotel_id
      JOIN clients 
        ON clients.id = reservations.reservation_client_id
      JOIN rooms 
        ON rooms.id = reservation_details.room_id 
        AND rooms.hotel_id = reservation_details.hotel_id
      JOIN room_types 
        ON room_types.id = rooms.room_type_id 
        AND room_types.hotel_id = rooms.hotel_id      
      LEFT JOIN (
          SELECT
            ra.reservation_detail_id,
            SUM(ra.price * ra.quantity) AS total_price,
            JSON_AGG(
                JSON_BUILD_OBJECT(
                    'addon_id', ra.id,
                    'addons_global_id', ra.addons_global_id,
                    'addons_hotel_id', ra.addons_hotel_id,
                    'addon_name', ra.addon_name,
                    'addon_type', ra.addon_type,
                    'quantity', ra.quantity,
                    'price', ra.price,
                    'sales_category', ra.sales_category,
                    'tax_type_id', ra.tax_type_id,
                    'tax_rate', ra.tax_rate
                )
            ) AS addons_json
          FROM reservation_addons ra
          JOIN reservation_details rd 
            ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
          WHERE rd.id = $1 AND rd.hotel_id = $2
          GROUP BY ra.reservation_detail_id
        ) ra ON reservation_details.id = ra.reservation_detail_id
      LEFT JOIN (
          SELECT 
            rc.reservation_details_id,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'client_id', rc.client_id,
                'name', c.name,
                'name_kana', c.name_kana,
                'name_kanji', c.name_kanji,
                'email', c.email,
                'phone', c.phone,
                'gender', c.gender,
                'address1', ad.street,
                'address2', ad.city,
                'postal_code', ad.postal_code
              )
            ) AS clients_json
          FROM reservation_clients rc
          JOIN clients c ON rc.client_id = c.id
          LEFT JOIN (
            SELECT *, ROW_NUMBER() OVER(PARTITION BY client_id ORDER BY created_at ASC) as rn
            FROM addresses
          ) ad ON ad.client_id = c.id AND ad.rn = 1
          JOIN reservation_details rd 
            ON rd.id = rc.reservation_details_id AND rd.hotel_id = rc.hotel_id
          WHERE rd.id = $1 AND rd.hotel_id = $2
          GROUP BY rc.reservation_details_id
        ) rc ON rc.reservation_details_id = reservation_details.id
      LEFT JOIN (
          SELECT 
            rr.reservation_details_id,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'adjustment_type', rr.adjustment_type,
                'adjustment_value', rr.adjustment_value,
                'tax_type_id', rr.tax_type_id,
                'tax_rate', rr.tax_rate,
                'price', rr.price,
                'include_in_cancel_fee', rr.include_in_cancel_fee,
                'sales_category', rr.sales_category
              )
            ) AS rates_json          
          FROM reservation_rates rr
          JOIN reservation_details rd 
            ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
          WHERE rd.id = $1 AND rd.hotel_id = $2
          GROUP BY rr.reservation_details_id
        ) rr ON rr.reservation_details_id = reservation_details.id
    WHERE reservation_details.id = $1 AND reservation_details.hotel_id = $2
  `;

  const values = [id, hotel_id];

  try {
    const result = await executor.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservation detail:', err);
    throw new Error('Database error');
  }
};

const selectReservationAddons = async (requestId, id, hotelId, client = null) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * FROM reservation_addons
    WHERE reservation_detail_id = $1 AND hotel_id = $2
  `;

  const values = [id, hotelId];

  try {
    const executor = client || pool;
    const result = await executor.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservation addons:', err);
    throw new Error('Database error');
  }
};

const selectReservationClientIds = async (requestId, hotelId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT DISTINCT
      id, name, name_kana, name_kanji, COALESCE(name_kanji, name_kana, name) AS display_name, legal_or_natural_person, gender, date_of_birth, email, phone, fax
    FROM
    (
      SELECT c.*      
      FROM reservations r
        JOIN clients c 
          ON c.id = r.reservation_client_id
      WHERE r.id = $1 AND r.hotel_id = $2

      UNION ALL

      SELECT c.*
      FROM reservation_details rd
        JOIN reservation_clients rc ON rc.reservation_details_id = rd.id AND rc.hotel_id = rd.hotel_id
        JOIN clients c ON c.id = rc.client_id
      WHERE rd.reservation_id = $1 AND rd.hotel_id = $2
    ) AS ALL_CLIENTS
  `;

  const values = [reservationId, hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};

const selectReservationPayments = async (requestId, hotelId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      rp.*,
      pt.name AS payment_type_name,
      pt.transaction AS transaction_type,
      r.room_number,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS payer_name
    FROM 
      reservation_payments rp
      JOIN payment_types pt 
        ON rp.payment_type_id = pt.id
      JOIN rooms r
        ON rp.room_id = r.id AND rp.hotel_id = r.hotel_id
      JOIN clients c
        ON rp.client_id = c.id
    WHERE 
        rp.hotel_id = $1
        AND rp.reservation_id = $2
    ORDER BY 
        rp.date,
        rp.client_id,
        rp.value;
  `;

  const values = [hotelId, reservationId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};

const selectReservationParking = async (requestId, hotel_id, reservation_id) => {
  const pool = getPool(requestId);
  const query = `
      SELECT rp.*, 
        ps.spot_number, 
        ps.spot_type, 
        ps.capacity_units,
        pl.name as parking_lot_name,
        vc.name as vehicle_category_name,
        vc.capacity_units_required,
        rd.room_id,
        rd.date as reservation_date
      FROM reservation_parking rp
      LEFT JOIN parking_spots ps ON rp.parking_spot_id = ps.id
      LEFT JOIN parking_lots pl 
        ON ps.parking_lot_id = pl.id AND pl.hotel_id = rp.hotel_id
      LEFT JOIN vehicle_categories vc ON rp.vehicle_category_id = vc.id
      JOIN reservation_details rd ON rp.reservation_details_id = rd.id AND rp.hotel_id = rd.hotel_id
      WHERE rp.hotel_id = $1 
      AND rd.reservation_id = $2
      ORDER BY rp.date, ps.spot_number
  `;
  const values = [hotel_id, reservation_id];
  const result = await pool.query(query, values);
  return result.rows;
};

const selectReservedRooms = async (requestId, hotel_id, start_date, end_date) => {
  const pool = getPool(requestId);
  const query = `
    WITH reservation_guests AS (
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
      WHERE
        rc.hotel_id = $1
      ORDER BY
        reservation_details_id, hotel_id, rc.created_at
    )
    SELECT
      reservation_details.id
      ,reservation_details.hotel_id
      ,reservation_details.reservation_id
      ,CASE 
        WHEN reservations.type IN ('ota', 'web') AND rg.client_id IS NOT NULL THEN rg.client_id
        ELSE reservations.reservation_client_id
       END as client_id
      ,CASE 
        WHEN reservations.type IN ('ota', 'web') AND rg.client_id IS NOT NULL THEN COALESCE(rg.name_kanji, rg.name_kana, rg.name)
        ELSE COALESCE(clients.name_kanji, clients.name_kana, clients.name) 
       END as client_name
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.number_of_people AS total_number_of_people
      ,reservations.status      
      ,reservations.type
      ,reservations.payment_timing
      ,reservations.created_at
      ,reservations.agent
      ,reservations.ota_reservation_id
      ,reservation_details.date
      ,rooms.room_type_id
      ,room_types.name AS room_type_name
      ,reservation_details.room_id
      ,rooms.room_number
      ,rooms.smoking
      ,rooms.has_wet_area
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,COALESCE(plans_hotel.name, plans_global.name) AS plan_name
	    ,COALESCE(plans_hotel.color, plans_global.color) AS plan_color
      ,reservation_details.number_of_people
      ,reservation_details.price

    FROM
      reservation_details
      JOIN rooms ON reservation_details.room_id = rooms.id AND reservation_details.hotel_id = rooms.hotel_id
      JOIN room_types ON room_types.id = rooms.room_type_id AND room_types.hotel_id = rooms.hotel_id
      JOIN reservations ON reservations.id = reservation_details.reservation_id AND reservations.hotel_id = reservation_details.hotel_id
      LEFT JOIN clients ON clients.id = reservations.reservation_client_id
      LEFT JOIN plans_global ON reservation_details.plans_global_id = plans_global.id
      LEFT JOIN plans_hotel ON reservation_details.hotel_id = plans_hotel.hotel_id AND reservation_details.plans_hotel_id = plans_hotel.id
      LEFT JOIN reservation_guests rg ON rg.reservation_details_id = reservation_details.id AND rg.hotel_id = reservation_details.hotel_id
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date >= $2 AND reservation_details.date <= $3
      AND reservation_details.cancelled IS NULL      
    ORDER BY
      reservation_details.room_id
      ,reservation_details.date
  `;

  const values = [hotel_id, start_date, end_date];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reserved rooms:', err);
    throw new Error('Database error');
  }
};

const selectReservationsToday = async (requestId, hotelId, date) => {
  const pool = getPool(requestId);
  const query = `
    SELECT a.*, b.details
    FROM
      (
	      SELECT DISTINCT
          reservations.hotel_id
          ,reservations.id
          ,reservations.reservation_client_id
          ,COALESCE(r_client.name_kanji, r_client.name_kana, r_client.name) as client_name
          ,reservations.check_in
          ,reservations.check_in_time
          ,reservations.check_out
          ,reservations.check_out_time
          ,reservations.number_of_people as reservation_number_of_people
          ,reservations.status	
          ,reservations.payment_timing        
          ,reservations.has_important_comment
          ,reservation_details.room_id      
          ,rooms.room_number
          ,rooms.floor
          ,rooms.capacity
          ,rooms.for_sale
          ,rooms.smoking
          ,rooms.has_wet_area
          ,room_types.name as room_type_name
          ,reservation_details.number_of_people
          ,reservation_details.price
          ,reservation_details.plans_global_id
          ,reservation_details.plans_hotel_id
          ,COALESCE(plans_hotel.name, plans_global.name) as plan_name
          ,reservation_details.plan_type
          ,COALESCE(plans_hotel.color, plans_global.color) as plan_color
          ,rc.clients_json::TEXT
          ,reservation_details.cancelled
    
        FROM
          hotels
          ,rooms
          ,room_types
          ,reservations
          ,clients r_client
          ,reservation_details
            LEFT JOIN (
                SELECT 
                  rc.reservation_details_id,
                  JSON_AGG(
                    JSON_BUILD_OBJECT(
                      'client_id', rc.client_id,
                      'name', c.name,
                      'name_kana', c.name_kana,
                      'name_kanji', c.name_kanji,
                      'email', c.email,
                      'phone', c.phone,
                      'gender', c.gender,
                      'address1', ad.street,
                      'address2', ad.city,
                      'postal_code', ad.postal_code
                    )
                  ) AS clients_json
                FROM reservation_clients rc
                JOIN clients c ON rc.client_id = c.id
                LEFT JOIN (
                  SELECT *, ROW_NUMBER() OVER(PARTITION BY client_id ORDER BY created_at ASC) as rn
                  FROM addresses
                ) ad ON ad.client_id = c.id AND ad.rn = 1
                GROUP BY rc.reservation_details_id
              ) rc ON rc.reservation_details_id = reservation_details.id
            LEFT JOIN plans_hotel 
            ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
            LEFT JOIN plans_global 
            ON plans_global.id = reservation_details.plans_global_id
      
        WHERE
          reservations.hotel_id = $1 
          AND (reservation_details.date = $2 OR reservations.check_out = $2)
          AND reservations.hotel_id = hotels.id
          AND reservation_details.room_id = rooms.id
          AND reservation_details.hotel_id = rooms.hotel_id
          AND room_types.id = rooms.room_type_id
          AND room_types.hotel_id = rooms.hotel_id
          AND reservations.id = reservation_details.reservation_id
          AND reservations.hotel_id = reservation_details.hotel_id
          AND r_client.id = reservations.reservation_client_id
      ) AS a
      ,(
        SELECT 
	  	    r.hotel_id
		      ,r.id
		      ,rd.room_id		
	  	    ,JSON_AGG(
		        JSON_BUILD_OBJECT(
			        'date', rd.date,
			        'plans_global_id', rd.plans_global_id,
      		    'plans_hotel_id', rd.plans_hotel_id,
			        'plan_name', COALESCE(ph.name, pg.name),
      		    'plan_type', rd.plan_type,
      		    'plan_color', COALESCE(ph.color, pg.color)
		        ) ORDER BY rd.date
		      ) AS details
	      FROM 
          reservations r,
          reservation_details rd
          LEFT JOIN plans_hotel ph
            ON ph.hotel_id = rd.hotel_id AND ph.id = rd.plans_hotel_id
          LEFT JOIN plans_global pg
            ON pg.id = rd.plans_global_id
		  
    	  WHERE	      	
          r.id IN (
            SELECT DISTINCT res.id 
            FROM reservations res JOIN reservation_details red 
              ON res.id = red.reservation_id AND res.hotel_id = red.hotel_id
            WHERE res.hotel_id = $1 AND (red.date = $2 OR res.check_out = $2)
          )
          AND r.id = rd.reservation_id
          AND r.hotel_id = rd.hotel_id
      	GROUP BY
		      r.hotel_id, r.id
		      ,rd.room_id
      ) b
    WHERE
	    a.hotel_id = b.hotel_id AND a.id = b.id AND a.room_id = b.room_id
    ORDER BY 
      a.floor
      ,a.room_number
      ,a.room_id;
  `;

  const values = [hotelId, date];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};

const selectReservationBalance = async (requestId, hotelId, reservationId, endDate = null, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  let dateFilterQuery = '';
  const values = [hotelId, reservationId];

  if (endDate) {
    dateFilterQuery = 'AND rd.date <= $3';
    values.push(endDate);
  }

  const query = `
    SELECT
      details.hotel_id,
      details.reservation_id,
      details.room_id,
      details.total_price,
      COALESCE(payments.total_payment, 0) AS total_payment,
      COALESCE(details.total_price, 0) - COALESCE(payments.total_payment, 0) AS balance
    FROM (
      SELECT
        rd.hotel_id,
        rd.reservation_id,
        rd.room_id,
        SUM(
            CASE
                WHEN rd.billable IS TRUE AND rd.cancelled IS NULL THEN rd.price
                WHEN rd.billable IS TRUE AND rd.cancelled IS NOT NULL THEN COALESCE(rr_agg.base_rate_price, 0)
                ELSE 0
            END
        ) + COALESCE(SUM(ra_agg.total_addon_price), 0) AS total_price
      FROM
        reservation_details rd
      LEFT JOIN (
          SELECT
              rr_sub.reservation_details_id,
              SUM(rr_sub.price) AS base_rate_price
          FROM
              reservation_rates rr_sub
          WHERE
              rr_sub.adjustment_type = 'base_rate'
          GROUP BY
              rr_sub.reservation_details_id
      ) AS rr_agg ON rd.id = rr_agg.reservation_details_id
      LEFT JOIN (
          SELECT
              ra_sub.reservation_detail_id,
              SUM(ra_sub.quantity * ra_sub.price) AS total_addon_price
          FROM
              reservation_addons ra_sub
          GROUP BY
              ra_sub.reservation_detail_id
      ) AS ra_agg ON rd.id = ra_agg.reservation_detail_id
      WHERE
        rd.hotel_id = $1 AND rd.reservation_id = $2 ${dateFilterQuery}
      GROUP BY
        rd.hotel_id, rd.reservation_id, rd.room_id
    ) AS details
    LEFT JOIN (
      SELECT
        hotel_id,
        reservation_id,
        room_id,
        SUM(value) AS total_payment
      FROM
        reservation_payments
      WHERE
        hotel_id = $1 AND reservation_id = $2
      GROUP BY
        hotel_id, reservation_id, room_id
    ) AS payments ON details.hotel_id = payments.hotel_id AND details.reservation_id = payments.reservation_id AND details.room_id = payments.room_id
    ORDER BY
      1, 2, 6 DESC;
  `;
  try {
    const result = await dbClient.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservation:', err);
    throw new Error('Database error');
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const selectAvailableRooms = async (requestId, hotelId, checkIn, checkOut, client = null) => {
  const pool = getPool(requestId);
  const query = `
    WITH occupied_rooms AS (
      SELECT
        room_id
      FROM
        reservation_details
      WHERE
        hotel_id = $3
        AND date >= $1 AND date < $2
        AND room_id IS NOT NULL
        AND cancelled IS NULL
    )
    SELECT
      r.id AS room_id,
      r.room_type_id,
      rt.name AS room_type_name,
      r.room_number,
      r.floor,
      r.capacity,
      r.smoking,
      r.has_wet_area,
      r.for_sale
    FROM
      rooms r
    JOIN room_types rt ON r.room_type_id = rt.id AND r.hotel_id = rt.hotel_id
    WHERE
      r.hotel_id = $3
      AND r.id NOT IN (SELECT room_id FROM occupied_rooms)
      AND r.for_sale = TRUE
    ORDER BY r.assignment_priority ASC NULLS LAST, r.room_type_id, r.capacity DESC;
  `;

  const values = [checkIn, checkOut, hotelId];

  try {
    const executor = client ? client : pool;
    const result = await executor.query(query, values);
    return result.rows; // Return available rooms
  } catch (err) {
    logger.error('Error fetching available rooms:', err);
    throw new Error('Database error');
  }
};

const selectAvailableParkingSpots = async (requestId, hotelId, checkIn, checkOut, capacity_units_required, client = null) => {
  const pool = getPool(requestId);
  const query = `
        WITH occupied_spots AS (
            SELECT
                parking_spot_id
            FROM
                reservation_parking
            WHERE
                date >= $1 AND date < $2
                AND parking_spot_id IS NOT NULL
        )
        SELECT
            ps.id AS parking_spot_id,
            ps.spot_number,
            ps.spot_type,
            ps.capacity_units
        FROM
            parking_spots ps
        JOIN
            parking_lots pl ON ps.parking_lot_id = pl.id
        WHERE
            pl.hotel_id = $3
            AND ps.is_active = TRUE
            AND ps.capacity_units >= $4
            AND ps.id NOT IN (SELECT parking_spot_id FROM occupied_spots)
        ORDER BY ps.capacity_units, ps.id;
    `;

  const values = [checkIn, checkOut, hotelId, capacity_units_required];

  try {
    const executor = client ? client : pool;
    const result = await executor.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching available parking spots:', err);
    throw new Error('Database error');
  }
};

const selectAndLockAvailableParkingSpot = async (requestId, hotelId, checkIn, checkOut, capacity_units_required, client) => {
  if (!client) {
    throw new Error('A database client is required for locking.');
  }
  const query = `
        WITH occupied_spots AS (
            SELECT
                parking_spot_id
            FROM
                reservation_parking
            WHERE
                date >= $1 AND date < $2
                AND parking_spot_id IS NOT NULL
        )
        SELECT
            ps.id AS parking_spot_id,
            ps.spot_number,
            ps.spot_type,
            ps.capacity_units
        FROM
            parking_spots ps
        JOIN
            parking_lots pl ON ps.parking_lot_id = pl.id
        WHERE
            pl.hotel_id = $3
            AND ps.is_active = TRUE
            AND ps.capacity_units >= $4
            AND ps.id NOT IN (SELECT parking_spot_id FROM occupied_spots)
        ORDER BY ps.capacity_units, ps.id
        LIMIT 1
        FOR UPDATE of ps SKIP LOCKED;
    `;

  const values = [checkIn, checkOut, hotelId, capacity_units_required];

  try {
    const result = await client.query(query, values);
    return result.rows[0] || null; // Return the single spot or null
  } catch (err) {
    logger.error('Error fetching and locking available parking spot:', err);
    throw new Error('Database error');
  }
};

const selectReservationParkingAddons = async (requestId, id, hotelId, client = null) => {
  const pool = getPool(requestId);
  const query = `
    SELECT * FROM reservation_addons
    WHERE reservation_detail_id = $1 AND hotel_id = $2 AND addon_type = 'parking'
  `;

  const values = [id, hotelId];

  try {
    const executor = client || pool;
    const result = await executor.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error('Error fetching reservation parking addons:', err);
    throw new Error('Database error');
  }
};

const selectReservationsByClientId = async (requestId, hotelId, clientId) => {
  const pool = getPool(requestId);
  const { validate: uuidValidate } = require('uuid');

  // Validate that clientId is a valid UUID
  if (!clientId || clientId === 'null' || clientId === 'undefined' || !uuidValidate(clientId)) {
    logger.error('[selectReservationsByClientId] Invalid client ID provided', { clientId });
    throw new Error('Invalid client ID: ID must be a valid UUID');
  }

  const query = `
    SELECT
      r.id,
      r.hotel_id,
      r.reservation_client_id,
      r.check_in,
      r.check_out,
      r.number_of_people,
      eff.min_date AS details_min_date,
      eff.max_date AS details_max_date,
      eff.max_daily_people AS details_number_of_people,
      r.status,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      COALESCE(
        (SELECT STRING_AGG(DISTINCT rm.room_number, ', ' ORDER BY rm.room_number)
         FROM reservation_details rd
         JOIN rooms rm ON rm.id = rd.room_id AND rm.hotel_id = rd.hotel_id
         WHERE rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id AND rd.cancelled IS NULL),
        ''
      ) AS room_numbers
    FROM reservations r
    JOIN clients c ON c.id = r.reservation_client_id
    JOIN (${EFF_SUBQUERY}) eff ON eff.reservation_id = r.id AND eff.hotel_id = r.hotel_id
    WHERE r.hotel_id = $1
      AND r.reservation_client_id = $2
      AND r.status != 'cancelled'
    ORDER BY eff.min_date DESC;
  `;
  const values = [hotelId, clientId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Error fetching reservations by client:', error);
    return [];
  }
};


module.exports = {
  selectReservationById,
  selectReservation,
  selectReservationDetail,
  selectReservationAddons,
  selectReservationClientIds,
  selectReservationPayments,
  selectReservationParking,
  selectReservedRooms,
  selectReservationsToday,
  selectReservationBalance,
  selectAvailableRooms,
  selectAvailableParkingSpots,
  selectAndLockAvailableParkingSpot,
  selectReservationParkingAddons,
  selectReservationsByClientId,
}
