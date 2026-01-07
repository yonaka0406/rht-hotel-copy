import { ref } from 'vue';
import { useReportStore } from '@/composables/useReportStore';

export function useDashboardCharts() {
    const { fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod } = useReportStore();

    // Bar Chart Data
    const barChartxAxis = ref([]);
    const barChartyAxisMax = ref([]);
    const barChartyAxisBar = ref([0, 0, 0, 0, 0, 0, 0]);
    const barChartyAxisLine = ref([0, 0, 0, 0, 0, 0, 0]);
    const barChartyAxisMale = ref([0, 0, 0, 0, 0, 0, 0]);
    const barChartyAxisFemale = ref([0, 0, 0, 0, 0, 0, 0]);
    const barChartyAxisUnspecified = ref([0, 0, 0, 0, 0, 0, 0]);

    // Stack Chart Data
    const barStackChartData = ref({
        series: [],
        xAxis: []
    });

    // Addon Chart Data
    const barAddonChartData = ref({
        series: [],
        xAxis: []
    });

    // Gauge Chart Data
    const gaugeData = ref([
        {
            value: 0,
            name: '再来月',
            title: {
                offsetCenter: ['0%', '-45%']
            },
            detail: {
                valueAnimation: true,
                offsetCenter: ['0%', '-30%']
            }
        },
        {
            value: 0,
            name: '来月',
            title: {
                offsetCenter: ['0%', '-5%']
            },
            detail: {
                valueAnimation: true,
                offsetCenter: ['0%', '10%']
            }
        },
        {
            value: 0,
            name: '今月',
            title: {
                offsetCenter: ['0%', '35%']
            },
            detail: {
                valueAnimation: true,
                offsetCenter: ['0%', '50%']
            }
        }
    ]);

    const mealReportData = ref(null);
    const chartKey = ref(0);

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

    const formatDateWithDay = (date) => {
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        const parsedDate = new Date(date);
        return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
    };

    const fetchBarChartData = async (selectedHotelId, selectedDate) => {
        const chartStartDate = formatDate(new Date(selectedDate));
        const endDateObjForApi = new Date(selectedDate);
        endDateObjForApi.setDate(endDateObjForApi.getDate() + 6);
        const chartEndDate = formatDate(endDateObjForApi);

        const countData = await fetchCountReservation(selectedHotelId, chartStartDate, chartEndDate);

        const dateArray = [];
        let currentDate = new Date(chartStartDate);
        const endDateObj = new Date(chartEndDate);

        while (currentDate <= endDateObj) {
            dateArray.push(formatDateWithDay(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        barChartxAxis.value = dateArray;
        barChartyAxisBar.value = new Array(dateArray.length).fill(0);
        barChartyAxisLine.value = new Array(dateArray.length).fill(0);
        barChartyAxisMale.value = new Array(dateArray.length).fill(0);
        barChartyAxisFemale.value = new Array(dateArray.length).fill(0);
        barChartyAxisUnspecified.value = new Array(dateArray.length).fill(0);

        if (!countData) {
            barChartyAxisMax.value = 0;
            return;
        }

        barChartyAxisMax.value = countData.length > 0 ? parseInt(countData[0].total_rooms) || 0 : 0;

        countData.forEach(item => {
            const itemDate = formatDateWithDay(new Date(item.date));
            const index = dateArray.indexOf(itemDate);

            if (index !== -1) {
                barChartyAxisBar.value[index] = item.room_count;
                const calculatedPercentage = item.total_rooms_real ? Math.round(item.room_count / item.total_rooms_real * 10000) / 100 : 0;
                barChartyAxisLine.value[index] = calculatedPercentage;
                barChartyAxisMale.value[index] = item.male_count;
                barChartyAxisFemale.value[index] = item.female_count;
                barChartyAxisUnspecified.value[index] = item.unspecified_count;
            }
        });
    };

    const fetchBarStackChartData = async (selectedHotelId, startDate, endDate, selectedDate) => {
        barStackChartData.value = {
            series: [],
            xAxis: []
        };
        barAddonChartData.value = {
            series: [],
            xAxis: []
        };

        const countData = await fetchCountReservationDetails(selectedHotelId, startDate, endDate);

        const dateArray = [];
        let currentFetchedDate = new Date(startDate);
        const endFetchedDateObj = new Date(endDate);

        while (currentFetchedDate <= endFetchedDateObj) {
            dateArray.push(formatDate(currentFetchedDate));
            currentFetchedDate = new Date(currentFetchedDate);
            currentFetchedDate.setDate(currentFetchedDate.getDate() + 1);
        }

        const chartDisplayDateArray = [];
        let currentDisplayDate = new Date(selectedDate);
        const endDisplayDateObj = new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() + 6));

        while (currentDisplayDate <= endDisplayDateObj) {
            chartDisplayDateArray.push(formatDateWithDay(currentDisplayDate));
            currentDisplayDate.setDate(currentDisplayDate.getDate() + 1);
        }

        barStackChartData.value.xAxis = chartDisplayDateArray;
        barAddonChartData.value.xAxis = chartDisplayDateArray;

        if (!countData || Object.keys(countData).length === 0) {
            console.log('No data was found for fetchBarStackChartData');
            chartKey.value++;
            return;
        }

        const planSeries = [];
        const otherAddonSeries = [];
        const mealAddonSeries = [];
        const uniquePlanKeys = new Set();
        const uniqueOtherAddonKeys = new Set();
        const uniqueMealAddonKeys = new Set();

        const mealAddonTypes = ['breakfast', 'lunch', 'dinner'];

        const createSeriesItem = (keyField, stack, countData, dateArray, isMeal = false) => {
            let name = '';
            const dailyValues = new Array(chartDisplayDateArray.length).fill(0);
            const displayOffset = 1;

            dateArray.forEach((dateStr, fetchedIndex) => {
                if (countData[dateStr]) {
                    const items = stack === 'Plan' ? countData[dateStr].plans || [] : countData[dateStr].addons || [];
                    const foundItem = items.find(item => item.key === keyField);
                    if (foundItem) {
                        name = foundItem.name || foundItem.addon_name || name;
                        const value = parseInt(foundItem.quantity) || 0;

                        let targetDisplayIndex = fetchedIndex - displayOffset;

                        if (foundItem.addon_type === 'lunch' || foundItem.addon_type === 'breakfast') {
                            targetDisplayIndex = fetchedIndex + 1 - displayOffset;
                        }

                        if (targetDisplayIndex >= 0 && targetDisplayIndex < chartDisplayDateArray.length) {
                            dailyValues[targetDisplayIndex] = (dailyValues[targetDisplayIndex] || 0) + value;
                        }
                    }
                }
            });

            return {
                name: name,
                type: 'bar',
                stack: isMeal ? 'Meal Count' : stack,
                emphasis: { focus: 'series' },
                data: dailyValues,
            };
        };

        for (const date in countData) {
            if (countData.hasOwnProperty(date)) {
                const item = countData[date];
                if (item.plans) {
                    item.plans.forEach(plan => uniquePlanKeys.add(plan.key));
                }
                if (item.addons) {
                    item.addons.forEach(addon => {
                        if (mealAddonTypes.includes(addon.addon_type)) {
                            uniqueMealAddonKeys.add(addon.key);
                        } else {
                            uniqueOtherAddonKeys.add(addon.key);
                        }
                    });
                }
            }
        }

        Array.from(uniquePlanKeys).sort().forEach(key => {
            planSeries.push(createSeriesItem(key, 'Plan', countData, dateArray));
        });

        Array.from(uniqueOtherAddonKeys).sort().forEach(key => {
            otherAddonSeries.push(createSeriesItem(key, 'Addon', countData, dateArray));
        });

        Array.from(uniqueMealAddonKeys).sort().forEach(key => {
            mealAddonSeries.push(createSeriesItem(key, 'Addon', countData, dateArray, true));
        });

        barStackChartData.value.series = planSeries;
        barAddonChartData.value.series = [...otherAddonSeries, ...mealAddonSeries];

        // Process meal data for the report dialog
        const processedMealData = {};
        for (const dateStr in countData) {
            if (countData.hasOwnProperty(dateStr)) {
                const item = countData[dateStr];
                if (item.addons) {
                    item.addons.forEach(addon => {
                        if (mealAddonTypes.includes(addon.addon_type)) {
                            let effectiveDate = new Date(dateStr);
                            if (addon.addon_type === 'lunch' || addon.addon_type === 'breakfast') {
                                effectiveDate.setDate(effectiveDate.getDate() + 1);
                            }
                            const formattedEffectiveDate = formatDate(effectiveDate);

                            if (!processedMealData[formattedEffectiveDate]) {
                                processedMealData[formattedEffectiveDate] = {
                                    breakfast: 0,
                                    lunch: 0,
                                    dinner: 0,
                                };
                            }
                            processedMealData[formattedEffectiveDate][addon.addon_type] += parseInt(addon.quantity) || 0;
                        }
                    });
                }
            }
        }
        mealReportData.value = processedMealData;
    };

    const fetchGaugeChartData = async (selectedHotelId, startDate) => {
        const month_0 = await fetchOccupationByPeriod('month_0', selectedHotelId, startDate);
        const month_1 = await fetchOccupationByPeriod('month_1', selectedHotelId, startDate);
        const month_2 = await fetchOccupationByPeriod('month_2', selectedHotelId, startDate);

        if (month_0) {
            const gaugeValue_0 = month_0[0].available_rooms === 0 ? 0 : Math.round(month_0[0].room_count / month_0[0].available_rooms * 10000) / 100;
            gaugeData.value[2].value = gaugeValue_0;
        } else {
            gaugeData.value[2].value = 0;
        }
        if (month_1) {
            const gaugeValue_1 = month_1[0].available_rooms === 0 ? 0 : Math.round(month_1[0].room_count / month_1[0].available_rooms * 10000) / 100;
            gaugeData.value[1].value = gaugeValue_1;
        } else {
            gaugeData.value[1].value = 0;
        }
        if (month_2) {
            const gaugeValue_2 = month_2[0].available_rooms === 0 ? 0 : Math.round(month_2[0].room_count / month_2[0].available_rooms * 10000) / 100;
            gaugeData.value[0].value = gaugeValue_2;
        } else {
            gaugeData.value[0].value = 0;
        }

        const currentMonth = new Date(startDate).getMonth() + 1;
        const gaugeName_0 = currentMonth;
        const gaugeName_1 = currentMonth % 12 + 1;
        const gaugeName_2 = (currentMonth + 1) % 12 + 1;

        gaugeData.value[0].name = gaugeName_2 + '月';
        gaugeData.value[1].name = gaugeName_1 + '月';
        gaugeData.value[2].name = gaugeName_0 + '月';
    };

    return {
        // Data
        barChartxAxis,
        barChartyAxisMax,
        barChartyAxisBar,
        barChartyAxisLine,
        barChartyAxisMale,
        barChartyAxisFemale,
        barChartyAxisUnspecified,
        barStackChartData,
        barAddonChartData,
        gaugeData,
        mealReportData,
        chartKey,
        // Methods
        fetchBarChartData,
        fetchBarStackChartData,
        fetchGaugeChartData,
        formatDate
    };
}
