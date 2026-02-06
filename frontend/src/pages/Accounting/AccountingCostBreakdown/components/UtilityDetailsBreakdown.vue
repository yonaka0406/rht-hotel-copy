<template>
    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden mb-8">
        <div class="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h2 class="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <i class="pi pi-bolt text-amber-500"></i>
                    光熱費詳細分析
                </h2>
                <p class="text-xs text-slate-400 mt-1">使用量・単価・コストの推移分析</p>
            </div>

            <div class="flex items-center gap-2">
                <SelectButton v-model="selectedType" :options="typeOptions" optionLabel="label" optionValue="value" class="text-xs" />
            </div>
        </div>

        <div class="p-6">
            <div v-if="loading" class="h-80 flex items-center justify-center">
                <i class="pi pi-spin pi-spinner text-3xl text-violet-600"></i>
            </div>
            <div v-else-if="chartData.length === 0" class="h-80 flex flex-col items-center justify-center text-slate-400">
                <i class="pi pi-info-circle text-4xl mb-2"></i>
                <p>この期間の光熱費詳細データはありません</p>
            </div>
            <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Usage & Cost Chart -->
                <div class="h-80">
                    <v-chart class="h-full w-full" :option="usageCostOption" autoresize />
                </div>
                <!-- Unit Price Chart -->
                <div class="h-80">
                    <v-chart class="h-full w-full" :option="unitPriceOption" autoresize />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { getUtilityUnit } from '@/utils/accountingUtils';
import SelectButton from 'primevue/selectbutton';
import VChart from 'vue-echarts';

const props = defineProps({
    selectedHotelId: {
        type: Number,
        required: true
    },
    selectedMonth: {
        type: String,
        default: null
    },
    latestMonth: {
        type: String,
        default: null
    },
    mappedHotels: {
        type: Array,
        default: () => []
    }
});

const accountingStore = useAccountingStore();
const loading = ref(false);
const rawUtilityData = ref([]);
const selectedType = ref('電気');

const typeOptions = [
    { label: '電気', value: '電気' },
    { label: '水道', value: '水道' },
    { label: 'ガス', value: 'ガス' }
];

const chartData = computed(() => {
    if (!rawUtilityData.value.length) return [];

    // Group by month and type
    const filtered = rawUtilityData.value.filter(d => d.sub_account_name.includes(selectedType.value));

    const grouped = filtered.reduce((acc, curr) => {
        const month = curr.month;
        if (!acc[month]) {
            acc[month] = { month, quantity: 0, total_value: 0, count: 0 };
        }
        acc[month].quantity += parseFloat(curr.quantity);
        acc[month].total_value += parseFloat(curr.total_value);
        acc[month].count += 1;
        return acc;
    }, {});

    return Object.values(grouped).map(d => ({
        ...d,
        // If All Hotels, show average per hotel
        quantity: props.selectedHotelId === 0 ? d.quantity / d.count : d.quantity,
        total_value: props.selectedHotelId === 0 ? d.total_value / d.count : d.total_value,
        average_price: d.quantity === 0 ? 0 : d.total_value / d.quantity
    })).sort((a, b) => new Date(a.month) - new Date(b.month));
});

const usageCostOption = computed(() => {
    const data = chartData.value;
    const months = data.map(d => `${new Date(d.month).getMonth() + 1}月`);
    const unit = getUtilityUnit(selectedType.value);
    const scopeLabel = props.selectedHotelId === 0 ? '(全施設1館あたり平均)' : '';

    return {
        title: { text: `使用量と合計金額 ${scopeLabel}`, left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
        legend: { data: ['使用量', '合計金額'], bottom: 0 },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: months },
        yAxis: [
            { type: 'value', name: `使用量 (${unit})`, position: 'left' },
            { type: 'value', name: '金額 (¥)', position: 'right', axisLabel: { formatter: '¥{value}' } }
        ],
        series: [
            {
                name: '使用量',
                type: 'bar',
                data: data.map(d => d.quantity),
                itemStyle: { color: '#fbbf24' }
            },
            {
                name: '合計金額',
                type: 'line',
                yAxisIndex: 1,
                data: data.map(d => d.total_value),
                itemStyle: { color: '#8b5cf6' },
                lineStyle: { width: 3 }
            }
        ]
    };
});

const unitPriceOption = computed(() => {
    const data = chartData.value;
    const months = data.map(d => `${new Date(d.month).getMonth() + 1}月`);
    const unit = getUtilityUnit(selectedType.value);

    return {
        title: { text: '平均単価の推移', left: 'center', textStyle: { fontSize: 14 } },
        tooltip: { trigger: 'axis' },
        grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
        xAxis: { type: 'category', data: months },
        yAxis: { type: 'value', name: `単価 (¥/${unit})` },
        series: [
            {
                name: '平均単価',
                type: 'line',
                data: data.map(d => d.average_price),
                itemStyle: { color: '#10b981' },
                areaStyle: { opacity: 0.1 },
                smooth: true
            }
        ]
    };
});

const fetchData = async () => {
    if (!props.selectedMonth) return;

    loading.value = true;
    try {
        const referenceDate = new Date(props.selectedMonth);
        const twelveMonthsAgo = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 11, 1);

        const formatDate = (date) => {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            return `${y}-${m}-01`;
        };

        const params = {
            startMonth: formatDate(twelveMonthsAgo),
            endMonth: formatDate(referenceDate),
            filterBy: 'month'
        };

        if (props.selectedHotelId !== 0) {
            const data = await accountingStore.fetchUtilityDetails({
                ...params,
                hotelId: props.selectedHotelId
            });
            rawUtilityData.value = data || [];
        } else if (props.mappedHotels?.length > 0) {
            const allDetails = await Promise.all(props.mappedHotels.map(h =>
                accountingStore.fetchUtilityDetails({ ...params, hotelId: h.hotel_id })
            ));
            rawUtilityData.value = allDetails.flat();
        } else {
            rawUtilityData.value = [];
        }
    } catch (e) {
        console.error('Failed to fetch utility details for breakdown:', e);
    } finally {
        loading.value = false;
    }
};

watch(() => [props.selectedHotelId, props.selectedMonth], fetchData);

onMounted(fetchData);
</script>
