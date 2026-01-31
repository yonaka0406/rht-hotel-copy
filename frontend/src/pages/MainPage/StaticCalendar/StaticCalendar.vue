<template>
  <div class="p-2 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
    <StaticCalendarHeader
      :selected-hotel="selectedHotel"
      :unique-legend-items="uniqueLegendItems"
      v-model:current-month="currentMonth"
    />
    <Panel>
      <template #header>
        <div class="flex justify-between w-full items-center">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold opacity-70">表示モード:</h3>
            <SelectButton v-model="viewMode" :options="viewOptions" optionLabel="label" optionValue="value" aria-labelledby="basic" />
          </div>
        </div>
      </template>
      <div v-if="viewMode === 'classic'" class="table-container bg-white dark:bg-gray-900">
        <table class="mb-2" :style="{ width: totalTableWidth }">
          <thead>
            <tr>
              <th
                class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 sticky top-0 left-0 z-20" style="height: 19px; width: 100px;" rowspan="3">
                日付
              </th>
              <th
                class="px-2 py-2 text-center font-bold bg-white dark:text-gray-100 sticky top-0 z-30" style="height: 19px; width: 40px; left: 100px;" rowspan="3">
                空室</th>
              <th
                class="px-2 py-2 text-center font-bold bg-white dark:text-gray-100 sticky top-0 z-30" style="height: 19px; width: 40px; left: 140px;" rowspan="3">
                駐車場</th>
              <th v-for="(roomType, typeIndex) in headerRoomsData.roomTypes" :key="typeIndex"
                :colspan="roomType.colspan"
                class="px-2 py-2 text-center font-bold sticky top-0 z-10" :style="{ height: '19px', width: (roomType.colspan * 50) + 'px', backgroundColor: roomType.backgroundColor, color: roomType.textColor, left: '180px' }"
                v-tooltip.top="roomType.name">
                {{ roomType.name }}
              </th>
            </tr>
            <tr>
              <th v-for="(roomNumber, numIndex) in headerRoomsData.roomNumbers" :key="numIndex"
                class="px-2 py-2 text-center bg-white dark:bg-gray-800 dark:text-gray-100 sticky z-10" style="height: 19px; width: 50px; top: 19px; left: 180px;"
                :class="{ 'pale-yellow-bg': highlightedRooms.has(roomNumber.room_id), 'bg-purple-100 dark:bg-purple-900': roomNumber.is_staff_room }">
                <span class="text-xs">{{ roomNumber.room_number }}</span>
                <div class="flex justify-center items-center gap-1">
                  <span v-if="roomNumber.is_staff_room" class="emoji-small">STAFF</span>
                  <span v-if="roomNumber.smoking" class="emoji-small">🚬</span>
                  <span v-if="roomNumber.has_wet_area" class="emoji-small">🚿</span>
                  <span v-if="roomNumber.capacity > 1" class="emoji-small capacity-badge">{{ roomNumber.capacity }}</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex" :class="{ 'highlighted-row': dateIndex === selectedRowIndex }">

              <td
                @click="highlightRow(dateIndex)"
                class="cursor-pointer px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 sticky left-0 z-10" style="height: 19px; width: 100px;"
                :class="{ 'pale-yellow-bg': highlightedDates.has(date) }">
                <span class="text-xs dark:text-gray-100">{{ formatDateWithDay(date) }}</span>
              </td>
              <td
                class="px-2 py-2 text-center bg-white dark:text-gray-100 sticky z-10" style="height: 19px; width: 40px; left: 100px;">
                <div class="text-xs text-gray-500 flex justify-center" :class="{
                  'text-red-400': availableRoomsByDate[date] === 0,
                  'dark:text-gray-400': availableRoomsByDate[date] !== 0
                }">
                  {{ availableRoomsByDate[date] }}
                </div>
              </td>
              <td
                class="px-2 py-2 text-center bg-white dark:text-gray-100 sticky z-10" style="height: 19px; width: 40px; left: 140px;">
                <div class="text-xs text-gray-500 flex justify-center" :class="{
                  'text-red-400': availableParkingSpotsByDate[date] === 0,
                  'dark:text-gray-400': availableParkingSpotsByDate[date] !== 0
                }">
                  {{ availableParkingSpotsByDate[date] }}
                </div>
              </td>
              <td v-for="(room, roomIndex) in selectedHotelRooms" :key="roomIndex"
                :style="getCellStyle(room.room_id, date)"
                :class="['text-xs border text-left']" style="height: 19px; width: 50px; left: 180px;"
                @mouseover="showTooltip($event, room.room_id, date)" @mouseleave="hideTooltip()"
                @click="handleCellClick(room.room_id, date)"
                @dblclick="handleCellDoubleClick(room.room_id, date)">
                
                <div v-if="isLoading && !isRoomReserved(room.room_id, date)">
                  <Skeleton class="mb-2 dark:bg-gray-700"></Skeleton>
                </div>
                <div v-else>
                  <div v-if="isRoomReserved(room.room_id, date)">
                    <div class="dark:text-gray-100" style="max-width: 100%; overflow: hidden; white-space: nowrap;">
                      <strong v-if="isOTA(room.room_id, date)" style="font-size: 10px;">{{ fillRoomInfo(room.room_id, date).client_name || '予約情報あり' }}</strong>
                      <span v-else style="font-size: 10px;">{{ fillRoomInfo(room.room_id, date).client_name || '予約情報あり' }}</span>
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <StaticCalendarModern
        v-else
        class="table-container"
        :date-range="dateRange"
        :header-rooms-data="headerRoomsData"
        :selected-hotel-rooms="selectedHotelRooms"
        :reserved-rooms="reservedRooms"
        :available-rooms-by-date="availableRoomsByDate"
        :available-parking-spots-by-date="availableParkingSpotsByDate"
        :selected-client-id="selectedClientId"
        :card-selected-reservation-id="cardSelectedReservationId"
        :is-loading="isLoading"
        @toggle-view="viewMode = 'classic'"
        @cell-click="handleCellClick"
        @cell-double-click="handleCellDoubleClick"
      />
      <template #footer>
        <StaticCalendarFooter @addMonths="handleAddMonths" :loading="isAddingMonths" />
      </template>
    </Panel>

    <div v-if="tooltipVisible" :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      class="absolute bg-gray-800 text-white text-xs p-2 rounded shadow-lg z-50"
      v-html="tooltipContent">
    </div>

    <StaticCalendarDrawer
      :visible="isDrawerVisible" @update:visible="isDrawerVisible = $event"
      :reservations="selectedClientReservations"
      :date-range="dateRange"
      @select-reservation="selectReservationCard"
    />
  </div>
