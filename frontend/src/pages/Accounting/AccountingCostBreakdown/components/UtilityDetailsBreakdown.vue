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
    },
    occupancyData: {
        type: Array,
        default: () => []
    }
});

const accountingStore = useAccountingStore();
const loading = ref(false);
const rawUtilityData = ref([]);
const selectedType = ref('電気');
const selectedMetric = ref('quantity'); // 'quantity' or 'total_value'
const isPerRoom = ref(true); // Default to per sold room

const typeOptions = [
    { label: '電気', value: '電気' },
    { label: '水道', value: '水道' },
    { label: 'ガス', value: 'ガス' },
    { label: '灯油', value: '灯油' }
];

const chartData = computed(() => {
    if (!rawUtilityData.value.length) return [];

    // Filter by selected utility type
    const filtered = rawUtilityData.value.filter(d => d.sub_account_name.includes(selectedType.value));

    if (props.selectedHotelId === 0) {
        // === ALL HOTELS MODE: RANKING ===
        // Group by Hotel
        const byHotel = filtered.reduce((acc, curr) => {
            const id = curr.hotel_id;
            if (!acc[id]) {
                const hotelName = props.mappedHotels.find(h => h.hotel_id === id)?.hotel_name || `Hotel ${id}`;
                acc[id] = { hotel_id: id, hotel_name: hotelName, quantity: 0, total_value: 0, count: 0, sold_rooms: 0, occupancy: 0 };
            }
            acc[id].quantity += parseFloat(curr.quantity);
            acc[id].total_value += parseFloat(curr.total_value);
            acc[id].count += 1;

            // Find matching occupancy for this month/hotel
            const occ = props.occupancyData.find(o => o.month === curr.month && o.hotel_id === id);
            if (occ) {
                acc[id].sold_rooms += parseInt(occ.total_sold_rooms || 0);
                acc[id].occupancy += parseFloat(occ.occupancy_percentage || 0);
            }
            return acc;
        }, {});

        const hotels = Object.values(byHotel).map(d => ({
            ...d,
            // Monthly averages for the period
            avg_monthly_quantity: d.quantity / d.count,
            avg_monthly_value: d.total_value / d.count,
            avg_monthly_sold_rooms: d.sold_rooms / d.count,
            avg_occupancy: d.occupancy / d.count,
            // Per room metrics (using total sold rooms over period)
            quantity_per_room: d.sold_rooms > 0 ? d.quantity / d.sold_rooms : 0,
            value_per_room: d.sold_rooms > 0 ? d.total_value / d.sold_rooms : 0,
            // Weighted average unit price
            average_price: d.quantity === 0 ? 0 : d.total_value / d.quantity
        }));

        // Calculate Global Average
        const validHotels = hotels.length || 1;
        const globalAvg = {
            hotel_name: '全体平均',
            avg_monthly_quantity: hotels.reduce((sum, h) => sum + h.avg_monthly_quantity, 0) / validHotels,
            avg_monthly_value: hotels.reduce((sum, h) => sum + h.avg_monthly_value, 0) / validHotels,
            quantity_per_room: hotels.reduce((sum, h) => sum + h.quantity_per_room, 0) / validHotels,
            value_per_room: hotels.reduce((sum, h) => sum + h.value_per_room, 0) / validHotels,
            average_price: hotels.reduce((sum, h) => sum + h.average_price, 0) / validHotels,
            avg_occupancy: hotels.reduce((sum, h) => sum + h.avg_occupancy, 0) / validHotels,
            isAverage: true
        };

        return { mode: 'ranking', data: hotels, globalAvg };
    } else {
        // === SINGLE HOTEL MODE: TIME SERIES ===
        // Group by month
        const grouped = filtered.reduce((acc, curr) => {
            const month = curr.month;
            if (!acc[month]) {
                acc[month] = { month, quantity: 0, total_value: 0, count: 0, sold_rooms: 0, occupancy: 0 };
            }
            acc[month].quantity += parseFloat(curr.quantity);
            acc[month].total_value += parseFloat(curr.total_value);
            acc[month].count += 1;

            const occ = props.occupancyData.find(o => o.month === curr.month && o.hotel_id === props.selectedHotelId);
            if (occ) {
                acc[month].sold_rooms = parseInt(occ.total_sold_rooms || 0);
                acc[month].occupancy = parseFloat(occ.occupancy_percentage || 0);
            }
            return acc;
        }, {});

        const data = Object.values(grouped).map(d => ({
            ...d,
            quantity_per_room: d.sold_rooms > 0 ? d.quantity / d.sold_rooms : 0,
            value_per_room: d.sold_rooms > 0 ? d.total_value / d.sold_rooms : 0,
            average_price: d.quantity === 0 ? 0 : d.total_value / d.quantity
        })).sort((a, b) => new Date(a.month) - new Date(b.month));

        return { mode: 'time_series', data };
    }
});

