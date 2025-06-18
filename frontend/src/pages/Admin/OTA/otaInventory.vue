<template>
    <div class="p-4">
        <Card>
            <template #content>
                <div class="mb-4">
                    <form @submit.prevent="fetchTemplate">
                        <div class="grid grid-cols-12 gap-2">
                            <div class="col-span-12 md:col-span-4 mt-6">
                                <FloatLabel>
                                    <DatePicker v-model="searchDurationFrom" 
                                        dateFormat="yy-mm-dd"
                                        :selectOtherMonths="true"
                                        :showButtonBar="true"
                                        :minDate="today"                                        
                                        fluid
                                    />
                                    <label>抽出日付開始</label>
                                </FloatLabel>
                            </div>
                            <div class="col-span-12 md:col-span-4 mt-6">
                                <FloatLabel>
                                    <DatePicker v-model="searchDurationTo"
                                        dateFormat="yy-mm-dd"
                                        :selectOtherMonths="true"
                                        :showButtonBar="true"
                                        :minDate="today"
                                        fluid
                                    />
                                    <label>抽出日付終了</label>     
                                </FloatLabel>
                            </div>
                            <div class="col-span-12 md:col-span-4 mt-6">
                                <Button label="情報を取得" type="submit" />
                            </div>
                        </div>
                    </form> 
                </div>
                <div>
                    <DataTable :value="mergedDisplayData"
                        responsiveLayout="scroll"
                        removableSort
                    >
                        <Column field="netRmTypeGroupCode" header="ネット室タイプグループコード" :sortable="true"></Column>
                        <Column field="netRmTypeGroupName" header="ネット室タイプグループ名" :sortable="true"></Column>
                        <Column field="saleDate" header="日付" :sortable="true"></Column>
                        <Column field="salesCount" header="販売数"></Column>
                        <Column field="remainingCount" header="残室数"></Column>
                        <Column field="pmsRemainingCount" header="PMS残数"></Column>
                        <Column field="salesStatus" header="販売状態">
                            <template #body="{ data }">
                                <Select
                                    v-model="data.salesStatus" 
                                    :options="statusOptions"
                                    optionLabel="value" 
                                    optionValue="id" 
                                >
                                    <template #value="slotProps">
                                        <div v-if="slotProps.value != null" :class="['status-badge', getStatusClass(slotProps.value)]">
                                            {{ statusOptions.find(opt => opt.id === slotProps.value)?.value }}
                                        </div>
                                        <span v-else>
                                            {{ slotProps.placeholder }}
                                        </span>
                                    </template>
                                    <template #option="slotProps">
                                        <div :class="['status-badge', getStatusClass(slotProps.option.id)]">
                                            {{ slotProps.option.value }}
                                        </div>
                                    </template>
                                </Select>
                            </template>
                        </Column>
                    </DataTable>
                </div>
                
                <div class="mt-4">
                    <Button label="リクエスト送信" severity="info" @click="sendInventoryUpdate(mergedDisplayData)" :disabled="!mergedDisplayData || mergedDisplayData.length === 0" />
                </div>
                
            </template>
            
        </Card>
    </div>
