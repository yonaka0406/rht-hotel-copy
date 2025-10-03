let getPool = require('../config/database').getPool;

const getPotentialDoubleBookings = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    WITH dup_groups AS (
        SELECT 
            hotel_id,
            room_id,
            date
        FROM reservation_details
        WHERE cancelled IS NULL
        GROUP BY hotel_id, room_id, date
        HAVING COUNT(*) > 1
    )
    SELECT rd.id,
           rd.hotel_id,
           rd.room_id,
           rd.date
    FROM reservation_details rd
    JOIN dup_groups dg
      ON rd.hotel_id = dg.hotel_id
     AND rd.room_id = dg.room_id
     AND rd.date = dg.date
    WHERE rd.cancelled IS NULL
    ORDER BY rd.date, rd.room_id, rd.hotel_id, rd.id;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (err) {
    console.error('Error retrieving potential double bookings:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  getPotentialDoubleBookings,
};