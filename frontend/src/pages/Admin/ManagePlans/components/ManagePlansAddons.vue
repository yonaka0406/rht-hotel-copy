<template>
    <div v-if="plan">
        <div>
            <div class="grid xs:grid-cols-1 grid-cols-3 gap-2 mt-6">
                <div class="flex justify-start">
                    <span class="font-bold text-lg">アドオン</span>
                </div>
                <div class="flex justify-start">
                    <Button @click="openAddonDialog" label="新規アドオン" icon="pi pi-plus" />
                </div>
            </div>
            <Accordion value="0">
                <AccordionPanel value="0">
                    <AccordionHeader>現在アドオン</AccordionHeader>
                    <AccordionContent>                        
                        <DataTable :value="filteredCurrentConditions">
                            <Column field="date_start" header="開始"></Column>
                            <Column field="date_end" header="終了"></Column>    
                            <Column field="addon_name" header="アドオン"></Column>
                            <Column field="price" header="価格">
                                <template #body="slotProps">
                                    {{ formatNumber(slotProps.data.price, 'currency') }}
                                </template>                                    
                            </Column>
                            <Column header="操作">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAddonDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
                <AccordionPanel value="1">
                    <AccordionHeader>将来アドオン</AccordionHeader>
                    <AccordionContent>
                        <DataTable :value="filteredFutureConditions">
                            <Column field="date_start" header="開始"></Column>
                            <Column field="date_end" header="終了"></Column>    
                            <Column field="addon_name" header="アドオン"></Column>
                            <Column field="price" header="価格">
                                <template #body="slotProps">
                                    {{ formatNumber(slotProps.data.price, 'currency') }}
                                </template>                                    
                            </Column>
                            <Column header="操作">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAddonDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>   
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
                <AccordionPanel value="2">
                    <AccordionHeader>過去アドオン</AccordionHeader>
                    <AccordionContent>                        
                        <DataTable :value="filteredPastConditions">
                            <Column field="date_start" header="開始"></Column>
                            <Column field="date_end" header="終了"></Column>    
                            <Column field="addon_name" header="アドオン"></Column>
                            <Column field="price" header="価格">
                                <template #body="slotProps">
                                    {{ formatNumber(slotProps.data.price, 'currency') }}
                                </template>                                    
                            </Column>
                            <Column header="操作">
                                <template #body="slotProps">
                                    <Button 
                                        icon="pi pi-pencil"
                                        class="p-button-text p-button-sm"
                                        @click="openEditAddonDialog(slotProps.data)"
                                    />                                  
                                </template>
                            </Column>                    
                        </DataTable>
                    </AccordionContent>
                </AccordionPanel>
            </Accordion>

            <Dialog header="新規アドオン" v-model:visible="showAddonDialog" :modal="true" :style="{ width: '50vw' }" class="p-fluid" :closable="true">
                <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
                    <div class="col-span-2">
                    <FloatLabel>
                        <label for="AddonSelectEdit" class="block mb-2">アドオン一覧</label>
                        <Select v-model="newAddon.addons_id"
                        id="AddonSelectEdit"
                        :options="allAddons"
                        optionLabel="addon_name"
                        optionValue="id"
                        placeholder="アドオンを選択する"
                        filter
                        required
                        @change="onAddonChange"
                        fluid
                        />
                    </FloatLabel>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <InputText
                        v-model="newAddon.tax_type"
                        disabled
                        fluid
                        />
                        <label>税区分</label>
                    </FloatLabel>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <InputNumber v-model="newAddon.price"
                        mode="currency"
                        currency="JPY"
                        locale="ja-JP"
                        fluid
                        />
                        <label>価格</label>
                    </FloatLabel>
                    <small class="text-gray-500">
                        税抜価格: {{ formatNumber(addonNetPrice, 'currency') }}
                    </small>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <label for="dateStart">開始日</label>
                        <DatePicker v-model="newAddon.date_start"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="開始日"
                        fluid
                        required
                        />
                    </FloatLabel>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <label for="dateEnd">終了日</label>
                        <DatePicker v-model="newAddon.date_end"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="終了日"
                        fluid
                        />
                    </FloatLabel>
                    </div>
                </div>

                <template #footer>
                    <Button label="追加" icon="pi pi-plus" @click="addAddon" class="p-button-success p-button-text p-button-sm" />
                    <Button label="閉じる" icon="pi pi-times" @click="showAddonDialog = false" class="p-button-danger p-button-text p-button-sm" />
                </template>
                </Dialog>

            <Dialog header="アドオン編集" v-model:visible="showEditAddonDialog" :modal="true" :style="{ width: '50vw' }" class="p-fluid" :closable="true">
                <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
                    <div class="col-span-2">
                    <FloatLabel>
                        <InputText v-model="editAddon.addon_name"
                        disabled
                        fluid
                        />
                        <label>アドオン名</label>
                    </FloatLabel>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <InputText
                        v-model="editAddon.tax_type"
                        disabled
                        fluid
                        />
                        <label>税区分</label>
                    </FloatLabel>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <InputNumber v-model="editAddon.price"
                        mode="currency"
                        currency="JPY"
                        locale="ja-JP"
                        fluid
                        />
                        <label>価格</label>
                    </FloatLabel>
                    <small class="text-gray-500">
                        税抜価格: {{ formatNumber(addonNetPrice, 'currency') }}
                    </small>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <label for="dateStart">開始日</label>
                        <DatePicker v-model="editAddon.date_start"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="開始日"
                        fluid
                        required
                        />
                    </FloatLabel>
                    </div>
                    <div class="col-span-1">
                    <FloatLabel>
                        <label for="dateEnd">終了日</label>
                        <DatePicker v-model="editAddon.date_end"
                        :showIcon="true"
                        iconDisplay="input"
                        dateFormat="yy-mm-dd"
                        :selectOtherMonths="true"
                        placeholder="終了日"
                        fluid
                        />
                    </FloatLabel>
                    </div>
                </div>
                <template #footer>
                    <Button label="更新" icon="pi pi-check" @click="updateAddon" class="p-button-success p-button-text p-button-sm" />
                    <Button label="閉じる" icon="pi pi-times" @click="showEditAddonDialog = false" class="p-button-danger p-button-text p-button-sm" />
                </template>
                </Dialog>
        </div>
    </div>
    <div v-else>
        <p>読み込み中...</p>
    </div>
