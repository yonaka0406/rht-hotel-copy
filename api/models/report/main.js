const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

// GET
const selectCountReservation = async (requestId, hotelId, dateStart, dateEnd, dbClient = null) => {
  const pool = getPool(requestId);
  const client = dbClient || await pool.connect();
  /*
  const query = `
    WITH
    -- 0. Dates that actually appear in reservation_details
    dates AS (
      SELECT DISTINCT hotel_id, date
      FROM reservation_details
      WHERE hotel_id = $1
        AND date BETWEEN $2 AND $3
    ),

    -- 1. Blocked rooms count per date
    blocked_rooms AS (
      SELECT
        rd.hotel_id,
        rd.date,
        COUNT(CASE WHEN r.status = 'block' THEN rd.room_id ELSE NULL END) AS blocked_count
      FROM reservations r
      JOIN reservation_details rd
        ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
      JOIN rooms
        ON rd.room_id = rooms.id and rd.hotel_id = rooms.hotel_id
      WHERE
        r.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND r.status = 'block'
        AND rd.cancelled IS NULL
        AND rooms.for_sale = TRUE
      GROUP BY rd.hotel_id, rd.date
    ),

    -- 2. Room inventory
    room_inventory AS (
      SELECT
        hotel_id,
        COUNT(*) AS total_rooms
      FROM rooms
      WHERE hotel_id = $1 AND for_sale = TRUE
      GROUP BY hotel_id
    ),

    -- 3. Rooms left per date (only reservation dates)
    room_total AS (
      SELECT
        d.hotel_id,
        d.date,
        ri.total_rooms,
        ri.total_rooms - COALESCE(br.blocked_count, 0) AS total_rooms_real
      FROM dates d
      CROSS JOIN room_inventory ri
      LEFT JOIN blocked_rooms br
        ON br.date = d.date AND br.hotel_id = ri.hotel_id
    ),

    -- New CTE to calculate net prices for each reservation_detail
    reservation_details_net_price AS (
        SELECT
            rd.hotel_id,
            rd.date,
            rd.reservation_id,
            rd.id AS reservation_detail_id,
            rd.number_of_people,
            COALESCE(rd.is_accommodation, TRUE) AS is_accommodation,
            CASE WHEN rd.cancelled IS NULL THEN FALSE ELSE TRUE END AS cancelled,
            -- Calculate net plan price split by sales_category
            COALESCE(rr.accommodation_net_price, 0) AS accommodation_net_plan_price,
            COALESCE(rr.other_net_price, 0) AS other_net_plan_price,
            -- Calculate net addon price split by sales_category
            COALESCE(ra.accommodation_net_price_sum, 0) AS accommodation_net_addon_price,
            COALESCE(ra.other_net_price_sum, 0) AS other_net_addon_price,
            COALESCE(gender_counts.male_count, 0) AS male_count,
            COALESCE(gender_counts.female_count, 0) AS female_count
        FROM
            reservations res
        JOIN
            reservation_details rd ON res.hotel_id = rd.hotel_id AND res.id = rd.reservation_id
        LEFT JOIN (
            -- Aggregate net prices from reservation_rates split by sales_category
            SELECT
                rr.hotel_id,
                rr.reservation_details_id,
                rd_inner.plan_type,
                rd_inner.number_of_people,
                SUM(
                    CASE 
                        WHEN rr.sales_category = 'accommodation' OR rr.sales_category IS NULL THEN
                            CASE 
                                WHEN rd_inner.plan_type = 'per_room' THEN rr.net_price
                                ELSE rr.net_price * rd_inner.number_of_people
                            END
                        ELSE 0
                    END
                ) AS accommodation_net_price,
                SUM(
                    CASE 
                        WHEN rr.sales_category = 'other' THEN
                            CASE 
                                WHEN rd_inner.plan_type = 'per_room' THEN rr.net_price
                                ELSE rr.net_price * rd_inner.number_of_people
                            END
                        ELSE 0
                    END
                ) AS other_net_price
            FROM
                reservation_rates rr
            JOIN reservation_details rd_inner ON rr.reservation_details_id = rd_inner.id AND rr.hotel_id = rd_inner.hotel_id
            WHERE rr.hotel_id = $1
            GROUP BY
                rr.hotel_id, rr.reservation_details_id, rd_inner.plan_type, rd_inner.number_of_people
        ) rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
        LEFT JOIN (
            -- Aggregate net prices from reservation_addons split by sales_category
            SELECT
                hotel_id,
                reservation_detail_id,
                SUM(
                    CASE 
                        WHEN sales_category = 'accommodation' OR sales_category IS NULL THEN net_price * quantity
                        ELSE 0
                    END
                ) AS accommodation_net_price_sum,
                SUM(
                    CASE 
                        WHEN sales_category = 'other' THEN net_price * quantity
                        ELSE 0
                    END
                ) AS other_net_price_sum
            FROM
                reservation_addons
            WHERE hotel_id = $1
            GROUP BY
                hotel_id, reservation_detail_id
        ) ra ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
        LEFT JOIN (
            -- Count male, female, and unspecified clients for each reservation_detail
            SELECT
                rc.hotel_id,
                rc.reservation_details_id,
                COUNT(CASE WHEN c.gender = 'male' THEN 1 ELSE NULL END) AS male_count,
                COUNT(CASE WHEN c.gender = 'female' THEN 1 ELSE NULL END) AS female_count
            FROM
                reservation_clients rc
            JOIN
                clients c ON rc.client_id = c.id
            WHERE rc.hotel_id = $1
            GROUP BY
                rc.hotel_id, rc.reservation_details_id
        ) gender_counts ON rd.id = gender_counts.reservation_details_id AND rd.hotel_id = gender_counts.hotel_id
        WHERE
            rd.billable = TRUE 
            AND rd.hotel_id = $1 AND rd.date BETWEEN $2 AND $3
            AND res.status NOT IN('hold','block')
            AND res.type <> 'employee'           
    )

    -- 4. Main Query (using calculated net prices)
    SELECT
      rt.date,
      rt.total_rooms,
      rt.total_rooms_real,
      COUNT(CASE WHEN rdn.cancelled = TRUE THEN NULL 
                 WHEN rdn.is_accommodation = TRUE THEN rdn.reservation_detail_id 
                 ELSE NULL END) AS room_count, -- Only count accommodation reservations
      COUNT(CASE WHEN rdn.cancelled = TRUE THEN NULL 
                 WHEN rdn.is_accommodation = FALSE THEN rdn.reservation_detail_id 
                 ELSE NULL END) AS non_accommodation_stays,
      SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.number_of_people END) AS people_sum, -- Adjusted people_sum      
      SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.male_count END) AS male_count,
      SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.female_count END) AS female_count,
      (SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.number_of_people END) - SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.male_count END) - SUM(CASE WHEN rdn.cancelled = TRUE THEN NULL ELSE rdn.female_count END)) AS unspecified_count,
      SUM(rdn.accommodation_net_plan_price + rdn.accommodation_net_addon_price) AS accommodation_price,
      SUM(rdn.other_net_plan_price + rdn.other_net_addon_price) AS other_price,
      SUM(rdn.accommodation_net_plan_price + rdn.accommodation_net_addon_price + rdn.other_net_plan_price + rdn.other_net_addon_price) AS price -- Total price for compatibility
    FROM room_total rt
    LEFT JOIN reservation_details_net_price rdn
      ON rdn.hotel_id = rt.hotel_id AND rdn.date = rt.date
    WHERE
      rt.hotel_id = $1
    GROUP BY
      rt.date, rt.total_rooms, rt.total_rooms_real
    ORDER BY rt.date;
  `;
  */
  const query = `
    WITH

    /* -------------------------------------------------------
      Base reservation_details filtered early (small set)
    -------------------------------------------------------- */
    rd_base AS MATERIALIZED (
      SELECT
        rd.id AS reservation_detail_id,
        rd.reservation_id,
        rd.hotel_id,
        rd.date,
        rd.room_id,
        rd.number_of_people,
        COALESCE(rd.is_accommodation, TRUE) AS is_accommodation,
        (rd.cancelled IS NOT NULL) AS cancelled,
        rd.billable,
        rd.plan_type
      FROM reservation_details rd
      JOIN reservations r
        ON r.id = rd.reservation_id
      AND r.hotel_id = rd.hotel_id
      WHERE
            rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND rd.billable = TRUE
        AND r.status NOT IN ('hold','block','provisory')
        AND r.type <> 'employee'
    ),

    /* -------------------------------------------------------
      reservation_rates aggregated per reservation_detail
    -------------------------------------------------------- */
    rr_agg AS MATERIALIZED (
      SELECT
        hotel_id,
        reservation_detail_id,
        SUM(other_net_price) as other_net_price,
        SUM(accommodation_net_price) as accommodation_net_price
      FROM (
        SELECT
          rr.hotel_id,
          rr.reservation_details_id AS reservation_detail_id,
          (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END) as normalized_rate,
          
          FLOOR(
            SUM(
              CASE WHEN rr.sales_category = 'other'
                   THEN (CASE WHEN rdb.plan_type = 'per_room' THEN rr.price ELSE rr.price * rdb.number_of_people END)
                   ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END))::numeric
          ) AS other_net_price,

          FLOOR(
            SUM(
              CASE WHEN rr.sales_category IN ('accommodation') OR rr.sales_category IS NULL
                   THEN (CASE WHEN rdb.plan_type = 'per_room' THEN rr.price ELSE rr.price * rdb.number_of_people END)
                   ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END))::numeric
          ) AS accommodation_net_price

        FROM reservation_rates rr
        JOIN rd_base rdb ON rr.hotel_id = rdb.hotel_id AND rr.reservation_details_id = rdb.reservation_detail_id
        WHERE rr.hotel_id = $1
        GROUP BY rr.hotel_id, rr.reservation_details_id, (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END)
      ) AS per_tax_rate
      GROUP BY hotel_id, reservation_detail_id
    ),

    /* -------------------------------------------------------
      reservation_addons aggregated per reservation_detail
    -------------------------------------------------------- */
    ra_agg AS MATERIALIZED (
      SELECT
        hotel_id,
        reservation_detail_id,
        SUM(other_net_price_sum) as other_net_price_sum,
        SUM(accommodation_net_price_sum) as accommodation_net_price_sum
      FROM (
        SELECT
          ra.hotel_id,
          ra.reservation_detail_id,
          (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END) as normalized_rate,

          FLOOR(
            SUM(
              CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END))::numeric
          ) AS other_net_price_sum,

          FLOOR(
            SUM(
              CASE WHEN ra.sales_category IN ('accommodation') OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END))::numeric
          ) AS accommodation_net_price_sum

        FROM reservation_addons ra
        JOIN rd_base rdb ON ra.hotel_id = rdb.hotel_id AND ra.reservation_detail_id = rdb.reservation_detail_id
        WHERE ra.hotel_id = $1
        GROUP BY ra.hotel_id, ra.reservation_detail_id, (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END)
      ) AS per_tax_rate
      GROUP BY hotel_id, reservation_detail_id
    ),

    /* -------------------------------------------------------
      client gender aggregated per reservation_detail
    -------------------------------------------------------- */
    rc_agg AS MATERIALIZED (
      SELECT
        rc.hotel_id,
        rc.reservation_details_id AS reservation_detail_id,
        COUNT(CASE WHEN c.gender = 'male' THEN 1 END) AS male_count,
        COUNT(CASE WHEN c.gender = 'female' THEN 1 END) AS female_count
      FROM reservation_clients rc
      JOIN clients c
        ON c.id = rc.client_id
      JOIN rd_base rdb
        ON rc.hotel_id = rdb.hotel_id
      AND rc.reservation_details_id = rdb.reservation_detail_id
      AND rc.hotel_id = $1
      GROUP BY rc.hotel_id, rc.reservation_details_id
    ),

    /* -------------------------------------------------------
      Room inventory (very small)
    -------------------------------------------------------- */
    room_inventory AS MATERIALIZED (
      SELECT hotel_id, COUNT(*) AS total_rooms
      FROM rooms
      WHERE hotel_id = $1
        AND for_sale = TRUE
      GROUP BY hotel_id
    ),

    /* -------------------------------------------------------
      Blocked rooms per date, correct join using hotel_id
    -------------------------------------------------------- */
    blocked_rooms AS MATERIALIZED (
      SELECT
        rd.hotel_id,
        rd.date,
        COUNT(*) AS blocked_count
      FROM reservations r
      JOIN reservation_details rd
        ON rd.reservation_id = r.id
      AND rd.hotel_id = r.hotel_id
      JOIN rooms rm
        ON rm.id = rd.room_id
      AND rm.hotel_id = rd.hotel_id
      WHERE
            r.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND r.status = 'block'
        AND rd.cancelled IS NULL
        AND rm.for_sale = TRUE
      GROUP BY rd.hotel_id, rd.date
    ),

    /* -------------------------------------------------------
      All dates used by the hotel in this range
    -------------------------------------------------------- */
    dates AS MATERIALIZED (
      SELECT DISTINCT hotel_id, date
      FROM reservation_details
      WHERE hotel_id = $1
        AND date BETWEEN $2 AND $3
    ),

    /* -------------------------------------------------------
      Total rooms available per date
    -------------------------------------------------------- */
    room_total AS MATERIALIZED (
      SELECT
        d.hotel_id,
        d.date,
        ri.total_rooms,
        ri.total_rooms - COALESCE(br.blocked_count, 0) AS total_rooms_real
      FROM dates d
      CROSS JOIN room_inventory ri
      LEFT JOIN blocked_rooms br
        ON br.hotel_id = d.hotel_id
      AND br.date = d.date
    ),

    /* -------------------------------------------------------
      Provisory Reservation Details
    -------------------------------------------------------- */
    rd_provisory_base AS MATERIALIZED (
      SELECT
        rd.id AS reservation_detail_id,
        rd.reservation_id,
        rd.hotel_id,
        rd.date,
        rd.room_id,
        rd.number_of_people,
        COALESCE(rd.is_accommodation, TRUE) AS is_accommodation,
        rd.plan_type
      FROM reservation_details rd
      JOIN reservations r
        ON r.id = rd.reservation_id
      AND r.hotel_id = rd.hotel_id
      WHERE
            rd.hotel_id = $1
        AND rd.date BETWEEN $2 AND $3
        AND r.status = 'provisory'
        AND rd.cancelled IS NULL
        AND r.type <> 'employee'
    ),

    /* -------------------------------------------------------
      Provisory Rates Aggregation
    -------------------------------------------------------- */
    rr_provisory_agg AS MATERIALIZED (
      SELECT
        hotel_id,
        reservation_detail_id,
        SUM(other_net_price) as other_net_price,
        SUM(accommodation_net_price) as accommodation_net_price
      FROM (
        SELECT
          rr.hotel_id,
          rr.reservation_details_id AS reservation_detail_id,
          FLOOR(
            SUM(
              CASE WHEN rr.sales_category = 'other'
                   THEN (CASE WHEN rdb.plan_type IS NOT DISTINCT FROM 'per_room' THEN rr.price ELSE rr.price * rdb.number_of_people END)
                   ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END))::numeric
          ) AS other_net_price,

          FLOOR(
            SUM(
              CASE WHEN rr.sales_category IN ('accommodation') OR rr.sales_category IS NULL
                   THEN (CASE WHEN rdb.plan_type IS NOT DISTINCT FROM 'per_room' THEN rr.price ELSE rr.price * rdb.number_of_people END)
                   ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END))::numeric
          ) AS accommodation_net_price

        FROM reservation_rates rr
        JOIN reservation_details rdb_inner ON rr.hotel_id = rdb_inner.hotel_id AND rr.reservation_details_id = rdb_inner.id
        JOIN rd_provisory_base rdb ON rr.hotel_id = rdb.hotel_id AND rr.reservation_details_id = rdb.reservation_detail_id
        WHERE rr.hotel_id = $1
        GROUP BY rr.hotel_id, rr.reservation_details_id, (CASE WHEN COALESCE(rr.tax_rate, 0) > 1 THEN COALESCE(rr.tax_rate, 0) / 100.0 ELSE COALESCE(rr.tax_rate, 0) END)
      ) AS per_tax_rate
      GROUP BY hotel_id, reservation_detail_id
    ),

    /* -------------------------------------------------------
      Provisory Addons Aggregation
    -------------------------------------------------------- */
    ra_provisory_agg AS MATERIALIZED (
      SELECT
        hotel_id,
        reservation_detail_id,
        SUM(other_net_price_sum) as other_net_price_sum,
        SUM(accommodation_net_price_sum) as accommodation_net_price_sum
      FROM (
        SELECT
          ra.hotel_id,
          ra.reservation_detail_id,
          FLOOR(
            SUM(
              CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END))::numeric
          ) AS other_net_price_sum,

          FLOOR(
            SUM(
              CASE WHEN ra.sales_category IN ('accommodation') OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END
            )::numeric 
            / (1 + (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END))::numeric
          ) AS accommodation_net_price_sum

        FROM reservation_addons ra
        JOIN rd_provisory_base rdb ON ra.hotel_id = rdb.hotel_id AND ra.reservation_detail_id = rdb.reservation_detail_id
        WHERE ra.hotel_id = $1
        GROUP BY ra.hotel_id, ra.reservation_detail_id, (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) / 100.0 ELSE COALESCE(ra.tax_rate, 0) END)
      ) AS per_tax_rate
      GROUP BY hotel_id, reservation_detail_id
    ),

    /* -------------------------------------------------------
      Provisory Stats Aggregated per Date
    -------------------------------------------------------- */
    provisory_daily_stats AS MATERIALIZED (
      SELECT
        rdb.hotel_id,
        rdb.date,
        COUNT(CASE WHEN rdb.is_accommodation THEN 1 END) AS provisory_room_count,
        SUM(COALESCE(rr.accommodation_net_price, 0) + COALESCE(ra.accommodation_net_price_sum, 0)) AS provisory_accommodation_price,
        SUM(COALESCE(rr.other_net_price, 0) + COALESCE(ra.other_net_price_sum, 0)) AS provisory_other_price
      FROM rd_provisory_base rdb
      LEFT JOIN rr_provisory_agg rr 
        ON rdb.hotel_id = rr.hotel_id AND rdb.reservation_detail_id = rr.reservation_detail_id
      LEFT JOIN ra_provisory_agg ra 
        ON rdb.hotel_id = ra.hotel_id AND rdb.reservation_detail_id = ra.reservation_detail_id
      GROUP BY rdb.hotel_id, rdb.date
    )

    /* -------------------------------------------------------
      Final aggregation per date
    -------------------------------------------------------- */
    SELECT
      rt.date,
      rt.total_rooms,
      rt.total_rooms_real,

      COUNT(
        CASE WHEN NOT rdb.cancelled AND rdb.is_accommodation
            THEN rdb.reservation_detail_id END
      ) AS room_count,
       COUNT(
        CASE WHEN NOT rdb.cancelled AND rdb.is_accommodation
            THEN rdb.reservation_detail_id END
      ) AS confirmed_room_count,

      COUNT(
        CASE WHEN NOT rdb.cancelled AND NOT rdb.is_accommodation
            THEN rdb.reservation_detail_id END
      ) AS non_accommodation_stays,

      SUM(CASE WHEN NOT rdb.cancelled THEN rdb.number_of_people END) AS people_sum,

      SUM(CASE WHEN NOT rdb.cancelled THEN COALESCE(rc.male_count, 0) ELSE 0 END)   AS male_count,
      SUM(CASE WHEN NOT rdb.cancelled THEN COALESCE(rc.female_count, 0) ELSE 0 END) AS female_count,

      /* unspecified guests = total - male - female */
      SUM(CASE WHEN NOT rdb.cancelled THEN rdb.number_of_people END)
        - SUM(COALESCE(rc.male_count, 0))
        - SUM(COALESCE(rc.female_count, 0)) AS unspecified_count,

      /* price calculations */
      SUM(
        COALESCE(rr.accommodation_net_price, 0)
        + COALESCE(ra.accommodation_net_price_sum, 0)
      ) AS accommodation_price,
      SUM(
        COALESCE(rr.accommodation_net_price, 0)
        + COALESCE(ra.accommodation_net_price_sum, 0)
      ) AS confirmed_accommodation_price,

      SUM(
        COALESCE(rr.other_net_price, 0)
        + COALESCE(ra.other_net_price_sum, 0)
      ) AS other_price,

      SUM(
        COALESCE(rr.accommodation_net_price, 0)
        + COALESCE(ra.accommodation_net_price_sum, 0)
        + COALESCE(rr.other_net_price, 0)
        + COALESCE(ra.other_net_price_sum, 0)
      ) AS price,

      /* Provisory Columns (from separate CTE) */
      COALESCE(pds.provisory_room_count, 0) AS provisory_room_count,
      COALESCE(pds.provisory_accommodation_price, 0) AS provisory_accommodation_price,
      COALESCE(pds.provisory_other_price, 0) AS provisory_other_price

    FROM room_total rt
    LEFT JOIN rd_base rdb
      ON rdb.hotel_id = rt.hotel_id
    AND rdb.date     = rt.date
    LEFT JOIN rr_agg rr
      ON rr.hotel_id             = rdb.hotel_id
    AND rr.reservation_detail_id = rdb.reservation_detail_id
    LEFT JOIN ra_agg ra
      ON ra.hotel_id             = rdb.hotel_id
    AND ra.reservation_detail_id = rdb.reservation_detail_id
    LEFT JOIN rc_agg rc
      ON rc.hotel_id             = rdb.hotel_id
    AND rc.reservation_detail_id = rdb.reservation_detail_id
    
    LEFT JOIN provisory_daily_stats pds
      ON pds.hotel_id = rt.hotel_id
      AND pds.date = rt.date

    GROUP BY
      rt.date,
      rt.total_rooms,
      rt.total_rooms_real,
      pds.provisory_room_count,
      pds.provisory_accommodation_price,
      pds.provisory_other_price
    ORDER BY rt.date;
 `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) client.release();
  }
};

