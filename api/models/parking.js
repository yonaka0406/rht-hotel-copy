let getPool = require('../config/database').getPool;
const format = require('pg-format');

// Vehicle Category
const getVehicleCategories = async (requestId) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM vehicle_categories ORDER BY capacity_units_required, name';
    const result = await pool.query(query);
    return result.rows;
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

// Parking Lot
const getParkingLots = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM parking_lots WHERE hotel_id = $1 ORDER BY id';
    const values = [hotel_id];
    const result = await pool.query(query, values);
    return result.rows;
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

// Parking Spot
const getParkingSpots = async (requestId, parking_lot_id) => {
    const pool = getPool(requestId);
    const query = 'SELECT * FROM parking_spots WHERE parking_lot_id = $1 ORDER BY id';
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
        WHERE pl.hotel_id = $1 
        AND ps.is_active = true
        AND ps.capacity_units >= $2
        AND ps.id NOT IN (
            SELECT DISTINCT rp.parking_spot_id
            FROM reservation_parking rp
            WHERE rp.hotel_id = $1
            AND rp.date >= $3
            AND rp.date < $4
            AND rp.cancelled IS NULL
        )
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
        WHERE pl.hotel_id = $1 
        AND ps.is_active = true
        AND ps.capacity_units >= $2
        AND ps.id NOT IN (
            SELECT DISTINCT rp.parking_spot_id
            FROM reservation_parking rp
            WHERE rp.hotel_id = $1
            AND rp.date >= $3
            AND rp.date < $4
            AND rp.cancelled IS NULL
        )
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
        console.log('Starting bulk delete with IDs:', assignmentIds);
        await client.query('BEGIN');

        // Get the addon IDs for the assignments we're about to delete
        const getAddonsQuery = {
            text: `SELECT id, reservation_addon_id 
                   FROM reservation_parking 
                   WHERE reservation_addon_id = ANY($1::uuid[])`,
            values: [assignmentIds]
        };
        
        console.log('Executing query to find addon IDs:', getAddonsQuery);
        const addonsResult = await client.query(getAddonsQuery);
        console.log('Found addon records:', addonsResult.rows);
        
        const addonIds = addonsResult.rows.map(row => row.reservation_addon_id);
        console.log('Extracted addon IDs:', addonIds);

        if (addonIds.length === 0) {
            console.log('No matching records found for the provided IDs');
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
        console.log('Deleting parking assignments with query:', deleteParkingQuery);
        const deleteResult = await client.query(deleteParkingQuery);
        const deletedCount = deleteResult.rowCount;
        console.log('Deleted parking assignments:', deleteResult.rows);

        // Then delete the associated addon records
        if (addonIds.length > 0) {
            const deleteAddonsQuery = {
                text: 'DELETE FROM reservation_addons WHERE id = ANY($1::uuid[]) RETURNING *',
                values: [addonIds]
            };
            console.log('Deleting addon records with query:', deleteAddonsQuery);
            const deletedAddons = await client.query(deleteAddonsQuery);
            console.log('Deleted addon records:', deletedAddons.rows);
        }

        await client.query('COMMIT');
        console.log('Transaction committed successfully');

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

const saveParkingAssignments = async (requestId, reservationDetailIds, assignments) => {
    const pool = getPool(requestId);
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const toCreate = assignments.filter(a => a.id.toString().startsWith('temp-'));
        const toUpdate = assignments.filter(a => !a.id.toString().startsWith('temp-') && !a.toDelete);
        const toDelete = assignments.filter(a => a.toDelete);

        // Handle deletions
        if (toDelete.length > 0) {
            const deleteIds = toDelete.map(a => a.id);
            await client.query('DELETE FROM reservation_parking WHERE id = ANY($1::uuid[])', [deleteIds]);
            await client.query('DELETE FROM reservation_addons WHERE id = ANY($1::uuid[])', [deleteIds]);
        }

        // Handle creations
        for (const assignment of toCreate) {
            const hotel_id = assignment.hotel_id;
            if (!hotel_id) {
                throw new Error('hotel_id is required in the assignment object');
            }
            
            // We should only have one detail ID per assignment
            const detailId = reservationDetailIds[0];
            
            for (const date of assignment.dates) {
                const addonRes = await client.query(
                    `INSERT INTO reservation_addons (
                        hotel_id,
                        reservation_detail_id, 
                        addons_global_id,
                        addons_hotel_id,
                        addon_type,
                        price, 
                        quantity
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                    [
                        hotel_id,
                        detailId, 
                        assignment.addons_global_id || 3,
                        assignment.addons_hotel_id || null,
                        assignment.addon_type || 'parking',
                        assignment.unitPrice || 0,
                        1
                    ]
                );
                const reservationAddonId = addonRes.rows[0].id;

                await client.query(
                    `INSERT INTO reservation_parking (
                        hotel_id,
                        reservation_details_id,
                        reservation_addon_id,
                        vehicle_category_id,
                        parking_spot_id,
                        date,
                        status
                    ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
                    [
                        hotel_id,
                        detailId,
                        reservationAddonId,
                        assignment.vehicleCategoryId,
                        assignment.spotId,
                        date
                    ]
                );
            }
        }

        // Handle updates
        for (const assignment of toUpdate) {
            // For simplicity, we'll delete and recreate. A more robust solution would be to update existing records.
            await client.query('DELETE FROM reservation_parking WHERE reservation_addon_id = $1', [assignment.id]);
            await client.query('DELETE FROM reservation_addons WHERE id = $1', [assignment.id]);

            const hotel_id = assignment.hotel_id;
            if (!hotel_id) {
                throw new Error('hotel_id is required in the assignment object');
            }

            for (const detailId of reservationDetailIds) {
                for (const date of assignment.dates) {
                    const addonRes = await client.query(
                        `INSERT INTO reservation_addons (
                            hotel_id,
                            reservation_detail_id, 
                            addons_global_id,
                            addons_hotel_id,
                            addon_type,
                            price, 
                            quantity
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
                        [
                            hotel_id,
                            detailId,
                            assignment.addons_global_id || 3,
                            assignment.addons_hotel_id || null,
                            assignment.addon_type || 'parking',
                            assignment.unitPrice || 0,
                            1
                        ]
                    );
                    const reservationAddonId = addonRes.rows[0].id;

                    await client.query(
                        `INSERT INTO reservation_parking (
                            hotel_id,
                            reservation_details_id,
                            reservation_addon_id,
                            vehicle_category_id,
                            parking_spot_id,
                            date,
                            status
                        ) VALUES ($1, $2, $3, $4, $5, $6, 'confirmed')`,
                        [
                            hotel_id,
                            detailId,
                            reservationAddonId,
                            assignment.vehicleCategoryId,
                            assignment.spotId,
                            date
                        ]
                    );
                }
            }
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error in saveParkingAssignments:', error);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    getVehicleCategories,
    createVehicleCategory,
    updateVehicleCategory,
    deleteVehicleCategory,
    getParkingLots,
    createParkingLot,
    updateParkingLot,
    deleteParkingLot,
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
