<template>
    <Toast />
    <div class="grid grid-cols-12 gap-4">
        <div class="col-span-12">
            <Tabs v-model:value="activeTab">
                <TabList>
                    <Tab value="0">日次レポート</Tab>
                    <Tab value="1">日付比較</Tab>
                </TabList>
                <TabPanels>
                    <TabPanel value="0">
                        <Card>
                            <template #content>
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
                                </div>
                            </template>
                        </Card>
                    </TabPanel>
                    <TabPanel value="1">
                        <Card>
                            <template #content>
                                <div class="grid grid-cols-12 gap-4 items-end">
                                    <div class="col-span-4">
                                        <FloatLabel>
                                            <DatePicker v-model="date1" dateFormat="yy/mm/dd" class="w-full" :minDate="minDate" :maxDate="maxDate" />
                                            <label>日付1</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="col-span-4">
                                        <FloatLabel>
                                            <DatePicker v-model="date2" dateFormat="yy/mm/dd" class="w-full" :minDate="minDate" :maxDate="maxDate" />
                                            <label>日付2</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="col-span-2">
                                        <Button @click="compareDates" label="比較" class="w-full" />
                                    </div>
                                </div>
                            </template>
                        </Card>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>

        <div class="col-span-12" v-if="activeTab === 1 && comparisonData.date1">
            <Card>
                <template #title>Comparison Result</template>
                <template #content>
                    <pre>{{ comparisonData }}</pre>
                </template>
            </Card>
        </div>
        <div class="col-span-12" v-if="isLoading">
            <ProgressSpinner />
        </div>

        <!-- Daily Report -->
        <div class="col-span-12" v-if="reportData.length">
            <div class="col-span-12">
                <Card>
                    <template #title>{{ loadedDateTitle }}</template>
                    <template #content>
                        <DataTable
                            :value="processedReportData"
                            ref="dt"
                            paginator
                            :rows="10"
                            :rowsPerPageOptions="[5, 10, 20, 50]"
                            tableStyle="min-width: 50rem"
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport PaginatorEnd"
                            currentPageReportTemplate="{first}-{last} of {totalRecords}"
                        >
                            <template #paginatorend> <!-- Use #paginatorend slot -->
                                <Button type="button" icon="pi pi-download" text @click="dt.exportCSV()" :disabled="!reportData.length" label="ダウンロード" />
                            </template>
                            <Column field="hotel_id" header="ホテルID" class="hidden"></Column>
                            <Column field="hotel_name" header="ホテル名"></Column>                        
                            <Column field="month" header="月"></Column>
                            <Column field="plans_global_id" header="グローバルプランID" class="hidden"></Column>
                            <Column field="plans_hotel_id" header="ホテルプランID" class="hidden"></Column>                        
                            <Column field="plan_name" header="プラン名"></Column>
                            <Column field="confirmed_stays" header="確定"></Column>
                            <Column field="pending_stays" header="仮予約"></Column>
                            <Column field="in_talks_stays" header="保留中"></Column>
                            <Column field="cancelled_stays" header="キャンセル"></Column>
                            <Column field="non_billable_cancelled_stays" header="キャンセル(請求対象外)"></Column>
                            <Column field="employee_stays" header="社員"></Column>
                            <Column field="created_at" header="作成日時" class="hidden"></Column>
                        </DataTable>
                    </template>
                </Card>
            </div>

            <div class="col-span-12">
                <DailyReportConfirmedReservationsChart :reportData="reportData" :metricDate="loadedDateTitle.split(' - ')[1]" />
            </div>
        </div>
        
        <!-- Daily Report -->
    </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';
import DatePicker from 'primevue/datepicker';
import Button from 'primevue/button';
import FloatLabel from 'primevue/floatlabel';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import ProgressSpinner from 'primevue/progressspinner';
import Card from 'primevue/card';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import DailyReportConfirmedReservationsChart from './charts/DailyReportConfirmedReservationsChart.vue'; // Import Card component
import { useReportStore } from '@/composables/useReportStore';
import { formatDate, formatDateTime } from '@/utils/dateUtils';

const toast = useToast();

const {
    availableDates,
    reportData,
    isLoading,
    getAvailableMetricDates,
    getDailyReportData,
    generateDailyMetricsForToday, // Import new function
} = useReportStore();

const selectedDate = ref(new Date());
const minDate = ref(null);
const maxDate = ref(new Date());
const dt = ref();
const loadedDateTitle = ref('レポートデータ'); // New reactive variable for card title
const activeTab = ref(0);
const comparisonData = ref({});

const date1 = ref(new Date(new Date().setDate(new Date().getDate() - 1)));
const date2 = ref(new Date());

const compareDates = async () => {
    if (!date1.value || !date2.value) return;

    if (formatDate(date1.value) === formatDate(date2.value)) {
        toast.add({ severity: 'info', summary: '情報', detail: '比較するには、異なる2つの日付を選択してください。', life: 3000 });
        return;
    }

    isLoading.value = true;
    
    await getDailyReportData(formatDate(date1.value));
    const data1 = JSON.parse(JSON.stringify(reportData.value));

    await getDailyReportData(formatDate(date2.value));
    const data2 = JSON.parse(JSON.stringify(reportData.value));

    comparisonData.value = { 
        date1: { date: formatDate(date1.value), data: data1 },
        date2: { date: formatDate(date2.value), data: data2 }
    };
    
    console.log('Comparison data:', comparisonData.value);
    isLoading.value = false;
};

watch(activeTab, (newVal) => {
    console.log('activeTab changed to:', newVal);
});

watch(reportData, (newVal) => {
    console.log('reportData changed:', newVal);
});

onMounted(async () => {
    console.log('Component is mounting...');
    await getAvailableMetricDates();
    if (availableDates.value.length > 0) {
        const sortedDates = [...availableDates.value].sort((a, b) => a.getTime() - b.getTime());
        minDate.value = sortedDates[0];
        selectedDate.value = availableDates.value[0];
    }
});

const loadReport = async () => { // Made async to await getDailyReportData
    console.log('loadReport called');
    if (!selectedDate.value) return;
    const date = formatDate(selectedDate.value);
    const today = formatDate(new Date()); // Get today's date formatted

    await getDailyReportData(date); // Attempt to load data

    // If no data is available for today's date, generate it
    if (reportData.value.length === 0 && date === today) {
        //console.log('No data available for today. Generating daily metrics...');
        const result = await generateDailyMetricsForToday();
        if (result.success) {
            //console.log('Daily metrics generated. Re-loading report data...');
            await getDailyReportData(date); // Re-load data after generation
        } else {
            console.error('Failed to generate daily metrics:', result.error);
        }
    }

    loadedDateTitle.value = `日次レポート - ${date}`; // Update title after data is loaded
};
const processedReportData = computed(() => {
    console.log('processedReportData computed, reportData.length:', reportData.value.length);
    return reportData.value.map(item => ({
        ...item,
        month: formatDate(item.month),
        created_at: formatDateTime(item.created_at), // Format the created_at field
    }));
});
</script>