const parkingModel = require('../../../models/parking');
const capacityModel = require('../../../models/parking/capacity');
const { formatDate } = require('../../../utils/reportUtils');

/**
 * ParkingReservationsService - Manages parking reservations including blocked spots
 */
class ParkingReservationsService {
    constructor(requestId) {
        this.requestId = requestId;
        console.log(`[ParkingReservationsService] Initialized for request: ${requestId}`);
    }

    /**
     * Get parking reservations including blocked spots as virtual reservations
     * 
     * @param {number} hotelId - Hotel ID
     * @param {string} startDate - Start date (YYYY-MM-DD)
     * @param {string} endDate - End date (YYYY-MM-DD)
     * @returns {Promise<Array>} Array of reservations including blocked spots
     */
    async getParkingReservationsWithBlocks(hotelId, startDate, endDate) {
        console.log(`[ParkingReservationsService] Fetching reservations with blocks: hotel=${hotelId}, dates=${startDate} to ${endDate}`);
        
        try {
            // Fetch regular reservations
            const reservations = await parkingModel.getParkingReservations(this.requestId, hotelId, startDate, endDate);
            console.log(`[ParkingReservationsService] Found ${reservations.length} regular reservations`);
            
            // Fetch parking blocks
            const blocks = await capacityModel.getBlockedCapacity(this.requestId, hotelId, startDate, endDate);
            console.log(`[ParkingReservationsService] Found ${blocks.length} parking blocks`);
            
            // Fetch all parking spots for this hotel
            const allSpots = await parkingModel.getAllParkingSpotsByHotel(this.requestId, hotelId);
            console.log(`[ParkingReservationsService] Found ${allSpots.length} parking spots`);
            
            // Convert blocks to virtual reservations
            const blockReservations = this._convertBlocksToReservations(blocks, allSpots, reservations);
            console.log(`[ParkingReservationsService] Created ${blockReservations.length} block reservations`);
            
            // Merge reservations and block reservations
            const allReservations = [...reservations, ...blockReservations];
            console.log(`[ParkingReservationsService] Returning ${allReservations.length} total reservations`);
            
            return allReservations;
        } catch (error) {
            console.error(`[ParkingReservationsService] Error:`, error);
            throw error;
        }
    }

    /**
     * Convert parking blocks to virtual reservations
     * 
     * @private
     * @param {Array} blocks - Parking blocks
     * @param {Array} allSpots - All parking spots
     * @param {Array} existingReservations - Existing reservations
     * @returns {Array} Array of virtual block reservations
     */
    _convertBlocksToReservations(blocks, allSpots, existingReservations) {
        const blockReservations = [];
        
        if (!Array.isArray(blocks) || blocks.length === 0) {
            return blockReservations;
        }
        
        console.log(`[ParkingReservationsService] Converting ${blocks.length} blocks with ${allSpots.length} spots`);

        // Precompute a set of existing reservation keys for O(1) lookup
        const existingReservationKeys = new Set();
        existingReservations.forEach(r => {
            const date = formatDate(new Date(r.date));
            existingReservationKeys.add(`${r.parking_spot_id}|${date}`);
        });
        console.log(`[ParkingReservationsService] Precomputed ${existingReservationKeys.size} existing reservation keys.`);

        // Use a Set for O(1) lookup of currently blocked spots within this conversion process
        const currentBlockReservationKeys = new Set();
        
        blocks.forEach((block, blockIndex) => {
            console.log(`[ParkingReservationsService] Processing block ${blockIndex + 1}:`, {
                id: block.id,
                parking_lot_id: block.parking_lot_id,
                spot_size: block.spot_size,
                number_of_spots: block.number_of_spots,
                start_date: block.start_date,
                end_date: block.end_date
            });
            // Parse dates using formatDate to handle timezone correctly
            const blockStart = new Date(block.start_date);
            const blockEnd = new Date(block.end_date);
            
            const startDateStr = formatDate(blockStart);
            const endDateStr = formatDate(blockEnd);
            
            // Reset to start of day in UTC for iteration
            const currentDate = new Date(startDateStr + 'T00:00:00Z');
            const blockEndDate = new Date(endDateStr + 'T00:00:00Z');
            
            // Generate all dates in the block range
            while (currentDate <= blockEndDate) {
                const dateStr = formatDate(currentDate);
                
                // Find spots that match the block criteria and are available
                const matchingSpots = allSpots.filter(spot => {
                    // If parking_lot_id is specified, spot must be in that lot
                    if (block.parking_lot_id && spot.parking_lot_id !== block.parking_lot_id) {
                        return false;
                    }
                    // If spot_size is specified, spot must match that size
                    if (block.spot_size && spot.capacity_units !== block.spot_size) {
                        return false;
                    }
                    return spot.is_active;
                });
                
                // Filter out spots that are already reserved or blocked for this date
                const availableSpots = matchingSpots.filter(spot => {
                    const spotDateKey = `${spot.id}|${dateStr}`;
                    return !existingReservationKeys.has(spotDateKey) && !currentBlockReservationKeys.has(spotDateKey);
                });
                
                if (dateStr === '2025-11-10') {
                    console.log(`[ParkingReservationsService] Date 2025-11-10: Found ${matchingSpots.length} matching spots, ${availableSpots.length} available for block ${block.id}`);
                }
                
                // Block the first N available spots (where N = number_of_spots)
                const requestedSpots = block.number_of_spots || 0;
                const spotsToBlock = availableSpots.slice(0, requestedSpots);
                
                spotsToBlock.forEach(spot => {
                    const spotDateKey = `${spot.id}|${dateStr}`;
                    
                    blockReservations.push({
                        parking_spot_id: spot.id,
                        date: dateStr,
                        status: 'other',
                        client_id: '11111111-1111-1111-1111-111111111111', // Special ID for administrative blocks (ブロック)
                        booker_name: block.comment || '管理ブロック',
                        reservation_id: block.id,
                        spot_number: spot.spot_number,
                        parking_lot_name: spot.parking_lot_name
                    });
                    currentBlockReservationKeys.add(spotDateKey);
                    
                    if (dateStr === '2025-11-10') {
                        console.log(`[ParkingReservationsService] Date 2025-11-10: Blocked spot ${spot.spot_number} (ID: ${spot.id})`);
                    }
                });
                
                if (dateStr === '2025-11-10') {
                    console.log(`[ParkingReservationsService] Date 2025-11-10: Successfully blocked ${spotsToBlock.length} of ${requestedSpots} requested spots`);
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
        });
        
        return blockReservations;
    }
}

module.exports = ParkingReservationsService;
