<template>
    <div class="p-4">
        <ConfirmDialog group="delete"></ConfirmDialog>
        <ConfirmDialog group="payment"></ConfirmDialog>
        <ConfirmDialog group="move"></ConfirmDialog>
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
                    {{ Intl.NumberFormat("ja-JP", {
                        style: "currency", currency: "JPY"
                    }).format(Math.abs(remainingBalance)) }}
                </span>
            </template>
            <template #content>
                <form @submit.prevent="addPayment">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <!-- Room -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>部屋</label>
                                <Select v-model="newPayment.room_id" :options="reservationRooms"
                                    optionLabel="room_number" optionValue="room_id" fluid required />
                            </FloatLabel>
                        </div>
                        <!-- Transaction type -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>支払い方法</label>
                                <Select v-model="newPayment.type" :options="filteredPaymentTypes" optionLabel="name"
                                    optionValue="id" fluid required />
                            </FloatLabel>
                        </div>
                        <!-- Billable Amount -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>部屋残高</label>
                                <InputNumber v-model="newPayment.room_balance" mode="currency" currency="JPY" fluid
                                    disabled />
                            </FloatLabel>
                        </div>
                        <!-- Date -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>日付</label>
                                <InputText v-model="newPayment.date" type="date" fluid required />
                            </FloatLabel>
                        </div>
                        <!-- Value -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>金額</label>
                                <InputNumber v-model="newPayment.value" mode="currency" currency="JPY" locale="jp-JA"
                                    fluid required />
                            </FloatLabel>
                        </div>
                        <!-- Client -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>支払者</label>
                                <Select v-if="!isAutocomplete" v-model="newPayment.payerClientId"
                                    :options="reservationClients" optionLabel="display_name" optionValue="id"
                                    placeholder="支払者" fluid>
                                    <template #footer>
                                        <Button @click="toggleMode" class="text-sm flex items-center" fluid>
                                            🔍 切り替え (検索モード)
                                        </button>
                                    </template>
                                </Select>
                                <AutoComplete v-else v-model="client" :suggestions="filteredClients"
                                    optionLabel="display_name" field="id" @complete="filterClients"
                                    @option-select="onClientSelect" @change="onClientChange" @clear="resetClient" fluid>
                                    <template #option="slotProps">
                                        <div>
                                            <p>
                                                <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                                                <i v-else class="pi pi-user"></i>
                                                {{ slotProps.option.name_kanji || slotProps.option.name_kana ||
                                                slotProps.option.name || '' }}
                                                <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana
                                                    }})</span>
                                                <span v-if="slotProps.option.customer_id" class="text-xs text-sky-800 ml-2">
                                                    [{{ slotProps.option.customer_id }}]
                                                </span>
                                            </p>
                                            <div class="flex items-center gap-2">
                                                <p v-if="slotProps.option.customer_id" class="text-xs text-sky-800">
                                                    <i class="pi pi-id-card"></i> {{ slotProps.option.customer_id }}
                                                </p>
                                                <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i
                                                        class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                                                <p v-if="slotProps.option.email" class="text-xs text-sky-800"><i
                                                        class="pi pi-at"></i> {{ slotProps.option.email }}</p>
                                                <p v-if="slotProps.option.fax" class="text-xs text-sky-800"><i
                                                        class="pi pi-send"></i> {{ slotProps.option.fax }}</p>
                                            </div>
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
                                <InputText v-model="newPayment.comment" fluid />
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
                    <span>{{ formatDate(new Date(data.date)) }}</span>
                </template>
            </Column>
            <Column field="room_number" header="部屋"></Column>
            <Column field="payment_type_name" header="支払方法"></Column>
            <Column header="金額">
                <template #body="{ data }">
                    <span>{{ Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(data.value)
                        }}</span>
                </template>
            </Column>
            <Column field="payer_name" header="支払者"></Column>
            <Column header="備考">
                <template #body="{ data }">
                    <span class="text-xs">{{ data.comment }}</span>
                </template>
            </Column>
            <Column header="操作" style="width: 120px; text-align: center;">
                <template #body="{ data }">
                    <div class="flex justify-center gap-2">
                        <Button icon="pi pi-external-link" class="p-button-text p-button-secondary" v-tooltip.top="'移動'"
                            @click="openMoveDialog(data)" />
                        <Button icon="pi pi-trash" class="p-button-danger p-button-text" @click="deletePayment(data)" />
                    </div>
                </template>
            </Column>
        </DataTable>

        <Dialog v-model:visible="showMoveDialog" header="清算の移動" modal :style="{ width: '70vw' }">
            <div v-if="isLoadingCandidates" class="flex justify-center p-4">
                <i class="pi pi-spin pi-spinner" style="font-size: 2rem"></i>
            </div>
            <div v-else>
                <p class="mb-4">移動先の予約を選択してください（同じクライアントの前後1ヶ月以内の予約のみ表示されます）</p>
                <DataTable :value="candidateReservations" scrollable scrollHeight="400px">
                    <Column field="id" header="予約ID">
                        <template #body="{ data }">
                            <router-link :to="{ name: 'ReservationEdit', params: { reservation_id: data.id } }"
                                target="_blank" rel="noopener noreferrer"
                                class="text-sky-600 hover:underline text-xs flex items-center gap-1">
                                <i class="pi pi-external-link"></i>
                                {{ data.id.substring(0, 8) }}...
                            </router-link>
                        </template>
                    </Column>
                    <Column header="期間">
                        <template #body="{ data }">
                            <span>{{ formatDate(new Date(data.details_min_date)) }} 〜 {{ formatDate(new
                                Date(data.details_max_date)) }}</span>
                        </template>
                    </Column>
                    <Column field="room_numbers" header="部屋"></Column>
                    <Column field="status" header="ステータス">
                        <template #body="{ data }">
                            <Badge :value="translateReservationStatus(data.status)"
                                :severity="getStatusSeverity(data.status)" />
                        </template>
                    </Column>
                    <Column header="操作">
                        <template #body="{ data }">
                            <Button label="移動" icon="pi pi-arrow-right" class="p-button-sm"
                                @click="confirmMove(data.id)" />
                        </template>
                    </Column>
                    <template #empty>
                        <div class="p-4 text-center text-gray-500">
                            移動可能な予約が見つかりません。
                        </div>
                    </template>
                </DataTable>
            </div>
        </Dialog>
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
const confirm = useConfirm();
import { Card, FloatLabel, Select, AutoComplete, InputText, InputNumber, Button, ConfirmDialog, DataTable, Column, Dialog, Badge } from 'primevue';

