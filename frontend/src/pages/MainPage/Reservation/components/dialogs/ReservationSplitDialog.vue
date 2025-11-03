<template>
    <Dialog v-model:visible="showDialog" header="予約分割" modal :style="{ width: '50vw' }">
        <div class="p-fluid">
            <div class="field mt-6">
                <FloatLabel>
                    <DatePicker id="dates" v-model="selectedDates" selectionMode="range" :manualInput="false" showIcon
                        fluid :minDate="minDate" :maxDate="maxDate" dateFormat="yy-mm-dd" :numberOfMonths="2"
                        :selectOtherMonths="true" />
                    <label for="dates">日付範囲</label>
                </FloatLabel>
            </div>
            <div class="field">
                <label>部屋</label>
                <Fieldset v-for="group in groupedRooms" :key="group.name" :legend="group.name" :toggleable="true">
                    <div class="flex flex-wrap">
                        <div v-for="room in group.rooms" :key="room.room_id" class="flex items-center mr-4 mb-2">
                            <Checkbox v-model="selectedRooms" :inputId="String(room.room_id)" name="room"
                                :value="room.room_id" />
                            <label :for="String(room.room_id)" class="ml-2">{{ room.room_number }}</label>
                        </div>
                    </div>
                </Fieldset>
            </div>
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="showDialog = false" class="p-button-text"
                severity="danger" />
            <Button label="分割" icon="pi pi-check" @click="handleSplit" :loading="isSubmitting"
                :disabled="isSplitButtonDisabled" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import Fieldset from 'primevue/fieldset';
import { useReservationStore } from '@/composables/useReservationStore';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true,
    },
    reservation_id: {
        type: String,
        required: true,
    },
    reservation_details: {
        type: Array,
        required: false,
        default: () => [],
    },
});

const emit = defineEmits(['update:visible']);

const { splitReservation } = useReservationStore();
const toast = useToast();
const router = useRouter();

const isSubmitting = ref(false);
const selectedDates = ref([]);
const selectedRooms = ref([]);

const showDialog = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

const rooms = computed(() => {
    if (!props.reservation_details) return [];
    const roomMap = new Map();
    props.reservation_details.forEach(detail => {
        if (!roomMap.has(detail.room_id)) {
            roomMap.set(detail.room_id, {
                room_id: detail.room_id,
                room_type_name: detail.room_type_name,
                room_number: detail.room_number,
            });
        }
    });
    return Array.from(roomMap.values());
});

const groupedRooms = computed(() => {
    const groups = {};
    rooms.value.forEach(room => {
        if (!groups[room.room_type_name]) {
            groups[room.room_type_name] = {
                name: room.room_type_name,
                rooms: []
            };
        }
        groups[room.room_type_name].rooms.push(room);
    });
    return Object.values(groups);
});

const minDate = computed(() => {
    if (!props.reservation_details?.[0]?.check_in) {
        return null;
    }
    return new Date(props.reservation_details[0].check_in);
});

const maxDate = computed(() => {
    const checkOutString = props.reservation_details?.[0]?.check_out;
    if (!checkOutString || isNaN(new Date(checkOutString).getTime())) {
        return null;
    }
    const checkOutDate = new Date(checkOutString);
    // Subtract one day because the checkout day is exclusive for split logic
    checkOutDate.setDate(checkOutDate.getDate() - 1);
    return checkOutDate;
});

const isSplitButtonDisabled = computed(() => {
    if (!selectedDates.value || selectedDates.value.length !== 2 || !selectedRooms.value.length) {
        return true;
    }
    const [startDate, endDate] = selectedDates.value;
    if (!startDate || !endDate) {
        return true;
    }

    // New condition: Disable if both full period and full room are selected
    if (isFullPeriodSplit.value && isFullRoomSplit.value) {
        return true;
    }

    const originalCheckIn = minDate.value;
    const originalCheckOutMinusOne = maxDate.value;

    // Normalize dates to avoid time comparison issues
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const checkIn = new Date(originalCheckIn.getFullYear(), originalCheckIn.getMonth(), originalCheckIn.getDate());
    const checkOut = new Date(originalCheckOutMinusOne.getFullYear(), originalCheckOutMinusOne.getMonth(), originalCheckOutMinusOne.getDate());

    const includesCheckIn = start.getTime() === checkIn.getTime();
    const includesCheckOut = end.getTime() === checkOut.getTime();

    return !(includesCheckIn || includesCheckOut);
});

