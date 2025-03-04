<template>   

    <Accordion :activeIndex="0">
        <AccordionPanel                        
            v-for="(group, index) in groupedRooms"
            :key="group.room_id"          
            :value="group.room_id"
        >
            <AccordionHeader>
                <div class="grid grid-cols-6 gap-4 w-full">
                    <div class="col-span-3 text-left">
                        部屋： {{ `${group.details[0]?.room_number} - ${group.room_type} (${group.details[0]?.capacity}) ${group.details[0]?.smoking ? ' 🚬' : ''}` }}
                    </div>
                    <div class="flex items-center justify-center">

                        {{ group.details[0]?.number_of_people }}
                        <i class="pi pi-user ml-1" style="margin-right: 0.5rem;"></i>
                    
                        <i
                            class="pi"
                            :class="allHavePlan(group) ? 'pi-check' : 'pi-exclamation-triangle'"
                            style="margin-left: 0.5rem; color: var(--primary-color);"
                            :title="allHavePlan(group) ? 'プラン設定済み' : 'プラン未設定'"
                        ></i>
                        <i
                            class="pi"
                            :class="allPeopleCountMatch(group) ? 'pi-check' : 'pi-exclamation-triangle'"
                            style="margin-left: 0.5rem; color: var(--primary-color);"
                            :title="allPeopleCountMatch(group) ? '宿泊者設定済み' : '宿泊者未設定'"
                        ></i>                                    

                    </div>
                    <div class="col-span-2 text-right mr-4">
                        <Button
                            icon="pi pi-pencil"
                            label="一括編集"
                            class="p-button-sm"
                            @click="openBulkEditDialog(group)"
                        />
                    </div>
                </div>
            </AccordionHeader>
            <AccordionContent>
                <DataTable 
                    :value="formattedGroupDetails(group.details)"
                    :rowStyle="rowStyle"
                >
                    <Column field="display_date" header="日付" class="text-xs" />
                    <Column field="plan_name" header="プラン" class="text-xs" />
                    <Column field="number_of_people" header="人数" class="text-xs" />
                    <Column field="price" header="料金" class="text-xs" />
                    <Column header="詳細">
                        <template #body="slotProps">
                            <Button icon="pi pi-eye" @click="openReservationDayDetailDialog(slotProps.data)" size="small" variant="text" />
                        </template>
                    </Column>
                </DataTable>
            </AccordionContent>                        
        </AccordionPanel>
    </Accordion>

    <!-- Bulk Edit Dialog -->
    <Dialog
        v-model:visible="bulkEditDialogVisible"
        header="部屋一括編集"
        :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
        style="width: 50vw"
    >
        <div class="p-fluid">
            <Tabs 
                value ="0"
                @update:value="handleTabChange"
            >
                <TabList>
                    <Tab value="0">プラン適用</Tab>
                    <Tab value="1">部屋移動</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約' || reservationStatus === '確定'" value="2">宿泊者</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" value="3">追加・削除</Tab>
                    <Tab v-if="reservationStatus === '保留中' || reservationStatus === '仮予約'" value="4">期間</Tab>
                </TabList>
                    
                <TabPanels>
                    <!-- Tab 1: Apply Plan -->
                    <TabPanel value="0">
                        <Card class="mb-2">
                            <template #title>プラン</template>
                            <template #content>
                                <div class="field mt-8">
                                    <FloatLabel>
                                        <Select
                                            id="bulk-plan"
                                            v-model="selectedPlan"
                                            :options="plans"
                                            optionLabel="name"
                                            showClear 
                                            fluid                           
                                            @change="updatePlanAddOns"
                                        />
                                        <label for="bulk-plan">プラン選択</label>
                                    </FloatLabel>
                                </div>
                                <div class="field mt-6">
                                    <FloatLabel>
                                        <MultiSelect
                                            v-model="selectedDays"
                                            :options="daysOfWeek"
                                            optionLabel="label"
                                            fluid                            
                                            :maxSelectedLabels="3"
                                        />
                                        <label>曜日</label>
                                    </FloatLabel>
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
                                                optionValue="id"
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
                                        <Column field="price" header="価格">
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
                        
                                        
                        
                    </TabPanel>
                    <!-- Tab 2: Move Rooms Content -->
                    <TabPanel value="1">
                        <h4 class="mt-4 mb-3 font-bold">部屋移動</h4>

                        <div class="grid xs:grid-cols-1 grid-cols-2 gap-2">
                            <div class="field mt-6 col-6">
                                <FloatLabel>
                                    <InputNumber
                                        id="move-people"
                                        v-model="numberOfPeopleToMove"
                                        :min="0"
                                        :max="Math.max(...(selectedGroup?.details.map(item => item.number_of_people) || [0]))"
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
                    </TabPanel>
                    <!-- Tab 3: Set clients -->
                    <TabPanel value="2">                            
                        <DataTable                                     
                            :value="guests"
                            class="p-datatable-sm"
                            scrollable
                            responsive                                
                        >                                
                            <Column field="name" header="宿泊者" style="width: 40%">                                    
                                <template #body="slotProps">
                                    <AutoComplete
                                        v-model="slotProps.data.name"
                                        :placeholder="slotProps.data.guest_no"
                                        :suggestions="filteredClients"
                                        optionLabel="name"
                                        @complete="filterClients"
                                        field="id"                
                                        @option-select="onClientSelect($event, slotProps.data)"   
                                        @change="onClientChange(slotProps.data)" 
                                    >
                                        <template #option="slotProps">
                                            <div>
                                                {{ slotProps.option.name_kanji || slotProps.option.name || '' }}
                                                <span v-if="slotProps.option.name_kana"> ({{ slotProps.option.name_kana }})</span>
                                            </div>
                                        </template>
                                    </AutoComplete>
                                </template>
                                
                            </Column>
                            <Column field="gender" header="性別" style="width: 10%">                                    
                                <template #body="slotProps">
                                    <Select 
                                        v-model="slotProps.data.gender" 
                                        :options="genderOptions" 
                                        optionLabel="label" 
                                        optionValue="value" 
                                        placeholder="性別を選択"
                                        fluid
                                        :disabled="slotProps.data.isClientSelected"
                                    />
                                </template>
                                
                            </Column>
                            <Column field="email" header="メールアドレス" style="width: 25%">
                                <template #body="slotProps">
                                    <InputText v-model="slotProps.data.email"                                            
                                        :pattern="emailPattern"
                                        :class="{'p-invalid': !isValidEmail}"
                                        @input="validateEmail(slotProps.data.email)"                                            
                                        :disabled="slotProps.data.isClientSelected"
                                    />
                                </template>
                            </Column>
                            <Column field="phone" header="電話番号" style="width: 25%">
                                <template #body="slotProps">
                                    <InputText v-model="slotProps.data.phone"
                                        :pattern="phonePattern"
                                        :class="{'p-invalid': !isValidPhone}"
                                        @input="validatePhone(slotProps.data.phone)"                                            
                                        :disabled="slotProps.data.isClientSelected"
                                    />
                                </template>
                            </Column>                                
                        </DataTable>
                        
                    </TabPanel>
                    <!-- Tab 4: Modify room -->
                    <TabPanel value="3">
                        <div class="grid grid-cols-2 gap-4 items-start">
                            <Card class="mb-3">
                                <template #title>予約</template>
                                <template #content>
                                    <div class="grid grid-cols-1 gap-4 items-center">
                                        <div>
                                            <span>宿泊者：{{ editReservationDetails[0].reservation_number_of_people }}</span>
                                        </div>                                            
                                    </div>
                                </template>                                    
                            </Card>
                            <Card class="mb-3">
                                <template #title>部屋 {{ selectedGroup.details[0].room_number }}</template>
                                <template #content>
                                    <div class="grid grid-cols-1 gap-4 items-center">
                                        <div>
                                            <span>宿泊者：{{ selectedGroup.details[0].number_of_people }}</span>
                                        </div>
                                        <div>
                                            <span>定員：{{ selectedGroup.details[0].capacity }}</span>
                                        </div>
                                    </div>
                                </template>
                                
                            </Card>
                        </div>                            
                        
                        <div v-if="groupedRooms.length > 1" class="grid grid-cols-3 gap-4 items-center mb-4">                                
                            <p class="col-span-2">部屋を予約から削除して、宿泊者の人数を減らします。</p>
                            <Button label="部屋削除" severity="danger" icon="pi pi-trash" @click="deleteRoom(selectedGroup)" />
                        </div>
                        <div v-else="groupedRooms.length > 1" class="grid grid-cols-3 gap-4 items-center mb-4">                                
                            <p class="col-span-3">部屋を予約から削除より、予約を削除・キャンセルしてください。</p>                                
                        </div>
                        <div v-if="selectedGroup.details[0].number_of_people < selectedGroup.details[0].capacity" class="grid grid-cols-3 gap-4 items-center mb-4">
                            <p class="col-span-2">予約の宿泊者の人数を<span class="font-bold text-blue-700">増やします</span>。</p>
                            <button class="bg-blue-500 text-white hover:bg-blue-600" @click="changeGuestNumber(selectedGroup, 'add')"><i class="pi pi-plus"></i> 人数増加</button>
                        </div>
                        <div v-if="selectedGroup.details[0].number_of_people > 1" class="grid grid-cols-3 gap-4 items-center mb-4">
                            <p class="col-span-2">予約の宿泊者の人数をを<span class="font-bold text-yellow-700">減らします</span>。</p>
                            <button class="bg-yellow-500 text-white hover:bg-yellow-600" @click="changeGuestNumber(selectedGroup, 'subtract')"><i class="pi pi-minus"></i> 人数削減</button>
                        </div>                                
                        
                        
                    </TabPanel>
                    <!-- Tab 5: Modify period -->
                    <TabPanel value="4">
                        <Card class="mb-3">
                            <template #title>予約</template>
                            <template #content>
                                <div class="grid grid-cols-2 gap-4 items-center">
                                    <div>
                                        <span>チェックイン：{{ editReservationDetails[0].check_in }}</span>
                                    </div>
                                    <div>
                                        <span>チェックアウト：{{ editReservationDetails[0].check_out }}</span>
                                    </div>
                                    <div>
                                        <span>宿泊者：{{ editReservationDetails[0].reservation_number_of_people }}</span>
                                    </div>
                                    <div>
                                        <span>部屋数：{{ groupedRooms.length }}</span>
                                    </div>                                        
                                </div>
                            </template>
                        </Card>
                        <p class="mt-2 mb-6"><span class="font-bold">注意：</span>部屋宿泊期間を変更すると、新規予約が作成されます。</p>
                        <div class="grid grid-cols-2 gap-4 items-center">
                            <div>
                                <FloatLabel>
                                <label for="checkin">チェックイン</label>
                                <DatePicker 
                                    id="checkin" 
                                    v-model="newCheckIn"
                                    :showIcon="true" 
                                    :minDate="minCheckIn || undefined"
                                    :maxDate="maxCheckOut || undefined"
                                    iconDisplay="input" 
                                    dateFormat="yy-mm-dd"
                                    class="w-full"
                                />
                                </FloatLabel>
                            </div>
                            <div>
                                <FloatLabel>
                                    <label for="checkout">チェックアウト</label>
                                    <DatePicker 
                                        id="checkout" 
                                        v-model="newCheckOut"
                                        :showIcon="true" 
                                        :minDate="minCheckIn || undefined"
                                        :maxDate="maxCheckOut || undefined"
                                        iconDisplay="input" 
                                        dateFormat="yy-mm-dd"
                                        class="w-full"
                                    />
                                </FloatLabel>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>                     
            </Tabs>
        
        </div>
        <template #footer>
            <Button v-if="bulkEditDialogTab === 0" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyPlanChanges" />
            <Button v-if="bulkEditDialogTab === 1" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyRoomChanges" />
            <Button v-if="bulkEditDialogTab === 2" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyGuestChanges" />
            <Button v-if="bulkEditDialogTab === 4" label="適用" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyDateChanges" />
            
            <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeBulkEditDialog" />                
        </template>            
    </Dialog>

    <!-- Day Detail Dialog -->
    <Dialog 
        v-model:visible="changeReservationDayDetailDialogVisible" 
        :header="'日付詳細'" 
        :closable="true"
        :modal="true"
        :breakpoints="{ '960px': '75vw', '640px': '100vw' }"
        style="width: 50vw"
    >
        <ReservationDayDetail                
            :hotel_id="dialogHotelId"
            :reservation_id="dialogReservationId"
            :reservation_details_id="dialogReservationDtlId"
        />
        <template #footer>                
            <Button label="閉じる" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeChangeReservationDayDetailDialog" />                
        </template>  
    </Dialog>
