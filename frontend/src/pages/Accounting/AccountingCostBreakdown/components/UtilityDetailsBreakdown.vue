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
                <div class="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-100 dark:border-slate-800 mr-2">
                    <button 
                        @click="showPreviousYear = !showPreviousYear"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all flex items-center gap-1.5"
                        :class="showPreviousYear ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >
                        <i class="pi pi-history text-[8px]"></i>
                        前年比較
                    </button>
                </div>
                <div class="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-100 dark:border-slate-800 mr-2">
                    <button 
                        @click="selectedMetric = 'quantity'"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="selectedMetric === 'quantity' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >使用量</button>
                    <button 
                        @click="selectedMetric = 'total_value'"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="selectedMetric === 'total_value' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >金額</button>
                </div>
                <div class="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-100 dark:border-slate-800 mr-2">
                    <button 
                        @click="isPerRoom = false"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="!isPerRoom ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >実数合計</button>
                    <button 
                        @click="isPerRoom = true"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="isPerRoom ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >1室あたり</button>
                </div>
                <div class="flex items-center bg-slate-50 dark:bg-slate-900/50 rounded-xl p-1 border border-slate-100 dark:border-slate-800">
                    <button 
                        v-for="opt in typeOptions" 
                        :key="opt.value"
                        @click="selectedType = opt.value"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="selectedType === opt.value ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >{{ opt.label }}</button>
                </div>
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
                <UtilityUsageChart 
                    :chartData="chartData"
                    :selectedMetric="selectedMetric"
                    :isPerRoom="isPerRoom"
                    :showPreviousYear="showPreviousYear"
                    :selectedType="selectedType"
                />
                <!-- Unit Price Chart -->
                <UtilityPriceChart 
                    :chartData="chartData"
                    :showPreviousYear="showPreviousYear"
                    :selectedType="selectedType"
                />
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import { getUtilityUnit } from '@/utils/accountingUtils';
import UtilityUsageChart from './charts/UtilityUsageChart.vue';
import UtilityPriceChart from './charts/UtilityPriceChart.vue';

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
    },
    occupancyData: {
        type: Array,
        default: () => []
    }
});

const accountingStore = useAccountingStore();
const loading = ref(false);
const rawUtilityData = ref([]);
const prevYearUtilityData = ref([]);
const prevOccupancyData = ref([]);
const selectedType = ref('電気');
const selectedMetric = ref('quantity'); // 'quantity' or 'total_value'
const isPerRoom = ref(true); // Default to per sold room
const showPreviousYear = ref(false);

const typeOptions = [
    { label: '電気', value: '電気' },
    { label: '水道', value: '水道' },
    { label: 'ガス', value: 'ガス' },
    { label: '灯油', value: '灯油' }
];

