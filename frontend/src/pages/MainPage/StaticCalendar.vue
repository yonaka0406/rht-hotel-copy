<template>
  <div class="p-2 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
    <div class="flex justify-between w-full items-center mb-4">
      <h2 class="text-xl font-bold">静的カレンダー</h2>
      <div class="flex flex-wrap gap-2 p-2">
        <div v-for="item in uniqueLegendItems" :key="item.plan_name" class="flex items-center gap-2">
          <span class="w-4 h-4 rounded-full" :style="{ backgroundColor: item.plan_color }"></span>
          <span class="text-xs text-surface-700 dark:text-surface-300">{{ item.plan_name }}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <DatePicker
          v-model="currentMonth"
          view="month"
          dateFormat="yy/mm"
          :showIcon="true"
          class="p-inputtext-sm"
        />
      </div>
    </div>
    <Card>
      <template #header>
        <div class="flex justify-between w-full items-center">
          <!-- The h2 and the div with Calendar and Button are moved outside -->
        </div>
      </template>
      <div class="table-container bg-white dark:bg-gray-900">
        <table class="mb-2" :style="{ width: totalTableWidth }">
          <thead>
            <tr>
              <th
                class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 sticky top-0 left-0 z-20" style="height: 19px; width: 100px;" rowspan="2">
                日付</th>
              <th
                class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 sticky top-0 z-20" style="height: 19px; width: 40px; left: 100px;" rowspan="2">
                空室</th>
              <th v-for="(roomType, typeIndex) in headerRoomsData.roomTypes" :key="typeIndex"
                :colspan="roomType.colspan"
                class="px-2 py-2 text-center font-bold dark:text-gray-100 sticky top-0 z-10" :style="{ height: '19px', width: (roomType.colspan * 50) + 'px', backgroundColor: roomType.color }">
                {{ roomType.name }}
              </th>
            </tr>
            <tr>
              <th v-for="(roomNumber, numIndex) in headerRoomsData.roomNumbers" :key="numIndex"
                class="px-2 py-2 text-center bg-white dark:bg-gray-800 dark:text-gray-100 sticky z-10" style="height: 19px; width: 50px; top: 19px;">
                <span class="text-xs">{{ roomNumber.room_number }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex" :class="{ 'highlighted-row': dateIndex === selectedRowIndex }">

              <td
                @click="highlightRow(dateIndex)"
                class="cursor-pointer px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 sticky left-0 z-10" style="height: 19px; width: 100px;">
                <span class="text-xs dark:text-gray-100">{{ formatDateWithDay(date) }}</span>
              </td>
              <td
                class="px-2 py-2 text-center bg-white dark:bg-gray-800 dark:text-gray-100 sticky z-10" style="height: 19px; width: 40px; left: 100px;">
                <div class="text-xs text-gray-500 flex justify-center" :class="{
                  'text-red-400': availableRoomsByDate[date] === 0,
                  'dark:text-gray-400': availableRoomsByDate[date] !== 0
                }">
                  {{ availableRoomsByDate[date] }}
                </div>
              </td>
              <td v-for="(room, roomIndex) in selectedHotelRooms" :key="roomIndex"
                :style="getCellStyle(room.room_id, date)"
                :class="['text-xs border text-left']" style="height: 19px; width: 50px;">
                
                <div v-if="isLoading && !isRoomReserved(room.room_id, date)">
                  <Skeleton class="mb-2 dark:bg-gray-700"></Skeleton>
                </div>
                <div v-else>
                  <div v-if="isRoomReserved(room.room_id, date)">
                    <div class="dark:text-gray-100" style="max-width: 100%; overflow: hidden; white-space: nowrap;">
                      <span style="font-size: 10px;">{{ fillRoomInfo(room.room_id, date).client_name || '予約情報あり' }}</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <div class="flex flex-wrap gap-3 p-3">
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup>
// Vue
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';

import { Panel, Skeleton, Button, DatePicker } from 'primevue';
// Components

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { reservedRooms, fetchReservedRooms } = useReservationStore();

