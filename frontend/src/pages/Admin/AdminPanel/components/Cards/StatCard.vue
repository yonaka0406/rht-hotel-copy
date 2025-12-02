<template>
    <div :class="[colorClass, 'p-5 rounded-lg flex flex-col shadow dark:shadow-gray-900/50']">
        <div class="grow min-h-[3rem]">
            <h3 :class="[titleColorClass, 'text-md font-semibold']">{{ title }}</h3>
        </div>
        <div class="mt-auto">
            <p :class="[valueColorClass, 'text-3xl font-bold']">{{ value }}</p>
            <p v-if="subText" :class="[subTextColorClass, 'text-sm']">{{ subText }}</p>
        </div>
    </div>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        required: true,
    },
    value: {
        type: [String, Number],
        required: true,
    },
    subText: {
        type: String,
        default: '',
    },
    colorClass: {
        type: String,
        default: 'bg-gray-50 dark:bg-gray-900/20',
    },
    titleColorClass: {
        type: String,
        default: 'text-gray-800 dark:text-gray-300',
    },
    valueColorClass: {
        type: String,
        default: 'text-gray-600 dark:text-gray-400',
    },
    subTextColorClass: {
        type: String,
        default: 'text-gray-500 dark:text-gray-400',
    },
});
</script>

<style scoped>
/* No specific styles needed here as Tailwind classes are used */
</style>