<template>
    <div>
        <Panel header="部屋タイプ組み合わせ">
            <!-- Select Dates and Number of People -->
            <form @submit.prevent="addReservationCombo">
                <div class="grid grid-cols-4 mb-4 mr-4 gap-2">
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker v-model="comboRow.check_in" :showIcon="true" iconDisplay="input"
                                dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid
                                @update:model-value="onDateChange" />
                            <label>チェックイン</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker v-model="comboRow.check_out" :showIcon="true" iconDisplay="input"
                                dateFormat="yy-mm-dd" :selectOtherMonths="true" :minDate="minCheckOutDate" fluid
                                @update:model-value="onDateChange" />
                            <label>チェックアウト</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="numberOfNights" variant="filled" fluid disabled />
                            <label>宿泊数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">

                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <Select v-model="comboRow.room_type_id" :options="roomTypes" optionLabel="room_type_name"
                                optionValue="room_type_id" fluid />
                            <label>部屋タイプ</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="comboRow.number_of_rooms" :min="1" :max="maxRoomNumber" fluid />
                            <label>部屋数</label>
                        </FloatLabel>
                        <p class="text-xs text-gray-500">最大: {{ maxRoomNumber }}</p>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="comboRow.number_of_people" :min="minNumberOfPeople" :max="maxCapacity"
                                fluid />
                            <label>人数</label>
                        </FloatLabel>
                        <p class="text-xs text-gray-500">最大: {{ maxCapacity }}</p>
                    </div>
                    <div class="col-span-1 mt-6">
                        <Button label="追加" severity="success" type="submit" />
                    </div>
                </div>
            </form>

            <Divider />
            <span class="flex justify font-bold">駐車場利用フォーム</span>
            <form @submit.prevent="addParkingCombo">
                <div class="grid grid-cols-4 mb-4 mr-4 gap-2">
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker v-model="comboRow.check_in" :showIcon="true" iconDisplay="input"
                                dateFormat="yy-mm-dd" :selectOtherMonths="true" fluid
                                @update:model-value="onDateChange" />
                            <label>チェックイン</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <DatePicker v-model="comboRow.check_out" :showIcon="true" iconDisplay="input"
                                dateFormat="yy-mm-dd" :selectOtherMonths="true" :minDate="minCheckOutDate" fluid
                                @update:model-value="onDateChange" />
                            <label>チェックアウト</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="numberOfNights" variant="filled" fluid disabled />
                            <label>利用日数</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">

                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <Select v-model="comboRow.vehicle_category_id" :options="vehicleCategories"
                                optionLabel="name" optionValue="id" fluid />
                            <label>車両タイプ</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <InputNumber v-model="comboRow.number_of_rooms" :min="1" :max="maxParkingSpots" fluid />
                            <label>台数</label>
                        </FloatLabel>
                        <p class="text-xs text-gray-500" v-if="maxParkingSpots > 0">
                            利用可能: {{ maxParkingSpots }}台
                            <span v-if="parkingCapacityInfo.blockedCapacity > 0" class="text-orange-600">
                                (ブロック: {{ parkingCapacityInfo.blockedCapacity }}台)
                            </span>
                        </p>
                        <p class="text-xs text-red-500" v-else>選択された日付と車両タイプで利用可能な駐車スペースがありません</p>
                    </div>
                    <div class="col-span-1 mt-6">
                        <FloatLabel>
                            <Select v-model="selectedAddon" :options="addonOptions" optionLabel="addon_name"
                                optionValue="id" class="w-full" :disabled="isParkingAddButtonDisabled" />
                            <label>アドオン</label>
                        </FloatLabel>
                    </div>
                    <div class="col-span-1 mt-6">
                        <Button label="追加" severity="success" type="submit" :disabled="isParkingAddButtonDisabled" />
                    </div>
                </div>
            </form>


            <Card>
                <template #header>
                    <div class="flex justify-start">
                        <span class="font-bold text-lg p-3">組み合わせ</span>
                    </div>
                    <div v-if="validationErrors.length > 0" class="text-red-500 mt-2">
                        <p v-for="(error, index) in validationErrors" :key="index">{{ error }}</p>
                    </div>
                    <div class="flex gap-2 ml-2 mt-2">
                        <Button v-if="hasStayReservation && validationErrors.length === 0" label="新規予約"
                            icon="pi pi-calendar" @click="openDialog" />
                        <Button v-if="hasStayReservation && validationErrors.length === 0" label="複数部屋を仮ブロック"
                            icon="pi pi-lock" severity="warn" @click="openMultiBlockDialog" />
                    </div>
                </template>
                <template #content>
                    <DataTable :value="reservationCombos" class="mt-4">
                        <Column header="チェックイン">
                            <template #body="slotProps">
                                {{ formatDate(slotProps.data.check_in) }}
                            </template>
                        </Column>
                        <Column header="チェックアウト">
                            <template #body="slotProps">
                                {{ formatDate(slotProps.data.check_out) }}
                            </template>
                        </Column>
                        <Column field="room_type_name" header="部屋・車両" />
                        <Column field="number_of_rooms" header="数量" />
                        <Column field="number_of_people" header="人数" />
                        <Column header="操作">
                            <template #body="slotProps">
                                <Button icon="pi pi-trash" severity="danger" @click="deleteCombo(slotProps.data)" />
                            </template>
                        </Column>
                    </DataTable>
                </template>
            </Card>
        </Panel>

        <!-- Dialog -->
        <Dialog v-model:visible="dialogVisible" :header="'予約'" :closable="true" :modal="true"
            :style="{ width: '50vw' }">
            <div class="grid grid-cols-2 gap-2 gap-y-6 pt-6">
                <!-- Name of the person making the reservation -->
                <div class="col-span-2 mb-6">
                    <FloatLabel>
                        <AutoComplete v-model="client" :suggestions="filteredClients" optionLabel="display_name"
                            @complete="filterClients" field="id" @option-select="onClientSelect" fluid required>
                            <template #option="slotProps">
                                <div>
                                    <p>
                                        <i v-if="slotProps.option.is_legal_person" class="pi pi-building"></i>
                                        <i v-else class="pi pi-user"></i>
                                        {{ slotProps.option.name_kanji || slotProps.option.name_kana || slotProps.option.name || '' }}
                                        <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                                        <i v-if="slotProps.option.is_blocked" class="pi pi-ban text-red-500 ml-2"></i>
                                    </p>
                                    <div class="flex items-center gap-2">
                                        <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i
                                                class="pi pi-phone"></i> {{ slotProps.option.phone }}</p>
                                        <p v-if="slotProps.option.phone" class="text-xs text-sky-800"><i
                                                class="pi pi-at"></i> {{ slotProps.option.email }}</p>
                                        <p v-if="slotProps.option.fax" class="text-xs text-sky-800"><i
                                                class="pi pi-send"></i> {{ slotProps.option.fax }}</p>
                                    </div>
                                </div>
                            </template>
                        </AutoComplete>
                        <label>個人氏名 || 法人名称</label>
                    </FloatLabel>
                </div>

                <div v-if="impedimentStatus" class="col-span-2">
                    <div :class="impedimentStatus.class" class="p-4 rounded-md">
                    <p class="font-bold">{{ impedimentStatus.summary }}</p>
                    <p>{{ impedimentStatus.detail }}</p>
                    </div>
                </div>

                <!-- Type of person (Legal or Natural) -->
                <div class="col-span-1">
                    <SelectButton v-model="reservationDetails.legal_or_natural_person" :options="personTypeOptions"
                        option-label="label" option-value="value" fluid :disabled="isClientSelected" />
                </div>

                <!-- Gender input if person is natural -->
                <div class="col-span-1">
                    <div v-if="reservationDetails.legal_or_natural_person === 'natural'" class="flex gap-3">
                        <div v-for="option in genderOptions" :key="option.value" class="flex items-center gap-2">
                            <RadioButton v-model="reservationDetails.gender" :inputId="option.value"
                                :value="option.value" :disabled="isClientSelected" />
                            <label :for="option.value">{{ option.label }}</label>
                        </div>
                    </div>
                </div>

                <!-- Email input -->
                <div class="col-span-1">
                    <FloatLabel>
                        <InputText v-model="reservationDetails.email" :pattern="emailPattern"
                            :class="{ 'p-invalid': !isValidEmail }" @input="validateEmail(reservationDetails.email)"
                            fluid :disabled="isClientSelected" />
                        <label>メールアドレス</label>
                        <small v-if="!isValidEmail" class="p-error">有効なメールアドレスを入力してください。</small>
                    </FloatLabel>
                </div>

                <!-- Phone number input -->
                <div class="col-span-1">
                    <FloatLabel>
                        <InputText v-model="reservationDetails.phone" :pattern="phonePattern"
                            :class="{ 'p-invalid': !isValidPhone }" @input="validatePhone(reservationDetails.phone)"
                            fluid :disabled="isClientSelected" />
                        <label>電話番号</label>
                        <small v-if="!isValidPhone" class="p-error">有効な電話番号を入力してください。</small>
                    </FloatLabel>
                </div>

                <!-- Additional fields for check-in, check-out, number of people -->
                <div class="col-span-1">
                    <FloatLabel>
                        <InputText v-model="reservationDetails.check_in" type="date" variant="filled" fluid disabled />
                        <label>チェックイン</label>
                    </FloatLabel>
                </div>

                <div class="col-span-1">
                    <FloatLabel>
                        <InputText v-model="reservationDetails.check_out" type="date" variant="filled" fluid disabled />
                        <label>チェックアウト</label>
                    </FloatLabel>
                </div>

                <div class="col-span-1">
                    <FloatLabel>
                        <InputNumber v-model="reservationDetails.number_of_nights" variant="filled" fluid disabled />
                        <label>宿泊数</label>
                    </FloatLabel>
                </div>

                <div class="col-span-1">
                    <FloatLabel>
                        <InputNumber v-model="reservationDetails.number_of_people" variant="filled" fluid disabled />
                        <label>人数</label>
                    </FloatLabel>
                </div>
            </div>
            <template #footer>
                <Button label="閉じる" icon="pi pi-times" @click="closeDialog"
                    class="p-button-danger p-button-text p-button-sm" :disabled="isSubmitting" />
                <Button :label="isSubmitting ? '処理中...' : '保存'" :icon="isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-check'" @click="submitReservation"
                    class="p-button-success p-button-text p-button-sm" 
                    :disabled="(impedimentStatus && impedimentStatus.level === 'block') || isSubmitting" />
            </template>
        </Dialog>

        <!-- Multi-Block Dialog -->
        <Dialog v-model:visible="multiBlockDialogVisible" 
                header="複数部屋を仮ブロック" 
                :modal="true" 
                :style="{ width: '50vw' }">
            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">コメント</label>
                    <Textarea v-model="blockComment" rows="3" class="w-full" />
                </div>
            </div>
            <template #footer>
                <Button label="キャンセル" icon="pi pi-times" @click="multiBlockDialogVisible = false" class="p-button-danger p-button-text p-button-sm" text />
                <Button label="ブロックする" icon="pi pi-lock" @click="submitMultiBlock" :loading="isSubmittingBlock" severity="warn" />
            </template>
        </Dialog>

        <WaitlistDialog v-model:visible="waitlistDialogVisibleState" :initialHotelId="selectedHotelId"
            :initialHotelName="selectedHotel ? selectedHotel.name : ''" :initialRoomTypeId="waitlistInitialRoomTypeId"
            :initialCheckInDate="waitlistInitialCheckInDate" :initialCheckOutDate="waitlistInitialCheckOutDate"
            :initialNumberOfGuests="waitlistInitialNumberOfGuests" :initialNotes="waitlistInitialNotes"
            :allClients="clients" :allRoomTypes="roomTypes" @submitted="handleWaitlistSubmitted" />
    </div>
