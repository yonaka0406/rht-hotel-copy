<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">在庫比較 (指定日とその前日)</h3>
        <div v-if="loading" class="flex justify-center items-center">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>
        <div v-else-if="error" class="text-red-500 bg-red-100 border border-red-400 p-4 rounded">
            <p class="font-bold">エラーが発生しました</p>
            <p>{{ error }}</p>
        </div>
        <div v-else-if="reportData && reportData.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-calendar mr-2"></i>
                        <span>前日 ({{ getPreviousDay(getTodayDateString()) }})</span>
                    </div>
                </template>
                <template #content>                    
                    <p class="text-sm text-gray-600 mb-1">在庫数:</p>
                    <p class="text-3xl font-bold text-blue-600">{{ reportData[0].count_as_of_previous_day_end }}</p>
                </template>
            </Card>
            <Card>
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-calendar-plus mr-2"></i>
                        <span>指定日 ({{ getTodayDateString() }})</span>
                    </div>
                </template>
                <template #content>                    
                    <p class="text-sm text-gray-600 mb-1">在庫数:</p>
                    <p class="text-3xl font-bold text-green-600">{{ reportData[0].count_as_of_snapshot_day_end }}</p>
                </template>
            </Card>
        </div>
        <div v-else class="text-gray-500">
            データがありません。適切なホテルが選択されているか、または指定日にデータが存在するか確認してください。
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { ref, watch } from 'vue';
    const props = defineProps({
        hotelId: {
            type: [Number, String], // Can be number or 'all'
            required: true
        },
        triggerFetch: { // Used to re-trigger fetch from parent if other params change
            type: [String, Number, Object, Boolean], // Allow boolean to easily toggle
            default: () => new Date().toISOString(),
        }
    });

    // Store
    import { useReportStore } from '@/composables/useReportStore';
    const { fetchActiveReservationsChange } = useReportStore();

    // Primevue
    import ProgressSpinner from 'primevue/progressspinner';
    import Card from 'primevue/card';

    // Refs
    const reportData = ref([]);
    const loading = ref(false);
    const error = ref(null);

    // Helper function to get today's date in YYYY-MM-DD format
    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    // Helper function to get the previous day in YYYY-MM-DD format
    const getPreviousDay = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const dateParts = dateString.split('-');
            // Ensure date parts are valid before creating a Date object
            if (dateParts.length === 3) {
                const year = parseInt(dateParts[0], 10);
                const month = parseInt(dateParts[1], 10) -1; // JS months are 0-indexed
                const day = parseInt(dateParts[2], 10);

                const currentDate = new Date(Date.UTC(year, month, day)); // Use UTC to avoid timezone issues with date-only
                currentDate.setUTCDate(currentDate.getUTCDate() - 1);
                
                const prevYear = currentDate.getUTCFullYear();
                const prevMonth = String(currentDate.getUTCMonth() + 1).padStart(2, '0');
                const prevDay = String(currentDate.getUTCDate()).padStart(2, '0');
                return `${prevYear}-${prevMonth}-${prevDay}`;
            }
            return '無効な日付';

        } catch (e) {
            console.error("Error calculating previous date:", e);
            return '日付計算エラー';
        }
    };

    const fetchReportData = async () => {
        if (props.hotelId === null || typeof props.hotelId === 'undefined' || props.hotelId === '') {
            reportData.value = []; 
            error.value = 'ホテルが選択されていません。';
            loading.value = false;
            return;
        }
        loading.value = true;
        error.value = null;
        reportData.value = []; // Clear previous data

        try {
            const todayDateString = getTodayDateString();
            // console.log(`Fetching room inventory report for hotel: ${props.hotelId}, date: ${todayDateString}, trigger: ${props.triggerFetch}`);
            
            // Call the new store function with hotelId and today's date
            const data = await fetchActiveReservationsChange(props.hotelId, todayDateString);
            
            // The store function fetchActiveReservationsChange should return an array directly
            // or handle the { message: '...', data: [] } structure internally.
            // Let's assume it returns the array of data rows.
            if (Array.isArray(data)) {
                reportData.value = data;
            } else {
                // This case should ideally be handled within fetchActiveReservationsChange
                // For safety, if it returns something unexpected:
                console.warn("fetchActiveReservationsChange did not return an array:", data);
                reportData.value = []; 
            }
            // console.log('Fetched data for room inventory report:', data);

        } catch (err) {
            console.error('Failed to fetch room inventory report:', err);
            error.value = err.message || 'データの取得中にエラーが発生しました。';
            reportData.value = []; // Clear data on error
        } finally {
            loading.value = false;
        }
    };

    // Watch for changes in props and trigger fetch
    watch(() => [props.hotelId, props.triggerFetch], fetchReportData, { immediate: true, deep: true });

</script>

<style scoped>

</style>
