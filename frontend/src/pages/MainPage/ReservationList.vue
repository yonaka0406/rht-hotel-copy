<template>
    <Panel class="m-2">        
        <div>
            <DataTable
                v-model:filters="filters"
                v-model:selection="selectedReservations"
                filterDisplay="row"
                :value="filteredReservations"
                :loading="tableLoading"
                size="small"
                :paginator="true"
                :rows="25"
                :rowsPerPageOptions="[5, 10, 25, 50, 100]"
                dataKey="id"                
                stripedRows
                @row-dblclick="openDrawer"
                removableSort
                v-model:expandedRows="expandedRows"
                :rowExpansion="true"
            >
                <template #header>
                    <div class="flex justify-between">
                        <span class="font-bold text-lg">{{ tableHeader }}</span>
                    </div>
                    <div class="mb-4 flex justify-end items-center">                        
                        <span class="font-bold mr-4">滞在期間選択：</span>
                        <label class="mr-2">開始日:</label>
                        <DatePicker v-model="startDateFilter" dateFormat="yy-mm-dd" placeholder="開始日を選択" :selectOtherMonths="true" />
                        <label class="ml-4 mr-2">終了日:</label>
                        <DatePicker v-model="endDateFilter" dateFormat="yy-mm-dd" placeholder="終了日を選択" :selectOtherMonths="true" />
                        <Button label="適用" class="ml-4" @click="applyDateFilters" :disabled="!startDateFilter || !endDateFilter" />
                        <Button
                            label="全フィルタークリア"
                            icon="pi pi-filter-slash"
                            severity="warning"
                            class="ml-4"
                            @click="clearAllFilters"
                            v-tooltip.bottom="'全てのフィルターをリセットします'"
                        />
                        <!-- Export -->
                        <SplitButton 
                            label="エクスポート" 
                            icon="pi pi-file-export"
                            severity="help"
                            class="ml-4"
                            @click="splitButtonExportReservations"
                            :model="exportOptions" 
                        />
                    </div>
                </template>
                <template #empty> 指定されている期間中では予約ありません。 </template>                
                <Column header="詳細" style="width: 1%;">
                    <template #body="slotProps">
                        <button @click="toggleRowExpansion(slotProps.data)" class="p-button p-button-text p-button-rounded" type="button">
                            <i :class="isRowExpanded(slotProps.data) ? 'pi pi-chevron-down text-blue-500' : 'pi pi-chevron-right text-blue-500'" style="font-size: 0.875rem;"></i>
                        </button>
                    </template>
                </Column>
                <Column selectionMode="multiple" headerStyle="width: 1%"></Column>
                
                <Column field="status" filterField="status" header="ステータス" style="width:1%" :showFilterMenu="false">
                    <template #filter="{ filterModel, filterCallback }">                        
                        <Select 
                            v-model="filterModel.value" 
                            :options="statusOptions" 
                            optionLabel="label"
                            optionValue="value" 
                            @change="filterCallback" 
                            placeholder="選択"
                            showClear 
                            fluid
                        />                        
                    </template>                    
                    <template #body="slotProps">
                        <div class="flex justify-center items-center">
                            <span v-if="slotProps.data.status === 'hold'" class="px-2 py-1 rounded-md bg-yellow-200 text-yellow-700"><i class="pi pi-pause" v-tooltip="'保留中'"></i></span>
                            <span v-if="slotProps.data.status === 'provisory'" class="px-2 py-1 rounded-md bg-cyan-200 text-cyan-700"><i class="pi pi-clock" v-tooltip="'仮予約'"></i></span>
                            <span v-if="slotProps.data.status === 'confirmed'" class="px-2 py-1 rounded-md bg-sky-200 text-sky-700"><i class="pi pi-check-circle" v-tooltip="'確定'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_in'" class="px-2 py-1 rounded-md bg-green-200 text-green-700"><i class="pi pi-user" v-tooltip="'滞在中'"></i></span>
                            <span v-if="slotProps.data.status === 'checked_out'" class="px-2 py-1 rounded-md bg-purple-200 text-purple-700"><i class="pi pi-sign-out" v-tooltip="'アウト'"></i></span>
                            <span v-if="slotProps.data.status === 'cancelled'" class="px-2 py-1 rounded-md bg-gray-200 text-gray-700"><i class="pi pi-times" v-tooltip="'キャンセル'"></i></span>
                        </div>                        
                    </template>                    
                </Column>
                <Column field="booker_name" filterField="booker_name" header="予約者" style="width:3%" :showFilterMenu="false">
                    <template #filter="{ filterModel }">
                        <InputText v-model="clientFilterInput" type="text" placeholder="予約者 氏名・カナ・漢字検索" />
                    </template>
                </Column>
                <Column field="clients_json" filterField="clients_json" header="宿泊者・支払者" style="width:3%" :showFilterMenu="false">
                    <template #filter="{ filterModel }">
                        <InputText v-model="clientsJsonFilterInput" type="text" placeholder="宿泊者・支払者 氏名・カナ・漢字検索" />
                    </template>
                    <template #body="{ data }">
                        <span v-if="data.clients_json" v-tooltip="formatClientNames(data.clients_json)" style="white-space: pre-line;">
                            {{ getVisibleClientNames(data.clients_json) }}
                        </span>
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
                <Column field="price" header="料金" sortable style="width:2%" :showFilterMenu="false">
                    <template #filter="{ filterModel }">
                        <div class="grid grid-cols-1">
                            <Select v-model="priceFilterCondition" :options="['=', '>', '<']" placeholder="条件" fluid />
                            <InputNumber v-model="priceFilter" placeholder="請求額フィルター" fluid />
                        </div>
                    </template>
                    <template #body="slotProps">
                        <div class="flex justify-end mr-2">
                            <span class="items-end">{{ formatCurrency(slotProps.data.price) }}</span>
                        </div>                        
                    </template>                    
                </Column>
                <Column field="payment" header="支払い" sortable style="width:2%" :showFilterMenu="false">
                    <template #filter="{ filterModel }">
                        <div class="grid grid-cols-1">
                            <Select v-model="paymentFilterCondition" :options="['=', '>', '<']" placeholder="条件" fluid />
                            <InputNumber v-model="paymentFilter" placeholder="支払額フィルター" fluid />
                        </div>
                    </template>
                    <template #body="slotProps">
                        <div class="flex justify-end mr-2">
                            <span class="items-end">{{ formatCurrency(slotProps.data.payment) }}</span>
                        </div>                        
                    </template>                    
                </Column>

                <template #expansion="slotProps">
                    <div class="mx-20">
                        <div v-if="Array.isArray(slotProps.data.merged_clients)">
                            <DataTable :value="slotProps.data.merged_clients" size="small">
                                <Column header="氏名・名称" sortable>
                                    <template #body="clientSlotProps">
                                        {{ clientSlotProps.data.name_kanji || clientSlotProps.data.name || '' }}
                                    </template>
                                </Column>
                                <Column header="カナ" sortable>
                                    <template #body="clientSlotProps">
                                        {{ clientSlotProps.data.name_kana || '' }}
                                    </template>
                                </Column>
                                <Column header="漢字" sortable>
                                    <template #body="clientSlotProps">
                                        {{ clientSlotProps.data.name_kanji || '' }}
                                    </template>
                                </Column>
                                <Column header="タグ" sortable>
                                    <template #body="clientSlotProps">
                                        <div v-if="clientSlotProps.data.role === 'guest'">
                                            <Badge value="宿泊者" severity="contrast"/>
                                        </div>
                                        <div v-else>
                                            <Badge value="支払者" severity="info"/>
                                        </div>
                                        
                                    </template>
                                </Column>
                            </DataTable>
                        </div>
                        <div v-else>
                            <p>宿泊者データがありません。</p>
                        </div>
                    </div>
                </template>
            </DataTable>
        </div>
        
        <Drawer v-model:visible="drawerVisible":modal="true":position="'bottom'":style="{height: '75vh'}":closable="true">
            <ReservationEdit
                v-if="selectedReservation"
                :reservation_id="selectedReservation.id"                       
            />
        </Drawer>
        <Drawer v-if="selectedReservations" v-model:visible="drawerSelectVisible" :modal="false":position="'right'":style="{width: '33vh'}">
            <template #header><span class="text-lg font-bold">選択された予約の詳細</span></template>
            <div class="grid grid-cols-2 gap-4">
                <Card>
                    <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ selectedReservations.length }}件</p>
                        <p class="justify-self-center">選択された件数</p>
                    </div>
                    </template>
                </Card>
                <Card>
                    <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ totalPeople }}人</p>
                        <p class="justify-self-center">合計人数</p>
                    </div>
                    </template>
                </Card>
                <Card>
                    <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ totalPeopleNights }}泊</p>
                        <p class="justify-self-center">合計宿泊数</p>
                    </div>
                    </template>
                </Card>

                <Card>
                    <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ formatCurrency(totalPrice) }}</p>
                        <p class="justify-self-center">料金合計</p>
                    </div>
                    </template>
                </Card>

                <Card>
                    <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ formatCurrency(totalPayments) }}</p>
                        <p class="justify-self-center">入金合計</p>
                    </div>
                    </template>
                </Card>

                <Card>
                    <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ formatCurrency(totalBalance) }}</p>
                        <p class="justify-self-center">残高合計</p>
                    </div>
                    </template>
                </Card>
            </div>
        </Drawer>
    </Panel>
