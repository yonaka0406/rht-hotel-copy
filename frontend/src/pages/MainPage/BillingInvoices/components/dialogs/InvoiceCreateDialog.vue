<template>
    <Dialog v-model:visible="visible" header="請求書作成" :modal="true" @hide="$emit('update:visible', false)">
        <div class="grid grid-cols-12 gap-4">
            <!-- Invoice Header-->
            <div class="col-span-12 mb-4 mx-6">
                <div class="grid grid-cols-12 gap-2">
                    <div class="col-span-4 mt-6">
                        <FloatLabel>
                            <label class="font-bold">請求番号:</label>
                            <InputText type="text" v-model="invoiceData.invoice_number" fluid disabled />
                        </FloatLabel>
                    </div>
                    <div class="col-span-4 mt-6">
                        <FloatLabel>
                            <label class="font-bold">請求日:</label>
                            <InputText type="date" v-model="invoiceData.date" fluid disabled />
                        </FloatLabel>
                    </div>
                    <div class="col-span-4 mt-6">
                        <FloatLabel>
                            <label class="font-bold">支払期限:</label>
                            <InputText type="date" v-model="invoiceData.due_date" fluid />
                        </FloatLabel>
                        <small class="ml-1">元データ：{{ invoiceDBData.due_date }}</small>
                    </div>
                    <div class="col-span-3 mt-6">
                        <FloatLabel>
                            <label class="font-bold">取引先番号:</label>
                            <InputText type="text" v-model="invoiceData.customer_code" fluid disabled />
                        </FloatLabel>
                    </div>
                    <div class="col-span-6 mt-6">
                        <FloatLabel>
                            <label class="font-bold">取引先名:</label>
                            <InputText type="text" v-model="invoiceData.client_name" fluid />
                        </FloatLabel>
                        <small class="ml-1">元データ：{{ invoiceDBData.client_name }}</small>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <label class="font-bold">宿泊数:</label>
                            <InputText type="number" min="0" v-model="invoiceData.invoice_total_stays" fluid />
                        </FloatLabel>
                        <small class="ml-1">元データ：{{ invoiceDBData.invoice_total_stays }}</small>
                    </div>
                </div>
            </div>
            <!-- Invoice Details -->
            <div class="col-span-12 mb-4 mx-40">
                <DataTable :value="invoiceData.items">
                    <Column field="total_net_price" header="税抜き">
                        <template #body="slotProps">
                            <span>{{ (slotProps.data.total_net_price ?? 0).toLocaleString() }} 円</span>
                        </template>
                    </Column>
                    <Column header="税率">
                        <template #body="slotProps">
                            <span>{{ (slotProps.data.tax_rate ?? 0) * 100 }} %</span>
                        </template>
                    </Column>
                    <Column field="total_price" header="税込み">
                        <template #body="slotProps">
                            <span>{{ (slotProps.data.total_price ?? 0).toLocaleString() }} 円</span>
                        </template>
                    </Column>
                    <template #footer>
                        <div class="flex flex-col items-end gap-1 px-2">
                            <div class="flex justify-between w-64 text-sm">
                                <span>消費税区分合計:</span>
                                <span class="font-bold">{{ ratesTotal.toLocaleString() }} 円</span>
                            </div>
                            <div class="flex justify-between w-64 text-sm">
                                <span>入金（請求）合計:</span>
                                <span class="font-bold">{{ (invoiceData.invoice_total_value || 0).toLocaleString() }}
                                    円</span>
                            </div>
                            <!-- 支払方法別内訳を表示 -->
                            <div v-if="invoiceData.payment_breakdown && Object.keys(invoiceData.payment_breakdown).length > 1" 
                                 class="w-64 text-xs text-gray-600 mt-1">
                                <div class="flex justify-between">
                                    <span>内訳</span>
                                    <span></span>
                                </div>
                                <div v-for="(amount, paymentType) in invoiceData.payment_breakdown" :key="paymentType" 
                                     class="flex justify-between ml-2">
                                    <span>{{ paymentType }}：</span>
                                    <span>{{ amount.toLocaleString() }}円</span>
                                </div>
                            </div>
                            <div v-if="!isBalanceCorrect"
                                class="mt-2 p-2 bg-red-100 text-red-700 rounded-md text-xs w-full text-center animate-pulse">
                                <i class="pi pi-exclamation-triangle mr-1"></i>
                                注意：税区分合計が入金合計と一致しません。
                            </div>
                            <div v-if="!isBalanceCorrect && showPdfError"
                                class="mt-1 p-2 bg-orange-100 text-orange-700 rounded-md text-xs w-full text-center">
                                <i class="pi pi-times-circle mr-1"></i>
                                税区分合計が入金合計と一致しない場合、PDF作成はできません。Excel作成で金額を修正して請求書を作成して下さい。
                            </div>
                        </div>
                    </template>
                </DataTable>
            </div>
            <!-- Invoice Comments -->
            <div class="col-span-12 mb-4">
                <FloatLabel>
                    <Textarea v-model="invoiceData.comment" rows="3" cols="30" fluid />
                    <label>備考</label>
                </FloatLabel>
                <small class="ml-1">元データ：<span style="white-space: pre-line">{{ invoiceDBData.comment }}</span></small>
            </div>
            <div class="col-span-12 flex justify-end gap-2">
                <Button v-if="!isGenerating" label="Excel作成" @click="$emit('generateExcel')" severity="success" />
                <Button v-if="!isGenerating" label="PDF作成" @click="handlePdfGeneration" />
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { Dialog, FloatLabel, InputText, DataTable, Column, Textarea, Button } from 'primevue';

const props = defineProps({
    visible: Boolean,
    invoiceData: Object,
    invoiceDBData: Object,
    isGenerating: Boolean
});

const emit = defineEmits(['update:visible', 'generateExcel', 'generatePdf']);

const showPdfError = ref(false);

const visible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

const ratesTotal = computed(() => {
    if (!props.invoiceData.items || !Array.isArray(props.invoiceData.items)) return 0;
    return props.invoiceData.items.reduce((sum, item) => sum + Number(item.total_price), 0);
});

const isBalanceCorrect = computed(() => {
    return Math.abs(ratesTotal.value - (props.invoiceData.invoice_total_value || 0)) < 1;
});

const handlePdfGeneration = () => {
    if (!isBalanceCorrect.value) {
        showPdfError.value = true;
        return;
    }
    emit('generatePdf');
};

// ダイアログが閉じられた時にエラーメッセージをリセット
watch(() => props.visible, (newVal) => {
    if (!newVal) {
        showPdfError.value = false;
    }
});

/*
watch(() => props.visible, (newVal) => {
    if (newVal) {
        console.log('InvoiceCreateDialog loading contents:', {
            invoiceData: props.invoiceData,
            invoiceDBData: props.invoiceDBData
        });
    }
});
*/
</script>