</template>

<script setup>
// Vue
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useToast } from 'primevue/usetoast';
const toast = useToast();

import Panel from 'primevue/panel';
import SelectButton from 'primevue/selectbutton';
import Skeleton from 'primevue/skeleton';
import StaticCalendarHeader from './components/StaticCalendarHeader.vue';
import StaticCalendarModern from './ModernView/StaticCalendarModern.vue';

// Components
import StaticCalendarDrawer from './components/StaticCalendarDrawer.vue';
import StaticCalendarFooter from './components/StaticCalendarFooter.vue';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel, selectedHotel } = useHotelStore();
const allParkingSpots = ref([]);
import { useReservationStore } from '@/composables/useReservationStore';
const { reservedRooms, fetchReservedRooms } = useReservationStore();
import { useParkingStore } from '@/composables/useParkingStore';
const { fetchReservedParkingSpots, reservedParkingSpots, fetchAllParkingSpotsByHotel } = useParkingStore();

import { formatDate, formatDateWithDay } from '@/utils/dateUtils';

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

// Helper to calculate luminance (for determining text color contrast)
function getLuminance(hexColor) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  // Perceived luminance (ITU-R BT.709)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

const getRoomTypeColor = (roomTypeName) => {
  if (!roomTypeColorMap.has(roomTypeName)) {
    const bgColor = roomTypeGrayTones[colorIndex % roomTypeGrayTones.length];
    const luminance = getLuminance(bgColor);
    const textColor = luminance > 0.5 ? '#000000' : '#FFFFFF'; // Use black for light backgrounds, white for dark
    roomTypeColorMap.set(roomTypeName, { backgroundColor: bgColor, textColor: textColor });
    colorIndex++;
  }
  return roomTypeColorMap.get(roomTypeName);
};

