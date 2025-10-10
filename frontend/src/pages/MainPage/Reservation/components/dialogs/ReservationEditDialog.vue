<template>
    <Dialog v-model:visible="visibleReservationBulkEditDialog" header="全部屋一括編集" :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }" style="width: 50vw">
        <div class="p-fluid">
            <Tabs value="0" @update:value="handleTabChange">
                <TabList>
                    <Tab value="0">プラン適用</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'"
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
                                                    optionLabel="name" showClear fluid @change="updatePlanAddOns" />
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
                                                        optionLabel="name" optionValue="plan_key" class="w-full" />
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
                        <p class="mt-2 mb-6"><span class="font-bold">注意：</span>全ての部屋宿泊期間を変更できる日付が表示されています。</p>
                        <div class="grid grid-cols-2 gap-4 items-center">
                            <div>
                                <FloatLabel>
                                    <label for="checkin">チェックイン</label>
                                    <DatePicker id="checkin" v-model="newCheckIn" :showIcon="true"
                                        :minDate="minCheckIn || undefined" :maxDate="maxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                            <div>
                                <FloatLabel>
                                    <label for="checkout">チェックアウト</label>
                                    <DatePicker id="checkout" v-model="newCheckOut" :showIcon="true"
                                        :minDate="minCheckIn || undefined" :maxDate="maxCheckOut || undefined"
                                        iconDisplay="input" dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid />
                                </FloatLabel>
                            </div>
                        </div>
                        <Card class="mt-3 mb-3">
                            <template #title>部屋毎の状況</template>
                            <template #content>
                                <div class="grid grid-cols-3 gap-4 items-center text-center font-bold">
                                    <p>部屋</p>
                                    <p>最も早い日付</p>
                                    <p>最も遅い日付</p>
                                </div>
                                <div v-for="(change, index) in roomsAvailableChanges" :key="index" class="room-status">
                                    <div class="grid grid-cols-3 gap-4 items-center">
                                        <p class="text-center">{{ change.roomValues.details[0].room_type_name + ' ' +
                                            change.roomValues.details[0].room_number }}</p>
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
                    <Checkbox id="overrideRounding" v-model="overrideRounding" :binary="true" />
                    <label for="overrideRounding" class="ml-2">端数処理を上書きする</label>
                </div>                                
                <Button v-if="tabsReservationBulkEditDialog === 0 && !isPatternInput" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyPlanChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
                
                <Button v-if="tabsReservationBulkEditDialog === 0 && isPatternInput" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyPatternChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />
                <Button v-if="tabsReservationBulkEditDialog === 4" label="適用" icon="pi pi-check"
                    class="p-button-success p-button-text p-button-sm" @click="applyDateChangesToAll" :loading="isSubmitting" :disabled="isSubmitting" />

                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text
                    @click="closeReservationBulkEditDialog" :loading="isSubmitting" :disabled="isSubmitting" />
            </div>
        </template>
    </Dialog>
</template>

<script setup>
// Vue
import { ref, watch, computed, nextTick } from 'vue';

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import {
    Card, Dialog, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, InputNumber, Select, MultiSelect, DatePicker, FloatLabel, ToggleButton, Badge, Divider, Checkbox, Button
} from 'primevue';

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

//Stores
import { useReservationStore } from '@/composables/useReservationStore';
const { setRoomPlan, setRoomPattern, getAvailableDatesForChange, setCalendarChange } = useReservationStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { plans, addons, patterns, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons, fetchPatternsForHotel } = usePlansStore();

// Helper
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

// Computed
const reservationInfo = computed(() => props.reservation_details?.[0]);
const reservationStatus = computed(() => {
    switch (reservationInfo.value.status) {
        case 'hold':
            return '保留中';
        case 'provisory':
            return '仮予約';
        case 'confirmed':
            return '確定';
        case 'checked_in':
            return 'チェックイン';
        case 'checked_out':
            return 'チェックアウト';
        case 'cancelled':
            return 'キャンセル';
        case 'block':
            return '予約不可';
        default:
            return '不明';
    }
});
const groupedRooms = computed(() => {
    if (!reservationInfo.value) return [];

    const groups = {};

    props.reservation_details.forEach((item) => {
        const key = `${item.room_id}-${item.room_type}`;
        if (!groups[key]) {
            groups[key] = { room_id: item.room_id, room_type: item.room_type_name, details: [] };
        }
        groups[key].details.push(item);
    });

    return Object.values(groups);

});

