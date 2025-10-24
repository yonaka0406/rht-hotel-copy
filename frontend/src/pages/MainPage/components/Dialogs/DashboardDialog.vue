<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal header="ダッシュボードデータ"
        :style="{ width: '60vw' }">
        <div class="flex flex-col justify-center items-center text-center w-full">
            <div class="relative flex items-center justify-center w-full">
                <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="name" optionValue="value"
                    aria-labelledby="basic" class="" />
                <Button class="absolute right-0 p-button-text p-button-lg" @click="copyReportToClipboard">
                    <span class="pi pi-copy"></span>
                    <span>レポートをコピー</span>
                </Button>
            </div>
            <p class="mt-4 text-lg font-bold">{{ hotelName }} {{ formattedDate }}</p>
            <div class="mt-4 text-left w-full p-2">
                <div class="hidden" ref="reportContentForCopy"><pre class="whitespace-pre-wrap">{{ plainTextReportContent }}</pre></div>
                <div v-if="selectedView === '当日'">
                    <h3 class="text-lg font-bold mb-2">チェックイン・チェックアウト</h3>
                    <DataTable :value="displayReportData.dailyCheckInOut" class="mb-4" size="small">
                        <Column field="date" header="日付"></Column>
                        <Column field="checkin" header="イン"></Column>
                        <Column field="checkout" header="アウト"></Column>
                        <Column field="remarks" header="備考"></Column>
                    </DataTable>

                    <h3 class="text-lg font-bold mb-2">食事数</h3>
                    <DataTable :value="displayReportData.dailyMeal" size="small">
                        <Column field="date" header="日付"></Column>
                        <Column field="breakfast" header="朝食"></Column>
                        <Column field="lunch" header="昼食"></Column>
                        <Column field="dinner" header="夕食"></Column>
                    </DataTable>
                </div>

                <div v-else-if="selectedView === '週間'">
                    <h3 class="text-lg font-bold mb-2">日別内訳</h3>
                    <DataTable :value="displayReportData.weeklyCheckInOut" class="mb-4" size="small">
                        <Column field="date" header="日付"></Column>
                        <Column field="checkin" header="イン"></Column>
                        <Column field="checkout" header="アウト"></Column>
                        <Column field="remarks" header="備考"></Column>
                    </DataTable>

                    <h3 class="text-lg font-bold mb-2">食事数</h3>
                    <DataTable :value="displayReportData.weeklyMeal" size="small">
                        <Column field="date" header="日付"></Column>
                        <Column field="breakfast" header="朝食"></Column>
                        <Column field="lunch" header="昼食"></Column>
                        <Column field="dinner" header="夕食"></Column>
                    </DataTable>
                </div>
            </div>
        </div>
    </Dialog>

</template>

<script setup>
import { ref, computed, defineProps, defineEmits, onMounted } from 'vue';
import { Dialog, SelectButton, Button, DataTable, Column } from 'primevue';
import { useToast } from "primevue/usetoast";

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