const paymentTimingInfo = {
  not_set: { label: '未設定', severity: 'contrast' },
  prepaid: { label: '前払い', severity: 'info' },
  'on-site': { label: '現地払い', severity: 'success' },
  postpaid: { label: '後払い', severity: 'warn' },
};
//Websocket
import { useSocket } from '@/composables/useSocket';
const { socket } = useSocket();

// State
const isLoading = ref(true);
const isUpdating = ref(false);
const viewMode = ref('classic');
const viewOptions = ref([
  { label: 'クラシック', value: 'classic' },
  { label: 'モダン', value: 'modern' }
]);
const currentMonth = ref(new Date());
const selectedRowIndex = ref(null);
const tooltipContent = ref('');
const tooltipVisible = ref(false);
const tooltipX = ref(0);
const tooltipY = ref(0);
const selectedClientId = ref(null);
const isDrawerVisible = ref(false);
const cardSelectedReservationId = ref(null);
const isAddingMonths = ref(false);

const selectReservationCard = (reservationId) => {
  if (cardSelectedReservationId.value === reservationId) {
    cardSelectedReservationId.value = null;
  } else {
    cardSelectedReservationId.value = reservationId;
  }
};


const highlightRow = (index) => {
  if (selectedRowIndex.value === index) {
    selectedRowIndex.value = null; // Unhighlight if the same row is clicked
  } else {
    selectedRowIndex.value = index; // Highlight the new row
  }
};

const showTooltip = (event, room_id, date) => {
  const roomInfo = fillRoomInfo(room_id, date);
  if (roomInfo && roomInfo.reservation_id) {
    let otaLine = '';
    if (isOTA(room_id, date)) {
      otaLine = `<br><i class="pi pi-globe"></i> ${roomInfo.agent || ''}`;
    }
    tooltipContent.value = `
      部屋番号: ${roomInfo.room_number || 'N/A'}<br>  
      顧客: ${roomInfo.client_name_original || roomInfo.client_name}<br>
      プラン: ${roomInfo.plan_name || 'N/A'}<br>        
      支払いタイミング: ${paymentTimingInfo[roomInfo.payment_timing]?.label || roomInfo.payment_timing || 'N/A'}<br>
      チェックイン日: ${formatDate(new Date(roomInfo.check_in))}<br>
      チェックアウト日: ${formatDate(new Date(roomInfo.check_out))}${otaLine}
    `;
    tooltipVisible.value = true;
    tooltipX.value = event.pageX + 10;
    tooltipY.value = event.pageY + 10;
  } else {
    tooltipVisible.value = false;
  }
};

const hideTooltip = () => {
  tooltipVisible.value = false;
};

const handleCellClick = (room_id, date) => {
  const roomInfo = fillRoomInfo(room_id, date);
  if (roomInfo && roomInfo.client_id) {
    if (selectedClientId.value === roomInfo.client_id) {
      selectedClientId.value = null;
    } else {
      selectedClientId.value = roomInfo.client_id;
    }
  } else {
    selectedClientId.value = null;
  }
};

const handleCellDoubleClick = (room_id, date) => {
  const roomInfo = fillRoomInfo(room_id, date);
  if (roomInfo && roomInfo.client_id) {
    selectedClientId.value = roomInfo.client_id;
    isDrawerVisible.value = true;
  }
};

