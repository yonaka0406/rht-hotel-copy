<template>
  <td
    @dblclick="$emit('dblclick')"
    @dragstart="$emit('dragstart', $event)"
    @dragend="$emit('dragend')"
    @dragover.prevent
    @dragenter="$emit('dragenter', $event)"
    @dragleave="$emit('dragleave', $event)"
    @drop="$emit('drop', $event)"
    @contextmenu.prevent="$emit('contextmenu', $event)"
    :style="cellStyle"
    :class="[cellClass, 'hover:bg-gray-100 dark:hover:bg-gray-700']"
    @mouseover="$emit('mouseover')"
    @mouseleave="$emit('mouseleave')"
    draggable="true"
  >
    <div v-if="isLoading && !isReserved">
      <Skeleton class="mb-2 dark:bg-gray-700"></Skeleton>
    </div>
    <div v-else>
      <div v-if="isReserved" class="flex">
        <div class="flex flex-col">
          <div>
            <i v-if="statusIcon" :class="[statusIcon.icon, statusIcon.bg, 'p-1 rounded']"></i>
          </div>
          <div v-if="isGlobe">
            <i class="pi pi-globe bg-blue-200 p-1 rounded dark:bg-blue-800"></i>
          </div>
        </div>
        <div class="ml-1 dark:text-gray-100 flex items-center">
          {{ reservationInfo.client_name || '予約情報あり' }}
        </div>
      </div>
      <div v-else>
        <i class="pi pi-circle"></i> <span class="dark:text-gray-100">空室</span>
      </div>
    </div>
  </td>
</template>

<script setup>
import { computed } from 'vue';
import { Skeleton } from 'primevue';
import { CANCELLED_CLIENT_ID, SPECIAL_BLOCK_CLIENT_ID } from '@/utils/reservationUtils';

const props = defineProps({
  room: {
    type: Object,
    required: true
  },
  date: {
    type: String,
    required: true
  },
  reservationInfo: {
    type: Object,
    default: null
  },
  isCompact: {
    type: Boolean,
    default: false
  },
  isSelected: {
    type: Boolean,
    default: false
  },
  isLoading: {
    type: Boolean,
    default: false
  },
  isModified: {
    type: Boolean,
    default: false
  }
});

defineEmits([
  'dblclick',
  'dragstart',
  'dragend',
  'dragenter',
  'dragleave',
  'drop',
  'contextmenu',
  'mouseover',
  'mouseleave'
]);

const isReserved = computed(() => !!props.reservationInfo && props.reservationInfo.status !== 'available');

const isGlobe = computed(() => {
  return props.reservationInfo && (props.reservationInfo.type === 'ota' || props.reservationInfo.type === 'web');
});

const statusIcon = computed(() => {
  if (!props.reservationInfo) return null;

  const status = props.reservationInfo.status;
  const type = props.reservationInfo.type;
  const clientId = props.reservationInfo.client_id;

  if (type === 'employee') {
    return { icon: 'pi pi-id-card', bg: 'bg-purple-200 dark:bg-purple-800' };
  }
  if (status === 'hold') {
    return { icon: 'pi pi-pause', bg: 'bg-yellow-100 dark:bg-yellow-800' };
  }
  if (status === 'provisory') {
    return { icon: 'pi pi-clock', bg: 'bg-cyan-200 dark:bg-cyan-800' };
  }
  if (status === 'confirmed') {
    return { icon: 'pi pi-check-circle', bg: 'bg-sky-300 dark:bg-sky-800' };
  }
  if (status === 'checked_in') {
    return { icon: 'pi pi-user', bg: 'bg-green-400 dark:bg-green-800' };
  }
  if (status === 'checked_out') {
    return { icon: 'pi pi-sign-out', bg: 'bg-gray-300 dark:bg-gray-700' };
  }
  if (status === 'block') {
    if (clientId === CANCELLED_CLIENT_ID) {
      return { icon: 'pi pi-times', bg: 'bg-red-100 dark:bg-red-800' };
    }
    if (clientId === SPECIAL_BLOCK_CLIENT_ID) {
      return { icon: 'pi pi-lock', bg: 'bg-orange-100 dark:bg-orange-800' };
    }
  }
  return null;
});

const cellStyle = computed(() => {
  const roomInfo = props.reservationInfo;
  const room = props.room;
  let style = {};

  if (room && room.is_staff_room && (!roomInfo || roomInfo.status === 'available' || !roomInfo.status)) {
    style = { backgroundColor: '#f3e5f5' };
  } else if (roomInfo && roomInfo.type === 'employee') {
    style = { backgroundColor: '#f3e5f5' };
  } else if (roomInfo && roomInfo.status === 'provisory') {
    style = { backgroundColor: '#ead59f' };
  } else if (roomInfo && roomInfo.status === 'block' && roomInfo.client_id === SPECIAL_BLOCK_CLIENT_ID) {
    style = { backgroundColor: '#fed7aa' };
  } else if (roomInfo && roomInfo.status === 'block') {
    style = { backgroundColor: '#fca5a5' };
  } else if (roomInfo && (roomInfo.type === 'ota' || roomInfo.type === 'web')) {
    style = { backgroundColor: roomInfo.plan_color || '#9fead5' };
  } else if (roomInfo && roomInfo.plan_color) {
    style = { backgroundColor: roomInfo.plan_color };
  } else if (roomInfo && roomInfo.status && roomInfo.status !== 'available') {
    style = { color: '#d3063d', fontWeight: 'bold' };
  }

  if (props.isModified) {
    style.border = '2px solid red';
  }

  return style;
});

const cellClass = computed(() => {
  return [
    'px-2 py-2 text-center text-xs max-h-0 aspect-square w-32 h-16 text-ellipsis border b-4 cell-with-hover',
    props.reservationInfo?.isFirst ? 'cell-first' : '',
    props.reservationInfo?.isLast ? 'cell-last' : '',
    'cursor-pointer',
    props.isCompact ? 'compact-cell' : '',
    props.isSelected ? 'selected-room-by-day' : '',
    !isReserved.value ? 'dark:bg-gray-800 dark:text-gray-100' : ''
  ];
});
</script>

<style scoped>
.cell-first {
  border-top-left-radius: 40px !important;
  border-top-right-radius: 40px !important;
}

.cell-last {
  border-bottom-left-radius: 40px !important;
  border-bottom-right-radius: 40px !important;
}

.cell-with-hover {
  position: relative;
  transition: background-color 0.3s ease;
}


.compact-cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  height: 10px;
  width: 20px !important;
  font-size: 10px;
}

.selected-room-by-day {
  background-color: lightyellow !important;
  color: goldenrod !important;
  --border-width: 4px;
  border-top-width: var(--border-width);
  border-bottom-width: var(--border-width);
}
</style>
