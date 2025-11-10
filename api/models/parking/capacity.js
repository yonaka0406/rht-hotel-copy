let getPool = require('../../config/database').getPool;

/**
 * Block parking capacity for a date range
 * 
 * Creates a blocking record in the parking_blocks table to reduce available
 * capacity for a specific vehicle category during the specified date range.
 * 
 * @param {string} requestId - Request ID for database pool
 * @param {Object} blockData - Block data
 * @param {number} blockData.hotel_id - Hotel ID
 * @param {number} blockData.vehicle_category_id - Vehicle category ID
 * @param {string} blockData.start_date - Start date (YYYY-MM-DD)
 * @param {string} blockData.end_date - End date (YYYY-MM-DD, exclusive)
 * @param {number} blockData.blocked_capacity - Number of spots to block
 * @param {string} blockData.comment - Additional comments
 * @param {number} blockData.user_id - User ID creating the block
 * @param {Object} client - Optional database client for transaction support
 * @returns {Promise<Object>} Created block record
 */
const blockParkingCapacity = async (requestId, blockData, client = null) => {
    console.log(`[blockParkingCapacity] Request ${requestId}: hotel=${blockData.hotel_id}, category=${blockData.vehicle_category_id}, parking_lot=${blockData.parking_lot_id}, spot_size=${blockData.spot_size}, dates=${blockData.start_date} to ${blockData.end_date}, capacity=${blockData.blocked_capacity}`);
    
    const {
        hotel_id,
        vehicle_category_id,
        parking_lot_id,
        spot_size,
        start_date,
        end_date,
        blocked_capacity,
        comment,
        user_id
    } = blockData;
    
    let shouldReleaseClient = false;
    
    try {
        // If no client is provided, create a new one
        if (!client) {
            const pool = getPool(requestId);
            client = await pool.connect();
            shouldReleaseClient = true;
            await client.query('BEGIN');
        }
        
        // Validate parameters
        if (blocked_capacity <= 0) {
            throw new Error('Blocked capacity must be greater than 0');
        }
        
        if (new Date(start_date) > new Date(end_date)) {
            throw new Error('End date must be on or after start date');
        }
        
        console.log(`[blockParkingCapacity] Validation passed, creating block record`);
        
        // Create blocking record
        const insertQuery = `
            INSERT INTO parking_blocks (
                hotel_id, vehicle_category_id, start_date, end_date,
                blocked_capacity, comment, created_by, updated_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
        `;
        const values = [
            hotel_id,
            vehicle_category_id,
            start_date,
            end_date,
            blocked_capacity,
            comment,
            user_id,
            user_id
        ];
        
        const result = await client.query(insertQuery, values);
        const block = result.rows[0];
        
        console.log(`[blockParkingCapacity] Created block record: ${block.id}`);
        
        if (shouldReleaseClient) {
            await client.query('COMMIT');
        }
        
        return block;
        
    } catch (error) {
        if (shouldReleaseClient && client) {
            await client.query('ROLLBACK');
        }
        console.error(`[blockParkingCapacity] Error:`, error);
        throw error;
    } finally {
        if (shouldReleaseClient && client) {
            client.release();
        }
    }
};

/**
 * Get blocked capacity records for a date range
 * 
 * Retrieves all parking capacity blocks for a hotel within the specified date range,
 * including vehicle category details.
 * 
 * @param {string} requestId - Request ID for database pool
 * @param {number} hotel_id - Hotel ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array>} Array of blocking records
 */
const getBlockedCapacity = async (requestId, hotel_id, startDate, endDate) => {
    console.log(`[getBlockedCapacity] Request ${requestId}: hotel=${hotel_id}, dates=${startDate} to ${endDate}`);
    
    const pool = getPool(requestId);
    
    try {
        const query = `
            SELECT 
                pb.*,
                h.name as hotel_name,
                pl.name as parking_lot_name
            FROM parking_blocks pb
            JOIN hotels h ON pb.hotel_id = h.id
            LEFT JOIN parking_lots pl ON pb.parking_lot_id = pl.id
            WHERE pb.hotel_id = $1
              AND pb.start_date <= $3
              AND pb.end_date >= $2
            ORDER BY pb.start_date, pl.name
        `;
        const values = [hotel_id, startDate, endDate];
        
        const result = await pool.query(query, values);
        
        console.log(`[getBlockedCapacity] Found ${result.rows.length} blocking records`);
        
        return result.rows;
        
    } catch (error) {
        console.error(`[getBlockedCapacity] Error:`, error);
        throw error;
    }
};

/**
 * Remove a capacity block
 * 
 * Deletes a parking capacity block record by ID, making the blocked capacity
 * available again.
 * 
 * @param {string} requestId - Request ID for database pool
 * @param {string} blockId - Block ID (UUID)
 * @param {number} user_id - User ID removing the block
 * @returns {Promise<Object>} Deleted block record
 */
const removeCapacityBlock = async (requestId, blockId, user_id) => {
    console.log(`[removeCapacityBlock] Request ${requestId}: blockId=${blockId}, user=${user_id}`);
    
    const pool = getPool(requestId);
    
    try {
        // Get block details before deletion
        const selectQuery = `
            SELECT 
                pb.*,
                h.name as hotel_name,
                pl.name as parking_lot_name
            FROM parking_blocks pb
            JOIN hotels h ON pb.hotel_id = h.id
            LEFT JOIN parking_lots pl ON pb.parking_lot_id = pl.id
            WHERE pb.id = $1
        `;
        const selectResult = await pool.query(selectQuery, [blockId]);
        
        if (selectResult.rows.length === 0) {
            throw new Error(`Block ${blockId} not found`);
        }
        
        const block = selectResult.rows[0];
        console.log(`[removeCapacityBlock] Found block: hotel=${block.hotel_id} (${block.hotel_name}), parking_lot=${block.parking_lot_name || 'All'}, spot_size=${block.spot_size || 'All'}, spots=${block.number_of_spots}`);
        
        // Delete the block
        const deleteQuery = `
            DELETE FROM parking_blocks
            WHERE id = $1
            RETURNING *
        `;
        const deleteResult = await pool.query(deleteQuery, [blockId]);
        
        console.log(`[removeCapacityBlock] Successfully deleted block: ${blockId}`);
        
        return deleteResult.rows[0];
        
    } catch (error) {
        console.error(`[removeCapacityBlock] Error:`, error);
        throw error;
    }
};

module.exports = {
    blockParkingCapacity,
    getBlockedCapacity,
    removeCapacityBlock,
};
