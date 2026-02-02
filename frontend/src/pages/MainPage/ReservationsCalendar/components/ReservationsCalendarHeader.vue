<template>
    <div class="grid grid-cols-4 items-center">
        <div class="flex flex-col space-y-2">
            <h2 class="text-2xl font-bold dark:text-gray-100" v-if="hotelName">{{ hotelName }}</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">予約カレンダー</p>
            <div class="flex items-center mt-6">
                <FloatLabel>
                    <InputText :model-value="modelValue.date" @update:modelValue="updateDate" type="date" fluid required
                        class="dark:bg-gray-800 dark:text-gray-100 rounded" />
                    <label class="dark:text-gray-100">日付へ飛ぶ：</label>
                </FloatLabel>
            </div>
        </div>
        <div class="grid grid-cols-5 col-span-2">
            <div v-for="(legendItem, index) in legendItems" :key="index"
                class="flex items-center text-sm rounded m-1 font-bold justify-center whitespace-nowrap"
                style="overflow: hidden; text-overflow: ellipsis"
                :style="{ backgroundColor: `${legendItem.plan_color}` }" v-tooltip="legendItem.plan_name">
                <span>{{ legendItem.plan_name }}</span>
            </div>
        </div>
        <div class="flex justify-end">
            <SelectButton optionLabel="label" optionValue="value" :options="viewOptions"
                :model-value="modelValue.isCompactView" @update:modelValue="updateViewMode"
                class="dark:bg-gray-800 dark:text-gray-100" />
        </div>
    </div>
</template>

<script setup>
import { SelectButton, InputText, FloatLabel } from 'primevue';

const props = defineProps({
    modelValue: {
        type: Object,
        required: true
    },
    legendItems: {
        type: Array,
        default: () => []
    },
    hotelName: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:modelValue']);

const viewOptions = [
    { label: '縮小', value: true },
    { label: '拡大', value: false },
];

const updateDate = (newDate) => {
    emit('update:modelValue', {
        ...props.modelValue,
        date: newDate
    });
};

const updateViewMode = (isCompact) => {
    emit('update:modelValue', {
        ...props.modelValue,
        isCompactView: isCompact
    });
};
</script>
