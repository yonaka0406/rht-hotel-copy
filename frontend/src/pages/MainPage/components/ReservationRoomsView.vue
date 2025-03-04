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
</template>
<script setup>
    import { ref, watch, computed, onMounted, onUnmounted } from 'vue';
    import { useHotelStore } from '@/composables/useHotelStore';
    import { useReservationStore } from '@/composables/useReservationStore';
    import { usePlansStore } from '@/composables/usePlansStore';
    import { useClientStore } from '@/composables/useClientStore';

    import { Panel, Card, Divider, Dialog, Tabs, TabList, Tab, TabPanels,TabPanel, ConfirmPopup } from 'primevue';
    import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue';
    import { DataTable, Column, Button } from 'primevue';
    import { FloatLabel, InputText, InputNumber, AutoComplete, Select, MultiSelect, SelectButton, DatePicker } from 'primevue';

    const props = defineProps({        
        reservation_details: {
            type: [Object],
            required: true,
        },        
    });

    const { selectedHotelId, setHotelId } = useHotelStore();
    const { reservationId, setReservationId, availableRooms, reservationDetails, fetchReservation, fetchReservations, fetchAvailableRooms, setCalendarChange, getAvailableDatesForChange,  setReservationStatus, setReservationType, changeReservationRoomGuestNumber, setRoomPlan, deleteHoldReservation, deleteReservationRoom } = useReservationStore();        
    const { plans, addons, fetchPlansForHotel, fetchPlanAddons, fetchAllAddons } = usePlansStore();
    const { clients, fetchClients, setClientsIsLoading } = useClientStore();

    // Helper
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

    // Computed
    const editReservationDetails = computed(() => reservationDetails.value.reservation);
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

    onMounted(async () => {
        console.log('onMounted RoomView:',props.reservation_details);
    });

</script>