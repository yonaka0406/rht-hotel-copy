<template>
    <div>        
        <!-- Form or fields to edit the reservation details -->
        <Card class="m-2">
            <template #title>予約編集</template>
            <template #content>
                <p>ID: {{ reservation_id }}</p>
                <div 
                    v-if="editReservationDetails && editReservationDetails.length > 0"
                    class="p-fluid flex flex-wrap"
                >
                    <div class="field w-full mb-2 mt-2">予約者： {{ editReservationDetails[0].client_name }}</div>
                    <div class="field w-1/3" >
                        人数： <br/> {{ editReservationDetails[0].reservation_number_of_people }}
                        <i class="pi pi-user ml-1"></i>
                    </div>
                    <div class="field w-1/3">
                        チェックイン： <br/> {{ editReservationDetails[0].check_in }} 
                        <i class="pi pi-arrow-down-right ml-1"></i>
                    </div>
                    <div class="field w-1/3">
                        チェックアウト： <br/> {{ editReservationDetails[0].check_out }} 
                        <i class="pi pi-arrow-up-right ml-1"></i>
                    </div>
                    <div class="field w-1/3">
                        ステータス： {{ editReservationDetails[0].status }}
                    </div>
                </div>
                <div v-else>Loading reservation information...</div>
            </template>
            
        </Card>

        <!-- Rooms Data Table -->
        <Card class="m-2">
            <template #title>Rooms</template>
            <template #content>
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

                                </div>
                                <div class="col-span-2 text-right">
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
                            <DataTable :value="formattedGroupDetails(group.details)">
                                <Column field="display_date" header="Date" class="text-xs" />
                                <Column field="plan_name" header="Plan" class="text-xs" />
                                <Column field="number_of_people" header="People" class="text-xs" />
                                <Column field="price" header="Rate" class="text-xs" />
                            </DataTable>
                        </AccordionContent>                        
                    </AccordionPanel>
                </Accordion>                
            </template>
        </Card>

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
                    </TabList>
                     
                    <TabPanels>
                        <!-- Tab 1: Apply Plan -->
                        <TabPanel value="0">
                            <h4 class="mb-3 font-bold">プラン適用</h4>
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
                            <div class="field mt-6">
                                <DataTable :value="selectedAddon" class="p-datatable-sm">
                                    <Column field="name" header="アドオン名" />                        
                                    <Column field="quantity" header="数量">
                                        <template #body="slotProps">
                                            <InputNumber 
                                                v-model="slotProps.data.quantity" 
                                                :min="0" 
                                                placeholder="数量を記入" 
                                                class="w-full" 
                                            />
                                        </template>
                                    </Column>
                                    <Column field="price" header="価格">
                                        <template #body="slotProps">
                                            <InputNumber 
                                                v-model="slotProps.data.price" 
                                                :min="0" 
                                                placeholder="価格を記入" 
                                                class="w-full" 
                                            />
                                        </template>
                                    </Column>
                                </DataTable>
                            </div>
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
                    </TabPanels>                     
                </Tabs>
         
            </div>
            <template #footer>
                <Button label="Apply" icon="pi pi-check" class="p-button-success p-button-text p-button-sm" @click="applyChanges" />
                <Button label="キャンセル" icon="pi pi-times" class="p-button-danger p-button-text p-button-sm" text @click="closeBulkEditDialog" />                
            </template>            
        </Dialog>

    </div>
</template>