const reservationDetailIdsToMove = computed(() => {
    if (!selectedDates.value || selectedDates.value.length !== 2 || !selectedRooms.value.length) {
        return [];
    }
    const [startDate, endDate] = selectedDates.value;
    if (!startDate || !endDate) {
        return [];
    }

    // Set endDate to the end of the day to include all of it.
    const inclusiveEndDate = new Date(endDate);
    inclusiveEndDate.setHours(23, 59, 59, 999);

    return props.reservation_details
        .filter(detail => {
            const detailDate = new Date(detail.date);
            return detailDate >= startDate && detailDate <= inclusiveEndDate && selectedRooms.value.includes(detail.room_id);
        })
        .map(detail => detail.id);
});

const isFullPeriodSplit = computed(() => {
    if (!selectedDates.value || selectedDates.value.length !== 2) return false;
    const [startDate, endDate] = selectedDates.value;
    if (!startDate || !endDate) return false;

    // Get the min/max dates for the selected rooms in the original reservation
    const selectedRoomDetails = props.reservation_details.filter(detail => selectedRooms.value.includes(detail.room_id));
    if (selectedRoomDetails.length === 0) return false;

    const minOriginalDate = new Date(Math.min(...selectedRoomDetails.map(d => new Date(d.date))));
    const maxOriginalDate = new Date(Math.max(...selectedRoomDetails.map(d => new Date(d.date))));

    // Normalize dates for comparison
    const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const minOrig = new Date(minOriginalDate.getFullYear(), minOriginalDate.getMonth(), minOriginalDate.getDate());
    const maxOrig = new Date(maxOriginalDate.getFullYear(), maxOriginalDate.getMonth(), maxOriginalDate.getDate());

    return start.getTime() === minOrig.getTime() && end.getTime() === maxOrig.getTime();
});

const isFullRoomSplit = computed(() => {
    if (selectedRooms.value.length === 0) return false;
    const allOriginalRoomIds = [...new Set(props.reservation_details.map(detail => detail.room_id))];
    return selectedRooms.value.length === allOriginalRoomIds.length && selectedRooms.value.every(roomId => allOriginalRoomIds.includes(roomId));
});

const handleSplit = async () => {
    if (reservationDetailIdsToMove.value.length === 0) {
        toast.add({ severity: 'warn', summary: '警告', detail: '分割する予約明細を選択してください。', life: 3000 });
        return;
    }

    if (isFullPeriodSplit.value && isFullRoomSplit.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: '予約全体を選択しているため、分割はできません。', life: 3000 });
        return;
    }

    isSubmitting.value = true;
    try {
        if (!Array.isArray(props.reservation_details) || props.reservation_details.length === 0) {
            throw new Error('Reservation details not found or empty.');
        }
        const hotelId = props.reservation_details[0]?.hotel_id;
        if (!hotelId) {
            throw new Error('Hotel ID not found');
        }

        const newReservationIds = await splitReservation(
            props.reservation_id,
            hotelId,
            reservationDetailIdsToMove.value,
            isFullPeriodSplit.value,
            isFullRoomSplit.value
        );

        if (newReservationIds && newReservationIds.length > 0) {
            toast.add({ severity: 'success', summary: '成功', detail: '予約が正常に分割されました。', life: 3000 });
            showDialog.value = false;
            // Redirect to the first new reservation created
            router.push(`/reservations/edit/${newReservationIds[0]}`);
        } else {
            // This case handles situations where the backend returns an empty array
            // (e.g., no changes were made or the split could not be performed for other reasons).
            // An informational toast is shown, and the dialog is closed.
            toast.add({ severity: 'info', summary: '情報', detail: '選択された予約は分割されませんでした。' , life: 3000 });
            showDialog.value = false; // Close the dialog even if no split
        }
    } catch (error) {
        console.error('Error splitting reservation:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '予約の分割に失敗しました。', life: 3000 });
    } finally {
        isSubmitting.value = false;
    }
};

watch(() => props.visible, async (newValue) => {
    if (newValue) {
        selectedDates.value = [];
        await nextTick(); // Wait for the DOM and computed properties to update
        selectedRooms.value = rooms.value.map(room => room.room_id);
    }
});
</script>
