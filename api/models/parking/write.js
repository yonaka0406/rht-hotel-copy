let getPool = require('../../config/database').getPool;
const format = require('pg-format');
const { checkParkingSpotReservations, validateSpotCapacity } = require('./read');

// Helper
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        throw new Error("The provided input is not a valid Date object:");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const createVehicleCategory = async (requestId, { name, capacity_units_required }) => {
    const pool = getPool(requestId);
    const query = 'INSERT INTO vehicle_categories (name, capacity_units_required) VALUES ($1, $2) RETURNING *';
    const values = [name, capacity_units_required];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateVehicleCategory = async (requestId, id, { name, capacity_units_required }) => {
    const pool = getPool(requestId);
    const query = 'UPDATE vehicle_categories SET name = $1, capacity_units_required = $2 WHERE id = $3 RETURNING *';
    const values = [name, capacity_units_required, id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const deleteVehicleCategory = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'DELETE FROM vehicle_categories WHERE id = $1';
    const values = [id];
    await pool.query(query, values);
};

const createParkingLot = async (requestId, { hotel_id, name, description }) => {
    const pool = getPool(requestId);
    const query = 'INSERT INTO parking_lots (hotel_id, name, description) VALUES ($1, $2, $3) RETURNING *';
    const values = [hotel_id, name, description];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const updateParkingLot = async (requestId, id, { name, description }) => {
    const pool = getPool(requestId);
    const query = 'UPDATE parking_lots SET name = $1, description = $2 WHERE id = $3 RETURNING *';
    const values = [name, description, id];
    const result = await pool.query(query, values);
    return result.rows[0];
};

const deleteParkingLot = async (requestId, id) => {
    const pool = getPool(requestId);
    const query = 'DELETE FROM parking_lots WHERE id = $1';
    const values = [id];
    await pool.query(query, values);
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

const saveParkingAssignments = async (requestId, assignments, userId, client = null) => {
    //console.log(`[saveParkingAssignments] Starting with ${assignments.length} assignments for user ${userId}`, assignments);
    const pool = getPool(requestId);
    let localClient = client;
    let releaseClient = false;

    if (!localClient) {
        localClient = await pool.connect();
        //console.log('Starting database transaction...');
        await localClient.query('BEGIN');
        releaseClient = true; // Set to true only after successful connection and transaction start
    }

    try {

        // Validate assignments
        for (const assignment of assignments) {
            if (!assignment.hotel_id || !assignment.reservation_id) {
                const error = new Error('Missing required fields in assignment');
                error.details = { assignment, missingFields: [] };
                if (!assignment.hotel_id) error.details.missingFields.push('hotel_id');
                if (!assignment.reservation_id) error.details.missingFields.push('reservation_id');
                throw error;
            }
        }

        const BATCH_SIZE = 100;

        for (const [index, assignment] of assignments.entries()) {
            //console.log(`\nProcessing assignment ${index + 1}/${assignments.length}:`, JSON.stringify(assignment, null, 2));

            const { 
                hotel_id, reservation_id, vehicle_category_id, 
                check_in, check_out, unit_price, number_of_vehicles = 1, spotId: preferredSpotId 
            } = assignment;

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
                    AND date >= $3 AND date <= $4
                    ORDER BY room_id, date`,
                values: [reservation_id, hotel_id, formatDate(new Date(check_in)), formatDate(new Date(check_out))]
            };

            //console.log('Executing query:', {
            //    text: query.text,
            //    values: query.values
            //});

            const detailsRes = await localClient.query(query);
            const reservationDetails = detailsRes.rows;
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
            if (!candidateSpots.length) throw new Error(`No available parking spots for category ${vehicle_category_id}`);

            // 4. Group reservation_details by date
            const detailsByDate = {};
            for (const d of reservationDetails) {
                if (!detailsByDate[d.date]) detailsByDate[d.date] = [];
                detailsByDate[d.date].push(d);
            }

            // Prepare batched inserts
            const addonValues = [];
            const parkingValues = [];

            for (const date of Object.keys(detailsByDate)) {
                const detailsForDate = detailsByDate[date];
                const detail = detailsForDate[0]; // use first room for the date

                //console.log(`Assigning for date: ${date}`);

                const reservedRes = await localClient.query(
                    `SELECT parking_spot_id
                     FROM reservation_parking
                     WHERE hotel_id = $1
                       AND date = $2
                       AND cancelled IS NULL
                       AND status IN ('confirmed','reserved')`,
                    [hotel_id, formatDate(new Date(date))]
                );
                const reserved = reservedRes.rows.map(r => r.parking_spot_id);
                
                let assignedSpot = null;

                // Prioritize preferredSpotId if provided and available
                if (preferredSpotId) {
                    const isPreferredSpotCandidate = candidateSpots.includes(preferredSpotId);
                    const isPreferredSpotReserved = reserved.includes(preferredSpotId);

                    if (isPreferredSpotCandidate && !isPreferredSpotReserved) {
                        assignedSpot = preferredSpotId;
                    } else {
                        console.warn(`Preferred spot ${preferredSpotId} is not available or not a candidate for date ${date}. Falling back to auto-assignment.`);
                    }
                }

                // If no preferred spot or preferred spot not available, find an available spot
                if (assignedSpot === null) {
                    const available = candidateSpots.filter(id => !reserved.includes(id));
                    if (available.length < number_of_vehicles) {
                        throw new Error(`Not enough parking spots for ${date} (need ${number_of_vehicles}, available ${available.length})`);
                    }
                    assignedSpot = available[0]; // Pick the first available spot
                }

                if (assignedSpot === null) {
                    throw new Error(`Could not assign a parking spot for date ${date}.`);
                }

                const spotsToAssign = [];
                // If a preferred spot is provided and available
                if (preferredSpotId && candidateSpots.includes(preferredSpotId) && !reserved.includes(preferredSpotId)) {
                    spotsToAssign.push(preferredSpotId);
                }

                // Fill the rest with other available spots
                const otherAvailableSpots = candidateSpots.filter(id => !reserved.includes(id) && id !== preferredSpotId);
                spotsToAssign.push(...otherAvailableSpots);

                if (spotsToAssign.length < number_of_vehicles) {
                    throw new Error(`Not enough parking spots for ${date} (need ${number_of_vehicles}, available ${spotsToAssign.length})`);
                }

                for (let v = 0; v < number_of_vehicles; v++) {
                    const currentAssignedSpot = spotsToAssign[v];

                    addonValues.push([
                        hotel_id,
                        detail.id,
                        3,
                        'parking',
                        '駐車場',
                        unit_price,
                        1,
                        1,
                        10,
                        userId
                    ]);

                    parkingValues.push({
                        hotel_id,
                        reservation_details_id: detail.id,
                        vehicle_category_id,
                        parking_spot_id: currentAssignedSpot,
                        date: formatDate(new Date(date)),
                        created_by: userId
                    });
                }
            }

            // 5. Insert addons in batch
            for (let i = 0; i < addonValues.length; i += BATCH_SIZE) {
                const batch = addonValues.slice(i, i + BATCH_SIZE);
                const placeholders = batch.map(
                    (_, idx) => `($${idx*10+1},$${idx*10+2},$${idx*10+3},$${idx*10+4},$${idx*10+5},$${idx*10+6},$${idx*10+7},$${idx*10+8},$${idx*10+9},$${idx*10+10})`
                ).join(',');

                const flatValues = batch.flat();
                const res = await localClient.query(
                    `INSERT INTO reservation_addons 
                        (hotel_id,reservation_detail_id,addons_global_id,addon_type,addon_name,price,quantity,tax_type_id,tax_rate,created_by)
                     VALUES ${placeholders} RETURNING id`
                    , flatValues
                );

                // assign returned addon IDs to parkingValues
                for (let j = 0; j < res.rows.length; j++) {
                    parkingValues[i + j].reservation_addon_id = res.rows[j].id;
                }
            }

            // 6. Insert reservation_parking in batch
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
                        (hotel_id,reservation_details_id,reservation_addon_id,vehicle_category_id,parking_spot_id,date,status,created_by) VALUES ${placeholders}`
                    , flatValues
                );
            }


            //console.log(`Successfully created all parking assignments for assignment ${index + 1}`);
        }

        await localClient.query('COMMIT');
        //console.log('Transaction committed successfully');
        return { success: true, message: 'Parking assignments saved successfully' };
    } catch (error) {
        console.error('Error in saveParkingAssignments:', error);
        if (releaseClient) {
            try { await localClient.query('ROLLBACK'); } catch (rollbackError) { console.error('Error during rollback:', rollbackError); }
        }
        throw error;
    } finally {
        if (releaseClient) {
            try { localClient.release(); } catch (releaseError) { console.error('Error during client release:', releaseError); }
        }
    }
};

module.exports = {
    createVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot,
    createParkingSpot,
    updateParkingSpot,
    deleteParkingSpot,
    blockParkingSpot,
    syncParkingSpots,
    createParkingAssignmentWithAddon,
    updateParkingAssignmentAddon,
    removeParkingAssignmentsByAddon,
    bulkDeleteParkingAddonAssignments,
    saveParkingAssignments,
};
