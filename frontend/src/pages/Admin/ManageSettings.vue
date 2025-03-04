<template>
    <div class="p-4">
        <Panel header="その他の設定">
            <Card>
                <template #title>
                    <div class="grid grid-cols-4">
                        <div class="flex col-span-3 justify-center items-center mb-2">
                            支払方法
                        </div>                    
                        <div class="flex justify-end mb-2">
                            <Button @click="showDialog = true"
                                icon="pi pi-plus"
                                label="方法追加"
                                class="p-button-right"
                            ></Button>
                        </div>
                    </div>
                    
                    
                </template>
                <template #content>
                    <DataTable :value="paymentTypes"
                        paginator :rows="5"
                    >
                    <Column header="ホテルID">
                        <template #body="slotProps">
                            <Select v-model="slotProps.data.hotel_id" 
                                :options="hotels" 
                                optionLabel="name"
                                optionValue="id"
                                disabled
                                fluid
                            />
                        </template>
                    </Column>
                    <Column field="name" header="名称"></Column>
                    <Column field="transaction" header="支払い区分">
                        <template #body="{ data }">
                            <Tag :value="getTransactionLabel(data.transaction)" :style="{ backgroundColor: getTransactionColor(data.transaction), color: 'white' }" />
                        </template>
                    </Column>
                    <Column field="description" header="詳細">
                        <template #body="{ data }">
                            <InputText v-model="data.description" @blur="updateDescription(data)" />
                        </template>
                    </Column>
                    <Column field="visible" header="表示">
                        <template #body="{ data }">
                            <ToggleSwitch v-model="data.visible" @change="toggleVisibility(data)" />
                        </template>
                    </Column>
                    </DataTable>
                </template>
            </Card>
        </Panel> 
    </div>

    <Dialog header="支払い方法追加" v-model:visible="showDialog" :modal="true" :style="{ width: '600px' }" class="p-fluid" :closable="true">
        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2 pt-6">
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <InputText v-model="newData.name" />
                    <label>名称</label>
                </FloatLabel>
            </div>
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <Select v-model="newData.transaction" 
                        :options="transactionOptions" 
                        optionLabel="label"
                        optionValue="value"
                        fluid
                    />
                    <label>支払い区分</label>
                </FloatLabel>
            </div>
            <div class="col-span-2 mb-4">
                <FloatLabel>
                    <Textarea v-model="newData.description" fluid />
                    <label>詳細</label>
                </FloatLabel>                
            </div>
            <div class="col-span-1 mb-4">
                <FloatLabel>
                    <Select v-model="newData.hotel_id" 
                        :options="hotels" 
                        optionLabel="name"
                        optionValue="id"
                        showClear
                        fluid
                    />
                    <label>ホテル限定</label>
                </FloatLabel>
            </div>  
            <div class="col-span-2 mb-2 flex justify-center">
                <Button @click="addNewData"
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
    import { useSettingsStore } from '@/composables/useSettingsStore';
    import { useHotelStore } from '@/composables/useHotelStore';

    import { Panel, Card, Tag, Button, DataTable, Column, Dialog, FloatLabel, InputText, ToggleSwitch, Select, Textarea } from "primevue";

    const { paymentTypes, fetchPaymentTypes, createPaymentType, alterPaymentTypeVisibility, alterPaymentTypeDescription } = useSettingsStore();
    const { hotels, fetchHotels } = useHotelStore();

    const toast = useToast();

    const showDialog = ref(false);

    const newData = ref(null);
    const transactionOptions = [
        { label: '現金', value: 'cash', color: '#28a745' },
        { label: '振込', value: 'wire', color: '#007bff' },
        { label: 'クレジットカード', value: 'credit', color: '#6f42c1' },
        { label: '請求書', value: 'bill', color: '#fd7e14' },
        { label: 'ポイント', value: 'point', color: '#e83e8c' }
    ];

    const resetNewData = () => {
        newData.value = { 
            name: '', 
            description: '', 
            transaction: 'cash',
            hotel_id: null
        };
    }
    const addNewData = async () => {
        // Validation
        if (!newData.value.name.trim()) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: '名称を入力してください。', life: 3000 });
            return;
        }
        const nameExists = paymentTypes.value.some(pt => pt.name === newData.value.name);
        if (nameExists) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: 'この名称はすでに存在します。', life: 3000 });
            return;
        }
        const isValidTransaction = transactionOptions.some(opt => opt.value === newData.value.transaction);
        if (!isValidTransaction) {
            toast.add({ severity: 'warn', summary: '入力エラー', detail: '無効な支払い区分です。', life: 3000 });
            return;
        }

        // console.log('newData:', newData.value);
        await createPaymentType(newData.value);

        toast.add({ severity: 'success', summary: '新規追加', detail: '支払い方法追加されました。', life: 3000 });
        
        resetNewData();
        await fetchPaymentTypes();

        showDialog.value = false;
    };

    const getTransactionLabel = (value) => {
        const option = transactionOptions.find(opt => opt.value === value);
        return option ? option.label : value;
    };
    const getTransactionColor = (value) => {
        const option = transactionOptions.find(opt => opt.value === value);
        return option ? option.color : 'gray'; // Default color if not found
    };
    const updateDescription = async (paymentType) => {
        try {
            await alterPaymentTypeDescription(paymentType.id, paymentType.description);
            
            toast.add({ severity: 'success', summary: '更新完了', detail: '詳細を更新しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '詳細の更新に失敗しました。', life: 3000 });
        }
    };
    const toggleVisibility = async (paymentType) => {
        try {
            await alterPaymentTypeVisibility(paymentType.id, paymentType.visible);
            
            toast.add({ severity: 'success', summary: '更新完了', detail: '表示設定を変更しました。', life: 3000 });
        } catch (error) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '表示設定の更新に失敗しました。', life: 3000 });
        }
    };

    onMounted(async () => {        
        await fetchPaymentTypes();
        await fetchHotels();
        resetNewData();
    });
</script>
