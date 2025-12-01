<template>
    <StatCard
        title="本日の予約"
        :value="reservationsTodayCount"
        :subText="reservationsTodayValue > 0 ? '¥' + reservationsTodayValue.toLocaleString() : ''"
        colorClass="bg-purple-50 dark:bg-purple-900/20"
        titleColorClass="text-purple-800 dark:text-purple-300"
        valueColorClass="text-purple-600 dark:text-purple-400"
        subTextColorClass="text-purple-500 dark:text-purple-400"
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMetricsStore } from '@/composables/useMetricsStore';
import StatCard from './StatCard.vue';

const { reservationsToday, fetchReservationsToday } = useMetricsStore();

const props = defineProps({
    hotels: {
        type: Array,
        required: true,
    },
    todayDateString: {
        type: String,
        required: true,
    },
});

const reservationsTodayCount = ref(0);
const reservationsTodayValue = ref(0);

onMounted(async () => {
    let accumulatedReservationsCount = 0;
    let accumulatedReservationsValue = 0;

    if (props.hotels && Array.isArray(props.hotels)) {
        for (const hotel of props.hotels) {
            if (hotel && typeof hotel.id !== 'undefined') {
                try {
                    await fetchReservationsToday(hotel.id, props.todayDateString);
                    if (reservationsToday.value) {
                        accumulatedReservationsCount += Number(reservationsToday.value.reservationsCount) || 0;
                        accumulatedReservationsValue += Number(reservationsToday.value.reservationsValue) || 0;
                    } else {
                        console.warn(`ホテル ${hotel.id} の予約データが見つかりませんでした。`);
                    }
                } catch (error) {
                    console.error(`ホテル ${hotel.id} の予約取得エラー:`, error);
                }
            } else {
                console.warn("IDがないためホテルをスキップします:", hotel);
            }
        }
    }

    reservationsTodayCount.value = accumulatedReservationsCount;
    reservationsTodayValue.value = accumulatedReservationsValue;
});
</script>