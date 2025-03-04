<template>
    <div class="p-4">
        <Card>
            <template #title>
                Add Payment
            </template>
            <template #content>
                <form @submit.prevent="addPayment">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label for="paymentType" class="block text-sm font-medium text-gray-700">Payment Type</label>
                            <Select v-model="newPayment.type"   
                                :options="paymentTypes" 
                                placeholder="Select Type"
                                id="paymentType" 
                            />
                        </div>
                        <div>
                            <label for="paymentValue" class="block text-sm font-medium text-gray-700">Value</label>
                            <InputNumber v-model="newPayment.value" mode="currency" currency="USD" locale="en-US" id="paymentValue" />
                        </div>

                        <div>
                            <label for="room" class="block text-sm font-medium text-gray-700">Room</label>
                            <Select v-model="newPayment.room" :options="availableRooms" optionLabel="roomNumber" placeholder="Select Room" id="room" />
                        </div>

                        <div>
                            <label for="payerClientId" class="block text-sm font-medium text-gray-700">Payer Client ID</label>
                            <Select v-model="newPayment.payerClientId" :options="clientIds" placeholder="Select Client ID" id="payerClientId" />
                        </div>                        
                        <div class="mt-4">
                            <Button label="Add Payment" class="p-button-primary" type="submit" />
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
    import { ref, computed } from 'vue';
    import { Card, Select, InputNumber, Button } from 'primevue';
    import { DataTable, Column } from 'primevue';
    
    const props = defineProps({        
        hotel_id: {
            type: [Number],
            required: true,
        },
        reservation_id: {
            type: [String],
            required: true,
        },
    });

    // Mock Data (Replace with your actual data)
    const reservation = ref({
        rooms: [{ roomNumber: '101' }, { roomNumber: '102' }],
        clients: [{ id: 'C1' }, { id: 'C2' }],
        billableAmount: 500,
    });

    const availableRooms = computed(() => reservation.value.rooms);
    const clientIds = computed(() => reservation.value.clients.map(client => client.id));
    const billableAmount = computed(() => reservation.value.billableAmount);

    const paymentTypes = ['Cash', 'Card', 'Billing', 'Check']; // Replace with your payment types
    const payments = ref([
    { date: '2023-10-26', type: 'Card', value: 200, room: { roomNumber: '101' }, payerClientId: 'C1', billingNo: 'B123' },
    { date: '2023-10-25', type: 'Cash', value: 150, room: { roomNumber: '102' }, payerClientId: 'C2', billingNo: 'B124' },
    ]);

    const newPayment = ref({
    type: null,
    value: null,
    room: null,
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
</script>

<style scoped>

</style>
