const { getPool } = require('../../config/database');
const format = require('pg-format');
const logger = require('../../config/logger');

const getAllHotels = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT
        h.*,
        COALESCE(room_counts.non_staff_room_count, 0)::integer AS non_staff_room_count,
        COALESCE(room_counts.staff_room_count, 0)::integer AS staff_room_count
    FROM
        hotels h
    LEFT JOIN (
        SELECT
            hotel_id,
            SUM(CASE WHEN is_staff_room = FALSE THEN 1 ELSE 0 END) AS non_staff_room_count,
            SUM(CASE WHEN is_staff_room = TRUE THEN 1 ELSE 0 END) AS staff_room_count
        FROM
            rooms
        GROUP BY
            hotel_id
    ) AS room_counts ON h.id = room_counts.hotel_id
    ORDER BY
        h.sort_order ASC, h.id ASC
  `;

  try {
    const result = await pool.query(query);
    return result.rows; // Return all
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving all hotels:`, err);
    throw new Error('Database error');
  }
};
const getHotelByID = async (requestId, id, dbClient = null) => {
  const selectedResource = dbClient || getPool(requestId);
  const query = 'SELECT hotels.* FROM hotels WHERE hotels.id = $1';
  const values = [id];

  try {
    const result = await selectedResource.query(query, values);
    return result.rows[0]; // Return the first user found (or null if none)
  } catch (err) {
    logger.error(`[${requestId}] Error finding hotel by id:`, err);
    throw new Error('Database error');
  }
};
const getAllHotelSiteController = async (requestId, dbClient = null) => {
  logger.debug(`[${requestId}] [getAllHotelSiteController] Starting`);
  const query = `
    SELECT sc_user_info.* 
    FROM sc_user_info 
    ORDER BY hotel_id
  `;

  logger.debug(`[${requestId}] [getAllHotelSiteController] Executing query: ${query}`);

  try {
    const client = dbClient || await getPool(requestId).connect();
    const shouldRelease = !dbClient;

    try {
      logger.debug(`[${requestId}] [getAllHotelSiteController] Executing query`);
      const startTime = Date.now();
      const result = await client.query(query);
      const duration = Date.now() - startTime;

      logger.debug(`[${requestId}] [getAllHotelSiteController] Query executed successfully in ${duration}ms`);
      logger.debug(`[${requestId}] [getAllHotelSiteController] Found ${result.rows.length} hotels`);

      if (result.rows.length > 0) {
        logger.debug(`[${requestId}] [getAllHotelSiteController] First hotel ID: ${result.rows[0].hotel_id}`);
      }

      return result.rows;
    } finally {
      if (shouldRelease) {
        logger.debug(`[${requestId}] [getAllHotelSiteController] Releasing client back to pool`);
        client.release();
      }
    }
  } catch (err) {
    logger.error(`[${requestId}] [getAllHotelSiteController] Error executing query:`, {
      error: err.message,
      code: err.code,
      stack: err.stack,
      query: query
    });
    throw new Error(`Database error: ${err.message}`);
  }
};
const getHotelSiteController = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT sc_user_info.* 
    FROM sc_user_info 
    WHERE sc_user_info.hotel_id = $1
  `;
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] Error finding hotel by id:`, err);
    throw new Error('Database error');
  }
};

const selectBlockedRooms = async (requestId, hotelId) => {
  const pool = getPool(requestId);
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
    const result = await pool.query(query, [hotelId]);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving blocked rooms:`, err);
    throw new Error('Database error');
  }
};


const getPlanExclusionSettings = async (requestId, hotel_id) => {
  const pool = getPool(requestId);
  try {
    const allGlobalPlansQuery = 'SELECT id, name FROM plans_global ORDER BY id;';
    const allGlobalPlansResult = await pool.query(allGlobalPlansQuery);

    const excludedPlansQuery = 'SELECT global_plan_id FROM hotel_plan_exclusions WHERE hotel_id = $1;';
    const excludedPlansResult = await pool.query(excludedPlansQuery, [hotel_id]);

    const excludedPlanIds = excludedPlansResult.rows.map(row => row.global_plan_id);

    return {
      all_global_plans: allGlobalPlansResult.rows,
      excluded_plan_ids: excludedPlanIds,
    };
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving plan exclusion settings:`, err);
    throw new Error('Database error retrieving plan exclusion settings');
  }
};


const getVehicleCategoryCapacity = async (requestId, vehicle_category_id) => {
  const pool = getPool(requestId);
  const query = `
    SELECT capacity_units_required FROM vehicle_categories WHERE id = $1;
  `;
  const values = [vehicle_category_id];
  try {
    const result = await pool.query(query, values);
    return result.rows[0]?.capacity_units_required || 0;
  } catch (err) {
    logger.error(`[${requestId}] Error fetching vehicle category capacity:`, err);
    throw new Error('Database error');
  }
};


const getAllHotelsWithEmail = async (requestId, dbClient = null) => {
  const resource = dbClient || getPool(requestId);
  const query = `
    SELECT
      id,
      name,
      email
    FROM hotels
    WHERE email IS NOT NULL AND email != ''
    ORDER BY id ASC
  `;

  try {
    const result = await resource.query(query);
    return result.rows;
  } catch (err) {
    logger.error(`[${requestId}] Error retrieving hotels with email:`, err);
    throw new Error('Database error');
  }
};

module.exports = {
  getAllHotels,
  getHotelByID,
  getAllHotelSiteController,
  getHotelSiteController,
  selectBlockedRooms,
  getPlanExclusionSettings,
  getVehicleCategoryCapacity,
  getAllHotelsWithEmail,
};