const usageCostOption = computed(() => {
    const { mode, data, globalAvg } = chartData.value;
    const unit = getUtilityUnit(selectedType.value);
    const metricLabel = selectedMetric.value === 'quantity' ? '使用量' : '金額';
    const metricUnit = selectedMetric.value === 'quantity' ? unit : '¥';
    const normalizationLabel = isPerRoom.value ? '(1室あたり)' : '(合計)';
    const valueKey = isPerRoom.value 
        ? (selectedMetric.value === 'quantity' ? 'quantity_per_room' : 'value_per_room')
        : (mode === 'ranking' ? (selectedMetric.value === 'quantity' ? 'avg_monthly_quantity' : 'avg_monthly_value') : (selectedMetric.value === 'quantity' ? 'quantity' : 'total_value'));

    if (mode === 'ranking') {
        const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]);
        
        // Find correct insertion index for the average bar to place it in the sequence
        const avgVal = globalAvg[valueKey];
        const insertIdx = sorted.findIndex(h => h[valueKey] < avgVal);
        const displayData = insertIdx === -1 
            ? [...sorted, globalAvg] 
            : [...sorted.slice(0, insertIdx), globalAvg, ...sorted.slice(insertIdx)];
        
        return {
            title: { text: `${metricLabel}${normalizationLabel} 施設別ランキング`, left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const d = displayData[params[0].dataIndex];
                    const isQty = selectedMetric.value === 'quantity';
                    let html = `<div class="font-bold mb-2">${d.hotel_name}</div>`;
                    
                    const mainVal = d[valueKey];
                    const perRoomVal = d[isQty ? 'quantity_per_room' : 'value_per_room'];
                    const totalVal = d[isQty ? 'avg_monthly_quantity' : 'avg_monthly_value'];
                    
                    html += `<div class="flex justify-between gap-4 mb-1">
                        <span class="text-slate-400">表示値:</span>
                        <span class="font-bold text-violet-600">${isQty ? mainVal.toFixed(2) : Math.round(mainVal).toLocaleString()}${isPerRoom.value ? (isQty ? unit+'/室' : '円/室') : (isQty ? unit : '円')}</span>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                        <span class="text-slate-400">実数合計 (月平均):</span>
                        <span>${isQty ? totalVal.toFixed(2) : Math.round(totalVal).toLocaleString()}${isQty ? unit : '円'}</span>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                        <span class="text-slate-400">1室あたり:</span>
                        <span>${isQty ? perRoomVal.toFixed(2) : Math.round(perRoomVal).toLocaleString()}${isQty ? unit : '円'}/室</span>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mt-2 pt-2 border-t border-slate-100">
                        <span class="text-slate-400">稼働率:</span>
                        <span class="font-bold text-emerald-500">${d.avg_occupancy.toFixed(1)}%</span>
                    </div>`;
                    return html;
                }
            },
            legend: { data: [metricLabel, '稼働率'], bottom: 0 },
            grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
            xAxis: { type: 'category', data: displayData.map(d => d.hotel_name), axisLabel: { interval: 0, rotate: 45 } },
            yAxis: [
                { type: 'value', name: `${metricLabel} (${metricUnit})`, position: 'left' },
                { type: 'value', name: '稼働率 (%)', position: 'right', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
            ],
            series: [
                {
                    name: metricLabel,
                    type: 'bar',
                    data: displayData.map(d => ({
                        value: d[valueKey],
                        itemStyle: { color: d.isAverage ? '#ef4444' : (selectedMetric.value === 'quantity' ? '#fbbf24' : '#8b5cf6') }
                    }))
                },
                {
                    name: '稼働率',
                    type: 'line',
                    yAxisIndex: 1,
                    data: displayData.map(d => d.avg_occupancy),
                    itemStyle: { color: '#10b981' },
                    lineStyle: { width: 2, type: 'dashed' },
                    symbol: 'circle'
                }
            ]
        };
    } else {
        const months = data.map(d => `${new Date(d.month).getMonth() + 1}月`);
        
        return {
            title: { text: `${metricLabel}${normalizationLabel} の推移`, left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'cross' },
                formatter: (params) => {
                    const d = data[params[0].dataIndex];
                    const isQty = selectedMetric.value === 'quantity';
                    let html = `<div class="font-bold mb-2">${new Date(d.month).getMonth() + 1}月のデータ</div>`;
                    
                    const mainVal = d[valueKey];
                    const perRoomVal = d[isQty ? 'quantity_per_room' : 'value_per_room'];
                    const totalVal = d[isQty ? 'quantity' : 'total_value'];
                    
                    html += `<div class="flex justify-between gap-4 mb-1">
                        <span class="text-slate-400">${metricLabel}:</span>
                        <span class="font-bold text-violet-600">${isQty ? mainVal.toFixed(2) : Math.round(mainVal).toLocaleString()}${isPerRoom.value ? (isQty ? unit+'/室' : '円/室') : (isQty ? unit : '円')}</span>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                        <span class="text-slate-400">実数合計:</span>
                        <span>${isQty ? totalVal.toFixed(2) : Math.round(totalVal).toLocaleString()}${isQty ? unit : '円'}</span>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mb-1 text-[10px]">
                        <span class="text-slate-400">1室あたり:</span>
                        <span>${isQty ? perRoomVal.toFixed(2) : Math.round(perRoomVal).toLocaleString()}${isQty ? unit : '円'}/室</span>
                    </div>`;
                    
                    html += `<div class="flex justify-between gap-4 mt-2 pt-2 border-t border-slate-100">
                        <span class="text-slate-400">稼働率:</span>
                        <span class="font-bold text-emerald-500">${d.occupancy.toFixed(1)}%</span>
                    </div>`;
                    return html;
                }
            },
            legend: { data: [metricLabel, '稼働率'], bottom: 0 },
            grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
            xAxis: { type: 'category', data: months },
            yAxis: [
                { type: 'value', name: `${metricLabel} (${metricUnit})`, position: 'left' },
                { type: 'value', name: '稼働率 (%)', position: 'right', min: 0, max: 100, axisLabel: { formatter: '{value}%' } }
            ],
            series: [
                {
                    name: metricLabel,
                    type: 'bar',
                    data: data.map(d => d[valueKey]),
                    itemStyle: { color: selectedMetric.value === 'quantity' ? '#fbbf24' : '#8b5cf6' }
                },
                {
                    name: '稼働率',
                    type: 'line',
                    yAxisIndex: 1,
                    data: data.map(d => d.occupancy),
                    itemStyle: { color: '#10b981' },
                    lineStyle: { width: 3 },
                    smooth: true
                }
            ]
        };
    }
});

