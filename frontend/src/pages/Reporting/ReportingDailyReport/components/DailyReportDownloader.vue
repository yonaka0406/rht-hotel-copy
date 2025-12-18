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
                        <Message severity="info" :closable="false">
                            データは毎日16時30分に更新されますが、「ロード」ボタンをクリックすることでそれ以前に手動で更新できます。</Message>
                        <Card class="mt-4">
                            <template #content>
                                <div class="grid grid-cols-12 gap-4 items-end">
                                    <div class="col-span-4 mt-6">
                                        <FloatLabel>
                                            <DatePicker v-model="selectedDate" dateFormat="yy/mm/dd" class="w-full"
                                                :minDate="minDateDailyReport" :maxDate="maxDateDailyReport" />
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
                        <Message severity="info" :closable="false" v-if="showComparisonDataNotReadyMessage">
                            本日のデータはまだ利用できません。「日次レポート」タブで手動で更新できます。</Message>
                        <Card :class="{ 'mt-4': showComparisonDataNotReadyMessage }">
                            <template #content>
                                <div class="grid grid-cols-12 gap-4 items-end">
                                    <div class="col-span-4 mt-6">
                                        <FloatLabel>
                                            <DatePicker v-model="date1" dateFormat="yy/mm/dd" class="w-full"
                                                :minDate="minDateComparison" :maxDate="maxDateComparison" />
                                            <label>日付1</label>
                                        </FloatLabel>
                                    </div>
                                    <div class="col-span-4 mt-6">
                                        <FloatLabel>
                                            <DatePicker v-model="date2" dateFormat="yy/mm/dd" class="w-full"
                                                :minDate="minDateComparison" :maxDate="maxDateComparison" />
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
            <Message severity="warn" :closable="false" v-if="showNoReportDataMessage" class="mt-4">レポートの種類を選択してください。
            </Message>
        </div>

        <div class="col-span-12" v-if="isLoading">
            <ProgressSpinner />
        </div>

        <!-- Daily Report -->
        <div class="col-span-12" v-if="reportData.length && Number(activeTab) === 0">
            <div class="col-span-12 mb-4">
                <Card>
                    <template #title>{{ loadedDateTitle }}</template>
                    <template #content>
                        <DataTable :value="processedReportData" ref="dt" paginator :rows="10"
                            :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 50rem"
                            paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport PaginatorEnd"
                            currentPageReportTemplate="{first}-{last} of {totalRecords}"
                            :exportFilename="`daily_report_${loadedDate}`">
                            <template #paginatorend> <!-- Use #paginatorend slot -->
                                <Button type="button" icon="pi pi-download" text @click="handleCSVDownload"
                                    :disabled="!reportData.length" label="CSVダウンロード" />
                            </template>
                            <Column field="hotel_id" header="ホテルID"></Column>
                            <Column field="hotel_name" header="ホテル名"></Column>
                            <Column field="month" header="月"></Column>
                            <Column field="plans_global_id" header="グローバルプランID"></Column>
                            <Column field="plans_hotel_id" header="ホテルプランID"></Column>
                            <Column field="plan_type_category_id" header="プランタイプカテゴリーID"></Column>
                            <Column field="plan_package_category_id" header="プランパッケージカテゴリーID"></Column>
                            <Column field="plan_name" header="プラン名"></Column>
                            <Column field="confirmed_stays" header="確定宿泊数"></Column>
                            <Column field="non_accommodation_stays" header="非宿泊数"></Column>
                            <Column field="pending_stays" header="仮予約"></Column>
                            <Column field="in_talks_stays" header="保留中"></Column>
                            <Column field="cancelled_stays" header="キャンセル"></Column>
                            <Column field="non_billable_cancelled_stays" header="キャンセル(請求対象外)"></Column>
                            <Column field="employee_stays" header="社員"></Column>
                            <Column field="accommodation_sales" header="宿泊売上">
                                <template #body="{ data }">
                                    {{ (data.accommodation_sales || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="other_sales" header="その他売上">
                                <template #body="{ data }">
                                    {{ (data.other_sales || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="accommodation_sales_cancelled" header="宿泊売上(キャンセル)">
                                <template #body="{ data }">
                                    {{ (data.accommodation_sales_cancelled || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="other_sales_cancelled" header="その他売上(キャンセル)">
                                <template #body="{ data }">
                                    {{ (data.other_sales_cancelled || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="accommodation_net_sales" header="宿泊売上(税抜)">
                                <template #body="{ data }">
                                    {{ (data.accommodation_net_sales || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="other_net_sales" header="その他売上(税抜)">
                                <template #body="{ data }">
                                    {{ (data.other_net_sales || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="accommodation_net_sales_cancelled" header="宿泊売上(キャンセル・税抜)">
                                <template #body="{ data }">
                                    {{ (data.accommodation_net_sales_cancelled || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="other_net_sales_cancelled" header="その他売上(キャンセル・税抜)">
                                <template #body="{ data }">
                                    {{ (data.other_net_sales_cancelled || 0).toLocaleString() }}
                                </template>
                            </Column>
                            <Column field="created_at" header="作成日時"></Column>
                        </DataTable>
                    </template>
                </Card>
            </div>

            <div class="col-span-12">
                <DailyReportConfirmedReservationsChart :reportData="reportData" :metricDate="loadedDate" />
            </div>
        </div>

        <!-- Comparison Report -->
        <div class="col-span-12" v-if="comparisonData.length && Number(activeTab) === 1">
            <Card>
                <template #title>比較結果 ({{ formatDate(date2) }} vs {{ formatDate(date1) }})</template>
                <template #content>
                    <DataTable :value="comparisonData" v-model:filters="filters" filterDisplay="row" paginator
                        :rows="10" :rowsPerPageOptions="[5, 10, 20, 50]" tableStyle="min-width: 50rem"
                        paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink RowsPerPageDropdown CurrentPageReport PaginatorEnd"
                        currentPageReportTemplate="{first}-{last} of {totalRecords}">
                        <template #paginatorend> <!-- Use #paginatorend slot -->
                            <Button type="button" icon="pi pi-download" text @click="exportComparisonToExcel()"
                                :disabled="!comparisonData.length" label="Excelダウンロード" />
                        </template>
                        <Column field="hotel_name" header="ホテル名" headerClass="text-center" filter="true"
                            :showFilterMenu="false">
                            <template #filter="{ filterModel, filterCallback }">
                                <MultiSelect v-model="filterModel.value" :options="hotelNameOptions"
                                    placeholder="ホテル名で検索" class="p-column-filter" @change="filterCallback()">
                                </MultiSelect>
                            </template>
                        </Column>
                        <Column field="month" header="月" headerClass="text-center" filter="true"
                            :showFilterMenu="false">
                            <template #filter="{ filterModel, filterCallback }">
                                <MultiSelect v-model="filterModel.value" :options="monthOptions" placeholder="月で検索"
                                    class="p-column-filter" @change="filterCallback()"></MultiSelect>
                            </template>
                        </Column>
                        <Column header="確定宿泊数" bodyStyle="text-align: right" headerClass="text-center">
                            <template #body="slotProps">
                                <div class="grid grid-cols-2">
                                    <div class="col-span-1">
                                        {{ slotProps.data.confirmed_stays_date2.toLocaleString() }}
                                        <br /><small>{{ slotProps.data.confirmed_stays_date1.toLocaleString() }}</small>
                                    </div>
                                    <div class="col-span-1">
                                        <Badge v-bind="getBadgeProps(slotProps.data.confirmed_stays_change)"></Badge>
                                    </div>
                                </div>
                            </template>
                        </Column>
                        <Column header="キャンセル宿泊数" bodyStyle="text-align: right" headerClass="text-center">
                            <template #body="slotProps">
                                <div class="grid grid-cols-2">
                                    <div class="col-span-1">
                                        {{ slotProps.data.cancelled_stays_date2.toLocaleString() }}
                                        <br /><small>{{ slotProps.data.cancelled_stays_date1.toLocaleString() }}</small>
                                    </div>
                                    <div class="col-span-1">
                                        <Badge v-bind="getBadgeProps(slotProps.data.cancelled_stays_change)"></Badge>
                                    </div>
                                </div>
                            </template>
                        </Column>
                        <Column header="宿泊売上" bodyStyle="text-align: right" headerClass="text-center">
                            <template #body="slotProps">
                                <div class="grid grid-cols-2">
                                    <div class="col-span-1">
                                        {{ (slotProps.data.accommodation_sales_date2 || 0).toLocaleString() }}
                                        <br /><small>{{ (slotProps.data.accommodation_sales_date1 || 0).toLocaleString()
                                        }}</small>
                                    </div>
                                    <div class="col-span-1">
                                        <Badge v-bind="getBadgeProps(slotProps.data.accommodation_sales_change || 0)">
                                        </Badge>
                                    </div>
                                </div>
                            </template>
                        </Column>
                        <Column header="その他売上" bodyStyle="text-align: right" headerClass="text-center">
                            <template #body="slotProps">
                                <div class="grid grid-cols-2">
                                    <div class="col-span-1">
                                        {{ (slotProps.data.other_sales_date2 || 0).toLocaleString() }}
                                        <br /><small>{{ (slotProps.data.other_sales_date1 || 0).toLocaleString()
                                        }}</small>
                                    </div>
                                    <div class="col-span-1">
                                        <Badge v-bind="getBadgeProps(slotProps.data.other_sales_change || 0)"></Badge>
                                    </div>
                                </div>
                            </template>
                        </Column>
                        <Column header="売上合計" bodyStyle="text-align: right" headerClass="text-center">
                            <template #body="slotProps">
                                <div class="grid grid-cols-2">
                                    <div class="col-span-1">
                                        {{ (slotProps.data.total_sales_date2 || 0).toLocaleString() }}
                                        <br /><small>{{ (slotProps.data.total_sales_date1 || 0).toLocaleString()
                                        }}</small>
                                    </div>
                                    <div class="col-span-1">
                                        <Badge v-bind="getBadgeProps(slotProps.data.total_sales_change || 0)"></Badge>
                                    </div>
                                </div>
                            </template>
                        </Column>
                    </DataTable>
                </template>
                <template #footer>
                    <div class="text-right">
                        売上は税込み、単位は円です。
                    </div>
                </template>
            </Card>
        </div>
    </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
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
import Badge from 'primevue/badge';
import MultiSelect from 'primevue/multiselect';
import Message from 'primevue/message';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';
import DailyReportConfirmedReservationsChart from './charts/DailyReportConfirmedReservationsChart.vue'; // Import Card component
import { useReportStore } from '@/composables/useReportStore';
import { formatDate, formatDateTime } from '@/utils/dateUtils';
import { FilterMatchMode } from '@primevue/core/api';

const toast = useToast();

const filters = ref({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    hotel_name: { value: null, matchMode: FilterMatchMode.IN },
    month: { value: null, matchMode: FilterMatchMode.IN },
});

const {
    availableDates,
    reportData,
    isLoading,
    getAvailableMetricDates,
    fetchDailyReportData,
    generateDailyMetricsForToday,
    downloadDailyReportExcel,
} = useReportStore();

const selectedDate = ref(new Date());
const minDateDailyReport = ref(null);
const maxDateDailyReport = ref(new Date());
const minDateComparison = ref(null);
const maxDateComparison = ref(new Date());
const dt = ref();
const loadedDateTitle = ref('レポートデータ');
const loadedDate = ref(''); // New reactive variable for card title
const activeTab = ref(0);
const comparisonData = ref([]);

const date1 = ref(new Date(new Date().setDate(new Date().getDate() - 1)));
const date2 = ref(new Date());

const comparedDate1 = ref(null);
const comparedDate2 = ref(null);

const compareDates = async () => {
    if (!date1.value || !date2.value) return;

    if (formatDate(date1.value) === formatDate(date2.value)) {
        toast.add({ severity: 'info', summary: '情報', detail: '比較するには、異なる2つの日付を選択してください。', life: 3000 });
        return;
    }

    isLoading.value = true;

    const d1 = formatDate(date1.value);
    const d2 = formatDate(date2.value);

    try {
        const data1 = await fetchDailyReportData(d1);
        const data2 = await fetchDailyReportData(d2);

        comparedDate1.value = d1;
        comparedDate2.value = d2;

        const calculateChange = (value2, value1) => {
            if (value1 === null || value1 === undefined || isNaN(value1)) {
                return value2 === null || value2 === undefined || isNaN(value2) || value2 === 0 ? 0 : Infinity;
            }
            if (value1 === 0) {
                return value2 === 0 ? 0 : Infinity;
            }
            return ((value2 - value1) / value1) * 100;
        };

        // Aggregate data1 and data2 by hotel_id and month
        const aggregateData = (data) => {
            const aggregated = new Map();
            data.forEach(item => {
                const key = `${item.hotel_id}-${formatDate(item.month)}`;
                if (!aggregated.has(key)) {
                    aggregated.set(key, {
                        hotel_id: item.hotel_id,
                        hotel_name: item.hotel_name,
                        month: item.month,
                        confirmed_stays: 0,
                        cancelled_stays: 0,
                        accommodation_sales: 0,
                        other_sales: 0,
                        total_sales: 0,
                    });
                }
                const current = aggregated.get(key);
                current.confirmed_stays += Number(item.confirmed_stays);
                current.cancelled_stays += Number(item.cancelled_stays);
                current.accommodation_sales += Number(item.accommodation_sales || 0);
                current.other_sales += Number(item.other_sales || 0);
                current.total_sales += (Number(item.accommodation_sales || 0) + Number(item.other_sales || 0)); // normal sales
            });
            return aggregated;
        };

        const aggregatedData1 = aggregateData(data1);
        const aggregatedData2 = aggregateData(data2);

        // Process data for comparison
        const processed = [];
        aggregatedData2.forEach(item2 => {
            const key = `${item2.hotel_id}-${formatDate(item2.month)}`;
            const item1 = aggregatedData1.get(key);

            const confirmedStaysChange = item1 ? calculateChange(item2.confirmed_stays, item1.confirmed_stays) : (item2.confirmed_stays !== 0 ? Infinity : 0);
            const cancelledStaysChange = item1 ? calculateChange(item2.cancelled_stays, item1.cancelled_stays) : (item2.cancelled_stays !== 0 ? Infinity : 0);
            const accommodationSalesChange = item1 ? calculateChange(item2.accommodation_sales, item1.accommodation_sales) : (item2.accommodation_sales !== 0 ? Infinity : 0);
            const otherSalesChange = item1 ? calculateChange(item2.other_sales, item1.other_sales) : (item2.other_sales !== 0 ? Infinity : 0);
            const totalSalesChange = item1 ? calculateChange(item2.total_sales, item1.total_sales) : (item2.total_sales !== 0 ? Infinity : 0);

            processed.push({
                hotel_name: item2.hotel_name,
                month: formatDate(item2.month),
                confirmed_stays_date2: item2.confirmed_stays,
                confirmed_stays_change: confirmedStaysChange,
                confirmed_stays_date1: item1 ? item1.confirmed_stays : 0,
                cancelled_stays_date2: item2.cancelled_stays,
                cancelled_stays_change: cancelledStaysChange,
                cancelled_stays_date1: item1 ? item1.cancelled_stays : 0,
                accommodation_sales_date2: item2.accommodation_sales,
                accommodation_sales_change: accommodationSalesChange,
                accommodation_sales_date1: item1 ? item1.accommodation_sales : 0,
                other_sales_date2: item2.other_sales,
                other_sales_change: otherSalesChange,
                other_sales_date1: item1 ? item1.other_sales : 0,
                total_sales_date2: item2.total_sales,
                total_sales_change: totalSalesChange,
                total_sales_date1: item1 ? item1.total_sales : 0,
            });
        });

        comparisonData.value = processed;
    } catch (error) {
        console.error('Comparison failed:', error);
        toast.add({ severity: 'error', summary: 'エラー', detail: '比較データの取得に失敗しました。', life: 3000 });
    } finally {
        isLoading.value = false;
    }
};
const getBadgeProps = (change) => {
    if (!isFinite(change) || change === 0) { // Handles null, undefined, NaN
        return { value: '0%', severity: 'secondary' };
    }
    if (change === Infinity) {
        return { value: '+∞%', severity: 'success' };
    }
    if (change === -Infinity) {
        return { value: '-∞%', severity: 'danger' };
    }
    const value = change.toFixed(2) + '%';
    const severity = change > 0 ? 'success' : (change < 0 ? 'danger' : 'secondary');
    return { value, severity };
};

onMounted(async () => {
    await getAvailableMetricDates();
    if (availableDates.value.length > 0) {
        const sortedDates = [...availableDates.value].sort((a, b) => a.getTime() - b.getTime());
        minDateDailyReport.value = sortedDates[0];
        maxDateDailyReport.value = new Date(); // Max date for daily report is today
        minDateComparison.value = sortedDates[0];
        maxDateComparison.value = sortedDates[sortedDates.length - 1]; // Max date for comparison is latest available metric date

        selectedDate.value = sortedDates[sortedDates.length - 1]; // Default to latest date for daily report
        date2.value = sortedDates[sortedDates.length - 1]; // Default date2 to latest available date
        date1.value = sortedDates.length > 1 ? sortedDates[sortedDates.length - 2] : sortedDates[0]; // Default date1 to second latest or minDate
    }

});

const loadReport = async () => { // Made async to await fetchDailyReportData
    if (!selectedDate.value) return;
    isLoading.value = true;
    const date = formatDate(selectedDate.value);
    const today = formatDate(new Date()); // Get today's date formatted

    try {
        let data = await fetchDailyReportData(date); // Attempt to load data
        
        // Debug: Log the raw data received from backend
        const debugRecord = data.find(r => 
            r.accommodation_sales_cancelled > 0 && 
            r.hotel_id == 10 && 
            r.plan_type_category_id == 3 && 
            r.plan_package_category_id == 1 &&
            r.plan_name === '2食付き'
        );
        
        if (debugRecord) {
            console.log('[DEBUG] loadReport - RAW data received from backend:', {
                hotel_id: debugRecord.hotel_id,
                plan_name: debugRecord.plan_name,
                month: debugRecord.month,
                accommodation_sales_cancelled: debugRecord.accommodation_sales_cancelled,
                accommodation_net_sales_cancelled: debugRecord.accommodation_net_sales_cancelled,
                plan_type_category_id: debugRecord.plan_type_category_id,
                plan_package_category_id: debugRecord.plan_package_category_id,
                data_type_cancelled: typeof debugRecord.accommodation_sales_cancelled,
                data_type_net_cancelled: typeof debugRecord.accommodation_net_sales_cancelled
            });
        }
        
        reportData.value = data;

        // If no data is available for today's date, generate it
        if (reportData.value.length === 0 && date === today) {
            const result = await generateDailyMetricsForToday();
            if (result.success) {
                data = await fetchDailyReportData(date); // Re-load data after generation
                reportData.value = data;
            } else {
                console.error('Failed to generate daily metrics:', result.error);
            }
        }

        loadedDateTitle.value = `日次レポート - ${date}`; // Update title after data is loaded
        loadedDate.value = date;
    } catch (error) {
        console.error('Failed to load report:', error);
        reportData.value = [];
    } finally {
        isLoading.value = false;
    }
};

const exportComparisonToExcel = async () => {
    if (!comparedDate1.value || !comparedDate2.value) {
        toast.add({ severity: 'warn', summary: '警告', detail: '比較する日付が設定されていません。先に日付を比較してください。', life: 3000 });
        return;
    }

    try {
        await downloadDailyReportExcel(comparedDate1.value, comparedDate2.value);
        toast.add({ severity: 'success', summary: '成功', detail: 'Excelファイルが正常にダウンロードされました。', life: 3000 });
    } catch (error) {
        const errorMessage = error.message || JSON.stringify(error);
        toast.add({ severity: 'error', summary: 'エラー', detail: `Excelファイルのダウンロードに失敗しました: ${errorMessage}`, life: 3000 });
    }
};
const processedReportData = computed(() => {
    return reportData.value.map(item => ({
        ...item,
        month: formatDate(item.month),
        created_at: formatDateTime(item.created_at), // Format the created_at field
    }));
});

const hotelNameOptions = computed(() => {
    return [...new Set(comparisonData.value.map(item => item.hotel_name))];
});

const monthOptions = computed(() => {
    return [...new Set(comparisonData.value.map(item => item.month))];
});

const showComparisonDataNotReadyMessage = computed(() => {
    return maxDateComparison.value && maxDateDailyReport.value && maxDateComparison.value.getTime() < maxDateDailyReport.value.getTime();
});

const showNoReportDataMessage = computed(() => {
    return !reportData.value.length && !comparisonData.value.length;
});

const handleCSVDownload = async () => {
    try {
        // Log the CSV download action to backend
        console.log('[DEBUG] CSV Download initiated for date:', loadedDate.value);
        console.log('[DEBUG] Number of records:', processedReportData.value.length);
        
        // Find the specific record we're tracking for debugging
        const debugRecord = processedReportData.value.find(r => 
            r.accommodation_sales_cancelled > 0 && 
            r.hotel_id == 10 && 
            r.plan_type_category_id == 3 && 
            r.plan_package_category_id == 1 &&
            r.plan_name === '2食付き'
        );
        
        if (debugRecord) {
            console.log('[DEBUG] CSV Export - Found target record:', {
                hotel_id: debugRecord.hotel_id,
                plan_name: debugRecord.plan_name,
                month: debugRecord.month,
                accommodation_sales_cancelled: debugRecord.accommodation_sales_cancelled,
                accommodation_net_sales_cancelled: debugRecord.accommodation_net_sales_cancelled,
                plan_type_category_id: debugRecord.plan_type_category_id,
                plan_package_category_id: debugRecord.plan_package_category_id,
                data_type_cancelled: typeof debugRecord.accommodation_sales_cancelled,
                data_type_net_cancelled: typeof debugRecord.accommodation_net_sales_cancelled
            });
        }
        
        // Call the original DataTable CSV export
        dt.value.exportCSV();
        
        // Optional: Send logging request to backend
        // await api.post('/report/log-csv-download', {
        //     date: loadedDate.value,
        //     recordCount: processedReportData.value.length,
        //     timestamp: new Date().toISOString()
        // });
        
    } catch (error) {
        console.error('Error during CSV download:', error);
        toast.add({ 
            severity: 'error', 
            summary: 'エラー', 
            detail: 'CSVダウンロード中にエラーが発生しました。', 
            life: 3000 
        });
    }
};
</script>