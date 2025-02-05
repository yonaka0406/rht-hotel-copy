const pool = require('../config/database');
const { 
  selectAvailableRooms, selectReservedRooms, selectReservation, selectReservationDetail, selectReservationAddons, selectMyHoldReservations,
  addReservationHold, addReservationDetail, addReservationAddon, addReservationClient, addRoomToReservation, 
  updateReservationDetail, updateReservationStatus, updateReservationResponsible, updateRoomByCalendar, updateReservationGuest,
  deleteHoldReservationById, deleteReservationAddonsByDetailId, deleteReservationClientsByDetailId
} = require('../models/reservations');
const { addClientByName } = require('../models/clients');
const { getPriceForReservation } = require('../models/planRate');

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
    const availableRooms = await selectAvailableRooms(hotel_id, start_date, end_date);

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
    const reservedRooms = await selectReservedRooms(hotel_id, start_date, end_date);

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
    const reservation = await selectReservation(id);    
    
    if (reservation.length === 0) {
      return res.status(404).json({ message: 'No reservation for the provided id.' });
    }

    return res.status(200).json({ reservation });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservation.' });
  }
};

const getMyHoldReservations = async (req, res) => {
  const user_id = req.user.id;
  
  try {
    const reservations = await selectMyHoldReservations(user_id);

    if (reservations.length === 0) {
      return res.status(404).json({ message: 'No hold reservations found for the specified user.' });
    }

    return res.status(200).json({ reservations });
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return res.status(500).json({ error: 'Database error occurred while fetching reservations.' });
  }
};

