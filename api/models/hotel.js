const { getPool } = require('../config/database');
const format = require('pg-format');

const getAllHotels = async (requestId) => {
  const pool = getPool(requestId);
  const query = `
    SELECT 
      hotels.* 
    FROM hotels 
    ORDER BY sort_order ASC, id ASC
  `;

  try {
    const result = await pool.query(query);    
    return result.rows; // Return all
  } catch (err) {
    console.error('Error retrieving all hotels:', err);
    throw new Error('Database error');
  }
};
const getHotelByID = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = 'SELECT hotels.* FROM hotels WHERE hotels.id = $1';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the first user found (or null if none)
  } catch (err) {
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  }
};
const getAllHotelSiteController = async (requestId) => {
  //console.log(`[${requestId}] [getAllHotelSiteController] Starting`);
  const pool = getPool(requestId);
  const query = `
    SELECT sc_user_info.* 
    FROM sc_user_info 
    ORDER BY hotel_id
  `;
  
  //console.log(`[${requestId}] [getAllHotelSiteController] Executing query: ${query}`);
  
  try {
    //console.log(`[${requestId}] [getAllHotelSiteController] Getting client from pool`);
    const client = await pool.connect();
    
    try {
      //console.log(`[${requestId}] [getAllHotelSiteController] Executing query`);
      const startTime = Date.now();
      const result = await client.query(query);
      const duration = Date.now() - startTime;
      
      //console.log(`[${requestId}] [getAllHotelSiteController] Query executed successfully in ${duration}ms`);
      //console.log(`[${requestId}] [getAllHotelSiteController] Found ${result.rows.length} hotels`);
      
      if (result.rows.length > 0) {
        //console.log(`[${requestId}] [getAllHotelSiteController] First hotel ID: ${result.rows[0].hotel_id}`);
      }
      
      return result.rows;
    } finally {
      //console.log(`[${requestId}] [getAllHotelSiteController] Releasing client back to pool`);
      client.release();
    }
  } catch (err) {
    console.error(`[${requestId}] [getAllHotelSiteController] Error executing query:`, {
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
    console.error('Error finding hotel by id:', err);
    throw new Error('Database error');
  }
};
const updateHotel = async (requestId, id, formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, sort_order, updated_by) => {
  const pool = getPool(requestId);
    const query = `
      UPDATE hotels SET 
        formal_name = $1
        ,name = $2
        ,postal_code = $3
        ,address = $4
        ,email = $5
        ,phone_number = $6
        ,latitude = $7
        ,longitude = $8
        ,bank_name = $9
        ,bank_branch_name = $10
        ,bank_account_type = $11
        ,bank_account_number = $12
        ,bank_account_name = $13
        ,google_drive_url = $14
        ,sort_order = $15
        ,updated_by = $16
      WHERE id = $17
      RETURNING *
    `;
    const values = [formal_name, name, postal_code, address, email, phone_number, latitude, longitude, bank_name, bank_branch_name, bank_account_type, bank_account_number, bank_account_name, google_drive_url, sort_order, updated_by, id];
  
    try {
      const result = await pool.query(query, values);
      return result.rows[0]; // Return the updated user
    } catch (err) {
      console.error('Error updating hotel:', err);
      throw new Error('Database error');
    }
};
const updateHotelSiteController = async (requestId, id, data) => {
  const pool = getPool(requestId);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete existing entries
    await client.query(
      'DELETE FROM sc_user_info WHERE hotel_id = $1',
      [id]
    );

    // Insert new entries
    const insertPromises = data.map(entry => {
      return client.query(
        `
        INSERT INTO sc_user_info (hotel_id, name, user_id, password)
        VALUES ($1, $2, $3, $4)
        `,
        [entry.hotel_id, entry.name, entry.user_id, entry.password]
      );
    });

    await Promise.all(insertPromises);
    await client.query('COMMIT');

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const updateRoomType = async (requestId, id, name, description, updated_by) => {
  const pool = getPool(requestId);
  const query = 'UPDATE room_types SET name = $1, description = $2, updated_by = $3 WHERE id = $4 RETURNING *';
  const values = [name, description, updated_by, id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    console.error('Error updating room type:', err);
    throw new Error('Database error');
  }
};
const updateRoom = async (requestId, id, room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by) => {
  const pool = getPool(requestId);
  const query = 'UPDATE rooms SET room_type_id = $1, floor = $2, room_number = $3, capacity = $4, smoking = $5, for_sale = $6, updated_by = $7 WHERE id = $8 RETURNING *';
  const values = [room_type_id, floor, room_number, capacity, smoking, for_sale, updated_by, id];

  try {
    const result = await pool.query(query, values);
    return result.rows[0]; // Return the updated user
  } catch (err) {
    console.error('Error updating room:', err);
    throw new Error('Database error');
  }
};

const updateHotelCalendar = async (requestId, hotelId, roomIds, startDate, endDate, number_of_people, comment, updated_by, block_type) => {
  const pool = getPool(requestId);
  const client = await pool.connect();
  
  try {    
    await client.query('BEGIN');
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateArray = [];
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Invalid date format. Please provide valid dates.');
    }

    // Include the start date in the range by using <= comparison
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      dateArray.push(new Date(dt));
      // If start and end are the same, break after adding the first date
      if (start.getTime() === end.getTime()) break;
    }

    let hotelsToUpdate = [];
    if (hotelId) {
      hotelsToUpdate.push(hotelId);
    } else {      
      const hotelsResult = await client.query('SELECT id FROM hotels');
      hotelsToUpdate = hotelsResult.rows.map(hotel => hotel.id);      
    }

    for (const currentHotelId of hotelsToUpdate) {      
      let roomsToUpdate = [];
      
      if (roomIds && roomIds.length > 0) {        
        roomsToUpdate = roomIds;
      } else {        
        const roomsResult = await client.query('SELECT id FROM rooms WHERE hotel_id = $1', [currentHotelId]);
        roomsToUpdate = roomsResult.rows.map(room => room.id);        
      }
      
      for (const roomId of roomsToUpdate) {
        const reservationIdResult = await client.query('SELECT gen_random_uuid() as id');
        const mockReservationId = reservationIdResult.rows[0].id;
        const checkInDate = dateArray[0];
        // Set checkOutDate to be one day after the last date in dateArray
        const checkOutDate = new Date(dateArray[dateArray.length - 1]);
        checkOutDate.setDate(checkOutDate.getDate() + 1);                

        const clientId = block_type === 'temp' ? '22222222-2222-2222-2222-222222222222' : '11111111-1111-1111-1111-111111111111';        

        try {          
          await client.query(
            `INSERT INTO reservations (id, hotel_id, reservation_client_id, check_in, check_out, number_of_people, status, comment, created_by, updated_by)
            VALUES ($1, $2, $3, $4, $5, $6, 'block', $7, $8, $8)
            ON CONFLICT (hotel_id, id) DO NOTHING`,
            [
                mockReservationId,
                currentHotelId,
                clientId,
                checkInDate,
                checkOutDate,
                number_of_people || 1,
                comment,
                updated_by,
            ]
          );          
        } catch (error) {
          console.error('Error inserting reservation:', error);
          throw error;
        }

        for (const [index, date] of dateArray.entries()) {
                    
          try {          
            const existingReservation = await client.query(
              `SELECT 1 FROM reservation_details 
               WHERE hotel_id = $1 AND room_id = $2 AND date = $3 AND cancelled IS NULL`,
              [currentHotelId, roomId, date]
            );

            if (existingReservation.rowCount > 0) {
              console.error('Room already reserved for this date:', date);
              await client.query('ROLLBACK');
              return { 
                success: false, 
                message: `${date.toISOString().split('T')[0]}に予約は既に登録されています。` 
              };
            }          
            
            await client.query(
              `INSERT INTO reservation_details (hotel_id, reservation_id, date, room_id, number_of_people, created_by, updated_by)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (hotel_id, reservation_id, room_id, date) 
               WHERE cancelled IS NULL 
               DO UPDATE SET updated_by = $6`,
              [
                currentHotelId,
                mockReservationId,
                date,
                roomId,
                number_of_people || 1,
                updated_by,
                updated_by,
              ]
            );            
          } catch (error) {
            console.error('Error processing date:', date, error);
            throw error;
          }
        }
      }
    }
        
    await client.query('COMMIT');
    return { success: true, message: 'Calendar updated successfully' };
    
  } catch (error) {
    console.error('Error in updateHotelCalendar:', error);
    try {      
      await client.query('ROLLBACK');      
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    return { 
      success: false, 
      message: error.message || 'Failed to update calendar' 
    };
  } finally {
    client.release();
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
    console.error('Error retrieving blocked rooms:', err);
    throw new Error('Database error');
  }
};
const deleteBlockedRooms = async (requestId, reservationId, userID) => {    
  // Validate reservationId is a valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(reservationId)) {
    console.error('Invalid UUID format for reservationId:', reservationId);
    throw new Error('Invalid reservation ID format');
  }

  const pool = getPool(requestId);
  const query = format(`
    -- Set the updated_by value in a session variable
    SET SESSION "my_app.user_id" = %L;

    DELETE FROM reservations
    WHERE id = %L AND status = 'block'
    RETURNING *;
  `, userID, reservationId);

  try {
    const result = await pool.query(query);
    
    if (result.rowCount === 0) {
      console.warn('No rows were deleted - reservation not found or not a block type');
    }
    
    return true;
  } catch (err) {
    console.error('Error deleting reservation:', {
      error: err.message,
      code: err.code,
      detail: err.detail,
      query: query,
      parameters: { reservationId, userID }
    });
    throw new Error('Database error: ' + err.message);
  }
};

const getAllHotelRoomTypesById = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = 'SELECT * FROM room_types WHERE hotel_id = $1 ORDER By name';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error finding by hotel id:', err);
    throw new Error('Database error');
  }
};
const getAllRoomsByHotelId = async (requestId, id) => {
  const pool = getPool(requestId);
  const query = 'SELECT hotels.*, room_types.id as room_type_id, room_types.name as room_type_name, room_types.description as room_type_description, rooms.id as room_id, rooms.floor as room_floor, rooms.room_number, rooms.capacity as room_capacity, rooms.for_sale as room_for_sale_idc, rooms.smoking as room_smoking_idc FROM hotels JOIN room_types ON hotels.id = room_types.hotel_id LEFT JOIN rooms ON room_types.id = rooms.room_type_id WHERE hotels.id = $1 ORDER BY room_types.id, rooms.floor, rooms.room_number ASC';
  const values = [id];

  try {
    const result = await pool.query(query, values);
    return result.rows; // Return all
  } catch (err) {
    console.error('Error finding hotel by id:', err);
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
    console.error('Error retrieving plan exclusion settings:', err);
    throw new Error('Database error retrieving plan exclusion settings');
  }
};

