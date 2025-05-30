<template>
    <div class="p-4">
        <h3 class="text-xl font-semibold mb-2">予約進化 (OTBマトリクス) - {{ formatTargetMonthForDisplay(props.targetMonth) }}</h3>
        
        <div v-if="loading" class="flex justify-center items-center py-10">
            <ProgressSpinner style="width: 50px; height: 50px" strokeWidth="8" animationDuration=".5s" />
        </div>
        <div v-else-if="error" class="text-red-500 bg-red-100 border border-red-400 p-4 rounded">
            <p class="font-bold">エラーが発生しました</p>
            <p>{{ error }}</p>
        </div>
        <div v-else>
            <Panel toggleable class="mb-6">
                <template #header>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-table"></i>
                        <span class="font-semibold">OTBマトリクス</span>
                    </div>
                </template>
                <DataTable :value="matrixData" responsiveLayout="scroll" scrollable scrollHeight="400px" showGridlines stripedRows size="small" v-if="matrixData.length">
                    <Column field="stay_date" header="滞在日" :sortable="true" style="min-width: 120px;">
                         <template #body="slotProps">
                            {{ formatDate(slotProps.data.stay_date) }}
                        </template>
                    </Column>
                    <Column field="lead_days" header="リード日数" :sortable="true" style="min-width: 100px;"></Column>
                    <Column field="booked_room_nights_count" header="予約室数" :sortable="true" style="min-width: 100px;"></Column>
                </DataTable>
                <p v-else class="text-gray-500 p-4">マトリクスデータがありません。</p>
            </Panel>

            <Panel toggleable>
                 <template #header>
                    <div class="flex items-center gap-2">
                        <i class="pi pi-chart-line"></i>
                        <span class="font-semibold">平均OTB (リード日数別)</span>
                    </div>
                </template>
                <Chart type="line" :data="chartData" :options="chartOptions" style="height: 400px" v-if="averageData.length && chartData" />
                <!-- Fallback to DataTable for averageData if chartData is somehow null but averageData exists -->
                <DataTable :value="averageData" responsiveLayout="scroll" v-else-if="averageData.length && !chartData" class="mt-4">
                     <Column field="lead_days" header="リード日数" :sortable="true"></Column>
                     <Column field="avg_booked_room_nights" header="平均予約室数" :sortable="true">
                        <template #body="slotProps">
                            {{ parseFloat(slotProps.data.avg_booked_room_nights).toFixed(2) }}
                        </template>
                     </Column>
                </DataTable>
                <p v-else class="text-gray-500 p-4">平均OTBデータがありません。</p>
            </Panel>
        </div>
    </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useReportStore } from '@/composables/useReportStore';
import ProgressSpinner from 'primevue/progressspinner';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Chart from 'primevue/chart';
import Panel from 'primevue/panel';


const props = defineProps({
    hotelId: { type: [Number, String], required: true },
    targetMonth: { type: String, required: true }, // YYYY-MM-DD, first day of month
    triggerFetch: { type: [String, Number, Object, Boolean], default: () => new Date().toISOString() }
});

const { fetchMonthlyReservationEvolution } = useReportStore();
const matrixData = ref([]);
const averageData = ref([]);
const loading = ref(false);
const error = ref(null);

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

const formatTargetMonthForDisplay = (isoDateString) => {
    if (!isoDateString) return '';
    try {
        const date = new Date(isoDateString);
        if (isNaN(date.getTime())) return '無効な日付';
        return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`;
    } catch (e) {
        return '日付フォーマットエラー';
    }
};

const fetchReportData = async () => {
    if (!props.hotelId || !props.targetMonth) {
        matrixData.value = [];
        averageData.value = [];
        error.value = 'ホテルIDと対象月を選択してください。';
        loading.value = false; // Ensure loading is false if prerequisites aren't met
        return;
    }
    loading.value = true;
    error.value = null;
    try {
        // console.log(`Fetching OTB Evolution for hotel: ${props.hotelId}, month: ${props.targetMonth}, trigger: ${props.triggerFetch}`);
        const rawData = await fetchMonthlyReservationEvolution(props.hotelId, props.targetMonth);
        matrixData.value = rawData.map(item => ({
            ...item,
            stay_date: item.stay_date // Assuming it's already in 'YYYY-MM-DD' or a parsable format
        }));

        if (rawData && rawData.length > 0) {
            const leadDayMap = new Map();
            rawData.forEach(item => {
                const count = parseInt(item.booked_room_nights_count, 10);
                if (isNaN(count)) return; // Skip if count is not a number

                if (!leadDayMap.has(item.lead_days)) {
                    leadDayMap.set(item.lead_days, { sum: 0, count: 0, items: 0 });
                }
                const current = leadDayMap.get(item.lead_days);
                current.sum += count;
                current.items++; // Number of records for this lead_day
            });
            
            averageData.value = Array.from(leadDayMap.entries()).map(([lead_days, data]) => ({
                lead_days: parseInt(lead_days, 10), // Ensure lead_days is a number for sorting
                avg_booked_room_nights: data.items > 0 ? data.sum / data.items : 0
            })).sort((a, b) => a.lead_days - b.lead_days);

        } else {
            averageData.value = [];
        }
    } catch (err) {
        console.error('Failed to fetch OTB Evolution report:', err);
        error.value = err.message || 'データの取得中にエラーが発生しました。';
        matrixData.value = [];
        averageData.value = [];
    } finally {
        loading.value = false;
    }
};

watch(() => [props.hotelId, props.targetMonth, props.triggerFetch], fetchReportData, { immediate: true, deep: true });

const chartData = computed(() => {
    if (!averageData.value || averageData.value.length === 0) {
        // Return a structure that Chart.js expects, even if empty, to avoid errors
        return {
            labels: [],
            datasets: [{
                label: '平均予約室数',
                data: [],
                borderColor: '#42A5F5',
                tension: 0.1
            }]
        };
    }
    return {
        labels: averageData.value.map(item => item.lead_days.toString()), // Ensure labels are strings
        datasets: [
            {
                label: '平均予約室数',
                data: averageData.value.map(item => parseFloat(item.avg_booked_room_nights).toFixed(2)),
                fill: false,
                borderColor: '#42A5F5',
                tension: 0.1
            }
        ]
    };
});

const chartOptions = ref({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                color: '#495057'
            }
        }
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'リード日数 (Lead Days)',
                color: '#495057'
            },
            ticks: {
                color: '#495057'
            },
            grid: {
                color: '#ebedef'
            }
        },
        y: {
            title: {
                display: true,
                text: '平均予約室数',
                color: '#495057'
            },
            ticks: {
                color: '#495057',
                precision: 0.1 // Show decimal if average is like 0.5
            },
            grid: {
                color: '#ebedef'
            },
            beginAtZero: true
        }
    }
});

</script>

<style scoped>
/* Using Tailwind CSS utility classes. */
/* :deep() can be used to style child components from PrimeVue if needed */
/* e.g., :deep(.p-panel-header) { background-color: #f0f0f0; } */
</style>
