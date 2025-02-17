<template>
  <div class="p-2">
    <Panel header="部屋概要">
      <div v-if="isLoading" class="grid gap-4">
        <div v-for="n in 4" :key="n" class="col-span-1 md:col-span-1">
          <Skeleton shape="rectangle" width="100%" height="50px" />
        </div>
      </div>
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div v-for="group in roomGroups" :key="group.title" class="col-span-1 md:col-span-1">
          <div :class="`p-4 rounded-lg ${group.color}`">
            <h3 class="text-lg font-semibold mb-2">{{ group.title }} ({{ group.rooms.length }})</h3>
            <div v-if="group.rooms.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              <div v-for="room in group.rooms" :key="room.room_id" 
                class="p-2 rounded outline-zinc-500/50 outline-dashed"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold">{{ room.room_number + '：' + room.room_type_name }}</span>
                  <div v-if="room.number_of_people">
                    <div class="flex items-center">
                    <i class="pi pi-users mr-1"></i>
                    <span>{{ room.number_of_people }}</span>
                    </div>
                  </div>
                  <div class="flex items-center">                    
                    <span v-if="room.status === 'hold'" class="bg-yellow-500 rounded-full w-3 h-3 mr-1"></span>
                    <span v-else-if="room.status === 'provisory'" class="bg-cyan-300 rounded-full w-3 h-3 mr-1"></span>
                    <span v-else-if="room.status === 'confirmed'" class="bg-sky-600 rounded-full w-3 h-3 mr-1"></span>
                    <span v-else-if="room.status === 'checked_in'" class="bg-green-500 rounded-full w-3 h-3 mr-1"></span>
                    <span v-else-if="room.status === 'checked_out'" class="bg-purple-500 rounded-full w-3 h-3 mr-1"></span>
                    <span v-else-if="room.status === 'cancelled'" class="bg-black-500 rounded-full w-3 h-3 mr-1"></span>
                    <span v-else class="bg-gray-500 rounded-full w-3 h-3 mr-1"></span>
                  </div>
                </div>
                <div v-if="room.client_name" class="flex items-center" @click="openEditReservation(room)">
                  <Avatar icon="pi pi-user" size="small" class="mr-2"/>
                  <span>{{ room.client_name }}</span> 
                </div>
                <div v-else @click="openNewReservation(room)">
                  <Avatar icon="pi pi-plus" size="small" class="mr-2"/>
                  <span>予約を追加</span> 
                </div>
                <div v-if="room.plan_name">
                  <span>{{ room.plan_name }}</span>
                </div>                
              </div>
            </div>
            <div v-else>
              <p>部屋はありません。</p>
            </div>
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
  >
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

<script>
  import { ref, computed, watch, onMounted, onUnmounted, isRef } from 'vue';
  import io from 'socket.io-client';
  import { useToast } from 'primevue/usetoast';
  import { useHotelStore } from '@/composables/useHotelStore';
  import { useClientStore } from '@/composables/useClientStore';
  import { useReservationStore } from '@/composables/useReservationStore';  
  import ReservationAddRoom from './components/ReservationAddRoom.vue';
  import ReservationEdit from './components/ReservationEdit.vue';
  import { Panel, Drawer, Skeleton, Avatar } from 'primevue';
  
  export default {  
    name: "RoomIndicator",
    components: {  
      ReservationAddRoom,
      ReservationEdit,
      Panel,
      Drawer,
      Skeleton,
      Avatar,
    },
    data() {
      return {
        
      };
    },
    setup() {
      const socket = ref(null);
      const toast = useToast();
      const isUpdating = ref(false);
      const isLoading = ref(false);
      const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
      const { clients, fetchClients } = useClientStore();
      const { reservedRoomsDayView, fetchReservationsToday } = useReservationStore();

      const today = new Date();
      const selectedDate = ref(null);
      const selectedRoomID = ref(null);
      const selectedReservationID = ref(null);
      const drawerVisible = ref(false);
      const hasReservation = ref(false);
      
      // Helper function
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const formatDateWithDay = (date) => {
          const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
          const parsedDate = new Date(date);
          return `${parsedDate.toLocaleDateString(undefined, options)}`;
      };

      // Computed categories
      const checkInToday = computed(() => {
        return reservedRoomsDayView.value?.reservations?.filter(
          (room) => formatDate(new Date(room.check_in)) === formatDate(today)
        ) || [];
      });
      const checkOutToday = computed(() => {
        return reservedRoomsDayView.value?.reservations?.filter(
          (room) => formatDate(new Date(room.check_out)) === formatDate(today)
        ) || [];
      });      
      const occupiedRooms = computed(() => {
        return reservedRoomsDayView.value?.reservations?.filter((room) => 
          formatDate(new Date(room.check_in)) !== formatDate(today) 
          && formatDate(new Date(room.date)) === formatDate(today)
          && room.cancelled === null          
        ) || [];
      });
      const freeRooms = computed(() => {
        return selectedHotelRooms.value?.filter((room) =>
          room.room_for_sale_idc === true
          && !reservedRoomsDayView.value?.reservations?.some((res) => 
            res.room_id === room.room_id
            && formatDate(new Date(res.date)) === formatDate(today)            
          )
        ) || [];
      });

      // Organized Room Groups
      const roomGroups = computed(() => {
        const result = [
          { title: '本日チェックイン', rooms: checkInToday.value, color: 'bg-blue-100' },
          { title: '本日チェックアウト', rooms: checkOutToday.value, color: 'bg-green-100' },
          { title: '滞在', rooms: occupiedRooms.value, color: 'bg-yellow-100' },
          { title: '空室', rooms: freeRooms.value, color: 'bg-gray-100' },
        ];
        console.log('roomGroups:', result);
        return result;
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

      // Mount
      onMounted(async () => {
        isLoading.value = true;
        // Establish Socket.IO connection
        socket.value = io(import.meta.env.VITE_BACKEND_URL);

        socket.value.on('connect', () => {
          // console.log('Connected to server');
        });

        socket.value.on('tableUpdate', async (data) => {
          // Prevent fetching if bulk update is in progress
          if (isUpdating.value) {
              console.log('Skipping fetchReservation because update is still running');
              return;
          }

          await fetchReservationsToday(selectedHotelId, today);
        });

        await fetchHotels();
        await fetchHotel();
        
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
            if (newValue !== oldValue) {
              await fetchReservationsToday(selectedHotelId.value, formatDate(today));              
            }
      }, { deep: true });
      

      return {        
        isLoading,
        selectedDate,
        selectedRoomID,
        selectedReservationID,
        drawerVisible,
        hasReservation,
        roomGroups,
        openNewReservation,
        openEditReservation,
      };
    },
  }

</script>

<style scoped> 
  
</style>