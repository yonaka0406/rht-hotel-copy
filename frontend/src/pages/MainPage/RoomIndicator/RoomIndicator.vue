<template>
  <div class="p-0 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 items-center">

      <div class="lg:col-span-4">
        <SummaryMetricsPanel :roomGroups="roomGroups" />
      </div>

      <div class="lg:col-span-3 flex lg:justify-center items-start">
        <div class="w-full lg:max-w-md p-1">          
          <DatePicker v-model="selectedDate" inline dateFormat="yy-mm-dd" :selectOtherMonths="true" class="w-full custom-datepicker-inline rounded-md dark:bg-gray-800" />
        </div>
      </div>

    </div>

    <RoomGroupPanel
      v-if="selectedHotelId"
      :isLoading="isLoading"
      :roomGroups="roomGroups"
      :openNewReservation="openNewReservation"
      :openEditReservation="openEditReservation"
      :getClientName="getClientName"
      :paymentTimingText="paymentTimingText"
      :formatTime="formatTime"
      :formatDate="formatDate"
      :planSummary="planSummary"
      :getPlanDaysTooltip="getPlanDaysTooltip"
      :selectedDate="selectedDate"
      :selectedHotelId="selectedHotelId"
    />  </div>

    <ReservationDrawer
      v-if="selectedHotelId"
      ref="reservationDrawerRef"
      :selectedDate="selectedDate"
      :selectedHotelId="selectedHotelId"
      :formatDate="formatDate"
      @reservation-updated="handleReservationUpdated"
    />

</template>