const handleAddMonths = async () => {
  isAddingMonths.value = true; // Set loading to true
  try {
    // Get the current last date being displayed in the calendar
    const currentLastDisplayedDate = new Date(dateRange.value[dateRange.value.length - 1]);

    // Calculate the new end month (3 months after the last displayed month)
    const tempNewEndDate = new Date(currentLastDisplayedDate.getFullYear(), currentLastDisplayedDate.getMonth() + 3, 1);
    
    // Get the last day of this new month
    const newEndDate = new Date(tempNewEndDate.getFullYear(), tempNewEndDate.getMonth() + 1, 0);

    // The startDate remains the same (first day of the initial currentMonth)
    const initialStartDate = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
    
    dateRange.value = generateDateRange(initialStartDate, newEndDate);

    await fetchReservations(formatDate(initialStartDate), formatDate(newEndDate));
    await fetchReservedParkingSpots(selectedHotelId.value, formatDate(initialStartDate), formatDate(newEndDate));

    toast.add({ severity: 'success', summary: '成功', detail: 'さらに3ヶ月分のデータを読み込みました。', life: 3000 });
  } catch (error) {
    console.error("Error in handleAddMonths:", error);
    toast.add({ severity: 'error', summary: 'エラー', detail: 'データの読み込み中にエラーが発生しました。', life: 3000 });
  } finally {
    isAddingMonths.value = false; // Set loading to false
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
      client_name_original: reservation.client_name, // Store original client name
      client_name: formatClientName(reservation.client_name)
    };
  });
  return map;
});

const reservedParkingSpotsMap = computed(() => {
  const map = {};
  if (Array.isArray(reservedParkingSpots.value)) {
    reservedParkingSpots.value.forEach(reservation => {
      const key = `${reservation.parking_spot_id}_${formatDate(new Date(reservation.date))}`;
      map[key] = reservation;
    });
  }
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
  legendItems.push({ plan_name: '保留', plan_color: '#FFC107' });

  return legendItems;
});

const highlightedDates = computed(() => {
  const dates = new Set();
  if (!selectedClientId.value) return dates;

  reservedRooms.value.forEach(reservation => {
    if (reservation.client_id === selectedClientId.value) {
      dates.add(formatDate(new Date(reservation.date)));
    }
  });
  return dates;
});

const highlightedRooms = computed(() => {
  const rooms = new Set();
  if (!selectedClientId.value) return rooms;

  reservedRooms.value.forEach(reservation => {
    if (reservation.client_id === selectedClientId.value) {
      rooms.add(reservation.room_id);
    }
  });
  return rooms;
});

