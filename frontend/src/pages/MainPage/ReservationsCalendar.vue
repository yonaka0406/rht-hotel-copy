<template>
  <div class="p-2">
    <Panel header="予約カレンダー">
      <div class="table-container" ref="tableContainer" @scroll="onScroll">
        <table class="table-auto w-full mb-2">
          <thead>
            <tr>              
              <th class="px-4 py-2 text-center font-bold bg-white sticky top-0 left-0 z-20">日付</th>

              <th
                v-for="(room, roomIndex) in selectedHotelRooms"
                :key="roomIndex"
                class="px-4 py-2 text-center sticky top-0 bg-white z-10"
              > 
                  {{ room.room_type_name }} <br/>
                  {{ room.room_number }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex">
              <td class="px-4 py-2 text-center font-bold bg-white sticky left-0 z-10">
                {{ date }}
              </td>
              <td
                v-for="(room, roomIndex) in selectedHotelRooms"
                :key="roomIndex"
                @dblclick="openDrawer(room.room_id, date)"
                @dragstart="onDragStart($event, room.room_id, date)"
                @dragover.prevent
                @drop="onDrop($event, room.room_id, date)"
                draggable="true"
                :class="{                    
                    'bg-yellow-100': isRoomReserved(room.room_id, date) && fillRoomInfo(room.room_id, date).status === 'hold',
                    'bg-blue-100': isRoomReserved(room.room_id, date) && fillRoomInfo(room.room_id, date).status === 'provisory',
                    'bg-green-100': isRoomReserved(room.room_id, date) && fillRoomInfo(room.room_id, date).status === 'confirmed',
                    'bg-green-700': isRoomReserved(room.room_id, date) && fillRoomInfo(room.room_id, date).status === 'checked_in',
                    'bg-gray-100': isRoomReserved(room.room_id, date) && fillRoomInfo(room.room_id, date).status === 'checked_out',
                    'bg-red-100': isRoomReserved(room.room_id, date) && fillRoomInfo(room.room_id, date).status === 'cancelled',
                    'cursor-pointer': true,
                }"
                class="px-4 py-2 text-center text-xs"                
              >
                <div 
                  v-if="isRoomReserved(room.room_id, date)"
                >                  
                  <template v-if="fillRoomInfo(room.room_id, date).status === 'hold'">
                    <i class="pi pi-pause"></i> 
                    {{ fillRoomInfo(room.room_id, date).client_name }}
                  </template>
                  <template v-if="fillRoomInfo(room.room_id, date).status === 'provisory'">
                    <i class="pi pi-clock"></i>
                    {{ fillRoomInfo(room.room_id, date).client_name }}
                  </template>
                  <template v-if="fillRoomInfo(room.room_id, date).status === 'confirmed'">
                    <i class="pi pi-check-circle"></i>
                    {{ fillRoomInfo(room.room_id, date).client_name }}
                  </template>
                  <template v-if="fillRoomInfo(room.room_id, date).status === 'checked_in'">
                    <i class="pi pi-user"></i>
                    {{ fillRoomInfo(room.room_id, date).client_name }}
                  </template>
                  <template v-if="fillRoomInfo(room.room_id, date).status === 'checked_out'">
                    <i class="pi pi-sign-out"></i>
                    {{ fillRoomInfo(room.room_id, date).client_name }}
                  </template>
                  <template v-if="fillRoomInfo(room.room_id, date).status === 'cancelled'">
                    <i class="pi pi-times"></i>
                    {{ fillRoomInfo(room.room_id, date).client_name }}
                  </template>
                </div>
                <div v-else>
                  <i class="pi pi-check"></i> 空室
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Panel>    
    <Drawer v-model:visible="drawerVisible":modal="true":position="'bottom'":style="{height: '75vh'}":header="drawerHeader":closable="true">
      <ReservationEdit
        v-if="reservationId"
        :reservation_id="reservationId"
        :room_id="selectedRoom.room_id"        
      />
    </Drawer>
  </div>
