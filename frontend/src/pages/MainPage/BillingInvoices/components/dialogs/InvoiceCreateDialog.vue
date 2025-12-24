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
                            <span>{{ slotProps.data.total_net_price.toLocaleString() }} 円</span>
                        </template>
                    </Column>
                    <Column header="税率">
                        <template #body="slotProps">
                            <span>{{ slotProps.data.tax_rate * 100 }} %</span>
                        </template>
                    </Column>
                    <Column field="total_price" header="税込み">
                        <template #body="slotProps">
                            <span>{{ slotProps.data.total_price.toLocaleString() }} 円</span>
                        </template>
                    </Column>
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
                <Button v-if="!isGenerating" label="PDF作成" @click="$emit('generatePdf')" />
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { computed, watch } from 'vue';
import { Dialog, FloatLabel, InputText, DataTable, Column, Textarea, Button } from 'primevue';

const props = defineProps({
    visible: Boolean,
    invoiceData: Object,
    invoiceDBData: Object,
    isGenerating: Boolean
});

const emit = defineEmits(['update:visible', 'generateExcel', 'generatePdf']);

const visible = computed({
    get: () => props.visible,
    set: (val) => emit('update:visible', val)
});

watch(() => props.visible, (newVal) => {
    if (newVal) {
        console.log('InvoiceCreateDialog loading contents:', {
            invoiceData: props.invoiceData,
            invoiceDBData: props.invoiceDBData
        });
    }
});
</script>