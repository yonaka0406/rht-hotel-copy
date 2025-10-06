const { getPool } = require('../../config/database');

async function findClientSuggestionsByHotelAndTerm(requestId, hotelId, searchTerm) {
  const pool = getPool(requestId);
  const sql = `
    SELECT DISTINCT c.id AS client_id, c.name, c.name_kana, c.name_kanji, c.email, c.phone,
           r.id AS reservation_id, r.check_in, r.check_out, r.number_of_people
    FROM clients c
    JOIN reservations r ON r.reservation_client_id = c.id
    WHERE r.hotel_id = $1
      AND (
        c.name ILIKE $2 OR
        c.name_kana ILIKE $2 OR
        c.name_kanji ILIKE $2 OR
        c.email ILIKE $2 OR
        c.phone ILIKE $2 OR
        r.ota_reservation_id ILIKE $2
      )
    UNION
    SELECT DISTINCT c.id AS client_id, c.name, c.name_kana, c.name_kanji, c.email, c.phone,
           r.id AS reservation_id, r.check_in, r.check_out, r.number_of_people
    FROM clients c
    JOIN reservation_payments rp ON rp.client_id = c.id
    JOIN reservations r ON rp.reservation_id = r.id
    WHERE rp.hotel_id = $1
      AND (
        c.name ILIKE $2 OR
        c.name_kana ILIKE $2 OR
        c.name_kanji ILIKE $2 OR
        c.email ILIKE $2 OR
        c.phone ILIKE $2 OR
        r.ota_reservation_id ILIKE $2
      )
    UNION
    SELECT DISTINCT c.id AS client_id, c.name, c.name_kana, c.name_kanji, c.email, c.phone,
           r.id AS reservation_id, r.check_in, r.check_out, r.number_of_people
    FROM clients c
    JOIN reservation_clients rc ON rc.client_id = c.id
    JOIN reservation_details rd ON rc.reservation_details_id = rd.id
    JOIN reservations r ON rd.reservation_id = r.id
    WHERE rc.hotel_id = $1
      AND (
        c.name ILIKE $2 OR
        c.name_kana ILIKE $2 OR
        c.name_kanji ILIKE $2 OR
        c.email ILIKE $2 OR
        c.phone ILIKE $2 OR
        r.ota_reservation_id ILIKE $2
      )
  `;
  const values = [hotelId, `%${searchTerm}%`];
  //console.log('[search.js] Executing suggestions query with values:', values);
  const { rows } = await pool.query(sql, values);
  //console.log('[search.js] Raw DB rows:', rows);

  // Sort by check_in DESC (more recent first)
  const sortedRows = rows.sort((a, b) => new Date(b.check_in) - new Date(a.check_in));
  //console.log('[search.js] Sorted rows by check_in DESC:', sortedRows);

  const suggestions = sortedRows.map(row => ({
    client_id: row.client_id,
    name: row.name,
    name_kana: row.name_kana,
    name_kanji: row.name_kanji,
    email: row.email,
    phone: row.phone,
    reservation_id: row.reservation_id,
    check_in: row.check_in,
    check_out: row.check_out,
    number_of_people: row.number_of_people,
  }));
  //console.log('[search.js] Final mapped suggestions:', suggestions);
  return suggestions;
}

module.exports = {
  findClientSuggestionsByHotelAndTerm,
};