<template>
    <div class="p-2">
        <Card class="m-2">
            <template #title>
                {{ drawerHeader }}
            </template>
            <template #content>                
                <div class="p-fluid">
                    <Tabs 
                        value ="0"                        
                    >
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
                                                    <Select                                            
                                                        v-model="selectedPlan"
                                                        :options="plans"
                                                        optionLabel="name"
                                                        optionValue="plan_key"   
                                                        fluid                           
                                                        @change="updatePlanAddOns"
                                                    />
                                                    <label>プラン選択</label>
                                                </FloatLabel>
                                            </div>
                                            <div class="grid grid-cols-2">
                                                <div class="field flex flex-col mt-6">
                                                    <FloatLabel>
                                                        <InputText
                                                            v-model="planBillType"
                                                            fluid
                                                            filled
                                                            disabled
                                                        >
                                                        </InputText>
                                                        <label>請求種類</label>
                                                    </FloatLabel>
                                                </div>
                                                <div class="field flex flex-col ml-2 mt-6">
                                                    <FloatLabel>
                                                        <InputNumber
                                                            v-model="planTotalRate"
                                                            disabled
                                                            fluid
                                                        >
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
                                                            <Select
                                                                v-model="newRate.adjustment_type"
                                                                :options="adjustmentTypes"
                                                                optionLabel="label" 
                                                                optionValue="id"
                                                                fluid
                                                            />
                                                            <label>料金種類</label>
                                                        </FloatLabel>
                                                    </div>
                                                    <div class="field mt-6">
                                                        <FloatLabel>
                                                            <Select
                                                                v-model="newRate.tax_type_id"
                                                                :options="taxTypes"
                                                                optionLabel="name" 
                                                                optionValue="id"
                                                                fluid
                                                            />
                                                            <label>税区分</label>
                                                        </FloatLabel>
                                                    </div>
                                                    <div class="field mt-6 col-span-2 flex justify-center">
                                                        <Button label="追加" type="submit" />
                                                    </div>                                                
                                                </div>
                                            </form>
                                            <Divider />
                                            <div class="field mt-6">
                                                <DataTable :value="selectedRates" class="p-datatable-sm">
                                                    <Column header="料金種類" style="width:40%">
                                                        <template #body="slotProps">
                                                            <div class="grid grid-cols-3">
                                                                <div class="flex items-center">                        
                                                                    <Badge :severity="slotProps.data.adjustment_type === 'percentage' ? 'info' : slotProps.data.adjustment_type === 'flat_rate' ? 'secondary' : ''">
                                                                        {{ defineRateType(slotProps.data.adjustment_type) }}
                                                                    </Badge>
                                                                </div>
                                                                <div class="col-span-2">
                                                                    <Select 
                                                                        v-model="slotProps.data.tax_type_id" 
                                                                        :options="taxTypes"
                                                                        optionLabel="name" 
                                                                        optionValue="id"
                                                                        @change="updateTaxRate(slotProps.data)"
                                                                        fluid
                                                                    />
                                                                </div>
                                                            </div>
                                                        </template>
                                                    </Column>
                                                    <Column header="数値">
                                                        <template #body="slotProps">
                                                            <InputNumber 
                                                                v-model="slotProps.data.adjustment_value" 
                                                                :min="0" 
                                                                placeholder="数値を記入"
                                                                @update:modelValue="recalculatePrice(slotProps.data)"
                                                                fluid
                                                            />
                                                        </template>
                                                    </Column>
                                                    <Column header="税込金額">
                                                        <template #body="slotProps">
                                                            {{ formatCurrency(slotProps.data.price) }}
                                                        </template>                                                        
                                                    </Column>
                                                    <Column header="操作">
                                                        <template #body="slotProps">
                                                            <Button                                       
                                                            icon="pi pi-trash"
                                                            class="p-button-text p-button-danger p-button-sm"
                                                            @click="deleteRate(slotProps.data)" 
                                                            />
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
                                                        <Select
                                                            v-model="selectedAddonOption"
                                                            :options="addonOptions"
                                                            optionLabel="addon_name"       
                                                            showClear 
                                                            fluid
                                                            @change="onAddonSelectionChange"                             
                                                        />
                                                        <label>アドオン選択</label>
                                                    </FloatLabel>
                                                </div>
                                                <div class="field col mt-8 ml-2">
                                                    <Button label="追加" @click="generateAddonPreview" />
                                                </div>
                                            </div>
                                            
                                            <!-- Parking-specific addon selection -->
                                            <div v-if="isParkingAddon && showParkingSpotSelection" class="parking-addon-section">
                                                <Divider />
                                                <h6 class="parking-section-title">
                                                    <i class="pi pi-car"></i>
                                                    駐車場詳細設定
                                                </h6>
                                                
                                                <!-- Vehicle Category Selection -->
                                                <div class="field mt-6">
                                                    <FloatLabel>
                                                        <Select
                                                            v-model="selectedVehicleCategory"
                                                            :options="vehicleCategories"
                                                            optionLabel="name"
                                                            optionValue="id"
                                                            placeholder="車両カテゴリを選択"
                                                            fluid
                                                            @change="onVehicleCategoryChange"
                                                        >
                                                            <template #option="slotProps">
                                                                <div class="vehicle-category-option">
                                                                    <div>{{ slotProps.option.name }}</div>
                                                                    <small class="text-500">
                                                                        容量: {{ slotProps.option.capacity_units_required }} 単位
                                                                    </small>
                                                                </div>
                                                            </template>
                                                        </Select>
                                                        <label>車両カテゴリ *</label>
                                                    </FloatLabel>
                                                </div>

                                                <!-- Parking Spot Selection -->
                                                <div class="field mt-6" v-if="selectedVehicleCategory">
                                                    <FloatLabel>
                                                        <Select
                                                            v-model="selectedParkingSpot"
                                                            :options="compatibleSpots"
                                                            optionLabel="displayName"
                                                            optionValue="id"
                                                            placeholder="駐車スポットを選択"
                                                            fluid
                                                            @change="onParkingSpotChange"
                                                        >
                                                            <template #option="slotProps">
                                                                <div class="parking-spot-option">
                                                                    <div class="spot-header">
                                                                        <span class="spot-number">{{ slotProps.option.spotNumber }}</span>
                                                                        <span class="parking-lot-name">{{ slotProps.option.parkingLotName }}</span>
                                                                    </div>
                                                                    <small class="capacity-info">
                                                                        容量: {{ slotProps.option.capacityUnits }} 単位
                                                                    </small>
                                                                </div>
                                                            </template>
                                                        </Select>
                                                        <label>駐車スポット *</label>
                                                    </FloatLabel>
                                                </div>

                                                <!-- Availability Status -->
                                                <div class="availability-status mt-4" v-if="parkingAvailability">
                                                    <div class="availability-info">
                                                        <i class="pi pi-info-circle"></i>
                                                        <span>{{ formatDate(reservationDetail?.date) }}の空き状況: </span>
                                                        <Badge 
                                                            :value="parkingAvailability.hasVacancies ? '利用可能' : '満車'"
                                                            :severity="parkingAvailability.hasVacancies ? 'success' : 'danger'"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <Divider />
                                            <div class="field mt-6">
                                                <DataTable :value="selectedAddon" class="p-datatable-sm">
                                                    <Column field="addon_name" header="アドオン名" style="width:30%">
                                                        <template #body="slotProps">
                                                            <div class="addon-name-cell">
                                                                <div class="addon-name">{{ slotProps.data.addon_name }}</div>
                                                                <div v-if="slotProps.data.vehicleCategoryName" class="parking-details">
                                                                    <small class="text-500">
                                                                        <i class="pi pi-car"></i>
                                                                        {{ slotProps.data.vehicleCategoryName }}
                                                                    </small>
                                                                </div>
                                                                <div v-if="slotProps.data.parkingSpotDisplay" class="parking-details">
                                                                    <small class="text-500">
                                                                        <i class="pi pi-map-marker"></i>
                                                                        {{ slotProps.data.parkingSpotDisplay }}
                                                                    </small>
                                                                </div>
                                                            </div>
                                                        </template>
                                                    </Column>                        
                                                    <Column field="quantity" header="数量" style="width:20%">
                                                        <template #body="slotProps">
                                                            <InputNumber 
                                                                v-model="slotProps.data.quantity" 
                                                                :min="0" 
                                                                placeholder="数量を記入" 
                                                                :disabled="slotProps.data.vehicleCategoryId"
                                                                fluid
                                                            />
                                                        </template>
                                                    </Column>
                                                    <Column field="price" header="単価" style="width:20%">
                                                        <template #body="slotProps">
                                                            <InputNumber 
                                                                v-model="slotProps.data.price" 
                                                                :min="0" 
                                                                placeholder="価格を記入" 
                                                                fluid
                                                            />
                                                        </template>
                                                    </Column>
                                                    <Column header="操作" style="width:10%">
                                                        <template #body="slotProps">
                                                            <Button                                       
                                                            icon="pi pi-trash"
                                                            class="p-button-text p-button-danger p-button-sm"
                                                            @click="deleteAddon(slotProps.data)" 
                                                            />
                                                        </template>
                                                    </Column>
                                                </DataTable>
                                            </div>
                                        </template>                                        
                                    </Card>                                    
                                    <Divider />
                                    <div class="flex justify-center items-center">                                    
                                        <Button label="保存" severity="info" type="submit" />
                                    </div>
                                </form>                                
                            </TabPanel>
                            <!-- Tab 2: Move Rooms -->
                            <TabPanel value="1">
                                <form @submit.prevent="saveRoom">
                                    <div class="grid grid-cols-2 gap-2">
                                    <div class="mt-6 col-span-1">
                                        <FloatLabel>
                                        <InputNumber
                                            id="move-people"
                                            v-model="numberOfPeopleToMove"
                                            :min="numberOfPeopleToMove"
                                            :max="numberOfPeopleToMove"
                                            filled
                                            disabled
                                        />
                                        <label for="move-people">人数</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="mt-6 col-span-1">
                                        <FloatLabel>
                                        <Select
                                            id="move-room"
                                            v-model="targetRoom"
                                            :options="filteredRooms"
                                            optionLabel="label"
                                            showClear
                                            fluid
                                        />
                                        <label for="move-room">部屋へ移動</label>
                                        </FloatLabel>
                                    </div>
                                    </div>
                                    <Divider />
                                    <div class="flex justify-center items-center">
                                    <Button label="保存" severity="info" type="submit" />
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
                                    <p>当日をキャンセルすると、キャンセル料としてプランの<span class="font-bold">基本料金</span>が請求されます。</p>
                                </div>
                                <div v-if="!reservationCancelled" class="flex justify-center items-center">                                    
                                    <Button label="キャンセル" icon="pi pi-times" class="p-button-danger" @click="dayCancel" />
                                </div>
                                <div v-else class="flex justify-center items-center">                                    
                                    <Button label="復活" icon="pi pi-history" class="p-button-warn" @click="dayRecover" />
                                </div>
                            </TabPanel>
                        </TabPanels>
                    </Tabs>
                </div>
            </template>            
        </Card>   
        
    </div>