const updatePlanExclusions = async (requestId, hotel_id, global_plan_ids) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Delete existing exclusions for the hotel
    const deleteQuery = 'DELETE FROM hotel_plan_exclusions WHERE hotel_id = $1;';
    await client.query(deleteQuery, [hotel_id]);

    // Insert new exclusions if any are provided
    if (global_plan_ids && Array.isArray(global_plan_ids) && global_plan_ids.length > 0) {
      const insertQuery = 'INSERT INTO hotel_plan_exclusions (hotel_id, global_plan_id) VALUES ($1, $2);';
      for (const global_plan_id of global_plan_ids) {
        await client.query(insertQuery, [hotel_id, global_plan_id]);
      }
    }

    await client.query('COMMIT');
    // Optionally return a success status or the updated list, though not strictly required by the prompt
    // For now, let's not return anything specific for success, as the controller handles the response message.
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating plan exclusions:', err);
    throw new Error('Database error updating plan exclusions');
  } finally {
    client.release();
  }
};

const getRoomTypeById = async (requestId, roomTypeId, hotelId = null) => {
  const pool = getPool(requestId);
  let query = 'SELECT * FROM room_types WHERE id = $1';
  let values = [roomTypeId];
  if (hotelId !== null) {
    query += ' AND hotel_id = $2';
    values.push(hotelId);
  }
  try {
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  } catch (err) {
    console.error('Error finding room type by id:', err);
    throw new Error('Database error');
  }
};

