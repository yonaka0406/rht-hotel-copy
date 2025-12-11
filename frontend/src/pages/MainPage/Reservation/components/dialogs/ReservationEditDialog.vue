<template>
    <!-- Reservation Edit Dialog -->
    <Dialog v-model:visible="visibleLocal" header="全部屋一括編集" :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }" style="width: 50vw">
        <div class="p-fluid">
            <Tabs value="0" @update:value="handleTabChange">
                <TabList>
                    <Tab value="0">プラン適用</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定' || reservationStatus === 'チェックイン'"
                        value="4">期間</Tab>
                </TabList>


                <TabPanels>
                    <!-- Tab 1: Apply Plan -->
                    <TabPanel value="0">
                        <Card class="mb-2">
                            <template #title>プラン</template>
                            <template #content>
                                <!-- Plan manual selection -->
                                <div v-if="!isPatternInput">
                                    <div class="grid grid-cols-6 mt-8">
                                        <div class="col-span-4 mr-2">
                                            <FloatLabel>
                                                <Select id="bulk-plan" v-model="selectedPlan" :options="plans"
                                                    optionLabel="plan_name" showClear fluid @change="updatePlanAddOns" />
                                                <label for="bulk-plan">プラン選択</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="col-span-2">
                                            <ToggleButton v-model="isPatternInput" :onLabel="'パターン'" :offLabel="'手動入力'"
                                                fluid />
                                        </div>
                                    </div>
                                    <div class="field mt-6">
                                        <FloatLabel>
                                            <MultiSelect v-model="selectedDays" :options="daysOfWeek"
                                                optionLabel="label" fluid :maxSelectedLabels="3" />
                                            <label>曜日</label>
                                        </FloatLabel>
                                    </div>
                                </div>
                                <!-- Plan pattern selection -->
                                <div v-if="isPatternInput">
                                    <div class="grid grid-cols-6 mt-8">
                                        <div class="col-span-4 mr-2">
                                            <FloatLabel>
                                                <Select v-model="selectedPattern" id="bulk-pattern" :options="patterns"
                                                    fluid @change="updatePattern">
                                                    <template #value="slotProps">
                                                        <div v-if="slotProps.value">
                                                            <div class="mr-2">{{ slotProps.value.name }} </div>
                                                            <Badge severity="secondary">{{ slotProps.value.template_type
                                                                === 'global' ? 'グローバル' : 'ホテル' }}</Badge>
                                                        </div>
                                                        <div v-else>
                                                            パターン選択
                                                        </div>
                                                    </template>
                                                    <template #option="slotProps">
                                                        <div class="flex items-center">
                                                            <div class="mr-2">{{ slotProps.option.name }} </div>
                                                            <Badge severity="secondary">{{
                                                                slotProps.option.template_type === 'global' ? 'グローバル' :
                                                                    'ホテル' }}</Badge>
                                                        </div>
                                                    </template>
                                                </Select>
                                                <label for="bulk-pattern">パターン選択</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="col-span-2">
                                            <ToggleButton v-model="isPatternInput" :onLabel="'パターン'" :offLabel="'手動入力'"
                                                fluid />
                                        </div>
                                        <div v-for="day in daysOfWeek" :key="day.value" class="col-span-3 mt-4 mr-2">
                                            <div class="mt-4 mr-2">
                                                <FloatLabel>
                                                    <Select v-model="dayPlanSelections[day.value]" :options="plans"
                                                        optionLabel="plan_name" optionValue="plan_id" class="w-full" />
                                                    <label class="font-semibold mb-1 block">{{ day.label }}</label>
                                                </FloatLabel>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Card>
                        <Card v-if="!isPatternInput">
                            <template #title>アドオン</template>
                            <template #content>
                                <div class="grid grid-cols-4">
                                    <div class="field col-span-3 mt-8">
                                        <FloatLabel>
                                            <Select v-model="selectedAddonOption" :options="addonOptions"
                                                optionLabel="addon_name" optionValue="id" showClear fluid />
                                            <label>アドオン選択</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="field col mt-8 ml-2">
                                        <Button label="追加" @click="generateAddonPreview" :loading="isSubmitting" :disabled="isSubmitting" />
                                    </div>
                                </div>

                                <Divider />

                                <div class="field mt-6">
                                    <DataTable :value="selectedAddon" class="p-datatable-sm">
                                        <Column field="addon_name" header="アドオン名" style="width:40%" />
                                        <Column field="quantity" header="数量" style="width:20%">
                                            <template #body="slotProps">
                                                <InputNumber v-model="slotProps.data.quantity" :min="0"
                                                    placeholder="数量を記入" fluid />
                                            </template>
                                        </Column>
                                        <Column field="price" header="価格" style="width:20%">
                                            <template #body="slotProps">
                                                <InputNumber v-model="slotProps.data.price" :min="0" placeholder="価格を記入"
                                                    fluid />
                                            </template>
                                        </Column>
                                        <Column header="操作" style="width:10%">
                                            <template #body="slotProps">
                                                <Button icon="pi pi-trash"
                                                    class="p-button-text p-button-danger p-button-sm"
                                                    @click="deleteAddon(slotProps.data)" :loading="isSubmitting" :disabled="isSubmitting" />
                                            </template>
                                        </Column>
                                    </DataTable>
                                </div>
                            </template>
                        </Card>
                    </TabPanel>
                    <!-- Tab 5: Modify period -->
                    <TabPanel value="4">
                        <Card class="mb-3">
                            <template #title>予約</template>
                            <template #content>
                                <div class="grid grid-cols-2 gap-4 items-center">
                                    <div>
                                        <span>チェックイン：{{ reservationInfo.check_in }}</span>
                                    </div>
                                    <div>
                                        <span>チェックアウト：{{ reservationInfo.check_out }}</span>
                                    </div>
                                    <div>
                                        <span>宿泊者：{{ reservationInfo.reservation_number_of_people }}</span>
                                    </div>
                                    <div>
                                        <span>部屋数：{{ groupedRooms.length }}</span>
                                    </div>
                                </div>
                            </template>
                        </Card>
                        <Message v-if="!areAllRoomsSelectedComputed" severity="info" :closable="false" class="mt-2 mb-6">
                            選択された部屋は新しい予約に移動されます。
                        </Message>
                        <p class="mt-2 mb-6"><span class="font-bold">注意：</span>全ての部屋宿泊期間を変更できる日付が表示されています。</p>
                        <div class="grid grid-cols-2 gap-4 items-center">
                            <div>
                                <FloatLabel>
                                    <label for="checkin">チェックイン</label>
                                    <DatePicker id="checkin" v-model="newCheckIn" :showIcon="true"
                                        :minDate="computedMinCheckIn || undefined" :maxDate="computedMaxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                            <div>
                                <FloatLabel>
                                    <label for="checkout">チェックアウト</label>
                                    <DatePicker id="checkout" v-model="newCheckOut" :showIcon="true"
                                        :minDate="computedMinCheckIn || undefined" :maxDate="computedMaxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                        </div>
                        <Card class="mt-3 mb-3">
                            <template #title>部屋毎の状況</template>
                            <template #content>
                                <div class="grid grid-cols-4 gap-4 items-center text-center font-bold">
                                    <p>部屋</p>
                                    <p>選択</p>
                                    <p>最も早い日付</p>
                                    <p>最も遅い日付</p>
                                </div>
                                <div v-for="(change, index) in roomsAvailableChanges" :key="index" class="room-status">
                                    <div class="grid grid-cols-4 gap-4 items-center">
                                        <p class="text-center">{{ change.roomValues.details[0].room_type_name + ' ' +
                                            change.roomValues.details[0].room_number }}
                                            <i v-if="hasRoomChange(change.roomValues)" class="pi pi-exclamation-triangle ml-2 text-orange-500"
                                                v-tooltip.top="'この部屋には期間変更があります。'"></i>
                                        </p>
                                        <div class="flex justify-center">
                                            <Checkbox v-model="selectedRoomsForChange" :value="change.roomId" :disabled="hasRoomChange(change.roomValues)" />
                                        </div>
                                        <p class="text-center"
                                            :class="{ 'text-xs text-center': !change.results.earliestCheckIn }">
                                            {{ change.results.earliestCheckIn ? change.results.earliestCheckIn : '制限なし'
                                            }}
                                        </p>
                                        <p class="text-center"
                                            :class="{ 'text-xs text-center': !change.results.latestCheckOut }">
                                            {{ change.results.latestCheckOut ? change.results.latestCheckOut : '制限なし' }}
                                        </p>
                                    </div>


                                </div>
                            </template>
                        </Card>
                    </TabPanel>
                </TabPanels>
            </Tabs>

        </div>
        <template #footer>
            <div class="flex justify-center items-center">
                <div v-if="tabsReservationBulkEditDialog === 0 && !isPatternInput" class="field-checkbox mr-4">
                    <Checkbox id="disableRounding" v-model="disableRounding" :binary="true" />
                    <label for="disableRounding" class="ml-2">端数処理を上書きする</label>
                </div>                                
                <Button v-if="tabsReservationBulkEditDialog === 0 && !isPatternInput" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyPlanChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
                
                <Button v-if="tabsReservationBulkEditDialog === 0 && isPatternInput" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyPatternChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
                <Button v-if="tabsReservationBulkEditDialog === 4" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyDateChanges" :loading="isSubmitting" :disabled="isSubmitting" />

                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                    @click="closeReservationBulkEditDialog" :loading="isSubmitting" :disabled="isSubmitting" />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { useRouter } from 'vue-router'; // Only if needed for goToNewReservation in applyDateChanges
