<template>
    <div class="p-2">
        <Card class="m-2">
            <template #title>
                {{ drawerHeader }}
            </template>
            <template #content>
                <div class="grid grid-cols-4 mb-4 mr-4 gap-2">
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker v-model="today" :showIcon="true" :minDate="minDateRange" :maxDate="maxDateRange"
                                iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true"
                                @update:model-value="onDateChange" fluid />
                            <label>チェックイン</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker v-model="tomorrow" :showIcon="true" :minDate="minDateRange"
                                :maxDate="maxDateRange" iconDisplay="input" dateFormat="yy-mm-dd"
                                :selectOtherMonths="true" @update:model-value="onOutDateChange" fluid />
                            <label>チェックアウト</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="numberOfPeople" :min="1" :max="maxNumberOfPeople" fluid />
                            <label>人数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="numberOfNights" variant="filled" fluid disabled />
                            <label>宿泊数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <Button label="新規予約" icon="pi pi-calendar" @click="openDialog" />
                    </div>
                    <div class="col-span-1 mt-6">
                        <Button label="仮ブロック" icon="pi pi-lock" @click="submitTempBlock" severity="warn" />
                    </div>
                </div>
            </template>
        </Card>

        <!-- Client For Reservation Dialog -->
        <ClientForReservationDialog v-model="dialogVisible" :reservation-details="reservationDetails" :client="client"            
            @save="handleReservationSave"
            @close="closeDialog" />
    </div>
</template>

<script setup>
// Vue
import { ref, watch, computed, onMounted, defineAsyncComponent } from 'vue';
import { useRouter } from 'vue-router';
const ClientForReservationDialog = defineAsyncComponent(() => import('./Dialogs/ClientForReservationDialog.vue'));

const router = useRouter();

const props = defineProps({
    room_id: {
        type: [String, Number],
        required: true,
    },
    date: {
        type: [String, Date],
        required: true,
    },
});

const emit = defineEmits(['temp-block-close']);

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Card, FloatLabel, DatePicker, InputNumber, Button } from 'primevue';

// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotelId, selectedHotelRooms, applyCalendarSettings } = useHotelStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { getAvailableDatesForChange, setReservationId, fetchMyHoldReservations } = useReservationStore();
import { useClientStore } from '@/composables/useClientStore';
const { clients, fetchAllClientsForFiltering } = useClientStore();
import { useUserStore } from '@/composables/useUserStore';
const { fetchUser, logged_user } = useUserStore();