// Dialog: Reservation
const visibleReservationBulkEditDialog = ref(false);
const tabsReservationBulkEditDialog = ref(0);
const openReservationBulkEditDialog = async () => {

    const hotelId = reservationInfo.value.hotel_id;
    const startDate = reservationInfo.value.check_in;
    const endDate = reservationInfo.value.check_out;

    await fetchPlansForHotel(hotelId);
    await fetchPatternsForHotel(hotelId);
    // Addons
    const allAddons = await fetchAllAddons(hotelId);
    addonOptions.value = allAddons.filter(addon => addon.addon_type !== 'parking');
    tabsReservationBulkEditDialog.value = 0;
    visibleReservationBulkEditDialog.value = true;
};
const closeReservationBulkEditDialog = () => {
    visibleReservationBulkEditDialog.value = false;

    selectedPlan.value = null;

    selectedDays.value = [
        { label: '月曜日', value: 'mon' },
        { label: '火曜日', value: 'tue' },
        { label: '水曜日', value: 'wed' },
        { label: '木曜日', value: 'thu' },
        { label: '金曜日', value: 'fri' },
        { label: '土曜日', value: 'sat' },
        { label: '日曜日', value: 'sun' },
    ];

    addons.value = [];
};
const handleTabChange = async (newTabValue) => {
    tabsReservationBulkEditDialog.value = newTabValue * 1;

    // Period change
    if (tabsReservationBulkEditDialog.value === 4) {
        roomsAvailableChanges.value = [];
        const hotelId = reservationInfo.value.hotel_id;
        newCheckIn.value = new Date(reservationInfo.value.check_in);
        newCheckOut.value = new Date(reservationInfo.value.check_out);

        const checkIn = formatDate(newCheckIn.value);
        const checkOut = formatDate(newCheckOut.value);

        groupedRooms.value.every(async (room) => {
            const roomId = room.room_id;
            const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);

            if (results.earliestCheckIn) {
                const earliestCheckInDate = new Date(results.earliestCheckIn);
                if (!minCheckIn.value || earliestCheckInDate > minCheckIn.value) {
                    minCheckIn.value = earliestCheckInDate;
                }
            }

            if (results.latestCheckOut) {
                const latestCheckOutDate = new Date(results.latestCheckOut);
                if (!maxCheckOut.value || latestCheckOutDate < maxCheckOut.value) {
                    maxCheckOut.value = latestCheckOutDate;
                }
            }

            // Store the results and room values in roomsAvailableChanges
            roomsAvailableChanges.value.push({
                roomId: roomId,
                roomValues: room,
                results: results
            });
        });
    }
};

// Tab Apply Plan
const isPatternInput = ref(false);
const daysOfWeek = [
    { label: '月曜日', value: 'mon' },
    { label: '火曜日', value: 'tue' },
    { label: '水曜日', value: 'wed' },
    { label: '木曜日', value: 'thu' },
    { label: '金曜日', value: 'fri' },
    { label: '土曜日', value: 'sat' },
    { label: '日曜日', value: 'sun' },
];
const dayPlanSelections = ref({ mon: null, tue: null, wed: null, thu: null, fri: null, sat: null, sun: null });
const selectedDays = ref(daysOfWeek);
const selectedPlan = ref(null);
const selectedPattern = ref(null);
const selectedPatternDetails = ref(null);
const selectedAddon = ref([]);
const addonOptions = ref(null);
const selectedAddonOption = ref(null);
const overrideRounding = ref(false);

