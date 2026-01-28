<template>
  <div class="p-8 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Period Filter - Takes 2 columns on large screens -->
      <div class="flex flex-col gap-2 lg:col-span-2">
        <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">期間</label>
        <div class="flex items-center gap-2">
          <Select v-model="localFilters.startMonth" :options="availableMonths" placeholder="開始月" fluid class="text-sm">
            <template #value="slotProps">
              <span v-if="slotProps.value">{{ formatMonth(slotProps.value) }}</span>
              <span v-else class="text-slate-400">開始月</span>
            </template>
            <template #option="slotProps">
              {{ formatMonth(slotProps.option) }}
            </template>
          </Select>
          <span class="text-slate-400 font-bold flex-shrink-0">〜</span>
          <Select v-model="localFilters.endMonth" :options="availableMonths" placeholder="終了月" fluid class="text-sm">
            <template #value="slotProps">
              <span v-if="slotProps.value">{{ formatMonth(slotProps.value) }}</span>
              <span v-else class="text-slate-400">終了月</span>
            </template>
            <template #option="slotProps">
              {{ formatMonth(slotProps.option) }}
            </template>
          </Select>
        </div>
      </div>

      <!-- View By Filter -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">表示単位</label>
        <Select v-model="localFilters.groupBy" :options="groupByOptions" optionLabel="label" optionValue="value" fluid />
      </div>

      <!-- Action Button -->
      <div class="flex flex-col gap-2 justify-end">
        <button @click="onLoadData" :disabled="loading"
          class="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
          <i v-if="loading" class="pi pi-spin pi-spinner"></i>
          <i v-else class="pi pi-search"></i>
          <span>{{ loading ? '読み込み中...' : '表示' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import Select from 'primevue/select';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
  filters: {
    type: Object,
    required: true
  },
  availableMonths: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  formatMonth: {
    type: Function,
    required: true
  }
});

const emit = defineEmits(['update:filters', 'load-data']);
const toast = useToast();

const localFilters = computed({
  get: () => props.filters,
  set: (value) => emit('update:filters', value)
});

const groupByOptions = [
  { label: '月別', value: 'month' },
  { label: 'ホテル別', value: 'hotel' },
  { label: '部門別', value: 'department' },
  { label: 'ホテル×月', value: 'hotel_month' },
  { label: '部門×月', value: 'department_month' }
];

const onLoadData = () => {
  emit('load-data');
};

// Watch for start month changes - adjust end month if needed
watch(() => localFilters.value.startMonth, (newStart, oldStart) => {
  if (!newStart || !localFilters.value.endMonth) return;

  const startDate = new Date(newStart);
  const endDate = new Date(localFilters.value.endMonth);

  // If start is after end, set end to start
  if (startDate > endDate) {
    // We need to emit the update because localFilters is a computed property wrapper around props
    const newFilters = { ...localFilters.value, endMonth: newStart };
    emit('update:filters', newFilters);
    toast.add({
      severity: 'info',
      summary: '期間調整',
      detail: '開始月が終了月より後のため、終了月を調整しました',
      life: 3000
    });
  }
});

// Watch for end month changes - adjust start month if needed
watch(() => localFilters.value.endMonth, (newEnd, oldEnd) => {
  if (!newEnd || !localFilters.value.startMonth) return;

  const startDate = new Date(localFilters.value.startMonth);
  const endDate = new Date(newEnd);

  // If end is before start, set start to end
  if (endDate < startDate) {
    const newFilters = { ...localFilters.value, startMonth: newEnd };
    emit('update:filters', newFilters);
    toast.add({
      severity: 'info',
      summary: '期間調整',
      detail: '終了月が開始月より前のため、開始月を調整しました',
      life: 3000
    });
  }
});
</script>

<style scoped>
/* Dark Mode Component Fixes */
.dark :deep(.p-select) {
  background: #0f172a !important;
  border-color: #334155 !important;
}

.dark :deep(.p-select-label) {
  color: #f8fafc !important;
}

.dark :deep(.p-select-label.p-placeholder) {
  color: #64748b !important;
  /* slate-500 */
}

.dark :deep(.p-select-dropdown) {
  background: #1e293b !important;
  color: #f8fafc !important;
}
</style>
