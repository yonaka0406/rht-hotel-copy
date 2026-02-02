<template>
  <div class="modern-calendar flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
    <!-- Main Scrollable Container -->
    <div class="flex-1 overflow-auto relative" ref="scrollContainer">
      <div class="relative flex flex-col" :style="{ width: (96 + totalGridWidth) + 'px' }">

        <!-- Header Row (Room Numbers) -->
        <div class="flex sticky top-0 z-30 bg-white dark:bg-gray-900">
          <!-- Top-Left Corner (Toggle & Header) -->
          <div class="sticky left-0 z-40 w-24 h-12 bg-gray-100 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
            <span class="text-[10px] font-bold">日付</span>
          </div>

          <!-- Room Columns Header -->
          <div class="flex">
            <div v-for="room in headerRoomsData.roomNumbers" :key="room.room_id"
                 class="flex-none border-b border-r border-gray-200 dark:border-gray-700 p-1 flex flex-col items-center justify-center h-12 bg-gray-50 dark:bg-gray-800"
                 :style="{ width: roomColumnWidth + 'px' }">
              <span class="text-[8px] font-bold text-gray-400 uppercase truncate w-full text-center">{{ getRoomTypeName(room.room_id) }}</span>
              <h3 class="text-sm font-bold leading-none mt-0.5">{{ room.room_number }}</h3>
              <div class="flex gap-1 mt-0.5 scale-75 origin-top">
                <span v-if="room.smoking" class="text-[10px]">🚬</span>
                <span v-if="room.is_staff_room" class="text-[10px] bg-purple-100 dark:bg-purple-900 px-1 rounded text-purple-700 dark:text-purple-300">STAFF</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Body Area -->
        <div class="flex relative">
          <!-- Date Sidebar (Sticky Left) -->
          <div class="sticky left-0 z-20 w-24 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <div v-for="date in dateRange" :key="date"
             class="border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-1"
             :class="{ 'bg-blue-50/50 dark:bg-blue-900/20 border-l-2 border-l-primary': isToday(date) }"
                 :style="{ height: rowHeight + 'px' }">
              <div class="flex flex-col items-start">
                <span class="text-[8px] text-gray-400 font-bold uppercase leading-none">{{ getDayName(date) }}</span>
                <span class="text-xs font-bold leading-tight" :class="{ 'text-primary': isToday(date) }">{{ formatDateMonthDay(date) }}</span>
              </div>
              <div class="flex items-center gap-1.5 ml-auto">
                <div class="flex items-center gap-0.5" v-tooltip.top="'空室'">
                  <i class="pi pi-home text-[9px] text-gray-400"></i>
                  <span class="text-[9px] font-bold" :class="availableRoomsByDate[date] === 0 ? 'text-red-500' : 'text-gray-500'">{{ availableRoomsByDate[date] }}</span>
                </div>
                <div class="flex items-center gap-0.5" v-tooltip.top="'駐車場'">
                  <i class="pi pi-car text-[9px] text-gray-400"></i>
                  <span class="text-[9px] font-bold text-gray-500">{{ availableParkingSpotsByDate[date] }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Grid Background & Blocks -->
          <div class="relative bg-striped-light dark:bg-striped-dark" :style="{ width: totalGridWidth + 'px', height: (dateRange.length * rowHeight) + 'px' }">
            <!-- Horizontal Grid Lines -->
            <div class="absolute inset-0 pointer-events-none">
              <div v-for="index in dateRange.length" :key="index"
                   class="border-b border-gray-100 dark:border-gray-800 w-full"
                   :style="{ height: rowHeight + 'px' }"></div>
            </div>

            <!-- Room Columns Containers -->
            <div class="flex h-full">
              <div v-for="room in headerRoomsData.roomNumbers" :key="room.room_id"
                   class="relative border-r border-gray-100 dark:border-gray-800 h-full"
                   :style="{ width: roomColumnWidth + 'px' }"
                   @click="handleGridClick($event, room)"
                   @dblclick="handleGridDoubleClick($event, room)"
                   @dragover="handleDragOver($event, room)"
                   @drop="handleDrop($event, room)">

                <!-- Drop Highlight -->
                <div v-if="dropTargetRoomId === room.room_id && draggingBlock" class="absolute inset-x-0 pointer-events-none z-0">
                  <div v-for="i in draggingBlock.items.length" :key="i"
                       class="bg-green-500/20 border-y border-green-500/30"
                       :style="{
                         position: 'absolute',
                         top: (dropTargetDateIndex + i - 1) * rowHeight + 'px',
                         height: rowHeight + 'px',
                         width: '100%'
                       }">
                  </div>
                </div>

                <!-- Reservation Blocks -->
                <div v-for="block in getRoomBlocks(room.room_id)" :key="block.id"
                     class="absolute left-0.5 right-0.5 rounded overflow-hidden flex flex-col cursor-pointer transition-all hover:z-10 shadow-sm border border-black/5"
                     :style="getBlockStyle(block)"
                     draggable="true"
                     @dragstart="handleDragStart($event, block)"
                     @dragend="handleDragEnd"
                     @click.stop="handleBlockClick(block)"
                     @dblclick.stop="handleBlockDoubleClick(block)"
                     @contextmenu.prevent="onContextMenu($event, block)"
                     @mousemove="handleMouseMove($event, block)"
                     @mouseleave="handleMouseLeave">
                  <!-- Sticky Header for Guest Name -->
                  <div class="sticky top-0 z-10 px-1 py-0.5 backdrop-blur-md bg-white/30 border-b border-black/5 overflow-hidden">
                    <h4 class="font-bold text-[8px] leading-tight truncate" :style="{ color: block.textColor }">{{ block.client_name }}</h4>
                  </div>
                  <!-- Mini Plan Name (Only if block is tall enough) -->
                  <div class="px-1 text-[7px] truncate opacity-80" v-if="block.height > 25" :style="{ color: block.textColor }">
                    {{ block.plan_name }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Context Menu -->
    <ContextMenu ref="menu" :model="contextMenuItems" />

    <!-- Tooltip -->
    <div v-if="tooltipVisible" :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }"
      class="fixed bg-gray-800 text-white text-[10px] p-2 rounded shadow-lg z-[100] pointer-events-none whitespace-pre-line border border-gray-600">
      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-1 border-b border-gray-600 pb-1 mb-1">
          <i class="pi pi-home text-[8px]"></i>
          <span class="font-bold text-blue-300">{{ tooltipData.roomNumber }}</span>
        </div>
        <div class="flex items-start gap-1">
          <span class="text-gray-400 w-8">顧客:</span>
          <span class="flex-1 font-bold">{{ tooltipData.clientName }}</span>
        </div>
        <div class="flex items-start gap-1">
          <span class="text-gray-400 w-8">プラン:</span>
          <span class="flex-1">{{ tooltipData.planName }}</span>
        </div>
        <div class="flex items-start gap-1">
          <span class="text-gray-400 w-8">期間:</span>
          <span class="flex-1 text-orange-200">{{ tooltipData.range }}</span>
        </div>
        <div v-if="tooltipData.isOTA" class="flex items-center gap-1 mt-1 text-green-300">
          <i class="pi pi-globe text-[8px]"></i>
          <span>OTA予約</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, toRefs } from 'vue';