</template>
<script setup>
// Vue
import { ref, computed, watch, onMounted, unref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { Panel, Card, Dialog, FloatLabel, DatePicker, InputText, InputNumber, AutoComplete, Select, SelectButton, RadioButton, Button, DataTable, Column, Divider, Textarea } from 'primevue';
import WaitlistDialog from '@/pages/MainPage/components/Dialogs/WaitlistDialog.vue';
// Stores
import { useHotelStore } from '@/composables/useHotelStore';
const { selectedHotel, selectedHotelId, selectedHotelRooms, fetchHotels, fetchHotel } = useHotelStore();
import { useClientStore } from '@/composables/useClientStore';
const { clients, fetchAllClientsForFiltering } = useClientStore();
import { useReservationStore } from '@/composables/useReservationStore';
const { availableRooms, fetchAvailableRooms, setReservationId, fetchMyHoldReservations, createHoldReservationCombo, blockMultipleRooms  } = useReservationStore();
import { useParkingStore } from '@/composables/useParkingStore';
const { vehicleCategories, fetchVehicleCategories, checkRealTimeAvailability, saveParkingAssignments } = useParkingStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { fetchAllAddons } = usePlansStore();
import { useCRMStore } from '@/composables/useCRMStore';
const { clientImpediments, fetchImpedimentsByClientId } = useCRMStore();

// Refs for props to pass to WaitlistDialog
const waitlistDialogVisibleState = ref(false);
const waitlistInitialRoomTypeId = ref(null);
const waitlistInitialCheckInDate = ref('');
const waitlistInitialCheckOutDate = ref('');
const waitlistInitialNumberOfGuests = ref(1);
const waitlistInitialNotes = ref('');

// Helper function
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const calcDateDiff = (startDate, endDate) => {
    if (startDate && endDate) {
        const start = startDate;
        const end = endDate;
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        if (dayDiff < 0) {
            return 0;
        }
        return dayDiff;
    }
    return 0;
};
const normalizePhone = (phone) => {
    if (!phone) return '';

    // Remove all non-numeric characters
    let normalized = phone.replace(/\D/g, '');

    // Remove leading zeros
    normalized = normalized.replace(/^0+/, '');

    return normalized;
};

// Form
const inDate = ref(new Date());
const outDate = ref(new Date(inDate.value));
outDate.value.setDate(inDate.value.getDate() + 1);
const minCheckOutDate = ref(outDate.value);
const numberOfNights = computed(() => {
    if (comboRow.value.check_in && comboRow.value.check_out) {
        return calcDateDiff(comboRow.value.check_in, comboRow.value.check_out);
    }
    return 0;
});
// selectedSmokingPreference and smokingPreferenceOptions are removed from here

const roomTypes = computed(() => {
    if (!selectedHotelRooms.value) {
        return
    }
    const roomSet = new Map();
    selectedHotelRooms.value.forEach(({ room_type_id, room_type_name, room_smoking_idc }) => {
        roomSet.set(room_type_id, { room_type_id, room_type_name, smoking: room_smoking_idc });
    });
    return Array.from(roomSet.values());
});
const countOfRoomTypes = computed(() => {
    if (!availableRooms.value) {
        return [];
    }
    const roomMap = new Map();

    // Reverted: Filter by for_sale only, no smoking preference filter here
    const forSaleRooms = availableRooms.value.filter(room => room.for_sale);

    forSaleRooms.forEach(({ room_type_id, room_type_name, capacity }) => {
        // All rooms here are already for_sale and match preference
        if (!roomMap.has(room_type_id)) {
            // Ensure room_type_name is sourced correctly, potentially from selectedHotelRooms if not present on all room objects
            const baseRoomTypeInfo = selectedHotelRooms.value.find(rt => rt.room_type_id === room_type_id);
            roomMap.set(room_type_id, {
                room_type_id,
                room_type_name: room_type_name || (baseRoomTypeInfo ? baseRoomTypeInfo.room_type_name : 'Unknown'),
                quantity: 0,
                total_capacity: 0
            });
        }
        const roomData = roomMap.get(room_type_id);
        roomData.quantity += 1;
        roomData.total_capacity += capacity;
    });

    // Ensure all room types from the hotel are present, even if with 0 quantity for the preference
    if (selectedHotelRooms.value) {
        selectedHotelRooms.value.forEach(hotelRoomType => {
            if (hotelRoomType.room_type_id && !roomMap.has(hotelRoomType.room_type_id)) {
                roomMap.set(hotelRoomType.room_type_id, {
                    room_type_id: hotelRoomType.room_type_id,
                    room_type_name: hotelRoomType.room_type_name,
                    quantity: 0,
                    total_capacity: 0
                });
            }
        });
    }

    return Array.from(roomMap.values());
});
const maxRoomNumber = computed(() => {
    if (!countOfRoomTypes.value || !comboRow.value.room_type_id) { // Added check for countOfRoomTypes length
        return
    }
    const roomData = countOfRoomTypes.value.find(room => room.room_type_id === comboRow.value.room_type_id);
    return roomData ? roomData.quantity : 0;
});
const maxCapacity = computed(() => {
    if (!countOfRoomTypes.value && !comboRow.value.room_type_id) {
        return
    }
    const roomData = countOfRoomTypes.value.find(room => room.room_type_id === comboRow.value.room_type_id);
    return roomData ? roomData.total_capacity : 0;
});
const minNumberOfPeople = computed(() => {
    return comboRow.value.number_of_rooms || 1; // Ensuring at least 1 person
});
const isParkingAddButtonDisabled = computed(() => {
    //console.log('Vehicle category ID:', comboRow.value.vehicle_category_id);
    return !comboRow.value.vehicle_category_id || maxParkingSpots.value <= 0;
});
const availableParkingSpots = ref([]);

const numberOfRooms = ref(1);
const numberOfPeople = ref(1);
const comboRow = ref({
    check_in: inDate.value,
    check_out: outDate.value,
    room_type_id: null,
    number_of_rooms: numberOfRooms.value,
    number_of_people: numberOfPeople.value,
    reservation_type: 'stay',
    vehicle_category_id: 1,
    addon_id: null,
    addon_name: '',
    addon_price: 0
});

const checkDates = async () => {
    const hotelId = selectedHotelId.value;
    const startDate = formatDate(comboRow.value.check_in);
    const endDate = formatDate(comboRow.value.check_out);
    await fetchAvailableRooms(hotelId, startDate, endDate);
};

const onDateChange = async () => {
    console.log('[ReservationsNewCombo] onDateChange called');
    
    // Update minimum checkout date
    minCheckOutDate.value = new Date(comboRow.value.check_in);
    minCheckOutDate.value.setDate(comboRow.value.check_in.getDate() + 1);

    // Ensure check_out is not before the new min date
    if (new Date(comboRow.value.check_out) < minCheckOutDate.value) {
        comboRow.value.check_out = new Date(minCheckOutDate.value);
    }

    // Store current vehicle category before reset
    const currentVehicleCategoryId = comboRow.value.vehicle_category_id;

    // Reset vehicle category and addon selection when dates change
    if (comboRow.value.check_in && comboRow.value.check_out) {
        comboRow.value.vehicle_category_id = null;
        selectedAddon.value = addonOptions.value[0]?.id || null;
    }

    // Update dates in all reservation combos
    reservationCombos.value.forEach(combo => {
        combo.check_in = comboRow.value.check_in;
        combo.check_out = comboRow.value.check_out;
    });

    // Fetch available rooms and validate combos
    await checkDates();
    
    // If vehicle category was previously selected, restore it and update parking spots
    if (currentVehicleCategoryId) {
        console.log('[ReservationsNewCombo] Restoring vehicle category and updating parking spots');
        comboRow.value.vehicle_category_id = currentVehicleCategoryId;
        await updateParkingSpots();
    }
    
    validateCombos();
};

const openWaitlistDialogDirect = () => { // Opens waitlist dialog without requiring reservation combos
    // Set default values from the current form state
    waitlistInitialRoomTypeId.value = comboRow.value.room_type_id;
    waitlistInitialCheckInDate.value = formatDate(comboRow.value.check_in);
    waitlistInitialCheckOutDate.value = formatDate(comboRow.value.check_out);
    waitlistInitialNumberOfGuests.value = comboRow.value.number_of_people;
    waitlistInitialNotes.value = "直接登録";

    waitlistDialogVisibleState.value = true;
};

// Expose the method to parent component
defineExpose({
    openWaitlistDialogDirect
});

const handleWaitlistSubmitted = () => {
    // Optional: any action needed in parent after waitlist is submitted
    //console.log("Waitlist entry submitted (event received in parent)");
};

const addReservationCombo = () => {
    comboRow.value.reservation_type = 'stay';

    //console.log('addReservationCombo:', comboRow.value);
    const roomType = roomTypes.value.find(rt => rt.room_type_id === comboRow.value.room_type_id);
    reservationCombos.value.push({
        ...comboRow.value,
        room_type_name: roomType.room_type_name,
    });
    // Reset comboRow for the next addition
    comboRow.value.number_of_rooms = 1;
    comboRow.value.number_of_people = 1;

    validateCombos();
};

const addParkingCombo = () => {
    comboRow.value.reservation_type = 'parking';
    comboRow.value.number_of_people = null;

    //console.log('addParkingCombo - initial comboRow:', JSON.parse(JSON.stringify(comboRow.value)));
    //console.log('addParkingCombo - selectedAddon:', selectedAddon.value);
    //console.log('addParkingCombo - addonOptions:', JSON.parse(JSON.stringify(addonOptions.value)));

    // Find the selected vehicle category
    const selectedVehicle = vehicleCategories.value.find(vc => vc.id === comboRow.value.vehicle_category_id);
    const vehicleName = selectedVehicle ? selectedVehicle.name : '駐車場';

    // Get the selected addon data - ensure we're working with raw values
    const currentAddonId = unref(selectedAddon);
    const currentAddonOptions = unref(addonOptions);
    const selectedAddonData = currentAddonId
        ? currentAddonOptions.find(a => a.id === currentAddonId)
        : currentAddonOptions[0];

    if (!selectedAddonData) {
        console.error('No addon selected and no default addon available');
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '有効なアドオンを選択してください。',
            life: 3000
        });
        return;
    }

    // Create a new object with the updated values
    const updatedCombo = {
        ...comboRow.value,
        addon_id: selectedAddonData.id,
        addon_name: selectedAddonData.addon_name,
        addon_price: selectedAddonData.price,
        room_type_name: `駐車場 (${vehicleName})`
    };

    //console.log('addParkingCombo - updated combo:', JSON.parse(JSON.stringify(updatedCombo)));

    // Push the new object to the array
    reservationCombos.value.push(updatedCombo);

    // Reset comboRow for the next addition
    comboRow.value.number_of_rooms = 1;
    comboRow.value.number_of_people = 1;
    comboRow.value.addon_id = null;
    comboRow.value.addon_name = '';
    comboRow.value.addon_price = 0;

    // Reset the select input to the first available addon
    if (addonOptions.value.length > 0) {
        selectedAddon.value = addonOptions.value[0].id;
    } else {
        selectedAddon.value = null;
    }

    validateCombos();
}

