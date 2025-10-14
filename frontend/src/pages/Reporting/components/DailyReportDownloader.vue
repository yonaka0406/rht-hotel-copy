<template>
    <div class="card">
        <div class="card-header">
            <h3>日次レポート</h3>
        </div>
        <div class="card-body">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-4">
                    <FloatLabel>
                        <DatePicker v-model="selectedDate" dateFormat="yy/mm/dd" class="w-full" :minDate="minDate" :maxDate="maxDate" />
                        <label>日付</label>
                    </FloatLabel>
                </div>
                <div class="col-span-2">
                    <Button @click="loadReport" label="ロード" class="w-full" />
                </div>
                <div class="col-span-2">
                    <Button @click="dt.exportCSV()" label="CSV" class="w-full" :disabled="!reportData.length" />
                </div>
            </div>
            <div v-if="isLoading" class="mt-4">
                <ProgressSpinner />
            </div>
            <div v-if="reportData.length" class="mt-4">
                <DataTable :value="processedReportData" ref="dt">                    
                    <Column field="month" header="月"></Column>
                    <Column field="hotel_id" header="ホテルID" class="hidden"></Column>
                    <Column field="hotel_name" header="ホテル名"></Column>
                    <Column field="plan_name" header="プラン名"></Column>
                    <Column field="confirmed_stays" header="確定"></Column>
                    <Column field="pending_stays" header="仮予約"></Column>
                    <Column field="in_talks_stays" header="保留中"></Column>
                    <Column field="cancelled_stays" header="キャンセル"></Column>
                    <Column field="non_billable_cancelled_stays" header="キャンセル(請求対象外)"></Column>
                    <Column field="employee_stays" header="社員"></Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import { useReportStore } from '@/composables/useReportStore';
import { formatDate } from '@/utils/dateUtils';

const {
    availableDates,
    reportData,
    isLoading,
    getAvailableMetricDates,
    getDailyReportData,
} = useReportStore();

const selectedDate = ref(new Date());
const minDate = ref(null);
const maxDate = ref(new Date());

// Ref for the DataTable component
const dt = ref();

onMounted(async () => {
    await getAvailableMetricDates();
    if (availableDates.value.length > 0) {
        const sortedDates = [...availableDates.value].sort((a, b) => a.getTime() - b.getTime());
        minDate.value = sortedDates[0];
        selectedDate.value = availableDates.value[0];
    }
});

const loadReport = () => {
    if (!selectedDate.value) return;
    const date = formatDate(selectedDate.value);
    getDailyReportData(date);
};

// Computed property to format reportData for display and export
const processedReportData = computed(() => {
    return reportData.value.map(item => ({
        ...item,
        month: formatDate(item.month), // Format the month field
    }));
});

const download = () => {
    if (!selectedDate.value) return;
    const date = formatDate(selectedDate.value);
    downloadDailyReport(date);
};
</script>
