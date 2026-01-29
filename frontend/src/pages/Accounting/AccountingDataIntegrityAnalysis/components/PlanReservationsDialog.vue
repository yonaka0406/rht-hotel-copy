<template>
    <Dialog :visible="isVisible" :modal="true" style="width: 90vw; max-width: 1200px" @update:visible="handleVisibilityChange">
        <template #header>
            <div>
                <span class="p-dialog-title">{{ planData?.plan_name }} - 予約明細</span>
                <div class="text-sm mt-1 text-slate-500 dark:text-slate-400">
                    {{ planData?.hotel_name }} | {{ selectedMonthLabel }}
                </div>
            </div>
        </template>
        
        <!-- Summary Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div class="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div class="text-sm text-blue-600 dark:text-blue-400 font-medium">PMS売上合計</div>
                <div class="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ¥{{ new Intl.NumberFormat('ja-JP').format(planData?.pms_amount || 0) }}
                </div>
                <div class="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {{ planData?.reservation_count || 0 }}件の予約
                </div>
            </div>
            
            <div class="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div class="text-sm text-green-600 dark:text-green-400 font-medium">弥生データ</div>
                <div class="text-2xl font-bold text-green-900 dark:text-green-100">
                    ¥{{ new Intl.NumberFormat('ja-JP').format(planData?.yayoi_amount || 0) }}
                </div>
                <div class="text-xs text-green-600 dark:text-green-400 mt-1">
                    {{ planData?.yayoi_transaction_count || 0 }}件の取引
                </div>
            </div>
            
            <div class="bg-violet-50 dark:bg-violet-900/20 p-4 rounded-lg">
                <div class="text-sm text-violet-600 dark:text-violet-400 font-medium">差額</div>
                <div class="text-2xl font-bold" 
                     :class="(planData?.difference || 0) >= 0 ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'">
                    {{ (planData?.difference || 0) >= 0 ? '+' : '' }}¥{{ new Intl.NumberFormat('ja-JP').format(Math.abs(planData?.difference || 0)) }}
                </div>
                <div class="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    税率: {{ ((planData?.tax_rate || 0.10) * 100).toFixed(1) }}%
                </div>
            </div>
        </div>

        <!-- Loading State -->
        <div v-if="loading" class="p-8 text-center">
            <div class="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <i class="pi pi-spin pi-spinner"></i>
                予約データを読み込み中...
            </div>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-8 text-center">
            <div class="text-red-600 dark:text-red-400">
                <i class="pi pi-exclamation-triangle mr-2"></i>
                {{ error }}
            </div>
        </div>

        <!-- Reservations Table -->
        <div v-else-if="reservations && reservations.length > 0" class="overflow-auto max-h-[60vh]">
            <table class="w-full">
                <thead class="bg-slate-50 dark:bg-slate-900/50 sticky top-0">
                    <tr>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            予約ID
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            宿泊日
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            顧客名
                        </th>
                        <th class="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            プラン
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            人数
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            単価
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            税率
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            合計金額
                        </th>
                        <th class="px-4 py-3 text-center text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            ステータス
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-slate-200 dark:divide-slate-700">
                    <tr v-for="reservation in reservations" :key="`${reservation.reservation_id}-${reservation.date}`"
                        class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td class="px-4 py-3 text-sm font-medium">
                            <a :href="`/reservations/edit/${reservation.reservation_id}`" 
                               target="_blank"
                               :title="`#${reservation.reservation_id}`"
                               class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors">
                                #{{ reservation.reservation_id.toString().substring(0, 8) }}{{ reservation.reservation_id.toString().length > 8 ? '...' : '' }}
                                <i class="pi pi-external-link text-xs ml-1"></i>
                            </a>
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-900 dark:text-white">
                            {{ formatDate(reservation.date) }}
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-900 dark:text-white">
                            {{ reservation.client_name || '未設定' }}
                        </td>
                        <td class="px-4 py-3 text-sm text-slate-900 dark:text-white">
                            {{ reservation.plan_name }}
                            <div v-if="reservation.category_name" class="text-xs text-slate-500 dark:text-slate-400">
                                {{ reservation.category_name }}
                            </div>
                        </td>
                        <td class="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">
                            {{ reservation.number_of_people }}名
                        </td>
                        <td class="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">
                            ¥{{ new Intl.NumberFormat('ja-JP').format(reservation.unit_price) }}
                        </td>
                        <td class="px-4 py-3 text-sm text-right text-slate-900 dark:text-white">
                            {{ (reservation.tax_rate * 100).toFixed(1) }}%
                        </td>
                        <td class="px-4 py-3 text-sm text-right font-medium text-slate-900 dark:text-white">
                            ¥{{ new Intl.NumberFormat('ja-JP').format(reservation.total_amount) }}
                        </td>
                        <td class="px-4 py-3 text-center">
                            <span v-if="reservation.missing_rates" 
                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                                料金明細なし
                            </span>
                            <span v-else-if="reservation.is_cancelled" 
                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">
                                キャンセル
                            </span>
                            <span v-else 
                                  class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                                正常
                            </span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Empty State -->
        <div v-else class="p-8 text-center">
            <div class="text-slate-500 dark:text-slate-400">
                <i class="pi pi-info-circle mr-2"></i>
                該当する予約データが見つかりませんでした
            </div>
        </div>

        <template #footer>
            <div class="flex justify-between items-center">
                <div class="text-sm text-slate-500 dark:text-slate-400">
                    合計: {{ reservations?.length || 0 }} 件の予約明細
                </div>
                <Button label="閉じる" text @click="closeDialog" />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import { useAccountingStore } from '@/composables/useAccountingStore';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps({
    isVisible: {
        type: Boolean,
        default: false
    },
    planData: {
        type: Object,
        default: null
    },
    selectedMonth: {
        type: String,
        required: true
    },
    selectedMonthLabel: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['close']);

const accountingStore = useAccountingStore();
const loading = ref(false);
const error = ref(null);
const reservations = ref([]);

// Watch for dialog visibility changes to load data
watch(() => props.isVisible, async (newValue) => {
    if (newValue && props.planData) {
        await loadReservationDetails();
    }
});

// Handle visibility change from PrimeVue Dialog
const handleVisibilityChange = (visible) => {
    if (!visible) {
        emit('close');
    }
};

const loadReservationDetails = async () => {
    if (!props.planData) return;
    
    loading.value = true;
    error.value = null;
    reservations.value = [];
    
    try {
        console.log('Loading reservation details for plan:', props.planData);
        
        // Call backend API to get reservation details for this plan
        const result = await accountingStore.getPlanReservationDetails({
            hotelId: props.planData.hotel_id,
            planName: props.planData.plan_name,
            selectedMonth: props.selectedMonth,
            taxRate: props.planData.tax_rate
        });
        
        reservations.value = result.data || [];
        console.log('Loaded reservations:', reservations.value);
        
    } catch (err) {
        console.error('Error loading reservation details:', err);
        error.value = '予約データの読み込みに失敗しました';
    } finally {
        loading.value = false;
    }
};

const closeDialog = () => {
    emit('close');
};

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};
</script>