import { useToast } from 'primevue/usetoast';
const toast = useToast();

import {
    Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, Card, FloatLabel, Select, ToggleButton, MultiSelect, DataTable, Column, InputNumber, Button, Badge, Divider, Checkbox, Message, DatePicker
} from 'primevue';

import { useReservationStore } from '@/composables/useReservationStore';
const { setRoomPlan, setRoomPattern, fetchAvailableRooms, getAvailableDatesForChange, setReservationRoomsPeriod } = useReservationStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { plans, addons, patterns, fetchPlansForHotel, fetchAllAddons, fetchPatternsForHotel, fetchPlanAddons } = usePlansStore(); // fetchPlanAddons needed

import { daysOfWeek } from '@/utils/dateUtils';
const props = defineProps({
    visible: Boolean,
    reservation_id: {
        type: String,
        required: true,
    },
    reservation_details: {
        type: [Object], // Assuming this contains reservationInfo, groupedRooms etc.
        required: true,
    },
    reservationStatus: String, // '保留中', '仮予約', '確定', 'チェックイン'
    isSubmitting: Boolean, // To disable buttons
    groupedRooms: Array, // Need for applyPlanChangesToAll and applyDateChanges
    hasRoomChange: Function, // Helper function
});

const emit = defineEmits([
    'update:visible',
    'reservationUpdated', // When changes are applied
    'closeDialog',
    'goToNewReservation' // When applyDateChanges navigates
]);

