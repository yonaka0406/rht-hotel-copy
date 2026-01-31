<template>
  <div class="p-2 bg-white dark:bg-gray-900 dark:text-gray-100 min-h-screen">
    <Panel header="" class="bg-white dark:bg-gray-900 dark:text-gray-100 rounded-xl shadow-lg dark:shadow-xl">
      <template #header>
        <ReservationsCalendarHeader
          v-model="headerState"
          :legend-items="uniqueLegendItems"
          :hotel-name="selectedHotel ? selectedHotel.name : ''"
        />
      </template>

      <div class="table-container bg-white dark:bg-gray-900" :class="{ 'compact-view': headerState.isCompactView }"
        ref="tableContainer" @scroll="onScroll">
        <table class="table-auto w-full mb-2" @dragover.prevent>
          <thead>
            <tr>
              <th
                class="px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky top-0 left-0 z-20">
                日付</th>

              <th v-for="(room, roomIndex) in selectedHotelRooms" :key="roomIndex"
                :class="['px-2 py-2 text-center bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky top-0 z-10', { 'title-cell-highlight': hoveredCol === roomIndex }]">
                {{ room.room_type_name }} <br />
                <div class="flex justify-center items-center gap-1">
                  <span v-if="room.room_smoking_idc">🚬</span>
                  <span v-if="room.room_has_wet_area_idc">🚿</span>
                  <span v-if="room.room_capacity > 1" class="capacity-badge">{{ room.room_capacity }}</span>
                </div>
                <span class="text-lg">{{ room.room_number }}</span>
              </th>
            </tr>
          </thead>
          <tbody @dragover.prevent>
            <tr v-for="(date, dateIndex) in dateRange" :key="dateIndex" :class="{ 'row-is-pinned': dateIndex === pinnedRowIndex }">

              <td
                @click="pinRow(dateIndex)"
                :class="['cursor-pointer px-2 py-2 text-center font-bold bg-white dark:bg-gray-800 dark:text-gray-100 aspect-square w-32 h-16 sticky left-0 z-10', { 'title-cell-highlight': hoveredRow === dateIndex }]">

                <span class="text-xs dark:text-gray-100">{{ formatDateWithDay(date) }}</span>

                <div class="text-2xs text-gray-500 flex justify-center" :class="{
                  'text-red-400': availableRoomsByDate[date] === 0,
                  'dark:text-gray-400': availableRoomsByDate[date] !== 0
                }">
                  空室: {{ availableRoomsByDate[date] }}
                </div>

              </td>
              <ReservationsCalendarCell
                v-for="(room, roomIndex) in selectedHotelRooms"
                :key="roomIndex"
                :room="room"
                :date="date"
                :reservation-info="getReservationForCell(room.room_id, date)"
                :is-compact="headerState.isCompactView"
                :is-selected="isSelectedRoomByDay(room.room_id, date)"
                :is-loading="isLoading"
                :is-modified="isCellModified(room.room_id, date)"
                :class="{
                  'highlight-row': hoveredRow === dateIndex,
                  'highlight-col': hoveredCol === roomIndex,
                  'highlight-cell': hoveredRow === dateIndex && hoveredCol === roomIndex
                }"
                @dblclick="handleCellClick(room, date)"
                @dragstart="handleDragStart($event, room.room_id, date, getReservationForCell)"
                @dragend="endDrag()"
                @dragenter="highlightDropZone($event)"
                @dragleave="removeHighlight($event)"
                @drop="handleDrop($event, room.room_id, date)"
                @contextmenu="showContextMenu($event, room, date)"
                @mouseover="setHover(dateIndex, roomIndex)"
                @mouseleave="clearHover()"
              />
            </tr>
          </tbody>
        </table>
      </div>

      <template #footer>
        <span class="mr-4 dark:text-gray-100">編集モード：{{ dragModeLabel }}</span>
        <Button v-if="dragMode === 'reorganizeRooms' && hasChanges" @click="applyReorganization"
          class="dark:bg-gray-800 dark:text-gray-100">変更適用</Button>
        <ReservationsCalendarLegend />
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

    <div :style="{ position: 'absolute', right: '4.5rem', bottom: '1.5rem' }">
      <SpeedDial :model="speedDialModel" direction="left" :tooltipOptions="{ position: 'top' }" />
      <ContextMenu ref="cm" :model="contextMenuModel" />
    </div>

    <Drawer v-model:visible="drawerVisible" :modal="true" :position="'bottom'" :style="{ height: '75vh' }"
      :closable="true">
      <div v-if="reservationId">
        <div class="flex justify-end">
          <Button @click="goToReservation" severity="info">
            <i class="pi pi-arrow-right"></i><span>編集ページへ</span>
          </Button>
        </div>
        <ReservationEdit :reservation_id="reservationId" :room_id="selectedRoom?.room_id" />

        <Button v-if="isTempBlock" label="仮ブロック解除" icon="pi pi-unlock" @click="removeTempBlock" severity="danger" class="ml-2 mr-4" />
        <Button v-if="isTempBlock" label="予約追加へ進む" icon="pi pi-check" @click="openClientDialog" severity="success" />
      </div>

      <ReservationAddRoom v-else :room_id="selectedRoom?.room_id" :date="selectedDate" @temp-block-close="handleTempBlock" />

      <ClientForReservationDialog
        v-model="showClientDialog"
        :client="currentClient"
        :reservation-details="reservationDetails"
        @save="handleClientSave"
        @close="showClientDialog = false"
      />
    </Drawer>

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
import { ref, computed, watch, onMounted, nextTick, onUnmounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

// Utils
import { formatDate, formatDateWithDay } from '@/utils/dateUtils';
import { formatClientName, SPECIAL_BLOCK_CLIENT_ID } from '@/utils/reservationUtils';

// Components
const ReservationEdit = defineAsyncComponent(() => import('../Reservation/ReservationEdit.vue'));
const ReservationAddRoom = defineAsyncComponent(() => import('../components/ReservationAddRoom.vue'));
const ClientForReservationDialog = defineAsyncComponent(() => import('../components/Dialogs/ClientForReservationDialog.vue'));
import ReservationsCalendarHeader from './components/ReservationsCalendarHeader.vue';
import ReservationsCalendarLegend from './components/ReservationsCalendarLegend.vue';
import ReservationsCalendarCell from './components/ReservationsCalendarCell.vue';

// Composables
import { useDateRange } from './useDateRange';
import { useDragDrop } from './useDragDrop';

//Websocket
import { useSocket } from '@/composables/useSocket';
const { socket } = useSocket();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Panel, Drawer, Card, ConfirmDialog, SpeedDial, ContextMenu, Button, Badge, OverlayBadge } from 'primevue';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel, removeCalendarSettings, selectedHotel } = useHotelStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { reservationDetails, reservedRooms, fetchReservedRooms, fetchReservation, reservationId, setReservationId, setCalendarChange, setCalendarFreeChange, setReservationRoom, convertBlockToReservation } = useReservationStore();
import { useUserStore } from '@/composables/useUserStore';
const { logged_user } = useUserStore();

