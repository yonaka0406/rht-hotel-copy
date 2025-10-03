<template>
    <StatCard
        title="ホテル"
        :value="hotelCount"
        colorClass="bg-green-50 dark:bg-green-900/20"
        titleColorClass="text-green-800 dark:text-green-300"
        valueColorClass="text-green-600 dark:text-green-400"
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useHotelStore } from '@/composables/useHotelStore';
import StatCard from './StatCard.vue';

const { hotels, fetchHotels } = useHotelStore();
const hotelCount = ref(0);

onMounted(async () => {
    await fetchHotels();
    hotelCount.value = hotels.value?.length || 0;
});
</script>