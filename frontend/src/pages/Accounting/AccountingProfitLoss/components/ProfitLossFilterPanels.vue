<template>
  <!-- Department Filter Panel -->
  <div v-if="showDepartmentFilter"
    class="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-black text-slate-700 dark:text-slate-300">部門を選択</h3>
      <div class="flex items-center gap-2">
        <button v-if="selectedDepartments.length < departmentsInData.length"
          @click="$emit('select-all-departments')"
          class="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer">
          すべて選択
        </button>
        <button v-if="selectedDepartments.length > 0" @click="$emit('clear-departments')"
          class="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer">
          すべてクリア
        </button>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
      <label v-for="dept in departmentsInData" :key="dept.department"
        class="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 transition-all cursor-pointer">
        <input type="checkbox" :value="dept" :checked="isDepartmentSelected(dept)" 
          @change="toggleDepartment(dept)"
          class="w-4 h-4 text-violet-600 bg-slate-100 border-slate-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer" />
        <div class="flex flex-col">
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ dept.department }}</span>
          <span v-if="dept.hotel_name" class="text-xs text-slate-400">({{ dept.hotel_name }})</span>
          <span v-else class="text-xs text-amber-600">(未割当)</span>
        </div>
      </label>
    </div>
  </div>

  <!-- Hotel Filter Panel -->
  <div v-if="showHotelFilter"
    class="mb-6 p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-black text-slate-700 dark:text-slate-300">施設を選択</h3>
      <div class="flex items-center gap-2">
        <button v-if="selectedHotels.length < hotelsInData.length" @click="$emit('select-all-hotels')"
          class="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer">
          すべて選択
        </button>
        <button v-if="selectedHotels.length > 0" @click="$emit('clear-hotels')"
          class="text-xs font-medium text-violet-600 hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300 cursor-pointer">
          すべてクリア
        </button>
      </div>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-60 overflow-y-auto">
      <label v-for="hotel in hotelsInData" :key="hotel.hotel_id"
        class="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-200 transition-all cursor-pointer">
        <input type="checkbox" :value="hotel" :checked="isHotelSelected(hotel)"
          @change="toggleHotel(hotel)"
          class="w-4 h-4 text-violet-600 bg-slate-100 border-slate-300 rounded focus:ring-violet-500 dark:focus:ring-violet-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 cursor-pointer" />
        <span class="text-sm font-medium text-slate-700 dark:text-slate-300">{{ hotel.hotel_name }}</span>
      </label>
    </div>
  </div>

  <!-- Filter Warning -->
  <div v-if="selectedDepartments.length > 0 && selectedDepartments.length < departmentsInData.length"
    class="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3">
    <i class="pi pi-info-circle text-amber-600 dark:text-amber-400 text-lg flex-shrink-0 mt-0.5"></i>
    <div class="flex-1">
      <p class="text-sm font-bold text-amber-800 dark:text-amber-300">部分データ表示中</p>
      <p class="text-xs text-amber-700 dark:text-amber-400 mt-1">
        {{ selectedDepartments.length }} / {{ departmentsInData.length }} 部門が選択されています。表示されているデータは選択された部門のみです。
      </p>
      <div class="mt-2 flex flex-wrap gap-1">
        <span v-for="dept in selectedDepartments" :key="dept.department"
          class="inline-flex items-center px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-medium rounded">
          {{ dept.department }}
        </span>
      </div>
    </div>
  </div>

  <!-- Hotel Filter Warning -->
  <div v-if="selectedHotels.length > 0 && selectedHotels.length < hotelsInData.length"
    class="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
    <i class="pi pi-info-circle text-blue-600 dark:text-blue-400 text-lg flex-shrink-0 mt-0.5"></i>
    <div class="flex-1">
      <p class="text-sm font-bold text-blue-800 dark:text-blue-300">施設を絞り込み中</p>
      <p class="text-xs text-blue-700 dark:text-blue-400 mt-1">
        {{ selectedHotels.length }} / {{ hotelsInData.length }} 施設が選択されています。
      </p>
      <div class="mt-2 flex flex-wrap gap-1">
        <span v-for="hotel in selectedHotels" :key="hotel.hotel_id"
          class="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 text-xs font-medium rounded">
          {{ hotel.hotel_name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  showDepartmentFilter: Boolean,
  showHotelFilter: Boolean,
  departmentsInData: {
    type: Array,
    default: () => []
  },
  hotelsInData: {
    type: Array,
    default: () => []
  },
  selectedDepartments: {
    type: Array,
    default: () => []
  },
  selectedHotels: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits([
  'update:selectedDepartments',
  'update:selectedHotels',
  'select-all-departments',
  'clear-departments',
  'select-all-hotels',
  'clear-hotels'
]);

const isDepartmentSelected = (dept) => {
  return props.selectedDepartments.some(d => d.department === dept.department);
};

const toggleDepartment = (dept) => {
  const newSelection = [...props.selectedDepartments];
  const index = newSelection.findIndex(d => d.department === dept.department);
  if (index === -1) {
    newSelection.push(dept);
  } else {
    newSelection.splice(index, 1);
  }
  emit('update:selectedDepartments', newSelection);
};

const isHotelSelected = (hotel) => {
  return props.selectedHotels.some(h => h.hotel_id === hotel.hotel_id);
};

const toggleHotel = (hotel) => {
  const newSelection = [...props.selectedHotels];
  const index = newSelection.findIndex(h => h.hotel_id === hotel.hotel_id);
  if (index === -1) {
    newSelection.push(hotel);
  } else {
    newSelection.splice(index, 1);
  }
  emit('update:selectedHotels', newSelection);
};
</script>
