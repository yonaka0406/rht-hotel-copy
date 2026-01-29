<template>
    <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div class="p-6 border-b border-slate-200 dark:border-slate-700">
            <h2 class="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <i class="pi pi-building text-violet-600 dark:text-violet-400"></i>
                ホテル別概要
            </h2>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
                各ホテルのPMS売上と弥生データの比較概要
            </p>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full">
                <thead class="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            ホテル名
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            PMS売上合計
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            弥生データ合計
                        </th>
                        <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            差額
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            問題件数
                        </th>
                        <th class="px-6 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            操作
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr v-for="hotel in hotelSummary" :key="hotel.hotel_id"
                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="px-6 py-4">
                            <div class="font-medium text-slate-900 dark:text-white">{{ hotel.hotel_name }}</div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-medium text-slate-900 dark:text-white">
                                ¥{{ new Intl.NumberFormat('ja-JP').format(hotel.total_pms_amount) }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-medium text-slate-900 dark:text-white">
                                ¥{{ new Intl.NumberFormat('ja-JP').format(hotel.total_yayoi_amount) }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-right">
                            <div class="text-sm font-medium"
                                 :class="hotel.total_difference >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                                {{ hotel.total_difference >= 0 ? '+' : '' }}¥{{ new Intl.NumberFormat('ja-JP').format(Math.abs(hotel.total_difference)) }}
                            </div>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2">
                                <span v-if="hotel.issue_count > 0" 
                                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                    {{ hotel.issue_count }}件
                                </span>
                                <span v-else 
                                      class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                    正常
                                </span>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <button @click="$emit('viewHotelDetails', hotel.hotel_id, hotel.hotel_name)"
                                    class="inline-flex items-center px-3 py-1 bg-violet-100 hover:bg-violet-200 dark:bg-violet-900/30 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 text-xs font-medium rounded-lg transition-colors">
                                <i class="pi pi-eye mr-1"></i>
                                詳細表示
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup>
defineProps({
    hotelSummary: {
        type: Array,
        required: true
    }
});

defineEmits(['viewHotelDetails']);
</script>