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
                                    <div class="field mt-8">
                                        <FloatLabel>
                                            <Select                                            
                                                v-model="selectedPlan"
                                                :options="plans"
                                                optionLabel="name"
                                                optionValue="plan_key"
                                                showClear 
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
                                                    filled
                                                    disabled
                                                >
                                                </InputText>
                                                <label>請求種類</label>
                                            </FloatLabel>
                                        </div>
                                        <div class="field flex flex-col mt-6">
                                            <FloatLabel>
                                                <InputNumber
                                                    v-model="planTotalRate"
                                                >
                                                </InputNumber>
                                                <label>プラン料金</label>
                                            </FloatLabel>
                                        </div>
                                    </div>
                                    
                                    <div class="field mt-6">
                                        <DataTable :value="selectedAddon" class="p-datatable-sm">
                                            <Column field="name" header="アドオン名" style="width:50%" />                        
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
                                        </DataTable>
                                    </div>

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

<script>
import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";

import { useHotelStore } from '@/composables/useHotelStore';
import { useReservationStore } from '@/composables/useReservationStore';
import { usePlansStore } from '@/composables/usePlansStore';
import { useClientStore } from '@/composables/useClientStore';
import ClientEdit from '@/pages/MainPage/components/ClientEdit.vue';

import { Card, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, Button, Divider } from 'primevue';
import { FloatLabel, Select, InputText, InputNumber } from 'primevue';

