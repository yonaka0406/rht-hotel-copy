<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-4">予約数変動 (昨日/今日)</h3>
        <div v-if="loading" class="flex justify-center items-center">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>
        <div v-else-if="error" class="text-red-500 bg-red-100 border border-red-400 p-4 rounded">
            <p class="font-bold">エラーが発生しました</p>
            <p>{{ error }}</p>
        </div>
        <div v-else-if="reportData" class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-calendar mr-2"></i>
                        <span>昨日</span>
                    </div>
                </template>
                <template #content>
                    <p class="text-sm text-gray-600 mb-1">スナップショット日時:</p>
                    <p class="mb-3 font-mono">{{ formatDateTime(reportData.yesterday_snapshot) }}</p>
                    <p class="text-sm text-gray-600 mb-1">アクティブ予約数:</p>
                    <p class="text-3xl font-bold text-blue-600">{{ reportData.count_yesterday }}</p>
                </template>
            </Card>
            <Card>
                <template #title>
                    <div class="flex items-center">
                        <i class="pi pi-calendar-plus mr-2"></i>
                        <span>本日</span>
                    </div>
                </template>
                <template #content>
                    <p class="text-sm text-gray-600 mb-1">スナップショット日時:</p>
                    <p class="mb-3 font-mono">{{ formatDateTime(reportData.today_snapshot) }}</p>
                    <p class="text-sm text-gray-600 mb-1">アクティブ予約数:</p>
                    <p class="text-3xl font-bold text-green-600">{{ reportData.count_today }}</p>
                </template>
            </Card>
        </div>
        <div v-else class="text-gray-500">
            データがありません。適切なホテルが選択されているか確認してください。
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useReportStore } from '@/composables/useReportStore';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';

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

const { fetchActiveReservationsChange } = useReportStore();
const reportData = ref(null);
const loading = ref(false);
const error = ref(null);

const formatDateTime = (isoString) => {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '無効な日付';
        }
        return date.toLocaleString('ja-JP', { 
            year: 'numeric', month: '2-digit', day: '2-digit', 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false 
        });
    } catch (e) {
        console.error("Error formatting date:", e);
        return '日付フォーマットエラー';
    }
};

const fetchReportData = async () => {
    if (props.hotelId === null || typeof props.hotelId === 'undefined' || props.hotelId === '') {
        reportData.value = null; 
        error.value = 'ホテルが選択されていません。';
        loading.value = false;
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        // console.log(`Fetching active reservations change for hotel: ${props.hotelId}, trigger: ${props.triggerFetch}`);
        const data = await fetchActiveReservationsChange(props.hotelId);
        reportData.value = data;
        // console.log('Fetched data for active reservations change:', data);
    } catch (err) {
        console.error('Failed to fetch active reservations change report:', err);
        error.value = err.message || 'データの取得中にエラーが発生しました。';
        reportData.value = null; // Clear previous data on error
    } finally {
        loading.value = false;
    }
};

// Watch for changes in props and trigger fetch
// immediate: true ensures it runs on component mount
watch(() => [props.hotelId, props.triggerFetch], fetchReportData, { immediate: true, deep: true });

</script>

<style scoped>
/* Using Tailwind CSS utility classes, so specific styles might not be needed here often */
/* However, you can add them if required: */
/* For example, to ensure Card titles are a certain size if not overridable by PrimeVue theme */
/* :deep(.p-card-title) { 
    font-size: 1.125rem; 
} */
</style>
