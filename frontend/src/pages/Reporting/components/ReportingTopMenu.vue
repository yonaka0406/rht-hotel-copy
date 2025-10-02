<template>
    <div class="min-h-[4rem] bg-red-600 dark:bg-red-900 text-white dark:text-gray-200 p-4 flex flex-wrap shadow-md gap-4">        
        <!-- Header and Filters Row -->
        <div class="flex flex-wrap gap-x-4 gap-y-2">
            <div class="flex gap-x-4 gap-y-2 flex-wrap">
                <!-- Title -->
                <div class="flex items-center gap-2 grid">                    
                    <div class="text-2xl font-bold">RHTレポート</div>
                    <!-- PMS Button -->
                    <router-link
                        to="/"
                        class="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-900 dark:hover:bg-emerald-800 py-1 px-3 block rounded-sm whitespace-nowrap"
                    >
                        <i class="pi pi-home text-white mr-2"></i>
                        <span class="text-white">PMS</span>
                    </router-link>
                </div>

                <!-- Report Type Filter -->
                <div class="flex gap-2 grid">                    
                    <label for="reportType" class="text-sm text-gray-200 dark:text-gray-300">レポートタイプ</label>
                    <Select
                        v-model="selectedReportType"
                        :options="reportTypeOptions"
                        optionLabel="label"
                        optionValue="value"
                        @change="onInternalReportTypeChange"
                        placeholder="レポートを選択"
                        class="text-black dark:text-gray-200 rounded border-gray-300 dark:bg-gray-800 dark:border-gray-600 min-w-[150px] w-full sm:w-auto"
                    />                    
                </div>

                <!-- Date Filter -->
                <template v-if="!isReservationChangeReport">
                    <div class="flex gap-2 grid">
                        <label for="date" class="text-sm text-gray-200 dark:text-gray-300">月度</label>
                        <DatePicker
                            v-model="selectedDate"
                            view="month"
                            dateFormat="yy年mm月"
                            @update:modelValue="onInternalDateChange"
                            class="text-black dark:text-gray-200 rounded border-gray-300 dark:bg-gray-800 dark:border-gray-600 min-w-[120px] w-full sm:w-auto"
                        />
                    </div>
                </template>

                <!-- Period Filter -->
                <template v-if="!showSingleHotelSelect">
                    <div class="flex gap-2 grid">
                        <label for="period" class="text-sm text-gray-200 dark:text-gray-300">期間</label>
                        <Select
                            v-model="period"
                            :options="periodOptions"
                            optionLabel="label"
                            optionValue="value"
                            @change="onInternalPeriodChange"
                            class="text-black dark:text-gray-200 rounded border-gray-300 dark:bg-gray-800 dark:border-gray-600 min-w-[120px] w-full sm:w-auto"
                            placeholder="期間を選択"
                        />
                    </div>
                </template>

                <!-- Hotels Filter -->
                <div v-if="!showSingleHotelSelect" class="flex gap-2 grid"> <!-- Changed condition -->
                    <label for="hotels" class="text-sm text-gray-200 dark:text-gray-300">施設</label>
                    <MultiSelect
                        v-model="selectedHotels"
                        :options="hotels"
                        optionLabel="name"
                        optionValue="id"
                        multiple
                        :maxSelectedLabels="1"
                        @change="onInternalHotelSelectionChange"
                        placeholder="施設を選択"                            
                        class="text-black dark:text-gray-200 rounded border-gray-300 dark:bg-gray-800 dark:border-gray-600 min-w-[180px] w-full sm:w-auto"
                    />                    
                </div>
                <div v-if="showSingleHotelSelect" class="flex gap-2 grid"> <!-- Changed condition -->
                    <label for="facility" class="text-sm text-gray-200 dark:text-gray-300">施設</label>
                    <Select
                        v-model="singleSelectedHotelId"
                        :options="hotelOptions"
                        optionLabel="name"
                        optionValue="id"
                        @change="onInternalHotelSelectionChange"
                        placeholder="施設を選択"
                        class="text-black dark:text-gray-200 rounded border-gray-300 dark:bg-gray-800 dark:border-gray-600 min-w-[180px] w-full sm:w-auto"
                    />
                </div>
            </div>
        </div>      
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted, watch } from 'vue';

    const props = defineProps({
        selectedDate: Date,
        period: String,
        selectedHotels: Array,
        initialReportType: String // Optional: if parent wants to set initial report type
    });
    const emit = defineEmits(['date-change', 'period-change', 'hotel-change', 'report-type-change']);

    // Primevue
    import { DatePicker, FloatLabel, MultiSelect, Select } from 'primevue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, selectedHotel, fetchHotels, fetchHotel } = useHotelStore();

    // State
    // Initialize with prop values if provided, otherwise use defaults
    const selectedDate = ref(props.selectedDate || new Date());
    const period = ref(props.period || 'month');
    const periodOptions = [
        { label: '当月', value: 'month' },
        { label: '年度累計', value: 'year' }        
    ];
    const selectedHotels = ref([]); // Initialize with prop or default // Modified to init as []

    // Report Type State
    const selectedReportType = ref(props.initialReportType || 'monthlySummary'); // Initialize with prop or default

    // Computed property to determine if the current report type is 'activeReservationsChange'
    const isReservationChangeReport = computed(() => 
        selectedReportType.value === 'activeReservationsChange'
    );

    const showSingleHotelSelect = computed(() =>
        selectedReportType.value === 'activeReservationsChange' ||
        selectedReportType.value === 'monthlyReservationEvolution'
    );

    // Computed property for hotel options, adding "全施設" if it's the reservation change report
    const hotelOptions = computed(() => {
      const options = hotels.value ? [...hotels.value] : [];
      // Only add "全施設" for 'activeReservationsChange' report type
      if (selectedReportType.value === 'activeReservationsChange') { // New condition
        return [{ id: 0, name: '全施設' }, ...options];
      }
      return options; // For other single-select modes (like monthlyReservationEvolution), do not add "全施設"
    });

    // Computed property for single hotel selection, mapping to/from selectedHotels array
    const singleSelectedHotelId = computed({
      get: () => (selectedHotels.value && selectedHotels.value.length > 0) ? selectedHotels.value[0] : null, // Changed default to null
      set: (val) => { selectedHotels.value = (val === null || val === undefined) ? [] : [val]; }
    });

    const reportTypeOptions = ref([
        { label: '月次収益・稼働サマリ', value: 'monthlySummary' },
        { label: '予約分析', value: 'reservationAnalysis' },
        { label: '予約数変動 (昨日/今日)', value: 'activeReservationsChange' },
        { label: '予約進化 (OTBマトリクス)', value: 'monthlyReservationEvolution' }
        // Add other existing views if they are to be selected via this dropdown
    ]);

    // When a date is picked in ReportingTopMenu:
    function onInternalDateChange(newDate) {
        selectedDate.value = newDate; // Update internal state
        emit('date-change', newDate);
    }

    // When period is changed in ReportingTopMenu:
    function onInternalPeriodChange(event) { // event for PrimeVue Select is { value: 'actualValue' }
        period.value = event.value; // Update internal state
        emit('period-change', event.value);
    }

    // When hotel selection changes in ReportingTopMenu:
    // When hotel selection changes in ReportingTopMenu:
    function onInternalHotelSelectionChange() {
      // This function is called on @change by both facility Select and MultiSelect.
      // v-model (on selectedHotels or singleSelectedHotelId) would have already updated selectedHotels.value.
      emit('hotel-change', selectedHotels.value, hotels.value);
    }

    // Computed property to determine if a given report type is a single-hotel-select type
    const isSingleHotelSelectReportType = (reportType) => {
        return reportType === 'activeReservationsChange' || reportType === 'monthlyReservationEvolution';
    };

    // When report type changes in ReportingTopMenu:
    function onInternalReportTypeChange(event) { 
        const newReportType = event.value;
        const oldReportType = selectedReportType.value;
        selectedReportType.value = newReportType;

        if (newReportType === 'activeReservationsChange') {
            selectedHotels.value = [0]; // Default to "All Facilities"
        } else if (newReportType === 'monthlyReservationEvolution') {
            // If switching to Monthly Reservation Evolution
            // Default to the first hotel if no hotel is selected, or if "All Facilities" was selected from activeReservationsChange, or multiple hotels were selected
            if (hotels.value && hotels.value.length > 0) {
                if (!selectedHotels.value || selectedHotels.value.length === 0 ||
                    (selectedHotels.value.length === 1 && selectedHotels.value[0] === 0) || // Coming from "All Facilities"
                    selectedHotels.value.length > 1) { // Or if multiple were selected
                    selectedHotels.value = [hotels.value[0].id];
                }
                // If a single, valid hotel was already selected, keep it.
            } else {
                selectedHotels.value = []; // No hotels available
            }
        } else if (isSingleHotelSelectReportType(oldReportType) && !isSingleHotelSelectReportType(newReportType)) {
            // If switching from a single-hotel-select report (where '全施設' might have been selected) to a multi-hotel-select report
            if (selectedHotels.value && selectedHotels.value.length === 1 && selectedHotels.value[0] === 0) {
                selectedHotels.value = hotels.value ? hotels.value.map(h => h.id) : []; // Select all hotels
            } else if (!selectedHotels.value || selectedHotels.value.length === 0) {
                // If no hotels were selected, default to all hotels for multi-select reports
                selectedHotels.value = hotels.value ? hotels.value.map(h => h.id) : [];
            }
        }
        // Note: If switching from a multi-hotel selection to another multi-hotel report (e.g. monthlySummary to another),
        // selectedHotels generally remains as is, which is usually the desired behavior.

        emit('report-type-change', newReportType);
        // Ensure hotel-change is emitted after selectedHotels is finalized for the new report type
        emit('hotel-change', selectedHotels.value, hotels.value);
    }
    
    // Watch for prop changes to allow parent to control initial state or update dynamically
    watch(() => props.selectedDate, (newValue) => {
        if (newValue) selectedDate.value = newValue;
    });
    watch(() => props.period, (newValue) => {
        if (newValue) period.value = newValue;
    });
    // Parent always provides selectedHotels as an array.
    watch(() => props.selectedHotels, (newValue) => {
      selectedHotels.value = newValue ? [...newValue] : [];
    }, { deep: true, immediate: true });

    watch(() => props.initialReportType, (newValue) => {
        if (newValue) selectedReportType.value = newValue;
    });

    // Watch for changes in showSingleHotelSelect for debugging and to handle hotel selection logic
    watch(showSingleHotelSelect, (newValue, oldValue) => {
        // console.log(`[ReportingTopMenu] showSingleHotelSelect changed from ${oldValue} to ${newValue}`);
        // console.log('[ReportingTopMenu] selectedHotels.value when showSingleHotelSelect changed:', selectedHotels.value);

        // If transitioning from single-hotel-select (true) to multi-hotel-select (false)
        if (oldValue === true && newValue === false) {
            // If "All Facilities" (ID 0) was selected in single-select mode, switch to selecting all hotels
            if (selectedHotels.value && selectedHotels.value.length === 1 && selectedHotels.value[0] === 0) {
                selectedHotels.value = hotels.value ? hotels.value.map(h => h.id) : []; // Select all hotels
                emit('hotel-change', selectedHotels.value, hotels.value); // Emit the change to parent
            }
        }
    });

    onMounted(async () => {
      await fetchHotels(); // from useHotelStore
      // await fetchHotel(); // Commented out as per plan

      // initialReportType prop is processed first
      if (props.initialReportType) {
        selectedReportType.value = props.initialReportType;
      }

      // props.selectedHotels watcher with immediate:true has already run and populated selectedHotels.value.
      // Now, adjust selectedHotels.value based on the effective selectedReportType.
      if (selectedReportType.value === 'activeReservationsChange') {
        if (selectedHotels.value && selectedHotels.value.length > 0) {
          // Ensure it's a single selection, typically [0] for "All Facilities"
          selectedHotels.value = [selectedHotels.value[0]];
        } else {
          selectedHotels.value = [0]; // Default to "All Facilities"
        }
      } else if (selectedReportType.value === 'monthlyReservationEvolution') {
        // For Monthly Reservation Evolution, default to the first hotel if available and no specific hotel is selected or multiple are selected
        if (hotels.value && hotels.value.length > 0) {
          if (!selectedHotels.value || selectedHotels.value.length === 0 || selectedHotels.value.length > 1) {
            selectedHotels.value = [hotels.value[0].id]; // Select the first hotel
          }
          // If a single hotel is already selected (e.g. via props), keep it.
        } else {
          selectedHotels.value = []; // No hotels available
        }
      } else { // For other reports like 'monthlySummary' (multi-select is fine)
        if ((!selectedHotels.value || selectedHotels.value.length === 0) && hotels.value && hotels.value.length > 0) {
          selectedHotels.value = hotels.value.map(h => h.id); // Default to all hotels
        }
      }

      // Emit all initial states to parent.
      emit('date-change', selectedDate.value);
      emit('period-change', period.value);
      emit('hotel-change', selectedHotels.value, hotels.value); // selectedHotels.value is an array
      emit('report-type-change', selectedReportType.value);
    });
</script>