let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const { toFullWidthKana, processNameString } = require('../clients');
const { getPlanByKey } = require('../plan');
const { getAllPlanAddons } = require('../planAddon');
const { getPriceForReservation, getRatesForTheDay } = require('../planRate');
const { selectTLRoomMaster, selectTLPlanMaster } = require('../../ota/xmlModel');
const logger = require('../../config/logger');
const { deleteReservationAddonsByDetailId } = require('./delete');
const { insertReservationRate, insertAggregatedRates } = require('./insert');

// Helper
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Default times for reservations
const DEFAULT_CHECK_IN_TIME = '16:00';
const DEFAULT_CHECK_OUT_TIME = '10:00';

// Function to Select

const selectAvailableRooms = async (requestId, hotelId, checkIn, checkOut, client = null) => {
  const pool = getPool(requestId);
  const query = `
    WITH occupied_rooms AS (
      SELECT
        room_id
      FROM
        reservation_details
      WHERE
        date >= $1 AND date < $2
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
    console.error('Error fetching available rooms:', err);
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
    console.error('Error fetching available parking spots:', err);
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
    console.error('Error fetching and locking available parking spot:', err);
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
      rd.id,
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
      r.status,
      r.type,
      r.payment_timing,
      r.agent,
      r.ota_reservation_id,
      r.comment,
      r.has_important_comment,
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
                  'price', ra.price
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
                  'include_in_cancel_fee', rr.include_in_cancel_fee
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

  /*
    // Removed because of performance

    ,logs_reservation.log_time as reservation_log_time
    ,logs_reservation_details.log_time as reservation_detail_log_time
          LEFT JOIN 
      (
        SELECT * 
        FROM logs_reservation 
        WHERE record_id = $1 
        ORDER BY logs_reservation.log_time DESC 
        LIMIT 1
      ) AS logs_reservation
        ON logs_reservation.record_id = reservation_details.reservation_id
        LEFT JOIN 
      (
          SELECT *
          FROM logs_reservation 
          WHERE record_id IN((SELECT id from reservation_details where reservation_id = $1))
          ORDER BY logs_reservation.log_time DESC 
          LIMIT 1
      ) AS logs_reservation_details
        ON logs_reservation.record_id = reservation_details.id
  */

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservation:', err);
    throw new Error('Database error');
  }
};

const selectRoomReservationDetails = async (requestId, hotelId, roomId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      reservation_details.id,
      reservation_details.hotel_id,
      reservation_details.room_id,
      reservation_details.reservation_id,
      reservation_details.date,
      reservation_details.number_of_people
    FROM
      reservation_details
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.room_id = $2
      AND reservation_details.reservation_id = $3
  `;
  const values = [hotelId, roomId, reservationId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching room reservation details:', err);
    throw new Error('Database error');
  }
};

const selectMyHoldReservations = async (requestId, user_id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      r.hotel_id,
      h.name,
      r.id AS reservation_id,
      COALESCE(c.name_kanji, c.name_kana, c.name) AS client_name,
      r.check_in,
      r.check_out,
      r.number_of_people,
      r.status
    FROM reservations r
    JOIN hotels h ON h.id = r.hotel_id
    JOIN clients c ON c.id = r.reservation_client_id
    WHERE
      r.created_by = $1
      AND r.status = 'hold'
    ORDER BY r.check_in, r.id;
  `;

  const values = [user_id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching reservations:', err);
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
    console.error('Error fetching reservations:', err);
    throw new Error('Database error');
  }
};

const selectAvailableDatesForChange = async (requestId, hotelId, roomId, checkIn, checkOut) => {
  const pool = getPool(requestId);
  try {
    const maxDateQuery = `
      SELECT TO_CHAR(MAX(date) + INTERVAL '1 day', 'YYYY-MM-DD') AS max_date
      FROM reservation_details
      WHERE hotel_id = $1 AND room_id = $2 AND date < $3
        AND cancelled IS NULL
    `;
    const valuesMax = [hotelId, roomId, checkIn];
    const minDateQuery = `
      SELECT TO_CHAR(MIN(date), 'YYYY-MM-DD') AS min_date
      FROM reservation_details
      WHERE hotel_id = $1 AND room_id = $2 AND date >= $3
        AND cancelled IS NULL
    `;
    const valuesMin = [hotelId, roomId, checkOut];

    const resultMax = await pool.query(maxDateQuery, valuesMax);
    const resultMin = await pool.query(minDateQuery, valuesMin);

    const earliestCheckIn = resultMax.rows[0]?.max_date || null;
    const latestCheckOut = resultMin.rows[0]?.min_date || null;

    return { earliestCheckIn, latestCheckOut };
  } catch (error) {
    console.error('Error getting available dates:', error);
    throw error;
  }
};

const getHotelIdByReservationId = async (requestId, reservationId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT hotel_id
    FROM reservations
    WHERE id = $1
    LIMIT 1;
  `;
  const values = [reservationId];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]?.hotel_id || null;
  } catch (err) {
    console.error('Error fetching hotel ID by reservation ID:', err);
    throw new Error('Database error');
  }
};

/**
 * Get parking spot availability statistics for a hotel in a date range
 * @param {string} requestId - The request ID for logging
 * @param {number} hotelId - The hotel ID
 * @param {string} startDate - Start date in YYYY-MM-DD format
 * @param {string} endDate - End date in YYYY-MM-DD format
 * @returns {Promise<Array>} Array of parking spot statistics grouped by capacity, width, and height
 */
const selectParkingSpotAvailability = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
    WITH used_spots AS (
      SELECT 
        ps.spot_type,
        ps.capacity_units,
        CAST(ps.layout_info->>'width' AS NUMERIC) AS width,
        CAST(ps.layout_info->>'height' AS NUMERIC) AS height,
        COUNT(DISTINCT rp.parking_spot_id) AS used_count
      FROM 
        reservation_parking rp
        JOIN reservation_details rd 
          ON rp.reservation_details_id = rd.id 
          AND rp.hotel_id = rd.hotel_id
        JOIN parking_spots ps 
          ON ps.id = rp.parking_spot_id
        JOIN parking_lots pl 
          ON pl.id = ps.parking_lot_id
          AND pl.hotel_id = rp.hotel_id
      WHERE 
        rp.hotel_id = $1
        AND rp.date BETWEEN $2 AND $3
        AND rd.cancelled IS NULL
        AND (ps.spot_type IS NULL OR ps.spot_type != 'capacity_pool')
      GROUP BY 
        ps.spot_type, ps.capacity_units, width, height
    ),
    total_spots AS (
      SELECT 
        ps.spot_type,
        ps.capacity_units,
        CAST(ps.layout_info->>'width' AS NUMERIC) AS width,
        CAST(ps.layout_info->>'height' AS NUMERIC) AS height,
        COUNT(*) AS total_count
      FROM 
        parking_spots ps
        JOIN parking_lots pl ON pl.id = ps.parking_lot_id
      WHERE 
        pl.hotel_id = $1
        AND ps.is_active = TRUE
        AND (ps.spot_type IS NULL OR ps.spot_type != 'capacity_pool')
      GROUP BY 
        ps.spot_type, ps.capacity_units, width, height
    )
    SELECT 
      ts.spot_type,
      COALESCE(ts.capacity_units, 0) AS capacity_units,
      COALESCE(ts.width, 0) AS width,
      COALESCE(ts.height, 0) AS height,
      COALESCE(ts.total_count, 0) AS total_spots,
      COALESCE(us.used_count, 0) AS used_spots,
      COALESCE(ts.total_count, 0) - COALESCE(us.used_count, 0) AS available_spots
    FROM 
      total_spots ts
      LEFT JOIN used_spots us ON 
        ts.spot_type = us.spot_type
        AND ts.capacity_units = us.capacity_units 
        AND ts.width = us.width 
        AND ts.height = us.height
    ORDER BY 
      ts.capacity_units DESC, 
      ts.width DESC, 
      ts.height DESC;

  `;

  try {
    const values = [hotelId, startDate, endDate];
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error fetching parking spot availability:', err);
    throw new Error('Database error while fetching parking spot availability');
  }
};

// Function to Add
const addReservationHold = async (requestId, reservation, client = null, roomsToReserve = []) => {
  const pool = client || getPool(requestId);
  let shouldReleaseClient = false;
  if (!client) {    
    client = await pool.connect();
    shouldReleaseClient = true;
  }

  try {
    await client.query('BEGIN');

    // Insert reservation
    const reservationQuery = `
      INSERT INTO reservations (
        hotel_id, reservation_client_id, check_in, check_out, number_of_people, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const reservationValues = [
      reservation.hotel_id,
      reservation.reservation_client_id,
      reservation.check_in,
      reservation.check_out,
      reservation.number_of_people,
      reservation.created_by,
      reservation.updated_by
    ];
    const reservationResult = await client.query(reservationQuery, reservationValues);
    const newReservation = reservationResult.rows[0];
    
    await client.query('COMMIT');
    return newReservation;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      console.error('Error rolling back transaction:', rbErr);
    }
    console.error('Error adding reservation hold:', err);
    throw err; // Rethrow the original error
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
};

