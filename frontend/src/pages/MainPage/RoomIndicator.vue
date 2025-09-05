<template>
  <div class="p-0 space-y-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 items-center">

      <div class="lg:col-span-4">
        <h2 class="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">当日の概要</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4"> <Card v-for="metric in summaryMetrics" :key="metric.title" class="shadow-md rounded-lg dark:bg-gray-800 dark:border-gray-700">
              <template #title>                
                <i :class="[metric.icon, metric.iconColor, 'text-xl mr-2']"></i>
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">{{ metric.title }}</span>                
              </template>
              <template #content>
                <p class="text-3xl font-bold text-gray-800 dark:text-white pt-1">{{ metric.count }}</p>
              </template>
            </Card>
        </div>
      </div>

      <div class="lg:col-span-3 flex lg:justify-center items-start">
        <div class="w-full lg:max-w-md p-1">          
          <DatePicker v-model="selectedDate" inline dateFormat="yy-mm-dd" :selectOtherMonths="true" class="w-full custom-datepicker-inline rounded-md dark:bg-gray-800" />
        </div>
      </div>

    </div>

    <Panel class="dark:bg-gray-800 dark:border-gray-700">
      <template #header>
        <div></div>        
        <h2 class="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-200">予定表</h2>
      </template>
      <div v-if="isLoading" class="grid gap-4">
        <div v-for="n in 4" :key="n" class="col-span-1 md:col-span-1">
          <Skeleton shape="rectangle" width="100%" height="50px" />
        </div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div v-for="group in roomGroups" :key="group.title" class="col-span-1 md:col-span-1">
          <div v-if="group.title!=='部屋ブロック' || (group.rooms.length > 0 && group.title==='部屋ブロック')" :class="`p-2 rounded-lg ${group.color} ${group.darkColor}`">
            <Card class="p-2 dark:bg-gray-700 dark:border-gray-600">
              <template #header>
                <h3 :class="`text-lg rounded-lg font-semibold mb-2 ${group.color} ${group.darkColor} dark:text-white`">{{ group.title }} ({{ group.rooms.length }})</h3>
              </template>
              <template #content>
                <div v-if="group.rooms.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2">
                  <div v-for="room in group.rooms" :key="room.room_id" 
                    :class="[
                      'p-2 rounded outline-zinc-500/50 dark:outline-gray-400/50 outline-dashed',
                      // Default background
                      'dark:bg-gray-600',
                      // Conditional background colors based on group and status
                      {
                        // 本日チェックアウト - Already checked out (completed)
                        'bg-green-200 dark:bg-green-800': group.title === '本日チェックアウト' && room.status === 'checked_out',
                        
                        // 本日チェックイン - Already checked in or checked out (completed)
                        'bg-blue-200 dark:bg-blue-800': group.title === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out'),
                        
                        // Default background for pending/incomplete statuses
                        'bg-white dark:bg-gray-600': !(
                          (group.title === '本日チェックアウト' && room.status === 'checked_out') ||
                          (group.title === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out'))
                        )
                      }
                    ]"
                  >
                    <!-- Status completion indicator -->
                    <div v-if="group.title === '本日チェックアウト' && room.status === 'checked_out'" 
                        class="absolute top-1 right-1 text-xs bg-green-500 text-white px-2 py-1 rounded">
                      完了
                    </div>
                    <div v-else-if="group.title === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out')" 
                        class="absolute top-1 right-1 text-xs bg-blue-500 text-white px-2 py-1 rounded">
                      完了
                    </div>
                    
                    <!-- Rest of your existing room card content -->
                    <div class="flex items-center justify-between">
                      <span class="font-semibold dark:text-white">{{ room.room_number + '：' + room.room_type_name }}</span>
                      <div class="flex items-center">
                        <div v-if="room.number_of_people" class="flex items-center mr-2">
                          <div class="flex items-center dark:text-gray-200">
                            <i class="pi pi-users mr-1"></i>
                            <span>{{ room.number_of_people }}</span>
                          </div>
                        </div>
                        <div class="flex items-center justify-end">                    
                          <span v-if="room.status === 'hold'" class="bg-yellow-500 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else-if="room.status === 'provisory'" class="bg-cyan-300 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else-if="room.status === 'confirmed'" class="bg-sky-600 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else-if="room.status === 'checked_in'" class="bg-green-500 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else-if="room.status === 'checked_out'" class="bg-purple-500 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else-if="room.status === 'cancelled'" class="bg-red-500 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else class="bg-gray-500 rounded-full w-3 h-3 mr-1"></span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- Client info section -->
                     <div v-if="room.client_name">
                      <div v-if="room.client_name" class="flex self-center dark:text-gray-200" @click="openEditReservation(room)">
                        <Avatar icon="pi pi-user" size="small" class="mr-2"/>
                        <p class="mb-2">
                          {{ getClientName(room) }}                    
                        </p>
                      </div>
                      <p v-if="room.payment_timing === 'on-site'" class="mb-2 text-emerald-500"><i class="pi pi-wallet mr-1"></i>{{ paymentTimingText(room.payment_timing) }}</p>
                      <div v-else class="mb-2"></div>
                    </div>
                    <div v-else @click="openNewReservation(room)" class="dark:text-gray-200">
                      <Avatar icon="pi pi-plus" size="small" class="mr-2"/>
                      <span>予約を追加</span> 
                    </div>
                    
                    <!-- Time and plan info -->
                    <div v-if="group.title === '本日チェックイン'" class="flex items-center gap-2">
                      <div>
                        <span class="dark:text-gray-200">
                          <i class="pi pi-clock mr-1"></i>
                          {{ formatTime(room.check_in_time) }}
                        </span>
                      </div>
                      <div v-if="room.plan_name">
                        <div v-for="(planData, planName) in planSummary[room.room_number]" :key="planName" class="mb-1">
                          <Button 
                              type="button" 
                              :label="`${planName}`" 
                              :badge="`${planData.count}`" 
                              badgeSeverity="secondary"
                              variant="outlined" 
                              :style="{ 
                                  backgroundColor: `${planData.color}40`, 
                                  border: `1px solid ${planData.color}`, 
                                  color: 'black',
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem'
                              }" 
                              v-tooltip.top="getPlanDaysTooltip(planData.details, planName)"
                            />
                        </div>
                      </div>
                    </div>
                    <div v-else-if="group.title === '本日チェックアウト'" class="flex items-center gap-2">
                      <div>
                        <span class="dark:text-gray-200">
                          <i class="pi pi-clock mr-1"></i>
                          {{ formatTime(room.check_out_time) }}
                        </span>
                      </div>                      
                    </div>                    
                    <div v-else>
                      <div v-if="room.plan_name">
                        <div v-for="(planData, planName) in planSummary[room.room_number]" :key="planName" class="mb-1">                            
                            <Button 
                              type="button" 
                              :label="`${planName}`" 
                              :badge="`${planData.count}`" 
                              badgeSeverity="secondary"
                              variant="outlined" 
                              :style="{ 
                                  backgroundColor: `${planData.color}40`, 
                                  border: `1px solid ${planData.color}`, 
                                  color: 'black',
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem'
                              }"
                              v-tooltip.top="getPlanDaysTooltip(planData.details, planName)"
                            />
                        </div>
                      </div>                      
                    </div>
                  </div>
                </div>
                <div v-else>
                  <p class="dark:text-gray-400">予約予定はありません。</p>
                </div>
              </template>
            
            
          </Card>
          </div>
        </div>
      </div>
    </Panel>
  </div>

  <Drawer 
    v-model:visible="drawerVisible"
    :modal="true"
    :position="'bottom'"
    :style="{height: '75vh'}"    
    @hide="handleDrawerClose"
    :closable="true"
    class="dark:bg-gray-800"
  >
    <div class="flex justify-end" v-if="hasReservation">
      <Button @click="goToReservation" severity="info">
        <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
      </Button>
    </div>
    
    <ReservationAddRoom v-if="!hasReservation"     
      :room_id="selectedRoomID"
      :date="selectedDate"
      @temp-block-close="handleTempBlock"
    />
    <ReservationEdit
        v-if="hasReservation"
        :reservation_id="selectedReservationID"
        :room_id="selectedRoomID"        
    />
  </Drawer>

