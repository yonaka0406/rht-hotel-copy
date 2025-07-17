<template>
  <div class="p-2 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
    <Panel header="" class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg dark:shadow-xl">
      <template #header>
        <div class="grid grid-cols-6 items-center">
          <p class="text-lg font-bold dark:text-gray-100">予約カレンダー</p>
          <div class="flex justify-start grid grid-cols-2 col-span-2 mr-4">
            <p class="mr-2 dark:text-gray-100">日付へ飛ぶ：</p>
            <InputText v-model="centerDate" 
                type="date"                
                fluid
                required 
                class="dark:bg-gray-800 dark:text-gray-100 rounded"
            />
          </div>
          <div class="flex grid grid-cols-5 col-span-2">            
            <div v-for="(legendItem, index) in uniqueLegendItems"
              :key="index" 
              class="flex items-center text-sm rounded mr-1 font-bold justify-center" 
              style="overflow: hidden; text-overflow: ellipsis" 
              :style="{ backgroundColor: `${legendItem.plan_color}` }"
              v-tooltip="legendItem.plan_name"
            >
              <span>{{ legendItem.plan_name }}</span>              
            </div>
          </div>
          <div class="flex justify-end">            
              <SelectButton 
                optionLabel="label"
                optionValue="value"  
                :options="tableModeOptions" 
                v-model="isCompactView"
                class="dark:bg-gray-800 dark:text-gray-100"
              />            
          </div>          
        </div>
      </template>
      
      <div 
        class="table-container bg-white dark:bg-gray-900"
        :class="{ 'compact-view': isCompactView }"
        ref="tableContainer" 
        @scroll="onScroll"
      >
        <table 
          class="table-auto w-full mb-2"
          @dragover.prevent
          @contextmenu.prevent="showContextMenu($event)"
        >
          <thead>
            <tr>              
              <th class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky top-0 left-0 z-20">日付</th>

              <th
                v-for="(room, roomIndex) in selectedHotelRooms"
                :key="roomIndex"
                class="px-2 py-2 text-center bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky top-0 z-10"
              > 
                  {{ room.room_type_name }} <br/>
                  <span class="text-lg">{{ room.room_number }}</span>
              </th>
            </tr>
          </thead>
          <tbody @dragover.prevent>
            <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex">
              <td class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky left-0 z-10">                
                <span class="text-xs dark:text-gray-100">{{ formatDateWithDay(date) }}</span>  
                
                <div 
                  class="text-2xs text-gray-500 flex justify-center"
                  :class="{
                    'text-red-400': availableRoomsByDate[date] === 0,
                    'dark:text-gray-400': availableRoomsByDate[date] !== 0
                  }"
                >
                  空室: {{ availableRoomsByDate[date] }}
                </div>                
                
              </td>
              <td
                v-for="(room, roomIndex) in selectedHotelRooms"
                :key="roomIndex"
                @dblclick="handleCellClick(room, date)"
                @dragstart="handleDragStart($event, room.room_id, date)"                
                @dragend="endDrag()"
                @dragover.prevent
                @dragenter="highlightDropZone($event, room.room_id, date)"
                @dragleave="removeHighlight($event, room.room_id, date)"
                @drop="handleDrop($event, room.room_id, date)"
                draggable="true"                
                :style="getCellStyle(room.room_id, date, dragMode === 'reorganizeRooms')"
                :class="[
                  'px-2 py-2 text-center text-xs max-h-0 aspect-square w-32 h-16 text-ellipsis border b-4 cell-with-hover',
                  isCellFirst(room.room_id, date, dragMode === 'reorganizeRooms') ? 'cell-first' : '',
                  isCellLast(room.room_id, date, dragMode === 'reorganizeRooms') ? 'cell-last' : '',
                  'cursor-pointer',
                  isCompactView ? 'compact-cell' : '',
                  isSelectedRoomByDay(room.room_id, date) ? 'selected-room-by-day' : '',
                  !isRoomReserved(room.room_id, date, dragMode === 'reorganizeRooms') ? 'dark:bg-gray-800 dark:text-gray-100' : ''
                ]"
                @mouseover="applyHover(roomIndex, dateIndex)"
                @mouseleave="removeHover(roomIndex, dateIndex)"
              >                
                <div v-if="isLoading && !isRoomReserved(room.room_id, date, dragMode === 'reorganizeRooms')">
                  <Skeleton class="mb-2 dark:bg-gray-700"></Skeleton>
                </div> 
                <div v-else>
                  <div v-if="isRoomReserved(room.room_id, date, dragMode === 'reorganizeRooms')" class="flex items-center">
                    <div>
                      <template v-if="fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').status === 'hold'">
                        <i class="pi pi-pause bg-yellow-100 p-1 rounded dark:bg-yellow-800"></i>
                      </template>
                      <template v-if="fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').status === 'provisory'">
                        <i class="pi pi-clock bg-cyan-200 p-1 rounded dark:bg-cyan-800"></i>                        
                      </template>
                      <template v-if="fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').status === 'confirmed'">
                        <i class="pi pi-check-circle bg-sky-300 p-1 rounded dark:bg-sky-800"></i>                        
                      </template>
                      <template v-if="fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').status === 'checked_in'">
                        <i class="pi pi-user bg-green-400 p-1 rounded dark:bg-green-800"></i>                        
                      </template>
                      <template v-if="fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').status === 'checked_out'">
                        <i class="pi pi-sign-out bg-gray-300 p-1 rounded dark:bg-gray-700"></i>                        
                      </template>
                      <template v-if="fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').status === 'block'">
                        <i class="pi pi-times bg-red-100 p-1 rounded dark:bg-red-800"></i>                        
                      </template>
                    </div>
                    <div class="ml-1 dark:text-gray-100">
                      {{ fillRoomInfo(room.room_id, date, dragMode === 'reorganizeRooms').client_name || '予約情報あり' }}
                    </div>
                  </div>
                  <div v-else>
                    <i class="pi pi-circle"></i> <span class="dark:text-gray-100">空室</span>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <template #footer>
        <span class="mr-4 dark:text-gray-100">編集モード：{{ dragModeLabel }}</span>
        <Button v-if="dragMode === 'reorganizeRooms' && hasChanges" @click="applyReorganization" class="dark:bg-gray-800 dark:text-gray-100">変更適用</Button>
        <!-- Legend Row -->
        <Fieldset legend="アイコン凡例" class="mt-2 text-xs dark:text-gray-100">
          <div class="flex flex-wrap items-center gap-4">
            <span class="flex items-center gap-1"><i class="pi pi-pause bg-yellow-100 p-1 rounded dark:bg-yellow-800"></i>保留中（仮押さえ）</span>
            <span class="flex items-center gap-1"><i class="pi pi-clock bg-cyan-200 p-1 rounded dark:bg-cyan-800"></i>仮予約</span>
            <span class="flex items-center gap-1"><i class="pi pi-check-circle bg-sky-300 p-1 rounded dark:bg-sky-800"></i>確定予約</span>
            <span class="flex items-center gap-1"><i class="pi pi-user bg-green-400 p-1 rounded dark:bg-green-800"></i>チェックイン済み</span>
            <span class="flex items-center gap-1"><i class="pi pi-sign-out bg-gray-300 p-1 rounded dark:bg-gray-700"></i>チェックアウト済み</span>
            <span class="flex items-center gap-1"><i class="pi pi-times bg-red-100 p-1 rounded dark:bg-red-800"></i>ブロック</span>
            <span class="flex items-center gap-1"><i class="pi pi-circle"></i>空室</span>
          </div>
        </Fieldset>
      </template>
    </Panel>  
        
    <div 
      v-if="reservationCardData.length > 0 && !reservationCardVisible"
      
      :style="{ position: 'absolute', right: '3rem', bottom: '5rem' }"
    >
      <OverlayBadge :value="reservationCardData.length" severity="danger">    
        <Button severity="info" @click="reservationCardVisible = true" rounded  >
          <i class="pi pi-calendar" />
        </Button>                          
      </OverlayBadge>
    </div>
    
    <div       
      :style="{ position: 'absolute', right: '3rem', bottom: '1rem' }"
    >
      <SpeedDial
        :model="speedDialModel"
        direction="left"        
        :tooltipOptions="{ position: 'top' }"      
      />
      <ContextMenu ref="cm" :model="contextMenuModel" />
    </div>

    <Drawer v-model:visible="drawerVisible":modal="true":position="'bottom'":style="{height: '75vh'}":closable="true">
      <div v-if="reservationId">
        <div class="flex justify-end">
          <Button @click="goToReservation" severity="info">
            <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
          </Button>
        </div>
        <ReservationEdit        
          :reservation_id="reservationId"
          :room_id="selectedRoom.room_id"        
        />
      </div>
      
      <ReservationAddRoom
        v-else
        :room_id="selectedRoom.room_id"
        :date="selectedDate"
      />
    </Drawer>

    <Drawer v-model:visible="reservationCardVisible" 
      :modal="false"
      :position="'right'" 
      :style="{ width: isDrawerExpanded ? '400px' : '100px' }"
      :closable="false"   
      @mouseover="expandDrawer"
      @mouseleave="collapseDrawer"      
    >
      <div v-if="reservationCardData.length > 0" class="reservation-card">                
        <div
          v-for="reservationGroup in reservationCardData"
          :key="reservationGroup.reservation_id"          
          draggable="true"
          @dragstart="handleCardDragStart($event, reservationGroup)"
          :class="{ 'expanded': isDrawerExpanded }"
        >
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

  import ReservationEdit from './ReservationEdit.vue';
  import ReservationAddRoom from './components/ReservationAddRoom.vue';

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
  const { selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();  
  import { useReservationStore } from '@/composables/useReservationStore';
  const { reservationDetails, reservedRooms, fetchReservedRooms, fetchReservation, reservationId, setReservationId, setCalendarChange, setCalendarFreeChange, setReservationRoom } = useReservationStore();
  import { useUserStore } from '@/composables/useUserStore';
  const { logged_user } = useUserStore();

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
  const goToReservation = () => {
    router.push({ name: 'ReservationEdit', params: { reservation_id: reservationId.value } });
  }
      
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
    legendItems.push({ plan_name: '社員', plan_color: '#f1bfce' });
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

  // Fetch reserved rooms data
  const tempReservations = ref(null); 
  const fetchReservations = async (startDate, endDate) => {
    try {
      if(!startDate && !endDate){
        // console.log('Dates undefined');
        return
      }

      await fetchReservedRooms(
        selectedHotelId.value,
        startDate,
        endDate
      );
      // console.log('reservedRooms:', reservedRooms.value);
      tempReservations.value = reservedRooms.value;
    } catch (error) {
      console.error('Error fetching reservations:', error);
    }
  };

  // Hash map for faster lookups
  const reservedRoomsMap = computed(() => {
      const map = {};
      reservedRooms.value.forEach(reservation => {
          const key = `${reservation.room_id}_${formatDate(new Date(reservation.date))}`;
          map[key] = reservation;
      });
      return map;
  });
  const tempReservationsMap = computed(() => {
      const map = {};      
      tempReservations.value.forEach(reservation => {
          const key = `${reservation.room_id}_${formatDate(new Date(reservation.date))}`;
          map[key] = reservation;
      });
      return map;
  });

  // Count of available rooms
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

  // Fill & Format the table 
  const isRoomReserved = (roomId, date, useTemp = false) => {
    const key = `${roomId}_${date}`;        
    return useTemp ? !!tempReservationsMap.value[key] : !!reservedRoomsMap.value[key];
  };
  const fillRoomInfo = (room_id, date, useTemp = false) => {
    const key = `${room_id}_${date}`;
    return useTemp ? tempReservationsMap.value[key] || { status: 'available', client_name: '', reservation_id: null } : reservedRoomsMap.value[key] || { status: 'available', client_name: '', reservation_id: null };
  };
  const getCellStyle = (room_id, date, useTemp = false) => {
    const roomInfo = fillRoomInfo(room_id, date, dragMode.value === 'reorganizeRooms');
    let roomColor = '#d3063d';
    let style = {};

    if (roomInfo && roomInfo.status === 'provisory') {
      roomColor = '#ead59f';
      style = { backgroundColor: `${roomColor}` };
    } else if (roomInfo && roomInfo.type === 'employee') {
      roomColor = '#f1bfce';
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

    if (useTemp) {
        const originalReservation = reservedRooms.value.find(r => r.room_id === room_id && formatDate(new Date(r.date)) === date);
        const tempReservation = tempReservations.value.find(r => r.room_id === room_id && formatDate(new Date(r.date)) === date);

        if (originalReservation?.id !== tempReservation?.id) {
            style.border = '2px solid red'; // Highlight modified cells
        }
    }
    
    return style;    
  };
  const firstCellMap = computed(() => {
      const firstMap = {};
      reservedRooms.value.forEach(room => {
          const checkInKey = `${room.room_id}_${formatDate(new Date(room.check_in))}`;
          firstMap[checkInKey] = true;
      });
      return firstMap;
  });
  const lastCellMap = computed(() => {
      const lastMap = {};
      reservedRooms.value.forEach(room => {
          const checkOutKey = `${room.room_id}_${formatDate(new Date(new Date(room.check_out).setDate(new Date(room.check_out).getDate() - 1)))}`;
          lastMap[checkOutKey] = true;
      });
      return lastMap;
  });
  const firstCellTempMap = computed(() => {
      const firstMap = {};
      tempReservations.value.forEach(room => {
          const checkInKey = `${room.room_id}_${formatDate(new Date(room.check_in))}`;
          firstMap[checkInKey] = true;
      });
      return firstMap;
  });
  const lastCellTempMap = computed(() => {
      const lastMap = {};
      tempReservations.value.forEach(room => {
          const checkOutKey = `${room.room_id}_${formatDate(new Date(new Date(room.check_out).setDate(new Date(room.check_out).getDate() - 1)))}`;
          lastMap[checkOutKey] = true;
      });
      return lastMap;
  });
  const isCellFirst = (room_id, date, useTemp = false) => {
      const key = `${room_id}_${date}`;
      return useTemp ? !!firstCellTempMap.value[key] : !!firstCellMap.value[key];
  };
  const isCellLast = (room_id, date, useTemp = false) => {
      const key = `${room_id}_${date}`;
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
      
  // Drawer
  const drawerVisible = ref(false);
  const selectedRoom = ref(null);
  const selectedDate = ref(null);
  const openDrawer = (roomId, date) => {
    // Check for CRUD permissions before opening the drawer for a new reservation
    if (!fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').reservation_id) {
      if (!logged_user.value || !logged_user.value.length || logged_user.value[0]?.permissions?.crud_ok !== true) {
        toast.add({ severity: 'warn', summary: '権限エラー', detail: '予約作成の権限がありません。', life: 3000 });
        return;
      }
    }

    isUpdating.value = true; // Disable WebSocket updates
    selectedRoom.value = selectedHotelRooms.value.find(room => room.room_id === roomId);
    selectedDate.value = date;

    if (selectedRoom.value) {
      if(!fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').reservation_id) {
        setReservationId(null);
        drawerVisible.value = true;
      } else {            
        setReservationId(fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').reservation_id);
        drawerVisible.value = true;
      }
    } else {
      
    }
    
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
  const dragMode = ref('reservation');
  const dragModeLabel = computed(() => {
    switch (dragMode.value) {
      case 'reservation':
        return '予約移動';
      case 'roomByDay':
        return '日ごとに部屋移動';
      case 'reorganizeRooms':
        return 'フリー移動';
      default:
        return '不明なモード';
    }
  });
  const cm = ref(null);
  const speedDialModel = ref([
    {
      label: '予約移動',
      icon: 'pi pi-address-book',
      command: () => (dragMode.value = 'reservation'),
    },
    {
      label: '日ごとに部屋移動',
      icon: 'pi pi-calendar',
      command: () => (dragMode.value = 'roomByDay'),
    },
    {
      label: 'フリー移動',
      icon: 'pi pi-arrows-alt',
      command: () => (dragMode.value = 'reorganizeRooms'),
    },
  ]);
  const contextMenuModel = ref(speedDialModel.value);
  const showContextMenu = (event) => {
    cm.value.show(event);
  };
  const handleCellClick = async (room, date) => {
    const key = `${room.room_id}_${date}`;

    if(dragMode.value === 'reservation'){
      openDrawer(room.room_id, date);
    }
    else if (dragMode.value === 'roomByDay') {
      if (reservedRoomsMap.value[key]) {
          const index = selectedRoomByDay.value.findIndex(item => item.key === key);
          // console.log('selectedRoomByDay.value.length', selectedRoomByDay.value.length)
          if (index === -1) {
              if (selectedRoomByDay.value.length === 0 || isContiguous(selectedRoomByDay.value, key)) {
                  selectedRoomByDay.value.push({ key: key, reservation: reservedRoomsMap.value[key] });
              } else {
                  selectedRoomByDay.value = [{ key: key, reservation: reservedRoomsMap.value[key] }];
              }
          } else if (index !== -1) { 
              // console.log('splice');
              selectedRoomByDay.value.splice(index, 1);
          } 
      } else {        
          if (selectedRoomByDay.value.length > 0) {   
            // console.log(selectedRoomByDay.value[0].reservation.room_number)
            // console.log('areSelectedDatesAvailableInRoom', areSelectedDatesAvailableInRoom(room.room_id));
            formattedMessage.value = `
              <b>${selectedRoomByDay.value[0].reservation.room_number}号室</b>の予約を<br/>
              <b>${room.room_number}号室</b>に移動しますか?<br/>
              <p><b>対象期間：</b></p>
              ${formatDate(new Date(selectedRoomByDayDateRange.value.minDate))}～
              ${formatDate(new Date(selectedRoomByDayDateRange.value.maxDate))}              
            `;
            confirmRoomMode.require({
              group: 'templating',
              header: '日ごと移動確認',
              icon: 'pi pi-exclamation-triangle',
              acceptProps: {
                  label: 'はい'
              },
              accept: async () => {
                  isUpdating.value = true;
                  for (const item of selectedRoomByDay.value) {
                      await setReservationRoom(item.reservation.id, room.room_id);
                  }                  
                  selectedRoomByDay.value = [];
                  isUpdating.value = false;
                  await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
                  confirmRoomMode.close('templating');
              },
              rejectProps: {
                  label: 'キャンセル',
                  severity: 'secondary',
                  outlined: true
              },
              reject: () => {
                  // Cancel action
                  confirmRoomMode.close('templating');
              }
            });              
          }
      }
      // console.log('handleCellClick:', selectedRoomByDay.value);
    } 
    else if (dragMode.value === 'reorganizeRooms') {
      if (tempReservationsMap.value[key]) {
        // Get the clicked reservation
        const clickedReservation = tempReservationsMap.value[key];
        const clickedRoomId = room.room_id;

        // Filter reservations with the same reservation_id and matching room_id
        const reservationsToMove = tempReservations.value.filter(
          (item) => item.reservation_id === clickedReservation.reservation_id && item.room_id === clickedRoomId
        );

        // Create the details object
        if (reservationsToMove.length > 0) {
          const { reservation_id, check_in, check_out, client_name, room_number } = reservationsToMove[0];
          reservationCardData.value.push({
              reservation_id,
              check_in,
              check_out,
              client_name,
              room_number,
              details: reservationsToMove
          });
        }

        // Remove the moved reservations from tempReservations
        tempReservations.value = tempReservations.value.filter(
          (item) => item.reservation_id !== clickedReservation.reservation_id || item.room_id !== clickedRoomId
        );
        hasChanges.value = true;

        showReservationCard();

        console.log('handleCellClick tempReservations:', tempReservations.value);        
      }
    }
  };
  const handleDragStart = (event, roomId, date) => {
    if (dragMode.value === 'reservation') {
      onDragStart(event, roomId, date);
      startDrag(event, roomId, date);
    } else if (dragMode.value === 'reorganizeRooms') {      
      startDrag(event, roomId, date);
    }
  };
  const handleDrop = (event, roomId, date) => {
    // console.log('handleDrop')
    if (dragMode.value === 'reservation') {
      onDrop(event, roomId, date);
    } else if (dragMode.value === 'roomByDay') {
      if (selectedRoomByDay.value.length > 0) {
        // API call to move selected dates
        // console.log('API call to move dates:', selectedRoomByDay.value, 'to room:', roomId);
        selectedRoomByDay.value = [];
      }
    } else if (dragMode.value === 'reorganizeRooms') {
      const key = `${draggingRoomId.value}_${draggingDate.value}`;
      
      // Check if this is a drop from the reservation card
      if (reservationCardData.value && !reservationCardVisible.value) {
        console.log('handleDrop from the reservation card');

        const reservation = selectedCellReservations.value;        
        const originalDetails = reservation.details;
        let minDate = originalDetails.length > 0 ? new Date(originalDetails[0].date) : null;
        for (let i = 1; i < originalDetails.length; i++) {
            const currentDate = new Date(originalDetails[i].date);
            if (currentDate < minDate) {
                minDate = currentDate;
            }
        }


        // Check for conflicts before adding to tempReservations
        let hasConflicts = false;
        for (const detail of originalDetails) {
            const detailDate = formatDate(new Date(detail.date));
            const conflictKey = `${roomId}_${detailDate}`;
            if (tempReservationsMap.value[conflictKey]) {
                hasConflicts = true;
                break;
            }
        }
        console.log('hasConflicts:', hasConflicts);
        if (!hasConflicts) {
            originalDetails.forEach(detail => {
                const updatedDetail = { ...detail };
                                
                updatedDetail.room_id = roomId;
                
                // Calculate new date based on drop
                const dateDiff = new Date(date) - new Date(minDate);
                const newDetailDate = new Date(detail.date);
                console.log('newDetailDate:', newDetailDate, 'dateDiff:', dateDiff);
                newDetailDate.setDate(newDetailDate.getDate() + dateDiff / (1000 * 60 * 60 * 24));
                console.log('newDetailDate:', newDetailDate);
                updatedDetail.date = formatDate(newDetailDate);
                updatedDetail.check_in = formatDate(new Date(new Date(updatedDetail.check_in).setDate(new Date(updatedDetail.check_in).getDate() + dateDiff / (1000 * 60 * 60 * 24))));
                updatedDetail.check_out = formatDate(new Date(new Date(updatedDetail.check_out).setDate(new Date(updatedDetail.check_out).getDate() + dateDiff / (1000 * 60 * 60 * 24))));
                tempReservations.value.push(updatedDetail);
                console.log('push tempReservations:', updatedDetail);

                // Remove existing item in tempRoomData if it already exists
                const existingItemIndex = tempRoomData.value.findIndex(item => item.id === updatedDetail.id);
                if (existingItemIndex !== -1) {
                    tempRoomData.value.splice(existingItemIndex, 1); // Remove the existing item
                }

                // Store changed data
                tempRoomData.value.push(updatedDetail);
                
            });
            hasChanges.value = true;
        } else {
            toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。', life: 2000 });
            setTimeout(() => {
                reservationCardVisible.value = true;
            }, 2000);            
            return;
        }
                        
        // Remove the processed reservation from reservationCardData
        const reservationIndex = reservationCardData.value.findIndex(
            (item) => item.reservation_id === reservation.reservation_id && item.room_id === reservation.room_id
        );
        if (reservationIndex !== -1) {
            reservationCardData.value.splice(reservationIndex, 1);
        }     
        selectedCellReservations.value = [];
        if (reservationCardData.value.length === 0) {
            reservationCardVisible.value = false;
        } else {
            reservationCardVisible.value = true;
        }        

      } else if (tempReservationsMap.value[key]) {
          // Update the reservation in tempReservations
          const reservation = tempReservationsMap.value[key];
          const reservationIdToUpdate = reservation.reservation_id;
          const originalRoomId = reservation.room_id;
          // Create Sets
          const updatedDates = new Set();
          const updatedReservationIds = new Set();
          
          tempReservations.value = tempReservations.value.map(item => {            
            if (item.reservation_id === reservationIdToUpdate && item.room_id === originalRoomId) {
                const updatedItem = { ...item };
                updatedItem.room_id = roomId;
                const dateDiff = new Date(date) - new Date(draggingDate.value);
                updatedItem.check_in = formatDate(new Date(new Date(updatedItem.check_in).setDate(new Date(updatedItem.check_in).getDate() + dateDiff / (1000 * 60 * 60 * 24))));
                updatedItem.check_out = formatDate(new Date(new Date(updatedItem.check_out).setDate(new Date(updatedItem.check_out).getDate() + dateDiff / (1000 * 60 * 60 * 24))));
                updatedItem.date = formatDate(new Date(new Date(updatedItem.date).setDate(new Date(updatedItem.date).getDate() + dateDiff / (1000 * 60 * 60 * 24))));

                // Store all updated dates & reservation IDs
                updatedDates.add(updatedItem.date);
                updatedReservationIds.add(updatedItem.reservation_id);

                // Remove existing item in tempRoomData if it already exists
                const existingItemIndex = tempRoomData.value.findIndex(item => item.id === updatedItem.id);
                if (existingItemIndex !== -1) {
                    tempRoomData.value.splice(existingItemIndex, 1); // Remove the existing item
                }

                // Store changed data
                tempRoomData.value.push(updatedItem);
                                
                return updatedItem;
            }
            return item;
          });

          // Loop through updated dates and update reservations
          updatedDates.forEach(updatedDate => {
              tempReservations.value = tempReservations.value.map(innerItem => {
                  if (innerItem.room_id === roomId && formatDate(new Date(innerItem.date)) === updatedDate && !updatedReservationIds.has(innerItem.reservation_id)) {
                      // console.log("Should move", innerItem.client_name, 'from', innerItem.room_id, 'to', draggingRoomId.value);
                      const swappedItem = { ...innerItem, room_id: draggingRoomId.value };

                      // Remove existing item in tempRoomData if it already exists
                      const existingSwappedItemIndex = tempRoomData.value.findIndex(item => item.id === swappedItem.id);
                      if (existingSwappedItemIndex !== -1) {
                          tempRoomData.value.splice(existingSwappedItemIndex, 1); // Remove the existing item
                      }
            
                      // Store changed data
                      tempRoomData.value.push(swappedItem);

                      return swappedItem;
                  }
                  return innerItem;
              });
          });
                    
          // Reorder tempReservations based on check-in date and room number
          tempReservations.value.sort((a, b) => {
              const dateA = new Date(a.check_in);
              const dateB = new Date(b.check_in);
              if (dateA - dateB === 0) {
                  return a.room_number - b.room_number;
              }
              return dateA - dateB;
          });

          hasChanges.value = true;
      }      
    }

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
  const startDrag = (event, roomId, date) => {
    // console.log('startDrag')
    const reservation = fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms');
    if (reservation.reservation_id) {
      draggingReservation.value = true;
      draggingRoomId.value = roomId;
      draggingDate.value = date;
      draggingCheckIn.value = new Date(reservation.check_in);
      draggingCheckOut.value = new Date(reservation.check_out);
      draggingRoomNumber.value = reservation.room_number;

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
  const onDragStart = async (event, roomId, date) => {
    // console.log('onDragStart')
    dragFrom.value = null;
    
    const reservation_id = fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').reservation_id;
        
    if(reservation_id){      
      const check_in = formatDate(new Date(fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').check_in));
      const check_out = formatDate(new Date(fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').check_out));
      const room_id = fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').room_id;
      const room_number = fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').room_number;
      const room_type_name = fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').room_type_name;
      const number_of_people = fillRoomInfo(roomId, date, dragMode.value === 'reorganizeRooms').number_of_people;
      const days = Math.floor((new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24));
      dragFrom.value = { reservation_id, room_id, room_number, room_type_name, number_of_people, check_in, check_out, days };

      const reservationData = await fetchReservation(reservation_id);    
      
      // console.log('dragFrom',dragFrom.value)
    }else{
      return;
    }        
    
  };
  const onDrop = (event, roomId, date) => {        
    // console.log('Drop');
    if(!dragFrom.value){
      return;
    }
    const selectedRoom = selectedHotelRooms.value.find(room => room.room_id === roomId);    
    const check_in = formatDate(new Date(date));
    const check_out = formatDate(new Date(new Date(date).setDate(new Date(date).getDate() + dragFrom.value.days)));        
    const room_id = selectedRoom.room_id;
    const room_number = selectedRoom.room_number;
    const room_type_name = selectedRoom.room_type_name;
    const capacity = selectedRoom.room_capacity;
    dragTo.value = { room_id, room_number, room_type_name, capacity, check_in, check_out };
    
    const from = dragFrom.value;
    const to = dragTo.value;

    // isRoomFullyBooked
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
    // Filter reservations that match the given reservation_id and room_id
    const roomReservations = reservedRooms.value.filter(
      room => room.reservation_id === from.reservation_id && room.room_id === from.room_id
    );
    // Extract booked dates from filtered reservations
    const bookedDates = roomReservations.map(room => formatDate(new Date(room.date)));
    const isRoomFullyBooked = allDates.every(date => bookedDates.includes(date));

    if(!isRoomFullyBooked){
      toast.add({ severity: 'warn', summary: '注意', detail: '部屋が分割されています。日ごとに部屋移動モードで変更を行ってください。' , life: 3000 });
    } else if(from.number_of_people > to.capacity){
      toast.add({ severity: 'error', summary: 'エラー', detail: '人数が収容人数を超えています。' , life: 3000 });
    } else if(!checkForConflicts(from, to)){
      showConfirmationPrompt();
    } else {
      // console.log('Conflict found');
      toast.add({ severity: 'error', summary: 'エラー', detail: '予約が重複しています。' , life: 3000 });
    }        
  };      
  const formattedMessage = ref('');
  const showConfirmationPrompt = async () => {
    const from = dragFrom.value;
    const to = dragTo.value;
    let message = '';
    if (from.room_number === to.room_number) {
      message = `
        <b>${from.room_number}号室</b>の宿泊期間を<br/>
        「IN：${from.check_in} OUT：${from.check_out}」から<br/>
        「IN：${to.check_in} OUT：${to.check_out}」にしますか?<br/>`;
    } else if (from.check_in === to.check_in && from.check_out === to.check_out) {
      message = `
        <b>${from.room_number}号室</b>の予約を<br/>
        <b>${to.room_number}号室</b>に移動しますか?<br/>`;
    } else {
      message = `
        <b>${from.room_number}号室</b>の宿泊期間を<br/>
        「IN：${from.check_in} OUT：${from.check_out}」から<br/>
        「IN：${to.check_in} OUT：${to.check_out}」に変更し、<br/>
        <b>${to.room_number}号室</b>に移動しますか?<br/>`;
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
          await setCalendarChange(from.reservation_id, from.check_in, from.check_out, to.check_in, to.check_out, from.room_id, to.room_id, from.number_of_people, 'solo');
          await setReservationId(null);
          isUpdating.value = false; // Re-enable WebSocket updates
          await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
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

    // console.log('No conflicts found');
    return false;
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
      await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
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
      await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);      

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
  watch(drawerVisible, async (newVal, oldVal) => {
    if (newVal === false) {          
      // console.log('Edit drawer became false');
      isUpdating.value = false;
      await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    }
  });
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
  watch(dragMode, async (newVal, oldVal) => {
    selectedRoomByDay.value = [];
    tempRoomData.value = [];
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
    // console.log(newVal);
  }) 

</script>

<style scoped> 
  .overflow-x-auto {
    overflow-x: auto;
    max-width: 100%;
  }

  .table-container {
    width: 100%;
    height: calc(100vh - 180px);
    overflow-y: scroll;
    max-width: 100%;    
    position: relative;    
  }

  th, td {
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
  th:last-child, td:last-child {
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

  /* Compact Mode */
  .compact-view th, 
  .compact-view td {
    padding: 4px 6px;
    min-width: 20px; /* Adjust as needed */
    max-width: 100px;
    font-size: 10px;
  }
  .compact-cell {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;    
    height: 10px; /* Adjust height */
    width: 20px;  /* Adjust width */
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
    background-color: #fef9c3 !important; /* yellow-100, matches .highlight-row */
    color: #92400e !important;
    font-weight: bold;
    transition: background-color 0.2s;
  }
  .dark .title-cell-highlight {
    background-color: #78350f !important; /* matches .dark .highlight-row */
    color: #fef3c7 !important;
  }
  /* Blue highlight for first row (rooms) */
  thead th.title-cell-highlight {
    background-color: #e0f2fe !important; /* sky-100, matches .highlight-col */
    color: #0c4a6e !important;
  }
  .dark thead th.title-cell-highlight {
    background-color: #0c4a6e !important; /* matches .dark .highlight-col */
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
    background-color: #fafafa;
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
  background-color: #fef9c3 !important; /* yellow-100 */
}
.highlight-col {
  background-color: #e0f2fe !important; /* sky-100 */
}
.highlight-cell {
  background-color: #fde68a !important; /* amber-200 */
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