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
    WITH hotel_monthly_capacity AS (
      SELECT
        $2::int AS hotel_id,
        DATE_TRUNC('month', $1::DATE) AS month_start,
        EXTRACT(DAY FROM (DATE_TRUNC('month', $1::DATE) + INTERVAL '1 month' - INTERVAL '1 day'))::int AS days_in_month,
        COUNT(r.id)::int AS total_physical_rooms
      FROM rooms r
      WHERE r.hotel_id = $2 AND r.for_sale = TRUE
      GROUP BY DATE_TRUNC('month', $1::DATE)
    ),
    monthly_summary AS (
      SELECT
        h.hotel_id,
        h.month_start,
        h.days_in_month,
        h.total_physical_rooms,
        (h.total_physical_rooms * h.days_in_month)::bigint AS total_capacity_room_nights,
        COUNT(CASE WHEN res.status = 'block' AND rd.cancelled IS NULL AND rm.for_sale = TRUE THEN rd.id ELSE NULL END)::bigint AS total_blocked_room_nights,
        COUNT(CASE WHEN res.status NOT IN ('block', 'hold', 'provisory', 'cancelled') AND res.type <> 'employee' AND rd.cancelled IS NULL AND COALESCE(rd.is_accommodation, TRUE) = TRUE AND rm.for_sale = TRUE THEN rd.id ELSE NULL END)::bigint AS total_occupied_room_nights
      FROM hotel_monthly_capacity h
      LEFT JOIN reservation_details rd ON rd.hotel_id = h.hotel_id AND DATE_TRUNC('month', rd.date) = h.month_start
      LEFT JOIN reservations res ON res.id = rd.reservation_id AND res.hotel_id = rd.hotel_id
      LEFT JOIN rooms rm ON rd.room_id = rm.id
      WHERE rd.hotel_id = $2
      GROUP BY h.hotel_id, h.month_start, h.days_in_month, h.total_physical_rooms
    )
    SELECT
      ms.total_occupied_room_nights AS room_count,
      (ms.total_capacity_room_nights - ms.total_blocked_room_nights) AS available_rooms,
      ms.total_blocked_room_nights AS blocked_rooms,
      ms.total_capacity_room_nights AS total_rooms -- Renamed for clarity, was 'total_rooms'
    FROM monthly_summary ms;
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