const visibleLocal = computed({
    get: () => props.visible,
    set: (value) => emit('update:visible', value)
});

// Derived from props.reservation_details for easier access
const reservationInfo = computed(() => props.reservation_details?.[0]);

const tabsReservationBulkEditDialog = ref(0);
const isPatternInput = ref(false);
const dayPlanSelections = ref({ mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null });
const selectedDays = ref(daysOfWeek);
const selectedPlan = ref(null);
const selectedPattern = ref(null);
const selectedPatternDetails = ref(null);
const selectedAddon = ref([]);
const addonOptions = ref(null); // This will be populated by fetchAllAddons
const selectedAddonOption = ref(null);
const disableRounding = ref(false);

const newCheckIn = ref(null);
const newCheckOut = ref(null);
const roomsAvailableChanges = ref([]);
const selectedRoomsForChange = ref([]);

// Helper function needed from parent
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const handleTabChange = async (newTabValue) => {
    tabsReservationBulkEditDialog.value = newTabValue * 1;

    // Period change
    if (tabsReservationBulkEditDialog.value === 4) {
        roomsAvailableChanges.value = [];
        selectedRoomsForChange.value = [];
        const hotelId = reservationInfo.value.hotel_id;
        if (!hotelId) {
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: 'ホテルIDが見つかりません。',
                life: 3000
            });
            return;
        }
        newCheckIn.value = new Date(reservationInfo.value.check_in);
        newCheckOut.value = new Date(reservationInfo.value.check_out);

        const checkIn = formatDate(newCheckIn.value);
        const checkOut = formatDate(newCheckOut.value);

        const changesPromises = props.groupedRooms.map(async (room) => {
            const roomId = room.room_id;
            const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);
            return {
                roomId: roomId,
                roomValues: room,
                results: results
            };
        });

        const allChanges = await Promise.all(changesPromises);

        roomsAvailableChanges.value = allChanges;
        selectedRoomsForChange.value = allChanges
            .filter(change => !props.hasRoomChange(change.roomValues)) // Use props.hasRoomChange
            .map(change => change.roomId);

        // Add conditional toast warning
        if (selectedRoomsForChange.value.length === 0 && allChanges.length > 0) {
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: '期間変更可能な部屋がありません。', // "No rooms available for period change."
                life: 5000
            });
        }
    }
};

