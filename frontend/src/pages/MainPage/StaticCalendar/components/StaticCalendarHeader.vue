<template>
    <div class="flex grid grid-cols-6 w-full items-center mb-4">
        <div class="flex flex-col col-span-2">
            <h2 class="text-2xl font-bold dark:text-gray-100" v-if="selectedHotel">{{ selectedHotel.name }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">予約照会</p>
        </div>
        <div class="flex flex-wrap gap-2 p-2 col-span-3">
            <div v-for="item in uniqueLegendItems" :key="item.plan_name" class="flex items-center gap-2">
                <span class="w-4 h-4 rounded-full" :style="{ backgroundColor: item.plan_color }"></span>
                <span class="text-xs text-surface-700 dark:text-surface-300">{{ item.plan_name }}</span>
            </div>
        </div>
        <div class="flex items-center gap-2 col-span-1">
            <DatePicker v-model="currentMonthValue" view="month" dateFormat="yy/mm" :showIcon="true"
                class="p-inputtext-sm" fluid />
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import DatePicker from 'primevue/datepicker';

const props = defineProps({
    selectedHotel: {
        type: Object,
        default: null
    },
    uniqueLegendItems: {
        type: Array,
        default: () => []
    },
    currentMonth: {
        type: Date,
        default: () => new Date()
    }
});

const emit = defineEmits(['update:currentMonth']);

const currentMonthValue = computed({
    get: () => props.currentMonth,
    set: (value) => emit('update:currentMonth', value)
});
</script>

<style scoped>
/* Add any specific styles for this header component here if needed */
</style>
