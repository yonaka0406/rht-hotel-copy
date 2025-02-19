const pool = require('../config/database');

// GET
const selectCountReservation = async (hotelId, dateStart, dateEnd) => {
  const query = `
    SELECT 
      reservation_details.date
      ,roomTotal.total_rooms
      ,COUNT(reservation_details.room_id) as room_count
      ,SUM(reservation_details.number_of_people) AS people_sum
    FROM
      reservation_details
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
      AND reservation_details.hotel_id = roomTotal.hotel_id
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
      reservation_details
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
      reservation_details
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
    FROM reservation_details
    JOIN roomTotal ON reservation_details.hotel_id = roomTotal.hotel_id
    WHERE
      reservation_details.hotel_id = $2
      AND DATE_TRUNC('month', reservation_details.date) = DATE_TRUNC('month', $1::DATE)
      AND reservation_details.cancelled IS NULL
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


module.exports = {
  selectCountReservation,
  selectCountReservationDetailsPlans,
  selectCountReservationDetailsAddons,
  selectOccupationByPeriod,
};
