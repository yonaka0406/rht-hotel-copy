<template>
    <Panel class="m-2">        
        <div>
            <div>
                <DataTable
                    v-model:filters="filters"
                    v-model:selection="selectedPayments"
                    filterDisplay="row"
                    :value="filteredPayments"
                    :loading="isLoadingPayments || tableLoading"
                    size="small"
                    :paginator="true"
                    :rows="25"
                    :rowsPerPageOptions="[5, 10, 25, 50, 100]"
                    dataKey="payment_id"
                    stripedRows
                    @row-dblclick="openDrawer"
                    removableSort
                    v-model:expandedRows="expandedRows"
                    :rowExpansion="true"
                    rowGroupMode="subheader"
                    groupRowsBy="client_payment_date_group"
                    sortMode="single"
                    :sortField="'client_payment_date_group'"
                    :sortOrder="1"
                >
                    <template #groupheader="slotProps">
                        <div class="flex items-center justify-between gap-2 p-2 bg-gray-100">
                            <span class="font-bold">Client: {{ slotProps.data.client_name }} - Date: {{ formatDateWithDay(slotProps.data.payment_date) }}</span>
                            <Button
                                v-if="getConsolidatablePayments(slotProps.data).length > 0"
                                label="一括領収書発行"
                                icon="pi pi-file-export"
                                severity="success"
                                class="p-button-sm ml-auto"
                                :loading="generatingConsolidatedKey === slotProps.data.client_payment_date_group"
                                :disabled="generatingConsolidatedKey === slotProps.data.client_payment_date_group"
                                @click="generateConsolidatedReceiptForGroup(slotProps.data)"
                                v-tooltip.top="'このグループの未発行の支払いをまとめて領収書発行'"
                            />
                        </div>
                    </template>
                    <template #header>
                        <div class="flex justify-between">
                            <span class="font-bold text-lg mb-4">{{ tableHeader }}</span>
                        </div>
                        <div class="mb-4 flex justify-end items-center">
                            <span class="font-bold mr-4">支払日期間選択：</span>
                            <label class="mr-2">開始日:</label>
                            <DatePicker v-model="startDateFilter" dateFormat="yy-mm-dd" placeholder="開始日を選択" :selectOtherMonths="true" />
                            <label class="ml-4 mr-2">終了日:</label>
                            <DatePicker v-model="endDateFilter" dateFormat="yy-mm-dd" placeholder="終了日を選択" :selectOtherMonths="true" />
                            <Button label="適用" class="ml-4" @click="applyDateFilters" :disabled="!startDateFilter || !endDateFilter" />
                        </div>
                    </template>
                    <template #empty> 指定されている期間中に支払情報はありません。 </template>
                    <Column header="詳細" style="width: 1%;">
                        <template #body="slotProps">
                            <button @click="toggleRowExpansion(slotProps.data)" class="p-button p-button-text p-button-rounded" type="button" v-tooltip.top="'詳細表示/非表示'">
                                <i :class="isRowExpanded(slotProps.data) ? 'pi pi-chevron-down text-blue-500' : 'pi pi-chevron-right text-blue-500'" style="font-size: 0.875rem;"></i>
                            </button>
                        </template>
                    </Column>
                    
                    <Column field="client_name" filterField="client_name" header="顧客名" style="width:1%" :showFilterMenu="false">
                        <template #filter="{ filterModel }">
                            <InputText v-model="clientFilter" type="text" placeholder="氏名・名称検索" />
                        </template>
                    </Column>
                    <Column field="payment_date" header="支払日" sortable style="width:1%">
                        <template #body="slotProps">
                            <span>{{ formatDateWithDay(slotProps.data.payment_date) }}</span>
                        </template>
                    </Column>
                    <Column field="amount" header="支払額" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="flex justify-end mr-2">
                                <span class="items-end">{{ formatCurrency(slotProps.data.amount) }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column field="existing_receipt_number" header="領収書番号" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="flex justify-end mr-2">
                                <span class="items-end">{{ slotProps.data.existing_receipt_number }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column header="アクション" style="width:1%">
                        <template #body="slotProps">
                            <Button
                                v-if="!slotProps.data.existing_receipt_number"
                                :icon="isGeneratingReceiptId === slotProps.data.payment_id ? 'pi pi-spin pi-spinner' : 'pi pi-file-pdf'"
                                severity="warning"
                                @click="generateSingleReceipt(slotProps.data)"
                                v-tooltip="'領収書発行'"
                                :disabled="isGeneratingReceiptId === slotProps.data.payment_id"
                            />
                            <Button
                                v-else
                                :icon="isGeneratingReceiptId === slotProps.data.payment_id ? 'pi pi-spin pi-spinner' : 'pi pi-eye'"
                                severity="info"
                                @click="viewReceipt(slotProps.data)"
                                v-tooltip="'領収書表示/再発行'"
                                class="ml-2"
                                :disabled="isGeneratingReceiptId === slotProps.data.payment_id"
                            />
                        </template>
                    </Column>                    

                    <template #expansion="slotProps">
                        <div class="mx-20">
                            <p>支払ID: {{ slotProps.data.payment_id }}</p> 
                        </div>
                    </template>
                </DataTable>
            </div>            
        </div>        
    </Panel>
</template>
<script setup>
    // Vue
    import { ref, shallowRef, watch, computed, onMounted } from 'vue';

    // Primevue
    import { useToast } from "primevue/usetoast";
    const toast = useToast();
    import { Panel, Drawer, Card, DatePicker, AutoComplete, Select, InputText, Button, DataTable, Column, Badge, OverlayBadge, FloatLabel } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    // Stores
    import { useBillingStore } from '@/composables/useBillingStore';
    const { paymentsList, fetchPaymentsForReceipts, isLoadingPayments, handleGenerateReceipt, handleGenerateConsolidatedReceipt } = useBillingStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();

    // Helper function (can be moved to a utils file)
    const formatDate = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.error("Invalid Date object for formatDate:", date);
            return '';
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return year + '-' + month + '-' + day;
    };
    const formatDateWithDay = (dateInput) => {
        if (!dateInput) return '';
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        let parsedDate;
        if (dateInput instanceof Date) {
            parsedDate = dateInput;
        } else if (typeof dateInput === 'string') {
            parsedDate = new Date(dateInput);
        } else {            
            return '';
        }
        if (isNaN(parsedDate.getTime())) return '';
        return parsedDate.toLocaleDateString(undefined, options);
    };
    const formatCurrency = (value) => {
        if (value == null || isNaN(Number(value))) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };
    
    // Load data for the table
    const loadTableData = async () => {
        if (!selectedHotelId.value || !startDateFilter.value || !endDateFilter.value) {
            toast.add({ severity: 'warn', summary: '情報不足', detail: 'ホテルIDまたは日付範囲が選択されていません。', life: 3000 });
            paymentsList.value = []; // Clear list if inputs are missing
            return;
        }        
        tableLoading.value = true;
        await fetchPaymentsForReceipts(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        tableHeader.value = '領収書発行対象一覧 ' + formatDateWithDay(startDateFilter.value) + ' ～ ' + formatDateWithDay(endDateFilter.value);
        tableLoading.value = false;
    }

    // Selection and Drawer logic (mostly commented out for now)
    const selectedPayments = ref([]);
    
    // Client filtering might still be useful for the main table filter
    const clientFilter = ref(null);    

    const isGeneratingReceiptId = ref(null); // For row-specific loading state
    const generatingConsolidatedKey = ref(null); // For group-specific loading state

    // Helper to get payments eligible for consolidation within a group
    const getConsolidatablePayments = (groupItemData) => {
        if (!groupItemData || !filteredPayments.value) return [];
        // Ensure groupItemData has the synthetic key if it's coming directly from slotProps.data
        const groupKey = groupItemData.client_payment_date_group || `${groupItemData.client_name} - ${groupItemData.payment_date}`;
        return filteredPayments.value.filter(p =>
            p.client_payment_date_group === groupKey &&
            !p.existing_receipt_number
        );
    };

    // Generate consolidated receipt for a group
    async function generateConsolidatedReceiptForGroup(groupItemData) {
        // Ensure groupKey is derived correctly from groupItemData, which is the first item of the group
        const groupKey = groupItemData.client_payment_date_group;
        const paymentsToConsolidate = getConsolidatablePayments(groupItemData);

        if (paymentsToConsolidate.length === 0) {
            toast.add({ severity: 'warn', summary: '対象なし', detail: 'このグループに一括発行対象の支払がありません。', life: 3000 });
            return;
        }

        const paymentIds = paymentsToConsolidate.map(p => p.payment_id);

        if (!selectedHotelId.value) {
            toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルが選択されていません。', life: 3000 });
            return;
        }

        generatingConsolidatedKey.value = groupKey;
        toast.add({ severity: 'info', summary: '処理中', detail: `グループ (${groupKey}) の一括領収書を発行しています...`, life: 4000 });

        try {
            const result = await handleGenerateConsolidatedReceipt(selectedHotelId.value, paymentIds);
            if (result.success) {
                toast.add({ severity: 'success', summary: '成功', detail: `一括領収書 (${result.filename}) が発行されました。データ再読み込み中...`, life: 3000 });
                await loadTableData(); // Refresh data
            } else {
                throw new Error(result.error || '一括領収書の発行に失敗しました。');
            }
        } catch (error) {
            console.error("Error generating consolidated receipt:", error);
            toast.add({ severity: 'error', summary: '発行失敗', detail: error.message || '一括領収書の発行中にエラーが発生しました。', life: 5000 });
        } finally {
            generatingConsolidatedKey.value = null;
        }
    }

    // Submitting/generating a single receipt
    const generateSingleReceipt = async (paymentData) => {
        if (!paymentData || !paymentData.payment_id) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '有効な支払データがありません。', life: 3000 });
            return;
        }
        if (!selectedHotelId.value) {
            toast.add({ severity: 'error', summary: 'エラー', detail: 'ホテルが選択されていません。', life: 3000 });
            return;
        }

        isGeneratingReceiptId.value = paymentData.payment_id;
        toast.add({ severity: 'info', summary: '領収書発行中', detail: `支払ID: ${paymentData.payment_id} の領収書を準備しています...`, life: 3000 });

        try {
            // Call the store action
            const result = await handleGenerateReceipt(selectedHotelId.value, paymentData.payment_id);
            
            if (result.success) {
                toast.add({ severity: 'success', summary: '成功', detail: `領収書 (${result.filename}) が発行されました。`, life: 3000 });
                await loadTableData(); // Refresh the list
            }
            
        } catch (error) {
            console.error("Error generating receipt via store:", error);
            toast.add({ severity: 'error', summary: '発行失敗', detail: error.message || '領収書の発行に失敗しました。', life: 5000 }); // Increased life for error message
        } finally {
            isGeneratingReceiptId.value = null;
        }
    };

    const viewReceipt = (paymentData) => {        
        console.log("Viewing/Re-generating receipt for payment:", paymentData);
        generateSingleReceipt(paymentData);
    };

    // Filters
    const startDateFilter = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); // Default to start of current month
    const endDateFilter = ref(new Date()); // Default to today

    const applyDateFilters = async () => {
        if (startDateFilter.value && endDateFilter.value) {
            await loadTableData();
        }
    };

    const filteredPayments = computed(() => {
        let list = paymentsList.value || [];

        if (clientFilter.value) {
            const filterValue = clientFilter.value.toLowerCase();
            list = list.filter(payment =>
                (payment.client_name && payment.client_name.toLowerCase().includes(filterValue))
            );
        }

        // Create synthetic key and sort
        list = list.map(payment => ({
            ...payment,
            client_payment_date_group: `${payment.client_name} - ${payment.payment_date}`
        }));

        list.sort((a, b) => {
            // Primary sort by the synthetic group key
            if (a.client_payment_date_group < b.client_payment_date_group) return -1;
            if (a.client_payment_date_group > b.client_payment_date_group) return 1;

            // Secondary sort: payments without existing receipts first
            if (!a.existing_receipt_number && b.existing_receipt_number) return -1;
            if (a.existing_receipt_number && !b.existing_receipt_number) return 1;

            // Tertiary sort by payment_id for stable order within the same client/date/receipt status
            return (a.payment_id || 0) - (b.payment_id || 0);
        });
        
        return list;
    });

    // Data Table
    const tableHeader = ref('領収書発行対象一覧 ' + formatDateWithDay(startDateFilter.value) + ' ～ ' + formatDateWithDay(endDateFilter.value));
    const tableLoading = ref(true);    
    const expandedRows = ref({});

    const toggleRowExpansion = (rowData) => {
        const rowKey = rowData.payment_id;
        const newExpandedRows = {...expandedRows.value};
        if (newExpandedRows[rowKey]) {
            delete newExpandedRows[rowKey];
        } else {
            newExpandedRows[rowKey] = true;
        }
        expandedRows.value = newExpandedRows;
    };

    const isRowExpanded = (rowData) => {
        const rowKey = rowData.payment_id;
        return expandedRows.value && expandedRows.value[rowKey];
    };

    const filters = ref({
        client_name: { value: null, matchMode: FilterMatchMode.CONTAINS },        
    });

    
    const openDrawer = (event) => {        
        console.log("Row double-clicked, potential detail view for:", event.data);        
        if (!event.data.existing_receipt_number) {
            generateSingleReceipt(event.data);
        } else {
            viewReceipt(event.data);
        }
    };

    onMounted(async () => {
        // await fetchHotels(); 
        // await fetchHotel();

        // Client data for filtering client_name column
        if (!clients.value || clients.value.length === 0) { // Check if clients is null or empty
             setClientsIsLoading(true);
             try {
                const clientsTotalPages = await fetchClients(1);
                if (typeof clientsTotalPages === 'number') { 
                    for (let page = 2; page <= clientsTotalPages; page++) {
                        await fetchClients(page);
                    }
                }
             } catch (e) {
                console.error("Failed to load all clients:", e);
             } finally {
                setClientsIsLoading(false);
             }
        }        
    });

    watch(() => selectedHotelId.value,
        async (newHotelId, oldHotelId) => {
            // Ensure hotels are loaded before trying to fetch dependent data
            if (!selectedHotelId.value && fetchHotels) { // Make sure fetchHotels is available
                await fetchHotels();
            }
            if (selectedHotelId.value && fetchHotel) { // Make sure fetchHotel is available
                await fetchHotel(); // This might set selectedHotelId if not already set, or load details
            }
            // Proceed to load table data if hotelId is available
            if (selectedHotelId.value) {
                await loadTableData();
            }
        },
        { immediate: true } // Run once on component mount
    );
</script>