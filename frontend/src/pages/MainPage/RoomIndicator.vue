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
                    class="p-2 rounded outline-zinc-500/50 dark:outline-gray-400/50 outline-dashed dark:bg-gray-600"
                  >
                    <div class="flex items-center justify-between">
                      <span class="font-semibold dark:text-white">{{ room.room_number + '：' + room.room_type_name }}</span>
                      <div class="flex items-center">
                        <div v-if="room.number_of_people"class="flex items-center mr-2">
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
                          <span v-else-if="room.status === 'cancelled'" class="bg-black-500 rounded-full w-3 h-3 mr-1"></span>
                          <span v-else class="bg-gray-500 rounded-full w-3 h-3 mr-1"></span>
                        </div>
                      </div>
                    </div>
                    
                    <div v-if="room.client_name" class="flex self-center dark:text-gray-200" @click="openEditReservation(room)">
                      <Avatar icon="pi pi-user" size="small" class="mr-2"/>
                      <span class="mb-4">{{ room.client_name }}</span> 
                    </div>
                    <div v-else @click="openNewReservation(room)" class="dark:text-gray-200">
                      <Avatar icon="pi pi-plus" size="small" class="mr-2"/>
                      <span>予約を追加</span> 
                    </div>
                    <div v-if="group.title === '本日チェックイン'" class="flex items-center gap-2">
                      <div>
                        <span class="dark:text-gray-200">
                          <i class="pi pi-clock mr-1"></i>
                          {{ formatTime(room.check_in_time) }}
                        </span>
                      </div>
                      <div v-if="room.plan_name">
                        <span class="p-1 rounded-lg" :style="{ backgroundColor: room.plan_color }">{{ room.plan_name }}</span>
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
                        <span class="p-1 rounded-lg" :style="{ backgroundColor: `${room.plan_color}` }">{{ room.plan_name }}</span>
                      </div>  
                    </div>
                  </div>
                </div>
                <div v-else>
                  <p class="dark:text-gray-400">部屋はありません。</p>
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
    // console.log('reservedRoomsDayView:', reservedRoomsDayView.value);
    // console.log('selectedHotelRooms:', selectedHotelRooms.value);

    const selectedDateObj = new Date(selectedDate.value);
    if (isNaN(selectedDateObj.getTime())) {
        console.error("Invalid selectedDate.value:", selectedDate.value);
        return [];
    }

    const reservedRoomIds = new Set(
      reservedRoomsDayView.value?.reservations
        ?.filter(room => room.cancelled === null)
        ?.map((res) => res.room_id) || []
    );
    // console.log('reservedRoomIds:',reservedRoomIds)

    const checkInToday = reservedRoomsDayView.value?.reservations?.filter((room) => {
      const checkInDate = new Date(room.check_in);
      
      // Ensure checkInDate is a valid Date object
      if (isNaN(checkInDate.getTime())) {
        console.warn(`Invalid check_in date: ${room.check_in}`);
        return false;
      }

      return formatDate(checkInDate) === formatDate(selectedDateObj) &&
      room.status !== 'block' &&
      room.cancelled === null;
    }) || [];

    const checkOutToday = reservedRoomsDayView.value?.reservations?.filter((room) => {
      const checkOutDate = new Date(room.check_out);
      
      // Ensure checkOutDate is a valid Date object
      if (isNaN(checkOutDate.getTime())) {
        console.warn(`Invalid check_out date: ${room.check_out}`);
        return false;
      }
      
      return formatDate(checkOutDate) === formatDate(selectedDateObj) &&
      room.status !== 'block' &&
      room.cancelled === null;
    }) || [];


    const occupiedRooms = reservedRoomsDayView.value?.reservations?.filter((room) => {
      // Ensure check_in date is valid
      const checkInDate = new Date(room.check_in);
      if (isNaN(checkInDate.getTime())) {
        console.warn(`Invalid check_in date: ${room.check_in}`);
        return false;
      }

      // Ensure date is valid
      const checkOutDate = new Date(room.check_out);
      if (isNaN(checkOutDate.getTime())) {
        console.warn(`Invalid date: ${room.check_out}`);
        return false;
      }          

      return !isNaN(checkInDate.getTime())
        && !isNaN(checkOutDate.getTime()) 
        && checkInDate <= selectedDateObj 
        && checkOutDate > selectedDateObj
        && room.cancelled === null
        && room.status !== 'block';
    }) || [];

    const blockedRooms = reservedRoomsDayView.value?.reservations?.filter((room) => {
      return room.status === 'block';
    }) || [];

    const freeRooms = selectedHotelRooms.value?.filter((room) => 
      room.room_for_sale_idc === true && !reservedRoomIds.has(room.room_id)
    ) || [];


    const result = [
      { title: '本日チェックイン', rooms: checkInToday, color: 'bg-blue-100', darkColor: 'dark:bg-blue-900/30' },
      { title: '本日チェックアウト', rooms: checkOutToday, color: 'bg-green-100', darkColor: 'dark:bg-green-900/30' },
      { title: '滞在', rooms: occupiedRooms, color: 'bg-yellow-100', darkColor: 'dark:bg-yellow-900/30' },
      { title: '空室', rooms: freeRooms, color: 'bg-gray-100', darkColor: 'dark:bg-gray-800' },
      { title: '部屋ブロック', rooms: blockedRooms, color: 'bg-red-100', darkColor: 'dark:bg-red-900/30' },
    ];

    // console.log('roomGroups:', result);
    return result;

  });

  const summaryMetrics = computed(() => {
    const metricsMap = {
      '本日チェックイン': { title: '本日チェックイン', icon: 'pi pi-arrow-down-left', iconColor: 'text-blue-500' },
      '本日チェックアウト': { title: '本日チェックアウト', icon: 'pi pi-arrow-up-right', iconColor: 'text-green-500' },
      '滞在': { title: '滞在者数', icon: 'pi pi-users', iconColor: 'text-yellow-500' },
      '空室': { title: '空室数', icon: 'pi pi-home', iconColor: 'text-gray-500' },
    };
    return Object.entries(metricsMap).map(([groupKey, metricDetails]) => {
      const group = roomGroups.value.find(g => g.title === groupKey);
      return {
        title: metricDetails.title,
        icon: metricDetails.icon,
        iconColor: metricDetails.iconColor,
        count: group ? group.rooms.length : 0,
      };
    });
  });
  
  const openNewReservation = (room) => {
    selectedDate.value = formatDate(today);
    selectedRoomID.value = room.room_id;
    hasReservation.value = false;
    drawerVisible.value = true;
  };
  const openEditReservation = (room) => {        
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

  // Mount
  onMounted(async () => {
    
    isLoading.value = true;
    // console.log('onMounted of RoomIndicator', selectedHotelId.value, today);
    // console.log('onMounted of reservedRoomsDayView', reservedRoomsDayView.value);
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
        if (newValue !== oldValue) {
          // console.log('selectedDate changed to:',newValue);
          await fetchReservationsToday(selectedHotelId.value, formatDate(selectedDate.value));
        }
  }, { deep: true });

</script>

<style scoped> 
  
</style>