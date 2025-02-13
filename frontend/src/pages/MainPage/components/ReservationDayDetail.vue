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
                            <Tab value="1">宿泊者</Tab>
                        </TabList>
                        <TabPanels>
                            <TabPanel value="0">
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
                                            <label>プラン区分</label>
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
                            </TabPanel>
                            <TabPanel value="1">
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

import { Card, Tabs, TabList, Tab, TabPanels, TabPanel, DataTable, Column, Button } from 'primevue';
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
        const { plans, addons, fetchPlansForHotel, fetchPlanAddons } = usePlansStore();        
        const { clients, fetchClients } = useClientStore();
        const { fetchreservationDetail } = useReservationStore();

        const drawerHeader = ref('Loading...');
        const reservationDetail = ref(null);
        const selectedPlan = ref(null);
        const planBillType = ref(null);
        const planTotalRate = ref(0);
        const selectedAddon = ref(null);
        const selectedClients = ref(null);


        const updatePlanAddOns = async () => {
            const selectedPlanObject = plans.value.find(plan => plan.plan_key === selectedPlan.value);            
            console.log('selectedPlanObject',selectedPlanObject)
            if (selectedPlan.value) {
                const gid = selectedPlanObject.plans_global_id ?? 0;
                const hid = selectedPlanObject.plans_hotel_id ?? 0;
                const hotel_id = props.hotel_id ?? 0;

                try {
                    // Fetch add-ons from the store                    
                    await fetchPlanAddons(gid, hid, hotel_id);                    
                } catch (error) {
                    console.error('Failed to fetch plan add-ons:', error);
                    addons.value = [];
                }
            }
        };

        // Fetch reservation details on mount
        
        onMounted(async() => {            
            const data = await fetchreservationDetail(props.reservation_details_id);
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
            planTotalRate = reservationDetail.value.plan_total_price;
            
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
            selectedClients,
            updatePlanAddOns,
        };
    },    
};
</script>

<style scoped>

</style>
