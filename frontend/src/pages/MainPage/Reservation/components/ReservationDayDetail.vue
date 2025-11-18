<template>
    <div class="p-2">
        <Card class="m-2">
            <template #title>
                {{ drawerHeader }}
            </template>
            <template #content>
                <div class="p-fluid">
                    <Tabs value="0">
                        <TabList>
                            <Tab value="0">プラン</Tab>
                            <Tab value="1">部屋移動</Tab>
                            <Tab value="2">宿泊者</Tab>
                            <Tab value="3">キャンセル</Tab>
                        </TabList>
                        <TabPanels>
                            <!-- Tab 1: Change Plan and Addon -->
                            <TabPanel value="0">
                                <form @submit.prevent="savePlan">
                                    <Card class="mb-2">
                                        <template #title>プラン</template>
                                        <template #content>
                                            <div class="field mt-8">
                                                <FloatLabel>
                                                    <Select v-model="selectedPlan" :options="plans" optionLabel="name"
                                                        optionValue="plan_key" fluid @change="updatePlanAddOns" />
                                                    <label>プラン選択</label>
                                                </FloatLabel>
                                            </div>
                                            <div class="grid grid-cols-2">
                                                <div class="field flex flex-col mt-6">
                                                    <FloatLabel>
                                                        <InputText v-model="planBillType" fluid filled disabled>
                                                        </InputText>
                                                        <label>請求種類</label>
                                                    </FloatLabel>
                                                </div>
                                                <div class="field flex flex-col ml-2 mt-6">
                                                    <FloatLabel>
                                                        <InputNumber v-model="planTotalRate" disabled fluid>
                                                        </InputNumber>
                                                        <label>プラン料金</label>
                                                    </FloatLabel>
                                                </div>
                                            </div>
                                            <Divider />
                                            <form @submit.prevent="addRate">
                                                <div class="grid grid-cols-2 gap-1">
                                                    <div class="field mt-6">
                                                        <FloatLabel>
                                                            <Select v-model="newRate.adjustment_type"
                                                                :options="adjustmentTypes" optionLabel="label"
                                                                optionValue="id" fluid />
                                                            <label>料金種類</label>
                                                        </FloatLabel>
                                                    </div>
                                                    <div class="field mt-6">
                                                        <FloatLabel>
                                                            <Select v-model="newRate.tax_type_id" :options="taxTypes"
                                                                optionLabel="name" optionValue="id" fluid />
                                                            <label>税区分</label>
                                                        </FloatLabel>
                                                    </div>
                                                    <div class="field mt-6 col-span-2">
                                                        <div class="flex items-center">
                                                            <Checkbox v-model="newRate.include_in_cancel_fee"
                                                                inputId="newRateIncludeInCancelFee" :binary="true"
                                                                :disabled="!(newRate.adjustment_type === 'flat_fee' || newRate.adjustment_type === 'percentage')" />
                                                            <label for="newRateIncludeInCancelFee" class="ml-2">キャンセル料に含める</label>
                                                        </div>
                                                    </div>
                                                    <div class="field mt-6 col-span-2 flex justify-center">
                                                        <Button label="追加" type="submit" :loading="isSubmitting"
                                                            :disabled="isSubmitting" />
                                                    </div>
                                                </div>
                                            </form>
                                            <Divider />
                                            <div class="field mt-6">
                                                <DataTable :value="selectedRates" class="p-datatable-sm datatable-tall-rows">
                                                    <Column header="料金種類" style="width:30%">
                                                        <template #body="slotProps">
                                                            <div>
                                                                <div class="grid grid-cols-1">
                                                                    <Badge
                                                                        :severity="slotProps.data.adjustment_type === 'percentage' ? 'info' : slotProps.data.adjustment_type === 'flat_fee' ? 'secondary' : ''">
                                                                        {{
                                                                        defineRateType(slotProps.data.adjustment_type)
                                                                        }}
                                                                    </Badge>
                                                                    <Badge v-if="(slotProps.data.adjustment_type === 'flat_fee' || slotProps.data.adjustment_type === 'percentage') && slotProps.data.include_in_cancel_fee"
                                                                        value="キャンセル料対象"
                                                                        severity="danger">
                                                                    </Badge>
                                                                </div>
                                                                <div>
                                                                    <Select v-model="slotProps.data.tax_type_id"
                                                                        :options="taxTypes" optionLabel="name"
                                                                        optionValue="id"
                                                                        @change="updateTaxRate(slotProps.data)" fluid />
                                                                </div>
                                                            </div>
                                                        </template>
                                                    </Column>
                                                    <Column header="数値" style="width:30%">
                                                        <template #body="slotProps">
                                                            <InputNumber v-model="slotProps.data.adjustment_value"
                                                                placeholder="数値を記入"
                                                                @update:modelValue="recalculatePrice(slotProps.data)"
                                                                fluid />
                                                        </template>
                                                    </Column>
                                                    <Column header="税込金額" style="width:30%">
                                                        <template #body="slotProps">
                                                            {{ formatCurrency(slotProps.data.price) }}
                                                        </template>
                                                    </Column>
                                                    <Column header="操作" style="width:10%">
                                                        <template #body="slotProps">
                                                            <Button icon="pi pi-trash"
                                                                class="p-button-text p-button-danger p-button-sm"
                                                                @click="deleteRate(slotProps.data)" />
                                                        </template>
                                                    </Column>
                                                </DataTable>
                                            </div>
                                        </template>
                                    </Card>
                                    <Card>
                                        <template #title>アドオン</template>
                                        <template #content>
                                            <div class="grid grid-cols-4">
                                                <div class="field col-span-3 mt-8">
                                                    <FloatLabel>
                                                        <Select v-model="selectedAddonOption" :options="addonOptions"
                                                            optionLabel="addon_name" showClear fluid />
                                                        <label>アドオン選択</label>
                                                    </FloatLabel>
                                                </div>
                                                <div class="field col mt-8 ml-2">
                                                    <Button label="追加" @click="generateAddonPreview" />
                                                </div>
                                            </div>

                                            <Divider />
                                            <div class="field mt-6">
                                                <DataTable :value="selectedAddon" class="p-datatable-sm">
                                                    <Column field="addon_name" header="アドオン名" style="width:40%" />
                                                    <Column field="quantity" header="数量">
                                                        <template #body="slotProps">
                                                            <InputNumber v-model="slotProps.data.quantity" :min="0"
                                                                placeholder="数量を記入" fluid />
                                                        </template>
                                                    </Column>
                                                    <Column field="price" header="単価">
                                                        <template #body="slotProps">
                                                            <InputNumber v-model="slotProps.data.price" :min="0"
                                                                placeholder="価格を記入" fluid />
                                                        </template>
                                                    </Column>
                                                    <Column header="操作">
                                                        <template #body="slotProps">
                                                            <Button icon="pi pi-trash"
                                                                class="p-button-text p-button-danger p-button-sm"
                                                                @click="deleteAddon(slotProps.data)" />
                                                        </template>
                                                    </Column>
                                                </DataTable>
                                            </div>
                                        </template>
                                    </Card>
                                    <Divider />
                                    <div class="field-checkbox flex justify-center mt-4 mb-4">
                                        <Checkbox id="disableRounding" v-model="disableRounding" :binary="true" />
                                        <label for="disableRounding" class="ml-2">端数処理を上書きする</label>
                                    </div>
                                    <div class="flex justify-center items-center">
                                        <Button label="保存" severity="info" type="submit" :loading="isSubmitting"
                                            :disabled="isSubmitting" />
                                    </div>
                                </form>
                            </TabPanel>
                            <!-- Tab 2: Move Rooms -->
                            <TabPanel value="1">
                                <form @submit.prevent="saveRoom">
                                    <div class="grid grid-cols-2 gap-2">
                                        <div class="mt-6 col-span-1">
                                            <FloatLabel>
                                                <InputNumber id="move-people" v-model="numberOfPeopleToMove"
                                                    :min="numberOfPeopleToMove" :max="numberOfPeopleToMove" filled
                                                    disabled />
                                                <label for="move-people">人数</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="mt-6 col-span-1">
                                            <FloatLabel>
                                                <Select id="move-room" v-model="targetRoom" :options="filteredRooms"
                                                    optionLabel="label" showClear fluid />
                                                <label for="move-room">部屋へ移動</label>
                                            </FloatLabel>
                                        </div>
                                    </div>
                                    <Divider />
                                    <div class="flex justify-center items-center">
                                        <Button label="保存" severity="info" type="submit" :loading="isSubmitting"
                                            :disabled="isSubmitting" />
                                    </div>
                                </form>
                            </TabPanel>
                            <!-- Tab 3: Guests -->
                            <TabPanel value="2">
                                <div class="field mt-6">
                                    <DataTable :value="selectedClients" class="p-datatable-sm">
                                        <Column field="display_name" header="宿泊者名" style="width:50%" />
                                        <Column field="phone" header="電話番号" style="width:25%" />
                                        <Column field="email" header="メールアドレス" style="width:25%" />
                                    </DataTable>
                                </div>
                            </TabPanel>
                            <!-- Tab 4: Cancel -->
                            <TabPanel value="3">
                                <div class="mb-3">
                                    <p>キャンセルをクリックすると、キャンセル料が適用されるかどうかの確認ダイアログが表示されます。適用される場合、キャンセル料対象としてマークされた料金項目（例：基本料金、割合料金、固定料金）が請求されます。</p>
                                </div>
                                <div v-if="!reservationCancelled" class="flex justify-center items-center">
                                    <Button :label="isSubmitting ? '処理中...' : 'キャンセル'" @click="dayCancel"
                                        :disabled="isSubmitting"
                                        :icon="isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-times'"
                                        class="p-button-danger" />
                                </div>
                                <div v-else class="flex justify-center items-center gap-2">
                                    <Button :label="isSubmitting ? '処理中...' : '復活'" @click="dayRecover"
                                        :disabled="isSubmitting"
                                        :icon="isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-history'"
                                        class="p-button-warn" />
                                    <Button :label="isSubmitting ? '処理中...' : 'キャンセル変更'" @click="dayCancel"
                                        :disabled="isSubmitting"
                                        :icon="isSubmitting ? 'pi pi-spin pi-spinner' : 'pi pi-times'"
                                        class="p-button-danger" />
                                </div>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </div>
            </template>
        </Card>
        <ConfirmDialog group="cancel-day"></ConfirmDialog>
    </div>