import ContextMenu from 'primevue/contextmenu';
import { formatDate } from '@/utils/dateUtils';
import { useModernDragDrop } from './useModernDragDrop';

const props = defineProps({
  dateRange: Array,
  headerRoomsData: Object,
  selectedHotelRooms: Array,
  reservedRooms: Array,
  availableRoomsByDate: Object,
  availableParkingSpotsByDate: Object,
  selectedClientId: String,
  cardSelectedReservationId: String,
  isLoading: Boolean
});

const emit = defineEmits(['toggle-view', 'cell-click', 'cell-double-click', 'show-tooltip', 'hide-tooltip', 'calendar-update']);

const rowHeight = 22;
const roomColumnWidth = 50;

const totalGridWidth = computed(() => props.headerRoomsData.roomNumbers.length * roomColumnWidth);

const isToday = (dateStr) => {
  return dateStr === formatDate(new Date());
};

const getDayName = (dateStr) => {
  const days = ['日', '月', '火', '水', '木', '金', '土'];
  return days[new Date(dateStr).getDay()];
};

const formatDateMonthDay = (dateStr) => {
  const date = new Date(dateStr);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};


const getRoomTypeName = (roomId) => {
  const room = props.selectedHotelRooms.find(r => r.room_id === roomId);
  return room ? room.room_type_name : '';
};