const getRoomAssignmentOrder = async (requestId, hotelId) => {
  const pool = getPool(requestId);
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
    const result = await pool.query(query, values);
    return result.rows;
  } catch (err) {
    console.error('Error getting room assignment order:', err);
    throw new Error('Database error');
  }
};

const updateRoomAssignmentOrder = async (requestId, hotelId, rooms, userId) => {
  const pool = getPool(requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const updatePromises = rooms.map(room => {
      const query = 'UPDATE rooms SET assignment_priority = $1, updated_by = $2 WHERE id = $3 AND hotel_id = $4';
      const values = [room.assignment_priority, userId, room.room_id, hotelId];
      return client.query(query, values);
    });

    await Promise.all(updatePromises);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating room assignment order:', error);
    throw new Error('Database error');
  } finally {
    client.release();
  }
};

module.exports = {
  getAllHotels,
  getHotelByID,
  getAllHotelSiteController,
  getHotelSiteController,
  updateHotel,
  updateHotelSiteController,
  updateRoomType,
  updateRoom,
  updateHotelCalendar,
  selectBlockedRooms,
  deleteBlockedRooms,
  getAllHotelRoomTypesById,
  getAllRoomsByHotelId,
  getPlanExclusionSettings,
  updatePlanExclusions,
  getRoomTypeById,
  getRoomAssignmentOrder,
  updateRoomAssignmentOrder,
};