const goToReservation = () => {
  router.push({ name: 'ReservationEdit', params: { reservation_id: reservationId.value } });
}

// State
const headerState = ref({
  date: new Date().toISOString().split('T')[0],
  isCompactView: true
});
const isUpdating = ref(false);
const isLoading = ref(true);
const centerDate = ref(formatDate(new Date()));
const pinnedRowIndex = ref(null);

const hoveredRow = ref(null);
const hoveredCol = ref(null);

const setHover = (rowIndex, colIndex) => {
  hoveredRow.value = rowIndex;
  hoveredCol.value = colIndex;
};

const clearHover = () => {
  hoveredRow.value = null;
  hoveredCol.value = null;
};

const buildReservationMap = (reservations) => {
  const map = {};
  if (!reservations) return map;

  reservations.forEach(reservation => {
    const dateStr = formatDate(new Date(reservation.date));
    const key = `${reservation.room_id}_${dateStr}`;

    // Check if first/last
    const checkInDate = formatDate(new Date(reservation.check_in));
    const checkOutDate = new Date(reservation.check_out);
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    const lastDate = formatDate(checkOutDate);

    map[key] = {
      ...reservation,
      client_name: formatClientName(reservation.client_name),
      isFirst: dateStr === checkInDate,
      isLast: dateStr === lastDate
    };
  });
  return map;
};

