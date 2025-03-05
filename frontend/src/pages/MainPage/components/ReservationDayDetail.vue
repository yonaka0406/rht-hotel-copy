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
                                                            fluid
                                                        >
                                                        </InputNumber>
                                                        <label>プラン料金</label>
                                                    </FloatLabel>
                                                </div>
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
                                                            optionLabel="name"       
                                                            showClear 
                                                            fluid                             
                                                        />
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
                                                    <Column field="name" header="アドオン名" style="width:40%" />                        
                                                    <Column field="quantity" header="数量">
                                                        <template #body="slotProps">
                                                            <InputNumber 
                                                                v-model="slotProps.data.quantity" 
                                                                :min="0" 
                                                                placeholder="数量を記入" 
                                                                fluid
                                                            />
                                                        </template>
                                                    </Column>
                                                    <Column field="price" header="単価">
                                                        <template #body="slotProps">
                                                            <InputNumber 
                                                                v-model="slotProps.data.price" 
                                                                :min="0" 
                                                                placeholder="価格を記入" 
                                                                fluid
                                                            />
                                                        </template>
                                                    </Column>
                                                    <Column header="操作">
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
                                
                                    <div class="grid xs:grid-cols-1 grid-cols-2 gap-2">
                                        <div class="field mt-6 col-6">
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
                                        <div class="field mt-6 col-6">
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
    import { Card, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, Button, Divider } from 'primevue';
    import { FloatLabel, Select, InputText, InputNumber } from 'primevue';

    // Stores    
    import { useReservationStore } from '@/composables/useReservationStore';
    const { availableRooms, fetchReservationDetail, fetchAvailableRooms, setReservationPlan, setReservationAddons, setReservationRoom } = useReservationStore();
    import { usePlansStore } from '@/composables/usePlansStore';
    const { plans, addons, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons, fetchPlanRate } = usePlansStore();
    import { useClientStore } from '@/composables/useClientStore';
    const { clients, fetchClients } = useClientStore();

    // Helper
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };  

    const drawerHeader = ref('Loading...');
    const reservationDetail = ref(null);

    // Plan
    const selectedPlan = ref(null);
    const planBillType = ref(null);
    const planTotalRate = ref(0);
    const selectedAddon = ref(null);
    const addonOptions = ref(null);
    const selectedAddonOption = ref(null);
    const updatePlanAddOns = async (event) => { 
        console.log('Selected Plan:', event.value);           
        const selectedPlanObject = plans.value.find(plan => plan.plan_key === selectedPlan.value);            
        console.log('selectedPlanObject',selectedPlanObject)
        if (selectedPlan.value) {
            const gid = selectedPlanObject.plans_global_id ?? 0;
            const hid = selectedPlanObject.plans_hotel_id ?? 0;
            const hotel_id = props.reservation_details.hotel_id ?? 0;

            try {
                await fetchPlanAddons(gid, hid, hotel_id);
                planTotalRate.value = await fetchPlanRate(gid, hid, hotel_id, reservationDetail.value.date);                    
                reservationDetail.value.plan_total_price = planTotalRate.value;

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
        if(!selectedAddonOption.value){
            toast.add({ severity: 'warn', summary: '注意', detail: 'アドオン選択されていません。', life: 3000 }); 
            return
        }

        console.log('selectedAddonOption in select:', selectedAddonOption.value);

        const foundAddon = addonOptions.value.find(addon => addon.addons_global_id === selectedAddonOption.value.addons_global_id && addon.addons_hotel_id === selectedAddonOption.value.addons_hotel_id);
        console.log('foundAddon:',foundAddon);
        const isHotelAddon = foundAddon.id.startsWith('H');
        console.log('selectedAddon:',selectedAddon.value);
        console.log('selectedAddonOption:', selectedAddonOption.value);            
        selectedAddon.value.push({
            addons_global_id: isHotelAddon ? null : foundAddon.id,
            addons_hotel_id: isHotelAddon ? foundAddon.id.replace('H', '') : null,
            hotel_id: foundAddon.hotel_id,
            name: foundAddon.name,
            price: foundAddon.price,
            quantity: reservationDetail.value.number_of_people,
        });            
    };
    const deleteAddon = (addon) => {
        const index = selectedAddon.value.indexOf(addon);
        if (index !== -1) {
            selectedAddon.value.splice(index, 1);
        }
    };
    const savePlan = async () => {
        const plan_key = selectedPlan.value;
        const [global, hotel] = plan_key.split('h').map(Number);
        const plans_global_id = global || 0;
        const plans_hotel_id = hotel || 0; 
        const price = planTotalRate.value || 0;

        console.log('plans_global_id:',plans_global_id,'plans_hotel_id:',plans_hotel_id,'price:',price);

        await setReservationPlan(props.reservation_details.id, props.reservation_details.hotel_id, plans_global_id, plans_hotel_id, price);

        const addonDataArray = selectedAddon.value.map(addon => ({
            hotel_id: props.reservation_details.hotel_id,  
            addons_global_id: addon.addons_global_id,
            addons_hotel_id: addon.addons_hotel_id,
            quantity: addon.quantity,
            price: addon.price
        }));

        console.log('addonDataArray:', addonDataArray);
                    
        await setReservationAddons(props.reservation_details.id, addonDataArray);

        const data = await fetchReservationDetail(props.reservation_details.id);
        reservationDetail.value = data.reservation[0];
        
        toast.add({ severity: 'success', summary: 'Success', detail: '予約が編集されました。', life: 3000 });            
    };

    // Room
    const targetRoom = ref(null);
    const numberOfPeopleToMove = ref(0);
    const filteredRooms = ref(null);
    const saveRoom = async () => {
        console.log('targetRoom', targetRoom.value.value);
        await setReservationRoom(props.reservation_details.id, targetRoom.value.value);

        const data = await fetchReservationDetail(props.reservation_details.id);
        reservationDetail.value = data.reservation[0];

        toast.add({ severity: 'success', summary: 'Success', detail: '予約が編集されました。', life: 3000 }); 

    };

    // Clients
    const selectedClients = ref(null);
        
    onMounted(async() => {   
        console.log('onMounted ReservationDayDetail:', props.reservation_details);                 
        const data = await fetchReservationDetail(props.reservation_details.id);
        reservationDetail.value = data.reservation[0];

        // Header
        drawerHeader.value = props.reservation_details.date + '：' + props.reservation_details.room_number + '号室 ' + props.reservation_details.room_type_name;
        selectedPlan.value = (props.reservation_details.plans_global_id ?? '') + 'h' + (props.reservation_details.plans_hotel_id ?? '');

        // Plans
        await fetchPlansForHotel(props.reservation_details.hotel_id);
        addonOptions.value = await fetchAllAddons(props.reservation_details.hotel_id);

        selectedAddon.value = reservationDetail.value.reservation_addons.map(addon => ({
            ...addon,
        }));
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
        console.log('addonOptions:', addonOptions.value);

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
            console.log('addons changed:', newValue);            
            selectedAddon.value = newValue.map(addon => ({
                ...addon,
                quantity: reservationDetail.value.number_of_people
            }));
        }
    }, { deep: true });
      
</script>

<style scoped>

</style>