const addReservationDetail = async (requestId, detail, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  const query = `
    INSERT INTO reservation_details (
      hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *;
  `;
  const values = [
    detail.hotel_id,
    detail.reservation_id,
    detail.date,
    detail.room_id,
    detail.plans_global_id,
    detail.plans_hotel_id,
    detail.plan_name,
    detail.plan_type,
    detail.number_of_people,
    detail.price,
    detail.created_by,
    detail.updated_by
  ];
  //console.log('[addReservationDetail] Inserting with values:', values);

  try {
    if (shouldReleaseClient) {
      await dbClient.query('BEGIN');
    }

    const result = await dbClient.query(query, values);

    if (shouldReleaseClient) {
      await dbClient.query('COMMIT');
    }

    return result.rows[0]; // Return the inserted reservation detail
  } catch (err) {
    if (shouldReleaseClient) {
        try {
            await dbClient.query('ROLLBACK');
        } catch (rbErr) {
            console.error('Error rolling back transaction:', rbErr);
        }
    }
    if (err.code === '23514' && err.table === 'reservation_details') {
        console.error(`Import Error: ${err.message}. ${err.detail}`);
    } else {
        console.error('Error adding reservation detail:', err);
    }
    throw new Error('Database error');
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const addReservationDetailsBatch = async (requestId, details, client = null) => {
  const pool = getPool(requestId);
  let shouldReleaseClient = false;
  let dbClient = client;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  try {
    if (shouldReleaseClient) {
      await dbClient.query('BEGIN');
    }

    const columns = [
      'hotel_id', 'reservation_id', 'date', 'room_id', 'plans_global_id',
      'plans_hotel_id', 'plan_name', 'plan_type', 'number_of_people', 'price',
      'created_by', 'updated_by'
    ];
    const NUM_COLUMNS = columns.length;
    const POSTGRES_PARAM_LIMIT = 32767;
    const BATCH_SIZE = Math.floor(POSTGRES_PARAM_LIMIT / NUM_COLUMNS);

    const allCreatedDetails = [];

    for (let i = 0; i < details.length; i += BATCH_SIZE) {
      const batch = details.slice(i, i + BATCH_SIZE);
      
      const values = [];
      const placeholders = batch.map((d, j) => {
        const offset = j * NUM_COLUMNS;
        values.push(
          d.hotel_id, d.reservation_id, d.date, d.room_id,
          d.plans_global_id, d.plans_hotel_id, d.plan_name, d.plan_type,
          d.number_of_people, d.price, d.created_by, d.updated_by
        );
        return `(${Array.from(
          { length: NUM_COLUMNS },
          (_, k) => `$${offset + k + 1}`
        ).join(', ')})`;
      }).join(', ');

      const query = `
        INSERT INTO reservation_details (${columns.join(', ')})
        VALUES ${placeholders}
        RETURNING *;
      `;
      
      const result = await dbClient.query(query, values);
      allCreatedDetails.push(...result.rows);
    }

    if (shouldReleaseClient) {
      await dbClient.query('COMMIT');
    }

    return allCreatedDetails;
  } catch (err) {
    if (shouldReleaseClient) {
      await dbClient.query('ROLLBACK');
    }
    if (err.code === '23514' && err.table === 'reservation_details') {
        console.error(`Import Error: ${err.message}. ${err.detail}`);
    } else {
        console.error('Error adding reservation hold details:', err);
    }
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const addReservationAddon = async (requestId, addon, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;
  let shouldManageTransaction = (client === null);

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;    
  }

  const query = `
    INSERT INTO reservation_addons (
      hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, quantity, price, tax_type_id, tax_rate, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *;
  `;

  const values = [
    addon.hotel_id,
    addon.reservation_detail_id,
    addon.addons_global_id,
    addon.addons_hotel_id,
    addon.addon_name,
    addon.quantity,
    addon.price,
    addon.tax_type_id,
    addon.tax_rate,
    addon.created_by,
    addon.updated_by
  ];
  //console.log('[addReservationAddon] Inserting with values:', values);

  try {
    if (shouldManageTransaction) {
      await dbClient.query('BEGIN');
    }

    const result = await dbClient.query(query, values);

    if (shouldManageTransaction) {
      await dbClient.query('COMMIT');
    }

    return result.rows[0]; // Return the inserted reservation addon
  } catch (err) {
    if (shouldManageTransaction) {
        try {
            await dbClient.query('ROLLBACK');
        } catch (rbErr) {
            console.error('Error rolling back transaction:', rbErr);
        }
    }
    console.error('Error adding reservation addon:', err);
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const addReservationClient = async (requestId, reservationClient) => {
  const pool = getPool(requestId);
  const query = `
    INSERT INTO reservation_clients (
      hotel_id, reservation_details_id, client_id, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5)
    RETURNING *;
  `;

  const values = [
    reservationClient.hotel_id,
    reservationClient.reservation_details_id,
    reservationClient.client_id,
    reservationClient.created_by,
    reservationClient.updated_by
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the inserted reservation client
  } catch (err) {
    console.error('Error adding reservation client:', err);
    throw new Error('Database error');
  }
};

const addRoomToReservation = async (requestId, reservationId, numberOfPeople, roomId, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get reservation status
    const reservationStatusQuery = 'SELECT status FROM reservations WHERE id = $1';
    const reservationStatusResult = await client.query(reservationStatusQuery, [reservationId]);
    const status = reservationStatusResult.rows[0]?.status;
    const isConfirmed = status === 'confirmed' || status === 'checked_in';

    // Update the number_of_people in the reservations table
    const updateReservationQuery = `
      UPDATE reservations
      SET number_of_people = number_of_people + $1,
          updated_by = $2
      WHERE id = $3::UUID;
    `;
    await client.query(updateReservationQuery, [numberOfPeople, userId, reservationId]);

    // Copy one existing room_id in the reservation_details table
    const copyRoomQuery = `
      INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, number_of_people, price, created_by, updated_by, billable)
      SELECT hotel_id, reservation_id, date, $1, NULL, NULL, $2, 0, created_by, $3, $5
      FROM reservation_details
      WHERE (hotel_id, reservation_id, room_id) IN (
        SELECT hotel_id, reservation_id, room_id
        FROM reservation_details
        WHERE reservation_id = $4::UUID
        LIMIT 1
      )
      RETURNING *;
    `;
    const result = await client.query(copyRoomQuery, [roomId, numberOfPeople, userId, reservationId, isConfirmed]);

    await client.query('COMMIT');
    return result.rows[0];

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding room to reservation:', err);
    throw new Error('Database error');
  } finally {
    client.release();    
  }
};

const updateBlockToReservation = async (requestId, reservationId, clientId, userId) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE reservations
    SET
      status = 'hold',
      reservation_client_id = $1,
      updated_by = $2
    WHERE id = $3::UUID AND status = 'block'
    RETURNING *;
  `;
  const values = [clientId, userId, reservationId];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      throw new Error('Reservation not found or not in "block" status.');
    }
    return result.rows[0];
  } catch (err) {
    console.error('Error updating block to reservation:', err);
    throw new Error('Database error');
  }
};

// Update entry
const updateReservationDetail = async (requestId, reservationData, dbClient = null) => {
  const pool = getPool(requestId);
  const { id, hotel_id, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, updated_by } = reservationData;

  const client = dbClient || await pool.connect();
  const shouldReleaseClient = !dbClient;

  const query = `
      UPDATE reservation_details
      SET 
          room_id = $1,
          plans_global_id = $2,
          plans_hotel_id = $3,
          plan_name = $4,
          plan_type = $5,
          number_of_people = $6,
          price = $7,
          updated_by = $8
      WHERE id = $9::UUID AND hotel_id = $10
      RETURNING *;
  `;
  const values = [
    room_id,
    plans_global_id,
    plans_hotel_id,
    plan_name,
    plan_type,
    number_of_people,
    price,
    updated_by,
    id,
    hotel_id,
  ];
  //console.log('Query:', query);
  //console.log('Values:', values);

  try {
    const result = await client.query(query, values);
    return result.rows[0];
  } catch (err) {
    if (err.code === '23514' && err.table === 'reservation_details') {
        console.error(`Import Error: ${err.message}. ${err.detail}`);
    } else {
        console.error('Error updating reservation detail:', err);
    }
    throw new Error('Database error');
  } finally {
    if (shouldReleaseClient) {
      client.release();
    }
  }
};

const updateReservationStatus = async (requestId, reservationData) => {
  const { id, hotel_id, status, updated_by } = reservationData;

  const pool = getPool(requestId);
  const client = await pool.connect();

  let resStatus = status;
  let type = '';
  if (status === 'full-fee') {
    resStatus = 'cancelled';
    type = 'full-fee';
  }

  try {
    // Start the transaction
    await client.query('BEGIN');

    // 1. Update the status of the main reservation record
    const updateReservationQuery = `
      UPDATE reservations
      SET
        status = $1,
        updated_by = $2
      WHERE id = $3::UUID AND hotel_id = $4
      RETURNING *;
    `;
    const reservationValues = [resStatus, updated_by, id, hotel_id];
    const result = await client.query(updateReservationQuery, reservationValues);

    // 2. Based on the status, update related tables (reservation_details, reservation_parking)
    if (resStatus === 'cancelled') {
      // Determine if the cancellation is billable based on the original status
      const isBillable = type === 'full-fee';
      // console.log(`Processing cancellation with billable = ${isBillable}`);

      // Update reservation_details to mark as cancelled and set billable status
      const updateDetailsQuery = `
        UPDATE reservation_details
        SET
          cancelled = gen_random_uuid(),
          billable = $1,
          updated_by = $2
        WHERE reservation_id = $3::UUID AND hotel_id = $4;
      `;
      const detailValues = [isBillable, updated_by, id, hotel_id];
      await client.query(updateDetailsQuery, detailValues);

      // Also cancel any associated parking reservations by finding them through reservation_details
      const updateParkingQuery = `
        UPDATE reservation_parking
        SET
          cancelled = gen_random_uuid(),
          updated_by = $1
        WHERE reservation_details_id IN (
          SELECT id FROM reservation_details WHERE reservation_id = $2::UUID AND hotel_id = $3
        );
      `;
      const parkingValues = [updated_by, id, hotel_id];
      await client.query(updateParkingQuery, parkingValues);

    } else if (resStatus === 'confirmed') {
      // For confirmed reservations, ensure details are not cancelled and are billable
      const updateDetailsQuery = `
        UPDATE reservation_details
        SET
          cancelled = NULL,
          billable = TRUE,
          updated_by = $1
        WHERE reservation_id = $2::UUID AND hotel_id = $3;
      `;
      const detailValues = [updated_by, id, hotel_id];
      await client.query(updateDetailsQuery, detailValues);

      // Also "recover" any associated parking reservations by removing the cancelled flag
      const updateParkingQuery = `
        UPDATE reservation_parking
        SET
          cancelled = NULL,
          updated_by = $1
        WHERE reservation_details_id IN (
          SELECT id FROM reservation_details WHERE reservation_id = $2::UUID AND hotel_id = $3
        );
      `;
      const parkingValues = [updated_by, id, hotel_id];
      await client.query(updateParkingQuery, parkingValues);

    } else if (resStatus === 'provisory') {
      // For provisory reservations, ensure details are not billable
      const updateDetailsQuery = `
        UPDATE reservation_details
        SET
          billable = FALSE,
          updated_by = $1
        WHERE reservation_id = $2::UUID AND hotel_id = $3;
      `;
      const detailValues = [updated_by, id, hotel_id];
      await client.query(updateDetailsQuery, detailValues);
    }

    // If all queries were successful, commit the transaction
    await client.query('COMMIT');

    // Return the updated reservation from the first query
    return result.rows[0];
  } catch (err) {
    // If any query fails, roll back the entire transaction
    await client.query('ROLLBACK');
    console.error('Error in transaction, rolling back changes:', err);
    throw new Error('Database transaction failed');
  } finally {
    // Always release the client back to the pool in the end
    client.release();
  }
};

const updateReservationDetailStatus = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  // Get a client from the pool to run multiple queries in a single transaction
  const client = await pool.connect();

  const { id, hotel_id, status, updated_by, billable } = reservationData;

  try {
    // Start the transaction
    await client.query('BEGIN');

    // First, get the parent reservation_id from the detail being updated
    const getReservationIdQuery = 'SELECT reservation_id FROM reservation_details WHERE id = $1::UUID AND hotel_id = $2';
    const reservationIdResult = await client.query(getReservationIdQuery, [id, hotel_id]);
    const reservationId = reservationIdResult.rows[0]?.reservation_id;

    if (!reservationId) {
      throw new Error('Could not find reservation associated with the detail.');
    }

    // Get the current status of the main reservation to determine billable status on recovery
    const getReservationStatusQuery = 'SELECT status FROM reservations WHERE id = $1::UUID AND hotel_id = $2';
    const reservationStatusResult = await client.query(getReservationStatusQuery, [reservationId, hotel_id]);
    const currentReservationStatus = reservationStatusResult.rows[0]?.status;

    let detailQuery = '';
    let detailValues = [];

    // Get the current rates for this reservation detail
    const ratesQuery = `
      SELECT * FROM reservation_rates 
      WHERE reservation_details_id = $1 AND hotel_id = $2
    `;
    const ratesResult = await client.query(ratesQuery, [id, hotel_id]);
    const rates = Array.isArray(ratesResult.rows) ? ratesResult.rows : Object.values(ratesResult.rows);

    let ratesToUse = [];
    let calculatedPrice;

    if (status === 'cancelled') {
      // When cancelling, only include rates that are flagged to be included.
      ratesToUse = rates.filter(rate => rate.include_in_cancel_fee);
      logger.debug(`[updateReservationDetailStatus] Status is 'cancelled'. Filtered ratesToUse: ${JSON.stringify(ratesToUse)}`);
      calculatedPrice = calculatePriceFromRates(ratesToUse, false);
    } else {
      // When recovering, use all rates for price calculation      
      logger.debug(`[updateReservationDetailStatus] Status is '${status}'. Using all rates: ${JSON.stringify(rates)}`);
      calculatedPrice = calculatePriceFromRates(rates, false);
    }
    logger.debug(`[updateReservationDetailStatus] Calculated price for detail ${id}: ${calculatedPrice}`);

    // 1. Update the reservation_details table based on the status
    if (status === 'cancelled') {
      detailQuery = `
        UPDATE reservation_details
        SET
          cancelled = gen_random_uuid(),
          billable = $4,
          updated_by = $1,
          price = $5
        WHERE id = $2::UUID AND hotel_id = $3
        RETURNING *;
      `;
      detailValues = [updated_by, id, hotel_id, billable, calculatedPrice];

    } else if (status === 'recovered') {
      // If the reservation is on hold or provisory, recovering a detail should not make it billable.
      const isBillable = !(currentReservationStatus === 'provisory' || currentReservationStatus === 'hold');
      detailQuery = `
        UPDATE reservation_details
        SET
          cancelled = NULL,
          billable = $1,
          updated_by = $2,
          price = $5
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
      `;
      detailValues = [isBillable, updated_by, id, hotel_id, calculatedPrice];

    } else {
      // If the status is not recognized, abort the transaction.
      throw new Error('Invalid status for reservation detail update.');
    }

    const result = await client.query(detailQuery, detailValues);

    // 2. Update the associated reservation_parking records
    let parkingQuery = '';
    const parkingValues = [updated_by, id, hotel_id];

    if (status === 'cancelled') {
      // Cancel any associated parking reservations
      parkingQuery = `
        UPDATE reservation_parking
        SET
          cancelled = gen_random_uuid(),
          updated_by = $1
        WHERE reservation_details_id = $2::UUID AND hotel_id = $3;
      `;
    } else if (status === 'recovered') {
      // "Recover" any associated parking reservations by removing the cancelled flag
      parkingQuery = `
        UPDATE reservation_parking
        SET
          cancelled = NULL,
          updated_by = $1
        WHERE reservation_details_id = $2::UUID AND hotel_id = $3;
      `;
    }

    // Only execute the parking query if it was set
    if (parkingQuery) {
      await client.query(parkingQuery, parkingValues);
    }

    // 3. Check remaining details and update the main reservation accordingly
    const remainingDetailsQuery = `
      SELECT
          MIN(date) as new_check_in,
          MAX(date) + INTERVAL '1 day' as new_check_out
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2 AND cancelled IS NULL
    `;
    const remainingDetailsResult = await client.query(remainingDetailsQuery, [reservationId, hotel_id]);
    const { new_check_in, new_check_out } = remainingDetailsResult.rows[0];

    if (new_check_in === null) {
      // If no active details remain, cancel the entire reservation
      const cancelReservationQuery = `
        UPDATE reservations
        SET
            status = 'cancelled',
            updated_by = $1
        WHERE id = $2 AND hotel_id = $3;
      `;
      await client.query(cancelReservationQuery, [updated_by, reservationId, hotel_id]);
    } else {
      // Otherwise, update the check-in/out dates and potentially the status
      let updateQuery = `
        UPDATE reservations
        SET
            check_in = $1,
            check_out = $2,
            updated_by = $3
      `;
      const updateParams = [new_check_in, new_check_out, updated_by, reservationId, hotel_id];

      if (status === 'recovered' && currentReservationStatus === 'cancelled') {
        updateQuery += ", status = 'confirmed'";
      }

      updateQuery += ` WHERE id = $4 AND hotel_id = $5;`;
      await client.query(updateQuery, updateParams);
    }

    // If all queries were successful, commit the transaction
    await client.query('COMMIT');

    return result.rows[0];
  } catch (err) {
    // If any query fails, roll back the entire transaction
    await client.query('ROLLBACK');
    console.error('Error in transaction, rolling back changes:', err);
    throw new Error('Database transaction failed');
  } finally {
    // Always release the client back to the pool
    client.release();
  }
};

const updateReservationComment = async (requestId, reservationData, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  const { id, hotelId, comment, updated_by } = reservationData;

  try {
    if (shouldReleaseClient) {
      await dbClient.query('BEGIN');
    }
    // Update status
    const query = `
        UPDATE reservations
        SET
          comment = $1,
          updated_by = $2
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
    `;
    const values = [
      comment,
      updated_by,
      id,
      hotelId,
    ];
    const result = await dbClient.query(query, values);

    if (shouldReleaseClient) {
      await dbClient.query('COMMIT');
    }
    return result.rows[0];

  } catch (error) {
    if (shouldReleaseClient) {
        try {
            await dbClient.query('ROLLBACK');
        } catch (rbErr) {
            console.error('Error rolling back transaction:', rbErr);
        }
    }
    console.error('Error updating reservation comment:', error);
    throw error;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const updateReservationCommentFlag = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotelId, has_important_comment, updated_by } = reservationData;

  try {
    const query = `
        UPDATE reservations
        SET
          has_important_comment = $1,
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
    `;
    const values = [
      has_important_comment,
      updated_by,
      id,
      hotelId,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];

  } catch (error) {
    console.error('Error updating reservation comment flag:', error);
    throw new Error('Database error');
  }
};

const updateReservationTime = async (requestId, reservationData) => {
  const pool = getPool(requestId);
  const { id, hotelId, indicator, time, updated_by } = reservationData;


  try {
    let query = '';
    if (indicator === 'in') {
      query = `
        UPDATE reservations
        SET
          check_in_time = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
      `;
    } else if (indicator === 'out') {
      query = `
        UPDATE reservations
        SET
          check_out_time = $1,          
          updated_by = $2          
        WHERE id = $3::UUID AND hotel_id = $4
        RETURNING *;
      `;
    }

    const values = [
      time,
      updated_by,
      id,
      hotelId,
    ];
    const result = await pool.query(query, values);
    return result.rows[0];

  } catch (error) {
    console.error('Error updating reservation detail:', error);
    throw new Error('Database error');
  }
};

const updateRoomByCalendar = async (requestId, roomData) => {
  //console.log('--- Starting updateRoomByCalendar ---');
  //console.log('Received roomData:', roomData);
  const pool = getPool(requestId);
  const { id, hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode, updated_by } = roomData;

  // Calculate the shift direction in JavaScript
  const shiftDirection = new_check_in >= old_check_in ? 'DESC' : 'ASC';
  //console.log(`Shift direction calculated as: ${shiftDirection}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    //console.log('Transaction started.');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
    await client.query(setSessionQuery);

    // Check if the provided reservation_id has more than one distinct room_id
    const checkQuery = `
      SELECT COUNT(DISTINCT room_id) AS room_count
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2
    `;
    const checkValues = [id, hotel_id];
    const checkResult = await client.query(checkQuery, checkValues);
    const roomCount = checkResult.rows[0].room_count;
    //console.log(`Initial room count for reservation ${id}: ${roomCount}`);

    let newReservationId = id;

    // If room_count > 1 and check_in/check_out dates change, create a new reservation_id
    if (roomCount > 1 && mode === 'solo' && (new_check_in !== old_check_in || new_check_out !== old_check_out)) {
      //console.log('Condition met to split reservation. Creating a new reservation record.');
      const insertReservationQuery = `
        INSERT INTO reservations (hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, type, agent, ota_reservation_id, payment_timing, comment, has_important_comment, created_at, created_by, updated_by)
        SELECT hotel_id, reservation_client_id, $1, $2, $6, status, type, agent, ota_reservation_id, payment_timing, comment, has_important_comment, created_at, created_by, $3
        FROM reservations
        WHERE id = $4 AND hotel_id = $5
        RETURNING id
      `;
      const insertReservationValues = [new_check_in, new_check_out, updated_by, id, hotel_id, number_of_people];
      const insertResult = await client.query(insertReservationQuery, insertReservationValues);
      newReservationId = insertResult.rows[0].id;
      //console.log(`New reservation created with ID: ${newReservationId}`);

      // Adjust number_of_people in the original reservation
      const updateQuery = `
        UPDATE reservations
        SET number_of_people = number_of_people - $1
        WHERE id = $2 AND hotel_id = $3
      `;
      const updateValues = [number_of_people, id, hotel_id];
      await client.query(updateQuery, updateValues);
      //console.log(`Adjusted number_of_people on original reservation ${id}.`);
    }

    // Calculate the difference in days
    const oldDuration = (new Date(old_check_out) - new Date(old_check_in)) / (1000 * 60 * 60 * 24);
    const newDuration = (new Date(new_check_out) - new Date(new_check_in)) / (1000 * 60 * 60 * 24);
    //console.log(`Duration calculated - Old: ${oldDuration} days, New: ${newDuration} days.`);

        // If the duration is the same, update the dates. Else, add dates and delete the old ones
        if (oldDuration === newDuration) {
          //console.log('Duration is the same. Updating existing reservation_details dates.');
          const updateDatesQuery = `
            WITH date_diff AS (
              SELECT
                reservations.check_in AS old_check_in,
                reservations.check_out AS old_check_out,
                $1::DATE - reservations.check_in AS date_diff
              FROM reservations
              WHERE
                reservations.id = $2
                AND reservations.hotel_id = $3
            ),
            ordered_details AS (
                SELECT *, (SELECT date_diff FROM date_diff) AS shift_days
                FROM reservation_details
                WHERE reservation_id = $2
                AND hotel_id = $3
                AND room_id = $7
                ORDER BY date ${shiftDirection} NULLS LAST
            ),
            updated_dates AS (
              UPDATE reservation_details
              SET
                reservation_id = $4,
                room_id = $5,
                updated_by = $6,
                date = reservation_details.date + (SELECT date_diff FROM date_diff)
              FROM
                ordered_details
              WHERE reservation_details.id = ordered_details.id
              RETURNING reservation_details.*
            )
            SELECT * FROM updated_dates;
          `;
          const values = [
            new_check_in,
            id,
            hotel_id,
            newReservationId,
            new_room_id,
            updated_by,
            old_room_id
          ];
          const result = await client.query(updateDatesQuery, values);
          //console.log(`${result.rowCount} reservation_details records updated.`);
        } else {
          //console.log('Duration has changed. Recreating reservation_details records.');

          const reservationIdForDetails = newReservationId;

          if (newReservationId !== id) { // isSplitting
            const moveQuery = `
              UPDATE reservation_details
              SET reservation_id = $1
              WHERE reservation_id = $2 AND hotel_id = $3 AND room_id = $4
            `;
            await client.query(moveQuery, [newReservationId, id, hotel_id, old_room_id]);
          }
    
          // Get all original details to preserve plans day by day
          const originalDetailsQuery = `
            SELECT id, date, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, billable
            FROM reservation_details
            WHERE reservation_id = $1 AND hotel_id = $2 AND room_id = $3
            ORDER BY date ASC
          `;
          const originalDetailsResult = await client.query(originalDetailsQuery, [reservationIdForDetails, hotel_id, old_room_id]);
          const originalDetailsMap = new Map(originalDetailsResult.rows.map(d => [formatDate(new Date(d.date)), d]));
    
          // --- NEW LOGIC: START ---
          // 1. Fetch client and addon data BEFORE deleting old records
          let clientsToCopy = [];
          let addonsToCopy = [];
    
          const sourceDetailQuery = `
            SELECT id FROM reservation_details
            WHERE reservation_id = $1 AND hotel_id = $2 AND room_id = $3
            ORDER BY date ASC LIMIT 1
          `;
          const sourceResult = await client.query(sourceDetailQuery, [reservationIdForDetails, hotel_id, old_room_id]);
    
          if (sourceResult.rows.length > 0) {
            const sourceDetailId = sourceResult.rows[0].id;
            //console.log(`Found source detail ID ${sourceDetailId} to copy clients/addons from.`);
    
            const clientsResult = await client.query('SELECT client_id FROM reservation_clients WHERE reservation_details_id = $1', [sourceDetailId]);
            clientsToCopy = clientsResult.rows;
            //console.log(`Found ${clientsToCopy.length} clients to copy.`);
    
            const addonsResult = await client.query('SELECT addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate FROM reservation_addons WHERE reservation_detail_id = $1', [sourceDetailId]);
            addonsToCopy = addonsResult.rows;
            //console.log(`Found ${addonsToCopy.length} addons to copy.`);
          }
          // --- NEW LOGIC: END ---
    
          // 2. Delete old records
          const deleteOldQuery = `
            DELETE FROM reservation_details 
            WHERE reservation_id = $1 
              AND hotel_id = $2 
              AND room_id = $3
              AND (date < $4 OR date >= $5)
            RETURNING id, date;
          `;
          const deleteResult = await client.query(deleteOldQuery, [reservationIdForDetails, hotel_id, old_room_id, new_check_in, new_check_out]);
          //console.log(`Deleted ${deleteResult.rowCount} old reservation_details records.`);
    
          // 3. Create all required new dates
          const newDates = [];
          let currentDate = new Date(new_check_in);
          while (currentDate < new Date(new_check_out)) {
            newDates.push(formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }
    
          const existingDates = new Set(originalDetailsResult.rows.map(d => formatDate(new Date(d.date))));
          const datesToCreate = newDates.filter(d => !existingDates.has(d));
    
          if (datesToCreate.length > 0) {
            const template = originalDetailsResult.rows[0] || {
              plans_global_id: null,
              plans_hotel_id: null,
              plan_name: null,
              plan_type: 'per_room',
              number_of_people: number_of_people,
              price: 0,
              billable: true
            };
    
            const insertDetailsQuery = `
              INSERT INTO reservation_details ( 
                hotel_id, reservation_id, date, room_id, 
                plans_global_id, plans_hotel_id, plan_name, plan_type, 
                number_of_people, price, billable, created_by, updated_by
              )
              SELECT 
                $1 as hotel_id,
                $2::uuid as reservation_id,
                date_series.date,
                $3 as room_id,
                $4 as plans_global_id,
                $5 as plans_hotel_id, 
                $6 as plan_name,
                $7 as plan_type,
                $8 as number_of_people,
                $9 as price,
                $10 as billable,
                $11 as created_by,
                $11 as updated_by
              FROM unnest($12::date[]) as date_series(date)
              RETURNING id;
            `;
    
            const insertDetailsValues = [
              hotel_id,
              newReservationId,
              new_room_id,
              template.plans_global_id,
              template.plans_hotel_id,
              template.plan_name,
              template.plan_type,
              template.number_of_people,
              template.price,
              template.billable,
              updated_by,
              datesToCreate
            ];
    
            const insertedDetails = await client.query(insertDetailsQuery, insertDetailsValues);
            const newReservationDetails = insertedDetails.rows;
            //console.log(`Inserted ${newReservationDetails.length} new reservation_details records.`);
    
            // --- MODIFIED LOGIC: START ---
            // 4. Copy clients/addons to new records using the data fetched earlier
            if (newReservationDetails.length > 0) {
              let clientsInserted = 0;
              let addonsInserted = 0;
    
              for (const detail of newReservationDetails) {
                // Insert clients
                if (clientsToCopy.length > 0) {
                  for (const clientRow of clientsToCopy) {
                    const insertClientQuery = `
                      INSERT INTO reservation_clients (hotel_id, reservation_details_id, client_id, created_by, updated_by)
                      VALUES ($1, $2, $3, $4, $4)
                    `;
                    const clientResult = await client.query(insertClientQuery, [hotel_id, detail.id, clientRow.client_id, updated_by]);
                    clientsInserted += clientResult.rowCount || 0;
                  }
                }
    
                // Insert addons
                if (addonsToCopy.length > 0) {
                  for (const addonRow of addonsToCopy) {
                    const insertAddonQuery = `
                      INSERT INTO reservation_addons (hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, addon_type, quantity, price, tax_type_id, tax_rate, created_by, updated_by)
                      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
                    `;
                    const addonResult = await client.query(insertAddonQuery, [
                      hotel_id, detail.id, addonRow.addons_global_id, addonRow.addons_hotel_id, addonRow.addon_name,
                      addonRow.addon_type, addonRow.quantity, addonRow.price, addonRow.tax_type_id, addonRow.tax_rate, updated_by
                    ]);
                    addonsInserted += addonResult.rowCount || 0;
                  }
                }
              }
              //console.log(`Total clients inserted: ${clientsInserted}, Total addons inserted: ${addonsInserted}`);
            }
            // --- MODIFIED LOGIC: END ---
          }
        }
    // Update reservations table with new check_in and check_out
    //console.log(`Updating main reservation record ${newReservationId} with new dates.`);
    const updateReservationQuery = `
      UPDATE reservations
      SET check_in = $1, check_out = $2, updated_by = $3
      WHERE id = $4 AND hotel_id = $5
    `;
    const updateReservationValues = [new_check_in, new_check_out, updated_by, newReservationId, hotel_id];
    await client.query(updateReservationQuery, updateReservationValues);

    // Recalculate plan price
    //console.log('Recalculating plan price.');
    // Recalculating the plan here was overriding the OTA plan prices.
    // However, if we change to a new date and the conditional rules are different, the price will not be updated.
    //await recalculatePlanPrice(requestId, newReservationId, hotel_id, new_room_id, updated_by, false, client);

    await client.query('COMMIT');
    //console.log('Transaction committed successfully.');

    const returnPayload = {
      success: true,
      reservation_id: newReservationId,
      original_reservation_id: id,
      message: 'Room calendar updated successfully'
    };
    //console.log('--- Finished updateRoomByCalendar ---', returnPayload);
    return returnPayload;

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error in updateRoomByCalendar, transaction rolled back:', err);
    throw new Error(`Failed to update reservation: ${err.message}`);
  } finally {
    client.release();
    //console.log('Database client released.');
  }
};

const updateCalendarFreeChange = async (requestId, roomData, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  let query = '';
  let values = [];

  try {
    await client.query('BEGIN');

    // Track reservation updates
    const reservationUpdates = {};

    // Loop through roomData to update each reservation
    for (const data of roomData) {
      const { id, hotel_id, date, room_id, reservation_id, check_in, check_out } = data;

      query = `
        UPDATE reservations
        SET check_in = $1, check_out = $2, updated_by = $3
        WHERE id = $4 AND hotel_id = $5
      `;
      values = [check_in, check_out, user_id, reservation_id, hotel_id];
      const resultReservation = await client.query(query, values);

      // Perform the update query for each entry
      query = `
        UPDATE reservation_details
        SET date = $1, room_id = $2, updated_by = $3
        WHERE id = $4 AND hotel_id = $5
        RETURNING *;
      `;

      values = [date, room_id, user_id, id, hotel_id];
      const resultReservationDetails = await client.query(query, values);
    }

    await client.query('COMMIT');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error occurred during update:', err);
    throw err;
  } finally {
    client.release();
  }

  const { id, hotel_id, date, room_id } = roomData;
  // console.log('roomData:', id, hotel_id, date, room_id);


};

const updateReservationRoomGuestNumber = async (requestId, detailsArray, updated_by) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    // console.log('Starting transaction...');
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, updated_by);
    await client.query(setSessionQuery);

    // Update the number_of_people field in the reservations table
    const updateQuery = `
      UPDATE reservations
      SET number_of_people = number_of_people + $1,
          updated_by = $4
      WHERE id = $2 and hotel_id = $3
      RETURNING number_of_people;
    `;
    const updateResult = await pool.query(updateQuery, [detailsArray[0].operation_mode, detailsArray[0].reservation_id, detailsArray[0].hotel_id, updated_by]);

    // Check if the number_of_people is now <= 0
    if (updateResult.rows.length === 0 || updateResult.rows[0].number_of_people <= 0) {
      await client.query('ROLLBACK');
      console.warn('Rollback: number_of_people is <= 0');
      return { success: false, message: 'Invalid operation: number_of_people would be zero or negative' };
    }

    // Update the reservation details with promise    
    const dtlUpdatePromises = detailsArray.map(async ({ id, operation_mode, plans_global_id, plans_hotel_id, hotel_id, date }) => {
      let newPrice = 0;
      newPrice = await getPriceForReservation(requestId, plans_global_id, plans_hotel_id, hotel_id, formatDate(new Date(date)), false, client);
      // console.log('newPrice calculated:',newPrice);

      const dtlUpdateQuery = `
        UPDATE reservation_details
        SET number_of_people = number_of_people + $1,
            price = $2
        WHERE id = $3
        RETURNING *;
      `;
      // console.log('dtlUpdateQuery', dtlUpdateQuery);
      return client.query(dtlUpdateQuery, [operation_mode, newPrice, id]);
    });

    const dtlUpdateResults = await Promise.all(dtlUpdatePromises);

    // Check if any of the reservation_details updates resulted in number_of_people <= 0
    for (const result of dtlUpdateResults) {
      if (result.rows.length === 0 || result.rows[0].number_of_people <= 0) {
        await client.query('ROLLBACK');
        console.warn('Rollback: number_of_people in reservation_details is <= 0');
        return { success: false, message: 'Invalid operation: number_of_people in reservation_details would be zero or negative' };
      }

      // Check if number_of_people is less than the count of corresponding id in reservation_clients
      const { id, number_of_people } = result.rows[0];
      const clientCountQuery = `
        SELECT COUNT(*) as client_count
        FROM reservation_clients
        WHERE reservation_details_id = $1;
      `;
      const clientCountResult = await pool.query(clientCountQuery, [id]);
      const clientCount = parseInt(clientCountResult.rows[0].client_count, 10);

      if (number_of_people < clientCount) {
        const deleteClientQuery = `
          WITH deleted AS (
            SELECT id
            FROM reservation_clients
            WHERE reservation_details_id = $1
            LIMIT 1
          )
          DELETE FROM reservation_clients
          WHERE id IN (SELECT id FROM deleted);
        `;
        await pool.query(deleteClientQuery, [id]);
      }


    }

    await client.query('COMMIT');
    return { success: true, message: 'Reservation details updated successfully' };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating room:', err);
    throw new Error('Database error');
  } finally {
    client.release();
    // console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

const updateReservationGuest = async (requestId, oldValue, newValue, client = null) => {
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  const query = `
    UPDATE reservation_clients
    SET reservation_details_id = $1
    WHERE id IN
      (
        SELECT id
        FROM reservation_clients
        WHERE reservation_details_id = $2
        LIMIT 1
      );
  `;

  try {
    if (shouldReleaseClient) {
      await dbClient.query('BEGIN');
    }

    await dbClient.query(query, [newValue, oldValue]);

    if (shouldReleaseClient) {
      await dbClient.query('COMMIT');
    }
    // console.log('Reservation guest updated successfully');
  } catch (err) {
    if (shouldReleaseClient) {
        try {
            await dbClient.query('ROLLBACK');
        } catch (rbErr) {
            console.error('Error rolling back transaction:', rbErr);
        }
    }
    console.error('Error updating reservation guest:', err);
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const updateClientInReservation = async (requestId, oldValue, newValue) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN'); // Start transaction

    await client.query(
      `UPDATE reservations
       SET reservation_client_id = $1
       WHERE reservation_client_id = $2`,
      [newValue, oldValue]
    );

    await client.query(
      `UPDATE reservation_clients
       SET client_id = $1
       WHERE client_id = $2`,
      [newValue, oldValue]
    );

    await client.query(
      `UPDATE reservation_payments
       SET client_id = $1
       WHERE client_id = $2`,
      [newValue, oldValue]
    );

    await client.query('COMMIT'); // Commit transaction
    // console.log('updateClientInReservation commit');
  } catch (err) {
    await client.query('ROLLBACK'); // Rollback transaction on error    
  } finally {
    client.release(); // Release the client back to the pool
  }

};

const updateReservationDetailPlan = async (requestId, id, hotel_id, plan, rates, price, user_id, disableRounding, client = null) => {
  //console.log('[updateReservationDetailPlan] called with:', { id, hotel_id, plan, rates, price, user_id });
  if (!plan) {
    console.warn('[updateReservationDetailPlan] plan is null or undefined');
  }
  const pool = getPool(requestId);
  let dbClient;
  if (client) {
    dbClient = client;
  } else {
    try {
      dbClient = await pool.connect();
    } catch (connectError) {
      logger.error(`[${requestId}] Failed to acquire database client for updateReservationDetailPlan: ${connectError.message}`, { stack: connectError.stack });
      throw new Error('Failed to acquire database client.');
    }
  }
  if (!dbClient) {
    throw new Error('Failed to acquire database client for updateReservationDetailPlan (dbClient is null after connect attempt).');
  }
  const shouldReleaseClient = !client;

  const plans_global_id = plan?.plans_global_id === 0 ? null : plan?.plans_global_id ?? null;
  const plans_hotel_id = plan?.plans_hotel_id === 0 ? null : plan?.plans_hotel_id ?? null;
  const plan_name = plan?.name ?? null;
  const plan_type = plan?.plan_type ?? null;

  // Use unified price calculation
  let calculatedPrice = 0;
  if (rates && rates.length > 0) {
    calculatedPrice = calculatePriceFromRates(rates, disableRounding);

    // Log if there's a significant difference between provided and calculated price
    if (price !== undefined && Math.abs(calculatedPrice - parseFloat(price)) > 0.01) {
      console.warn(`[updateReservationDetailPlan] Price mismatch: provided=${price}, calculated=${calculatedPrice}`);
    }

    // Use the calculated price instead of the provided one
    price = calculatedPrice;
  }

  const updateReservationDetailsQuery = `
    UPDATE reservation_details
    SET plans_global_id = $1
      ,plans_hotel_id = $2
      ,plan_name = $3
      ,plan_type = $4
      ,price = $5
      ,updated_by = $6
    WHERE hotel_id = $7 AND id = $8::uuid
    RETURNING *;
  `;

  try {
    await dbClient.query('BEGIN');

    // Set session user_id
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await dbClient.query(setSessionQuery);

    // Update reservation_details with the recalculated price
    //console.log('[updateReservationDetailPlan] Executing update with recalculated price:', {plans_global_id, plans_hotel_id, plan_name, plan_type, price, user_id, hotel_id, id});
    await dbClient.query(updateReservationDetailsQuery, [
      plans_global_id,
      plans_hotel_id,
      plan_name,
      plan_type,
      price,
      user_id,
      hotel_id,
      id,
    ]);

    if (rates && rates.length > 0) {
      // Delete existing rates
      const deleteRatesQuery = `
        DELETE FROM reservation_rates WHERE reservation_details_id = $1;
      `;
      await dbClient.query(deleteRatesQuery, [id]);

      // Insert rates using the shared utility function
      await insertAggregatedRates(requestId, rates, hotel_id, id, user_id, disableRounding, dbClient);
    }

    await dbClient.query('COMMIT');
  } catch (err) {
    await dbClient.query('ROLLBACK');
    if (err.code === '23514' && err.table === 'reservation_details') {
        console.error(`Import Error: ${err.message}. ${err.detail}`);
    } else {
        console.error('Error updating reservation detail plan:', err);
    }
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const updateReservationDetailAddon = async (requestId, id, hotel_id, addons, user_id, client = null) => {
  if (!Array.isArray(addons)) {
    addons = [];
  }
  const pool = getPool(requestId);
  let dbClient = client;
  let shouldReleaseClient = false;

  if (!dbClient) {
    dbClient = await pool.connect();
    shouldReleaseClient = true;
  }

  try {
    // Set session user_id for logging
    await dbClient.query(format(`SET SESSION "my_app.user_id" = %L;`, user_id));

    // Assuming deleteReservationAddonsByDetailId also accepts a client
    await deleteReservationAddonsByDetailId(requestId, id, hotel_id, user_id, dbClient);
    
    const addOnPromises = addons.map(addon =>
      addReservationAddon(requestId, {
        hotel_id: hotel_id,
        reservation_detail_id: id,
        addons_global_id: addon.addons_global_id,
        addons_hotel_id: addon.addons_hotel_id,
        addon_name: addon.addon_name,
        quantity: addon.quantity,
        price: addon.price,
        tax_type_id: addon.tax_type_id,
        tax_rate: addon.tax_rate,
        created_by: user_id,
        updated_by: user_id,
      }, dbClient) // Pass the client here
    );
    await Promise.all(addOnPromises);
  } catch (err) {
    console.error('Error updating reservation detail addon:', err);
    throw err;
  } finally {
    if (shouldReleaseClient) {
      dbClient.release();
    }
  }
};

const updateReservationDetailRoom = async (requestId, id, room_id, user_id) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE reservation_details
    SET room_id = $1      
      ,updated_by = $2
    WHERE id = $3::uuid
    RETURNING *;
  `;

  try {
    await pool.query(query, [room_id, user_id, id]);
  } catch (err) {
    console.error('Error updating reservation guest:', err);
  }
};

const updateReservationRoom = async (requestId, reservation_id, room_id_old, room_id_new, user_id) => {
  const pool = getPool(requestId);
  const query = `
    UPDATE reservation_details
    SET room_id = $1
      ,updated_by = $2
    WHERE 
      reservation_id = $3::uuid
      AND room_id = $4 
    RETURNING *;
  `;

  try {
    await pool.query(query, [room_id_new, user_id, reservation_id, room_id_old]);
  } catch (err) {
    console.error('Error updating reservation guest:', err);
  }
};

const updateReservationRoomWithCreate = async (requestId, reservation_id, room_id_old, room_id_new, numberOfPeople, user_id) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Step 1: Copy reservation to new room
    const insertQuery = `
      INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, plan_type, number_of_people, price, cancelled, billable, created_by, updated_by)
      SELECT hotel_id, reservation_id, date, $1, plans_global_id, plans_hotel_id, plan_name, plan_type, $2, price, cancelled, billable, $3, $3
      FROM reservation_details
      WHERE reservation_id = $4::uuid AND room_id = $5
      RETURNING *;
    `;
    await client.query(insertQuery, [room_id_new, numberOfPeople, user_id, reservation_id, room_id_old]);

    // Step 2: Subtract numberOfPeople from the old room
    const updateQuery = `
      UPDATE reservation_details
      SET number_of_people = number_of_people - $1,
          updated_by = $2
      WHERE reservation_id = $3::uuid
        AND room_id = $4 
      RETURNING *;
    `;
    await client.query(updateQuery, [numberOfPeople, user_id, reservation_id, room_id_old]);
    /*
        // Step 3: Move `numberOfPeople` clients from old room to new room
        const moveClientQuery = `
          UPDATE reservation_clients
          SET reservation_details_id = $1    
          WHERE client_id IN 
            (
              SELECT DISTINCT client_id 
              FROM reservation_clients rc, reservation_details rd
              WHERE rc.reservation_details_id = rd.id
              AND rd.reservation_id = $3::uuid AND rd.room_id = $4 
              LIMIT $5
            )
          RETURNING *;
        `;
        await client.query(moveClientQuery, [reservation_id, room_id_old, numberOfPeople]);
    */

    await client.query("COMMIT");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error in transaction:", err);
  } finally {
    client.release();
  }
};

const updateReservationRoomPlan = async (requestId, data) => {
  //console.log('DEBUGGING updateReservationRoomPlan ARGS:', { requestId, data });
  const { reservationId, hotelId, roomId, plan, addons, daysOfTheWeek, userId, disableRounding } = data;

  // console.log('DEBUGGING updateReservationRoomPlan disableRounding:', disableRounding);

  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set session context for auditing/triggers
    await client.query(format(`SET SESSION "my_app.user_id" = %L;`, userId));

    let detailsArray = await selectRoomReservationDetails(requestId, hotelId, roomId, reservationId);
    const validDays = daysOfTheWeek.map(d => d.value);
    // Filter detailsArray to keep only dates that match daysOfTheWeek
    detailsArray = detailsArray.filter(detail => {
      const dayOfWeek = detail.date.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();
      const isIncluded = validDays.includes(dayOfWeek);
      return isIncluded;
    });

    // Update the reservation details with promise
    const updatePromises = detailsArray.map(async (detail) => {
      const { id, date } = detail;

      try {
        // 1. Update Plan      
        if (plan) {
          await updateReservationDetailPlan(requestId, id, hotelId, plan, [], 0, userId, disableRounding);
        }

        // 2. Update Addons        
        await updateReservationDetailAddon(requestId, id, hotelId, addons || [], userId);

      } catch (error) {
        throw error;
      }
    });

    await Promise.all(updatePromises);

    // 3. Recalculate Price after updating plans and addons    
    await recalculatePlanPrice(requestId, reservationId, hotelId, roomId, userId, disableRounding);


    await client.query('COMMIT');

  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error in transaction:`, error);
    await client.query('ROLLBACK');
    console.error(`[${new Date().toISOString()}] [Request ${requestId}] Transaction rolled back`);
    throw error;
  } finally {
    //console.log(`[${new Date().toISOString()}] [Request ${requestId}] Releasing database connection`);
    client.release();
    /*
    console.log(`[${new Date().toISOString()}] [Request ${requestId}] Connection released. Pool status:`, {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount
    });
    */
  }
};

