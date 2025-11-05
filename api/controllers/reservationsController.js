const {
  selectAvailableRooms, selectReservedRooms, selectReservation, selectReservationDetail, selectReservationAddons, selectMyHoldReservations, selectReservationsToday, selectAvailableDatesForChange, selectReservationClientIds, selectReservationPayments,
  selectRoomsForIndicator, selectFailedOtaReservations, selectParkingSpotAvailability, getHotelIdByReservationId, addReservationHold, addReservationDetail,
  addReservationDetailsBatch, addReservationAddon, addReservationClient, addRoomToReservation, insertReservationPayment, insertBulkReservationPayment,
  updateReservationDetail, updateReservationStatus, updateReservationDetailStatus, updateReservationComment, updateReservationCommentFlag, updateReservationTime,
  updateReservationType, updateReservationResponsible, updateRoomByCalendar, updateCalendarFreeChange, updateReservationRoomGuestNumber, updateReservationGuest,
  updateReservationDetailPlan, updateReservationDetailAddon, updateReservationDetailRoom, updateReservationRoom,
  updateReservationRoomWithCreate, updateReservationRoomPlan, updateReservationRoomPattern, updateBlockToReservation,
  deleteHoldReservationById, deleteReservationAddonsByDetailId, deleteReservationClientsByDetailId, deleteReservationRoom, deleteReservationPayment,
  insertCopyReservation, selectReservationParking, deleteParkingReservation, deleteBulkParkingReservations, cancelReservationRooms: cancelReservationRoomsModel,
  updatePaymentTiming, updateReservationRoomsPeriod, splitReservation,
} = require('../models/reservations');
const { addClientByName } = require('../models/clients');
const { getPriceForReservation } = require('../models/planRate');
const logger = require('../config/logger');
const { getPool } = require('../config/database');

//Helper
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// GET
const getAvailableRooms = async (req, res) => {
  const { hotel_id, start_date, end_date } = req.query;

  if (!hotel_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required query parameters: hotel_id, start_date, and end_date.' });
  }

  try {
    const availableRooms = await selectAvailableRooms(req.requestId, hotel_id, start_date, end_date);

    if (availableRooms.length === 0) {
      return res.status(201).json({ message: 'No available rooms for the specified period.' });
    }

    return res.status(200).json({ availableRooms });
  } catch (error) {
    console.error('Error fetching available rooms:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching available rooms.' });
  }
};

