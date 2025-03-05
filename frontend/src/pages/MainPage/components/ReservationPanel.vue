<template>
    <!-- Top Panel -->
    <div class="grid grid-cols-2 gap-2 gap-y-4">
        <div class="field flex flex-col">                        
            <div class="flex items-center justify-between mr-2 mb-2">
                <p class="font-bold">予約者：</p>                
                <Button label="顧客変更" severity="help" icon="pi pi-pencil" @click="openChangeClientDialog" />
                
            </div>
            <InputText type="text" v-model="reservationInfo.client_name" disabled style="background-color: transparent;"/>                        
        </div>   
        <div class="field flex flex-col" >
            <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'">
                <div class="flex items-center justify-between mr-2 mb-2">
                    <p class="font-bold">宿泊者：</p>                    
                    <Button label="部屋追加" severity="help" icon="pi pi-pencil" @click="openAddRoomDialog" />                    
                </div> 
            </div>
            <div v-else>
                <p class="font-bold mb-8">宿泊者：</p>
            </div>
            <span>
                人数：{{ reservationInfo.reservation_number_of_people }}
                <i class="pi pi-user ml-1 mr-1"></i>                 
                部屋数：{{ groupedRooms.length }} <i class="pi pi-box ml-1"></i>                
            </span>
        </div>   
        <div class="field flex flex-col">
            <div class="flex items-start justify-between mr-2 mb-2">
                <p class="font-bold">チェックイン：</p>
                <span>{{ reservationInfo.check_in }} <i class="pi pi-arrow-down-right ml-1"></i></span>
                <span></span>
            </div>            
        </div>
        <div class="field flex flex-col">
            <div class="flex items-start justify-between mr-2 mb-2">
                <p class="font-bold">チェックアウト：</p>
                <span>{{ reservationInfo.check_out }} <i class="pi pi-arrow-up-right ml-1"></i></span>
                <!--
                <Button label="プラン・期間編集" severity="help" icon="pi pi-pencil" @click="openReservationBulkEditDialog" />
                -->
            </div>
        </div>

        <div class="field flex flex-col col-span-2">
            <Divider />
        </div>  

        <div class="field flex flex-col">
            <span class="items-center flex"><span class="font-bold">ステータス：</span> {{ reservationStatus }}</span>
        </div>
        <div class="field flex flex-col ">
            <div class="items-center flex">
                <span class="font-bold">種類：</span>
                <template v-if="reservationType === '通常予約' || reservationType === '社員'">
                    <SelectButton 
                        v-model="reservationTypeSelected"     
                        :options="reservationTypeOptions" 
                        optionLabel="label"
                        optionValue="value"                                
                        @change="updateReservationType"
                    />
                </template>
                <template v-else>
                    <span>{{ reservationType }}</span>
                </template>
            </div>
        </div>
        <div class="field flex flex-col col-span-2">                        
            <div class="grid grid-cols-4 gap-x-6">
                <div v-if="reservationStatus === '保留中' || reservationStatus === '確定'" class="field flex flex-col">
                    <Button 
                        label="仮予約として保存"                                     
                        severity="info"
                        :disabled="!allRoomsHavePlan"
                        @click="updateReservationStatus('provisory')"
                    /> 
                </div>
                <div v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" class="field flex flex-col">
                    <Button 
                        label="確定予約として保存" 
                        severity="success"
                        :disabled="!allRoomsHavePlan"
                        @click="updateReservationStatus('confirmed')"
                    /> 
                </div>
                <div v-if="reservationStatus === '確定' && allGroupsPeopleCountMatch" class="field flex flex-col">
                    <Button 
                        label="チェックイン" 
                        severity="success"
                        icon="pi pi-sign-in"
                        fluid
                        @click="updateReservationStatus('checked_in')"
                    />
                </div>
                <div v-if="reservationStatus === 'チェックイン'" class="field flex flex-col">
                    <Button 
                        label="チェックアウト" 
                        severity="warn"
                        icon="pi pi-eject"
                        fluid
                        @click="updateReservationStatus('checked_out')"
                    />
                </div> 
                <div v-if="reservationStatus === '仮予約' || reservationStatus === '確定'" class="field flex flex-col">
                    <Button 
                        label="キャンセル" 
                        severity="contrast"
                        :disabled="!allRoomsHavePlan"
                        @click="updateReservationStatus('cancelled')"
                    /> 
                </div>
                
                <div v-if="reservationStatus === '保留中'" class="field flex flex-col">
                    <Button 
                        label="保留中予約を削除" 
                        severity="danger"
                        fluid
                        @click="deleteReservation"
                    />
                    <ConfirmPopup />
                </div>                 
            </div>
        </div>
    </div>

    <!-- Change Client Dialog -->
    <Dialog 
        v-model:visible="visibleClientChangeDialog" 
        :header="'顧客変更'" 
        :closable="true"
        :modal="true"
        :style="{ width: '600px' }"
    >
        <ReservationClientEdit
            v-if="selectedClient"
            :client_id="selectedClient"                
        />
        <template #footer>                
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeChangeClientDialog" />                
        </template>  
    </Dialog>

    <!-- Change Rooms Dialog -->
    <Dialog
        v-model:visible="visibleAddRoomDialog"
        header="予約一括編集"
        :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
        style="width: 50vw"
    >
        <div class="p-fluid">
            <Tabs 
                value ="0"                
            >
                <TabList>                        
                    <Tab value="0">部屋追加</Tab>                        
                </TabList>
                    
                <TabPanels>                        
                    <!-- Tab 1: Rooms -->
                    <TabPanel value="0">
                        <h4 class="mt-4 mb-3 font-bold">部屋追加</h4>

                        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2">
                            <div class="field mt-6 col-6">
                                <FloatLabel>
                                    <InputNumber
                                        id="move-people"
                                        v-model="numberOfPeopleToMove"
                                        :min="0"
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
                                    <label for="move-room">部屋を追加</label>
                                </FloatLabel>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>                     
            </Tabs>
        
        </div>
        <template #footer>
            <Button label="追加" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyReservationRoomChanges" />                
            
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeAddRoomDialog" />                
        </template>            
    </Dialog>
