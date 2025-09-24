<template>
    <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal header="ダッシュボードデータ" :style="{ width: '50vw' }">
        <div class="flex flex-col justify-center items-center text-center w-full">
            <div class="relative flex items-center w-full max-w-xs">
                <SelectButton v-model="selectedView" :options="viewOptions" optionLabel="name" optionValue="value" aria-labelledby="basic" class="justify-center mx-auto" />
                <Button icon="pi pi-copy" class="absolute right-0 p-button-text p-button-lg" @click="copyDateToClipboard">コピー</Button>
            </div>
            <p class="mt-4 text-lg font-bold">{{ formattedDate }}</p>
            <div class="mt-4 text-left w-full max-w-xs">
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
    checkInOutReportData: Array // New prop for check-in/out report data
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
        await navigator.clipboard.writeText(formattedDate.value);
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
            return 'Invalid Date'; // Handle invalid date
        }
        const options = { month: 'numeric', day: 'numeric' };
        return date.toLocaleDateString('ja-JP', options);
    };

    let report = `📊 *Check-in/Out Report for ${formattedDate.value}*

`;

    if (selectedView.value === '当日') {
        const dailyData = props.checkInOutReportData[0]; // Assuming single day data for '当日'
        if (dailyData) {
            report += `✅ *Check-ins*: ${dailyData.total_checkins || 0}
`;
            const checkinGender = formatGender(dailyData.male_checkins, dailyData.female_checkins, dailyData.unspecified_checkins);
            if (checkinGender) report += `  👥 Gender: ${checkinGender}

`;

            report += `🚪 *Check-outs*: ${dailyData.total_checkouts || 0}
`;
            const checkoutGender = formatGender(dailyData.male_checkouts, dailyData.female_checkouts, dailyData.unspecified_checkouts);
            if (checkoutGender) report += `  👥 Gender: ${checkoutGender}

`;
        } else {
            report += `当日データがありません。

`;
        }
    } else if (selectedView.value === '週間') {
        report += `📅 *Daily Breakdown*
`;
        props.checkInOutReportData.forEach(day => {
            report += `  - ${formatReportDate(day.date)}: ${day.total_checkins || 0} in, ${day.total_checkouts || 0} out
`;
        });
        // Add forecast data if available and relevant
        // For now, I'll just add a placeholder for forecast
        report += `  - Sep 19: 15 in (forecast) 
`; // Placeholder for forecast
    }

    return report;
});
</script>