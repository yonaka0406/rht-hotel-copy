import { computed } from 'vue';
import { useReservationStore } from '@/composables/useReservationStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';

export function useRoomCategorization(selectedDate) {
const { roomsForIndicator } = useReservationStore();
  const { selectedHotelRooms } = useHotelStore();

  const roomGroups = computed(() => {
    const selectedDateObj = new Date(selectedDate.value);
    if (isNaN(selectedDateObj.getTime())) {
      return [];
    }

    const allReservations = roomsForIndicator.value?.filter(room => room.cancelled === null || room.early_checkout === true) || [];

    // 1. BLOCKED ROOMS - Always blocked regardless of dates
    const blockedRooms = allReservations
      .filter(room => room.status === 'block')
      .map(room => ({
        ...room,
        // Adjust end date by subtracting one day
        check_out: (() => {
          const endDate = new Date(room.check_out);
          endDate.setDate(endDate.getDate() - 1);
          return endDate.toISOString();
        })()
      }))
      // Filter out duplicate blocks by keeping only the most recent one per room
      .reduce((acc, room) => {
        const existing = acc.find(r => r.room_id === room.room_id);
        if (!existing || new Date(room.check_out) > new Date(existing.check_out)) {
          return [...acc.filter(r => r.room_id !== room.room_id), room];
        }
        return acc;
      }, []);

    // Create categorization with priority (no duplicates)
    // Priority: Check-out > Check-in > Occupied
    const categorizedRooms = {
      checkOut: [],
      checkIn: [],
      occupied: [],
      roomChange: []
    };

    allReservations.forEach(room => {
      if (room.status === 'block') return; // Already handled

      const checkInDate = new Date(room.check_in);
      const checkOutDate = new Date(room.check_out);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return;
      }

      const isCheckInToday = formatDate(checkInDate) === formatDate(selectedDateObj);
      const isCheckOutToday = formatDate(checkOutDate) === formatDate(selectedDateObj);

      // Priority 1: Check-out today (highest priority) or early_checkout
      if (isCheckOutToday || room.early_checkout) {
        if (!categorizedRooms.checkOut.some(existingRoom => existingRoom.room_id === room.room_id)) {
          categorizedRooms.checkOut.push(room);
        }
      }
      // Priority 2: Check-in today (only if not checking out) or late_checkin
      else if (isCheckInToday || room.late_checkin) {
        // Ensure room_id is unique in checkIn category
        if (!categorizedRooms.checkIn.some(existingRoom => existingRoom.room_id === room.room_id)) {
          categorizedRooms.checkIn.push(room);
        }
      }
      // Priority 3: Currently allocated/reserved for this date (regardless of check-in status)
      else if (checkInDate <= selectedDateObj &&
        checkOutDate > selectedDateObj) {
        // Room is allocated/reserved for this date period
        if (!categorizedRooms.occupied.some(existingRoom => existingRoom.room_id === room.room_id)) {
          categorizedRooms.occupied.push(room);
        }
      }
    });

    // In case of room changes, multiple rooms can be listed for checkout for the same reservation.
    // We need to select only the room the guest is in on the night before checkout.
    const checkoutGroups = categorizedRooms.checkOut.reduce((acc, room) => {
      if (!acc[room.id]) {
        acc[room.id] = [];
      }
      acc[room.id].push(room);
      return acc;
    }, {});

    const finalCheckOutRooms = Object.values(checkoutGroups).flatMap(group => {
      if (group.length <= 1) {
        return group; // No conflict, return the array which may contain one room or be empty
      }

      // If there's a conflict (e.g., room change), find the correct rooms.
      // The correct rooms are those the guest occupies on the night before checkout.

      // The check_out date string is in UTC. We need to parse it into a Date object,
      // which will represent the date in the browser's local timezone (JST for the user).
      const localCheckOutDate = new Date(group[0].check_out);

      // Get the date for the day before checkout.
      const dayBeforeCheckout = new Date(localCheckOutDate);
      dayBeforeCheckout.setDate(localCheckOutDate.getDate() - 1);

      // Use the existing formatDate utility to get YYYY-MM-DD in the local timezone.
      const dayBeforeCheckoutStr = formatDate(dayBeforeCheckout);

      let finalRooms = group.filter(room =>
        room.details && room.details.some(detail => detail.date === dayBeforeCheckoutStr)
      );

      // Fallback: if for some reason the above logic fails, take the one with more details,
      // as it implies a longer stay in that room.
      if (finalRooms.length === 0) {
        // Sort by number of details and take all that have the max length
        const maxLength = Math.max(...group.map(r => r.details?.length || 0));
        if (maxLength > 0) {
          finalRooms = group.filter(r => r.details?.length === maxLength);
        } else {
          // If no details at all, return the original group to avoid losing data
          finalRooms = group;
        }
      }

      return finalRooms;
    }).filter(Boolean);

    categorizedRooms.checkOut = finalCheckOutRooms;

    // 4. ROOM CHANGES - Guests who changed rooms (were in a different room yesterday)
    const dayBefore = new Date(selectedDateObj);
    dayBefore.setDate(selectedDateObj.getDate() - 1);
    const dayBeforeStr = formatDate(dayBefore);
    const todayStr = formatDate(selectedDateObj);

    // Group rooms by reservation ID to handle cases where details are split across multiple room entries
    const roomsByReservation = {};
    
    // First, find all unique reservation IDs that have room changes
    const reservationIds = new Set(categorizedRooms.occupied.map(room => room.id));
    
    // For each reservation, find all rooms that belong to it
    for (const reservationId of reservationIds) {
      // Find all rooms with this reservation ID that have details
      const roomsForReservation = categorizedRooms.occupied.filter(room => 
        room.id === reservationId && room.details?.length > 0
      );
      
      if (roomsForReservation.length > 0) {
        roomsByReservation[reservationId] = roomsForReservation;
      }
    }

    // Find reservations with room changes
    const roomChanges = [];
    
    Object.entries(roomsByReservation).forEach(([_reservationId, rooms]) => {
      // Get all rooms for the previous day
      const previousDayRooms = [];
      
      // Check all rooms in the reservation to see if they were occupied on the previous day
      rooms.forEach(room => {
        if (!room.details || room.details.length === 0) {
          return;
        }
        
        // Find details for the previous day
        const prevDayDetail = room.details.find(d => d.date === dayBeforeStr);
        
        // If we have an exact detail for the previous day, use it
        if (prevDayDetail) {
          previousDayRooms.push({
            room_id: room.room_id,
            room_number: room.room_number,
            details: prevDayDetail
          });
        } 
        // Otherwise, check if this room was occupied on the previous day by looking at check_in/check_out ranges
        else {
          // Find any detail where the previous day falls within its stay period
          const relevantDetail = room.details.find(d => {
            const checkIn = d.check_in || d.date;
            const checkOut = d.check_out || d.date;
            return checkIn <= dayBeforeStr && checkOut >= dayBeforeStr;
          });
            
          if (relevantDetail) {
            previousDayRooms.push({
              room_id: room.room_id,
              room_number: room.room_number,
              details: relevantDetail
            });
          }
        }
      });
      
      // Get all rooms for the current day
      const currentDayRooms = [];
      
      // Process rooms for current day
      rooms.forEach(room => {
        if (!room.details || room.details.length === 0) {
          return;
        }
        
        // Find details for the current day
        const todayDetail = room.details.find(d => d.date === todayStr);
        
        // If we have an exact detail for today, use it
        if (todayDetail) {
          currentDayRooms.push({
            room_id: room.room_id,
            room_number: room.room_number,
            details: todayDetail
          });
        } 
        // Otherwise, check if this room is occupied today by looking at check_in/check_out ranges
        else {
          // Find any detail where today falls within its stay period
          const relevantDetail = room.details.find(d => {
            const checkIn = d.check_in || d.date;
            const checkOut = d.check_out || d.date;
            return checkIn <= todayStr && checkOut >= todayStr;
          });
            
          if (relevantDetail) {
            currentDayRooms.push({
              room_id: room.room_id,
              room_number: room.room_number,
              details: relevantDetail
            });
          }
        }
      });
      
      // If no rooms for either day, skip
      if (previousDayRooms.length === 0 || currentDayRooms.length === 0) {
        return;
      }
      
      // Find if any guest was in a different room the previous day
      // We need to track which guests were in which rooms
      
      // Get all guest IDs from both days
      const guestIds = new Set([
        ...previousDayRooms.flatMap(room => room.details?.guest_id ? [room.details.guest_id] : []),
        ...currentDayRooms.flatMap(room => room.details?.guest_id ? [room.details.guest_id] : [])
      ]);
      
      // Check each guest's room change
      let hasRoomChange = false;
      
      for (const guestId of guestIds) {
        const prevRoom = previousDayRooms.find(r => r.details?.guest_id === guestId);
        const currRoom = currentDayRooms.find(r => r.details?.guest_id === guestId);
        
        if (prevRoom && currRoom && prevRoom.room_id !== currRoom.room_id) {
          roomChanges.push(rooms.find(r => r.room_id === currRoom.room_id));
          hasRoomChange = true;
        }
      }
      
      // If no guest-specific room change was found, check for any room that was occupied 
      // on the previous day but not the current day
      if (!hasRoomChange) {
        const previousRoomIds = new Set(previousDayRooms.map(r => r.room_id));
        const currentRoomIds = new Set(currentDayRooms.map(r => r.room_id));
        
        const newRooms = [...currentRoomIds].filter(id => !previousRoomIds.has(id));
        const departedRooms = [...previousRoomIds].filter(id => !currentRoomIds.has(id));
        
        if (newRooms.length > 0 || departedRooms.length > 0) {
          // Only add the new rooms to changes
          newRooms.forEach(roomId => {
            const roomToAdd = rooms.find(r => r.room_id === roomId);
            if (roomToAdd) {
              roomChanges.push(roomToAdd);
            }
          });
        }
      }
    });

    // Remove room change guests from occupied category to avoid duplication
    categorizedRooms.occupied = categorizedRooms.occupied.filter(room => 
      !roomChanges.some(changeRoom => changeRoom.id === room.id && changeRoom.room_id === room.room_id)
    );

    // In case of room changes, multiple rooms can be listed for the same reservation.
    // We need to select only the room the guest is in on the selected date.
    const roomChangeGroups = roomChanges.reduce((acc, room) => {
      const reservationId = room.id;
      if (!acc[reservationId]) {
        acc[reservationId] = [];
      }
      acc[reservationId].push(room);
      return acc;
    }, {});

    const finalRoomChanges = Object.values(roomChangeGroups).flatMap(group => {
      if (group.length <= 1) return group;
      
      // Find the room where the guest is staying on the selected date
      return group.filter(room => 
        room.details && room.details.some(detail => detail.date === todayStr)
      ) || [group[0]]; // Fallback to first room if no match found
    });

    // 5. FREE ROOMS - Rooms that are available or will become available (including check-outs)
    const unavailableRoomIds = new Set([
      ...blockedRooms.map(room => room.room_id),
      ...categorizedRooms.checkIn.map(room => room.room_id),
      ...categorizedRooms.occupied.map(room => room.room_id),
      ...finalRoomChanges.map(room => room.room_id)
      // NOTE: We DON'T exclude check-out rooms because they become free after checkout
    ]);

    // Note: categorizedRooms.occupied already contains overlapping rooms (excluding check-outs)
    // and is already included in unavailableRoomIds above, so no additional exclusion needed.
    const freeRooms = selectedHotelRooms.value?.filter((room) =>
      room.room_for_sale_idc === true &&
      !unavailableRoomIds.has(room.room_id)
    ) || [];

    const result = [
      { title: '本日チェックイン', rooms: categorizedRooms.checkIn, color: 'bg-blue-100', darkColor: 'dark:bg-blue-900/30' },
      { title: '本日チェックアウト', rooms: categorizedRooms.checkOut, color: 'bg-green-100', darkColor: 'dark:bg-green-900/30' },
      { title: '部屋移動', rooms: finalRoomChanges, color: 'bg-purple-100', darkColor: 'dark:bg-purple-900/30' },
      { title: '滞在', rooms: categorizedRooms.occupied, color: 'bg-yellow-100', darkColor: 'dark:bg-yellow-900/30' },
      { title: '空室', rooms: freeRooms, color: 'bg-gray-100', darkColor: 'dark:bg-gray-800' },
      { title: '部屋ブロック', rooms: blockedRooms, color: 'bg-red-100', darkColor: 'dark:bg-red-900/30' },
    ];
    return result;
  });

  return {
    roomGroups
  };
}