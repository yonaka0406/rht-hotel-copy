<template>
  <div class="p-2">
    <Panel header="Reservations Calendar">
      <div class="table-container" ref="tableContainer" @scroll="onScroll">
        <table class="table-auto w-full mb-2">
          <thead>
            <tr>              
              <th class="px-4 py-2 text-center font-bold bg-white sticky top-0 left-0 z-20">Date</th>

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
                :class="{
                  'bg-red-100': isRoomReserved(room.room_id, date),
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
                  <i class="pi pi-check"></i> Available
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </Panel>
  </div>
</template>

<script>
  import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
  import { useToast } from 'primevue/usetoast';
  import { useHotelStore } from '@/composables/useHotelStore';
  import { useClientStore } from '@/composables/useClientStore';
  import { useReservationStore } from '@/composables/useReservationStore';
  import Panel from 'primevue/panel';

  export default {  
    name: "ReservationsCalendar",
    components: {      
        Panel,
    },
    data() {
      return {
        
      };
    },
    setup() {
      let socket;
      const toast = useToast();
      const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
      const { clients, fetchClients } = useClientStore();
      const { reservedRooms, fetchReservedRooms, updateReservations } = useReservationStore();
      const dateRange = ref([]); 
      const minDate = ref(null);
      const maxDate = ref(null);
      const reservedRoomsMap = ref([]);
      
      
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
          //console.log(reservedRooms.value);
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
        /*
        socket = new WebSocket('wss://your-backend-websocket-url');
        socket.onmessage = (event) => {
          const updatedReservations = JSON.parse(event.data);
          updateReservations(updatedReservations);
        };
        */

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

        nextTick(() => {
          fetchReservations();

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
        if (socket) socket.close();
      });

      return {
        dateRange,        
        selectedHotelRooms,
        isRoomReserved,
        fillRoomInfo,        
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