const tempReservations = ref([]);
const hasChanges = ref(false);
const tempRoomData = ref([]);

// Hash map for faster lookups
const reservedRoomsMap = computed(() => buildReservationMap(reservedRooms.value));
const tempReservationsMap = computed(() => buildReservationMap(tempReservations.value));

const {
  dateRange,
  minDate,
  maxDate,
  generateDateRange,
  appendDaysToRange
} = useDateRange(selectedHotelId, fetchReservedRooms);

const dragMode = ref('reservation');

const {
  selectedRoomByDay,
  reservationCardData,
  reservationCardVisible,
  isDrawerExpanded,
  formattedMessage,
  expandDrawer,
  collapseDrawer,
  handleCardDragStart,
  handleDragStart,
  handleDrop,
  handleCellClick,
  applyReorganization,
  endDrag,
  highlightDropZone,
  removeHighlight
} = useDragDrop({
  reservedRooms,
  reservationDetails,
  selectedHotelRooms,
  reservedRoomsMap,
  tempReservationsMap,
  tempReservations,
  tempRoomData,
  hasChanges,
  dragMode,
  selectedHotelId,
  setReservationId,
  fetchReservation,
  setCalendarChange,
  setReservationRoom,
  setCalendarFreeChange,
  fetchReservations: async (start, end) => {
    await fetchReservedRooms(selectedHotelId.value, start, end);
    tempReservations.value = reservedRooms.value;
  },
  dateRange,
  isUpdating,
  openDrawer: (roomId, date) => openDrawer(roomId, date)
});

// Computed
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

const pinRow = (dateIndex) => {
  if (pinnedRowIndex.value === dateIndex) {
    pinnedRowIndex.value = null; // Unpin if the same row is clicked
  } else {
    pinnedRowIndex.value = dateIndex; // Pin the new row
  }
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
    tempReservations.value = reservedRooms.value;
  } catch (error) {
    console.error('Error fetching reservations:', error);
  }
};

// Count of available rooms
const availableRoomsByDate = computed(() => {
  const availability = {};
  const roomsForSale = selectedHotelRooms.value.filter(room => room.room_for_sale_idc === true);
  const totalRoomsForSaleCount = roomsForSale.length;
  const roomsForSaleIds = new Set(roomsForSale.map(room => room.room_id));

  // Initialize availability for each date in the range
  dateRange.value.forEach(date => {
    availability[date] = totalRoomsForSaleCount;
  });

  // Subtract reserved rooms that are currently in the map (non-cancelled and for sale)
  Object.keys(reservedRoomsMap.value).forEach(key => {
    const [roomId, date] = key.split('_');
    if (availability[date] !== undefined && roomsForSaleIds.has(Number(roomId))) {
      availability[date]--;
    }
  });

  return availability;
});

// Fill & Format the table
const getReservationForCell = (roomId, date) => {
  const key = `${roomId}_${date}`;
  const res = dragMode.value === 'reorganizeRooms' ? tempReservationsMap.value[key] : reservedRoomsMap.value[key];
  return res || { status: 'available', client_name: '', reservation_id: null };
};


const isCellModified = (roomId, date) => {
  if (dragMode.value !== 'reorganizeRooms') return false;
  const original = reservedRoomsMap.value[`${roomId}_${date}`];
  const temp = tempReservationsMap.value[`${roomId}_${date}`];
  return original?.id !== temp?.id;
};

// Drawer
const drawerVisible = ref(false);
const selectedRoom = ref(null);
const selectedDate = ref(null);
const openDrawer = (roomId, date) => {
  // Check for CRUD permissions before opening the drawer for a new reservation
  const res = getReservationForCell(roomId, date);
  if (!res.reservation_id) {
    if (!logged_user.value || !logged_user.value.length || logged_user.value[0]?.permissions?.crud_ok !== true) {
      toast.add({ severity: 'warn', summary: '権限エラー', detail: '予約作成の権限がありません。', life: 3000 });
      return;
    }
  }

  isUpdating.value = true; // Disable WebSocket updates
  selectedRoom.value = selectedHotelRooms.value.find(room => room.room_id === roomId);
  selectedDate.value = date;

  if (selectedRoom.value) {
    if (!res.reservation_id) {
      setReservationId(null);
      drawerVisible.value = true;
    } else {
      setReservationId(res.reservation_id);
      drawerVisible.value = true;
    }
  }

};

