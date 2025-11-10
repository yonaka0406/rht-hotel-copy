let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const vehicle = require('./vehicle');
const parkingLot = require('./parkingLot');
const { formatDate } = require('../../utils/reportUtils');





// Parking Spot
const getParkingSpots = async (requestId, parking_lot_id) => {
    const pool = getPool(requestId);
    // Exclude virtual capacity pool spots (spot_type = 'capacity_pool')
    const query = `SELECT * FROM parking_spots 
                   WHERE parking_lot_id = $1 
                   AND (spot_type IS NULL OR spot_type != 'capacity_pool')
                   ORDER BY id`;
    const values = [parking_lot_id];
    const result = await pool.query(query, values);
    return result.rows;
};

const createParkingSpot = async (requestId, { parking_lot_id, spot_number, spot_type, capacity_units, blocks_parking_spot_id, layout_info, is_active }) => {
    const pool = getPool(requestId);
    const query = 'INSERT INTO parking_spots (parking_lot_id, spot_number, spot_type, capacity_units, blocks_parking_spot_id, layout_info, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
    const values = [parking_lot_id, spot_number, spot_type, capacity_units, blocks_parking_spot_id, layout_info, is_active];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateParkingSpot = async (requestId, id, { spot_number, spot_type, capacity_units, blocks_parking_spot_id, layout_info, is_active }) => {
    const pool = getPool(requestId);
    const query = 'UPDATE parking_spots SET spot_number = $1, spot_type = $2, capacity_units = $3, blocks_parking_spot_id = $4, layout_info = $5, is_active = $6 WHERE id = $7 RETURNING *';
    const values = [spot_number, spot_type, capacity_units, blocks_parking_spot_id, layout_info, is_active, id];
    const result = await pool.query(query, values);
    return result.rows[0];
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

const deleteParkingSpot = async (requestId, id, client = null) => {
    let shouldReleaseClient = false;

    try {
        // If no client is provided, create a new one
        if (!client) {
            const pool = getPool(requestId);
            client = await pool.connect();
            shouldReleaseClient = true;
            await client.query('BEGIN');
        }

        // First check if the spot has any reservations
        const hasReservations = await checkParkingSpotReservations(requestId, id);
        if (hasReservations) {
            throw new Error('Cannot delete parking spot with existing reservations');
        }

        // If no reservations, proceed with deletion
        const query = 'DELETE FROM parking_spots WHERE id = $1';
        const values = [id];
        await client.query(query, values);

        if (shouldReleaseClient) {
            await client.query('COMMIT');
        }
    } catch (error) {
        if (shouldReleaseClient && client) {
            await client.query('ROLLBACK');
        }
        throw error;
    } finally {
        if (shouldReleaseClient && client) {
            client.release();
        }
    }
};

// Block Parking Spot
const blockParkingSpot = async (requestId, { hotel_id, parking_spot_id, start_date, end_date, comment, user_id }) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const reservationIdResult = await client.query('SELECT gen_random_uuid() as id');
        const mockReservationId = reservationIdResult.rows[0].id;

        const insertReservationQuery = `
            INSERT INTO reservations (id, hotel_id, reservation_client_id, check_in, check_out, status, comment, created_by, updated_by)
            VALUES ($1, $2, '11111111-1111-1111-1111-111111111111', $3, $4, 'block', $5, $6, $6)
            RETURNING id;
        `;
        const reservationValues = [mockReservationId, hotel_id, start_date, end_date, comment, user_id];
        const reservationResult = await client.query(insertReservationQuery, reservationValues);
        const reservation_id = reservationResult.rows[0].id;

        const dateArray = [];
        for (let dt = new Date(start_date); dt < new Date(end_date); dt.setDate(dt.getDate() + 1)) {
            dateArray.push(new Date(dt));
        }

        for (const date of dateArray) {
            const insertParkingQuery = `
                INSERT INTO reservation_parking (hotel_id, reservation_id, parking_spot_id, date, status, comment, created_by, updated_by)
                VALUES ($1, $2, $3, $4, 'blocked', $5, $6, $6);
            `;
            const parkingValues = [hotel_id, reservation_id, parking_spot_id, date, comment, user_id];
            await client.query(insertParkingQuery, parkingValues);
        }

        await client.query('COMMIT');
        return { success: true, reservation_id };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error blocking parking spot:', error);
        throw new Error('Database error');
    } finally {
        client.release();
    }
};

