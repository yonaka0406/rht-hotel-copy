<script setup>
import { computed } from 'vue';

const props = defineProps({
    data: {
        type: Object,
        required: true,
        // Expected format: { actual: Array, budget: Array }
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const calculateOccupancy = (list, hotelId) => {
    const item = list.find(i => i.hotel_id === hotelId);
    if (!item || !item.available_rooms || item.available_rooms === 0) return 0;
    return (item.rooms_sold / item.available_rooms) * 100;
};

const formatPercent = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return `${val.toFixed(2)}%`;
};

const formatDiff = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    const absVal = Math.abs(val);
    const formatted = absVal.toFixed(2);
    const sign = val >= 0 ? '+' : '▲';
    return `${sign}${formatted} p.p.`;
};

const hotelRows = computed(() => {
    if (!props.data || !props.data.actual || !props.data.budget) return [];

    // Combine all hotel IDs
    const hotelIds = [...new Set([
        ...props.data.actual.map(i => i.hotel_id),
        ...props.data.budget.map(i => i.hotel_id)
    ])];

    return hotelIds.map(hotelId => {
        const actualItem = props.data.actual.find(i => i.hotel_id === hotelId);
        const budgetItem = props.data.budget.find(i => i.hotel_id === hotelId);
        const hotelName = actualItem?.hotel_name || budgetItem?.hotel_name || `Hotel ${hotelId}`;

        const actualOcc = calculateOccupancy(props.data.actual, hotelId);
        const budgetOcc = calculateOccupancy(props.data.budget, hotelId);
        const diff = actualOcc - budgetOcc;

        return {
            hotelId,
            hotelName,
            actualOcc,
            budgetOcc,
            diff
        };
    }).sort((a, b) => a.hotelName.localeCompare(b.hotelName, 'ja'));
});
</script>

<template>
    <div class="mt-8">
        <div class="flex items-center gap-2 mb-4">
            <i class="pi pi-chart-bar text-violet-600 dark:text-violet-400"></i>
            <h3 class="text-lg font-bold text-slate-900 dark:text-white">施設別稼働率予実</h3>
        </div>

        <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div class="overflow-x-auto">
                <table class="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr class="border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                            <th class="py-3 px-6 font-bold text-slate-500 dark:text-slate-400">施設名</th>
                            <th class="py-3 px-6 font-bold text-slate-900 dark:text-white text-right">予算 稼働率</th>
                            <th class="py-3 px-6 font-bold text-slate-900 dark:text-white text-right">実績 稼働率</th>
                            <th class="py-3 px-6 font-bold text-slate-900 dark:text-white text-right">差分 (p.p.)</th>
                        </tr>
                    </thead>
                    <tbody v-if="isLoading">
                        <tr v-for="i in 3" :key="i" class="animate-pulse">
                            <td class="py-4 px-6"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-32"></div></td>
                            <td class="py-4 px-6 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                            <td class="py-4 px-6 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                            <td class="py-4 px-6 text-right"><div class="h-4 bg-slate-100 dark:bg-slate-700 rounded w-16 ml-auto"></div></td>
                        </tr>
                    </tbody>
                    <tbody v-else-if="hotelRows.length > 0">
                        <tr v-for="row in hotelRows" :key="row.hotelId"
                            class="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                            <td class="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">{{ row.hotelName }}</td>
                            <td class="py-4 px-6 text-right text-slate-900 dark:text-white font-mono">{{ formatPercent(row.budgetOcc) }}</td>
                            <td class="py-4 px-6 text-right text-slate-900 dark:text-white font-mono">{{ formatPercent(row.actualOcc) }}</td>
                            <td class="py-4 px-6 text-right font-mono"
                                :class="row.diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                                <span v-tooltip.top="'実績と予算の差分（パーセンテージポイント）'">
                                    {{ formatDiff(row.diff) }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                    <tbody v-else>
                        <tr>
                            <td colspan="4" class="py-8 text-center text-slate-400">データがありません</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>
