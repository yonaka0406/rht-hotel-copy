<template>
    <Drawer v-model:visible="drawerSelectVisible" :modal="false" :position="'right'" :style="{width: '37vh'}" :dismissable="false">
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
                                            </p>
                                            <div class="flex items-center gap-2">
                                                <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                                                <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i class="pi pi-at"></i> {{ slotProps.option.email }}</p>
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
                    <Button icon="pi pi-trash" severity="danger" @click="$emit('deleteReservation', slotProps.data)" />
                </template>
            </Column>
        </DataTable>            
    </Drawer>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useToast } from "primevue/usetoast";
import { Drawer, Card, AutoComplete, DatePicker, FloatLabel, InputText, Button, DataTable, Column, Badge } from 'primevue';
import { useClientStore } from '@/composables/useClientStore';
import { useReservationStore } from '@/composables/useReservationStore';

const toast = useToast();
const { clients } = useClientStore();
const { addBulkReservationPayment } = useReservationStore();

const props = defineProps({
    visible: {
        type: Boolean,
        default: false
    },
    selectedReservations: {
        type: Array,
        default: () => []
    },
    defaultDate: {
        type: Date,
        default: () => new Date()
    }
});

const emit = defineEmits(['update:visible', 'submitted', 'deleteReservation']);

const drawerSelectVisible = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

// Helpers
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
const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};
const normalizeKana = (str) => {
    if (!str) return '';
    let normalizedStr = str.normalize('NFKC');
    // Convert Hiragana to Katakana
    normalizedStr = normalizedStr.replace(/[\u3041-\u3096]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) + 0x60)  
    );
    // Convert half-width Katakana to full-width Katakana
    normalizedStr = normalizedStr.replace(/[\uFF66-\uFF9F]/g, (char) => 
    String.fromCharCode(char.charCodeAt(0) - 0xFEC0) 
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

// Computed
const totalPeople = computed(() => {
    if(!props.selectedReservations){ return 0;}
    return props.selectedReservations.reduce((sum, reservation) => sum + (reservation.number_of_people || 0), 0);
});
const periodPrice = computed(() => {
    if(!props.selectedReservations){ return 0;}        
    return props.selectedReservations.reduce((sum, reservation) => {
        const price = Number(reservation.period_payable);
        if (!isNaN(price)) {
            return sum + price;
        } else {
            console.warn(`Invalid price encountered: ${reservation.period_payable}`);
            return sum;
        }
    }, 0);
});

// Form
const billingForm = ref({
    date: props.defaultDate,
    details: null,
    reservations: [],
    client: [],
});    
const selectedClient = ref(null);
const client = ref({});
const filteredClients = ref([]);

watch(() => props.selectedReservations, (newVal) => {
    billingForm.value.reservations = newVal;
}, { immediate: true });

watch(() => props.defaultDate, (newVal) => {
    if(newVal) billingForm.value.date = newVal;
}, { immediate: true });


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

        return matchesName || matchesPhoneFax || matchesEmail;
    });
};

const onClientSelect = (event) => {
    selectedClient.value = event.value;
    billingForm.value.client = selectedClient.value;        
    client.value = { display_name: selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name };
};

const submitBilling = async () => {
    // console.log('submitBilling:', billingForm.value.client.id);
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

        // console.log("Data prepared for API:", data);
        await addBulkReservationPayment(data);
        
        toast.add({ severity: 'success', summary: '請求書作成', detail: '請求書が各予約に追加されました。', life: 3000 });
        
        emit('submitted');
        drawerSelectVisible.value = false;
    } else {
        toast.add({ severity: 'warn', summary: '請求先未選択', detail: '請求先を選択してください。', life: 3000 });
    }
}
</script>