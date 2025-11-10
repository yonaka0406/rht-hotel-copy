<template>
    <div class="p-2 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <Panel header="" class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg dark:shadow-xl">
        <template #header>
          
            <p class="text-lg font-bold dark:text-gray-100">駐車場カレンダー</p>
            <div class="flex justify-start mr-4">
              <p class="mr-2 dark:text-gray-100">日付へ飛ぶ：</p>
              <InputText v-model="centerDate" type="date" fluid required
                class="dark:bg-gray-800 dark:text-gray-100 rounded" />
            </div>            
            <div class="flex justify-end">
              <SelectButton optionLabel="label" optionValue="value" :options="tableModeOptions" v-model="isCompactView"
                class="dark:bg-gray-800 dark:text-gray-100" />
            </div>
          
        </template>
  
        <div class="table-container bg-white dark:bg-gray-900" :class="{ 'compact-view': isCompactView }"
          ref="tableContainer" @scroll="onScroll">
          <table class="table-auto w-full mb-2" @dragover.prevent>
            <thead>
              <tr>
                <th
                  class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky top-0 left-0 z-20">
                  日付</th>
  
                <th v-for="(spot, spotIndex) in allParkingSpots" :key="spotIndex"
                  class="px-2 py-2 text-center bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky top-0 z-10">
                  {{ spot.parking_lot_name }} <br />
                  <span class="text-lg">{{ spot.spot_number }}</span>
                </th>
              </tr>
            </thead>
            <tbody @dragover.prevent>
              <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex" :class="{ 'row-is-pinned': dateIndex === pinnedRowIndex }">

                <td
                  @click="pinRow(dateIndex)"                  
                  class="cursor-pointer px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky left-0 z-10">
    
                  <span class="text-xs dark:text-gray-100">{{ formatDateWithDay(date) }}</span>
  
                  <div class="text-2xs text-gray-500 flex justify-center" :class="{
                    'text-red-400': availableSpotsByDate[date] === 0,
                    'dark:text-gray-400': availableSpotsByDate[date] !== 0
                  }">
                    空き: {{ availableSpotsByDate[date] }}
                  </div>
  
                </td>
                <td v-for="(spot, spotIndex) in allParkingSpots" :key="spotIndex"
                  @dblclick="handleCellDoubleClick(spot, date)"
                  @dragstart="handleDragStart($event, spot.id, date)"
                  @dragend="endDrag()" @dragover.prevent @dragenter="highlightDropZone($event, spot.id, date)"
                  @dragleave="removeHighlight($event, spot.id, date)" @drop="handleDrop($event, spot.id, date)"
                  draggable="true" :style="getCellStyle(spot.id, date)" :class="[
                    'px-2 py-2 text-center text-xs max-h-0 aspect-square w-32 h-16 text-ellipsis border b-4 cell-with-hover',
                    isCellFirst(spot.id, date) ? 'cell-first' : '',
                    isCellLast(spot.id, date) ? 'cell-last' : '',
                    'cursor-pointer',
                    isCompactView ? 'compact-cell' : '',
                    !isSpotReserved(spot.id, date) ? 'dark:bg-gray-800 dark:text-gray-100' : ''
                  ]" @mouseover="applyHover(spotIndex, dateIndex)" @mouseleave="removeHover(spotIndex, dateIndex)">
                  <div v-if="isLoading && !isSpotReserved(spot.id, date)">
                    <Skeleton class="mb-2 dark:bg-gray-700"></Skeleton>
                  </div>
                  <div v-else>
                    <div v-if="isSpotReserved(spot.id, date)"
                      class="flex items-center">
                      <div>
                        <template
                          v-if="fillSpotInfo(spot.id, date).type === 'employee'">
                          <i class="pi pi-id-card bg-purple-200 p-1 rounded dark:bg-purple-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'hold'">
                          <i class="pi pi-pause bg-yellow-100 p-1 rounded dark:bg-yellow-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'provisory'">
                          <i class="pi pi-clock bg-cyan-200 p-1 rounded dark:bg-cyan-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'confirmed'">
                          <i class="pi pi-check-circle bg-sky-300 p-1 rounded dark:bg-sky-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'checked_in'">
                          <i class="pi pi-user bg-green-400 p-1 rounded dark:bg-green-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'checked_out'">
                          <i class="pi pi-sign-out bg-gray-300 p-1 rounded dark:bg-gray-700"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'block' && fillSpotInfo(spot.id, date).client_id === '11111111-1111-1111-1111-111111111111'">
                          <i class="pi pi-times bg-red-100 p-1 rounded dark:bg-red-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date).status === 'block' && fillSpotInfo(spot.id, date).client_id === '22222222-2222-2222-2222-222222222222'">
                          <i class="pi pi-lock bg-orange-100 p-1 rounded dark:bg-orange-800"></i>
                        </template>
                      </div>
                      <div class="ml-1 dark:text-gray-100 break-words whitespace-normal overflow-hidden text-ellipsis line-clamp-2 text-xs">
                        {{ fillSpotInfo(spot.id, date).booker_name || '' }}
                      </div>
                    </div>
                    <div v-else>
                      <i class="pi pi-circle"></i> <span class="dark:text-gray-100">空き</span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <template #footer>
          <Button v-if="hasChanges" @click="applyChanges"
            class="dark:bg-gray-800 dark:text-gray-100">変更適用</Button>
          <!-- Legend Component -->
          <ReservationsCalendarLegend />
        </template>
      </Panel>  
  
    </div>

    <!-- Add Drawer for Reservation Edit -->
    <Drawer v-model:visible="drawerVisible" :modal="true" :position="'bottom'" :style="{ height: '75vh' }"
      :closable="true">
      <div v-if="reservationId">
        <div class="flex justify-end">
          <Button @click="goToReservation" severity="info">
            <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
          </Button>
        </div>
        <ReservationEdit :reservation_id="reservationId" />
      </div>
    </Drawer>

    <ConfirmDialog group="templating">
      <template #message="slotProps">
        <div class="flex flex-col items-center w-full gap-4 border-b border-surface-200 dark:border-surface-700">
          <i :class="slotProps.message.icon" class="!text-6xl text-primary-500"></i>
          <div v-html="formattedMessage"></div>
        </div>
      </template>
    </ConfirmDialog>
  </template>
  
  <script setup>
  // Vue
  import { ref, computed, watch, onMounted, nextTick, onUnmounted } from 'vue';
  import { useRouter } from 'vue-router';
  const router = useRouter();
  
  
  // Websocket
  import io from 'socket.io-client';
  const socket = ref(null);
  
  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { useConfirm } from "primevue/useconfirm";
  const confirm = useConfirm();
  import { Panel, Skeleton, SelectButton, InputText, ConfirmDialog, Button, Drawer } from 'primevue';
  
  // Components
  import ReservationsCalendarLegend from '../components/ReservationsCalendarLegend.vue';
  import ReservationEdit from '../Reservation/ReservationEdit.vue';
  
  // Stores  
  import { useHotelStore } from '@/composables/useHotelStore';
  const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
  import { useParkingStore } from '@/composables/useParkingStore';
  const { fetchReservedParkingSpots, reservedParkingSpots, fetchAllParkingSpotsByHotel, fetchParkingBlocks, parkingBlocks } = useParkingStore();
  
  const allParkingSpots = ref([]);
  
  // Helper function
  const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
      return "";
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
  
  const isUpdating = ref(false);
  const isLoading = ref(true);
  const tableModeOptions = ref([
    { label: '縮小', value: true },
    { label: '拡大', value: false },
  ]);
  const isCompactView = ref(true);
  const centerDate = ref(formatDate(new Date()));
  const pinnedRowIndex = ref(null);
  const tableContainer = ref(null);

  const pinRow = (dateIndex) => {
    if (pinnedRowIndex.value === dateIndex) {
      pinnedRowIndex.value = null; // Unpin if the same row is clicked
    } else {
      pinnedRowIndex.value = dateIndex; // Pin the new row
    }
  };
  
  // Date range
  const dateRange = ref([]);
  const minDate = ref(null);
  const maxDate = ref(null);
  const generateDateRange = (start, end) => {
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(formatDate(new Date(d)));
    }
    return dates;
  };
  const appendDaysToRange = async (direction) => {
  
    if (direction === "up") {
      const oldMinDateValue = minDate.value;
      const newMinDate = new Date(minDate.value);
      newMinDate.setDate(newMinDate.getDate() - 7);
      minDate.value = formatDate(newMinDate);
  
      const newMaxDate = new Date(oldMinDateValue); // newMaxDate is oldMinDateValue
      newMaxDate.setDate(newMaxDate.getDate() - 1); // Subtract one day
  
      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...newDates, ...dateRange.value];

      // Fetch reservations for the entire new dateRange
      await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);      
  
    } else if (direction === "down") {
      const oldMaxDateValue = maxDate.value;
      const newMaxDate = new Date(maxDate.value);
      newMaxDate.setDate(newMaxDate.getDate() + 7);
      maxDate.value = formatDate(newMaxDate);
  
      const newMinDate = new Date(oldMaxDateValue); // newMinDate is oldMaxDateValue
      newMinDate.setDate(newMinDate.getDate() + 1); // Add one day
  
      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...dateRange.value, ...newDates];
  
      // Fetch reservations for the entire new dateRange
      await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);      
    }
  };
  
  // Fetch reserved spots data
  const tempParkingReservations = ref(null);
  const fetchParkingReservationsLocal = async (startDate, endDate) => {
  
      if (!startDate && !endDate) {
        return;
      }
      
      await fetchReservedParkingSpots(
        selectedHotelId.value,
        startDate,
        endDate
      );
      
      // Fetch parking blocks for the same date range
      await fetchParkingBlocks(
        selectedHotelId.value,
        startDate,
        endDate
      );
      
      // Start with existing reservations
      const mergedReservations = [...(tempParkingReservations.value || [])];
      
      // Create a map of existing reservations for faster lookup
      const existingReservationsMap = new Map();
      if (tempParkingReservations.value) {
        tempParkingReservations.value.forEach(res => {
          const key = `${res.parking_spot_id}_${formatDate(new Date(res.date))}`;
          existingReservationsMap.set(key, res);
        });
      }
      
      // Add new reservations from reservedParkingSpots (from store) if they don't already exist
      if (Array.isArray(reservedParkingSpots.value)) {
        reservedParkingSpots.value.forEach(newRes => {
          const key = `${newRes.parking_spot_id}_${formatDate(new Date(newRes.date))}`;
          if (!existingReservationsMap.has(key)) {
            mergedReservations.push(newRes);
          }
        });
      }
      
      // Update tempParkingReservations with the merged data
      tempParkingReservations.value = mergedReservations;
      
      // Log all reservations for 2025-11-10
      const reservationsFor1110 = mergedReservations.filter(r => formatDate(new Date(r.date)) === '2025-11-10');
      if (reservationsFor1110.length > 0) {
        console.log('[ParkingCalendar] All reservations for 2025-11-10:', reservationsFor1110.length);
        console.log('[ParkingCalendar] Reservations:', reservationsFor1110.map(r => ({
          spot_id: r.parking_spot_id,
          spot_number: r.spot_number,
          status: r.status,
          booker_name: r.booker_name
        })));
      }
  };
  
  // Hash map for faster lookups
  const reservedSpotsMap = computed(() => {
    const map = {};
    // Use tempParkingReservations which includes both real reservations and blocked spots
    if (Array.isArray(tempParkingReservations.value)) {
      tempParkingReservations.value.forEach(reservation => {
        const key = `${reservation.parking_spot_id}_${formatDate(new Date(reservation.date))}`;
        map[key] = reservation;
      });
    }
    return map;
  });
  
  // Count of available spots
  const availableSpotsByDate = computed(() => {
    const availability = {};
    dateRange.value.forEach(date => {
      const spotsForSale = allParkingSpots.value.filter(spot => spot.is_active === true);
      const reservedCount = spotsForSale.filter(spot =>
        reservedSpotsMap.value[`${spot.id}_${date}`]
      ).length;
  
      availability[date] = spotsForSale.length * 1 - reservedCount * 1;
    });
  
    return availability;
  });
  
  // Fill & Format the table 
  const isSpotReserved = (spotId, date) => {
    if (!tempParkingReservations.value) {
      return false;
    }
    
    const formattedDate = formatDate(new Date(date));
    const isReserved = tempParkingReservations.value.some(res => {
      const resDate = formatDate(new Date(res.date));
      return res.parking_spot_id === spotId && resDate === formattedDate;
    });
    
    // Log for spot 246 on 2025-11-10 (the blocked spot)
    if (spotId === 246 && formattedDate === '2025-11-10') {
      console.log('[ParkingCalendar] isSpotReserved check for spot 246 on 2025-11-10:', isReserved);
    }
    
    return isReserved;
  };
  const fillSpotInfo = (spotId, date) => {
    if (!tempParkingReservations.value) {
      return { status: 'available', client_name: '', reservation_id: null, booker_name: '' };
    }
    
    const formattedDate = formatDate(new Date(date));
    
    // Log for spots 246 and 247 on 2025-11-10
    if ((spotId === 246 || spotId === 247) && formattedDate === '2025-11-10') {
      console.log(`[ParkingCalendar] fillSpotInfo for spot ${spotId} on 2025-11-10`);
      console.log('[ParkingCalendar] tempParkingReservations length:', tempParkingReservations.value?.length);
      const matchingRes = tempParkingReservations.value.filter(res => {
        const resDate = formatDate(new Date(res.date));
        return res.parking_spot_id === spotId && resDate === formattedDate;
      });
      console.log('[ParkingCalendar] Matching reservations:', matchingRes);
    }
    
    const reservation = tempParkingReservations.value.find(res => {
      const resDate = formatDate(new Date(res.date));
      return res.parking_spot_id === spotId && resDate === formattedDate;
    });
    
    if (reservation) {
      return {
        status: reservation.status || 'reserved',  // Use the status from reservation, default to 'reserved'
        client_name: reservation.client_name || '',
        booker_name: reservation.booker_name || '',  // Add booker name if available
        reservation_id: reservation.reservation_id,
        ...reservation  // Spread all other reservation properties
      }
    } else {        
      return { 
        status: 'available', 
        client_name: '', 
        booker_name: '',
        reservation_id: null 
      };
    }
  };
  const getCellStyle = (spotId, date) => {
    const spotInfo = fillSpotInfo(spotId, date);
    let style = {};

    // Apply styles based on reservation type
    if (spotInfo) {
      switch(spotInfo.type) {
        case 'employee':
          style = { backgroundColor: '#f3e5f5' }; // Light purple for employee
          break;
        case 'ota':
          style = { backgroundColor: '#dbeafe' }; // Light blue for OTA
          break;
        case 'web':
          style = { backgroundColor: '#bfdbfe' }; // Slightly darker blue for web
          break;
        case 'default':
        default:
          // Default style for normal reservations
          if (spotInfo.status !== 'available') {
            style = { 
              backgroundColor: '#f0fdf4', // Light green for normal reservations
              color: 'inherit', 
              fontWeight: 'normal' 
            };
          }
          break;
      }
    }
    
    return style;
  };
  const isCellFirst = (spotId, date) => {
    const currentDate = new Date(date);
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    
    const currentSpotInfo = fillSpotInfo(spotId, date);
    if (!currentSpotInfo.reservation_id) return false;
    
    const prevSpotInfo = fillSpotInfo(spotId, prevDate);
    return !prevSpotInfo.reservation_id || 
           prevSpotInfo.reservation_id !== currentSpotInfo.reservation_id;
  };

  const isCellLast = (spotId, date) => {
    const currentDate = new Date(date);
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const currentSpotInfo = fillSpotInfo(spotId, date);
    if (!currentSpotInfo.reservation_id) return false;
    
    const nextSpotInfo = fillSpotInfo(spotId, nextDate);
    return !nextSpotInfo.reservation_id || 
           nextSpotInfo.reservation_id !== currentSpotInfo.reservation_id;
  };
  const applyHover = (roomIndex, dateIndex) => {
    // Highlight the entire row
    const rowCells = document.querySelectorAll(`tbody tr:nth-child(${dateIndex + 1}) td`);
    rowCells.forEach(cell => cell.classList.add('highlight-row'));
  
    // Highlight the entire column
    const colCells = document.querySelectorAll(`tbody tr td:nth-child(${roomIndex + 2})`); // +2 because first col is date
    colCells.forEach(cell => cell.classList.add('highlight-col'));
  
    // Highlight the hovered cell
    const hoveredCell = document.querySelector(`tbody tr:nth-child(${dateIndex + 1}) td:nth-child(${roomIndex + 2})`);
    if (hoveredCell) hoveredCell.classList.add('highlight-cell');
  
    // Also highlight the date cell (first column)
    const firstColCell = document.querySelector(`tbody tr:nth-child(${dateIndex + 1}) td:first-child`);
    if (firstColCell) firstColCell.classList.add('title-cell-highlight');
    // And the header cell (top row)
    const th = document.querySelector(`thead th:nth-child(${roomIndex + 2})`);
    if (th) th.classList.add('title-cell-highlight');
  };
  
  const removeHover = (roomIndex, dateIndex) => {
    // Remove row highlight
    const rowCells = document.querySelectorAll(`tbody tr:nth-child(${dateIndex + 1}) td`);
    rowCells.forEach(cell => cell.classList.remove('highlight-row'));
  
    // Remove column highlight
    const colCells = document.querySelectorAll(`tbody tr td:nth-child(${roomIndex + 2})`);
    colCells.forEach(cell => cell.classList.remove('highlight-col'));
  
    // Remove cell highlight
    const hoveredCell = document.querySelector(`tbody tr:nth-child(${dateIndex + 1}) td:nth-child(${roomIndex + 2})`);
    if (hoveredCell) hoveredCell.classList.remove('highlight-cell');
  
    // Remove date cell highlight
    const firstColCell = document.querySelector(`tbody tr:nth-child(${dateIndex + 1}) td:first-child`);
    if (firstColCell) firstColCell.classList.remove('title-cell-highlight');
    // Remove header cell highlight
    const th = document.querySelector(`thead th:nth-child(${roomIndex + 2})`);
    if (th) th.classList.remove('title-cell-highlight');
  };
  
  
  // Drag & Drop
  const draggingReservation = ref(false);
  const draggingStyle = ref({});
  const draggingDates = ref([]);
  const draggingSpotId = ref(null);
  const draggingDate = ref(null);
  const draggingCheckIn = ref(null);
  const draggingCheckOut = ref(null);
  const draggingSpotNumber = ref(null);
  const tempParkingData = ref([]);
  const hasChanges = ref(false);
  
  const handleDragStart = (event, spotId, date) => {
    onDragStart(event, spotId, date);
    startDrag(event, spotId, date);
  };
  const handleDrop = (event, spotId, date) => {
    onDrop(event, spotId, date);
    removeHighlight();
  };
  const applyChanges = async () => {
  
    // TODO: Implement setParkingCalendarFreeChange in useParkingStore
    // await setParkingCalendarFreeChange(tempParkingData.value);
  
    // Reset
    await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    tempParkingData.value = {};
    hasChanges.value = false;
  };
  const startDrag = (event, spotId, date) => {
    const reservation = fillSpotInfo(spotId, date);
    if (reservation.reservation_id) {
      draggingReservation.value = true;
      draggingSpotId.value = spotId;
      draggingDate.value = date;
      draggingCheckIn.value = new Date(reservation.check_in);
      draggingCheckOut.value = new Date(reservation.check_out);
      draggingSpotNumber.value = reservation.spot_number;
  
      const rect = event.target.getBoundingClientRect();
      draggingStyle.value = {
        position: 'absolute',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'row',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
        pointerEvents: 'none',
      };
  
      const dates = [];
      let currentDate = new Date(draggingCheckIn.value);
      while (currentDate < draggingCheckOut.value) {
        dates.push(formatDate(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
      draggingDates.value = dates;
    } else {
      draggingReservation.value = false;
    }
  };
  const endDrag = () => {
    draggingReservation.value = false;
    draggingDates.value = [];
    draggingSpotId.value = null;
    draggingDate.value = null;
    draggingCheckIn.value = null;
    draggingCheckOut.value = null;
    draggingSpotNumber.value = null;
  };
  const highlightDropZone = (event, _roomId, _date) => {
    const cell = event.target.closest('td');
    if (cell) {
      cell.classList.add('drop-zone');
  
      // Highlight the corresponding first column cell
      const rowIndex = cell.parentElement.rowIndex;
      const firstColCell = document.querySelector(`tbody tr:nth-child(${rowIndex}) td:first-child`);
      if (firstColCell) {
        firstColCell.classList.add('drop-zone-first-col');
      }
  
      // Highlight the corresponding th
      const cellIndex = cell.cellIndex;
      const th = document.querySelector(`thead th:nth-child(${cellIndex + 1})`);
      if (th) {
        th.classList.add('drop-zone-th');
      }
    }
  };
  const removeHighlight = (event) => {
    if (event) {
      setTimeout(() => {
        const cell = event.target.closest('td');
        if (cell) {
          cell.classList.remove('drop-zone');
  
          // Remove highlight from the corresponding first column cell
          const rowIndex = cell.parentElement.rowIndex;
          const firstColCell = document.querySelector(`tbody tr:nth-child(${rowIndex}) td:first-child`);
          if (firstColCell) {
            firstColCell.classList.remove('drop-zone-first-col');
          }
  
          // Remove highlight from the corresponding th
          const cellIndex = cell.cellIndex;
          const th = document.querySelector(`thead th:nth-child(${cellIndex + 1})`);
          if (th) {
            th.classList.remove('drop-zone-th');
          }
        }
      }, 300);
    } else {
      const dropZones = document.querySelectorAll('.drop-zone');
      dropZones.forEach(zone => zone.classList.remove('drop-zone'));
  
      const firstColDropZones = document.querySelectorAll('.drop-zone-first-col');
      firstColDropZones.forEach(zone => zone.classList.remove('drop-zone-first-col'));
  
      const thDropZones = document.querySelectorAll('.drop-zone-th');
      thDropZones.forEach(zone => zone.classList.remove('drop-zone-th'));
    }
  };
  
  // Reservation Mode
  const dragFrom = ref({ reservation_id: null, spot_id: null, spot_number: null, parking_lot_name: null, number_of_people: null, check_in: null, check_out: null, days: null });
  const dragTo = ref({ spot_id: null, spot_number: null, parking_lot_name: null, capacity: null, check_in: null, check_out: null });
  const onDragStart = async (event, spotId, date) => {
    dragFrom.value = null;
  
    const reservation_id = fillSpotInfo(spotId, date).reservation_id;
  
    if (reservation_id) {
      const check_in = formatDate(new Date(fillSpotInfo(spotId, date).check_in));
      const check_out = formatDate(new Date(fillSpotInfo(spotId, date).check_out));
      const spot_id = fillSpotInfo(spotId, date).parking_spot_id;
      const spot_number = fillSpotInfo(spotId, date).spot_number;
      const parking_lot_name = allParkingSpots.value.find(s => s.id === spotId)?.parking_lot_name || '';
      const number_of_people = fillSpotInfo(spotId, date).number_of_people;
      const days = Math.floor((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
      dragFrom.value = { reservation_id, spot_id, spot_number, parking_lot_name, number_of_people, check_in, check_out, days };
    } else {
      return;
    }
  
  };
  const onDrop = (event, spotId, date) => {
    if (!dragFrom.value) {
      return;
    }
    const selectedSpot = allParkingSpots.value.find(spot => spot.id === spotId);
    const check_in = formatDate(new Date(date));
    const check_out = formatDate(new Date(new Date(date).setDate(new Date(date).getDate() + dragFrom.value.days)));
    const spot_id = selectedSpot.id;
    const spot_number = selectedSpot.spot_number;
    const parking_lot_name = selectedSpot.parking_lot_name;
    const capacity = selectedSpot.capacity_units; // Assuming capacity_units is the capacity
    dragTo.value = { spot_id, spot_number, parking_lot_name, capacity, check_in, check_out };
  
    const from = dragFrom.value;
    const to = dragTo.value;
  
    // isSpotFullyBooked
    // Convert check-in and check-out to Date objects
    const startDate = new Date(from.check_in);
    const endDate = new Date(from.check_out);
    endDate.setDate(endDate.getDate() - 1); // Adjust end date to be check_out - 1 day
    // Generate all dates between check-in and check-out - 1
    const allDates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      allDates.push(currentDate.toISOString().split('T')[0]); // Store as YYYY-MM-DD
      currentDate.setDate(currentDate.getDate() + 1);
    }
    // Filter reservations that match the given reservation_id and spot_id
    const spotReservations = Array.isArray(reservedParkingSpots.value) 
      ? reservedParkingSpots.value.filter(
          spot => spot.reservation_id === from.reservation_id && spot.parking_spot_id === from.spot_id
        )
      : [];
    // Extract booked dates from filtered reservations
    const bookedDates = spotReservations.map(spot => formatDate(new Date(spot.date)));
    const isSpotFullyBooked = allDates.every(date => bookedDates.includes(date));
  
    if (!isSpotFullyBooked) {
      toast.add({ severity: 'warn', summary: '注意', detail: '駐車場が分割されています。', life: 3000 });
    } else if (!checkForConflicts(from, to)) {
      showConfirmationPrompt();
    } else {
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。', life: 3000 });
    }
  };
  const formattedMessage = ref('');
  const showConfirmationPrompt = async () => {
    const from = dragFrom.value;
    const to = dragTo.value;
    let message = '';
    if (from.spot_number === to.spot_number) {
      message = `
          <b>${from.spot_number}番</b>の駐車期間を<br/>
          「IN：${from.check_in} OUT：${from.check_out}」から<br/>
          「IN：${to.check_in} OUT：${to.check_out}」にしますか?<br/>`;
    } else if (from.check_in === to.check_in && from.check_out === to.check_out) {
      message = `
          <b>${from.spot_number}番</b>の予約を<br/>
          <b>${to.spot_number}番</b>に移動しますか?<br/>`;
    } else {
      message = `
          <b>${from.spot_number}番</b>の駐車期間を<br/>
          「IN：${from.check_in} OUT：${from.check_out}」から<br/>
          「IN：${to.check_in} OUT：${to.check_out}」に変更し、<br/>
          <b>${to.spot_number}番</b>に移動しますか?<br/>`;
    }
  
    formattedMessage.value = message;
  
    confirm.require({
      group: 'templating',
      header: '確認',
      icon: 'pi pi-exclamation-triangle',
      acceptProps: {
        label: 'はい'
      },
      accept: async () => {
        if (!checkForConflicts(from, to)) {
          isUpdating.value = true; // Disable WebSocket updates
          // TODO: Implement setParkingCalendarChange in useParkingStore
          // await setParkingCalendarChange(from.reservation_id, from.check_in, from.check_out, to.check_in, to.check_out, from.spot_id, to.spot_id);
          isUpdating.value = false; // Re-enable WebSocket updates
          await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
        } else {
          toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。', life: 3000 });
        }
        confirm.close('templating');
      },
      rejectProps: {
        label: 'キャンセル',
        severity: 'secondary',
        outlined: true
      },
      reject: () => {
        confirm.close('templating');
      }
    });
  };
  const checkForConflicts = (from, to) => {
    const fromDates = [];
    for (let dt = new Date(from.check_in); dt < new Date(from.check_out); dt.setDate(dt.getDate() + 1)) {
      fromDates.push(formatDate(dt));
    }
  
    const toDates = [];
    for (let dt = new Date(to.check_in); dt < new Date(to.check_out); dt.setDate(dt.getDate() + 1)) {
      toDates.push(formatDate(dt));
    }
  
    for (const date of toDates) {
      const key = `${to.spot_id}_${date}`;
      if (reservedSpotsMap.value[key] && reservedSpotsMap.value[key].reservation_id !== from.reservation_id) {
        return true; // Conflict found
      }
    }
  
    return false; // No conflicts
  };
  
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
  const handleScroll = debounce(async (event) => {
    if (isLoading.value) return;
  
  
    const container = event.target;
    const threshold = 1;
    const minScrollTop = threshold;
    const { scrollTop, scrollHeight, clientHeight } = container;
  
    if (container.scrollTop < minScrollTop) {
      isLoading.value = true;
      await appendDaysToRange("up");
      container.scrollTop = minScrollTop + 10;
      isLoading.value = false;
    } else if (scrollTop + clientHeight >= scrollHeight - threshold) {
      isLoading.value = true;
      await appendDaysToRange("down");
      isLoading.value = false;
    }
  }, 10);
  
  // Mount
  onMounted(async () => {
    // console.log('[ParkingCalendar] onMounted start');
    try {
      isLoading.value = true;

      socket.value = io(import.meta.env.VITE_BACKEND_URL);
      
      socket.value.on('connect', () => {
        // console.log('Connected to server');
      });      

      socket.value.on('tableUpdate', async (_data) => {
        // Prevent fetching if bulk update is in progress
        if (isUpdating.value) {
          // console.log('Skipping fetchParkingReservationsLocal because update is still running');
          return;
        }
        
        // console.log('[ParkingCalendar] Refreshing parking data...');
        await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
      });
            
      
      await fetchHotels();
      await fetchHotel();
      allParkingSpots.value = await fetchAllParkingSpotsByHotel(selectedHotelId.value);

      // Set up initial date range
      const today = new Date();
      const initialMinDate = new Date(today);
      initialMinDate.setDate(initialMinDate.getDate() - 10);
      const initialMaxDate = new Date(today);
      initialMaxDate.setDate(initialMaxDate.getDate() + 40);
      minDate.value = initialMinDate;
      maxDate.value = initialMaxDate;
      dateRange.value = generateDateRange(initialMinDate, initialMaxDate);

      // Load initial data
      if (dateRange.value && dateRange.value.length > 0) {
        await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
      }
      
      nextTick(() => {
          const tableContainer = document.querySelector(".table-container");
          if (tableContainer) {
              tableContainer.addEventListener("scroll", handleScroll);

              // Set initial scroll position
              const totalScrollHeight = tableContainer.scrollHeight;
              const scrollPosition = totalScrollHeight / 5;
              tableContainer.scrollTo({
                  top: scrollPosition,
                  behavior: "auto", // 'auto' is faster for initial load
              });
          }
      });

      isLoading.value = false;
      } catch (error) {
        console.error('[ParkingCalendar] Error initializing data:', error);
        isLoading.value = false;
      }
  });

  onUnmounted(() => {
    if (socket.value) {
      socket.value.disconnect();
    }
    if (tableContainer.value) {
      tableContainer.value.removeEventListener("scroll", handleScroll);
    }
  });
    
  // Needed Watchers
  watch(selectedHotelId, async (newVal, _oldVal) => {
    isLoading.value = true;
    if (_oldVal !== null && newVal !== null) {
      await fetchHotel();
      // Refresh parking spots for the new hotel
      allParkingSpots.value = await fetchAllParkingSpotsByHotel(newVal);
      if (dateRange.value && dateRange.value.length > 0) {
        await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
      }      
      isLoading.value = false;
    }
  }, { immediate: true });
  watch(centerDate, async (newVal, _oldVal) => {
  
    isLoading.value = true;
  
    const today = newVal;
    const initialMinDate = new Date(today);
    initialMinDate.setDate(initialMinDate.getDate() - 10);
    const initialMaxDate = new Date(today);
    initialMaxDate.setDate(initialMaxDate.getDate() + 40);
    minDate.value = initialMinDate;
    maxDate.value = initialMaxDate;
    dateRange.value = generateDateRange(initialMinDate, initialMaxDate);

    // Load initial data
    if (dateRange.value && dateRange.value.length > 0) {
      await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    }
    
    isLoading.value = false;
    // Scroll to the row for the selected date after table is rendered
    nextTick(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        // Find the row for the day before the selected date
        const rows = tableContainer.querySelectorAll('tbody tr');
        let targetRow = null;
        // Calculate the day before
        const selectedDate = new Date(centerDate.value);
        const prevDate = new Date(selectedDate);
        prevDate.setDate(selectedDate.getDate() - 1);
        const prevDateStr = formatDateWithDay(prevDate);
        const selectedDateStr = formatDateWithDay(centerDate.value);
        rows.forEach(row => {
          const dateCell = row.querySelector('td');
          if (dateCell && dateCell.textContent && dateCell.textContent.includes(prevDateStr)) {
            targetRow = row;
          }
        });
        // If not found, fall back to the selected date
        if (!targetRow) {
          rows.forEach(row => {
            const dateCell = row.querySelector('td');
            if (dateCell && dateCell.textContent && dateCell.textContent.includes(selectedDateStr)) {
              targetRow = row;
            }
          });
        }
        if (targetRow) {
          const containerRect = tableContainer.getBoundingClientRect();
          const rowRect = targetRow.getBoundingClientRect();
          // Scroll so the row is near the top (with a small offset)
          tableContainer.scrollTop += (rowRect.top - containerRect.top) - 16;
        }
      }
    });
  });
  
  const drawerVisible = ref(false);
  const reservationId = ref(null);
  const selectedSpot = ref(null);

  watch(drawerVisible, async (newVal, oldVal) => {
    if (newVal === false) {
      // Refresh data when drawer is closed
      await fetchParkingReservationsLocal(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);      
    }
  });

  const goToReservation = () => {
    router.push({ name: 'ReservationEdit', params: { reservation_id: reservationId.value } });
  };

  const handleCellDoubleClick = (spot, date) => {
    const spotInfo = fillSpotInfo(spot.id, date);
    
    if (spotInfo && spotInfo.reservation_id) {
      reservationId.value = spotInfo.reservation_id;
      selectedSpot.value = spot;
      drawerVisible.value = true;
    } 
  };
  </script>
  
  <style scoped>
  .overflow-x-auto {
    overflow-x: auto;
    max-width: 100%;
  }
  
  .table-container {
    width: 100%;
    height: calc(100vh - 200px);
    overflow-y: auto;
    max-width: 100%;
    position: relative;
    scrollbar-color: rgba(0, 0, 0, 0.3) rgba(0, 0, 0, 0.1);
  }
  
  th,
  td {
    border: none;
    border-right: 1px solid #e5e7eb;
    padding: 8px 12px;
    text-align: center;
    min-width: 120px;
    max-width: 140px;
  }
  
  td {
    text-align: left;
  }
  
  /* Remove right border from last column */
  th:last-child,
  td:last-child {
    border-right: none;
  }
  
  /* Enhanced table header styling */
  thead th {
    background-color: #fff;
    font-weight: bold;
    color: #111827;
    border-right: 1px solid #e5e7eb;
    padding: 8px 12px;
  }
  
  thead th:first-child {
    background-color: #fff;
    border-left: none;
    border-right: 1px solid #e5e7eb;
  }
  
  thead th:last-child {
    border-right: none;
  }
  
  /* For dark mode */
  .dark thead th {
    background-color: #fff;
    color: #111827;
    border-right: 1px solid #6b7280;
  }
  
  .dark thead th:first-child {
    background-color: #fff;
    color: #111827;
    border-left: none;
    border-right: 1px solid #6b7280;
  }
  
  .dark thead th:last-child {
    border-right: none;
  }
  
  .cell-first {
    border-top-left-radius: 40px !important;
    border-top-right-radius: 40px !important;
  }
  
  .cell-last {
    border-bottom-left-radius: 40px !important;
    border-bottom-right-radius: 40px !important;
  }
  
  .table-container::-webkit-scrollbar-button:single-button {
    background-color: rgba(0, 0, 0, 0.3);
    /* Make buttons always visible */
  }
  
  .table-container::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.3);
    /* Scrollbar thumb color */
    border-radius: 4px;
    transition: background-color 0.3s ease;
  }
  
  .table-container::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    /* Track color */
  }
  
  .table-container::-webkit-scrollbar-button {
    background-color: rgba(0, 0, 0, 0.1);
    /* Button color */
  }
  
  .table-container:active::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.7);
  }
  
  .table-container:focus {
    outline: none;
    border: 2px solid #4CAF50;
    /* Visual cue for focus */
  }
  
  /* Compact Mode */
  .compact-view th,
  .compact-view td {
    padding: 4px 6px;
    min-width: 20px;
    /* Adjust as needed */
    max-width: 100px;
    font-size: 10px;
  }
  
  .compact-cell {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    height: 10px;
    /* Adjust height */
    width: 20px;
    /* Adjust width */
    font-size: 10px;
  }
  
  .selected-room-by-day {
    background-color: lightyellow !important;
    color: goldenrod !important;
  
    border-top-width: 0.5cap;
    border-bottom-width: 0.5cap;
  }
  
  .cell-with-hover {
    position: relative;
    transition: background-color 0.3s ease;
  }
  
  .cell-with-hover:hover {
    background-color: lightgray;
  }
  
  .title-cell-highlight {
    /* Horizontal highlight (yellow) for first column (dates) */
    background-color: #fef9c3 !important;
    /* yellow-100, matches .highlight-row */
    color: #92400e !important;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  
  .dark .title-cell-highlight {
    background-color: #78350f !important;
    /* matches .dark .highlight-row */
    color: #fef3c7 !important;
  }
  
  /* Blue highlight for first row (rooms) */
  thead th.title-cell-highlight {
    background-color: #e0f2fe !important;
    /* sky-100, matches .highlight-col */
    color: #0c4a6e !important;
  }
  
  .dark thead th.title-cell-highlight {
    background-color: #0c4a6e !important;
    /* matches .dark .highlight-col */
    color: #fef3c7 !important;
  }
  
  .dragging-reservation {
    background-color: rgba(255, 255, 255, 0.8);
  }
  
  .dragging-reservation-cell {
    padding: 8px;
    border: 1px solid #ccc;
  }
  
  .dragging-reservation-header {
    padding: 8px;
    font-weight: bold;
    border-bottom: 1px solid #ccc;
    text-align: center;
  }
  
  .drop-zone {
    background-color: lightgreen;
  }
  
  .drop-zone-first-col {
    background-color: lightgreen;
  }
  
  .drop-zone-th {
    background-color: lightgreen;
  }
  
  /* Enhanced room row styling */
  tbody tr:nth-child(even) {
    background-color: #e6fffa;
  }
  
  tbody tr:nth-child(odd) {
    background-color: #ffffff;
  }
  
  /* Room column styling */
  tbody td:first-child {
    background-color: #fff;
    font-weight: bold;
    border-left: none;
  }
  
  /* Hover effects for better visual feedback */
  tbody tr:hover {
    background-color: #f0f9ff;
  }
  
  /* Dark mode support */
  .dark tbody tr:nth-child(even) {
    background-color: #374151;
  }
  
  .dark tbody tr:nth-child(odd) {
    background-color: #1f2937;
  }
  
  .dark tbody tr:hover {
    background-color: #1e40af;
  }
  
  .dark thead th {
    background-color: #374151;
    border-color: #6b7280;
  }
  
  .dark tbody td:first-child {
    background-color: #fff;
    border-left-color: #9ca3af;
  }
  
  .highlight-row::before,
  .highlight-col::before,
  .highlight-cell::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }

  /* Light Mode Overlay Colors */
  .highlight-row::before {
    background-color: rgba(254, 249, 195, 0.2); /* yellow */
  }
  .highlight-col::before {
    background-color: rgba(224, 242, 254, 0.2); /* blue */
  }
  .highlight-cell::before {
    background-color: rgba(253, 230, 138, 0.2); /* amber */
  }

  /* Dark Mode Overlay Colors */
  .dark .highlight-row::before {
    background-color: rgba(120, 53, 15, 0.2);
  }
  .dark .highlight-col::before {
    background-color: rgba(12, 74, 110, 0.2);
  }
  .dark .highlight-cell::before {
    background-color: rgba(180, 83, 9, 0.2);
  }

  /* Border Effect for the Hovered Cell */
  .highlight-cell {
    box-shadow: 0 0 0 3px #f59e42 inset;
    z-index: 2;
  }
  .dark .highlight-cell {
    box-shadow: 0 0 0 3px #fbbf24 inset;
  }

  .row-is-pinned td {
    position: relative; 
    border-top: 2px solid #f59e42 !important;
    border-bottom: 2px solid #f59e42 !important;
  }
  .row-is-pinned td::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(234, 179, 8, 0.15); /* Subtle amber/yellow overlay */
    pointer-events: none;
    z-index: 1;
  }

  .dark .row-is-pinned td {
    border-top-color: #fbbf24 !important; 
    border-bottom-color: #fbbf24 !important;
  }
  .dark .row-is-pinned td::before {
    background-color: rgba(251, 191, 36, 0.15); /* Subtle amber for dark mode */
  }
  </style>
  