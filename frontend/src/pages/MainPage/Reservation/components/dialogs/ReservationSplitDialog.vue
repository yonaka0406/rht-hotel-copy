<template>
    <Dialog v-model:visible="showDialog" header="予約分割" modal>
        <div class="p-fluid">
            <div class="field">
                <label for="dates">日付範囲</label>
                <DatePicker v-model="selectedDates" selectionMode="range" :manualInput="false" showIcon fluid />
            </div>
            <div class="field">
                <label>部屋</label>
                <div v-for="room in rooms" :key="room.room_id" class="flex items-center">
                    <Checkbox v-model="selectedRooms" :inputId="String(room.room_id)" name="room" :value="room.room_id" />
                    <label :for="String(room.room_id)" class="ml-2">{{ room.room_type_name }} {{ room.room_number }}</label>
                </div>
            </div>
        </div>
        <template #footer>
            <Button label="キャンセル" icon="pi pi-times" @click="showDialog = false" class="p-button-text" />
            <Button label="分割" icon="pi pi-check" @click="handleSplit" :loading="isSubmitting" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import Dialog from 'primevue/dialog';
import DatePicker from 'primevue/datepicker';
import Checkbox from 'primevue/checkbox';
import Button from 'primevue/button';
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

const reservationDetailIdsToMove = computed(() => {
    if (!selectedDates.value || selectedDates.value.length !== 2 || !selectedRooms.value.length) {
        return [];
    }
    const [startDate, endDate] = selectedDates.value;
    if (!startDate || !endDate) {
        return [];
    }

    return props.reservation_details
        .filter(detail => {
            const detailDate = new Date(detail.date);
            return detailDate >= startDate && detailDate <= endDate && selectedRooms.value.includes(detail.room_id);
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

watch(() => props.visible, (newValue) => {
    if (newValue) {
        selectedDates.value = [];
        selectedRooms.value = [];
    }
});
</script>