</template>
<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';

    const props = defineProps({
        hotel_id: {
            type: [Number],
            required: true,
        },
    });

    // Stores
    import { useXMLStore } from '@/composables/useXMLStore';
    const { template, fetchServiceName, fetchFieldName, fetchXMLTemplate, insertXMLResponse, fetchInventoryForTL, updateTLInventory } = useXMLStore();
    
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { Card, FloatLabel, Select, DatePicker, Button, DataTable, Column } from 'primevue';

    // Helper function to format a Date object to YYYYMMDD string based on local date
    const formatDateToYYYYMMDD = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            // Handle invalid date if necessary. DatePicker should provide a valid Date object or null.
            console.warn("formatDateToYYYYMMDDに無効な日付が渡されました:", date);
            return ""; // Or throw an error, or return a default, depending on desired behavior
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}${month}${day}`;
    };
    const formatDateToYYYY_MM_DD = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            // Handle invalid date if necessary. DatePicker should provide a valid Date object or null.
            console.warn("formatDateToYYYY_MM_DDに無効な日付が渡されました:", date); // Corrected function name in log
            return ""; // Or throw an error, or return a default, depending on desired behavior
        }
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0'); // getMonth() is 0-indexed
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const importData = ref(null);
    const inventoryData = ref(null);
    const statusOptions = [
        { id: 0, value: '未設定' },
        { id: 1, value: '販売中' },
        { id: 2, value: '停止中' },
        { id: 3, value: '一時停止中' },
    ];
    const getStatusClass = (statusId) => {
        switch (statusId) {
            case 0: return 'status-not-set';        // 未設定
            case 1: return 'status-on-sale';        // 販売中
            case 2: return 'status-stopped';        // 停止中
            case 3: return 'status-temp-stopped';   // 一時停止中
            default: return '';
        }
    };
    const today = ref(new Date());

    // Computed property to merge importData and inventoryData
    const mergedDisplayData = computed(() => {
        if (!importData.value || importData.value.length === 0) {
            // If importData is empty, we might still want to show PMS data if available,
            // or an empty table if both are empty.
            // For now, let's prioritize importData structure.
            return []; 
        }

        return importData.value.map(importItem => {
            const correspondingInventoryItem = inventoryData.value.find(
                invItem => invItem.netRmTypeGroupCode === importItem.netRmTypeGroupCode &&
                           invItem.saleDate === importItem.saleDate
            );
            return {
                ...importItem,
                pmsRemainingCount: correspondingInventoryItem ? correspondingInventoryItem.remainingCount : 0 
            };
        });
    });

    // Template    
    const templateName = 'NetStockSearchService';
    const extractionProcedure = 2;
    // searchDurationFrom is a date string in the format YYYYMMDD
    const searchDurationFrom = ref(new Date());    
    const searchDurationTo = ref(new Date());
    searchDurationTo.value.setDate(searchDurationTo.value.getDate() + 1);
    const modifiedTemplate = ref(null);
    const fetchTemplate = async () => {
        // Validation
        if (!searchDurationFrom.value || !searchDurationTo.value) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '日付を選択してください。' });
            return;
        }

        await fetchXMLTemplate(props.hotel_id, templateName);
        if (!template.value) {
            toast.add({ severity: 'error', summary: 'エラー', detail: 'テンプレートの取得に失敗しました。' });
            return;
        }

        const formattedSearchDurationFrom = formatDateToYYYYMMDD(searchDurationFrom.value);
        const formattedSearchDurationTo = formatDateToYYYYMMDD(searchDurationTo.value);

        modifiedTemplate.value = template.value.replace(
            /<extractionProcedure>.*?<\/extractionProcedure>/,
            `<extractionProcedure>${extractionProcedure}</extractionProcedure>`
        ).replace(
            /<searchDurationFrom>.*?<\/searchDurationFrom>/,
            `<searchDurationFrom>${formattedSearchDurationFrom}</searchDurationFrom>`
        ).replace(
            /<searchDurationTo>.*?<\/searchDurationTo>/,
            `<searchDurationTo>${formattedSearchDurationTo}</searchDurationTo>`
        );

        const xmlResponse = await insertXMLResponse(props.hotel_id, templateName, modifiedTemplate.value);
                        
        importData.value = parseXmlResponse(xmlResponse.data);
        console.log('インポートデータ', importData.value);

        const inventoryForTL = await fetchInventoryForTL(props.hotel_id, formatDateToYYYY_MM_DD(searchDurationFrom.value), formatDateToYYYY_MM_DD(searchDurationTo.value));

        inventoryData.value = inventoryForTL.map((item) => ({
            hotel_id: props.hotel_id,
            netRmTypeGroupCode: item.netrmtypegroupcode,            
            saleDate: formatDateToYYYYMMDD(new Date(item.date)),            
            totalRooms: item.total_rooms * 1 || 0,
            salesCount: item.room_count * 1 || 0,
            remainingCount: (item.total_rooms * 1 || 0) - (item.room_count * 1 || 0),
        }));

        console.log('在庫データ', inventoryData.value);
    };
    const parseXmlResponse = (data) => {
        const returnData = data['S:Envelope']['S:Body']['ns2:executeResponse']['return'];

        const netRmTypeGroupAndDailyStockStatusList = returnData.netRmTypeGroupAndDailyStockStatusList;
                
        const inventory = [];
        
        if (Array.isArray(netRmTypeGroupAndDailyStockStatusList)) {
            netRmTypeGroupAndDailyStockStatusList.forEach((item) => {
                inventory.push({
                    hotel_id: props.hotel_id,
                    netRmTypeGroupCode: item.netRmTypeGroupCode,
                    netRmTypeGroupName: item.netRmTypeGroupName,
                    saleDate: item.saleDate,
                    salesCount: item.salesCount * 1 || 0,
                    remainingCount: item.remainingCount * 1 || 0,
                    salesStatus: item.salesStatus * 1 || 0,
                });
            });
        }

        return inventory;
    };

    const sendInventoryUpdate = async (inventoryData) => {
        if (!inventoryData || inventoryData.length === 0) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '更新するデータがありません。' });
            return;
        }

        console.log('在庫データ送信中:', inventoryData);
        try {
            const response = await updateTLInventory(props.hotel_id, inventoryData);
            if (!response.success) {
                toast.add({ severity: 'error', summary: 'エラー', detail: '在庫情報の送信に失敗しました。' });
            } else {
                toast.add({ severity: 'success', summary: '成功', detail: '在庫情報が正常に送信されました。' });
            }
        } catch (error) {
            console.error('在庫データ送信エラー:', error);
            toast.add({ severity: 'error', summary: 'エラー', detail: '在庫情報の送信に失敗しました。' });
        }
    };
         

    onMounted(async () => {       
        
    });

    // Watch for changes in searchDurationFrom
    watch(searchDurationFrom, (newFromDate) => {
        if (newFromDate && searchDurationTo.value && newFromDate > searchDurationTo.value) {            
            searchDurationTo.value = searchDurationFrom.value;
            toast.add({ severity: 'info', summary: '日付調整', detail: '終了日を開始日に調整しました。', life: 3000 });
        }
        // Also ensure 'from' date is not before today
        if (newFromDate < today.value && newFromDate.toDateString() !== today.value.toDateString()) {
             searchDurationFrom.value = new Date(today.value);
             toast.add({ severity: 'warn', summary: '日付調整', detail: '開始日は本日以降である必要があります。', life: 3000 });
        }
    });

    // Watch for changes in searchDurationTo
    watch(searchDurationTo, (newToDate) => {
        if (newToDate && searchDurationFrom.value && newToDate < searchDurationFrom.value) {            
            searchDurationTo.value = searchDurationFrom.value;
            toast.add({ severity: 'info', summary: '日付調整', detail: '終了日を開始日に調整しました。', life: 3000 });
        }
         // Also ensure 'to' date is not before today
        if (newToDate < today.value && newToDate.toDateString() !== today.value.toDateString()) {
             searchDurationTo.value = new Date(today.value);
             // If 'to' is reset to today, and 'from' is also today, adjust 'to' to be tomorrow
             if (searchDurationFrom.value.toDateString() === today.value.toDateString()) {
                const tomorrow = new Date(today.value);
                tomorrow.setDate(tomorrow.getDate() + 1);
                searchDurationTo.value = tomorrow;
             }
             toast.add({ severity: 'warn', summary: '日付調整', detail: '終了日は本日以降である必要があります。', life: 3000 });
        }
    });

</script>
<style scoped>
    .status-badge {
        padding: 0.25em 0.5em;
        border-radius: 4px;
        font-weight: bold;
        display: inline-block; /* Ensures proper rendering of padding and background */
    }

    .status-not-set {
        color: #6c757d; /* Bootstrap gray */
        background-color: #f8f9fa; /* Light gray background */
        opacity: 0.9; /* Slightly transparent */   
    }

    .status-on-sale {
        color: #198754; /* Bootstrap success green */
        background-color: #d1e7dd; /* Light green background */ 
        opacity: 0.9; /* Slightly transparent */   
    }

    .status-stopped {
        color: #dc3545; /* Bootstrap danger red */
        background-color: #f8d7da; /* Light red background */
        opacity: 0.9; /* Slightly transparent */   
    }

    .status-temp-stopped {
        color: #ffc107; /* Bootstrap warning yellow */
        background-color: #fff3cd; /* Light yellow background */
        opacity: 0.9; /* Slightly transparent */
    }
</style>