export default {
    props: {        
        hotel_id: { // Add room_id prop
            type: [String, Number],
            required: true,
        },
        reservation_id: { // Add room_id prop
            type: [String],
            required: true,
        },
        reservation_details_id: { // Add room_id prop
            type: [String],
            required: true,
        },
    },
    name: "ReservationDayDetail",
    components: { 
        Card,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        DataTable, 
        Column,
        Button,
        Divider,
        FloatLabel,
        Select,
        InputText,
        InputNumber,
    },
    setup(props) {
        const router = useRouter();
        const toast = useToast();
        const confirm = useConfirm();
        const isUpdating = ref(false);
        const { plans, addons, fetchPlansForHotel, fetchPlanAddons, fetchPlanRate } = usePlansStore();        
        const { clients, fetchClients } = useClientStore();
        const { availableRooms, fetchReservationDetail, fetchAvailableRooms, setReservationPlan, setReservationAddons, setReservationRoom } = useReservationStore();

        const drawerHeader = ref('Loading...');
        const reservationDetail = ref(null);
        const selectedPlan = ref(null);
        const planBillType = ref(null);
        const planTotalRate = ref(0);
        const selectedAddon = ref(null);
        const targetRoom = ref(null);
        const numberOfPeopleToMove = ref(0);
        const selectedClients = ref(null);
        const filteredRooms = ref(null);

        // Helper
        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        const updatePlanAddOns = async () => {            
            const selectedPlanObject = plans.value.find(plan => plan.plan_key === selectedPlan.value);            
            console.log('selectedPlanObject',selectedPlanObject)
            if (selectedPlan.value) {
                const gid = selectedPlanObject.plans_global_id ?? 0;
                const hid = selectedPlanObject.plans_hotel_id ?? 0;
                const hotel_id = props.hotel_id ?? 0;

                try {
                    await fetchPlanAddons(gid, hid, hotel_id);
                    planTotalRate.value = await fetchPlanRate(gid, hid, hotel_id, reservationDetail.value.date);                    
                    reservationDetail.value.plan_total_price = planTotalRate.value;

                    const gidFixed = gid === 0 ? null : gid;
                    const hidFixed = hid === 0 ? null : hid;                    
                    const selectedPlan = plans.value.find(plan => 
                        plan.plans_global_id === gidFixed && plan.plans_hotel_id === hidFixed
                    );
                    reservationDetail.value.plan_type = selectedPlan ? selectedPlan.plan_type : null;
                    planBillType.value = reservationDetail.value.plan_type === 'per_person' 
                        ? '人数あたり' 
                        : '部屋あたり';
                    
                } catch (error) {
                    console.error('Failed to fetch plan add-ons:', error);
                    addons.value = [];
                }
            }
        };

        const savePlan = async () => {
            const plan_key = selectedPlan.value;
            const [global, hotel] = plan_key.split('h').map(Number);
            const plans_global_id = global || 0;
            const plans_hotel_id = hotel || 0; 
            const price = planTotalRate.value || 0;

            console.log('plans_global_id:',plans_global_id,'plans_hotel_id:',plans_hotel_id,'price:',price);

            await setReservationPlan(props.reservation_details_id, props.hotel_id, plans_global_id, plans_hotel_id, price);

            const addonDataArray = selectedAddon.value.map(addon => ({
                hotel_id: props.hotel_id,  
                addons_global_id: addon.addons_global_id,
                addons_hotel_id: addon.addons_hotel_id,
                quantity: addon.quantity,
                price: addon.price
            }));
            
            await setReservationAddons(props.reservation_details_id, addonDataArray);
            
            toast.add({ severity: 'success', summary: 'Success', detail: '予約が編集されました。', life: 3000 });            
        };

        const saveRoom = async () => {
            console.log('targetRoom', targetRoom.value.value);
            await setReservationRoom(props.reservation_details_id, targetRoom.value.value);

            toast.add({ severity: 'success', summary: 'Success', detail: '予約が編集されました。', life: 3000 }); 

        };

        // Fetch reservation details on mount
        
        onMounted(async() => {            
            const data = await fetchReservationDetail(props.reservation_details_id);
            reservationDetail.value = data.reservation[0];
            console.log('reservationDetail',reservationDetail.value);
            
            drawerHeader.value = reservationDetail.value.date + '：' + reservationDetail.value.room_number + '号室 ' + reservationDetail.value.room_type_name;
            selectedPlan.value = (reservationDetail.value.plans_global_id ?? '') + 'h' + (reservationDetail.value.plans_hotel_id ?? '');
            
            await fetchPlansForHotel(props.hotel_id);

            selectedAddon.value = reservationDetail.value.reservation_addons.map(addon => ({
                ...addon,
            }));            
            selectedClients.value = reservationDetail.value.reservation_clients.map(client => ({
                ...client,
                display_name: client.name_kanji
                    ? `${client.name_kanji}${client.name_kana ? '（' + client.name_kana + '）' : ''}`
                    : `${client.name}${client.name_kana ? '（' + client.name_kana + '）' : ''}`
            }));

            planBillType.value = reservationDetail.value.plan_type === 'per_person' 
                ? '人数あたり' 
                : '部屋あたり';
            planTotalRate.value = reservationDetail.value.plan_total_price;

            numberOfPeopleToMove.value = reservationDetail.value.number_of_people;

            console.log('room_id', reservationDetail.value.room_id);
            // fetchAvailableRooms            
            const endDate = new Date(reservationDetail.value.date);
            endDate.setDate(endDate.getDate() + 1);
            await fetchAvailableRooms(props.hotel_id, reservationDetail.value.date, formatDate(endDate));

            filteredRooms.value = availableRooms.value
                .filter(room => room.capacity >= numberOfPeopleToMove.value)
                .filter(room => room.room_id !== reservationDetail.value.room_id)
                .map(room => ({
                    label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
                    value: room.room_id, // Value for selection
                }));
            
        });

        // Watch       
        watch(addons, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('addons changed:', newValue);
                // Add a 'quantity' field with default value 1 to each add-on
                selectedAddon.value = newValue.map(addon => ({
                    ...addon,
                    quantity: 1
                }));
            }
        }, { deep: true });

        return {
            plans,
            drawerHeader,
            reservationDetail,
            selectedPlan,
            planBillType,
            planTotalRate,
            selectedAddon,
            targetRoom,
            numberOfPeopleToMove,
            selectedClients,
            filteredRooms,
            updatePlanAddOns,
            savePlan,
            saveRoom,
        };
    },    
};
</script>

<style scoped>

</style>