const updatePattern = async () => {
    if (selectedPattern.value !== null) {
        selectedPatternDetails.value = selectedPattern.value;

        for (const day of daysOfWeek) {
            const templateEntry = selectedPatternDetails.value.template?.[day.value];
            if (templateEntry && templateEntry.plans_hotel_id && plans.value.some(plan => plan.plan_id === templateEntry.plans_hotel_id)) {
                dayPlanSelections.value[day.value] = templateEntry.plans_hotel_id;
            } else {
                dayPlanSelections.value[day.value] = null;
            }
        }
    }
};

const updatePlanAddOns = async () => {
    if (selectedPlan.value) {
        // const gid = selectedPlan.value?.plans_global_id ?? 0; // Deprecated
        const hid = selectedPlan.value?.plans_hotel_id ?? 0;
        const hotel_id = reservationInfo.value.hotel_id ?? 0;

        try {
            // Fetch add-ons from the store
            await fetchPlanAddons(hid, hotel_id);
        } catch (error) {
            console.error('Failed to fetch plan add-ons:', error);
            addons.value = [];
        }
    }
};

const generateAddonPreview = async () => {
    // Check
    if (!selectedAddonOption.value) {
        toast.add({ severity: 'warn', summary: '注意', detail: 'アドオン選択されていません。', life: 3000 });
        return
    }

    const foundAddon = addonOptions.value.find(addon => addon.id === selectedAddonOption.value);

    const addonData = {
        addons_global_id: null,
        addons_hotel_id: foundAddon.id,
        hotel_id: foundAddon.hotel_id,
        addon_name: foundAddon.addon_name,
        price: foundAddon.price,
        quantity: 1,
        tax_type_id: foundAddon.tax_type_id,
        tax_rate: foundAddon.tax_rate
    };

    selectedAddon.value.push(addonData);

    selectedAddonOption.value = '';

};

const deleteAddon = (addon) => {
    const index = selectedAddon.value.indexOf(addon);
    if (index !== -1) {
        selectedAddon.value.splice(index, 1);
    }
};

