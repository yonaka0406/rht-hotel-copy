<template>
    <Panel class="m-2">
        <!-- <div v-if="!isBillingPage"> -->
        <div>
            <div>
                <!-- Commented out or to be repurposed for single receipt generation trigger -->
                <!-- <div class="flex justify-end mr-4"><Button severity="help" @click="setIsBillingPage(true)">領収書発行</Button></div> -->
                <DataTable
                    v-model:filters="filters"
                    v-model:selection="selectedPayments" <!-- Renamed from selectedReservations -->
                    filterDisplay="row"
                    :value="filteredPayments" <!-- Renamed from filteredReservations -->
                    :loading="isLoadingPayments || tableLoading" <!-- Use isLoadingPayments from store -->
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
                >
                    <template #header>
                        <div class="flex justify-between">
                            <span class="font-bold text-lg mb-4">{{ tableHeader }}</span>
                        </div>
                        <div class="mb-4 flex justify-end items-center">
                            <span class="font-bold mr-4">支払日期間選択：</span> <!-- Changed label -->
                            <label class="mr-2">開始日:</label>
                            <DatePicker v-model="startDateFilter" dateFormat="yy-mm-dd" placeholder="開始日を選択" :selectOtherMonths="true" />
                            <label class="ml-4 mr-2">終了日:</label>
                            <DatePicker v-model="endDateFilter" dateFormat="yy-mm-dd" placeholder="終了日を選択" :selectOtherMonths="true" />
                            <Button label="適用" class="ml-4" @click="applyDateFilters" :disabled="!startDateFilter || !endDateFilter" />
                        </div>
                    </template>
                    <template #empty> 指定されている期間中に支払情報はありません。 </template> <!-- Changed empty message -->
                    <Column expander header="詳細" style="width: 1%;"/>
                    <!-- <Column selectionMode="multiple" headerStyle="width: 1%"></Column> --> <!-- Commented out multi-select for now -->

                    <Column field="status" filterField="status" header="支払ステータス" style="width:1%" :showFilterMenu="false"> <!-- Changed header -->
                        <template #filter="{ filterModel, filterCallback }">
                            <Select
                                v-model="filterModel.value"
                                :options="paymentStatusOptions"
                                optionLabel="label"
                                optionValue="value"
                                @change="filterCallback"
                                placeholder="選択"
                                showClear
                                fluid
                            />
                        </template>
                        <template #body="slotProps">
                            <!-- Assuming payment status might be different, e.g. 'completed', 'pending', 'failed' -->
                            <div class="flex justify-center items-center">
                                <span v-if="slotProps.data.status === 'completed'" class="px-2 py-1 rounded-md bg-green-200 text-green-700"><i class="pi pi-check-circle" v-tooltip="'完了'"></i></span>
                                <span v-if="slotProps.data.status === 'pending'" class="px-2 py-1 rounded-md bg-yellow-200 text-yellow-700"><i class="pi pi-clock" v-tooltip="'処理中'"></i></span>
                                <span v-if="slotProps.data.status === 'failed'" class="px-2 py-1 rounded-md bg-red-200 text-red-700"><i class="pi pi-times-circle" v-tooltip="'失敗'"></i></span>
                                <!-- Add other payment statuses as needed -->
                            </div>
                        </template>
                    </Column>
                    <Column field="client_name" filterField="client_name" header="顧客名" style="width:1%" :showFilterMenu="false"> <!-- Changed from booker_name -->
                        <template #filter="{ filterModel }">
                            <InputText v-model="clientFilter" type="text" placeholder="氏名・名称検索" />
                        </template>
                    </Column>
                    <Column field="payment_date" header="支払日" sortable style="width:1%"> <!-- New Column -->
                        <template #body="slotProps">
                            <span>{{ formatDateWithDay(slotProps.data.payment_date) }}</span>
                        </template>
                    </Column>
                    <Column field="amount" header="支払額" sortable style="width:1%"> <!-- New Column -->
                        <template #body="slotProps">
                            <div class="flex justify-end mr-2">
                                <span class="items-end">{{ formatCurrency(slotProps.data.amount) }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column field="existing_receipt_number" header="領収書番号" sortable style="width:1%"> <!-- Changed field -->
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

                    <!-- Columns to remove or adapt: period_price, 予約残高, check_in, number_of_people, number_of_nights -->
                    <!-- These are commented out below -->
                    <!--
                    <Column field="period_price" header="期間請求額" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="flex justify-end mr-2">
                                <span class="items-end">{{ formatCurrency(slotProps.data.period_price) }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column header="予約残高" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="grid gap-2">
                                <div class=" text-right">
                                    {{ formatCurrency(slotProps.data.price - slotProps.data.payment) }}
                                </div>
                                <div class="text-xs text-right text-blue-500 flex items-center justify-end" title='予約合計'>
                                    <i class="pi pi-receipt mr-1"></i>
                                    {{ formatCurrency(slotProps.data.price) }}
                                </div>
                                <div class="text-xs text-right text-green-500 flex items-center justify-end" title='入金額'>
                                    <i class="pi pi-money-bill mr-1"></i>
                                    {{ formatCurrency(slotProps.data.payment) }}
                                </div>
                            </div>
                        </template>
                    </Column>
                    <Column field="check_in" header="チェックイン" sortable style="width:1%">
                        <template #body="slotProps">
                            <span>{{ formatDateWithDay(slotProps.data.check_in) }}</span>
                        </template>
                    </Column>
                    <Column field="number_of_people" header="宿泊者数" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="flex justify-end mr-4">
                                <span>{{ slotProps.data.number_of_people }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column field="number_of_nights" header="宿泊日数" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="flex justify-end mr-4">
                                <span>{{ slotProps.data.number_of_nights }}</span>
                            </div>
                        </template>
                    </Column>
                    -->

                    <template #expansion="slotProps">
                        <!-- This expansion can be simplified or adapted for payment details if any -->
                        <div class="mx-20">
                            <p>支払ID: {{ slotProps.data.payment_id }}</p> <!-- Use payment_id as per model -->
                            <!-- <p>関連予約ID: {{ slotProps.data.reservation_id }} (仮)</p> --> <!-- reservation_id not in selectPaymentsForReceiptsView -->
                            <!-- Add more payment specific details if needed -->
                            <!-- Example: Items if they were part of the payment data fetched -->
                            <!--
                            <div v-if="slotProps.data.items && slotProps.data.items.length > 0">
                                <h5>支払項目:</h5>
                                <DataTable :value="slotProps.data.items" size="small">
                                    <Column field="description" header="内容"></Column>
                                    <Column field="quantity" header="数量">
                                        <template #body="itemProps">{{ itemProps.data.quantity }} {{ itemProps.data.unit }}</template>
                                    </Column>
                                    <Column field="unit_price" header="単価">
                                        <template #body="itemProps">{{ formatCurrency(itemProps.data.unit_price) }}</template>
                                    </Column>
                                    <Column field="total_price" header="金額">
                                        <template #body="itemProps">{{ formatCurrency(itemProps.data.total_price) }}</template>
                                    </Column>
                                </DataTable>
                            </div>
                            <div v-else>
                                <p>支払項目はありません。</p>
                            </div>
                            -->
                        </div>
                    </template>
                </DataTable>
            </div>
            <!-- Commenting out bulk action button for now -->
            <!--
            <div class="flex justify-end mt-4">
                <Button
                    severity="info"
                    @click="drawerSelectVisible = true"
                >
                <OverlayBadge
                    :value="selectedPayments.length"
                    size="large"
                    :position="'top-right'"
                    severity="danger"
                    class="mt-1"
                >
                    <i class="pi pi-shopping-cart" style="font-size: 2rem" />
                </OverlayBadge>
                </Button>
            </div>
            -->
        </div>
        <!-- Commenting out isBillingPage block for now, as it's invoice specific -->
        <!--
        <div v-else>
            <div class="flex justify-between items-center m-4">
                <h2 class="text-lg font-bold">請求書作成</h2>
                <Button severity="secondary" @click="setIsBillingPage(false)">戻る</Button>
            </div>

            <component :is="activeComponent" />
        </div>
        -->

        <!-- Commenting out Drawer for ReservationEdit for now, may not be needed or needs adaptation -->
        <!--
        <Drawer v-model:visible="drawerVisible":modal="true":position="'bottom'":style="{height: '75vh'}":closable="true">
            <ReservationEdit
                v-if="selectedPayment"
                :reservation_id="selectedPayment.reservation_id" // Assuming payment has reservation_id
            />
        </Drawer>
        -->

        <!-- Commenting out bulk action drawer -->
        <!--
        <Drawer v-if="selectedPayments" v-model:visible="drawerSelectVisible" :modal="false":position="'right'":style="{width: '37vh'}" :dismissable="false">
            <template #header><span class="text-lg font-bold">選択された支払の詳細</span></template>
            <div class="grid grid-cols-3 gap-4">
                <Card>
                    <template #content>
                        <div class="grid grid-cols-1">
                            <p class="text-lg font-bold justify-self-center">{{ selectedPayments.length }}件</p>
                            <p class="justify-self-center">選択された件数</p>
                        </div>
                    </template>
                </Card>
                <Card>
                    <template #content>
                        <div class="grid grid-cols-1">
                            <p class="text-lg font-bold justify-self-center">{{ totalPeople }}人</p>
                            <p class="justify-self-center">予約人数合計</p>
                        </div>
                    </template>
                </Card>
                <Card>
                    <template #content>
                        <div class="grid grid-cols-1">
                            <p class="text-lg font-bold justify-self-center">{{ formatCurrency(periodPrice) }}</p>
                            <p class="justify-self-center">期間予約合計</p>
                        </div>
                    </template>
                </Card>
            </div>
            <Card>
                <template #content>
                    <form @submit.prevent="submitReceiptGeneration">
                        <div class="grid grid-cols-1">
                            <p class="mb-1">選択中支払の領収書を一括発行</p>
                            <Button
                                label="選択分 領収書発行"
                                icon="pi pi-file-pdf"
                                type="submit"
                            />
                        </div>
                    </form>
                </template>
            </Card>
            <DataTable
                :value="selectedPayments"
                class="mt-4"
            >
                <Column field="client_name" header="顧客名"/>
                <Column field="payment_date" header="支払日"/>
                <Column field="amount" header="支払額">
                    <template #body="slotProps">
                        <p>{{ formatCurrency(slotProps.data.amount) }}</p>
                    </template>
                </Column>
                <Column header="操作">
                    <template #body="slotProps">
                        <Button icon="pi pi-trash" severity="danger" @click="deletePaymentFromDrawer(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>
        </Drawer>
        -->
    </Panel>
</template>
<script setup>
    // Vue
    import { ref, shallowRef, watch, computed, onMounted } from 'vue';

    // import ReservationEdit from './ReservationEdit.vue'; // May not be needed

    // Primevue
    import { useToast } from "primevue/usetoast";
    const toast = useToast();
    import { Panel, Drawer, Card, DatePicker, AutoComplete, Select, InputText, Button, DataTable, Column, Badge, OverlayBadge, FloatLabel } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    // Stores
    import { useBillingStore } from '@/composables/useBillingStore';
    const { paymentsList, fetchPaymentsForReceipts, isLoadingPayments, generateReceiptPdf } = useBillingStore(); // Added generateReceiptPdf and isLoadingPayments
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
    // Client store might still be needed for filtering by client name
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();
    // ReservationStore might not be needed if receipts are purely from payments
    // import { useReservationStore } from '@/composables/useReservationStore';
    // const { addBulkReservationPayment } = useReservationStore();

    // Helper function (can be moved to a utils file)
    const formatDate = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            // console.error("Invalid Date object for formatDate:", date);
            return ''; // Return empty for invalid dates
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `\${year}-\${month}-\${day}`;
    };
    const formatDateWithDay = (dateStr) => {
        if (!dateStr) return '';
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parsedDate = new Date(dateStr);
        if (isNaN(parsedDate.getTime())) return ''; // Handle invalid date strings
        return `\${parsedDate.toLocaleDateString(undefined, options)}`;
    };
    const formatCurrency = (value) => {
        if (value == null || isNaN(Number(value))) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };

    // const isBillingPage = ref(false); // This logic might be removed or adapted
    // const setIsBillingPage = async(value) => { ... };
    // const activeComponent = shallowRef(null); // Related to isBillingPage

    // Load data for the table
    const loadTableData = async () => {
        if (!selectedHotelId.value || !startDateFilter.value || !endDateFilter.value) {
            // toast.add({ severity: 'warn', summary: '情報不足', detail: 'ホテルIDまたは日付範囲が選択されていません。', life: 3000 });
            paymentsList.value = []; // Clear list if inputs are missing
            return;
        }
        // tableLoading.value is still managed locally for now, could also be moved to store if needed globally for this component type
        tableLoading.value = true;
        await fetchPaymentsForReceipts(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        tableHeader.value = `領収書発行対象一覧 \${formatDateWithDay(startDateFilter.value)} ～ \${formatDateWithDay(endDateFilter.value)}`;
        tableLoading.value = false; // Reset local loading after fetch (store handles its own)
    }

    // Selection and Drawer logic (mostly commented out for now)
    const selectedPayments = ref([]); // Renamed
    // const drawerSelectVisible = ref(false);
    // const totalPeople = computed(() => { ... }); // May not be relevant for payments
    // const periodPrice = computed(() => { ... }); // May not be relevant

    // Form for bulk actions (commented out)
    /*
    const receiptForm = ref({
        date: null, // Receipt date, could be auto-set
        details: null,
        payments: [], // List of selected payment IDs
        client: [], // Client might not be needed if receipt is per payment
    });
    */

    // Client filtering might still be useful for the main table filter
    const clientFilter = ref(null); // For filtering the main list by client name
    // const selectedClient = ref(null);
    // const client = ref({});
    // const filteredClients = ref([]);
    // const filterClients = (event) => { ... }; // Keep if using client filter on table
    // const onClientSelect = (event) => { ... };
    // const normalizeKana = (str) => { ... };
    // const normalizePhone = (phone) => { ... };

    // const deletePaymentFromDrawer = (paymentToDelete) => { ... }; // For bulk drawer

    const isGeneratingReceiptId = ref(null); // For row-specific loading state

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
        toast.add({ severity: 'info', summary: '領収書発行中', detail: `支払ID: \${paymentData.payment_id} の領収書を準備しています...`, life: 3000 });

        try {
            const response = await fetch(`/api/billing/res/generate-receipt/\${selectedHotelId.value}/\${paymentData.payment_id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer \${localStorage.getItem('authToken')}`,
                    // 'Content-Type': 'application/json', // Not needed if no body is sent
                }
            });

            if (!response.ok) {
                let errorDetail = `HTTP error! Status: \${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetail = errorData.message || errorData.error || errorDetail;
                } catch (e) {
                    // Failed to parse JSON, stick with status text or generic message
                    errorDetail = response.statusText || 'サーバーエラーが発生しました。';
                }
                throw new Error(errorDetail);
            }

            const blob = await response.blob();
            if (blob.type !== "application/pdf") {
                throw new Error("受信したファイルはPDFではありません。");
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            // Try to get filename from Content-Disposition header first
            const disposition = response.headers.get('content-disposition');
            let filename = `領収書_\${paymentData.existing_receipt_number || paymentData.payment_id}.pdf`;
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\\n]*=((['"]).*?\\2|[^;\\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) {
                    filename = matches[1].replace(/['"]/g, '');
                }
            }
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.add({ severity: 'success', summary: '成功', detail: '領収書が発行されました。', life: 3000 });
            await loadTableData(); // Refresh the list
        } catch (error) {
            console.error("Error generating receipt:", error);
            toast.add({ severity: 'error', summary: '発行失敗', detail: error.message || '領収書の発行に失敗しました。', life: 3000 });
        } finally {
            isGeneratingReceiptId.value = null;
        }
    };

    const viewReceipt = (paymentData) => {
        // This function will re-generate and download the receipt.
        // The tooltip was updated to "領収書表示/再発行" to reflect this.
        console.log("Viewing/Re-generating receipt for payment:", paymentData);
        generateSingleReceipt(paymentData);
    };

    // Filters
    const startDateFilter = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1)); // Default to start of current month
    const endDateFilter = ref(new Date()); // Default to today
    const paymentStatusOptions = [ // Example statuses for payments
        { label: '完了', value: 'completed' },
        { label: '処理中', value: 'pending' },
        { label: '失敗', value: 'failed' },
    ];

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
        // Apply status filter
        if (filters.value.status.value) {
             list = list.filter(payment => payment.status === filters.value.status.value);
        }

        // The backend already formats payment_date as 'YYYY-MM-DD'
        // and amount should be a number from the store mapping.
        // existing_receipt_number comes directly.
        return list; // No specific mapping needed here if store does it
    });

    // Data Table
    const tableHeader = ref(`領収書発行対象一覧 \${formatDateWithDay(startDateFilter.value)} ～ \${formatDateWithDay(endDateFilter.value)}`)
    const tableLoading = ref(true);
    // const drawerVisible = ref(false);
    // const selectedPayment = ref(null);
    const expandedRows = ref({});
    const filters = ref({
        status: { value: null, matchMode: FilterMatchMode.EQUALS },
        client_name: { value: null, matchMode: FilterMatchMode.CONTAINS },
        // Add other filters if columns are added back
    });

    // openDrawer might be repurposed if clicking a row should show payment details or edit related reservation
    const openDrawer = (event) => {
        // selectedPayment.value = event.data;
        // drawerVisible.value = true;
        console.log("Row double-clicked, potential detail view for:", event.data);
        // For now, let's use it to trigger receipt generation if no receipt exists
        if (!event.data.existing_receipt_number) {
            generateSingleReceipt(event.data);
        } else {
            viewReceipt(event.data);
        }
    };

    onMounted(async () => {
        // await fetchHotels(); // Ensure hotel list is loaded
        // await fetchHotel(); // Ensure selected hotel details are loaded (e.g. for hotelId)

        // Client data for filtering client_name column
        if (!clients.value || clients.value.length === 0) { // Check if clients is null or empty
             setClientsIsLoading(true);
             try {
                const clientsTotalPages = await fetchClients(1);
                if (typeof clientsTotalPages === 'number') { // Assuming fetchClients might return page count or similar meta
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
        // Initial data load is handled by the watcher on selectedHotelId
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

    // Watch for changes in selectedPayments (if bulk actions were to be re-enabled)
    /*
    watch(selectedPayments, (newValue) => {
        // if(drawerVisible.value === false){ // Assuming drawerVisible is for single item edit
        //     drawerSelectVisible.value = newValue.length > 0;
        //     receiptForm.value.date = new Date(); // Default receipt date
        //     receiptForm.value.payments = selectedPayments.value.map(p => p.id);
        // }
    });
    */
// FORCED_UPDATE_TIMESTAMP_RECEIPTSPAGE_20231201160000
</script>