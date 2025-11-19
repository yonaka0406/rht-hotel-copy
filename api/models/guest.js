const { getPool } = require('../config/database');

const getGuestListDetails = async (requestId, hotelId, reservationId) => {
    const pool = getPool(requestId);
    const query = `
        SELECT
            r.id AS reservation_id,
            r.check_in,
            r.check_out,
            r.comment,
            b.name AS booker_name,
            -- alternative_name placeholder
            '' AS alternative_name,
            (
                SELECT array_agg(ps.spot_number)
                FROM reservation_parking rps
                JOIN reservation_details rd ON rps.reservation_details_id = rd.id AND rps.hotel_id = rd.hotel_id
                JOIN parking_spots ps ON rps.parking_spot_id = ps.id
                WHERE rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            ) AS parking_lot_names,
            (
                SELECT SUM(rp.value)
                FROM reservation_payments rp
                WHERE rp.reservation_id = r.id
            ) AS payment_total,
            (
                SELECT array_agg(DISTINCT rm.room_number)
                FROM reservation_details rd_rooms
                JOIN rooms rm ON rd_rooms.room_id = rm.id
                WHERE rd_rooms.reservation_id = r.id
            ) AS room_numbers,
            (
                SELECT array_agg(DISTINCT p.name)
                FROM reservation_details rd_plans
                LEFT JOIN plans_hotel p ON rd_plans.plans_hotel_id = p.id
                WHERE rd_plans.reservation_id = r.id
            ) AS plan_names,
            (
                SELECT json_agg(
                    json_build_object(
                        'name', c.name,
                        'name_kana', c.name_kana,
                        'name_kanji', c.name_kanji,
                        'phone', c.phone
                    )
                )
                FROM reservation_clients rc
                JOIN reservation_details rd ON rc.reservation_details_id = rd.id AND rc.hotel_id = rd.hotel_id
                JOIN clients c ON rc.client_id = c.id
                WHERE rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
            ) AS guests
        FROM
            reservations r
        JOIN
            clients b ON r.reservation_client_id = b.id
        WHERE
            r.hotel_id = $1 AND r.id = $2;
    `;
    const values = [hotelId, reservationId];

    try {
        const result = await pool.query(query, values);
        return result.rows[0];
    } catch (err) {
        console.error('Error retrieving guest list details:', err);
        throw new Error('Database error');
    }
};

const selectCheckInReservationsForGuestList = async (requestId, hotelId, date) => {
    const pool = getPool(requestId);
    const query = `
      WITH date_groups AS (
        SELECT
          rd.reservation_id,
          rd.room_id,
          rd.date,
          (rd.date::date - (ROW_NUMBER() OVER (PARTITION BY rd.reservation_id, rd.room_id ORDER BY rd.date))::int) as island_group
        FROM reservation_details rd
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        WHERE rd.hotel_id = $1
          AND rd.cancelled IS NULL
          AND $2 >= r.check_in AND $2 < r.check_out
      ),
      room_stays AS (
        SELECT
          reservation_id,
          room_id,
          island_group,
          MIN(date) as first_stay_date,
          MAX(date) as last_stay_date
        FROM
          date_groups
        GROUP BY
          reservation_id, room_id, island_group
      )
      SELECT DISTINCT ON (r.id, rooms.room_number, rd.room_id)
        r.id,
        rs.first_stay_date AS room_check_in,
        rs.last_stay_date AS room_last_stay,
        rd.number_of_people, -- Use number_of_people from reservation_details
        (
            SELECT array_agg(DISTINCT COALESCE(ph_sub.name, pg_sub.name))
            FROM reservation_details rd_sub
            LEFT JOIN plans_hotel ph_sub ON rd_sub.plans_hotel_id = ph_sub.id AND rd_sub.hotel_id = ph_sub.hotel_id
            LEFT JOIN plans_global pg_sub ON rd_sub.plans_global_id = pg_sub.id
            WHERE rd_sub.reservation_id = r.id AND rd_sub.hotel_id = r.hotel_id AND rd_sub.room_id = rd.room_id
        ) AS assigned_plan_names,
        r.comment,
        h.formal_name AS hotel_name,
        rooms.id AS room_id,
        rooms.room_number,
        rooms.smoking,
        rooms.has_wet_area,
        rc_json.clients_json, -- Use the clients_json from the subquery
        b.name AS booker_name,
        b.name_kana AS booker_name_kana,
        b.name_kanji AS booker_name_kanji,
        r.payment_timing
      FROM
        reservations r
      JOIN
        clients b ON r.reservation_client_id = b.id
      JOIN
        hotels h ON r.hotel_id = h.id
      JOIN
        reservation_details rd ON r.id = rd.reservation_id AND r.hotel_id = rd.hotel_id
      JOIN
        rooms ON rd.room_id = rooms.id AND rd.hotel_id = rooms.hotel_id
      JOIN
        room_stays rs ON r.id = rs.reservation_id AND rd.room_id = rs.room_id
      LEFT JOIN
        plans_hotel ph ON rd.plans_hotel_id = ph.id AND rd.hotel_id = ph.hotel_id
      LEFT JOIN
        plans_global pg ON rd.plans_global_id = pg.id
      LEFT JOIN ( -- Subquery to get clients_json for each reservation_detail
          SELECT
              rc.reservation_details_id,
              JSON_AGG(
                  JSON_BUILD_OBJECT(
                      'client_id', c.id,
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
          FROM
              reservation_clients rc
          JOIN
              clients c ON rc.client_id = c.id
          LEFT JOIN (
              SELECT *,
                     ROW_NUMBER() OVER(PARTITION BY client_id ORDER BY created_at ASC) as rn
              FROM addresses
          ) ad ON ad.client_id = c.id AND ad.rn = 1        
          GROUP BY
              rc.reservation_details_id
      ) AS rc_json ON rd.id = rc_json.reservation_details_id
      WHERE
        r.hotel_id = $1
        AND r.status NOT IN ('hold', 'provisory', 'cancelled')
        AND rs.first_stay_date = $2 -- Check against the room's actual first day
        AND rd.date = $2 -- Ensure we are getting the detail for the check-in day
      ORDER BY
        r.id, rooms.room_number, rd.room_id, r.check_in;
    `;
    const values = [hotelId, date];
  
    try {
      const result = await pool.query(query, values);
      return result.rows;
    } catch (err) {
      console.error('Error retrieving check-in reservations for guest list:', err);
      throw new Error('Database error');
    }
  };

module.exports = {
    getGuestListDetails,
    selectCheckInReservationsForGuestList,
};