<script setup>
  // Vue
  import { ref, computed, watch, onMounted, onUnmounted, onErrorCaptured } from 'vue';
  import { useRouter } from 'vue-router';
  const router = useRouter(); 
  import RoomGroupPanel from './components/RoomGroupPanel.vue';
  import SummaryMetricsPanel from './components/SummaryMetricsPanel.vue';
  import ReservationDrawer from './components/ReservationDrawer.vue';

  //Websocket
  import io from 'socket.io-client';
  const socket = ref(null);

  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();  
  import DatePicker from 'primevue/datepicker';
  
  //Stores
  import { useHotelStore } from '@/composables/useHotelStore';
  const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
  import { useClientStore } from '@/composables/useClientStore';
  const { clients, fetchClients } = useClientStore();
  import { useReservationStore } from '@/composables/useReservationStore';
  const { reservedRoomsDayView, fetchReservationsToday } = useReservationStore();
      
  const isUpdating = ref(false);
  const isLoading = ref(false);
  const today = new Date();
  const reservationDrawerRef = ref(null);

  const handleReservationUpdated = async () => {
    await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
  };
      
  // Helper function
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
  const formatDateWithDay = (date) => {
      const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
      const parsedDate = new Date(date);
      return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
  };
  const formatTime = (time) => {
      if (!time) return "";
      const date = new Date(`1970-01-01T${time}`);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const paymentTimingText = (timing) => {
    switch (timing) {
        case 'not_set':
            return '未設定';
        case 'prepaid':
            return '事前決済';
        case 'on-site':
            return '現地決済';
        case 'postpaid':
            return '後払い';
        default:
            return '';
    }
  };

  const getClientName = (room) => {
    //console.log('getClientName - room object:', room);
    let clients = [];
    try {
      if (room?.clients_json) {
        clients = typeof room.clients_json === 'string' 
          ? JSON.parse(room.clients_json)
          : room.clients_json;
      }
    } catch (e) {
      console.error('Error parsing clients_json:', e);
    }
    //console.log('getClientName - parsed clients:', clients);
          
    const processedClients = [];

    // Always add the booker from room.client_name first
    if (room?.client_name) {
      processedClients.push({
        name: room.client_name,
        isBooker: true,
        gender: null // Gender not available from client_name
      });
    }

    // Add other clients from clients_json as guests
    const hasClientsInJson = Array.isArray(clients) && clients.length > 0;
    if (hasClientsInJson) {
      clients.forEach((client) => {
        const clientName = client.name_kanji || client.name_kana || client.name;
        if (clientName && clientName !== room.client_name) { // Avoid duplicating the booker if already added
          processedClients.push({
            name: clientName,
            isBooker: false,
            gender: client.gender
          });
        }
      });
    }

    if (processedClients.length > 0) {
      return processedClients;
    }
  
    const fallbackName = room?.client_name || 'ゲスト';
    //console.log('getClientName - fallback name:', fallbackName);
    return [{ name: fallbackName, isBooker: true, gender: null }];
  };


  const getContrastColor = (hexcolor) => {
    if (!hexcolor || typeof hexcolor !== 'string') return '#000000';
    let processedHex = hexcolor.startsWith('#') ? hexcolor.slice(1) : hexcolor;
    
    if (processedHex.length === 3) {
      processedHex = processedHex.split('').map(char => char + char).join('');
    }
    if (processedHex.length !== 6) return '#000000'; // Invalid hex

    const r = parseInt(processedHex.substring(0, 2), 16);
    const g = parseInt(processedHex.substring(2, 4), 16);
    const b = parseInt(processedHex.substring(4, 6), 16);
    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#000000'; // Parsing failed

    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#FFFFFF';
  };

  const openNewReservation = (room) => {
    reservationDrawerRef.value?.openNewReservation(room);
  };
  
  const openEditReservation = (room) => {        
    reservationDrawerRef.value?.openEditReservation(room);
  };

  const selectedDate = ref(new Date());

  // Computed
  const roomGroups = computed(() => {
    const selectedDateObj = new Date(selectedDate.value);
    if (isNaN(selectedDateObj.getTime())) {
      console.error("Invalid selectedDate.value:", selectedDate.value);
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
    
    allReservations.forEach(room => {
      if (room.status === 'block') return; // Already handled
      
      const checkInDate = new Date(room.check_in);
      const checkOutDate = new Date(room.check_out);
      
      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return;
      }
      
      const isCheckInToday = formatDate(checkInDate) === formatDate(selectedDateObj);
      const isCheckOutToday = formatDate(checkOutDate) === formatDate(selectedDateObj);
      
      // Priority 1: Check-out today (highest priority)
      if (isCheckOutToday) {
        categorizedRooms.checkOut.push(room);
      }
      // Priority 2: Check-in today (only if not checking out)
      else if (isCheckInToday) {
        categorizedRooms.checkIn.push(room);
      }
      // Priority 3: Currently allocated/reserved for this date (regardless of check-in status)
      else if (checkInDate <= selectedDateObj && 
              checkOutDate > selectedDateObj) {
        // Room is allocated/reserved for this date period
        categorizedRooms.occupied.push(room);
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

    return [
      { title: '本日チェックイン', rooms: categorizedRooms.checkIn, color: 'bg-blue-100', darkColor: 'dark:bg-blue-900/30' },
      { title: '本日チェックアウト', rooms: categorizedRooms.checkOut, color: 'bg-green-100', darkColor: 'dark:bg-green-900/30' },
      { title: '滞在', rooms: categorizedRooms.occupied, color: 'bg-yellow-100', darkColor: 'dark:bg-yellow-900/30' },
      { title: '空室', rooms: freeRooms, color: 'bg-gray-100', darkColor: 'dark:bg-gray-800' },
      { title: '部屋ブロック', rooms: blockedRooms, color: 'bg-red-100', darkColor: 'dark:bg-red-900/30' },
    ];
  });
  

  const summaryMetrics = computed(() => {
    // For summary metrics, we want to show the operational status
    // These represent the current allocation state, not historical verification
    
    const checkInCount = roomGroups.value.find(g => g.title === '本日チェックイン')?.rooms.length || 0;
    const checkOutCount = roomGroups.value.find(g => g.title === '本日チェックアウト')?.rooms.length || 0;
    const occupiedCount = roomGroups.value.find(g => g.title === '滞在')?.rooms.length || 0;
    const freeRoomsCount = roomGroups.value.find(g => g.title === '空室')?.rooms.length || 0;
    const blockedCount = roomGroups.value.find(g => g.title === '部屋ブロック')?.rooms.length || 0;

    // Note: For operational purposes, the summary shows expected activity
    // Check-in and check-out lists show ALL reservations for verification
    // But counts reflect actual room allocation status
    
    return [
      { 
        title: '本日チェックイン', 
        icon: 'pi pi-arrow-down-left', 
        iconColor: 'text-blue-500',
        count: checkInCount
      },
      { 
        title: '本日チェックアウト', 
        icon: 'pi pi-arrow-up-right', 
        iconColor: 'text-green-500',
        count: checkOutCount
      },
      { 
        title: '滞在者数', 
        icon: 'pi pi-users', 
        iconColor: 'text-yellow-500',
        count: occupiedCount
      },
      { 
        title: '空室数', 
        icon: 'pi pi-home', 
        iconColor: 'text-gray-500',
        count: freeRoomsCount
      },
    ];
  });


  
  const planSummary = computed(() => {
    const roomPlans = {};
    const reservations = reservedRoomsDayView.value?.filter(room => room.cancelled === null && room.status !== 'cancelled') || [];
    const selectedDateStr = formatDate(selectedDate.value);
    
    // Process each reservation
    reservations.forEach(reservation => {
      if (!reservation?.id) return;
      
      const roomNumber = reservation.room_number;
      if (!roomNumber) {
        return;
      }
      
      // Only process reservations that are relevant for the selected date
      const checkInDate = new Date(reservation.check_in);
      const checkOutDate = new Date(reservation.check_out);
      const selectedDateObj = new Date(selectedDate.value);
      
      // Skip this reservation if it doesn't overlap with the selected date
      // A reservation is relevant if:
      // 1. It's checking in today, OR
      // 2. The selected date falls within the stay period (check-in <= selected < check-out)
      const isCheckingInToday = formatDate(checkInDate) === selectedDateStr;
      const isActiveDuringSelectedDate = checkInDate <= selectedDateObj && selectedDateObj < checkOutDate;
      
      if (!isCheckingInToday && !isActiveDuringSelectedDate) {
        return; // Skip this reservation
      }
      
      if (!roomPlans[roomNumber]) {
        roomPlans[roomNumber] = {};
      }
      
      // Process each day's plan in the reservation, but only count plans for the selected date
      if (reservation.details?.length) {
        reservation.details.forEach(detail => {
          // Count all plan details for non-checkout reservations
          const planName = detail.plan_name || '未設定';
          const planColor = detail.plan_color || '#CCCCCC';
          
          if (!roomPlans[roomNumber][planName]) {
            roomPlans[roomNumber][planName] = {
              count: 0,
              color: planColor,
              details: []
            };
          }
          
          roomPlans[roomNumber][planName].count++;
          roomPlans[roomNumber][planName].details.push(detail);
        });
      }
    });
    
    return roomPlans;
  });

  const getPlanDaysTooltip = (details, planName) => {
    if (!details || !details.length) {
      return null;
    }

    const planDetails = details.filter(detail => detail.plan_name === planName);
    
    // Define day order (0 = Sunday, 1 = Monday, etc.)
    const dayOrder = { '日': 7, '月': 1, '火': 2, '水': 3, '木': 4, '金': 5, '土': 6 };
    
    // Get unique days for the plan
    const days = [...new Set(
      planDetails
        .filter(detail => detail.plan_name === planName)
        .map(detail => {
          const date = new Date(detail.date);
          return date.toLocaleDateString('ja-JP', { weekday: 'short' }).replace('曜日', '');
        })
    )];
    
    // Sort days according to dayOrder
    const sortedDays = days.sort((a, b) => dayOrder[a] - dayOrder[b]);
    
    return `曜日: ${sortedDays.join(', ')}`;
  };
 

  // Mount
  onMounted(async () => {
    
    isLoading.value = true;

    // Initialize selectedDate from URL parameter or default to today
    const routeDate = router.currentRoute.value.params.date;
    if (routeDate) {
      selectedDate.value = new Date(routeDate);
    } else {
      selectedDate.value = new Date();
      // If no date in URL, update URL to today's date
      router.replace({ params: { date: formatDate(selectedDate.value) } });
    }

    // Establish Socket.IO connection
    socket.value = io(import.meta.env.VITE_BACKEND_URL);

    socket.value.on('connect', () => {
    });
    socket.value.on('connect_error', (err) => {
    });
    socket.value.on('connect_timeout', () => {
    });
    
    socket.value.on('tableUpdate', async (data) => {
      await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
    });

    await fetchHotels();
    await fetchHotel();
    await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
    
    isLoading.value = false;        
    
  });

  onUnmounted(() => {
    // Close the Socket.IO connection when the component is unmounted
    if (socket.value) {
      socket.value.disconnect();
    }
  });

  // Watch      
  watch(selectedHotelId, async (newValue, oldValue) => {            
    try {
      if (newValue !== oldValue) {
        selectedDate.value = today;
        await fetchHotel();
        await fetchReservationsToday(selectedHotelId.value, formatDate(today));
      }
    } catch (error) {
      console.error('Error in selectedHotelId watcher:', error);
    }
  });
  
  watch(selectedDate, async (newValue, oldValue) => {
    if (newValue && oldValue && formatDate(newValue) !== formatDate(oldValue)) { // Compare formatted dates to avoid unnecessary fetches for same date object but different instances
      await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
      
      // Update URL parameter
      router.push({ params: { date: formatDate(selectedDate.value) } });
    }
  }, { deep: true });

  
</script>

<style scoped> 
  
</style>