const getRoomNumber = (roomId) => {
  const room = props.selectedHotelRooms.find(r => r.room_id === roomId);
  return room ? room.room_number : 'N/A';
};

const formatClientName = (name) => {
  if (!name) return '';
  const replacements = {
    '株式会社': '㈱', '合同会社': '(同)', '有限会社': '(有)', '合名会社': '(名)', '合資会社': '(資)',
    '一般社団法人': '(一社)', '一般財団法人': '(一財)', '公益社団法人': '(公社)', '公益財団法人': '(公財)',
    '学校法人': '(学)', '医療法人': '(医)', '社会福祉法人': '(福)', '特定非営利活動法人': '(特非)',
    'NPO法人': '(NPO)', '宗教法人': '(宗)'
  };
  let result = name;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.replace(new RegExp(key, 'g'), value);
  }
  return result;
};

const getRoomBlocks = (roomId) => {
  const blocks = [];
  const roomReservations = props.reservedRooms.filter(r => r.room_id === roomId);

  const grouped = roomReservations.reduce((acc, res) => {
    acc[res.reservation_id] = acc[res.reservation_id] || [];
    acc[res.reservation_id].push(res);
    return acc;
  }, {});

  for (const [resId, allItems] of Object.entries(grouped)) {
    allItems.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Split into subgroups based on continuity AND plan_color/status consistency
    const subgroups = [];
    if (allItems.length > 0) {
      let currentSubgroup = [allItems[0]];
      for (let i = 1; i < allItems.length; i++) {
        const prev = allItems[i-1];
        const curr = allItems[i];
        const diffDays = Math.round((new Date(curr.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24));

        // Split if not consecutive OR if plan/status color would change
        if (diffDays === 1 && prev.plan_color === curr.plan_color && prev.status === curr.status) {
          currentSubgroup.push(curr);
        } else {
          subgroups.push(currentSubgroup);
          currentSubgroup = [curr];
        }
      }
      subgroups.push(currentSubgroup);
    }

    for (const items of subgroups) {
      const firstItem = items[0];
      const startDateStr = formatDate(new Date(firstItem.date));
      const startIndex = props.dateRange.indexOf(startDateStr);

      if (startIndex === -1) continue;

      const numDays = items.length;
      const styleInfo = getBlockBaseStyle(firstItem);

      blocks.push({
        id: `${resId}-${firstItem.date}`,
        reservation_id: resId,
        client_id: firstItem.client_id,
        client_name: formatClientName(firstItem.client_name),
        check_in: firstItem.check_in,
        check_out: firstItem.check_out,
        plan_name: firstItem.plan_name,
        plan_color: firstItem.plan_color,
        status: firstItem.status,
        type: firstItem.type,
        top: startIndex * rowHeight,
        height: numDays * rowHeight,
        backgroundColor: styleInfo.backgroundColor,
        textColor: styleInfo.textColor,
        borderColor: styleInfo.borderColor,
        items: items
      });
    }
  }
  return blocks;
};

const getBlockBaseStyle = (roomInfo) => {
  const room = props.selectedHotelRooms.find(r => r.room_id === roomInfo.room_id);
  let backgroundColor = '#ffffff';
  let textColor = '#1f2937';
  let borderColor = 'transparent';

  if (room && room.is_staff_room) {
    backgroundColor = '#f3e5f5';
  }

  if (roomInfo.type === 'employee') {
    backgroundColor = '#f3e5f5';
  } else if (roomInfo.status === 'provisory') {
    backgroundColor = '#ead59f';
  } else if (roomInfo.status === 'hold') {
    backgroundColor = '#FFC107';
  } else if (roomInfo.status === 'block' && roomInfo.client_id === '22222222-2222-2222-2222-222222222222') {
    backgroundColor = '#fed7aa';
  } else if (roomInfo.status === 'block') {
    backgroundColor = '#fca5a5';
  } else if (roomInfo.type === 'ota' || roomInfo.type === 'web') {
    backgroundColor = roomInfo.plan_color || '#9fead5';
  } else if (roomInfo.plan_color) {
    backgroundColor = roomInfo.plan_color;
  }

  // Determine text color based on background luminance
  const luminance = getLuminance(backgroundColor);
  textColor = luminance > 0.5 ? '#1f2937' : '#ffffff';

  return { backgroundColor, textColor, borderColor };
};

const getLuminance = (hex) => {
  if (!hex || hex[0] !== '#') return 1;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

const getBlockStyle = (block) => {
  const style = {
    top: block.top + 'px',
    height: block.height - 2 + 'px', // Smaller gap
    backgroundColor: block.backgroundColor,
    color: block.textColor
  };

  if (props.selectedClientId && block.client_id === props.selectedClientId) {
    if (props.cardSelectedReservationId && block.reservation_id === props.cardSelectedReservationId) {
      style.outline = '2px solid #00FFFF';
      style.zIndex = 20;
    } else {
      style.outline = '2px solid #FFFF33';
      style.zIndex = 15;
    }
  }

  return style;
};

const handleBlockClick = (block) => {
  emit('cell-click', block.items[0].room_id, formatDate(new Date(block.items[0].date)));
};

const handleBlockDoubleClick = (block) => {
  emit('cell-double-click', block.items[0].room_id, formatDate(new Date(block.items[0].date)));
};

// Grid Interaction Logic
const handleGridClick = (event, room) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const dateIndex = Math.floor(relativeY / rowHeight);
  if (dateIndex >= 0 && dateIndex < props.dateRange.length) {
    emit('cell-click', room.room_id, props.dateRange[dateIndex]);
  }
};

const handleGridDoubleClick = (event, room) => {
  const rect = event.currentTarget.getBoundingClientRect();
  const relativeY = event.clientY - rect.top;
  const dateIndex = Math.floor(relativeY / rowHeight);
  if (dateIndex >= 0 && dateIndex < props.dateRange.length) {
    emit('cell-double-click', room.room_id, props.dateRange[dateIndex]);
  }
};

// Drag and Drop Logic
const { dateRange } = toRefs(props);
const {
  draggingBlock,
  dropTargetRoomId,
  dropTargetDateIndex,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop
} = useModernDragDrop({
  dateRange,
  emit,
  getRoomNumber,
  rowHeight
});

// Tooltip Logic
const tooltipVisible = ref(false);
const tooltipData = ref({});
const tooltipX = ref(0);
const tooltipY = ref(0);

const handleMouseMove = (event, block) => {
  tooltipData.value = {
    roomNumber: getRoomNumber(block.items[0].room_id),
    clientName: block.client_name,
    planName: block.plan_name,
    range: `${formatDate(new Date(block.check_in))} - ${formatDate(new Date(block.check_out))}`,
    isOTA: block.type === 'ota' || block.type === 'web'
  };
  tooltipVisible.value = true;

  tooltipX.value = event.clientX + 15;
  tooltipY.value = event.clientY + 15;

  const tooltipWidth = 180;
  const tooltipHeight = 120;
  if (tooltipX.value + tooltipWidth > window.innerWidth) {
    tooltipX.value = event.clientX - tooltipWidth - 15;
  }
  if (tooltipY.value + tooltipHeight > window.innerHeight) {
    tooltipY.value = event.clientY - tooltipHeight - 15;
  }
};

const handleMouseLeave = () => {
  tooltipVisible.value = false;
};

// Context Menu Logic
const menu = ref();
const selectedBlock = ref(null);
const contextMenuItems = computed(() => [
  {
    label: '予約詳細を表示',
    icon: 'pi pi-info-circle',
    command: () => {
      if (selectedBlock.value) handleBlockDoubleClick(selectedBlock.value);
    }
  },
  {
    label: '編集ページを開く',
    icon: 'pi pi-external-link',
    command: () => {
      if (selectedBlock.value) {
         const url = `/reservations/edit/${selectedBlock.value.reservation_id}`;
         window.open(url, '_blank');
      }
    }
  }
]);

const onContextMenu = (event, block) => {
  selectedBlock.value = block;
  menu.value.show(event);
};

</script>

<style scoped>
.modern-calendar {
  font-family: 'Inter', sans-serif;
}

.bg-striped-light {
  background-image: linear-gradient(45deg, #f9fafb 25%, transparent 25%, transparent 50%, #f9fafb 50%, #f9fafb 75%, transparent 75%, transparent);
  background-size: 16px 16px;
}

.dark .bg-striped-dark {
  background-image: linear-gradient(45deg, #111827 25%, transparent 25%, transparent 50%, #111827 50%, #111827 75%, transparent 75%, transparent);
  background-size: 16px 16px;
}

/* Hide scrollbar but keep functionality */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
