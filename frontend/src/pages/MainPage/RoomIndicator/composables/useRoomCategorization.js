import { ref, computed } from 'vue';
import { useReservationStore } from '@/composables/useReservationStore';
import { useHotelStore } from '@/composables/useHotelStore';
import { formatDate } from '@/utils/dateUtils';

export function useRoomCategorization(selectedDate) {
  const { reservedRoomsDayView } = useReservationStore();
  const { selectedHotelRooms } = useHotelStore();

  const roomGroups = computed(() => {
    const selectedDateObj = new Date(selectedDate.value);
    if (isNaN(selectedDateObj.getTime())) {
      console.error("[useRoomCategorization] Invalid selectedDate.value:", selectedDate.value);
      return [];
    }

    const allReservations = reservedRoomsDayView.value?.filter(room => room.cancelled === null) || [];

    // Filter out duplicate reservations based on their unique 'id'
    const uniqueReservations = [];
    const seenReservationIds = new Set();
    allReservations.forEach(reservation => {
      if (reservation.id && !seenReservationIds.has(reservation.id)) {
        uniqueReservations.push(reservation);
        seenReservationIds.add(reservation.id);
      }
    });

    // 1. BLOCKED ROOMS - Always blocked regardless of dates
    const blockedRooms = uniqueReservations
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
      occupied: []
    };
    
    console.log("[useRoomCategorization] All Reservations:", allReservations);
    allReservations.forEach(room => {
      console.log("[useRoomCategorization] Processing room:", room.room_id, "Reservation ID:", room.id);
      console.log("[useRoomCategorization] Room details:", room);
      if (room.status === 'block') return; // Already handled
      
      const checkInDate = new Date(room.check_in);
      const checkOutDate = new Date(room.check_out);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        console.warn('[useRoomCategorization] Invalid checkInDate or checkOutDate for room:', room);
        return;
      }
      
      const isCheckInToday = formatDate(checkInDate) === formatDate(selectedDateObj);
      const isCheckOutToday = formatDate(checkOutDate) === formatDate(selectedDateObj);
      
      console.log(`[useRoomCategorization] Room ${room.room_id}: isCheckInToday=${isCheckInToday}, isCheckOutToday=${isCheckOutToday}`);
      // Priority 1: Check-out today (highest priority)
      if (isCheckOutToday) {
        if (!categorizedRooms.checkOut.some(existingRoom => existingRoom.room_id === room.room_id)) {
          categorizedRooms.checkOut.push(room);
        }
      }
      // Priority 2: Check-in today (only if not checking out)
      else if (isCheckInToday) {
        // Ensure room_id is unique in checkIn category
        if (!categorizedRooms.checkIn.some(existingRoom => existingRoom.room_id === room.room_id)) {
          console.log(`[useRoomCategorization] Pushing room ${room.room_id} to checkIn. Reservation ID: ${room.id}`);
          categorizedRooms.checkIn.push(room);
        } else {
          console.log(`[useRoomCategorization] Room ${room.room_id} already in checkIn category. Skipping reservation ID: ${room.id}`);
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

    // Remove duplicate rooms from check-out list (keeping the first occurrence)
    const uniqueCheckOutRooms = [];
    const processedRoomIds = new Set();
    
    categorizedRooms.checkOut.forEach(room => {
      if (!processedRoomIds.has(room.room_id)) {
        uniqueCheckOutRooms.push(room);
        processedRoomIds.add(room.room_id);
      }
    });
    
    // Update the checkOut array with unique rooms
    categorizedRooms.checkOut = uniqueCheckOutRooms;

    // 5. FREE ROOMS - Rooms that are available or will become available (including check-outs)
    const unavailableRoomIds = new Set([
      ...blockedRooms.map(room => room.room_id),
      ...categorizedRooms.checkIn.map(room => room.room_id),
      ...categorizedRooms.occupied.map(room => room.room_id)
      // NOTE: We DON'T exclude check-out rooms because they become free after checkout
    ]);
    
    // Also exclude rooms that have reservations overlapping this date (but not checking out today)
    uniqueReservations.forEach(room => {
      if (room.status === 'block') return;
      
      const checkInDate = new Date(room.check_in);
      const checkOutDate = new Date(room.check_out);
      const isCheckOutToday = formatDate(checkOutDate) === formatDate(selectedDateObj);
      
      if (!isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime()) && 
          checkInDate <= selectedDateObj && checkOutDate > selectedDateObj &&
          !isCheckOutToday && // Don't exclude if checking out today (becomes free)
          !unavailableRoomIds.has(room.room_id)) {
        unavailableRoomIds.add(room.room_id);
      }
    });

    const freeRooms = selectedHotelRooms.value?.filter((room) => 
      room.room_for_sale_idc === true && 
      !unavailableRoomIds.has(room.room_id)
    ) || [];

    const result = [
      { title: '本日チェックイン', rooms: categorizedRooms.checkIn, color: 'bg-blue-100', darkColor: 'dark:bg-blue-900/30' },
      { title: '本日チェックアウト', rooms: categorizedRooms.checkOut, color: 'bg-green-100', darkColor: 'dark:bg-green-900/30' },
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