const getReservedRooms = async (req, res) => {
  const { hotel_id, start_date, end_date } = req.query;

  if (!hotel_id || !start_date || !end_date) {
    return res.status(400).json({ error: 'Missing required query parameters: hotel_id, start_date, and end_date.' });
  }

  // Validate and format dates
  const formatDate = (dateStr) => {
    // Check if date is in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Try to parse YY-MM-DD format (e.g., 20-08-26)
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      // Assuming years 00-79 are 2000-2079
      const fullYear = year >= 80 ? 1900 + year : 2000 + year;
      return `${fullYear}-${match[2]}-${match[3]}`;
    }

    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD or YY-MM-DD`);
  };

  try {
    const formattedStartDate = formatDate(start_date);
    const formattedEndDate = formatDate(end_date);

    const reservedRooms = await selectReservedRooms(req.requestId, hotel_id, formattedStartDate, formattedEndDate);

    if (reservedRooms.length === 0) {
      return res.status(201).json({ message: 'No reserved rooms for the specified period.' });
    }

    return res.status(200).json({ reservedRooms });
  } catch (error) {
    console.error('Error fetching reserved rooms:', error);
    if (error.message.includes('Invalid date format')) {
      return res.status(400).json({
        error: error.message,
        details: 'Please provide dates in YYYY-MM-DD format (e.g., 2020-08-26) or YY-MM-DD format (e.g., 20-08-26)'
      });
    }
    return res.status(500).json({ error: 'Database error occurred while fetching reserved rooms.' });
  }
};

const getReservation = async (req, res) => {
  const { id, hotel_id } = req.query;
  const { validate: uuidValidate } = require('uuid');

  if (!id || id === 'null' || id === 'undefined' || !uuidValidate(id)) {
    logger.warn(`[getReservation] Invalid reservation ID received: ${id}`);
    return res.status(400).json({ error: 'A valid reservation ID must be provided.' });
  }

  try {
    const reservation = await selectReservation(req.requestId, id, hotel_id);

    if (reservation.length === 0) {
      return res.status(404).json({ message: 'No reservation for the provided id.' });
    }

    return res.status(200).json({ reservation });
  } catch (error) {
    logger.error(`[${req.requestId}] getReservation - Error fetching reservation: ${error.message}`, {
      stack: error.stack,
      id,
      hotel_id
    });
    return res.status(500).json({ error: 'Database error occurred while fetching reservation.' });
  }
};

const getReservationDetails = async (req, res) => {
  const { id, hotel_id } = req.query;

  try {
    const reservation = await selectReservationDetail(req.requestId, id, hotel_id);

    if (reservation.length === 0) {
      return res.status(404).json({ message: 'No reservation detail for the provided id.' });
    }

    return res.status(200).json({ reservation });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservation.' });
  }
}

const getMyHoldReservations = async (req, res) => {
  const user_id = req.user.id;

  try {
    const reservations = await selectMyHoldReservations(req.requestId, user_id);

    // Return empty array with 200 status if no reservations found
    return res.status(200).json({ reservations: reservations || [] });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservations.' });
  }
};

const getReservationsToday = async (req, res) => {
  const { hid, date } = req.params;

  if (!hid || isNaN(parseInt(hid))) {
    return res.status(400).json({ error: 'Invalid hotel ID' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!date || !dateRegex.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  try {
    const hotelId = parseInt(hid, 10);
    const reservations = await selectReservationsToday(req.requestId, hotelId, date);
    return res.status(200).json({ reservations: reservations || [] });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({
      error: 'Database error occurred while fetching reservations.',
      details: error.message
    });
  }
};

const getRoomsForIndicator = async (req, res) => {
  const { hid, date } = req.params;

  if (!hid || isNaN(parseInt(hid))) {
    return res.status(400).json({ error: 'Invalid hotel ID' });
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!date || !dateRegex.test(date)) {
    return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
  }

  try {
    const hotelId = parseInt(hid, 10);
    const rooms = await selectRoomsForIndicator(req.requestId, hotelId, date);
    return res.status(200).json({ rooms: rooms || [] });
  } catch (error) {
    console.error('Error fetching rooms for indicator:', error);
    return res.status(500).json({
      error: 'Database error occurred while fetching rooms for indicator.',
      details: error.message
    });
  }
};

const getAvailableDatesForChange = async (req, res) => {
  const { hid, rid, ci, co } = req.params;

  try {
    const { earliestCheckIn, latestCheckOut } = await selectAvailableDatesForChange(req.requestId, hid, rid, ci, co);
    res.status(200).json({ earliestCheckIn, latestCheckOut });
  } catch (error) {
    console.error('Error getting available dates for change:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }

};

const getReservationClientIds = async (req, res) => {
  const { hid, id } = req.params;

  try {
    const clients = await selectReservationClientIds(req.requestId, hid, id);
    res.status(200).json({ clients });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getReservationPayments = async (req, res) => {
  const { hid, id } = req.params;

  try {
    const payments = await selectReservationPayments(req.requestId, hid, id);
    res.status(200).json({ payments });
  } catch (error) {
    console.error('Error getting payments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getReservationParking = async (req, res) => {
  const { hid: hotel_id, id: reservation_id } = req.params;

  if (!hotel_id || !reservation_id) {
    return res.status(400).json({
      error: 'Missing required parameters: hotel_id and reservation_id are required'
    });
  }

  try {
    const parkingReservations = await selectReservationParking(
      req.requestId,
      hotel_id,
      reservation_id
    );

    return res.status(200).json({ parking: parkingReservations });
  } catch (error) {
    console.error('Error fetching reservation parking:', error);
    return res.status(500).json({
      error: 'An error occurred while fetching reservation parking',
      details: error.message
    });
  }
};

const getParkingSpotAvailability = async (req, res) => {
  const { hotelId, startDate, endDate } = req.query;

  if (!hotelId || !startDate || !endDate) {
    return res.status(400).json({ error: 'Missing required query parameters: hotelId, startDate, and endDate.' });
  }

  try {
    const parkingSpotAvailability = await selectParkingSpotAvailability(req.requestId, hotelId, startDate, endDate);

    if (parkingSpotAvailability.length === 0) {
      return res.status(200).json({ message: 'No parking spot availability data for the specified period.', parkingSpotAvailability: [] });
    }

    return res.status(200).json({ parkingSpotAvailability });
  } catch (error) {
    console.error('Error fetching parking spot availability:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching parking spot availability.' });
  }
};

const getHotelIdForReservation = async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ error: 'Missing required parameter: reservation ID.' });
  }

  try {
    const hotelId = await getHotelIdByReservationId(req.requestId, id);

    if (hotelId === null) {
      return res.status(404).json({ message: 'Hotel ID not found for the provided reservation ID.' });
    }

    return res.status(200).json({ hotel_id: hotelId });
  } catch (error) {
    console.error('Error fetching hotel ID for reservation:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching hotel ID.' });
  }
};

// POST
const createReservationHold = async (req, res) => {
  const {
    hotel_id,
    room_type_id,
    room_id,
    client_id,
    check_in,
    check_out,
    number_of_people,
    name,
    legal_or_natural_person,
    gender,
    email,
    phone,
    vehicle_category_id,
  } = req.body;

  const created_by = req.user.id;
  const updated_by = req.user.id;

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // --- Step 1: Create or fetch client ---
    let finalClientId = client_id;
    if (!client_id) {
      const clientData = { name, legal_or_natural_person, gender, email, phone, created_by, updated_by };
      const newClient = await addClientByName(req.requestId, clientData, client);
      finalClientId = newClient.id;
    }

    // --- Step 2: Create reservation ---
    const reservationData = {
      hotel_id,
      reservation_client_id: finalClientId,
      check_in,
      check_out,
      number_of_people,
      vehicle_category_id,
      created_by,
      updated_by
    };
    const newReservation = await addReservationHold(req.requestId, reservationData, client);

    // --- Step 3: Get available rooms ---
    let availableRooms = await selectAvailableRooms(req.requestId, hotel_id, check_in, check_out, client);

    // Filter rooms if needed
    if (room_type_id) {
      availableRooms = availableRooms.filter(r => r.room_type_id === Number(room_type_id));
    } else if (room_id) {
      availableRooms = availableRooms.filter(r => r.room_id === Number(room_id));
    }

    if (availableRooms.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No available rooms for the specified period.' });
    }

    // --- Step 4: Assign people to rooms ---
    const dateRange = [];
    let currentDate = new Date(check_in);
    while (currentDate < new Date(check_out)) {
      dateRange.push(formatDate(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    let remainingPeople = number_of_people;
    const reservationDetails = [];

    while (remainingPeople > 0 && availableRooms.length > 0) {
      // Pick smallest room that can accommodate remaining people
      availableRooms.sort((a, b) => a.capacity - b.capacity);
      let room = availableRooms.find(r => r.capacity >= remainingPeople) || availableRooms[availableRooms.length - 1];
      const assigned = Math.min(remainingPeople, room.capacity);

      dateRange.forEach(date => {
        reservationDetails.push({
          reservation_id: newReservation.id,
          hotel_id,
          room_id: room.room_id,
          date,
          plans_global_id: null,
          plans_hotel_id: null,
          plan_name: null,
          plan_type: 'per_room',
          number_of_people: assigned,
          price: 0,
          created_by,
          updated_by,
        });
      });

      remainingPeople -= assigned;
      availableRooms = availableRooms.filter(r => r.room_id !== room.room_id);
    }

    // --- Step 5: Batch insert reservation details ---
    const createdReservationDetails = await addReservationDetailsBatch(req.requestId, reservationDetails, client);

    await client.query('COMMIT');
    res.status(201).json({ reservation: newReservation });

  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to create reservation' });
  } finally {
    client.release();
  }
};

const createHoldReservationCombo = async (req, res) => {
  const { header, combo } = req.body;
  const user_id = req.user.id;

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  // Compute date range
  const dateRange = [];
  let currentDate = new Date(header.check_in);
  while (currentDate < new Date(header.check_out)) {
    dateRange.push(formatDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  try {
    await client.query('BEGIN');

    // --- Step 1: Create or fetch client ---
    let finalClientId = header.client_id;

    // Check if client_id is null and create a new client if needed.
    if (!header.client_id) {
      logger.debug(`[${req.requestId}] createHoldReservationCombo - Creating new client`);
      const clientData = {
        name: header.name,
        legal_or_natural_person: header.legal_or_natural_person,
        gender: header.gender,
        email: header.email,
        phone: header.phone,
        user_id,
      };
      const newClient = await addClientByName(req.requestId, clientData, client);
      finalClientId = newClient.id;
      logger.debug(`[${req.requestId}] createHoldReservationCombo - Created new client`, { client_id: finalClientId });
    }

    // --- Step 2: Create main reservation ---
    const reservationData = {
      hotel_id: header.hotel_id,
      reservation_client_id: finalClientId,
      check_in: header.check_in,
      check_out: header.check_out,
      number_of_people: header.number_of_people,
      created_by: user_id,
      updated_by: user_id
    };
    const newReservation = await addReservationHold(req.requestId, reservationData, client);

    // --- Step 3: Get available rooms ---
    let availableRooms = await selectAvailableRooms(req.requestId, header.hotel_id, header.check_in, header.check_out, client);

    const reservationDetails = [];

    // --- Step 4: Loop through each room type in combo ---
    for (const roomTypeId in combo) {
      const roomCombo = combo[roomTypeId];
      let remainingPeople = roomCombo.totalPeople;

      // Filter and sort available rooms
      let availableRoomsFiltered = availableRooms
        .filter(room => room.room_type_id === roomCombo.room_type_id)
        .sort((a, b) => a.capacity - b.capacity);

      const selectedRooms = availableRoomsFiltered.slice(0, roomCombo.totalRooms);

      if (selectedRooms.length < roomCombo.totalRooms) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Not enough rooms available for room type: ${roomCombo.room_type_name}` });
      }

      // --- Step 4a: Assign people to rooms ---
      const roomAssignments = new Map();
      selectedRooms.forEach(room => roomAssignments.set(room.room_id, { room, people: 0 }));

      // 1. Assign one person to each room
      for (const room of selectedRooms) {
        if (remainingPeople > 0) {
          roomAssignments.get(room.room_id).people += 1;
          remainingPeople -= 1;
        }
      }

      // 2. Distribute remaining people
      if (remainingPeople > 0) {
        for (const room of selectedRooms) {
          const assignment = roomAssignments.get(room.room_id);
          const availableCapacity = assignment.room.capacity - assignment.people;
          const toAssign = Math.min(remainingPeople, availableCapacity);
          if (toAssign > 0) {
            assignment.people += toAssign;
            remainingPeople -= toAssign;
          }
        }
      }

      if (remainingPeople > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: `Not enough capacity for room type: ${roomCombo.room_type_name}` });
      }

      // --- Step 4b: Generate reservation details ---
      roomAssignments.forEach(assignment => {
        if (assignment.people > 0) {
          dateRange.forEach(date => {
            reservationDetails.push({
              reservation_id: newReservation.id,
              hotel_id: header.hotel_id,
              room_id: assignment.room.room_id,
              date,
              plans_global_id: null,
              plans_hotel_id: null,
              plan_name: null,
              plan_type: 'per_room',
              number_of_people: assignment.people,
              price: 0,
              created_by: user_id,
              updated_by: user_id,
            });
          });
        }
      });

      // Remove assigned rooms from availableRooms
      availableRooms = availableRooms.filter(r => !selectedRooms.find(sr => sr.room_id === r.room_id));
    }

    // --- Step 5: Batch insert reservation details ---
    const createdReservationDetails = await addReservationDetailsBatch(req.requestId, reservationDetails, client);

    await client.query('COMMIT');

    res.status(201).json({
      reservation: newReservation
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`[${req.requestId}] createHoldReservationCombo - Error: ${err.message}`, { stack: err.stack });
    res.status(500).json({ error: 'Failed to create reservation' });
  } finally {
    client.release();
  }
};