const selectOccupationBreakdown = async (requestId, hotelId, startDate, endDate, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();

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
    total_blocked_nights AS (
      SELECT 
        COUNT(*) AS total_blocked
      FROM reservation_details rd
      JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      JOIN rooms rm ON rd.room_id = rm.id
      WHERE rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND rd.cancelled IS NULL
        AND r.status = 'block'
        AND rm.for_sale = TRUE
    ),
    plan_data AS (
      SELECT
          COALESCE(ph.name, pg.name, 'プラン未設定') AS plan_name,
          COALESCE(rr.sales_category, 'accommodation') AS sales_category,
          COUNT(CASE WHEN r.status IN ('hold', 'provisory') AND r.type <> 'employee' AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS undecided_nights,
          COUNT(CASE WHEN r.status IN ('confirmed', 'checked_in', 'checked_out') AND r.type <> 'employee' AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS confirmed_nights,
          COUNT(CASE WHEN r.type = 'employee' THEN 1 END) AS employee_nights,
          COUNT(CASE WHEN r.status = 'block' AND rm.for_sale = TRUE THEN 1 END) AS blocked_nights,
          COUNT(CASE WHEN COALESCE(rd.is_accommodation, TRUE) = FALSE AND r.status IN ('confirmed', 'checked_in', 'checked_out') AND r.type <> 'employee' THEN 1 END) AS non_accommodation_nights,
          (COUNT(CASE WHEN r.status NOT IN ('cancelled', 'block') THEN 1 END)
          + COUNT(CASE WHEN r.status = 'block' AND rm.for_sale = TRUE THEN 1 END)) AS total_occupied_nights,
          COUNT(rd.id) AS total_reservation_details_nights
      FROM reservation_details rd
      JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      JOIN rooms rm ON rd.room_id = rm.id
      LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
      LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
      LEFT JOIN (
          SELECT reservation_details_id, MIN(sales_category) as sales_category
          FROM reservation_rates
          WHERE hotel_id = $1
          GROUP BY reservation_details_id
      ) rr ON rd.id = rr.reservation_details_id
      WHERE rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND rd.cancelled IS NULL
      GROUP BY
          COALESCE(ph.name, pg.name, 'プラン未設定'),
          COALESCE(rr.sales_category, 'accommodation')
    )
    SELECT * FROM (
        SELECT 
            plan_name,
            sales_category,
            undecided_nights,
            confirmed_nights,
            employee_nights,
            blocked_nights,
            non_accommodation_nights,
            total_occupied_nights,
            total_reservation_details_nights,
            (SELECT total_bookable_room_nights FROM total_bookable_nights) AS total_bookable_room_nights,
            (SELECT total_bookable_room_nights - total_blocked FROM total_bookable_nights, total_blocked_nights) AS net_available_room_nights
        FROM plan_data
        
        UNION ALL
        
        SELECT
            'Total Available' AS plan_name,
            NULL AS sales_category,
            0::bigint AS undecided_nights,
            0::bigint AS confirmed_nights,
            0::bigint AS employee_nights,
            0::bigint AS blocked_nights,
            0::bigint AS non_accommodation_nights,
            0::bigint AS total_occupied_nights,
            0::bigint AS total_reservation_details_nights,
            total_bookable_room_nights,
            (total_bookable_room_nights - total_blocked) AS net_available_room_nights
        FROM total_bookable_nights, total_blocked_nights
    ) AS union_result
    ORDER BY
        CASE WHEN plan_name = 'Total Available' THEN 'zzz' ELSE plan_name END;
  `;
  const values = [hotelId, startDate, endDate];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectOccupationBreakdown:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

const selectOccupationBreakdownByMonth = async (requestId, hotelId, startDate, endDate, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();

  const query = `    
    WITH date_range AS (
        SELECT 
            ($3::DATE - $2::DATE + 1) AS total_days
    ),
    hotel_info AS (
      SELECT 
        id AS hotel_id,
        name AS hotel_name
      FROM hotels
      WHERE id = $1
    ),
    hotel_rooms AS (
        SELECT 
            COUNT(*) as total_rooms
        FROM rooms
        WHERE hotel_id = $1 AND for_sale = true
    ),
    total_bookable_nights AS (
        SELECT 
            date_trunc('month', d)::date AS month,
            hotel_rooms.total_rooms AS total_rooms,
            count(*) AS days_in_month,
            (hotel_rooms.total_rooms * count(*)) AS total_bookable_room_nights
        FROM generate_series($2::date, $3::date, interval '1 day') d
        CROSS JOIN hotel_rooms
        GROUP BY 1, 2
    ),
    total_blocked_nights AS (
        SELECT 
            date_trunc('month', rd.date)::date AS month,
            COUNT(*) AS total_blocked
        FROM reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        JOIN rooms rm ON rd.room_id = rm.id AND rd.hotel_id = rm.hotel_id
        WHERE rd.hotel_id = $1
          AND rd.date BETWEEN $2 AND $3
          AND rd.cancelled IS NULL
          AND r.status = 'block'
          AND rm.for_sale = TRUE
        GROUP BY 1
    ),
    plan_data AS (
        SELECT
            date_trunc('month', rd.date)::date AS month,
            COALESCE(ph.name, pg.name, 'プラン未設定') AS plan_name,
            COALESCE(rr.sales_category, 'accommodation') AS sales_category,

            COUNT(CASE WHEN r.status IN ('hold','provisory')
                      AND r.type <> 'employee'
                      AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS undecided_nights,

            COUNT(CASE WHEN r.status IN ('confirmed','checked_in','checked_out')
                      AND r.type <> 'employee'
                      AND COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 1 END) AS confirmed_nights,

            COUNT(CASE WHEN r.type = 'employee' THEN 1 END) AS employee_nights,

            COUNT(CASE WHEN r.status = 'block' AND rm.for_sale = TRUE THEN 1 END) AS blocked_nights,

            COUNT(CASE WHEN COALESCE(rd.is_accommodation, TRUE) = FALSE
                        AND r.status IN ('confirmed','checked_in','checked_out')
                        AND r.type <> 'employee' THEN 1 END) AS non_accommodation_nights,

            (
                COUNT(CASE WHEN r.status NOT IN ('cancelled','block') THEN 1 END) +
                COUNT(CASE WHEN r.status = 'block' AND rm.for_sale = TRUE THEN 1 END)
            ) AS total_occupied_nights,

            COUNT(rd.id) AS total_reservation_details_nights
        FROM reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        JOIN rooms rm ON rd.room_id = rm.id AND rd.hotel_id = rm.hotel_id
        LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
        LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
        LEFT JOIN (
            SELECT reservation_details_id, MIN(sales_category) AS sales_category
            FROM reservation_rates
            WHERE hotel_id = $1
            GROUP BY reservation_details_id
        ) rr ON rd.id = rr.reservation_details_id
        WHERE rd.hotel_id = $1
          AND rd.date BETWEEN $2 AND $3
          AND rd.cancelled IS NULL
        GROUP BY 1, 2, 3
    )

    SELECT *
    FROM (
        SELECT
            pd.month,
            hi.hotel_id,
            hi.hotel_name,
            pd.plan_name,
            pd.sales_category,
            pd.undecided_nights,
            pd.confirmed_nights,
            pd.employee_nights,
            pd.blocked_nights,
            pd.non_accommodation_nights,
            pd.total_occupied_nights,
            pd.total_reservation_details_nights,
            tbn.total_bookable_room_nights,
            (tbn.total_bookable_room_nights - COALESCE(tbn2.total_blocked,0)) AS net_available_room_nights
        FROM plan_data pd
        JOIN total_bookable_nights tbn ON pd.month = tbn.month
        LEFT JOIN total_blocked_nights tbn2 ON pd.month = tbn2.month
        CROSS JOIN hotel_info hi

        UNION ALL

        SELECT
            tbn.month,
            hi.hotel_id,
            hi.hotel_name,
            '稼働の合計' AS plan_name,
            NULL AS sales_category,

            SUM(pd.undecided_nights) AS undecided_nights,
            SUM(pd.confirmed_nights) AS confirmed_nights,
            SUM(pd.employee_nights) AS employee_nights,
            SUM(pd.blocked_nights) AS blocked_nights,
            SUM(pd.non_accommodation_nights) AS non_accommodation_nights,
            SUM(pd.total_occupied_nights) AS total_occupied_nights,
            SUM(pd.total_reservation_details_nights) AS total_reservation_details_nights,

            tbn.total_bookable_room_nights,
            (tbn.total_bookable_room_nights - COALESCE(tbn2.total_blocked,0)) AS net_available_room_nights

        FROM plan_data pd
        JOIN total_bookable_nights tbn ON pd.month = tbn.month
        LEFT JOIN total_blocked_nights tbn2 ON pd.month = tbn2.month
        CROSS JOIN hotel_info hi
        GROUP BY 
            tbn.month,
            hi.hotel_id,
            hi.hotel_name,
            tbn.total_bookable_room_nights,
            COALESCE(tbn2.total_blocked,0)
    ) u
    ORDER BY hotel_id, month, CASE WHEN plan_name = '稼働の合計' THEN 'z' ELSE 'a' END, plan_name;

  `;
  const values = [hotelId, startDate, endDate];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectOccupationBreakdownByMonth:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

module.exports = {
  selectOccupationByPeriod,
  selectOccupationBreakdown,
  selectOccupationBreakdownByMonth,
};