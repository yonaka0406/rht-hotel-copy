const db = require('../../config/database');

const replacements = {
  '株式会社': '㈱',
  '合同会社': '(同)',
  '有限会社': '(有)',
  '合名会社': '(名)',
  '合資会社': '(資)',
  '一般社団法人': '(一社)',
  '一般財団法人': '(一財)',
  '公益社団法人': '(公社)',
  '公益財団法人': '(公財)',
  '学校法人': '(学)',
  '医療法人': '(医)',
  '社会福祉法人': '(福)',
  '特定非営利活動法人': '(特非)',
  'NPO法人': '(NPO)',
  '宗教法人': '(宗)'
};

const formatClientName = (name) => {
  if (!name) return null;

  let result = name;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  return result;
};

const selectReservationsForGoogle = async (requestId, hotelId, startDate, endDate) => {

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    console.error("[selectReservationsForGoogle] Skip querying the view in local/test environments");
    // Skip querying the view in local/test environments
    return [];
  }
  const pool = (requestId && requestId.startsWith('job-')) ? db.getProdPool() : db.getPool(requestId);
  const query = `
      SELECT
          r.hotel_id,
          h.formal_name AS hotel_name,
          COALESCE(v.reservation_detail_id, NULL) AS reservation_detail_id,
          series::date AS date,
          COALESCE(v.room_type_name, NULL) AS room_type_name,
          r.room_number,
          COALESCE(v.client_name, NULL) AS client_name,
          COALESCE(v.plan_name, NULL) AS plan_name,
          COALESCE(v.status, NULL) AS status,
          COALESCE(v.type, NULL) AS type,
          COALESCE(v.agent, NULL) AS agent
      FROM
          rooms r
      JOIN
          hotels h ON r.hotel_id = h.id
      CROSS JOIN
          generate_series($2::date, $3::date, '1 day'::interval) AS series
      LEFT JOIN
          vw_booking_for_google v
          ON r.hotel_id = v.hotel_id
          AND r.id = v.room_id
          AND series::date = v.date
      WHERE
          r.hotel_id = $1
      ORDER BY
          series::date, r.room_number;
  `;
  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    // Apply client name formatting to each row
    return result.rows.map(row => ({
      ...row,
      client_name: formatClientName(row.client_name)
    }));
  } catch (err) {
    console.error('Error retrieving data:', err);
    throw new Error('Database error');
  }
};



const selectParkingReservationsForGoogle = async (requestId, hotelId, startDate, endDate) => {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'development') {
    return [];
  }

  const pool = (requestId && requestId.startsWith('job-')) ? db.getProdPool() : db.getPool(requestId);

  const query = `
      SELECT
          pl.hotel_id,
          h.formal_name AS hotel_name,
          rp.reservation_details_id,
          series::date AS date,
          vc.name AS vehicle_category_name,
          pl.name AS parking_lot_name,
          ps.spot_number,
          COALESCE(c.name_kanji, c.name_kana, c.name)  AS client_name,
          r.status AS reservation_status,
          r.type AS reservation_type,
          r.agent AS agent,
          rp.status AS parking_status,
          ra.addon_name,
          rp.comment
      FROM
          parking_spots ps
      JOIN
          parking_lots pl ON ps.parking_lot_id = pl.id
      JOIN
          hotels h ON pl.hotel_id = h.id
      CROSS JOIN
          generate_series($2::date, $3::date, '1 day'::interval) AS series
      LEFT JOIN
          reservation_parking rp
          ON ps.id = rp.parking_spot_id
          AND pl.hotel_id = rp.hotel_id         -- FIXED: use pl.hotel_id
          AND series::date = rp.date
          AND rp.cancelled IS NULL
      LEFT JOIN
          reservation_details rd
          ON rd.id = rp.reservation_details_id
          AND rd.hotel_id = rp.hotel_id
      LEFT JOIN
          reservations r
          ON r.id = rd.reservation_id
          AND r.hotel_id = rd.hotel_id
      LEFT JOIN
          clients c
          ON c.id = r.reservation_client_id
      LEFT JOIN
          vehicle_categories vc
          ON rp.vehicle_category_id = vc.id
      LEFT JOIN
          reservation_addons ra
          ON ra.id = rp.reservation_addon_id
          AND ra.hotel_id = rp.hotel_id
      WHERE
          pl.hotel_id = $1
      ORDER BY
          series::date, ps.spot_number;
  `;

  const values = [hotelId, startDate, endDate];
  try {
    const result = await pool.query(query, values);
    return result.rows.map(row => ({
      ...row,
      client_name: formatClientName(row.client_name)
    }));
  } catch (err) {
    console.error('Error retrieving parking data:', err);
    throw new Error('Database error');
  }
};

module.exports = {
  selectReservationsForGoogle,
  selectParkingReservationsForGoogle,
};