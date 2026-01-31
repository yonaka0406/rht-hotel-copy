<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal header="ダッシュボードデータ"
        :style="{ width: '95vw', maxWidth: '800px' }">
        <div class="flex flex-col justify-center items-center text-center w-full">
            <div class="relative flex items-center justify-center w-full">
                <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="name" optionValue="value"
                    aria-labelledby="basic" class="" />
                <Button class="absolute right-0 p-button-text" @click="copyReportToClipboard" v-tooltip.bottom="'レポートをコピー'">
                    <span class="pi pi-copy"></span>
                    <span class="hidden sm:inline ml-2 text-sm">レポートをコピー</span>
                </Button>
            </div>
            <p class="mt-4 text-lg font-bold">{{ hotelName }} {{ formattedDate }}</p>
            <div class="mt-4 text-left w-full p-2">
                <div class="hidden" ref="reportContentForCopy"><pre class="whitespace-pre-wrap">{{ plainTextReportContent }}</pre></div>
                <div v-if="selectedView === '当日'">
                    <h3 class="text-lg font-bold mb-2">チェックイン・チェックアウト</h3>
                    <DataTable :value="displayReportData.dailyCheckInOut" class="mb-4" size="small">
                        <DateColumn compactValueField="originalDate" />
                        <Column field="checkin" header="イン"></Column>
                        <Column field="checkout" header="アウト"></Column>
                        <Column field="remarks" header="備考"></Column>
                    </DataTable>

                    <h3 class="text-lg font-bold mb-2">食事数</h3>
                    <DataTable :value="displayReportData.dailyMeal" size="small">
                        <DateColumn compactValueField="originalDate" />
                        <Column field="breakfast">
                            <template #header>
                                <span class="hidden sm:inline">朝食</span>
                                <span class="inline sm:hidden text-xs">朝</span>
                            </template>
                        </Column>
                        <Column field="lunch">
                            <template #header>
                                <span class="hidden sm:inline">昼食</span>
                                <span class="inline sm:hidden text-xs">昼</span>
                            </template>
                        </Column>
                        <Column field="dinner">
                            <template #header>
                                <span class="hidden sm:inline">夕食</span>
                                <span class="inline sm:hidden text-xs">夕</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>

                <div v-else-if="selectedView === '週間'">
                    <h3 class="text-lg font-bold mb-2">日別内訳</h3>
                    <DataTable :value="displayReportData.weeklyCheckInOut" class="mb-4" size="small">
                        <DateColumn compactValueField="originalDate" />
                        <Column field="checkin" header="イン"></Column>
                        <Column field="checkout" header="アウト"></Column>
                        <Column field="remarks" header="備考"></Column>
                    </DataTable>

                    <h3 class="text-lg font-bold mb-2">食事数</h3>
                    <DataTable :value="displayReportData.weeklyMeal" size="small">
                        <DateColumn compactValueField="originalDate" />
                        <Column field="breakfast">
                            <template #header>
                                <span class="hidden sm:inline">朝食</span>
                                <span class="inline sm:hidden text-xs">朝</span>
                            </template>
                        </Column>
                        <Column field="lunch">
                            <template #header>
                                <span class="hidden sm:inline">昼食</span>
                                <span class="inline sm:hidden text-xs">昼</span>
                            </template>
                        </Column>
                        <Column field="dinner">
                            <template #header>
                                <span class="hidden sm:inline">夕食</span>
                                <span class="inline sm:hidden text-xs">夕</span>
                            </template>
                        </Column>
                    </DataTable>
                </div>
            </div>
        </div>
    </Dialog>

</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Dialog, SelectButton, Button, DataTable, Column } from 'primevue';
import { useToast } from "primevue/usetoast";
import { formatCompactDate } from '@/utils/dateUtils';
import DateColumn from './DateColumn.vue';

const toast = useToast();
const reportContentForCopy = ref(null);

onMounted(() => {
});

const props = defineProps({
    visible: Boolean,
    dashboardSelectedDate: Date,
    checkInOutReportData: Array,
    hotelName: String, // New prop for hotel name
    mealReportData: Object // New prop for meal report data
});

const selectedView = ref('週間');
const viewOptions = ref([
    { name: '当日', value: '当日' },
    { name: '週間', value: '週間' }
]);

