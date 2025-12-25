<template>
    <Panel class="m-2">
        <div v-if="!isBillingPage">
            <div>
                <div class="flex justify-end mr-4"><Button severity="help" @click="setIsBillingPage(true)">請求書作成画面へ</Button></div>
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
                            <span class="font-bold text-lg mb-4">{{ tableHeader }}</span>
                        </div>
                        <div class="mb-4 flex justify-end items-center">                        
                            <span class="font-bold mr-4">滞在期間選択：</span>
                            <label class="mr-2">開始日:</label>
                            <DatePicker v-model="startDateFilter" dateFormat="yy-mm-dd" placeholder="開始日を選択" :selectOtherMonths="true" />
                            <label class="ml-4 mr-2">終了日:</label>
                            <DatePicker v-model="endDateFilter" dateFormat="yy-mm-dd" placeholder="終了日を選択" :selectOtherMonths="true" />
                            <Button label="適用" class="ml-4" @click="applyDateFilters" :disabled="!startDateFilter || !endDateFilter" />
                        </div>
                    </template>
                    <template #empty> 指定されている期間中では予約ありません。 </template>                
                    <Column expander header="詳細" style="width: 1%;"/>                
                    <Column selectionMode="multiple" headerStyle="width: 1%"></Column>
                    
                    <Column field="status" filterField="status" header="ステータス" style="width:1%" :showFilterMenu="false">
                        <template #filter="{ filterModel: _filterModel, filterCallback }">                        
                            <Select 
                                v-model="_filterModel.value" 
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
                    <Column field="booker_name" filterField="booker_name" header="予約者" style="width:1%" :showFilterMenu="false">
                        <template #filter="{}">
                            <InputText v-model="clientFilter" type="text" placeholder="氏名・名称検索" />
                        </template>
                    </Column>
                    <Column field="payment_timing" filterField="payment_timing" header="支払時期" sortable style="width:1%" :showFilterMenu="false">
                        <template #filter="{ filterModel: _filterModel, filterCallback }">                        
                            <Select 
                                v-model="_filterModel.value" 
                                :options="reservationPaymentTimingOptions" 
                                optionLabel="label"
                                optionValue="value" 
                                @change="filterCallback" 
                                placeholder="選択"
                                showClear 
                                fluid
                            />                        
                        </template>                    
                        <template #body="slotProps">
                            <span>{{ translateReservationPaymentTiming(slotProps.data.payment_timing) }}</span>
                        </template>
                    </Column>                
                    <Column field="period_payable" header="期間請求額" sortable style="width:1%">
                        <template #body="slotProps">
                            <div class="flex justify-end mr-2">
                                <span class="items-end">{{ formatCurrency(slotProps.data.period_payable) }}</span>
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

                    <template #expansion="slotProps">
                        <div class="mx-20">
                            <div v-if="Array.isArray(slotProps.data.merged_clients)">
                                <DataTable :value="slotProps.data.merged_clients" size="small">
                                    <Column header="氏名・名称" sortable>
                                        <template #body="clientSlotProps">
                                            {{ clientSlotProps.data.name_kanji || clientSlotProps.data.name_kana || clientSlotProps.data.name || '' }}
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
            <div class="flex justify-end mt-4">
                <Button
                    severity="info"                
                    @click="drawerSelectVisible = true"
                >
                <OverlayBadge 
                    :value="selectedReservations.length" 
                    size="large" 
                    :position="'top-right'" 
                    severity="danger"
                    class="mt-1"
                >
                    <i class="pi pi-shopping-cart" style="font-size: 2rem" />
                </OverlayBadge>
                </Button>
            </div>
        </div>
        <div v-else>            
            <div class="flex justify-between items-center m-4">
                <h2 class="text-lg font-bold">請求書作成</h2>
                <Button severity="secondary" @click="setIsBillingPage(false)">戻る</Button>
            </div>           

            <component :is="activeComponent" />
        </div>

        <Drawer v-model:visible="drawerVisible" :modal="true" :position="'bottom'" :style="{height: '75vh'}" :closable="true">
            <ReservationEdit
                v-if="selectedReservation"
                :reservation_id="selectedReservation.id"                       
            />
        </Drawer>
        <Drawer v-if="selectedReservations" v-model:visible="drawerSelectVisible" :modal="false" :position="'right'" :style="{width: '37vh'}" :dismissable="false">
            <template #header><span class="text-lg font-bold">選択された予約の詳細</span></template>            
            <div class="grid grid-cols-3 gap-4">
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
                    <form @submit.prevent="submitBilling">
                        <div class="grid grid-cols-1">
                            <p class="mb-1">選択中予約をまとめて請求書作成</p>
                            <div class="grid grid-cols-2 flex justify-between items-center mb-2 mt-5">
                                <FloatLabel>
                                    <AutoComplete
                                        v-model="client"
                                        :suggestions="filteredClients"
                                        optionLabel="display_name"
                                        @complete="filterClients"
                                        field="id"
                                        @option-select="onClientSelect"                                        
                                        fluid
                                        required
                                    >
                                        <template #option="slotProps">                                            
                                            <div>
                                                <p>
                                                    <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                                                    <i v-else class="pi pi-user"></i>
                                                    {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
                                                    <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                                                    <span v-if="slotProps.option.customer_id" class="text-xs text-sky-800 ml-2">
                                                        [{{ slotProps.option.customer_id }}]
                                                    </span>
                                                </p>
                                                <div class="flex items-center gap-2">
                                                    <p v-if="slotProps.option.customer_id" class="text-xs text-sky-800"><i class="pi pi-id-card"></i> {{ slotProps.option.customer_id }}</p>
                                                    <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                                                    <p v-if="slotProps.option.email" class="text-xs text-sky-800"><i class="pi pi-at"></i> {{ slotProps.option.email }}</p>
                                                    <p v-if="slotProps.option.fax" class="text-xs text-sky-800"><i class="pi pi-send"></i> {{ slotProps.option.fax }}</p>
                                                </div>
                                            </div>                                            
                                        </template>
                                    </AutoComplete>
                                    <label>請求先</label>
                                </FloatLabel>                                
                                <FloatLabel>
                                    <DatePicker 
                                        v-model="billingForm.date"
                                        dateFormat="yy-mm-dd"                                        
                                        :selectOtherMonths="true"   
                                        class="ml-2"
                                    />
                                    <label for="billingForm.date">請求日</label>
                                </FloatLabel>
                            </div>
                            <div class="mt-4">
                                <FloatLabel>
                                    <InputText 
                                        v-model="billingForm.details" 
                                        type="text"                                    
                                        class="mb-2"
                                        fluid
                                    />
                                    <label for="billingForm.details">備考</label>
                                </FloatLabel>
                            </div>
                            <Button 
                                label="まとめ請求"
                                icon="pi pi-paperclip"
                                type="submit" 
                            />
                        </div>
                    </form>
                </template>
            </Card>            
            <DataTable
                :value="selectedReservations"
                class="mt-4"
            >
                <Column field="booker_name" header="予約者"/>
                
                <Column header="対象期間">
                    <template #body="slotProps">
                        <p>
                            {{ formatDate(new Date(Math.max(new Date(slotProps.data.period_start), new Date(slotProps.data.check_in)))) }}
                            <Badge severity="secondary">から</Badge>
                        </p>
                        <p>
                            {{ formatDate(new Date(Math.min(new Date(slotProps.data.period_end), new Date(slotProps.data.check_out)))) }}
                            <Badge severity="secondary">まで</Badge>
                        </p>
                    </template>
                </Column>
                <Column header="期間予約額">
                    <template #body="slotProps">
                        <p>{{ formatCurrency(slotProps.data.period_payable) }}</p>                        
                    </template>
                </Column>
                <Column header="操作">
                    <template #body="slotProps">
                        <Button icon="pi pi-trash" severity="danger" @click="deleteReservationFromDrawer(slotProps.data)" />
                    </template>
                </Column>
            </DataTable>            
        </Drawer>        
    </Panel> 
</template>
<script setup>
    // Vue
    import { ref, shallowRef, watch, computed, onMounted } from 'vue';

    import ReservationEdit from './Reservation/ReservationEdit.vue';

    // Primevue
    import { useToast } from "primevue/usetoast";
    const toast = useToast();
    import { Panel, Drawer, Card, DatePicker, AutoComplete, Select, InputText, Button, DataTable, Column, Badge, OverlayBadge, FloatLabel } from 'primevue';
    import { FilterMatchMode } from '@primevue/core/api';

    // Stores
    import { useBillingStore } from '@/composables/useBillingStore';
    const { billableList, fetchBillableListView } = useBillingStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { addBulkReservationPayment } = useReservationStore();

    import { translateReservationPaymentTiming, reservationPaymentTimingOptions } from '@/utils/reservationUtils';

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
        return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
    };
    const formatCurrency = (value) => {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };

    const isBillingPage = ref(false);
    const setIsBillingPage = async(value) => {
        if(!value){
            activeComponent.value = null;
        }
        
        activeComponent.value = (await import(`@/pages/MainPage/components/BillingPage.vue`)).default;
        isBillingPage.value = value;
    };
    const activeComponent = shallowRef(null);

    // Load
    const loadTableData = async () => {
        tableLoading.value = true;
        await fetchBillableListView(selectedHotelId.value, formatDate(startDateFilter.value), formatDate(endDateFilter.value));
        tableHeader.value = `請求可能予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`;
        tableLoading.value = false;
    }

    // Select
    const selectedReservations = ref([]);
    const drawerSelectVisible = ref(false);    
    const totalPeople = computed(() => {
        if(!selectedReservations.value){ return 0;}
        return selectedReservations.value.reduce((sum, reservation) => sum + (reservation.number_of_people || 0), 0);
    });
    const periodPrice = computed(() => {
        if(!selectedReservations.value){ return 0;}        
        return selectedReservations.value.reduce((sum, reservation) => {
            const price = Number(reservation.period_payable);
            if (!isNaN(price)) {
                return sum + price;
            } else {
                console.warn(`Invalid price encountered: ${reservation.period_payable}`);
                return sum;
            }
        }, 0);
    });
    const billingForm = ref({
        date: null,
        details: null,
        reservations: [],
        client: [],
    });    
    const selectedClient = ref(null);
    const client = ref({});
    const filteredClients = ref([]);
    const filterClients = (event) => {
        const query = event.query.toLowerCase();
        const normalizedQuery = normalizePhone(query);
        const isNumericQuery = /^\d+$/.test(normalizedQuery);

        if (!query || !clients.value || !Array.isArray(clients.value)) {
            filteredClients.value = [];
            return;
        }

        filteredClients.value = clients.value.filter((client) => {
            // Name filtering (case-insensitive)
            const matchesName = 
                (client.name && client.name.toLowerCase().includes(query)) || 
                (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) || 
                (client.name_kanji && client.name_kanji.toLowerCase().includes(query));
            // Phone/Fax filtering (only for numeric queries)
            const matchesPhoneFax = isNumericQuery &&
                ((client.fax && normalizePhone(client.fax).includes(normalizedQuery)) || 
                (client.phone && normalizePhone(client.phone).includes(normalizedQuery)));
            // Email filtering (case-insensitive)
            const matchesEmail = client.email && client.email.toLowerCase().includes(query);
            // Customer ID filtering (case-insensitive)
            const matchesCustomerId = client.customer_id && client.customer_id.toLowerCase().includes(query);

            // console.log('Client:', client, 'Query:', query, 'matchesName:', matchesName, 'matchesPhoneFax:', matchesPhoneFax, 'isNumericQuery', isNumericQuery, 'matchesEmail:', matchesEmail);

            return matchesName || matchesPhoneFax || matchesEmail || matchesCustomerId;
        });
    };
    const onClientSelect = (event) => {
        selectedClient.value = event.value;
        
        billingForm.value.client = selectedClient.value;        

        client.value = { display_name: selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name };
        
    };
    const normalizeKana = (str) => {
        if (!str) return '';
        let normalizedStr = str.normalize('NFKC');
        
        // Convert Hiragana to Katakana
        normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) + 0x60)  // Convert Hiragana to Katakana
        );
        // Convert half-width Katakana to full-width Katakana
        normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) => 
        String.fromCharCode(char.charCodeAt(0) - 0xFEC0)  // Convert half-width to full-width Katakana
        );
        
        return normalizedStr;
    };
    const normalizePhone = (phone) => {
        if (!phone) return '';

        // Remove all non-numeric characters
        let normalized = phone.replace(/\D/g, '');

        // Remove leading zeros
        normalized = normalized.replace(/^0+/, '');

        return normalized;
    };
    const deleteReservationFromDrawer = (reservationToDelete) => {
        selectedReservations.value = selectedReservations.value.filter(
            (reservation) => reservation.id !== reservationToDelete.id
        );
    };
    const submitBilling = async () => {
        console.log('submitBilling:', billingForm.value.client.id);
        if (billingForm.value.client && billingForm.value.client.id) {
            if (!billingForm.value.reservations || billingForm.value.reservations.length === 0) {
                toast.add({ severity: 'warn', summary: '予約未選択', detail: '請求対象の予約がありません。', life: 3000 });
                return; 
            }
            const clientId = billingForm.value.client.id;
            const billingDate = formatDate(new Date(billingForm.value.date));
            const billingDetails = billingForm.value.details;

            const data = billingForm.value.reservations.map(reservation => {
                if (!reservation || reservation.period_payable <= 0) {
                    console.warn("Skipping invalid reservation object:", reservation);                    
                    return null;
                }

                return {
                    hotel_id: reservation.hotel_id,
                    reservation_id: reservation.id,
                    period_payable: reservation.period_payable,
                    client_id: clientId,
                    date: billingDate,
                    details: billingDetails,
                    period_start: reservation.period_start,
                    period_end: formatDate(new Date(reservation.period_end))
                };
            }).filter(payload => payload !== null);

            if (data.length === 0) {
                toast.add({ severity: 'warn', summary: '請求データなし', detail: '有効な請求対象データが見つかりませんでした。', life: 3000 });
                return;
            }

            console.log("Data prepared for API:", data);
            await addBulkReservationPayment(data);
            
            toast.add({ severity: 'success', summary: '請求書作成', detail: '請求書が各予約に追加されました。', life: 3000 });
            selectedReservations.value = [];
            await applyDateFilters()
            drawerSelectVisible.value = false;
        } else {
            toast.add({ severity: 'warn', summary: '請求先未選択', detail: '請求先を選択してください。', life: 3000 });
        }
    }

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
    const applyDateFilters = async () => {
        if (startDateFilter.value && endDateFilter.value) {            
            await loadTableData();
        }
    };
    const filteredReservations = computed(() => {
        let filteredList = billableList.value;
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
        
        return filteredList
    });

    // Data Table
    const tableHeader = ref(`請求可能予約一覧 ${formatDateWithDay(startDateFilter.value)} ～ ${formatDateWithDay(endDateFilter.value)}`)
    const tableLoading = ref(true);
    const drawerVisible = ref(false);
    const selectedReservation = ref(null);
    const expandedRows = ref({});    
    const filters = ref({        
        status: { value: null, matchMode: FilterMatchMode.CONTAINS },        
        payment_timing: { value: null, matchMode: FilterMatchMode.CONTAINS },
    });    
    const openDrawer = (event) => {    
        selectedReservation.value = event.data;    
        // console.log('selectedReservation:',selectedReservation.value)        ;
        drawerVisible.value = true;
    };

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();

                    if(clients.value.length === 0) {
                        setClientsIsLoading(true);
                        const clientsTotalPages = await fetchClients(1);
                        // Fetch clients for all pages
                        for (let page = 2; page <= clientsTotalPages; page++) {
                            await fetchClients(page);
                        }
                        setClientsIsLoading(false);            
                    }    });

    watch(() => [selectedHotelId.value], // Watch multiple values
        async () => {                                          
            await fetchHotels();            
            await fetchHotel();            
            await loadTableData();
        },
        { immediate: true }
    ); 

    watch(selectedReservations, (newValue) => {     
        if(drawerVisible.value === false){
            drawerSelectVisible.value = newValue.length > 0;
            billingForm.value.date = endDateFilter.value;
            billingForm.value.reservations = selectedReservations.value;
            console.log('selectedReservations:', selectedReservations.value);
            console.log('billingForm:', billingForm.value);
        }
    });
</script>