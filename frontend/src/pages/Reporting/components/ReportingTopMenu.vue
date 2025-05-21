<template>
    <div class="h-16 bg-red-600 text-white p-4 flex items-center justify-between shadow-md">
        <div class="text-2xl font-bold">RHTレポート</div>
        <div class="flex items-center gap-4">
            <label for="date" class="text-sm">月度:</label>
            <DatePicker
                v-model="selectedDate"
                view="month"
                dateFormat="mm月yy年"
                @update:modelValue="onInternalDateChange"                 
                fluid
                class="text-black p-2 rounded border-gray-300"
            />

            <label for="period" class="text-sm">期間:</label>
            <Select                
                v-model="period"
                :options="periodOptions"
                optionLabel="label"
                optionValue="value"
                @change="onInternalPeriodChange"
                class="text-black rounded border-gray-300"
            >                
            </Select>

            <label for="hotels" class="text-sm">施設:</label>
            <MultiSelect 
                v-model="selectedHotels"                  
                :options="hotels"
                optionLabel="name" 
                optionValue="id"
                multiple
                :maxSelectedLabels="1"
                @change="onInternalHotelSelectionChange"
                class="text-black rounded border-gray-300"
            >                
            </MultiSelect >
        </div>
        <router-link
            to="/"
            class="bg-emerald-500 hover:bg-emerald-600 p-2 block rounded-sm"
        >
            <i class="pi pi-home text-white mr-2"></i>
            <span class="text-white">PMS</span>
        </router-link>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted } from 'vue';

    const props = defineProps({
        selectedDate: Date,
        period: String,
        selectedHotels: Array        
    });
    const emit = defineEmits(['date-change', 'period-change', 'hotel-change']);

    // Primevue
    import { DatePicker, MultiSelect, Select } from 'primevue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, selectedHotel, fetchHotels, fetchHotel } = useHotelStore();

    // State
    const selectedDate = ref(new Date());
    const period = ref('month');
    const periodOptions = [
        { label: '当月', value: 'month' },
        { label: '年度累計', value: 'year' }        
    ];
    const selectedHotels = ref(null);

    // When a date is picked in ReportingTopMenu:
    function onInternalDateChange(newDate) {        
        emit('date-change', newDate);
    }

    // When period is changed in ReportingTopMenu:
    function onInternalPeriodChange(newPeriod) {
        emit('period-change', newPeriod.value);
    }

    // When hotel selection changes in ReportingTopMenu:
    function onInternalHotelSelectionChange(newHotelIdsArray) {
        emit('hotel-change', newHotelIdsArray.value, hotels.value);
    }

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();        

        selectedHotels.value = ref(hotels.value.map(h => h.id));
        //onInternalDateChange(selectedDate.value);
        //onInternalPeriodChange(period.value);
        onInternalHotelSelectionChange(selectedHotels.value);
    });
</script>