// Table
const reservationCombos = ref([]);
const validationErrors = ref([]);
const consolidatedCombos = computed(() => {
    const consolidated = {};
    if (reservationCombos.value) {
        reservationCombos.value.forEach(combo => {
            if (!consolidated[combo.room_type_id]) {
                consolidated[combo.room_type_id] = {
                    room_type_id: combo.room_type_id,
                    room_type_name: combo.room_type_name,
                    totalRooms: 0,
                    totalPeople: 0,
                    roomCapacities: [],
                };
            }
            consolidated[combo.room_type_id].totalRooms += combo.number_of_rooms;
            consolidated[combo.room_type_id].totalPeople += combo.number_of_people;
            for (let i = 0; i < combo.number_of_rooms; i++) {
                consolidated[combo.room_type_id].roomCapacities.push(
                    availableRooms.value?.find(room => room.room_type_id === combo.room_type_id)?.capacity || 0
                );
            }
        });
    }

    return consolidated;
});
const totalPeople = computed(() => {
    return Object.values(consolidatedCombos.value).reduce((sum, combo) => sum + combo.totalPeople, 0);
});
const deleteCombo = (combo) => {
    reservationCombos.value = reservationCombos.value.filter(c => c !== combo);
    validateCombos();
};
const validateCombos = () => {
    validationErrors.value = [];

    // Separate parking and stay combos
    const parkingCombos = reservationCombos.value.filter(combo => combo.reservation_type === 'parking');
    const stayCombos = reservationCombos.value.filter(combo => combo.reservation_type === 'stay');

    // Find min check-in and max check-out from stay reservations
    let minStayCheckIn = null;
    let maxStayCheckOut = null;

    if (stayCombos.length > 0) {
        minStayCheckIn = new Date(Math.min(...stayCombos.map(combo => new Date(combo.check_in))));
        maxStayCheckOut = new Date(Math.max(...stayCombos.map(combo => new Date(combo.check_out))));
    }

    // Calculate total requested parking spots
    const totalRequestedParkingSpots = parkingCombos.reduce((total, combo) => {
        return total + (parseInt(combo.number_of_rooms) || 0);
    }, 0);

    // Validate stay reservations
    if (stayCombos.length > 0) {
        if (!availableRooms.value) {
            validationErrors.value.push("利用可能な部屋のデータがありません。日付を確認してください。");
            return;
        }

        const forSaleRooms = availableRooms.value.filter(room => room.for_sale);

        // Group by room type for consolidated validation
        const roomTypeGroups = stayCombos.reduce((acc, combo) => {
            if (!acc[combo.room_type_id]) {
                acc[combo.room_type_id] = {
                    room_type_id: combo.room_type_id,
                    room_type_name: combo.room_type_name,
                    totalRooms: 0,
                    totalPeople: 0
                };
            }
            acc[combo.room_type_id].totalRooms += combo.number_of_rooms;
            acc[combo.room_type_id].totalPeople += combo.number_of_people;
            return acc;
        }, {});

        // Validate each room type group
        for (const roomTypeIdStr in roomTypeGroups) {
            const roomTypeId = parseInt(roomTypeIdStr, 10);
            const combo = roomTypeGroups[roomTypeId];

            const roomsOfThisType = forSaleRooms.filter(
                room => room.room_type_id === roomTypeId
            );

            const availableRoomCount = roomsOfThisType.length;
            const availableRoomsForCapacity = roomsOfThisType.map(r => r.capacity).sort((a, b) => b - a);

            if (combo.totalRooms > availableRoomCount) {
                validationErrors.value.push(`部屋タイプ ${combo.room_type_name} の部屋数が不足しています。利用可能数: ${availableRoomCount}, 要求数: ${combo.totalRooms}`);
            } else {
                let peopleToAssign = combo.totalPeople;
                let roomsUsedCount = 0;
                for (const capacity of availableRoomsForCapacity) {
                    if (roomsUsedCount >= combo.totalRooms) break;
                    if (peopleToAssign <= 0) break;
                    peopleToAssign -= capacity;
                    roomsUsedCount++;
                }
                if (peopleToAssign > 0) {
                    validationErrors.value.push(`部屋タイプ ${combo.room_type_name} の人数が部屋のキャパシティを超えています。`);
                }
            }
        }
    }

    // Validate parking reservations
    if (parkingCombos.length > 0) {
        if (stayCombos.length === 0) {
            validationErrors.value.push("駐車場の予約には宿泊予約が必要です。");
        } else {
            // Check total parking spots against net available capacity (accounting for blocks)
            const netAvailable = parkingCapacityInfo.value.netAvailable || maxParkingSpots.value;
            if (totalRequestedParkingSpots > netAvailable) {
                const blockedInfo = parkingCapacityInfo.value.blockedCapacity > 0 
                    ? ` (ブロック済み: ${parkingCapacityInfo.value.blockedCapacity}台)` 
                    : '';
                
                // Check which dates have insufficient capacity
                const insufficientDates = [];
                if (parkingCapacityByDate.value && Object.keys(parkingCapacityByDate.value).length > 0) {
                    for (const [date, capacity] of Object.entries(parkingCapacityByDate.value)) {
                        // Calculate net available: availableSpots - blockedSpots
                        const netAvailable = (capacity.availableSpots || 0) - (capacity.blockedSpots || 0);
                        if (netAvailable < totalRequestedParkingSpots) {
                            insufficientDates.push(`${date} (利用可能: ${Math.max(0, netAvailable)}台)`);
                        }
                    }
                }
                
                let errorMsg = `駐車場の利用可能台数を超えています。利用可能数: ${netAvailable}台${blockedInfo}, 合計要求数: ${totalRequestedParkingSpots}台`;
                if (insufficientDates.length > 0) {
                    errorMsg += `\n不足している日付: ${insufficientDates.join(', ')}`;
                }
                validationErrors.value.push(errorMsg);
            }

            // Validate individual parking combo dates
            parkingCombos.forEach((parkingCombo, index) => {
                const parkingCheckIn = formatDate(new Date(parkingCombo.check_in));
                const parkingCheckOut = formatDate(new Date(parkingCombo.check_out));

                // Check if parking dates are within stay dates
                if (parkingCheckIn < formatDate(minStayCheckIn)) {
                    validationErrors.value.push(`駐車場予約 ${index + 1} のチェックイン日が宿泊期間より前です。`);
                }
                if (parkingCheckOut > formatDate(maxStayCheckOut)) {
                    validationErrors.value.push(`駐車場予約 ${index + 1} のチェックアウト日が宿泊期間より後です。`);
                }
            });
        }
    }

    // Update row styles for visual feedback
    reservationCombos.value.forEach(combo => {
        if (combo.reservation_type === 'stay') {
            const roomsOfThisType = availableRooms.value?.filter(
                room => room.room_type_id === combo.room_type_id && room.for_sale
            ) || [];

            const availableRoomCount = roomsOfThisType.length;
            const availableCaps = roomsOfThisType.map(r => r.capacity).sort((a, b) => b - a);

            let peopleRemaining = combo.number_of_people;
            let roomsUsed = 0;
            for (const cap of availableCaps) {
                if (roomsUsed >= combo.number_of_rooms) break;
                peopleRemaining -= cap;
                roomsUsed++;
                if (peopleRemaining <= 0) break;
            }

            combo.rowStyle = (combo.number_of_rooms > availableRoomCount || peopleRemaining > 0)
                ? { backgroundColor: 'rgba(255, 0, 0, 0.2)' }
                : {};
        } else if (combo.reservation_type === 'parking') {
            const parkingCheckIn = new Date(combo.check_in);
            const parkingCheckOut = new Date(combo.check_out);
            const isOutsideStayDates = minStayCheckIn && maxStayCheckOut &&
                (parkingCheckIn < minStayCheckIn || parkingCheckOut > maxStayCheckOut);

            // Check if this combo would exceed max parking spots when added
            const otherParkingCombos = reservationCombos.value.filter(
                c => c !== combo && c.reservation_type === 'parking'
            );
            const otherParkingSpots = otherParkingCombos.reduce(
                (sum, c) => sum + (parseInt(c.number_of_rooms) || 0), 0
            );
            const wouldExceedMax = (otherParkingSpots + (parseInt(combo.number_of_rooms) || 0)) > maxParkingSpots.value;

            combo.rowStyle = (isOutsideStayDates || wouldExceedMax)
                ? { backgroundColor: 'rgba(255, 0, 0, 0.2)' }
                : {};
        }
    });
};

