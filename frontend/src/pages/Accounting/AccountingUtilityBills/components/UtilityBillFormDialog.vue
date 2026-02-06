<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" :header="item.id ? 'データを編集' : '新規データ入力'" modal class="w-full max-w-md">
        <div class="flex flex-col gap-4 py-4">
            <div class="flex flex-col gap-1">
                <label for="bill-month" class="text-xs font-bold text-slate-400 uppercase">取引月</label>
                <DatePicker id="bill-month" v-model="localItem.month" view="month" dateFormat="yy/mm" fluid aria-label="取引月を選択" />
            </div>
            <div class="flex flex-col gap-1">
                <label for="bill-date" class="text-xs font-bold text-slate-400 uppercase">取引日</label>
                <DatePicker id="bill-date" v-model="localItem.transaction_date" dateFormat="yy/mm/dd" fluid aria-label="取引日を選択" />
            </div>
            <div class="flex flex-col gap-1">
                <label for="bill-sub-account" class="text-xs font-bold text-slate-400 uppercase">補助科目</label>
                <InputText id="bill-sub-account" v-model="localItem.sub_account_name" placeholder="例: 電気代" fluid />
            </div>
            <div class="flex flex-col gap-1">
                <label for="bill-provider" class="text-xs font-bold text-slate-400 uppercase">請求元 / プロバイダー</label>
                <InputText id="bill-provider" v-model="localItem.provider_name" placeholder="例: 東京電力" fluid />
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-1">
                    <label for="bill-quantity" class="text-xs font-bold text-slate-400 uppercase">数量 ({{ getUtilityUnit(localItem.sub_account_name) }})</label>
                    <InputNumber id="bill-quantity" v-model="localItem.quantity" :minFractionDigits="2" fluid placeholder="0.00" />
                </div>
                <div class="flex flex-col gap-1">
                    <label for="bill-total" class="text-xs font-bold text-slate-400 uppercase">合計金額 (税込)</label>
                    <InputNumber id="bill-total" v-model="localItem.total_value" mode="currency" currency="JPY" locale="ja-JP" fluid placeholder="¥0" />
                </div>
            </div>
            <div v-if="localItem.quantity > 0" class="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 mt-2">
                <div class="text-[10px] font-bold text-slate-400 uppercase mb-1">計算された平均単価</div>
                <div class="text-lg font-bold text-violet-600 dark:text-violet-400 font-mono">
                    {{ formatCurrency(localItem.total_value / localItem.quantity) }} / {{ getUtilityUnit(localItem.sub_account_name) }}
                </div>
            </div>
        </div>
        <template #footer>
            <div class="flex items-center justify-end gap-3 w-full">
                <button @click="$emit('update:visible', false)"
                    class="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer">
                    キャンセル
                </button>
                <button @click="$emit('save', localItem)" :disabled="loading"
                    class="px-8 py-2.5 bg-violet-600 text-white rounded-xl font-bold hover:bg-violet-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-violet-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed">
                    <i v-if="loading" class="pi pi-spin pi-spinner"></i>
                    <i v-else class="pi pi-check"></i>
                    <span>保存</span>
                </button>
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';
import { getUtilityUnit } from '@/utils/accountingUtils';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    item: {
        type: Object,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    }
});

defineEmits(['update:visible', 'save']);

const localItem = ref({ ...props.item });

watch(() => props.item, (newVal) => {
    localItem.value = { ...newVal };
}, { deep: true });

const formatCurrency = (val) => {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(val);
};
</script>