const updateReservationRoomPattern = async (requestId, reservationId, hotelId, roomId, pattern, user_id, disableRounding) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await client.query(setSessionQuery);

    const detailsArray = await selectRoomReservationDetails(requestId, hotelId, roomId, reservationId);

    // Update the reservation details with promise
    const updatePromises = detailsArray.map(async (detail) => {
      const { id, date, number_of_people } = detail;

      const detailDate = new Date(date);
      const dayOfWeek = detailDate.toLocaleDateString('en-US', { weekday: 'short' }).toLowerCase();

      const plan = await getPlanByKey(requestId, hotelId, pattern[dayOfWeek]);
      const addons = await getAllPlanAddons(requestId, plan.plans_global_id, plan.plans_hotel_id, hotelId);
      if (addons && Array.isArray(addons)) {
        addons.forEach(addon => {
          addon.quantity = plan.plan_type === 'per_person' ? number_of_people : 1;
        });
      }

      // 1. Update Plan
      if (plan) {
        await updateReservationDetailPlan(requestId, id, hotelId, plan, [], 0, user_id, disableRounding, client);
      } else {
        //console.log('[updateReservationDetailPlan] Skipped because plan is null');
      }

      // 2. Update Addons
      await updateReservationDetailAddon(requestId, id, hotelId, addons, user_id, client);

    });

    await Promise.all(updatePromises);

    // 3. Recalculate Price after updating plans and addons
    await recalculatePlanPrice(requestId, reservationId, hotelId, roomId, user_id, disableRounding, client);

    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating room plan:', error);
    throw error;
  } finally {
    client.release();
    //console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
  }
};

