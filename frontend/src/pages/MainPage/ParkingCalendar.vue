<template>
    <div class="p-2 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
      <Panel header="" class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg dark:shadow-xl">
        <template #header>
          <div class="grid grid-cols-6 items-center">
            <p class="text-lg font-bold dark:text-gray-100">駐車場カレンダー</p>
            <div class="flex justify-start grid grid-cols-2 col-span-2 mr-4">
              <p class="mr-2 dark:text-gray-100">日付へ飛ぶ：</p>
              <InputText v-model="centerDate" type="date" fluid required
                class="dark:bg-gray-800 dark:text-gray-100 rounded" />
            </div>
            <div class="flex grid grid-cols-5 col-span-2">
              <div v-for="(legendItem, index) in uniqueLegendItems" :key="index"
                class="flex items-center text-sm rounded mr-1 font-bold justify-center"
                style="overflow: hidden; text-overflow: ellipsis" :style="{ backgroundColor: `${legendItem.plan_color}` }"
                v-tooltip="legendItem.plan_name">
                <span>{{ legendItem.plan_name }}</span>
              </div>
            </div>
            <div class="flex justify-end">
              <SelectButton optionLabel="label" optionValue="value" :options="tableModeOptions" v-model="isCompactView"
                class="dark:bg-gray-800 dark:text-gray-100" />
            </div>
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
              <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex">
                <td
                  class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky left-0 z-10">
                  <span class="text-xs dark:text-gray-100">{{ formatDateWithDay(date) }}</span>
  
                  <div class="text-2xs text-gray-500 flex justify-center" :class="{
                    'text-red-400': availableSpotsByDate[date] === 0,
                    'dark:text-gray-400': availableSpotsByDate[date] !== 0
                  }">
                    空き: {{ availableSpotsByDate[date] }}
                  </div>
  
                </td>
                <td v-for="(spot, spotIndex) in allParkingSpots" :key="spotIndex"
                  @dblclick="handleCellClick(spot, date)" @dragstart="handleDragStart($event, spot.id, date)"
                  @dragend="endDrag()" @dragover.prevent @dragenter="highlightDropZone($event, spot.id, date)"
                  @dragleave="removeHighlight($event, spot.id, date)" @drop="handleDrop($event, spot.id, date)"
                  @contextmenu.prevent="showContextMenu($event, spot, date)"
                  draggable="true" :style="getCellStyle(spot.id, date, dragMode === 'reorganizeRooms')" :class="[
                    'px-2 py-2 text-center text-xs max-h-0 aspect-square w-32 h-16 text-ellipsis border b-4 cell-with-hover',
                    isCellFirst(spot.id, date, dragMode === 'reorganizeRooms') ? 'cell-first' : '',
                    isCellLast(spot.id, date, dragMode === 'reorganizeRooms') ? 'cell-last' : '',
                    'cursor-pointer',
                    isCompactView ? 'compact-cell' : '',
                    isSelectedSpotByDay(spot.id, date) ? 'selected-spot-by-day' : '',
                    !isSpotReserved(spot.id, date, dragMode === 'reorganizeRooms') ? 'dark:bg-gray-800 dark:text-gray-100' : ''
                  ]" @mouseover="applyHover(spotIndex, dateIndex)" @mouseleave="removeHover(spotIndex, dateIndex)">
                  <div v-if="isLoading && !isSpotReserved(spot.id, date, dragMode === 'reorganizeRooms')">
                    <Skeleton class="mb-2 dark:bg-gray-700"></Skeleton>
                  </div>
                  <div v-else>
                    <div v-if="isSpotReserved(spot.id, date, dragMode === 'reorganizeRooms')"
                      class="flex items-center">
                      <div>
                        <template
                          v-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').type === 'employee'">
                          <i class="pi pi-id-card bg-purple-200 p-1 rounded dark:bg-purple-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'hold'">
                          <i class="pi pi-pause bg-yellow-100 p-1 rounded dark:bg-yellow-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'provisory'">
                          <i class="pi pi-clock bg-cyan-200 p-1 rounded dark:bg-cyan-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'confirmed'">
                          <i class="pi pi-check-circle bg-sky-300 p-1 rounded dark:bg-sky-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'checked_in'">
                          <i class="pi pi-user bg-green-400 p-1 rounded dark:bg-green-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'checked_out'">
                          <i class="pi pi-sign-out bg-gray-300 p-1 rounded dark:bg-gray-700"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'block' && fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').client_id === '11111111-1111-1111-1111-111111111111'">
                          <i class="pi pi-times bg-red-100 p-1 rounded dark:bg-red-800"></i>
                        </template>
                        <template
                          v-else-if="fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').status === 'block' && fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').client_id === '22222222-2222-2222-2222-222222222222'">
                          <i class="pi pi-lock bg-orange-100 p-1 rounded dark:bg-orange-800"></i>
                        </template>
                      </div>
                      <div class="ml-1 dark:text-gray-100">
                        {{ fillSpotInfo(spot.id, date, dragMode === 'reorganizeRooms').client_name || '予約情報あり' }}
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
          <span class="mr-4 dark:text-gray-100">編集モード：{{ dragModeLabel }}</span>
          <Button v-if="dragMode === 'reorganizeRooms' && hasChanges" @click="applyReorganization"
            class="dark:bg-gray-800 dark:text-gray-100">変更適用</Button>
          <!-- Legend Row -->
          <Fieldset legend="アイコン凡例" class="mt-2 text-xs dark:text-gray-100">
            <div class="flex flex-wrap items-center gap-4">
              <span class="flex items-center gap-1"><i
                  class="pi pi-pause bg-yellow-100 p-1 rounded dark:bg-yellow-800"></i>保留中</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-clock bg-cyan-200 p-1 rounded dark:bg-cyan-800"></i>仮予約</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-check-circle bg-sky-300 p-1 rounded dark:bg-sky-800"></i>確定予約</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-user bg-green-400 p-1 rounded dark:bg-green-800"></i>チェックイン済み</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-sign-out bg-gray-300 p-1 rounded dark:bg-gray-700"></i>チェックアウト済み</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-id-card bg-purple-200 p-1 rounded dark:bg-purple-800"></i>社員</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-times bg-red-100 p-1 rounded dark:bg-red-800"></i>ブロック</span>
              <span class="flex items-center gap-1"><i
                  class="pi pi-lock bg-orange-100 p-1 rounded dark:bg-orange-800"></i>仮ブロック</span>
              <span class="flex items-center gap-1"><i class="pi pi-circle"></i>空き</span>
  
            </div>
          </Fieldset>
        </template>
      </Panel>
  
      <div v-if="reservationCardData.length > 0 && !reservationCardVisible"
        :style="{ position: 'absolute', right: '3rem', bottom: '5rem' }">
        <OverlayBadge :value="reservationCardData.length" severity="danger">
          <Button severity="info" @click="reservationCardVisible = true" rounded>
            <i class="pi pi-calendar" />
          </Button>
        </OverlayBadge>
      </div>
  
  
  
      <Drawer v-model:visible="reservationCardVisible" :modal="false" :position="'right'"
        :style="{ width: isDrawerExpanded ? '400px' : '100px' }" :closable="false" @mouseover="expandDrawer"
        @mouseleave="collapseDrawer">
        <div v-if="reservationCardData.length > 0" class="reservation-card">
          <div v-for="reservationGroup in reservationCardData" :key="reservationGroup.reservation_id" draggable="true"
            @dragstart="handleCardDragStart($event, reservationGroup)" :class="{ 'expanded': isDrawerExpanded }">
            <template v-if="isDrawerExpanded">
              <Card class="mb-2">
                <template #content>
                  <div class="flex justify-between mb-2">
                    <span class="font-bold">お客様名:</span>
                    <span>{{ reservationGroup.client_name || '予約情報あり' }}</span>
                  </div>
                  <div class="flex justify-between mb-2">
                    <span class="font-bold">部屋番号:</span>
                    <span>{{ reservationGroup.room_number }}</span>
                  </div>
                  <div class="flex justify-between mb-2">
                    <span class="font-bold">チェックイン:</span>
                    <span>{{ formatDate(new Date(reservationGroup.check_in)) }}</span>
                  </div>
                  <div class="flex justify-between mb-2">
                    <span class="font-bold">チェックアウト:</span>
                    <span>{{ formatDate(new Date(reservationGroup.check_out)) }}</span>
                  </div>
                  <div class="mt-4 text-center text-sm text-gray-500">
                    <i class="pi pi-arrows-alt mr-2"></i>ドラッグしてカレンダーに移動
                  </div>
                </template>
              </Card>
            </template>
            <template v-else>
              <Badge severity="info" class="my-2 w-full text-center">
                <span class="text-xl">{{ reservationGroup.room_number }}</span>
              </Badge>
  
            </template>
          </div>
        </div>
      </Drawer>
  
      <ClientForReservationDialog v-model="showClientDialog" :client="currentClient" :reservation-details="reservationDetails"
        @save="handleClientSave" @close="showClientDialog = false" />
    </div>
  
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
  
  
  //Websocket
  import io from 'socket.io-client';
  const socket = ref(null);
  
  // Primevue
  import { useToast } from 'primevue/usetoast';
  const toast = useToast();
  import { useConfirm } from "primevue/useconfirm";
  const confirm = useConfirm();
  const confirmRoomMode = useConfirm();
  import { Panel, Drawer, Card, Skeleton, SelectButton, InputText, ConfirmDialog, SpeedDial, ContextMenu, Button, Badge, OverlayBadge, Fieldset } from 'primevue';
  
  // Stores  
  import { useHotelStore } from '@/composables/useHotelStore';
  const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
  import { useParkingStore } from '@/composables/useParkingStore';
  const { parkingLots, parkingSpots, fetchParkingLots, fetchParkingSpots, fetchReservedParkingSpots, reservedParkingSpots } = useParkingStore();
  import { useUserStore } from '@/composables/useUserStore';
  const { logged_user } = useUserStore();
  
  const allParkingSpots = ref([]);
  
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
    const options = { weekday: 'short', year: '2-digit', month: '2-digit', day: '2-digit' };
    const parsedDate = new Date(date);
    return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
  };
  const formatDateMonthDay = (date) => {
    const options = { weekday: 'short', month: '2-digit', day: '2-digit' };
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
  const uniqueLegendItems = computed(() => {
    const uniqueItems = new Set();
    const legendItems = [];
  
    if (Array.isArray(reservedParkingSpots.value)) {
      reservedParkingSpots.value.forEach(spot => {
        if (spot.plan_name && spot.plan_color) {  // Check if properties exist
          const key = `${spot.plan_name}-${spot.plan_color}`; // Create a unique key
          if (!uniqueItems.has(key)) {
            uniqueItems.add(key);
            legendItems.push({ plan_name: spot.plan_name, plan_color: spot.plan_color });
          }
        }
      });
    }
  
    legendItems.push({ plan_name: '仮予約', plan_color: '#ead59f' });
    legendItems.push({ plan_name: '社員', plan_color: '#f3e5f5' });
    legendItems.push({ plan_name: 'OTA', plan_color: '#9fead5' });
  
    return legendItems;
  });
  
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
    // console.log('appendDaysToRange calls fetchReservations', oldMinDate, oldMaxDate);
  
    if (direction === "up") {
      const oldMinDateValue = minDate.value;
      const newMinDate = new Date(minDate.value);
      newMinDate.setDate(newMinDate.getDate() - 7);
      minDate.value = formatDate(newMinDate);
  
      const newMaxDate = new Date(oldMinDateValue); // newMaxDate is oldMinDateValue
      newMaxDate.setDate(newMaxDate.getDate() - 1); // Subtract one day
  
      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...newDates, ...dateRange.value];
  
      const fetchStartDate = minDate.value;
      const fetchEndDate = formatDate(newMaxDate);
      await fetchReservations(fetchStartDate, fetchEndDate);
  
    } else if (direction === "down") {
      const oldMaxDateValue = maxDate.value;
      const newMaxDate = new Date(maxDate.value);
      newMaxDate.setDate(newMaxDate.getDate() + 7);
      maxDate.value = formatDate(newMaxDate);
  
      const newMinDate = new Date(oldMaxDateValue); // newMinDate is oldMaxDateValue
      newMinDate.setDate(newMinDate.getDate() + 1); // Add one day
  
      const newDates = generateDateRange(newMinDate, newMaxDate);
      dateRange.value = [...dateRange.value, ...newDates];
  
      const fetchStartDate = formatDate(newMinDate);
      const fetchEndDate = maxDate.value;
      await fetchReservations(fetchStartDate, fetchEndDate);
    }
  };
  
  // Fetch reserved spots data
  const tempParkingReservations = ref(null);
  const fetchParkingReservations = async (startDate, endDate) => {
    try {
      if (!startDate && !endDate) {
        return
      }
      await fetchReservedParkingSpots(
        selectedHotelId.value,
        startDate,
        endDate
      );
      tempParkingReservations.value = reservedParkingSpots.value;
    } catch (error) {
      console.error('Error fetching parking reservations:', error);
    }
  };
  
  // Hash map for faster lookups
  const reservedSpotsMap = computed(() => {
    const map = {};
    if (Array.isArray(reservedParkingSpots.value)) {
      reservedParkingSpots.value.forEach(reservation => {
        const key = `${reservation.parking_spot_id}_${formatDate(new Date(reservation.date))}`;
        map[key] = reservation;
      });
    }
    return map;
  });
  const tempSpotsMap = computed(() => {
    const map = {};
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
  const isSpotReserved = (spotId, date, useTemp = false) => {
    const key = `${spotId}_${date}`;
    return useTemp ? !!tempSpotsMap.value[key] : !!reservedSpotsMap.value[key];
  };
  const fillSpotInfo = (spotId, date, useTemp = false) => {
    const key = `${spotId}_${date}`;
    return useTemp ? tempSpotsMap.value[key] || { status: 'available', client_name: '', reservation_id: null } : reservedSpotsMap.value[key] || { status: 'available', client_name: '', reservation_id: null };
  };
  const getCellStyle = (spotId, date, useTemp = false) => {
    const spotInfo = fillSpotInfo(spotId, date, dragMode.value === 'reorganizeRooms');
    let spotColor = '#d3063d';
    let style = {};
  
    if (spotInfo && spotInfo.type === 'employee') {
      spotColor = '#f3e5f5';
      style = { backgroundColor: spotColor };
    } else if (spotInfo && spotInfo.status === 'provisory') {
      spotColor = '#ead59f';
      style = { backgroundColor: `${spotColor}` };
    } else if (spotInfo && spotInfo.status === 'block' && spotInfo.client_id === '22222222-2222-2222-2222-222222222222') {
      spotColor = '#fed7aa';
      style = { backgroundColor: `${spotColor}` };
    } else if (spotInfo && spotInfo.status === 'block') {
      spotColor = '#fca5a5';
      style = { backgroundColor: `${spotColor}` };
    } else if (spotInfo && (spotInfo.type === 'ota' || spotInfo.type === 'web')) {
      spotColor = '#9fead5';
      style = { backgroundColor: `${spotColor}` };
    } else if (spotInfo && spotInfo.plan_color) {
      spotColor = spotInfo.plan_color;
      style = { backgroundColor: `${spotColor}` };
    } else if (spotInfo && spotInfo.status !== 'available') {
      style = { color: `${spotColor}`, fontWeight: 'bold' };
    }
  
    if (useTemp) {
      const originalReservation = reservedParkingSpots.value.find(r => r.parking_spot_id === spotId && formatDate(new Date(r.date)) === date);
      const tempReservation = tempParkingReservations.value.find(r => r.parking_spot_id === spotId && formatDate(new Date(r.date)) === date);
  
      if (originalReservation?.id !== tempReservation?.id) {
        style.border = '2px solid red'; // Highlight modified cells
      }
    }
  
    return style;
  };
  const firstCellMap = computed(() => {
    const firstMap = {};
    if (Array.isArray(reservedParkingSpots.value)) {
      reservedParkingSpots.value.forEach(spot => {
        const checkInKey = `${spot.parking_spot_id}_${formatDate(new Date(spot.check_in))}`;
        firstMap[checkInKey] = true;
      });
    }
    return firstMap;
  });
  const lastCellMap = computed(() => {
    const lastMap = {};
    if (Array.isArray(reservedParkingSpots.value)) {
      reservedParkingSpots.value.forEach(spot => {
        const checkOutKey = `${spot.parking_spot_id}_${formatDate(new Date(new Date(spot.check_out).setDate(new Date(spot.check_out).getDate() - 1)))}`;
        lastMap[checkOutKey] = true;
      });
    }
    return lastMap;
  });
  const firstCellTempMap = computed(() => {
    const firstMap = {};
    if (Array.isArray(tempParkingReservations.value)) {
      tempParkingReservations.value.forEach(spot => {
        const checkInKey = `${spot.parking_spot_id}_${formatDate(new Date(spot.check_in))}`;
        firstMap[checkInKey] = true;
      });
    }
    return firstMap;
  });
  const lastCellTempMap = computed(() => {
    const lastMap = {};
    if (Array.isArray(tempParkingReservations.value)) {
      tempParkingReservations.value.forEach(spot => {
        const checkOutKey = `${spot.parking_spot_id}_${formatDate(new Date(new Date(spot.check_out).setDate(new Date(spot.check_out).getDate() - 1)))}`;
        lastMap[checkOutKey] = true;
      });
    }
    return lastMap;
  });
  const isCellFirst = (spotId, date, useTemp = false) => {
    const key = `${spotId}_${date}`;
    return useTemp ? !!firstCellTempMap.value[key] : !!firstCellMap.value[key];
  };
  const isCellLast = (spotId, date, useTemp = false) => {
    const key = `${spotId}_${date}`;
    return useTemp ? !!lastCellTempMap.value[key] : !!lastCellMap.value[key];
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
  
  // Reservation Drawer  
  const reservationCardData = ref([]);
  const selectedCellReservations = ref([]);
  const reservationCardVisible = ref(false);
  const isDrawerExpanded = ref(false);
  const showReservationCard = () => {
    isDrawerExpanded.value = false;
    reservationCardVisible.value = true;
  };
  const expandDrawer = () => {
    isDrawerExpanded.value = true;
    reservationCardVisible.value = true;
  };
  
  const collapseDrawer = () => {
    isDrawerExpanded.value = false;
  };
  const handleCardDragStart = (event, reservation) => {
    console.log('handleCardDragStart', reservation);
    reservationCardVisible.value = false;
    draggingReservation.value = true;
    selectedCellReservations.value = reservation;
  };
  
  // Drag & Drop
  const draggingReservation = ref(false);
  const draggingStyle = ref({});
  const draggingDates = ref([]);
  const draggingRoomId = ref(null);
  const draggingDate = ref(null);
  const draggingCheckIn = ref(null);
  const draggingCheckOut = ref(null);
  const draggingRoomNumber = ref(null);
  const selectedRoomByDay = ref([]);
  const selectedRoomByDayDateRange = computed(() => {
    if (!selectedRoomByDay.value || selectedRoomByDay.value.length === 0) {
      return { minDate: null, maxDate: null };
    }
  
    const dates = selectedRoomByDay.value.map(item => new Date(item.key.split('_')[1]));
  
    if (dates.length === 0) {
      return { minDate: null, maxDate: null };
    }
  
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
  
    return { minDate: minDate, maxDate: maxDate };
  });
  const tempRoomData = ref([]);
  const hasChanges = ref(false);
  
  const handleCellClick = async (spot, date) => {
    // No action on click since edit mode is removed
  };
  const handleDragStart = (event, spotId, date) => {
    onDragStart(event, spotId, date);
    startDrag(event, spotId, date);
  };
  const handleDrop = (event, spotId, date) => {
    onDrop(event, spotId, date);
    removeHighlight();
  };
  const applyReorganization = async () => {
  
    // console.log("Updated Reservations:", tempRoomData.value);
    await setCalendarFreeChange(tempRoomData.value);
  
    // Reset
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    dragMode.value = 'reservation'
    tempRoomData.value = {};
    hasChanges.value = false;
  };
  const isSelectedRoomByDay = (roomId, date) => {
    return selectedRoomByDay.value?.some(item => item.key === `${roomId}_${date}`);
  };
  const isContiguous = (selected, key) => {
    // Check if the key is already in the array
    if (selected.some(item => item.key === key)) {
      return false;
    }
  
    // Check day difference between items
    const newRoomId = key.split('_')[0];
    const newDate = new Date(key.split('_')[1]);
  
    for (const selectedItem of selected) {
      const selectedKey = selectedItem.key;
      const selectedRoomId = selectedKey.split('_')[0];
      const selectedDate = new Date(selectedKey.split('_')[1]);
      if (newRoomId === selectedRoomId && Math.abs(selectedDate - newDate) === 86400000) {
        return true;
      }
    }
  
    return false;
  };
  const areSelectedDatesAvailableInRoom = (roomId) => {
    if (!selectedRoomByDay.value || selectedRoomByDay.value.length === 0) {
      return true;
    }
  
    for (const item of selectedRoomByDay.value) {
      const itemRoomId = item.key.split('_')[0];
      const itemDate = item.key.split('_')[1];
      const newKey = `${roomId}_${itemDate}`;
  
      if (reservedRoomsMap.value[newKey]) {
        return false;
      }
    }
  
    return true;
  };
  const startDrag = (event, spotId, date) => {
    // console.log('startDrag')
    const reservation = fillSpotInfo(spotId, date);
    if (reservation.reservation_id) {
      draggingReservation.value = true;
      draggingRoomId.value = spotId; // Keep for now, might need to rename to draggingSpotId
      draggingDate.value = date;
      draggingCheckIn.value = new Date(reservation.check_in);
      draggingCheckOut.value = new Date(reservation.check_out);
      draggingRoomNumber.value = reservation.spot_number; // Keep for now, might need to rename to draggingSpotNumber
  
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
    draggingRoomId.value = null;
    draggingDate.value = null;
    draggingCheckIn.value = null;
    draggingCheckOut.value = null;
    draggingRoomNumber.value = null;
  };
  const highlightDropZone = (event, roomId, date) => {
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
  const dragFrom = ref({ reservation_id: null, room_id: null, room_number: null, room_type_name: null, number_of_people: null, check_in: null, check_out: null, days: null });
  const dragTo = ref({ room_id: null, room_number: null, room_type_name: null, capacity: null, check_in: null, check_out: null });
  const onDragStart = async (event, spotId, date) => {
    // console.log('onDragStart')
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
  
      // console.log('dragFrom',dragFrom.value)
    } else {
      return;
    }
  
  };
  const onDrop = (event, spotId, date) => {
    // console.log('Drop');
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
    const spotReservations = reservedParkingSpots.value.filter(
      spot => spot.reservation_id === from.reservation_id && spot.parking_spot_id === from.spot_id
    );
    // Extract booked dates from filtered reservations
    const bookedDates = spotReservations.map(spot => formatDate(new Date(spot.date)));
    const isSpotFullyBooked = allDates.every(date => bookedDates.includes(date));
  
    if (!isSpotFullyBooked) {
      toast.add({ severity: 'warn', summary: '注意', detail: '駐車場が分割されています。', life: 3000 });
    } else if (!checkForConflicts(from, to)) {
      showConfirmationPrompt();
    } else {
      // console.log('Conflict found');
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
          await fetchParkingReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
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
    //console.log('Checking for conflicts...');
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
  
  const handleTempBlock = (data) => {
    // console.log('Temp block created:', data);
    // Close any open dialogs or drawers
    drawerVisible.value = false;
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
        // console.log('Skipping fetchReservation because update is still running');
        return;
      }
      // Update the reservations data in your component
      // console.log('Received updated data:', data);
      await fetchReservedParkingSpots(selectedHotelId.value, dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    });
  
    await fetchHotels();
    await fetchHotel();
  
    await fetchParkingLots();
    let spots = [];
    for (const lot of parkingLots.value) {
      await fetchParkingSpots(lot.id);
      const spotsWithLotName = parkingSpots.value.map(spot => ({
          ...spot,
          parking_lot_name: lot.name
      }));
      spots.push(...spotsWithLotName);
    }
    allParkingSpots.value = spots;
  
  
    const today = new Date();
    const initialMinDate = new Date(today);
    initialMinDate.setDate(initialMinDate.getDate() - 10);
    const initialMaxDate = new Date(today);
    initialMaxDate.setDate(initialMaxDate.getDate() + 40);
    minDate.value = initialMinDate;
    maxDate.value = initialMaxDate;
    dateRange.value = generateDateRange(initialMinDate, initialMaxDate);
  
    nextTick(async () => {
      await fetchReservedParkingSpots(selectedHotelId.value, dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
  
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
    isLoading.value = false;
  });
  onUnmounted(() => {
    // Close the Socket.IO connection when the component is unmounted
    if (socket.value) {
      socket.value.disconnect();
    }
  });
  
  // Needed Watchers
  watch(reservationId, async (newReservationId, oldReservationId) => {
    if (newReservationId) {
  
      await fetchReservation(newReservationId);
    }
  }, { immediate: true });
  watch(selectedHotelId, async (newVal, oldVal) => {
    isLoading.value = true;
    if (oldVal !== null && newVal !== null) {
      await fetchHotel();
      if (dateRange.value && dateRange.value.length > 0) {
        await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
      }
      isLoading.value = false;
    }
  }, { immediate: true });
  watch(centerDate, async (newVal, oldVal) => {
    // console.log("centerDate changed:",newVal);
    isLoading.value = true;
  
    const today = newVal;
    const initialMinDate = new Date(today);
    initialMinDate.setDate(initialMinDate.getDate() - 10);
    const initialMaxDate = new Date(today);
    initialMaxDate.setDate(initialMaxDate.getDate() + 40);
    minDate.value = initialMinDate;
    maxDate.value = initialMaxDate;
    dateRange.value = generateDateRange(initialMinDate, initialMaxDate);
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    isLoading.value = false;
    // Scroll to the row for the selected date after table is rendered
    nextTick(() => {
      const tableContainer = document.querySelector('.table-container');
      if (tableContainer) {
        // Find the row for the day before the selected date
        const rows = tableContainer.querySelectorAll('tbody tr');
        let targetRow = null;
        // Calculate the day before
        const selectedDate = new Date(newVal);
        const prevDate = new Date(selectedDate);
        prevDate.setDate(selectedDate.getDate() - 1);
        const prevDateStr = formatDateWithDay(prevDate);
        const selectedDateStr = formatDateWithDay(newVal);
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
  
  .highlight-row {
    background-color: #fef9c3 !important;
    /* yellow-100 */
  }
  
  .highlight-col {
    background-color: #e0f2fe !important;
    /* sky-100 */
  }
  
  .highlight-cell {
    background-color: #fde68a !important;
    /* amber-200 */
    box-shadow: 0 0 0 2px #f59e42 inset;
    z-index: 2;
  }
  
  .dark .highlight-row {
    background-color: #78350f !important;
  }
  
  .dark .highlight-col {
    background-color: #0c4a6e !important;
  }
  
  .dark .highlight-cell {
    background-color: #b45309 !important;
    box-shadow: 0 0 0 2px #fbbf24 inset;
  }
  </style>
  