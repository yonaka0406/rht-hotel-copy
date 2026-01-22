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
        const numMonths = period === 'year' ? 12 : 6;
        const monthsInRange = [];
        for (let i = 0; i < numMonths; i++) {
            const mDate = new Date(year, (period === 'year' ? 0 : month) + i, 1);
            const mKey = formatDateMonth(mDate);
            const sDate = formatDate(mDate);
            const eDate = formatDate(new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0));
            monthsInRange.push({ mKey, sDate, eDate, mDate });
        }

        const startDateStr = monthsInRange[0].sDate;
        const endDateStr = monthsInRange[monthsInRange.length - 1].eDate;

        // Previous Year Dates
        const prevYearDate = new Date(validatedDate);
        prevYearDate.setFullYear(prevYearDate.getFullYear() - 1);

        const prevMonthsInRange = [];
        for (let i = 0; i < numMonths; i++) {
            const mDate = new Date(prevYearDate.getFullYear(), (period === 'year' ? 0 : month) + i, 1);
            const mKey = formatDateMonth(mDate);
            const sDate = formatDate(mDate);
            const eDate = formatDate(new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0));
            prevMonthsInRange.push({ mKey, sDate, eDate, mDate });
        }

        const prevStartDateStr = prevMonthsInRange[0].sDate;
        const prevEndDateStr = prevMonthsInRange[prevMonthsInRange.length - 1].eDate;

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
                    confirmed_accommodation_revenue: item.confirmed_accommodation_price !== undefined ? Number(item.confirmed_accommodation_price) : 0,
                    provisory_accommodation_revenue: item.provisory_accommodation_price !== undefined ? Number(item.provisory_accommodation_price) : 0,
                    other_revenue: item.other_price !== undefined ? Number(item.other_price) : 0,
                    room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                    confirmed_room_count: item.confirmed_room_count !== undefined ? Number(item.confirmed_room_count) : 0,
                    provisory_room_count: item.provisory_room_count !== undefined ? Number(item.provisory_room_count) : 0,
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
                    confirmed_accommodation_revenue: item.confirmed_accommodation_price !== undefined ? Number(item.confirmed_accommodation_price) : 0,
                    provisory_accommodation_revenue: item.provisory_accommodation_price !== undefined ? Number(item.provisory_accommodation_price) : 0,
                    other_revenue: item.other_price !== undefined ? Number(item.other_price) : 0,
                    room_count: item.room_count !== undefined ? Number(item.room_count) : 0,
                    confirmed_room_count: item.confirmed_room_count !== undefined ? Number(item.confirmed_room_count) : 0,
                    provisory_room_count: item.provisory_room_count !== undefined ? Number(item.provisory_room_count) : 0,
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
        // Initialize monthly aggregates (same as frontend - use null for initial values)
        const monthlyAggregates = {};
        monthsInRange.forEach(m => {
            monthlyAggregates[m.mKey] = {};
            monthlyAggregates[m.mKey]['0'] = {
                pms_revenue: null,
                pms_accommodation_revenue: null,
                pms_confirmed_accommodation_revenue: null,
                pms_provisory_accommodation_revenue: null,
                pms_other_revenue: null,
                forecast_revenue: null,
                acc_revenue: null
            };

            hotelIds.forEach(hotelId => {
                monthlyAggregates[m.mKey][String(hotelId)] = {
                    pms_revenue: null,
                    pms_accommodation_revenue: null,
                    pms_confirmed_accommodation_revenue: null,
                    pms_provisory_accommodation_revenue: null,
                    pms_other_revenue: null,
                    forecast_revenue: null,
                    acc_revenue: null
                };
            });
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
                                    if (typeof record.confirmed_accommodation_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_confirmed_accommodation_revenue === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_confirmed_accommodation_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_confirmed_accommodation_revenue += record.confirmed_accommodation_revenue;
                                    }
                                    if (typeof record.provisory_accommodation_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_provisory_accommodation_revenue === null) {
                                            monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_provisory_accommodation_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey][stringHotelIdKey].pms_provisory_accommodation_revenue += record.provisory_accommodation_revenue;
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
                                    if (typeof record.confirmed_accommodation_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey]['0'].pms_confirmed_accommodation_revenue === null) {
                                            monthlyAggregates[recordMonthKey]['0'].pms_confirmed_accommodation_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey]['0'].pms_confirmed_accommodation_revenue += record.confirmed_accommodation_revenue;
                                    }
                                    if (typeof record.provisory_accommodation_revenue === 'number') {
                                        if (monthlyAggregates[recordMonthKey]['0'].pms_provisory_accommodation_revenue === null) {
                                            monthlyAggregates[recordMonthKey]['0'].pms_provisory_accommodation_revenue = 0;
                                        }
                                        monthlyAggregates[recordMonthKey]['0'].pms_provisory_accommodation_revenue += record.provisory_accommodation_revenue;
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
                const pmsConfirmedAccommodationRev = aggregatedMonthData.pms_confirmed_accommodation_revenue;
                const pmsProvisoryAccommodationRev = aggregatedMonthData.pms_provisory_accommodation_revenue;
                const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
                const forecastRev = aggregatedMonthData.forecast_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                // Prioritize accounting revenue if available, otherwise use PMS (same as frontend)
                let periodRev = (accRev !== null) ? accRev : (pmsRev || 0);
                let accommodationRev = (accRev !== null) ? accRev : (pmsAccommodationRev || 0);
                let confirmedAccommodationRev = (accRev !== null) ? accRev : (pmsConfirmedAccommodationRev || 0);
                let provisoryAccommodationRev = (accRev !== null) ? 0 : (pmsProvisoryAccommodationRev || 0);
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
                    confirmed_accommodation_revenue: confirmedAccommodationRev,
                    provisory_accommodation_revenue: provisoryAccommodationRev,
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
        // Build monthly occupancy aggregates (same as frontend)
        const monthlyOccupancyAggregates = {};
        monthsInRange.forEach(m => {
            monthlyOccupancyAggregates[m.mKey] = {};
            monthlyOccupancyAggregates[m.mKey]['0'] = {
                total_rooms: 0,
                sold_rooms: 0,
                confirmed_sold_rooms: 0,
                provisory_sold_rooms: 0,
                non_accommodation_stays: 0,
                roomDifferenceSum: 0,
                fc_total_rooms: 0,
                fc_sold_rooms: 0
            };

            // Initialize aggregates for each hotel (same as frontend)
            hotelIds.forEach(hotelId => {
                const hotel = allHotels.find(h => h.id === hotelId);
                let physicalRooms = (hotel && typeof hotel.total_rooms === 'number') ? hotel.total_rooms : 0;
                let effectiveDaysForHotelInMonth = getDaysInMonth(m.mDate.getFullYear(), m.mDate.getMonth() + 1);

                if (hotel && hotel.open_date) {
                    const openDate = normalizeDate(new Date(hotel.open_date));
                    const firstDayOfM = normalizeDate(new Date(m.mDate.getFullYear(), m.mDate.getMonth(), 1));
                    const lastDayOfM = normalizeDate(new Date(m.mDate.getFullYear(), m.mDate.getMonth() + 1, 0));

                    if (openDate && !isNaN(openDate.getTime())) {
                        if (openDate > lastDayOfM) effectiveDaysForHotelInMonth = 0;
                        else if (openDate > firstDayOfM) effectiveDaysForHotelInMonth = lastDayOfM.getDate() - openDate.getDate() + 1;
                    }
                }
                effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
                const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;

                monthlyOccupancyAggregates[m.mKey]['0'].total_rooms += monthlyAvailableRoomDays;
                monthlyOccupancyAggregates[m.mKey][String(hotelId)] = {
                    total_rooms: monthlyAvailableRoomDays,
                    sold_rooms: 0,
                    confirmed_sold_rooms: 0,
                    provisory_sold_rooms: 0,
                    non_accommodation_stays: 0,
                    roomDifferenceSum: 0,
                    fc_total_rooms: 0,
                    fc_sold_rooms: 0
                };
            });
        });

        // Process PMS data for sold rooms (same as frontend)
        for (const stringHotelIdKey in pmsTotalData) {
            const pmsRecords = pmsTotalData[stringHotelIdKey];
            if (Array.isArray(pmsRecords)) {
                pmsRecords.forEach(record => {
                    if (record && record.date && typeof record.room_count === 'number') {
                        const recordMonthKey = formatDateMonth(new Date(record.date));
                        if (monthlyOccupancyAggregates[recordMonthKey]) {
                            if (monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].confirmed_sold_rooms += (record.confirmed_room_count || 0);
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].provisory_sold_rooms += (record.provisory_room_count || 0);
                            }
                            if (monthlyOccupancyAggregates[recordMonthKey]['0']) {
                                monthlyOccupancyAggregates[recordMonthKey]['0'].sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[recordMonthKey]['0'].confirmed_sold_rooms += (record.confirmed_room_count || 0);
                                monthlyOccupancyAggregates[recordMonthKey]['0'].provisory_sold_rooms += (record.provisory_room_count || 0);
                            }
                            if (monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey] && typeof record.non_accommodation_stays === 'number') {
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].non_accommodation_stays += record.non_accommodation_stays;
                            }
                            if (monthlyOccupancyAggregates[recordMonthKey]['0'] && typeof record.non_accommodation_stays === 'number') {
                                monthlyOccupancyAggregates[recordMonthKey]['0'].non_accommodation_stays += record.non_accommodation_stays;
                            }
                        }
                    }
                    if (record && record.date && typeof record.total_rooms === 'number' && typeof record.total_rooms_real === 'number') {
                        const recordMonthKey = formatDateMonth(new Date(record.date));
                        if (monthlyOccupancyAggregates[recordMonthKey]) {
                            const difference = record.total_rooms_real - record.total_rooms;
                            if (monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].roomDifferenceSum += difference;
                            }
                            if (monthlyOccupancyAggregates[recordMonthKey]['0']) {
                                monthlyOccupancyAggregates[recordMonthKey]['0'].roomDifferenceSum += difference;
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
                        if (monthlyOccupancyAggregates[recordMonthKey]) {
                            if (monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey]) {
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].fc_sold_rooms += record.room_count;
                                monthlyOccupancyAggregates[recordMonthKey][stringHotelIdKey].fc_total_rooms += record.total_rooms;
                            }
                            if (monthlyOccupancyAggregates[recordMonthKey]['0']) {
                                monthlyOccupancyAggregates[recordMonthKey]['0'].fc_total_rooms += record.total_rooms;
                                monthlyOccupancyAggregates[recordMonthKey]['0'].fc_sold_rooms += record.room_count;
                            }
                        }
                    }
                });
            }
        }

        // Calculate detailed room availability (same as frontend)
        for (const monthKeyInRange in monthlyOccupancyAggregates) {
            const monthData = monthlyOccupancyAggregates[monthKeyInRange];
            const [yStr, mStr] = monthKeyInRange.split('-');
            const yearLoop = parseInt(yStr, 10);
            const monthLoop = parseInt(mStr, 10) - 1;
            const daysInMonthLoop = getDaysInMonth(yearLoop, monthLoop + 1);

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
                    pmsRecord => formatDateMonth(new Date(pmsRecord.date)) === monthKeyInRange
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

                for (let day = 1; day <= daysInMonthLoop; day++) {
                    const dateForDay = new Date(yearLoop, monthLoop, day);
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

            // Create occupancy data array for this month (same logic as frontend)
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
                    logger.warn(`[getFrontendCompatibleReportData] Total occupancy calculation for ${monthKeyInRange}:`, {
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
                            month: monthKeyInRange,
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


        // Generate previous year data (matching frontend logic)
        const prevYearRevenueData = [];
        const prevYearOccupancyData = [];

        // Build previous year revenue data (same logic as frontend prevYearRevenueData computed)
        const prevYearMonthlyAggregates = {};
        const prevYearMonthlyTotalAggregates = {};

        // Initialize aggregates for the previous year month range
        prevMonthsInRange.forEach(m => {
            const mKey = m.mKey;
            prevYearMonthlyAggregates[mKey] = {};
            prevYearMonthlyTotalAggregates[mKey] = {
                period_revenue: 0,
                accommodation_revenue: 0,
                other_revenue: 0,
                pms_revenue: 0
            };

            hotelIds.forEach(hotelId => {
                prevYearMonthlyAggregates[mKey][String(hotelId)] = {
                    pms_revenue: null,
                    pms_accommodation_revenue: null,
                    pms_other_revenue: null,
                    acc_revenue: null
                };
            });
        });

        // Aggregate previous year PMS data
        for (const stringHotelIdKey in prevYearPmsTotalData) {
            const hotelDataArray = prevYearPmsTotalData[stringHotelIdKey];
            if (Array.isArray(hotelDataArray)) {
                hotelDataArray.forEach(record => {
                    if (record && record.date) {
                        const monthKey = formatDateMonth(new Date(record.date));
                        if (prevYearMonthlyAggregates[monthKey]) {
                            if (prevYearMonthlyAggregates[monthKey][stringHotelIdKey]) {
                                if (typeof record.revenue === 'number') {
                                    if (prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_revenue === null) {
                                        prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_revenue = 0;
                                    }
                                    prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_revenue += record.revenue;
                                }
                                if (typeof record.accommodation_revenue === 'number') {
                                    if (prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue === null) {
                                        prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue = 0;
                                    }
                                    prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_accommodation_revenue += record.accommodation_revenue;
                                }
                                if (typeof record.other_revenue === 'number') {
                                    if (prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue === null) {
                                        prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue = 0;
                                    }
                                    prevYearMonthlyAggregates[monthKey][stringHotelIdKey].pms_other_revenue += record.other_revenue;
                                }
                            }
                        }
                    }
                });
            }
        }

        // Aggregate previous year accounting data
        for (const stringHotelIdKey in prevYearAccountingTotalData) {
            const hotelDataArray = prevYearAccountingTotalData[stringHotelIdKey];
            if (Array.isArray(hotelDataArray)) {
                hotelDataArray.forEach(record => {
                    if (record && record.date && typeof record.revenue === 'number') {
                        const monthKey = formatDateMonth(new Date(record.date));
                        if (prevYearMonthlyAggregates[monthKey]) {
                            if (prevYearMonthlyAggregates[monthKey][stringHotelIdKey]) {
                                if (prevYearMonthlyAggregates[monthKey][stringHotelIdKey].acc_revenue === null) {
                                    prevYearMonthlyAggregates[monthKey][stringHotelIdKey].acc_revenue = 0;
                                }
                                prevYearMonthlyAggregates[monthKey][stringHotelIdKey].acc_revenue += record.revenue;
                            }
                        }
                    }
                });
            }
        }

        // Build previous year revenue data array (matching frontend logic)
        Object.keys(prevYearMonthlyAggregates).sort().forEach(monthKey => {
            const monthData = prevYearMonthlyAggregates[monthKey];

            for (const hotelIdStringKey in monthData) {
                const outputHotelId = hotelIdStringKey === '0' ? 0 : parseInt(hotelIdStringKey, 10);
                const aggregatedMonthData = monthData[hotelIdStringKey];
                const pmsRev = aggregatedMonthData.pms_revenue;
                const pmsAccommodationRev = aggregatedMonthData.pms_accommodation_revenue;
                const pmsOtherRev = aggregatedMonthData.pms_other_revenue;
                const accRev = aggregatedMonthData.acc_revenue;
                const hotelName = searchAllHotels(outputHotelId)[0]?.name || 'Unknown Hotel';

                // Match frontend logic: accounting revenue takes priority for accommodation
                let otherRev = (pmsOtherRev || 0);
                let accommodationRev = (accRev !== null && accRev > 0) ? accRev : (pmsAccommodationRev || 0);
                let periodRev = accommodationRev + otherRev;

                // Accumulate totals
                prevYearMonthlyTotalAggregates[monthKey].period_revenue += periodRev;
                prevYearMonthlyTotalAggregates[monthKey].accommodation_revenue += accommodationRev;
                prevYearMonthlyTotalAggregates[monthKey].other_revenue += otherRev;
                prevYearMonthlyTotalAggregates[monthKey].pms_revenue += (pmsRev || 0);

                // Calculate current year month for reference
                const [y, m] = monthKey.split('-');
                const currentYearMonth = `${parseInt(y) + 1}-${m}`;

                prevYearRevenueData.push({
                    month: monthKey,
                    current_year_month: currentYearMonth,
                    hotel_id: outputHotelId,
                    hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.get(outputHotelId) ?? 999,
                    pms_revenue: pmsRev,
                    acc_revenue: accRev,
                    period_revenue: periodRev,
                    accommodation_revenue: accommodationRev,
                    other_revenue: otherRev,
                });
            }

            // Add facility total (施設合計)
            const totals = prevYearMonthlyTotalAggregates[monthKey];
            const [y, m] = monthKey.split('-');
            const currentYearMonth = `${parseInt(y) + 1}-${m}`;
            prevYearRevenueData.push({
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

        // Sort previous year revenue data (same as frontend)
        prevYearRevenueData.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });


        logger.debug(`[getFrontendCompatibleReportData] Generated ${prevYearRevenueData.length} previous year revenue records`);

        // Generate previous year occupancy data (matching frontend logic)
        const prevYearMonthlyOccupancyAggregates = {};
        const prevYearOccupancyTotals = {};

        // Calculate total_rooms for each hotel (matching frontend logic)
        prevMonthsInRange.forEach(m => {
            const mKey = m.mKey;
            prevYearMonthlyOccupancyAggregates[mKey] = {};
            prevYearOccupancyTotals[mKey] = { total_rooms: 0, sold_rooms: 0 };

            const yearP = m.mDate.getFullYear();
            const monthP = m.mDate.getMonth();
            const daysInMonthP = getDaysInMonth(yearP, monthP + 1);
            const firstDayOfM = normalizeDate(new Date(yearP, monthP, 1));
            const lastDayOfM = normalizeDate(new Date(yearP, monthP, daysInMonthP));

            hotelIds.forEach(hotelId => {
                const hotel = allHotels.find(h => h.id === hotelId);
                let physicalRooms = (hotel && typeof hotel.total_rooms === 'number') ? hotel.total_rooms : 0;
                let effectiveDaysForHotelInMonth = daysInMonthP;

                // Consider hotel open date (shift to previous year)
                if (hotel && hotel.open_date) {
                    const openDate = normalizeDate(new Date(hotel.open_date));
                    if (openDate && !isNaN(openDate.getTime())) {
                        // If hotel opened after the month ended, 0 days
                        if (openDate > lastDayOfM) {
                            effectiveDaysForHotelInMonth = 0;
                        }
                        // If hotel opened during the month, calculate days from open date to month end
                        else if (openDate > firstDayOfM) {
                            effectiveDaysForHotelInMonth = lastDayOfM.getDate() - openDate.getDate() + 1;
                        }
                    }
                }

                effectiveDaysForHotelInMonth = Math.max(0, effectiveDaysForHotelInMonth);
                const monthlyAvailableRoomDays = physicalRooms * effectiveDaysForHotelInMonth;

                prevYearMonthlyOccupancyAggregates[mKey][String(hotelId)] = {
                    total_rooms: monthlyAvailableRoomDays,
                    sold_rooms: 0
                };
            });
        });

        // Aggregate sold rooms from previous year PMS data
        for (const stringHotelIdKey in prevYearPmsTotalData) {
            const pmsRecords = prevYearPmsTotalData[stringHotelIdKey];
            if (Array.isArray(pmsRecords)) {
                pmsRecords.forEach(record => {
                    if (record && record.date) {
                        const recordDateObj = normalizeDate(new Date(record.date));
                        if (!recordDateObj) return;
                        const monthKey = formatDateMonth(recordDateObj);

                        if (prevYearMonthlyOccupancyAggregates[monthKey] && prevYearMonthlyOccupancyAggregates[monthKey][stringHotelIdKey]) {
                            if (record.room_count !== undefined) {
                                prevYearMonthlyOccupancyAggregates[monthKey][stringHotelIdKey].sold_rooms += Number(record.room_count) || 0;
                            }
                        }
                    }
                });
            }
        }

        // Build previous year occupancy data array (matching frontend logic)
        Object.keys(prevYearMonthlyOccupancyAggregates).sort().forEach(monthKey => {
            const monthData = prevYearMonthlyOccupancyAggregates[monthKey];
            const totals = prevYearOccupancyTotals[monthKey];

            for (const hotelId in monthData) {
                const data = monthData[hotelId];
                const total_rooms = data.total_rooms || 0;
                const occupancyRate = total_rooms > 0 ? (data.sold_rooms / total_rooms) * 100 : 0;
                const parsedHotelId = parseInt(hotelId, 10);
                const hotelName = searchAllHotels(parsedHotelId)[0]?.name || 'Unknown Hotel';

                // Accumulate totals
                totals.total_rooms += total_rooms;
                totals.sold_rooms += data.sold_rooms;

                prevYearOccupancyData.push({
                    month: monthKey,
                    hotel_id: parsedHotelId,
                    hotel_name: hotelName,
                    sort_order: hotelSortOrderMap.get(parsedHotelId) ?? 999,
                    sold_rooms: data.sold_rooms,
                    total_rooms: total_rooms,
                    occ: parseFloat(occupancyRate.toFixed(2))
                });
            }

            // Add facility total (施設合計)
            const totalOcc = totals.total_rooms > 0 ? (totals.sold_rooms / totals.total_rooms) * 100 : 0;
            prevYearOccupancyData.push({
                month: monthKey,
                hotel_id: 0,
                hotel_name: '施設合計',
                sort_order: -1,
                sold_rooms: totals.sold_rooms,
                total_rooms: totals.total_rooms,
                occ: parseFloat(totalOcc.toFixed(2))
            });
        });

        // Sort previous year occupancy data (same as frontend)
        prevYearOccupancyData.sort((a, b) => {
            const orderA = a.sort_order ?? 999;
            const orderB = b.sort_order ?? 999;
            if (orderA !== orderB) return orderA - orderB;
            if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
            return Number(a.hotel_id) - Number(b.hotel_id);
        });

        logger.debug(`[getFrontendCompatibleReportData] Generated ${prevYearOccupancyData.length} previous year occupancy records`);

        // Generate future outlook data (matching frontend logic exactly)
        const outlookData = [];
        let kpiData = { actualADR: [], forecastADR: [], actualRevPAR: [], forecastRevPAR: [] };

        logger.warn(`[${requestId}] Starting outlook data generation...`);

        try {
            const latestDateStrRaw = await selectLatestDailyReportDate(requestId, dbClient);
            let outlookTargetDate = latestDateStrRaw;
            const todayDateString = formatDate(new Date());

            logger.warn(`[${requestId}] Latest date: ${latestDateStrRaw}, Today: ${todayDateString}`);

            // If the latest report date is today, shift back one day to compare against the last full day
            if (outlookTargetDate === todayDateString) {
                const d = new Date(outlookTargetDate);
                d.setDate(d.getDate() - 1);
                outlookTargetDate = formatDate(d);
            }

            logger.warn(`[${requestId}] Target date for outlook: ${outlookTargetDate}`);

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
                        let pmsAccommodationRevenue = 0;
                        let pmsProvisoryRevenue = 0;
                        let pmsProvisoryRoomCount = 0;
                        if (Array.isArray(pmsData)) {
                            pmsTotalRevenue = pmsData.reduce((sum, day) => sum + (Number(day.price) || 0), 0);
                            pmsAccommodationRevenue = pmsData.reduce((sum, day) => sum + (Number(day.accommodation_price) || 0), 0);
                            pmsProvisoryRevenue = pmsData.reduce((sum, day) => sum + (Number(day.provisory_accommodation_price) || 0) + (Number(day.provisory_other_price) || 0), 0);
                            pmsProvisoryRoomCount = pmsData.reduce((sum, day) => sum + (Number(day.provisory_room_count) || 0), 0);

                            if (hotelId === '35') logger.warn(`[${requestId}] Hotel ${hotelId}, Month ${monthInfo.monthLabel}: PMS Total=${pmsTotalRevenue}, Acc=${pmsAccommodationRevenue}, Provisory=${pmsProvisoryRevenue}`);
                        }

                        futureData[monthInfo.monthLabel][hotelId] = {
                            occupation: occupationData || [],
                            forecast: forecastData || [],
                            accounting: accountingData || [],
                            pms: {
                                revenue: pmsTotalRevenue,
                                accommodation_revenue: pmsAccommodationRevenue,
                                provisory_revenue: pmsProvisoryRevenue,
                                provisory_room_count: pmsProvisoryRoomCount
                            }
                        };
                    } catch (err) {
                        logger.error(`[${requestId}] Failed for hotel ${hotelId}, month ${monthInfo.monthLabel}. Error: ${err.message}`);
                        futureData[monthInfo.monthLabel][hotelId] = {
                            occupation: [],
                            forecast: [],
                            accounting: [],
                            pms: { revenue: 0, confirmed_revenue: 0, provisory_revenue: 0 }
                        };
                    }
                }
            }

            // Get previous day data for comparison
            const prevDayData = outlookTargetDate ? await selectDailyReportDataByHotel(requestId, outlookTargetDate, hotelIds, dbClient) : [];

            const prevByMonth = {};
            if (Array.isArray(prevDayData)) {
                prevDayData.forEach(item => {
                    const mk = formatDateMonth(new Date(item.month));
                    if (!prevByMonth[mk]) prevByMonth[mk] = { sales: 0, sales_with_provisory: 0, stays: 0, rooms: 0 };

                    // Match frontend logic: only accommodation sales (exclude other_net_sales)
                    const dailySales = (Number(item.accommodation_net_sales) || 0) + (Number(item.accommodation_net_sales_cancelled) || 0);
                    const provisorySales = (Number(item.accommodation_net_sales_provisory) || 0) + (Number(item.other_net_sales_provisory) || 0);

                    prevByMonth[mk].sales += dailySales;
                    prevByMonth[mk].sales_with_provisory += dailySales + provisorySales;
                    prevByMonth[mk].stays += Number(item.confirmed_stays) || 0;
                });
            }

            for (const [monthLabel, hotelDataMap] of Object.entries(futureData)) {
                let totalActualSales = 0;
                let totalActualSalesWithProvisory = 0;
                let totalForecastSales = 0;
                let totalForecastRooms = 0;
                let totalForecastStays = 0;

                console.log(`[${requestId}] Processing month ${monthLabel}, initializing totalActualSalesWithProvisory=0`);

                let accommodationConfirmedNights = 0;
                let accommodationProvisoryNights = 0;
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
                                accommodationProvisoryNights += Number(row.provisory_nights) || 0;
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
                    let hotelActualSalesWithProvisory = 0;
                    let hasAccounting = false;

                    if (hotelId === '35') console.log(`[${requestId}] Month ${monthLabel}, Hotel ${hotelId}: data.accounting exists=${!!data.accounting}, length=${data.accounting?.length}, data.pms exists=${!!data.pms}`);

                    if (Array.isArray(data.accounting) && data.accounting.length > 0) {
                        let accSum = 0;
                        data.accounting.forEach(a => { accSum += Number(a.accommodation_revenue) || 0; });
                        if (accSum > 0) {
                            hotelActualSales = accSum;
                            // Accounting data doesn't separate provisory, so add provisory revenue from PMS
                            const provisoryRevenue = (data.pms && Number(data.pms.provisory_revenue)) || 0;
                            hotelActualSalesWithProvisory = accSum + provisoryRevenue;
                            hasAccounting = true;

                            if (hotelId === '35') logger.warn(`[${requestId}] Month ${monthLabel}, Hotel ${hotelId}: Using ACCOUNTING data, Sales=${hotelActualSales}, Provisory=${provisoryRevenue}, SalesWithProvisory=${hotelActualSalesWithProvisory}`);
                        }
                    }

                    if (!hasAccounting) {
                        // Fallback to PMS. Use accommodation_revenue (Net Accommodation Sales) for sales,
                        // matching the logic for budget comparison.
                        if (data.pms) {
                            const accRev = Number(data.pms.accommodation_revenue) || 0;
                            const provisoryRev = Number(data.pms.provisory_revenue) || 0;

                            hotelActualSales = accRev;
                            hotelActualSalesWithProvisory = accRev + provisoryRev;

                            if (hotelId === '35') logger.warn(`[${requestId}] Month ${monthLabel}, Hotel ${hotelId}: Using PMS data, Sales(Net Acc)=${hotelActualSales}, SalesWithProvisory=${hotelActualSalesWithProvisory}, PMS.acc_rev=${data.pms.accommodation_revenue}, PMS.provisory=${data.pms.provisory_revenue}`);
                        } else {
                            if (hotelId === '35') logger.warn(`[${requestId}] Month ${monthLabel}, Hotel ${hotelId}: NO DATA - data.pms is null/undefined`);
                        }
                    }

                    totalActualSales += hotelActualSales;
                    totalActualSalesWithProvisory += hotelActualSalesWithProvisory;

                    if (hotelId === '35') console.log(`[${requestId}] Month ${monthLabel}, Hotel ${hotelId}: hotelActualSales=${hotelActualSales}, hotelActualSalesWithProvisory=${hotelActualSalesWithProvisory}, totalActualSalesWithProvisory=${totalActualSalesWithProvisory}`);
                }

                const occDenominator = totalForecastRooms > 0 ? totalForecastRooms : accommodationNetAvailableRoomNights;
                const actualOccAccommodation = occDenominator > 0 ? (accommodationConfirmedNights / occDenominator) * 100 : 0;
                const actualOccWithProvisory = occDenominator > 0 ? ((accommodationConfirmedNights + accommodationProvisoryNights) / occDenominator) * 100 : 0;
                const forecastOcc = totalForecastRooms > 0 ? (totalForecastStays / totalForecastRooms) * 100 : 0;

                const hasPrevData = !!prevByMonth[monthLabel];
                const prev = prevByMonth[monthLabel] || { sales: 0, sales_with_provisory: 0, stays: 0, rooms: 0 };

                const prevOcc = occDenominator > 0 ? (prev.stays / occDenominator) * 100 : 0;
                const salesDiff = hasPrevData ? totalActualSales - prev.sales : null;

                console.log(`[${requestId}] Month ${monthLabel} TOTALS BEFORE PUSH: sales=${totalActualSales}, sales_with_provisory=${totalActualSalesWithProvisory}, typeof=${typeof totalActualSalesWithProvisory}, confirmed_nights=${accommodationConfirmedNights}, provisory_nights=${accommodationProvisoryNights}`);

                const outlookItem = {
                    metric_date: outlookTargetDate,
                    month: monthLabel,
                    forecast_sales: totalForecastSales,
                    sales: totalActualSales,
                    sales_with_provisory: totalActualSalesWithProvisory,
                    sales_diff: salesDiff,
                    prev_sales: prev.sales,
                    forecast_occ: forecastOcc,
                    occ: actualOccAccommodation,
                    occ_with_provisory: actualOccWithProvisory,
                    occ_diff: hasPrevData ? actualOccAccommodation - prevOcc : null,
                    prev_occ: prevOcc,
                    prev_confirmed_stays: prev.stays,
                    confirmed_nights: accommodationConfirmedNights,
                    confirmed_nights_with_provisory: accommodationConfirmedNights + accommodationProvisoryNights,
                    total_bookable_room_nights: accommodationBookableRoomNights,
                    blocked_nights: accommodationBlockedNights,
                    net_available_room_nights: accommodationNetAvailableRoomNights,
                    forecast_stays: totalForecastStays,
                    forecast_rooms: totalForecastRooms
                };

                console.log(`[${requestId}] Month ${monthLabel} outlookItem created:`, JSON.stringify(outlookItem));

                outlookData.push(outlookItem);
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

        // Debug: Log all outlook items with sales_with_provisory
        if (outlookData.length > 0) {
            console.log(`[getFrontendCompatibleReportData] First outlook item:`, JSON.stringify(outlookData[0]));
            outlookData.forEach((item, idx) => {
                console.log(`[getFrontendCompatibleReportData] outlookData[${idx}]: month=${item.month}, sales=${item.sales}, sales_with_provisory=${item.sales_with_provisory}`);
            });
        }

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