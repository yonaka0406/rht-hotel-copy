const pool = require('../config/database');

// GET
const selectCountReservation = async (hotelId, dateStart, dateEnd) => {
  const query = `
    SELECT 
      reservation_details.date
      ,roomTotal.roomCount
      ,COUNT(reservation_details.room_id) as room_count
      ,SUM(reservation_details.number_of_people) AS people_sum
    FROM
      reservation_details
      ,(
        SELECT hotel_id, COUNT(*) as roomCount
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
      ,roomTotal.roomCount
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

module.exports = {
  selectCountReservation,
};
