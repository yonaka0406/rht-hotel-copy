import { computed } from 'vue';
import { formatDateToYMD } from '@/utils/dateUtils';

/**
 * Composable for aggregating sales and occupancy data for various reporting views.
 * @param {Object} state - The reactive state and props required for calculations.
 */
export function useSalesOccDataAggr({
    selectedDate,
    period,
    selectedHotels,
    allHotels,
    pmsTotalData,
    forecastTotalData,
    accountingTotalData,
    prevYearPmsTotalData,
    prevYearAccountingTotalData,
    pmsFallbackCapacities
}) {
    // --- Helper Functions ---
    const getFirstDayOfMonth = (date) => {
        if (!date) return null;
        return new Date(date.getFullYear(), date.getMonth(), 1);
    };

    const getLastDayOfMonth = (date) => {
        if (!date) return null;
        return new Date(date.getFullYear(), date.getMonth() + 1, 0);
    };

    const getFirstDayOfYear = (date) => {
        if (!date) return null;
        return new Date(date.getFullYear(), 0, 1);
    };

    const getLastDayOfYear = (date) => {
        if (!date) return null;
        return new Date(date.getFullYear(), 11, 31);
    };

    function formatDateMonth(date) {
        if (!date) return null;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    const normalizeDate = (date) => {
        if (!date) return null;
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    function getDaysInMonth(year, month) {
        if (typeof year !== 'number' || typeof month !== 'number') return 0;
        return new Date(year, month, 0).getDate();
    }

    const searchAllHotels = (hotelId) => {
        if (!allHotels.value || allHotels.value.length === 0) {
            return [];
        }
        if (hotelId === 0) {
            return [{ id: 0, name: '施設合計' }];
        }
        const foundHotel = allHotels.value.find(hotel => String(hotel.id) === String(hotelId));
        if (foundHotel) {
            return [foundHotel];
        }
        return [];
    };

    // --- Basic Date ranges ---
    const firstDayofFetch = computed(() => {
        if (!selectedDate.value) return null;
        return period.value === 'year'
            ? getFirstDayOfYear(selectedDate.value)
            : getFirstDayOfMonth(selectedDate.value);
    });

    const lastDayofFetch = computed(() => {
        if (!selectedDate.value) return null;
        return period.value === 'year'
            ? getLastDayOfYear(selectedDate.value)
            : getLastDayOfMonth(selectedDate.value);
    });

    const selectedView = computed(() => {
        let viewName = '';
        if (selectedDate.value && typeof selectedDate.value.getMonth === 'function' && selectedDate.value.getMonth() === 0) {
            viewName = 'singleMonth';
        } else {
            if (period.value === 'month') {
                viewName += 'singleMonth';
            } else if (period.value === 'year') {
                viewName += 'yearCumulative';
            } else {
                viewName += 'singleMonth';
            }
        }

        const isAllFacilitiesSelected = selectedHotels.value.length === 1 && selectedHotels.value[0] === 0;

        if (isAllFacilitiesSelected || selectedHotels.value.length > 1) {
            viewName += 'AllHotels';
        } else if (selectedHotels.value.length === 1) {
            viewName += 'Hotel';
        } else {
            if (viewName === '') return null;
        }
        return viewName;
    });

    const hotelSortOrderMap = computed(() => {
        const map = new Map();
        if (allHotels.value) {
            allHotels.value.forEach(h => {
                map.set(Number(h.id), (h.sort_order !== null && h.sort_order !== undefined) ? h.sort_order : 999);
            });
        }
        map.set(0, -1); // 施設合計 always first
        return map;
    });

    // --- Revenue Data Aggregation ---
    const prevYearRevenueData = computed(() => {
        if (!selectedView.value) return [];

        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0) {
            return result;
        }

        const hotelIdLookup = new Map();
        selectedHotels.value.forEach(hotelId => {
            hotelIdLookup.set(String(hotelId), hotelId);
        });

        const monthlyAggregates = {};
        const monthlyTotalAggregates = {};

        let currentIterMonth = new Date(firstDayofFetch.value);
        currentIterMonth.setFullYear(currentIterMonth.getFullYear() - 1);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        lastIterMonthDate.setFullYear(lastIterMonthDate.getFullYear() - 1);

        while (currentIterMonth <= lastIterMonthDate) {
            const monthKey = formatDateMonth(normalizeDate(currentIterMonth));
            monthlyAggregates[monthKey] = {};
            monthlyTotalAggregates[monthKey] = {
                period_revenue: 0,
                accommodation_revenue: 0,
                other_revenue: 0,
                pms_revenue: 0
            };
            selectedHotels.value.forEach(hotelId => {
                monthlyAggregates[monthKey][String(hotelId)] = { pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null, forecast_revenue: null, acc_revenue: null };
            });
            currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
        }

        const aggregateDataSource = (sourceDataByHotel, revenueKey) => {
            for (const stringHotelIdKey in sourceDataByHotel) {
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date && typeof record.revenue === 'number') {
                            const monthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[monthKey] && monthlyAggregates[monthKey][stringHotelIdKey]) {
                                if (monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] === null) monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] = 0;
                                monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] += record.revenue;
                            }
                        }
                    });
                }
            }
        };

        const aggregatePmsDataSource = (sourceDataByHotel) => {
            for (const stringHotelIdKey in sourceDataByHotel) {
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach((record) => {
                        if (record && record.date) {
                            const monthKey = formatDateMonth(new Date(record.date));

                            if (monthlyAggregates[monthKey]) {
                                if (monthlyAggregates[monthKey][stringHotelIdKey]) {
                                    if (typeof record.revenue === 'number') {
                                        if (monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue === null) monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue = 0;
                                        monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                    }
                                    if (typeof record.accommodation_revenue === 'number') {
                                        if (monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue === null) monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue = 0;
                                        monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                    }
                                    if (typeof record.other_revenue === 'number') {
                                        if (monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue === null) monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue = 0;
                                        monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                    }
                                }
                            }
                        }
                    });
                }
            }
        };

        aggregatePmsDataSource(prevYearPmsTotalData.value);
        aggregateDataSource(prevYearAccountingTotalData.value, 'acc_revenue');

        Object.keys(monthlyAggregates).sort().forEach(monthKey => {
            const monthData = monthlyAggregates[monthKey];

            for (const hotelIdStringKey in monthData) {
                const outputHotelId = hotelIdLookup.get(hotelIdStringKey);
                const aggregatedMonthData = monthData[hotelIdStringKey];
                const pmsRev = aggregatedMonthData.pms_revenue;
                const pmsAccommodationRev = aggregatedMonthData.pms_accommodation_revenue;
                const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                let otherRev = (pmsOtherRev || 0);
                let accommodationRev = (accRev !== null && accRev > 0) ? accRev : (pmsAccommodationRev || 0);
                let periodRev = accommodationRev + otherRev;

                monthlyTotalAggregates[monthKey].period_revenue += periodRev;
                monthlyTotalAggregates[monthKey].accommodation_revenue += accommodationRev;
                monthlyTotalAggregates[monthKey].other_revenue += otherRev;
                monthlyTotalAggregates[monthKey].pms_revenue += (pmsRev || 0);

                const [y, m] = monthKey.split('-');
                const currentYearMonth = `${parseInt(y) + 1}-${m}`;

                result.push({
                    month: monthKey,
                    current_year_month: currentYearMonth,
                    hotel_id: outputHotelId,
                    hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.value.get(outputHotelId) ?? 999,
                    pms_revenue: pmsRev,
                    acc_revenue: accRev,
                    period_revenue: periodRev,
                    accommodation_revenue: accommodationRev,
                    other_revenue: otherRev,
                });
            }

            const totals = monthlyTotalAggregates[monthKey];
            const [y, m] = monthKey.split('-');
            const currentYearMonth = `${parseInt(y) + 1}-${m}`;
            result.push({
                month: monthKey,
                current_year_month: currentYearMonth,
                hotel_id: 0,
                hotel_name: '施設合計',
                sort_order: -1,
                pms_revenue: totals.pms_revenue,
                acc_revenue: null,
                period_revenue: totals.period_revenue,
                accommodation_revenue: totals.accommodation_revenue,
                other_revenue: totals.other_revenue,
            });
        });

        result.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        if (selectedView.value?.endsWith('Hotel')) {
            return result.filter(item => item.hotel_id !== 0);
        }
        return result;
    });

    const revenueData = computed(() => {
        if (!selectedView.value) return [];

        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0) {
            return result;
        }
        const hotelIdLookup = new Map();
        selectedHotels.value.forEach(hotelId => {
            hotelIdLookup.set(String(hotelId), hotelId);
        });

        const monthlyAggregates = {};
        const monthlyTotalAggregates = {};

        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        while (currentIterMonth <= lastIterMonthDate) {
            const monthKey = formatDateMonth(normalizeDate(currentIterMonth));
            monthlyAggregates[monthKey] = {};
            monthlyTotalAggregates[monthKey] = {
                period_revenue: 0,
                accommodation_revenue: 0,
                other_revenue: 0,
                forecast_revenue: 0,
                pms_revenue: 0
            };
            selectedHotels.value.forEach(hotelId => {
                monthlyAggregates[monthKey][String(hotelId)] = { pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null, forecast_revenue: null, acc_revenue: null };
            });
            currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
        }

        const aggregateDataSource = (sourceDataByHotel, revenueKey) => {
            for (const stringHotelIdKey in sourceDataByHotel) {
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date && typeof record.revenue === 'number') {
                            const monthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[monthKey] && monthlyAggregates[monthKey][stringHotelIdKey]) {
                                if (monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] === null) monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] = 0;
                                monthlyAggregates[monthKey][stringHotelIdKey][revenueKey] += record.revenue;
                            }
                        }
                    });
                }
            }
        };

        const aggregatePmsDataSource = (sourceDataByHotel) => {
            for (const stringHotelIdKey in sourceDataByHotel) {
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date) {
                            const monthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[monthKey]) {
                                if (monthlyAggregates[monthKey][stringHotelIdKey]) {
                                    if (typeof record.revenue === 'number') {
                                        if (monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue === null) monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue = 0;
                                        monthlyAggregates[monthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                    }
                                    if (typeof record.accommodation_revenue === 'number') {
                                        if (monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue === null) monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue = 0;
                                        monthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                    }
                                    if (typeof record.other_revenue === 'number') {
                                        if (monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue === null) monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue = 0;
                                        monthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                    }
                                }
                            }
                        }
                    });
                }
            }
        };

        aggregatePmsDataSource(pmsTotalData.value);
        aggregateDataSource(forecastTotalData.value, 'forecast_revenue');
        aggregateDataSource(accountingTotalData.value, 'acc_revenue');

        Object.keys(monthlyAggregates).sort().forEach(monthKey => {
            const monthData = monthlyAggregates[monthKey];

            for (const hotelIdStringKey in monthData) {
                const outputHotelId = hotelIdLookup.get(hotelIdStringKey);
                const aggregatedMonthData = monthData[hotelIdStringKey];
                const pmsRev = aggregatedMonthData.pms_revenue;
                const pmsAccommodationRev = aggregatedMonthData.pms_accommodation_revenue;
                const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
                const forecastRev = aggregatedMonthData.forecast_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                let otherRev = (pmsOtherRev || 0);
                let accommodationRev = (accRev !== null && accRev > 0) ? accRev : (pmsAccommodationRev || 0);
                let periodRev = accommodationRev + otherRev;

                monthlyTotalAggregates[monthKey].period_revenue += periodRev;
                monthlyTotalAggregates[monthKey].accommodation_revenue += accommodationRev;
                monthlyTotalAggregates[monthKey].other_revenue += otherRev;
                monthlyTotalAggregates[monthKey].pms_revenue += (pmsRev || 0);
                monthlyTotalAggregates[monthKey].forecast_revenue += (forecastRev || 0);

                result.push({
                    month: monthKey, hotel_id: outputHotelId, hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.value.get(outputHotelId) ?? 999,
                    pms_revenue: pmsRev, forecast_revenue: forecastRev, acc_revenue: accRev, period_revenue: periodRev,
                    accommodation_revenue: accommodationRev, other_revenue: otherRev,
                });
            }

            const totals = monthlyTotalAggregates[monthKey];
            result.push({
                month: monthKey,
                hotel_id: 0,
                hotel_name: '施設合計',
                sort_order: -1,
                pms_revenue: totals.pms_revenue,
                forecast_revenue: totals.forecast_revenue,
                acc_revenue: null,
                period_revenue: totals.period_revenue,
                accommodation_revenue: totals.accommodation_revenue,
                other_revenue: totals.other_revenue,
            });
        });

        result.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        if (selectedView.value?.endsWith('Hotel')) {
            return result.filter(item => item.hotel_id !== 0);
        }
        return result;
    });

    // --- Occupancy Data Aggregation ---
    const occupancyData = computed(() => {
        if (!selectedView.value) return [];

        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0 || allHotels.value.length === 0) {
            return result;
        }

        const monthlyOccupancyAggregates = {};
        let currentIterMonth = new Date(firstDayofFetch.value);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        while (currentIterMonth <= lastIterMonthDate) {
            const monthKey = formatDateMonth(normalizeDate(currentIterMonth));
            monthlyOccupancyAggregates[monthKey] = {};
            selectedHotels.value.forEach(hotelId => {
                monthlyOccupancyAggregates[monthKey][String(hotelId)] = { total_rooms: 0, sold_rooms: 0, non_accommodation_stays: 0, fc_total_rooms: 0, fc_sold_rooms: 0 };
            });
            currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
        }

        if (pmsTotalData.value) {
            for (const stringHotelIdKey in pmsTotalData.value) {
                const isSelectedHotel = selectedHotels.value.some(selHotelId => String(selHotelId) === stringHotelIdKey);
                if (stringHotelIdKey !== '0' && !isSelectedHotel) continue;
                const pmsRecords = pmsTotalData.value[stringHotelIdKey];
                if (Array.isArray(pmsRecords)) {
                    pmsRecords.forEach(record => {
                        if (record && record.date) {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj);
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                if (record.room_count !== undefined) monthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += record.room_count;
                                if (record.non_accommodation_stays !== undefined) monthlyOccupancyAggregates[monthKey][stringHotelIdKey].non_accommodation_stays += record.non_accommodation_stays;
                            }
                        }
                    });
                }
            }
        }

        if (forecastTotalData.value) {
            for (const stringHotelIdKey in forecastTotalData.value) {
                const isSelectedHotel = selectedHotels.value.some(selHotelId => String(selHotelId) === stringHotelIdKey);
                if (stringHotelIdKey !== '0' && !isSelectedHotel) continue;
                const forecastRecords = forecastTotalData.value[stringHotelIdKey];
                if (Array.isArray(forecastRecords)) {
                    forecastRecords.forEach(record => {
                        if (record && record.date && typeof record.room_count === 'number') {
                            const recordDateObj = normalizeDate(new Date(record.date));
                            if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj);
                            if (!monthKey || !monthlyOccupancyAggregates[monthKey]) return;
                            if (monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_total_rooms += record.total_rooms;
                            }
                        }
                    });
                }
            }
        }

        Object.keys(monthlyOccupancyAggregates).sort().forEach(monthKey => {
            const monthData = monthlyOccupancyAggregates[monthKey];
            let totalRoomsSum = 0;
            let totalGrossRoomsSum = 0;
            let totalFcSoldRoomsSum = 0;
            let totalFcTotalRoomsSum = 0;
            let totalSoldRoomsSum = 0;
            let totalNonAccommodationStaysSum = 0;

            for (const hotelId in monthData) {
                const hotelData = monthData[hotelId];
                let total_available_rooms_for_month_calc = 0;
                let total_gross_rooms_for_month_calc = 0;
                const fallbackCapacityForHotel = pmsFallbackCapacities.value[hotelId] || 0;
                const dailyRealRoomsMap = new Map();
                const dailyGrossRoomsMap = new Map();
                const hotelPmsDataForMonth = (pmsTotalData.value[hotelId] || []).filter(
                    pmsRecord => pmsRecord.date.startsWith(monthKey)
                );

                hotelPmsDataForMonth.forEach(pmsRecord => {
                    if (Object.prototype.hasOwnProperty.call(pmsRecord, 'total_rooms_real') && pmsRecord.total_rooms_real !== null) {
                        const realRooms = parseInt(pmsRecord.total_rooms_real, 10);
                        if (!isNaN(realRooms)) dailyRealRoomsMap.set(pmsRecord.date, realRooms);
                    }
                    if (Object.prototype.hasOwnProperty.call(pmsRecord, 'total_rooms') && pmsRecord.total_rooms !== null) {
                        const grossRooms = parseInt(pmsRecord.total_rooms, 10);
                        if (!isNaN(grossRooms)) dailyGrossRoomsMap.set(pmsRecord.date, grossRooms);
                    }
                });

                const [yearStr, monthStr] = monthKey.split('-');
                const year = parseInt(yearStr, 10);
                const monthJS = parseInt(monthStr, 10) - 1;
                const daysInCurrentMonth = getDaysInMonth(year, monthJS + 1);

                for (let day = 1; day <= daysInCurrentMonth; day++) {
                    const dateForDay = new Date(year, monthJS, day);
                    const currentDateStr = formatDateToYMD(dateForDay);
                    total_available_rooms_for_month_calc += dailyRealRoomsMap.has(currentDateStr) ? dailyRealRoomsMap.get(currentDateStr) : fallbackCapacityForHotel;
                    total_gross_rooms_for_month_calc += dailyGrossRoomsMap.has(currentDateStr) ? dailyGrossRoomsMap.get(currentDateStr) : fallbackCapacityForHotel;
                }

                hotelData.total_available_rooms_for_month_calc = total_available_rooms_for_month_calc;
                hotelData.total_gross_rooms_for_month_calc = total_gross_rooms_for_month_calc;

                const hotel_actual_total_rooms = hotelData.fc_total_rooms > 0 ? hotelData.fc_total_rooms : total_available_rooms_for_month_calc;

                totalRoomsSum += hotel_actual_total_rooms;
                totalGrossRoomsSum += total_gross_rooms_for_month_calc;
                totalFcSoldRoomsSum += hotelData.fc_sold_rooms;
                totalFcTotalRoomsSum += hotelData.fc_total_rooms;
                totalSoldRoomsSum += hotelData.sold_rooms;
                totalNonAccommodationStaysSum += hotelData.non_accommodation_stays;

                const occupancyRate = hotel_actual_total_rooms > 0 ? (hotelData.sold_rooms / hotel_actual_total_rooms) * 100 : 0;
                const parsedHotelId = parseInt(hotelId, 10);
                const hotelName = searchAllHotels(parsedHotelId)[0]?.name || 'Unknown Hotel';
                const hotelOpenDate = searchAllHotels(parsedHotelId)[0]?.open_date || null;

                result.push({
                    month: monthKey, hotel_id: parsedHotelId, hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.value.get(parsedHotelId) ?? 999,
                    open_date: hotelOpenDate, total_rooms: hotel_actual_total_rooms, net_total_rooms: hotel_actual_total_rooms,
                    gross_total_rooms: total_gross_rooms_for_month_calc, sold_rooms: hotelData.sold_rooms,
                    non_accommodation_stays: hotelData.non_accommodation_stays, occ: parseFloat(occupancyRate.toFixed(2)),
                    not_available_rooms: 0, fc_total_rooms: hotelData.fc_total_rooms, fc_sold_rooms: hotelData.fc_sold_rooms,
                    fc_occ: hotelData.fc_total_rooms > 0 ? parseFloat(((hotelData.fc_sold_rooms / hotelData.fc_total_rooms) * 100).toFixed(2)) : 0
                });
            }

            if (selectedHotels.value.length > 0) {
                const totalOcc = totalRoomsSum > 0 ? (totalSoldRoomsSum / totalRoomsSum) * 100 : 0;
                result.push({
                    month: monthKey, hotel_id: 0, hotel_name: '施設合計', sort_order: -1, open_date: null,
                    total_rooms: totalRoomsSum, net_total_rooms: totalRoomsSum, gross_total_rooms: totalGrossRoomsSum,
                    sold_rooms: totalSoldRoomsSum, non_accommodation_stays: totalNonAccommodationStaysSum,
                    occ: parseFloat(totalOcc.toFixed(2)), not_available_rooms: 0, fc_total_rooms: totalFcTotalRoomsSum,
                    fc_sold_rooms: totalFcSoldRoomsSum, fc_occ: totalFcTotalRoomsSum > 0 ? parseFloat(((totalFcSoldRoomsSum / totalFcTotalRoomsSum) * 100).toFixed(2)) : 0
                });
            }
        });

        result.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        if (selectedView.value?.endsWith('Hotel')) {
            return result.filter(item => item.hotel_id !== 0);
        }
        return result;
    });

    const prevYearOccupancyData = computed(() => {
        if (!selectedView.value) return [];

        const result = [];
        if (!firstDayofFetch.value || !lastDayofFetch.value || selectedHotels.value.length === 0 || allHotels.value.length === 0) {
            return result;
        }

        const monthlyOccupancyAggregates = {};
        const monthlyTotalAggregates = {};

        let currentIterMonth = new Date(firstDayofFetch.value);
        currentIterMonth.setFullYear(currentIterMonth.getFullYear() - 1);
        const lastIterMonthDate = new Date(lastDayofFetch.value);
        lastIterMonthDate.setFullYear(lastIterMonthDate.getFullYear() - 1);

        while (currentIterMonth <= lastIterMonthDate) {
            const iterDateForMonthKey = normalizeDate(currentIterMonth);
            const monthKey = formatDateMonth(iterDateForMonthKey);
            monthlyOccupancyAggregates[monthKey] = {};
            monthlyTotalAggregates[monthKey] = { total_rooms: 0, sold_rooms: 0 };

            const year = iterDateForMonthKey.getFullYear();
            const monthIndex = iterDateForMonthKey.getMonth();
            const daysInCalendarMonth = getDaysInMonth(year, monthIndex + 1);
            const firstDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, 1));
            const lastDayOfCurrentProcessingMonth = normalizeDate(new Date(year, monthIndex, daysInCalendarMonth));

            selectedHotels.value.forEach(hotelId => {
                const hotelInfo = allHotels.value.find(h => String(h.id) === String(hotelId));
                let physicalRooms = (hotelInfo && typeof hotelInfo.total_rooms === 'number') ? hotelInfo.total_rooms : 0;
                let effectiveDaysForHotelInMonth = daysInCalendarMonth;
                if (hotelInfo && hotelInfo.open_date) {
                    const openDate = normalizeDate(new Date(hotelInfo.open_date));
                    if (openDate && !isNaN(openDate.getTime())) {
                        const prevYearOpenDate = new Date(openDate);
                        prevYearOpenDate.setFullYear(prevYearOpenDate.getFullYear() - 1);
                        if (prevYearOpenDate > lastDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = 0;
                        else if (prevYearOpenDate > firstDayOfCurrentProcessingMonth) effectiveDaysForHotelInMonth = lastDayOfCurrentProcessingMonth.getDate() - prevYearOpenDate.getDate() + 1;
                    }
                }
                effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
                const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;
                monthlyOccupancyAggregates[monthKey][String(hotelId)] = { total_rooms: monthlyAvailableRoomDays, sold_rooms: 0 };
            });
            currentIterMonth.setMonth(currentIterMonth.getMonth() + 1);
        }

        if (prevYearPmsTotalData.value) {
            for (const stringHotelIdKey in prevYearPmsTotalData.value) {
                const pmsRecords = prevYearPmsTotalData.value[stringHotelIdKey];
                if (Array.isArray(pmsRecords)) {
                    pmsRecords.forEach(record => {
                        const recordDateObj = normalizeDate(new Date(record.date));
                        if (!recordDateObj) return; const monthKey = formatDateMonth(recordDateObj);
                        if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                            if (record.room_count !== undefined) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += Number(record.room_count) || 0;
                            }
                        }
                    });
                }
            }
        }

        Object.keys(monthlyOccupancyAggregates).sort().forEach(monthKey => {
            const monthData = monthlyOccupancyAggregates[monthKey];
            const totals = monthlyTotalAggregates[monthKey];

            for (const hotelId in monthData) {
                const data = monthData[hotelId];
                const total_rooms = data.total_rooms || 0;
                const occupancyRate = total_rooms > 0 ? (data.sold_rooms / total_rooms) * 100 : 0;
                let parsedHotelId = parseInt(hotelId, 10);
                const hotelName = searchAllHotels(parsedHotelId)[0]?.name || 'Unknown Hotel';

                totals.total_rooms += total_rooms;
                totals.sold_rooms += data.sold_rooms;

                result.push({
                    month: monthKey, hotel_id: parsedHotelId, hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.value.get(parsedHotelId) ?? 999,
                    sold_rooms: data.sold_rooms, total_rooms: total_rooms, occ: parseFloat(occupancyRate.toFixed(2))
                });
            }

            const totalOcc = totals.total_rooms > 0 ? (totals.sold_rooms / totals.total_rooms) * 100 : 0;
            result.push({
                month: monthKey, hotel_id: 0, hotel_name: '施設合計', sort_order: -1,
                sold_rooms: totals.sold_rooms, total_rooms: totals.total_rooms, occ: parseFloat(totalOcc.toFixed(2))
            });
        });

        result.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        if (selectedView.value?.endsWith('Hotel')) {
            return result.filter(item => item.hotel_id !== 0);
        }
        return result;
    });

    // --- KPI and Message computed properties ---
    const selectionMessage = computed(() => {
        if (!selectedDate.value) return '';
        const periodStr = formatDateMonth(selectedDate.value).replace('-', '/');
        const names = revenueData.value
            .map(item => item.hotel_name)
            .filter(name => name && name !== '施設合計' && name !== 'Unknown Hotel');
        const uniqueNames = [...new Set(names)];
        return `会計データがない場合はPMSの数値になっています。期間： ${periodStr}。選択中の施設： ${uniqueNames.join(', ')}`;
    });

    const kpiData = computed(() => {
        const revenueEntry = revenueData.value?.find(item => item.hotel_id === 0);
        const occupancyEntry = occupancyData.value?.find(item => item.hotel_id === 0);

        const total_forecast_revenue = revenueEntry?.forecast_revenue || 0;
        const total_period_accommodation_revenue = revenueEntry?.accommodation_revenue || 0;
        const total_fc_sold_rooms = occupancyEntry?.fc_sold_rooms || 0;
        const total_fc_available_rooms = occupancyEntry?.fc_total_rooms || 0;
        const total_sold_rooms = occupancyEntry?.sold_rooms || 0;
        const total_available_rooms = occupancyEntry?.total_rooms || 0;

        const actualADR = total_sold_rooms ? Math.round(total_period_accommodation_revenue / total_sold_rooms) : 0;
        const forecastADR = total_fc_sold_rooms ? Math.round(total_forecast_revenue / total_fc_sold_rooms) : 0;
        const actualDenominator = total_fc_available_rooms > 0 ? total_fc_available_rooms : total_available_rooms;
        const actualRevPAR = actualDenominator ? Math.round(total_period_accommodation_revenue / actualDenominator) : 0;
        const forecastRevPAR = total_fc_available_rooms ? Math.round(total_forecast_revenue / total_fc_available_rooms) : 0;

        return { actualADR, forecastADR, actualRevPAR, forecastRevPAR };
    });

    return {
        firstDayofFetch,
        lastDayofFetch,
        selectedView,
        prevYearRevenueData,
        revenueData,
        occupancyData,
        prevYearOccupancyData,
        kpiData,
        selectionMessage,
        hotelSortOrderMap,
        searchAllHotels,
        // Also expose date range helpers for the component if needed
        formatDateMonth,
        normalizeDate,
        getDaysInMonth
    };
}
