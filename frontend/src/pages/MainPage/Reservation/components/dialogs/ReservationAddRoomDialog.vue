<template>
    <Dialog v-model:visible="visibleAddRoomDialog" header="予約一括編集" :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }" style="width: 50vw">
        <div class="p-fluid">
            <Tabs value="0">
                <TabList>
                    <Tab value="0">部屋追加</Tab>
                </TabList>

                <TabPanels>
                    <!-- Tab 1: Rooms -->
                    <TabPanel value="0">
                        <h4 class="mt-4 mb-3 font-bold">部屋追加</h4>

                        <div class="grid grid-cols-2 gap-2">
                            <div class="field mt-6 col-span-1">
                                <FloatLabel>
                                    <InputNumber id="move-people" v-model="numberOfPeopleToMove" :min="0" fluid />
                                    <label for="move-people">人数</label>
                                </FloatLabel>
                            </div>
                            <div class="field mt-6 col-span-1">
                                <FloatLabel>
                                    <Select id="move-room" v-model="targetRoom" :options="filteredRooms"
                                        optionLabel="label" showClear fluid />
                                    <label for="move-room">部屋を追加</label>
                                </FloatLabel>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>

        </div>
        <template #footer>
            <Button label="追加" icon="pi pi-check" class="p-button-success p-button-text p-button-sm"
                @click="applyReservationRoomChanges" :loading="isSubmitting" :disabled="isSubmitting" />
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                @click="closeAddRoomDialog" :loading="isSubmitting" :disabled="isSubmitting" />
        </template>
    </Dialog>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
const toast = useToast();

import {
    Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, InputNumber, Select, FloatLabel, Button
} from 'primevue';

import { useReservationStore } from '@/composables/useReservationStore';
const { availableRooms, fetchAvailableRooms, addRoomToReservation } = useReservationStore();

const props = defineProps({
    reservation_details: {
        type: [Object],
        required: true,
    },
    isSubmitting: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits(['update:isSubmitting']);

const isSubmitting = computed({
    get: () => props.isSubmitting,
    set: (value) => emit('update:isSubmitting', value),
});

const visibleAddRoomDialog = ref(false);
const targetRoom = ref(null);
const numberOfPeopleToMove = ref(0);

const reservationInfo = computed(() => props.reservation_details?.[0]);

const filteredRooms = computed(() => {
    const reservedRoomIds = props.reservation_details.map(detail => detail.room_id);

    return availableRooms.value
        .filter(room => room.capacity >= numberOfPeopleToMove.value) // Ensure room can fit the people count
        .filter(room => !reservedRoomIds.includes(room.room_id))
        .map(room => ({
            label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
            value: room.room_id, // Value for selection
        }));
});

const openAddRoomDialog = async () => {
    const hotelId = reservationInfo.value.hotel_id;
    const startDate = reservationInfo.value.check_in;
    const endDate = reservationInfo.value.check_out;

    await fetchAvailableRooms(hotelId, startDate, endDate);

    visibleAddRoomDialog.value = true;
};
const closeAddRoomDialog = () => {
    visibleAddRoomDialog.value = false;
};
const applyReservationRoomChanges = async () => {
    isSubmitting.value = true;
    try {
        if (numberOfPeopleToMove.value <= 0) {
            toast.add({ severity: 'warn', summary: '警告', detail: `少なくとも一人入力してください。`, life: 3000 });
            return
        }
        if (targetRoom.value === null) {
            toast.add({ severity: 'warn', summary: '警告', detail: `部屋を選択してください。`, life: 3000 });
            return;
        }

        const reservation_id = reservationInfo.value.reservation_id;

        const data = {
            reservationId: reservation_id,
            numberOfPeople: numberOfPeopleToMove.value,
            roomId: targetRoom.value.value,
        }

        await addRoomToReservation(data);

        closeAddRoomDialog();
        
        toast.add({ severity: 'success', summary: '成功', detail: '部屋追加されました。', life: 3000 });
    } catch (error) {
        console.error('Error applying room changes:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '部屋の変更に失敗しました',
            life: 3000
        });
    } finally {
        isSubmitting.value = false;
    }
};

defineExpose({
    openAddRoomDialog,
});
</script>
