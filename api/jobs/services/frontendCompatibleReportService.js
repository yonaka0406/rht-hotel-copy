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
 * Helper to get the number of days in a given month (1-indexed) of a year
 */
function getDaysInMonth(year, month) {
    if (typeof year !== 'number' || typeof month !== 'number') return 0;
    return new Date(year, month, 0).getDate();
}

/**
 * Helper function to determine if a hotel should be included in the report
 * Replicates the complex condition from frontend
 */
function isHotelRelevant(hotelIdStr, hotelIds) {
    return hotelIdStr !== '0' || (hotelIdStr === '0' && hotelIds.length > 0);
}

/**
 * Helper function to check if all metrics are zero (used to filter out empty rows)
 * Replicates the complex condition from frontend
 */
function hasAllZeroMetrics(hotelIdStr, data) {
    const oldAdjustedTotalRoomsEquivalentForCondition = data.total_rooms + data.roomDifferenceSum;
    return hotelIdStr === '0' &&
        oldAdjustedTotalRoomsEquivalentForCondition === 0 &&
        data.sold_rooms === 0 &&
        data.roomDifferenceSum === 0 &&
        data.total_rooms === 0;
}

/**
 * Fetch and aggregate monthly summary data using frontend-compatible logic.
 * This replicates the data fetching and aggregation logic from ReportingSalesAndOCC.vue
 * 
 * @param {string} requestId 
 * @param {Date} targetDate 
 * @param {Object} dbClient - Database client
 */
