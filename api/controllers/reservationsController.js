const { 
  selectAvailableRooms, selectReservedRooms, selectReservation, selectReservationDetail, selectReservationAddons, selectMyHoldReservations, selectReservationsToday, selectAvailableDatesForChange, selectReservationClientIds, selectReservationPayments,
  addReservationHold, addReservationDetail, addReservationAddon, addReservationClient, addRoomToReservation, insertReservationPayment,
  updateReservationDetail, updateReservationStatus, updateReservationDetailStatus, updateReservationComment, updateReservationTime, updateReservationType, updateReservationResponsible, updateRoomByCalendar, updateCalendarFreeChange, updateReservationRoomGuestNumber, updateReservationGuest, updateReservationDetailPlan, updateReservationDetailAddon, updateReservationDetailRoom, updateReservationRoom, updateReservationRoomWithCreate, updateReservationRoomPlan,
  deleteHoldReservationById, deleteReservationAddonsByDetailId, deleteReservationClientsByDetailId, deleteReservationRoom, deleteReservationPayment
} = require('../models/reservations');
const { addClientByName } = require('../models/clients');
const { getPriceForReservation } = require('../models/planRate');

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

  try {
    const reservedRooms = await selectReservedRooms(req.requestId, hotel_id, start_date, end_date);

    if (reservedRooms.length === 0) {
      return res.status(201).json({ message: 'No reserved rooms for the specified period.' });
    }
        
    return res.status(200).json({ reservedRooms });
  } catch (error) {
    console.error('Error fetching reserved rooms:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reserved rooms.' });
  }
};

const getReservation = async (req, res) => {
  const { id } = req.query;

  try {    
    const reservation = await selectReservation(req.requestId, id);    
    
    if (reservation.length === 0) {
      return res.status(404).json({ message: 'No reservation for the provided id.' });
    }

    return res.status(200).json({ reservation });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservation.' });
  }
};

const getReservationDetails = async (req, res) => {
  const { id } = req.query;

  try {    
    const reservation = await selectReservationDetail(req.requestId, id);    
    
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

    if (reservations.length === 0) {
      return res.status(404).json({ message: 'No hold reservations found for the specified user.' });
    }

    return res.status(200).json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservations.' });
  }
};

const getReservationsToday = async (req, res) => {
  const { hid, date } = req.params;

  try {
    const reservations = await selectReservationsToday(req.requestId, hid, date);

    if (reservations.length === 0) {
      return res.status(404).json({ message: 'No reservations found.' });
    }

    return res.status(200).json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservations.' });
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
  } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  const dateRange = [];
  let currentDate = new Date(check_in);
  while (currentDate < new Date(check_out)) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  try {
    let finalClientId = client_id;

    // Check if client_id is null
    if (!client_id) {
      // Create the client if no client_id is provided
      const clientData = {
        name: name,
        legal_or_natural_person,
        gender,
        email,
        phone,
        created_by,
        updated_by,
      };

      // Add new client and get the created client's id
      const newClient = await addClientByName(req.requestId, clientData);
      finalClientId = newClient.id; // Use the newly created client's id
    }

    // Add the reservation with the final client_id
    const reservationData = {
      hotel_id,
      reservation_client_id: finalClientId,
      check_in,
      check_out,
      number_of_people,
      created_by,
      updated_by
    };

    // Add the reservation to the database
    const newReservation = await addReservationHold(req.requestId, reservationData);
    // Get available rooms for the reservation period
    const availableRooms = await selectAvailableRooms(req.requestId, hotel_id, check_in, check_out);

    const reservationDetails = [];
    const availableRoomsFiltered = [];    
    
    if(room_type_id !== null){
      // Filter available rooms by room_type_id      
      availableRoomsFiltered.value = availableRooms.filter(room => room.room_type_id === Number(room_type_id));
      console.log('room_type_id is not null. Available Rooms:',availableRoomsFiltered.value);
    } else if(room_id !== null){      
      // Filter available rooms by room_id      
      availableRoomsFiltered.value = availableRooms.filter(room => room.room_id === Number(room_id));
      // console.log('room_id is not null. Available Rooms:',availableRoomsFiltered.value);
    }

    if (availableRoomsFiltered.value.length === 0) {
      return res.status(400).json({ error: 'No available rooms for the specified period.' });
    }    

    // console.log('availableRoomsFiltered length:',availableRoomsFiltered.value.length);

    let remainingPeople = number_of_people;

    // Distribute people into rooms
    while (remainingPeople > 0) {      
      // console.log('remainingPeople:', remainingPeople);

      let bestRoom = null;

      // Find the best-fit room
      for (const room of availableRoomsFiltered.value) {
        // console.log('Testing room',room.room_number,'with capacity:',room.capacity);
        if (room.capacity === remainingPeople) {
          bestRoom = room;
          // console.log('Perfect match found:', bestRoom);
          break;
        }

        if (room.capacity > remainingPeople && (!bestRoom || room.capacity < bestRoom.capacity)) {
          bestRoom = room;
          // console.log('Smaller suitable room found:', bestRoom);
        }
      }

      // If no suitable room was found, pick the largest available room
      if (!bestRoom && availableRoomsFiltered.value.length > 0) {
        bestRoom = availableRoomsFiltered.value.reduce(
          (prev, curr) => (curr.capacity > prev.capacity ? curr : prev),
          availableRoomsFiltered.value[0]
        );
        // console.log('Largest available room selected:', bestRoom);
      }

      if (!bestRoom) {
        // console.error('No room found for remaining people:', remainingPeople);
        break; // Avoid infinite loop
      }

      // Assign people to the best room and remove it from the list of available rooms
      const peopleAssigned = Math.min(remainingPeople, bestRoom.capacity);
      remainingPeople -= peopleAssigned;
      
      dateRange.forEach((date) => {
        reservationDetails.push({
          reservation_id: newReservation.id,
          hotel_id,
          room_id: bestRoom.room_id,
          date: formatDate(date),
          plans_global_id: null,
          plans_hotel_id: null,
          number_of_people: peopleAssigned,
          price: 0,
          created_by,
          updated_by,
        });
      });
            
      // Remove the room from availableRooms
      availableRoomsFiltered.value = availableRoomsFiltered.value.filter(room => room.room_id !== bestRoom.room_id);
    }

    // Add reservation details to the database
    for (const detail of reservationDetails) {
      await addReservationDetail(req.requestId, detail);
    }

    res.status(201).json({
      reservation: newReservation,
      reservationDetails,
    });
    
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
  }

};