// POST
const createReservationHold = async (req, res) => {
  const {
    hotel_id,
    room_type_id,
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
      const newClient = await addClientByName(clientData);
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
    const newReservation = await addReservationHold(reservationData);
    // Get available rooms for the reservation period
    const availableRooms = await selectAvailableRooms(hotel_id, check_in, check_out);    
    
    // Filter available rooms by room_type_id
    const availableRoomsFiltered = availableRooms.filter(room => room.room_type_id === Number(room_type_id));

    if (availableRoomsFiltered.length === 0) {
      return res.status(400).json({ error: 'No available rooms for the specified period.' });
    }
    

    let remainingPeople = number_of_people;
    const reservationDetails = [];

    // Distribute people into rooms
    while (remainingPeople > 0) {
      let bestRoom = null;

      // Find the best-fit room
      for (const room of availableRoomsFiltered) {
        if (room.capacity === remainingPeople) {
          bestRoom = room;
          break; // Perfect fit, stop searching
        }
        if (room.capacity > remainingPeople && (!bestRoom || room.capacity < bestRoom.capacity)) {
          bestRoom = room; // Choose the smallest room that can accommodate the remaining people
        }
      }

      // If no perfect or near-perfect room found, pick the largest available room
      if (!bestRoom) {         
        bestRoom = availableRoomsFiltered.reduce((prev, curr) => (curr.capacity > prev.capacity ? curr : prev));
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
      const roomIndex = availableRoomsFiltered.indexOf(bestRoom);
      availableRoomsFiltered.splice(roomIndex, 1);
    } 

    // Add reservation details to the database
    for (const detail of reservationDetails) {
      await addReservationDetail(detail);
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
    payer_client_id,
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
      payer_client_id,
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
    const newReservationAddon = await addReservationDetail(reservationData);
    // console.log('newReservationAddon:', newReservationAddon);
    // console.log('ogm_id:', ogm_id);
    const ogmReservationAddons = await selectReservationAddons(ogm_id);
    // console.log('ogmReservationAddons:', ogmReservationAddons);
    
    // Update reservation guests
    for (let i = 0; i < number_of_people; i++) {
      await updateReservationGuest(ogm_id, newReservationAddon.id);
      // console.log('Updated ', i + 1,' of number of guests: ',number_of_people);
    }        

    if (ogmReservationAddons && ogmReservationAddons.length > 0) {
      const addOnPromises = ogmReservationAddons.map(addon =>
          addReservationAddon({
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
    const newReservationAddon = await addReservationAddon(reservationData);

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
    const newReservationClient = await addReservationClient(reservationData);

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
    const newRoom = await addRoomToReservation(reservationId, numberOfPeople, roomId, userId);
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

// PUT
const editReservationDetail = async (req, res) => {  
  const { id } = req.params;
  const { hotel_id, room_id, plans_global_id, plans_hotel_id, number_of_people, price, addons } = req.body;
  const updated_by = req.user.id; 

  const { validate: uuidValidate } = require('uuid');
  let calcPrice = { value: price };

  // console.log('Body parameters:', req.body);
  if (!uuidValidate(id)) {
    return res.status(400).json({ error: 'Invalid UUID format' });
  }

  try {
    // Fetch the existing reservation detail from the database to compare with the new data
    const existingReservation = await selectReservationDetail(id);    

    // Check if the plans_global_id and plans_hotel_id has changed
    if (
        existingReservation[0].plans_global_id !== plans_global_id ||
        existingReservation[0].plans_hotel_id !== plans_hotel_id
    ) {
      const newPrice = await getPriceForReservation(
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
    const updatedReservation = await updateReservationDetail({
        id,
        hotel_id,
        room_id,
        plans_global_id,
        plans_hotel_id,
        number_of_people,
        price: calcPrice.value,
        updated_by,          
    });
      
    // Add the reservation add-ons if any
    if (addons && addons.length > 0) {      
        const deletedAddonsCount = await deleteReservationAddonsByDetailId(updatedReservation.id, updated_by);
        //console.log(`Deleted ${deletedAddonsCount} add-ons for reservation detail id: ${updatedReservation.id}`);

        const addOnPromises = addons.map(addon =>
            addReservationAddon({
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
      if (guestDataArray.length > 0) {
        const firstGuestDataArray = guestDataArray[0]; // Get the first row
        const guestsToAddForDetail = [...firstGuestDataArray.guestsToAdd]; // Shallow copy
        
        // Handle addClientByName and update guestsToAdd *only for the first row*
        for (let i = 0; i < guestsToAddForDetail.length; i++) {
          let guest = guestsToAddForDetail[i];
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
            const newClient = await addClientByName(clientData);
            finalClientId = newClient.id;
            guestsToAddForDetail[i] = {...guest, id: finalClientId }; // Update the copied array
          }
        }

        // Now, update ALL guestsToAdd arrays in guestDataArray
        for (let i = 0; i < guestDataArray.length; i++) {
          guestDataArray[i].guestsToAdd = guestsToAddForDetail;  // Substitute with the updated array
        }
      }

      for (const guestData of guestDataArray) { // loop for each reservation details
          const { id: reservation_detail_id, hotel_id, room_id, number_of_people, guestsToAdd } = guestData;

          const existingReservation = await selectReservation(id);
          const filteredReservations = existingReservation.filter(reservation => reservation.room_id === room_id);
          
          for (const reservationDetail of filteredReservations) {
              // Delete existing clients for this reservation detail
              await deleteReservationClientsByDetailId(reservationDetail.id, updated_by);

              // Add the new clients
              if (guestsToAdd && guestsToAdd.length > 0) {
                  for (let i = 0; i < guestsToAdd.length; i++) {
                    let guest = guestsToAdd[i];
                    let finalClientId = guest.id;
          
                    if(finalClientId !== '' && finalClientId !== null && finalClientId !== undefined){
                      //console.log('Client ID was provided');
                    } else{
                      console.log('Client ID was empty');                      
                      /*
                      const clientData = {
                        name: guest.name,
                        legal_or_natural_person: guest.legal_or_natural_person,
                        gender: guest.gender,
                        email: guest.email,
                        phone: guest.phone,
                        created_by,
                        updated_by,
                      };
                      
                      const newClient = await addClientByName(clientData);
                      finalClientId = newClient.id;
                      // Update the guest object in guestsToAdd to prevet multiple entries
                      guestsToAdd[i].id = finalClientId;  // Update the ID directly in the array
                      */
                    }
                    
                    const guestInfo = {
                        hotel_id: reservationDetail.hotel_id,
                        reservation_details_id: reservationDetail.id,
                        client_id: finalClientId,
                        created_by,
                        updated_by
                    };
                    const addedGuest = await addReservationClient(guestInfo);
                    //console.log('Guest Added:', addedGuest);
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

const editReservationStatus = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, status } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateReservationStatus({
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

const editReservationResponsible = async (req, res) => {
  const id = req.params.id;
  const updatedFields = req.body;
  const user_id = req.user.id;

  try {
    await updateReservationResponsible(id, updatedFields, user_id);
    res.json({ message: 'Reservation updated successfully' });
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: 'Failed to update reservation' });
  }
};

const editRoomFromCalendar = async (req, res) => {
  const { id } = req.params;
  const { hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people } = req.body;
  const updated_by = req.user.id;

  try {
    // Call the function to update reservation status in the database
    const updatedReservation = await updateRoomByCalendar({
      id,
      hotel_id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people,
      updated_by
    });

    // Respond with the updated reservation details
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ error: 'Failed to update room' });
  }
};

// DELETE
const deleteHoldReservation = async (req, res) => {
  const { id } = req.params;
  const user_id = req.user.id;
  try{
    const updatedReservation = await deleteHoldReservationById(id, user_id);
    res.json(updatedReservation);
  } catch (err) {
    console.error('Error deleting hold reservation:', err);
    res.status(500).json({ error: 'Failed to delete reservation' });
  }
}

module.exports = { getAvailableRooms, getReservedRooms, getReservation, getMyHoldReservations, 
  createReservationHold, createReservationDetails, createReservationAddons, createReservationClient, addNewRoomToReservation, editReservationDetail, editReservationGuests, editReservationStatus, editReservationResponsible, editRoomFromCalendar, deleteHoldReservation };