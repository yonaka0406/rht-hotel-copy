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

      console.log(`Processing Room ${room.room_number}: has_less_dates=${room.has_less_dates}, late_checkin=${room.late_checkin}, isCheckInToday=${isCheckInToday}, isCheckOutToday=${isCheckOutToday}`);

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

    console.log('categorizedRooms.occupied after forEach:', categorizedRooms.occupied);
    console.log('categorizedRooms.roomChange after population:', categorizedRooms.roomChange);

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
    const checkInOrOutRoomIds = new Set([
      ...categorizedRooms.checkOut.map(r => r.room_id),
      ...categorizedRooms.checkIn.map(r => r.room_id)
    ]);

    const roomChanges = allReservations.filter(room =>
      room.has_less_dates === true &&
      room.late_checkin === false &&
      room.early_checkout === false &&
      !checkInOrOutRoomIds.has(room.room_id) &&
      (room.details && room.details.length > 0 && formatDate(selectedDateObj) === room.details[0].date)
    );

    categorizedRooms.roomChange = roomChanges;

    const roomChangeIds = new Set(categorizedRooms.roomChange.map(r => r.room_id));
    categorizedRooms.occupied = categorizedRooms.occupied.filter(r => !roomChangeIds.has(r.room_id));

    // 5. FREE ROOMS - Rooms that are available or will become available (including check-outs)
    const unavailableRoomIds = new Set([
      ...blockedRooms.map(room => room.room_id),
      ...categorizedRooms.checkIn.map(room => room.room_id),
      ...categorizedRooms.occupied.map(room => room.room_id),
      ...categorizedRooms.roomChange.map(room => room.room_id)
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
      { title: '部屋移動', rooms: categorizedRooms.roomChange, color: 'bg-purple-100', darkColor: 'dark:bg-purple-900/30' },
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