const recalculatePlanPrice = async (requestId, reservation_id, hotel_id, room_id, user_id, disableRounding = false, client = null) => {
  const pool = getPool(requestId);

  // Use provided client or create a new connection
  const dbClient = client || await pool.connect();
  const shouldManageTransaction = !client; // Only manage transaction if we created the connection

  try {
    // Only begin transaction if we're managing it
    if (shouldManageTransaction) {
      await dbClient.query('BEGIN');
    }

    // Set session
    const setSessionQuery = format(`SET SESSION "my_app.user_id" = %L;`, user_id);
    await dbClient.query(setSessionQuery);

    // Fetch the reservation details based on reservation_id, hotel_id, and room_id
    const detailsQuery = `
      SELECT id, plans_global_id, plans_hotel_id, hotel_id, date
      FROM reservation_details
      WHERE reservation_id = $1 AND hotel_id = $2 AND room_id = $3
      ORDER BY date;
    `;
    const detailsResult = await dbClient.query(detailsQuery, [reservation_id, hotel_id, room_id]);
    const detailsArray = detailsResult.rows;

    // Update the reservation details with promise
    const dtlUpdatePromises = detailsArray.map(async ({ id, plans_global_id, plans_hotel_id, hotel_id, date }) => {
      const formattedDate = formatDate(new Date(date));
      // Fetch new price
      const newPrice = await getPriceForReservation(requestId, plans_global_id, plans_hotel_id, hotel_id, formattedDate, disableRounding, dbClient);

      // Update reservation_details
      const dtlUpdateQuery = `
        UPDATE reservation_details
        SET price = $1
        WHERE id = $2
        RETURNING *;
      `;
      await dbClient.query(dtlUpdateQuery, [newPrice, id]);

      // Delete existing rates for this reservation_details_id
      const deleteRatesQuery = `
        DELETE FROM reservation_rates WHERE reservation_details_id = $1;
      `;
      await dbClient.query(deleteRatesQuery, [id]);

      // Fetch new rates
      const newrates = await getRatesForTheDay(requestId, plans_global_id, plans_hotel_id, hotel_id, formattedDate);

      // Insert rates using the shared utility function
      await insertAggregatedRates(requestId, newrates, hotel_id, id, user_id, false, dbClient);

      // Update the price in reservation_details using the calculated price from rates
      const calculatedPrice = calculatePriceFromRates(newrates, disableRounding);
      const updatePriceQuery = `
        UPDATE reservation_details
        SET price = $1
        WHERE id = $2;
      `;
      await dbClient.query(updatePriceQuery, [calculatedPrice, id]);
    });

    // Wait for all updates to complete
    await Promise.all(dtlUpdatePromises);

    // Only commit if we're managing the transaction
    if (shouldManageTransaction) {
      await dbClient.query('COMMIT');
    }

    return { success: true };
  } catch (error) {
    // Only rollback if we're managing the transaction
    if (shouldManageTransaction) {
      await dbClient.query('ROLLBACK');
    }
    console.error('Error recalculating plan price:', error);
    throw error;
  } finally {
    // Only release connection if we created it
    if (shouldManageTransaction) {
      dbClient.release();
      //console.log("After release:", pool.totalCount, pool.idleCount, pool.waitingCount);
    }
  }
};

// OTA
async function transformRoomData(roomAndGuestList) {
  const output = {};
  let roomCounter = 0;
  let currentDate = null;
  const currentRoomKey = () => `room${roomCounter}`;

  if (roomAndGuestList.RoomInformation && roomAndGuestList.RoomRateInformation) {
    // Handle the case when the input is a single room entry
    const date = roomAndGuestList.RoomRateInformation.RoomDate;
    if (!output[currentRoomKey()]) {
      output[currentRoomKey()] = [];
    }
    const maleCount = roomAndGuestList.RoomInformation.RoomPaxMaleCount * 1 || 0;
    const femaleCount = roomAndGuestList.RoomInformation.RoomPaxFemaleCount * 1 || 0;
    const perPaxRate = roomAndGuestList.RoomRateInformation.PerPaxRate * 1 || 0;

    output[currentRoomKey()].push({
      RoomDate: date,
      RoomTypeCode: roomAndGuestList.RoomInformation.RoomTypeCode,
      RoomTypeName: roomAndGuestList.RoomInformation.RoomTypeName,
      PlanGroupCode: roomAndGuestList.RoomInformation.PlanGroupCode || '',
      PerRoomPaxCount: roomAndGuestList.RoomInformation.PerRoomPaxCount,
      RoomPaxMaleCount: roomAndGuestList.RoomInformation.RoomPaxMaleCount || 0,
      RoomPaxFemaleCount: roomAndGuestList.RoomInformation.RoomPaxFemaleCount || 0,
      RoomChildA70Count: roomAndGuestList.RoomInformation.RoomChildA70Count || 0,
      RoomChildB50Count: roomAndGuestList.RoomInformation.RoomChildB50Count || 0,
      RoomChildC30Count: roomAndGuestList.RoomInformation.RoomChildC30Count || 0,
      RoomChildDNoneCount: roomAndGuestList.RoomInformation.RoomChildDNoneCount || 0,
      TotalPerRoomRate: roomAndGuestList.RoomRateInformation.TotalPerRoomRate || ((maleCount + femaleCount) * perPaxRate),
      PerPaxRate: roomAndGuestList.RoomRateInformation.PerPaxRate || 0,
    });
  } else if (Array.isArray(roomAndGuestList)) {
    // Handle the case when input is an array of room entries
    for (const entry of roomAndGuestList) {
      const date = entry.RoomRateInformation.RoomDate;
      if (date !== currentDate) {
        roomCounter = 0;
        currentDate = date;
      } else {
        roomCounter++;
      }

      if (!output[currentRoomKey()]) {
        output[currentRoomKey()] = [];
      }

      const maleCount = entry.RoomInformation.RoomPaxMaleCount * 1 || 0;
      const femaleCount = entry.RoomInformation.RoomPaxFemaleCount * 1 || 0;
      const perPaxRate = entry.RoomRateInformation.PerPaxRate * 1 || 0;

      output[currentRoomKey()].push({
        RoomDate: date,
        RoomTypeCode: entry.RoomInformation.RoomTypeCode,
        RoomTypeName: entry.RoomInformation.RoomTypeName,
        PlanGroupCode: entry.RoomInformation.PlanGroupCode || '',
        PerRoomPaxCount: entry.RoomInformation.PerRoomPaxCount,
        RoomPaxMaleCount: entry.RoomInformation.RoomPaxMaleCount || 0,
        RoomPaxFemaleCount: entry.RoomInformation.RoomPaxFemaleCount || 0,
        RoomChildA70Count: entry.RoomInformation.RoomChildA70Count || 0,
        RoomChildB50Count: entry.RoomInformation.RoomChildB50Count || 0,
        RoomChildC30Count: entry.RoomInformation.RoomChildC30Count || 0,
        RoomChildDNoneCount: entry.RoomInformation.RoomChildDNoneCount || 0,
        TotalPerRoomRate: entry.RoomRateInformation.TotalPerRoomRate || ((maleCount + femaleCount) * perPaxRate),
        PerPaxRate: entry.RoomRateInformation.PerPaxRate || 0,
      });
    }
  } else {
    // If the input is an object but not in the expected format
    // Assume it might be an object with multiple entries
    const entries = Object.values(roomAndGuestList);
    if (entries.length > 0 && entries[0].RoomInformation) {
      // Process as if roomAndGuestList is an object containing room entries
      return await transformRoomData(entries);
    } else {
      throw new Error("Invalid data format for roomAndGuestList");
    }
  }

  /*
    for (const key in roomAndGuestList) {
      if (roomAndGuestList.hasOwnProperty(key)) {
        const entry = roomAndGuestList[key];
        const date = entry.RoomRateInformation.RoomDate;
  
        if (date !== currentDate) {  
          roomCounter = 0;      
          currentDate = date;
          if (!output[currentRoomKey()]) {
            output[currentRoomKey()] = [];
          }
          output[currentRoomKey()].push({
            RoomDate: date,
            RoomTypeCode: entry.RoomInformation.RoomTypeCode,
            RoomTypeName: entry.RoomInformation.RoomTypeName,
            PlanGroupCode: entry.RoomInformation.PlanGroupCode,
            PerRoomPaxCount: entry.RoomInformation.PerRoomPaxCount,
            RoomPaxMaleCount: entry.RoomInformation.RoomPaxMaleCount || 0,
            RoomPaxFemaleCount: entry.RoomInformation.RoomPaxFemaleCount || 0,
            RoomChildA70Count: entry.RoomInformation.RoomChildA70Count || 0,
            RoomChildB50Count: entry.RoomInformation.RoomChildB50Count || 0,
            RoomChildC30Count: entry.RoomInformation.RoomChildC30Count || 0,
            RoomChildDNoneCount: entry.RoomInformation.RoomChildDNoneCount || 0,
            RoomChildDNoneCount: entry.RoomInformation.RoomChildDNoneCount || 0,
            TotalPerRoomRate: entry.RoomRateInformation.TotalPerRoomRate,
          });
        } else {
          roomCounter++; // Move to the next room when date does not change
          if (!output[currentRoomKey()]) {
            output[currentRoomKey()] = []; // Should not be needed after the first entry for a date
          }
          output[currentRoomKey()].push({
            RoomDate: date,
            RoomTypeCode: entry.RoomInformation.RoomTypeCode,
            RoomTypeName: entry.RoomInformation.RoomTypeName,
            PlanGroupCode: entry.RoomInformation.PlanGroupCode,
            PerRoomPaxCount: entry.RoomInformation.PerRoomPaxCount,
            RoomPaxMaleCount: entry.RoomInformation.RoomPaxMaleCount || 0,
            RoomPaxFemaleCount: entry.RoomInformation.RoomPaxFemaleCount || 0,
            RoomChildA70Count: entry.RoomInformation.RoomChildA70Count || 0,
            RoomChildB50Count: entry.RoomInformation.RoomChildB50Count || 0,
            RoomChildC30Count: entry.RoomInformation.RoomChildC30Count || 0,
            RoomChildDNoneCount: entry.RoomInformation.RoomChildDNoneCount || 0,
            RoomChildDNoneCount: entry.RoomInformation.RoomChildDNoneCount || 0,
            TotalPerRoomRate: entry.RoomRateInformation.TotalPerRoomRate,
          });
        }
      }
    }
  */
  return output;
};
function translateMealCondition(MealCondition) {
  const mealConditionMap = {
    '1night2meals': '1泊2食',
    '1nightBreakfast': '1泊朝食',
    'WithoutMeal': '食事なし',
    'Other': 'その他',
  }
  return mealConditionMap[MealCondition] || '未設定';
}
function translateSpecificMealCondition(SpecificMealCondition) {
  const specificMealConditionMap = {
    'IncludingBreakfast': '朝食付き',
    'IncludingDinner': '夕食付き',
    'IncludingBreakfastAndDinner': '朝夕食付き',
    'IncludingLunch': '昼食付き',
    'IncludingBreakfastAndLunchAndDinner': '3食付き',
    'None Specified': '指定なし',
    'IncludingBreakfastAndLunch': '朝昼食付き',
    'IncludingLunchAndDinner': '昼夕食付き',
  }
  return specificMealConditionMap[SpecificMealCondition] || '未設定';
}
function translateTaxServiceFee(TaxServiceFee) {
  const taxServiceFeeMap = {
    'IncludingServiceWithOutTax': 'サ込税別',
    'IncludingServiceAndTax': 'サ込税込',
    'WithoutSerivceAndTax': 'サ別税別',
    'WithoutServiceAndIncludingTax': 'サ別税込',
  }
  return taxServiceFeeMap[TaxServiceFee] || '未設定';
}
function translateSettlementDiv(SettlementDiv) {
  const settlementDivMap = {
    0: '指定なし',
    1: '法人利用',
    2: 'カード決済ズミ',
    3: '現地払い',
    4: 'ツアー会社',
    5: '一部清算',
    6: 'エージェント清算',
  }
  return settlementDivMap[SettlementDiv] || '未設定';
}

const sanitizeName = (name) => {
  if (!name) return '';
  // Remove text in 【】, ［］, 〖〗, 〘〙, 〚〛 brackets and trim whitespace
  return name
    .replace(/[【〖〘〚]([^】〗〙〛]*)[】〗〙〛]/g, '')  // Remove various bracket types
    .replace(/\[([^\]]*)\]/g, '')  // Remove standard brackets
    .replace(/\s+/g, ' ')          // Replace multiple spaces with single space
    .trim();
};

