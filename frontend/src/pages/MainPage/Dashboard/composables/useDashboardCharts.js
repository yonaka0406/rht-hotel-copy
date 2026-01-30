import { ref } from 'vue';
import { useReportStore } from '@/composables/useReportStore';

export function useDashboardCharts() {
    const { fetchCountReservation, fetchCountReservationDetails, fetchOccupationByPeriod, fetchForecastData, fetchAccountingData } = useReportStore();

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
            throw new Error(`The provided input is not a valid Date object: ${date}`);
        }
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    const formatDateWithDay = (date) => {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
            console.error("Invalid Date object in formatDateWithDay:", date);
            return '';
        }
        const options = { weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit' };
        return `${parsedDate.toLocaleDateString('ja-JP', options)}`;
    };

    const fetchBarChartData = async (selectedHotelId, selectedDate) => {
        const chartStartDate = formatDate(new Date(selectedDate));
        const endDateObjForApi = new Date(selectedDate);
        endDateObjForApi.setDate(endDateObjForApi.getDate() + 6);
        const chartEndDate = formatDate(endDateObjForApi);

        // Fetch PMS, Forecast, and Accounting data
        const [countData, forecastData, accountingData] = await Promise.all([
            fetchCountReservation(selectedHotelId, chartStartDate, chartEndDate),
            fetchForecastData(selectedHotelId, chartStartDate, chartEndDate),
            fetchAccountingData(selectedHotelId, chartStartDate, chartEndDate)
        ]);

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

        // Determine Max Value based on available capacity (Forecast > Accounting > PMS) for scaling
        let maxAvailable = 0;

        countData.forEach(item => {
            const rawDate = new Date(item.date);
            const dateStr = formatDate(rawDate);
            const itemDate = formatDateWithDay(rawDate);
            const index = dateArray.indexOf(itemDate);

            if (index !== -1) {
                // Find matching forecast and accounting data
                const fcItem = forecastData.find(f => {
                    // forecastData uses 'forecast_month' or 'date' depending on endpoint, usually 'date' if normalized or 'forecast_month'
                    // The fetchForecastData in store returns raw data. Standardize on date comparison.
                    // Assuming fetchForecastData returns entries with a date-like field.
                    // Looking at other components, it might have 'forecast_month' or 'date'.
                    // Use format check.
                    const d = f.date || f.forecast_month;
                    return d && formatDate(new Date(d)) === dateStr;
                });

                const accItem = accountingData.find(a => {
                    const d = a.date || a.accounting_month;
                    return d && formatDate(new Date(d)) === dateStr;
                });

                // Prioritized Capacity Logic
                const pmsCapacity = parseInt(item.total_rooms_real) || 0;
                const fcCapacity = fcItem ? (parseInt(fcItem.available_room_nights) || 0) : 0;
                const accCapacity = accItem ? (parseInt(accItem.available_room_nights) || 0) : 0;

                let effectiveCapacity = pmsCapacity;
                if (fcCapacity > 0) {
                    effectiveCapacity = fcCapacity;
                } else if (accCapacity > 0) {
                    effectiveCapacity = accCapacity;
                }

                // Update Max for Chart Scaling
                if (effectiveCapacity > maxAvailable) maxAvailable = effectiveCapacity;

                barChartyAxisBar.value[index] = item.room_count;

                // Calculate OCC % using effective capacity
                const calculatedPercentage = effectiveCapacity > 0 ? Math.round(item.room_count / effectiveCapacity * 10000) / 100 : 0;

                barChartyAxisLine.value[index] = calculatedPercentage;
                barChartyAxisMale.value[index] = item.male_count;
                barChartyAxisFemale.value[index] = item.female_count;
                barChartyAxisUnspecified.value[index] = item.unspecified_count;
            }
        });

        // Use the maximum capacity found as the max value for Y-axis, or at least the max room count
        barChartyAxisMax.value = maxAvailable > 0 ? maxAvailable : 0;
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
            if (Object.prototype.hasOwnProperty.call(countData, date)) {
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
            if (Object.prototype.hasOwnProperty.call(countData, dateStr)) {
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
        // Fetch base occupation data (PMS)
        const [month_0, month_1, month_2] = await Promise.all([
            fetchOccupationByPeriod('month_0', selectedHotelId, startDate),
            fetchOccupationByPeriod('month_1', selectedHotelId, startDate),
            fetchOccupationByPeriod('month_2', selectedHotelId, startDate)
        ]);

        // Calculate end date for 3 months range to fetch Forecast/Accounting
        const start = new Date(startDate);
        const end = new Date(startDate);
        end.setMonth(end.getMonth() + 3); // Approx 3 months out
        const forecastStartDate = formatDate(start);
        const forecastEndDate = formatDate(end);

        // Fetch Forecast and Accounting for the entire period
        const [forecastData, accountingData] = await Promise.all([
            fetchForecastData(selectedHotelId, forecastStartDate, forecastEndDate),
            fetchAccountingData(selectedHotelId, forecastStartDate, forecastEndDate)
        ]);

        // Helper to sum capacity and sold rooms for a specific month
        const getMonthlySummary = (targetDate, rawData) => {
            // targetDate is a Date object. rawData contains monthly entries.
            // We need to sum up available_room_nights and rooms_sold_nights for entries falling in the same month/year as targetDate
            const targetMonth = targetDate.getMonth();
            const targetYear = targetDate.getFullYear();

            let totalCapacity = 0;
            let totalSoldRooms = 0;
            rawData.forEach(item => {
                const d = new Date(item.date || item.forecast_month || item.accounting_month);
                if (d.getMonth() === targetMonth && d.getFullYear() === targetYear) {
                    totalCapacity += (parseInt(item.available_room_nights) || 0);
                    totalSoldRooms += (parseInt(item.rooms_sold_nights) || 0);
                }
            });
            return { capacity: totalCapacity, soldRooms: totalSoldRooms };
        };

        const updateGaugeValue = (gaugeIndex, monthData, offsetMonths) => {
            if (monthData && monthData.length > 0) {
                const pmsRooms = monthData[0].room_count;
                const pmsCapacity = monthData[0].available_rooms;

                // Determine effective capacity and sold rooms
                const targetDate = new Date(startDate);
                targetDate.setMonth(targetDate.getMonth() + offsetMonths);

                const fcSummary = getMonthlySummary(targetDate, forecastData);
                const accSummary = getMonthlySummary(targetDate, accountingData);

                // Prioritize capacity: Forecast > Accounting > PMS
                let effectiveCapacity = pmsCapacity;
                if (fcSummary.capacity > 0) {
                    effectiveCapacity = fcSummary.capacity;
                } else if (accSummary.capacity > 0) {
                    effectiveCapacity = accSummary.capacity;
                }

                // Fallback numerator: If PMS shows 0 sold rooms, use Accounting data
                let effectiveSoldRooms = pmsRooms;
                if (pmsRooms === 0 && accSummary.soldRooms > 0) {
                    effectiveSoldRooms = accSummary.soldRooms;
                }

                const gaugeValue = effectiveCapacity === 0 ? 0 : Math.round(effectiveSoldRooms / effectiveCapacity * 10000) / 100;
                gaugeData.value[gaugeIndex].value = gaugeValue;
            } else {
                gaugeData.value[gaugeIndex].value = 0;
            }
        };

        // Month 0 (Next Month + 2) -> Index 0 in logic? No, look at original code:
        // month_2 -> gaugeData[0]
        // month_1 -> gaugeData[1]
        // month_0 -> gaugeData[2]
        // And month_0 is "months from now = 0" i.e. current month?
        // Original: const currentMonth = new Date(startDate).getMonth() + 1; gaugeName_2 (index 0) = (currentMonth+1)%12+1...
        // Let's trace naming:
        // gaugeData[2].name = gaugeName_0 + '月' (Current Month)
        // gaugeData[1].name = gaugeName_1 + '月' (Next Month)
        // gaugeData[0].name = gaugeName_2 + '月' (Next Next Month)

        // So:
        // Index 2 = Current Month (offset 0)
        // Index 1 = Next Month (offset 1)
        // Index 0 = Next Next Month (offset 2)

        updateGaugeValue(2, month_0, 0);
        updateGaugeValue(1, month_1, 1);
        updateGaugeValue(0, month_2, 2);

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