</template>

<script setup>
    // Vue
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
    import { useRouter } from 'vue-router';  
    const router = useRouter();

    import ReservationClientEdit from '@/pages/MainPage/components/ReservationClientEdit.vue';
    
    // Primevue
    import { useToast } from 'primevue/usetoast';
    const toast = useToast();
    import { useConfirm } from "primevue/useconfirm";
    const confirm = useConfirm();
    import { 
        Divider, InputNumber, InputText, Select, FloatLabel, SelectButton, Button, ConfirmPopup,
        Dialog, Tabs, TabList, Tab, TabPanels, TabPanel

     } from 'primevue';

    const props = defineProps({
        reservation_id: {
            type: String,
            required: true,
        },
        reservation_details: {
            type: [Object],
            required: true,
        }, 
    });

    //Stores
    import { useReservationStore } from '@/composables/useReservationStore';
    const { setReservationId, setReservationType, setReservationStatus, deleteHoldReservation, availableRooms, fetchAvailableRooms, addRoomToReservation } = useReservationStore();

    const reservationInfo = ref({});
    const reservationTypeSelected = ref(null);
    const reservationTypeOptions = [
        { label: '通常予約', value: 'default' },
        { label: '社員', value: 'employee' },
    ];

    // Computed
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
            default:
            return '不明'; // Or any default value you prefer
        }
    });
    const reservationType = computed(() => {        
        switch (reservationInfo.value.type) {
            case 'default':
            return '通常予約';
            case 'employee':
            return '社員';
            case 'ota':
            return 'OTA';
            case 'web':
            return '自社WEB';            
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
    const allRoomsHavePlan = computed(() => {
        return groupedRooms.value.every(group => allHavePlan(group));
    });
    const allHavePlan = (group) => {
        return group.details.every(
            (detail) => detail.plans_global_id || detail.plans_hotel_id
        );
    };

    // Reservation Type
    const updateReservationType = async () => {
        // Add your logic here to update the reservation type in the database
        try {
            const selectedType = reservationTypeOptions.find(option => option.value === reservationTypeSelected.value)?.value;
            console.log('selectedType:', selectedType);
            await setReservationType(selectedType);

            // Handle success, e.g., show a success message
            toast.add({ severity: 'success', summary: 'Success', detail: '予約種類更新されました。', life: 3000 });
            
        } catch (error) {
            console.error('Error updating reservation type:', error);
            toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to update reservation type.', life: 3000 });
        }
    };

    // Status Buttons
    const updateReservationStatus = async (status) => {        
        if (!allRoomsHavePlan.value) {                                
            toast.add({ 
                severity: 'warn', 
                summary: 'Warn', 
                detail: '部屋の予約にプランを追加してください。', life: 3000 
            });
            return; 
        }         

        try {
            await setReservationStatus(status);
        } catch (error) {
            console.error('Error updating and fetching reservation:', error);            
        }
    };
    const deleteReservation = () => {
        const reservation_id = reservationInfo.value.reservation_id;

        confirm.require({
            message: `保留中予約を削除してもよろしいですか?`,
            header: 'Delete Confirmation',                    
            icon: 'pi pi-info-circle',
            acceptClass: 'p-button-danger',
            acceptProps: {
                label: '削除'
            },
            accept: () => {
                deleteHoldReservation(reservation_id);                    
                toast.add({
                    severity: 'success',
                    summary: 'Success',
                    detail: `保留中予約削除されました。`,
                    life: 3000
                });                
                goToNewReservation();
            },
            rejectProps: {
                label: 'キャンセル',
                severity: 'secondary',
                outlined: true
            },
            reject: () => {
                toast.add({
                    severity: 'info',
                    summary: '削除キャンセル',
                    detail: '削除するのをキャンセルしました。',
                    life: 3000
                });
            }
        });
    };

    // Router
    const goToNewReservation = () => {                
        setReservationId(null);                
        router.push({ name: 'ReservationsNew' });
    };
    
    // Dialog: Add Room
    const visibleAddRoomDialog = ref(false);
    const targetRoom = ref(null);
    const numberOfPeopleToMove = ref(0);
    const filteredRooms = computed(() => {
        const reservedRoomIds =  props.reservation_details.map(detail => detail.room_id);

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
        if(numberOfPeopleToMove.value <= 0) {
            toast.add({ severity: 'warn', summary: 'Warning', detail: `少なくとも一人入力してください。`, life: 3000 });
            return;                        
        }
        if(targetRoom.value === null) {
            toast.add({ severity: 'warn', summary: 'Warning', detail: `部屋を選択してください。`, life: 3000 });
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
            
        toast.add({ severity: 'success', summary: 'Success', detail: '部屋追加されました。', life: 3000 });

    };

    // Dialog: Change Client
    const visibleClientChangeDialog = ref(false);
    const selectedClient = ref(null);
    const openChangeClientDialog = () => {
        visibleClientChangeDialog.value = true;
    };
    const closeChangeClientDialog = () => {
        visibleClientChangeDialog.value = false;
    };

    onMounted(async () => {
        reservationInfo.value = props.reservation_details[0];
        reservationTypeSelected.value = reservationInfo.value.type;
        selectedClient.value = reservationInfo.value.client_id;

        // console.log('onMounted ReservationPanel reservationInfo:', reservationInfo.value);        
    });
</script>