const updatePattern = async () => {
    if (selectedPattern.value !== null) {
        // Update the selectedPatternDetails with the corresponding data
        selectedPatternDetails.value = selectedPattern.value;

        // Populate dayPlanSelections based on template
        for (const day of daysOfWeek) {
            const templateEntry = selectedPatternDetails.value.template?.[day.value];
            if (templateEntry && templateEntry.plan_key && plans.value.some(plan => plan.plan_key === templateEntry.plan_key)) {
                dayPlanSelections.value[day.value] = templateEntry.plan_key;
            } else {
                dayPlanSelections.value[day.value] = null;
            }
        }
    }
};
const updatePlanAddOns = async () => {
    if (selectedPlan.value) {
        const gid = selectedPlan.value?.plans_global_id ?? 0;
        const hid = selectedPlan.value?.plans_hotel_id ?? 0;
        const hotel_id = reservationInfo.value.hotel_id ?? 0;

        try {
            // Fetch add-ons from the store
            await fetchPlanAddons(gid, hid, hotel_id);
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
    const isHotelAddon = foundAddon.id.startsWith('H');

    const addonData = {
        addons_global_id: isHotelAddon ? null : foundAddon.addons_global_id,
        addons_hotel_id: isHotelAddon ? foundAddon.addons_hotel_id : null,
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
    isSubmitting.value = true;
    try {
        // Get the number of people for the reservation
        const numberOfPeople = reservationInfo.value.reservation_number_of_people;

        // Adjust addon quantities based on the number of people
        const adjustedAddons = selectedAddon.value.map(addon => ({
            ...addon,
            quantity: addon.quantity * numberOfPeople
        }));

        // 1. Create an array of promises
        const updatePromises = groupedRooms.value.map(room => {
            const params = {
                hotel_id: reservationInfo.value.hotel_id,
                room_id: room.room_id,
                reservation_id: reservationInfo.value.reservation_id,
                plan: selectedPlan.value,
                addons: adjustedAddons,
                daysOfTheWeek: selectedDays.value,
                overrideRounding: overrideRounding.value
            };
            // Assuming setRoomPlan is refactored to take one object
            return setRoomPlan(params);
        });

        // 2. Wait for all promises to resolve
        await Promise.all(updatePromises);

        // 3. This code now runs only after all updates succeed
        closeReservationBulkEditDialog();
        toast.add({
            severity: 'success',
            summary: '成功',
            detail: 'すべての部屋の予約明細が更新されました。', // "All rooms updated"
            life: 3000
        });

    } catch (error) {
        // If any of the updates fail, Promise.all will reject
        // and the error will be caught here.
        console.error('Failed to apply bulk changes:', error);

        const errorMessage = error.response?.data?.message || '変更の適用に失敗しました。';

        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: errorMessage,
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};
const applyPatternChangesToAll = async () => {
    isSubmitting.value = true;
    try {
        console.log('Starting to apply pattern to all rooms:', {
            hotelId: reservationInfo.value.hotel_id,
            reservationId: reservationInfo.value.reservation_id,
            pattern: dayPlanSelections.value
        });

        // Use Promise.all to wait for all room updates to complete
        const updatePromises = groupedRooms.value.map(async (room) => {
            const roomId = room.room_id;
            console.log('Applying pattern to room:', roomId);
            try {
                const result = await setRoomPattern(
                    reservationInfo.value.hotel_id,
                    roomId,
                    reservationInfo.value.reservation_id,
                    dayPlanSelections.value,
                    overrideRounding.value
                );
                console.log('Pattern applied to room:', roomId, result);
                return result;
            } catch (error) {
                console.error(`Failed to apply pattern to room ${roomId}:`, error);
                throw error; // Re-throw to be caught by the outer try-catch
            }
        });

        await Promise.all(updatePromises);

        closeReservationBulkEditDialog();
        console.log('Successfully applied pattern to all rooms');

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
        isSubmitting.value = false;
    }
};

// Tab Modify Period
const newCheckIn = ref(null);
const newCheckOut = ref(null);
const minCheckIn = ref(null);
const maxCheckOut = ref(null);
const roomsAvailableChanges = ref([]);
const applyDateChangesToAll = async () => {
    isSubmitting.value = true;
    try {
        // Checks            
        if (!newCheckIn.value) {
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: `チェックイン日を指定してください。`,
                life: 3000
            });
            return;
        }
        if (!newCheckOut.value) {
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: `チェックアウト日を指定してください。`,
                life: 3000
            });
            return;
        }
        if (newCheckOut.value <= newCheckIn.value) {
            toast.add({
                severity: 'warn',
                summary: '警告',
                detail: `チェックアウト日がチェックイン日以前になっています。`,
                life: 3000
            });
            return;
        }

        const new_check_in = formatDate(new Date(newCheckIn.value));
        const new_check_out = formatDate(new Date(newCheckOut.value));

        for (const room of roomsAvailableChanges.value) {

            const id = room.roomValues.details[0].reservation_id;
            const old_check_in = room.roomValues.details[0].check_in;
            const old_check_out = room.roomValues.details[0].check_out;
            const old_room_id = room.roomId;
            const new_room_id = room.roomId;
            const number_of_people = room.roomValues.details[0].number_of_people;

            await setCalendarChange(id, old_check_in, old_check_out, new_check_in, new_check_out, old_room_id, new_room_id, number_of_people, 'bulk');
        }

        closeReservationBulkEditDialog();

        toast.add({ severity: 'success', summary: '成功', detail: '全ての部屋の宿泊期間が更新されました。', life: 3000 });

    } catch (error) {
        console.error('Error applying date changes:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '日付変更の適用に失敗しました',
            life: 3000
        });
    } finally {
        isSubmitting.value = false;
    }
};

watch(addons, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        // Add a 'quantity' field with default value 1 to each add-on
        selectedAddon.value = newValue.map(addon => ({
            ...addon,
            quantity: 1
        }));
    }
}, { deep: true });

defineExpose({
    openReservationBulkEditDialog
});


</script>