<template>
    <div class="h-16 bg-red-600 text-white p-4 flex items-center justify-between shadow-md">
        <div class="text-2xl font-bold">RHTレポート</div>
        <div class="flex items-center gap-4">
            <label for="date" class="text-sm">月度:</label>
            <input
                id="date"
                type="date"
                v-model="selectedDate"
                @change="handleDateChange"
                class="text-black p-2 rounded border-gray-300"
            />

            <label for="period" class="text-sm">期間:</label>
            <select
                id="period"
                v-model="period"
                @change="handlePeriodChange"
                class="text-black p-2 rounded border-gray-300"
            >
            <option value="month">Month</option>
            <option value="ytd">Year to Date</option>
            </select>

            <label for="hotels" class="text-sm">施設:</label>
            <MultiSelect 
                v-model="selectedHotels"                  
                :options="hotels"
                optionLabel="name" 
                optionValue="id"
                multiple
                @change="handleHotelChange"
                class="text-black p-2 rounded border-gray-300"
            >
                <option v-for="hotel in allHotels" :value="hotel.id" :key="hotel.id">
                    {{ hotel.name }}
                </option>
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

    // Primevue
    import { MultiSelect } from 'primevue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, selectedHotel, fetchHotels, fetchHotel } = useHotelStore();

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();        
    });
</script>