</template>

<script setup>
// Vue
import { ref, watch, onMounted } from 'vue';

const props = defineProps({
    reservation_details: {
        type: [Object],
        required: true,
    },
});

// Primevue
import { useToast } from 'primevue/usetoast';
const toast = useToast();
import { useConfirm } from "primevue/useconfirm";
const confirm = useConfirm();
import { Card, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, FloatLabel, Select, InputText, InputNumber, Button, Badge, Divider, ConfirmDialog, Checkbox } from 'primevue';

// Stores    
import { useReservationStore } from '@/composables/useReservationStore';
const { availableRooms, fetchReservationDetail, fetchAvailableRooms, setReservationPlan, setReservationAddons, setReservationRoom, setReservationDetailStatus } = useReservationStore();
import { usePlansStore } from '@/composables/usePlansStore';
const { plans, addons, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons, fetchPlanRate, fetchPlanRates } = usePlansStore();
import { useSettingsStore } from '@/composables/useSettingsStore';
const { taxTypes, fetchTaxTypes } = useSettingsStore();

// Helper
const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};
const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const drawerHeader = ref('読込中...');
const reservationDetail = ref(null);

// Plan
const selectedPlan = ref(null);
const newRate = ref({
    tax_type_id: 3,
    adjustment_type: 'base_rate',
    include_in_cancel_fee: true,
});
const selectedRates = ref(null);
const planBillType = ref(null);
const planTotalRate = ref(0);
const adjustmentTypes = ref([
    { id: 'base_rate', label: '基本料金' },
    { id: 'percentage', label: 'パーセント' },
    { id: 'flat_fee', label: '定額料金' },
]);

