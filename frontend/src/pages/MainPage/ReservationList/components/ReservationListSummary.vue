<template>
    <Drawer :visible="visible" @update:visible="$emit('update:visible', $event)" :modal="false" :position="'right'"
        :style="{ width: '33vh' }">
        <template #header><span class="text-lg font-bold">選択された予約の詳細</span></template>
        <div class="grid grid-cols-2 gap-4">
            <Card>
                <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ selectedReservations.length }}件</p>
                        <p class="justify-self-center">選択された件数</p>
                    </div>
                </template>
            </Card>
            <Card>
                <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ totalPeople }}人</p>
                        <p class="justify-self-center">合計人数</p>
                    </div>
                </template>
            </Card>
            <Card>
                <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ totalPeopleNights }}泊</p>
                        <p class="justify-self-center">合計宿泊数</p>
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ formatCurrency(totalPrice) }}</p>
                        <p class="justify-self-center">料金合計</p>
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ formatCurrency(totalPayments) }}</p>
                        <p class="justify-self-center">入金合計</p>
                    </div>
                </template>
            </Card>

            <Card>
                <template #content>
                    <div class="grid grid-cols-1">
                        <p class="text-lg font-bold justify-self-center">{{ formatCurrency(totalBalance) }}</p>
                        <p class="justify-self-center">残高合計</p>
                    </div>
                </template>
            </Card>
        </div>
    </Drawer>
</template>

<script setup>
import { computed } from 'vue';
import { Drawer, Card } from 'primevue';

const props = defineProps({
    visible: {
        type: Boolean,
        required: true
    },
    selectedReservations: {
        type: Array,
        default: () => []
    }
});

defineEmits(['update:visible']);

const formatCurrency = (value) => {
    if (value == null) return '';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
};

const totalPrice = computed(() => {
    if (!props.selectedReservations) { return 0; }
    return props.selectedReservations.reduce((sum, reservation) => {
        const price = Number(reservation.price);
        if (!isNaN(price)) {
            return sum + price;
        } else {
            return sum;
        }
    }, 0);
});

const totalPayments = computed(() => {
    if (!props.selectedReservations) { return 0; }
    return props.selectedReservations.reduce((sum, reservation) => {
        const payment = Number(reservation.payment);
        if (!isNaN(payment)) {
            return sum + payment;
        } else {
            return sum;
        }
    }, 0);
});

const totalBalance = computed(() => {
    if (!props.selectedReservations) { return 0; }
    return props.selectedReservations.reduce((sum, reservation) => sum + ((reservation.price || 0) - (reservation.payment || 0)), 0);
});

const totalPeopleNights = computed(() => {
    if (!props.selectedReservations) { return 0; }
    const formattedTotalPeopleNights = props.selectedReservations.reduce((sum, reservation) => sum + ((reservation.number_of_people || 0) * (reservation.number_of_nights || 0)), 0);
    return formattedTotalPeopleNights.toLocaleString();
});

const totalPeople = computed(() => {
    if (!props.selectedReservations) { return 0; }
    return props.selectedReservations.reduce((sum, reservation) => sum + (reservation.number_of_people || 0), 0);
});
</script>