const selectCountReservationDetailsPlans = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      reservation_details.date
      ,COALESCE(reservation_details.plans_global_id::TEXT, '') || 'h' || COALESCE(reservation_details.plans_hotel_id::TEXT, '') AS key
      ,COALESCE(plans_global.name, plans_hotel.name, '未設定') AS name
      ,reservation_details.plan_type
      ,SUM(CASE WHEN reservation_details.plan_type = 'per_room' THEN 1
        ELSE reservation_details.number_of_people END) AS quantity
    FROM
      reservations
      ,reservation_details        
      LEFT JOIN plans_global
        ON plans_global.id = reservation_details.plans_global_id
      LEFT JOIN plans_hotel
        ON plans_hotel.hotel_id = reservation_details.hotel_id AND plans_hotel.id = reservation_details.plans_hotel_id
    WHERE
      reservation_details.hotel_id = $1
      AND reservation_details.date BETWEEN $2 AND $3
      AND reservation_details.cancelled IS NULL
      AND reservations.type <> 'employee'
      AND reservations.status NOT IN ('hold', 'block')
      AND reservation_details.reservation_id = reservations.id
      AND reservation_details.hotel_id = reservations.hotel_id
    GROUP BY
      reservation_details.date
      ,reservation_details.plans_global_id
      ,reservation_details.plans_hotel_id
      ,plans_global.name
      ,plans_hotel.name
      ,reservation_details.plan_type
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