const getFrontendCompatibleReportData = async (requestId, targetDate, period = 'month', dbClient) => {
    try {
        // Input validation for targetDate
        let validatedDate;

        if (!targetDate) {
            const error = new Error(`[${requestId}] targetDate is required but was ${targetDate}`);
            logger.error(`[getFrontendCompatibleReportData] ${error.message}`);
            throw error;
        }

        // Accept both Date objects and date strings
        if (targetDate instanceof Date) {
            validatedDate = targetDate;
        } else if (typeof targetDate === 'string') {
            validatedDate = new Date(targetDate);
        } else {
            const error = new Error(`[${requestId}] targetDate must be a Date object or date string, received: ${typeof targetDate} (${targetDate})`);
            logger.error(`[getFrontendCompatibleReportData] ${error.message}`);
            throw error;
        }

        // Validate that the date is actually valid
        if (isNaN(validatedDate.getTime())) {
            const error = new Error(`[${requestId}] targetDate is not a valid date: ${targetDate}`);
            logger.error(`[getFrontendCompatibleReportData] ${error.message}`);
            throw error;
        }

        const year = validatedDate.getFullYear();
        const month = validatedDate.getMonth();

        // Calculate date ranges (same as frontend)
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        // For monthly reports, use month range
        const startDateStr = formatDate(firstDayOfMonth);
        const endDateStr = formatDate(lastDayOfMonth);

        // Previous Year Dates
        const prevYearDate = new Date(validatedDate);
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
            batchPrevAccountingData
        ] = await Promise.all([
            // Current Year
            fetchAllHotelsData(selectCountReservation, startDateStr, endDateStr),
            fetchAllHotelsData(selectForecastData, startDateStr, endDateStr),
            fetchAllHotelsData(selectAccountingData, startDateStr, endDateStr),
            fetchAllHotelsData(selectOccupationBreakdownByMonth, startDateStr, endDateStr),

            // Previous Year
            fetchAllHotelsData(selectCountReservation, prevStartDateStr, prevEndDateStr),
            fetchAllHotelsData(selectAccountingData, prevStartDateStr, prevEndDateStr)
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
                    date: formatDate(item.date),
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
                    date: formatDate(item.forecast_month),
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
                    date: formatDate(item.accounting_month),
                    revenue: item.accommodation_revenue !== undefined ? Number(item.accommodation_revenue) : 0,
                })).filter(item => item.date !== null);
            } else {
                accountingTotalData[hKey] = [];
            }

            // Process Previous Year PMS Data
            const rawPrevPmsData = batchPrevPmsData[hKey] || [];
            if (Array.isArray(rawPrevPmsData)) {
                prevYearPmsTotalData[hKey] = rawPrevPmsData.map(item => ({
                    date: formatDate(item.date),
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
                    date: formatDate(item.accounting_month),
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
        const monthKey = formatDateMonth(validatedDate);

        // Initialize monthly aggregates (same as frontend - use null for initial values)
        const monthlyAggregates = {};
        monthlyAggregates[monthKey] = {};
        monthlyAggregates[monthKey]['0'] = {
            pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null,
            forecast_revenue: null, acc_revenue: null
        };

        hotelIds.forEach(hotelId => {
            monthlyAggregates[monthKey][String(hotelId)] = {
                pms_revenue: null, pms_accommodation_revenue: null, pms_other_revenue: null,
                forecast_revenue: null, acc_revenue: null
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
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_revenue === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                    }
                                    if (typeof record.accommodation_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_accommodation_revenue === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_accommodation_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                    }
                                    if (typeof record.other_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_other_revenue === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_other_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                    }
                                }
                                if (monthlyAggregates[recordMonthKey]['0']) {
                                    if (typeof record.revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey]['0'].pms_revenue === null) {
                                            monthlyAggregates[recordMonthKey]['0'].pms_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey]['0'].pms_revenue += record.revenue;
                                    }
                                    if (typeof record.accommodation_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey]['0'].pms_accommodation_revenue === null) {
                                            monthlyAggregates[recordMonthKey]['0'].pms_accommodation_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey]['0'].pms_accommodation_revenue += record.accommodation_revenue;
                                    }
                                    if (typeof record.other_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey]['0'].pms_other_revenue === null) {
                                            monthlyAggregates[recordMonthKey]['0'].pms_other_revenue = 0;
                                        }
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
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey][revenueKey] === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey][revenueKey] = 0;
                                        }
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
                                        if (monthlyAggregates[recordMonthKey]['0'][revenueKey] === null) {
                                            monthlyAggregates[recordMonthKey]['0'][revenueKey] = 0;
                                        }
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
        Object.keys(monthlyAggregates).sort().forEach(monthKeyInLoop => {
            for (const hotelIdStringKeyInMonth in monthlyAggregates[monthKeyInLoop]) {
                let outputHotelId = hotelIdStringKeyInMonth === '0' ? 0 : parseInt(hotelIdStringKeyInMonth, 10);
                const aggregatedMonthData = monthlyAggregates[monthKeyInLoop][hotelIdStringKeyInMonth];
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
                    month: monthKeyInLoop,
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
                const currentDateStr = formatDate(dateForDay);

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

            // Use helper functions to determine if hotel should be included
            if (isHotelRelevant(hotelIdStr, hotelIds)) {
                if (!hasAllZeroMetrics(hotelIdStr, data)) {
                    occupancyData.push({
                        month: monthKey,
                        hotel_id: outputHotelId,
                        hotel_name: hotelName,
                        sort_order: hotelSortOrderMap.get(outputHotelId) ?? 999,
                        open_date: hotelOpenDate,
                        total_rooms: total_rooms,
                        net_total_rooms: data.fc_total_rooms > 0 ? data.fc_total_rooms : total_rooms, // Use fc_total_rooms for 計画販売可能総室数
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


        // Generate future outlook data (matching frontend logic exactly)
        const outlookData = [];
        let kpiData = { actualADR: [], forecastADR: [], actualRevPAR: [], forecastRevPAR: [] };

        try {
            const latestDateStrRaw = await selectLatestDailyReportDate(requestId, dbClient);
            let targetDate = latestDateStrRaw;
            const todayDateString = formatDate(new Date());

            // If the latest report date is today, shift back one day to compare against the last full day
            if (targetDate === todayDateString) {
                const d = new Date(targetDate);
                d.setDate(d.getDate() - 1);
                targetDate = formatDate(d);
            }

            // Calculate 6 months: start from current month and next 5 (same as backend getBatchFutureOutlook)
            const months = [];
            for (let i = 0; i < 6; i++) {
                const monthDate = new Date(year, month + i, 1);
                const startDate = formatDate(monthDate);
                const lastDayDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
                const endDate = formatDate(lastDayDate);
                months.push({
                    startDate,
                    endDate,
                    monthLabel: formatDateMonth(monthDate)
                });
            }

            // Fetch future outlook data using the same logic as getBatchFutureOutlook
            const futureData = {};
            for (const monthInfo of months) {
                futureData[monthInfo.monthLabel] = {};
                for (const hotelId of hotelIds) {
                    try {
                        const occupationData = await selectOccupationBreakdownByMonth(requestId, hotelId, monthInfo.startDate, monthInfo.endDate, dbClient);
                        const forecastData = await selectForecastData(requestId, hotelId, monthInfo.startDate, monthInfo.endDate, dbClient);
                        const accountingData = await selectAccountingData(requestId, hotelId, monthInfo.startDate, monthInfo.endDate, dbClient);
                        const pmsData = await selectCountReservation(requestId, hotelId, monthInfo.startDate, monthInfo.endDate, dbClient);

                        // Aggregate daily PMS data to monthly
                        let pmsTotalRevenue = 0;
                        if (Array.isArray(pmsData)) {
                            // Use 'price' instead of 'accommodation_price' to include non-accommodation revenue (breakfast, parking, etc.)
                            // to match manual export logic in batch.js
                            pmsTotalRevenue = pmsData.reduce((sum, day) => sum + (Number(day.price) || 0), 0);
                        }

                        futureData[monthInfo.monthLabel][hotelId] = {
                            occupation: occupationData || [],
                            forecast: forecastData || [],
                            accounting: accountingData || [],
                            pms: { revenue: pmsTotalRevenue }
                        };
                    } catch (err) {
                        logger.error(`[${requestId}] Failed for hotel ${hotelId}, month ${monthInfo.monthLabel}. Error: ${err.message}`);
                        futureData[monthInfo.monthLabel][hotelId] = { occupation: [], forecast: [], accounting: [], pms: { revenue: 0 } };
                    }
                }
            }

            // Get previous day data for comparison
            const prevDayData = targetDate ? await selectDailyReportDataByHotel(requestId, targetDate, hotelIds, dbClient) : [];

            const prevByMonth = {};
            if (Array.isArray(prevDayData)) {
                prevDayData.forEach(item => {
                    const mk = formatDateMonth(new Date(item.month));
                    if (!prevByMonth[mk]) prevByMonth[mk] = { sales: 0, stays: 0, rooms: 0 };

                    const dailySales = (Number(item.accommodation_net_sales) || 0) + (Number(item.other_net_sales) || 0) + (Number(item.accommodation_net_sales_cancelled) || 0) + (Number(item.other_net_sales_cancelled) || 0);
                    prevByMonth[mk].sales += dailySales;
                    prevByMonth[mk].stays += Number(item.confirmed_stays) || 0;
                });
            }

            for (const [monthLabel, hotelDataMap] of Object.entries(futureData)) {
                let totalActualSales = 0, totalForecastSales = 0, totalForecastRooms = 0, totalForecastStays = 0;

                let accommodationConfirmedNights = 0;
                let accommodationBookableRoomNights = 0;
                let accommodationBlockedNights = 0;
                let accommodationNetAvailableRoomNights = 0;

                for (const [hotelId, data] of Object.entries(hotelDataMap)) {
                    if (Array.isArray(data.occupation)) {
                        let hotelBookable = 0;
                        let hotelNetAvailable = 0;

                        data.occupation.forEach(row => {
                            // Capture hotel capacity once per hotel (it's repeated on every row)
                            if (hotelBookable === 0 && row.total_bookable_room_nights) {
                                hotelBookable = Number(row.total_bookable_room_nights) || 0;
                                hotelNetAvailable = Number(row.net_available_room_nights) || 0;
                            }

                            if (row.sales_category === 'accommodation') {
                                accommodationConfirmedNights += Number(row.confirmed_nights) || 0;
                                accommodationBlockedNights += Number(row.blocked_nights) || 0;
                            }
                        });

                        accommodationBookableRoomNights += hotelBookable;
                        accommodationNetAvailableRoomNights += hotelNetAvailable;
                    }
                    if (Array.isArray(data.forecast)) {
                        data.forecast.forEach(f => {
                            totalForecastSales += Number(f.accommodation_revenue) || 0;
                            totalForecastRooms += Number(f.available_room_nights) || 0;
                            totalForecastStays += Number(f.rooms_sold_nights) || 0;
                        });
                    }

                    let hotelActualSales = 0;
                    let hasAccounting = false;

                    if (Array.isArray(data.accounting) && data.accounting.length > 0) {
                        let accSum = 0;
                        data.accounting.forEach(a => { accSum += Number(a.accommodation_revenue) || 0; });
                        if (accSum > 0) {
                            hotelActualSales = accSum;
                            hasAccounting = true;
                        }
                    }

                    if (!hasAccounting) {
                        // Fallback to PMS. Note: Backend now aggregates into `pms` key.
                        if (data.pms && typeof data.pms.revenue === 'number') {
                            hotelActualSales = data.pms.revenue;
                        }
                    }

                    totalActualSales += hotelActualSales;
                }

                const occDenominator = totalForecastRooms > 0 ? totalForecastRooms : accommodationNetAvailableRoomNights;
                const actualOccAccommodation = occDenominator > 0 ? (accommodationConfirmedNights / occDenominator) * 100 : 0;
                const forecastOcc = totalForecastRooms > 0 ? (totalForecastStays / totalForecastRooms) * 100 : 0;

                const hasPrevData = !!prevByMonth[monthLabel];
                const prev = prevByMonth[monthLabel] || { sales: 0, stays: 0, rooms: 0 };

                const prevOcc = occDenominator > 0 ? (prev.stays / occDenominator) * 100 : 0;
                const salesDiff = hasPrevData ? totalActualSales - prev.sales : null;

                outlookData.push({
                    metric_date: targetDate,
                    month: monthLabel,
                    forecast_sales: totalForecastSales,
                    sales: totalActualSales,
                    sales_diff: salesDiff,
                    prev_sales: prev.sales,
                    forecast_occ: forecastOcc,
                    occ: actualOccAccommodation,
                    occ_diff: hasPrevData ? actualOccAccommodation - prevOcc : null,
                    prev_occ: prevOcc,
                    prev_confirmed_stays: prev.stays,
                    confirmed_nights: accommodationConfirmedNights,
                    total_bookable_room_nights: accommodationBookableRoomNights,
                    blocked_nights: accommodationBlockedNights,
                    net_available_room_nights: accommodationNetAvailableRoomNights,
                    forecast_stays: totalForecastStays,
                    forecast_rooms: totalForecastRooms
                });
            }
            outlookData.sort((a, b) => a.month.localeCompare(b.month));

            // Calculate KPI data (matching frontend 6-month logic)
            const targetMonths = outlookData.slice(0, 6);
            kpiData = {
                actualADR: targetMonths.map(m => m.confirmed_nights ? Math.round(m.sales / m.confirmed_nights) : 0),
                forecastADR: targetMonths.map(m => m.forecast_stays ? Math.round(m.forecast_sales / m.forecast_stays) : 0),
                actualRevPAR: targetMonths.map(m => {
                    const denom = m.forecast_rooms > 0 ? m.forecast_rooms : m.net_available_room_nights;
                    return denom ? Math.round(m.sales / denom) : 0;
                }),
                forecastRevPAR: targetMonths.map(m => m.forecast_rooms ? Math.round(m.forecast_sales / m.forecast_rooms) : 0)
            };
        } catch (e) {
            logger.error(`[${requestId}] Future Outlook fetch failed:`, e);
            // Continue without outlook data
        }

        // Generate selection message
        const periodStr = formatDateMonth(validatedDate).replace('-', '/');
        const names = revenueData
            .map(item => item.hotel_name)
            .filter(name => name && name !== '施設合計' && name !== 'Unknown Hotel');
        const uniqueNames = [...new Set(names)];
        const selectionMessage = `会計データがない場合はPMSの数値になっています。期間： ${periodStr}。選択中の施設： ${uniqueNames.join(', ')}`;

        logger.debug(`[getFrontendCompatibleReportData] Generated report data - Revenue: ${revenueData.length}, Occupancy: ${occupancyData.length}, Outlook: ${outlookData.length}`);

        return {
            targetDate: formatDate(validatedDate),
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