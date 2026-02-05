<template>
    <Card class="col-span-12">
        <template #content>
            <div class="grid grid-cols-12 gap-x-4 gap-y-2 items-center">
                <span class="col-span-12 sm:col-span-1 font-bold self-center">月分：</span>
                <div class="col-span-12 sm:col-span-4 md:col-span-3">
                    <DatePicker v-model="selectedMonth" :showIcon="true" iconDisplay="input" dateFormat="yy年mm月"
                        view="month" fluid />
                </div>
                <span class="col-span-12 sm:col-span-1 font-bold self-center sm:text-left md:text-right">表示：</span>
                <div class="col-span-12 sm:col-span-6 md:col-span-4">
                    <SelectButton v-model="viewMode" :options="viewOptions" optionLabel="name" optionValue="value"
                        class="w-full sm:w-auto" />
                </div>
            </div>
        </template>
    </Card>
</template>

<script setup>
import { computed } from 'vue';
import { Card, DatePicker, SelectButton } from 'primevue';

const props = defineProps({
    selectedMonth: {
        type: Date,
        required: true
    },
    viewMode: {
        type: String,
        required: true
    },
    viewOptions: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['update:selectedMonth', 'update:viewMode']);

const selectedMonth = computed({
    get: () => props.selectedMonth,
    set: (value) => emit('update:selectedMonth', value)
});

const viewMode = computed({
    get: () => props.viewMode,
    set: (value) => emit('update:viewMode', value)
});
</script>
