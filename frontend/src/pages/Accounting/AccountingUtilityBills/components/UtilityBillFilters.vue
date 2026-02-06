<template>
    <div class="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
        <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">施設:</span>
            <Select v-model="hotelId" :options="hotels" optionLabel="name" optionValue="id" placeholder="施設を選択" fluid class="w-56" />
        </div>

        <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">対象月:</span>
            <DatePicker v-model="month" view="month" dateFormat="yy/mm" fluid class="w-40" />
        </div>

        <Button icon="pi pi-refresh" @click="$emit('refresh')" :loading="loading" severity="secondary" rounded text aria-label="データを更新" />
    </div>
</template>

<script setup>
import Select from 'primevue/select';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';

defineProps({
    hotels: {
        type: Array,
        required: true
    },
    loading: {
        type: Boolean,
        default: false
    }
});

const hotelId = defineModel('hotelId');
const month = defineModel('month');

defineEmits(['refresh']);
</script>