const addOTAReservation = async (requestId, hotel_id, data, client = null) => {
  // Use passed client if provided, otherwise create a new one
  let internalClient;
  let shouldRelease = false;
  if (client) {
    internalClient = client;
  } else {
    const pool = getPool(requestId);
    internalClient = await pool.connect();
    shouldRelease = true;
  }
  // XML
  // console.log('addOTAReservation data:', data);
  const SalesOfficeInformation = data?.SalesOfficeInformation || {};
  // console.log('addOTAReservation SalesOfficeInformation:', SalesOfficeInformation);
  const BasicInformation = data?.BasicInformation || {};
  // console.log('addOTAReservation BasicInformation:', BasicInformation);
  const BasicRateInformation = data?.BasicRateInformation || {};
  // console.log('addOTAReservation BasicRateInformation:', BasicRateInformation);
  const RisaplsCommonInformation = data?.RisaplsInformation?.RisaplsCommonInformation || {};
  // console.log('addOTAReservation RisaplsCommonInformation:', RisaplsCommonInformation);
  const Basic = data?.RisaplsInformation?.RisaplsCommonInformation?.Basic || {};
  // console.log('addOTAReservation Basic:', Basic);
  const RoomAndRoomRateInformation = data?.RisaplsInformation?.RisaplsCommonInformation?.RoomAndRoomRateInformation || {};
  // console.log('addOTAReservation RoomAndRoomRateInformation:', RoomAndRoomRateInformation);
  const Member = data?.RisaplsInformation?.RisaplsCommonInformation?.Member || {};
  // console.log('addOTAReservation Member:', Member);
  const BasicRate = data?.RisaplsInformation?.RisaplsCommonInformation?.BasicRate || {};
  // console.log('addOTAReservation BasicRate:', BasicRate);
  const Extend = data?.RisaplsInformation?.AgentNativeInformation?.Extend || {};
  // console.log('addOTAReservation Extend:', Extend);
  const Extendmytrip = data?.RisaplsInformation?.AgentNativeInformation?.Extendmytrip || {};
  // console.log('addOTAReservation Extendmytrip:', Extendmytrip);
  const RoomAndGuestList = data?.RoomAndGuestInformation?.RoomAndGuestList || {};
  // console.log('addOTAReservation RoomAndGuestList:', RoomAndGuestList);

  // Query  
  let query = '';
  let values = '';

  // Fields
  const dateRange = [];
  let currentDate = new Date(BasicInformation.CheckInDate);
  while (currentDate < new Date(BasicInformation.CheckOutDate)) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let reservationComment = "";
  if (BasicInformation?.OtherServiceInformation) {
    reservationComment += `予約備考：${BasicInformation.OtherServiceInformation}；\n`;
  }
  if (BasicInformation?.MealCondition) {
    reservationComment += `食事条件：${translateMealCondition(BasicInformation.MealCondition)}；\n`;
  }
  if (BasicInformation?.SpecificMealCondition) {
    reservationComment += `食事備考：${translateSpecificMealCondition(BasicInformation.SpecificMealCondition)}；\n`;
  }
  if (BasicRateInformation?.TaxServiceFee) {
    reservationComment += `税サ区分：${translateTaxServiceFee(BasicRateInformation.TaxServiceFee)}；\n`;
  }

  // Helper
  const selectNature = (code) => {
    // For RisaplsInformation.RisaplsCommonInformation.Member.UserGendar    
    if (code == 2) {
      return 'legal';
    }
    else {
      return 'natural';
    }
  };
  const selectGender = (code) => {
    // For RisaplsInformation.RisaplsCommonInformation.Member.UserGendar    
    if (code === '0') {
      return 'male';
    }
    if (code === '1') {
      return 'female';
    }

    return 'other';
  };
  const roomMaster = await selectTLRoomMaster(requestId, hotel_id);
  // console.log('selectTLRoomMaster:', roomMaster);
  const selectRoomTypeId = (code) => {
    const match = roomMaster.find(item => item.netagtrmtypecode === code);
    return match ? match.room_type_id : null;
  };
  const planMaster = await selectTLPlanMaster(requestId, hotel_id);

  const selectPlanId = async (code) => {
    // console.log('selectTLPlanMaster:', planMaster);  
    //console.log('selectPlanId code:', code);
    const match = planMaster.find(item => item.plangroupcode == code);
    if (match) {
      return {
        plans_global_id: match.plans_global_id,
        plans_hotel_id: match.plans_hotel_id,
      };
    } else {
      return {
        plans_global_id: null,
        plans_hotel_id: null,
      };
    }
  };

  const availableRooms = await selectAvailableRooms(requestId, hotel_id, BasicInformation.CheckInDate, BasicInformation.CheckOutDate, internalClient);
  const assignedRoomIds = new Set();

  const findFirstAvailableRoomId = (room_type_id) => {
    const availableRoom = availableRooms.find(room =>
      room.room_type_id === room_type_id && !assignedRoomIds.has(room.room_id)
    );
    return availableRoom?.room_id || null;
  };

  try {
    if (shouldRelease) {
      await internalClient.query('BEGIN');
    }

    let clientGender = selectGender(Member?.UserGendar);

    if (clientGender === 'other') {
      
      const grandTotal = (parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0) + (parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0);
      const maleTotal = parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0;
      const femaleTotal = parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0;

      if (grandTotal > 0 && maleTotal > 0 && grandTotal === maleTotal) {
        clientGender = 'male';
      } else if (grandTotal > 0 && femaleTotal > 0 && grandTotal === femaleTotal) {
        clientGender = 'female';
      }
    }

    // Client info
    const clientData = {
      name: Member?.UserName?.trim() || BasicInformation?.GuestOrGroupNameKanjiName?.trim() || '',
      name_kana: Member?.UserKana?.trim() || BasicInformation?.GuestOrGroupNameSingleByte?.trim() || '',
      date_of_birth: Member?.UserDateOfBirth || null,
      legal_or_natural_person: selectNature(Member?.UserGendar || 1),
      gender: clientGender,
      email: Basic.Email || '',
      phone: Basic.PhoneNumber || '',
      created_by: 1,
      updated_by: 1,
    };

    let finalName, finalNameKana, finalNameKanji;
    const { name, nameKana, nameKanji } = await processNameString(sanitizeName(clientData.name));
    finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
    if (clientData.name_kana) {
      finalNameKana = toFullWidthKana(sanitizeName(clientData.name_kana));
    }

    // First, try to find an existing client with the same details
    query = `
      SELECT id FROM clients 
      WHERE name = $1 
        AND name_kana = $2 
        AND name_kanji IS NOT DISTINCT FROM $3 
        AND date_of_birth IS NOT DISTINCT FROM $4 
        AND legal_or_natural_person = $5 
        AND gender = $6 
        AND email = $7 
        AND phone = $8 
      LIMIT 1;
    `;

    values = [
      finalName,
      finalNameKana,
      finalNameKanji,
      clientData.date_of_birth,
      clientData.legal_or_natural_person,
      clientData.gender,
      clientData.email,
      clientData.phone
    ];

    const existingClient = await internalClient.query(query, values);
    let reservationClientId;

    if (existingClient.rows.length > 0) {
      // Use existing client
      reservationClientId = existingClient.rows[0].id;
      //console.log('Using existing client with ID:', reservationClientId);
    } else {
      // Insert new client
      query = `
        INSERT INTO clients (
          name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, created_by, updated_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
      `;

      values = [
        finalName,
        finalNameKana,
        finalNameKanji,
        clientData.date_of_birth,
        clientData.legal_or_natural_person,
        clientData.gender,
        clientData.email,
        clientData.phone,
        clientData.created_by,
        clientData.updated_by
      ];

      const newClient = await internalClient.query(query, values);
      reservationClientId = newClient.rows[0].id;
      //console.log('Created new client with ID:', reservationClientId);
      //console.log('addOTAReservation client:', newClient.rows[0]);

      // Only insert address for new clients
      if (Basic.PostalCode || Member.UserZip || Basic.Address || Member.UserAddr) {
        query = `
          INSERT INTO addresses (
            client_id, address_name, representative_name, street, state, 
            city, postal_code, country, phone, fax, 
            email, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          RETURNING *;
        `;

        values = [
          reservationClientId,
          'OTA登録',
          finalNameKanji || finalName,
          Basic.Address || Member.UserAddr || '',
          '',
          '',
          Basic.PostalCode || Member.UserZip || '',
          '',
          Basic.PhoneNumber || Member.UserTel || '',
          '',
          Basic.Email || Member.UserMailAddr || '',
          1
        ];
        const newAddress = await internalClient.query(query, values);
        //console.log('addOTAReservation addresses:', newAddress.rows[0]);
      }
    }

    let agentName = SalesOfficeInformation.SalesOfficeCompanyName;
    if (BasicInformation.TravelAgencyBookingNumber && BasicInformation.TravelAgencyBookingNumber.startsWith('TY')) {
        agentName += '（r-with)';
    }

    let reservationType = 'ota';
    if (
      BasicInformation.TravelAgencyBookingNumber && (BasicInformation.TravelAgencyBookingNumber.startsWith('TY') || agentName === 'tripla株式会社')
    ) {
      reservationType = 'web';
    }

    // Insert reservations
    query = `
      INSERT INTO reservations (
        hotel_id, reservation_client_id, check_in, check_in_time, check_out, check_out_time, number_of_people, status, type, agent, ota_reservation_id, comment, payment_timing, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'confirmed', $8, $9, $10, $11, 'prepaid', 1, 1)
      RETURNING *;
    `;

    values = [
      hotel_id,
      reservationClientId,
      BasicInformation.CheckInDate,
      BasicInformation.CheckInTime || DEFAULT_CHECK_IN_TIME,
      BasicInformation.CheckOutDate,
      BasicInformation.CheckOutTime || DEFAULT_CHECK_OUT_TIME,
      BasicInformation.GrandTotalPaxCount,
      reservationType,
      agentName,
      BasicInformation.TravelAgencyBookingNumber,
      reservationComment,
    ];
    // console.log('addOTAReservation reservations:', values);  
    // const reservation = {id: 0};    
    const reservation = await internalClient.query(query, values);
    const reservationId = reservation.rows[0].id;
    //console.log('addOTAReservation reservations:', reservation.rows[0]);

    // Get available rooms for the reservation period
    const roomsArray = await transformRoomData(RoomAndGuestList);
    const roomsArrayWithID = {};
    for (const roomKey in roomsArray) {
      const roomDetailsArray = roomsArray[roomKey];
      if (roomDetailsArray.length > 0) {
        const firstRoomInfo = roomDetailsArray[0];
        const netAgtRmTypeCode = firstRoomInfo.RoomTypeCode;
        const roomTypeId = netAgtRmTypeCode ? await selectRoomTypeId(netAgtRmTypeCode) : null;
        // Get room type name from roomMaster
        const roomTypeName = roomTypeId ? (roomMaster.find(r => r.room_type_id === roomTypeId)?.rmtypename || '') : '';
        const roomId = roomTypeId ? await findFirstAvailableRoomId(roomTypeId) : null;

        if (roomId === null) {
          const triedDates = roomDetailsArray.map(item => item.RoomDate).join(', ');
          console.error(`ERROR: No available room found for RoomTypeCode ${netAgtRmTypeCode} (room_type_id: ${roomTypeId}, room_type_name: ${roomTypeName}) for dates: [${triedDates}]`);
          throw new Error(`Transaction Error: Could not assign room_id for RoomTypeCode: ${netAgtRmTypeCode} (room_type_id: ${roomTypeId}, room_type_name: ${roomTypeName}) for dates: [${triedDates}]. Transaction will be rolled back.`);
        }

        roomsArrayWithID[roomKey] = roomDetailsArray.map(item => ({
          ...item,
          room_id: roomId,
        }));

        assignedRoomIds.add(roomId);
      }
    }
    // console.log('roomsArrayWithID', roomsArrayWithID);
    let roomRateArray = [];

    if (Array.isArray(RoomAndRoomRateInformation)) {
      // Case 1: Proper array of objects or single object with numeric keys
      if (
        RoomAndRoomRateInformation.length === 1 &&
        typeof RoomAndRoomRateInformation[0] === 'object' &&
        RoomAndRoomRateInformation[0] !== null &&
        Object.keys(RoomAndRoomRateInformation[0])[0] === '0'
      ) {
        // Unwrap object with numeric keys into an array
        roomRateArray = Object.values(RoomAndRoomRateInformation[0]);
      } else {
        // Already a proper array
        roomRateArray = RoomAndRoomRateInformation;
      }
    } else if (
      typeof RoomAndRoomRateInformation === 'object' &&
      RoomAndRoomRateInformation !== null
    ) {
      // Case 2: Single object or object with numeric keys
      const keys = Object.keys(RoomAndRoomRateInformation);
      if (keys.every(key => /^\d+$/.test(key))) {
        // All keys are numeric -> convert to array
        roomRateArray = Object.values(RoomAndRoomRateInformation);
      } else {
        // Just a single RoomAndRoomRateInformation object
        roomRateArray = [RoomAndRoomRateInformation];
      }
    }

    //console.log('roomRateArray:', roomRateArray);

    for (const roomKey in roomsArrayWithID) {
      const roomDetailsArray = roomsArrayWithID[roomKey];
      for (const roomDetail of roomDetailsArray) {

        let plans_global_id = null;
        let plans_hotel_id = null;
        let reservationGuestId = null;
        let guestData = {};
        let insertedClients = [];

        for (const info of roomRateArray) {
          const planGroupCode = info?.RoomInformation?.PlanGroupCode;
          const roomDate = info?.RoomRateInformation?.RoomDate;

          if (roomDate === roomDetail.RoomDate) {
            const { plans_global_id: plan_gid, plans_hotel_id: plan_hid } = await selectPlanId(planGroupCode);
            plans_global_id = plan_gid;
            plans_hotel_id = plan_hid;
          }

          // Process guest information if available in RoomAndRoomRateInformation
          const guestInformation = info?.GuestInformation;
          const guestList = guestInformation?.GuestInformationList;

          if (guestList && Array.isArray(guestList) && guestList.length > 0) {
            //console.log('Processing guest information from GuestInformationList');
            for (const guest of guestList) {
              const rawName = guest?.GuestKanjiName?.trim() || guest?.GuestNameSingleByte?.trim() || BasicInformation?.GuestOrGroupNameKanjiName?.trim() || '';
              const sanitizedName = sanitizeName(rawName);
              const { name, nameKana, nameKanji } = await processNameString(sanitizedName);
              let guestGender = selectGender(guest?.GuestGender || '2');

              if (guestGender === 'other') {
                const grandTotal = parseInt(BasicInformation.GrandTotalPaxCount, 10) || 0;
                const maleTotal = parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0;
                const femaleTotal = parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0;

                if (grandTotal > 0 && maleTotal > 0 && grandTotal === maleTotal) {
                  guestGender = 'male';
                } else if (grandTotal > 0 && femaleTotal > 0 && grandTotal === femaleTotal) {
                  guestGender = 'female';
                }
              }

              guestData = {
                name: name,
                name_kana: nameKana,
                name_kanji: nameKanji,
                date_of_birth: guest?.GuestDateOfBirth || null,
                legal_or_natural_person: selectNature(guest?.GuestGender || 1),
                gender: guestGender,
                email: Basic.Email || '',
                phone: Basic.PhoneNumber || '',
                created_by: 1,
                updated_by: 1,
              };

              finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
              if (guestData.name_kana) {
                finalNameKana = toFullWidthKana(sanitizeName(guestData.name_kana));
              }

              // First, try to find an existing client with the same details
              query = `
                SELECT id FROM clients 
                WHERE name = $1 
                  AND name_kana = $2 
                  AND name_kanji IS NOT DISTINCT FROM $3 
                  AND date_of_birth IS NOT DISTINCT FROM $4 
                  AND legal_or_natural_person = $5 
                  AND gender = $6 
                  AND email = $7 
                  AND phone = $8 
                LIMIT 1;
              `;

              values = [
                finalName,
                finalNameKana,
                finalNameKanji,
                guestData.date_of_birth,
                guestData.legal_or_natural_person,
                guestData.gender,
                guestData.email,
                guestData.phone
              ];

              const existingClient = await internalClient.query(query, values);
              if (existingClient.rows.length > 0) {
                insertedClients.push(existingClient.rows[0]);
              } else {
                // Insert new client
                query = `
                  INSERT INTO clients (
                    name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, created_by, updated_by
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                  RETURNING *;
                `;

                values = [
                  finalName,
                  finalNameKana,
                  finalNameKanji,
                  guestData.date_of_birth,
                  guestData.legal_or_natural_person,
                  guestData.gender,
                  guestData.email,
                  guestData.phone,
                  guestData.created_by,
                  guestData.updated_by
                ];

                const newClient = await internalClient.query(query, values);
                insertedClients.push(newClient.rows[0]);
              }
            }
          }
        }

        const totalPeopleCount = (parseInt(roomDetail.RoomPaxMaleCount, 10) || 0) + (parseInt(roomDetail.RoomPaxFemaleCount, 10) || 0) + (parseInt(roomDetail.RoomChildA70Count, 10) || 0) + (parseInt(roomDetail.RoomChildB50Count, 10) || 0) + (parseInt(roomDetail.RoomChildC30Count, 10) || 0) + (parseInt(roomDetail.RoomChildDNoneCount, 10) || 0);

        const addons = await getAllPlanAddons(requestId, plans_global_id, plans_hotel_id, hotel_id);
        if (addons && Array.isArray(addons)) {
          addons.forEach(addon => {
            // addon.quantity = BasicRateInformation?.RoomRateOrPersonalRate === 'PersonalRate' ? BasicInformation.GrandTotalPaxCount : 1;
            // addon.quantity = BasicInformation.GrandTotalPaxCount || 1;
            addon.quantity = totalPeopleCount || 1;
          });
        }

        query = `
          INSERT INTO reservation_details (
              hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, number_of_people, price, billable, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 1, 1)
            RETURNING *;
        `;
        values = [
          hotel_id,
          reservationId,
          roomDetail.RoomDate,
          roomDetail.room_id,
          plans_global_id,
          plans_hotel_id,
          BasicInformation.PackagePlanName,
          totalPeopleCount,
          roomDetail.TotalPerRoomRate,
        ];
        const reservationDetails = await internalClient.query(query, values);
        const reservationDetailsId = reservationDetails.rows[0].id;

        if (reservationDetails.rows.length === 0) {
          console.error("Error: Failed to create reservation detail.");
          throw new Error("Transaction Error: Failed to create reservation detail.");
        }
        //console.log('addOTAReservation reservation_details:', reservationDetails.rows[0]);
        
        if (!insertedClients || insertedClients.length === 0) {
          // if insertedClients array is empty, add just one entry of client id in reservation_clients
          if (Member?.UserName?.trim()) {
            let guestGender = selectGender('2');

            if (guestGender === 'other') {
              const grandTotal = parseInt(BasicInformation.GrandTotalPaxCount, 10) || 0;
              const maleTotal = parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0;
              const femaleTotal = parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0;

              if (grandTotal > 0 && maleTotal > 0 && grandTotal === maleTotal) {
                guestGender = 'male';
              } else if (grandTotal > 0 && femaleTotal > 0 && grandTotal === femaleTotal) {
                guestGender = 'female';
              }
            }

            const guestData = {
              name: BasicInformation?.GuestOrGroupNameKanjiName?.trim() || '',
              name_kana: BasicInformation?.GuestOrGroupNameSingleByte?.trim() || '',
              date_of_birth: null,
              legal_or_natural_person: selectNature(1),
              gender: guestGender,
              email: Basic.Email || '',
              phone: Basic.PhoneNumber || '',
              created_by: 1,
              updated_by: 1,
            };
            const sanitizedName = sanitizeName(guestData.name);
            const { name, nameKana, nameKanji } = await processNameString(sanitizedName);
            finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
            if (guestData.name_kana) {
              finalNameKana = toFullWidthKana(sanitizeName(guestData.name_kana));
            }

            // First, try to find an existing client with the same details
            query = `
              SELECT id FROM clients 
              WHERE name = $1 
                AND name_kana = $2 
                AND name_kanji IS NOT DISTINCT FROM $3 
                AND date_of_birth IS NOT DISTINCT FROM $4 
                AND legal_or_natural_person = $5 
                AND gender = $6 
                AND email = $7 
                AND phone = $8 
              LIMIT 1;
            `;

            values = [
              finalName,
              finalNameKana,
              finalNameKanji,
              guestData.date_of_birth,
              guestData.legal_or_natural_person,
              guestData.gender,
              guestData.email,
              guestData.phone
            ];

            const existingClient = await internalClient.query(query, values);
            if (existingClient.rows.length > 0) {
              reservationGuestId = existingClient.rows[0].id;
            } else {
              // Insert new client
              query = `
              INSERT INTO clients (
                name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, created_by, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *;
              `;

              values = [
                finalName,
                finalNameKana,
                finalNameKanji,
                guestData.date_of_birth,
                guestData.legal_or_natural_person,
                guestData.gender,
                guestData.email,
                guestData.phone,
                guestData.created_by,
                guestData.updated_by
              ];

              const newClient = await internalClient.query(query, values);
              reservationGuestId = newClient.rows[0].id;
            }
          } else {
            reservationGuestId = reservationClientId;
          }

          // Add booker's client ID to reservation_clients for testing
          try {
            if (reservationGuestId) {
              const result = await internalClient.query(`
                        INSERT INTO reservation_clients (
                            hotel_id, reservation_details_id, client_id, created_by, updated_by
                        ) VALUES ($1, $2, $3, 1, 1)
                        RETURNING *;
                    `, [hotel_id, reservationDetailsId, reservationGuestId]);
              //console.log('Added booker to reservation_clients:', result.rows[0] || 'No rows inserted (possible conflict)');
            } else {
              //console.log('No reservationGuestId available to add to reservation_clients');
            }
          } catch (error) {
            console.error('Error adding booker to reservation_clients:', error);
          }

        } else {
          // Add each client from insertedClients to reservation_clients
          for (const client of insertedClients) {
            try {
              const result = await internalClient.query(`
                INSERT INTO reservation_clients (
                  hotel_id, reservation_details_id, client_id, created_by, updated_by
                ) VALUES ($1, $2, $3, 1, 1)
                RETURNING *;
              `, [hotel_id, reservationDetailsId, client.id]);
              //console.log('Added guest to reservation_clients:', result.rows[0]);
            } catch (error) {
              console.error('Error adding guest to reservation_clients:', error);
              throw error; // Re-throw to trigger transaction rollback
            }
          }
        }

        const rateData = {
          hotel_id,
          reservation_details_id: reservationDetailsId,
          adjustment_type: 'base_rate',
          adjustment_value: roomDetail.TotalPerRoomRate,
          tax_type_id: 3,
          tax_rate: 0.1,
          price: roomDetail.TotalPerRoomRate,
          include_in_cancel_fee: true,
          created_by: 1
        };
        const reservationRates = await insertReservationRate(requestId, rateData, internalClient);
        if (addons && Array.isArray(addons) && addons.length > 0) {
          for (const addon of addons) {
            query = `
              INSERT INTO reservation_addons (
                hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, quantity, price, tax_type_id, tax_rate, created_by, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING *;
            `;
            values = [
              hotel_id,
              reservationDetailsId,
              addon.addons_global_id,
              addon.addons_hotel_id,
              addon.addon_name,
              addon.quantity,
              addon.price,
              addon.tax_type_id || 3,
              addon.tax_rate || 0.1,
              1,
              1
            ];

            const reservationAddon = await internalClient.query(query, values);
            //console.log('addOTAReservation reservation_addon:', reservationAddon.rows[0])
          }
        }
      }
    }

    try {
      const firstRoomKey = Object.keys(roomsArrayWithID)[0];
      if (firstRoomKey) {
          const firstRoomDetails = roomsArrayWithID[firstRoomKey];
          const firstRoomId = firstRoomDetails[0].room_id;

          const detailsQuery = `
              SELECT id, date FROM reservation_details
              WHERE reservation_id = $1 AND hotel_id = $2 AND room_id = $3
          `;
          const detailsResult = await internalClient.query(detailsQuery, [reservationId, hotel_id, firstRoomId]);
          const detailsForRoom = detailsResult.rows;

          if (detailsForRoom.length > 0) {
              const checkIn = BasicInformation.CheckInDate;
              const checkOut = BasicInformation.CheckOutDate;

              const availableSpot = await selectAndLockAvailableParkingSpot(
                  requestId,
                  hotel_id,
                  checkIn,
                  checkOut,
                  100, // capacity_units_required
                  internalClient
              );

              if (availableSpot) {
                  const parkingSpotId = availableSpot.parking_spot_id;

                  const parkingInsertPromises = detailsForRoom.map(async detail => {
                      const addonQuery = `
                          INSERT INTO reservation_addons 
                              (hotel_id, reservation_detail_id, addons_global_id, addon_type, addon_name, price, quantity, tax_type_id, tax_rate, created_by, updated_by)
                          VALUES ($1, $2, 3, 'parking', '駐車場', 0, 1, 3, 0.1, 1, 1)
                          RETURNING id;
                      `;
                      const addonValues = [hotel_id, detail.id];
                      const addonResult = await internalClient.query(addonQuery, addonValues);
                      const reservationAddonId = addonResult.rows[0].id;

                      const parkingQuery = `
                          INSERT INTO reservation_parking (
                              hotel_id,
                              reservation_details_id,
                              reservation_addon_id,
                              vehicle_category_id,
                              parking_spot_id,
                              date,
                              status,
                              created_by,
                              updated_by
                          ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed', 1, 1)
                      `;
                      const parkingValues = [
                          hotel_id,
                          detail.id,
                          reservationAddonId,
                          1, // vehicle_category_id
                          parkingSpotId,
                          detail.date
                      ];
                      return internalClient.query(parkingQuery, parkingValues);
                  });
                  await Promise.all(parkingInsertPromises);
              }
          }
      }
    } catch (parkingError) {
        logger.error('Failed to assign parking spot during OTA reservation creation. This error is non-critical and the reservation will be created without parking.', {
            requestId,
            hotel_id,
            otaReservationId: BasicInformation.TravelAgencyBookingNumber,
            error: parkingError.message,
            stack: parkingError.stack
        });
    }

    // Payment    
    query = `
      INSERT INTO reservation_payments (
        hotel_id, reservation_id, date, room_id, client_id, payment_type_id, value, comment, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *;
    `;

    // Helper function to calculate total rate for each room
    const calculateRoomRates = () => {
      const roomRates = {};
      for (const roomKey in roomsArrayWithID) {
        let totalForRoom = 0;
        roomsArrayWithID[roomKey].forEach(dayItem => {
          totalForRoom += parseFloat(dayItem.TotalPerRoomRate || 0);
        });
        roomRates[roomKey] = {
          total: totalForRoom,
          roomId: roomsArrayWithID[roomKey][0].room_id
        };
      }
      return roomRates;
    };
    const roomRates = calculateRoomRates();
    const totalRoomRates = Object.values(roomRates).reduce((sum, room) => sum + room.total, 0);
    const sortedRoomKeys = Object.keys(roomRates).sort((a, b) => {
      return parseInt(a.replace('room', '')) - parseInt(b.replace('room', ''));
    });

    // Point discount
    if (BasicRate.PointsDiscountList) {
      let remainingDiscount = parseFloat(BasicRate?.PointsDiscountList?.PointsDiscount);
      const discountName = BasicRate?.PointsDiscountList?.PointsDiscountName || 'ポイント割引';

      // Apply discount to each room until fully distributed
      for (const roomKey of sortedRoomKeys) {
        if (remainingDiscount <= 0) break;

        const roomRate = roomRates[roomKey].total;
        const roomId = roomRates[roomKey].roomId;

        // Calculate how much discount to apply to this room
        const discountForThisRoom = Math.min(roomRate, remainingDiscount);

        if (discountForThisRoom > 0) {
          const values = [
            hotel_id,
            reservation.rows[0].id,
            BasicInformation.TravelAgencyBookingDate,
            roomId,
            reservationClientId,
            2, // Payment type for discount
            discountForThisRoom,
            discountName,
            1
          ];

          const reservationPayments = await internalClient.query(query, values);
          //console.log('addOTAReservation reservation_payments:', reservationPayments.rows[0]);

          // Reduce remaining discount
          remainingDiscount -= discountForThisRoom;
        }
      }

      // Log if there's any unused discount
      if (remainingDiscount > 0) {
        console.warn(`Warning: ${remainingDiscount} discount amount couldn't be applied to any rooms`);
      }
    }
    // Outstanding balance    
    if (Extend?.AmountClaimed !== undefined) {
      const amountClaimed = parseFloat(Extend.AmountClaimed);
      const pointsAmount = parseFloat(Extend.Points) || 0;
      if (amountClaimed === 0 || (amountClaimed > 0 && amountClaimed !== totalRoomRates)) {
        let paymentAmount;
        if (amountClaimed === 0) {
          paymentAmount = totalRoomRates - pointsAmount;
        } else {
          paymentAmount = totalRoomRates - amountClaimed - pointsAmount;
        }

        if (paymentAmount > 0) {
          let remainingPayment = paymentAmount;
          for (const roomKey of sortedRoomKeys) {
            if (remainingPayment <= 0) break;

            const roomRate = roomRates[roomKey].total;
            const roomId = roomRates[roomKey].roomId;

            // Calculate how much payment to apply to this room
            const paymentForThisRoom = Math.min(roomRate, remainingPayment);

            if (paymentForThisRoom > 0) {
              const values = [
                hotel_id,
                reservation.rows[0].id,
                BasicInformation.TravelAgencyBookingDate,
                roomId,
                reservationClientId,
                4, // Credit card
                paymentForThisRoom,
                translateSettlementDiv(Extendmytrip?.SettlementDiv),
                1
              ];

              const reservationPayments = await internalClient.query(query, values);
              //console.log('addOTAReservation reservation_payments:', reservationPayments.rows[0]);

              // Reduce remaining payment
              remainingPayment -= paymentForThisRoom;
            }
          }
        }
      }
    }

    if (shouldRelease) {
      await internalClient.query('COMMIT');
    }
    return { success: true };
  } catch (err) {
    console.error("Transaction failed, error message:", err.message);
    console.error("Full error object:", err);
    try {
      //console.log("Attempting to roll back transaction...");
      if (shouldRelease) {
        await internalClient.query('ROLLBACK');
        //console.log("Transaction successfully rolled back");
      }
    } catch (rollbackErr) {
      console.error("Failed to roll back transaction:", rollbackErr);
    }
    return { success: false, error: err.message };
  } finally {
    if (shouldRelease) {
      internalClient.release();
    }
  }
};

