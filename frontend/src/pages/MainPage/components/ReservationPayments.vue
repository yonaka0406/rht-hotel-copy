<template>
    <div class="p-4">
        <Card>
            <template #title>
                請求金額：{{ Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(totalPrice) }}　未請求分：
            </template>
            <template #content>
                <form @submit.prevent="addPayment">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <!-- Room -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>部屋</label>
                                <Select v-model="newPayment.room_id" 
                                    :options="reservationRooms"
                                    optionLabel="room_number"
                                    optionValue="room_id"
                                    fluid
                                    required 
                                />
                            </FloatLabel>   
                        </div>                        
                        <!-- Transaction type -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>支払い方法</label>
                                <Select v-model="newPayment.type"   
                                    :options="filteredPaymentTypes"                                     
                                    optionLabel="name"
                                    optionValue="transaction"
                                    fluid
                                    required
                                />
                            </FloatLabel>                            
                        </div>
                        <!-- Billable Amount -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>部屋残高</label>
                                <InputNumber v-model="newPayment.room_balance"
                                    mode="currency"
                                    currency="JPY"                                    
                                    fluid
                                    disabled
                                />
                            </FloatLabel>
                        </div>                         
                        <!-- Date -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>日付</label>
                                <InputText v-model="newPayment.date" 
                                    type="date" 
                                    fluid
                                    required
                                />
                            </FloatLabel>
                        </div>                        
                        <!-- Value -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>金額</label>
                                <InputNumber v-model="newPayment.value" 
                                    mode="currency" 
                                    currency="JPY" locale="jp-JA" 
                                    fluid
                                    required
                                />
                            </FloatLabel>
                        </div>
                        <!-- Client -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>支払者</label>
                                <Select v-if="!isAutocomplete" v-model="newPayment.payerClientId" 
                                    :options="reservationClients" 
                                    optionLabel="display_name"
                                    optionValue="id"
                                    placeholder="支払者"
                                    fluid                                    
                                >
                                    <template #footer>
                                        <Button @click="toggleMode" class="text-sm flex items-center" fluid>
                                            🔍 切り替え (検索モード)
                                        </button>
                                    </template>
                                </Select>
                                <AutoComplete v-else v-model="client"
                                    :suggestions="filteredClients"
                                    optionLabel="display_name"
                                    field="id"
                                    @complete="filterClients"
                                    @option-select="onClientSelect"
                                    @change="onClientChange"
                                    @clear="resetClient"
                                    fluid
                                >
                                    <template #option="slotProps">
                                        <div>
                                            {{ slotProps.option.name_kanji || slotProps.option.name || '' }}
                                            <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                                        </div>
                                    </template>
                                    <template #footer>
                                        <Button @click="toggleMode" class="text-sm flex items-center" fluid>
                                            ⬇️ 切り替え (リストモード)
                                        </Button>
                                    </template>
                                </AutoComplete>                                
                            </FloatLabel>
                        </div>
                        <!-- Comment -->
                        <div class="mb-4 md:col-span-2">
                            <FloatLabel>
                                <label>備考</label>
                                <InputText v-model="newPayment.comment"
                                    fluid
                                />
                            </FloatLabel>
                        </div>                         
                        <div>
                            <Button label="追加" class="p-button-primary" type="submit" />
                        </div>
                    </div>
                </form>
            </template>
        </Card>

        <h2 class="text-lg font-semibold mb-4">Payments History</h2>
        <DataTable :value="payments" :sort-field="'date'" :sort-order="-1">
            <Column field="date" header="Date"></Column>
            <Column field="type" header="Type"></Column>
            <Column field="value" header="Value"></Column>
            <Column field="room.roomNumber" header="Room"></Column>
            <Column field="payerClientId" header="Payer Client ID"></Column>
            <Column field="billingNo" header="Billing No"></Column>
        </DataTable>

        <div class="mt-4">
            <p>Total Paid/Billed: {{ totalPaidBilled }}</p>
            <p>Billable Amount: {{ billableAmount }}</p>
            <p>Difference: {{ billableAmount - totalPaidBilled }}</p>
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';

    const props = defineProps({        
        reservation_details: {
            type: [Object],
            required: true,
        }, 
    });

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useConfirm } from "primevue/useconfirm";
    const confirm = useConfirm();
    import { Card, FloatLabel, Select, AutoComplete, InputText, InputNumber, Button, DataTable, Column } from 'primevue';    

    // Stores
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const { paymentTypes, fetchPaymentTypes } = useSettingsStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { reservationIsUpdating, fetchReservationClientIds } = useReservationStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, selectedHotelRooms, setHotelId, fetchHotel } = useHotelStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();

    // Helper
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
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

    // Computed
    const filteredPaymentTypes = computed(() => {
        if(!paymentTypes.value) {
            return
        }            
        
        return paymentTypes.value.filter(pt => 
            pt.hotel_id === null || pt.hotel_id === props.reservation_details[0].hotel_id
        );
    });
    const reservationRooms = computed(() => {
        if (!props.reservation_details || !selectedHotelRooms.value) {
            return [];
        }
        const uniqueRoomIds = [...new Set(props.reservation_details.map(room => room.room_id))];        
        return selectedHotelRooms.value.filter(room => uniqueRoomIds.includes(room.room_id));
    });
    const totalPrice = computed(() => {
        if (!props.reservation_details) return 0;

        return props.reservation_details.reduce((sum, room) => sum + (room.price * 1 || 0), 0);
    });
    const pricePerRoom = computed(() => {
        if (!props.reservation_details) return [];

        return props.reservation_details.reduce((acc, room) => {
            if (!acc[room.room_id]) {
            acc[room.room_id] = 0;
            }
            acc[room.room_id] += room.price || 0;
            return acc;
        }, {});
    });

    // Form
    const newPayment = ref({
        date: formatDate(new Date()),
        type: 'cash',
        value: 0,
        room_id: null,
        room_balance: 0,
        payerClientId: null,
        comment: null,
    });
    const resetPaymentForm = () => {
        newPayment.value.value = 0;
        newPayment.value.comment = null;         
    };
    const addPayment = () => {
        
        

        resetPaymentForm();
    };
    
    // Client select
    const isAutocomplete = ref(false);
    const toggleMode = () => {
      isAutocomplete.value = !isAutocomplete.value;
      newPayment.value.payerClientId = null;
    };
    const reservationClients = ref(null);
    const updateReservationClients = async () => {
         const data = await fetchReservationClientIds(props.reservation_details[0].hotel_id, props.reservation_details[0].reservation_id);
         reservationClients.value = data.clients;
    };
    const isClientSelected = ref(false);
    const client = ref({});
    const filteredClients = ref([]);
    const filterClients = (event) => {
        console.log(event)
      const query = event.query.toLowerCase();
      filteredClients.value = clients.value.filter((client) =>
        (client.name && client.name.toLowerCase().includes(query)) ||
        (client.name_kana && normalizeKana(client.name_kana).toLowerCase().includes(normalizeKana(query))) ||
        (client.name_kanji && client.name_kanji.toLowerCase().includes(query))
      );
    };      
    const onClientSelect = (event) => {
      if (event.value) {
        console.log('onClientSelect event:',event.value);
        const selectedClient = event.value;
        isClientSelected.value = true;
                
        newPayment.value.payerClientId = selectedClient.id;

        client.value = { display_name: selectedClient.name_kanji || selectedClient.name };
        
      } else {
        resetClient();
      }
      
      console.log('onClientSelect client:',client.value);
    };
    const onClientChange = async (event) => {
        if(!event.value.id){
            console.log('onClientChange event:',event.value);
            isClientSelected.value = false;      
            newPayment.value.payerClientId = null;
        }
    };
    const resetClient = () => {
      isClientSelected.value = false;
      newPayment.value.payerClientId = null;
    };






    // Mock Data (Replace with your actual data)
    const reservation = ref({
        rooms: [{ roomNumber: '101' }, { roomNumber: '102' }],
        clients: [{ id: 'C1' }, { id: 'C2' }],
        billableAmount: 500,
    });    
   

    const billableAmount = computed(() => reservation.value.billableAmount);
    
    const payments = ref([
    { date: '2023-10-26', type: 'Card', value: 200, room: { roomNumber: '101' }, payerClientId: 'C1', billingNo: 'B123' },
    { date: '2023-10-25', type: 'Cash', value: 150, room: { roomNumber: '102' }, payerClientId: 'C2', billingNo: 'B124' },
    ]);

    

    

    const totalPaidBilled = computed(() => {
    return payments.value.reduce((acc, payment) => acc + payment.value, 0);
    });

    onMounted( async () => {   
        console.log('onMounted ReservationPayments;', props.reservation_details);
        
        await setHotelId(props.reservation_details[0].hotel_id);        
        await fetchHotel();
        await fetchPaymentTypes();
        await updateReservationClients();

        if(clients.value.length === 0) {
            setClientsIsLoading(true);
            const clientsTotalPages = await fetchClients(1);
            // Fetch clients for all pages
            for (let page = 2; page <= clientsTotalPages; page++) {
                await fetchClients(page);
            }
            setClientsIsLoading(false);            
        }
        
        // Initialize newPayment
        resetPaymentForm();
        const uniqueRoomIds = [...new Set(props.reservation_details.map(room => room.room_id))];
        newPayment.value.room_id = uniqueRoomIds[0];

        // console.log('onMounted newPayment:', newPayment.value)
    });

    // Watcher
    watch(newPayment, (newVal, oldVal) => {
        console.log('watch newPayment', newPayment.value);
        newPayment.value.room_balance = pricePerRoom.value[newPayment.value.room_id] * 1;        
        
    }, { deep: true });

    watch(reservationIsUpdating, async (newVal, oldVal) => {
        if (newVal === true) {
            // console.log("Updating...");            
        }
        if (newVal === false) {
            // console.log("Not Updating...");
            await updateReservationClients();
        }
    });
    
    
</script>

<style scoped>

</style>