<script>
import { ref, watch, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';  
import { useToast } from 'primevue/usetoast';
import { useConfirm } from "primevue/useconfirm";

import { useHotelStore } from '../../../composables/useHotelStore';
import { useReservationStore } from '@/composables/useReservationStore';
import { usePlansStore } from '@/composables/usePlansStore';

import { Panel, Card, Dialog, Tabs, TabList, Tab, TabPanels,TabPanel } from 'primevue';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue';
import { DataTable, Column } from 'primevue';
import { FloatLabel, InputNumber, Select, MultiSelect, Button } from 'primevue';


export default {
    props: {
        reservation_id: {
            type: String,
            required: true,
        },
    },
    name: "ReservationEdit",
    components: { 
        Panel,  
        Card,
        Dialog,
        Tabs,
        TabList,
        Tab,
        TabPanels,
        TabPanel,
        Accordion,
        AccordionPanel,
        AccordionHeader,
        AccordionContent, 
        DataTable,
        Column,
        FloatLabel, 
        InputNumber, 
        Select,
        MultiSelect,
        Button,
    },
    setup(props) {
        const router = useRouter();
        const toast = useToast();
        const { selectedHotelId } = useHotelStore();
        const { availableRooms, reservationDetails, fetchReservation, fetchAvailableRooms, setReservationId } = useReservationStore();
        const { plans, addons, fetchPlansForHotel, fetchPlanAddons } = usePlansStore();
        const editReservationDetails = computed(() => reservationDetails.value.reservation);        
        const daysOfWeek = [
            { label: 'Monday', value: 'mon' },
            { label: 'Tuesday', value: 'tue' },
            { label: 'Wednesday', value: 'wed' },
            { label: 'Thursday', value: 'thu' },
            { label: 'Friday', value: 'fri' },
            { label: 'Saturday', value: 'sat' },
            { label: 'Sunday', value: 'sun' },
        ];
        const bulkEditDialogVisible = ref(false);
        const selectedGroup = ref(null);
        const selectedPlan = ref(null);
        const selectedDays = ref(daysOfWeek);
        const selectedAddon = ref();
        const targetRoom = ref(null);
        const numberOfPeopleToMove = ref(0);
        const filteredRooms = computed(() => {
            return availableRooms.value
                .filter(room => room.capacity >= numberOfPeopleToMove.value) // Ensure room can fit the people count
                .map(room => ({
                    label: `${room.room_number} - ${room.room_type_name} (${room.capacity}) ${room.smoking ? ' 🚬' : ''} (${room.floor}階)`,
                    value: room.room_id, // Value for selection
                }));
        });

        // Helper
        const formatDateWithDay = (date) => {
            const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
            const parsedDate = new Date(date);
            return `${parsedDate.toLocaleDateString(undefined, options)}`;
        };

        const formatCurrency = (value) => {
            if (value == null) return '';
            return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
          }

        // Map group details with formatted date
        const formattedGroupDetails = (details) => {
            return details.map((item) => ({
                ...item,
                price: formatCurrency(item.price),
                display_date: formatDateWithDay(item.date),
            }));
        };
        
        const updatePlanAddOns = async () => {
            if (selectedPlan.value) {                
                const gid = selectedPlan.value?.plans_global_id ?? 0;
                const hid = selectedPlan.value?.plans_hotel_id ?? 0;
                const hotel_id = editReservationDetails.value[0]?.hotel_id ?? 0;


                try {
                    // Fetch add-ons from the store
                    await fetchPlanAddons(gid, hid, hotel_id);                    
                } catch (error) {
                    console.error('Failed to fetch plan add-ons:', error);
                    addons.value = [];                    
                }
            }
        };

        function handleTabChange (newTabValue) {
            //console.log(newTabValue);
            selectedPlan.value = null;
            
            selectedDays.value = [
                { label: 'Monday', value: 'mon' },
                { label: 'Tuesday', value: 'tue' },
                { label: 'Wednesday', value: 'wed' },
                { label: 'Thursday', value: 'thu' },
                { label: 'Friday', value: 'fri' },
                { label: 'Saturday', value: 'sat' },
                { label: 'Sunday', value: 'sun' },
            ];
            
            addons.value = [];
            targetRoom.value = null;
            numberOfPeopleToMove.value = 0;
        };

        const openBulkEditDialog = (group) => {
            selectedGroup.value = group;
            bulkEditDialogVisible.value = true;
        };

        const closeBulkEditDialog = () => {
            bulkEditDialogVisible.value = false;
            
            selectedGroup.value = null;
            selectedPlan.value = null;
            
            selectedDays.value = [
                { label: 'Monday', value: 'mon' },
                { label: 'Tuesday', value: 'tue' },
                { label: 'Wednesday', value: 'wed' },
                { label: 'Thursday', value: 'thu' },
                { label: 'Friday', value: 'fri' },
                { label: 'Saturday', value: 'sat' },
                { label: 'Sunday', value: 'sun' },
            ];
            
            addons.value = [];
            targetRoom.value = null;
            numberOfPeopleToMove.value = 0;
            
        };

        const applyChanges = async () => {
            // Map selectedDays to a set of day values for efficient comparison
            const selectedDayValues = new Set(selectedDays.value.map(day => day.value));

            // Filter selectedGroup.details based on the day of the week
            const filteredGroup = selectedGroup.value.details
                .filter(detail => {
                    const dayOfWeek = new Date(detail.date).toLocaleString('en-US', { weekday: 'short' }).toLowerCase();
                    return selectedDayValues.has(dayOfWeek); // Match with selectedDays
                })
                .map(detail => {
                    // If a plan is selected, update plans_global_id and plans_hotel_id
                    if (selectedPlan.value) {
                        return {
                            ...detail,
                            plans_global_id: selectedPlan.value.plans_global_id,
                            plans_hotel_id: selectedPlan.value.plans_hotel_id,
                            reservation_id: props.reservation_id,
                        };
                    }
                    return {
                        ...detail,
                        reservation_id: props.reservation_id,
                    };
                });
            // console.log('filteredGroup:',filteredGroup)

            // Prepare the data to be sent in the PUT request
            //const dataToUpdate = [];
            
            // Prepare the data to be sent in the PUT request
            const dataToUpdate = filteredGroup.map(group => {
                // Check if the number of people to move is 0 or equal to number of people in reservation
                if (numberOfPeopleToMove.value === 0 || numberOfPeopleToMove.value === group.number_of_people) {
                    return {
                        id: group.id, // The reservation detail id
                        hotel_id: group.hotel_id, // The hotel id
                        room_id: targetRoom.value ? targetRoom.value.value : group.room_id,
                        plans_global_id: group.plans_global_id, // Updated plans_global_id
                        plans_hotel_id: group.plans_hotel_id,
                        number_of_people: group.number_of_people, // Number of people
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };
                } else if (numberOfPeopleToMove.value < group.number_of_people) {
                    // Create the first updated entry for the current room with the reduced number of people
                    const updatedCurrentRoom = {
                        reservation_id: group.reservation_id, // The reservation id
                        id: group.id, // The reservation detail id
                        hotel_id: group.hotel_id, // The hotel id
                        date: group.date, // The date
                        room_id: group.room_id, // Current room stays as it is
                        plans_global_id: group.plans_global_id, // Updated plans_global_id
                        plans_hotel_id: group.plans_hotel_id, // Updated plans_hotel_id
                        number_of_people: group.number_of_people - numberOfPeopleToMove.value, // Reduce number of people in the current room
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };

                    // Create the second entry for the new room with numberOfPeopleToMove.value people
                    const newRoomEntry = {
                        reservation_id: group.reservation_id, // The reservation id
                        id: null, // This is a new entry, so no existing id
                        ogm_id: group.id,
                        hotel_id: group.hotel_id, // The hotel id
                        date: group.date, // The date
                        room_id: targetRoom.value ? targetRoom.value.value : group.room_id, // New room with targetRoom if available
                        plans_global_id: group.plans_global_id, // Use selected plan if available, else fallback to existing
                        plans_hotel_id: group.plans_hotel_id, // Use selected plan if available, else fallback to existing
                        number_of_people: numberOfPeopleToMove.value, // Number of people to move
                        price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                        addons: selectedAddon.value.map(addon => ({
                            id: addon.id,
                            addons_global_id: addon.addons_global_id,
                            addons_hotel_id: addon.addons_hotel_id,
                            plans_global_id: addon.plans_global_id,
                            plans_hotel_id: addon.plans_hotel_id,
                            price: addon.price,
                            quantity: addon.quantity
                        }))
                    };
                    // Return both the updated current room and the new room
                    return [updatedCurrentRoom, newRoomEntry];                   
                }

                // Default case: Return the original room if no conditions match
                return {
                    reservation_id: group.reservation_id, // The reservation id
                    id: group.id, // The reservation detail id
                    hotel_id: group.hotel_id, // The hotel id
                    room_id: group.room_id, // The room id
                    date: group.date, // The date
                    plans_global_id: group.plans_global_id, // Updated plans_global_id
                    plans_hotel_id: group.plans_hotel_id, // Updated plans_hotel_id
                    number_of_people: group.number_of_people, // Number of people
                    price: group.price === null ? 0 : group.price, // Updated price (if applicable)
                    addons: selectedAddon.value.map(addon => ({
                        id: addon.id,
                        addons_global_id: addon.addons_global_id,
                        addons_hotel_id: addon.addons_hotel_id,
                        plans_global_id: addon.plans_global_id,
                        plans_hotel_id: addon.plans_hotel_id,
                        price: addon.price,
                        quantity: addon.quantity
                    }))
                };
            }).flat();

            console.log('dataToUpdate', dataToUpdate);

            try {
                for (const data of dataToUpdate) {
                    const authToken = localStorage.getItem('authToken');

                    if (data.id === null) {
                        // When `id` is null, make a POST request instead
                        const response = await fetch(`/api/reservation/update/details/`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to create a new reservation
                        });

                        const newReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error creating new reservation detail: ${newReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Created New Reservation:', newReservation);
                    } else {
                        // For existing reservations, make a PUT request
                        const response = await fetch(`/api/reservation/update/details/${data.id}`, {
                            method: 'PUT',
                            headers: {
                                'Authorization': `Bearer ${authToken}`, // Pass token for authentication
                                'Content-Type': 'application/json', // Ensure the body is JSON
                            },
                            body: JSON.stringify(data), // Send the data to update
                        });

                        const updatedReservation = await response.json(); // Parse the response as JSON

                        if (!response.ok) {
                            throw new Error(`Error updating reservation detail: ${updatedReservation.error || 'Unknown error'}`);
                        }
                        //console.log('Updated Reservation:', updatedReservation);
                    }
                }

                await fetchReservation(props.reservation_id);

                closeBulkEditDialog();

                // Provide feedback to the user (optional)                
                toast.add({ severity: 'success', summary: 'Success', detail: 'Reservation details updated successfully!', life: 3000 });
                
            } catch (error) {
                console.error('Failed to apply changes:', error);                
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to apply changes.', life: 3000 });
            }
        };

        const allHavePlan = (group) => {
            return group.details.every(
                (detail) => detail.plans_global_id || detail.plans_hotel_id
            );
        };

        const goToNewReservation = () => {                
            setReservationId(null);                
            router.push({ name: 'ReservationsNew' });
        };

        // Group rooms by room_id and room_type
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

        // Fetch reservation details on mount
        onMounted(async () => {
            //await fetchReservation(props.reservation_id);
            
        });

        // Watch
        watch(() => props.reservation_id, async (newReservationId, oldReservationId) => {
            if (newReservationId !== oldReservationId) {
                //console.log("reservation_id changed:", newReservationId);
                await fetchReservation(newReservationId);
                console.id('editReservationDetails.value[0].hotel_id:', editReservationDetails.value[0].hotel_id);
                await fetchPlansForHotel(editReservationDetails.value[0].hotel_id);
            }
        });            
        watch(editReservationDetails, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('editReservationDetails changed:', newValue);
                fetchPlansForHotel(editReservationDetails.value[0].hotel_id);
            }
        }, { deep: true });
        watch(groupedRooms, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('groupedRooms changed:', newValue);
            }
        }, { deep: true });
        watch(selectedGroup, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('selectedGroup changed:', newValue);
                if (newValue && newValue.details && newValue.details.length > 0) {
                    const details = newValue.details;
                    const startDate = details[0].check_in;
                    const endDate = details[0].check_out;        

                    fetchAvailableRooms(editReservationDetails.value[0].hotel_id, startDate, endDate);
                }                
            }
        }, { deep: true });
        watch(plans, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('plans changed:', newValue);
            }
        }, { deep: true });
        watch(selectedPlan, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('selectedPlan changed:', newValue);
            }
        }, { deep: true });
        watch(selectedDays, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('selectedDays changed:', newValue);
            }
        }, { deep: true });
        watch(addons, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('addons changed:', newValue);
                // Add a 'quantity' field with default value 1 to each add-on
                selectedAddon.value = newValue.map(addon => ({
                    ...addon,
                    quantity: 1
                }));
            }
        }, { deep: true });
        watch(selectedAddon, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('selectedAddon changed:', newValue);
            }
        }, { deep: true });        
        watch(availableRooms, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                //console.log('availableRooms changed:', newValue);
            }
        }, { deep: true });
        watch(targetRoom, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('targetRoom changed:', newValue);
            }
        }, { deep: true });
        watch(numberOfPeopleToMove, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('numberOfPeopleToMove changed:', newValue);
            }
        }, { deep: true });
        watch(selectedHotelId, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                console.log('selectedHotelId changed:', newValue);
                if (newValue !== editReservationDetails.value[0]?.hotel_id) {
                    goToNewReservation();
                }
                
            }
        }, { deep: true });

        return {    
            formatCurrency,        
            editReservationDetails,
            groupedRooms,
            formattedGroupDetails,
            bulkEditDialogVisible,
            selectedGroup,
            selectedPlan,
            selectedDays,
            selectedAddon,            
            targetRoom,
            numberOfPeopleToMove,
            filteredRooms,
            plans,
            daysOfWeek,
            availableRooms,
            updatePlanAddOns,
            handleTabChange,
            openBulkEditDialog,
            closeBulkEditDialog,
            applyChanges,
            allHavePlan,
        };
    },    
};
</script>

<style scoped>

</style>