const editOTAReservation = async (requestId, hotel_id, data, client = null) => {
  // Use passed client if provided, otherwise create a new one
  let internalClient;
  let shouldRelease = false;
  if (client) {
    internalClient = client;
  } else {
    const pool = getPool(requestId);
    internalClient = await pool.connect();
    shouldRelease = true;
  }
  // XML
  // console.log('editOTAReservation data:', data);
  const SalesOfficeInformation = data?.SalesOfficeInformation || {};
  // console.log('editOTAReservation SalesOfficeInformation:', SalesOfficeInformation);
  const BasicInformation = data?.BasicInformation || {};
  // console.log('editOTAReservation BasicInformation:', BasicInformation);
  const BasicRateInformation = data?.BasicRateInformation || {};
  // console.log('editOTAReservation BasicRateInformation:', BasicRateInformation);
  const RisaplsCommonInformation = data?.RisaplsInformation?.RisaplsCommonInformation || {};
  // console.log('editOTAReservation RisaplsCommonInformation:', RisaplsCommonInformation);
  const Basic = data?.RisaplsInformation?.RisaplsCommonInformation?.Basic || {};
  // console.log('editOTAReservation Basic:', Basic);
  const RoomAndRoomRateInformation = data?.RisaplsInformation?.RisaplsCommonInformation?.RoomAndRoomRateInformation || {};
  // console.log('addOTAReservation RoomAndRoomRateInformation:', RoomAndRoomRateInformation);
  const Member = data?.RisaplsInformation?.RisaplsCommonInformation?.Member || {};
  // console.log('editOTAReservation Member:', Member);
  const BasicRate = data?.RisaplsInformation?.RisaplsCommonInformation?.BasicRate || {};
  // console.log('editOTAReservation BasicRate:', BasicRate);
  const Extend = data?.RisaplsInformation?.AgentNativeInformation?.Extend || {};
  // console.log('addOTAReservation Extend:', Extend);
  const Extendmytrip = data?.RisaplsInformation?.AgentNativeInformation?.Extendmytrip || {};
  // console.log('addOTAReservation Extendmytrip:', Extendmytrip);
  const RoomAndGuestList = data?.RoomAndGuestInformation?.RoomAndGuestList || {};
  // console.log('editOTAReservation RoomAndGuestList:', RoomAndGuestList);

  const otaReservationId = BasicInformation?.TravelAgencyBookingNumber;

  // Query  
  let query = '';
  let values = '';

  // Fields
  const dateRange = [];
  let currentDate = new Date(BasicInformation.CheckInDate);
  while (currentDate < new Date(BasicInformation.CheckOutDate)) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  let reservationComment = "";
  if (BasicInformation?.OtherServiceInformation) {
    reservationComment += `予約備考：${BasicInformation.OtherServiceInformation}；\n`;
  }
  if (BasicInformation?.MealCondition) {
    reservationComment += `食事条件：${translateMealCondition(BasicInformation.MealCondition)}；\n`;
  }
  if (BasicInformation?.SpecificMealCondition) {
    reservationComment += `食事備考：${translateSpecificMealCondition(BasicInformation.SpecificMealCondition)}；\n`;
  }
  if (BasicRateInformation?.TaxServiceFee) {
    reservationComment += `税サ区分：${translateTaxServiceFee(BasicRateInformation.TaxServiceFee)}；\n`;
  }

  // Helper
  const selectNature = (code) => {
    // For RisaplsInformation.RisaplsCommonInformation.Member.UserGendar    
    if (code == 2) {
      return 'legal';
    } else {
      return 'natural';
    }
  };
  const selectGender = (code) => {
    // For RisaplsInformation.RisaplsCommonInformation.Member.UserGendar    
    if (code === '0') {
      return 'male';
    }
    if (code === '1') {
      return 'female';
    }

    return 'other';
  };
  const roomMaster = await selectTLRoomMaster(requestId, hotel_id);
  // console.log('selectTLRoomMaster:', roomMaster);
  const selectRoomTypeId = (code) => {
    const match = roomMaster.find(item => item.netagtrmtypecode === code);
    return match ? match.room_type_id : null;
  };
  const planMaster = await selectTLPlanMaster(requestId, hotel_id);

  const selectPlanId = async (code) => {
    const match = planMaster.find(item => item.plangroupcode == code);
    if (match) {
      return {
        plans_global_id: match.plans_global_id,
        plans_hotel_id: match.plans_hotel_id,
      };
    } else {
      return {
        plans_global_id: null,
        plans_hotel_id: null,
      };
    }
  };

  try {
    if (shouldRelease) {
      await internalClient.query('BEGIN');
    }

    // Fetch the existing reservation_id
    query = `
        SELECT *
        FROM reservations
        WHERE ota_reservation_id = $1 AND hotel_id = $2;
    `;
    values = [otaReservationId, hotel_id];
    const existingReservationResult = await internalClient.query(query, values);

    if (existingReservationResult.rows.length === 0) {
      if (shouldRelease) {
        await internalClient.query('ROLLBACK');
      }
      return { success: false, error: `Reservation with OTA ID ${otaReservationId} not found.` };
    }

    const reservationIdToUpdate = existingReservationResult.rows[0].id;
    const clientIdToUpdate = existingReservationResult.rows[0].reservation_client_id;

    // --- Delete existing reservation details and payments ---    
    await internalClient.query(`DELETE FROM reservation_details WHERE reservation_id = $1 AND hotel_id = $2`, [reservationIdToUpdate, hotel_id]);
    await internalClient.query(`DELETE FROM reservation_payments WHERE reservation_id = $1 AND hotel_id = $2`, [reservationIdToUpdate, hotel_id]);

    const availableRooms = await selectAvailableRooms(requestId, hotel_id, BasicInformation.CheckInDate, BasicInformation.CheckOutDate, internalClient);
    const assignedRoomIds = new Set();

    const findFirstAvailableRoomId = (room_type_id) => {
      const availableRoom = availableRooms.find(room =>
        room.room_type_id === room_type_id && !assignedRoomIds.has(room.room_id)
      );

      return availableRoom?.room_id || null;
    };

    let clientGender = selectGender(Member?.UserGendar);

    if (clientGender === 'other') {

      const grandTotal = (parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0) + (parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0);
      const maleTotal = parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0;
      const femaleTotal = parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0;

      if (grandTotal > 0 && maleTotal > 0 && grandTotal === maleTotal) {
        clientGender = 'male';
      } else if (grandTotal > 0 && femaleTotal > 0 && grandTotal === femaleTotal) {
        clientGender = 'female';
      }
    }

    // Client info
    const clientData = {
      name: Member?.UserName?.trim() || BasicInformation?.GuestOrGroupNameKanjiName?.trim() || '',
      name_kana: Member?.UserKana?.trim() || BasicInformation?.GuestOrGroupNameSingleByte?.trim() || '',
      date_of_birth: Member?.UserDateOfBirth || null,
      legal_or_natural_person: selectNature(Member?.UserGendar || 1),
      gender: clientGender,
      email: Basic.Email || '',
      phone: Basic.PhoneNumber || '',
      created_by: 1,
      updated_by: 1,
    };

    let finalName, finalNameKana, finalNameKanji;
    const sanitizedName = sanitizeName(clientData.name);
    const { name, nameKana, nameKanji } = await processNameString(sanitizedName);
    finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
    if (clientData.name_kana) {
      finalNameKana = toFullWidthKana(sanitizeName(clientData.name_kana));
    }

    query = `
      UPDATE clients SET
        name = $1
        ,name_kana = $2
        ,name_kanji = $3
        ,date_of_birth = $4
        ,legal_or_natural_person = $5
        ,gender = $6
        ,email = $7
        ,phone = $8   
        ,updated_by = $9
      WHERE id = $10
      RETURNING *;
    `;
    values = [
      finalName,
      finalNameKana,
      finalNameKanji,
      clientData.date_of_birth,
      clientData.legal_or_natural_person,
      clientData.gender,
      clientData.email,
      clientData.phone,
      clientData.updated_by,
      clientIdToUpdate,
    ];
    const newClient = await internalClient.query(query, values);
    //console.log('editOTAReservation client:', newClient.rows[0]);

    // Insert address
    if (Basic.PostalCode || Member.UserZip || Basic.Address || Member.UserAddr) {
      query = `
        WITH existing AS (
          SELECT id FROM addresses WHERE client_id = $1 LIMIT 1
        ),
        updated AS (
          UPDATE addresses SET
            address_name = $2,
            representative_name = $3,
            street = $4,
            state = $5,
            city = $6,
            postal_code = $7,
            country = $8,
            phone = $9,
            fax = $10,
            email = $11,
            updated_by = $12
          WHERE id = (SELECT id FROM existing)
          RETURNING *
        ),
        inserted AS (
          INSERT INTO addresses (
              client_id, address_name, representative_name, street,
              state, city, postal_code, country, phone, fax, email,
              created_by, updated_by
          )
          SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $12
          WHERE NOT EXISTS (SELECT 1 FROM existing)
          RETURNING *
        )
        SELECT * FROM updated
        UNION ALL
        SELECT * FROM inserted;
      `;

      values = [
        clientIdToUpdate,
        'OTA登録',
        finalNameKanji || finalName,
        Basic.Address || Member.UserAddr || '',
        '',
        '',
        Basic.PostalCode || Member.UserZip || '',
        '',
        Basic.PhoneNumber || Member.UserTel || '',
        '',
        Basic.Email || Member.UserMailAddr || '',
        1
      ];
      const newAddress = await internalClient.query(query, values);
      //console.log('editOTAReservation addresses:', newAddress.rows[0]);
    }

    // Insert reservations
    query = `
      UPDATE reservations SET 
        check_in = $1
        ,check_in_time = $2
        ,check_out = $3
        ,check_out_time = $4
        ,number_of_people = $5
        ,status = 'confirmed'              
        ,comment = $6
        ,payment_timing = 'prepaid'
        ,updated_by = 1
      WHERE id = $7 AND hotel_id = $8
      RETURNING *;
    `;
    values = [
      BasicInformation.CheckInDate,
      BasicInformation.CheckInTime || DEFAULT_CHECK_IN_TIME,
      BasicInformation.CheckOutDate,
      BasicInformation.CheckOutTime || DEFAULT_CHECK_OUT_TIME,
      BasicInformation.GrandTotalPaxCount,
      reservationComment,
      reservationIdToUpdate,
      hotel_id,
    ];
    // console.log('editOTAReservation reservations:', values);  
    // const reservation = {id: 0};    
    const reservation = await internalClient.query(query, values);
    //console.log('editOTAReservation reservations:', reservation.rows[0]);

    // Get available rooms for the reservation period

    const roomsArray = await transformRoomData(RoomAndGuestList);
    const roomsArrayWithID = {};
    for (const roomKey in roomsArray) {
      const roomDetailsArray = roomsArray[roomKey];
      if (roomDetailsArray.length > 0) {
        const firstRoomInfo = roomDetailsArray[0];
        const netAgtRmTypeCode = firstRoomInfo.RoomTypeCode;
        const roomTypeId = netAgtRmTypeCode ? await selectRoomTypeId(netAgtRmTypeCode) : null;
        // Get room type name from roomMaster
        const roomTypeName = roomTypeId ? (roomMaster.find(r => r.room_type_id === roomTypeId)?.rmtypename || '') : '';
        const roomId = roomTypeId ? await findFirstAvailableRoomId(roomTypeId) : null;

        if (roomId === null) {
          throw new Error(`Transaction Error: Could not assign room_id for RoomTypeCode: ${netAgtRmTypeCode}. Transaction will be rolled back.`);
        }

        roomsArrayWithID[roomKey] = roomDetailsArray.map(item => ({
          ...item,
          room_id: roomId,
        }));

        assignedRoomIds.add(roomId);

      }
    }
    // console.log('roomsArrayWithID', roomsArrayWithID);
    let roomRateArray = [];

    if (Array.isArray(RoomAndRoomRateInformation)) {
      // Case 1: Proper array of objects or single object with numeric keys
      if (
        RoomAndRoomRateInformation.length === 1 &&
        typeof RoomAndRoomRateInformation[0] === 'object' &&
        RoomAndRoomRateInformation[0] !== null &&
        Object.keys(RoomAndRoomRateInformation[0])[0] === '0'
      ) {
        // Unwrap object with numeric keys into an array
        roomRateArray = Object.values(RoomAndRoomRateInformation[0]);
      } else {
        // Already a proper array
        roomRateArray = RoomAndRoomRateInformation;
      }
    } else if (
      typeof RoomAndRoomRateInformation === 'object' &&
      RoomAndRoomRateInformation !== null
    ) {
      // Case 2: Single object or object with numeric keys
      const keys = Object.keys(RoomAndRoomRateInformation);
      if (keys.every(key => /^\d+$/.test(key))) {
        // All keys are numeric -> convert to array
        roomRateArray = Object.values(RoomAndRoomRateInformation);
      } else {
        // Just a single RoomAndRoomRateInformation object
        roomRateArray = [RoomAndRoomRateInformation];
      }
    }

    //console.log('roomRateArray:', roomRateArray);


    for (const roomKey in roomsArrayWithID) {
      const roomDetailsArray = roomsArrayWithID[roomKey];
      for (const roomDetail of roomDetailsArray) {

        let plans_global_id = null;
        let plans_hotel_id = null;
        let reservationGuestId = null;
        let guestData = {};
        let insertedClients = [];

        for (const info of roomRateArray) {
          const planGroupCode = info?.RoomInformation?.PlanGroupCode;
          const roomDate = info?.RoomRateInformation?.RoomDate;

          if (roomDate === roomDetail.RoomDate) {
            const { plans_global_id: plan_gid, plans_hotel_id: plan_hid } = await selectPlanId(planGroupCode);
            plans_global_id = plan_gid;
            plans_hotel_id = plan_hid;
          }

          // Process guest information if available in RoomAndRoomRateInformation
          const guestInformation = info?.GuestInformation;
          const guestList = guestInformation?.GuestInformationList;

          if (guestList && Array.isArray(guestList) && guestList.length > 0) {
            //console.log('Processing guest information from GuestInformationList');
            for (const guest of guestList) {
              const rawName = guest?.GuestKanjiName?.trim() || guest?.GuestNameSingleByte?.trim() || BasicInformation?.GuestOrGroupNameKanjiName?.trim() || '';
              const sanitizedName = sanitizeName(rawName);
              const { name, nameKana, nameKanji } = await processNameString(sanitizedName);

              let guestGender = selectGender(guest?.GuestGender || '2');

              if (guestGender === 'other') {
                const grandTotal = parseInt(BasicInformation.GrandTotalPaxCount, 10) || 0;
                const maleTotal = parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0;
                const femaleTotal = parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0;

                if (grandTotal > 0 && maleTotal > 0 && grandTotal === maleTotal) {
                  guestGender = 'male';
                } else if (grandTotal > 0 && femaleTotal > 0 && grandTotal === femaleTotal) {
                  guestGender = 'female';
                }
              }

              guestData = {
                name: name,
                name_kana: nameKana,
                name_kanji: nameKanji,
                date_of_birth: guest?.GuestDateOfBirth || null,
                legal_or_natural_person: selectNature(guest?.GuestGender || 1),
                gender: guestGender,
                email: Basic.Email || '',
                phone: Basic.PhoneNumber || '',
                created_by: 1,
                updated_by: 1,
              };

              finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
              if (guestData.name_kana) {
                finalNameKana = toFullWidthKana(sanitizeName(guestData.name_kana));
              }

              // First, try to find an existing client with the same details
              query = `
                SELECT id FROM clients 
                WHERE name = $1 
                  AND name_kana = $2 
                  AND name_kanji IS NOT DISTINCT FROM $3 
                  AND date_of_birth IS NOT DISTINCT FROM $4 
                  AND legal_or_natural_person = $5 
                  AND gender = $6 
                  AND email = $7 
                  AND phone = $8 
                LIMIT 1;
              `;

              values = [
                finalName,
                finalNameKana,
                finalNameKanji,
                guestData.date_of_birth,
                guestData.legal_or_natural_person,
                guestData.gender,
                guestData.email,
                guestData.phone
              ];

              const existingClient = await internalClient.query(query, values);
              if (existingClient.rows.length > 0) {
                insertedClients.push(existingClient.rows[0]);
              } else {
                // Insert new client
                query = `
                  INSERT INTO clients (
                    name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, created_by, updated_by
                  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                  RETURNING *;
                `;

                values = [
                  finalName,
                  finalNameKana,
                  finalNameKanji,
                  guestData.date_of_birth,
                  guestData.legal_or_natural_person,
                  guestData.gender,
                  guestData.email,
                  guestData.phone,
                  guestData.created_by,
                  guestData.updated_by
                ];

                const newClient = await internalClient.query(query, values);
                insertedClients.push(newClient.rows[0]);
              }
            }
          }
        }

        const totalPeopleCount = (parseInt(roomDetail.RoomPaxMaleCount, 10) || 0) + (parseInt(roomDetail.RoomPaxFemaleCount, 10) || 0) + (parseInt(roomDetail.RoomChildA70Count, 10) || 0) + (parseInt(roomDetail.RoomChildB50Count, 10) || 0) + (parseInt(roomDetail.RoomChildC30Count, 10) || 0) + (parseInt(roomDetail.RoomChildDNoneCount, 10) || 0);

        const addons = await getAllPlanAddons(requestId, plans_global_id, plans_hotel_id, hotel_id);
        if (addons && Array.isArray(addons)) {
          addons.forEach(addon => {
            // addon.quantity = BasicRateInformation?.RoomRateOrPersonalRate === 'PersonalRate' ? BasicInformation.GrandTotalPaxCount : 1;
            addon.quantity = totalPeopleCount || 1;
          });
        }

        query = `
          INSERT INTO reservation_details (
              hotel_id, reservation_id, date, room_id, plans_global_id, plans_hotel_id, plan_name, number_of_people, price, billable, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, 1, 1)
            RETURNING *;
        `;
        values = [
          hotel_id,
          reservationIdToUpdate,
          roomDetail.RoomDate,
          roomDetail.room_id,
          plans_global_id,
          plans_hotel_id,
          BasicInformation.PackagePlanName,
          totalPeopleCount,
          roomDetail.TotalPerRoomRate,
        ];
        const reservationDetails = await internalClient.query(query, values);
        const reservationDetailsId = reservationDetails.rows[0].id;

        if (reservationDetails.rows.length === 0) {
          console.error("Error: Failed to create reservation detail.");
          throw new Error("Transaction Error: Failed to create reservation detail.");
        }
        //console.log('editOTAReservation reservation_details:', reservationDetails.rows[0]);

        if (!insertedClients || insertedClients.length === 0) {
          // if insertedClients array is empty, add just one entry of client id in reservation_clients
          if (Member?.UserName?.trim()) {
            let guestGender = selectGender('2');

            if (guestGender === 'other') {
              const grandTotal = parseInt(BasicInformation.GrandTotalPaxCount, 10) || 0;
              const maleTotal = parseInt(BasicInformation.TotalPaxMaleCount, 10) || 0;
              const femaleTotal = parseInt(BasicInformation.TotalPaxFemaleCount, 10) || 0;

              if (grandTotal > 0 && maleTotal > 0 && grandTotal === maleTotal) {
                guestGender = 'male';
              } else if (grandTotal > 0 && femaleTotal > 0 && grandTotal === femaleTotal) {
                guestGender = 'female';
              }
            }

            const guestData = {
              name: BasicInformation?.GuestOrGroupNameKanjiName?.trim() || '',
              name_kana: BasicInformation?.GuestOrGroupNameSingleByte?.trim() || '',
              date_of_birth: null,
              legal_or_natural_person: selectNature(1),
              gender: guestGender,
              email: Basic.Email || '',
              phone: Basic.PhoneNumber || '',
              created_by: 1,
              updated_by: 1,
            };

            const sanitizedName = sanitizeName(guestData.name);
            const { name, nameKana, nameKanji } = await processNameString(sanitizedName);
            finalName = name; finalNameKana = nameKana; finalNameKanji = nameKanji;
            if (guestData.name_kana) {
              finalNameKana = toFullWidthKana(sanitizeName(guestData.name_kana));
            }

            // First, try to find an existing client with the same details
            query = `
              SELECT id FROM clients 
              WHERE name = $1 
                AND name_kana = $2 
                AND name_kanji IS NOT DISTINCT FROM $3 
                AND date_of_birth IS NOT DISTINCT FROM $4 
                AND legal_or_natural_person = $5 
                AND gender = $6 
                AND email = $7 
                AND phone = $8 
              LIMIT 1;
            `;

            values = [
              finalName,
              finalNameKana,
              finalNameKanji,
              guestData.date_of_birth,
              guestData.legal_or_natural_person,
              guestData.gender,
              guestData.email,
              guestData.phone
            ];

            const existingClient = await internalClient.query(query, values);
            if (existingClient.rows.length > 0) {
              reservationGuestId = existingClient.rows[0].id;
            } else {
              // Insert new client
              query = `
              INSERT INTO clients (
                name, name_kana, name_kanji, date_of_birth, legal_or_natural_person, gender, email, phone, created_by, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *;
              `;

              values = [
                finalName,
                finalNameKana,
                finalNameKanji,
                guestData.date_of_birth,
                guestData.legal_or_natural_person,
                guestData.gender,
                guestData.email,
                guestData.phone,
                guestData.created_by,
                guestData.updated_by
              ];

              const newClient = await internalClient.query(query, values);
              reservationGuestId = newClient.rows[0].id;
            }
          } else {
            reservationGuestId = reservationClientId;
          }

          // Add booker's client ID to reservation_clients for testing
          try {
            if (reservationGuestId) {
              const result = await internalClient.query(`
                        INSERT INTO reservation_clients (
                            hotel_id, reservation_details_id, client_id, created_by, updated_by
                        ) VALUES ($1, $2, $3, 1, 1)
                        RETURNING *;
                    `, [hotel_id, reservationDetailsId, reservationGuestId]);
              //console.log('Added booker to reservation_clients:', result.rows[0] || 'No rows inserted (possible conflict)');
            } else {
              //console.log('No reservationGuestId available to add to reservation_clients');
            }
          } catch (error) {
            console.error('Error adding booker to reservation_clients:', error);
          }

        } else {
          // Add each client from insertedClients to reservation_clients
          for (const client of insertedClients) {
            try {
              const result = await internalClient.query(`
                INSERT INTO reservation_clients (
                  hotel_id, reservation_details_id, client_id, created_by, updated_by
                ) VALUES ($1, $2, $3, 1, 1)
                RETURNING *;
              `, [hotel_id, reservationDetailsId, client.id]);
              //console.log('Added guest to reservation_clients:', result.rows[0]);
            } catch (error) {
              console.error('Error adding guest to reservation_clients:', error);
              throw error; // Re-throw to trigger transaction rollback
            }
          }
        }

                const rateData = {
          hotel_id,
          reservation_details_id: reservationDetailsId,
          adjustment_type: 'base_rate',
          adjustment_value: roomDetail.TotalPerRoomRate,
          tax_type_id: 3,
          tax_rate: 0.1,
          price: roomDetail.TotalPerRoomRate,
          include_in_cancel_fee: true,
          created_by: 1
        };
        await insertReservationRate(requestId, rateData, internalClient);
        //console.log('editOTAReservation reservation_rates:', reservationRates.rows[0]);

        // Insert addon information if addons exist
        if (addons && Array.isArray(addons) && addons.length > 0) {
          for (const addon of addons) {
            query = `
              INSERT INTO reservation_addons (
                hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id, addon_name, quantity, price, tax_type_id, tax_rate, created_by, updated_by
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
              RETURNING *;
            `;
            values = [
              hotel_id,
              reservationDetailsId,
              addon.addons_global_id,
              addon.addons_hotel_id,
              addon.addon_name,
              addon.quantity,
              addon.price,
              addon.tax_type_id || 3,
              addon.tax_rate || 0.1,
              1,
              1
            ];

            const reservationAddon = await internalClient.query(query, values);
            //console.log('addOTAReservation reservation_addon:', reservationAddon.rows[0])
          }
        }
      }
    }

    // Payment    
    query = `
      INSERT INTO reservation_payments (
        hotel_id, reservation_id, date, room_id, client_id, payment_type_id, value, comment, created_by, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
      RETURNING *;
    `;

    // Helper function to calculate total rate for each room
    const calculateRoomRates = () => {
      const roomRates = {};
      for (const roomKey in roomsArrayWithID) {
        let totalForRoom = 0;
        roomsArrayWithID[roomKey].forEach(dayItem => {
          totalForRoom += parseFloat(dayItem.TotalPerRoomRate || 0);
        });
        roomRates[roomKey] = {
          total: totalForRoom,
          roomId: roomsArrayWithID[roomKey][0].room_id
        };
      }
      return roomRates;
    };
    const roomRates = calculateRoomRates();
    const totalRoomRates = Object.values(roomRates).reduce((sum, room) => sum + room.total, 0);
    const sortedRoomKeys = Object.keys(roomRates).sort((a, b) => {
      return parseInt(a.replace('room', '')) - parseInt(b.replace('room', ''));
    });

    // Point discount
    if (BasicRate.PointsDiscountList) {
      let remainingDiscount = parseFloat(BasicRate?.PointsDiscountList?.PointsDiscount);
      const discountName = BasicRate?.PointsDiscountList?.PointsDiscountName || 'ポイント割引';

      // Apply discount to each room until fully distributed
      for (const roomKey of sortedRoomKeys) {
        if (remainingDiscount <= 0) break;

        const roomRate = roomRates[roomKey].total;
        const roomId = roomRates[roomKey].roomId;

        // Calculate how much discount to apply to this room
        const discountForThisRoom = Math.min(roomRate, remainingDiscount);

        if (discountForThisRoom > 0) {
          const values = [
            hotel_id,
            reservationIdToUpdate,
            BasicInformation.TravelAgencyBookingDate,
            roomId,
            clientIdToUpdate,
            2, // Payment type for discount
            discountForThisRoom,
            discountName,
            1
          ];

          const reservationPayments = await internalClient.query(query, values);
          //console.log('addOTAReservation reservation_payments:', reservationPayments.rows[0]);

          // Reduce remaining discount
          remainingDiscount -= discountForThisRoom;
        }
      }

      // Log if there's any unused discount
      if (remainingDiscount > 0) {
        console.warn(`Warning: ${remainingDiscount} discount amount couldn't be applied to any rooms`);
      }
    }
    // Outstanding balance    
    if (Extend?.AmountClaimed !== undefined) {
      const amountClaimed = parseFloat(Extend.AmountClaimed);
      const pointsAmount = parseFloat(Extend.Points) || 0;
      if (amountClaimed === 0 || (amountClaimed > 0 && amountClaimed !== totalRoomRates)) {
        let paymentAmount;
        if (amountClaimed === 0) {
          paymentAmount = totalRoomRates - pointsAmount;
        } else {
          paymentAmount = totalRoomRates - amountClaimed - pointsAmount;
        }

        if (paymentAmount > 0) {
          let remainingPayment = paymentAmount;
          for (const roomKey of sortedRoomKeys) {
            if (remainingPayment <= 0) break;

            const roomRate = roomRates[roomKey].total;
            const roomId = roomRates[roomKey].roomId;

            // Calculate how much payment to apply to this room
            const paymentForThisRoom = Math.min(roomRate, remainingPayment);

            if (paymentForThisRoom > 0) {
              const values = [
                hotel_id,
                reservationIdToUpdate,
                BasicInformation.TravelAgencyBookingDate,
                roomId,
                clientIdToUpdate,
                4, // Credit card
                paymentForThisRoom,
                translateSettlementDiv(Extendmytrip?.SettlementDiv),
                1
              ];

              const reservationPayments = await internalClient.query(query, values);
              //console.log('addOTAReservation reservation_payments:', reservationPayments.rows[0]);

              // Reduce remaining payment
              remainingPayment -= paymentForThisRoom;
            }
          }
        }
      }
    }

    if (shouldRelease) {
      await internalClient.query('COMMIT');
    }
    return { success: true };
  } catch (err) {
    try {
      if (shouldRelease) {
        await internalClient.query('ROLLBACK');
        // Detailed debug log for rollback
        const otaReservationId = data?.BasicInformation?.TravelAgencyBookingNumber;
        const hotelId = hotel_id;
        const reservationId = (typeof existingReservationResult !== 'undefined' && existingReservationResult.rows && existingReservationResult.rows[0]) ? existingReservationResult.rows[0].id : null;
        console.error(
          `[editOTAReservation] Transaction rolled back for reservationId: ${reservationId}, OTA booking number: ${otaReservationId}, hotelId: ${hotelId}`
        );
      }
    } catch (rollbackErr) {
      console.error("[editOTAReservation] Failed to roll back transaction:", rollbackErr);
    }
    return { success: false, error: err.message };
  } finally {
    if (shouldRelease) {
      internalClient.release();
    }
  }
};