</template>

<script setup>
    // Vue
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
    import { useRouter } from 'vue-router';
    const router = useRouter();

    const props = defineProps({        
        reservation_details: {
            type: [Object],
            required: true,
        },        
    });

    import ReservationClientEdit from '@/pages/MainPage/components/ReservationClientEdit.vue';

    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useConfirm } from "primevue/useconfirm";
    const confirm = useConfirm();
    import { Card, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, FloatLabel, Select, InputText, InputNumber, Button, Badge, Divider } from 'primevue';    

    // Stores    
    import { useReservationStore } from '@/composables/useReservationStore';
    const { availableRooms, fetchReservationDetail, fetchAvailableRooms, setReservationPlan, setReservationAddons, setReservationRoom, setReservationDetailStatus } = useReservationStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { plans, addons, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons, fetchPlanRate, fetchPlanRates } = usePlansStore();
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const { taxTypes, fetchTaxTypes } = useSettingsStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients } = useClientStore();
    import { useParkingStore } from '@/composables/useParkingStore';
    const parkingStore = useParkingStore();
    import { useParkingAddonManager } from '@/composables/useParkingAddonManager';
    const parkingAddonManager = useParkingAddonManager();

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
        if(type === 'base_rate'){
            return '基本料金'
        }
        if(type === 'percentage'){
            return 'パーセント'
        }
        if(type === 'flat_fee'){
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
            });
        } else{
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
    
    // Parking-specific addon functionality
    const isParkingAddon = ref(false);
    const parkingAvailability = ref(null);
    const vehicleCategories = ref([]);
    const selectedVehicleCategory = ref(null);
    const selectedParkingSpot = ref(null);
    const compatibleSpots = ref([]);
    const showParkingSpotSelection = ref(false);  
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
    const generateAddonPreview = async () => {
        // Check
        if(!selectedAddonOption.value){
            toast.add({ severity: 'warn', summary: '注意', detail: 'アドオン選択されていません。', life: 3000 }); 
            return
        }

        // Special handling for parking addon
        if (isParkingAddon.value) {
            if (!selectedVehicleCategory.value) {
                toast.add({ severity: 'warn', summary: '注意', detail: '車両カテゴリを選択してください。', life: 3000 }); 
                return;
            }
            
            if (!selectedParkingSpot.value) {
                toast.add({ severity: 'warn', summary: '注意', detail: '駐車スポットを選択してください。', life: 3000 }); 
                return;
            }
            
            // Check availability before adding
            if (!parkingAvailability.value?.hasVacancies) {
                toast.add({ severity: 'error', summary: 'エラー', detail: '選択した日付で駐車場が利用できません。', life: 3000 }); 
                return;
            }
        }

        const foundAddon = addonOptions.value.find(addon => addon.addons_global_id === selectedAddonOption.value.addons_global_id && addon.addons_hotel_id === selectedAddonOption.value.addons_hotel_id);        
        const isHotelAddon = foundAddon.id.startsWith('H');
        
        const addonData = {
            addons_global_id: isHotelAddon ? null : foundAddon.id,
            addons_hotel_id: isHotelAddon ? foundAddon.id.replace('H', '') : null,
            hotel_id: foundAddon.hotel_id,            
            addon_name: foundAddon.addon_name,
            price: foundAddon.price,
            quantity: isParkingAddon.value ? 1 : reservationDetail.value.number_of_people, // Parking is typically 1 unit
            tax_type_id: foundAddon.tax_type_id,
            tax_rate: foundAddon.tax_rate
        };
        
        // Add parking-specific data if it's a parking addon
        if (isParkingAddon.value) {
            addonData.vehicleCategoryId = selectedVehicleCategory.value;
            addonData.parkingSpotId = selectedParkingSpot.value;
            addonData.date = reservationDetail.value.date;
            
            // Find selected vehicle category and spot details for display
            const vehicleCategory = vehicleCategories.value.find(cat => cat.id === selectedVehicleCategory.value);
            const parkingSpot = compatibleSpots.value.find(spot => spot.id === selectedParkingSpot.value);
            
            addonData.vehicleCategoryName = vehicleCategory?.name;
            addonData.parkingSpotDisplay = parkingSpot?.displayName;
        }
        
        selectedAddon.value.push(addonData);
        
        // Reset parking selection after adding
        if (isParkingAddon.value) {
            resetParkingSelection();
            showParkingSpotSelection.value = false;
            isParkingAddon.value = false;
            selectedAddonOption.value = null;
        }
        
        toast.add({ 
            severity: 'success', 
            summary: '成功', 
            detail: `${foundAddon.addon_name}を追加しました。`, 
            life: 3000 
        });
    };
    const deleteAddon = (addon) => {
        const index = selectedAddon.value.indexOf(addon);
        if (index !== -1) {
            selectedAddon.value.splice(index, 1);
        }
    };

    // Parking-specific methods
    const onAddonSelectionChange = async () => {
        // Check if selected addon is parking (global addon ID 3)
        isParkingAddon.value = selectedAddonOption.value && 
                              (selectedAddonOption.value.addons_global_id === 3 || 
                               selectedAddonOption.value.addon_name?.includes('駐車'));
        
        if (isParkingAddon.value) {
            showParkingSpotSelection.value = true;
            await loadParkingData();
        } else {
            showParkingSpotSelection.value = false;
            resetParkingSelection();
        }
    };

    const loadParkingData = async () => {
        try {
            // Load vehicle categories
            await parkingStore.fetchVehicleCategories();
            vehicleCategories.value = parkingStore.vehicleCategories;
            
            // Check availability for the specific date
            if (reservationDetail.value?.date && props.reservation_details?.hotel_id) {
                await checkSingleDayAvailability();
            }
        } catch (error) {
            console.error('Error loading parking data:', error);
            toast.add({
                severity: 'error',
                summary: 'エラー',
                detail: '駐車場データの読み込みに失敗しました',
                life: 3000
            });
        }
    };

    const onVehicleCategoryChange = async () => {
        if (selectedVehicleCategory.value && props.reservation_details?.hotel_id) {
            try {
                // Get compatible spots for the selected vehicle category
                const response = await parkingStore.getCompatibleSpots(
                    props.reservation_details.hotel_id,
                    selectedVehicleCategory.value
                );
                
                compatibleSpots.value = response.compatibleSpots.map(spot => ({
                    id: spot.id,
                    spotNumber: spot.spotNumber,
                    parkingLotName: spot.parkingLotName,
                    capacityUnits: spot.capacityUnits,
                    displayName: `${spot.spotNumber} - ${spot.parkingLotName}`
                }));
                
                // Reset spot selection
                selectedParkingSpot.value = null;
                
                // Check availability for this vehicle category
                await checkSingleDayAvailability();
            } catch (error) {
                console.error('Error loading compatible spots:', error);
                toast.add({
                    severity: 'error',
                    summary: 'エラー',
                    detail: '対応駐車スポットの読み込みに失敗しました',
                    life: 3000
                });
            }
        }
    };

    const onParkingSpotChange = () => {
        // Additional validation or actions when parking spot is selected
        if (selectedParkingSpot.value) {
            console.log('Selected parking spot:', selectedParkingSpot.value);
        }
    };

    const checkSingleDayAvailability = async () => {
        if (!selectedVehicleCategory.value || !reservationDetail.value?.date || !props.reservation_details?.hotel_id) {
            return;
        }
        
        try {
            const dateArray = [reservationDetail.value.date];
            const response = await parkingStore.checkParkingVacancies(
                props.reservation_details.hotel_id,
                reservationDetail.value.date,
                reservationDetail.value.date,
                selectedVehicleCategory.value
            );
            
            parkingAvailability.value = response;
        } catch (error) {
            console.error('Error checking parking availability:', error);
            parkingAvailability.value = null;
        }
    };

    const resetParkingSelection = () => {
        selectedVehicleCategory.value = null;
        selectedParkingSpot.value = null;
        compatibleSpots.value = [];
        parkingAvailability.value = null;
    };
    const savePlan = async () => {
        //console.log('savePlan:', selectedRates.value);
        
        const plan_key = selectedPlan.value;
        const [global, hotel] = plan_key.split('h').map(Number);
        const plans_global_id = global || 0;
        const plans_hotel_id = hotel || 0;         
        const price = planTotalRate.value || 0;

        const selectedPlanObject = plans.value.find(plan => plan.plan_key === plan_key);
        const plan_name = selectedPlanObject.name;
        const plan_type = selectedPlanObject.plan_type;

        // console.log('plans_global_id:',plans_global_id,'plans_hotel_id:',plans_hotel_id,'plan_name',plan_name,'plan_type',plan_type,'price:',price);

        await setReservationPlan(props.reservation_details.id, props.reservation_details.hotel_id, selectedPlanObject, selectedRates.value, price);

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
                    
        await setReservationAddons(props.reservation_details.id, addonDataArray);

        const data = await fetchReservationDetail(props.reservation_details.id);
        reservationDetail.value = data.reservation[0];
        
        toast.add({ severity: 'success', summary: '成功', detail: '予約が編集されました。', life: 3000 });
    };

    // Room
    const targetRoom = ref(null);
    const numberOfPeopleToMove = ref(0);
    const filteredRooms = ref(null);
    const saveRoom = async () => {
        // console.log('targetRoom', targetRoom.value.value);
        await setReservationRoom(props.reservation_details.id, targetRoom.value.value);

        const data = await fetchReservationDetail(props.reservation_details.id);
        reservationDetail.value = data.reservation[0];

        toast.add({ severity: 'success', summary: '成功', detail: '予約が編集されました。', life: 3000 });

    };

    // Clients
    const selectedClients = ref(null);
        
    

    // Cancel
    const reservationCancelled = ref(false);
    const dayCancel = async () => {        
        await setReservationDetailStatus(props.reservation_details.id, props.reservation_details.hotel_id, 'cancelled');

        reservationCancelled.value = true;

        toast.add({ severity: 'warn', summary: 'キャンセル', detail: '予約がキャンセルされました。', life: 3000 });
    };
    const dayRecover = async () => {        
        await setReservationDetailStatus(props.reservation_details.id, props.reservation_details.hotel_id, 'recovered');

        reservationCancelled.value = false;

        toast.add({ severity: 'success', summary: '成功', detail: '予約が復活されました。', life: 3000 });
    };

    onMounted(async() => {   
        // console.log('onMounted ReservationDayDetail:', props.reservation_details);
        const data = await fetchReservationDetail(props.reservation_details.id);
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
        selectedAddon.value = reservationDetail.value.reservation_addons.map(addon => ({
            ...addon,
        }));

        // Fetch Options
        await fetchPlansForHotel(props.reservation_details.hotel_id);
        addonOptions.value = await fetchAllAddons(props.reservation_details.hotel_id);
        
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
        
        addonOptions.value = await fetchAllAddons(props.reservation_details.hotel_id);
        // console.log('addonOptions:', addonOptions.value);

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
            selectedAddon.value = newValue.map(addon => ({
                ...addon,
                quantity: reservationDetail.value.number_of_people
            }));
        }
    }, { deep: true });
      
</script>

<style scoped>
.parking-addon-section {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--border-radius);
  padding: 1rem;
  margin-top: 1rem;
}

.parking-section-title {
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--primary-color);
}

.vehicle-category-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.parking-spot-option {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.spot-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.spot-number {
  font-weight: 600;
  color: var(--primary-color);
}

.parking-lot-name {
  font-size: 0.875rem;
  color: var(--text-color-secondary);
}

.capacity-info {
  color: var(--text-color-secondary);
}

.availability-status {
  background: var(--surface-ground);
  border-radius: var(--border-radius);
  padding: 0.75rem;
}

.availability-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.addon-name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.addon-name {
  font-weight: 500;
}

.parking-details {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
