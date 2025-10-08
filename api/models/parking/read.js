let getPool = require('../../config/database').getPool;

// Vehicle Category
const getVehicleCategories = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM vehicle_categories ORDER BY capacity_units_required, name';
    const result = await pool.query(query);
    return result.rows;
};

// Parking Lot
const getParkingLots = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM parking_lots WHERE hotel_id = $1 ORDER BY id';
    const values = [hotel_id];
    const result = await pool.query(query, values);
    return result.rows;
};

// Parking Spot
const getParkingSpots = async (requestId, parking_lot_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM parking_spots WHERE parking_lot_id = $1 ORDER BY id';
    const values = [parking_lot_id];
    const result = await pool.query(query, values);
    return result.rows;
};

const checkParkingSpotReservations = async (requestId, spotId, client = null) => {
    let shouldReleaseClient = false;

    try {
        // If no client is provided, create a new one
        if (!client) {
            const pool = getPool(requestId);
            client = await pool.connect();
            shouldReleaseClient = true;
        }

        const query = 'SELECT COUNT(*) as count FROM reservation_parking WHERE parking_spot_id = $1';
        const values = [spotId];
        const result = await client.query(query, values);
        return parseInt(result.rows[0].count, 10) > 0;
    } finally {
        if (shouldReleaseClient && client) {
            client.release();
        }
    }
};

// Get parking reservations for a date range
const getParkingReservations = async (requestId, hotel_id, startDate, endDate) => {
    const pool = getPool(requestId);
    const query = `
        SELECT 
            rp.*,            
            ps.spot_number,
            ps.spot_type,
            pl.name as parking_lot_name,
            COALESCE(c.name_kanji, c.name_kana, c.name) as booker_name,
            r.id as reservation_id,
            r.status as reservation_status,
            r.type as reservation_type
        FROM reservation_parking rp
        JOIN parking_spots ps ON rp.parking_spot_id = ps.id
        JOIN parking_lots pl ON ps.parking_lot_id = pl.id
        JOIN reservation_details rd ON rp.reservation_details_id = rd.id AND rp.hotel_id = rd.hotel_id
        JOIN reservations r ON rd.reservation_id = r.id AND rd.hotel_id = r.hotel_id
        LEFT JOIN clients c ON r.reservation_client_id = c.id
        WHERE rp.hotel_id = $1 
        AND rp.date >= $2 
        AND rp.date <= $3
        AND rp.cancelled IS NULL
        AND rd.cancelled IS NULL
        ORDER BY rp.date, ps.spot_number
    `;
    const values = [hotel_id, startDate, endDate];
    const result = await pool.query(query, values);
    return result.rows;
};

// Get all parking spots for a hotel across all parking lots
const getAllParkingSpotsByHotel = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = `
        SELECT 
            ps.*,
            pl.name as parking_lot_name,
            pl.description as parking_lot_description,
            h.id as hotel_id,
            h.name as hotel_name
        FROM parking_spots ps
        JOIN parking_lots pl ON ps.parking_lot_id = pl.id
        JOIN hotels h ON pl.hotel_id = h.id
        WHERE pl.hotel_id = $1 
        AND ps.is_active = true
        ORDER BY pl.name, ps.spot_number::integer
    `;
    const values = [hotel_id];
    const result = await pool.query(query, values);
    return result.rows;
};

// Check parking vacancies for a specific vehicle category
const checkParkingVacancies = async (requestId, hotel_id, startDate, endDate, vehicleCategoryId) => {
    const pool = getPool(requestId);

    // First get the capacity units required for the vehicle category
    const categoryQuery = 'SELECT capacity_units_required FROM vehicle_categories WHERE id = $1';
    const categoryResult = await pool.query(categoryQuery, [vehicleCategoryId]);

    if (categoryResult.rows.length === 0) {
        throw new Error('Vehicle category not found');
    }

    const capacityUnitsRequired = categoryResult.rows[0].capacity_units_required;

    // Find spots that can accommodate this vehicle category and check availability
    const query = `
        SELECT COUNT(DISTINCT ps.id) as available_spots
        FROM parking_spots ps
        JOIN parking_lots pl ON ps.parking_lot_id = pl.id
        LEFT JOIN reservation_parking rp ON ps.id = rp.parking_spot_id
            AND rp.hotel_id = $1
            AND rp.date >= $3
            AND rp.date < $4
            AND rp.cancelled IS NULL
        WHERE pl.hotel_id = $1
        AND ps.is_active = true
        AND ps.capacity_units >= $2
        AND rp.parking_spot_id IS NULL
    `;
    const values = [hotel_id, capacityUnitsRequired, startDate, endDate];
    const result = await pool.query(query, values);
    return parseInt(result.rows[0].available_spots, 10);
};