const cancelOTAReservation = async (requestId, hotel_id, data, client = null) => {
  let internalClient;
  let shouldRelease = false;
  if (client) {
    internalClient = client;
  } else {
    const pool = getPool(requestId);
    internalClient = await pool.connect();
    shouldRelease = true;
  }
  // XML
  const BasicInformation = data?.BasicInformation || {};
  const otaReservationId = BasicInformation?.TravelAgencyBookingNumber;
  const Extendmytrip = data?.RisaplsInformation?.AgentNativeInformation?.Extendmytrip || {};
  const cancellationCharge = parseInt(Extendmytrip?.CancellationCharge || '0', 10);

  // Query  
  let query = '';
  let values = '';

  try {
    if (shouldRelease) {
      await internalClient.query('BEGIN');
    }

    // Fetch the existing reservation_id
    query = `
        SELECT id
        FROM reservations
        WHERE ota_reservation_id = $1 AND hotel_id = $2;
    `;
    values = [otaReservationId, hotel_id];
    const existingReservationResult = await internalClient.query(query, values);

    if (existingReservationResult.rows.length === 0) {
      if (shouldRelease) {
        await internalClient.query('ROLLBACK');
      }
      return { success: false, error: `Reservation with OTA ID ${otaReservationId} not found.` };
    }

    const reservationIdToUpdate = existingReservationResult.rows[0].id;

    // Insert reservations
    query = `
      UPDATE reservations SET         
        status = 'cancelled'
        ,updated_by = 1        
      WHERE id = $1 AND hotel_id = $2
      RETURNING *;
    `;
    values = [
      reservationIdToUpdate,
      hotel_id,
    ];
    const reservation = await internalClient.query(query, values);
    //console.log('cancelOTAReservation reservations:', reservation.rows[0]);

    query = `
        UPDATE reservation_details
        SET
          cancelled = gen_random_uuid()
          ,billable = FALSE
          ,updated_by = 1          
        WHERE reservation_id = $1::UUID AND hotel_id = $2
        RETURNING *;
    `;
    values = [
      reservationIdToUpdate,
      hotel_id,
    ];
    const reservationDetails = await internalClient.query(query, values);
    //console.log('cancelOTAReservation reservation_details:', reservationDetails.rows[0]);

    if (cancellationCharge > 0) {
      query = `
        SELECT id
        FROM reservation_details
        WHERE reservation_id = $1::UUID AND hotel_id = $2
        ORDER BY date DESC
        LIMIT 1;
      `;
      values = [reservationIdToUpdate, hotel_id];
      const latestReservationDetailResult = await internalClient.query(query, values);

      if (latestReservationDetailResult.rows.length > 0) {
        const latestReservationDetailId = latestReservationDetailResult.rows[0].id;

        query = `
          UPDATE reservation_details
          SET
            cancelled = NULL,
            billable = TRUE,            
            price = $3,
            updated_by = 1
          WHERE id = $1 AND hotel_id = $2
          RETURNING *;
        `;
        values = [
          latestReservationDetailId,
          hotel_id,
          cancellationCharge,
        ];
        const firstReservationDetail = await internalClient.query(query, values);
        //console.log('cancelOTAReservation reservation_details:', firstReservationDetail.rows[0]);

        query = `
          UPDATE reservation_rates
          SET
            adjustment_value = $3,
            tax_type_id = 3,
            tax_rate = 0.1,
            price = $3,
            updated_by = 1
          WHERE reservation_details_id = $1 AND hotel_id = $2
          RETURNING *;
        `;
        values = [
          latestReservationDetailId,
          hotel_id,
          cancellationCharge,
        ];
        const reservationRates = await internalClient.query(query, values);
        //console.log('cancelOTAReservation reservation_rates:', reservationRates.rows[0]);
      } else {
        console.warn('No reservation details found to update reservation_rates.');
      }
    }

    if (shouldRelease) {
      await internalClient.query('COMMIT');
    }
    return { success: true };
  } catch (err) {
    console.error("Transaction failed, error message:", err.message);
    console.error("Full error object:", err);
    try {
      //console.log("Attempting to roll back transaction...");
      if (shouldRelease) {
        await internalClient.query('ROLLBACK');
      }
      console.log("[cancelOTAReservation] Transaction successfully rolled back");
    } catch (rollbackErr) {
      console.error("Failed to roll back transaction:", rollbackErr);
    }
    return { success: false, error: err.message };
  } finally {
    if (shouldRelease) {
      internalClient.release();
    }
  }
};

