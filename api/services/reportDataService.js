const { selectForecastData, selectAccountingData, selectCountReservation, selectDailyReportDataByHotel, selectLatestDailyReportDate } = require('../models/report');
const database = require('../config/database');
const { formatDate } = require('../utils/reportUtils');
const logger = require('../config/logger');

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
 * Fetch and aggregate monthly summary data for a given date.
 * Replicates the logic from ReportingSalesAndOCC.vue
 * 
 * @param {string} requestId 
 * @param {Date} targetDate 
 */
const getMonthlySummaryData = async (requestId, targetDate, dbClient = null) => {
    const client = dbClient || await database.getPool(requestId).connect();

    try {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();

        // Calculate date ranges
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const firstDayOfYear = new Date(year, 0, 1);
        const lastDayOfYear = new Date(year, 11, 31);

        const startDateStr = formatDate(firstDayOfMonth);
        const endDateStr = formatDate(lastDayOfMonth);
        const yearStartDateStr = formatDate(firstDayOfYear);
        const yearEndDateStr = formatDate(lastDayOfYear);

        // Previous Year Dates
        const prevYearDate = new Date(targetDate);
        prevYearDate.setFullYear(prevYearDate.getFullYear() - 1);
        const prevYearFirstDay = new Date(prevYearDate.getFullYear(), month, 1);
        const prevYearLastDay = new Date(prevYearDate.getFullYear(), month + 1, 0);
        const prevStartDateStr = formatDate(prevYearFirstDay);
        const prevEndDateStr = formatDate(prevYearLastDay);

        // Fetch Hotels
        const allHotelsResult = await client.query('SELECT id, name, total_rooms, open_date FROM hotels ORDER BY sort_order');
        const allHotels = allHotelsResult.rows;
        const hotelIds = allHotels.map(h => h.id);
        logger.debug(`[getMonthlySummaryData] Fetched ${allHotels.length} hotels.`);

        // --- Fetch Data ---

        // Helper for independent hotel fetches
        const fetchAllHotelsData = async (fetchMethod, sDate, eDate) => {
            const results = await Promise.all(hotelIds.map(async (hid) => {
                const data = await fetchMethod(requestId, hid, sDate, eDate, client);
                return { hotelId: hid, data };
            }));
            // Flatten or map to expected structure
            return results;
        };

        const [
            pmsDataResults,
            forecastDataResults,
            accountingDataResults,

            // Previous Year
            prevPmsDataResults,
            prevAccountingDataResults
        ] = await Promise.all([
            fetchAllHotelsData(selectCountReservation, startDateStr, endDateStr),
            fetchAllHotelsData(selectForecastData, startDateStr, endDateStr),
            fetchAllHotelsData(selectAccountingData, startDateStr, endDateStr),

            fetchAllHotelsData(selectCountReservation, prevStartDateStr, prevEndDateStr),
            fetchAllHotelsData(selectAccountingData, prevStartDateStr, prevEndDateStr)
        ]);

        // Transform results into the structure expected by the PDF generator (similar to frontend 'pmsTotalData' etc.)
        const transformToMap = (results) => {
            const map = {};
            results.forEach(r => {
                map[String(r.hotelId)] = r.data || [];
            });
            return map;
        };

        const pmsTotalData = transformToMap(pmsDataResults);
        const forecastTotalData = transformToMap(forecastDataResults);
        const accountingTotalData = transformToMap(accountingDataResults);

        logger.debug(`[getMonthlySummaryData] Raw Summary: PMS=${Object.keys(pmsTotalData).length}, Forecast=${Object.keys(forecastTotalData).length}, Acc=${Object.keys(accountingTotalData).length}`);
        const prevPmsTotalData = transformToMap(prevPmsDataResults);
        const prevAccountingTotalData = transformToMap(prevAccountingDataResults);

        // --- Aggregation Logic (Ported from Frontend) ---

        // 1. Revenue Data
        const revenueData = [];
        const monthKey = formatDateMonth(targetDate);

        // Initialize aggregate object (Hotel ID -> Data)
        const hotelRevenueMap = {};
        allHotels.forEach(h => {
            hotelRevenueMap[h.id] = {
                hotel_name: h.name,
                pms_revenue: 0, pms_accommodation_revenue: 0, pms_other_revenue: 0,
                forecast_revenue: 0, acc_revenue: null
            };
        });
        // Add '0' for Total
        hotelRevenueMap['0'] = {
            hotel_name: '施設合計',
            pms_revenue: 0, pms_accommodation_revenue: 0, pms_other_revenue: 0,
            forecast_revenue: 0, acc_revenue: null // null indicates no accounting data found yet
        };

        const aggregateRevenue = (sourceDataMap, key) => {
            for (const [sHotelId, data] of Object.entries(sourceDataMap)) {
                if (!Array.isArray(data)) continue;
                data.forEach(record => {
                    const rDate = new Date(record.date || record.forecast_month || record.accounting_month);
                    if (formatDateMonth(rDate) !== monthKey) return;

                    let val = 0;
                    let accVal = 0;
                    let othVal = 0;

                    if (key === 'pms_revenue') {
                        val = Number(record.price) || 0;
                        accVal = Number(record.accommodation_price) || 0;
                        othVal = Number(record.other_price) || 0;
                    } else {
                        // Forecast and Accounting
                        accVal = Number(record.accommodation_revenue) || 0;
                        othVal = Number(record.non_accommodation_revenue) || 0;
                        val = accVal + othVal;
                    }

                    if (hotelRevenueMap[sHotelId]) {
                        if (key === 'pms_revenue') {
                            hotelRevenueMap[sHotelId].pms_revenue += val;
                            hotelRevenueMap[sHotelId].pms_accommodation_revenue += accVal;
                            hotelRevenueMap[sHotelId].pms_other_revenue += othVal;
                        } else if (key === 'forecast_revenue') {
                            hotelRevenueMap[sHotelId].forecast_revenue += val;
                        } else if (key === 'acc_revenue') {
                            if (hotelRevenueMap[sHotelId].acc_revenue === null) hotelRevenueMap[sHotelId].acc_revenue = 0;
                            hotelRevenueMap[sHotelId].acc_revenue += val;
                        }
                    }

                    // Total
                    if (hotelRevenueMap['0']) {
                        if (key === 'pms_revenue') {
                            hotelRevenueMap['0'].pms_revenue += val;
                            hotelRevenueMap['0'].pms_accommodation_revenue += accVal;
                            hotelRevenueMap['0'].pms_other_revenue += othVal;
                        } else if (key === 'forecast_revenue') {
                            hotelRevenueMap['0'].forecast_revenue += val;
                        } else if (key === 'acc_revenue') {
                            if (hotelRevenueMap['0'].acc_revenue === null) hotelRevenueMap['0'].acc_revenue = 0;
                            hotelRevenueMap['0'].acc_revenue += val;
                        }
                    }
                });
            }
        };

        aggregateRevenue(pmsTotalData, 'pms_revenue');
        aggregateRevenue(forecastTotalData, 'forecast_revenue');
        aggregateRevenue(accountingTotalData, 'acc_revenue');

        for (const [hId, d] of Object.entries(hotelRevenueMap)) {
            const periodRev = (d.acc_revenue !== null) ? d.acc_revenue : d.pms_revenue;
            const accommodationRev = (d.acc_revenue !== null) ? d.acc_revenue : d.pms_accommodation_revenue;
            const otherRev = (d.acc_revenue !== null) ? 0 : d.pms_other_revenue;

            revenueData.push({
                month: monthKey,
                hotel_id: hId === '0' ? 0 : parseInt(hId),
                hotel_name: d.hotel_name,
                pms_revenue: d.pms_revenue,
                forecast_revenue: d.forecast_revenue,
                acc_revenue: d.acc_revenue,
                period_revenue: periodRev,
                accommodation_revenue: accommodationRev,
                other_revenue: otherRev
            });
        }
        logger.debug(`[getMonthlySummaryData] Revenue Data calculated. Count: ${revenueData.length}`);

        // 2. Occupancy Data
        const occupancyData = [];
        const hotelOccupancyMap = {};

        allHotels.forEach(h => {
            hotelOccupancyMap[h.id] = {
                hotel_name: h.name,
                total_rooms: 0, sold_rooms: 0,
                fc_total_rooms: 0, fc_sold_rooms: 0,
                roomDifferenceSum: 0
            };
        });
        hotelOccupancyMap['0'] = {
            hotel_name: '施設合計',
            total_rooms: 0, sold_rooms: 0,
            fc_total_rooms: 0, fc_sold_rooms: 0,
            roomDifferenceSum: 0
        };

        // Calculate available rooms (Capacity * Days)
        const daysInCurrentMonth = getDaysInMonth(year, month + 1);

        // We need to calculate total available rooms carefully like frontend does (handling open dates and daily variations)
        // For simplification in backend, we'll iterate days.

        for (const h of allHotels) {
            let effectiveDays = daysInCurrentMonth;
            if (h.open_date) {
                const openDate = normalizeDate(new Date(h.open_date));
                if (openDate > lastDayOfMonth) effectiveDays = 0;
                else if (openDate > firstDayOfMonth) effectiveDays = lastDayOfMonth.getDate() - openDate.getDate() + 1;
            }
            effectiveDays = Math.max(0, effectiveDays);

            // Base capacity
            // However, frontend uses daily 'total_rooms_real' from PMS data if available vs static 'total_rooms'
            // Let's iterate days for this hotel using pmsData

            let totalAvailableForMonth = 0;
            const dailyRealRoomsMap = new Map();
            const hotelPmsData = pmsTotalData[String(h.id)] || [];

            hotelPmsData.forEach(r => {
                if (formatDateMonth(new Date(r.date)) === monthKey && r.total_rooms_real != null) {
                    dailyRealRoomsMap.set(r.date, parseInt(r.total_rooms_real));
                }
            });

            for (let d = 1; d <= daysInCurrentMonth; d++) {
                const currentDayDate = new Date(year, month, d);
                const dateStr = formatDate(currentDayDate);

                // If hotel not open yet on this day
                if (h.open_date) {
                    const normalizedOpenDate = normalizeDate(new Date(h.open_date));
                    if (normalizedOpenDate > currentDayDate) {
                        continue;
                    }
                }

                if (dailyRealRoomsMap.has(dateStr)) {
                    totalAvailableForMonth += dailyRealRoomsMap.get(dateStr);
                } else {
                    totalAvailableForMonth += (h.total_rooms || 0);
                }
            }

            hotelOccupancyMap[h.id].total_rooms = totalAvailableForMonth;
            hotelOccupancyMap['0'].total_rooms += totalAvailableForMonth;
        }

        // Aggregate PMS Sold Rooms
        for (const [sHotelId, data] of Object.entries(pmsTotalData)) {
            if (!Array.isArray(data)) continue;
            data.forEach(record => {
                const rDate = new Date(record.date);
                if (formatDateMonth(rDate) !== monthKey) return;
                const sold = Number(record.room_count || record.quantity) || 0;

                if (hotelOccupancyMap[sHotelId]) {
                    hotelOccupancyMap[sHotelId].sold_rooms += sold;
                }
                if (hotelOccupancyMap['0']) {
                    hotelOccupancyMap['0'].sold_rooms += sold;
                }
            });
        }

        // Aggregate Forecast Sold/Total
        for (const [sHotelId, data] of Object.entries(forecastTotalData)) {
            if (!Array.isArray(data)) continue;
            data.forEach(record => {
                if (formatDateMonth(new Date(record.forecast_month || record.date)) !== monthKey) return;
                const sold = Number(record.rooms_sold_nights) || 0;
                const total = Number(record.available_room_nights) || 0;

                if (hotelOccupancyMap[sHotelId]) {
                    hotelOccupancyMap[sHotelId].fc_sold_rooms += sold;
                    hotelOccupancyMap[sHotelId].fc_total_rooms += total;
                }
                if (hotelOccupancyMap['0']) {
                    hotelOccupancyMap['0'].fc_sold_rooms += sold;
                    hotelOccupancyMap['0'].fc_total_rooms += total;
                }
            });
        }

        for (const [hId, d] of Object.entries(hotelOccupancyMap)) {
            const occRate = d.total_rooms > 0 ? (d.sold_rooms / d.total_rooms) * 100 : 0;
            const fcOcc = d.fc_total_rooms > 0 ? (d.fc_sold_rooms / d.fc_total_rooms) * 100 : 0;

            occupancyData.push({
                month: monthKey,
                hotel_id: hId === '0' ? 0 : parseInt(hId),
                hotel_name: d.hotel_name,
                sold_rooms: d.sold_rooms,
                total_rooms: d.total_rooms,
                occ: parseFloat(occRate.toFixed(2)),
                fc_sold_rooms: d.fc_sold_rooms,
                fc_total_rooms: d.fc_total_rooms,
                fc_occ: parseFloat(fcOcc.toFixed(2))
            });
        }

        // 3. Previous Year Revenue (Similar Aggregation)
        // ... (Simplified for brevity, assuming standard previous year structure)
        const prevYearRevenueData = [];
        const prevRevenueMap = {};
        allHotels.forEach(h => prevRevenueMap[h.id] = { pms: 0, acc: null });
        prevRevenueMap['0'] = { pms: 0, acc: null };

        // Aggregation for prev year...
        const aggregatePrevRevenue = (sourceDataMap, key) => {
            for (const [sHotelId, data] of Object.entries(sourceDataMap)) { // Use sourceDataMap
                if (!Array.isArray(data)) continue;
                data.forEach(record => {
                    // Check if record falls in prev month
                    const rDate = new Date(record.date || record.accounting_month);
                    if (rDate.getFullYear() !== prevYearDate.getFullYear() || rDate.getMonth() !== prevYearDate.getMonth()) return;

                    let val = 0;
                    if (key === 'pms') {
                        val = Number(record.price) || 0;
                    } else {
                        val = (Number(record.accommodation_revenue) || 0) + (Number(record.non_accommodation_revenue) || 0);
                    }

                    if (prevRevenueMap[sHotelId]) {
                        if (key === 'pms') prevRevenueMap[sHotelId].pms += val;
                        else if (key === 'acc') {
                            if (prevRevenueMap[sHotelId].acc === null) prevRevenueMap[sHotelId].acc = 0;
                            prevRevenueMap[sHotelId].acc += val;
                        }
                    }
                    if (prevRevenueMap['0']) {
                        if (key === 'pms') prevRevenueMap['0'].pms += val;
                        else if (key === 'acc') {
                            if (prevRevenueMap['0'].acc === null) prevRevenueMap['0'].acc = 0;
                            prevRevenueMap['0'].acc += val;
                        }
                    }
                });
            }
        };
        aggregatePrevRevenue(prevPmsTotalData, 'pms');
        aggregatePrevRevenue(prevAccountingTotalData, 'acc');

        for (const [hId, d] of Object.entries(prevRevenueMap)) {
            const periodRev = (d.acc !== null) ? d.acc : d.pms;
            prevYearRevenueData.push({
                hotel_id: hId === '0' ? 0 : parseInt(hId),
                period_revenue: periodRev,
                acc_revenue: d.acc,
                pms_revenue: d.pms
            });
        }


        // 4. Previous Year Occupancy
        const prevYearOccupancyData = [];
        const prevOccupancyMap = {};
        allHotels.forEach(h => prevOccupancyMap[h.id] = { sold: 0, total: 0 });
        prevOccupancyMap['0'] = { sold: 0, total: 0 };

        // Calculate prev total rooms (approximate for simplicity using current total_rooms if history not perfect, 
        // but best is to use open_date logic again)
        const daysInPrevMonth = getDaysInMonth(prevYearDate.getFullYear(), prevYearDate.getMonth() + 1);
        for (const h of allHotels) {
            let totalAvailable = h.total_rooms * daysInPrevMonth;
            // Apply open date logic
            if (h.open_date) {
                const openDate = normalizeDate(new Date(h.open_date));
                const pEnd = new Date(prevYearDate.getFullYear(), prevYearDate.getMonth() + 1, 0);
                if (openDate > pEnd) totalAvailable = 0;
            }
            prevOccupancyMap[h.id].total = totalAvailable;
            prevOccupancyMap['0'].total += totalAvailable;
        }

        // Iterate prevPmsTotalData for sold rooms source
        for (const [sHotelId, data] of Object.entries(prevPmsTotalData)) {
            if (!Array.isArray(data)) continue;
            data.forEach(record => {
                const rDate = new Date(record.date);
                if (rDate.getFullYear() !== prevYearDate.getFullYear() || rDate.getMonth() !== prevYearDate.getMonth()) return;
                const sold = Number(record.room_count) || 0;
                if (prevOccupancyMap[sHotelId]) prevOccupancyMap[sHotelId].sold += sold;
                if (prevOccupancyMap['0']) prevOccupancyMap['0'].sold += sold;
            });
        }

        for (const [hId, d] of Object.entries(prevOccupancyMap)) {
            const occ = d.total > 0 ? (d.sold / d.total) * 100 : 0;
            prevYearOccupancyData.push({
                hotel_id: hId === '0' ? 0 : parseInt(hId),
                occ: parseFloat(occ.toFixed(2))
            });
        }

        // 5. KPI Data (Total Hotel 0)
        const kpiRevenueEntry = revenueData.find(r => r.hotel_id === 0);
        const kpiOccupancyEntry = occupancyData.find(r => r.hotel_id === 0);

        const total_forecast_revenue = kpiRevenueEntry?.forecast_revenue || 0;
        const total_period_accommodation_revenue = kpiRevenueEntry?.accommodation_revenue || 0; // Or period_revenue? Frontend uses accommodation_revenue for ADR/RevPAR usually? 
        // Frontend check:
        // const total_period_accommodation_revenue = revenueEntry?.accommodation_revenue || 0; (line 144)

        const total_fc_sold_rooms = kpiOccupancyEntry?.fc_sold_rooms || 0;
        const total_fc_available_rooms = kpiOccupancyEntry?.fc_total_rooms || 0;
        const total_sold_rooms = kpiOccupancyEntry?.sold_rooms || 0;
        const total_available_rooms = kpiOccupancyEntry?.total_rooms || 0;

        const kpiData = {
            actualADR: total_sold_rooms ? Math.round(total_period_accommodation_revenue / total_sold_rooms) : 0,
            forecastADR: total_fc_sold_rooms ? Math.round(total_forecast_revenue / total_fc_sold_rooms) : 0,
            actualRevPAR: total_available_rooms ? Math.round(total_period_accommodation_revenue / total_available_rooms) : 0,
            forecastRevPAR: total_fc_available_rooms ? Math.round(total_forecast_revenue / total_fc_available_rooms) : 0
        };

        // 6. Future Outlook (6 months)
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

        const outlookStartDate = outlookMonths[0].startDate;
        const outlookEndDate = outlookMonths[outlookMonths.length - 1].endDate;

        logger.debug(`[getMonthlySummaryData] Fetching Outlook data (6 months) from ${outlookStartDate} to ${outlookEndDate}`);

        const [
            outlookForecastResults,
            outlookPmsResults,
            latestMetricDate
        ] = await Promise.all([
            Promise.all(hotelIds.map(hid => selectForecastData(requestId, hid, outlookStartDate, outlookEndDate, client))),
            Promise.all(hotelIds.map(hid => selectCountReservation(requestId, hid, outlookStartDate, outlookEndDate, client))),
            selectLatestDailyReportDate(requestId)
        ]);

        const outlookPmsFlat = outlookPmsResults.flat();
        const outlookForecastFlat = outlookForecastResults.flat();

        let outlookSnapshots = [];
        if (latestMetricDate) {
            outlookSnapshots = await selectDailyReportDataByHotel(requestId, latestMetricDate, hotelIds, client);
        }

        outlookMonths.forEach(m => {
            const mPMS = outlookPmsFlat.filter(r => formatDateMonth(new Date(r.date)) === m.monthLabel);
            const mFC = outlookForecastFlat.filter(r => formatDateMonth(new Date(r.forecast_month)) === m.monthLabel);
            const mSnapshot = outlookSnapshots.filter(r => r.month === m.startDate); // Month in snapshot is YYYY-MM-DD (first day)

            const sales = mPMS.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
            const forecast_sales = mFC.reduce((sum, r) => sum + (Number(r.accommodation_revenue) || 0) + (Number(r.non_accommodation_revenue) || 0), 0);
            const confirmed_nights = mPMS.reduce((sum, r) => sum + (Number(r.room_count) || 0), 0);

            const forecast_sold = mFC.reduce((sum, r) => sum + (Number(r.rooms_sold_nights) || 0), 0);
            const forecast_available = mFC.reduce((sum, r) => sum + (Number(r.available_room_nights) || 0), 0);
            const forecast_occ = forecast_available ? (forecast_sold / forecast_available) * 100 : 0;

            // Total bookable room nights for the month (Group Total)
            const daysInM = getDaysInMonth(new Date(m.startDate).getFullYear(), new Date(m.startDate).getMonth() + 1);
            const total_bookable_room_nights = allHotels.reduce((sum, h) => {
                // Simplified availability check for outlook
                return sum + (h.total_rooms * daysInM);
            }, 0);

            const prev_sales = mSnapshot.reduce((sum, r) => sum + (Number(r.accommodation_sales) || 0) + (Number(r.other_sales) || 0), 0);
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
                total_bookable_room_nights
            });
        });

        logger.debug(`[getMonthlySummaryData] Outlook Data compiled. Count: ${outlookData.length}`);

        return {
            targetDate: formatDate(targetDate),
            revenueData,
            occupancyData,
            prevYearRevenueData,
            prevYearOccupancyData,
            kpiData,
            outlookData,
            selectionMessage: `自動送信レポート (${formatDate(targetDate)})`,
            allHotelNames: allHotels.map(h => h.name)
        };

    } catch (error) {
        console.error('Error fetching monthly summary data:', error);
        throw error;
    } finally {
        if (!dbClient) client.release();
    }
}

module.exports = {
    getMonthlySummaryData
};