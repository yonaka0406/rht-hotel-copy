const pool = require('../config/database');

// GET
const selectCountReservation = async (hotelId, dateStart, dateEnd) => {
  const query = `
    SELECT 
      reservation_details.date
      ,roomTotal.total_rooms
      ,COUNT(reservation_details.room_id) as room_count
      ,SUM(reservation_details.number_of_people) AS people_sum
      ,SUM(CASE 
        WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' 
        THEN reservation_details.price 
        ELSE reservation_details.price * reservation_details.number_of_people
      END + COALESCE(ra.total_price, 0)) AS price
    FROM
      reservations
      ,reservation_details
        LEFT JOIN 
      plans_hotel 
        ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
        LEFT JOIN 
      plans_global 
        ON plans_global.id = reservation_details.plans_global_id
        LEFT JOIN 
      (
        SELECT
          ra.reservation_detail_id
          ,SUM(ra.price * ra.quantity) AS total_price
        FROM reservation_addons ra
        GROUP BY ra.reservation_detail_id
      ) ra 
        ON reservation_details.id = ra.reservation_detail_id
      ,(
        SELECT hotel_id, COUNT(*) as total_rooms
        FROM rooms
        WHERE for_sale = true AND hotel_id = $1
        GROUP BY hotel_id
      ) AS roomTotal
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status <> 'hold'
      AND reservation_details.hotel_id = roomTotal.hotel_id
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
    GROUP BY
      reservation_details.date
      ,roomTotal.total_rooms
    ORDER BY 1;
  `;
  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectCountReservationDetailsPlans = async (hotelId, dateStart, dateEnd) => {
  const query = `
    SELECT 
      reservation_details.date
      ,COALESCE(reservation_details.plans_global_id::TEXT, '') || 'h' || COALESCE(reservation_details.plans_hotel_id::TEXT, '') AS key
      ,COALESCE(plans_hotel.name, plans_global.name,'未設定') AS name
      ,COALESCE(plans_hotel.plan_type, plans_global.plan_type) AS plan_type
      ,SUM(CASE WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' THEN 1
        ELSE reservation_details.number_of_people END) AS quantity
    FROM
      reservations
      ,reservation_details
        LEFT JOIN
      plans_global
        ON reservation_details.plans_global_id = plans_global.id
      LEFT JOIN
      plans_hotel
        ON reservation_details.hotel_id = plans_hotel.hotel_id AND reservation_details.plans_hotel_id = plans_hotel.id
      
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status <> 'hold'
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
    GROUP BY
      reservation_details.date
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,plans_hotel.name, plans_global.name
      ,plans_hotel.plan_type, plans_global.plan_type
    ORDER BY 1, 2  
  `;
  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectCountReservationDetailsAddons = async (hotelId, dateStart, dateEnd) => {
  const query = `
    SELECT 
      reservation_details.date
      ,COALESCE(reservation_addons.addons_global_id::TEXT, '') || 'h' || COALESCE(reservation_addons.addons_hotel_id::TEXT, '') AS key
      ,COALESCE(addons_hotel.name, addons_global.name) AS name
      ,SUM(reservation_addons.quantity) AS quantity
      
    FROM  
      reservations
      ,reservation_details
      ,reservation_addons
        LEFT JOIN
      addons_global
        ON reservation_addons.addons_global_id = addons_global.id
      LEFT JOIN
      addons_hotel
        ON reservation_addons.hotel_id = addons_hotel.hotel_id AND reservation_addons.addons_hotel_id = addons_hotel.id
      
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status <> 'hold'
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
      AND reservation_details.hotel_id = reservation_addons.hotel_id
      AND reservation_details.id = reservation_addons.reservation_detail_id
    GROUP BY
      reservation_details.date
      ,reservation_addons.addons_global_id
      ,reservation_addons.addons_hotel_id
      ,addons_hotel.name, addons_global.name  
      
    ORDER BY 1, 2
  `;
  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectOccupationByPeriod = async (period, hotelId, refDate) => {
  const date = new Date(refDate);

  if (period === 'month_0') {
    date.setDate(1); // First day of current month
  } else if (period === 'month_1') {
    date.setMonth(date.getMonth() + 1, 1); // First day of next month
  } else if (period === 'month_2') {
    date.setMonth(date.getMonth() + 2, 1); // First day of the month after next
  } else {
    throw new Error("Invalid period. Use 'month_0', 'month_1', or 'month_2'.");
  }

  const formattedDate = date.toISOString().split('T')[0];

  const query = `
    WITH roomTotal AS (
      SELECT 
        hotel_id,
        EXTRACT(DAY FROM (DATE_TRUNC('month', $1::DATE) + INTERVAL '1 month' - INTERVAL '1 day')) AS last_day,
        COUNT(*) as total_rooms
      FROM rooms
      WHERE for_sale = true AND hotel_id = $2
      GROUP BY hotel_id
    )
    SELECT
      COUNT(reservation_details.room_id) as room_count,
      (roomTotal.total_rooms * roomTotal.last_day) as available_rooms
    FROM 
      reservations
      ,reservation_details
      JOIN roomTotal ON reservation_details.hotel_id = roomTotal.hotel_id
    WHERE
      reservation_details.hotel_id = $2
      AND DATE_TRUNC('month', reservation_details.date) = DATE_TRUNC('month', $1::DATE)
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status <> 'hold'
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
    GROUP BY roomTotal.total_rooms, roomTotal.last_day;
  `;

  const values = [formattedDate, hotelId];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

const selectReservationListView = async (hotelId, dateStart, dateEnd) => {
  const query = `
    SELECT
      reservations.id
      ,reservations.status
      ,reservations.reservation_client_id AS booker_id
      ,COALESCE(booker.name_kanji, booker.name, booker.name_kana) AS booker_name
      ,booker.name_kana AS booker_name_kana
      ,booker.name_kanji AS booker_name_kanji
      ,reservations.check_in
      ,reservations.check_out
      ,reservations.check_out - reservations.check_in AS number_of_nights
      ,reservations.number_of_people
      ,details.plan_price
      ,details.addon_price
      ,(details.plan_price + details.addon_price) AS price
      ,details.payment
      ,details.clients_json
    FROM
      reservations	
      ,clients AS booker
      ,(
        SELECT 
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,rc.clients_json::TEXT
          ,COALESCE(rp.payment,0) as payment
          ,SUM(CASE WHEN COALESCE(plans_hotel.plan_type, plans_global.plan_type) = 'per_room' THEN reservation_details.price
            ELSE reservation_details.price * reservation_details.number_of_people END
          ) AS plan_price
          ,SUM(COALESCE(reservation_addons.quantity,0) * COALESCE(reservation_addons.price,0)) AS addon_price
        FROM
          reservation_details
            LEFT JOIN
          plans_global
            ON reservation_details.plans_global_id = plans_global.id
            LEFT JOIN
          plans_hotel
            ON reservation_details.hotel_id = plans_hotel.hotel_id AND reservation_details.plans_hotel_id = plans_hotel.id
            LEFT JOIN
          reservation_addons
            ON reservation_details.hotel_id = reservation_addons.hotel_id AND reservation_details.id = reservation_addons.reservation_detail_id
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
              (SELECT DISTINCT reservation_id, client_id FROM reservation_clients rc JOIN reservation_details rd ON rc.reservation_details_id = rd.id) rc
              JOIN clients c ON rc.client_id = c.id
            GROUP BY rc.reservation_id
          ) rc ON rc.reservation_id = reservation_details.reservation_id
           LEFT JOIN
          (
            SELECT
              reservation_id
              ,SUM(value) as payment
            FROM reservation_payments
            GROUP BY reservation_id
          ) rp ON rp.reservation_id = reservation_details.reservation_id
        WHERE
          reservation_details.hotel_id = $1
        GROUP BY
          reservation_details.hotel_id
          ,reservation_details.reservation_id
          ,rc.clients_json::TEXT
          ,rp.payment
      ) AS details
    WHERE
      reservations.hotel_id = $1
      AND reservations.check_out > $2
      AND reservations.check_in <= $3	    
      AND reservations.reservation_client_id = booker.id
      AND reservations.id = details.reservation_id
      AND reservations.hotel_id = details.hotel_id
    ORDER BY 5, 7;
  `;
  const values = [hotelId, dateStart, dateEnd]

  try {
    const result = await pool.query(query, values);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectCountReservation,
  selectCountReservationDetailsPlans,
  selectCountReservationDetailsAddons,
  selectOccupationByPeriod,
  selectReservationListView,
};