const dialogVisible = ref(false);

const reservationDetails = ref({
    hotel_id: null,
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
const personTypeOptions = [
    { label: '法人', value: 'legal' },
    { label: '個人', value: 'natural' },
];
const genderOptions = [
    { label: '男性', value: 'male' },
    { label: '女性', value: 'female' },
    { label: 'その他', value: 'other' },
];
const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const isValidEmail = ref(true);
const phonePattern = /^[+]?[0-9]{1,4}[ ]?[-]?[0-9]{1,4}[ ]?[-]?[0-9]{1,9}$/;
const isValidPhone = ref(true);
const isClientSelected = ref(false);
const selectedClient = ref(null);
const client = ref({});
const filteredClients = ref([]);
const impedimentStatus = ref(null);

const openDialog = () => {
    reservationDetails.value.check_in = formatDate(reservationCombos.value[0].check_in);
    reservationDetails.value.check_out = formatDate(reservationCombos.value[0].check_out);
    reservationDetails.value.number_of_nights = calcDateDiff(reservationCombos.value[0].check_in, reservationCombos.value[0].check_out);
    dialogVisible.value = true;
};
const closeDialog = () => {
    dialogVisible.value = false;
};
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

        // console.log('Client:', client, 'Query:', query, 'matchesName:', matchesName, 'matchesPhoneFax:', matchesPhoneFax, 'isNumericQuery', isNumericQuery, 'matchesEmail:', matchesEmail);

        return matchesName || matchesPhoneFax || matchesEmail;
    });

    reservationDetails.value.name = query;
};
const onClientSelect = async (event) => {
    // Get selected client object from the event
    selectedClient.value = event.value;
    isClientSelected.value = true;

    // Fetch impediments for the selected client
    await fetchImpedimentsByClientId(selectedClient.value.id);

    // Check for active 'block' impediments
    const blockImpediment = clientImpediments.value.find(imp => imp.is_active && imp.restriction_level === 'block');
    if (blockImpediment) {
        impedimentStatus.value = {
        level: 'block',
        summary: '予約不可',
        detail: 'このクライアントは予約がブロックされています。',
        class: 'bg-red-100 border-red-400 text-red-700'
        };
    } else {
        const warningImpediment = clientImpediments.value.find(imp => imp.is_active && imp.restriction_level === 'warning');
        if (warningImpediment) {
        impedimentStatus.value = {
            level: 'warning',
            summary: '警告',
            detail: 'このクライアントには警告があります。予約を作成する前に確認してください。',
            class: 'bg-yellow-100 border-yellow-400 text-yellow-700'
        };
        } else {
        impedimentStatus.value = null;
        }
    }
    
    // Update reservationDetails with the selected client's information
    reservationDetails.value.client_id = selectedClient.value.id;
    reservationDetails.value.legal_or_natural_person = selectedClient.value.legal_or_natural_person;
    reservationDetails.value.gender = selectedClient.value.gender;
    reservationDetails.value.email = selectedClient.value.email;
    reservationDetails.value.phone = selectedClient.value.phone;

    // Update the name field (optional, as it's already handled by v-model)
    reservationDetails.value.name = selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name;

    client.value = { display_name: selectedClient.value.name_kanji || selectedClient.value.name_kana || selectedClient.value.name };
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
const validateEmail = (email) => {
    isValidEmail.value = emailPattern.test(email);
};
const validatePhone = (phone) => {
    isValidPhone.value = phonePattern.test(phone);
};

const submitReservation = async () => {
    if (isSubmitting.value) return;
       
    if (impedimentStatus.value && impedimentStatus.value.level === 'block') {
        toast.add({
        severity: 'error',
        summary: '予約不可',
        detail: 'このクライアントは予約がブロックされているため、予約を作成できません。',
        life: 5000,
        });
        return;
    }
    // Validate email and phone
    validateEmail(reservationDetails.value.email);
    validatePhone(reservationDetails.value.phone);

    // Check if either email or phone is filled
    if (!reservationDetails.value.email && !reservationDetails.value.phone) {
        toast.add({
            severity: 'warn',
            summary: '注意',
            detail: 'メールアドレスまたは電話番号の少なくとも 1 つを入力する必要があります。',
            life: 3000,
        });
        return; // Stop further execution if validation fails
    }
    // Check for valid email format
    if (reservationDetails.value.email && !isValidEmail.value) {
        toast.add({
            severity: 'warn',
            summary: '注意',
            detail: '有効なメールアドレスを入力してください。',
            life: 3000,
        });
        return;
    }
    // Check for valid phone format
    if (reservationDetails.value.phone && !isValidPhone.value) {
        toast.add({
            severity: 'warn',
            summary: '注意',
            detail: '有効な電話番号を入力してください。',
            life: 3000,
        });
        return;
    }

    // First, filter for only 'stay' type combos from the original reservationCombos
    const stayReservationCombos = reservationCombos.value.filter(combo =>
        combo.reservation_type === 'stay'
    );

    if (stayReservationCombos.length === 0) {
        toast.add({
            severity: 'warn',
            summary: '注意',
            detail: '宿泊予約がありません。宿泊予約を追加してください。',
            life: 3000,
        });
        return;
    }

    // Now consolidate only the stay combos
    // You'll need to implement the consolidation logic here based on how consolidatedCombos is normally created
    // This is a placeholder - replace with your actual consolidation logic
    const stayCombos = consolidateStayReservations(stayReservationCombos);

    try {
        isSubmitting.value = true;
        
        // 1. Create the main reservation with stay combos
        const response = await createHoldReservationCombo(reservationDetails.value, stayCombos);
        //console.log('Reservation response:', response); // Debug log to check the response structure

        if (!response) {
            throw new Error('No response received from server');
        }

        // The backend returns { reservation, reservationDetails } directly
        const { reservation } = response;

         // Make sure we're getting the reservation ID correctly
        const reservationId = reservation?.id || (Array.isArray(reservation) ? reservation[0]?.id : null);
        //console.log('Extracted reservation ID:', reservationId);

        if (!reservationId) {
            console.error('Could not determine reservation ID from response:', response);
            throw new Error('Failed to get reservation ID from server response');
        }

        const hotelId = reservation?.hotel_id || (Array.isArray(reservation) ? reservation[0]?.hotel_id : null);

        // 2. Handle parking reservations if any
        const parkingCombos = reservationCombos.value.filter(c => c.reservation_type === 'parking');
        //console.log('Found parking combos:', parkingCombos);

        if (parkingCombos.length > 0) {
            //console.log('Processing parking assignments for reservation ID:', reservationId);

            // One assignment per parking combo, backend will expand it further
            const assignments = parkingCombos.map((parkingCombo, _index) => {


                return {
                    hotel_id: hotelId,
                    reservation_id: reservationId,
                    vehicle_category_id: parkingCombo.vehicle_category_id,
                    check_in: parkingCombo.check_in,
                    check_out: parkingCombo.check_out,
                    number_of_vehicles: parkingCombo.number_of_rooms || 1,
                    unit_price: parkingCombo.addon_price || 0,
                    created_by: reservation.created_by,
                    updated_by: reservation.updated_by,
                    status: 'reserved'
                };
            });

            //console.log('Final assignments to be saved:', assignments);

            // Save all parking assignments
            if (assignments.length > 0) {
                try {
                    await saveParkingAssignments(assignments);
                    //console.log('Successfully saved parking assignments');
                } catch (error) {
                    console.error('Error saving parking assignments:', error);
                    throw error;
                }
            }
        } else {
            //console.log('No parking combos to process');
        }

        // Show success message and reset form
        toast.add({ severity: 'success', summary: '成功', detail: '予約が作成されました。', life: 3000 });
        await fetchMyHoldReservations();
        await goToEditReservationPage(reservation.id);
        reservationCombos.value = [];
        closeDialog();

    } catch (error) {
        console.error('Error creating reservation:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '予約の作成中にエラーが発生しました。',
            life: 5000,
        });
    } finally {
        isSubmitting.value = false;
    }
};

