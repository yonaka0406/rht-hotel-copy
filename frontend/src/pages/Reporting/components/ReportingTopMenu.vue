<template>
    <div class="min-h-[4rem] bg-red-600 text-white p-4 flex flex-wrap items-center justify-between shadow-md gap-4">
        <div class="text-2xl font-bold">RHTレポート</div>
        <div class="flex items-center gap-x-4 gap-y-2 flex-wrap">
            <div class="flex items-center gap-2">
                <label for="reportType" class="text-sm">レポートタイプ:</label>
                <Select                
                    v-model="selectedReportType"
                    :options="reportTypeOptions"
                    optionLabel="label"
                    optionValue="value"
                    @change="onInternalReportTypeChange"
                    placeholder="レポートを選択"
                    class="text-black rounded border-gray-300 min-w-[220px]"
                />
            </div>

            <div class="flex items-center gap-2">
                <label for="date" class="text-sm">月度:</label>
                <DatePicker
                    v-model="selectedDate"
                    view="month"
                    dateFormat="yy年mm月" 
                    showIcon
                    @update:modelValue="onInternalDateChange"                 
                    class="text-black p-2 rounded border-gray-300 min-w-[150px]"
                />
            </div>

            <div class="flex items-center gap-2">
                <label for="period" class="text-sm">期間:</label>
                <Select                
                    v-model="period"
                    :options="periodOptions"
                    optionLabel="label"
                    optionValue="value"
                    @change="onInternalPeriodChange"
                    class="text-black rounded border-gray-300 min-w-[120px]"
                />
            </div>

            <div class="flex items-center gap-2">
                <label for="hotels" class="text-sm">施設:</label>
                <MultiSelect 
                    v-model="selectedHotels"                  
                    :options="hotels"
                    optionLabel="name" 
                    optionValue="id"
                    multiple
                    :maxSelectedLabels="1"
                    @change="onInternalHotelSelectionChange"
                    placeholder="施設を選択"
                    display="chip"
                    class="text-black rounded border-gray-300 min-w-[180px]"
                />
            </div>
        </div>
        <router-link
            to="/"
            class="bg-emerald-500 hover:bg-emerald-600 p-2 block rounded-sm whitespace-nowrap"
        >
            <i class="pi pi-home text-white mr-2"></i>
            <span class="text-white">PMS</span>
        </router-link>
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
    import { DatePicker, MultiSelect, Select } from 'primevue';

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
    const selectedHotels = ref(props.selectedHotels || null); // Initialize with prop or default

    // Report Type State
    const selectedReportType = ref(props.initialReportType || 'monthlySummary'); // Initialize with prop or default
    const reportTypeOptions = ref([
        { label: '月次収益・稼働サマリ', value: 'monthlySummary' },
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
    function onInternalHotelSelectionChange(event) { // event for PrimeVue MultiSelect is { value: [...] }
        selectedHotels.value = event.value; // Update internal state
        emit('hotel-change', event.value, hotels.value); // Pass current list of all hotels too
    }

    // When report type changes in ReportingTopMenu:
    function onInternalReportTypeChange(event) { // event for PrimeVue Select is { value: 'actualValue' }
        selectedReportType.value = event.value; // Update internal state
        emit('report-type-change', event.value);
    }
    
    // Watch for prop changes to allow parent to control initial state or update dynamically
    watch(() => props.selectedDate, (newValue) => {
        if (newValue) selectedDate.value = newValue;
    });
    watch(() => props.period, (newValue) => {
        if (newValue) period.value = newValue;
    });
    watch(() => props.selectedHotels, (newValue) => {
         selectedHotels.value = newValue; // Can be null or array
    }, { deep: true });
    watch(() => props.initialReportType, (newValue) => {
        if (newValue) selectedReportType.value = newValue;
    });

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel(); 
        
        if ((!selectedHotels.value || selectedHotels.value.length === 0) && hotels.value && hotels.value.length > 0) {
            selectedHotels.value = hotels.value.map(h => h.id);
        }
        
        // Emit initial state to parent to ensure synchronization        
        emit('date-change', selectedDate.value);
        emit('period-change', period.value);
        emit('hotel-change', selectedHotels.value, hotels.value);
        emit('report-type-change', selectedReportType.value);
    });
</script>