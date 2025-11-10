const { getPool } = require('../../../config/database');
const { formatDate } = require('../../../utils/reportUtils');

/**
 * ParkingCapacityService - Manages capacity-based parking reservations
 * 
 * This service handles parking availability by counting available spots rather than
 * assigning specific parking spots. It uses virtual "capacity pool" spots to track
 * reservations and supports blocking capacity for maintenance or seasonal closures.
 */
class ParkingCapacityService {
    constructor(requestId) {
        this.requestId = requestId;
        console.log(`[ParkingCapacityService] Initialized for request: ${requestId}`);
    }

    /**
     * Get the database pool for this request
     * @private
     * @returns {Pool} Database connection pool
     */
    _getPool() {
        return getPool(this.requestId);
    }

    /**
     * Format a date to YYYY-MM-DD string
     * @private
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date string
     */
    _formatDate(date) {
        if (typeof date === 'string') {
            return date.split('T')[0];
        }
        return formatDate(date);
    }

    /**
     * Generate array of dates between start and end (exclusive of end date)
     * @private
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD, exclusive)
     * @returns {string[]} Array of date strings
     */
    _generateDateRange(startDate, endDate) {
        const dates = [];
        
        // Parse date strings into components to avoid timezone issues
        const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
        const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
        
        // Create UTC dates to avoid timezone shifts
        const current = new Date(Date.UTC(startYear, startMonth - 1, startDay));
        const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
        
        while (current.getTime() < end.getTime()) {
            // Format using UTC getters to avoid timezone conversion
            const year = current.getUTCFullYear();
            const month = String(current.getUTCMonth() + 1).padStart(2, '0');
            const day = String(current.getUTCDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
            
            // Increment using UTC methods
            current.setUTCDate(current.getUTCDate() + 1);
        }
        
        return dates;
    }

    /**
     * Get available parking capacity for a date range and vehicle category
     * 
     * Calculates available capacity by:
     * 1. Counting physical parking spots compatible with the vehicle category
     * 2. Subtracting capacity-based reservations (assigned to virtual spots)
     * 3. Subtracting blocked capacity
     * 
     * @param {number} hotelId - Hotel ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD, exclusive)
     * @param {number} vehicleCategoryId - Vehicle category ID
     * @param {Object} client - Optional database client for transactional queries
     * @returns {Promise<Object>} Capacity availability by date
     */
    async getAvailableCapacity(hotelId, startDate, endDate, vehicleCategoryId, client = null) {
        console.log(`[ParkingCapacityService.getAvailableCapacity] Request: hotel=${hotelId}, dates=${startDate} to ${endDate}, category=${vehicleCategoryId}, transactional=${!!client}`);
        
        const pool = client || this._getPool();
        const dates = this._generateDateRange(startDate, endDate);
        
        try {
            // Step 1: Get vehicle category capacity requirements
            const categoryQuery = `
                SELECT id, name, capacity_units_required
                FROM vehicle_categories
                WHERE id = $1
            `;
            const categoryResult = await pool.query(categoryQuery, [vehicleCategoryId]);
            
            if (categoryResult.rows.length === 0) {
                throw new Error(`Vehicle category ${vehicleCategoryId} not found`);
            }
            
            const category = categoryResult.rows[0];
            console.log(`[ParkingCapacityService.getAvailableCapacity] Vehicle category: ${category.name}, requires ${category.capacity_units_required} capacity units`);
            
            // Step 2: Count total physical parking spots compatible with this vehicle category
            const physicalSpotsQuery = `
                SELECT COUNT(DISTINCT ps.id) as total_physical_spots
                FROM parking_spots ps
                JOIN parking_lots pl ON ps.parking_lot_id = pl.id
                WHERE pl.hotel_id = $1
                  AND ps.is_active = true
                  AND ps.spot_type != 'capacity_pool'
                  AND ps.capacity_units >= $2
            `;
            const physicalSpotsResult = await pool.query(physicalSpotsQuery, [hotelId, category.capacity_units_required]);
            const totalPhysicalSpots = parseInt(physicalSpotsResult.rows[0].total_physical_spots, 10);
            
            console.log(`[ParkingCapacityService.getAvailableCapacity] Total physical spots compatible with category: ${totalPhysicalSpots}`);
            
            // Step 3: Get the virtual capacity pool spot ID for this hotel and category
            const virtualSpotQuery = `
                SELECT get_virtual_capacity_pool_spot($1, $2) as virtual_spot_id
            `;
            const virtualSpotResult = await pool.query(virtualSpotQuery, [hotelId, vehicleCategoryId]);
            const virtualSpotId = virtualSpotResult.rows[0].virtual_spot_id;
            
            console.log(`[ParkingCapacityService.getAvailableCapacity] Virtual capacity pool spot ID: ${virtualSpotId}`);
            
            // Step 4: Calculate capacity for each date
            const capacityByDate = {};
            
            for (const date of dates) {
                // Count capacity-based reservations (assigned to virtual spot) for this date
                const reservationsQuery = `
                    SELECT COUNT(*) as reserved_count
                    FROM reservation_parking rp
                    WHERE rp.hotel_id = $1
                      AND rp.parking_spot_id = $2
                      AND rp.date = $3
                      AND rp.cancelled IS NULL
                      AND rp.status IN ('confirmed', 'reserved')
                `;
                const reservationsResult = await pool.query(reservationsQuery, [hotelId, virtualSpotId, date]);
                const reservedCapacity = parseInt(reservationsResult.rows[0].reserved_count, 10);
                
                // Count blocked capacity for this date
                // Only count blocks that are compatible with this vehicle category
                // A block is compatible if: spot_size IS NULL (applies to all) OR spot_size >= capacity_units_required
                const blocksQuery = `
                    SELECT COALESCE(SUM(number_of_spots), 0) as blocked_count
                    FROM parking_blocks pb
                    WHERE pb.hotel_id = $1
                      AND pb.start_date <= $2
                      AND pb.end_date >= $2
                      AND (pb.spot_size IS NULL OR pb.spot_size >= $3)
                `;
                const blocksResult = await pool.query(blocksQuery, [hotelId, date, category.capacity_units_required]);
                const blockedCapacity = parseInt(blocksResult.rows[0].blocked_count, 10);
                
                // Calculate available capacity
                const availableCapacity = Math.max(0, totalPhysicalSpots - reservedCapacity - blockedCapacity);
                
                capacityByDate[date] = {
                    date,
                    totalPhysicalSpots,
                    reservedCapacity,
                    blockedCapacity,
                    availableCapacity
                };
                
                console.log(`[ParkingCapacityService.getAvailableCapacity] Date ${date}: total=${totalPhysicalSpots}, reserved=${reservedCapacity}, blocked=${blockedCapacity}, available=${availableCapacity}`);
            }
            
            const result = {
                hotelId,
                vehicleCategoryId,
                vehicleCategoryName: category.name,
                capacityUnitsRequired: category.capacity_units_required,
                dateRange: {
                    startDate,
                    endDate
                },
                capacityByDate,
                summary: {
                    totalPhysicalSpots,
                    minAvailableCapacity: 0, // Default to 0 if no dates
                    maxAvailableCapacity: 0  // Default to 0 if no dates
                }
            };

            const availableCapacities = Object.values(capacityByDate).map(d => d.availableCapacity);
            if (availableCapacities.length > 0) {
                result.summary.minAvailableCapacity = Math.min(...availableCapacities);
                result.summary.maxAvailableCapacity = Math.max(...availableCapacities);
            }
            
            console.log(`[ParkingCapacityService.getAvailableCapacity] Summary: min available=${result.summary.minAvailableCapacity}, max available=${result.summary.maxAvailableCapacity}`);
            
            return result;
            
        } catch (error) {
            console.error(`[ParkingCapacityService.getAvailableCapacity] Error:`, error);
            throw error;
        }
    }

    /**
     * Reserve parking capacity without assigning specific spots
     * 
     * Creates capacity-based parking reservations by:
     * 1. Validating sufficient capacity is available for all dates
     * 2. Getting the virtual capacity pool spot for the vehicle category
     * 3. Creating reservation_parking records pointing to the virtual spot
     * 4. Creating reservation_addons records for billing
     * 
     * @param {Object} reservationData - Reservation data
     * @param {number} reservationData.hotel_id - Hotel ID
     * @param {string} reservationData.reservation_id - Reservation UUID
     * @param {string} reservationData.reservation_details_id - Reservation details UUID
     * @param {number} reservationData.vehicle_category_id - Vehicle category ID
     * @param {string} reservationData.start_date - Start date (YYYY-MM-DD)
     * @param {string} reservationData.end_date - End date (YYYY-MM-DD, exclusive)
     * @param {number} reservationData.number_of_spots - Number of spots to reserve
     * @param {number} reservationData.unit_price - Price per spot per night
     * @param {number} reservationData.user_id - User ID making the reservation
     * @param {Object} reservationData.addon - Addon details for billing
     * @returns {Promise<Object>} Reservation result
     */
    async reserveCapacity(reservationData) {
        const {
            hotel_id,
            reservation_id,
            reservation_details_id,
            vehicle_category_id,
            start_date,
            end_date,
            number_of_spots = 1,
            unit_price = 0,
            user_id,
            addon
        } = reservationData;
        
        console.log(`[ParkingCapacityService.reserveCapacity] Request: hotel=${hotel_id}, reservation=${reservation_id}, category=${vehicle_category_id}, dates=${start_date} to ${end_date}, spots=${number_of_spots}`);
        
        const pool = this._getPool();
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            console.log(`[ParkingCapacityService.reserveCapacity] Transaction started`);
            
            // Step 1: Validate capacity availability within the transaction to prevent race conditions
            const availability = await this.getAvailableCapacity(hotel_id, start_date, end_date, vehicle_category_id, client);
            const dates = this._generateDateRange(start_date, end_date);
            
            for (const date of dates) {
                const dayCapacity = availability.capacityByDate[date];
                if (dayCapacity.availableCapacity < number_of_spots) {
                    throw new Error(`Insufficient capacity on ${date}. Available: ${dayCapacity.availableCapacity}, Requested: ${number_of_spots}`);
                }
            }
            console.log(`[ParkingCapacityService.reserveCapacity] Capacity validation passed for all dates`);
            
            // Step 2: Get virtual capacity pool spot
            const virtualSpotQuery = `SELECT get_virtual_capacity_pool_spot($1, $2) as virtual_spot_id`;
            const virtualSpotResult = await client.query(virtualSpotQuery, [hotel_id, vehicle_category_id]);
            const virtualSpotId = virtualSpotResult.rows[0].virtual_spot_id;
            
            console.log(`[ParkingCapacityService.reserveCapacity] Using virtual capacity pool spot ID: ${virtualSpotId}`);
            
            // Step 3: Get addon details for billing
            let addonDetails = {
                name: '駐車場',
                tax_type_id: null,
                tax_rate: 0.1,
                price: unit_price
            };
            
            if (addon?.addons_hotel_id) {
                const addonQuery = `SELECT * FROM addons_hotel WHERE hotel_id = $1 AND id = $2`;
                const addonResult = await client.query(addonQuery, [hotel_id, addon.addons_hotel_id]);
                if (addonResult.rows.length > 0) {
                    addonDetails = addonResult.rows[0];
                }
            } else if (addon?.addons_global_id) {
                const addonQuery = `SELECT * FROM addons_global WHERE id = $1`;
                const addonResult = await client.query(addonQuery, [addon.addons_global_id]);
                if (addonResult.rows.length > 0) {
                    addonDetails = addonResult.rows[0];
                }
            }
            
            console.log(`[ParkingCapacityService.reserveCapacity] Addon details: ${addonDetails.name}, price=${unit_price}`);
            
            // Step 4: Create reservation_addons and reservation_parking records for each spot
            const createdRecords = [];
            
            for (let spotIndex = 0; spotIndex < number_of_spots; spotIndex++) {
                console.log(`[ParkingCapacityService.reserveCapacity] Creating records for spot ${spotIndex + 1}/${number_of_spots}`);
                
                for (const date of dates) {
                    // Create addon record
                    const addonInsertQuery = `
                        INSERT INTO reservation_addons (
                            hotel_id, reservation_detail_id, addons_global_id, addons_hotel_id,
                            addon_name, price, quantity, tax_type_id, tax_rate, created_by, updated_by
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                        RETURNING id
                    `;
                    const addonValues = [
                        hotel_id,
                        reservation_details_id,
                        addon?.addons_global_id || null,
                        addon?.addons_hotel_id || null,
                        addonDetails.name,
                        unit_price,
                        1,
                        addonDetails.tax_type_id,
                        addonDetails.tax_rate,
                        user_id,
                        user_id
                    ];
                    const addonResult = await client.query(addonInsertQuery, addonValues);
                    const addonId = addonResult.rows[0].id;
                    
                    console.log(`[ParkingCapacityService.reserveCapacity] Created addon record: ${addonId} for date ${date}`);
                    
                    // Create parking record
                    const parkingInsertQuery = `
                        INSERT INTO reservation_parking (
                            hotel_id, reservation_details_id, reservation_addon_id,
                            vehicle_category_id, parking_spot_id, date, status, created_by, updated_by
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id
                    `;
                    const parkingValues = [
                        hotel_id,
                        reservation_details_id,
                        addonId,
                        vehicle_category_id,
                        virtualSpotId,
                        date,
                        'confirmed',
                        user_id,
                        user_id
                    ];
                    const parkingResult = await client.query(parkingInsertQuery, parkingValues);
                    const parkingId = parkingResult.rows[0].id;
                    
                    console.log(`[ParkingCapacityService.reserveCapacity] Created parking record: ${parkingId} for date ${date}`);
                    
                    createdRecords.push({
                        date,
                        addonId,
                        parkingId,
                        virtualSpotId
                    });
                }
            }
            
            await client.query('COMMIT');
            console.log(`[ParkingCapacityService.reserveCapacity] Transaction committed successfully. Created ${createdRecords.length} records`);
            
            return {
                success: true,
                message: `Successfully reserved ${number_of_spots} parking spot(s) for ${dates.length} night(s)`,
                reservationId: reservation_id,
                vehicleCategoryId: vehicle_category_id,
                numberOfSpots: number_of_spots,
                dates,
                createdRecords
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[ParkingCapacityService.reserveCapacity] Error, transaction rolled back:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Block parking capacity for a date range
     * 
     * Creates a blocking record that reduces available capacity for the specified
     * vehicle category during the date range.
     * 
     * @param {Object} blockData - Block data
     * @param {number} blockData.hotel_id - Hotel ID
     * @param {number} blockData.parking_lot_id - Parking lot ID (optional)
     * @param {number} blockData.spot_size - Spot size (optional)
     * @param {string} blockData.start_date - Start date (YYYY-MM-DD)
     * @param {string} blockData.end_date - End date (YYYY-MM-DD, inclusive)
     * @param {number} blockData.number_of_spots - Number of spots to block
     * @param {string} blockData.comment - Additional comments
     * @param {number} blockData.user_id - User ID creating the block
     * @returns {Promise<Object>} Block result with warning if exceeds total capacity
     */
    async blockCapacity(blockData) {
        const {
            hotel_id,
            parking_lot_id,
            spot_size,
            start_date,
            end_date,
            number_of_spots,
            comment,
            user_id
        } = blockData;
        
        console.log(`[ParkingCapacityService.blockCapacity] Request: hotel=${hotel_id}, parking_lot=${parking_lot_id}, spot_size=${spot_size}, dates=${start_date} to ${end_date}, spots=${number_of_spots}`);
        
        const pool = this._getPool();
        
        try {
            // Step 1: Validate parameters
            if (number_of_spots <= 0) {
                throw new Error('Number of spots must be greater than 0');
            }
            
            if (new Date(start_date) > new Date(end_date)) {
                throw new Error('End date must be on or after start date');
            }
            
            // Step 2: Get total physical capacity
            // Build query based on provided filters
            let physicalSpotsQuery = `
                SELECT COUNT(DISTINCT ps.id) as total_physical_spots
                FROM parking_spots ps
                JOIN parking_lots pl ON ps.parking_lot_id = pl.id
                WHERE pl.hotel_id = $1
                  AND ps.is_active = true
                  AND ps.spot_type != 'capacity_pool'
            `;
            const queryParams = [hotel_id];
            let paramIndex = 2;
            
            // Add parking lot filter if specified
            if (parking_lot_id) {
                physicalSpotsQuery += ` AND pl.id = $${paramIndex}`;
                queryParams.push(parking_lot_id);
                paramIndex++;
            }
            
            // Add spot size filter if specified
            if (spot_size) {
                physicalSpotsQuery += ` AND ps.capacity_units = $${paramIndex}`;
                queryParams.push(spot_size);
                paramIndex++;
            }
            
            const physicalSpotsResult = await pool.query(physicalSpotsQuery, queryParams);
            const totalPhysicalSpots = parseInt(physicalSpotsResult.rows[0].total_physical_spots, 10);
            
            console.log(`[ParkingCapacityService.blockCapacity] Total physical spots: ${totalPhysicalSpots}, blocking: ${number_of_spots}`);
            
            // Step 3: Check if blocking exceeds total capacity (warning, not error)
            const exceedsCapacity = number_of_spots > totalPhysicalSpots;
            if (exceedsCapacity) {
                console.warn(`[ParkingCapacityService.blockCapacity] WARNING: Number of spots (${number_of_spots}) exceeds total physical spots (${totalPhysicalSpots})`);
            }
            
            // Step 4: Get spots to block based on filters
            let spotsQuery = `
                SELECT ps.id, ps.spot_number, pl.name as parking_lot_name
                FROM parking_spots ps
                JOIN parking_lots pl ON ps.parking_lot_id = pl.id
                WHERE pl.hotel_id = $1
                  AND ps.is_active = true
                  AND ps.spot_type != 'capacity_pool'
            `;
            const spotsQueryParams = [hotel_id];
            let spotsParamIndex = 2;
            
            if (parking_lot_id) {
                spotsQuery += ` AND pl.id = $${spotsParamIndex}`;
                spotsQueryParams.push(parking_lot_id);
                spotsParamIndex++;
            }
            
            if (spot_size) {
                spotsQuery += ` AND ps.capacity_units = $${spotsParamIndex}`;
                spotsQueryParams.push(spot_size);
                spotsParamIndex++;
            }
            
            spotsQuery += ` ORDER BY ps.id LIMIT $${spotsParamIndex}`;
            spotsQueryParams.push(number_of_spots);
            
            const spotsResult = await pool.query(spotsQuery, spotsQueryParams);
            const spotsToBlock = spotsResult.rows;
            
            console.log(`[ParkingCapacityService.blockCapacity] Found ${spotsToBlock.length} spots to block`);
            
            if (spotsToBlock.length === 0) {
                throw new Error('No spots found matching the specified criteria');
            }
            
            // Step 5: Create blocking record
            const insertQuery = `
                INSERT INTO parking_blocks (
                    hotel_id, parking_lot_id, spot_size, start_date, end_date,
                    number_of_spots, comment, created_by, updated_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                RETURNING id
            `;
            const values = [
                hotel_id,
                parking_lot_id || null,
                spot_size || null,
                start_date,
                end_date,
                spotsToBlock.length, // Use actual number of spots found
                comment,
                user_id,
                user_id
            ];
            
            const result = await pool.query(insertQuery, values);
            const blockId = result.rows[0].id;
            
            console.log(`[ParkingCapacityService.blockCapacity] Created block record: ${blockId}`);
            
            const dayCount = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24)) + 1;
            
            return {
                success: true,
                blockId,
                message: `Successfully blocked ${spotsToBlock.length} parking spot(s) from ${start_date} to ${end_date}`,
                hotelId: hotel_id,
                parkingLotId: parking_lot_id,
                spotSize: spot_size,
                startDate: start_date,
                endDate: end_date,
                numberOfSpots: spotsToBlock.length,
                dayCount
            };
            
        } catch (error) {
            console.error(`[ParkingCapacityService.blockCapacity] Error:`, error);
            throw error;
        }
    }

    /**
     * Release (delete) a blocked capacity record
     * 
     * @param {string} blockId - Block ID (UUID)
     * @param {number} userId - User ID performing the deletion (for audit)
     * @returns {Promise<Object>} Release result
     */
    async releaseBlockedCapacity(blockId, userId) {
        console.log(`[ParkingCapacityService.releaseBlockedCapacity] Request: blockId=${blockId}, userId=${userId}`);
        
        const pool = this._getPool();
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            console.log(`[ParkingCapacityService.releaseBlockedCapacity] Transaction started`);
            
            // Step 1: Get block details before deletion
            const selectQuery = `
                SELECT pb.*, h.name as hotel_name, pl.name as parking_lot_name
                FROM parking_blocks pb
                JOIN hotels h ON pb.hotel_id = h.id
                LEFT JOIN parking_lots pl ON pb.parking_lot_id = pl.id
                WHERE pb.id = $1
            `;
            const selectResult = await client.query(selectQuery, [blockId]);
            
            if (selectResult.rows.length === 0) {
                throw new Error(`Block ${blockId} not found`);
            }
            
            const block = selectResult.rows[0];
            console.log(`[ParkingCapacityService.releaseBlockedCapacity] Found block: hotel=${block.hotel_id}, parking_lot=${block.parking_lot_name || 'All'}, spots=${block.number_of_spots}, created_by=${block.created_by}`);
            
            // Step 2: Create audit log entry before deletion (if audit table exists)
            // Note: Audit table schema would need to be updated to match new parking_blocks schema
            // Skipping audit for now until audit table is updated
            
            // Step 3: Delete the block
            const deleteQuery = `
                DELETE FROM parking_blocks
                WHERE id = $1
            `;
            await client.query(deleteQuery, [blockId]);
            
            await client.query('COMMIT');
            console.log(`[ParkingCapacityService.releaseBlockedCapacity] Successfully deleted block: ${blockId}, transaction committed`);
            
            return {
                success: true,
                message: `Successfully released blocked capacity`,
                blockId,
                deletedBy: userId,
                releasedBlock: {
                    hotelId: block.hotel_id,
                    hotelName: block.hotel_name,
                    parkingLotId: block.parking_lot_id,
                    parkingLotName: block.parking_lot_name,
                    spotSize: block.spot_size,
                    startDate: block.start_date,
                    endDate: block.end_date,
                    numberOfSpots: block.number_of_spots,
                    createdBy: block.created_by
                }
            };
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[ParkingCapacityService.releaseBlockedCapacity] Error, transaction rolled back:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get comprehensive capacity summary for a hotel
     * 
     * Provides an overview of parking capacity across all vehicle categories,
     * including total, reserved, blocked, and available capacity.
     * 
     * @param {number} hotelId - Hotel ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD, exclusive)
     * @returns {Promise<Object>} Capacity summary
     */
    async getCapacitySummary(hotelId, startDate, endDate) {
        console.log(`[ParkingCapacityService.getCapacitySummary] Request: hotel=${hotelId}, dates=${startDate} to ${endDate}`);
        
        const pool = this._getPool();
        
        try {
            // Step 1: Get all vehicle categories
            const categoriesQuery = `
                SELECT id, name, capacity_units_required
                FROM vehicle_categories
                ORDER BY id
            `;
            const categoriesResult = await pool.query(categoriesQuery);
            const categories = categoriesResult.rows;
            
            console.log(`[ParkingCapacityService.getCapacitySummary] Found ${categories.length} vehicle categories`);
            
            // Step 2: Get capacity for each category
            const capacityByCategory = {};
            
            for (const category of categories) {
                const availability = await this.getAvailableCapacity(hotelId, startDate, endDate, category.id);
                
                capacityByCategory[category.id] = {
                    vehicleCategoryId: category.id,
                    vehicleCategoryName: category.name,
                    capacityUnitsRequired: category.capacity_units_required,
                    totalPhysicalSpots: availability.summary.totalPhysicalSpots,
                    minAvailableCapacity: availability.summary.minAvailableCapacity,
                    maxAvailableCapacity: availability.summary.maxAvailableCapacity,
                    capacityByDate: availability.capacityByDate
                };
            }
            
            // Step 3: Get parking lot breakdown
            const parkingLotsQuery = `
                SELECT 
                    pl.id,
                    pl.name,
                    pl.description,
                    COUNT(ps.id) FILTER (WHERE ps.spot_type != 'capacity_pool' AND ps.is_active = true) as total_physical_spots
                FROM parking_lots pl
                LEFT JOIN parking_spots ps ON ps.parking_lot_id = pl.id
                WHERE pl.hotel_id = $1
                GROUP BY pl.id, pl.name, pl.description
                ORDER BY pl.name
            `;
            const parkingLotsResult = await pool.query(parkingLotsQuery, [hotelId]);
            const parkingLots = parkingLotsResult.rows.map(row => ({
                parkingLotId: row.id,
                parkingLotName: row.name,
                description: row.description,
                totalPhysicalSpots: parseInt(row.total_physical_spots, 10)
            }));
            
            console.log(`[ParkingCapacityService.getCapacitySummary] Found ${parkingLots.length} parking lots`);
            
            // Step 4: Calculate overall statistics
            const totalCapacityAllCategories = Object.values(capacityByCategory).reduce(
                (sum, cat) => sum + cat.totalPhysicalSpots, 0
            );
            
            const result = {
                hotelId,
                dateRange: {
                    startDate,
                    endDate
                },
                summary: {
                    totalParkingLots: parkingLots.length,
                    totalPhysicalSpots: totalCapacityAllCategories,
                    vehicleCategoriesCount: categories.length
                },
                capacityByCategory,
                parkingLots
            };
            
            console.log(`[ParkingCapacityService.getCapacitySummary] Summary: ${parkingLots.length} lots, ${totalCapacityAllCategories} total spots, ${categories.length} categories`);
            
            return result;
            
        } catch (error) {
            console.error(`[ParkingCapacityService.getCapacitySummary] Error:`, error);
            throw error;
        }
    }
}

module.exports = ParkingCapacityService;
