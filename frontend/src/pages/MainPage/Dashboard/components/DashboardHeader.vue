<template>
    <div class="grid grid-cols-3 items-center w-full">
        <p class="text-lg font-bold dark:text-gray-100">ダッシュボード</p>
        <DatePicker v-model="localSelectedDate" :showIcon="true" iconDisplay="input" dateFormat="yy-mm-dd"
            :selectOtherMonths="true" fluid required class="dark:bg-gray-800 dark:text-gray-100 rounded" />
        <div class="flex justify-end w-full">
            <Button severity="help" @click="emit('open-dialog')">データを開く</Button>
        </div>
    </div>
</template>

<script setup>
import { computed } from 'vue';
import { DatePicker, Button } from 'primevue';

const props = defineProps({
    selectedDate: {
        type: Date,
        required: true
    }
});

const emit = defineEmits(['update:selectedDate', 'open-dialog']);

const localSelectedDate = computed({
    get: () => props.selectedDate,
    set: (value) => emit('update:selectedDate', value)
});
</script>