const selectCountReservationDetailsAddons = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      rd.date
      ,COALESCE(ra.addons_global_id::TEXT, '') || 'h' || COALESCE(ra.addons_hotel_id::TEXT, '') AS key
      ,ra.addon_name
      ,COALESCE(ah.addon_type, ag.addon_type) AS addon_type
      ,SUM(ra.quantity) AS quantity
    FROM  
      reservations res
      JOIN reservation_details rd ON res.hotel_id = rd.hotel_id AND res.id = rd.reservation_id
      JOIN reservation_addons ra ON rd.hotel_id = ra.hotel_id AND rd.id = ra.reservation_detail_id
      LEFT JOIN addons_global ag ON ra.addons_global_id = ag.id
      LEFT JOIN addons_hotel ah ON ra.hotel_id = ah.hotel_id AND ra.addons_hotel_id = ah.id
    WHERE
      rd.hotel_id = $1
      AND rd.date BETWEEN $2 AND $3
      AND rd.cancelled IS NULL
      AND res.type <> 'employee'
      AND res.status NOT IN ('hold', 'block')
    GROUP BY
      rd.date
      ,ra.addons_global_id
      ,ra.addons_hotel_id
      ,ra.addon_name
      ,ah.addon_type, ag.addon_type
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

const selectReservationListView = async (requestId, hotelId, dateStart, dateEnd, searchType = 'stay_period') => {

  try {
    const pool = getPool(requestId);

    // Base query parts
    const selectClause = `
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
        ,details.payment
        ,details.plan_sales_category
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
            ,COALESCE(MIN(rr.sales_category), 'accommodation') AS plan_sales_category
            ,rc.clients_json::TEXT AS clients_json
            ,rpc.clients_json::TEXT AS payers_json          
            ,COALESCE(rp.payment,0) as payment          
            ,SUM(
                CASE
                  WHEN reservation_details.billable = TRUE THEN
                    CASE
                      WHEN reservation_details.plan_type = 'per_room'
                      THEN reservation_details.price
                      ELSE reservation_details.price * reservation_details.number_of_people
                    END
                  ELSE 0
                END
            ) AS plan_price
            ,SUM(
                CASE
                  WHEN reservation_details.billable = TRUE
                  THEN COALESCE(ra.addon_sum,0)
                  ELSE 0
                END
            ) AS addon_price
          FROM
            reservation_details 
              LEFT JOIN reservation_rates rr ON reservation_details.id = rr.reservation_details_id
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
                    'phone', c.phone,
                    'gender', c.gender
                  )
                ) AS clients_json
              FROM 
                (SELECT DISTINCT reservation_id, client_id 
                   FROM reservation_clients rc 
                   JOIN reservation_details rd ON rc.reservation_details_id = rd.id) rc
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
                   JOIN reservations r ON rp.reservation_id = r.id) rpc
                JOIN clients c ON rpc.client_id = c.id
              GROUP BY rpc.reservation_id
            ) rpc ON rpc.reservation_id = reservation_details.reservation_id
          WHERE
            reservation_details.hotel_id = $1
          GROUP BY
            reservation_details.hotel_id
            ,reservation_details.reservation_id
            ,rc.clients_json::TEXT
            ,rpc.clients_json::TEXT          
            ,rp.payment
        ) AS details
      WHERE
        reservations.hotel_id = $1
        AND reservations.status <> 'block'  
        AND reservations.reservation_client_id = booker.id
        AND reservations.id = details.reservation_id
        AND reservations.hotel_id = details.hotel_id
        AND reservations.hotel_id = hotels.id
    `;

    // Add date filtering based on search type
    let dateFilterClause = '';
    switch (searchType) {
      case 'check_in':
        dateFilterClause = `
          AND reservations.check_in >= $2::date 
          AND reservations.check_in <= $3::date
        `;
        break;
      case 'created_at':
        dateFilterClause = `
          AND reservations.created_at >= $2::date 
          AND reservations.created_at <= ($3::date + interval '1 day' - interval '1 second')
        `;
        break;
      case 'stay_period':
      default:
        dateFilterClause = `
          AND reservations.check_out > $2
          AND reservations.check_in <= $3
        `;
    }

    const orderClause = `
      ORDER BY check_in, id;
    `;

    const query = selectClause + dateFilterClause + orderClause;
    const values = [hotelId, dateStart, dateEnd];

    const result = await pool.query(query, values);

    return result.rows;
  } catch (err) {
    console.error(`[${new Date().toISOString()}] [Request ${requestId}] Error in selectReservationListView:`, {
      error: err.message,
      stack: err.stack,
      parameters: { hotelId, dateStart, dateEnd, searchType }
    });
    throw new Error('Database error');
  }
};

