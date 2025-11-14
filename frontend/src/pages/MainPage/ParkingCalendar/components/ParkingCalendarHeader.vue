<template>
    <div class="flex justify-between items-center w-full">
        <div class="flex flex-col col-span-2">
            <h2 class="text-2xl font-bold dark:text-gray-100" v-if="selectedHotel">{{ selectedHotel.name }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">駐車場カレンダー</p>
        </div>
        <div class="flex items-center">
            <p class="mr-2 dark:text-gray-100">日付へ飛ぶ：</p>
            <InputText v-model="centerDate" type="date" fluid required
                class="dark:bg-gray-800 dark:text-gray-100 rounded" />
        </div>
        <div class="flex justify-end">
            <SelectButton optionLabel="label" optionValue="value" :options="tableModeOptions" v-model="isCompactView"
                class="dark:bg-gray-800 dark:text-gray-100" />
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { InputText, SelectButton } from 'primevue';

const props = defineProps({
    selectedHotel: {
        type: Object,
        default: () => ({})
    },
    centerDate: {
        type: String,
        required: true
    },
    isCompactView: {
        type: Boolean,
        required: true
    }
});

const emit = defineEmits(['update:centerDate', 'update:isCompactView']);

const centerDate = ref(props.centerDate);
const isCompactView = ref(props.isCompactView);

watch(() => props.centerDate, (newVal) => {
    centerDate.value = newVal;
});

watch(centerDate, (newVal) => {
    emit('update:centerDate', newVal);
});

watch(() => props.isCompactView, (newVal) => {
    isCompactView.value = newVal;
});

watch(isCompactView, (newVal) => {
    emit('update:isCompactView', newVal);
});

const tableModeOptions = ref([
    { label: '縮小', value: true },
    { label: '拡大', value: false },
]);
</script>

<style scoped>
/* Add any specific styles for the header here if needed */
</style>