const defineRateType = (type) => {
    if (type === 'base_rate') {
        return '基本料金'
    }
    if (type === 'percentage') {
        return 'パーセント'
    }
    if (type === 'flat_fee') {
        return '定額料金'
    }
    return '未設定'
};
const updateTaxRate = (tax) => {
    const selectedTax = taxTypes.value.find(t => t.id === tax.tax_type_id);
    tax.tax_rate = selectedTax ? selectedTax.percentage : 0;
};
const recalculatePrice = (rate) => {
    // Find baseRate
    planTotalRate.value = planTotalRate.value - rate.price;
    let baseRate = selectedRates.value
        .filter(r => r.adjustment_type === 'base_rate')
        .reduce((sum, r) => sum + parseFloat(r.adjustment_value), 0);

    // Update the price for the changed rate
    if (rate.adjustment_type === 'percentage') {
        rate.price = Math.round((baseRate * (rate.adjustment_value / 100)) * 100) / 100;
    } else {
        rate.price = rate.adjustment_value;
    }
    planTotalRate.value = planTotalRate.value + rate.price;
};
const addRate = () => {
    if (newRate.value.adjustment_type && newRate.value.tax_type_id) {
        const selectedTax = taxTypes.value.find(t => t.id === newRate.value.tax_type_id);

        selectedRates.value.push({
            adjustment_type: newRate.value.adjustment_type,
            tax_type_id: newRate.value.tax_type_id,
            tax_rate: selectedTax ? selectedTax.percentage : 0,
            adjustment_value: 0,
            price: 0,
            include_in_cancel_fee: newRate.value.include_in_cancel_fee,
        });    
    } else {
        console.error("Please select both adjustment type and tax type");
    }
};
const deleteRate = (rate) => {
    const index = selectedRates.value.indexOf(rate);
    if (index !== -1) {
        selectedRates.value.splice(index, 1);
    }
};
// Addons
const selectedAddon = ref(null);
const addonOptions = ref(null);
const selectedAddonOption = ref(null);
const updatePlanAddOns = async (event) => {
    // console.log('Selected Plan:', event.value);           
    const selectedPlanObject = plans.value.find(plan => plan.plan_key === selectedPlan.value);

    // console.log('selectedPlanObject',selectedPlanObject)
    if (selectedPlan.value) {
        const gid = selectedPlanObject.plans_global_id ?? 0;
        const hid = selectedPlanObject.plans_hotel_id ?? 0;
        const hotel_id = props.reservation_details.hotel_id ?? 0;

        try {
            await fetchPlanAddons(gid, hid, hotel_id);
            planTotalRate.value = await fetchPlanRate(gid, hid, hotel_id, reservationDetail.value.date);
            reservationDetail.value.plan_total_price = planTotalRate.value;

            // Calculate price in rates
            selectedRates.value = await fetchPlanRates(gid, hid, hotel_id, reservationDetail.value.date);
            let baseRate = selectedRates.value
                .filter(rate => rate.adjustment_type === 'base_rate')
                .reduce((sum, rate) => sum + parseFloat(rate.adjustment_value), 0);
            selectedRates.value = selectedRates.value.map(rate => {
                if (rate.adjustment_type === 'percentage') {
                    rate.price = Math.round((baseRate * (rate.adjustment_value / 100)) * 100) / 100;
                } else {
                    rate.price = rate.adjustment_value;
                }
                return rate;
            });

            const gidFixed = gid === 0 ? null : gid;
            const hidFixed = hid === 0 ? null : hid;
            const selectedPlan = plans.value.find(plan =>
                plan.plans_global_id === gidFixed && plan.plans_hotel_id === hidFixed
            );
            planBillType.value = selectedPlan ? selectedPlan.plan_type : null;
            planBillType.value = selectedPlan.value === 'per_person'
                ? '人数あたり'
                : '部屋あたり';

        } catch (error) {
            console.error('Failed to fetch plan add-ons:', error);
            addons.value = [];
        }
    }
};
const generateAddonPreview = () => {
    // Check
    if (!selectedAddonOption.value) {
        toast.add({ severity: 'warn', summary: '注意', detail: 'アドオン選択されていません。', life: 3000 });
        return
    }

    // console.log('selectedAddonOption in select:', selectedAddonOption.value);

    const foundAddon = addonOptions.value.find(addon => addon.addons_global_id === selectedAddonOption.value.addons_global_id && addon.addons_hotel_id === selectedAddonOption.value.addons_hotel_id);
    const isHotelAddon = foundAddon.id.startsWith('H');
    // console.log('selectedAddon:',selectedAddon.value);
    // console.log('selectedAddonOption:', selectedAddonOption.value);            
    selectedAddon.value.push({
        addons_global_id: isHotelAddon ? null : foundAddon.id,
        addons_hotel_id: isHotelAddon ? foundAddon.id.replace('H', '') : null,
        hotel_id: foundAddon.hotel_id,
        addon_name: foundAddon.addon_name,
        price: foundAddon.price,
        quantity: reservationDetail.value.number_of_people,
        tax_type_id: foundAddon.tax_type_id,
        tax_rate: foundAddon.tax_rate
    });
    // console.log('generateAddonPreview', selectedAddon.value)          
};
const deleteAddon = (addon) => {
    const index = selectedAddon.value.indexOf(addon);
    if (index !== -1) {
        selectedAddon.value.splice(index, 1);
    }
};
const savePlan = async () => {
    isSubmitting.value = true;
    try {
        //console.log('savePlan:', selectedRates.value);

        const plan_key = selectedPlan.value;
        let plans_global_id = 0;
        let plans_hotel_id = 0;
        let plan_name = '';
        let plan_type = '';
        let selectedPlanObject = null;

        if (plan_key) {
            const [global, hotel] = plan_key.split('h').map(Number);
            plans_global_id = global || 0;
            plans_hotel_id = hotel || 0;
            selectedPlanObject = plans.value.find(plan => plan.plan_key === plan_key);
            if (selectedPlanObject) {
                plan_name = selectedPlanObject.name;
                plan_type = selectedPlanObject.plan_type;
            }
        }

        const price = planTotalRate.value || 0;

        if (selectedPlanObject) {
            const filteredRates = selectedRates.value.filter(rate => rate.adjustment_value !== 0);
            await setReservationPlan(props.reservation_details.id, props.reservation_details.hotel_id, selectedPlanObject, filteredRates, price, disableRounding.value);
        }

        const addonDataArray = selectedAddon.value.map(addon => ({
            hotel_id: props.reservation_details.hotel_id,
            addons_global_id: addon.addons_global_id,
            addons_hotel_id: addon.addons_hotel_id,
            addon_name: addon.addon_name,
            quantity: addon.quantity,
            price: addon.price,
            tax_type_id: addon.tax_type_id,
            tax_rate: addon.tax_rate
        }));

        // console.log('addonDataArray:', addonDataArray);

        await setReservationAddons(props.reservation_details.id, props.reservation_details.hotel_id, addonDataArray);

        const data = await fetchReservationDetail(props.reservation_details.id, props.reservation_details.hotel_id);
        reservationDetail.value = data.reservation[0];

        toast.add({ severity: 'success', summary: '成功', detail: '予約が編集されました。', life: 3000 });
    } catch (error) {
        console.error('Error saving plan:', error);
        // Show error toast if needed
    } finally {
        isSubmitting.value = false;
    }
};

