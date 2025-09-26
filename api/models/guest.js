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
      SELECT DISTINCT ON (r.id)
        r.id,
        r.check_in,
        r.check_out,
        rd.number_of_people, -- Use number_of_people from reservation_details
        COALESCE(ph.name, pg.name) AS plan_name, -- Get plan_name from plans_hotel or plans_global
        r.comment,
        h.formal_name AS hotel_name,
        rooms.id AS room_id,
        rooms.room_number,
        rooms.smoking, -- Add smoking status
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
        AND r.status = 'confirmed' -- Only confirmed reservations
        AND r.check_in = $2 -- Only check-ins on the specified date
      ORDER BY
        r.id, rooms.room_number, r.check_in;
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