const chartData = computed(() => {
    if (!rawUtilityData.value.length) return [];

    // Filter by selected utility type
    const filterType = (data) => data.filter(d => d.sub_account_name.includes(selectedType.value));
    const filtered = filterType(rawUtilityData.value);
    const filteredPrev = showPreviousYear.value ? filterType(prevYearUtilityData.value) : [];

    if (props.selectedHotelId === 0) {
        // === ALL HOTELS MODE: RANKING ===
        const groupHotels = (data, occData) => data.reduce((acc, curr) => {
            const id = curr.hotel_id;
            if (!acc[id]) {
                const hotelName = props.mappedHotels.find(h => h.hotel_id === id)?.hotel_name || `Hotel ${id}`;
                acc[id] = { hotel_id: id, hotel_name: hotelName, quantity: 0, total_value: 0, count: 0, sold_rooms: 0, occupancy: 0 };
            }
            acc[id].quantity += parseFloat(curr.quantity);
            acc[id].total_value += parseFloat(curr.total_value);
            acc[id].count += 1;

            const occ = occData.find(o => o.month === curr.month && o.hotel_id === id);
            if (occ) {
                acc[id].sold_rooms += parseInt(occ.total_sold_rooms || 0);
                acc[id].occupancy += parseFloat(occ.occupancy_percentage || 0);
            }
            return acc;
        }, {});

        const currentByHotel = groupHotels(filtered, props.occupancyData);
        const prevByHotel = groupHotels(filteredPrev, prevOccupancyData.value);

        const hotels = Object.keys(currentByHotel).map(id => {
            const d = currentByHotel[id];
            const p = prevByHotel[id];
            
            return {
                ...d,
                avg_monthly_quantity: d.quantity / d.count,
                avg_monthly_value: d.total_value / d.count,
                quantity_per_room: d.sold_rooms > 0 ? d.quantity / d.sold_rooms : 0,
                value_per_room: d.sold_rooms > 0 ? d.total_value / d.sold_rooms : 0,
                average_price: d.quantity === 0 ? 0 : d.total_value / d.quantity,
                avg_occupancy: d.occupancy / d.count,
                
                // Previous Year Data
                prev_quantity_per_room: p && p.sold_rooms > 0 ? p.quantity / p.sold_rooms : 0,
                prev_value_per_room: p && p.sold_rooms > 0 ? p.total_value / p.sold_rooms : 0,
                prev_avg_monthly_quantity: p ? p.quantity / p.count : 0,
                prev_avg_monthly_value: p ? p.total_value / p.count : 0,
                prev_average_price: p && p.quantity > 0 ? p.total_value / p.quantity : 0,
                prev_avg_occupancy: p ? p.occupancy / p.count : 0
            };
        });

        // Global Average Calculation
        const calcGlobal = (hList, isPrev = false) => {
            const valid = hList.length || 1;
            const qKey = isPrev ? 'prev_avg_monthly_quantity' : 'avg_monthly_quantity';
            const vKey = isPrev ? 'prev_avg_monthly_value' : 'avg_monthly_value';
            const qprKey = isPrev ? 'prev_quantity_per_room' : 'quantity_per_room';
            const vprKey = isPrev ? 'prev_value_per_room' : 'value_per_room';
            const prcKey = isPrev ? 'prev_average_price' : 'average_price';
            const occKey = isPrev ? 'prev_avg_occupancy' : 'avg_occupancy';

            return {
                avg_monthly_quantity: hList.reduce((sum, h) => sum + (h[qKey] || 0), 0) / valid,
                avg_monthly_value: hList.reduce((sum, h) => sum + (h[vKey] || 0), 0) / valid,
                quantity_per_room: hList.reduce((sum, h) => sum + (h[qprKey] || 0), 0) / valid,
                value_per_room: hList.reduce((sum, h) => sum + (h[vprKey] || 0), 0) / valid,
                average_price: hList.reduce((sum, h) => sum + (h[prcKey] || 0), 0) / valid,
                avg_occupancy: hList.reduce((sum, h) => sum + (h[occKey] || 0), 0) / valid
            };
        };

        const gCurrent = calcGlobal(hotels, false);
        const gPrev = calcGlobal(hotels, true);

        const globalAvg = {
            hotel_name: '全体平均',
            ...gCurrent,
            prev_quantity_per_room: gPrev.quantity_per_room,
            prev_value_per_room: gPrev.value_per_room,
            prev_avg_monthly_quantity: gPrev.avg_monthly_quantity,
            prev_avg_monthly_value: gPrev.avg_monthly_value,
            prev_average_price: gPrev.average_price,
            prev_avg_occupancy: gPrev.avg_occupancy,
            isAverage: true
        };

        return { mode: 'ranking', data: hotels, globalAvg };
    } else {
        // === SINGLE HOTEL MODE: TIME SERIES ===
        const groupMonths = (data, occData) => data.reduce((acc, curr) => {
            const month = curr.month;
            if (!acc[month]) {
                acc[month] = { month, quantity: 0, total_value: 0, count: 0, sold_rooms: 0, occupancy: 0 };
            }
            acc[month].quantity += parseFloat(curr.quantity);
            acc[month].total_value += parseFloat(curr.total_value);
            acc[month].count += 1;

            const occ = occData.find(o => o.month === curr.month && o.hotel_id === props.selectedHotelId);
            if (occ) {
                acc[month].sold_rooms = parseInt(occ.total_sold_rooms || 0);
                acc[month].occupancy = parseFloat(occ.occupancy_percentage || 0);
            }
            return acc;
        }, {});

        const currentByMonth = groupMonths(filtered, props.occupancyData);
        const prevByMonth = groupMonths(filteredPrev, prevOccupancyData.value);

        const data = Object.keys(currentByMonth).map(month => {
            const d = currentByMonth[month];
            
            // Map previous year month: e.g., if month is 2025-05, we look for 2024-05 in prevByMonth
            const date = new Date(month);
            const prevMonthKey = `${date.getFullYear() - 1}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
            const p = prevByMonth[prevMonthKey];

            return {
                ...d,
                quantity_per_room: d.sold_rooms > 0 ? d.quantity / d.sold_rooms : 0,
                value_per_room: d.sold_rooms > 0 ? d.total_value / d.sold_rooms : 0,
                average_price: d.quantity === 0 ? 0 : d.total_value / d.quantity,
                
                prev_quantity_per_room: p && p.sold_rooms > 0 ? p.quantity / p.sold_rooms : 0,
                prev_value_per_room: p && p.sold_rooms > 0 ? p.total_value / p.sold_rooms : 0,
                prev_quantity: p ? p.quantity : 0,
                prev_total_value: p ? p.total_value : 0,
                prev_average_price: p && p.quantity > 0 ? p.total_value / p.quantity : 0,
                prev_occupancy: p ? p.occupancy : 0
            };
        }).sort((a, b) => new Date(a.month) - new Date(b.month));

        return { mode: 'time_series', data };
    }
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

        const fetchForParams = async (p) => {
            if (props.selectedHotelId !== 0) {
                const [details, breakdown] = await Promise.all([
                    accountingStore.fetchUtilityDetails({ ...p, hotelId: props.selectedHotelId }),
                    accountingStore.fetchCostBreakdown({ topN: 1 }) // Used to get occupancy data
                ]);
                return { details: details || [], occupancy: breakdown?.data?.occupancyData || [] };
            } else if (props.mappedHotels?.length > 0) {
                const [allDetails, breakdown] = await Promise.all([
                    Promise.all(props.mappedHotels.map(h =>
                        accountingStore.fetchUtilityDetails({ ...p, hotelId: h.hotel_id })
                    )),
                    accountingStore.fetchCostBreakdown({ topN: 1 })
                ]);
                return { details: allDetails.flat(), occupancy: breakdown?.data?.occupancyData || [] };
            }
            return { details: [], occupancy: [] };
        };

        const currentResult = await fetchForParams(params);
        rawUtilityData.value = currentResult.details;
        // occupancyData is passed as prop, but if we need more context we use the result

        if (showPreviousYear.value) {
            const prevParams = {
                startMonth: formatDate(new Date(twelveMonthsAgo.getFullYear() - 1, twelveMonthsAgo.getMonth(), 1)),
                endMonth: formatDate(new Date(referenceDate.getFullYear() - 1, referenceDate.getMonth(), 1)),
                filterBy: 'month'
            };
            const prevResult = await fetchForParams(prevParams);
            prevYearUtilityData.value = prevResult.details;
            prevOccupancyData.value = prevResult.occupancy;
        } else {
            prevYearUtilityData.value = [];
            prevOccupancyData.value = [];
        }

    } catch (e) {
        console.error('Failed to fetch utility details for breakdown:', e);
    } finally {
        loading.value = false;
    }
};

watch(() => [props.selectedHotelId, props.selectedMonth, showPreviousYear.value], fetchData);

onMounted(fetchData);
</script>