const applyPlanChangesToAll = async () => {
    //isSubmitting.value = true; // Use prop or local state, but emit
    emit('update:isSubmitting', true); // Assuming isSubmitting is a prop

    try {
        const updatePromises = props.groupedRooms.map(room => {
            const roomNumberOfPeople = room.details[0].number_of_people;

            const adjustedAddons = selectedAddon.value.map(addon => ({
                ...addon,
                quantity: addon.quantity * roomNumberOfPeople
            }));
            const params = {
                hotel_id: reservationInfo.value.hotel_id,
                room_id: room.room_id,
                reservation_id: props.reservation_id,
                plan: selectedPlan.value,
                addons: adjustedAddons,
                daysOfTheWeek: selectedDays.value,
                disableRounding: disableRounding.value
            };
            return setRoomPlan(params);
        });

        await Promise.all(updatePromises);

        emit('closeDialog'); // Close the dialog
        emit('reservationUpdated'); // Notify parent of update
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'すべての部屋の予約明細が更新されました。',
            life: 3000
        });

    } catch (error) {
        console.error('Failed to apply bulk changes:', error);
        const errorMessage = error.response?.data?.message || '変更の適用に失敗しました。';
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        emit('update:isSubmitting', false);
    }
};

const applyPatternChangesToAll = async () => {
    emit('update:isSubmitting', true);
    try {
        const updatePromises = props.groupedRooms.map(async (room) => {
            const roomId = room.room_id;
            try {
                const result = await setRoomPattern(
                    reservationInfo.value.hotel_id,
                    roomId,
                    props.reservation_id,
                    dayPlanSelections.value,
                    disableRounding.value
                );
                return result;
            } catch (error) {
                console.error(`Failed to apply pattern to room ${roomId}:`, error);
                throw error;
            }
        });

        await Promise.all(updatePromises);

        emit('closeDialog');
        emit('reservationUpdated');
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: '予約明細が更新されました。',
            life: 3000
        });

    } catch (error) {
        console.error('Failed to apply pattern changes:', {
            error,
            message: error.message,
            stack: error.stack
        });
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '変更の適用に失敗しました。詳細はコンソールを確認してください。',
            life: 5000
        });
    } finally {
        emit('update:isSubmitting', false);
    }
};

const computedMinCheckIn = computed(() => {
    let minDate = null;
    const newSelectedRooms = selectedRoomsForChange.value;

    if (newSelectedRooms.length > 0) {
        const selectedChanges = roomsAvailableChanges.value.filter(change => newSelectedRooms.includes(change.roomId));

        selectedChanges.forEach(change => {
            if (change.results.earliestCheckIn) {
                const earliestCheckInDate = new Date(change.results.earliestCheckIn);
                if (!minDate || earliestCheckInDate > minDate) {
                    minDate = earliestCheckInDate;
                }
            }
        });
    }
    return minDate;
});

const computedMaxCheckOut = computed(() => {
    let maxDate = null;
    const newSelectedRooms = selectedRoomsForChange.value;

    if (newSelectedRooms.length > 0) {
        const selectedChanges = roomsAvailableChanges.value.filter(change => newSelectedRooms.includes(change.roomId));

        selectedChanges.forEach(change => {
            if (change.results.latestCheckOut) {
                const latestCheckOutDate = new Date(change.results.latestCheckOut);
                if (!maxDate || latestCheckOutDate < maxDate) {
                    maxDate = latestCheckOutDate;
                }
            }
        });
    }
    return maxDate;
});

const areAllRoomsSelectedComputed = computed(() => {
    const roomIdsToChange = selectedRoomsForChange.value;
    const allOriginalRoomIds = props.groupedRooms.map(group => group.room_id);
    return roomIdsToChange.length === allOriginalRoomIds.length && roomIdsToChange.every(id => allOriginalRoomIds.includes(id));
});

