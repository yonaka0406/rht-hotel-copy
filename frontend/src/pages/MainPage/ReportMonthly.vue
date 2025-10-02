<template>
    <div class="min-h-screen p-2">
        <div class="grid grid-cols-12 gap-4">
            <!-- Selection Card -->
            <Card class="col-span-12">
                <template #content> 
                    <div class="grid grid-cols-12 gap-x-4 gap-y-2 items-center">
                        <span class="col-span-12 sm:col-span-1 font-bold self-center">月分：</span>
                        <div class="col-span-12 sm:col-span-4 md:col-span-3">
                            <DatePicker v-model="selectedMonth" 
                                :showIcon="true"
                                iconDisplay="input"
                                dateFormat="yy年mm月"
                                view="month"                                
                                fluid
                            />     
                        </div>
                        <span class="col-span-12 sm:col-span-1 font-bold self-center sm:text-left md:text-right">表示：</span>
                        <div class="col-span-12 sm:col-span-6 md:col-span-4">
                            <SelectButton v-model="viewMode" :options="viewOptions" optionLabel="name" optionValue="value" class="w-full sm:w-auto" />
                        </div>
                    </div>
                </template>
            </Card>            
            

            <Panel toggleable :collapsed="false" class="col-span-12">
                <template #header>
                    <div class="flex items-center gap-2">                        
                        <span class="font-bold ml-2 mt-2">
                            <div v-if="viewMode==='month'">
                                <span>当月KPI<small>　PMSx計画</small></span><br/>
                                <small>（税抜き）</small>
                            </div>
                            <div v-else>
                                <span>当年度累計KPI<small>　PMSx計画</small></span><br/>
                                <small>（税抜き）</small>
                            </div>
                        </span>
                    </div>
                </template>
                <div class="grid grid-cols-12 gap-4">
                    <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                        <template #title>総売上</template>
                        <template #content>
                            <div class="flex justify-center items-center p-2">
                                <div class="grid">
                                    <span class="text-3xl lg:text-4xl font-bold text-blue-600">
                                        {{ displayedCumulativeSales.toLocaleString('ja-JP') }} 円
                                    </span>
                                    <span v-if="forecastSales" class="text-sm text-blue-400">
                                        (計画: {{ forecastSales.toLocaleString('ja-JP') }} 円)
                                    </span>
                                    <span v-if="salesDifference" :class="['text-sm', salesDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                        ({{ salesDifference > 0 ? '+' : '' }}{{ salesDifference.toLocaleString('ja-JP') }} 円)
                                    </span>
                                </div>
                            </div>
                        </template>
                    </Card>
                    <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                        <template #title>ADR</template>
                        <template #content>
                            <div class="flex justify-center items-center p-2">
                                <div class="grid">
                                    <span class="text-2xl sm:text-3xl lg:text-4xl font-bold text-green-600 leading-snug">
                                        {{ ADR.toLocaleString('ja-JP') }} 円
                                    </span>
                                    <span v-if="forecastADR" class="text-sm text-green-400 mt-1">
                                        (計画: {{ forecastADR.toLocaleString('ja-JP') }} 円)
                                    </span>
                                    <span v-if="ADRDifference" :class="['text-sm mt-1', ADRDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                        ({{ ADRDifference > 0 ? '+' : '' }}{{ ADRDifference.toLocaleString('ja-JP') }} 円)
                                    </span>
                                </div>
                            </div>
                        </template>
                    </Card>
                    <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                        <template #title>RevPAR</template>
                        <template #content>
                            <div class="flex justify-center items-center p-2">
                                <div class="grid">
                                    <span class="text-3xl lg:text-4xl font-bold text-purple-600">{{ revPAR.toLocaleString('ja-JP') }} 円</span>
                                    <span v-if="forecastRevPAR" class="text-sm text-purple-400">
                                        (計画: {{ forecastRevPAR.toLocaleString('ja-JP') }} 円)
                                    </span>
                                    <span v-if="revPARDifference" :class="['text-sm', revPARDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                        ({{ revPARDifference > 0 ? '+' : '' }}{{ revPARDifference.toLocaleString('ja-JP') }} 円)
                                    </span>
                                </div>
                            </div>
                        </template>
                    </Card>
                    <Card class="col-span-12 md:col-span-6 lg:col-span-3">
                        <template #title>OCC</template>
                        <template #content>
                            <div class="flex justify-center items-center p-2">
                                <div class="grid">
                                    <span class="text-3xl lg:text-4xl font-bold">{{ OCC }} %</span>
                                    <span v-if="forecastOCC" class="text-sm text-orange-400">
                                        (計画: {{ forecastOCC }} %)
                                    </span>
                                    <span v-if="OCCDifference" :class="['text-sm', OCCDifference > 0 ? 'text-green-500' : 'text-red-500']">
                                        ({{ OCCDifference > 0 ? '+' : '' }}{{ parseFloat(OCCDifference).toFixed(2) }} %)
                                    </span>
                                </div>
                            </div>
                        </template>
                    </Card>
                </div>
                <Fieldset legend="KPI 説明" :toggleable="true" :collapsed="true" class="mt-4">
                    <div class="grid grid-cols-12 gap-4">
                        <div class="col-span-12 md:col-span-3">
                            <strong>総売上:</strong>
                            <p class="m-0 text-sm">仮予約、確定予約のプランとアドオンの合計。保留予約と社員を含まない金額。</p>
                        </div>
                        <div class="col-span-12 md:col-span-3">
                            <strong>ADR (客室平均単価):</strong>
                            <p class="m-0 text-center text-sm">
                                <span class="inline-block">
                                    <span class="">売上の合計</span><br>
                                    <span class="inline-block border-t border-black px-2">販売部屋数の合計</span>
                                </span>
                            </p>
                        </div>
                        <div class="col-span-12 md:col-span-3">
                            <strong>RevPAR (1室あたりの収益額):</strong>
                            <p class="m-0 text-center text-sm">
                                <span class="inline-block">
                                    <span class="">売上の合計</span><br>
                                    <span class="inline-block border-t border-black px-2">販売可能総部屋数 × 期間日数</span>
                                </span>
                            </p>
                        </div>
                        <div class="col-span-12 md:col-span-3">
                            <strong>OCC (稼働率):</strong>
                            <p class="m-0 text-center text-sm">
                                <span class="inline-block">
                                    <span class="">販売部屋数の合計</span><br>
                                    <span class="inline-block border-t border-black px-2">販売可能総部屋数</span>
                                </span>
                            </p>
                        </div>
                    </div>
                </Fieldset>
            </Panel>

            <!-- Line Chart Panel (moved to second position) -->
            <Panel header="売上" toggleable :collapsed="false" class="col-span-12">             
                <Card class="col-span-12">
                <template #title>
                    
                </template>
                <template #subtitle>
                    <p>{{ lineChartTitle }}</p>
                </template>
                <template #content>    
                    <div ref="lineChart" class="w-full h-60"></div>                
                </template>
            </Card>             
                
            </Panel>

            <!-- Heat Map -->
            <Panel header="稼働率" toggleable :collapsed="false" class="col-span-12">
                <Card class="flex col-span-12">
                    <template #title>

                    </template>                
                    <template #subtitle>
                        <p>曜日毎の予約数ヒートマップ ({{ selectedMonth.getFullYear() }}年 {{ selectedMonth.getMonth() + 1 }}月基点)</p>
                    </template>
                    <template #content>
                        <div ref="heatMap" class="w-full h-96"></div>             
                    </template>
                </Card> 
            </Panel>

            <!-- Panel for Booker Type and Length of Stay -->
            <Panel header="予約者属性と滞在日数" toggleable :collapsed="false" class="col-span-12">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <Card>
                            <template #title>予約者区分 (泊数ベース)</template>
                            <template #content>
                                <div ref="bookerTypeChart" class="w-full h-60"></div>
                            </template>
                        </Card>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <Card>
                            <template #title>滞在日数</template>
                            <template #content>
                                <div ref="averageLengthOfStayChart" class="w-full h-60"></div>
                            </template>
                        </Card>
                    </div>
                </div>
            </Panel>

            <!-- Other KPIs Panel -->
            <Panel header="予約チャンネルと支払タイミング" toggleable :collapsed="false" class="col-span-12">
                <div class="grid grid-cols-12 gap-4">
                    <div class="col-span-12 md:col-span-6">
                        <Card>
                            <template #title>予約チャンネル内訳 (泊数ベース)</template>
                            <template #content>
                                <div ref="bookingSourceChart" class="w-full h-60"></div>
                            </template>
                        </Card>
                    </div>
                    <div class="col-span-12 md:col-span-6">
                        <Card>
                            <template #title>支払タイミング内訳 (泊数ベース)</template>
                            <template #content>
                                <div ref="paymentTimingChart" class="w-full h-60"></div>
                            </template>
                        </Card>
                    </div>
                </div>
            </Panel> 

            <!-- Sales by Plan Breakdown -->
            <Card class="col-span-12">
                <template #title>
                    <div class="flex justify-between items-center">
                        <div>
                            <p>プラン別売上内訳</p>
                            <small v-if="salesByPlanChartMode === 'tax_included'">（税込み）</small>
                            <small v-else>（税抜き）</small>
                        </div>                        
                        <SelectButton v-model="salesByPlanChartMode" :options="salesByPlanChartOptions" optionLabel="name" optionValue="value" />
                        <SelectButton v-model="salesByPlanViewMode" :options="salesByPlanViewOptions" optionLabel="name" optionValue="value" />
                    </div>
                </template>
                <template #content>
                    <div v-if="salesByPlanViewMode === 'chart'" ref="salesByPlanChart" class="w-full h-96"></div>
                    <DataTable v-else :value="processedSalesByPlan" responsiveLayout="scroll">
                        <template #header>
                            <div class="flex flex-wrap items-center justify-end">
                                <span class="text-sm font-bold">(税込み)</span>                                
                            </div>
                        </template>
                        <Column field="plan_name" header="プラン名"></Column>
                        <Column header="通常売上" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                <span v-if="salesByPlanChartMode === 'tax_included'">
                                    {{ slotProps.data.regular_sales.toLocaleString('ja-JP') }} 円
                                </span>
                                <span v-else>
                                    {{ slotProps.data.regular_net_sales.toLocaleString('ja-JP') }} 円
                                </span>
                            </template>
                        </Column>
                        <Column header="キャンセル売上" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                <span v-if="salesByPlanChartMode === 'tax_included'">
                                    {{ slotProps.data.cancelled_sales.toLocaleString('ja-JP') }} 円
                                </span>
                                <span v-else>
                                    {{ slotProps.data.cancelled_net_sales.toLocaleString('ja-JP') }} 円
                                </span>
                            </template>
                        </Column>
                        <Column header="合計" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                <span v-if="salesByPlanChartMode === 'tax_included'">
                                    {{ (slotProps.data.regular_sales + slotProps.data.cancelled_sales).toLocaleString('ja-JP') }} 円
                                </span>
                                <span v-else>
                                    {{ (slotProps.data.regular_net_sales + slotProps.data.cancelled_net_sales).toLocaleString('ja-JP') }} 円
                                </span>
                            </template>
                        </Column>
                        <ColumnGroup type="footer">
                            <Row>
                                <Column footer="合計" :colspan="1" footerStyle="text-align:left"/>
                                <Column v-if="salesByPlanChartMode === 'tax_included'" :footer="salesByPlanTotals.regular_sales.toLocaleString('ja-JP') + ' 円'" footerStyle="text-align:right"/>
                                <Column v-else :footer="salesByPlanTotals.regular_net_sales.toLocaleString('ja-JP') + ' 円'" footerStyle="text-align:right"/>
                                <Column v-if="salesByPlanChartMode === 'tax_included'" :footer="salesByPlanTotals.cancelled_sales.toLocaleString('ja-JP') + ' 円'" footerStyle="text-align:right"/>
                                <Column v-else :footer="salesByPlanTotals.cancelled_net_sales.toLocaleString('ja-JP') + ' 円'" footerStyle="text-align:right"/>
                                <Column v-if="salesByPlanChartMode === 'tax_included'" :footer="(salesByPlanTotals.regular_sales + salesByPlanTotals.cancelled_sales).toLocaleString('ja-JP') + ' 円'" footerStyle="text-align:right"/>
                                <Column v-else :footer="(salesByPlanTotals.regular_net_sales + salesByPlanTotals.cancelled_net_sales).toLocaleString('ja-JP') + ' 円'" footerStyle="text-align:right"/>
                            </Row>
                        </ColumnGroup>
                    </DataTable>
                </template>
            </Card>
            <!-- Occupation Breakdown -->
            <Card class="col-span-12">
                <template #title>
                    <div class="flex justify-between items-center">
                        <p>稼働率内訳</p>
                        <SelectButton v-model="occupationBreakdownViewMode" :options="occupationBreakdownViewOptions" optionLabel="name" optionValue="value" />
                    </div>
                </template>
                <template #content>
                    <div v-if="occupationBreakdownViewMode === 'chart'" ref="occupationBreakdownChart" class="w-full h-96"></div>
                    <DataTable v-else-if="filteredOccupationBreakdownData && filteredOccupationBreakdownData.length > 0" :value="filteredOccupationBreakdownData" responsiveLayout="scroll">
                        <Column field="plan_name" header="プラン名"></Column>
                        <Column field="undecided_nights" header="未確定泊数" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                {{ parseInt(slotProps.data.undecided_nights || '0').toLocaleString('ja-JP') }}
                            </template>
                        </Column>
                        <Column field="confirmed_nights" header="確定泊数" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                {{ parseInt(slotProps.data.confirmed_nights || '0').toLocaleString('ja-JP') }}
                            </template>
                        </Column>
                        <Column field="employee_nights" header="社員泊数" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                {{ parseInt(slotProps.data.employee_nights || '0').toLocaleString('ja-JP') }}
                            </template>
                        </Column>
                        <Column field="blocked_nights" header="ブロック泊数" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                {{ parseInt(slotProps.data.blocked_nights || '0').toLocaleString('ja-JP') }}
                            </template>
                        </Column>
                        <Column field="total_occupied_nights" header="合計稼働泊数" bodyStyle="text-align:right">
                            <template #body="slotProps">
                                {{ parseInt(slotProps.data.total_occupied_nights || '0').toLocaleString('ja-JP') }}
                            </template>
                        </Column>
                        <ColumnGroup type="footer">
                            <Row>
                                <Column footer="合計:" :colspan="1" footerStyle="text-align:right"/>
                                <Column :footer="occupationBreakdownTotals.undecided_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                                <Column :footer="occupationBreakdownTotals.confirmed_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                                <Column :footer="occupationBreakdownTotals.employee_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                                <Column :footer="occupationBreakdownTotals.blocked_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                                <Column :footer="occupationBreakdownTotals.total_occupied_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                            </Row>
                            <Row>
                                <Column footer="合計利用可能泊数:" :colspan="5" footerStyle="text-align:right"/>
                                <Column :footer="occupationBreakdownTotals.total_bookable_room_nights.toLocaleString('ja-JP')" footerStyle="text-align:right"/>
                            </Row>
                            <Row>
                                <Column footer="確定泊数 / (合計利用可能泊数 - ブロック泊数):" :colspan="5" footerStyle="text-align:right"/>
                                <Column :footer="
                                    (() => {
                                        const confirmed = occupationBreakdownTotals.confirmed_nights;
                                        const totalAvailable = occupationBreakdownTotals.total_bookable_room_nights;
                                        const blocked = occupationBreakdownTotals.blocked_nights;
                                        const denominator = totalAvailable - blocked;
                                        if (denominator <= 0) return 'N/A';
                                        return ((confirmed / denominator) * 100).toFixed(2) + '%';
                                    })()
                                " footerStyle="text-align:right"/>
                            </Row>
                        </ColumnGroup>
                    </DataTable>
                    <div v-else>
                        <p>稼働率内訳データがありません。</p>
                    </div>
                </template>
            </Card>            
        </div>
    </div>
