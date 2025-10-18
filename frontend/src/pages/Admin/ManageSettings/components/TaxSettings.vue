<template>
    <Card class="mb-2">
        <template #title>
            <div class="grid grid-cols-4 border-b">
                <div class="flex col-span-3 justify-center items-center mb-2">
                    <h3 class="text-lg font-semibold text-gray-700">税区分</h3>
                </div>
                <div class="flex justify-end mb-2">
                    <Button @click="showTaxDialog = true"
                        icon="pi pi-plus"
                        label="税区分追加"
                        class="p-button-right"
                    ></Button>
                </div>
            </div>
        </template>
        <template #content>
            <DataTable :value="taxTypes"
                paginator :rows="5"
            >                    
            <Column field="name" header="税区分名"></Column>                    
            <Column field="percentage" header="税率">
                <template #body="{ data }">
                    {{ Intl.NumberFormat('ja-JP', { style: 'percent', minimumFractionDigits: 2 }).format(data.percentage) }}
                </template>                        
            </Column>   
            <Column field="description" header="詳細">
                <template #body="{ data }">
                    <InputText v-model="data.description" @blur="updateTaxDescription(data)" fluid />
                </template>
            </Column>
            <Column field="visible" header="表示">
                <template #body="{ data }">
                    <ToggleSwitch v-model="data.visible" @change="toggleTaxVisibility(data)" />
                </template>
            </Column>
            </DataTable>
        </template>
    </Card>

    <Dialog header="税区分追加" v-model:visible="showTaxDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <InputText v-model="newTaxData.name" />
                    <label>税区分名</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <InputNumber v-model="newTaxData.percentage"
                        suffix="%"
                        :min="0" :max="100"
                        :step="0.01"
                    />
                    <label>税率</label>
                </FloatLabel>
            </div>
            <div class="col-span-2 mb-4">
                <FloatLabel>
                    <Textarea v-model="newTaxData.description" fluid />
                    <label>詳細</label>
                </FloatLabel>                
            </div>             
            <div class="col-span-2 mb-2 flex justify-center">
                <Button @click="addNewTaxData"
                    icon="pi pi-plus"
                    label="新規作成"
                    class="p-button-right"
                ></Button>
            </div>
        </div>
    </Dialog>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useToast } from 'primevue/usetoast';
import Card from 'primevue/card';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dialog from 'primevue/dialog';
import FloatLabel from 'primevue/floatlabel';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import Textarea from 'primevue/textarea';
import { useSettingsStore } from '@/composables/useSettingsStore';

const toast = useToast();
const { taxTypes, fetchTaxTypes, createTaxType, alterTaxTypeVisibility, alterTaxTypeDescription } = useSettingsStore();

const showTaxDialog = ref(false);
const newTaxData = ref({
    name: '',
    description: '',
    percentage: 0
});

const resetNewTaxData = () => {
    newTaxData.value = { 
        name: '', 
        description: '', 
        percentage: 0
    };
};

const addNewTaxData = async () => {
    if (!newTaxData.value.name.trim()) {
        toast.add({ severity: 'warn', summary: '入力エラー', detail: '名称を入力してください。', life: 3000 });
        return;
    }
    const nameExists = taxTypes.value?.some(tt => tt.name === newTaxData.value.name) || false;
    if (nameExists) {
        toast.add({ severity: 'warn', summary: '入力エラー', detail: 'この名称はすでに存在します。', life: 3000 });
        return;
    }

    const processedTaxData = { ...newTaxData.value, percentage: newTaxData.value.percentage / 100 };

    try {
        await createTaxType(processedTaxData);
        toast.add({ severity: 'success', summary: '新規追加', detail: '税区分が追加されました。', life: 3000 });
        
        resetNewTaxData();
        await fetchTaxTypes();
        showTaxDialog.value = false;
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '作成に失敗しました。', life: 3000 });
    }
};

const updateTaxDescription = async (taxType) => {
    try {
        await alterTaxTypeDescription(taxType.id, taxType.description);
        toast.add({ severity: 'success', summary: '更新完了', detail: '詳細を更新しました。', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '詳細の更新に失敗しました。', life: 3000 });
        await fetchTaxTypes();
    }
};

const toggleTaxVisibility = async (taxType) => {
    try {
        await alterTaxTypeVisibility(taxType.id, taxType.visible);
        toast.add({ severity: 'success', summary: '更新完了', detail: '表示設定を変更しました。', life: 3000 });
    } catch (error) {
        toast.add({ severity: 'error', summary: 'エラー', detail: '表示設定の更新に失敗しました。', life: 3000 });
        await fetchTaxTypes();
    }
};

onMounted(async () => {
    await fetchTaxTypes();
});
</script>