// Helper function
const formatDate = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error("Invalid Date object provided to formatDate.");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formatDateWithDay = (date) => {
  const options = { weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit' };
  const parsedDate = new Date(date);
  return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
};

// Room type color assignment
const roomTypeGrayTones = [
  '#F3F4F6', // gray-100
  '#E5E7EB', // gray-200
  '#D1D5DB', // gray-300
  '#9CA3AF', // gray-400
  '#6B7280', // gray-500
  '#4B5563', // gray-600
  '#374151', // gray-700
  '#1F2937', // gray-800
  '#111827'  // gray-900
];
const roomTypeColorMap = new Map();
let colorIndex = 0;

const getRoomTypeColor = (roomTypeName) => {
  if (!roomTypeColorMap.has(roomTypeName)) {
    roomTypeColorMap.set(roomTypeName, roomTypeGrayTones[colorIndex % roomTypeGrayTones.length]);
    colorIndex++;
  }
  return roomTypeColorMap.get(roomTypeName);
};
//Websocket
import io from 'socket.io-client';
const socket = ref(null);

// State
const isLoading = ref(true);
const isUpdating = ref(false);
const currentMonth = ref(new Date());
const selectedRowIndex = ref(null);

const highlightRow = (index) => {
  if (selectedRowIndex.value === index) {
    selectedRowIndex.value = null; // Unhighlight if the same row is clicked
  } else {
    selectedRowIndex.value = index; // Highlight the new row
  }
};

// Date range
const dateRange = ref([]);
const generateDateRange = (start, end) => {
  const dates = [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(formatDate(new Date(d)));
  }
  return dates;
};

// Fetch reserved rooms data
const fetchReservations = async (startDate, endDate) => {
  try {
    if (!startDate && !endDate) {
      return
    }
    await fetchReservedRooms(
      selectedHotelId.value,
      startDate,
      endDate
    );
  } catch (error) {
    console.error('Error fetching reservations:', error);
  }
};

const formatClientName = (name) => {
  if (!name) return '';
  
  const replacements = {
    '株式会社': '㈱',
    '合同会社': '(同)',
    '有限会社': '(有)',
    '合名会社': '(名)',
    '合資会社': '(資)',
    '一般社団法人': '(一社)',
    '一般財団法人': '(一財)',
    '公益社団法人': '(公社)',
    '公益財団法人': '(公財)',
    '学校法人': '(学)',
    '医療法人': '(医)',
    '社会福祉法人': '(福)',
    '特定非営利活動法人': '(特非)',
    'NPO法人': '(NPO)',
    '宗教法人': '(宗)'
  };

  let result = name;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  return result;
};

const reservedRoomsMap = computed(() => {
  const map = {};
  reservedRooms.value.forEach(reservation => {
    const key = `${reservation.room_id}_${formatDate(new Date(reservation.date))}`;
    map[key] = {
      ...reservation,
      client_name: formatClientName(reservation.client_name)
    };
  });
  return map;
});

const uniqueLegendItems = computed(() => {
  const uniqueItems = new Set();
  const legendItems = [];

  reservedRooms.value.forEach(room => {
    if (room.plan_name && room.plan_color) {  // Check if properties exist
      const key = `${room.plan_name}-${room.plan_color}`; // Create a unique key
      if (!uniqueItems.has(key)) {
        uniqueItems.add(key);
        legendItems.push({ plan_name: room.plan_name, plan_color: room.plan_color });
      }
    }
  });

  legendItems.push({ plan_name: '仮予約', plan_color: '#ead59f' });
  legendItems.push({ plan_name: '社員', plan_color: '#f3e5f5' });
  legendItems.push({ plan_name: 'OTA', plan_color: '#9fead5' });
  legendItems.push({ plan_name: '保留', plan_color: '#FFC107' });

  return legendItems;
});

// Count of available rooms
const headerRoomsData = computed(() => {
  const roomTypes = [];
  const roomNumbers = [];
  let currentRoomType = null;
  let currentColspan = 0;

  selectedHotelRooms.value.forEach(room => {
    if (room.room_type_name !== currentRoomType) {
      if (currentRoomType !== null) {
        roomTypes.push({ name: currentRoomType, colspan: currentColspan, color: getRoomTypeColor(currentRoomType) });
      }
      currentRoomType = room.room_type_name;
      currentColspan = 1;
    } else {
      currentColspan++;
    }
    roomNumbers.push({ room_id: room.room_id, room_number: room.room_number });
  });

  if (currentRoomType !== null) {
    roomTypes.push({ name: currentRoomType, colspan: currentColspan, color: getRoomTypeColor(currentRoomType) });
  }

  return { roomTypes, roomNumbers };
});

const availableRoomsByDate = computed(() => {
  const availability = {};
  dateRange.value.forEach(date => {
    const roomsForSale = selectedHotelRooms.value.filter(room => room.room_for_sale_idc === true);
    const reservedCount = roomsForSale.filter(room =>
      reservedRoomsMap.value[`${room.room_id}_${date}`]
    ).length;

    availability[date] = roomsForSale.length * 1 - reservedCount * 1;
  });

  return availability;
});

const totalTableWidth = computed(() => {
  const dateColumnWidth = 100; // px
  const vacancyColumnWidth = 40; // px
  const roomColumnWidth = 50; // px
  const numberOfRoomColumns = headerRoomsData.value.roomNumbers.length;
  return `${dateColumnWidth + vacancyColumnWidth + (numberOfRoomColumns * roomColumnWidth)}px`;
});

// Fill & Format the table
const isRoomReserved = (roomId, date) => {
  const key = `${roomId}_${date}`;
  return !!reservedRoomsMap.value[key];
};
const fillRoomInfo = (room_id, date) => {
  const key = `${room_id}_${date}`;
  return reservedRoomsMap.value[key] || { status: 'available', client_name: '', reservation_id: null };
};
const getCellStyle = (room_id, date) => {
  const roomInfo = fillRoomInfo(room_id, date);
  let roomColor = '#d3063d';
  let style = {};

  if (roomInfo && roomInfo.type === 'employee') {
    roomColor = '#f3e5f5';
    style = { backgroundColor: roomColor };
  } else if (roomInfo && roomInfo.status === 'provisory') {
    roomColor = '#ead59f';
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.status === 'hold') {
    roomColor = '#FFC107'; // Amber color for 'hold' status
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.status === 'block' && roomInfo.client_id === '22222222-2222-2222-2222-222222222222') {
    roomColor = '#fed7aa';
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.status === 'block') {
    roomColor = '#fca5a5';
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && (roomInfo.type === 'ota' || roomInfo.type === 'web')) {
    roomColor = '#9fead5';
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.plan_color) {
    roomColor = roomInfo.plan_color;
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.status !== 'available') {
    style = { color: `${roomColor}`, fontWeight: 'bold' };
  }

  return style;
};

// Mount
onMounted(async () => {
  // Establish Socket.IO connection
  socket.value = io(import.meta.env.VITE_API_BASE_URL);

  socket.value.on('connect', () => {
    console.log('Connected to server');
  });

  socket.value.on('tableUpdate', async (data) => {
    if (isUpdating.value) {
      console.log('Skipping fetchReservation because update is still running');
      return;
    }
    console.log('Received updated data:', data);
    // Recalculate date range based on currentMonth
    const currentYear = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 2, 0);
    await fetchReservations(formatDate(startDate), formatDate(endDate));
  });

  // Initial data fetch is handled by the watch(currentMonth) which is triggered on mount
});