const unitPriceOption = computed(() => {
    const { mode, data, globalAvg } = chartData.value;
    const unit = getUtilityUnit(selectedType.value);

    if (mode === 'ranking') {
        const sorted = [...data].sort((a, b) => b.average_price - a.average_price);
        
        // Position average bar correctly in the sequence
        const avgVal = globalAvg.average_price;
        const insertIdx = sorted.findIndex(h => h.average_price < avgVal);
        const displayData = insertIdx === -1 
            ? [...sorted, globalAvg] 
            : [...sorted.slice(0, insertIdx), globalAvg, ...sorted.slice(insertIdx)];

        return {
            title: { text: '平均単価 施設別ランキング', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis', 
                axisPointer: { type: 'shadow' },
                formatter: (params) => {
                    const d = displayData[params[0].dataIndex];
                    return `<div class="font-bold mb-1">${d.hotel_name}</div>
                            <div class="flex justify-between gap-4">
                                <span class="text-slate-400">平均単価:</span>
                                <span class="font-bold text-emerald-500">¥${Math.round(d.average_price).toLocaleString()} / ${unit}</span>
                            </div>`;
                }
            },
            grid: { left: '3%', right: '4%', bottom: '20%', containLabel: true },
            xAxis: { type: 'category', data: displayData.map(d => d.hotel_name), axisLabel: { interval: 0, rotate: 45 } },
            yAxis: { type: 'value', name: `単価 (¥/${unit})` },
            series: [
                {
                    name: '平均単価',
                    type: 'bar',
                    data: displayData.map(d => ({
                        value: d.average_price,
                        itemStyle: { color: d.isAverage ? '#ef4444' : '#10b981' }
                    }))
                }
            ]
        };
    } else {
        const months = data.map(d => `${new Date(d.month).getMonth() + 1}月`);

        return {
            title: { text: '平均単価の推移', left: 'center', textStyle: { fontSize: 14 } },
            tooltip: { 
                trigger: 'axis',
                formatter: (params) => {
                    const d = data[params[0].dataIndex];
                    return `<div class="font-bold mb-1">${new Date(d.month).getMonth() + 1}月のデータ</div>
                            <div class="flex justify-between gap-4">
                                <span class="text-slate-400">平均単価:</span>
                                <span class="font-bold text-emerald-500">¥${Math.round(d.average_price).toLocaleString()} / ${unit}</span>
                            </div>`;
                }
            },
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
