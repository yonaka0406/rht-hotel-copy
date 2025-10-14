<template>
    <div class="card">
        <div class="card-header">
            <h3>日次レポート</h3>
        </div>
        <div class="card-body">
            <div class="grid grid-cols-12 gap-4 items-end">
                <div class="col-span-4">
                    <FloatLabel>
                        <DatePicker v-model="selectedDate" dateFormat="yy/mm/dd" class="w-full" />
                        <label>日付</label>
                    </FloatLabel>
                </div>
                <div class="col-span-2">
                    <Button @click="loadReportData" label="ロード" class="w-full" />
                </div>
                <div class="col-span-2">
                    <Button @click="downloadReport" label="CSV" class="w-full" :disabled="!reportData.length" />
                </div>
            </div>
            <div v-if="loading" class="mt-4">
                <ProgressSpinner />
            </div>
            <div v-if="reportData.length" class="mt-4">
                <DataTable :value="reportData">
                    <Column field="month" header="月"></Column>
                    <Column field="hotel_name" header="ホテル名"></Column>
                    <Column field="plan_name" header="プラン名"></Column>
                    <Column field="confirmed_stays" header="確定"></Column>
                    <Column field="pending_stays" header="仮予約"></Column>
                    <Column field="in_talks_stays" header="保留中"></Column>
                    <Column field="cancelled_stays" header="キャンセル"></Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import axios from 'axios';

const selectedDate = ref(new Date());
const reportData = ref([]);
const loading = ref(false);

// Note: PrimeVue's DatePicker does not have a direct way to enable only specific dates.
// The disabled-dates prop is for disabling, which is not efficient for this use case.
// As a workaround, we could validate the selected date against the available dates list.

onMounted(async () => {
    try {
        const response = await axios.get('/api/report/daily/available-dates');
        const availableDates = response.data.map(d => new Date(d).toISOString().split('T')[0]);
        if (availableDates.length > 0) {
            selectedDate.value = new Date(availableDates[0]);
        }
    } catch (error) {
        console.error('Error fetching available dates:', error);
    }
});

const loadReportData = async () => {
    if (!selectedDate.value) return;
    loading.value = true;
    reportData.value = [];
    const date = selectedDate.value.toISOString().split('T')[0];
    try {
        const response = await axios.get(`/api/report/daily/data/${date}`);
        reportData.value = response.data;
    } catch (error) {
        console.error('Error loading daily report data:', error);
    } finally {
        loading.value = false;
    }
};

const downloadReport = async () => {
    if (!selectedDate.value) return;
    const date = selectedDate.value.toISOString().split('T')[0];
    try {
        const response = await axios.get(`/api/report/daily/download/${date}?format=csv`, {
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `daily_report_${date}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    } catch (error) {
        console.error('Error downloading daily report:', error);
    }
};
</script>