// Get compatible parking spots for a vehicle category
const getCompatibleSpots = async (requestId, hotel_id, vehicleCategoryId) => {
    const pool = getPool(requestId);

    // First get the capacity units required for the vehicle category
    const categoryQuery = 'SELECT capacity_units_required FROM vehicle_categories WHERE id = $1';
    const categoryResult = await pool.query(categoryQuery, [vehicleCategoryId]);

    if (categoryResult.rows.length === 0) {
        throw new Error('Vehicle category not found');
    }

    const capacityUnitsRequired = categoryResult.rows[0].capacity_units_required;

    // Find spots that can accommodate this vehicle category
    const query = `
        SELECT 
            ps.*,
            pl.name as parking_lot_name,
            pl.description as parking_lot_description
        FROM parking_spots ps
        JOIN parking_lots pl ON ps.parking_lot_id = pl.id
        WHERE pl.hotel_id = $1 
        AND ps.is_active = true
        AND ps.capacity_units >= $2
        ORDER BY pl.name, ps.spot_number::integer
    `;
    const values = [hotel_id, capacityUnitsRequired];
    const result = await pool.query(query, values);
    return result.rows;
};

// Get available spots for specific dates with capacity validation
const getAvailableSpotsForDates = async (requestId, hotel_id, startDate, endDate, capacityUnits) => {
    const pool = getPool(requestId);
    const query = `
        SELECT 
            ps.*,
            pl.name as parking_lot_name,
            pl.description as parking_lot_description
        FROM parking_spots ps
        JOIN parking_lots pl ON ps.parking_lot_id = pl.id
        LEFT JOIN reservation_parking rp ON ps.id = rp.parking_spot_id
            AND rp.hotel_id = $1
            AND rp.date >= $3
            AND rp.date < $4
            AND rp.cancelled IS NULL
        WHERE pl.hotel_id = $1
        AND ps.is_active = true
        AND ps.capacity_units >= $2
        AND rp.parking_spot_id IS NULL
        ORDER BY pl.name, ps.spot_number::integer
    `;
    const values = [hotel_id, capacityUnits, startDate, endDate];
    const result = await pool.query(query, values);
    return result.rows;
};

// Validate spot capacity for a vehicle category
const validateSpotCapacity = async (requestId, spotId, vehicleCategoryId) => {
    const pool = getPool(requestId);
    const query = `
        SELECT 
            ps.capacity_units,
            vc.capacity_units_required,
            ps.capacity_units >= vc.capacity_units_required as is_compatible
        FROM parking_spots ps
        CROSS JOIN vehicle_categories vc
        WHERE ps.id = $1 AND vc.id = $2
    `;
    const values = [spotId, vehicleCategoryId];
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
        throw new Error('Parking spot or vehicle category not found');
    }

    return result.rows[0];
};

// Helper function to get addon details
async function getAddonDetails(client, hotel_id, addons_hotel_id, addons_global_id) {
    let addonDetails = null;
    
    if (addons_hotel_id) {
        const result = await client.query(
            'SELECT * FROM addons_hotel WHERE hotel_id = $1 AND id = $2',
            [hotel_id, addons_hotel_id]
        );
        addonDetails = result.rows[0];
    } else if (addons_global_id) {
        const result = await client.query(
            'SELECT * FROM addons_global WHERE id = $1',
            [addons_global_id]
        );
        addonDetails = result.rows[0];
    }
    
    return addonDetails || {
        name: '駐車場',
        tax_type_id: null,
        tax_rate: 0.1, // Default 10% tax if not specified
        price: 0
    };
}

module.exports = {
    getVehicleCategories,
    getParkingLots,
    getParkingSpots,
    checkParkingSpotReservations,
    getParkingReservations,
    getAllParkingSpotsByHotel,
    checkParkingVacancies,
    getCompatibleSpots,
    getAvailableSpotsForDates,
    validateSpotCapacity,
    getAddonDetails,
};