// Stores
import { useSettingsStore } from '@/composables/useSettingsStore';
const { paymentTypes, fetchPaymentTypes } = useSettingsStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { reservationIsUpdating, fetchReservationClientIds, addReservationPayment, deleteReservationPayment, moveReservationPayment, getReservationsByClient } = useReservationStore();
import { translateReservationStatus } from '@/utils/reservationUtils';
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelRooms, setHotelId, fetchHotel } = useHotelStore();
import { useClientStore } from '@/composables/useClientStore';
const { setClientsIsLoading } = useClientStore();

// Helper
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Computed
const filteredPaymentTypes = computed(() => {
    if (!paymentTypes.value) {
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

    return props.reservation_details.reduce((sum, day) => {
        if (!day.billable) {
            return sum;
        }

        // Simply use the price field from reservation_details
        const price = parseFloat(day.price) || 0;
        return sum + price;
    }, 0);
});
const pricePerRoom = computed(() => {
    if (!props.reservation_details) return [];

    return props.reservation_details.reduce((acc, room) => {
        if (!room.billable) return acc;

        if (!acc[room.room_id]) {
            acc[room.room_id] = 0;
        }

        // Simply use the price field from reservation_details
        const price = parseFloat(room.price) || 0;
        acc[room.room_id] += price;
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

    if (!newPayment.value.room_id) {
        toast.add({ severity: 'warn', summary: '注意', detail: '部屋が選択されていません。', life: 3000 });
        return
    }
    if (!newPayment.value.date) {
        toast.add({ severity: 'warn', summary: '注意', detail: '日付が選択されていません。', life: 3000 });
        return
    }
    if (!newPayment.value.type) {
        toast.add({ severity: 'warn', summary: '注意', detail: '支払方法が選択されていません。', life: 3000 });
        return
    }
    if (!newPayment.value.value || newPayment.value.value === 0) {
        toast.add({ severity: 'warn', summary: '注意', detail: '金額を入力してください。', life: 3000 });
        return
    }
    if (!newPayment.value.payerClientId) {
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
        confirm.require({
            group: 'payment',
            header: "確認",
            message: "金額が部屋残高を超えています。本当に続行しますか？",            
            icon: "pi pi-exclamation-triangle",
            rejectProps: {
                label: 'キャンセル',
                severity: 'secondary',
                outlined: true
            },
            acceptProps: {
                label: 'はい'
            },
            accept: async () => {
                await addReservationPayment(dataToAdd);
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
    confirm.require({
        group: 'delete',
        header: "確認",
        message: `本当に削除しますか？ (金額: ${Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY" }).format(payment.value)})`,        
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
        accept: async () => {
            await deleteReservationPayment(payment.id);
            confirm.close();
        },
        reject: () => {
            confirm.close();
        },
    });
};

const showMoveDialog = ref(false);
const paymentToMove = ref(null);
const candidateReservations = ref([]);
const isLoadingCandidates = ref(false);

const openMoveDialog = async (payment) => {
    paymentToMove.value = payment;
    showMoveDialog.value = true;
    isLoadingCandidates.value = true;
    try {
        const hotelId = props.reservation_details[0].hotel_id;
        const clientId = props.reservation_details[0].client_id;
        const allReservations = await getReservationsByClient(hotelId, clientId);

        // Ensure allReservations is an array
        let reservationsArray = [];
        if (Array.isArray(allReservations)) {
            reservationsArray = allReservations;
        } else {
            console.error(`[openMoveDialog] Unexpected response type for reservations. Expected array but got ${typeof allReservations}. Value:`, allReservations, `Context: Payment ID=${payment.id}, Date=${payment.date}`);
        }

        // Filter by +- 1 month and exclude current reservation
        const paymentDate = new Date(payment.date);
        const oneMonthInMs = 30 * 24 * 60 * 60 * 1000;

        candidateReservations.value = reservationsArray.filter(res => {
            if (res.id === payment.reservation_id) return false;

            // Only show reservations that contain the same room as the payment
            if (!res.room_ids || !res.room_ids.includes(payment.room_id)) return false;

            // Use details_min_date and details_max_date from eff join
            const checkIn = new Date(res.details_min_date);
            const checkOut = new Date(res.details_max_date);

            return (paymentDate >= new Date(checkIn.getTime() - oneMonthInMs)) &&
                   (paymentDate <= new Date(checkOut.getTime() + oneMonthInMs));
        });
    } catch (error) {
        console.error('Failed to fetch candidate reservations:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '移動先予約の取得に失敗しました。', life: 3000 });
    } finally {
        isLoadingCandidates.value = false;
    }
};

const handleMovePayment = async (targetReservationId) => {
    try {
        await moveReservationPayment(paymentToMove.value.id, targetReservationId);
        toast.add({ severity: 'success', summary: '成功', detail: '清算を移動しました。', life: 3000 });
        showMoveDialog.value = false;
    } catch (error) {
        console.error('Error moving payment:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: error.message, life: 3000 });
    }
};

const confirmMove = (targetReservationId) => {
    confirm.require({
        group: 'move',
        header: '確認',
        message: '本当にこの清算を別の予約に移動しますか？',
        icon: 'pi pi-exclamation-triangle',
        rejectProps: {
            label: 'キャンセル',
            severity: 'secondary',
            outlined: true
        },
        acceptProps: {
            label: '移動',
            severity: 'primary'
        },
        accept: () => {
            handleMovePayment(targetReservationId);
        }
    });
};

const getStatusSeverity = (status) => {
    switch (status) {
        case 'confirmed': return 'success';
        case 'checked_in': return 'info';
        case 'checked_out': return 'secondary';
        case 'cancelled': return 'danger';
        case 'hold': return 'warn';
        case 'provisory': return 'contrast';
        default: return null;
    }
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
const filterClients = async (event) => {
    const query = event.query;
    if (!query) {
        filteredClients.value = [];
        return;
    }

    try {
        // Fetch matching clients from backend with a reasonable limit
        setClientsIsLoading(true);
        const authToken = localStorage.getItem('authToken');
        const response = await fetch(`/api/client-list/1?limit=20&search=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error('Search failed');
        const data = await response.json();

        filteredClients.value = data.clients.map(client => ({
            ...client,
            display_name: client.name_kanji || client.name_kana || client.name || ''
        }));
    } catch (error) {
        console.error('Failed to search clients:', error);
        filteredClients.value = [];
    } finally {
        setClientsIsLoading(false);
    }
};
const onClientSelect = (event) => {
    if (event.value) {
        // console.log('onClientSelect event:',event.value);
        const selectedClient = event.value;
        isClientSelected.value = true;

        newPayment.value.payerClientId = selectedClient.id;

        client.value = { display_name: selectedClient.name_kanji || selectedClient.name_kana || selectedClient.name };

    } else {
        resetClient();
    }

    // console.log('onClientSelect client:',client.value);
};
const onClientChange = async (event) => {
    if (!event.value.id) {
        // console.log('onClientChange event:',event.value);
        isClientSelected.value = false;
        newPayment.value.payerClientId = null;
    }
};
const resetClient = () => {
    isClientSelected.value = false;
    newPayment.value.payerClientId = null;
};

onMounted(async () => {
    // console.log('onMounted ReservationPayments;', props.reservation_details, props.reservation_payments);

    await setHotelId(props.reservation_details[0].hotel_id);
    await fetchHotel();
    await fetchPaymentTypes();
    await updateReservationClients();

    // REMOVED: pre-loading of all clients which caused performance issues

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
watch(newPayment, (_newVal, _oldVal) => {

    const price = pricePerRoom.value[newPayment.value.room_id] || 0;
    const payment = paymentPerRoom.value[newPayment.value.room_id] || 0;
    newPayment.value.room_balance = price * 1 - payment * 1;
    //console.log('watch newPayment', newVal);

}, { deep: true });

watch(reservationIsUpdating, async (newVal, _oldVal) => {
    if (newVal === true) {
        // console.log("Updating...");            
    }
    if (newVal === false) {
        // console.log("Not Updating...");
        await updateReservationClients();
    }
});

watch(remainingBalance, async (_newVal, _oldVal) => {
    // console.log('watch remainingBalance', oldVal, newVal);

    const price = pricePerRoom.value[newPayment.value.room_id] || 0;
    const payment = paymentPerRoom.value[newPayment.value.room_id] || 0;
    newPayment.value.room_balance = price * 1 - payment * 1;
});


</script>

<style scoped></style>
