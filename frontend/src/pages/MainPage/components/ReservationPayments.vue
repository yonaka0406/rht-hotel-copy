<template>
    <div class="p-4">
        <ConfirmDialog></ConfirmDialog>
        <Card>
            <template #title>
                <span>
                    請求金額：
                    {{ Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(totalPrice) }}
                </span>
                <span v-if="remainingBalance > 0">
                    ｜
                    未請求分：
                    {{ Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(remainingBalance) }}
                </span>
                <span v-else-if="remainingBalance === 0">
                    ｜ ✅ 完済済み
                </span>
                <span v-else>
                    ｜ ⚠️ 過払い：
                    {{ Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(Math.abs(remainingBalance)) }}
                </span>
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
                                    optionValue="id"
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

        <h2 class="text-lg font-semibold my-4">清算履歴</h2>
        <DataTable :value="reservation_payments">
            <Column header="日付">
                <template #body="{ data }">
                    <span>{{  formatDate(new Date(data.date)) }}</span>
                </template>
            </Column>
            <Column field="room_number" header="部屋"></Column>
            <Column field="payment_type_name" header="支払方法"></Column>
            <Column header="金額">
                <template #body="{ data }">
                    <span>{{ Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(data.value) }}</span>
                </template>
            </Column>            
            <Column field="payer_name" header="支払者"></Column>
            <Column header="備考">
                <template #body="{ data }">
                    <span class="text-xs">{{ data.comment }}</span>
                </template>
            </Column>
            <Column header="削除" style="width: 100px; text-align: center;">
                <template #body="{ data }">
                    <ConfirmDialog group="headless"></ConfirmDialog>
                    <Button 
                        icon="pi pi-trash" 
                        class="p-button-danger p-button-text" 
                        @click="deletePayment(data)"
                    />
                </template>
            </Column>
        </DataTable>        
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
        reservation_payments: {
            type: [Object],
            required: true,
        }, 
    });

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useConfirm } from "primevue/useconfirm";
    const confirmPayment = useConfirm();
    const confirmDelete = useConfirm();
    import { Card, FloatLabel, Select, AutoComplete, InputText, InputNumber, Button, ConfirmDialog, DataTable, Column } from 'primevue';    

    // Stores
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const { paymentTypes, fetchPaymentTypes } = useSettingsStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { reservationIsUpdating, fetchReservationClientIds, addReservationPayment, deleteReservationPayment } = useReservationStore();
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
            pt.visible === true && (pt.hotel_id === null || pt.hotel_id === props.reservation_details[0].hotel_id)
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
        
        return props.reservation_details.reduce((sum, room) => {
            // Only include billable rooms in the sum
            if (room.billable) {
                sum += room.price * 1 || 0;
            }
            return sum;
        }, 0);
    });
    const pricePerRoom = computed(() => {
        if (!props.reservation_details) return [];

        return props.reservation_details.reduce((acc, room) => {
            if (room.billable) { // Only include billable rooms
                if (!acc[room.room_id]) {
                    acc[room.room_id] = 0;
                }
                acc[room.room_id] += room.price * 1 || 0;
            }
            return acc;
        }, {});
    });
    const totalPayment = computed(() => {
        if (!props.reservation_payments) return 0;

        return props.reservation_payments.reduce((sum, room) => sum + (room.value * 1 || 0), 0);
    });
    const paymentPerRoom = computed(() => {
        if (!props.reservation_payments) return [];

        return props.reservation_payments.reduce((acc, room) => {
            if (!acc[room.room_id]) {
            acc[room.room_id] = 0;
            }
            acc[room.room_id] += room.value * 1 || 0;
            return acc;
        }, {});
    });
    const remainingBalance = computed(() => {
        const price = Number(totalPrice.value) || 0;
        const payment = Number(totalPayment.value) || 0;
        return price - payment;
    });

    // Form
    const newPayment = ref({
        date: formatDate(new Date()),
        type: 0,
        value: 0,
        room_id: null,
        room_balance: 0,
        payerClientId: null,
        comment: null,
    });
    const resetPaymentForm = () => {
        //console.log('resetPaymentForm')
        newPayment.value.value = 0;
        newPayment.value.comment = null;
        
        const price = pricePerRoom.value[newPayment.value.room_id] || 0;
        const payment = paymentPerRoom.value[newPayment.value.room_id] || 0;
        newPayment.value.room_balance = price * 1 - payment * 1;
    };
    const addPayment = async () => {

        if(!newPayment.value.room_id){
            toast.add({ severity: 'warn', summary: '注意', detail: '部屋が選択されていません。', life: 3000 }); 
            return
        }
        if(!newPayment.value.date){
            toast.add({ severity: 'warn', summary: '注意', detail: '日付が選択されていません。', life: 3000 }); 
            return
        }
        if(!newPayment.value.type){
            toast.add({ severity: 'warn', summary: '注意', detail: '支払方法が選択されていません。', life: 3000 }); 
            return
        }
        if(!newPayment.value.value || newPayment.value.value === 0){
            toast.add({ severity: 'warn', summary: '注意', detail: '金額を入力してください。', life: 3000 }); 
            return
        }
        if(!newPayment.value.payerClientId){
            toast.add({ severity: 'warn', summary: '注意', detail: '支払者が選択されていません。', life: 3000 }); 
            return
        }
        
        const dataToAdd = {
            hotelId: props.reservation_details[0].hotel_id,
            reservationId: props.reservation_details[0].reservation_id, 
            date: newPayment.value.date, 
            roomId: newPayment.value.room_id, 
            clientId: newPayment.value.payerClientId, 
            paymentTypeId: newPayment.value.type,
            value: newPayment.value.value, 
            comment: newPayment.value.comment,
        };

        if (newPayment.value.value > newPayment.value.room_balance) {
            confirmPayment.require({
                message: "金額が部屋残高を超えています。本当に続行しますか？",
                header: "確認",
                icon: "pi pi-exclamation-triangle",
                rejectProps: {
                    label: 'キャンセル',
                    severity: 'secondary',
                    outlined: true
                },
                acceptProps: {
                    label: 'はい'
                },                
                accept: () => {
                    addReservationPayment(dataToAdd);
                    resetPaymentForm();
                    toast.add({ severity: 'success', summary: '追加', detail: '清算登録されました。', life: 3000 });
                },
                reject: () => {
                },
            });
        } else {
            await addReservationPayment(dataToAdd);
            resetPaymentForm();
            toast.add({ severity: 'success', summary: '追加', detail: '清算登録されました。', life: 3000 });
        }
    };
    const deletePayment = (payment) => {
        confirmDelete.require({
            message: `本当に削除しますか？ (金額: ${Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(payment.value)})`,
            header: "確認",
            icon: "pi pi-exclamation-triangle",
            rejectProps: {
                    label: 'キャンセル',
                    severity: 'secondary',
                    outlined: true
                },
                acceptProps: {
                    label: '削除',
                    severity: 'danger',
                }, 
            accept: () => deleteReservationPayment(payment.id),
        });
        
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
        // console.log('onClientSelect event:',event.value);
        const selectedClient = event.value;
        isClientSelected.value = true;
                
        newPayment.value.payerClientId = selectedClient.id;

        client.value = { display_name: selectedClient.name_kanji || selectedClient.name };
        
      } else {
        resetClient();
      }
      
      // console.log('onClientSelect client:',client.value);
    };
    const onClientChange = async (event) => {
        if(!event.value.id){
            // console.log('onClientChange event:',event.value);
            isClientSelected.value = false;      
            newPayment.value.payerClientId = null;
        }
    };
    const resetClient = () => {
      isClientSelected.value = false;
      newPayment.value.payerClientId = null;
    }; 

    onMounted( async () => {   
        // console.log('onMounted ReservationPayments;', props.reservation_details, props.reservation_payments);
        
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
        const uniqueRoomIds = [...new Set(props.reservation_details.map(room => room.room_id))];
        newPayment.value.room_id = uniqueRoomIds[0];
        const cashPaymentTypes = paymentTypes.value.filter(pt => 
            pt.visible === true && pt.transaction === 'cash' && (pt.hotel_id === null || pt.hotel_id === props.reservation_details[0].hotel_id)
        );
        newPayment.value.type = cashPaymentTypes[0].id;
        resetPaymentForm();

        // console.log('onMounted newPayment:', newPayment.value)
    });

    // Watcher
    watch(newPayment, (newVal, oldVal) => {
        
        const price = pricePerRoom.value[newPayment.value.room_id] || 0;
        const payment = paymentPerRoom.value[newPayment.value.room_id] || 0;
        newPayment.value.room_balance = price * 1 - payment * 1;  
        //console.log('watch newPayment', newVal);
        
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

    watch(remainingBalance, async (newVal, oldVal) =>{
        // console.log('watch remainingBalance', oldVal, newVal);

        const price = pricePerRoom.value[newPayment.value.room_id] || 0;
        const payment = paymentPerRoom.value[newPayment.value.room_id] || 0;
        newPayment.value.room_balance = price * 1 - payment * 1;     
    });
    
    
</script>

<style scoped>

</style>
