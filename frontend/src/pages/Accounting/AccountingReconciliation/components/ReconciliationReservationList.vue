<script setup>
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import { formatDateToYMD } from '@/utils/dateUtils';
import { translateReservationStatus } from '@/utils/reservationUtils';

const props = defineProps({
    selectedClient: {
        type: Object,
        default: null
    },
    clientDetails: {
        type: Array,
        default: () => []
    },
    isLoading: {
        type: Boolean,
        default: false
    },
    selectedDate: {
        type: Date,
        required: true
    }
});

defineEmits(['open-reservation', 'open-in-new-tab']);

const formatCurrency = (val) => {
    return Number(val).toLocaleString('ja-JP', { style: 'currency', currency: 'JPY' });
};

const getBalanceLabel = (cumulativeDifference, checkIn = null) => {
    if (Math.abs(cumulativeDifference) <= 1) return '精算済';
    if (cumulativeDifference < -1) return '未収あり';
    
    // Positive balance
    if (checkIn) {
        const monthEnd = new Date(props.selectedDate.getFullYear(), props.selectedDate.getMonth() + 1, 0);
        const checkInDate = new Date(checkIn);
        if (checkInDate > monthEnd) {
            return '事前払い';
        }
    }
    return '過入金';
};
</script>

<template>
    <div class="lg:col-span-4">
        <div v-if="selectedClient" class="sticky top-6">
            <section class="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div class="p-4 bg-violet-50 dark:bg-violet-900/10 border-b border-violet-100 dark:border-violet-900/30">
                    <h3 class="font-bold text-violet-900 dark:text-violet-200">予約別内訳: {{ selectedClient.client_name }}</h3>
                    <p class="text-[10px] text-violet-600 dark:text-violet-400 uppercase font-bold mt-1">
                        差異: {{ (selectedClient.difference > 0 ? '+' : '') + formatCurrency(selectedClient.difference) }}
                    </p>
                </div>
                
                <div v-if="isLoading" class="p-12 flex justify-center">
                    <ProgressSpinner style="width: 40px; height: 40px" />
                </div>
                
                <div v-else-if="clientDetails.length" class="divide-y divide-slate-100 dark:divide-slate-700">
                    <div v-for="res in clientDetails" :key="res.reservation_id" class="p-4 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                        <div class="flex justify-between items-start mb-2">
                            <div>
                                <span class="text-xs font-bold text-slate-400">#{{ res.reservation_id.substring(0,8) }}</span>
                                <p class="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    {{ formatDateToYMD(res.check_in) }} ～ {{ formatDateToYMD(res.check_out) }}
                                </p>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <Tag :value="translateReservationStatus(res.status)" severity="info" class="text-[10px]" />
                                <!-- Balance Status as of Month End -->
                                <Tag 
                                    :value="'当月末' + getBalanceLabel(res.cumulative_difference, res.check_in)" 
                                    :severity="Math.abs(res.cumulative_difference) <= 1 ? 'success' : (res.cumulative_difference > 0 ? 'warn' : 'danger')" 
                                    class="text-[9px]" 
                                />
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-xs mb-1">
                            <div class="text-slate-500">今月売上: <span class="text-slate-700 dark:text-slate-300">{{ formatCurrency(res.month_sales) }}</span></div>
                            <div class="text-slate-500">今月入金: <span class="text-slate-700 dark:text-slate-300">{{ formatCurrency(res.month_payments) }}</span></div>
                        </div>
                        <div class="text-[10px] text-slate-400 mb-3 flex flex-col gap-0.5">
                            <div class="flex justify-between">
                                <span>前月繰越: {{ formatCurrency(res.brought_forward_balance) }}</span>
                                <span class="font-bold" :class="res.cumulative_difference < 0 ? 'text-rose-500' : 'text-emerald-600'">当月末残高: {{ formatCurrency(res.cumulative_difference) }}</span>
                            </div>
                            <div class="border-t border-slate-100 dark:border-slate-800 pt-1 mt-1 opacity-60">
                                全体合計: 売上 {{ formatCurrency(res.total_sales) }} / 入金 {{ formatCurrency(res.total_payments) }}
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <Button icon="pi pi-pencil" label="修正" class="p-button-xs flex-1" severity="secondary" @click="$emit('open-reservation', res.reservation_id)" />
                            <Button icon="pi pi-external-link" text class="p-button-xs" severity="secondary" @click="$emit('open-in-new-tab', res.reservation_id)" title="別タブで開く" />
                        </div>
                    </div>
                </div>
                
                <div v-else class="p-8 text-center text-slate-400 italic">
                    データがありません
                </div>
            </section>
        </div>
        
        <div v-else class="bg-slate-100 dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
            <i class="pi pi-search text-3xl text-slate-300 mb-4"></i>
            <p class="text-slate-400 text-sm">左の表から施設・顧客を選択して<br>差異のある予約を特定してください</p>
        </div>
    </div>
</template>

<style scoped>
:deep(.p-button-xs) {
    padding: 0.4rem 0.6rem;
    font-size: 0.75rem;
}
</style>