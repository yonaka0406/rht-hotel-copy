<template>
  <div class="flex justify-between items-center mb-6">
    <div class="flex items-center gap-4 flex-wrap">
      <h2 class="text-2xl font-black text-slate-900 dark:text-white">損益計算書</h2>

      <!-- Total Column Checkbox -->
      <div v-if="['month', 'hotel_month', 'department_month'].includes(groupBy)" class="flex items-center gap-2">
        <input type="checkbox" id="showTotalColumn" :checked="showTotalColumn" 
          @change="$emit('update:showTotalColumn', $event.target.checked)"
          class="w-4 h-4 text-violet-600 bg-slate-100 border-slate-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer" />
        <label for="showTotalColumn" class="text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
          合計列を表示
        </label>
      </div>

      <!-- Department Filter Toggle -->
      <button @click="$emit('update:showDepartmentFilter', !showDepartmentFilter)"
        class="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer">
        <i class="pi pi-filter"></i>
        <span>部門フィルター</span>
        <span v-if="selectedDepartmentsLength > 0"
          class="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {{ selectedDepartmentsLength }}
        </span>
      </button>

      <!-- Facility Filter Toggle -->
      <button @click="$emit('update:showHotelFilter', !showHotelFilter)"
        class="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-violet-50 hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer">
        <i class="pi pi-building"></i>
        <span>施設フィルター</span>
        <span v-if="selectedHotelsLength > 0"
          class="bg-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {{ selectedHotelsLength }}
        </span>
      </button>
    </div>

    <div class="flex items-center gap-2">
      <button @click="$emit('export-csv')"
        class="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-600 dark:text-slate-400 font-bold hover:text-violet-600 hover:border-violet-200 transition-all cursor-pointer">
        <i class="pi pi-download"></i>
        <span>CSV出力</span>
      </button>
      <button @click="$emit('export-detailed-csv')"
        class="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white border border-violet-600 rounded-xl font-bold hover:bg-violet-700 transition-all cursor-pointer">
        <i class="pi pi-file-export"></i>
        <span>詳細CSV出力</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  groupBy: {
    type: String,
    required: true
  },
  showTotalColumn: {
    type: Boolean,
    required: true
  },
  showDepartmentFilter: {
    type: Boolean,
    required: true
  },
  showHotelFilter: {
    type: Boolean,
    required: true
  },
  selectedDepartmentsLength: {
    type: Number,
    default: 0
  },
  selectedHotelsLength: {
    type: Number,
    default: 0
  }
});

defineEmits([
  'update:showTotalColumn',
  'update:showDepartmentFilter',
  'update:showHotelFilter',
  'export-csv',
  'export-detailed-csv'
]);
</script>