const createReservationDetails = async (req, res) => {
  const {
    ogm_id,
    hotel_id,
    reservation_id,
    date,
    room_id,
    plans_global_id,
    plans_hotel_id,
    plan_name,
    plan_type,
    number_of_people,
    price,
    addons,
  } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  const pool = getPool(req.requestId);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Add the reservation
    const reservationData = {
      hotel_id,
      reservation_id,
      date,
      room_id,
      plans_global_id,
      plans_hotel_id,
      plan_name,
      plan_type,
      number_of_people,
      price,
      created_by,
      updated_by
    };

    // Add the reservation to the database
    const newReservationDetail = await addReservationDetail(req.requestId, reservationData, client);

    if (!newReservationDetail || !newReservationDetail.id) {
      logger.error('Failed to create reservation detail: Invalid response from addReservationDetail.', {
        requestId: req.requestId,
        reservationData: reservationData,
        newReservationDetail: newReservationDetail // Include the actual response for debugging
      });
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Failed to create reservation detail: Invalid response from addReservationDetail.' });
    }

    // console.log('newReservationDetail:', newReservationDetail);
    // console.log('ogm_id:', ogm_id);
    const ogmReservationAddons = await selectReservationAddons(req.requestId, ogm_id, hotel_id, client);
    // console.log('ogmReservationAddons:', ogmReservationAddons);

    // Update reservation guests
    for (let i = 0; i < number_of_people; i++) {
      await updateReservationGuest(req.requestId, ogm_id, newReservationDetail.id, client);
      // console.log('Updated ', i + 1,' of number of guests: ',number_of_people);
    }

    if (ogmReservationAddons && ogmReservationAddons.length > 0) {
      const addOnPromises = ogmReservationAddons.map(addon =>
        addReservationAddon(req.requestId, {
          hotel_id: addon.hotel_id,
          reservation_detail_id: newReservationDetail.id,
          addons_global_id: addon.addons_global_id,
          addons_hotel_id: addon.addons_hotel_id,
          addon_name: addon.addon_name,
          quantity: addon.quantity,
          price: addon.price,
          tax_type_id: addon.tax_type_id,
          tax_rate: addon.tax_rate,
          created_by: updated_by,
          updated_by,
        }, client)
      );

      // Wait for all add-ons to be added
      await Promise.all(addOnPromises);
    }

    await client.query('COMMIT');

    // Send success response
    res.status(201).json({
      message: 'Reservation details and addons created successfully',
      reservation_detail: newReservationDetail,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(`Error creating reservation detail`, { error: err, requestId: req.requestId });
    res.status(500).json({ error: 'Failed to create reservation detail' });
  } finally {
    client.release();
  }
};

const createReservationAddons = async (req, res) => {
  const {
    hotel_id,
    reservation_detail_id,
    addons_global_id,
    addons_hotel_id,
    addon_name,
    quantity,
    price,
    tax_type_id,
    tax_rate,
  } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  try {
    // Add the reservation with the final client_id
    const reservationData = {
      hotel_id,
      reservation_detail_id,
      addons_global_id,
      addons_hotel_id,
      addon_name,
      quantity,
      price,
      tax_type_id,
      tax_rate,
      created_by,
      updated_by
    };

    // Add the reservation to the database
    const newReservationAddon = await addReservationAddon(req.requestId, reservationData);

    res.status(201).json({
      addons: newReservationAddon,
    });

  } catch (err) {
    console.error('Error creating reservation addon:', err);
    res.status(500).json({ error: 'Failed to create reservation addon' });
  }
};

const createReservationClient = async (req, res) => {
  const {
    hotel_id,
    reservation_detail_id,
    client_id,
  } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  try {
    // Add the reservation with the final client_id
    const reservationData = {
      hotel_id,
      reservation_detail_id,
      client_id,
      created_by,
      updated_by
    };

    // Add the reservation to the database
    const newReservationClient = await addReservationClient(req.requestId, reservationData);

    res.status(201).json({
      clients: newReservationClient,
    });

  } catch (err) {
    console.error('Error creating reservation client:', err);
    res.status(500).json({ error: 'Failed to create reservation client' });
  }
}

const addNewRoomToReservation = async (req, res) => {
  const { reservationId, numberOfPeople, roomId } = req.body;
  const userId = req.user.id;

  try {
    const newRoom = await addRoomToReservation(req.requestId, reservationId, numberOfPeople, roomId, userId);
    res.status(200).json({
      message: 'Room added to reservation successfully',
      data: newRoom
    });
  } catch (err) {
    console.error('Error adding new room to reservation:', err);
    res.status(500).json({
      message: 'Database error',
      error: err.message
    });
  }
};

// POST
const alterReservationRoom = async (req, res) => {
  const { reservationId, numberOfPeopleOGM, numberOfPeopleToMove, roomIdOld, roomIdNew } = req.body;
  const userId = req.user.id;

  try {
    if (numberOfPeopleToMove === numberOfPeopleOGM) {
      const newRoom = await updateReservationRoom(req.requestId, reservationId, roomIdOld, roomIdNew, userId);
      res.status(200).json({
        message: 'Room changed in reservation successfully',
        data: newRoom
      });
    }
    if (numberOfPeopleToMove < numberOfPeopleOGM) {
      const newRoom = await updateReservationRoomWithCreate(req.requestId, reservationId, roomIdOld, roomIdNew, numberOfPeopleToMove, userId);
      res.status(200).json({
        message: 'Room added to reservation successfully',
        data: newRoom
      });
    }
  } catch (err) {
    console.error('Error moving room:', err);
    res.status(500).json({
      message: 'Database error',
      error: err.message
    });
  }

};

const createReservationPayment = async (req, res) => {
  const { hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment } = req.body;
  const userId = req.user.id;

  try {
    const newPMT = await insertReservationPayment(req.requestId, hotelId, reservationId, date, roomId, clientId, paymentTypeId, value, comment, userId);
    res.status(200).json({
      message: 'Payment added to reservation successfully',
      data: newPMT
    });
  } catch (err) {
    console.error('Error adding payment:', err);
    res.status(500).json({
      message: 'Database error',
      error: err.message
    });
  }
};
const createBulkReservationPayment = async (req, res) => {
  const data = req.body;
  const userId = req.user.id;

  try {
    const newPMT = await insertBulkReservationPayment(req.requestId, data, userId);
    res.status(200).json({
      message: 'Payments added to reservation successfully',
      data: newPMT
    });
  } catch (err) {
    console.error('Error adding payment:', err);
    res.status(500).json({
      message: 'Database error',
      error: err.message
    });
  }
};

// PUT
const editReservationDetail = async (req, res) => {
  const { id } = req.params;
  const {
    hotel_id
    , room_id
    , plans_global_id
    , plans_hotel_id
    , plan_name
    , plan_type
    , number_of_people
    , price
    , addons
    , overrideRounding
  } = req.body;
  const updated_by = req.user.id;

  const { validate: uuidValidate } = require('uuid');
  let calcPrice = { value: price };
  let planChange = false;

  // console.log('Body parameters:', req.body);
  if (!uuidValidate(id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  try {
    // Fetch the existing reservation detail from the database to compare with the new data
    const existingReservation = await selectReservationDetail(req.requestId, id);

    // Check if the plans_global_id and plans_hotel_id has changed
    if (
      existingReservation[0].plans_global_id !== plans_global_id ||
      existingReservation[0].plans_hotel_id !== plans_hotel_id
    ) {
      planChange = true;
      const newPrice = await getPriceForReservation(req.requestId,
        plans_global_id,
        plans_hotel_id,
        hotel_id,
        formatDate(existingReservation[0].date),
        overrideRounding
      );

      if (newPrice !== undefined) {
        calcPrice.value = newPrice;
        //console.log('Calculated newPrice:', newPrice);  
      } else {
        // Handle the case where newPrice is undefined (fallback value)
        // console.log('Error: newPrice is undefined. Falling back to default value.');
        calcPrice.value = 0;  // You can set a default fallback value if needed
      }
    }

    // Call the function to update reservation detail in the database
    const updatedReservation = await updateReservationDetail(req.requestId, {
      id,
      hotel_id,
      room_id,
      plans_global_id,
      plans_hotel_id,
      plan_name,
      plan_type,
      number_of_people,
      price: calcPrice.value,
      updated_by,
    });
    if (planChange) {
      const deletedAddonsCount = await deleteReservationAddonsByDetailId(req.requestId, updatedReservation.id, hotel_id, updated_by);
    }

    // Add the reservation add-ons if any
    if (addons && addons.length > 0) {
      // const deletedAddonsCount = await deleteReservationAddonsByDetailId(req.requestId, updatedReservation.id, updated_by);
      // console.log(`Deleted ${deletedAddonsCount} add-ons for reservation detail id: ${updatedReservation.id}`);

      const addOnPromises = addons.map(addon =>
        addReservationAddon(req.requestId, {
          hotel_id,
          reservation_detail_id: updatedReservation.id,
          addons_global_id: addon.addons_global_id,
          addons_hotel_id: addon.addons_hotel_id,
          addon_name: addon.addon_name,
          quantity: addon.quantity,
          price: addon.price,
          tax_type_id: addon.tax_type_id,
          tax_rate: addon.tax_rate,
          created_by: updated_by,
          updated_by,
        })
      );

      // Wait for all add-ons to be added
      await Promise.all(addOnPromises);
    }

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationGuests = async (req, res) => {
  const { id } = req.params;
  const guestDataArray = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  try {

    if (guestDataArray && guestDataArray.guestsToAdd) {
      const guestsToAdd = guestDataArray.guestsToAdd;

      // Handle addClientByName and update guestsToAdd *only for the first row*
      for (let i = 0; i < guestsToAdd.length; i++) {
        let guest = guestsToAdd[i];
        let finalClientId = guest.id;

        if (!finalClientId) {
          const clientData = {
            name: guest.name,
            legal_or_natural_person: guest.legal_or_natural_person,
            gender: guest.gender,
            email: guest.email,
            phone: guest.phone,
            created_by,
            updated_by,
          };
          const newClient = await addClientByName(req.requestId, clientData);
          finalClientId = newClient.id;
          guestsToAdd[i] = { ...guest, id: finalClientId };
        }
      }

      // Update guestsToAdd array in guestDataArray      
      guestDataArray.guestsToAdd = guestsToAdd;
    }

    const existingReservation = await selectReservation(req.requestId, id, guestDataArray.hotel_id);
    if (existingReservation.length === 0) {
      return res.status(404).json({ error: "Reservation not found or no details associated with it." });
    }

    const filteredReservations = existingReservation.filter(reservation => reservation.room_id === guestDataArray.room_id);

    for (const reservationDetail of filteredReservations) {
      // Delete existing clients for this reservation detail
      await deleteReservationClientsByDetailId(req.requestId, reservationDetail.id, updated_by);

      // Add the new clients
      if (guestDataArray.guestsToAdd && guestDataArray.guestsToAdd.length > 0) {
        for (let i = 0; i < guestDataArray.guestsToAdd.length; i++) {
          let guest = guestDataArray.guestsToAdd[i];
          let finalClientId = guest.id;

          if (finalClientId) {
            const guestInfo = {
              hotel_id: reservationDetail.hotel_id,
              reservation_details_id: reservationDetail.id,
              client_id: finalClientId,
              created_by,
              updated_by,
            };
            await addReservationClient(req.requestId, guestInfo);
          } else {
            //console.log("Client ID was empty after add client by name");
          }
        }
      }
    }

    res.status(200).json({ message: "Guests updated successfully" }); // Send a success response

  } catch (err) {
    console.error("Error updating guests:", err);
    res.status(500).json({ error: "Failed to update guests" }); // Send an error response

  }
};

const editReservationPlan = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, plan, rates, price, overrideRounding } = req.body;
  const user_id = req.user.id;

  try {
    const updatedReservation = await updateReservationDetailPlan(req.requestId, id, hotel_id, plan, rates, price, user_id, overrideRounding);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationAddon = async (req, res) => {
  const { id, hid } = req.params;
  const addons = req.body;
  const user_id = req.user.id;

  //console.log('[reservationsController] editReservationAddon', {
  //  'id': id,
  //  'hotel_id': hid
  //})

  try {
    const updatedReservation = await updateReservationDetailAddon(req.requestId, id, hid, addons, user_id);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationRoom = async (req, res) => {
  const { id } = req.params;
  const { room_id } = req.body;
  const user_id = req.user.id;

  try {
    const updatedReservation = await updateReservationDetailRoom(req.requestId, id, room_id, user_id);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationRoomPlan = async (req, res) => {
  const { hid, rid, id } = req.params;
  const { plan, addons, daysOfTheWeek, overrideRounding } = req.body;
  const user_id = req.user.id;

  try {
    const updateData = {
      reservationId: id,
      hotelId: hid,
      roomId: rid,
      plan,
      addons,
      daysOfTheWeek,
      userId: user_id,
      overrideRounding
    };
    //console.log('DEBUGGING editReservationRoomPlan ARGS:', updateData);

    const updatedReservation = await updateReservationRoomPlan(req.requestId, updateData);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    if (err.name === 'NotFoundError') {
      return res.status(404).json({ error: 'Reservation not found' });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationRoomPattern = async (req, res) => {
  const { hid, rid, id } = req.params;
  const { pattern, overrideRounding } = req.body;
  const user_id = req.user.id;

  try {
    const updatedReservation = await updateReservationRoomPattern(req.requestId, id, hid, rid, pattern, user_id, overrideRounding);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, status } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateReservationStatus(req.requestId, {
      id,
      hotel_id,
      status,
      updated_by,
    });

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
};
const editReservationDetailStatus = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, status, billable } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateReservationDetailStatus(req.requestId, {
      id,
      hotel_id,
      status,
      updated_by,
      billable,
    });

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation status:', err);
    res.status(500).json({ error: 'Failed to update reservation status' });
  }
};

const editReservationComment = async (req, res) => {
  const { id } = req.params;
  const { hotelId, comment } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation comment in the database
    const updatedReservation = await updateReservationComment(req.requestId, {
      id,
      hotelId,
      comment,
      updated_by,
    });

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation comment:', err);
    res.status(500).json({ error: 'Failed to update reservation comment' });
  }
};
const editReservationCommentFlag = async (req, res) => {
  const { id } = req.params;
  const { hotelId, has_important_comment } = req.body;
  const updated_by = req.user.id;

  try {
    const updatedReservation = await updateReservationCommentFlag(req.requestId, {
      id,
      hotelId,
      has_important_comment,
      updated_by,
    });

    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating important comment flag:', err);
    res.status(500).json({ error: 'Failed to update important comment flag' });
  }
};
const editReservationTime = async (req, res) => {
  const { id } = req.params;
  const { hotelId, indicator, time } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation comment in the database
    const updatedReservation = await updateReservationTime(req.requestId, {
      id,
      hotelId,
      indicator,
      time,
      updated_by,
    });

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation time:', err);
    res.status(500).json({ error: 'Failed to update reservation time' });
  }
}

const editReservationType = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, type } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateReservationType(req.requestId, {
      id,
      hotel_id,
      type,
      updated_by,
    });

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation type:', err);
    res.status(500).json({ error: 'Failed to update reservation type' });
  }
};

const editReservationResponsible = async (req, res) => {
  const id = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    await updateReservationResponsible(req.requestId, id, updatedFields, user_id);
    res.json({ message: 'Reservation updated successfully' });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
};

const editRoomFromCalendar = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode } = req.body;
  const updated_by = req.user.id;

  try {
    // Input validation
    const requiredFields = { hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode };
    const missingFields = Object.keys(requiredFields).filter(key => !requiredFields[key]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        success: false
      });
    }

    const updatedReservation = await updateRoomByCalendar(req.requestId, {
      id, hotel_id, old_check_in, old_check_out, new_check_in, new_check_out,
      old_room_id, new_room_id, number_of_people, mode, updated_by
    });

    res.json({
      success: true,
      message: 'Room reservation updated successfully.',
      data: updatedReservation
    });

  } catch (err) {
    console.error(`Error updating room reservation ${id}:`, err);

    // Handle different types of errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        message: err.message,
        success: false
      });
    }

    if (err.name === 'NotFoundError') {
      return res.status(404).json({
        error: 'Reservation not found',
        message: 'The specified reservation could not be found.',
        success: false
      });
    }

    // Generic server error
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred while updating the reservation.',
      success: false
    });
  }
};

