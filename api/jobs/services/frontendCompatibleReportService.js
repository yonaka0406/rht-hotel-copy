const { selectForecastData, selectAccountingData, selectCountReservation, selectDailyReportDataByHotel, selectLatestDailyReportDate, selectOccupationBreakdownByMonth } = require('../../models/report');
const { formatDate } = require('../../utils/reportUtils');
const logger = require('../../config/logger');

/**
 * Helper to normalize a Date object to local midnight (00:00:00)
 */
const normalizeDate = (date) => {
    if (!date) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Helper to format a Date object to YYYY-MM
 */
function formatDateMonth(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Helper to format a Date object to YYYY-MM-DD
 */
function formatDateToYMD(date) {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Helper to get the number of days in a given month (1-indexed) of a year
 */
function getDaysInMonth(year, month) {
    if (typeof year !== 'number' || typeof month !== 'number') return 0;
    return new Date(year, month, 0).getDate();
}

/**
 * Fetch and aggregate monthly summary data using frontend-compatible logic.
 * This replicates the data fetching and aggregation logic from ReportingSalesAndOCC.vue
 * 
 * @param {string} requestId 
 * @param {Date} targetDate 
 * @param {Object} dbClient - Database client
 */
const getFrontendCompatibleReportData = async (requestId, targetDate, dbClient) => {
    try {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        // Calculate date ranges (same as frontend)
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // For monthly reports, use month range
        const startDateStr = formatDate(firstDayOfMonth);
        const endDateStr = formatDate(lastDayOfMonth);

        // Previous Year Dates
        const prevYearDate = new Date(targetDate);
        prevYearDate.setFullYear(prevYearDate.getFullYear() - 1);
        const prevYearFirstDay = new Date(prevYearDate.getFullYear(), month, 1);
        const prevYearLastDay = new Date(prevYearDate.getFullYear(), month + 1, 0);
        const prevStartDateStr = formatDate(prevYearFirstDay);
        const prevEndDateStr = formatDate(prevYearLastDay);

        // Fetch Hotels (same as frontend)
        const allHotelsResult = await dbClient.query('SELECT id, name, total_rooms, open_date, sort_order FROM hotels ORDER BY sort_order');
        const allHotels = allHotelsResult.rows;
        const hotelIds = allHotels.map(h => h.id);
        
        logger.warn(`[getFrontendCompatibleReportData] Fetched ${allHotels.length} hotels. Hotel IDs: ${hotelIds.join(', ')}`);
        logger.warn(`[getFrontendCompatibleReportData] Date range: ${startDateStr} to ${endDateStr}`);

        // Batch fetch data for all hotels (replicating frontend batch approach)
        const fetchAllHotelsData = async (fetchMethod, sDate, eDate) => {
            const results = {};
            await Promise.all(hotelIds.map(async (hid) => {
                const data = await fetchMethod(requestId, hid, sDate, eDate, dbClient);
                results[String(hid)] = data || [];
            }));
            return results;
        };

        const [
            batchPmsData,
            batchForecastData,
            batchAccountingData,
            batchOccupationBreakdownData,

            // Previous Year
            batchPrevPmsData,
            batchPrevAccountingData,
            batchPrevOccupationBreakdownData
        ] = await Promise.all([
            // Current Year
            fetchAllHotelsData(selectCountReservation, startDateStr, endDateStr),
            fetchAllHotelsData(selectForecastData, startDateStr, endDateStr),
            fetchAllHotelsData(selectAccountingData, startDateStr, endDateStr),
            fetchAllHotelsData(selectOccupationBreakdownByMonth, startDateStr, endDateStr),

            // Previous Year
            fetchAllHotelsData(selectCountReservation, prevStartDateStr, prevEndDateStr),
            fetchAllHotelsData(selectAccountingData, prevStartDateStr, prevEndDateStr),
            fetchAllHotelsData(selectOccupationBreakdownByMonth, prevStartDateStr, prevEndDateStr)
        ]);

        // Process data exactly like frontend does
        const pmsTotalData = {};
        const forecastTotalData = {};
        const accountingTotalData = {};
        const pmsFallbackCapacities = {};

        const prevYearPmsTotalData = {};
        const prevYearAccountingTotalData = {};

        // Process current year data (replicating frontend logic)
        for (const hotelId of hotelIds) {
            const hKey = String(hotelId);

            // Process PMS Data
            const rawPmsData = batchPmsData[hKey] || [];
            if (Array.isArray(rawPmsData)) {
                if (rawPmsData.length > 0 && rawPmsData[0].total_rooms !== undefined) {
                    pmsFallbackCapacities[hKey] = Number(rawPmsData[0].total_rooms || 0);
                } else {
                    pmsFallbackCapacities[hKey] = 0;
                }

                const mappedData = rawPmsData.map(item => ({
                    date: formatDateToYMD(item.date),
                    revenue: item.price !== undefined ? Number(item.price) : 0,
                    accommodation_revenue: item.accommodation_price !== undefined ? Number(item.accommodation_price) : 0,
                    other_revenue: item.other_price !== undefined ? Number(item.other_price) : 0,
                    room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                    non_accommodation_stays: item.non_accommodation_stays !== undefined ? Number(item.non_accommodation_stays) : 0,
                    total_rooms: item.total_rooms !== undefined ? Number(item.total_rooms) : 0,
                    total_rooms_real: item.total_rooms_real !== undefined ? Number(item.total_rooms_real) : 0,
                })).filter(item => item.date !== null);
                pmsTotalData[hKey] = mappedData;
            } else {
                pmsTotalData[hKey] = [];
                pmsFallbackCapacities[hKey] = 0;
            }

            // Process Forecast Data
            const rawForecastData = batchForecastData[hKey] || [];
            if (Array.isArray(rawForecastData)) {
                forecastTotalData[hKey] = rawForecastData.map(item => ({
                    date: formatDateToYMD(item.forecast_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                    total_rooms: item.available_room_nights !== undefined ? Number(item.available_room_nights) : 0,
                    room_count: item.rooms_sold_nights !== undefined ? Number(item.rooms_sold_nights) : 0,
                })).filter(item => item.date !== null);
            } else {
                forecastTotalData[hKey] = [];
            }

            // Process Accounting Data
            const rawAccountingData = batchAccountingData[hKey] || [];
            if (Array.isArray(rawAccountingData)) {
                accountingTotalData[hKey] = rawAccountingData.map(item => ({
                    date: formatDateToYMD(item.accounting_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                })).filter(item => item.date !== null);
            } else {
                accountingTotalData[hKey] = [];
            }

            // Process Previous Year PMS Data
            const rawPrevPmsData = batchPrevPmsData[hKey] || [];
            if (Array.isArray(rawPrevPmsData)) {
                prevYearPmsTotalData[hKey] = rawPrevPmsData.map(item => ({
                    date: formatDateToYMD(item.date),
                    revenue: item.price !== undefined ? Number(item.price) : 0,
                    accommodation_revenue: item.accommodation_price !== undefined ? Number(item.accommodation_price) : 0,
                    other_revenue: item.other_price !== undefined ? Number(item.other_price) : 0,
                    room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                    non_accommodation_stays: item.non_accommodation_stays !== undefined ? Number(item.non_accommodation_stays) : 0,
                    total_rooms: item.total_rooms !== undefined ? Number(item.total_rooms) : 0,
                    total_rooms_real: item.total_rooms_real !== undefined ? Number(item.total_rooms_real) : 0,
                })).filter(item => item.date !== null);
            } else {
                prevYearPmsTotalData[hKey] = [];
            }

            // Process Previous Year Accounting Data
            const rawPrevAccountingData = batchPrevAccountingData[hKey] || [];
            if (Array.isArray(rawPrevAccountingData)) {
                prevYearAccountingTotalData[hKey] = rawPrevAccountingData.map(item => ({
                    date: formatDateToYMD(item.accounting_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                })).filter(item => item.date !== null);
            } else {
                prevYearAccountingTotalData[hKey] = [];
            }
        }

        // Create hotel sort order map (same as frontend)
        const hotelSortOrderMap = new Map();
        allHotels.forEach(h => {
            hotelSortOrderMap.set(Number(h.id), (h.sort_order !== null && h.sort_order !== undefined) ? h.sort_order : 999);
        });
        hotelSortOrderMap.set(0, -1); // 施設合計 always first

        // Helper function to search hotels (same as frontend)
        const searchAllHotels = (hotelId) => {
            if (hotelId === 0) {
                return [{ id: 0, name: '施設合計' }];
            }
            const foundHotel = allHotels.find(hotel => String(hotel.id) === String(hotelId));
            if (foundHotel) {
                return [foundHotel];
            }
            return [];
        };

        // Generate revenue data (replicating frontend computed property logic)
        const revenueData = [];
        const monthKey = formatDateMonth(targetDate);
        
        // Initialize monthly aggregates
        const monthlyAggregates = {};
        monthlyAggregates[monthKey] = {};
        monthlyAggregates[monthKey]['0'] = { 
            pms_revenue: 0, pms_accommodation_revenue: 0, pms_other_revenue: 0, 
            forecast_revenue: 0, acc_revenue: null 
        };
        
        hotelIds.forEach(hotelId => {
            monthlyAggregates[monthKey][String(hotelId)] = { 
                pms_revenue: 0, pms_accommodation_revenue: 0, pms_other_revenue: 0, 
                forecast_revenue: 0, acc_revenue: null 
            };
        });

        // Aggregate PMS data (same logic as frontend)
        const aggregatePmsDataSource = (sourceDataByHotel) => {
            for (const stringHotelIdKey in sourceDataByHotel) {
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date) {
                            const recordMonthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[recordMonthKey]) {
                                if (monthlyAggregates[recordMonthKey][stringHotelIdKey]) {
                                    if (typeof record.revenue === 'number') {
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                    }
                                    if (typeof record.accommodation_revenue === 'number') {
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                    }
                                    if (typeof record.other_revenue === 'number') {
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                    }
                                }
                                if (monthlyAggregates[recordMonthKey]['0']) {
                                    if (typeof record.revenue === 'number') {
                                        monthlyAggregates[recordMonthKey]['0'].pms_revenue += record.revenue;
                                    }
                                    if (typeof record.accommodation_revenue === 'number') {
                                        monthlyAggregates[recordMonthKey]['0'].pms_accommodation_revenue += record.accommodation_revenue;
                                    }
                                    if (typeof record.other_revenue === 'number') {
                                        monthlyAggregates[recordMonthKey]['0'].pms_other_revenue += record.other_revenue;
                                    }
                                }
                            }
                        }
                    });
                }
            }
        };

        // Aggregate other data sources
        const aggregateDataSource = (sourceDataByHotel, revenueKey) => {
            for (const stringHotelIdKey in sourceDataByHotel) {
                const hotelDataArray = sourceDataByHotel[stringHotelIdKey];
                if (Array.isArray(hotelDataArray)) {
                    hotelDataArray.forEach(record => {
                        if (record && record.date && typeof record.revenue === 'number') {
                            const recordMonthKey = formatDateMonth(new Date(record.date));
                            if (monthlyAggregates[recordMonthKey]) {
                                if (monthlyAggregates[recordMonthKey][stringHotelIdKey]) {
                                    if (revenueKey === 'acc_revenue') {
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey].acc_revenue === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey].acc_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].acc_revenue += record.revenue;
                                    } else {
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey][revenueKey] += record.revenue;
                                    }
                                }
                                if (monthlyAggregates[recordMonthKey]['0']) {
                                    if (revenueKey === 'acc_revenue') {
                                        if (monthlyAggregates[recordMonthKey]['0'].acc_revenue === null) {
                                            monthlyAggregates[recordMonthKey]['0'].acc_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey]['0'].acc_revenue += record.revenue;
                                    } else {
                                        monthlyAggregates[recordMonthKey]['0'][revenueKey] += record.revenue;
                                    }
                                }
                            }
                        }
                    });
                }
            }
        };

        // Apply aggregations
        aggregatePmsDataSource(pmsTotalData);
        aggregateDataSource(forecastTotalData, 'forecast_revenue');
        aggregateDataSource(accountingTotalData, 'acc_revenue');

        // Build revenue data array
        Object.keys(monthlyAggregates).sort().forEach(monthKey => {
            for (const hotelIdStringKeyInMonth in monthlyAggregates[monthKey]) {
                let outputHotelId = hotelIdStringKeyInMonth === '0' ? 0 : parseInt(hotelIdStringKeyInMonth, 10);
                const aggregatedMonthData = monthlyAggregates[monthKey][hotelIdStringKeyInMonth];
                const pmsRev = aggregatedMonthData.pms_revenue;
                const pmsAccommodationRev = aggregatedMonthData.pms_accommodation_revenue;
                const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
                const forecastRev = aggregatedMonthData.forecast_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';
                
                // Prioritize accounting revenue if available, otherwise use PMS (same as frontend)
                let periodRev = (accRev !== null) ? accRev : (pmsRev || 0);
                let accommodationRev = (accRev !== null) ? accRev : (pmsAccommodationRev || 0);
                let otherRev = (accRev !== null) ? 0 : (pmsOtherRev || 0);
                
                revenueData.push({
                    month: monthKey,
                    hotel_id: outputHotelId,
                    hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.get(outputHotelId) ?? 999,
                    pms_revenue: pmsRev,
                    forecast_revenue: forecastRev,
                    acc_revenue: accRev,
                    period_revenue: periodRev,
                    accommodation_revenue: accommodationRev,
                    other_revenue: otherRev,
                });
            }
        });

        // Sort revenue data (same as frontend)
        revenueData.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        // Generate occupancy data (replicating exact frontend logic)
        const occupancyData = [];
        const daysInCurrentMonth = getDaysInMonth(year, month + 1);
        
        // Build monthly occupancy aggregates (same as frontend)
        const monthlyOccupancyAggregates = {};
        monthlyOccupancyAggregates[monthKey] = {};
        monthlyOccupancyAggregates[monthKey]['0'] = { 
            total_rooms: 0, sold_rooms: 0, non_accommodation_stays: 0, 
            roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 
        };

        // Initialize aggregates for each hotel (same as frontend)
        hotelIds.forEach(hotelId => {
            const hotel = allHotels.find(h => h.id === hotelId);
            let physicalRooms = (hotel && typeof hotel.total_rooms === 'number') ? hotel.total_rooms : 0;
            let effectiveDaysForHotelInMonth = daysInCurrentMonth;
            
            if (hotel && hotel.open_date) {
                const openDate = normalizeDate(new Date(hotel.open_date));
                const firstDayOfMonth = normalizeDate(new Date(year, month, 1));
                const lastDayOfMonth = normalizeDate(new Date(year, month, daysInCurrentMonth));
                
                if (openDate && !isNaN(openDate.getTime())) {
                    if (openDate > lastDayOfMonth) effectiveDaysForHotelInMonth = 0;
                    else if (openDate > firstDayOfMonth) effectiveDaysForHotelInMonth = lastDayOfMonth.getDate() - openDate.getDate() + 1;
                }
            }
            effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
            const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;
            
            monthlyOccupancyAggregates[monthKey]['0'].total_rooms += monthlyAvailableRoomDays;
            monthlyOccupancyAggregates[monthKey][String(hotelId)] = { 
                total_rooms: monthlyAvailableRoomDays, sold_rooms: 0, non_accommodation_stays: 0, 
                roomDifferenceSum: 0, fc_total_rooms: 0, fc_sold_rooms: 0 
            };
        });

        // Process PMS data for sold rooms (same as frontend)
        for (const stringHotelIdKey in pmsTotalData) {
            const pmsRecords = pmsTotalData[stringHotelIdKey];
            if (Array.isArray(pmsRecords)) {
                pmsRecords.forEach(record => {
                    if (record && record.date && typeof record.room_count === 'number') {
                        const recordMonthKey = formatDateMonth(new Date(record.date));
                        if (recordMonthKey === monthKey) {
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += record.room_count;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].sold_rooms += record.room_count;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey] && typeof record.non_accommodation_stays === 'number') {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].non_accommodation_stays += record.non_accommodation_stays;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0'] && typeof record.non_accommodation_stays === 'number') {
                                monthlyOccupancyAggregates[monthKey]['0'].non_accommodation_stays += record.non_accommodation_stays;
                            }
                        }
                    }
                    if (record && record.date && typeof record.total_rooms === 'number' && typeof record.total_rooms_real === 'number') {
                        const recordMonthKey = formatDateMonth(new Date(record.date));
                        if (recordMonthKey === monthKey) {
                            const difference = record.total_rooms_real - record.total_rooms;
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].roomDifferenceSum += difference;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].roomDifferenceSum += difference;
                            }
                        }
                    }
                });
            }
        }

        // Process forecast data (same as frontend)
        for (const stringHotelIdKey in forecastTotalData) {
            const forecastRecords = forecastTotalData[stringHotelIdKey];
            if (Array.isArray(forecastRecords)) {
                forecastRecords.forEach(record => {
                    if (record && record.date && typeof record.room_count === 'number') {
                        const recordMonthKey = formatDateMonth(new Date(record.date));
                        if (recordMonthKey === monthKey) {
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[monthKey][stringHotelIdKey].fc_total_rooms += record.total_rooms;
                            }
                            if (monthlyOccupancyAggregates[monthKey] && monthlyOccupancyAggregates[monthKey]['0']) {
                                monthlyOccupancyAggregates[monthKey]['0'].fc_total_rooms += record.total_rooms;
                                monthlyOccupancyAggregates[monthKey]['0'].fc_sold_rooms += record.room_count;
                            }
                        }
                    }
                });
            }
        }

        // Calculate detailed room availability (same as frontend)
        const monthData = monthlyOccupancyAggregates[monthKey];
        let totalRoomsSum = 0;
        let totalGrossRoomsSum = 0;

        // Calculate total_available_rooms_for_month_calc for each hotel
        for (const hotelIdStr in monthData) {
            if (hotelIdStr === '0') continue;

            const hotelData = monthData[hotelIdStr];
            let total_available_rooms_for_month_calc = 0;
            let total_gross_rooms_for_month_calc = 0;
            const fallbackCapacityForHotel = pmsFallbackCapacities[hotelIdStr] || 0;
            const dailyRealRoomsMap = new Map();
            const dailyGrossRoomsMap = new Map();
            const hotelPmsDataForMonth = (pmsTotalData[hotelIdStr] || []).filter(
                pmsRecord => formatDateMonth(new Date(pmsRecord.date)) === monthKey
            );

            hotelPmsDataForMonth.forEach(pmsRecord => {
                if (pmsRecord.total_rooms_real !== null && pmsRecord.total_rooms_real !== undefined) {
                    const realRooms = parseInt(pmsRecord.total_rooms_real, 10);
                    if (!isNaN(realRooms)) {
                        dailyRealRoomsMap.set(pmsRecord.date, realRooms);
                    }
                }
                if (pmsRecord.total_rooms !== null && pmsRecord.total_rooms !== undefined) {
                    const grossRooms = parseInt(pmsRecord.total_rooms, 10);
                    if (!isNaN(grossRooms)) {
                        dailyGrossRoomsMap.set(pmsRecord.date, grossRooms);
                    }
                }
            });

            for (let day = 1; day <= daysInCurrentMonth; day++) {
                const dateForDay = new Date(year, month, day);
                const currentDateStr = formatDateToYMD(dateForDay);

                total_available_rooms_for_month_calc += dailyRealRoomsMap.has(currentDateStr) ? dailyRealRoomsMap.get(currentDateStr) : fallbackCapacityForHotel;
                total_gross_rooms_for_month_calc += dailyGrossRoomsMap.has(currentDateStr) ? dailyGrossRoomsMap.get(currentDateStr) : fallbackCapacityForHotel;
            }

            hotelData.total_available_rooms_for_month_calc = total_available_rooms_for_month_calc;
            hotelData.total_gross_rooms_for_month_calc = total_gross_rooms_for_month_calc;

            totalRoomsSum += total_available_rooms_for_month_calc;
            totalGrossRoomsSum += total_gross_rooms_for_month_calc;
        }

        // Assign the sum to the '0' hotel entry
        if (monthData['0']) {
            monthData['0'].total_available_rooms_for_month_calc = totalRoomsSum;
            monthData['0'].total_gross_rooms_for_month_calc = totalGrossRoomsSum;
        }

        // Create occupancy data array (same logic as frontend)
        for (const hotelIdStr in monthData) {
            const data = monthData[hotelIdStr];
            const total_rooms = data.fc_total_rooms > 0 ? data.fc_total_rooms : (data.total_available_rooms_for_month_calc || 0);
            const total_gross_rooms = data.total_gross_rooms_for_month_calc || 0;
            const occupancyRate = total_rooms > 0 ? (data.sold_rooms / total_rooms) * 100 : 0;

            let outputHotelId = hotelIdStr === '0' ? 0 : parseInt(hotelIdStr, 10);
            const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';
            const hotelOpenDate = searchAllHotels(outputHotelId)[0]?.open_date || null;

            // Debug logging for total row
            if (hotelIdStr === '0') {
                logger.warn(`[getFrontendCompatibleReportData] Total occupancy calculation:`, {
                    monthKey,
                    sold_rooms: data.sold_rooms,
                    fc_total_rooms: data.fc_total_rooms,
                    total_available_rooms_for_month_calc: data.total_available_rooms_for_month_calc,
                    total_rooms,
                    occupancyRate: occupancyRate.toFixed(2)
                });
            }

            const oldAdjustedTotalRoomsEquivalentForCondition = data.total_rooms + data.roomDifferenceSum;
            if (hotelIdStr !== '0' || (hotelIdStr === '0' && hotelIds.length > 0)) {
                if (!(hotelIdStr === '0' && oldAdjustedTotalRoomsEquivalentForCondition === 0 && data.sold_rooms === 0 && data.roomDifferenceSum === 0 && data.total_rooms === 0)) {
                    occupancyData.push({
                        month: monthKey,
                        hotel_id: outputHotelId,
                        hotel_name: hotelName,
                        sort_order: hotelSortOrderMap.get(outputHotelId) ?? 999,
                        open_date: hotelOpenDate,
                        total_rooms: total_rooms,
                        net_total_rooms: total_rooms,
                        gross_total_rooms: total_gross_rooms,
                        sold_rooms: data.sold_rooms,
                        non_accommodation_stays: data.non_accommodation_stays,
                        occ: parseFloat(occupancyRate.toFixed(2)),
                        not_available_rooms: 0,
                        fc_total_rooms: data.fc_total_rooms,
                        fc_sold_rooms: data.fc_sold_rooms,
                        fc_occ: data.fc_total_rooms > 0 ? parseFloat(((data.fc_sold_rooms / data.fc_total_rooms) * 100).toFixed(2)) : 0
                    });
                }
            }
        }

        // Sort occupancy data (same as frontend)
        occupancyData.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        // Generate previous year data (simplified)
        const prevYearRevenueData = [];
        const prevYearOccupancyData = [];

        // Calculate KPI data (same as frontend)
        const kpiRevenueEntry = revenueData.find(item => item.hotel_id === 0);
        const kpiOccupancyEntry = occupancyData.find(item => item.hotel_id === 0);

        const total_forecast_revenue = kpiRevenueEntry?.forecast_revenue || 0;
        const total_period_accommodation_revenue = kpiRevenueEntry?.accommodation_revenue || 0;
        const total_fc_sold_rooms = kpiOccupancyEntry?.fc_sold_rooms || 0;
        const total_fc_available_rooms = kpiOccupancyEntry?.fc_total_rooms || 0;
        const total_sold_rooms = kpiOccupancyEntry?.sold_rooms || 0;
        const total_available_rooms = kpiOccupancyEntry?.total_rooms || 0;

        const actualDenominator = total_fc_available_rooms > 0 ? total_fc_available_rooms : total_available_rooms;
        
        const kpiData = {
            actualADR: total_sold_rooms ? Math.round(total_period_accommodation_revenue / total_sold_rooms) : 0,
            forecastADR: total_fc_sold_rooms ? Math.round(total_forecast_revenue / total_fc_sold_rooms) : 0,
            actualRevPAR: actualDenominator ? Math.round(total_period_accommodation_revenue / actualDenominator) : 0,
            forecastRevPAR: total_fc_available_rooms ? Math.round(total_forecast_revenue / total_fc_available_rooms) : 0
        };

        // Generate future outlook data (6 months like frontend)
        const outlookData = [];
        const outlookMonths = [];
        for (let i = 0; i < 6; i++) {
            const mDate = new Date(year, month + i, 1);
            outlookMonths.push({
                monthLabel: formatDateMonth(mDate),
                startDate: formatDate(mDate),
                endDate: formatDate(new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0))
            });
        }

        // Fetch outlook data
        const outlookStartDate = outlookMonths[0].startDate;
        const outlookEndDate = outlookMonths[outlookMonths.length - 1].endDate;

        const [
            outlookForecastResults,
            outlookPmsResults,
            latestMetricDate
        ] = await Promise.all([
            Promise.all(hotelIds.map(hid => selectForecastData(requestId, hid, outlookStartDate, outlookEndDate, dbClient))),
            Promise.all(hotelIds.map(hid => selectCountReservation(requestId, hid, outlookStartDate, outlookEndDate, dbClient))),
            selectLatestDailyReportDate(requestId, dbClient)
        ]);

        const outlookPmsFlat = outlookPmsResults.flat();
        const outlookForecastFlat = outlookForecastResults.flat();

        let outlookSnapshots = [];
        if (latestMetricDate) {
            outlookSnapshots = await selectDailyReportDataByHotel(requestId, latestMetricDate, hotelIds, dbClient);
        }

        // Process outlook data
        outlookMonths.forEach(m => {
            const mPMS = outlookPmsFlat.filter(r => formatDateMonth(new Date(r.date)) === m.monthLabel);
            const mFC = outlookForecastFlat.filter(r => formatDateMonth(new Date(r.forecast_month)) === m.monthLabel);
            const mSnapshot = outlookSnapshots.filter(r => r.month === m.startDate);

            const sales = mPMS.reduce((sum, r) => sum + (Number(r.accommodation_price) || 0), 0);
            const forecast_sales = mFC.reduce((sum, r) => sum + (Number(r.accommodation_revenue) || 0), 0);
            const confirmed_nights = mPMS.reduce((sum, r) => sum + (Number(r.room_count) || 0), 0);

            const forecast_sold = mFC.reduce((sum, r) => sum + (Number(r.rooms_sold_nights) || 0), 0);
            const forecast_available = mFC.reduce((sum, r) => sum + (Number(r.available_room_nights) || 0), 0);
            const forecast_occ = forecast_available ? (forecast_sold / forecast_available) * 100 : 0;

            const daysInM = getDaysInMonth(new Date(m.startDate).getFullYear(), new Date(m.startDate).getMonth() + 1);
            const total_bookable_room_nights = allHotels.reduce((sum, h) => {
                return sum + (h.total_rooms * daysInM);
            }, 0);

            const prev_sales = mSnapshot.reduce((sum, r) => sum + (Number(r.accommodation_sales) || 0), 0);
            const prev_confirmed_stays = mSnapshot.reduce((sum, r) => sum + (Number(r.confirmed_stays) || 0), 0);
            const prev_occ = total_bookable_room_nights ? (prev_confirmed_stays / total_bookable_room_nights) * 100 : 0;

            outlookData.push({
                month: m.monthLabel,
                forecast_sales,
                sales,
                confirmed_nights,
                forecast_occ: parseFloat(forecast_occ.toFixed(2)),
                occ: total_bookable_room_nights ? (confirmed_nights / total_bookable_room_nights) * 100 : 0,
                metric_date: latestMetricDate,
                prev_sales,
                prev_occ: parseFloat(prev_occ.toFixed(2)),
                prev_confirmed_stays,
                total_bookable_room_nights,
                blocked_nights: 0, // Simplified for email report
                net_available_room_nights: total_bookable_room_nights
            });
        });

        // Generate selection message
        const periodStr = formatDateMonth(targetDate).replace('-', '/');
        const names = revenueData
            .map(item => item.hotel_name)
            .filter(name => name && name !== '施設合計' && name !== 'Unknown Hotel');
        const uniqueNames = [...new Set(names)];
        const selectionMessage = `会計データがない場合はPMSの数値になっています。期間： ${periodStr}。選択中の施設： ${uniqueNames.join(', ')}`;

        logger.debug(`[getFrontendCompatibleReportData] Generated report data - Revenue: ${revenueData.length}, Occupancy: ${occupancyData.length}, Outlook: ${outlookData.length}`);

        return {
            targetDate: formatDate(targetDate),
            revenueData,
            occupancyData,
            prevYearRevenueData,
            prevYearOccupancyData,
            kpiData,
            outlookData,
            selectionMessage,
            allHotelNames: allHotels.map(h => h.name)
        };

    } catch (error) {
        logger.error(`[getFrontendCompatibleReportData] Error:`, error);
        throw error;
    }
};

module.exports = {
    getFrontendCompatibleReportData
};