// Form
const today = ref(new Date(props.date));
const tomorrow = ref(new Date(today.value));
tomorrow.value.setDate(today.value.getDate() + 1);
const minDateRange = ref(null);
const maxDateRange = ref(null);
const numberOfPeople = ref(1);
const maxNumberOfPeople = ref(1);
const numberOfNights = computed(() => {
    if (today.value && tomorrow) {
        const checkInDate = today.value;
        const checkOutDate = tomorrow.value;
        const dayDiff = Math.floor((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (dayDiff < 0) {
            return 0;
        }

        return dayDiff;
    }
    return 0;
});
const onDateChange = () => {
    if (tomorrow.value < today.value) {
        tomorrow.value = new Date(today.value);
        tomorrow.value.setDate(today.value.getDate() + 1);
    }
};
const onOutDateChange = () => {
    if (today.value > tomorrow.value) {
        today.value = new Date(tomorrow.value);
        today.value.setDate(tomorrow.value.getDate() - 1);
    }
};

// Dialog    
const dialogVisible = ref(false);
const client = ref({});
const reservationDetails = ref({
    hotel_id: selectedHotelId.value,
    room_type_id: null,
    room_id: props.room_id,
    client_id: null,
    check_in: '',
    check_out: '',
    number_of_nights: 1,
    number_of_people: 1,
    name: '',
    legal_or_natural_person: 'legal',
    gender: 'other',
    email: null,
    phone: null,
});

const selectedRoom = ref(null);
const drawerHeader = ref('Loading...');

// Helper function
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Dialog
const openDialog = () => {
    if (clients.value.length === 0) {
        fetchAllClientsForFiltering();
    }
    if (!reservationDetails.value.number_of_people) {
        toast.add({
            severity: 'warn',
            summary: '注意',
            detail: '人数未記入',
            life: 3000,
        });
        return
    }
    if (new Date(reservationDetails.value.check_in) >= new Date(reservationDetails.value.check_out)) {
        toast.add({
            severity: 'warn',
            summary: '日付エラー',
            detail: 'チェックイン日はチェックアウト日より前にしてください。',
            life: 3000,
        });
        return;
    }

    dialogVisible.value = true;
};
const closeDialog = () => {
    dialogVisible.value = false;
};
const handleReservationSave = async (reservationData) => {
    // Update local reservation details with the data from the dialog
    Object.assign(reservationDetails.value, reservationData);

    // Log the values being sent
    //console.log('[submitReservation] reservationDetails:', JSON.stringify(reservationDetails.value));
    //console.log('[submitReservation] name field:', reservationDetails.value.name);

    const authToken = localStorage.getItem('authToken');
    try {
        const response = await fetch('/api/reservation/hold', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`, // Authorization header with token
                'Content-Type': 'application/json', // Content-Type for JSON data
            },
            body: JSON.stringify(reservationDetails.value), // Send the reservation details as JSON
        });

        if (response.ok) {
            const data = await response.json();
            const { reservation } = data;
            toast.add({ severity: 'success', summary: '成功', detail: '保留中予約作成されました。', life: 3000 });

            await fetchMyHoldReservations();
            await goToEditReservationPage(reservation.id);

            dialogVisible.value = false;

        } else {
            console.warn("No data returned from fetchAvailableRooms. Not updating room availability.");
            toast.add({ severity: 'warn', summary: '警告', detail: '利用可能な部屋のデータが返されませんでした。', life: 3000 });
        }

        //dialogVisible.value = false;

    } catch (error) {
        console.error('Network error:', error); // Handle any network errors
    }
};

const goToEditReservationPage = async (reservation_id) => {
    await setReservationId(reservation_id);

    router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });
};

const submitTempBlock = async () => {
    try {
        // Get the username from the user store with a fallback
        await fetchUser();
        const userName = (logged_user.value && logged_user.value.length > 0 && logged_user.value[0]?.name)
            ? logged_user.value[0].name
            : 'User'; // Default name if not available or structure is different

        const result = await applyCalendarSettings(
            selectedHotelId.value,
            reservationDetails.value.check_in,
            reservationDetails.value.check_out, // Format as YYYY-MM-DD
            [props.room_id],
            reservationDetails.value.number_of_people,
            `${userName}の部屋押さえ`,
            'temp'
        );
        if (result.success) {
            toast.add({ severity: 'success', summary: '成功', detail: '仮ブロックを作成しました。', life: 3000 });

            // Emit event 
            emit('temp-block-close', {
                roomId: props.room_id,
                checkIn: reservationDetails.value.check_in,
                checkOut: reservationDetails.value.check_out,
                reservationId: result.reservation?.id
            });

            dialogVisible.value = false;
        } else {
            toast.add({ severity: 'error', summary: 'エラー', detail: '仮ブロックの作成に失敗しました。', life: 3000 });
        }
    } catch (error) {
        console.error('Error creating temporary block:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '仮ブロックの作成に失敗しました。', life: 3000 });
    }
};

// Fetch reservation details on mount

onMounted(async () => {
    // Filter the selected room            
    selectedRoom.value = selectedHotelRooms.value.find(room => room.room_id === props.room_id);

    drawerHeader.value = selectedRoom.value.name + '：' + selectedRoom.value.room_number + '号室 ' + selectedRoom.value.room_type_name;
    maxNumberOfPeople.value = selectedRoom.value.room_capacity;

    const datesResult = await getAvailableDatesForChange(selectedRoom.value.id, selectedRoom.value.room_id, formatDate(today.value), formatDate(tomorrow.value));

    if (datesResult && datesResult.earliestCheckIn) {
        minDateRange.value = new Date(datesResult.earliestCheckIn);
    }
    if (datesResult && datesResult.latestCheckOut) {
        maxDateRange.value = new Date(datesResult.latestCheckOut);
    }

    // console.log('reservationDetails start:', reservationDetails.value);
    // console.log('selectedRoom:',selectedRoom.value);
    // console.log('minDateRange:', minDateRange.value,'maxDateRange:', maxDateRange.value);
});

// Watch
watch([today, tomorrow], ([checkInDate, checkOutDate]) => {
    if (checkInDate && checkOutDate && !isNaN(checkInDate.getTime()) && !isNaN(checkOutDate.getTime())) {
        reservationDetails.value.check_in = formatDate(checkInDate);
        reservationDetails.value.check_out = formatDate(checkOutDate);
        reservationDetails.value.number_of_nights = numberOfNights.value;
        reservationDetails.value.number_of_people = numberOfPeople.value;
    }
}, { immediate: true });
watch(() => numberOfPeople.value,
    () => {
        reservationDetails.value.number_of_people = numberOfPeople.value;
    });


</script>

<style scoped></style>