const editCalendarFreeChange = async (req, res) => {
  const { data } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateCalendarFreeChange(req.requestId, data, updated_by);

    // Respond with the updated reservation details
    res.json({ success: 'Edit made with success.' });
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const editRoomGuestNumber = async (req, res) => {
  const roomArray = req.body;
  const user_id = req.user.id;

  if (!Array.isArray(roomArray.details)) {
    return res.status(400).json({ error: 'Invalid data format: detail should be an array' });
  }

  try {
    await updateReservationRoomGuestNumber(req.requestId, roomArray.details, user_id);
    res.status(200).json({ message: "Room updating successfully" });
  } catch (err) {
    console.error("Error updating room:", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
};

// DELETE
const deleteHoldReservation = async (req, res) => {
  const { hid, id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await deleteHoldReservationById(req.requestId, id, hid, user_id);

    // Handle case where result is undefined
    if (!result) {
      return res.status(500).json({
        success: false,
        message: 'Error processing delete request: No result returned'
      });
    }

    const { success, count } = result;

    if (success) {
      return res.json({ success: true, count });
    } else {
      return res.status(404).json({
        success: false,
        count,
        message: 'Reservation not found, already deleted, or not eligible for deletion'
      });
    }
  } catch (err) {
    console.error(`[${req.requestId}] Error in deleteHoldReservation:`, {
      error: err.message,
      stack: err.stack,
      reservation_id: id,
      hotel_id: hid,
      user_id
    });
    return res.status(500).json({
      error: err.message || 'Failed to delete reservation',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
const deleteRoomFromReservation = async (req, res) => {
  const { hotelId, roomId, reservationId, numberOfPeople } = req.body;
  const user_id = req.user.id;

  try {
    const result = await deleteReservationRoom(req.requestId, hotelId, roomId, reservationId, numberOfPeople, user_id);
    if (!result.success) {
      return res.status(400).json({
        error: result.message,
        message: "操作を完了できませんでした"
      });
    }
    res.status(200).json({ message: "Room deleted successfully" });
  } catch (err) {
    console.error("Error deleting room:", err);
    res.status(500).json({ error: "Failed to delete room" });
  }
};

const delReservationPayment = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;

  try {
    const result = await deleteReservationPayment(req.requestId, id, user_id);

    if (result && result.success === false) {
      return res.status(404).json({ error: result.message || 'Payment not found' });
    }

    res.status(200).json({ message: "Payment deleted successfully" });
  } catch (err) {
    console.error("Error deleting payment:", err);
    res.status(500).json({ error: "Failed to delete payment" });
  }

};

const copyReservation = async (req, res) => {
  const { original_reservation_id, new_client_id, room_mapping } = req.body;
  const user_id = req.user.id;

  try {
    const hotel_id = await getHotelIdByReservationId(req.requestId, original_reservation_id);
    if (!hotel_id) {
      throw new Error('Hotel ID not found for the original reservation.');
    }
    // Use the model's copyReservation which copies plans and addons
    const newReservation = await insertCopyReservation(req.requestId, original_reservation_id, new_client_id, room_mapping, user_id, hotel_id);

    res.status(201).json({ message: 'Reservation copied successfully', reservation: newReservation });
  } catch (error) {
    logger.error('[copyReservation][controller] Error copying reservation:', error);
    res.status(500).json({ error: 'Failed to copy reservation' });
  }
};

const getFailedOtaReservations = async (req, res) => {
  try {
    const reservations = await selectFailedOtaReservations(req.requestId);
    return res.status(200).json({ reservations: reservations || [] });
  } catch (error) {
    console.error('Error fetching failed OTA reservations:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching failed OTA reservations.' });
  }
};

const handleDeleteParkingReservation = async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  if (!id) {
    return res.status(400).json({ error: 'Parking reservation ID is required' });
  }

  try {
    await deleteParkingReservation(req.requestId, id, userId);
    return res.status(200).json({ message: 'Parking reservation deleted successfully' });
  } catch (error) {
    console.error('Error deleting parking reservation:', error);
    return res.status(500).json({ error: 'Failed to delete parking reservation' });
  }
};

const handleBulkDeleteParkingReservations = async (req, res) => {
  const { ids } = req.body;
  const userId = req.user.id;

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Array of parking reservation IDs is required' });
  }

  try {
    await deleteBulkParkingReservations(req.requestId, ids, userId);
    return res.status(200).json({ message: 'Parking reservations deleted successfully' });
  } catch (error) {
    console.error('Error bulk deleting parking reservations:', error);
    return res.status(500).json({ error: 'Failed to delete parking reservations' });
  }
};

const convertBlockToReservation = async (req, res) => {
  const { id } = req.params;
  const { client } = req.body;
  const user_id = req.user.id;

  if (!client) {
    return res.status(400).json({ error: 'Client information is required' });
  }

  try {
    let finalClientId = client.client_id;

    // If client doesn't have an ID, create a new client
    if (!finalClientId) {
      logger.warn(`[CONVERT_BLOCK] No client_id provided, creating new client`, {
        name: client.name,
        email: client.email,
        phone: client.phone
      });

      const clientData = {
        name: client.name || '',
        legal_or_natural_person: client.legal_or_natural_person || 'natural',
        gender: client.gender || null,
        email: client.email || null,
        phone: client.phone || null,
        created_by: user_id,
        updated_by: user_id,
      };

      const newClient = await addClientByName(req.requestId, clientData);
      finalClientId = newClient.id;
      logger.warn(`[CONVERT_BLOCK] Created new client`, { client_id: finalClientId });
    }

    // Update the reservation with the client ID
    const updatedReservation = await updateBlockToReservation(req.requestId, id, finalClientId, user_id);

    res.status(200).json({
      message: 'Reservation updated successfully',
      reservation: updatedReservation
    });
  } catch (error) {
    logger.error('[convertBlockToReservation][controller] Error converting block to reservation:', error);
    const status = error.message.includes('not found') ? 404 : 500;
    res.status(status).json({
      error: error.message || 'Failed to convert block to reservation'
    });
  }
};

const cancelReservationRooms = async (req, res) => {
  const { hotelId, reservationId, detailIds, billable } = req.body;
  const user_id = req.user.id;

  if (!hotelId || !reservationId || !Array.isArray(detailIds) || detailIds.length === 0) {
    return res.status(400).json({ error: 'Missing required parameters: hotelId, reservationId, and a non-empty array of detailIds are required.' });
  }

  try {
    const result = await cancelReservationRoomsModel(req.requestId, hotelId, reservationId, detailIds, user_id, billable);
    if (!result.success) {
      return res.status(404).json({ message: result.message });
    }
    res.status(200).json({
      message: "Rooms cancelled successfully",
      data: result
    });
  } catch (err) {
    console.error("Error cancelling rooms:", err);
    res.status(500).json({ error: "Failed to cancel rooms" });
  }
};

const editPaymentTiming = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, payment_timing } = req.body;
  const updated_by = req.user.id;

  try {
    // Ensure payment_timing has a default value if it's null or undefined
    const paymentTimingValue = payment_timing || 'not_set';
    const updatedReservation = await updatePaymentTiming(req.requestId, id, hotel_id, paymentTimingValue, updated_by);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating payment timing:', err);
    // Send a more informative error response
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update payment timing' });
  }
};

const changeReservationRoomsPeriod = async (req, res) => {
  const { reservationId } = req.params;
  const { hotelId, newCheckIn, newCheckOut, roomIds, allRoomsSelected: allRoomsSelectedFromBody } = req.body;
  const userId = req.user.id;

  try {
    let allRoomsSelected = allRoomsSelectedFromBody;

    if (allRoomsSelected === undefined) {
      const originalReservationDetails = await selectReservationDetail(req.requestId, reservationId, hotelId);
      const originalRoomIds = [...new Set(originalReservationDetails.map(detail => detail.room_id))];
      allRoomsSelected = originalRoomIds.length === roomIds.length && originalRoomIds.every(id => roomIds.includes(id));
    }

    const result = await updateReservationRoomsPeriod(req.requestId, {
      originalReservationId: reservationId,
      hotelId,
      newCheckIn,
      newCheckOut,
      roomIds,
      userId,
      allRoomsSelected
    });
    res.status(200).json(result);
  } catch (error) {
    console.error('Error changing reservation period:', error);
    res.status(500).json({ error: 'Failed to change reservation period' });
  }
};

const actionSplitReservation = async (req, res) => {
  const { originalReservationId, hotelId, reservationDetailIdsToMove, isFullPeriodSplit, isFullRoomSplit } = req.body;
  const userId = req.user.id;

  if (!originalReservationId || !hotelId || !reservationDetailIdsToMove || !Array.isArray(reservationDetailIdsToMove) || reservationDetailIdsToMove.length === 0 || typeof isFullPeriodSplit !== 'boolean' || typeof isFullRoomSplit !== 'boolean') {
    return res.status(400).json({ error: 'Missing or invalid parameters for splitting a reservation.' });
  }

  try {
    const newReservationId = await splitReservation(req.requestId, originalReservationId, hotelId, reservationDetailIdsToMove, userId, isFullPeriodSplit, isFullRoomSplit);
    res.status(201).json({ message: 'Reservation split successfully.', newReservationId });
  } catch (error) {
    logger.error(`[${req.requestId}] actionSplitReservation - Error splitting reservation: ${error.message}`, {
      stack: error.stack,
      originalReservationId,
      hotelId,
      reservationDetailIdsToMove,
      userId,
      isFullPeriodSplit,
      isFullRoomSplit
    });
    res.status(500).json({ error: 'Failed to split reservation.' });
  }
};

module.exports = {
  getAvailableRooms, getReservedRooms, getReservation, getReservationDetails, getMyHoldReservations, getReservationsToday, getRoomsForIndicator,
  getAvailableDatesForChange, getReservationClientIds, getReservationPayments, getReservationParking, getParkingSpotAvailability, getHotelIdForReservation,
  createReservationHold, createHoldReservationCombo, createReservationDetails, createReservationAddons, createReservationClient,
  addNewRoomToReservation, alterReservationRoom, createReservationPayment, createBulkReservationPayment, editReservationDetail,
  editReservationGuests, editReservationPlan, editReservationAddon, editReservationRoom, editReservationRoomPlan,
  editReservationRoomPattern, editReservationStatus, editReservationDetailStatus, editReservationComment, editReservationCommentFlag,
  editReservationTime, editReservationType, editReservationResponsible, editRoomFromCalendar, editCalendarFreeChange, editRoomGuestNumber,
  deleteHoldReservation, deleteRoomFromReservation, delReservationPayment, copyReservation, getFailedOtaReservations,
  handleDeleteParkingReservation, handleBulkDeleteParkingReservations, convertBlockToReservation, cancelReservationRooms,
  editPaymentTiming, changeReservationRoomsPeriod, actionSplitReservation,
};
