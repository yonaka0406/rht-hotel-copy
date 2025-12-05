<template>
    <Card class="mb-4">
        <template #content>
            <div class="flex justify-between items-center flex-wrap gap-2">
                <!-- Left side - Search controls -->
                <div class="flex items-center flex-wrap gap-2 flex-grow">
                    <FloatLabel>
                        <Select :modelValue="searchType" @update:modelValue="$emit('update:searchType', $event)"
                            :options="searchTypeOptions" optionLabel="label" class="mr-2" fluid />
                        <label>検索範囲:</label>
                    </FloatLabel>
                    <FloatLabel>
                        <DatePicker :modelValue="startDateFilter"
                            @update:modelValue="$emit('update:startDateFilter', $event)" dateFormat="yy-mm-dd"
                            :selectOtherMonths="true" class="mr-2" fluid />
                        <label>{{ dateRangeLabel.start }}:</label>
                    </FloatLabel>
                    <FloatLabel>
                        <DatePicker :modelValue="endDateFilter"
                            @update:modelValue="$emit('update:endDateFilter', $event)" dateFormat="yy-mm-dd"
                            :placeholder="`${dateRangeLabel.end}を選択`" :selectOtherMonths="true" class="mr-2" fluid />
                        <label>{{ dateRangeLabel.end }}:</label>
                    </FloatLabel>
                    <Button label="適用" class="mr-2" size="small" @click="$emit('apply')"
                        :disabled="!startDateFilter || !endDateFilter" />
                </div>

                <!-- Right side - Action buttons -->
                <div class="flex justify-end gap-2 flex-shrink-0">
                    <Button label="全フィルタークリア" icon="pi pi-filter-slash" severity="secondary" size="small"
                        @click="$emit('clear')" v-tooltip.bottom="'全てのフィルターをリセットします'" />
                    <SplitButton label="エクスポート" icon="pi pi-file-export" severity="help" size="small"
                        @click="$emit('export')" :model="exportOptions" />
                </div>
            </div>
        </template>
    </Card>
</template>

<script setup>
import { Card, FloatLabel, Select, DatePicker, Button, SplitButton } from 'primevue';

defineProps({
    searchType: {
        type: Object,
        required: true
    },
    searchTypeOptions: {
        type: Array,
        required: true
    },
    startDateFilter: {
        type: Date,
        default: null
    },
    endDateFilter: {
        type: Date,
        default: null
    },
    dateRangeLabel: {
        type: Object,
        required: true
    },
    exportOptions: {
        type: Array,
        required: true
    }
});

defineEmits([
    'update:searchType',
    'update:startDateFilter',
    'update:endDateFilter',
    'apply',
    'clear',
    'export'
]);
</script>