const selectedClientReservations = computed(() => {
  if (!selectedClientId.value) return [];

  // Filter for the selected client
  const clientReservations = reservedRooms.value.filter(
    r => r.client_id === selectedClientId.value
  );

  // Group by reservation_id
  const grouped = clientReservations.reduce((acc, res) => {
    acc[res.reservation_id] = acc[res.reservation_id] || [];
    acc[res.reservation_id].push(res);
    return acc;
  }, {});

  // Process each group into a displayable object
  const processed = Object.values(grouped).map(group => {
    // All items in the group belong to the same reservation, so we can take details from the first item.
    const first = group[0];
    
    // Find min/max dates for check-in/check-out
    const dates = group.map(g => new Date(g.date));
    const checkIn = new Date(Math.min.apply(null, dates));
    const checkOut = new Date(Math.max.apply(null, dates));
    checkOut.setDate(checkOut.getDate() + 1); // Checkout is the day after the last night

    // Count unique rooms
    const uniqueRooms = [];
    const roomIds = new Set();
    group.forEach(detail => {
      if (!roomIds.has(detail.room_id)) {
        roomIds.add(detail.room_id);
        uniqueRooms.push({
          room_number: detail.room_number,
          smoking: detail.smoking
        });
      }
    });

    const smokingRooms = uniqueRooms.filter(r => r.smoking === true).map(r => r.room_number).sort((a, b) => a - b);
    const nonSmokingRooms = uniqueRooms.filter(r => r.smoking === false).map(r => r.room_number).sort((a, b) => a - b);

    const smokingCount = smokingRooms.length;
    const nonSmokingCount = nonSmokingRooms.length;
    const numRooms = smokingCount + nonSmokingCount;

    return {
      reservation_id: first.reservation_id,
      client_name: first.client_name_original || first.client_name,
      check_in: formatDate(checkIn),
      check_out: formatDate(checkOut),
      number_of_people: first.total_number_of_people,
      payment_timing: first.payment_timing,
      type: first.type,
      agent: first.agent,
      ota_reservation_id: first.ota_reservation_id,
      num_rooms: numRooms,
      smoking_count: smokingCount,
      non_smoking_count: nonSmokingCount,
      smoking_rooms: smokingRooms,
      non_smoking_rooms: nonSmokingRooms,
    };
  });

  // Sort by check-in date
  return processed.sort((a, b) => a.check_in.localeCompare(b.check_in));
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
        roomTypes.push({ name: currentRoomType, colspan: currentColspan, ...getRoomTypeColor(currentRoomType) });
      }
      currentRoomType = room.room_type_name;
      currentColspan = 1;
    } else {
      currentColspan++;
    }
    roomNumbers.push({ room_id: room.room_id, room_number: room.room_number, smoking: room.room_smoking_idc, has_wet_area: room.room_has_wet_area_idc, capacity: room.room_capacity, is_staff_room: room.is_staff_room });
  });

  if (currentRoomType !== null) {
            roomTypes.push({ name: currentRoomType, colspan: currentColspan, ...getRoomTypeColor(currentRoomType) });  }
  
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

const availableParkingSpotsByDate = computed(() => {
  const availability = {};
  dateRange.value.forEach(date => {
    const spotsForSale = allParkingSpots.value.filter(spot => spot.is_active === true);
    const reservedCount = spotsForSale.filter(spot =>
      reservedParkingSpotsMap.value[`${spot.id}_${date}`]
    ).length;

    availability[date] = spotsForSale.length * 1 - reservedCount * 1;
  });

  return availability;
});

const totalTableWidth = computed(() => {
  const dateColumnWidth = 100; // px
  const vacancyColumnWidth = 40; // px
  const parkingColumnWidth = 40; // px
  const roomColumnWidth = 50; // px
  const numberOfRoomColumns = headerRoomsData.value.roomNumbers.length;
  return `${dateColumnWidth + vacancyColumnWidth + parkingColumnWidth + (numberOfRoomColumns * roomColumnWidth)}px`;
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

const isOTA = (room_id, date) => {
  const roomInfo = fillRoomInfo(room_id, date);
  return roomInfo && (roomInfo.type === 'ota' || roomInfo.type === 'web');
};
const getCellStyle = (room_id, date) => {
  const roomInfo = fillRoomInfo(room_id, date);
  const room = selectedHotelRooms.value.find(r => r.room_id === room_id);
  let roomColor = '#d3063d';
  let style = {};

  if (room && room.is_staff_room) {
     style = { backgroundColor: '#f3e5f5' }; // Light purple for staff rooms
  }

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
    roomColor = roomInfo.plan_color || '#9fead5';
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.plan_color) {
    roomColor = roomInfo.plan_color;
    style = { backgroundColor: `${roomColor}` };
  } else if (roomInfo && roomInfo.status !== 'available') {
    style = { color: `${roomColor}`, fontWeight: 'bold' };
  }

  // Add highlighted border for selected client
  if (selectedClientId.value && roomInfo.client_id === selectedClientId.value) {
    if (cardSelectedReservationId.value && roomInfo.reservation_id === cardSelectedReservationId.value) {
      style.border = '3px solid #00FFFF'; // Neon Blue
    } else {
      style.border = '3px solid #FFFF33'; // Neon Yellow
    }
    style.boxSizing = 'border-box';
  }

  return style;
};

// Mount
onMounted(async () => {
  // Initial data fetch is handled by the watch(currentMonth) which is triggered on mount
});

const handleTableUpdate = async (_data) => {
  if (isUpdating.value) {
    //console.log('Skipping fetchReservation because update is still running');
    return;
  }
  //console.log('Received updated data:', data);
  
  isUpdating.value = true;
  try {
    // Recalculate date range based on currentMonth
    const currentYear = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 3, 0); // Corrected from +2 to +3
    await fetchReservations(formatDate(startDate), formatDate(endDate));
    await fetchReservedParkingSpots(selectedHotelId.value, formatDate(startDate), formatDate(endDate));
  } finally {
    isUpdating.value = false;
  }
};