// Helper function to consolidate stay reservations (you'll need to implement this based on your existing logic)
function consolidateStayReservations(stayReservationCombos) {
    // This should contain the same logic that's used to create consolidatedCombos.value
    // but only for stay-type reservations
    const consolidated = {};

    stayReservationCombos.forEach((combo, _index) => {
        const key = combo.room_type_id.toString();
        if (!consolidated[key]) {
            consolidated[key] = {
                room_type_id: combo.room_type_id,
                room_type_name: combo.room_type_name,
                totalRooms: 0,
                totalPeople: 0,
                roomCapacities: []
            };
        }

        // Use number_of_rooms from the combo, not just count combos
        const numberOfRooms = combo.number_of_rooms || 1;
        consolidated[key].totalRooms += numberOfRooms;

        // Add the people count for this combo
        const totalPeopleInCombo = combo.number_of_people || numberOfRooms; // fallback to number of rooms if people not specified
        consolidated[key].totalPeople += totalPeopleInCombo;

        // Create room capacities array - distribute people across rooms
        const peoplePerRoom = Math.ceil(totalPeopleInCombo / numberOfRooms);
        for (let i = 0; i < numberOfRooms; i++) {
            consolidated[key].roomCapacities.push(peoplePerRoom);
        }
    });

    return consolidated;
}