const applyDateChanges = async () => {
    emit('update:isSubmitting', true);
    try {
        if (selectedRoomsForChange.value.length === 0) {
            toast.add({ severity: 'warn', summary: '警告', detail: '変更する部屋を選択してください。', life: 3000 });
            return;
        }
        if (!newCheckIn.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: `チェックイン日を指定してください。`, life: 3000 });
            return;
        }
        if (!newCheckOut.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: `チェックアウト日を指定してください。`, life: 3000 });
            return;
        }
        if (newCheckOut.value <= newCheckIn.value) {
            toast.add({ severity: 'warn', summary: '警告', detail: `チェックアウト日がチェックイン日以前になっています。`, life: 3000 });
            return;
        }

        const new_check_in = formatDate(new Date(newCheckIn.value));
        const new_check_out = formatDate(new Date(newCheckOut.value));

        const roomIdsToChange = selectedRoomsForChange.value;
        const id = props.reservation_id;

        const roomsWithChangesAttempted = roomIdsToChange.filter(roomId => {
            const roomChangeEntry = roomsAvailableChanges.value.find(change => change.roomId === roomId);
            return roomChangeEntry && props.hasRoomChange(roomChangeEntry.roomValues);
        });

        if (roomsWithChangesAttempted.length > 0) {
            toast.add({ severity: 'error', summary: 'エラー', detail: '期間変更ができない部屋が含まれています。', life: 5000 });
            return;
        }

        const allOriginalRoomIds = props.groupedRooms.map(group => group.room_id);
        const allRoomsSelected = roomIdsToChange.length === allOriginalRoomIds.length && roomIdsToChange.every(id => allOriginalRoomIds.includes(id));

        const result = await setReservationRoomsPeriod(id, reservationInfo.value.hotel_id, new_check_in, new_check_out, roomIdsToChange, allRoomsSelected);

        emit('closeDialog');
        emit('reservationUpdated'); // Notify parent of update
        toast.add({ severity: 'success', summary: '成功', detail: '選択された部屋の宿泊期間が更新されました。', life: 3000 });

        if (result.success && result.newReservationId) {
            const router = useRouter(); // Access router here if needed for navigation
            router.push({ name: 'ReservationEdit', params: { reservation_id: result.newReservationId } });
        }

    } catch (error) {
        console.error('Error applying date changes:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '日付変更の適用に失敗しました', life: 3000 });
    } finally {
        emit('update:isSubmitting', false);
    }
};

// Watcher for addons from store to populate selectedAddon
watch(addons, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        selectedAddon.value = newValue.map(addon => ({
            ...addon,
            quantity: 1
        }));
    }
}, { deep: true });

watch([computedMinCheckIn, computedMaxCheckOut], ([newMin, newMax]) => {
    if (newMin && (!newCheckIn.value || newCheckIn.value < newMin)) {
        newCheckIn.value = newMin;
    }
    if (newMax && (!newCheckOut.value || newCheckOut.value > newMax)) {
        newCheckOut.value = newMax;
    }
    if (newCheckIn.value && newCheckOut.value && newCheckOut.value <= newCheckIn.value) {
        const adjustedCheckOut = new Date(newCheckIn.value);
        adjustedCheckOut.setDate(adjustedCheckOut.getDate() + 1);
        newCheckOut.value = adjustedCheckOut;
    }
}, { immediate: true });

// Expose open function to parent
// This will be called from openReservationBulkEditDialog in parent
const open = async () => {
    const hotelId = reservationInfo.value.hotel_id;
    const startDate = reservationInfo.value.check_in;
    const endDate = reservationInfo.value.check_out;

    await fetchAvailableRooms(hotelId, startDate, endDate);
    await fetchPlansForHotel(hotelId);
    await fetchPatternsForHotel(hotelId);
    
    // Addons
    const allAddons = await fetchAllAddons(hotelId);
    addonOptions.value = allAddons.filter(addon => addon.addon_type !== 'parking');
    
    tabsReservationBulkEditDialog.value = 0;
    visibleLocal.value = true;
};

defineExpose({
    open
});

</script>

<style scoped></style>
