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
                        @click="aggregationMode = 'month'"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="aggregationMode === 'month' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >単月</button>
                    <button 
                        @click="aggregationMode = 'ytd'"
                        class="px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all"
                        :class="aggregationMode === 'ytd' ? 'bg-white dark:bg-slate-800 shadow-sm text-violet-600' : 'bg-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'"
                    >累計 (YTD)</button>
                </div>
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
const aggregationMode = ref('month'); // 'month' or 'ytd'

const typeOptions = [
    { label: '電気', value: '電気' },
    { label: '水道', value: '水道' },
    { label: 'ガス', value: 'ガス' },
    { label: '灯油', value: '灯油' }
];

const chartData = computed(() => {
    if (!rawUtilityData.value.length) return [];

    const referenceMonth = props.selectedMonth;

    // Helper to filter by utility type
    const filterByType = (data) => data.filter(d => d.sub_account_name.includes(selectedType.value));
    
    // Helper to filter by time (Month or YTD)
    const filterByTime = (data, targetMonth) => {
        if (aggregationMode.value === 'month') {
            return data.filter(d => d.month === targetMonth);
        } else {
            const year = new Date(targetMonth).getFullYear();
            return data.filter(d => {
                const dDate = new Date(d.month);
                return dDate.getFullYear() === year && d.month <= targetMonth;
            });
        }
    };

    const filtered = filterByType(rawUtilityData.value);
    const filteredPrev = showPreviousYear.value ? filterByType(prevYearUtilityData.value) : [];

    if (props.selectedHotelId === 0) {
        // === ALL HOTELS MODE: RANKING ===
        const targetMonths = filterByTime(filtered, referenceMonth);
        
        // Map previous year target month
        const refDate = new Date(referenceMonth);
        const prevReferenceMonth = `${refDate.getFullYear() - 1}-${String(refDate.getMonth() + 1).padStart(2, '0')}-01`;
        const targetMonthsPrev = showPreviousYear.value ? filterByTime(filteredPrev, prevReferenceMonth) : [];

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

        const currentByHotel = groupHotels(targetMonths, props.occupancyData);
        const prevByHotel = groupHotels(targetMonthsPrev, prevOccupancyData.value);

        const hotels = Object.keys(currentByHotel).map(id => {
            const d = currentByHotel[id];
            const p = prevByHotel[id];
            
            return {
                ...d,
                // These represent the aggregate (Sum for YTD or Single Month value)
                avg_monthly_quantity: d.quantity, 
                avg_monthly_value: d.total_value,
                quantity_per_room: d.sold_rooms > 0 ? d.quantity / d.sold_rooms : 0,
                value_per_room: d.sold_rooms > 0 ? d.total_value / d.sold_rooms : 0,
                // Weighted average unit price: Sum(Value) / Sum(Quantity)
                average_price: d.quantity === 0 ? 0 : d.total_value / d.quantity,
                avg_occupancy: d.count > 0 ? d.occupancy / d.count : 0,
                
                // Previous Year Data
                prev_quantity_per_room: p && p.sold_rooms > 0 ? p.quantity / p.sold_rooms : 0,
                prev_value_per_room: p && p.sold_rooms > 0 ? p.total_value / p.sold_rooms : 0,
                prev_avg_monthly_quantity: p ? p.quantity : 0,
                prev_avg_monthly_value: p ? p.total_value : 0,
                prev_average_price: p && p.quantity > 0 ? p.total_value / p.quantity : 0,
                prev_avg_occupancy: p && p.count > 0 ? p.occupancy / p.count : 0
            };
        });

        // Global Average Calculation
        const calcGlobal = (hList, isPrev = false) => {
            const valid = hList.length || 1;
            const qKey = isPrev ? 'prev_avg_monthly_quantity' : 'avg_monthly_quantity';
            const vKey = isPrev ? 'prev_avg_monthly_value' : 'avg_monthly_value';
            const qprKey = isPrev ? 'prev_quantity_per_room' : 'quantity_per_room';
            const vprKey = isPrev ? 'prev_value_per_room' : 'value_per_room';
            const occKey = isPrev ? 'prev_avg_occupancy' : 'avg_occupancy';

            // For Price, we calculate weighted average: Sum of Values / Sum of Quantities
            const totalV = hList.reduce((sum, h) => sum + (h[vKey] || 0), 0);
            const totalQ = hList.reduce((sum, h) => sum + (h[qKey] || 0), 0);

            return {
                avg_monthly_quantity: totalQ / valid,
                avg_monthly_value: totalV / valid,
                quantity_per_room: hList.reduce((sum, h) => sum + (h[qprKey] || 0), 0) / valid,
                value_per_room: hList.reduce((sum, h) => sum + (h[vprKey] || 0), 0) / valid,
                average_price: totalQ === 0 ? 0 : totalV / totalQ,
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
            prev_avg_occupancy: gPrev.prev_avg_occupancy,
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

        const sortedMonths = Object.keys(currentByMonth).sort();

        const data = sortedMonths.map(month => {
            let d = currentByMonth[month];
            
            // Map previous year month
            const date = new Date(month);
            const prevMonthKey = `${date.getFullYear() - 1}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
            let p = prevByMonth[prevMonthKey];

            if (aggregationMode.value === 'ytd') {
                const year = date.getFullYear();
                const monthsInYearUntilNow = sortedMonths.filter(m => {
                    const mDate = new Date(m);
                    return mDate.getFullYear() === year && m <= month;
                });

                // Cumulative Current
                const aggCurrent = monthsInYearUntilNow.reduce((acc, m) => {
                    const mData = currentByMonth[m];
                    acc.quantity += mData.quantity;
                    acc.total_value += mData.total_value;
                    acc.sold_rooms += mData.sold_rooms;
                    acc.occupancySum += mData.occupancy;
                    acc.count += 1;
                    return acc;
                }, { quantity: 0, total_value: 0, sold_rooms: 0, occupancySum: 0, count: 0 });

                d = {
                    ...d,
                    quantity: aggCurrent.quantity,
                    total_value: aggCurrent.total_value,
                    sold_rooms: aggCurrent.sold_rooms,
                    occupancy: aggCurrent.occupancySum / aggCurrent.count
                };

                // Cumulative Previous
                const prevYear = year - 1;
                const monthsInPrevYearUntilNow = Object.keys(prevByMonth).filter(m => {
                    const mDate = new Date(m);
                    const refMonthInPrevYear = `${prevYear}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
                    return mDate.getFullYear() === prevYear && m <= refMonthInPrevYear;
                });

                const aggPrev = monthsInPrevYearUntilNow.reduce((acc, m) => {
                    const mData = prevByMonth[m];
                    acc.quantity += mData.quantity;
                    acc.total_value += mData.total_value;
                    acc.sold_rooms += mData.sold_rooms;
                    acc.occupancySum += mData.occupancy;
                    acc.count += 1;
                    return acc;
                }, { quantity: 0, total_value: 0, sold_rooms: 0, occupancySum: 0, count: 0 });

                if (monthsInPrevYearUntilNow.length > 0) {
                    p = {
                        quantity: aggPrev.quantity,
                        total_value: aggPrev.total_value,
                        sold_rooms: aggPrev.sold_rooms,
                        occupancy: aggPrev.occupancySum / aggPrev.count
                    };
                }
            }

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
        });

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