</template>

<script>
  import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
  import io from 'socket.io-client';
  import { useToast } from 'primevue/usetoast';
  import { useHotelStore } from '@/composables/useHotelStore';
  import { useClientStore } from '@/composables/useClientStore';
  import { useReservationStore } from '@/composables/useReservationStore';
  import ReservationEdit from './components/ReservationEdit.vue';
  import Panel from 'primevue/panel';
  import { Drawer } from 'primevue';

  export default {  
    name: "ReservationsCalendar",
    components: {  
        ReservationEdit,
        Panel,
        Drawer,
    },
    data() {
      return {
        
      };
    },
    setup() {
      const socket = ref(null);
      const toast = useToast();
      const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
      const { clients, fetchClients } = useClientStore();
      const { reservationDetails, reservedRooms, fetchReservedRooms, fetchReservation, reservationId, setReservationId, setCalendarChange } = useReservationStore();
      const dateRange = ref([]); 
      const minDate = ref(null);
      const maxDate = ref(null);
      const reservedRoomsMap = ref([]);
      const drawerVisible = ref(false);
      const selectedRoom = ref(null);
      const selectedDate = ref(null);
      const dragFrom = ref({ reservation_id: null, room_id: null, room_number: null, room_type_name: null, number_of_people: null, check_in: null, check_out: null, days: null });
      const dragTo = ref({ room_id: null, room_number: null, room_type_name: null, capacity: null, check_in: null, check_out: null });
      
      // Helper function
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      // Generate date range from current date - 10 days to current date + 40 days
      /*
      const generateDateRange = () => {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setDate(today.getDate() - 10);

        const endDate = new Date(today);
        endDate.setDate(today.getDate() + 40);

        const dates = [];
        for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
          dates.push(formatDate(new Date(d))); // Format YYYY-MM-DD
        }
        return dates;
      };
      */
      const generateDateRange = (start, end) => {
        const dates = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(formatDate(new Date(d)));
        }
        return dates;
      };
      const appendDaysToRange = async (direction) => {
        if (direction === "up") {
          const newMinDate = new Date(minDate.value);
          const newMaxDate = new Date(minDate.value);
          newMinDate.setDate(newMinDate.getDate() - 3);
          newMaxDate.setDate(newMaxDate.getDate() - 1);
          const newDates = generateDateRange(newMinDate, newMaxDate);
          dateRange.value = [...newDates, ...dateRange.value];
          minDate.value = formatDate(newMinDate);
          await fetchReservations();
        } else if (direction === "down") {
          const newMinDate = new Date(maxDate.value);
          const newMaxDate = new Date(maxDate.value);
          newMinDate.setDate(newMinDate.getDate() + 1);
          newMaxDate.setDate(newMaxDate.getDate() + 3);
          const newDates = generateDateRange(newMinDate, newMaxDate);
          dateRange.value = [...dateRange.value, ...newDates];
          maxDate.value = formatDate(newMaxDate);
          await fetchReservations();
        }
      };

      // Fetch reserved rooms data
      const fetchReservations = async () => {
        try {
          const startDate = dateRange.value[0];
          const endDate = dateRange.value[dateRange.value.length - 1];
          await fetchReservedRooms(
            selectedHotelId.value,
            startDate,
            endDate
          );
          console.log('reservedRooms:', reservedRooms.value);
        } catch (error) {
          console.error('Error fetching reservations:', error);
        }
      };

      // Function to build a hash map for faster lookups
      const buildReservedRoomsMap = (reservedRooms) => {
        const map = {};

        reservedRooms.forEach((reservation) => {
          const formattedDate = formatDate(new Date(reservation.date));
          const key = `${reservation.room_id}_${formattedDate}`;
          map[key] = true; // Mark the reservation as true for this room and date
        });

        return map;
      };

      /* IMPLEMENT: Hash map for faster lookups
      const isRoomReservedHash = (room_id, date) => {
        const key = `${room_id}_${date}`; // Create a key using room_id and date
        //console.log(reservedRoomsMap[key]);
        return reservedRoomsMap[key] === true; // Check if the key exists in the hash map
      };
      */

      // Check if a room is reserved for a specific date
      const isRoomReserved = (room_id, date) => {
        //console.log('For',room_id,'and',date,'match');
        
        return reservedRooms.value.some(
          (reservation) => {
            const formattedDate = formatDate(new Date(reservation.date));            
            //console.log('Reservation:', reservation.room_id === room_id && formattedDate === date, reservation.room_id, formattedDate, room_id, date);
            return reservation.room_id === room_id && formattedDate === date
          }
            
        );
      };

      const fillRoomInfo = (room_id, date) => {

        const reservation = reservedRooms.value.find(
          (reservation) => reservation.room_id === room_id && formatDate(new Date(reservation.date)) === date
        );
                
        return reservation || { status: 'available', client_name: '', reservation_id: null };
        
        
      };
      
      const openDrawer = (roomId, date) => {
        selectedRoom.value = selectedHotelRooms.value.find(room => room.room_id === roomId);
        selectedDate.value = date;

        if (selectedRoom.value) {
          if(!fillRoomInfo(roomId, date).reservation_id) {
            setReservationId(null);
            drawerVisible.value = true;
          } else {            
            setReservationId(fillRoomInfo(roomId, date).reservation_id);
            drawerVisible.value = true;
          }
        } else {
          
        }
      };

      const drawerHeader = computed(() => {
        /*
        if (selectedRoom.value) {
          return `予約編集 - ${selectedRoom.value.room_type_name} ${selectedRoom.value.room_number} - ${selectedDate.value}`;
        }
        return '予約編集';
        */
      });

      const onDragStart = async (event, roomId, date) => {
        console.log('Drag start, room:', roomId, 'date:', date);  
        console.log('Fill room info:', fillRoomInfo(roomId, date));      
        
        const reservation_id = fillRoomInfo(roomId, date).reservation_id;
        if(reservation_id){
          const check_in = formatDate(new Date(fillRoomInfo(roomId, date).check_in));
          const check_out = formatDate(new Date(fillRoomInfo(roomId, date).check_out));
          const room_id = fillRoomInfo(roomId, date).room_id;
          const room_number = fillRoomInfo(roomId, date).room_number;
          const room_type_name = fillRoomInfo(roomId, date).room_type_name;
          const number_of_people = fillRoomInfo(roomId, date).number_of_people;
          const days = Math.floor((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
          dragFrom.value = { reservation_id, room_id, room_number, room_type_name, number_of_people, check_in, check_out, days };

          console.log(fillRoomInfo(roomId, date));
          await fetchReservation(reservation_id);          
        }
        
      };

      const onDrop = (event, roomId, date) => {
        console.log('Drop');
        const selectedRoom = selectedHotelRooms.value.find(room => room.room_id === roomId);
        console.log('Selected room:', selectedRoom);
        const check_in = formatDate(new Date(date));
        const check_out = formatDate(new Date(new Date(date).setDate(new Date(date).getDate() + dragFrom.value.days)));        
        const room_id = selectedRoom.room_id;
        const room_number = selectedRoom.room_number;
        const room_type_name = selectedRoom.room_type_name;
        const capacity = selectedRoom.room_capacity;
        dragTo.value = { room_id, room_number, room_type_name, capacity, check_in, check_out };
        
        const from = dragFrom.value;
        const to = dragTo.value;
        
        if(from.number_of_people > to.capacity){
          toast.add({ severity: 'error', summary: 'エラー', detail: '人数が収容人数を超えています。' , life: 3000 });
        } else if(!checkForConflicts(from, to)){
          showConfirmationPrompt();
        } else {
          console.log('Conflict found');
          toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。' , life: 3000 });
        }        
      };

      const showConfirmationPrompt = async () => {
        const from = dragFrom.value;
        const to = dragTo.value;
        let confirmation = false;
        if (from.room_number === to.room_number) {
          confirmation = confirm(`${from.room_number}号室の宿泊期間を「IN：${from.check_in} OUT：${from.check_out}」から「IN：${to.check_in} OUT：${to.check_out}」にしますか?`);  
        } else if (from.check_in === to.check_in && from.check_out === to.check_out) {
          confirmation = confirm(`${from.room_number}号室の予約を${to.room_number}号室に移動しますか?`);
        } else {
          confirmation = confirm(`${from.room_number}号室の宿泊期間を「IN：${from.check_in} OUT：${from.check_out}」から「IN：${to.check_in} OUT：${to.check_out}」に変更し、${to.room_number}号室に移動しますか?`);
        }
                
        if (confirmation) {
          console.log('Confirmed');
          
          if(!checkForConflicts(from, to)){
            console.log('No conflicts found');
            await setCalendarChange(from.reservation_id, from.check_in, from.check_out, to.check_in, to.check_out, from.room_id, to.room_id, from.number_of_people);
            await setReservationId(null);
          } else {
            console.log('Conflict found');
            toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。' , life: 3000 });
          }
          
        }
      };

      const checkForConflicts = (from, to) => {
        //console.log('Checking for conflicts...');

        for (const reservation of reservationDetails.value.reservation) {
          //console.log('Checking reservation:', reservation);

          if (from.room_number === to.room_number) {
            //console.log('Same room number');
            const dateDiff = new Date(to.check_in) - new Date(from.check_in);
            const newDate = new Date(reservation.date);
            newDate.setDate(newDate.getDate() + dateDiff / (1000 * 60 * 60 * 24));            

            if (reservedRooms.value.some(
              r => 
                r.room_id === to.room_id 
                && formatDate(new Date(r.date)) === formatDate(new Date(newDate)) 
                && r.reservation_id !== reservation.reservation_id
              )) {
              //console.log('Conflict found'); 
              return true;
            }
          } else if (from.check_in === to.check_in && from.check_out === to.check_out) {
            //console.log('Same check-in and check-out dates');
            if (reservedRooms.value.some(
                r => 
                  r.room_id === to.room_id
                  && formatDate(new Date(r.date)) === reservation.date
                )) {
              //console.log('Conflict found'); 
              return true;
            }            
          } else {
            //console.log('Different room number and dates');
            const dateDiff = new Date(to.check_in) - new Date(from.check_in);
            const newDate = new Date(reservation.date);
            newDate.setDate(newDate.getDate() + dateDiff / (1000 * 60 * 60 * 24));            

            if (reservedRooms.value.some(
              r => 
                r.room_id === to.room_id 
                && formatDate(new Date(r.date)) === formatDate(new Date(newDate)) 
                && r.reservation_id !== reservation.reservation_id
              )) {
              //console.log('Conflict found'); 
              return true;
            }
          }
        }

        console.log('No conflicts found');
        return false;
      };
/*
      // Method to calculate rowspan based on reservation_id
      const getRowspan = (room_id, date, dateIndex) => {
        
        //Add this line to the table <td>
        //:rowspan="getRowspan(room.room_id, date, dateIndex)"
        

        let rowspan = 1;
        const currentReservation = fillRoomInfo(room_id, date);

        if (currentReservation.status !== 'available') {
          // Check consecutive dates for the same reservation ID
          for (let i = dateIndex + 1; i < dateRange.value.length; i++) {
            const nextDate = dateRange.value[i];
            const nextReservation = fillRoomInfo(room_id, nextDate);
            
            if (nextReservation.reservation_id === currentReservation.reservation_id) {
              rowspan++;
            } else {
              break;
            }
          }
        }
        return rowspan;
      };
*/
      const onScroll = () => {
        // Handle table scrolling if needed
      };
      let timeoutId = null;
      const debounce = (func, delay) => {
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
      };
      const handleScroll = async (event) => {
        const container = event.target;
        const threshold = 1;
        const minScrollTop = threshold;
        const { scrollTop, scrollHeight, clientHeight } = container;

        if (container.scrollTop < minScrollTop) {  
            debounce(appendDaysToRange("up"), 200);
            container.scrollTop = minScrollTop + 10;
        } else if (scrollTop + clientHeight >= scrollHeight - threshold) {
          // Scrolled to the bottom
          debounce(appendDaysToRange("down"), 200);
        }
      };

      // Mount
      onMounted(async () => {   
        // Establish Socket.IO connection
        socket.value = io('http://localhost:5000');

        socket.value.on('connect', () => {
          console.log('Connected to server');
        });

        socket.value.on('tableUpdate', (data) => {
          // Update the reservations data in your component
          console.log('Received updated data:', data);
          fetchReservations();
          //... your logic to update reservedRooms or other relevant data
        });
        
        await fetchHotels();
        await fetchHotel();

        const today = new Date();
        const initialMinDate = new Date(today);
        initialMinDate.setDate(initialMinDate.getDate() - 10);
        const initialMaxDate = new Date(today);
        initialMaxDate.setDate(initialMaxDate.getDate() + 40);
        minDate.value = initialMinDate;
        maxDate.value = initialMaxDate;        
        dateRange.value = generateDateRange(initialMinDate, initialMaxDate);

        nextTick(async () => {
          await fetchReservations();

          // Scroll to 1/5 of the total scroll height
          const tableContainer = document.querySelector(".table-container");
          if (tableContainer) {
            const totalScrollHeight = tableContainer.scrollHeight;
            const scrollPosition = totalScrollHeight / 5; // 1/5th of the scroll height
            tableContainer.scrollTo({
              top: scrollPosition,
              behavior: "smooth",
            });
            tableContainer.addEventListener("scroll", handleScroll);
          }          
   
        });
      });

      onUnmounted(() => {
        // Close the Socket.IO connection when the component is unmounted
        if (socket.value) {
          socket.value.disconnect();
        }
      });

      // Watch

      watch(reservationId, async (newReservationId, oldReservationId) => {
        if (newReservationId) {
          console.log('Reservation ID:', newReservationId);
          await fetchReservation(newReservationId);
        } 
      }, { immediate: true });

      watch(selectedHotelId, async (newVal, oldVal) => {
        if (oldVal !== null) {          
          await fetchReservations();
        }
      });


      return {
        reservationId,
        dateRange,        
        selectedHotelRooms,
        isRoomReserved,
        fillRoomInfo, 
        drawerVisible,
        openDrawer,
        onDragStart,
        onDrop,
        drawerHeader,
        selectedRoom,
        selectedDate,      
        onScroll,
      };
    },
    methods: {
      
    },
  }

</script>

<style scoped>
  th, td {
    border: 0px solid #ddd;
    padding: 8px 12px; /* Increased padding for readability */
    text-align: center;
  }

  .overflow-x-auto {
    overflow-x: auto;
    max-width: 100%;
  }

  .table-container {
    width: 100%;
    height: 800px;
    overflow-y: scroll;
    max-width: 100%;    
    position: relative;    
  }

  .table-container::-webkit-scrollbar-button:single-button {
    background-color: rgba(0, 0, 0, 0.3); /* Make buttons always visible */
  }

  .table-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.3); /* Scrollbar thumb color */
    border-radius: 4px;
    transition: background-color 0.3s ease;
  }

  .table-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1); /* Track color */
  }

  .table-container::-webkit-scrollbar-button {
    background-color: rgba(0, 0, 0, 0.1); /* Button color */
  }
  
  .table-container:active::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.7);
  }

  .table-container:focus {
    outline: none;
    border: 2px solid #4CAF50; /* Visual cue for focus */
  }
</style>