</template>
<script setup>

    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';

    import { Panel, Card, Divider, Dialog, Tabs, TabList, Tab, TabPanels,TabPanel, ConfirmPopup } from 'primevue';
    import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue';
    import { DataTable, Column, Button } from 'primevue';
    import { FloatLabel, InputText, InputNumber, AutoComplete, Select, MultiSelect, SelectButton, DatePicker } from 'primevue';

    import ReservationDayDetail from '@/pages/MainPage/components/ReservationDayDetail.vue';

    const props = defineProps({        
        reservation_details: {
            type: [Object],
            required: true,
        },        
    });
    
    const bulkEditDialogVisible = ref(false);
    const bulkEditDialogTab = ref(0);

    const changeReservationDayDetailDialogVisible = ref(false);
    const dialogHotelId = ref(null);
    const dialogReservationId = ref(null);
    const dialogReservationDtlId = ref(null);

    // Helper
    const formatDateWithDay = (date) => {
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parsedDate = new Date(date);
        return `${parsedDate.toLocaleDateString(undefined, options)}`;
    };
    const formatCurrency = (value) => {
        if (value == null) return '';
        return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
    };
    const allHavePlan = (group) => {
        return group.details.every(
            (detail) => detail.plans_global_id || detail.plans_hotel_id
        );
    };
    const allPeopleCountMatch = (group) => {
        return group.details.every(
            (detail) => detail.number_of_people === detail.reservation_clients.length
        );
    };

    // Format
    const rowStyle = (data) => {
        const date = new Date(data.display_date);
        const day = date.getDay();
        if (day === 6) {
            return { backgroundColor: '#fcfdfe' };
        }
        if (day === 0) {
            return { backgroundColor: '#fcfcfe' };
        }
    };

    // Computed
    const editReservationDetails = computed(() => props.reservation_details);
    const groupedRooms = computed(() => {
        if (!editReservationDetails.value) return [];

        const groups = {};
        editReservationDetails.value.forEach((item) => {
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
    const allGroupsPeopleCountMatch = computed(() => {
        return groupedRooms.value.every(group => allPeopleCountMatch(group));
    });

    // Map group details with formatted date
    const formattedGroupDetails = (details) => {
        return details.map((item) => ({
            ...item,
            price: formatCurrency(item.price),
            display_date: formatDateWithDay(item.date),
        }));
    };

    // Room
    const openBulkEditDialog = async (group) => {
        const hotelId = props.reservation_details.value[0].hotel_id;
        const startDate = props.reservation_details.value[0].check_in;
        const endDate = props.reservation_details.value[0].check_out;

        await fetchAvailableRooms(hotelId, startDate, endDate);
        await fetchPlansForHotel(hotelId);
        // Addons
        addonOptions.value = await fetchAllAddons(hotelId);
        selectedGroup.value = group;
        bulkEditDialogTab.value = 0;
        bulkEditDialogVisible.value = true;
        initializeGuests();
        if(clients.value.length === 0) {
            setClientsIsLoading(true);
            const clientsTotalPages = await fetchClients(1);
            // Fetch clients for all pages
            for (let page = 2; page <= clientsTotalPages; page++) {
                await fetchClients(page);
            }
            setClientsIsLoading(false);            
        }
    };
    const handleTabChange = async (newTabValue) => {

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
        targetRoom.value = null;
        numberOfPeopleToMove.value = 0;  
        roomsAvailableChanges.value = [];

        if(bulkEditDialogVisible.value){
            // console.log('bulkEditDialogVisible is true');
            bulkEditDialogTab.value = newTabValue * 1;
            
            // Guest edit
            if(bulkEditDialogTab.value  === 2){
                initializeGuests();
                // console.log('Guest edit tab selected.');                
            }
            // Period change
            if(bulkEditDialogTab.value  === 4){                    
                const hotelId = editReservationDetails.value[0].hotel_id;
                console.log('selectedGroup', selectedGroup.value.room_id);
                const roomId = selectedGroup.value.room_id;
                newCheckIn.value = new Date(editReservationDetails.value[0].check_in);
                newCheckOut.value = new Date(editReservationDetails.value[0].check_out);

                const checkIn = formatDate(newCheckIn.value);
                const checkOut = formatDate(newCheckOut.value);

                const results = await getAvailableDatesForChange(hotelId, roomId, checkIn, checkOut);

                if (results.earliestCheckIn) {
                    minCheckIn.value = new Date(results.earliestCheckIn);
                } else {
                    minCheckIn.value = null; // Ensuring it's null when there's no value
                }

                if (results.latestCheckOut) {
                    maxCheckOut.value = new Date(results.latestCheckOut);
                } else {
                    maxCheckOut.value = null; // Ensuring it's null when there's no value
                }
                                
                // console.log('in',minCheckIn.value,'out',maxCheckOut.value);
            }
        }

    };
    // Day
    const openReservationDayDetailDialog = async (day) => {   
        dialogHotelId.value = day.hotel_id;            
        dialogReservationId.value = day.reservation_id;
        dialogReservationDtlId.value = day.id;
        
        changeReservationDayDetailDialogVisible.value = true;
    };
    const closeChangeReservationDayDetailDialog = async () => {
        
        // dialogHotelId.value = null;
        // dialogReservationId.value = null;
        // dialogReservationDtlId.value = null;
        await fetchReservation(props.reservation_id);

        changeReservationDayDetailDialogVisible.value = false;
    };
    
    onMounted(async () => {
        console.log('onMounted RoomView:', props.reservation_details);
    });

</script>