const createHoldReservationCombo = async (req, res) => {
  const { header, combo } = req.body;
  const user_id = req.user.id;

  // console.log(`[${req.requestId}] Received request to create reservation combo:`, { header, combo });

  const dateRange = [];
  let currentDate = new Date(header.check_in);
  while (currentDate < new Date(header.check_out)) {
    dateRange.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  try {
    let finalClientId = header.client_id;

    // Check if client_id is null
    if (!header.client_id) {
      // Create the client if no client_id is provided
      const clientData = {
        name: header.name,
        legal_or_natural_person: header.legal_or_natural_person,
        gender: header.gender,
        email: header.email,
        phone: header.phone,
        user_id,
        user_id,
      };

      // Add new client and get the created client's id
      const newClient = await addClientByName(req.requestId, clientData);
      finalClientId = newClient.id; // Use the newly created client's id
    }

    // Add the reservation with the final client_id
    const reservationData = {
      hotel_id: header.hotel_id,
      reservation_client_id: finalClientId,
      check_in: header.check_in,
      check_out: header.check_out,
      number_of_people: header.number_of_people,
      created_by: user_id,
      updated_by: user_id
    };

    // Add the reservation to the database
    const newReservation = await addReservationHold(req.requestId, reservationData);
    // Get available rooms for the reservation period
    const availableRooms = await selectAvailableRooms(req.requestId, header.hotel_id, header.check_in, header.check_out);
    
    const reservationDetails = [];
        
    for (const roomTypeId in combo) {
      const roomCombo = combo[roomTypeId];
      let remainingPeople = roomCombo.totalPeople;
      let availableRoomsFiltered = availableRooms.filter(room => room.room_type_id === roomCombo.room_type_id);
      let assignedRoomsCount = 0;
      const roomsAssigned = [];

      console.log(`[${req.requestId}] Processing room type: ${roomCombo.room_type_name}, total rooms: ${roomCombo.totalRooms}, total people: ${roomCombo.totalPeople}`);
      console.log(`[${req.requestId}] Filtered available rooms for type ${roomCombo.room_type_name}:`, availableRoomsFiltered);

      // Sort available rooms by capacity (ascending)
      availableRoomsFiltered.sort((a, b) => a.capacity - b.capacity);

      // Select initial rooms
      const selectedRooms = availableRoomsFiltered.slice(0, roomCombo.totalRooms);

      if (selectedRooms.length < roomCombo.totalRooms) {
          return res.status(400).json({ error: `Not enough rooms available for room type: ${roomCombo.room_type_name}` });
      }

      // Assign one person to each room initially
      for (const room of selectedRooms) {
        if (remainingPeople > 0) {
            assignedRoomsCount++;
            roomsAssigned.push(room.room_id);

            console.log(`[${req.requestId}] Assigned room ${room.room_id} (capacity: ${room.capacity}), people assigned: 1, remaining people: ${remainingPeople - 1}`);

            dateRange.forEach((date) => {
                reservationDetails.push({
                    reservation_id: newReservation.id,
                    hotel_id: header.hotel_id,
                    room_id: room.room_id,
                    date: formatDate(date),
                    plans_global_id: null,
                    plans_hotel_id: null,
                    number_of_people: 1,
                    price: 0,
                    created_by: user_id,
                    updated_by: user_id,
                });
            });
            remainingPeople -= 1;
        }
      }

      // Assign remaining people to rooms
      if (remainingPeople > 0) {
        for (const room of selectedRooms) {
            if (remainingPeople > 0) {
                const peopleAssigned = Math.min(remainingPeople, room.capacity - 1); // Subtract 1 as one person is already assigned
                remainingPeople -= peopleAssigned;

                console.log(`[${req.requestId}] Assigned additional ${peopleAssigned} people to room ${room.room_id} (capacity: ${room.capacity}), remaining people: ${remainingPeople}`);

                dateRange.forEach((date) => {
                    // Update reservation details with the additional people
                    const detailIndex = reservationDetails.findIndex(detail => detail.room_id === room.room_id && detail.reservation_id === newReservation.id);
                    if(detailIndex !== -1){
                        reservationDetails[detailIndex].number_of_people += peopleAssigned;
                    }

                });
            }
        }
      }
      
      // Adjust rooms if needed
      if (remainingPeople > 0) {
          // Replace rooms with higher capacity if possible
          for (let i = 0; i < selectedRooms.length && remainingPeople > 0; i++) {
              const currentRoom = selectedRooms[i];
              const higherCapacityRooms = availableRoomsFiltered.filter(
                  room => room.capacity > currentRoom.capacity && !selectedRooms.includes(room)
              );

              if (higherCapacityRooms.length > 0) {
                  const bestHigherCapacityRoom = higherCapacityRooms.reduce(
                      (prev, curr) => (curr.capacity > prev.capacity ? curr : prev),
                      higherCapacityRooms[0]
                  );

                  const peopleAssigned = Math.min(remainingPeople, bestHigherCapacityRoom.capacity - currentRoom.capacity);
                  remainingPeople -= peopleAssigned;

                  // Replace the room
                  selectedRooms[i] = bestHigherCapacityRoom;
                  roomsAssigned[i] = bestHigherCapacityRoom.room_id;

                  console.log(`[${req.requestId}] Replaced room ${currentRoom.room_id} with ${bestHigherCapacityRoom.room_id} (capacity: ${bestHigherCapacityRoom.capacity}), people assigned: ${peopleAssigned}, remaining people: ${remainingPeople}`);

                  dateRange.forEach((date) => {
                      // Update reservation details with the new room
                      const detailIndex = reservationDetails.findIndex(detail => detail.room_id === currentRoom.room_id && detail.reservation_id === newReservation.id);
                      if(detailIndex !== -1){
                          reservationDetails[detailIndex].room_id = bestHigherCapacityRoom.room_id;
                          reservationDetails[detailIndex].number_of_people += peopleAssigned;
                      }

                  });

                  // Remove the replaced room from available rooms
                  availableRoomsFiltered = availableRoomsFiltered.filter(room => room.room_id !== bestHigherCapacityRoom.room_id);
              }
          }
      }

      if (remainingPeople > 0) {
          return res.status(400).json({ error: `Not enough capacity to assign people to rooms for room type: ${roomCombo.room_type_name}` });
      }
    }

    // Add reservation details to the database
    for (const detail of reservationDetails) {
      await addReservationDetail(req.requestId, detail);
    }

    res.status(201).json({
      reservation: newReservation,
      reservationDetails,
    });
    
  } catch (err) {
    console.error('Error creating reservation:', err);
    res.status(500).json({ error: 'Failed to create reservation' });
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
    number_of_people,
    price,    
    addons,
  } = req.body;
  const created_by = req.user.id;
  const updated_by = req.user.id;

  try {
    // Add the reservation
    const reservationData = {
      hotel_id,
      reservation_id,      
      date,
      room_id,
      plans_global_id,
      plans_hotel_id,
      number_of_people,
      price,
      created_by,
      updated_by
    };

    // Add the reservation to the database
    const newReservationAddon = await addReservationDetail(req.requestId, reservationData);
    // console.log('newReservationAddon:', newReservationAddon);
    // console.log('ogm_id:', ogm_id);
    const ogmReservationAddons = await selectReservationAddons(req.requestId, ogm_id);
    // console.log('ogmReservationAddons:', ogmReservationAddons);
    
    // Update reservation guests
    for (let i = 0; i < number_of_people; i++) {
      await updateReservationGuest(req.requestId, ogm_id, newReservationAddon.id);
      // console.log('Updated ', i + 1,' of number of guests: ',number_of_people);
    }        

    if (ogmReservationAddons && ogmReservationAddons.length > 0) {
      const addOnPromises = ogmReservationAddons.map(addon =>
          addReservationAddon(req.requestId, {
              hotel_id: addon.hotel_id,
              reservation_detail_id: newReservationAddon.id,
              addons_global_id: addon.addons_global_id,
              addons_hotel_id: addon.addons_hotel_id,
              quantity: addon.quantity,
              price: addon.price,
              created_by: updated_by, 
              updated_by, 
          })
      );

      // Wait for all add-ons to be added
      await Promise.all(addOnPromises);
    }

    // Send success response
    res.status(201).json({
      message: 'Reservation details and addons created successfully',
      reservation_detail: newReservationAddon,
    });
    
  } catch (err) {
    console.error('Error creating reservation detail:', err);
    res.status(500).json({ error: 'Failed to create reservation detail' });
  }
};

const createReservationAddons = async (req, res) => {
  const {
    hotel_id,
    reservation_detail_id,
    addons_global_id,
    addons_hotel_id,
    quantity,
    price,    
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
      quantity,
      price,
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
    if (numberOfPeopleToMove === numberOfPeopleOGM){
      const newRoom = await updateReservationRoom(req.requestId, reservationId, roomIdOld, roomIdNew, userId);
      res.status(200).json({
        message: 'Room changed in reservation successfully',
        data: newRoom
      });
    } 
    if (numberOfPeopleToMove < numberOfPeopleOGM){
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

// PUT
const editReservationDetail = async (req, res) => {  
  const { id } = req.params;
  const { hotel_id, room_id, plans_global_id, plans_hotel_id, number_of_people, price, addons } = req.body;
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
        formatDate(existingReservation[0].date)
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
        number_of_people,
        price: calcPrice.value,
        updated_by,          
    });
    if(planChange){
      const deletedAddonsCount = await deleteReservationAddonsByDetailId(req.requestId, updatedReservation.id, updated_by);
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
                quantity: addon.quantity,
                price: addon.price,
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

      const existingReservation = await selectReservation(req.requestId, id);
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
                    console.log("Client ID was empty after add client by name");
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
  const { hotel_id, gid, hid, price } = req.body;
  const user_id = req.user.id;

  try {
    const updatedReservation = await updateReservationDetailPlan(req.requestId, id, hotel_id, gid, hid, price, user_id);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating reservation detail:', err);
    res.status(500).json({ error: 'Failed to update reservation detail' });
  }
};

const editReservationAddon = async (req, res) => {
  const { id } = req.params;
  const addons = req.body;
  const user_id = req.user.id;

  try {
    const updatedReservation = await updateReservationDetailAddon(req.requestId, id, addons, user_id);
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
  const { plan, addons } = req.body;
  const user_id = req.user.id;

  try {
    const updatedReservation = await updateReservationRoomPlan(req.requestId, id, hid, rid, plan, addons, user_id);
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
  const { hotel_id, status } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateReservationDetailStatus(req.requestId, {
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
    // Call the function to update reservation status in the database
    const updatedReservation = await updateRoomByCalendar(req.requestId, {
      id,
      hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, mode,
      updated_by
    });

    // Respond with the updated reservation details
    res.json({success: 'Edit made with success.'});
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

const editCalendarFreeChange = async (req, res) => {  
  const { data } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateCalendarFreeChange(req.requestId, data, updated_by);

    // Respond with the updated reservation details
    res.json({success: 'Edit made with success.'});
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
  const { id } = req.params;
  const user_id = req.user.id;
  try{
    const updatedReservation = await deleteHoldReservationById(req.requestId, id, user_id);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error deleting hold reservation:', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
}

const deleteRoomFromReservation = async (req, res) => {  
  const {hotelId, roomId, reservationId, numberOfPeople} = req.body;
  const user_id = req.user.id; 
    
  try {      
      await deleteReservationRoom(req.requestId, hotelId, roomId, reservationId, numberOfPeople, user_id);      
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
      await deleteReservationPayment(req.requestId, id, user_id);      
      res.status(200).json({ message: "Payment deleted successfully" });
  } catch (err) {
      console.error("Error deleting room:", err);
      res.status(500).json({ error: "Failed to delete payment" });
  }

};

module.exports = { getAvailableRooms, getReservedRooms, getReservation, getReservationDetails, getMyHoldReservations, getReservationsToday, getAvailableDatesForChange, getReservationClientIds, getReservationPayments,
  createReservationHold, createHoldReservationCombo, createReservationDetails, createReservationAddons, createReservationClient, addNewRoomToReservation, alterReservationRoom, createReservationPayment, editReservationDetail, editReservationGuests, editReservationPlan, editReservationAddon, editReservationRoom, editReservationRoomPlan, editReservationStatus, editReservationDetailStatus, editReservationComment, editReservationTime, editReservationType, editReservationResponsible, editRoomFromCalendar, editCalendarFreeChange, editRoomGuestNumber, deleteHoldReservation, deleteRoomFromReservation, delReservationPayment };