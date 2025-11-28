<template>
    <StatCard
        title="順番待ち"
        :value="waitlistCount"
        subText="待機中"
        colorClass="bg-red-50 dark:bg-red-900/20"
        titleColorClass="text-red-800 dark:text-red-300"
        valueColorClass="text-red-600 dark:text-red-400"
        subTextColorClass="text-red-500 dark:text-red-400"
    />
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useMetricsStore } from '@/composables/useMetricsStore';
import StatCard from './StatCard.vue';

const { waitlistEntriesToday, fetchWaitlistEntriesToday } = useMetricsStore();

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

const waitlistCount = ref(0);

onMounted(async () => {
    let accumulatedWaitlistCount = 0;

    if (props.hotels && Array.isArray(props.hotels)) {
        for (const hotel of props.hotels) {
            if (hotel && typeof hotel.id !== 'undefined') {
                try {
                    await fetchWaitlistEntriesToday(hotel.id, props.todayDateString);
                    if (waitlistEntriesToday.value) {
                        accumulatedWaitlistCount += Number(waitlistEntriesToday.value.waitlistCount) || 0;
                    } else {
                        console.warn(`ホテル ${hotel.id} のウェイトリストデータが見つかりませんでした。`);
                    }
                } catch (error) {
                    console.error(`ホテル ${hotel.id} のウェイトリスト取得エラー:`, error);
                }
            } else {
                console.warn("IDがないためホテルをスキップします:", hotel);
            }
        }
    }

    waitlistCount.value = accumulatedWaitlistCount;
});
</script>