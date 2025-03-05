<template>
    <div class="p-4">
        <Card>            
            <template #content>
                <form @submit.prevent="addPayment">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <!-- Date -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>日付</label>
                                <InputText v-model="newPayment.date" 
                                    type="date" 
                                    fluid
                                    required
                                />
                            </FloatLabel>
                        </div>
                        <!-- Transaction type -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>支払い方法</label>
                                <Select v-model="newPayment.type"   
                                    :options="paymentTypes"                                     
                                    optionLabel="name"
                                    optionValue="transaction"
                                    fluid
                                    required
                                />
                            </FloatLabel>                            
                        </div>
                        <!-- Room -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>部屋</label>
                                <Select v-model="newPayment.room_id" 
                                    :options="reservationRooms"
                                    optionLabel="room_number"
                                    optionValue="room_id"
                                    fluid
                                    required 
                                />
                            </FloatLabel>   
                        </div>
                        <!-- Value -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>金額</label>
                                <InputNumber v-model="newPayment.value" 
                                    mode="currency" 
                                    currency="JPY" locale="jp-JA" 
                                    fluid
                                    required
                                />
                            </FloatLabel>
                        </div>
                        <!-- Client -->
                        <div class="mb-4">
                            <FloatLabel>
                                <label>支払者</label>
                                <Select v-model="newPayment.payerClientId" 
                                    :options="clientIds" 
                                    placeholder="支払者"
                                    fluid
                                    required
                                />
                            </FloatLabel>
                        </div>                        
                        <div>
                            <Button label="追加" class="p-button-primary" type="submit" />
                        </div>
                    </div>
                </form>
            </template>
        </Card>

        <h2 class="text-lg font-semibold mb-4">Payments History</h2>
        <DataTable :value="payments" :sort-field="'date'" :sort-order="-1">
            <Column field="date" header="Date"></Column>
            <Column field="type" header="Type"></Column>
            <Column field="value" header="Value"></Column>
            <Column field="room.roomNumber" header="Room"></Column>
            <Column field="payerClientId" header="Payer Client ID"></Column>
            <Column field="billingNo" header="Billing No"></Column>
        </DataTable>

        <div class="mt-4">
            <p>Total Paid/Billed: {{ totalPaidBilled }}</p>
            <p>Billable Amount: {{ billableAmount }}</p>
            <p>Difference: {{ billableAmount - totalPaidBilled }}</p>
        </div>
    </div>
</template>

<script setup>
    // Vue
    import { ref, computed, watch, onMounted } from 'vue';

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
    import { Card, FloatLabel, Select, InputText, InputNumber, Button, DataTable, Column } from 'primevue';    

    // Stores
    import { useSettingsStore } from '@/composables/useSettingsStore';
    const { paymentTypes, fetchPaymentTypes } = useSettingsStore();
    import { useReservationStore } from '@/composables/useReservationStore';
    const { reservationDetails, fetchReservation } = useReservationStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelRooms, setHotelId, fetchHotel } = useHotelStore();

    // Helper
    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Mock Data (Replace with your actual data)
    const reservation = ref({
        rooms: [{ roomNumber: '101' }, { roomNumber: '102' }],
        clients: [{ id: 'C1' }, { id: 'C2' }],
        billableAmount: 500,
    });
    
    const reservationRooms = computed(() => {
        if (!reservationDetails.value || !selectedHotelRooms.value || !reservationDetails.value.reservation) {
            return [];
        }

        const uniqueRoomIds = [...new Set(reservationDetails.value.reservation.map(room => room.room_id))];
        return selectedHotelRooms.value.filter(room => uniqueRoomIds.includes(room.room_id));
    });
    const clientIds = computed(() => reservation.value.clients.map(client => client.id));
    const billableAmount = computed(() => reservation.value.billableAmount);
    
    const payments = ref([
    { date: '2023-10-26', type: 'Card', value: 200, room: { roomNumber: '101' }, payerClientId: 'C1', billingNo: 'B123' },
    { date: '2023-10-25', type: 'Cash', value: 150, room: { roomNumber: '102' }, payerClientId: 'C2', billingNo: 'B124' },
    ]);

    const newPayment = ref({
        date: formatDate(new Date()),
        type: 'cash',
        value: 0,
        room_id: null,
        payerClientId: null,
    });

    const addPayment = () => {
        payments.value.push({
            ...newPayment.value,
            date: new Date().toISOString().slice(0, 10),
            billingNo: 'TBD', // Add logic for billing number here
        });
        newPayment.value = { type: null, value: null, room: null, payerClientId: null };
    };

    const totalPaidBilled = computed(() => {
    return payments.value.reduce((acc, payment) => acc + payment.value, 0);
    });

    onMounted( async () => {   
        console.log('onMounted ReservationPayments;', props.reservation_details);

        await setHotelId(reservationDetails.value.reservation.hotel_id);
        await fetchHotel(); 
        
        await fetchPaymentTypes();                

        const uniqueRoomIds = [...new Set(props.reservation_details.map(room => room.room_id))];
        newPayment.value.room_id = uniqueRoomIds[0];

        

         console.log('onMounted newPayment:', newPayment.value)
    });
/*
    watch(reservationRooms, (newValue, oldValue) => {
        console.log('reservationRooms changed:', newValue);
    });
*/
</script>

<style scoped>

</style>