const syncParkingSpots = async (requestId, parking_lot_id, spots) => {
    const pool = getPool(requestId);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const existingSpots = await client.query('SELECT id FROM parking_spots WHERE parking_lot_id = $1', [parking_lot_id]);
        const existingSpotIds = new Set(existingSpots.rows.map(s => s.id));

        const spotsToUpdate = spots.filter(s => s.id && existingSpotIds.has(s.id));
        const spotsToInsert = spots.filter(s => !s.id);
        const receivedSpotIds = new Set(spots.map(s => s.id).filter(id => id));

        // Delete spots that are no longer in the list
        const spotsToDelete = [...existingSpotIds].filter(id => !receivedSpotIds.has(id));

        // Delete spots one by one to leverage the existing deleteParkingSpot function
        // which handles reservation checks and is already transaction-aware
        for (const spotId of spotsToDelete) {
            await deleteParkingSpot(requestId, spotId, client);
        }

        // Update existing spots
        if (spotsToUpdate.length > 0) {
            const updateQueries = spotsToUpdate.map(spot => {
                return client.query(
                    `UPDATE parking_spots SET spot_number = $1, spot_type = $2, capacity_units = $3, blocks_parking_spot_id = $4, layout_info = $5, is_active = $6 WHERE id = $7`,
                    [spot.spot_number, spot.spot_type, spot.capacity_units, spot.blocks_parking_spot_id || null, spot.layout_info, spot.is_active !== false, spot.id]
                );
            });
            await Promise.all(updateQueries);
        }

        // Insert new spots
        if (spotsToInsert.length > 0) {
            const insertValues = spotsToInsert.map(spot => [
                parking_lot_id,
                spot.spot_number,
                spot.spot_type,
                spot.capacity_units,
                spot.blocks_parking_spot_id || null,
                spot.layout_info,
                spot.is_active !== false
            ]);
            const insertQuery = format(
                'INSERT INTO parking_spots (parking_lot_id, spot_number, spot_type, capacity_units, blocks_parking_spot_id, layout_info, is_active) VALUES %L',
                insertValues
            );
            await client.query(insertQuery);
        }

        await client.query('COMMIT');

        // Return the updated list of spots for the lot
        const result = await client.query('SELECT * FROM parking_spots WHERE parking_lot_id = $1 ORDER BY id', [parking_lot_id]);
        return result.rows;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
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
    // Exclude virtual capacity pool spots (spot_type = 'capacity_pool')
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
        AND (ps.spot_type IS NULL OR ps.spot_type != 'capacity_pool')
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
    // Exclude virtual capacity pool spots (spot_type = 'capacity_pool')
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
        AND (ps.spot_type IS NULL OR ps.spot_type != 'capacity_pool')
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
    // Exclude virtual capacity pool spots (spot_type = 'capacity_pool')
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
        AND (ps.spot_type IS NULL OR ps.spot_type != 'capacity_pool')
        ORDER BY pl.name, ps.spot_number::integer
    `;
    const values = [hotel_id, capacityUnitsRequired];
    const result = await pool.query(query, values);
    return result.rows;
};

// Get available spots for specific dates with capacity validation
const getAvailableSpotsForDates = async (requestId, hotel_id, startDate, endDate, capacityUnits) => {
    const pool = getPool(requestId);
    // Exclude virtual capacity pool spots (spot_type = 'capacity_pool')
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
        AND (ps.spot_type IS NULL OR ps.spot_type != 'capacity_pool')
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

// Create parking assignment with addon relationship
const createParkingAssignmentWithAddon = async (requestId, assignmentData) => {
    const pool = getPool(requestId);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const {
            hotel_id,
            reservation_id,
            reservation_addon_id,
            vehicle_category_id,
            parking_spot_id,
            dates,
            status = 'reserved',
            comment,
            price = 0.00,
            created_by,
            updated_by
        } = assignmentData;

        // Validate spot capacity for vehicle category
        const capacityValidation = await validateSpotCapacity(requestId, parking_spot_id, vehicle_category_id);
        if (!capacityValidation.is_compatible) {
            throw new Error('Parking spot cannot accommodate the selected vehicle category');
        }

        const insertedAssignments = [];

        // Create parking assignment for each date
        for (const date of dates) {
            const query = `
                INSERT INTO reservation_parking (
                    hotel_id,
                    reservation_details_id,
                    reservation_addon_id,
                    vehicle_category_id,
                    parking_spot_id,
                    date,
                    status
                ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')
                RETURNING *
            `;
            const values = [
                hotel_id,
                reservation_id,
                reservation_addon_id,
                vehicle_category_id,
                parking_spot_id,
                date
            ];
            const result = await client.query(query, values);
            insertedAssignments.push(result.rows[0]);
        }

        await client.query('COMMIT');
        return insertedAssignments;

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Update parking assignment addon relationship
const updateParkingAssignmentAddon = async (requestId, assignmentId, newAddonId) => {
    const pool = getPool(requestId);
    const query = 'UPDATE reservation_parking SET reservation_addon_id = $1 WHERE id = $2 RETURNING *';
    const values = [newAddonId, assignmentId];
    const result = await pool.query(query, values);
    return result.rows[0];
};

// Remove parking assignments by addon ID and the corresponding addon record
const removeParkingAssignmentsByAddon = async (requestId, addonId) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // First delete the parking assignment
        const deleteParkingQuery = 'DELETE FROM reservation_parking WHERE reservation_addon_id = $1 RETURNING *';
        const parkingResult = await client.query(deleteParkingQuery, [addonId]);
        
        // Then delete the addon record
        const deleteAddonQuery = {
            text: 'DELETE FROM reservation_addons WHERE id = $1::uuid RETURNING *',
            values: [addonId]
        };
        await client.query(deleteAddonQuery);
        
        await client.query('COMMIT');
        return parkingResult.rows;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in removeParkingAssignmentsByAddon:', error);
        throw new Error(`Failed to remove parking assignments by addon: ${error.message}`);
    } finally {
        client.release();
    }
};

const bulkDeleteParkingAddonAssignments = async (requestId, assignmentIds) => {
    const pool = getPool(requestId);
    const client = await pool.connect();

    try {
        //console.log('Starting bulk delete with IDs:', assignmentIds);
        await client.query('BEGIN');

        // Get the addon IDs for the assignments we're about to delete
        const getAddonsQuery = {
            text: `SELECT id, reservation_addon_id 
                   FROM reservation_parking 
                   WHERE reservation_addon_id = ANY($1::uuid[])`,
            values: [assignmentIds]
        };
        
        //console.log('Executing query to find addon IDs:', getAddonsQuery);
        const addonsResult = await client.query(getAddonsQuery);
        //console.log('Found addon records:', addonsResult.rows);
        
        const addonIds = addonsResult.rows.map(row => row.reservation_addon_id);
        //console.log('Extracted addon IDs:', addonIds);

        if (addonIds.length === 0) {
            //console.log('No matching records found for the provided IDs');
            await client.query('COMMIT');
            return {
                deletedCount: 0,
                removedAssignments: [],
                message: 'No matching records found for the provided IDs'
            };
        }

        // First delete the parking assignments
        const deleteParkingQuery = {
            text: 'DELETE FROM reservation_parking WHERE reservation_addon_id = ANY($1::uuid[]) RETURNING *',
            values: [assignmentIds]
        };
        //console.log('Deleting parking assignments with query:', deleteParkingQuery);
        const deleteResult = await client.query(deleteParkingQuery);
        const deletedCount = deleteResult.rowCount;
        //console.log('Deleted parking assignments:', deleteResult.rows);

        // Then delete the associated addon records
        if (addonIds.length > 0) {
            const deleteAddonsQuery = {
                text: 'DELETE FROM reservation_addons WHERE id = ANY($1::uuid[]) RETURNING *',
                values: [addonIds]
            };
            //console.log('Deleting addon records with query:', deleteAddonsQuery);
            const deletedAddons = await client.query(deleteAddonsQuery);
            //console.log('Deleted addon records:', deletedAddons.rows);
        }

        await client.query('COMMIT');
        //console.log('Transaction committed successfully');

        return {
            deletedCount,
            removedAssignments: deleteResult.rows,
            removedAddonIds: addonIds,
            message: 'Bulk parking addon assignments deleted successfully'
        };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in bulkDeleteParkingAddonAssignments:', error);
        throw new Error(`Failed to remove parking addon assignments: ${error.message}`);
    } finally {
        client.release();
    }
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

const saveParkingAssignments = async (requestId, assignments, userId, client = null) => {
    console.log(`[saveParkingAssignments] Entering with requestId: ${requestId}, assignments count: ${assignments.length}, userId: ${userId}`);
    const pool = getPool(requestId);
    const localClient = client || await pool.connect();
    const releaseClient = !client;
    const BATCH_SIZE = 100;

    try {
        if (releaseClient) {
            await localClient.query('BEGIN');
        }

        for (const [index, assignment] of assignments.entries()) {

            console.log(`[saveParkingAssignments] Processing assignment ${index + 1}/${assignments.length}:`, assignment);
            const { 
                hotel_id, reservation_id, vehicle_category_id, roomId,
                check_in, check_out, unit_price, numberOfSpots = 1, spotId: preferredSpotId, addon 
            } = assignment;
            console.log(`[saveParkingAssignments] Extracted assignment details: hotel_id=${hotel_id}, reservation_id=${reservation_id}, vehicle_category_id=${vehicle_category_id}, roomId=${roomId}, check_in=${check_in}, check_out=${check_out}, unit_price=${unit_price}, numberOfSpots=${numberOfSpots}, preferredSpotId=${preferredSpotId}, addon=`, addon);

            if (!hotel_id || !reservation_id) {
                const error = new Error('Missing required fields in assignment');
                error.details = { assignment, missingFields: [] };
                if (!hotel_id) error.details.missingFields.push('hotel_id');
                if (!reservation_id) error.details.missingFields.push('reservation_id');
                throw error;
            }
            const checkInDate = formatDate(new Date(check_in));
            const checkOutDate = formatDate(new Date(check_out));
            console.log(`[saveParkingAssignments] Formatted dates: checkInDate=${checkInDate}, checkOutDate=${checkOutDate}`);

            // Get addon IDs to delete for the specific date range
            const addonIdsRes = await localClient.query(
                `SELECT rp.reservation_addon_id 
                 FROM reservation_parking rp
                 JOIN reservation_details rd ON rp.reservation_details_id = rd.id
                 WHERE rd.reservation_id = $1 
                   AND rd.room_id = $2
                   AND rd.date >= $3
                   AND rd.date < $4`,
                [reservation_id, roomId, checkInDate, checkOutDate]
            );
            const addonIdsToDelete = addonIdsRes.rows.map(r => r.reservation_addon_id).filter(id => id);
            console.log(`[saveParkingAssignments] Addon IDs to delete for reservation ${reservation_id}, room ${roomId}, dates ${checkInDate}-${checkOutDate}:`, addonIdsToDelete);

            // Delete existing parking assignments for this room, reservation, and date range
            if (addonIdsToDelete.length > 0) {
                console.log(`[saveParkingAssignments] Deleting ${addonIdsToDelete.length} existing parking assignments and addons.`);
                await localClient.query(
                    `DELETE FROM reservation_parking WHERE reservation_addon_id = ANY($1::uuid[])`,
                    [addonIdsToDelete]
                );
                await localClient.query(
                    `DELETE FROM reservation_addons WHERE id = ANY($1::uuid[])`,
                    [addonIdsToDelete]
                );
            }

            // 1. Fetch reservation_details for this reservation
            //console.log('Fetching reservation details with params:', {
            //    reservation_id,
            //    hotel_id,
            //    check_in: formatDate(new Date(check_in)),
            //    check_out: formatDate(new Date(check_out))
            //});

            const query = {
                text: `SELECT id, room_id, date 
                    FROM reservation_details 
                    WHERE reservation_id = $1 AND hotel_id = $2
                    AND date >= $3 AND date < $4 AND room_id = $5
                    ORDER BY room_id, date`,
                values: [reservation_id, hotel_id, checkInDate, checkOutDate, roomId]
            };

            //console.log('Executing query:', {
            //    text: query.text,
            //    values: query.values
            //});

            const detailsRes = await localClient.query(query);
            const reservationDetails = detailsRes.rows;
            console.log(`[saveParkingAssignments] Fetched reservation details (${reservationDetails.length} rows):`, reservationDetails);
            if (!reservationDetails.length) {
                console.warn(`No reservation details found for reservation ${reservation_id} with params:`, {
                    reservation_id,
                    hotel_id,
                    check_in: formatDate(new Date(check_in)),
                    check_out: formatDate(new Date(check_out)),
                    formatted_check_in: formatDate(new Date(check_in)),
                    formatted_check_out: formatDate(new Date(check_out))
                });
                continue;
            }

            // 2. Load vehicle category requirement
            const catRes = await localClient.query(
                `SELECT capacity_units_required 
                 FROM vehicle_categories 
                 WHERE id = $1`,
                [vehicle_category_id]
            );
            const requiredUnits = catRes.rows[0]?.capacity_units_required;
            console.log(`[saveParkingAssignments] Vehicle category ${vehicle_category_id} requires ${requiredUnits} capacity units.`);
            if (!requiredUnits) throw new Error(`Vehicle category ${vehicle_category_id} not found`);

            // 3. Get candidate spots
            const spotsRes = await localClient.query(
                `SELECT ps.id 
                 FROM parking_spots ps
                 JOIN parking_lots pl ON ps.parking_lot_id = pl.id
                 WHERE pl.hotel_id = $1
                   AND ps.is_active = true
                   AND ps.capacity_units >= $2`,
                [hotel_id, requiredUnits]
            );
            const candidateSpots = spotsRes.rows.map(r => r.id);
            console.log(`[saveParkingAssignments] Found ${candidateSpots.length} candidate parking spots:`, candidateSpots);
            if (!candidateSpots.length) throw new Error(`No available parking spots for category ${vehicle_category_id}`);

            // 4. Group reservation_details by date
            const detailsByDate = {};
            for (const d of reservationDetails) {
                const dateStr = formatDate(new Date(d.date));
                if (!detailsByDate[dateStr]) detailsByDate[dateStr] = [];
                detailsByDate[dateStr].push(d);
            }
            console.log(`[saveParkingAssignments] Grouped reservation details by date:`, detailsByDate);

            // Prepare batched inserts
            let addonValues = [];
            let parkingValues = [];

            const addonDetails = await getAddonDetails(localClient, hotel_id, addon?.addons_hotel_id, addon?.addons_global_id);
            console.log(`[saveParkingAssignments] Addon details:`, addonDetails);

            const allReservationDates = Object.keys(detailsByDate).map(dateStr => new Date(dateStr));
            
            // Keep track of spots that have been assigned to prevent re-assigning the same physical spot multiple times for the same reservation
            const assignedPhysicalSpotsForThisAssignment = new Set();

            for (let i = 0; i < numberOfSpots; i++) {
                console.log(`[saveParkingAssignments] Attempting to assign spot ${i + 1}/${numberOfSpots} for current assignment.`);
                let remainingDatesToAssign = new Set(allReservationDates.map(d => formatDate(d)));
                const assignedSpotsPerDate = {}; // { 'YYYY-MM-DD': spotId }

                while (remainingDatesToAssign.size > 0) {
                    console.log(`[saveParkingAssignments] Starting new iteration of spot assignment loop. Remaining dates: ${Array.from(remainingDatesToAssign).join(', ')}`);
                    let bestSpot = null;
                    let maxAvailableDates = 0;
                    let bestSpotAvailableDates = [];

                    for (const spotId of candidateSpots) {
                        // Skip if this physical spot has already been assigned to this reservation (across all numberOfSpots iterations)
                        if (assignedPhysicalSpotsForThisAssignment.has(spotId)) {
                            continue;
                        }

                        let currentSpotAvailableDates = [];
                        for (const dateStr of remainingDatesToAssign) {
                            const reservedRes = await localClient.query(
                                `SELECT parking_spot_id
                                 FROM reservation_parking
                                 WHERE hotel_id = $1
                                   AND date = $2
                                   AND cancelled IS NULL
                                   AND status IN ('confirmed','blocked')`, // Also consider 'blocked' spots
                                [hotel_id, dateStr]
                            );
                            const isReserved = reservedRes.rows.some(r => r.parking_spot_id === spotId);

                            if (!isReserved) {
                                currentSpotAvailableDates.push(dateStr);
                            }
                        }

                        if (currentSpotAvailableDates.length > maxAvailableDates) {
                            maxAvailableDates = currentSpotAvailableDates.length;
                            bestSpot = spotId;
                            bestSpotAvailableDates = currentSpotAvailableDates;
                        }
                    }

                    console.log(`[saveParkingAssignments] Best spot for current iteration: ${bestSpot}, max available dates: ${maxAvailableDates}`);

                    if (bestSpot === null || maxAvailableDates === 0) {
                        throw new Error(`Not enough parking spots available for all dates for assignment ${i + 1}. Remaining dates: ${Array.from(remainingDatesToAssign).join(', ')}`);
                    }

                    // Assign the best spot for its available dates
                    assignedPhysicalSpotsForThisAssignment.add(bestSpot); // Mark this physical spot as used for this assignment
                    for (const dateStr of bestSpotAvailableDates) {
                        assignedSpotsPerDate[dateStr] = bestSpot;
                        remainingDatesToAssign.delete(dateStr);
                        console.log(`[saveParkingAssignments] Assigned spot ${bestSpot} to date ${dateStr}.`);
                    }
                }

                // Now, generate addonValues and parkingValues based on assignedSpotsPerDate
                for (const dateStr of Object.keys(assignedSpotsPerDate)) {
                    const assignedSpot = assignedSpotsPerDate[dateStr];
                    const detail = detailsByDate[dateStr][0]; // Assuming one detail per date for simplicity, adjust if needed

                    let global_addon_id = null;
                    let hotel_addon_id = null;

                    if (addon?.addons_hotel_id) {
                        hotel_addon_id = addonDetails.id;
                        global_addon_id = addonDetails.addons_global_id;
                    } else {
                        global_addon_id = addonDetails.id;
                    }

                    addonValues.push([
                        hotel_id,
                        detail.id,
                        global_addon_id,
                        hotel_addon_id,
                        addonDetails.name,
                        unit_price,
                        1,
                        addonDetails.tax_type_id,
                        addonDetails.tax_rate,
                        userId
                    ]);
                    parkingValues.push({
                        hotel_id,
                        reservation_details_id: detail.id,
                        vehicle_category_id,
                        parking_spot_id: assignedSpot,
                        date: dateStr,
                        created_by: userId
                    });
                }
            } // End of numberOfSpots loop

            console.log(`[saveParkingAssignments] Preparing to insert ${addonValues.length} addon records in batches.`);
            for (let i = 0; i < addonValues.length; i += BATCH_SIZE) {
                const batch = addonValues.slice(i, i + BATCH_SIZE);
                const placeholders = batch.map(
                    (_, idx) => `($${idx*10+1},$${idx*10+2},$${idx*10+3},$${idx*10+4},$${idx*10+5},$${idx*10+6},$${idx*10+7},$${idx*10+8},$${idx*10+9},$${idx*10+10})`
                ).join(',');

                const flatValues = batch.flat();
                const res = await localClient.query(
                    `INSERT INTO reservation_addons 
                        (hotel_id,reservation_detail_id,addons_global_id,addons_hotel_id,addon_name,price,quantity,tax_type_id,tax_rate,created_by)
                     VALUES ${placeholders} RETURNING id`
                    , flatValues
                );

                console.log(`[saveParkingAssignments] Inserted batch of ${res.rows.length} addon records.`);
                // assign returned addon IDs to parkingValues
                for (let j = 0; j < res.rows.length; j++) {
                    parkingValues[i + j].reservation_addon_id = res.rows[j].id;
                }
            }

            // 6. Insert reservation_parking in batch
            console.log(`[saveParkingAssignments] Preparing to insert ${parkingValues.length} parking records in batches.`);
            for (let i = 0; i < parkingValues.length; i += BATCH_SIZE) {
                const batch = parkingValues.slice(i, i + BATCH_SIZE);
                
                // 8 placeholders per row: hotel_id, reservation_details_id, reservation_addon_id, vehicle_category_id, parking_spot_id, date, status, created_by
                const placeholders = batch.map((_, idx) => 
                    `($${idx*8+1},$${idx*8+2},$${idx*8+3},$${idx*8+4},$${idx*8+5},$${idx*8+6},$${idx*8+7},$${idx*8+8})`
                ).join(',');

                const flatValues = batch.flatMap(p => [
                    p.hotel_id,
                    p.reservation_details_id,
                    p.reservation_addon_id,
                    p.vehicle_category_id,
                    p.parking_spot_id,
                    p.date,
                    'confirmed',   // status
                    p.created_by
                ]);

                await localClient.query(
                    `INSERT INTO reservation_parking 
                        (hotel_id,reservation_details_id,reservation_addon_id,vehicle_category_id,parking_spot_id,date,status,created_by)
                    VALUES ${placeholders}`
                    , flatValues
                );
                console.log(`[saveParkingAssignments] Inserted batch of parking records.`);
            }
        }

        if (releaseClient) {
            await localClient.query('COMMIT');
            console.log(`[saveParkingAssignments] Transaction committed.`);
        }
        return { success: true, message: 'Parking assignments saved successfully' };
    } catch (error) {
        console.error('[saveParkingAssignments] Error caught:', error);
        if (releaseClient) {
            try {
                await localClient.query('ROLLBACK');
                console.log(`[saveParkingAssignments] Transaction rolled back.`);
            } catch (rollbackError) {
                console.error('[saveParkingAssignments] Error during rollback:', rollbackError);
            }
        }
        throw error;
    } finally {
        if (releaseClient) {
            try {
                localClient.release();
                console.log(`[saveParkingAssignments] Client released.`);
            } catch (releaseError) {
                console.error('[saveParkingAssignments] Error during client release in finally block:', releaseError);
            }
        }
    }
};

module.exports = {
    ...vehicle,
    ...parkingLot,
    getParkingSpots,
    createParkingSpot,
    updateParkingSpot,
    deleteParkingSpot,
    blockParkingSpot,
    syncParkingSpots,
    getParkingReservations,
    getAllParkingSpotsByHotel,
    checkParkingVacancies,
    getCompatibleSpots,
    getAvailableSpotsForDates,
    validateSpotCapacity,
    createParkingAssignmentWithAddon,
    updateParkingAssignmentAddon,
    removeParkingAssignmentsByAddon,
    bulkDeleteParkingAddonAssignments,
    saveParkingAssignments,
};