const plainTextReportContent = computed(() => {
    if (!props.checkInOutReportData || props.checkInOutReportData.length === 0) {
        return 'データがありません。';
    }

    const weekStartDate = new Date(props.dashboardSelectedDate);
    const weekEndDate = new Date(props.dashboardSelectedDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

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
            throw new Error("The provided input is not a valid Date object:");
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

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
            if (checkoutFemale) report += `  インのうち: ${checkoutFemale}\n\n`;
        } else {
            report += `当日データがありません。\n\n`;
        }
    } else if (selectedView.value === '週間') {
        const weekStartDate = getMidnight(props.dashboardSelectedDate);
        const weekEndDate = getMidnight(props.dashboardSelectedDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const filteredWeeklyData = props.checkInOutReportData.filter(day => {
            const dayDate = getMidnight(day.date);
            return dayDate >= weekStartDate && dayDate <= weekEndDate;
        });

        filteredWeeklyData.forEach(day => {
            report += `  - ${formatReportDate(day.date)}:    イン ${String(day.checkin_room_count || 0).padStart(2, '0')}室 (${String(day.total_checkins || 0).padStart(2, '0')}人);    アウト ${String(day.checkout_room_count || 0).padStart(2, '0')}室 (${String(day.total_checkouts || 0).padStart(2, '0')}人)\n`;
            const checkinFemale = formatGender(day.female_checkins);
            if (checkinFemale) {
                report += `    インのうち: ${checkinFemale}\n`;
            }
        });
    }

    // Add meal report content
    if (props.mealReportData) {
        report += `\n🍴 食事数\n`;

        const weekStartDate = new Date(props.dashboardSelectedDate);
        const weekEndDate = new Date(props.dashboardSelectedDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const datesInWeek = [];
        let currentDate = new Date(weekStartDate);
        while (currentDate <= weekEndDate) {
            datesInWeek.push(formatDate(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        if (selectedView.value === '当日') {
            const todayFormatted = formatReportDate(props.dashboardSelectedDate.toISOString());
            const mealDataToday = props.mealReportData[formatDate(new Date(props.dashboardSelectedDate))];
            report += `  - ${todayFormatted}:    朝食 ${String(mealDataToday?.breakfast || 0).padStart(2, '0')}食    昼食 ${String(mealDataToday?.lunch || 0).padStart(2, '0')}食    夕食 ${String(mealDataToday?.dinner || 0).padStart(2, '0')}食\n`;
        } else if (selectedView.value === '週間') {
            datesInWeek.forEach(dateStr => {
                const mealData = props.mealReportData[dateStr];
                report += `  - ${formatReportDate(dateStr)}:    朝食 ${String(mealData?.breakfast || 0).padStart(2, '0')}食    昼食 ${String(mealData?.lunch || 0).padStart(2, '0')}食    夕食 ${String(mealData?.dinner || 0).padStart(2, '0')}食\n`;
            });
        }
    }

    return report;
});

const copyReportToClipboard = async () => {
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

    const weekStartDate = new Date(props.dashboardSelectedDate);
    const weekEndDate = new Date(props.dashboardSelectedDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const formatGender = (female) => {
        return female > 0 ? `${female}♀️ ` : '';
    };

    const formatReportDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '無効な日付';
        }
        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        const formatted = date.toLocaleDateString('ja-JP', options);
        return formatted;
    };

    const formatDate = (date) => {
        if (!(date instanceof Date) || isNaN(date.getTime())) {
            console.error("Invalid Date object:", date);
            throw new Error("The provided input is not a valid Date object:");
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    if (selectedView.value === '当日') {
        const formattedDashboardDate = formatDate(new Date(props.dashboardSelectedDate));
        const dailyData = props.checkInOutReportData.find(day => formatDate(new Date(day.date)) === formattedDashboardDate);
        if (dailyData) {
            data.dailyCheckInOut.push({
                date: formatReportDate(props.dashboardSelectedDate.toISOString()),
                checkin: `${dailyData.checkin_room_count || 0}室 (${dailyData.total_checkins || 0}人)`,
                checkout: `${dailyData.checkout_room_count || 0}室 (${dailyData.total_checkouts || 0}人)`,                
                remarks: dailyData.female_checkins > 0 ? `インのうち：${formatGender(dailyData.female_checkins)}` : ''
            });
        }

        if (props.mealReportData) {
            const mealDataToday = props.mealReportData[formatDate(new Date(props.dashboardSelectedDate))];
            data.dailyMeal.push({
                date: formatReportDate(props.dashboardSelectedDate.toISOString()),
                breakfast: `${mealDataToday?.breakfast || 0}食`,
                lunch: `${mealDataToday?.lunch || 0}食`,
                dinner: `${mealDataToday?.dinner || 0}食`
            });
        }
    } else if (selectedView.value === '週間') {
        const weekStartDate = getMidnight(props.dashboardSelectedDate);
        const weekEndDate = getMidnight(props.dashboardSelectedDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const filteredWeeklyData = props.checkInOutReportData.filter(day => {
            const dayDate = getMidnight(day.date);
            return dayDate >= weekStartDate && dayDate <= weekEndDate;
        });

        filteredWeeklyData.forEach(day => {
            data.weeklyCheckInOut.push({
                date: formatReportDate(day.date),
                checkin: `${day.checkin_room_count || 0}室 (${day.total_checkins || 0}人)`,
                checkout: `${day.checkout_room_count || 0}室 (${day.total_checkouts || 0}人)`,                
                remarks: day.female_checkins > 0 ? `インのうち：${formatGender(day.female_checkins)}` : ''
            });
        });

        if (props.mealReportData) {
            const datesInWeek = [];
            let currentDate = new Date(weekStartDate);
            while (currentDate <= weekEndDate) {
                datesInWeek.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            datesInWeek.forEach(dateStr => {
                const mealData = props.mealReportData[dateStr];
                data.weeklyMeal.push({
                    date: formatReportDate(dateStr),
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