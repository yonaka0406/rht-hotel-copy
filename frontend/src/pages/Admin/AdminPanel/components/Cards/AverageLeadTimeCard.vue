<template>
    <StatCard
        title="平均リードタイム"
        :value="averageLeadTimeDays !== null ? averageLeadTimeDays.toFixed(1) + ' 日' : 'N/A'"
        :subText="averageLeadTimeDays !== null ? '本日の予約' : ''"
        colorClass="bg-orange-50 dark:bg-orange-900/20"
        titleColorClass="text-orange-800 dark:text-orange-300"
        valueColorClass="text-orange-600 dark:text-orange-400"
        subTextColorClass="text-orange-500 dark:text-orange-400"
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMetricsStore } from '@/composables/useMetricsStore';
import StatCard from './StatCard.vue';

const { averageBookingLeadTime, fetchBookingLeadTime } = useMetricsStore();

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

const averageLeadTimeDays = ref(0);

onMounted(async () => {
    let accumulatedWeightedLeadTime = 0;
    let accumulatedTotalNights = 0;

    if (props.hotels && Array.isArray(props.hotels)) {
        for (const hotel of props.hotels) {
            if (hotel && typeof hotel.id !== 'undefined') {
                try {
                    await fetchBookingLeadTime(hotel.id, 0, props.todayDateString);
                    if (averageBookingLeadTime.value) {
                        const leadTime = Number(averageBookingLeadTime.value.average_lead_time) || 0;
                        const nights = Number(averageBookingLeadTime.value.total_nights) || 0;

                        if (nights > 0) {
                            accumulatedWeightedLeadTime += leadTime * nights;
                            accumulatedTotalNights += nights;
                        }
                    } else {
                        console.warn(`ホテル ${hotel.id} の予約リードタイムデータが見つかりませんでした。`);
                    }
                } catch (error) {
                    console.error(`ホテル ${hotel.id} の予約取得エラー:`, error);
                }
            } else {
                console.warn("IDがないためホテルをスキップします:", hotel);
            }
        }
    }

    averageLeadTimeDays.value = accumulatedTotalNights > 0 ? accumulatedWeightedLeadTime / accumulatedTotalNights : 0;
});
</script>