watch(socket, (newSocket, oldSocket) => {
  if (oldSocket) {
    oldSocket.off('tableUpdate', handleTableUpdate);
  }
  if (newSocket) {
    newSocket.on('tableUpdate', handleTableUpdate);
  }
}, { immediate: true });

watch(currentMonth, async (newMonth) => {
  isLoading.value = true;
  try {
    // Clear previous data (reservedRooms will be updated by fetchReservations)
    reservedRooms.value = [];

    const currentYear = newMonth.getFullYear();
    const month = newMonth.getMonth();

    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 3, 0);
    
    dateRange.value = generateDateRange(startDate, endDate);

    await fetchHotels(); // Fetch hotels and hotel data here
    await fetchHotel();
    allParkingSpots.value = await fetchAllParkingSpotsByHotel(selectedHotelId.value);
    await fetchReservations(formatDate(startDate), formatDate(endDate));
    await fetchReservedParkingSpots(selectedHotelId.value, formatDate(startDate), formatDate(endDate));
    //console.log('Reservations available on load:', reservedRooms.value);
  } catch (error) {
    console.error("Error in currentMonth watcher:", error);
  } finally {
    isLoading.value = false;
  }
}, { immediate: true }); // Added immediate: true

watch(selectedHotelId, async (newHotelId, oldHotelId) => {
  if (!newHotelId || newHotelId === oldHotelId) return;

  isLoading.value = true;
  try {
    // Clear previous data
    reservedRooms.value = [];
    
    const currentYear = currentMonth.value.getFullYear();
    const month = currentMonth.value.getMonth();
    const startDate = new Date(currentYear, month, 1);
    const endDate = new Date(currentYear, month + 2, 0);

    // It's important to ensure the hotel data (like rooms) is updated first.
    await fetchHotel(); 
    
    // Then fetch data that depends on the hotel
    allParkingSpots.value = await fetchAllParkingSpotsByHotel(newHotelId);
    await fetchReservations(formatDate(startDate), formatDate(endDate));
    await fetchReservedParkingSpots(newHotelId, formatDate(startDate), formatDate(endDate));

  } catch (error) {
    console.error('Error fetching data for new hotel:', error);
  } finally {
    isLoading.value = false;
  }
});

onUnmounted(() => {
  // The useSocket composable handles disconnection, but we must clean up component-specific listeners.
  if (socket.value) {
    socket.value.off('tableUpdate', handleTableUpdate);
  }
});

</script>

<style scoped>
.emoji-small {
  font-size: 0.7em; /* Adjust as needed */
}

.capacity-badge {
  background-color: #e0e0e0; /* Light gray background */
  color: #333; /* Darker text color */
  padding: 0.1em 0.4em; /* Smaller padding */
  border-radius: 0.5em; /* Rounded corners */
  font-weight: bold;
}

.tag-xxs .p-tag-value {
  font-size: 0.6em; /* Even smaller than text-xs */
  padding: 0.1rem 0.3rem; /* Adjust padding as needed */
}

.table-container {
  width: 100%;
  overflow-x: auto;
  max-width: calc(100vw - 40px);
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

.pale-yellow-bg {
  background-color: #ffffe0 !important;
}

.selected-card-border {
  border: 2px solid #00FFFF;
  border-radius: 6px;
}
</style>