const formattedDate = computed(() => {
    if (!props.dashboardSelectedDate) return '';

    const startDate = new Date(props.dashboardSelectedDate);
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };

    if (selectedView.value === '当日') {
        return startDate.toLocaleDateString('ja-JP', options);
    } else if (selectedView.value === '週間') {
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        return `${startDate.toLocaleDateString('ja-JP', options)} ~ ${endDate.toLocaleDateString('ja-JP', options)}`;
    }
    return '';
});

const getMidnight = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

const formatGender = (female) => {
    return female > 0 ? `${female}♀️ ` : '';
};

const formatReportDate = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '無効な日付'; // Localized invalid date
    }
    const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
    const formatted = date.toLocaleDateString('ja-JP', options);
    return formatted;
};

const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        return ''; // Safe fallback instead of throwing
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const plainTextReportContent = computed(() => {
    if (!props.checkInOutReportData || props.checkInOutReportData.length === 0) {
        return 'データがありません。';
    }

    const weekEndDate = new Date(props.dashboardSelectedDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    let report = `📊 ${props.hotelName || 'ホテル'} ${formattedDate.value} のチェックイン・チェックアウトレポート\n\n`;

    if (selectedView.value === '当日') {
        const formattedDashboardDate = formatDate(new Date(props.dashboardSelectedDate));
        const dailyData = props.checkInOutReportData.find(day => formatDate(new Date(day.date)) === formattedDashboardDate);
        if (dailyData) {
            report += `✅ チェックイン: ${dailyData.checkin_room_count || 0}室 (${dailyData.total_checkins || 0}人)\n`;
            const checkinFemale = formatGender(dailyData.female_checkins);
            if (checkinFemale) report += `  インのうち: ${checkinFemale}\n\n`;

            report += `🚪 チェックアウト: ${dailyData.checkout_room_count || 0}室 (${dailyData.total_checkouts || 0}人)\n`;
            const checkoutFemale = formatGender(dailyData.female_checkouts);
            if (checkoutFemale) report += `  アウトのうち: ${checkoutFemale}\n\n`;
        } else {
            report += `当日データがありません。\n\n`;
        }
    } else if (selectedView.value === '週間') {
        const weekStartDate = getMidnight(props.dashboardSelectedDate);
        const weekEndDate = getMidnight(props.dashboardSelectedDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        // Generate all dates in the week range
        const datesInWeek = [];
        let currentDate = new Date(weekStartDate);
        while (currentDate <= weekEndDate) {
            datesInWeek.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // For each date in the week, find the corresponding data or use zeros
        datesInWeek.forEach(date => {
            const dateStr = formatDate(date);
            const dayData = props.checkInOutReportData.find(day => formatDate(new Date(day.date)) === dateStr);
            
            report += `  - ${formatCompactDate(date)}: イン ${dayData?.checkin_room_count || 0}室(${dayData?.total_checkins || 0}人) / アウト ${dayData?.checkout_room_count || 0}室(${dayData?.total_checkouts || 0}人)\n`;
            const checkinFemale = formatGender(dayData?.female_checkins);
            if (checkinFemale) {
                report += `    (インのうち: ${checkinFemale})\n`;
            }
        });
    }

    // Add meal report content
    if (props.mealReportData) {
        report += `\n🍴 食事数\n`;

        if (selectedView.value === '当日') {
            const todayFormatted = formatCompactDate(props.dashboardSelectedDate);
            const mealDataToday = props.mealReportData[formatDate(new Date(props.dashboardSelectedDate))];
            report += `  - ${todayFormatted}: 朝食 ${mealDataToday?.breakfast || 0}食 / 昼食 ${mealDataToday?.lunch || 0}食 / 夕食 ${mealDataToday?.dinner || 0}食\n`;
        } else if (selectedView.value === '週間') {
            // Reuse the same date range logic as above
            const weekStartDate = getMidnight(props.dashboardSelectedDate);
            const weekEndDate = getMidnight(props.dashboardSelectedDate);
            weekEndDate.setDate(weekEndDate.getDate() + 6);

            const datesInWeek = [];
            let currentDate = new Date(weekStartDate);
            while (currentDate <= weekEndDate) {
                datesInWeek.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            datesInWeek.forEach(date => {
                const dateStr = formatDate(date);
                const mealData = props.mealReportData[dateStr];
                report += `  - ${formatCompactDate(date)}: 朝食 ${mealData?.breakfast || 0}食 / 昼食 ${mealData?.lunch || 0}食 / 夕食 ${mealData?.dinner || 0}食\n`;
            });
        }
    }

    return report;
});

const copyReportToClipboard = async () => {
    if (!reportContentForCopy.value || !reportContentForCopy.value.textContent) {
        toast.add({ severity: 'error', summary: 'コピー失敗', detail: 'コピーする内容がありません', life: 3000 });
        return;
    }
    try {
        await navigator.clipboard.writeText(reportContentForCopy.value.textContent);
        toast.add({ severity: 'success', summary: 'コピーしました', detail: 'レポートがクリップボードにコピーされました', life: 3000 });
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast.add({ severity: 'error', summary: 'コピー失敗', detail: 'レポートのコピーに失敗しました', life: 3000 });
    }
};

const displayReportData = computed(() => {
    const data = {
        dailyCheckInOut: [],
        dailyMeal: [],
        weeklyCheckInOut: [],
        weeklyMeal: []
    };

    if (!props.checkInOutReportData || props.checkInOutReportData.length === 0) {
        return data;
    }

    const weekEndDate = new Date(props.dashboardSelectedDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    if (selectedView.value === '当日') {
        const formattedDashboardDate = formatDate(new Date(props.dashboardSelectedDate));
        const dailyData = props.checkInOutReportData.find(day => formatDate(new Date(day.date)) === formattedDashboardDate);
        if (dailyData) {
            data.dailyCheckInOut.push({
                date: formatReportDate(props.dashboardSelectedDate.toISOString()),
                originalDate: props.dashboardSelectedDate,
                checkin: `${dailyData.checkin_room_count || 0}室 (${dailyData.total_checkins || 0}人)`,
                checkout: `${dailyData.checkout_room_count || 0}室 (${dailyData.total_checkouts || 0}人)`,                
                remarks: dailyData.female_checkins > 0 ? `インのうち：${formatGender(dailyData.female_checkins)}` : ''
            });
        }

        if (props.mealReportData) {
            const mealDataToday = props.mealReportData[formatDate(new Date(props.dashboardSelectedDate))];
            data.dailyMeal.push({
                date: formatReportDate(props.dashboardSelectedDate.toISOString()),
                originalDate: props.dashboardSelectedDate,
                breakfast: `${mealDataToday?.breakfast || 0}食`,
                lunch: `${mealDataToday?.lunch || 0}食`,
                dinner: `${mealDataToday?.dinner || 0}食`
            });
        }
    } else if (selectedView.value === '週間') {
        const weekStartDate = getMidnight(props.dashboardSelectedDate);
        const weekEndDate = getMidnight(props.dashboardSelectedDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        // Generate all dates in the week range
        const datesInWeek = [];
        let currentDate = new Date(weekStartDate);
        while (currentDate <= weekEndDate) {
            datesInWeek.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        // For each date in the week, find the corresponding data or use zeros
        datesInWeek.forEach(date => {
            const dateStr = formatDate(date);
            const dayData = props.checkInOutReportData.find(day => formatDate(new Date(day.date)) === dateStr);
            
            data.weeklyCheckInOut.push({
                date: formatReportDate(date.toISOString()),
                originalDate: date,
                checkin: `${dayData?.checkin_room_count || 0}室 (${dayData?.total_checkins || 0}人)`,
                checkout: `${dayData?.checkout_room_count || 0}室 (${dayData?.total_checkouts || 0}人)`,                
                remarks: (dayData?.female_checkins > 0) ? `インのうち：${formatGender(dayData.female_checkins)}` : ''
            });
        });

        if (props.mealReportData) {
            datesInWeek.forEach(date => {
                const dateStr = formatDate(date);
                const mealData = props.mealReportData[dateStr];
                data.weeklyMeal.push({
                    date: formatReportDate(date.toISOString()),
                    originalDate: date,
                    breakfast: `${mealData?.breakfast || 0}食`,
                    lunch: `${mealData?.lunch || 0}食`,
                    dinner: `${mealData?.dinner || 0}食`
                });
            });
        }
    }

    return data;
});
</script>