const selectReservationsInventory = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
      WITH date_range AS (
          SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
      ),
      active_room_types AS (
          -- Get only room types that have at least one reservation in the date range
          SELECT DISTINCT room_type_id
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND date BETWEEN $2 AND $3
          AND netrmtypegroupcode IS NOT NULL
      ),
      fallback_room_types AS (
          -- Get all room types for this hotel as fallback (excluding NULL netrmtypegroupcode)
          SELECT DISTINCT room_type_id
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND netrmtypegroupcode IS NOT NULL
      ),
      final_room_types AS (
          -- Use active room types if they exist, otherwise all room types
          SELECT room_type_id FROM active_room_types
          UNION ALL
          SELECT room_type_id FROM fallback_room_types
          WHERE NOT EXISTS (SELECT 1 FROM active_room_types)
      ),
      room_type_details AS (
          -- Get the most recent details for these room types
          SELECT DISTINCT ON (room_type_id) 
              room_type_id, 
              netrmtypegroupcode, 
              room_type_name, 
              total_rooms
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND room_type_id IN (SELECT room_type_id FROM final_room_types)
          AND netrmtypegroupcode IS NOT NULL
          ORDER BY room_type_id, date DESC
      )
      SELECT 
          $1 AS hotel_id,
          d.date,
          rt.room_type_id,
          rt.netrmtypegroupcode,
          rt.room_type_name,
          rt.total_rooms,
          COALESCE(inv.room_count, 0) AS room_count
      FROM 
          date_range d
      CROSS JOIN room_type_details rt
      LEFT JOIN vw_room_inventory inv ON 
          inv.hotel_id = $1
          AND inv.date = d.date 
          AND inv.room_type_id = rt.room_type_id
      ORDER BY 
          d.date, 
          rt.room_type_id;
  `;
  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving logs:', err);
    throw new Error('Database error');
  }
};

const selectAllRoomTypesInventory = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);
  const query = `
      WITH date_range AS (
          SELECT generate_series($2::date, $3::date, '1 day'::interval)::date AS date
      ),
      room_type_details AS (
          -- Get the most recent details for all room types with valid group codes
          SELECT DISTINCT ON (room_type_id) 
              room_type_id, 
              netrmtypegroupcode, 
              room_type_name, 
              total_rooms
          FROM vw_room_inventory
          WHERE hotel_id = $1
          AND netrmtypegroupcode IS NOT NULL
          ORDER BY room_type_id, date DESC
      )
      SELECT 
          $1 AS hotel_id,
          d.date,
          rt.room_type_id,
          rt.netrmtypegroupcode,
          rt.room_type_name,
          rt.total_rooms,
          COALESCE(inv.room_count, 0) AS room_count
      FROM 
          date_range d
      CROSS JOIN room_type_details rt
      LEFT JOIN vw_room_inventory inv ON 
          inv.hotel_id = $1
          AND inv.date = d.date 
          AND inv.room_type_id = rt.room_type_id
      ORDER BY 
          d.date, 
          rt.room_type_id;
  `;
  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving inventory:', err);
    throw new Error('Database error');
  }
};

const selectActiveReservationsChange = async (requestId, hotel_id, dateString) => {
  const pool = getPool(requestId);

  let p_hotel_id;
  // Handle 'all' or '0' for hotel_id by setting it to null for the SQL query
  if (hotel_id === 'all' || String(hotel_id) === '0' || hotel_id === 0) {
    p_hotel_id = null;
  } else {
    p_hotel_id = parseInt(hotel_id, 10);
    if (isNaN(p_hotel_id) || p_hotel_id <= 0) {
      return { error: 'Invalid hotel_id. Must be a positive integer, "all", or "0".' };
    }
  }
  // Basic validation for dateString format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return { error: 'Invalid dateString format. Expected YYYY-MM-DD.' };
  }

  const query = `
    SELECT * FROM get_room_inventory_comparison_for_date_range($1, $2);
  `;
  const values = [p_hotel_id, dateString];
  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return { message: 'No inventory data found for the given parameters.', data: [] };
    }
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data from get_room_inventory_comparison_for_date_range:', err);
    return { error: 'Database error occurred while fetching room inventory.' };
  }
};

const selectMonthlyReservationEvolution = async (requestId, hotel_id, target_month) => {
  const pool = getPool(requestId);

  const p_hotel_id = parseInt(hotel_id, 10);
  if (isNaN(p_hotel_id)) {
    throw new Error('Invalid hotel_id format.');
  }
  // Validate target_month format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target_month)) {
    throw new Error('Invalid target_month format. Expected YYYY-MM-DD.');
  }
  const p_target_month_start_date = target_month;

  const query = `
    WITH
    target_month_days AS (
        SELECT generate_series(
                    $2::DATE,
                    ($2::DATE + INTERVAL '1 month' - INTERVAL '1 day')::DATE,
                    INTERVAL '1 day'
                )::DATE AS stay_date
    ),
    lead_day_series AS (
        SELECT generate_series(0, 180) AS lead_days
    ),
    matrix_base AS (
        SELECT
            tmd.stay_date,
            lds.lead_days
        FROM
            target_month_days tmd
        CROSS JOIN
            lead_day_series lds
    ),
    RelevantReservations AS (
        SELECT
            rd.id AS room_night_id,
            rd.date AS stay_date,
            r.hotel_id,
            (r.check_in::DATE - r.created_at::DATE) AS calculated_lead_time_days
        FROM
            reservation_details rd
        JOIN
            reservations r ON rd.reservation_id = r.id
                           AND rd.hotel_id = r.hotel_id
        WHERE
            r.hotel_id = $1
            AND r.status IN ('confirmed', 'checked_in', 'checked_out')
            AND rd.cancelled IS NULL
    )
    SELECT
        mb.stay_date,
        mb.lead_days,
        COUNT(rr.room_night_id) AS booked_room_nights_count
    FROM
      matrix_base mb
    LEFT JOIN
      RelevantReservations rr
    ON rr.stay_date = mb.stay_date
      AND rr.calculated_lead_time_days >= mb.lead_days
      AND rr.hotel_id = $1
    GROUP BY
        mb.stay_date,
        mb.lead_days
    ORDER BY
        mb.stay_date,
        mb.lead_days;
  `;
  const values = [p_hotel_id, p_target_month_start_date];
  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return [];
    }
    return result.rows;
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
}

const selectSalesByPlan = async (requestId, hotelId, dateStart, dateEnd) => {
  const pool = getPool(requestId);
  const query = `
    -- Plan Sales
    SELECT
      COALESCE(pg.name, ph.name, 'プラン未設定') AS plan_name,
      ph.plan_type_category_id,
      ph.plan_package_category_id,
      COALESCE(ptc.name, '未設定') AS plan_type_category_name,
      COALESCE(ppc.name, '未設定') AS plan_package_category_name,
      rd.cancelled IS NOT NULL AND rd.billable = TRUE AS is_cancelled_billable,
      SUM(
        CASE 
          WHEN COALESCE(rd.is_accommodation, TRUE) = TRUE THEN 
            CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END
          ELSE 0 
        END
      ) AS accommodation_sales,
      SUM(
        CASE 
          WHEN COALESCE(rd.is_accommodation, TRUE) = FALSE THEN 
            CASE WHEN rd.plan_type = 'per_room' THEN rd.price ELSE rd.price * rd.number_of_people END
          ELSE 0 
        END
      ) AS other_sales,
      SUM(COALESCE(rr.accommodation_net_price, 0)) AS accommodation_sales_net,
      SUM(COALESCE(rr.other_net_price, 0)) AS other_sales_net
    FROM reservation_details rd
    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    LEFT JOIN plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
    LEFT JOIN plans_global pg ON rd.plans_global_id = pg.id
    LEFT JOIN plan_type_categories ptc ON ph.plan_type_category_id = ptc.id
    LEFT JOIN plan_package_categories ppc ON ph.plan_package_category_id = ppc.id
    LEFT JOIN (
        -- Subquery to aggregate prices per detail, grouping by tax_rate first to avoid precision loss
        SELECT
            hotel_id,
            reservation_details_id,
            SUM(accommodation_price) AS accommodation_price,
            SUM(other_price) AS other_price,
            SUM(accommodation_net_price) AS accommodation_net_price,
            SUM(other_net_price) AS other_net_price
        FROM (
            SELECT
                rd_inner.hotel_id,
                rd_inner.id AS reservation_details_id,
                (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END) as normalized_rate,
                SUM(CASE WHEN rd_inner.is_accommodation = TRUE AND (rr.sales_category = 'accommodation' OR rr.sales_category IS NULL) THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END) AS accommodation_price,
                SUM(CASE WHEN rd_inner.is_accommodation = FALSE OR rr.sales_category = 'other' THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END) AS other_price,
                FLOOR(SUM(CASE WHEN rd_inner.is_accommodation = TRUE AND (rr.sales_category = 'accommodation' OR rr.sales_category IS NULL) THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END)::numeric / (1 + (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END))::numeric) AS accommodation_net_price,
                FLOOR(SUM(CASE WHEN rd_inner.is_accommodation = FALSE OR rr.sales_category = 'other' THEN (CASE WHEN rd_inner.plan_type = 'per_room' THEN rr.price ELSE rr.price * rd_inner.number_of_people END) ELSE 0 END)::numeric / (1 + (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END))::numeric) AS other_net_price
            FROM
                reservation_details rd_inner
            LEFT JOIN reservation_rates rr ON rr.reservation_details_id = rd_inner.id AND rr.hotel_id = rd_inner.hotel_id
            GROUP BY
                rd_inner.hotel_id, rd_inner.id, (CASE WHEN rr.tax_rate > 1 THEN rr.tax_rate / 100.0 ELSE rr.tax_rate END)
        ) AS per_detail_tax
        GROUP BY
            hotel_id, reservation_details_id
    ) rr ON rd.id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
    WHERE rd.hotel_id = $1
      AND rd.date BETWEEN $2 AND $3
      AND rd.billable = TRUE
      AND r.status NOT IN ('hold', 'block')
      AND r.type <> 'employee'
    GROUP BY
      pg.name, ph.name, ph.plan_type_category_id, ph.plan_package_category_id, 
      ptc.name, ppc.name, is_cancelled_billable

    UNION ALL

    -- Addon Sales by Type and Tax
    SELECT
      'アドオン：' || CASE ra.addon_type
        WHEN 'breakfast' THEN '朝食'
        WHEN 'lunch' THEN '昼食'
        WHEN 'dinner' THEN '夕食'
        WHEN 'parking' THEN '駐車場'
        WHEN 'other' THEN 'その他'
        ELSE ra.addon_type
      END || '(' || (CASE WHEN COALESCE(ra.tax_rate, 0) > 1 THEN COALESCE(ra.tax_rate, 0) ELSE COALESCE(ra.tax_rate, 0) * 100 END)::integer::text || '%)' AS plan_name,
      NULL AS plan_type_category_id,
      NULL AS plan_package_category_id,
      'アドオン' AS plan_type_category_name,
      CASE ra.addon_type
        WHEN 'breakfast' THEN '朝食'
        WHEN 'lunch' THEN '昼食'
        WHEN 'dinner' THEN '夕食'
        WHEN 'parking' THEN '駐車場'
        WHEN 'other' THEN 'その他'
        ELSE ra.addon_type
      END AS plan_package_category_name,
      rd.cancelled IS NOT NULL AND rd.billable = TRUE AS is_cancelled_billable,
      SUM(CASE WHEN ra.sales_category = 'accommodation' OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END) AS accommodation_sales,
      SUM(CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END) AS other_sales,
      FLOOR(SUM(CASE WHEN ra.sales_category = 'accommodation' OR ra.sales_category IS NULL THEN ra.price * ra.quantity ELSE 0 END)::numeric / (1 + (CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END))::numeric) AS accommodation_sales_net,
      FLOOR(SUM(CASE WHEN ra.sales_category = 'other' THEN ra.price * ra.quantity ELSE 0 END)::numeric / (1 + (CASE WHEN ra.tax_rate > 1 THEN ra.tax_rate / 100.0 ELSE ra.tax_rate END))::numeric) AS other_sales_net
    FROM reservation_details rd
    JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
    JOIN reservation_addons ra ON rd.id = ra.reservation_detail_id AND rd.hotel_id = ra.hotel_id
    WHERE rd.hotel_id = $1
      AND rd.date BETWEEN $2 AND $3
      AND rd.billable = TRUE
      AND r.status NOT IN ('hold', 'block')
      AND r.type <> 'employee'
    GROUP BY
      ra.addon_type,
      ra.tax_rate,
      is_cancelled_billable
    HAVING SUM(ra.price * ra.quantity) <> 0

    ORDER BY
      plan_name, is_cancelled_billable;
  `;
  const values = [hotelId, dateStart, dateEnd];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectSalesByPlan:', err);
    throw new Error('Database error');
  }
};

const selectChannelSummary = async (requestId, hotelIds, startDate, endDate) => {
  const pool = getPool(requestId);
  const values = [hotelIds];
  let dateFilterClause = '';
  let dateFilterClauseSubquery = '';
  let dateParamIndex = 2;

  if (startDate && endDate) {
    dateFilterClause = ` AND rd.date BETWEEN $${dateParamIndex}::date AND $${dateParamIndex + 1}::date`;
    dateFilterClauseSubquery = ` AND rd_pt.date BETWEEN $${dateParamIndex}::date AND $${dateParamIndex + 1}::date`;
    values.push(startDate, endDate);
  } else if (startDate) {
    // Explicitly cast to TEXT to avoid type casting issues when startDate is a year
    dateFilterClause = ` AND TO_CHAR(rd.date, 'YYYY') = $${dateParamIndex}::text`;
    dateFilterClauseSubquery = ` AND TO_CHAR(rd_pt.date, 'YYYY') = $${dateParamIndex}::text`;
    values.push(startDate);
  }

  const query = `
    WITH hotel_reserved_dates AS (
      SELECT
        r.hotel_id,
        COUNT(rd.id) AS total_reserved_dates,
        COUNT(CASE WHEN r.type IN ('web', 'ota') THEN 1 END) AS web_count,
        COUNT(CASE WHEN r.type = 'default' THEN 1 END) AS direct_count
      FROM reservations r
      JOIN reservation_details rd ON r.hotel_id = rd.hotel_id AND r.id = rd.reservation_id
      WHERE r.hotel_id = ANY($1::int[])
      AND r.type <> 'employee' AND r.status NOT IN('hold','block') AND rd.cancelled IS NULL
      ${dateFilterClause}
      GROUP BY r.hotel_id
    )
    SELECT
      h.id AS hotel_id,
      h.name AS hotel_name,
      hrd.total_reserved_dates AS reserved_dates,
      (hrd.web_count * 100.0 / hrd.total_reserved_dates) AS web_percentage,
      (hrd.direct_count * 100.0 / hrd.total_reserved_dates) AS direct_percentage,
      COALESCE(
        json_object_agg(
          pt.payment_timing,
          pt.payment_timing_reserved_dates
        ) FILTER (WHERE pt.payment_timing IS NOT NULL),
        '{}'::json
      ) AS payment_timing
    FROM hotels h
    JOIN hotel_reserved_dates hrd ON h.id = hrd.hotel_id
    LEFT JOIN (
      SELECT
        r_pt.hotel_id,
        COALESCE(r_pt.payment_timing, 'not_set') AS payment_timing,
        COUNT(rd_pt.id) AS payment_timing_reserved_dates
      FROM reservations r_pt
      JOIN reservation_details rd_pt ON r_pt.hotel_id = rd_pt.hotel_id AND r_pt.id = rd_pt.reservation_id
      WHERE r_pt.hotel_id = ANY($1::int[])
      AND r_pt.type <> 'employee' AND r_pt.status NOT IN('hold','block') AND rd_pt.cancelled IS NULL
      ${dateFilterClauseSubquery}
      GROUP BY r_pt.hotel_id, COALESCE(r_pt.payment_timing, 'not_set')
    ) AS pt ON h.id = pt.hotel_id
    WHERE h.id = ANY($1::int[]) -- Ensure hotels are filtered by selected hotelIds
    GROUP BY h.id, h.name, hrd.total_reserved_dates, hrd.web_count, hrd.direct_count;
  `;

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error in selectChannelSummary:', err);
    throw new Error('Database error');
  }
};

const selectCheckInOutReport = async (requestId, hotelId, startDate, endDate) => {
  const pool = getPool(requestId);

  const checkinQuery = `
    WITH rd_checkins AS (
      SELECT
        rd.reservation_id,
        rd.hotel_id,
        rd.room_id,
        rd.number_of_people,
        rd.date AS check_in_date
      FROM reservation_details rd
      JOIN reservations r
        ON rd.reservation_id = r.id
      AND rd.hotel_id = r.hotel_id
      WHERE rd.hotel_id = $1
        AND r.status NOT IN ('cancelled','block','hold','provisory')
        AND rd.cancelled IS NULL
        AND rd.date BETWEEN $2 AND $3
        -- Edge Detection: It is a check-in if there is no active record for the previous day
        AND NOT EXISTS (
          SELECT 1 
          FROM reservation_details rd_prev 
          WHERE rd_prev.hotel_id = rd.hotel_id 
            AND rd_prev.reservation_id = rd.reservation_id 
            AND rd_prev.room_id = rd.room_id 
            AND rd_prev.date = (rd.date - 1) 
            AND rd_prev.cancelled IS NULL
        )
    ),

    -- one row per reservation + room + check_in_date
    people_per_room AS (
      SELECT
        reservation_id,
        room_id,
        hotel_id,
        check_in_date,
        MIN(number_of_people) AS number_of_people
      FROM rd_checkins
      GROUP BY reservation_id, room_id, hotel_id, check_in_date
    ),

    -- count distinct clients per reservation + room + check_in_date
    clients_per_room AS (
      SELECT
        rd.reservation_id,
        rc.hotel_id,
        rd.room_id, -- Need room_id to join back
        rd.date AS check_in_date,
        COUNT(DISTINCT CASE WHEN c.gender = 'male'   THEN rc.client_id END)       AS male_per_room,
        COUNT(DISTINCT CASE WHEN c.gender = 'female' THEN rc.client_id END)       AS female_per_room,
        COUNT(DISTINCT CASE WHEN COALESCE(c.gender,'') = '' THEN rc.client_id END) AS unspecified_per_room
      FROM reservation_clients rc
      JOIN reservation_details rd
        ON rc.reservation_details_id = rd.id
      AND rc.hotel_id = rd.hotel_id
      JOIN rd_checkins rdc -- Limit to the identified check-ins
        ON rdc.reservation_id = rd.reservation_id
        AND rdc.room_id = rd.room_id
        AND rdc.check_in_date = rd.date
      LEFT JOIN clients c ON c.id = rc.client_id
      WHERE rd.hotel_id = $1
      GROUP BY rd.reservation_id, rd.room_id, rc.hotel_id, rd.date
    )

    SELECT
      ppr.check_in_date::date                           AS date,
      h.name                                            AS hotel_name,
      COUNT(*)                                          AS checkin_room_count,     -- number of unique rooms checking in
      COALESCE(SUM(ppr.number_of_people),0)             AS total_checkins,         -- sum of MIN(number_of_people) per room
      COALESCE(SUM(cpr.male_per_room),0)                AS male_checkins,
      COALESCE(SUM(cpr.female_per_room),0)              AS female_checkins,
      COALESCE(SUM(cpr.unspecified_per_room),0)         AS unspecified_checkins
    FROM people_per_room ppr
    LEFT JOIN clients_per_room cpr
      ON cpr.reservation_id = ppr.reservation_id
    AND cpr.room_id = ppr.room_id
    AND cpr.hotel_id = ppr.hotel_id
    AND cpr.check_in_date = ppr.check_in_date
    LEFT JOIN hotels h
      ON ppr.hotel_id = h.id
    GROUP BY ppr.check_in_date::date, h.name
    ORDER BY ppr.check_in_date::date;
  `;

  const checkoutQuery = `
    WITH rd_checkouts AS (
      SELECT
        rd.reservation_id,
        rd.hotel_id,
        rd.room_id,
        rd.number_of_people,
        (rd.date + 1) AS check_out_date -- The checkout happens the morning AFTER the last night
      FROM reservation_details rd
      JOIN reservations r
        ON rd.reservation_id = r.id
      AND rd.hotel_id = r.hotel_id
      WHERE rd.hotel_id = $1
        AND r.status NOT IN ('cancelled','block','hold','provisory')
        AND rd.cancelled IS NULL
        AND (rd.date + 1) BETWEEN $2 AND $3
        -- Edge Detection: It is a check-out if there is no active record for the next day
        AND NOT EXISTS (
          SELECT 1 
          FROM reservation_details rd_next 
          WHERE rd_next.hotel_id = rd.hotel_id 
            AND rd_next.reservation_id = rd.reservation_id 
            AND rd_next.room_id = rd.room_id 
            AND rd_next.date = (rd.date + 1) 
            AND rd_next.cancelled IS NULL
        )
    ),

    -- one row per reservation + room + check_out_date
    people_per_room AS (
      SELECT
        reservation_id,
        room_id,
        hotel_id,
        check_out_date,
        MIN(number_of_people) AS number_of_people
      FROM rd_checkouts
      GROUP BY reservation_id, room_id, hotel_id, check_out_date
    ),

    -- gender counts per reservation + room + check_out_date
    clients_per_room AS (
      SELECT
        rd.reservation_id,
        rc.hotel_id,
        rd.room_id,
        (rd.date + 1) AS check_out_date,
        COUNT(DISTINCT CASE WHEN c.gender = 'male'   THEN rc.client_id END)       AS male_per_room,
        COUNT(DISTINCT CASE WHEN c.gender = 'female' THEN rc.client_id END)       AS female_per_room,
        COUNT(DISTINCT CASE WHEN COALESCE(c.gender,'') = '' THEN rc.client_id END) AS unspecified_per_room
      FROM reservation_clients rc
      JOIN reservation_details rd
        ON rc.reservation_details_id = rd.id
      AND rc.hotel_id = rd.hotel_id
      JOIN rd_checkouts rdc -- Limit to the identified check-outs
        ON rdc.reservation_id = rd.reservation_id
        AND rdc.room_id = rd.room_id
        AND rdc.check_out_date = (rd.date + 1)
      LEFT JOIN clients c ON c.id = rc.client_id
      WHERE rd.hotel_id = $1
      GROUP BY rd.reservation_id, rd.room_id, rc.hotel_id, rd.date
    )

    SELECT
      ppr.check_out_date::date                          AS date,
      h.name                                            AS hotel_name,
      COUNT(*)                                          AS checkout_room_count,     -- unique rooms checking out
      COALESCE(SUM(ppr.number_of_people),0)             AS total_checkouts,         -- sum of MIN(number_of_people) per room
      COALESCE(SUM(cpr.male_per_room),0)                AS male_checkouts,
      COALESCE(SUM(cpr.female_per_room),0)              AS female_checkouts,
      COALESCE(SUM(cpr.unspecified_per_room),0)         AS unspecified_checkouts
    FROM people_per_room ppr
    LEFT JOIN clients_per_room cpr
      ON cpr.reservation_id = ppr.reservation_id
    AND cpr.room_id = ppr.room_id
    AND cpr.hotel_id = ppr.hotel_id
    AND cpr.check_out_date = ppr.check_out_date
    LEFT JOIN hotels h
      ON ppr.hotel_id = h.id
    GROUP BY ppr.check_out_date::date, h.name
    ORDER BY ppr.check_out_date::date;
  `;

  const values = [hotelId, startDate, endDate];

  try {
    const [checkinResult, checkoutResult] = await Promise.all([
      pool.query(checkinQuery, values),
      pool.query(checkoutQuery, values)
    ]);

    const combinedResults = {};

    // Process check-in results
    checkinResult.rows.forEach(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      combinedResults[dateKey] = {
        date: row.date,
        hotel_name: row.hotel_name,
        total_checkins: row.total_checkins || 0,
        checkin_room_count: row.checkin_room_count || 0,
        male_checkins: row.male_checkins || 0,
        female_checkins: row.female_checkins || 0,
        unspecified_checkins: row.unspecified_checkins || 0,
        total_checkouts: 0,
        checkout_room_count: 0,
        male_checkouts: 0,
        female_checkouts: 0,
        unspecified_checkouts: 0,
      };
    });

    // Process check-out results
    checkoutResult.rows.forEach(row => {
      const dateKey = row.date.toISOString().split('T')[0];
      if (!combinedResults[dateKey]) {
        combinedResults[dateKey] = {
          date: row.date,
          hotel_name: row.hotel_name,
          total_checkins: 0,
          checkin_room_count: 0,
          male_checkins: 0,
          female_checkins: 0,
          unspecified_checkins: 0,
        };
      }
      combinedResults[dateKey].total_checkouts = row.total_checkouts || 0;
      combinedResults[dateKey].checkout_room_count = row.checkout_room_count || 0;
      combinedResults[dateKey].male_checkouts = row.male_checkouts || 0;
      combinedResults[dateKey].female_checkouts = row.female_checkouts || 0;
      combinedResults[dateKey].unspecified_checkouts = row.unspecified_checkouts || 0;
    });

    // Convert to array and sort by date
    const finalResult = Object.values(combinedResults).sort((a, b) => a.date - b.date);

    return finalResult;
  } catch (err) {
    console.error('Error retrieving check-in/out report data:', err);
    throw new Error('Database error');
  }
};

const selectBatchReservationListView = async (requestId, hotelIds, dateStart, dateEnd, searchType = 'stay_period') => {
  try {
    const pool = getPool(requestId);

    const query = `
      WITH 
      filtered_reservations AS (
        SELECT 
          r.id, 
          r.hotel_id, 
          r.status, 
          r.reservation_client_id, 
          r.check_in, 
          r.check_out, 
          r.number_of_people,
          r.created_at
        FROM reservations r
        WHERE r.hotel_id = ANY($1)
        AND r.status <> 'block'
        ${searchType === 'check_in' ? "AND r.check_in >= $2::date AND r.check_in <= $3::date" :
        searchType === 'created_at' ? "AND r.created_at >= $2::date AND r.created_at <= ($3::date + interval '1 day' - interval '1 second')" :
          /* stay_period */ "AND r.check_out > $2::date AND r.check_in <= $3::date"
      }
      ),
      filtered_details_base AS (
        SELECT 
          rd.id as rd_id,
          rd.reservation_id,
          rd.hotel_id,
          rd.plan_type,
          rd.price,
          rd.number_of_people,
          rd.billable
        FROM reservation_details rd
        WHERE rd.hotel_id = ANY($1)
        AND rd.reservation_id IN (SELECT id FROM filtered_reservations)
        AND rd.billable = TRUE
      ),
      ra_agg AS (
        SELECT 
          ra.reservation_detail_id,
          SUM(COALESCE(ra.quantity,0) * COALESCE(ra.price,0)) as addon_sum
        FROM reservation_addons ra
        WHERE ra.hotel_id = ANY($1)
        AND ra.reservation_detail_id IN (SELECT rd_id FROM filtered_details_base)
        GROUP BY ra.reservation_detail_id
      ),
      rd_agg AS (
        SELECT 
          rd.hotel_id,
          rd.reservation_id,
          COALESCE(MIN(rr.sales_category), 'accommodation') AS plan_sales_category,
          SUM(
            CASE
              WHEN rd.plan_type = 'per_room'
              THEN rd.price
              ELSE rd.price * rd.number_of_people
            END
          ) AS plan_price,
          SUM(COALESCE(ra.addon_sum, 0)) AS addon_price
        FROM filtered_details_base rd
        LEFT JOIN ra_agg ra ON rd.rd_id = ra.reservation_detail_id
        LEFT JOIN reservation_rates rr ON rd.rd_id = rr.reservation_details_id AND rd.hotel_id = rr.hotel_id
        GROUP BY rd.hotel_id, rd.reservation_id
      ),
      rc_json_agg AS (
        SELECT 
          rc_sq.reservation_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'client_id', c.id,
              'name', c.name,
              'name_kana', c.name_kana,
              'name_kanji', c.name_kanji,
              'email', c.email,
              'phone', c.phone,
              'gender', c.gender
            )
          ) AS clients_json
        FROM (
          SELECT DISTINCT fd.reservation_id, rc_inner.client_id
          FROM reservation_clients rc_inner
          JOIN filtered_details_base fd ON rc_inner.reservation_details_id = fd.rd_id AND rc_inner.hotel_id = fd.hotel_id
          WHERE rc_inner.hotel_id = ANY($1)
        ) rc_sq
        JOIN clients c ON rc_sq.client_id = c.id
        GROUP BY rc_sq.reservation_id
      ),
      rp_agg AS (
        SELECT 
          rp.reservation_id,
          SUM(rp.value) as payment
        FROM reservation_payments rp
        WHERE rp.reservation_id IN (SELECT id FROM filtered_reservations)
        GROUP BY rp.reservation_id
      ),
      rpc_json_agg AS (
        SELECT 
          rpc_sq.reservation_id,
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
        FROM (
          SELECT DISTINCT rp_inner.reservation_id, rp_inner.client_id
          FROM reservation_payments rp_inner
          WHERE rp_inner.reservation_id IN (SELECT id FROM filtered_reservations)
        ) rpc_sq
        JOIN clients c ON rpc_sq.client_id = c.id
        GROUP BY rpc_sq.reservation_id
      )
      SELECT
        res.hotel_id,
        h.formal_name,
        res.id,
        res.status,
        res.reservation_client_id AS booker_id,
        COALESCE(booker.name_kanji, booker.name_kana, booker.name) AS booker_name,
        booker.name_kana AS booker_name_kana,
        booker.name_kanji AS booker_name_kanji,
        res.check_in,
        res.check_out,
        res.check_out - res.check_in AS number_of_nights,
        res.number_of_people,
        COALESCE(rd.plan_price, 0) as plan_price,
        COALESCE(rd.addon_price, 0) as addon_price,
        (COALESCE(rd.plan_price, 0) + COALESCE(rd.addon_price, 0)) AS price,
        COALESCE(rp.payment, 0) as payment,
        rd.plan_sales_category,
        rc.clients_json::TEXT as clients_json,
        rpc.clients_json::TEXT as payers_json
      FROM filtered_reservations res
      JOIN hotels h ON res.hotel_id = h.id
      JOIN clients booker ON res.reservation_client_id = booker.id
      LEFT JOIN rd_agg rd ON res.id = rd.reservation_id AND res.hotel_id = rd.hotel_id
      LEFT JOIN rc_json_agg rc ON res.id = rc.reservation_id
      LEFT JOIN rp_agg rp ON res.id = rp.reservation_id
      LEFT JOIN rpc_json_agg rpc ON res.id = rpc.reservation_id
      ORDER BY res.check_in, res.id;
    `;
    const values = [hotelIds, dateStart, dateEnd];

    console.log(`[DEBUG] [Request ${requestId}] Executing selectBatchReservationListView`, {
      hotelIds,
      dateStart,
      dateEnd,
      searchType
    });
    const startTime = Date.now();

    const result = await pool.query(query, values);

    const endTime = Date.now();
    console.log(`[DEBUG] [Request ${requestId}] selectBatchReservationListView completed in ${endTime - startTime}ms. Rows: ${result.rows.length}`);

    return result.rows;
  } catch (err) {
    logger.error(`[Request ${requestId}] Error in selectBatchReservationListView: ${err.message}`, {
      stack: err.stack,
      parameters: { hotelIds, dateStart, dateEnd, searchType }
    });
    throw new Error(`Database error: ${err.message}`);
  }
};


module.exports = {
  selectCountReservation,
  selectCountReservationDetailsPlans,
  selectCountReservationDetailsAddons,
  selectReservationListView,
  selectReservationsInventory,
  selectAllRoomTypesInventory,
  selectActiveReservationsChange,
  selectMonthlyReservationEvolution,
  selectSalesByPlan,
  selectChannelSummary,
  selectCheckInOutReport,
  selectBatchReservationListView,
};