// Room
const targetRoom = ref(null);
const numberOfPeopleToMove = ref(0);
const filteredRooms = ref(null);
const saveRoom = async () => {
    isSubmitting.value = true;
    try {
        // console.log('targetRoom', targetRoom.value.value);
        await setReservationRoom(props.reservation_details.id, targetRoom.value.value);

        const data = await fetchReservationDetail(props.reservation_details.id, props.reservation_details.hotel_id);
        reservationDetail.value = data.reservation[0];

        toast.add({ severity: 'success', summary: '成功', detail: '予約が編集されました。', life: 3000 });

    } catch (error) {
        console.error('Error saving room:', error);
        // Show error toast if needed
    } finally {
        isSubmitting.value = false;
    }
};

// Clients
const selectedClients = ref(null);



// Cancel
const reservationCancelled = ref(false);
const isSubmitting = ref(false);
const disableRounding = ref(false);
const dayCancel = async () => {
    isSubmitting.value = true;
    try {
        confirm.require({
            group: 'cancel-day',
            message: 'キャンセル料の有無を選択してください。',
            header: 'キャンセル確認',
            icon: 'pi pi-exclamation-triangle',
            accept: async () => {
                await setReservationDetailStatus(props.reservation_details.id, props.reservation_details.hotel_id, 'cancelled', true);
                reservationCancelled.value = true;
                toast.add({ severity: 'warn', summary: 'キャンセル', detail: '予約がキャンセルされました。', life: 3000 });
            },
            reject: async () => {
                await setReservationDetailStatus(props.reservation_details.id, props.reservation_details.hotel_id, 'cancelled', false);
                reservationCancelled.value = true;
                toast.add({ severity: 'warn', summary: 'キャンセル', detail: '予約がキャンセルされました。', life: 3000 });
            },
            acceptLabel: 'キャンセル料発生',
            acceptClass: 'p-button-danger',
            acceptIcon: 'pi pi-dollar',
            rejectLabel: 'キャンセル料無し',
            rejectClass: 'p-button-success',
            rejectIcon: 'pi pi-check',
        });
    } catch (error) {
        console.error('Error cancelling:', error);
        // Show error toast if needed
    } finally {
        isSubmitting.value = false;
    }
};
const dayRecover = async () => {
    isSubmitting.value = true;
    try {
        await setReservationDetailStatus(props.reservation_details.id, props.reservation_details.hotel_id, 'recovered');

        reservationCancelled.value = false;

        toast.add({ severity: 'success', summary: '成功', detail: '予約が復活されました。', life: 3000 });
    } catch (error) {
        console.error('Error recovering:', error);
        // Show error toast if needed
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(async () => {
    // console.log('onMounted ReservationDayDetail:', props.reservation_details);
    const data = await fetchReservationDetail(props.reservation_details.id, props.reservation_details.hotel_id);
    reservationDetail.value = data.reservation[0];
    reservationCancelled.value = props.reservation_details.cancelled ? true : false;

    // Header
    drawerHeader.value = props.reservation_details.date + '：' + props.reservation_details.room_number + '号室 ' + props.reservation_details.room_type_name;
    selectedPlan.value = (props.reservation_details.plans_global_id ?? '') + 'h' + (props.reservation_details.plans_hotel_id ?? '');

    await fetchTaxTypes();
    // Current Plan
    selectedRates.value = reservationDetail.value.reservation_rates.map(rate => ({
        ...rate,
    }));
    selectedAddon.value = reservationDetail.value.reservation_addons
        .filter(addon => addon.addon_type !== 'parking')
        .map(addon => ({
            ...addon,
        }));

    // Fetch Options
    await fetchPlansForHotel(props.reservation_details.hotel_id);
    const allAddons = await fetchAllAddons(props.reservation_details.hotel_id);
    addonOptions.value = allAddons.filter(addon => addon.addon_type !== 'parking');

    selectedClients.value = props.reservation_details.reservation_clients.map(client => ({
        ...client,
        display_name: client.name_kanji
            ? `${client.name_kanji}${client.name_kana ? '（' + client.name_kana + '）' : ''}`
            : `${client.name}${client.name_kana ? '（' + client.name_kana + '）' : ''}`
    }));

    planBillType.value = props.reservation_details.plan_type === 'per_person'
        ? '人数あたり'
        : '部屋あたり';
    planTotalRate.value = props.reservation_details.plan_total_price;

    // Room
    numberOfPeopleToMove.value = props.reservation_details.number_of_people;

    const endDate = new Date(props.reservation_details.date);
    endDate.setDate(endDate.getDate() + 1);
    await fetchAvailableRooms(props.reservation_details.hotel_id, props.reservation_details.date, formatDate(endDate));

    filteredRooms.value = availableRooms.value
        .filter(room => room.capacity >= numberOfPeopleToMove.value)
        .filter(room => room.room_id !== props.reservation_details.room_id)
        .map(room => ({
            label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
            value: room.room_id,
        }));
});


// Watcher    
watch(addons, (newValue, oldValue) => {
    if (newValue !== oldValue) {
        // console.log('addons changed:', newValue);            
        selectedAddon.value = newValue
            .filter(addon => addon.addon_type !== 'parking')
            .map(addon => ({
                ...addon,
                quantity: reservationDetail.value.number_of_people
            }));
    }
}, { deep: true });

watch(() => newRate.value.adjustment_type, (newType) => {
    if (newType === 'base_rate') {
        newRate.value.include_in_cancel_fee = true;
    } else if (newType === 'flat_fee') {
        newRate.value.include_in_cancel_fee = false;
    } else if (newType === 'percentage') {
        newRate.value.include_in_cancel_fee = true;
    }
});
</script>

<style scoped></style>
