<template>
    <div class="flex flex-col h-screen bg-white">
        <header>
            <ReportingTopMenu
                :selectedDate="selectedDate"
                :period="period"
                :selectedHotels="selectedHotels"
                :allHotels="allHotels"
                @date-change="handleDateChange"
                @period-change="handlePeriodChange"
                @hotel-change="handleHotelChange"
            />
        </header>
        
        <main class="flex-1 overflow-auto p-6">
            <ReportingSingleMonthAllHotels
                v-if="selectedView === 'singleMonthAllHotels'"
                :revenueData="revenueData"
                :occupancyData="occupancyData"
                :selectedDate="selectedDate"
                :selectedHotels="selectedHotels"
            />
            <div v-else class="text-gray-700 text-center">
                レポートを選択してください。
            </div>
        </main>

        <footer class="bg-black text-white p-4 text-center text-sm">
            レッドホーストラスト株式会社
        </footer>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, onMounted } from 'vue';

    // Stores
    import { useHotelStore } from '@/composables/useHotelStore';
    const { hotels, selectedHotel, fetchHotels, fetchHotel } = useHotelStore();

    // State
    const selectedDate = ref(new Date());
    const period = ref('month');
    const selectedHotels = ref(hotels.value.map(h => h.id));
    //const selectedView = ref('singleMonthAllHotels');    

    import ReportingTopMenu from './components/ReportingTopMenu.vue';
    import ReportingSingleMonthAllHotels from './components/ReportingSingleMonthAllHotels.vue';

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();
    });
</script>
<style scoped>
 
</style>