const dragModeLabel = computed(() => {
  switch (dragMode.value) {
    case 'reservation': return 'デフォルト';
    case 'roomByDay': return '日ごとに部屋移動';
    case 'reorganizeRooms': return 'フリー移動';
    default: return '不明なモード';
  }
});

const cm = ref(null);
const speedDialModel = ref([
  {
    label: 'デフォルト',
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
const contextMenuModel = ref([]);
const showContextMenu = (event, _room, _date) => {
  const menuItems = [
    {
      label: 'デフォルト',
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
    { separator: true }
  ];

  contextMenuModel.value = menuItems;
  cm.value.show(event);
};

const onScroll = () => {
  // Handle table scrolling if needed
};
let timeoutIdScroll = null;
const debounceScroll = (func, delay) => {
  return (...args) => {
    clearTimeout(timeoutIdScroll);
    timeoutIdScroll = setTimeout(() => func.apply(this, args), delay);
  };
};
const handleScroll = debounceScroll(async (event) => {
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

const handleTempBlock = (_data) => {
  drawerVisible.value = false;
};

const isTempBlock = computed(() => {
    const res = reservationDetails.value?.reservation?.[0];
    if(!res) return false;
    return res.client_id === SPECIAL_BLOCK_CLIENT_ID && res.status === 'block';
});

const removeTempBlock = async () => {
    try {
        await removeCalendarSettings(
            reservationDetails.value.reservation[0].reservation_id,
            reservationDetails.value.reservation[0].hotel_id
        );
        toast.add({ severity: 'success', summary: '成功', detail: '仮ブロックが削除されました。', life: 3000 });
        drawerVisible.value = false;
    } catch (error) {
        console.error('Error removing temporary block:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '仮ブロックの削除に失敗しました。', life: 3000 });
    }
};

// Dialogs
const showClientDialog = ref(false);
const currentClient = ref({});

const openClientDialog = () => {
    currentClient.value = null;
    const reservation = reservationDetails.value?.reservation?.[0];
    if (reservation) {
        reservationDetails.value = {
            ...reservationDetails.value,
            check_in: reservation.check_in,
            check_out: reservation.check_out,
            number_of_nights: calculateNights(new Date(reservation.check_in), new Date(reservation.check_out)),
            number_of_people: reservation.number_of_people || 1
        };
    }
    showClientDialog.value = true;
};

const calculateNights = (checkIn, checkOut) => {
    const diffTime = Math.abs(checkOut - checkIn);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const handleClientSave = async (clientData) => {
    try {
        const reservationId = reservationDetails.value?.reservation?.[0]?.reservation_id;
        if (reservationId) {
            await convertBlockToReservation(reservationId, clientData);
            toast.add({ severity: 'success', summary: '成功', detail: 'クライアント情報を保存しました', life: 3000 });
            showClientDialog.value = false;
            await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
            drawerVisible.value = false;
        }
    } catch (error) {
        console.error('Error saving client data:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: error.response?.data?.error || 'クライアント情報の保存中にエラーが発生しました',
            life: 3000
        });
    }
};

// Mount
onMounted(async () => {
  isLoading.value = true;

  await fetchHotels();
  await fetchHotel();

  const today = new Date();
  const initialMinDate = new Date(today);
  initialMinDate.setDate(initialMinDate.getDate() - 10);
  const initialMaxDate = new Date(today);
  initialMaxDate.setDate(initialMaxDate.getDate() + 40);

  minDate.value = formatDate(initialMinDate);
  maxDate.value = formatDate(initialMaxDate);
  dateRange.value = generateDateRange(minDate.value, maxDate.value);

  nextTick(async () => {
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);

    const tableContainer = document.querySelector(".table-container");
    if (tableContainer) {
      const totalScrollHeight = tableContainer.scrollHeight;
      const scrollPosition = totalScrollHeight / 5;
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
  if (socket.value) {
    socket.value.off('tableUpdate', handleTableUpdate);
  }
});

const handleTableUpdate = async (_data) => {
  if (isUpdating.value) {
    return;
  }

  if (!dateRange.value || dateRange.value.length < 2) {
    console.error('Cannot fetch reservations, dateRange is invalid.');
    return;
  }

  isUpdating.value = true;
  try {
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
  } catch (error) {
    console.error('Failed to fetch reservations after table update:', error);
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

watch(reservationId, async (newReservationId, _oldReservationId) => {
  if (newReservationId) {

    await fetchReservation(newReservationId, selectedHotelId.value);
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
watch(drawerVisible, async (newVal, _oldVal) => {
  if (newVal === false) {
    isUpdating.value = false;
    await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
  }
});
watch(centerDate, async (newVal, _oldVal) => {
  isLoading.value = true;

  const today = newVal;
  const initialMinDate = new Date(today);
  initialMinDate.setDate(initialMinDate.getDate() - 10);
  const initialMaxDate = new Date(today);
  initialMaxDate.setDate(initialMaxDate.getDate() + 40);
  minDate.value = formatDate(initialMinDate);
  maxDate.value = formatDate(initialMaxDate);
  dateRange.value = generateDateRange(minDate.value, maxDate.value);
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
watch(dragMode, async () => {
  // Clear cart items and reservation card data
  selectedRoomByDay.value = [];
  tempRoomData.value = [];
  reservationCardData.value = [];

  await fetchReservations(dateRange.value[0], dateRange.value[dateRange.value.length - 1]);
});
watch(() => headerState.value.date, (newDate) => {
  // Handle date change
  centerDate.value = newDate;
});


</script>

<style scoped>
.capacity-badge {
  background-color: #e0e0e0; /* Light gray background */
  color: #333; /* Darker text color */
  padding: 0.1em 0.4em; /* Smaller padding */
  border-radius: 0.5em; /* Rounded corners */
  font-weight: bold;
}

.overflow-x-auto {
  overflow-x: auto;
  max-width: 100%;
}

.table-container {
  width: 100%;
  height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: auto;
  max-width: calc(100vw - 40px);
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
  min-width: 20px !important;
  max-width: 100px !important;
  font-size: 10px;
}

.compact-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 10px;
  /* Adjust height */
  width: 20px !important;
  /* Adjust width */
  font-size: 10px;
}


.cell-with-hover {
  position: relative;
  transition: background-color 0.3s ease;
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
  z-index: 10;
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

.highlight-row::before,
.highlight-col::before,
.highlight-cell::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Allows clicks to pass through to the cell */
  z-index: 1;
}

/* --- Light Mode Overlay Colors --- */

.highlight-row::before {
  background-color: rgba(254, 249, 195, 0.2); /* Semi-transparent yellow */
}

.highlight-col::before {
  background-color: rgba(224, 242, 254, 0.2); /* Semi-transparent blue */
}

/* The directly hovered cell gets a stronger overlay that will take precedence */
.highlight-cell::before {
  background-color: rgba(253, 230, 138, 0.2); /* Semi-transparent amber */
}

/* --- Dark Mode Overlay Colors --- */

.dark .highlight-row::before {
  background-color: rgba(120, 53, 15, 0.4);
}

.dark .highlight-col::before {
  background-color: rgba(12, 74, 110, 0.4);
}

.dark .highlight-cell::before {
  background-color: rgba(180, 83, 9, 0.6);
}

.highlight-cell {
  box-shadow: 0 0 0 3px #f59e42 inset;
  z-index: 2; /* Ensures the border is on top of overlays */
}

.dark .highlight-cell {
  box-shadow: 0 0 0 3px #fbbf24 inset;
}

.row-is-pinned td {
  position: relative;
  border-top: 2px solid #f59e42 !important; /* Thicker top border */
  border-bottom: 2px solid #f59e42 !important; /* Thicker bottom border */
}
/* Pseudo-element creates the overlay */
.row-is-pinned td::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  /* A more subtle, semi-transparent overlay color */
  background-color: rgba(234, 179, 8, 0.15); /* A subtle amber/yellow */
  pointer-events: none; /* Ensures you can still click the cell's content */
  z-index: 1;
}

.dark .row-is-pinned td {
  border-top-color: #fbbf24 !important;
  border-bottom-color: #fbbf24 !important;
}

/* Overlay for dark mode */
.dark .row-is-pinned td::before {
  background-color: rgba(251, 191, 36, 0.15); /* A subtle amber for dark mode */
}
</style>
