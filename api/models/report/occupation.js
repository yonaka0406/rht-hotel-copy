const { getPool } = require('../../config/database');

const selectOccupationByPeriod = async (requestId, period, hotelId, refDate) => {
  const pool = getPool(requestId);
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
      COUNT(CASE WHEN reservations.status = 'block' THEN NULL ELSE reservation_details.room_id END) as room_count,
      (roomTotal.total_rooms * roomTotal.last_day) - COUNT(CASE WHEN reservations.status = 'block' AND rooms.for_sale = TRUE then 1 ELSE NULL END) as available_rooms,  
      COUNT(CASE WHEN reservations.status = 'block' AND rooms.for_sale = TRUE then 1 ELSE NULL END) as blocked_rooms,
      (roomTotal.total_rooms * roomTotal.last_day) as total_rooms
    FROM 
      reservations
      JOIN reservation_details ON reservation_details.hotel_id = reservations.hotel_id AND reservation_details.reservation_id = reservations.id 
      JOIN rooms ON reservation_details.room_id = rooms.id
      JOIN roomTotal ON reservation_details.hotel_id = roomTotal.hotel_id
    WHERE
      reservation_details.hotel_id = $2
      AND DATE_TRUNC('month', reservation_details.date) = DATE_TRUNC('month', $1::DATE)
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status NOT IN ('hold')      
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

const selectOccupationBreakdown = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
    WITH date_range AS (
      SELECT 
        ($3::DATE - $2::DATE + 1) AS total_days
    ),
    hotel_rooms AS (
      SELECT 
        COUNT(*) as total_rooms
      FROM rooms
      WHERE hotel_id = $1 AND for_sale = true
    ),
    total_bookable_nights AS (
      SELECT 
        (hotel_rooms.total_rooms * date_range.total_days) AS total_bookable_room_nights
      FROM date_range, hotel_rooms
    ),
    plan_data AS (
      SELECT
          COALESCE(ph.name, pg.name, 'プラン未設定') AS plan_name,
          COUNT(CASE WHEN r.status IN ('hold', 'provisory') AND r.type <> 'employee' THEN 1 END) AS undecided_nights,
          COUNT(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND r.type <> 'employee' THEN 1 END) AS confirmed_nights,
          COUNT(CASE WHEN r.type = 'employee' THEN 1 END) AS employee_nights,
          COUNT(CASE WHEN r.status = 'block' THEN 1 END) AS blocked_nights,
          (COUNT(CASE WHEN r.status IN ('hold', 'provisory') AND r.type <> 'employee' THEN 1 END) +
           COUNT(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND r.type <> 'employee' THEN 1 END) +
           COUNT(CASE WHEN r.type = 'employee' THEN 1 END) +
           COUNT(CASE WHEN r.status = 'block' THEN 1 END)) AS total_occupied_nights,
          COUNT(rd.id) AS total_reservation_details_nights
      FROM reservation_details rd
      JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
      LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
      WHERE rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND rd.cancelled IS NULL
      GROUP BY
          COALESCE(ph.name, pg.name, 'プラン未設定')
    )
    SELECT * FROM (
        SELECT 
            plan_name,
            undecided_nights,
            confirmed_nights,
            employee_nights,
            blocked_nights,
            total_occupied_nights,
            total_reservation_details_nights,
            (SELECT total_bookable_room_nights FROM total_bookable_nights) AS total_bookable_room_nights
        FROM plan_data
        
        UNION ALL
        
        SELECT
            'Total Available' AS plan_name,
            0::bigint AS undecided_nights,
            0::bigint AS confirmed_nights,
            0::bigint AS employee_nights,
            0::bigint AS blocked_nights,
            0::bigint AS total_occupied_nights,
            0::bigint AS total_reservation_details_nights,
            total_bookable_room_nights
        FROM total_bookable_nights
    ) AS union_result
    ORDER BY
        CASE WHEN plan_name = 'Total Available' THEN 'zzz' ELSE plan_name END;
  `;
  const values = [hotelId, startDate, endDate];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectOccupationBreakdown:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectOccupationByPeriod,
  selectOccupationBreakdown,
};