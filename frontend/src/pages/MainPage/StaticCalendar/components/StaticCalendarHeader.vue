<template>
    <div class="grid grid-cols-4 items-center mb-4">
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
        <div class="flex justify-end items-center gap-2">
            <SelectButton optionLabel="label" optionValue="value" :options="viewOptions"
                :model-value="modelValue.isCompactView" @update:modelValue="updateViewMode"
                class="dark:bg-gray-800 dark:text-gray-100" />

            <MultiSelect v-model="localSelectedRoomTypes" :options="roomTypeOptions"
                placeholder="部屋タイプ選択" :maxSelectedLabels="1"
                class="w-full md:w-48 dark:bg-gray-800 dark:text-gray-100" />
        </div>
    </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import SelectButton from 'primevue/selectbutton';
import InputText from 'primevue/inputtext';
import FloatLabel from 'primevue/floatlabel';
import MultiSelect from 'primevue/multiselect';

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
    },
    roomTypeOptions: {
        type: Array,
        default: () => []
    }
});

const emit = defineEmits(['update:modelValue', 'update:selectedRoomTypes']);

const localSelectedRoomTypes = ref([]);

watch(() => props.modelValue.selectedRoomTypes, (newVal) => {
    localSelectedRoomTypes.value = newVal || [];
}, { immediate: true });

watch(localSelectedRoomTypes, (newVal) => {
    emit('update:modelValue', {
        ...props.modelValue,
        selectedRoomTypes: newVal
    });
});

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