const insertCopyReservation = async (requestId, originalReservationId, newClientId, roomMapping, userId, hotelId, deps = {}) => {
  logger.warn('[copyReservation] Logger is working');
  const pool = getPool(requestId);
  const client = await pool.connect();

  // Dependency injection for testability
  const _selectReservation = deps.selectReservation || selectReservation;
  const _addReservationHold = deps.addReservationHold || addReservationHold;
  const _addReservationDetail = deps.addReservationDetail || addReservationDetail;
  const _addReservationAddon = deps.addReservationAddon || addReservationAddon;

  // Validate input parameters
  if (!originalReservationId) {
    logger.error('[copyReservation] Invalid originalReservationId:', originalReservationId);
    throw new Error('Original reservation ID cannot be null or undefined');
  }
  if (!newClientId) {
    logger.error('[copyReservation] Invalid newClientId:', newClientId);
    throw new Error('New client ID cannot be null or undefined');
  }
  if (!roomMapping || !Array.isArray(roomMapping) || roomMapping.length === 0) {
    logger.error('[copyReservation] Invalid roomMapping:', roomMapping);
    throw new Error('Room mapping must be a non-empty array');
  }
  if (!userId) {
    logger.error('[copyReservation] Invalid userId:', userId);
    throw new Error('User ID cannot be null or undefined');
  }

  try {
    await client.query('BEGIN');

    const originalReservation = await _selectReservation(requestId, originalReservationId, hotelId);
    logger.debug('[copyReservation] originalReservation', { originalReservation });
    if (originalReservation.length === 0) {
      throw new Error('Original reservation not found');
    }

    logger.error('[copyReservation] originalReservation[0].hotel_id', originalReservation[0].hotel_id);

    const { hotel_id, check_in, check_out, number_of_people } = originalReservation[0];

    const reservationData = {
      hotel_id,
      reservation_client_id: newClientId,
      check_in,
      check_out,
      number_of_people,
      created_by: userId,
      updated_by: userId,
      ota_reservation_id: null, // Always null for copied reservations
    };

    const newReservation = await _addReservationHold(requestId, reservationData);
    logger.debug('[copyReservation] newReservation:', newReservation);
    logger.debug('[copyReservation] newReservation.id:', newReservation?.id);

    const dateRange = [];
    let currentDate = new Date(check_in);
    while (currentDate < new Date(check_out)) {
      dateRange.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Group original reservation details by room_id to copy plans and addons
    const originalDetailsByRoom = {};
    originalReservation.forEach(detail => {
      if (!originalDetailsByRoom[detail.room_id]) {
        originalDetailsByRoom[detail.room_id] = [];
      }
      originalDetailsByRoom[detail.room_id].push(detail);
    });
    logger.debug('[copyReservation] originalDetailsByRoom:', JSON.stringify(originalDetailsByRoom, null, 2));

    for (const mapping of roomMapping) {
      const { new_room_id, original_room_id } = mapping;
      // Get the original room details for this mapping
      const originalRoomDetails = originalDetailsByRoom[original_room_id] || [];
      logger.debug('[copyReservation] Processing mapping:', { new_room_id, original_room_id, originalRoomDetailsCount: originalRoomDetails.length });
      for (const date of dateRange) {
        // Find the original detail for this date to copy plan and addon info
        const originalDetail = originalRoomDetails.find(d => {
          // d.date may be a Date object or a string; always compare as YYYY-MM-DD
          const dDate = typeof d.date === 'string' ? d.date.slice(0, 10) : formatDate(new Date(d.date));
          return dDate === formatDate(date);
        });
        logger.debug('[copyReservation] originalDetail:', originalDetail);
        logger.debug('[copyReservation] originalDetail.reservation_addons:', originalDetail?.reservation_addons);
        // Defensive: ensure hotel_id is never null
        if (!hotel_id) {
          logger.error('[copyReservation] hotel_id is null or undefined when creating reservation detail', { mapping, originalDetail });
          throw new Error('Cannot create reservation detail: hotel_id is null or undefined');
        }
        const detail = {
          reservation_id: newReservation.id,
          hotel_id,
          room_id: new_room_id,
          date: formatDate(date),
          plans_global_id: originalDetail?.plans_global_id || null,
          plans_hotel_id: originalDetail?.plans_hotel_id || null,
          plan_name: originalDetail?.plan_name || null,
          plan_type: originalDetail?.plan_type || 'per_room',
          number_of_people: originalDetail?.number_of_people || 1,
          price: originalDetail?.price || 0,
          created_by: userId,
          updated_by: userId,
        };
        logger.error('[copyReservation] About to insert reservation detail', { detail, hotel_id, mapping, originalDetail });
        const newDetail = await _addReservationDetail(requestId, detail);

        // Copy reservation rates if they exist
        if (originalDetail?.reservation_rates && originalDetail.reservation_rates.length > 0) {
          for (const rate of originalDetail.reservation_rates) {
            const rateData = {
              hotel_id,
              reservation_details_id: newDetail.id,
              adjustment_type: rate.adjustment_type,
              adjustment_value: rate.adjustment_value,
              tax_type_id: rate.tax_type_id,
              tax_rate: rate.tax_rate,
              price: rate.price,
              include_in_cancel_fee: rate.adjustment_type,
              created_by: userId,
            };
            logger.debug('[copyReservation] Creating new rate:', rateData);
            await insertReservationRate(requestId, rateData, client);
          }
        } else {
          logger.debug('[copyReservation] No rates to copy for this detail.');
        }

        // Copy addons if they exist
        if (originalDetail?.reservation_addons && originalDetail.reservation_addons.length > 0) {
          for (const addon of originalDetail.reservation_addons) {
            const addonData = {
              hotel_id,
              reservation_detail_id: newDetail.id,
              addons_global_id: addon.addons_global_id,
              addons_hotel_id: addon.addons_hotel_id,
              addon_name: addon.addon_name,
              quantity: addon.quantity,
              price: addon.price,
              tax_type_id: addon.tax_type_id,
              tax_rate: addon.tax_rate,
              created_by: userId,
              updated_by: userId,
            };
            logger.debug('[copyReservation] Creating new addon:', addonData);
            await _addReservationAddon(requestId, addonData);
          }
        } else {
          logger.debug('[copyReservation] No addons to copy for this detail.');
        }
      }
    }

    logger.debug('[copyReservation] Returning newReservation:', newReservation);
    await client.query('COMMIT');
    return newReservation;
  } catch (error) {
    logger.error('[copyReservation] Error:', error);
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const selectFailedOtaReservations = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
      f.id,
      f.ota_reservation_id,
      f.reservation_data->'TransactionType'->>'SystemDate' AS date_received,
      f.reservation_data->'TransactionType'->>'DataClassification' AS transaction_type,
      f.reservation_data->'BasicInformation'->>'CheckInDate' AS check_in_date,
      f.reservation_data->'BasicInformation'->>'CheckOutDate' AS check_out_date,
      f.created_at,
      h.id AS hotel_id,
      h.name AS hotel_name
    FROM 
      ota_reservation_queue f
      JOIN hotels h ON f.hotel_id = h.id
    WHERE      
      f.status = 'failed'
    ORDER BY 
      f.created_at;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error fetching failed OTA reservations:', err);
    throw new Error('Database error');
  }
};

// Shared utility function for consistent price calculation
const calculatePriceFromRates = (rates, disableRounding = false) => {
  logger.debug(`[calculatePriceFromRates] Input rates: ${JSON.stringify(rates)}`);
  logger.debug(`[calculatePriceFromRates] disableRounding: ${disableRounding}`);
  if (!rates || rates.length === 0) {
    logger.debug('[calculatePriceFromRates] No rates provided, returning 0.');
    return 0;
  }

  // Step 1: Aggregate rates by adjustment_type and tax_type_id
  const aggregatedRates = {};
  rates.forEach((rate) => {
    const key = `${rate.adjustment_type}-${rate.tax_type_id}`;
    if (!aggregatedRates[key]) {
      aggregatedRates[key] = {
        adjustment_type: rate.adjustment_type,
        tax_type_id: rate.tax_type_id,
        tax_rate: rate.tax_rate,
        adjustment_value: 0,
      };
    }
    aggregatedRates[key].adjustment_value += parseFloat(rate.adjustment_value || 0);
  });
  logger.debug(`[calculatePriceFromRates] Aggregated rates: ${JSON.stringify(aggregatedRates)}`);

  // Step 2: Calculate total base rate first
  let totalBaseRate = 0;
  Object.values(aggregatedRates).forEach((rate) => {
    if (rate.adjustment_type === 'base_rate') {
      totalBaseRate += rate.adjustment_value;
    }
  });
  logger.debug(`[calculatePriceFromRates] Total base rate: ${totalBaseRate}`);

  // Step 3: Calculate total price by summing individual rate prices (matching original logic)
  let totalPrice = 0;

  Object.values(aggregatedRates).forEach((rate) => {
    let ratePrice = 0;

    if (rate.adjustment_type === 'base_rate') {
      ratePrice = rate.adjustment_value;
    } else if (rate.adjustment_type === 'percentage') {
      ratePrice = Math.round((totalBaseRate * (rate.adjustment_value / 100)) * 100) / 100;
    } else if (rate.adjustment_type === 'flat_fee') {
      ratePrice = rate.adjustment_value;
    }

    totalPrice += ratePrice;
  });
  logger.debug(`[calculatePriceFromRates] Total price before rounding: ${totalPrice}`);

  // Round down to nearest 100 yen (Japanese pricing convention)
  if (!disableRounding) {
    const finalPrice = Math.floor(totalPrice / 100) * 100;
    logger.debug(`[calculatePriceFromRates] Final price after rounding: ${finalPrice}`);
    return finalPrice;
  } else {
    logger.debug(`[calculatePriceFromRates] Final price (no rounding): ${totalPrice}`);
    return totalPrice;
  }
};

// Shared utility function for inserting rates with consistent price calculation


const cancelReservationRooms = async (requestId, hotelId, reservationId, detailIds, updated_by, billable = false) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(format(`SET SESSION "my_app.user_id" = %L;`, updated_by));

    const cancelledDetails = [];

    for (const detailId of detailIds) {
      let calculatedPrice;

      // Get the current rates for this reservation detail
      const ratesQuery = `
        SELECT * FROM reservation_rates 
        WHERE reservation_details_id = $1 AND hotel_id = $2
      `;
      const ratesResult = await client.query(ratesQuery, [detailId, hotelId]);

      if (billable) {
        // When cancelling with a fee, only include rates that are flagged to be included.
        const ratesToUse = ratesResult.rows.filter(rate => rate.include_in_cancel_fee);
        calculatedPrice = calculatePriceFromRates(ratesToUse);
      } else {
        // When cancelling without a fee, the price should be 0
        calculatedPrice = 0;
      }

      // Mark the reservation detail as cancelled and update the price
      const cancelDetailQuery = `
        UPDATE reservation_details 
        SET 
          cancelled = gen_random_uuid(),
          billable = $1,
          updated_by = $2,
          price = $3
        WHERE id = $4::uuid
          AND reservation_id = $5::uuid
          AND hotel_id = $6
          AND cancelled IS NULL
        RETURNING id, number_of_people;
      `;
      const cancelResult = await client.query(cancelDetailQuery, [
        billable,
        updated_by,
        calculatedPrice,
        detailId,
        reservationId,
        hotelId
      ]);

      if (cancelResult.rowCount > 0) {
        cancelledDetails.push(cancelResult.rows[0]);
      }
    }

    if (cancelledDetails.length === 0) {
      await client.query('ROLLBACK');
      return { success: false, message: 'No valid details to cancel' };
    }

    // Check if all details are now cancelled
    const { rows: [statusCheck] } = await client.query(
      `SELECT 
         COUNT(*) FILTER (WHERE cancelled IS NULL) as active_count
       FROM reservation_details 
       WHERE reservation_id = $1`,
      [reservationId]
    );

    if (parseInt(statusCheck.active_count, 10) === 0) {
      await client.query(
        `UPDATE reservations 
         SET status = 'cancelled'             
         WHERE id = $1 AND hotel_id = $2`,
        [reservationId, hotelId]
      );
    } else {
      const { rows: [reservationStats] } = await client.query(
        `WITH daily_sums AS (
            SELECT
              date,
              SUM(number_of_people) as total_people_on_date
            FROM reservation_details
            WHERE reservation_id = $1 AND cancelled IS NULL
            GROUP BY date
          )
          SELECT
            MIN(date) as new_check_in,
            MAX(date) + INTERVAL '1 day' as new_check_out,
            MAX(total_people_on_date) as new_number_of_people
          FROM daily_sums`,
        [reservationId]
      );
      if (reservationStats.new_check_in && reservationStats.new_check_out) {
        await client.query(
          `UPDATE reservations
            SET 
              check_in = $1, 
              check_out = $2,
              number_of_people = $3
            WHERE id = $4 AND hotel_id = $5`,
          [
            reservationStats.new_check_in,
            reservationStats.new_check_out,
            reservationStats.new_number_of_people,
            reservationId,
            hotelId
          ]
        );
      }
    }

    await client.query('COMMIT');
    return {
      success: true,
      cancelledDetails: cancelledDetails,
      reservationCancelled: parseInt(statusCheck.active_count, 10) === 0
    };

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error in cancelReservationRooms: ${error.message}`, error);
    throw new Error(`Failed to cancel reservation rooms: ${error.message}`);
  } finally {
    client.release();
  }
};


const __setGetPool = (newGetPool) => { getPool = newGetPool; };
const __getOriginalGetPool = () => require('../../config/database').getPool;

module.exports = {
  __setGetPool,
  __getOriginalGetPool,
  selectAvailableRooms,
  selectAvailableParkingSpots,
  selectAndLockAvailableParkingSpot,  
  selectReservation,  
  selectMyHoldReservations,
  selectReservationsToday,
  selectAvailableDatesForChange,  
  getHotelIdByReservationId,
  selectParkingSpotAvailability,
  addReservationHold,
  addReservationDetail,
  addReservationDetailsBatch,
  addReservationAddon,
  addReservationClient,
  addRoomToReservation,    
  updateReservationDetail,
  updateReservationStatus,
  updateReservationDetailStatus,
  updateReservationComment,
  updateReservationCommentFlag,
  updateReservationTime,
  updateRoomByCalendar,
  updateCalendarFreeChange,
  updateReservationRoomGuestNumber,
  updateReservationGuest,
  updateClientInReservation,
  updateReservationDetailPlan,
  updateReservationDetailAddon,
  updateReservationDetailRoom,
  updateReservationRoom,
  updateReservationRoomWithCreate,
  updateReservationRoomPlan,
  updateReservationRoomPattern,
  updateBlockToReservation,
  addOTAReservation,
  editOTAReservation,
  cancelOTAReservation,
  insertCopyReservation,
  sanitizeName,
  selectFailedOtaReservations,    
  calculatePriceFromRates,
  cancelReservationRooms,  
};