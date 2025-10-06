const { getPool } = require('../../config/database');

const getAllHotels = async (requestId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT 
      hotels.* 
    FROM hotels 
    ORDER BY sort_order ASC, id ASC
  `;

  try {
    const result = await client.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all hotels:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};
const getHotelByID = async (requestId, id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = 'SELECT hotels.* FROM hotels WHERE hotels.id = $1';
  const values = [id];

  try {
    const result = await client.query(query, values);
    return result.rows[0]; // Return the first user found (or null if none)
  } catch (err) {
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};
const getAllHotelSiteController = async (requestId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT sc_user_info.* 
    FROM sc_user_info 
    ORDER BY hotel_id
  `;
  
  try {
    const result = await client.query(query);
    return result.rows;
  } catch (err) {
    console.error(`[${requestId}] [getAllHotelSiteController] Error executing query:`, {
      error: err.message,
      code: err.code,
      stack: err.stack,
      query: query
    });
    throw new Error(`Database error: ${err.message}`);
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};
const getHotelSiteController = async (requestId, id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT sc_user_info.* 
    FROM sc_user_info 
    WHERE sc_user_info.hotel_id = $1
  `;
  const values = [id];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const selectBlockedRooms = async (requestId, hotelId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT r.*, r.check_in as start_date, (r.check_out - INTERVAL '1 day') as end_date, d.room_id, d.room_type_name, d.room_number, h.name
    FROM 
      hotels h,
      reservations r
      ,(
        SELECT 
          rd.hotel_id, rd.reservation_id, rd.room_id, room_types.name as room_type_name, rooms.room_number
        FROM reservation_details rd, rooms, room_types
        WHERE 
          rd.hotel_id = rooms.hotel_id AND rd.room_id = rooms.id AND rooms.hotel_id = room_types.hotel_id AND rooms.room_type_id = room_types.id          
        GROUP BY rd.hotel_id, rd.reservation_id, rd.room_id, room_types.name, rooms.room_number
      ) d
    WHERE 
      r.status = 'block'
      AND r.hotel_id = $1
      AND r.hotel_id = d.hotel_id
      AND r.id = d.reservation_id
      AND r.hotel_id = h.id
      ORDER BY 
        r.check_out DESC
        ,d.room_number ASC
  `;

  try {
    const result = await client.query(query, [hotelId]);    
    return result.rows;
  } catch (err) {
    console.error('Error retrieving blocked rooms:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const getAllHotelRoomTypesById = async (requestId, id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = 'SELECT * FROM room_types WHERE hotel_id = $1 ORDER By name';
  const values = [id];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error finding by hotel id:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};
const getAllRoomsByHotelId = async (requestId, id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = 'SELECT hotels.*, room_types.id as room_type_id, room_types.name as room_type_name, room_types.description as room_type_description, rooms.id as room_id, rooms.floor as room_floor, rooms.room_number, rooms.capacity as room_capacity, rooms.for_sale as room_for_sale_idc, rooms.smoking as room_smoking_idc FROM hotels JOIN room_types ON hotels.id = room_types.hotel_id LEFT JOIN rooms ON room_types.id = rooms.room_type_id WHERE hotels.id = $1 ORDER BY room_types.id, rooms.floor, rooms.room_number ASC';
  const values = [id];

  try {
    const result = await client.query(query, values);
    return result.rows; // Return all
  } catch (err) {
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const getPlanExclusionSettings = async (requestId, hotel_id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  try {
    const allGlobalPlansQuery = 'SELECT id, name FROM plans_global ORDER BY id;';
    const allGlobalPlansResult = await client.query(allGlobalPlansQuery);

    const excludedPlansQuery = 'SELECT global_plan_id FROM hotel_plan_exclusions WHERE hotel_id = $1;';
    const excludedPlansResult = await client.query(excludedPlansQuery, [hotel_id]);

    const excludedPlanIds = excludedPlansResult.rows.map(row => row.global_plan_id);

    return {
      all_global_plans: allGlobalPlansResult.rows,
      excluded_plan_ids: excludedPlanIds,
    };
  } catch (err) {
    console.error('Error retrieving plan exclusion settings:', err);
    throw new Error('Database error retrieving plan exclusion settings');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const getRoomTypeById = async (requestId, roomTypeId, hotelId = null, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  let query = 'SELECT * FROM room_types WHERE id = $1';
  let values = [roomTypeId];
  if (hotelId !== null) {
    query += ' AND hotel_id = $2';
    values.push(hotelId);
  }
  try {
    const result = await client.query(query, values);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error finding room type by id:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const getRoomAssignmentOrder = async (requestId, hotelId, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT
      r.id as room_id,
      r.room_number,
      r.floor,
      rt.name as room_type_name,
      r.assignment_priority,
      r.capacity,
      r.smoking,
      r.for_sale,
      r.room_type_id
    FROM rooms r
    JOIN room_types rt ON r.room_type_id = rt.id AND r.hotel_id = rt.hotel_id
    WHERE r.hotel_id = $1
    ORDER BY r.assignment_priority ASC NULLS LAST, r.floor, r.room_number;
  `;
  const values = [hotelId];

  try {
    const result = await client.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error getting room assignment order:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

const getVehicleCategoryCapacity = async (requestId, vehicle_category_id, dbClient = null) => {
  const client = dbClient || await getPool(requestId).connect();
  const query = `
    SELECT capacity_units_required FROM vehicle_categories WHERE id = $1;
  `;
  const values = [vehicle_category_id];
  try {
    const result = await client.query(query, values);
    return result.rows[0]?.capacity_units_required || 0;
  } catch (err) {
    console.error('Error fetching vehicle category capacity:', err);
    throw new Error('Database error');
  } finally {
    if (!dbClient) {
      client.release();
    }
  }
};

module.exports = {
  getAllHotels,
  getHotelByID,
  getAllHotelSiteController,
  getHotelSiteController,
  selectBlockedRooms,
  getAllHotelRoomTypesById,
  getAllRoomsByHotelId,
  getPlanExclusionSettings,
  getRoomTypeById,
  getRoomAssignmentOrder,
  getVehicleCategoryCapacity,
};