</template>

<script setup>
  // Vue
  import { ref, computed, watch, onMounted, onUnmounted, onErrorCaptured } from 'vue';
  import { useRouter } from 'vue-router';
  const router = useRouter(); 

  import ReservationAddRoom from './components/ReservationAddRoom.vue';
  import ReservationEdit from './ReservationEdit.vue';

  //Websocket
  import io from 'socket.io-client';
  const socket = ref(null);

  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();  
  import Panel from 'primevue/panel';
  import Card from 'primevue/card';
  import Drawer from 'primevue/drawer';
  import Skeleton from 'primevue/skeleton';
  import Avatar from 'primevue/avatar';
  import DatePicker from 'primevue/datepicker';
  import Button from 'primevue/button';
  
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
      
  const selectedRoomID = ref(null);
  const selectedReservationID = ref(null);
  const drawerVisible = ref(false);
  const hasReservation = ref(false);
      
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

  const selectedDate = ref(new Date());

  // Computed
  const roomGroups = computed(() => {
    console.log('[RoomIndicator] Recalculating room groups...');
    console.log('[RoomIndicator] Reserved rooms data:', reservedRoomsDayView.value);
    const selectedDateObj = new Date(selectedDate.value);
    if (isNaN(selectedDateObj.getTime())) {
      console.error("Invalid selectedDate.value:", selectedDate.value);
      return [];
    }

    const allReservations = reservedRoomsDayView.value?.reservations?.filter(room => room.cancelled === null) || [];
        
    // 1. BLOCKED ROOMS - Always blocked regardless of dates
    const blockedRooms = allReservations.filter(room => room.status === 'block');
    
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
    allReservations.forEach(room => {
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

  
    console.group('Room Groups Debug');
    console.log('Check-in Today:', categorizedRooms.checkIn.map(r => ({
      room_id: r.room_id,
      room_number: r.room_number,
      reservation_id: r.id,
      status: r.status,
      payment_timing: r.payment_timing
    })));
    
    console.log('Check-out Today:', categorizedRooms.checkOut.map(r => ({
      room_id: r.room_id,
      room_number: r.room_number,
      reservation_id: r.id,
      status: r.status,
      payment_timing: r.payment_timing
    })));
    
    console.log('Occupied:', categorizedRooms.occupied.length);
    console.log('Free Rooms:', freeRooms.length);
    console.log('Blocked Rooms:', blockedRooms.length);
    console.groupEnd();
  
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

  const getRoomCardClasses = (room, groupTitle) => {
    const baseClasses = [
      'p-2', 'rounded', 'outline-zinc-500/50', 'dark:outline-gray-400/50', 
      'outline-dashed', 'relative' // Added relative for absolute positioned indicators
    ];

    // Determine background color based on group and status
    if (groupTitle === '本日チェックアウト' && room.status === 'checked_out') {
      // Already checked out - completed status
      baseClasses.push('bg-green-200', 'dark:bg-green-800');
    } else if (groupTitle === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out')) {
      // Already checked in or completed - completed status
      baseClasses.push('bg-blue-200', 'dark:bg-blue-800');
    } else {
      // Default background for pending/incomplete statuses
      baseClasses.push('bg-white', 'dark:bg-gray-600');
    }

    return baseClasses.join(' ');
  };

  const getStatusIndicator = (room, groupTitle) => {
    if (groupTitle === '本日チェックアウト' && room.status === 'checked_out') {
      return {
        show: true,
        text: '完了',
        classes: 'absolute top-1 right-1 text-xs bg-green-500 text-white px-2 py-1 rounded'
      };
    } else if (groupTitle === '本日チェックイン' && (room.status === 'checked_in' || room.status === 'checked_out')) {
      return {
        show: true,
        text: '完了',
        classes: 'absolute top-1 right-1 text-xs bg-blue-500 text-white px-2 py-1 rounded'
      };
    }
    return { show: false };
  };
  
  const openNewReservation = (room) => {
    // console.log('[openNewReservation] Using selected date:', selectedDate.value);
    selectedRoomID.value = room.room_id;
    hasReservation.value = false;
    drawerVisible.value = true;
  };
  
  const openEditReservation = (room) => {        
    // console.log('[openEditReservation] Current selectedDate:', selectedDate.value);
    selectedReservationID.value = room.id;
    selectedRoomID.value = room.room_id;        
    hasReservation.value = true;
    drawerVisible.value = true;
  };  
  const goToReservation = () => {
    router.push({ name: 'ReservationEdit', params: { reservation_id: selectedReservationID.value } });
  }

  onErrorCaptured((err, instance, info) => {
    console.error('Error captured:', err, instance, info);
    // You can also prevent the error from propagating further
    return false; // Prevents error propagation
  });

  const handleTempBlock = (data) => {
    // Close any open dialogs or drawers
    drawerVisible.value = false;
  };

  const getClientName = (room) => {
    //console.log('getClientName - Full room data:', JSON.parse(JSON.stringify(room)));
  
    // Parse clients from clients_json if it exists
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
  
    //console.log('Parsed clients:', clients);
          
    const hasClients = Array.isArray(clients) && clients.length > 0;
  
    if (hasClients) {
      const client = clients[0];
      const name = client.name_kanji || client.name_kana || client.name || room.client_name;
      //console.log('Using client name from clients_json:', name);
      return name;
    }
  
    // Fallback to client_name or default
    const fallbackName = room?.client_name || 'ゲスト';
    //console.log('Using fallback name:', fallbackName);
    return fallbackName;
  };

  const handleDrawerClose = async () => {
    try {
      await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
    } catch (error) {
      console.error('Error refreshing reservations after drawer close:', error);
      toast.add({
        severity: 'error',
        summary: 'エラー',
        detail: '予約情報の更新に失敗しました',
        life: 3000
      });
    }
  };
  
  const planSummary = computed(() => {
    console.log('[RoomIndicator] Calculating plan summary...');
    const roomPlans = {};
    const reservations = reservedRoomsDayView.value?.reservations || [];
    
    console.clear();
    
    // Process each reservation
    reservations.forEach(reservation => {
      if (!reservation?.id) return;
      
      const roomNumber = reservation.room_number;
      if (!roomNumber) {
        console.error('[RoomIndicator] Missing room number for reservation:', reservation);
        return;
      }
      
      if (!roomPlans[roomNumber]) {
        roomPlans[roomNumber] = {};
      }
      
      // Process each day's plan in the reservation
      if (reservation.details?.length) {
        reservation.details.forEach(detail => {
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
      } else {
        // Fallback to reservation-level plan if no details
        const planName = reservation.plan_name || '未設定';
        if (!roomPlans[roomNumber][planName]) {
          roomPlans[roomNumber][planName] = {
            count: 1,
            color: reservation.plan_color || '#CCCCCC',
            details: []
          };
        } else {
          roomPlans[roomNumber][planName].count++;
        }
      }
    });
    
    // Log final counts for debugging
    Object.entries(roomPlans).forEach(([room, plans]) => {
      console.log(`Room ${room} plans:`, Object.entries(plans).map(([name, data]) => 
        `${name}: ${data.count} (${data.details?.length || 0} details)`
      ));
    });
    
    return roomPlans;
  });

  const getPlanDaysTooltip = (details, planName) => {
    console.log(`[RoomIndicator] Getting plan days tooltip for plan: ${planName}`);
    console.log(`[RoomIndicator] Details for ${planName}:`, details);
    
    if (!details || !details.length) {
      console.log('[RoomIndicator] No details available for this plan');
      return null;
    }

    const planDetails = details.filter(detail => detail.plan_name === planName);
    console.log(`[RoomIndicator] Found ${planDetails.length} matching details for plan ${planName}`);
    
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
    // console.log('onMounted of RoomIndicator', selectedHotelId.value, today);    
    // console.log('onMounted of selectedDate', selectedDate.value);        

    // Establish Socket.IO connection
    socket.value = io(import.meta.env.VITE_BACKEND_URL);

    socket.value.on('connect', () => {
      // console.log('Connected to server');
    });
    socket.value.on('connect_error', (err) => {
      // console.error('Socket connection error:', err);
    });
    socket.value.on('connect_timeout', () => {
      // console.error('Socket connection timeout');
    });
    
    socket.value.on('tableUpdate', async (data) => {
      // Prevent fetching if bulk update is in progress
      if (isUpdating.value) {
          // console.log('Skipping fetchReservation because update is still running');
          return;
      }

      await fetchReservationsToday(selectedHotelId, today);
    });

    await fetchHotels();
    await fetchHotel();

    await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
    //console.log('onMounted of reservedRoomsDayView', reservedRoomsDayView.value);
    
    isLoading.value = false;        
    
  });

  onUnmounted(() => {
    // Close the Socket.IO connection when the component is unmounted
    if (socket.value) {
      // console.log('Disconnected from the server.');
      socket.value.disconnect();
    }
  });

  // Watch      
  watch(selectedHotelId, async (newValue, oldValue) => {            
    try {
      // console.log('[RoomIndicator] selectedHotelId changed:', { oldValue, newValue });
      if (newValue !== oldValue) {
        selectedDate.value = today;
        await fetchHotel();
        await fetchReservationsToday(selectedHotelId.value, formatDate(today));
      }
    } catch (error) {
      console.error('[RoomIndicator] Error in selectedHotelId watcher:', error);
    }
  });
  
  watch(selectedDate, async (newValue, oldValue) => {
    // console.log('[RoomIndicator] selectedDate changed:', { oldValue, newValue });
    if (newValue !== oldValue) {
      // console.log('[RoomIndicator] Fetching reservations for date:', newValue);
      await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
    }
  }, { deep: true });

  
</script>

<style scoped> 
  
</style>