</template>
  
<script setup>
    // Vue
    import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick} from "vue";    

    // Primevue
    import { Card, DatePicker, SelectButton, Fieldset, DataTable, Column, ColumnGroup, Row, Panel } from 'primevue';

    // Stores
    import { useReportStore } from '@/composables/useReportStore';
    const { reservationList, fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod, fetchReservationListView, fetchForecastData, fetchAccountingData, fetchSalesByPlan, fetchOccupationBreakdown, fetchBookingSourceBreakdown, fetchPaymentTimingBreakdown, fetchBookerTypeBreakdown } = useReportStore();
    import { useHotelStore } from '@/composables/useHotelStore';
    const { selectedHotelId, fetchHotels, fetchHotel } = useHotelStore();

    // Page Setting
    const selectedMonth = ref(new Date());
    const viewMode = ref('month'); // 'month' or 'yearCumulative'
    const viewOptions = ref([
        { name: '単月表示', value: 'month' }, // Current Month View
        { name: '年度累計表示', value: 'yearCumulative' } // Cumulative View (Current Year)
    ]);
    const salesByPlanViewMode = ref('chart');
    const salesByPlanViewOptions = ref([
        { name: 'グラフ', value: 'chart' },
        { name: 'テーブル', value: 'table' }
    ]);

    const salesByPlanChartMode = ref('tax_included'); // 'tax_included' or 'tax_excluded'
    const salesByPlanChartOptions = ref([
        { name: '税込み', value: 'tax_included' },
        { name: '税抜き', value: 'tax_excluded' }
    ]);

    const occupationBreakdownViewMode = ref('chart');
    const occupationBreakdownViewOptions = ref([
        { name: 'グラフ', value: 'chart' },
        { name: 'テーブル', value: 'table' }
    ]);

    // --- Date Computations ---
    function formatDate(date) {        
        date.setHours(date.getHours() + 9); // JST adjustment        
        return date.toISOString().split("T")[0]; // Format as YYYY-MM-DD
    };
    const normalizeDate = (date) => new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    function addDaysUTC(date, days) {
        const newDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        newDate.setUTCDate(newDate.getUTCDate() + days);
        return newDate;
    };

    const isWeekend = (dateString) => {
        const date = new Date(dateString);
        const dayOfWeek = date.getDay(); // 0 for Sunday, 6 for Saturday
        return dayOfWeek === 0 || dayOfWeek === 6;
    };

    const translatePaymentTiming = (timing) => {
      const map = {
          'not_set': '未設定',
          'prepaid': '事前決済',
          'on-site': '現地決済',
          'postpaid': '後払い'
      };
      return map[timing] || timing;
    };
    const startOfMonth = computed(() => {
        const date = new Date(selectedMonth.value);
        date.setDate(1);
        return formatDate(date);
    });
    const endOfMonth = computed(() => {
        const date = new Date(selectedMonth.value);
        date.setDate(1);
        date.setMonth(date.getMonth() + 1);
        date.setDate(0);
        return formatDate(date);      
    });
    
    const yearOfSelectedMonth = computed(() => selectedMonth.value.getFullYear());

    // Start date for "year cumulative" view: Jan 1st of the selected month's year
    const startOfYear = computed(() => {
        return formatDate(new Date(yearOfSelectedMonth.value, 0, 1)); // Month is 0-indexed
    });
  
    // --- Data Sources ---    
    const allReservationsData = ref([]);
    const reservationListData = ref([]); // New ref for reservation-level data
    const bookerTypeBreakdownData = ref([]); // New ref for booker type breakdown data
    const forecastData = ref([]);
    const accountingData = ref([]);
    const salesByPlan = ref([]);
    const occupationBreakdownData = ref(null);
    const bookingSourceData = ref([]);
    const paymentTimingData = ref([]);

    const filteredOccupationBreakdownData = computed(() => {
        if (!occupationBreakdownData.value) return [];
        return occupationBreakdownData.value.filter(item => item.plan_name !== 'Total Available');
    });

    const processedSalesByPlan = computed(() => {
        const planMap = new Map();

        salesByPlan.value.forEach(item => {
            const planName = item.plan_name;
            const sales = parseFloat(item.total_sales);
            const netSales = parseFloat(item.total_sales_net);

            if (!planMap.has(planName)) {
                planMap.set(planName, {
                    plan_name: planName,
                    regular_sales: 0,
                    cancelled_sales: 0,
                    regular_net_sales: 0,
                    cancelled_net_sales: 0,
                });
            }

            const planEntry = planMap.get(planName);
            if (item.is_cancelled_billable) {
                planEntry.cancelled_sales += sales;
                planEntry.cancelled_net_sales += netSales;
            } else {
                planEntry.regular_sales += sales;
                planEntry.regular_net_sales += netSales;
            }
        });

        console.log('Processed Sales by Plan Map:', planMap);
        const sortedData = Array.from(planMap.values());
        sortedData.sort((a, b) => {
            const totalA = a.regular_sales + a.cancelled_sales;
            const totalB = b.regular_sales + b.cancelled_sales;
            return totalB - totalA; // For descending order
        });
        return sortedData;
    });

    const salesByPlanTotals = computed(() => {
        return processedSalesByPlan.value.reduce((acc, item) => {
            acc.regular_sales += item.regular_sales;
            acc.cancelled_sales += item.cancelled_sales;
            acc.regular_net_sales += item.regular_net_sales;
            acc.cancelled_net_sales += item.cancelled_net_sales;
            return acc;
        }, { regular_sales: 0, cancelled_sales: 0, regular_net_sales: 0, cancelled_net_sales: 0 });
    });

    const occupationBreakdownTotals = computed(() => {
        if (!occupationBreakdownData.value) return { undecided_nights: 0, confirmed_nights: 0, employee_nights: 0, blocked_nights: 0, total_occupied_nights: 0, total_reservation_details_nights: 0, not_booked_nor_blocked_nights: 0, total_bookable_room_nights: 0 };

        let totalBookable = 0;
        const filteredData = occupationBreakdownData.value.filter(item => {
            if (item.plan_name === 'Total Available') {
                totalBookable = parseInt(item.total_bookable_room_nights || '0');
                return false; // Exclude this row from the sum
            }
            return true;
        });

        const totals = filteredData.reduce((acc, item) => {
            const undecided = parseInt(item.undecided_nights || '0');
            const confirmed = parseInt(item.confirmed_nights || '0');
            const employee = parseInt(item.employee_nights || '0');
            const blocked = parseInt(item.blocked_nights || '0');
            const totalOccupied = parseInt(item.total_occupied_nights || '0');
            const totalReservationDetails = parseInt(item.total_reservation_details_nights || '0');

            acc.undecided_nights += undecided;
            acc.confirmed_nights += confirmed;
            acc.employee_nights += employee;
            acc.blocked_nights += blocked;
            acc.total_occupied_nights += totalOccupied;
            acc.total_reservation_details_nights += totalReservationDetails;
            acc.not_booked_nor_blocked_nights += (totalReservationDetails - totalOccupied);
            return acc;
        }, { undecided_nights: 0, confirmed_nights: 0, employee_nights: 0, blocked_nights: 0, total_occupied_nights: 0, total_reservation_details_nights: 0, not_booked_nor_blocked_nights: 0 });

        totals.total_bookable_room_nights = totalBookable;
        return totals;
    });

    const dataFetchStartDate = computed(() => startOfYear.value);
    const dataFetchEndDate = computed(() => { // For heatmap range, ending last day of selectedMonth + 2 months
        const date = new Date(selectedMonth.value);
        date.setDate(1);
        date.setMonth(date.getMonth() + 3); // End of current month + 2 months
        date.setDate(0);
        return formatDate(date);
    });
    // Specific date range for heatmap display (original logic: first Monday of month to end of month + 2)    
    const heatMapDisplayStartDate = computed(() => {
        if (viewMode.value === 'yearCumulative') {
            return startOfYear.value; // For cumulative view, heatmap starts from Jan 1st
        } else { // 'month' view: Original logic to find the Monday of the week the 1st of selectedMonth falls into
            const date = new Date(selectedMonth.value);
            date.setDate(1);
            const dayOfWeek = date.getDay(); // 0 (Sunday) to 6 (Saturday)
            const diff = date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1); // Calculate the difference to Monday
            date.setDate(diff);
            return formatDate(date);
        }
    });
    const heatMapDisplayEndDate = dataFetchEndDate;

    // Effective start/end dates for metrics (ADR, RevPAR, Line Chart data points) based on viewMode
    const metricsEffectiveStartDate = computed(() => {
        return viewMode.value === 'month' ? startOfMonth.value : startOfYear.value;
    });
    const metricsEffectiveEndDate = computed(() => endOfMonth.value); // Always ends at the selected month's end

    // --- Metrics Calculation ---
    const ADR = ref(0);
    const revPAR = ref(0);
    const OCC = ref(0);
    const displayedCumulativeSales = ref(0);
    // Forecast Data
    const forecastSales = ref(0);
    const forecastADR = ref(0);
    const forecastRevPAR = ref(0);
    const forecastOCC = ref(0);
    // Difference between actual and forecast
    const salesDifference = ref(0);
    const ADRDifference = ref(0);
    const revPARDifference = ref(0);
    const OCCDifference = ref(0);

    const calculateMetrics = () => {
        if (!allReservationsData.value || allReservationsData.value.length === 0) {
            ADR.value = 0;
            revPAR.value = 0;
            OCC.value = 0;

            forecastSales.value = 0;
            forecastADR.value = 0;
            forecastRevPAR.value = 0;
            forecastOCC.value = 0;

            salesDifference.value = 0;
            ADRDifference.value = 0;
            revPARDifference.value = 0;
            OCCDifference.value = 0;
            return;
        }

        const startDateForCalc = formatDate(new Date(metricsEffectiveStartDate.value));
        const endDateForCalc = formatDate(new Date(metricsEffectiveEndDate.value));

        const filteredMetricsReservations = allReservationsData.value.filter(res => {
            const resDate = res.date;            
            return resDate >= startDateForCalc && resDate <= endDateForCalc;
        });
        
        let totalRevenue = 0;
        let totalRoomsSold = 0;

        filteredMetricsReservations.forEach(res => {
            totalRevenue += parseFloat(res.price || 0);
            totalRoomsSold += parseInt(res.room_count || 0);
        });        

        // ADR
        // console.log('ADR', 'totalRevenue', totalRevenue, 'totalRoomsSold', totalRoomsSold);
        ADR.value = totalRoomsSold > 0 ? Math.round(totalRevenue / totalRoomsSold) : 0;

        // RevPAR
        const hotelCapacity = parseInt(allReservationsData.value[0].total_rooms || 0);
        let totalAvailableRoomNightsInPeriod = 0;
        const startDateObj = normalizeDate(new Date(metricsEffectiveStartDate.value));
        const endDateObj = normalizeDate(new Date(metricsEffectiveEndDate.value));
        const dailyActualAvailableRoomsMap = new Map();
        allReservationsData.value.forEach(res => {
            if (res.date && res.hasOwnProperty('total_rooms_real') && res.total_rooms_real !== null && res.total_rooms_real !== undefined) {
                const realRooms = parseInt(res.total_rooms_real);
                // Store it only if it's a valid number (including 0).
                if (!isNaN(realRooms)) {
                    dailyActualAvailableRoomsMap.set(res.date, realRooms);
                }
            }
        });

        let currentDateIter = startDateObj;        
        const finalIterationEndDate = endDateObj;                
        while (currentDateIter <= finalIterationEndDate) {
            const currentDateStr = formatDate(currentDateIter); // Format current iteration date to 'YYYY-MM-DD'

            if (dailyActualAvailableRoomsMap.has(currentDateStr)) {                
                totalAvailableRoomNightsInPeriod += dailyActualAvailableRoomsMap.get(currentDateStr);
            } else {                
                totalAvailableRoomNightsInPeriod += hotelCapacity;
            }            
            // Move to the next day            
            currentDateIter = addDaysUTC(currentDateIter, 1);
        }        
        revPAR.value = totalAvailableRoomNightsInPeriod > 0 ? Math.round(totalRevenue / totalAvailableRoomNightsInPeriod) : 0;
        
        //console.log('OCC Calculation - totalRoomsSold:', totalRoomsSold);
        //console.log('OCC Calculation - totalAvailableRoomNightsInPeriod:', totalAvailableRoomNightsInPeriod);
        OCC.value = totalAvailableRoomNightsInPeriod > 0 ? Math.round((totalRoomsSold / totalAvailableRoomNightsInPeriod) * 10000) / 100 : 0;

        // Calculate Forecast
        const forecastDataForPeriod = forecastData.value.filter(forecast => {
            const forecastDate = forecast.date;
            return forecastDate >= startDateForCalc && forecastDate <= endDateForCalc;
        });
        
        let totalForecastRevenue = 0;
        let totalForecastRooms = 0;
        let totalForecastAvailableRooms = 0;
        forecastDataForPeriod.forEach(forecast => {
            totalForecastRevenue += parseFloat(forecast.accommodation_revenue || 0);
            totalForecastRooms += parseInt(forecast.rooms_sold_nights || 0);
            totalForecastAvailableRooms += parseInt(forecast.available_room_nights || 0);
        });
        
        forecastSales.value = Math.round(totalForecastRevenue);
        forecastADR.value = totalForecastRooms > 0 ? Math.round(totalForecastRevenue / totalForecastRooms) : 0;
        forecastRevPAR.value = totalForecastAvailableRooms > 0 ? Math.round(totalForecastRevenue / totalForecastAvailableRooms) : 0;
        forecastOCC.value = totalForecastAvailableRooms > 0 ? Math.round((totalForecastRooms / totalForecastAvailableRooms) * 10000) / 100 : 0;

        // Calculate Differences
        salesDifference.value = Math.round(totalRevenue) - forecastSales.value;
        ADRDifference.value = Math.round(ADR.value) - forecastADR.value;
        revPARDifference.value = Math.round(revPAR.value) - forecastRevPAR.value;
        OCCDifference.value = OCC.value - forecastOCC.value;
    };

    // eCharts Instances & Refs
    import * as echarts from 'echarts/core';
    import {        
        TooltipComponent,
        GridComponent,
        LegendComponent,
        TitleComponent, // Added TitleComponent
        MarkLineComponent, // Added MarkLineComponent
        MarkPointComponent, // Added MarkPointComponent
        VisualMapComponent, // Added VisualMapComponent back
    } from 'echarts/components';
    import { HeatmapChart, ScatterChart, BarChart, LineChart, PieChart, SunburstChart, TreemapChart } from 'echarts/charts';
    import { UniversalTransition } from 'echarts/features';
    import { CanvasRenderer } from 'echarts/renderers';

    echarts.use([
        TooltipComponent,
        GridComponent,
        LegendComponent,
        TitleComponent, // Added TitleComponent
        MarkLineComponent, // Added MarkLineComponent
        MarkPointComponent, // Added MarkLineComponent
        VisualMapComponent, // Added VisualMapComponent to echarts.use
        HeatmapChart,
        ScatterChart,
        BarChart, // Added BarChart back
        LineChart,
        PieChart,
        SunburstChart,
        TreemapChart, // Added TreemapChart
        UniversalTransition,
        CanvasRenderer
    ]);
    const heatMap = ref(null);
    let myHeatMap; 
    const heatMapAxisX = computed(() => { 
        const start = new Date(heatMapDisplayStartDate.value);
        const end = new Date(heatMapDisplayEndDate.value);
        const weekIntervals = [];
        let current = new Date(start);
        while (current <= end) {
            const month = current.getMonth() + 1;
            const day = current.getDate();
            weekIntervals.push(`${month}月${day}日の週`);
            current.setDate(current.getDate() + 7);
        }
        return weekIntervals;
    });
    const heatMapAxisY = ref([
        '日', '土', '金', '木', '水', '火', '月'
    ]);
    const heatMapMax = ref(0);
    const heatMapData = ref([]);
        
    const processHeatMapData = () => {
        if (!allReservationsData.value || !heatMap.value) {
            heatMapData.value = [];
            initHeatMap(); // Initialize with empty data if needed
            return;
        }
        
        const start = normalizeDate(new Date(heatMapDisplayStartDate.value));
        const end = normalizeDate(new Date(heatMapDisplayEndDate.value));
               
        // Filter reservations for the heatmap's specific display window
        const relevantReservations = allReservationsData.value.filter(r => {
            const rDate = normalizeDate(new Date(r.date));
            return rDate >= start && rDate <= end;
        });
                
        if(relevantReservations && relevantReservations.length > 0){            
            heatMapMax.value = relevantReservations[0].total_rooms; 
        } else {
            heatMapMax.value = 0;
        }
                
        const datePositionMap = {};
        let currentMapDate = start;
        let weekIdx = 0;
        let dayIdx = 0; // Monday is 6, Sunday is 0 (matching Y-axis)

        while (currentMapDate <= end) {
            
            const formattedDate = formatDate(new Date(currentMapDate));
            dayIdx = (7 - currentMapDate.getUTCDay()) % 7;            

            datePositionMap[formattedDate] = { week: weekIdx, day: dayIdx };
            
            if (currentMapDate.getUTCDay() === 0) {
                weekIdx++;
            }
            
            currentMapDate = addDaysUTC(currentMapDate, 1);
        }        
        
        const processedData = [];
        relevantReservations.forEach(reservation => {
            const reservationDateISO = formatDate(new Date(reservation.date));            
            const position = datePositionMap[reservationDateISO];
            if (position) {
                // Data format for heatmap: [weekIndex, dayIndex, value]
                processedData.push([position.week, position.day, parseInt(reservation.room_count || 0)]);
            }
        });
        heatMapData.value = processedData;        
        initHeatMap();
    };
    const initHeatMap = () => {
        if (!heatMap.value) return;
        const option = {
            tooltip: { position: 'top' },
            grid: { height: '50%', top: '5%', bottom: '5%' },
            xAxis: {
                type: 'category',
                data: heatMapAxisX.value,
                splitArea: { show: true },
                axisLabel: { 
                    formatter: function (value) {
                        return value.split('').join('\n'); // Split each character and add a newline
                    },
                    
                }
            },
            yAxis: { type: 'category', data: heatMapAxisY.value, splitArea: { show: true } },
            visualMap: {
                min: 0,
                max: heatMapMax.value, // Use dynamic max based on hotel capacity or data
                calculable: true,
                orient: 'horizontal',
                left: 'center',
                bottom: '5%'
            },
            series: [{
                name: '予約数',
                type: 'heatmap',
                data: heatMapData.value,
                label: { show: true, formatter: (params) => params.value[2] > 0 ? params.value[2] : '' }, // Show value if > 0
                emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
            }]
        };
        if (!myHeatMap) {
            myHeatMap = echarts.init(heatMap.value);
        }
        myHeatMap.setOption(option, true); // true to not merge with previous options
    };
    
    // Line Chart
    const lineChart = ref(null);
    let myLineChart = null;
    const salesByPlanChart = ref(null);
    let mySalesByPlanChart = null;
    const occupationBreakdownChart = ref(null);
    let myOccupationBreakdownChart = null;
    const bookingSourceChart = ref(null);
    let myBookingSourceChart = null;
    const paymentTimingChart = ref(null);
    let myPaymentTimingChart = null;
    const bookerTypeChart = ref(null);
    let myBookerTypeChart = null;
    const averageLengthOfStayChart = ref(null);
    let myAverageLengthOfStayChart = null;
    const lineChartAxisX = ref([]);
    const lineChartSeriesData = ref([]);
    const lineChartSeriesSumData = ref([]);

    const lineChartTitle = computed(() => {
        const year = selectedMonth.value.getFullYear();
        const month = selectedMonth.value.getMonth() + 1;
        if (viewMode.value === 'month') {
            return `${year}年${month}月の日次売上`;
        } else {
            return `${year}年度 月次売上 (1月～${month}月累計)`;
        }
    });

    const processLineChartData = () => {
        if (!allReservationsData.value || !lineChart.value) {
            lineChartAxisX.value = [];
            lineChartSeriesData.value = [];
            lineChartSeriesSumData.value = [];
            displayedCumulativeSales.value = 0;
            initLineChart();
            return;
        }

        const startDateForChart = formatDate(new Date(metricsEffectiveStartDate.value));
        const endDateForChart = formatDate(new Date(metricsEffectiveEndDate.value));

        const relevantChartReservations = allReservationsData.value.filter(res => {
            const resDate = res.date;
            return resDate >= startDateForChart && resDate <= endDateForChart;
        });
        
        const dailySalesMap = new Map(); 
        relevantChartReservations.forEach(res => {
            const dayKey = res.date;            
            const currentSales = dailySalesMap.get(dayKey) || 0;
            dailySalesMap.set(dayKey, currentSales + parseFloat(res.price || 0));
        });
        
        const newXAxis = [];
        const newSeriesData = [];
        const newSeriesSumData = [];
        let cumulativeSum = 0;

        if (viewMode.value === 'month') {
            // Daily view for the selected month                        
            let currentDate = normalizeDate(new Date(startDateForChart));
            const endDate = normalizeDate(new Date(endDateForChart));
            while (currentDate <= endDate) {
                //console.log(currentDate, 'is < than ', endDate)
                const dayKey = formatDate(currentDate);
                newXAxis.push(dayKey);

                const salesForDay = dailySalesMap.get(dayKey) || 0;
                const item = {
                    value: Math.round(salesForDay)
                };
                if (isWeekend(dayKey)) {
                    item.itemStyle = {
                        color: '#FFC0CB' // Light pink for weekends
                    };
                }
                newSeriesData.push(item);
                cumulativeSum += salesForDay;
                newSeriesSumData.push(Math.round(cumulativeSum));

                currentDate = addDaysUTC(currentDate, 1);
            }                        
        } else { // yearCumulative
            // Monthly view from Jan to selected month
            const endMonthIndex = selectedMonth.value.getMonth(); // 0-11
            for (let monthIdx = 0; monthIdx <= endMonthIndex; monthIdx++) {
                const currentYear = yearOfSelectedMonth.value;
                newXAxis.push(`${currentYear}年${monthIdx + 1}月`);

                let salesForMonth = 0;
                dailySalesMap.forEach((sales, dayKey) => {
                    const [year, month] = dayKey.split('-').map(Number);
                    if (year === currentYear && month === monthIdx + 1) {
                        salesForMonth += sales;
                    }
                });
                newSeriesData.push(Math.round(salesForMonth));
                cumulativeSum += salesForMonth; // This sum is YTD
                newSeriesSumData.push(Math.round(cumulativeSum));
            }
        }
        lineChartAxisX.value = newXAxis;
        lineChartSeriesData.value = newSeriesData;
        lineChartSeriesSumData.value = newSeriesSumData;
        displayedCumulativeSales.value = newSeriesSumData.length > 0 ? newSeriesSumData[newSeriesSumData.length - 1] : 0;
        initLineChart();
    };
    
     const initLineChart = () => {
        if (!lineChart.value) return;
        const option = {
            tooltip: {
                trigger: 'axis',
                position: 'top',
                formatter: (params) => {
                    let dateStr = params[0].name;
                    let tooltipContent = '';
                    if (viewMode.value === 'month') {
                        const date = new Date(dateStr);
                        const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];
                        const dayOfWeek = daysOfWeek[date.getDay()];
                        tooltipContent += `${dateStr} (${dayOfWeek})<br/>`;
                    } else {
                        tooltipContent += `${dateStr}<br/>`;
                    }
                    params.forEach(item => {
                        tooltipContent += `${item.marker} ${item.seriesName}: ${item.value.toLocaleString('ja-JP')} 円<br/>`;
                    });
                    return tooltipContent;
                }
            },
            legend: {
                data: viewMode.value === 'month' ? ['日次売上', '当月累計'] : ['月次売上', '年度累計'],
                bottom: 0
            },
            grid: { top: '20%', height: '70%', left: '3%', right: '10%', bottom: '10%', containLabel: true }, // Increased right padding
            xAxis: {
                type: 'category',
                boundaryGap: true, // Always true for bar charts
                data: lineChartAxisX.value,
                axisLabel: {
                    rotate: viewMode.value === 'month' ? 45 : 0,
                    formatter: (value) => {
                        if (viewMode.value === 'month' && typeof value === 'string' && value.includes('-')) {
                            return value.substring(5);
                        }
                        return value;
                    }
                }
            },
            yAxis: [ // Changed to an array for two Y-axes
                {
                    type: 'value',
                    name: viewMode.value === 'month' ? '日次売上 (円)' : '月次売上 (円)',
                    axisLabel: {
                        formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                    }
                },
                {
                    type: 'value',
                    name: viewMode.value === 'month' ? '当月累計 (円)' : '年度累計 (円)', // Name for the second Y-axis
                    axisLabel: {
                        formatter: (value) => value >= 10000 ? `${(value / 10000).toLocaleString()}万円` : `${value.toLocaleString()}円`
                    },
                    alignTicks: true // Align ticks with the first y-axis
                }
            ],
            series: [
                {
                    name: viewMode.value === 'month' ? '日次売上' : '月次売上',
                    type: 'bar',
                    data: lineChartSeriesData.value,
                    itemStyle: { color: '#4ea397' }, // Updated color
                    yAxisIndex: 0, // Explicitly assign to the first Y-axis
                    barCategoryGap: '20%' // Add gap between bars
                },
                {
                    name: viewMode.value === 'month' ? '当月累計' : '年度累計',
                    type: 'line',
                    smooth: true,
                    data: lineChartSeriesSumData.value,
                    itemStyle: { color: '#22c3aa' }, // Updated color
                    yAxisIndex: 1 // Assign to the second Y-axis
                }
            ]
        };
        if (!myLineChart) {
            myLineChart = echarts.init(lineChart.value);
        }
        myLineChart.setOption(option, true);
    };

    const processSalesByPlanChartData = () => {
        if (salesByPlanViewMode.value === 'chart') {
            initSalesByPlanChart();
        }
    };

    const initSalesByPlanChart = () => {
        if (!salesByPlanChart.value) return;

        const chartData = processedSalesByPlan.value;
        const planNames = chartData.map(item => item.plan_name);

        let regularSalesData;
        let cancelledSalesData;
        let valueLabel;
        let axisLabel;

        if (salesByPlanChartMode.value === 'tax_included') {
            regularSalesData = chartData.map(item => item.regular_sales);
            cancelledSalesData = chartData.map(item => item.cancelled_sales);
            valueLabel = ' 万円 (税込み)';
            axisLabel = '売上 (税込み)';
        } else {
            regularSalesData = chartData.map(item => item.regular_net_sales);
            cancelledSalesData = chartData.map(item => item.cancelled_net_sales);
            valueLabel = ' 万円 (税抜き)';
            axisLabel = '売上 (税抜き)';
        }

        const option = {
            color: ["#3fb1e3", "#6be6c1", "#626c91", "#a0a7e6", "#c4ebad", "#96dee8"],
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                valueFormatter: (value) => Math.round(value / 10000).toLocaleString('ja-JP') + valueLabel
            },
            legend: {
                data: ['通常売上', 'キャンセル売上']
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '10%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: axisLabel,
                nameLocation: 'middle',
                nameGap: 30,
                axisLabel: {
                    formatter: (value) => Math.round(value / 10000).toLocaleString('ja-JP') + ' 万円'
                },
                nameTextStyle: {
                    fontWeight: 'bold',
                    fontSize: 12
                }
            },
            yAxis: {
                type: 'category',
                data: planNames
            },
            series: [
                {
                    name: '通常売上',
                    type: 'bar',
                    stack: 'total',
                    label: {
                        show: false,
                        formatter: (params) => Math.round(params.value / 10000).toLocaleString('ja-JP') + valueLabel
                    },
                    emphasis: {
                        focus: 'series'
                    },
                    data: regularSalesData
                },
                {
                    name: 'キャンセル売上',
                    type: 'bar',
                    stack: 'total',
                    label: {
                        show: false,
                        formatter: (params) => Math.round(params.value / 10000).toLocaleString('ja-JP') + valueLabel
                    },
                    emphasis: {
                        focus: 'series'
                    },
                    data: cancelledSalesData
                }
            ]
        };

        if (!mySalesByPlanChart) {
            mySalesByPlanChart = echarts.init(salesByPlanChart.value);
        }
        mySalesByPlanChart.setOption(option, true);
    };

    const processOccupationBreakdownChartData = () => {
        if (occupationBreakdownViewMode.value === 'chart') {
            initOccupationBreakdownChart();
        }
    };

    const initOccupationBreakdownChart = () => {
        if (!occupationBreakdownChart.value || !occupationBreakdownData.value || !Array.isArray(occupationBreakdownData.value)) return;

        const chartData = occupationBreakdownData.value;
        
        // Find the total bookable room nights from the 'Total Available' row
        const totalAvailableRow = chartData.find(row => row.plan_name === 'Total Available');
        const totalBookableRoomNights = totalAvailableRow ? parseInt(totalAvailableRow.total_bookable_room_nights || '0') : 0;
        
        // Filter out the 'Total Available' row from plan data
        const planData = chartData.filter(row => row.plan_name !== 'Total Available');
        
        // If no plan data, show empty chart
        if (!planData.length) {
            const option = {
                title: {
                    text: 'データがありません',
                    left: 'center',
                    top: 'middle'
                }
            };
            if (!myOccupationBreakdownChart) {
                myOccupationBreakdownChart = echarts.init(occupationBreakdownChart.value);
            }
            myOccupationBreakdownChart.setOption(option, true);
            return;
        }
        
        // Define Y-axis categories
        const yAxisCategories = ['確定', 'ブロック', '未予約'];
        
        // Get unique plan names and process them
        const planMap = new Map();
        let totalOccupiedNights = 0;
        let totalConfirmedNights = 0; // Initialize totalConfirmedNights
        
        planData.forEach(plan => {
            let planName = plan.plan_name;
            
            // Check if this is an employee reservation and rename it
            if (plan.employee_nights && parseInt(plan.employee_nights) > 0) {
                planName = '社員';
            }
            
            // Skip 未定 plans - they will be counted in "not booked"
            if (planName === '未定') {
                const undecidedNights = parseInt(plan.undecided_nights || '0');
                totalOccupiedNights += undecidedNights;
                return;
            }
            
            if (!planMap.has(planName)) {
                planMap.set(planName, {
                    '確定': 0,
                    'ブロック': 0,
                    '未予約': 0
                });
            }
            
            const planEntry = planMap.get(planName);
            
            // Add confirmed nights
            const confirmed = parseInt(plan.confirmed_nights || '0');
            planEntry['確定'] += confirmed;
            totalConfirmedNights += confirmed; // Accumulate total confirmed nights
            
            // Add blocked nights
            planEntry['ブロック'] += parseInt(plan.blocked_nights || '0');
            
            // Count total occupied nights for this plan
            totalOccupiedNights += confirmed;
            totalOccupiedNights += parseInt(plan.blocked_nights || '0');
            totalOccupiedNights += parseInt(plan.employee_nights || '0');
        });
        
        // Calculate total not booked nights
        const totalNotBookedNights = totalBookableRoomNights - totalOccupiedNights;
        
        // Add "not booked" as a separate series if there are unbooked nights
        if (totalNotBookedNights > 0) {
            planMap.set('未予約', {
                '確定': 0,
                'ブロック': 0,
                '未予約': totalNotBookedNights
            });
        }
        
        // Convert map to array and sort by total nights (descending)
        const processedPlans = Array.from(planMap.entries()).map(([planName, data]) => ({
            planName,
            ...data,
            total: data['確定'] + data['ブロック'] + data['未予約']
        })).sort((a, b) => b.total - a.total);

        //console.log('totalConfirmedNights:', totalConfirmedNights);
        //console.log('yAxisCategories:', yAxisCategories);
        
        // Create series data for each plan
        const series = processedPlans.map(plan => ({
            name: plan.planName,
            type: 'bar',
            stack: 'total',
            emphasis: {
                focus: 'series'
            },
            label: {
                show: true,
                position: 'top',
                formatter: (params) => {
                    const value = params.value;
                    if (value === 0) return '';
                    
                    // Calculate percentage of total bookable nights
                    const percentage = totalBookableRoomNights > 0 ? ((value / totalBookableRoomNights) * 100) : 0;
                    // Only show label if percentage is 10% or higher
                    if (percentage >= 10) {
                        return `${value.toLocaleString('ja-JP')} 泊 (${percentage.toFixed(1)}%)`;
                    }
                    return '';
                }
            },
            data: yAxisCategories.map(category => plan[category])
        }));

        // Add a dummy series for the total confirmed nights markPoint
        series.push({
            name: '', // Set an empty name to prevent it from showing in tooltip/legend
            type: 'scatter', // Use scatter to just show a point
            showInLegend: false, // Hide this series from the legend
            data: [
                {
                    name: '確定合計',
                    value: totalConfirmedNights,
                    xAxis: totalConfirmedNights,
                    yAxis: '確定',
                    label: {
                        show: true,
                        formatter: `{c} 泊`,
                        position: 'right'
                    },
                    itemStyle: {
                        opacity: 0 // Make the point invisible
                    }
                }
            ],
            markPoint: {
                data: [
                    {
                        name: '確定合計',
                        value: totalConfirmedNights,
                        xAxis: totalConfirmedNights,
                        yAxis: '確定',
                        label: {
                            show: true,
                            formatter: `{c} 泊`,
                            position: 'right'
                        }
                    }
                ]
            }
        });

        const option = {
            color: ["#2ec7c9", "#b6a2de", "#5ab1ef", "#ffb980", "#d87a80", "#8d98b3", "#e5cf0d", "#97b552", "#95706d", "#dc69aa", "#07a2a4", "#9a7fd1", "#588dd5", "#f5994e", "#c05050", "#59678c", "#c9ab00", "#7eb00a", "#6f5553", "#c14089", "#FFC0CB", "#ADD8E6", "#90EE90", "#FFD700", "#FFA07A"],
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    type: 'shadow'
                },
                formatter: (params) => {
                    const categoryName = params[0].axisValue;
                    let tooltipContent = `${categoryName}<br/>`;
                    let totalForCategory = 0;
                    
                    // Filter out the dummy series from params for total calculation
                    const filteredParams = params.filter(item => item.seriesName !== '' && item.seriesName !== '確定合計');

                    // Calculate total for the current category
                    filteredParams.forEach(item => {
                        totalForCategory += item.value;
                    });

                    filteredParams.forEach(item => {
                        if (item.value > 0) {
                            const categoryPercentage = totalBookableRoomNights > 0 ? ((item.value / totalBookableRoomNights) * 100).toFixed(1) : 0;
                            const withinCategoryPercentage = totalForCategory > 0 ? ((item.value / totalForCategory) * 100).toFixed(1) : 0;
                            tooltipContent += `${item.marker} ${item.seriesName}: ${item.value.toLocaleString('ja-JP')} 泊 (合計の${categoryPercentage}%, ${categoryName}の${withinCategoryPercentage}%)<br/>`;
                        }
                    });
                    tooltipContent += `<br/>合計利用可能泊数: ${totalBookableRoomNights.toLocaleString('ja-JP')} 泊`;
                    return tooltipContent;
                }
            },
            legend: {
                data: processedPlans.map(plan => plan.planName),
                // Removed type: 'scroll' to allow wrapping
                bottom: 0
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%', // Increased to accommodate scrollable legend
                top: '5%',
                containLabel: true
            },
            xAxis: {
                type: 'value',
                name: '泊数',
                axisLabel: {
                    formatter: (value) => value.toLocaleString('ja-JP') + ' 泊'
                }
            },
            yAxis: {
                type: 'category',
                data: yAxisCategories,
                axisLabel: {
                    formatter: (value) => {
                        const labels = {
                            '確定': '確定',
                            'ブロック': 'ブロック',
                            '未予約': '未予約'
                        };
                        return labels[value] || value;
                    }
                }
            },
            series: series
        };

        if (!myOccupationBreakdownChart) {
            myOccupationBreakdownChart = echarts.init(occupationBreakdownChart.value);
        }
        myOccupationBreakdownChart.setOption(option, true);
    };

    const initBookingSourceChart = () => {
        if (!bookingSourceChart.value) return;

        const sourceData = bookingSourceData.value;
        if (!sourceData || sourceData.length === 0) return;

        const data = [];
        const directNode = { name: '直予約', value: 0 };
        const otaNode = { name: 'OTA', children: [] };
        const webNode = { name: '自社HP', children: [] }; // Renamed to represent 自社HP specifically
        const webParentNode = { name: 'WEB', children: [] }; // New parent node for WEB

        const otaAgentMap = new Map();
        const webAgentMap = new Map(); // This will now collect agents for 自社HP

        sourceData.forEach(item => {
            if (item.type === 'ota') {
                const agentName = item.agent || 'その他';
                if (!otaAgentMap.has(agentName)) {
                    otaAgentMap.set(agentName, 0);
                }
                otaAgentMap.set(agentName, otaAgentMap.get(agentName) + item.room_nights);
            } else if (item.type === 'web') {
                const agentName = item.agent || 'その他'; // This 'agent' would be 'official' or 'other' for web
                if (!webAgentMap.has(agentName)) {
                    webAgentMap.set(agentName, 0);
                }
                webAgentMap.set(agentName, webAgentMap.get(agentName) + item.room_nights);
            } else {
                directNode.value += item.room_nights;
            }
        });

        otaAgentMap.forEach((value, name) => {
            otaNode.children.push({ name, value });
        });

        webAgentMap.forEach((value, name) => {
            webNode.children.push({ name, value });
        });

        // Now, construct the main 'data' array
        if (directNode.value > 0) data.push(directNode);

        // Add OTA and 自社HP (webNode) as children of webParentNode
        if (otaNode.children.length > 0) webParentNode.children.push(otaNode);
        if (webNode.children.length > 0) webParentNode.children.push(webNode);

        // Push the webParentNode if it has children
        if (webParentNode.children.length > 0) data.push(webParentNode);

        const option = {
            color: ['#FFDAB9', '#B2EBF2', '#E6E6FA', '#F08080', '#EEE8AA'], // New pastel colors
            tooltip: {
                trigger: 'item',
                formatter: (params) => {
                    if (params.treePathInfo && params.treePathInfo.length > 0) {
                        const current = params.treePathInfo[params.treePathInfo.length - 1];
                        const rootTotal = params.treePathInfo[0].value; // Get the total from the root node
                        const percentage = (current.value / rootTotal * 100).toFixed(1);
                        return `${params.name}: ${current.value}泊 (${percentage}%)`;
                    }
                    return `${params.name}: ${params.value}泊`;
                }
            },
            series: {
                type: 'treemap',
                data: data,
                radius: [0, '100%'],
                center: ['50%', '50%'],                                           
                label: {
                    formatter: (params) => {
                        // This formatter will now apply to lower levels
                        if (params.treePathInfo && params.treePathInfo.length > 0) {
                            const current = params.treePathInfo[params.treePathInfo.length - 1];
                            const rootTotal = params.treePathInfo[0].value;
                            const percentage = (current.value / rootTotal * 100).toFixed(1);

                            if (percentage > 2) { // Only show for lower levels if percentage is significant
                                return `${params.name}\n${percentage}%`;
                            }
                        }
                        return '';
                    },
                    color: '#000' // Labels black
                },
                itemStyle: {
                    borderColor: '#fff',
                    borderRadius: 5 // Rounded borders for the main treemap items
                },
                levels: [
                    {
                        itemStyle: {
                            borderWidth: 4, // Thicker border
                            borderColor: 'rgba(70, 92, 107, 0.5)', // Dark blue-grey border with transparency
                            gapWidth: 2, // Thicker gap
                            borderRadius: 5 // Rounded borders for the first level
                        },
                        upperLabel: {
                            show: false, // Changed to false
                            formatter: (params) => {
                                const current = params.treePathInfo[params.treePathInfo.length - 1];
                                const rootTotal = params.treePathInfo[0].value;
                                const percentage = (current.value / rootTotal * 100).toFixed(1);
                                return `${params.name}\n${percentage}%`; // Always show name and percentage for top-level
                            },
                            color: '#000' // Labels black
                        },
                        emphasis: { // Added emphasis for first level
                            itemStyle: {
                                borderColor: 'rgba(221, 221, 221, 0.7)', // Light grey border with transparency on hover
                                borderWidth: 4 // Thicker border on hover
                            }
                        }
                    },
                    {
                        itemStyle: {
                            borderWidth: 6, // Thicker border
                            borderColor: 'rgba(70, 92, 107, 0.5)', // Dark blue-grey border with transparency
                            gapWidth: 2, // Thicker gap
                            borderRadius: 5 // Rounded borders for the second level
                        },
                        emphasis: {
                            itemStyle: {
                                borderColor: 'rgba(221, 221, 221, 0.7)', // Light grey border with transparency on hover
                                borderWidth: 4 // Thicker border on hover
                            }
                        }
                    },
                    {
                        itemStyle: {
                            borderWidth: 6, // Thicker border
                            borderColor: 'rgba(70, 92, 107, 0.5)', // Dark blue-grey border with transparency
                            gapWidth: 2, // Thicker gap
                            borderRadius: 5 // Rounded borders for the third level
                        },
                        emphasis: {
                            itemStyle: {
                                borderColor: 'rgba(221, 221, 221, 0.7)', // Light grey border with transparency on hover
                                borderWidth: 2 // Thicker border on hover
                            }
                        }
                    }
                ]
            }
        };

        if (!myBookingSourceChart) {
            myBookingSourceChart = echarts.init(bookingSourceChart.value);
        }
        myBookingSourceChart.setOption(option, true);
    };

    const initPaymentTimingChart = () => {
        if (!paymentTimingChart.value) return;

        const paymentData = paymentTimingData.value;
        if (!paymentData || paymentData.length === 0) return;

        const chartData = paymentData.map(item => ({
            value: item.count,
            name: translatePaymentTiming(item.paymentTiming)
        }));

        const option = {
            color: ["#3fb1e3", "#6be6c1", "#626c91", "#a0a7e6", "#c4ebad", "#96dee8"],
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} 泊 ({d}%)'
            },
            legend: {
                bottom: '5%',
                left: 'center'
            },
            series: [
                {
                    name: '支払タイミング',
                    type: 'pie',
                    radius: ['40%', '60%'],
                    center: ['50%', '40%'],
                    avoidLabelOverlap: false,
                    padAngle: 5,
                    itemStyle: {
                        borderRadius: 10
                    },
                    label: {
                        show: true,
                        position: 'outside',
                        formatter: '{d}%'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 24,
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: true
                    },
                    data: chartData
                }
            ]
        };

        if (!myPaymentTimingChart) {
            myPaymentTimingChart = echarts.init(paymentTimingChart.value);
        }
        myPaymentTimingChart.setOption(option, true);
    };

    // Booker Type Distribution
    const bookerTypeData = ref([]);
    const processBookerTypeData = () => {
        if (!bookerTypeBreakdownData.value || bookerTypeBreakdownData.value.length === 0) {
            bookerTypeData.value = [];
            initBookerTypeChart();
            return;
        }

        // Use data directly from the backend
        const mappedData = bookerTypeBreakdownData.value.map(item => {
            let name;
            if (item.legal_or_natural_person === 'individual' || item.legal_or_natural_person === 'natural') {
                name = '個人';
            } else if (item.legal_or_natural_person === 'corporate' || item.legal_or_natural_person === 'legal') {
                name = '法人';
            } else {
                name = '未設定'; // Handle unexpected values with '未設定'
            }
            return { name, value: item.room_nights };
        });

        // Aggregate values for the same name (e.g., if both 'individual' and 'natural' map to '個人')
        const aggregatedData = mappedData.reduce((acc, current) => {
            const existing = acc.find(item => item.name === current.name);
            if (existing) {
                existing.value += current.value;
            } else {
                acc.push({ ...current });
            }
            return acc;
        }, []);

        bookerTypeData.value = aggregatedData.filter(item => item.value > 0);
        initBookerTypeChart();
    };

    const initBookerTypeChart = () => {
        if (!bookerTypeChart.value) return;

        const option = {
            color: ["#5470c6", "#91cc75", "#fac858", "#ee6666", "#73c0de", "#3ba272", "#fc8452", "#9a60b4", "#ea7ccc"],
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c} 泊 ({d}%)'
            },
            legend: {
                orient: 'vertical',
                left: 'left',
                bottom: 'bottom'
            },
            series: [
                {
                    name: '予約者区分',
                    type: 'pie',
                    radius: ['40%', '70%'],
                    center: ['50%', '50%'],
                    avoidLabelOverlap: false,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: true,
                        position: 'outside',
                        formatter: (params) => {
                            const total = bookerTypeData.value.reduce((sum, item) => sum + item.value, 0);
                            const percentage = (params.value / total * 100);
                            return percentage > 5 ? `${params.name}: ${percentage.toFixed(1)}%` : '';
                        }
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: 20,
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: true // Changed to true
                    },
                    data: bookerTypeData.value
                }
            ]
        };

        if (!myBookerTypeChart) {
            myBookerTypeChart = echarts.init(bookerTypeChart.value);
        }
        myBookerTypeChart.setOption(option, true);
    };

    // Average Length of Stay (Boxplot)
    const averageLengthOfStayData = ref([]);
    const averageNights = ref(0);
    const averagePeople = ref(0);

    const processAverageLengthOfStayData = () => {
        if (!reservationListData.value) {
            averageLengthOfStayData.value = [];
            averageNights.value = 0;
            averagePeople.value = 0;
            initAverageLengthOfStayChart();
            return;
        }

        const rawDataForScatter = [];
        let totalNightsSum = 0;
        let totalPeopleSum = 0;
        let reservationCount = 0;

        reservationListData.value
            .filter(res => res.number_of_nights > 0 && res.number_of_people > 0)
            .forEach(res => {
                const nights = Number(res.number_of_nights);
                const people = Number(res.number_of_people);
                rawDataForScatter.push([nights, people]);
                totalNightsSum += nights;
                totalPeopleSum += people;
                reservationCount++;
            });

        averageLengthOfStayData.value = rawDataForScatter; // Assign raw data directly
        averageNights.value = reservationCount > 0 ? (totalNightsSum / reservationCount) : 0;
        averagePeople.value = reservationCount > 0 ? (totalPeopleSum / reservationCount) : 0;

        initAverageLengthOfStayChart();
    };

    const initAverageLengthOfStayChart = () => {
        if (!averageLengthOfStayChart.value) return;

        const option = {
            title: {
                text: '平均滞在日数と人数分布',
                left: 'center',
                show: false
            },
            grid: {
                left: '3%',
                right: '7%',
                bottom: '7%',
                containLabel: true
            },
            tooltip: {
                showDelay: 0,
                formatter: function (params) {
                    if (params.value.length > 1) {
                        return (
                            `泊数: ${params.value[0]}泊<br/>人数: ${params.value[1]}人`
                        );
                    } else {
                        return (
                            `${params.seriesName} :<br/>` +
                            `${params.name} : ${params.value} `
                        );
                    }
                },
                axisPointer: {
                    show: true,
                    type: 'cross',
                    lineStyle: {
                        type: 'dashed',
                        width: 1
                    }
                }
            },
            xAxis: [
                {
                    type: 'value',
                    scale: true,
                    axisLabel: {
                        formatter: '{value} 泊'
                    },
                    splitLine: {
                        show: false
                    }
                }
            ],
            yAxis: [
                {
                    type: 'value',
                    scale: true,
                    axisLabel: {
                        formatter: '{value} 人'
                    },
                    splitLine: {
                        show: false
                    }
                }
            ],
            series: [
                {
                    name: '予約データ',
                    type: 'scatter',
                    data: averageLengthOfStayData.value,
                    markPoint: {
                        data: [
                            { type: 'max', name: '最大値' },
                            { type: 'min', name: '最小値' }
                        ]
                    },
                    markLine: {
                        lineStyle: {
                            type: 'solid'
                        },
                        data: [
                            { xAxis: averageNights.value, name: '平均泊数' },
                            { yAxis: averagePeople.value, name: '平均人数' }
                        ]
                    }
                }
            ]
        };

        if (!myAverageLengthOfStayChart) {
            myAverageLengthOfStayChart = echarts.init(averageLengthOfStayChart.value);
        }
        myAverageLengthOfStayChart.setOption(option, true);
    };

    const handleResize = () => {
        if (myHeatMap) myHeatMap.resize();
        if (myLineChart) myLineChart.resize();
        if (mySalesByPlanChart) mySalesByPlanChart.resize();
        if (myOccupationBreakdownChart) myOccupationBreakdownChart.resize();
        if (myBookingSourceChart) myBookingSourceChart.resize();
        if (myPaymentTimingChart) myPaymentTimingChart.resize();
        if (myBookerTypeChart) myBookerTypeChart.resize();
        if (myAverageLengthOfStayChart) myAverageLengthOfStayChart.resize();
    };

    // --- Data Fetching and Processing ---
    const fetchDataAndProcess = async () => {        
        if (!selectedHotelId.value) {
            // console.warn("Hotel ID not selected. Skipping data fetch.");
            allReservationsData.value = []; // Clear data
            // Call processors to clear charts/metrics
            processHeatMapData(); 
            processLineChartData();
            calculateMetrics();
            processBookerTypeData(); // New call
            processAverageLengthOfStayData(); // New call
            return;
        }
        try {
            // Fetch data for the widest necessary range            
            const rawData = await fetchCountReservation(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            const forecastDataResult = await fetchForecastData(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            const accountingDataResult = await fetchAccountingData(selectedHotelId.value, dataFetchStartDate.value, dataFetchEndDate.value);
            const salesByPlanResult = await fetchSalesByPlan(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const occupationBreakdownResult = await fetchOccupationBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const bookingSourceResult = await fetchBookingSourceBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const paymentResult = await fetchPaymentTimingBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);
            const bookerTypeBreakdownResult = await fetchBookerTypeBreakdown(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value); // New fetch
            // Fetch reservation list for booker type and length of stay
            const reservationListViewResult = await fetchReservationListView(selectedHotelId.value, metricsEffectiveStartDate.value, metricsEffectiveEndDate.value);


            if (rawData && Array.isArray(rawData)) {                
                allReservationsData.value = rawData.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.date))
                }));
            } else {
                allReservationsData.value = [];
            }

            if (forecastDataResult && Array.isArray(forecastDataResult)) {
                forecastData.value = forecastDataResult.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.forecast_month))
                }));
            } else {
                forecastData.value = [];
            }
            // console.log('forecastData', forecastData.value);

            if (accountingDataResult && Array.isArray(accountingDataResult)) {
                accountingData.value = accountingDataResult.map(item => ({
                    ...item,
                    date: formatDate(new Date(item.accounting_month))
                }));
            } else {
                accountingData.value = [];
            }
            salesByPlan.value = salesByPlanResult;
            console.log('Raw Sales by Plan Result:', salesByPlanResult);
            occupationBreakdownData.value = occupationBreakdownResult;
            bookingSourceData.value = bookingSourceResult;
            paymentTimingData.value = paymentResult;
            bookerTypeBreakdownData.value = bookerTypeBreakdownResult; // Assign new data
            // Assign reservation list data
            if (reservationListViewResult && Array.isArray(reservationListViewResult)) {
                // Ensure clients_json and payers_json are parsed if they are strings
                reservationListData.value = reservationListViewResult.map(res => ({
                    ...res,
                    clients_json: typeof res.clients_json === 'string' ? JSON.parse(res.clients_json) : res.clients_json,
                    payers_json: typeof res.payers_json === 'string' ? JSON.parse(res.payers_json) : res.payers_json
                }));
            } else {
                reservationListData.value = [];
            }

            // console.log('Occupation Breakdown Data (frontend):', occupationBreakdownData.value); // DEBUG - Removed
            // console.log('Occupation Breakdown Data Length (frontend):', occupationBreakdownData.value ? occupationBreakdownData.value.length : 0); // DEBUG - Removed
            // console.log('accountingData', accountingData.value);
            
        } catch (error) {
            console.error("Error fetching reservation data:", error);
            allReservationsData.value = []; // Clear data on error
        }
        
        // Process data for all components        
        await nextTick();
        processHeatMapData(); 
        processLineChartData();
        processSalesByPlanChartData();
        processOccupationBreakdownChartData(); // New call
        initBookingSourceChart();
        initPaymentTimingChart();
        processBookerTypeData(); // New call
        processAverageLengthOfStayData(); // New call
        calculateMetrics();
    };

    // --- Lifecycle and Watchers ---

    onMounted(async () => {
        await fetchHotels();
        await fetchHotel();

        await fetchDataAndProcess();

        window.addEventListener('resize', handleResize);
    });

    onBeforeUnmount(() => {
        window.removeEventListener('resize', handleResize);
        if (myHeatMap) myHeatMap.dispose();
        if (myLineChart) myLineChart.dispose();
        if (mySalesByPlanChart) mySalesByPlanChart.dispose();
        if (myOccupationBreakdownChart) myOccupationBreakdownChart.dispose(); // New dispose
        if (myBookingSourceChart) myBookingSourceChart.dispose();
        if (myPaymentTimingChart) myPaymentTimingChart.dispose();
        if (myBookerTypeChart) myBookerTypeChart.dispose(); // New dispose
        if (myAverageLengthOfStayChart) myAverageLengthOfStayChart.dispose(); // New dispose
    });

    watch([selectedMonth, selectedHotelId, viewMode], fetchDataAndProcess, { deep: true });

    watch(salesByPlanViewMode, (newValue) => {
        if (newValue === 'table' && mySalesByPlanChart) {
            mySalesByPlanChart.dispose();
            mySalesByPlanChart = null;
        } else if (newValue === 'chart') {
            nextTick(() => {
                processSalesByPlanChartData();
            });
        }
    });

    watch(occupationBreakdownViewMode, (newValue) => {
        if (newValue === 'table' && myOccupationBreakdownChart) {
            myOccupationBreakdownChart.dispose();
            myOccupationBreakdownChart = null;
        } else if (newValue === 'chart') {
            nextTick(() => {
                processOccupationBreakdownChartData();
            });
        }
    });    

    watch(salesByPlanChartMode, (newValue) => {
        if (mySalesByPlanChart) {
            nextTick(() => {
                processSalesByPlanChartData();
            });
        }
    });
  
</script>
<style scoped>
</style>