watch(currentMonth, async (newMonth) => {
  isLoading.value = true;
  try {
    // Clear previous data (reservedRooms will be updated by fetchReservations)
    reservedRooms.value = [];

    const currentYear = newMonth.getFullYear();
    const month = newMonth.getMonth();

    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 2, 0);
    
    dateRange.value = generateDateRange(startDate, endDate);

    await fetchHotels(); // Fetch hotels and hotel data here
    await fetchHotel();
    await fetchReservations(formatDate(startDate), formatDate(endDate));
  } catch (error) {
    console.error("Error in currentMonth watcher:", error);
  } finally {
    isLoading.value = false;
  }
}, { immediate: true }); // Added immediate: true

onUnmounted(() => {
  // Close the Socket.IO connection when the component is unmounted
  if (socket.value) {
    socket.value.disconnect();
  }
});

</script>

<style scoped>
.table-container {
  width: 100%;
  overflow-x: auto;
  max-width: 100%;
  position: relative;
  height: calc(100vh - 100px);
  overflow-y: auto;
  scrollbar-color: rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1);
}

.table-container::-webkit-scrollbar-button:single-button {
  background-color: rgba(0, 0, 0, 0.3);
}

.table-container::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.table-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.1);
}

.table-container::-webkit-scrollbar-button {
  background-color: rgba(0, 0, 0, 0.1);
}

.table-container:active::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.7);
}

.table-container:focus {
  outline: none;
  border: 2px solid #4CAF50;
}

/* Forces the browser to use a fixed layout for the table. */
.table-container table {
  table-layout: fixed;
}

/* Applies truncation to all table cells within the container. */
.table-container td, .table-container th {
  /* Prevents text from wrapping to a new line */
  white-space: nowrap;
  /* Hides any content that extends beyond the element's boundaries */
  overflow: hidden;
  /* Adds an ellipsis (...) to the end of the truncated text */
  /* text-overflow: ellipsis; */
  /* Adds some internal space to prevent content from being flush with the border */
  padding: 1px;
}
/* Overlay for dark mode */
.dark .row-is-pinned td::before {
  background-color: rgba(251, 191, 36, 0.15); /* A subtle amber for dark mode */
}

.highlighted-row td.sticky {
  background-color: white !important;
}

.dark .highlighted-row td.sticky {
  background-color: #1f2937 !important; /* Dark mode background for sticky cells */
}

.highlighted-row td {
  border-top: 2px solid #f59e42 !important; /* Thicker top border */
  border-bottom: 2px solid #f59e42 !important; /* Thicker bottom border */
  background-color: rgba(234, 179, 8, 0.15); /* Apply background directly */
}

.dark .highlighted-row td {
  border-top-color: #fbbf24 !important; 
  border-bottom-color: #fbbf24 !important;
  background-color: rgba(251, 191, 36, 0.15); /* Apply background directly for dark mode */
}
</style>