</template>

<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue'; 
    
    import ReservationEdit from './ReservationEdit.vue';

    // Primevue
    import { useToast } from "primevue/usetoast";
    const toast = useToast();
    import { Panel, Drawer, Card, DatePicker, Select, InputText, InputNumber, Button, DataTable, Column, Badge, SplitButton } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { reservationList, fetchReservationListView, exportReservationList, exportReservationDetails, exportMealCount } = useReportStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

    // Helper function
    const formatDate = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.error("Invalid Date object:", date);
            throw new Error("The provided input is not a valid Date object:");
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };
    const formatDateWithDay = (date) => {
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parsedDate = new Date(date);
        return `${parsedDate.toLocaleDateString(undefined, options)}`;
    };
    const formatCurrency = (value) => {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };

    // Helper function (can be placed near other helper functions like formatDate)
    const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    };

    // Load
    const loadTableData = async () => {
        tableLoading.value = true;
        await fetchReservationListView(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        tableHeader.value = `予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`;
        tableLoading.value = false;
    }

    // Select
    const selectedReservations = ref([]);
    const drawerSelectVisible = ref(false);
    const totalPrice = computed(() => {
        if(!selectedReservations){ return 0;}        
        return selectedReservations.value.reduce((sum, reservation) => {
            const price = Number(reservation.price);
            if (!isNaN(price)) {
                return sum + price;
            } else {
                console.warn(`Invalid price encountered: ${reservation.price}`);
                return sum;
            }
        }, 0);
    });
    const totalPayments = computed(() => {
        if(!selectedReservations){ return 0;}
        return selectedReservations.value.reduce((sum, reservation) => {
            const payment = Number(reservation.payment);
            if (!isNaN(payment)) {
                return sum + payment;
            } else {
                console.warn(`Invalid payment encountered: ${reservation.payment}`);
                return sum;
            }
        }, 0);        
    });
    const totalBalance = computed(() => {
        if(!selectedReservations){ return 0;}
        return selectedReservations.value.reduce((sum, reservation) => sum + ((reservation.price || 0) - (reservation.payment || 0)), 0);
    });
    const totalPeopleNights = computed(() => {
        if(!selectedReservations){ return 0;}
        const formattedTotalPeopleNights = selectedReservations.value.reduce((sum, reservation) => sum + ((reservation.number_of_people || 0) * (reservation.number_of_nights || 0)), 0);
        return formattedTotalPeopleNights.toLocaleString();
    });
    const totalPeople = computed(() => {
        if(!selectedReservations){ return 0;}
        return selectedReservations.value.reduce((sum, reservation) => sum + (reservation.number_of_people || 0), 0);
    });

    // Filters     
    const startDateFilter = ref(new Date(new Date().setDate(new Date().getDate() - 6)));
    const endDateFilter = ref(new Date()); 
    const statusOptions = [
        { label: '保留中', value: 'hold' },
        { label: '仮予約', value: 'provisory' },
        { label: '確定', value: 'confirmed' },
        { label: '滞在中', value: 'checked_in' },
        { label: 'アウト', value: 'checked_out' },
        { label: 'キャンセル', value: 'cancelled' }
    ];
    const clientFilter = ref(null);
    const clientFilterInput = ref(null); // For booker_name filter
    const clientsJsonFilter = ref(null);
    const clientsJsonFilterInput = ref(null); // For clients_json filter
    const priceFilter = ref(null);
    const priceFilterCondition = ref("=");
    const paymentFilter = ref(null);
    const paymentFilterCondition = ref("=");
    const applyDateFilters = async () => {
        if (startDateFilter.value && endDateFilter.value) {            
            await loadTableData();
        }
    };

    const clearAllFilters = async () => {
        // Reset date filters to default (last 6 days to today)
        startDateFilter.value = new Date(new Date().setDate(new Date().getDate() - 6));
        endDateFilter.value = new Date();

        // Reset status filter
        if (filters.value.status) {
            filters.value.status.value = null;
        }

        // Reset text input fields (which will trigger watchers to reset actual filters)
        clientFilterInput.value = ''; // Or null, ensure consistency
        clientsJsonFilterInput.value = ''; // Or null

        // Reset price filter
        priceFilter.value = null;
        priceFilterCondition.value = "=";

        // Reset payment filter
        paymentFilter.value = null;
        paymentFilterCondition.value = "=";

        // Potentially, explicitly set the main filters if not relying purely on watchers for text inputs
        // clientFilter.value = null;
        // clientsJsonFilter.value = null;

        // Reload table data
        await loadTableData();
        toast.add({ severity: 'info', summary: 'フィルタークリア', detail: '全てのフィルターをクリアしました。', life: 3000 });
    };

    const filteredReservations = computed(() => {
        let filteredList = reservationList.value;
        // merged_clients
        if(filteredList){
            filteredList = filteredList.map(reservation => {
                const guests = Array.isArray(reservation.clients_json) ? reservation.clients_json.map(client => ({
                    ...client,
                    role: "guest"
                })) : [];
                const payers = Array.isArray(reservation.payers_json) ? reservation.payers_json.map(payer => ({
                    ...payer,
                    role: "payer"
                })) : [];

                // Merge guests and payers while keeping unique client_id
                const uniqueClients = new Map();
                [...guests, ...payers].forEach(client => {
                    if (!uniqueClients.has(client.client_id)) {
                        uniqueClients.set(client.client_id, client);
                    }
                });               

                return {
                    ...reservation,
                    merged_clients: Array.from(uniqueClients.values())
                };
            });
        }               

        if (clientFilter.value !== null && clientFilter.value !== ''){
            filteredList = filteredList.filter(reservation => {
                const clientName = reservation.booker_name.toLowerCase();
                const clientNameKana = reservation.booker_name_kana ? reservation.booker_name_kana.toLowerCase() : '';
                const clientNameKanji = reservation.booker_name_kanji ? reservation.booker_name_kanji.toLowerCase() : '';
                const filterClients = clientFilter.value.toLowerCase();
                
                return (clientName && clientName.includes(filterClients)) ||
                    (clientNameKana && clientNameKana.includes(filterClients)) ||
                    (clientNameKanji && clientNameKanji.includes(filterClients))                     
            });
        }
        if (clientsJsonFilter.value !== null && clientsJsonFilter.value !== ''){
            filteredList = filteredList.filter(reservation => {
                const clients = reservation.clients_json;
                const filterClients = clientsJsonFilter.value.toLowerCase();
                return clients.some(client => 
                    (client.name && client.name.toLowerCase().includes(filterClients)) ||
                    (client.name_kana && client.name_kana.toLowerCase().includes(filterClients)) ||
                    (client.name_kanji && client.name_kanji.toLowerCase().includes(filterClients))
                );                
            });
        }
        if (priceFilter.value !== null) {
            filteredList = filteredList.filter(reservation => {
                const price = parseFloat(reservation.price);
                const filterPrice = parseFloat(priceFilter.value);    
                          
                if (priceFilterCondition.value === ">") {                
                    return price > filterPrice;
                } else if (priceFilterCondition.value === "<") {                    
                    return price < filterPrice;
                } else {                    
                    return price === filterPrice;
                }
            });            
        }
        if (paymentFilter.value !== null) {
            filteredList = filteredList.filter(reservation => {
                const payment = parseFloat(reservation.payment);
                const filterPayment = parseFloat(paymentFilter.value);
                if (paymentFilterCondition.value === ">") {                    
                    return payment > filterPayment;
                } else if (paymentFilterCondition.value === "<") {                    
                    return payment < filterPayment;
                } else {                    
                    return payment === filterPayment;
                }
            });            
        }
        
        return filteredList
    });

    // Data Table
    const tableHeader = ref(`予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`)
    const tableLoading = ref(true);
    const drawerVisible = ref(false);
    const selectedReservation = ref(null);
    const expandedRows = ref({});    
    const filters = ref({        
        status: { value: null, matchMode: FilterMatchMode.CONTAINS },        
    });
    const getVisibleClientNames = (clients) => {
        const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
        return parsedClients
            .slice(0, 1)
            .map(client => client.name_kanji || client.name)
            .join("\n")
    };
    const formatClientNames = (clients) => {
        const parsedClients = Array.isArray(clients) ? clients : JSON.parse(clients);
        if (parsedClients.length <= 2) return "";
        return parsedClients
            .map(client => client.name_kanji || client.name)
            .join("\n")
    };
    const openDrawer = (event) => {    
        selectedReservation.value = event.data;    
        // console.log('selectedReservation:',selectedReservation.value)        ;
        drawerVisible.value = true;
    };

    // Export
    const exportOptions = ref([
        { label: "予約の詳細をエクスポート", icon: "pi pi-file", command: () => splitButtonExportReservationDetails() },        
        { label: "食事件数をエクスポート", icon: "pi pi-file-excel", command: () => splitButtonExportMealCount() },        
    ]);
    const splitButtonExportReservations = async () => {
        try {
            await exportReservationList(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));            

            toast.add({ severity: "success", summary: "成功", detail: "予約データをエクスポートしました", life: 3000 });
        } catch (error) {
            console.error("エクスポートエラー:", error);
            toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
        }
    };
    const splitButtonExportReservationDetails = async () => {
        try {
            await exportReservationDetails(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));            

            toast.add({ severity: "success", summary: "成功", detail: "予約の詳細をエクスポートしました", life: 3000 });
        } catch (error) {
            console.error("エクスポートエラー:", error);
            toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
        }        
    };
    const splitButtonExportMealCount = async () => {
        try {
            await exportMealCount(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));            

            toast.add({ severity: "success", summary: "成功", detail: "食事件数をエクスポートしました", life: 3000 });
        } catch (error) {
            console.error("エクスポートエラー:", error);
            toast.add({ severity: "error", summary: "エラー", detail: "エクスポートに失敗しました", life: 3000 });
        }        
    };

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();
    });

    watch(() => [selectedHotelId.value], // Watch multiple values
        async () => {                                          
            await fetchHotels();            
            await fetchHotel();            
            await loadTableData();
        },
        { immediate: true }
    );  
    
    // Watcher for Booker Name
    watch(clientFilterInput, debounce((newValue) => {
        clientFilter.value = newValue;
    }, 400)); // 400ms debounce

    // Watcher for Guest/Payer Name
    watch(clientsJsonFilterInput, debounce((newValue) => {
        clientsJsonFilter.value = newValue;
    }, 400)); // 400ms debounce

    watch(selectedReservations, (newValue) => {     
        if(drawerVisible.value === false){
            drawerSelectVisible.value = newValue.length > 0;
            //console.log('watch selectedReservations:', newValue)
        }
    });

    const isRowExpanded = (rowData) => {
        return expandedRows.value[rowData.id] === true;
    };

    const toggleRowExpansion = (rowData) => {
        if (expandedRows.value[rowData.id]) {
            delete expandedRows.value[rowData.id];
        } else {
            expandedRows.value[rowData.id] = true;
        }
        // No need to manually trigger @rowExpand or @rowCollapse unless other logic depends on it.
        // The v-model:expandedRows on DataTable handles the state.
    };
</script>

<style scoped>
</style>