const goToEditReservationPage = async (reservation_id) => {
    await setReservationId(reservation_id);

    router.push({ name: 'ReservationEdit', params: { reservation_id: reservation_id } });
};

const maxParkingSpots = ref(0);
const parkingCapacityInfo = ref({
    netAvailable: 0,
    grossCapacity: 0,
    blockedCapacity: 0,
    reservedCapacity: 0
});
const parkingCapacityByDate = ref({});

const updateParkingSpots = async () => {
    if (!comboRow.value.vehicle_category_id || !comboRow.value.check_in || !comboRow.value.check_out) {
        maxParkingSpots.value = 0;
        availableParkingSpots.value = [];
        parkingCapacityInfo.value = {
            netAvailable: 0,
            grossCapacity: 0,
            blockedCapacity: 0,
            reservedCapacity: 0
        };
        return;
    }

    try {
        // Generate array of dates from check-in to check-out (excluding check-out date)
        const checkInDate = new Date(comboRow.value.check_in);
        const checkOutDate = new Date(comboRow.value.check_out);
        const datesToCheck = [];
        
        const currentDate = new Date(checkInDate);
        while (currentDate < checkOutDate) {
            datesToCheck.push(formatDate(new Date(currentDate)));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        console.log('[ReservationsNewCombo] Calling checkRealTimeAvailability with:', {
            hotelId: selectedHotelId.value,
            vehicleCategoryId: comboRow.value.vehicle_category_id,
            checkIn: formatDate(new Date(comboRow.value.check_in)),
            checkOut: formatDate(new Date(comboRow.value.check_out)),
            datesToCheck
        });

        const response = await checkRealTimeAvailability(
            selectedHotelId.value,
            comboRow.value.vehicle_category_id,
            datesToCheck,
            null // excludeReservationId - null for new reservations
        );

        console.log('[ReservationsNewCombo] checkRealTimeAvailability response:', response);
        console.log('[ReservationsNewCombo] dateAvailability:', response.dateAvailability);
        console.log('[ReservationsNewCombo] fullyAvailableSpots:', response.fullyAvailableSpots);

        // Store the available spots (fully available across all dates)
        availableParkingSpots.value = response.fullyAvailableSpots || [];
        
        // Store capacity by date for detailed validation
        // The response uses dateAvailability, not availabilityByDate
        parkingCapacityByDate.value = response.dateAvailability || {};
        
        // Use available spots (accounts for blocks)
        // The minimum available across all dates is the limiting factor
        let minAvailable = 0;
        if (response.dateAvailability && Object.keys(response.dateAvailability).length > 0) {
            const availableValues = Object.values(response.dateAvailability).map(d => {
                console.log('[ReservationsNewCombo] Date capacity:', d);
                // Calculate net available: availableSpots - blockedSpots
                const netAvailable = (d.availableSpots || 0) - (d.blockedSpots || 0);
                return Math.max(0, netAvailable);
            });
            minAvailable = Math.min(...availableValues);
            console.log('[ReservationsNewCombo] Available values per date:', availableValues, 'Min:', minAvailable);
        }
        
        maxParkingSpots.value = minAvailable;

        // Store detailed capacity info for display (aggregate across all dates)
        if (response.dateAvailability) {
            const dates = Object.keys(response.dateAvailability);
            const firstDate = dates[0];
            const dateInfo = response.dateAvailability[firstDate];
            
            // Find max blocked capacity across all dates for display
            const maxBlockedCapacity = Math.max(
                ...Object.values(response.dateAvailability).map(d => d.blockedSpots || 0)
            );
            
            parkingCapacityInfo.value = {
                netAvailable: minAvailable,
                grossCapacity: dateInfo.totalCompatibleSpots || 0,
                blockedCapacity: maxBlockedCapacity,
                reservedCapacity: dateInfo.occupiedSpots || 0
            };
        }

        console.log('[ReservationsNewCombo] Parking capacity:', {
            maxParkingSpots: maxParkingSpots.value,
            capacityInfo: parkingCapacityInfo.value
        });

        // Ensure the current value doesn't exceed the new max
        if (comboRow.value.number_of_rooms > maxParkingSpots.value) {
            comboRow.value.number_of_rooms = Math.max(0, maxParkingSpots.value);
        }
    } catch (error) {
        console.error('[ReservationsNewCombo] Failed to fetch parking spot availability:', error);
        maxParkingSpots.value = 0;
        availableParkingSpots.value = [];
        parkingCapacityInfo.value = {
            netAvailable: 0,
            grossCapacity: 0,
            blockedCapacity: 0,
            reservedCapacity: 0
        };
    }
};

watch(() => [comboRow.value.vehicle_category_id, comboRow.value.check_in, comboRow.value.check_out], async (newValues, oldValues) => {
    console.log('[ReservationsNewCombo] Watch triggered:', {
        newValues,
        oldValues,
        vehicleCategoryId: comboRow.value.vehicle_category_id,
        checkIn: comboRow.value.check_in,
        checkOut: comboRow.value.check_out
    });
    
    if (comboRow.value.vehicle_category_id && comboRow.value.check_in && comboRow.value.check_out) {
        console.log('[ReservationsNewCombo] Calling updateParkingSpots from watch');
        await updateParkingSpots();
    } else {
        console.log('[ReservationsNewCombo] Watch triggered but conditions not met');
    }
}, { deep: true });

const selectedAddon = ref(null);
const addonOptions = ref([]);

const fetchParkingAddons = async () => {
    if (!selectedHotelId.value) return;

    try {
        const allAddons = await fetchAllAddons(selectedHotelId.value);
        if (allAddons && Array.isArray(allAddons)) {
            const parkingAddons = allAddons.filter(addon => addon.addon_type === 'parking');
            addonOptions.value = parkingAddons;

            // Auto-select first addon if available
            if (parkingAddons.length > 0 && !selectedAddon.value) {
                selectedAddon.value = parkingAddons[0].id;
            }
        }
    } catch (error) {
        console.error('Failed to fetch parking addons:', error);
        toast.add({
            severity: 'error',
            summary: 'エラー',
            detail: '駐車場アドオンの取得に失敗しました',
            life: 3000
        });
    }
};

const hasStayReservation = computed(() => {
    return reservationCombos.value.some(combo => combo.reservation_type === 'stay');
});

const isSubmitting = ref(false);
const isSubmittingBlock = ref(false);

const multiBlockDialogVisible = ref(false);
const blockComment = ref('');

const openMultiBlockDialog = () => {
    multiBlockDialogVisible.value = true;
};

const submitMultiBlock = async () => {
    if (!blockComment.value.trim()) {
        toast.add({ severity: 'warn', summary: 'コメントを入力してください', life: 3000 });
        return;
    }

    isSubmittingBlock.value = true;

    try {
        // Get the first stay reservation to get check-in/check-out dates
        const stayReservation = reservationCombos.value.find(combo => combo.reservation_type === 'stay');
        if (!stayReservation) {
            throw new Error('宿泊予約が見つかりません');
        }
        
        // Get unique room types and their counts
        const roomTypeCounts = {};
        reservationCombos.value
            .filter(combo => combo.reservation_type === 'stay')
            .forEach(combo => {
                if (!roomTypeCounts[combo.room_type_id]) {
                    roomTypeCounts[combo.room_type_id] = 0;
                }
                roomTypeCounts[combo.room_type_id] += combo.number_of_rooms;
            });
        
        // Get parking combos
        const parkingCombos = reservationCombos.value
            .filter(combo => combo.reservation_type === 'parking')
            .map(combo => ({
                vehicle_category_id: combo.vehicle_category_id,
                number_of_rooms: combo.number_of_rooms
            }));

        // Prepare the request data
        const requestData = {
            hotel_id: selectedHotelId.value,
            check_in: formatDate(stayReservation.check_in),
            check_out: formatDate(stayReservation.check_out),
            room_type_counts: roomTypeCounts,
            parking_combos: parkingCombos, // Add parking combos
            comment: blockComment.value.trim(),
            number_of_people: stayReservation.number_of_people
        };
        
        // Call the API
        const response = await blockMultipleRooms(requestData);
        
        if (response.success) {
            toast.add({ 
                severity: 'success', 
                summary: '部屋を仮ブロックしました',
                detail: `${response.blocked_rooms}部屋をブロックしました`,
                life: 5000 
            });
            
            // Reset the form
            multiBlockDialogVisible.value = false;
            blockComment.value = '';
            
            // Emit events to refresh the parent component
            emit('block-success', response);
            emit('refresh-calendar');
            
            // Refresh room and parking availability
            await checkDates();
            await updateParkingSpots();

            // If we have reservation IDs, we could store them for future reference
            if (response.room_ids?.length > 0) {
                //console.log('Created temporary block reservations:', response.room_ids);
            }
        } else {
            throw new Error(response.message || '部屋のブロックに失敗しました');
        }
    } catch (error) {
        console.error('Error blocking rooms:', error);
        
        let errorMessage = error.message || '部屋のブロック中にエラーが発生しました';
        
        // Handle specific error cases
        if (error.error?.includes('予約は既に登録されています')) {
            errorMessage = '選択された日付には既に予約が入っている部屋があります。';
        } else if (error.status === 400) {
            errorMessage = `リクエストが無効です: ${errorMessage}`;
        } else if (error.status === 404) {
            errorMessage = '指定されたリソースが見つかりませんでした。';
        }
        
        toast.add({ 
            severity: 'error', 
            summary: 'エラー',
            detail: errorMessage,
            life: 5000 
        });
    } finally {
        isSubmittingBlock.value = false;
    }
};

const emit = defineEmits(['refresh-calendar', 'block-success']);

onMounted(async () => {
    await fetchHotels();
    await fetchHotel();
    await checkDates();
    await fetchVehicleCategories(); // Add this line to fetch vehicle categories
    await updateParkingSpots();

    comboRow.value.room_type_id = roomTypes.value[0].room_type_id;
    reservationDetails.value.hotel_id = selectedHotelId.value;

    if (clients.value.length === 0) {
        fetchAllClientsForFiltering();
    }
});

watch(() => comboRow.value.number_of_rooms,
    (newRooms) => {
        if (comboRow.value.number_of_people < newRooms) {
            comboRow.value.number_of_people = newRooms;
        }
    }
);
watch(totalPeople, (newTotal) => {
    reservationDetails.value.number_of_people = newTotal;
});

watch(() => selectedHotelId.value,
    async (newId) => {
        if (!newId) {
            addonOptions.value = [];
            selectedAddon.value = null;
            return;
        }

        await Promise.all([
            fetchHotels(),
            fetchHotel(),
            fetchParkingAddons()
        ]);
        
        await checkDates();
        await updateParkingSpots();

        comboRow.value.room_type_id = roomTypes.value[0]?.room_type_id || null;
        reservationDetails.value.hotel_id = newId;
    },
    { immediate: true }
);
</script>