</template>

<script setup>
    // Vue
    import { ref, computed, onMounted } from 'vue';
    const props = defineProps({
        plan: {
            type: Object,
            required: true,
        }
    });
    const emit = defineEmits(['update-filtered-conditions']);

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Dialog, FloatLabel, DatePicker, InputText, InputNumber, Select, Button, 
        Accordion, AccordionPanel, AccordionHeader, AccordionContent, DataTable, Column } from 'primevue';

    // Stores
    import { usePlansStore } from '@/composables/usePlansStore';
    const { fetchAllAddons } = usePlansStore();

    
    // Helper    
    const formatNumber = (value, style) => {
        let thisValue = value;
        if(!thisValue){
            thisValue = 0;
        } 
        if(style === 'currency'){
            return new Intl.NumberFormat('ja-JP', {
                style: 'currency',
                currency: 'JPY',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(thisValue);
        }
        if(style === 'decimal'){
            return new Intl.NumberFormat('ja-JP', {
                style: 'decimal',
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2
            }).format(thisValue);
        }                
    };
        
    // Plan   
    const planInfo = ref({
        plans_global_id: props.plan.plans_global_id,
        plans_hotel_id: props.plan.plans_hotel_id,
        hotel_id: props.plan.hotel_id,
        date: props.plan.date,
    });

    // Addon
    const allAddons = ref([]);
    const planAddons = ref([]);
    const newAddon = ref(null);
    const editAddon = ref(null);
    const addonNetPrice = computed(() => {
        const targetAddon = showEditAddonDialog.value ? editAddon.value : newAddon.value;
        if (!targetAddon) return 0;

        const price = Number(targetAddon.price);
        const taxRate = Number(targetAddon.tax_rate);

        if (isNaN(price) || isNaN(taxRate)) return 0;
        return Math.floor(price / (1 + taxRate));
    });
    const showAddonDialog = ref(false);
    const showEditAddonDialog = ref(false);
    const newAddonReset = () => {
        newAddon.value = { 
            hotel_id: null,
            plans_global_id: null,
            plans_hotel_id: null,
            addons_id: null, 
            addon_type: null,
            tax_type_id: null,
            tax_type: null,       
            tax_rate: 0,
            date_start: new Date().toISOString().split('T')[0],
            date_end: null,
            price: 0,        
        };
    };
    const editAddonReset = () => {
        editAddon.value = { 
            id: null,
            price: 0,
            date_start: null,
            date_end: null,                        
        };
    };
    const onAddonChange = () => {                
        const selectedAddon = allAddons.value.find(addon => addon.id === newAddon.value.addons_id);        
        if (selectedAddon) {
            // console.log('onAddonChange',selectedAddon)
            newAddon.value.addon_type = selectedAddon.addon_type;
            newAddon.value.price = selectedAddon.price;
            newAddon.value.tax_type_id = selectedAddon.tax_type_id;
            newAddon.value.tax_type = selectedAddon.tax_type;
            newAddon.value.tax_rate = selectedAddon.tax_rate;
        }
    };
    const openAddonDialog = async() => {

        newAddon.value.plans_global_id = props.plan.plans_global_id;
        newAddon.value.plans_hotel_id = props.plan.plans_hotel_id;
        newAddon.value.hotel_id = props.plan.hotel_id;
        
        allAddons.value = await fetchAllAddons(props.plan.hotel_id);
        
        showAddonDialog.value = true;
    };            
    const openEditAddonDialog = (addonData) => {
        // Populate the editAdjustment with the selected row data
        editAddon.value = { ...addonData };
        showEditAddonDialog.value = true; // Open the dialog
    };       
    const addAddon = async () => {
        // Validation
            if (!newAddon.value.addons_id) {
                toast.add({
                    severity: 'error',
                    summary: 'エラー',
                    detail: 'アドオンを選択してください。',
                    life: 3000
                });
                return;
            }
            if (newAddon.value.date_end && new Date(newAddon.value.date_end) < new Date(newAddon.value.date_start)) {                    
                toast.add({ 
                    severity: 'error', 
                    summary: 'エラー', 
                    detail: '終了日と開始日の順番確認してください。', life: 3000 
                });
                return;
            }
        // Conversion from Datetime to Date
            const formatDate = (date) => {
                if (!date) return null;
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            const formattedAdjustment = {
                ...newAddon.value,
                date_start: formatDate(newAddon.value.date_start),
                date_end: formatDate(newAddon.value.date_end),
            };

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/addons`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedAdjustment),
            });
            if (!response.ok) {
                throw new Error('アドオンの保存に失敗しました');
            } 

            await fetchPlanAddons();
            showAddonDialog.value = false;
            newAddonReset();

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: 'アドオン作成されました。',
                life: 3000
            });
        } catch (error) {
            console.error('アドオン保存エラー:', error);
            toast.add({ severity: 'error', summary: 'エラー', detail: 'アドオンの保存に失敗しました', life: 3000 });
        }

    };
    const updateAddon = async () => {
        // Validation
        if (!editAddon.value.date_start) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '開始日を入力してください。',
                life: 3000
            });
            return;
        }
        if (editAddon.value.date_end && new Date(editAddon.value.date_end) < new Date(editAddon.value.date_start)) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '終了日と開始日の順番確認してください。',
                life: 3000
            });
            return;
        };                

        // Conversion from Datetime to Date
        const formatDate = (date) => {
            if (!date) return null;
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const formattedAdjustment = {
            ...editAddon.value,
            date_start: formatDate(editAddon.value.date_start),
            date_end: formatDate(editAddon.value.date_end),
        };

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/addons/${editAddon.value.id}`, {  
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formattedAdjustment),
            });

            if (!response.ok) {
                throw new Error('アドオンの更新に失敗しました');
            }

            await fetchPlanAddons(); // Refresh the rates
            showEditAddonDialog.value = false; // Close the dialog
            editAddonReset();

            toast.add({
                severity: 'success',
                summary: '成功',
                detail: 'アドオン更新されました。',
                life: 3000
            });
        } catch (error) {
            console.error('アドオン更新エラー:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: 'アドオンの更新中にエラーが発生しました。',
                life: 3000
            });
        }
    };

    // Filters
    const filteredCurrentConditions = computed(() => {
        const selectedDate = planInfo.value.date;                
        if (!selectedDate) return null;

        // Normalized date
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);

        // console.log(planAddons.value)

        return planAddons.value
            .filter(condition => {                    
                const startDate = new Date(condition.date_start);
                startDate.setHours(0, 0, 0, 0);                        
                const endDate = condition.date_end ? new Date(condition.date_end) : null;
                if (endDate) endDate.setHours(0, 0, 0, 0);                        
                return selectedDateObj >= startDate && (endDate ? selectedDateObj <= endDate : true);
            });
    });
    const filteredFutureConditions = computed(() => {
        const selectedDate = planInfo.value.date;
        if (!selectedDate) return null;
        
        // Normalized date
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);

        return planAddons.value
            .filter(condition => {
                const startDate = new Date(condition.date_start);
                startDate.setHours(0, 0, 0, 0);                        
                return startDate > selectedDateObj;
        });

        
    });
    const filteredPastConditions = computed(() => {
        const selectedDate = planInfo.value.date;
        if (!selectedDate) return null;

        // Normalized date
        const selectedDateObj = new Date(selectedDate);
        selectedDateObj.setHours(0, 0, 0, 0);

        return planAddons.value
            .filter(condition => {
                const endDate = condition.date_end ? new Date(condition.date_end) : null;
                if (!endDate) return false;
                
                endDate.setHours(0, 0, 0, 0);
                return endDate < selectedDateObj;
            });
    });
    const sendFilteredConditions = () => {
        // console.log("Sending filtered conditions:", filteredCurrentConditions.value);
        emit('update-filtered-conditions', filteredCurrentConditions.value);
    };

    const fetchPlanAddons = async () => {
        const formatDate = (date) => {
            if (!date) return null; // Handle null values
            const d = new Date(date);
            const yy = String(d.getFullYear());
            const mm = String(d.getMonth() + 1).padStart(2, '0'); // Month (01-12)
            const dd = String(d.getDate()).padStart(2, '0'); // Day (01-31)
            return `${yy}-${mm}-${dd}`;
        };

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/plans/${planInfo.value.plans_global_id}/${planInfo.value.plans_hotel_id}/${planInfo.value.hotel_id}/addons`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('アドオンの取得に失敗しました');
            }

            const data = await response.json();
            planAddons.value = data.map(addon => ({
                ...addon,
                date_start: formatDate(addon.date_start),
                date_end: formatDate(addon.date_end)
            }));
            sendFilteredConditions();
        } catch (error) {
            console.error('アドオン取得エラー:', error);
        }
    };

    onMounted( async () => {
        await fetchPlanAddons();
        newAddonReset();
        editAddonReset();
    });
</script>
