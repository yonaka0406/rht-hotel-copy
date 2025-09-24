<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal header="ダッシュボードデータ"
        :style="{ width: '50vw' }">
        <div class="flex flex-col justify-center items-center text-center w-full">
            <div class="relative flex items-center w-full max-w-xs">
                <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="name" optionValue="value"
                    aria-labelledby="basic" class="justify-center mx-auto" />
                <Button class="absolute right-0 p-button-text p-button-lg" @click="copyDateToClipboard">
                    <span class="pi pi-copy"></span>
                    <span>コピー</span>
                </Button>
            </div>
            <p class="mt-4 text-lg font-bold">{{ formattedDate }}</p>
            <div class="mt-4 text-left w-full p-2">
                <pre class="whitespace-pre-wrap">{{ reportContent }}</pre>
            </div>
        </div>
    </Dialog>

</template>

<script setup>
import { ref, computed, defineProps, defineEmits } from 'vue';
import { Dialog, SelectButton, Button } from 'primevue';
import { useToast } from "primevue/usetoast";

const toast = useToast();

const props = defineProps({
    visible: Boolean,
    dashboardSelectedDate: Date,
    checkInOutReportData: Array,
    hotelName: String, // New prop for hotel name
    mealReportData: Object // New prop for meal report data
});

const emits = defineEmits(['update:visible']);

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

const copyDateToClipboard = async () => {
    try {
        await navigator.clipboard.writeText(reportContent.value);
        toast.add({ severity: 'success', summary: 'コピーしました', detail: '日付がクリップボードにコピーされました', life: 3000 });
    } catch (err) {
        console.error('Failed to copy: ', err);
        toast.add({ severity: 'error', summary: 'コピー失敗', detail: '日付のコピーに失敗しました', life: 3000 });
    }
};

const reportContent = computed(() => {
    if (!props.checkInOutReportData || props.checkInOutReportData.length === 0) {
        return 'データがありません。';
    }

    const weekStartDate = new Date(props.dashboardSelectedDate);
    const weekEndDate = new Date(props.dashboardSelectedDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const filteredMealReportData = computed(() => {
        if (!props.mealReportData) return {};
        const filteredData = {};
        for (const dateStr in props.mealReportData) {
            if (props.mealReportData.hasOwnProperty(dateStr)) {
                const mealDate = new Date(dateStr);
                if (mealDate >= weekStartDate && mealDate <= weekEndDate) {
                    filteredData[dateStr] = props.mealReportData[dateStr];
                }
            }
        }
        return filteredData;
    });

    const formatGender = (male, female, unspecified) => {
        let genderStr = '';
        if (male > 0) genderStr += `${male}♂️ `;
        if (female > 0) genderStr += `${female}♀️ `;
        if (unspecified > 0) genderStr += `${unspecified}❓`;
        return genderStr.trim();
    };

    const formatReportDate = (dateString) => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return '無効な日付'; // Localized invalid date
        }
        const options = { month: 'numeric', day: 'numeric', weekday: 'short' };
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
        const dailyData = props.checkInOutReportData[0]; // Assuming single day data for '当日'
        if (dailyData) {
            report += `✅ チェックイン: ${dailyData.checkin_room_count || 0}室 (${dailyData.total_checkins || 0}人)\n`;
            const checkinGender = formatGender(dailyData.male_checkins, dailyData.female_checkins, dailyData.unspecified_checkins);
            if (checkinGender) report += `  👥 性別: ${checkinGender}\n\n`;

            report += `🚪 チェックアウト: ${dailyData.checkout_room_count || 0}室 (${dailyData.total_checkouts || 0}人)\n`;
            const checkoutGender = formatGender(dailyData.male_checkouts, dailyData.female_checkouts, dailyData.unspecified_checkouts);
            if (checkoutGender) report += `  👥 性別: ${checkoutGender}\n\n`;
        } else {
            report += `当日データがありません。\n\n`;
        }
    } else if (selectedView.value === '週間') {
        report += `📅 日別内訳\n`;
        props.checkInOutReportData.forEach(day => {
            report += `  - ${formatReportDate(day.date)}:    イン ${String(day.checkin_room_count || 0).padStart(2, '0')}室 (${String(day.total_checkins || 0).padStart(2, '0')}人);    アウト ${String(day.checkout_room_count || 0).padStart(2, '0')}室 (${String(day.total_checkouts || 0).padStart(2, '0')}人)\n`;
            const checkinGender = formatGender(day.male_checkins, day.female_checkins, day.unspecified_checkins);
            if (checkinGender) {
                report += `    性別: ${checkinGender}\n`;
            }
        });
    }

    // Add meal report content
    if (props.mealReportData) {
        report += `\n🍽️ 食事数\n`;

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
            const totalMealsToday = (mealDataToday?.breakfast || 0) + (mealDataToday?.lunch || 0) + (mealDataToday?.dinner || 0);
            report += `  - ${todayFormatted}:    合計 ${String(totalMealsToday).padStart(2, '0')}食    朝食 ${String(mealDataToday?.breakfast || 0).padStart(2, '0')}食    昼食 ${String(mealDataToday?.lunch || 0).padStart(2, '0')}食    夕食 ${String(mealDataToday?.dinner || 0).padStart(2, '0')}食\n`;
        } else if (selectedView.value === '週間') {
            datesInWeek.forEach(dateStr => {
                const mealData = props.mealReportData[dateStr];
                const totalMeals = (mealData?.breakfast || 0) + (mealData?.lunch || 0) + (mealData?.dinner || 0);
                report += `  - ${formatReportDate(dateStr)}:    合計 ${String(totalMeals).padStart(2, '0')}食    朝食 ${String(mealData?.breakfast || 0).padStart(2, '0')}食    昼食 ${String(mealData?.lunch || 0).padStart(2, '0')}食    夕食 ${String(mealData?.dinner || 0).padStart(2, '0')}食\n`;
            });
        }
    }

    return report;
});
</script>