<template>
    <Dialog v-model:visible="showDialog" header="予約分割" modal :style="{ width: '50vw' }">
        <div class="p-fluid">
                            <div class="field mt-6">
                                <FloatLabel>                    <DatePicker id="dates" v-model="selectedDates" selectionMode="range" :manualInput="false" showIcon fluid :minDate="minDate" :maxDate="maxDate" dateFormat="yy-mm-dd" :numberOfMonths="2" :selectOtherMonths="true" />
                    <label for="dates">日付範囲</label>
                </FloatLabel>
            </div>
            <div class="field">
                <label>部屋</label>
                <Fieldset v-for="group in groupedRooms" :key="group.name" :legend="group.name" :toggleable="true">
                    <div class="flex flex-wrap">
                        <div v-for="room in group.rooms" :key="room.room_id" class="flex items-center mr-4 mb-2">
                            <Checkbox v-model="selectedRooms" :inputId="String(room.room_id)" name="room" :value="room.room_id" />
                            <label :for="String(room.room_id)" class="ml-2">{{ room.room_number }}</label>
                        </div>
                    </div>
                </Fieldset>
            </div>
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="showDialog = false" class="p-button-text" severity="danger" />
            <Button label="分割" icon="pi pi-check" @click="handleSplit" :loading="isSubmitting" :disabled="isSplitButtonDisabled" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import Fieldset from 'primevue/fieldset';
import { useReservationStore } from '@/composables/useReservationStore';
import { useToast } from 'primevue/usetoast';

const props = defineProps({
    visible: Boolean,
    reservation_id: String,
    reservation_details: Array,
});

const emit = defineEmits(['update:visible']);

const { splitReservation } = useReservationStore();
const toast = useToast();

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
    if (!props.reservation_details || props.reservation_details.length === 0) {
        return null;
    }
    return new Date(props.reservation_details[0].check_in);
});

const maxDate = computed(() => {
    if (!props.reservation_details || props.reservation_details.length === 0) {
        return null;
    }
    const checkOutDate = new Date(props.reservation_details[0].check_out);
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

const handleSplit = async () => {
    if (reservationDetailIdsToMove.value.length === 0) {
        toast.add({ severity: 'warn', summary: '警告', detail: '分割する予約明細を選択してください。', life: 3000 });
        return;
    }

    isSubmitting.value = true;
    try {
        const hotelId = props.reservation_details[0]?.hotel_id;
        if (!hotelId) {
            throw new Error('Hotel ID not found');
        }

        await splitReservation(props.reservation_id, hotelId, reservationDetailIdsToMove.value);
        toast.add({ severity: 'success', summary: '成功', detail: '予約が正常に分割されました。', life: 3000 });
        showDialog.value = false;
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
