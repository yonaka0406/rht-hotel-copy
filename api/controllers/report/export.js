const reportModel = require('../../models/report');
const { format } = require("@fast-csv/format");
const ExcelJS = require("exceljs");

const { formatDate, formatDateTime, translateStatus, translatePaymentTiming, translateType, translatePlanType, translateMealType } = require('../../utils/reportUtils');

const getExportReservationList = async (req, res) => {
    const hotelId = req.params.hid;
    const startDate = req.params.sdate;
    const endDate = req.params.edate;

    try {
        const result = await reportModel.selectExportReservationList(req.requestId, hotelId, startDate, endDate);

        if (!result || result.length === 0) {
            return res.status(404).send("No data available for the given dates.");
        }

        // CSV

        res.setHeader("Content-Disposition", "attachment; filename=reservations.csv");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.write("\uFEFF");

        const csvStream = format({ headers: true });
        csvStream.pipe(res);

        result.forEach((reservation) => {
            const clients = reservation.clients_json ? JSON.parse(reservation.clients_json) : [];
            const clientNames = clients.map(client => client.name_kana ? client.name + '(' + client.name_kana + ')' : client.name).join(", ");
            const payers = reservation.payers_json ? JSON.parse(reservation.payers_json) : [];
            const payerNames = payers.map(client => client.name_kana ? client.name + '(' + client.name_kana + ')' : client.name).join(", ");

            // Write data to CSV, add a formatted row
            csvStream.write({
                ホテルID: reservation.hotel_id,
                ホテル名称: reservation.formal_name,
                レポート期間: `${startDate} ～ ${endDate}`,
                ステータス: translateStatus(reservation.status),
                予約者: reservation.booker_name,
                予約者カナ: reservation.booker_name_kana,
                チェックイン: formatDate(new Date(reservation.check_in)),
                チェックアウト: formatDate(new Date(reservation.check_out)),
                宿泊日数: reservation.number_of_nights,
                人数: reservation.number_of_people,
                プラン料金: Math.floor(parseFloat(reservation.plan_price)),
                アドオン料金: Math.floor(parseFloat(reservation.addon_price)),
                請求額: Math.floor(parseFloat(reservation.price)),
                入金額: Math.floor(parseFloat(reservation.payment)),
                残高: Math.floor(parseFloat(reservation.price)) - Math.floor(parseFloat(reservation.payment)),
                宿泊者: clientNames,
                支払者: payerNames,
                支払い: translatePaymentTiming(reservation.payment_timing),
                予約ID: reservation.id,
                備考: reservation.comment || '',
            });
        });
        csvStream.end();
    } catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).send("Error generating CSV");
    }
};

const getExportReservationDetails = async (req, res) => {
    const hotelId = req.params.hid;
    const startDate = req.params.sdate;
    const endDate = req.params.edate;

    try {
        const result = await reportModel.selectExportReservationDetails(req.requestId, hotelId, startDate, endDate);

        if (!result || result.length === 0) {
            return res.status(404).send("No data available for the given dates.");
        }

        // Edit totals
        const processedReservations = [];
        const seenReservationIds = new Set();
        const seenReservationDetailIds = new Set();

        result.forEach((reservation) => {
            const reservationId = reservation.reservation_id;
            const reservationDetailId = reservation.id;
            const isFirstOccurrence = !seenReservationIds.has(reservationId);
            const isFirstDetailOccurrence = !seenReservationDetailIds.has(reservationDetailId);

            if (isFirstOccurrence) {
                seenReservationIds.add(reservationId);
            }
            if (isFirstDetailOccurrence) {
                seenReservationDetailIds.add(reservationDetailId);
            }

            processedReservations.push({
                ...reservation,
                plan_price: isFirstDetailOccurrence
                    ? Math.floor(parseFloat(reservation.plan_price) || 0)
                    : null,
                plan_net_price: isFirstDetailOccurrence
                    ? Math.floor(parseFloat(reservation.plan_net_price) || 0)
                    : null,
                plan_price_accom: isFirstDetailOccurrence
                    ? Math.floor(parseFloat(reservation.plan_price_accom) || 0)
                    : null,
                plan_net_price_accom: isFirstDetailOccurrence
                    ? Math.floor(parseFloat(reservation.plan_net_price_accom) || 0)
                    : null,
                plan_price_other: isFirstDetailOccurrence
                    ? Math.floor(parseFloat(reservation.plan_price_other) || 0)
                    : null,
                plan_net_price_other: isFirstDetailOccurrence
                    ? Math.floor(parseFloat(reservation.plan_net_price_other) || 0)
                    : null,
                payments: isFirstOccurrence
                    ? Math.floor(parseFloat(reservation.payments) || 0)
                    : null,
            });
        });

        // CSV

        res.setHeader("Content-Disposition", "attachment; filename=reservation_details.csv");
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.write("\uFEFF");

        const csvStream = format({ headers: true });
        csvStream.pipe(res);

        processedReservations.forEach((reservation) => {
            const clients = reservation.clients_json ? JSON.parse(reservation.clients_json) : [];
            const clientNames = clients.map(client => client.name).join(", ");  // Join all client names into one string

            // Calculate split sales amounts
            const isAddonAccom = !reservation.addon_sales_category || reservation.addon_sales_category === 'accommodation';
            const addonPriceAccom = isAddonAccom ? Math.floor(parseFloat(reservation.addon_value)) : 0;
            const addonNetPriceAccom = isAddonAccom ? Math.floor(parseFloat(reservation.addon_net_value)) : 0;

            const isAddonOther = reservation.addon_sales_category === 'other';
            const addonPriceOther = isAddonOther ? Math.floor(parseFloat(reservation.addon_value)) : 0;
            const addonNetPriceOther = isAddonOther ? Math.floor(parseFloat(reservation.addon_net_value)) : 0;

            const planPriceAccom = reservation.plan_price_accom || 0;
            const planNetPriceAccom = reservation.plan_net_price_accom || 0;
            const planPriceOther = reservation.plan_price_other || 0;
            const planNetPriceOther = reservation.plan_net_price_other || 0;

            // Process each reservation and write to CSV
            // Note on pricing: 
            // - plan_price comes from reservation_details (sometimes rounded to nearest 100, what client pays)
            // - plan_net_price comes from reservation_rates (actual net value based on gross value before rounding)
            // This discrepancy means the net value of sales and plan calculations may not be accurate
            // due to rounding differences between what's charged and what's recorded in the system
            csvStream.write({
                ホテルID: reservation.hotel_id,
                ホテル名称: reservation.formal_name,
                レポート期間: `${startDate} ～ ${endDate}`,
                ステータス: translateStatus(reservation.reservation_status),
                予約種類: translateType(reservation.reservation_type),
                エージェント: reservation.agent,
                OTA_ID: reservation.ota_reservation_id,
                予約者: reservation.booker_name,
                予約者カナ: reservation.booker_kana,
                チェックイン: formatDate(new Date(reservation.check_in)),
                チェックアウト: formatDate(new Date(reservation.check_out)),
                宿泊日数: reservation.number_of_nights,
                予約人数: reservation.reservation_number_of_people,
                販売用部屋: reservation.for_sale ? 'はい' : 'いいえ',
                建物階: reservation.floor,
                部屋番号: reservation.room_number,
                部屋タイプ: reservation.room_type_name,
                喫煙部屋: reservation.smoking ? 'はい' : 'いいえ',
                部屋容量: reservation.capacity,
                滞在人数: reservation.number_of_people,
                宿泊日: formatDate(new Date(reservation.date)),
                プラン名: reservation.plan_name,
                プランタイプ: translatePlanType(reservation.plan_type),
                プラン料金: reservation.plan_price,
                "プラン料金(税抜き)": reservation.plan_net_price,                
                アドオン名: reservation.addon_name,
                アドオン数量: reservation.addon_quantity,
                アドオン単価: reservation.addon_price,
                アドオン料金: Math.floor(parseFloat(reservation.addon_value)),
                "アドオン料金(税抜き)": Math.floor(parseFloat(reservation.addon_net_value)),
                請求対象: reservation.billable ? 'はい' : 'いいえ',                
                宿泊対象: reservation.is_accommodation ? 'はい' : 'いいえ',
                売上高: reservation.billable ? planPriceAccom + addonPriceAccom : 0,
                "売上高(税抜き)": reservation.billable ? planNetPriceAccom + addonNetPriceAccom : 0,
                "売上高(宿泊外)": reservation.billable ? planPriceOther + addonPriceOther : 0,
                "売上高(宿泊外・税抜き)": reservation.billable ? planNetPriceOther + addonNetPriceOther : 0,
                支払い: translatePaymentTiming(reservation.payment_timing),
                予約ID: reservation.reservation_id,
                予約詳細ID: reservation.id,
                詳細キャンセル: reservation.cancelled ? 'キャンセル' : '',
            });
        });
        csvStream.end();
    } catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).send("Error generating CSV");
    }
};

const getExportMealCount = async (req, res) => {
    const hotelId = req.params.hid;
    const startDate = req.params.sdate;
    const endDate = req.params.edate;

    try {
        const { summary, details } = await reportModel.selectExportMealCount(req.requestId, hotelId, startDate, endDate);

        if ((!summary || summary.length === 0) && (!details || details.length === 0)) {
            return res.status(404).send("No data available for the given dates.");
        }

        // Create a new Excel workbook
        const workbook = new ExcelJS.Workbook();
        const timestamp = new Date().toLocaleString("ja-JP", {
            year: "numeric", month: "2-digit", day: "2-digit",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });

        // Helper function to configure worksheet styles
        const configureWorksheet = (worksheet, title) => {
            // Configure print settings
            worksheet.pageSetup = {
                fitToWidth: 1,
                fitToHeight: 0,
                paperSize: 9,
                orientation: "landscape",
                margins: {
                    left: 0.3, right: 0.3,
                    top: 0.5, bottom: 0.5,
                    header: 0.2, footer: 0.2
                }
            };

            worksheet.views = [{ showGridLines: false }];

            // Add title
            const titleCell = worksheet.getRow(1);
            titleCell.values = [title];
            titleCell.font = { bold: true, size: 14 };
            titleCell.alignment = { horizontal: "center", vertical: "middle" };

            // Add timestamp
            const timeCell = worksheet.getRow(2);
            timeCell.values = [`リスト作成日時：${timestamp}`];
            timeCell.font = { color: { argb: "BABABA" }, bold: true, size: 9 };

            return {
                headerRow: 3,
                dataStartRow: 4
            };
        };

        // 1. Create Summary Sheet
        if (summary && summary.length > 0) {
            const summarySheet = workbook.addWorksheet("食事件数サマリー");
            const { headerRow } = configureWorksheet(summarySheet, `${summary[0].hotel_name || "ホテル"} の食事件数サマリー`);

            // Set headers
            const headerCells = summarySheet.getRow(headerRow);
            headerCells.values = ["提供日", "朝食", "昼食", "夕食"];
            headerCells.font = { bold: true };
            headerCells.alignment = { horizontal: "center", vertical: "middle" };

            // Style headers
            headerCells.eachCell((cell) => {
                cell.border = {
                    bottom: { style: "thin", color: { argb: "000000" } },
                };
            });

            // Set column widths and formats
            summarySheet.columns = [
                {
                    key: "meal_date",
                    width: 20,
                    style: {
                        numFmt: 'yy"年"m"月"d"日("aaa")"',
                        alignment: { horizontal: 'center', vertical: 'middle' }
                    }
                },
                { key: "breakfast", width: 15, style: { numFmt: "0" } },
                { key: "lunch", width: 15, style: { numFmt: "0" } },
                { key: "dinner", width: 15, style: { numFmt: "0" } },
            ];

            // Add data rows
            summary.forEach((row, index) => {
                // Fix: Create a new date object as UTC to avoid timezone issues
                const d = new Date(row.meal_date);
                const mealDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

                const dataRow = summarySheet.addRow({
                    meal_date: mealDate,
                    breakfast: row.breakfast * 1,
                    lunch: row.lunch * 1,
                    dinner: row.dinner * 1,
                });

                dataRow.alignment = { horizontal: "center", vertical: "middle" };

                // Apply alternating row colors
                if (index % 2 === 0) {
                    dataRow.eachCell((cell) => {
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "F2F2F2" },
                        };
                    });
                }
            });
        }

        // 2. Create Detailed Sheet
        if (details && details.length > 0) {
            const detailSheet = workbook.addWorksheet("食事詳細");
            const { headerRow } = configureWorksheet(detailSheet, `${summary?.[0]?.hotel_name || "ホテル"} の食事詳細`);

            // Set headers
            const headerCells = detailSheet.getRow(headerRow);
            headerCells.values = ["予約者名", "部屋番号", "提供日", "朝食", "昼食", "夕食"];
            headerCells.font = { bold: true };
            headerCells.alignment = { horizontal: "center", vertical: "middle" };

            // Style headers
            headerCells.eachCell((cell) => {
                cell.border = {
                    bottom: { style: "thin", color: { argb: "000000" } },
                };
            });

            // Set column widths and formats
            detailSheet.columns = [
                { key: "booker_name", width: 30 },
                { key: "room_number", width: 15 },
                {
                    key: "meal_date",
                    width: 20,
                    style: {
                        numFmt: 'yy"年"m"月"d"日("aaa")"',
                        alignment: { horizontal: 'center', vertical: 'middle' }
                    }
                },
                { key: "breakfast", width: 15, style: { numFmt: "0" } },
                { key: "lunch", width: 15, style: { numFmt: "0" } },
                { key: "dinner", width: 15, style: { numFmt: "0" } },
            ];

            // Group details by booker, room, and date
            const groupedDetails = details.reduce((acc, row) => {
                const key = `${row.booker_name}|${row.room_number}|${row.meal_date}`;
                if (!acc[key]) {
                    // Fix: Create a new date object as UTC to avoid timezone issues
                    const d = new Date(row.meal_date);
                    const mealDate = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

                    acc[key] = {
                        booker_name: row.booker_name,
                        room_number: row.room_number || 'N/A',
                        meal_date: mealDate,
                        breakfast: 0,
                        lunch: 0,
                        dinner: 0
                    };
                }
                // Add quantity to the corresponding meal type
                if (row.meal_type) {
                    acc[key][row.meal_type] = (acc[key][row.meal_type] || 0) + (row.quantity * 1);
                }
                return acc;
            }, {});

            // Convert to array and sort by date, booker name, and room number
            const sortedDetails = Object.values(groupedDetails).sort((a, b) => {
                if (a.meal_date.getTime() !== b.meal_date.getTime()) {
                    return a.meal_date - b.meal_date;
                }
                if (a.booker_name !== b.booker_name) {
                    return a.booker_name.localeCompare(b.booker_name);
                }
                return (a.room_number || '').localeCompare(b.room_number || '');
            });

            // Add data rows
            sortedDetails.forEach((row, index) => {
                const dataRow = detailSheet.addRow({
                    booker_name: row.booker_name,
                    room_number: row.room_number,
                    meal_date: row.meal_date,
                    breakfast: row.breakfast || 0,
                    lunch: row.lunch || 0,
                    dinner: row.dinner || 0,
                });

                // Apply alignment
                dataRow.alignment = {
                    horizontal: "left",
                    vertical: "middle",
                    wrapText: true
                };

                // Center align room number and meal count columns
                [2, 4, 5, 6].forEach(colNum => {  // Columns B, D, E, F (1-based index)
                    const cell = dataRow.getCell(colNum);
                    cell.alignment = {
                        horizontal: "center",
                        vertical: "middle"
                    };
                });

                // Apply alternating row colors
                if (index % 2 === 0) {
                    dataRow.eachCell((cell) => {
                        cell.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "F2F2F2" },
                        };
                    });
                }
            });

            // Auto-fit all columns with proper width constraints
            detailSheet.columns.forEach((column, index) => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const cellValue = cell.value ? cell.value.toString() : "";
                    maxLength = Math.max(maxLength, cellValue.length);
                });

                // Set minimum width for date column (C) to 11, others to 10
                const minWidth = index === 2 ? 11 : 10; // Column C (0-based index 2) gets 11 width
                const maxWidth = 50;
                column.width = Math.min(Math.max(maxLength + 2, minWidth), maxWidth);
            });
        }

        // Auto-fit all columns in all worksheets
        workbook.eachSheet((worksheet) => {
            worksheet.columns.forEach((column) => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const cellValue = cell.value ? cell.value.toString() : "";
                    maxLength = Math.max(maxLength, cellValue.length);
                });
                column.width = Math.min(Math.max(maxLength + 2, 10), 50); // Min width 10, max 50
            });
        });

        // Set headers for download
        res.setHeader("Content-Disposition", "attachment; filename=meal_count.xlsx");
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // Write workbook to response
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Error generating Excel:", err);
        res.status(500).send("Error generating Excel");
    }
};

const getAvailableMetricDates = async (req, res) => {
    try {
        const dates = await reportModel.getAvailableMetricDates(req.requestId);
        res.json(dates);
    } catch (err) {
        console.error('Error getting available metric dates:', err);
        res.status(500).send('Error getting available metric dates');
    }
};

const getDailyReportData = async (req, res) => {
    const { date } = req.params;
    try {
        const data = await reportModel.selectDailyReportData(req.requestId, date);
        res.json(data);
    } catch (err) {
        console.error('Error getting daily report data:', err);
        res.status(500).json({ error: 'Error getting daily report data' });
    }
};

const getDailyReport = async (req, res) => {
    const { date } = req.params;
    const { format = 'csv' } = req.query; // Only csv is supported now

    try {
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        // If the date is today, recalculate the metrics for today
        if (date === todayStr) {
            await reportModel.calculateAndSaveDailyMetrics(req.requestId);
        }

        const result = await reportModel.selectDailyReportData(req.requestId, date);

        if (!result || result.length === 0) {
            return res.status(404).send("No data available for the given date.");
        }

        if (format === 'csv') {
            res.setHeader("Content-Disposition", `attachment; filename=daily_report_${date}.csv`);
            res.setHeader("Content-Type", "text/csv; charset=utf-8");
            res.write("\uFEFF"); // BOM for UTF-8

            const csvStream = format({ headers: true });
            csvStream.pipe(res);
            result.forEach(row => csvStream.write(row));
            csvStream.end();
        } else {
            res.status(400).send('Unsupported format. Only CSV is available.');
        }
    } catch (err) {
        console.error(`Error generating daily report:`, err);
        res.status(500).send("Error generating daily report");
    }
};

const generateDailyMetrics = async (req, res) => {
    try {
        await reportModel.calculateAndSaveDailyMetrics(req.requestId);
        res.status(200).json({ message: 'Daily metrics generated successfully.' });
    } catch (err) {
        console.error('Error generating daily metrics:', err);
        res.status(500).json({ error: 'Error generating daily metrics' });
    }
};

const getExportDailyReportExcel = async (req, res) => {
    const { date1, date2 } = req.params;

    try {
        const groupedReportData = {};

        const dailyData1 = await reportModel.selectDailyReportData(req.requestId, date1);
        if (dailyData1 && dailyData1.length > 0) {
            groupedReportData[date1] = dailyData1;
        }

        if (date1 !== date2) {
            const dailyData2 = await reportModel.selectDailyReportData(req.requestId, date2);
            if (dailyData2 && dailyData2.length > 0) {
                groupedReportData[date2] = dailyData2;
            }
        }

        if (Object.keys(groupedReportData).length === 0) {
            return res.status(404).send("No data available for the given dates.");
        }

        // Helper to aggregate sales data by hotel and month
        const aggregateSalesData = (data) => {
            const aggregated = {};
            const months = new Set();

            data.forEach(row => {
                const hotelName = row.hotel_name;
                const month = formatDate(row.month); // Use formatDate to ensure consistent month key
                const totalSales = parseInt(row.normal_sales || 0) + parseInt(row.cancellation_sales || 0);

                if (!aggregated[hotelName]) {
                    aggregated[hotelName] = {};
                }
                aggregated[hotelName][month] = (aggregated[hotelName][month] || 0) + totalSales;
                months.add(month);
            });
            return { aggregated, months: Array.from(months).sort() };
        };

        const workbook = new ExcelJS.Workbook();
        const summarySheet = workbook.addWorksheet('売上サマリー');

        // Define columns (common for all sheets)
        const columns = [
            { header: 'ホテルID', key: 'hotel_id', width: 10 },
            { header: 'ホテル名', key: 'hotel_name', width: 20 },
            { header: '月', key: 'month', width: 15 },
            { header: 'プラン名', key: 'plan_name', width: 30 },
            { header: '確定', key: 'confirmed_stays', width: 10 },
            { header: '非宿泊数', key: 'non_accommodation_stays', width: 10 },
            { header: '仮予約', key: 'pending_stays', width: 10 },
            { header: '保留中', key: 'in_talks_stays', width: 10 },
            { header: 'キャンセル', key: 'cancelled_stays', width: 10 },
            { header: 'キャンセル(請求対象外)', key: 'non_billable_cancelled_stays', width: 20 },
            { header: '社員', key: 'employee_stays', width: 10 },
            { header: '通常売上(税込)', key: 'normal_sales', width: 15 },
            { header: 'キャンセル売上(税込)', key: 'cancellation_sales', width: 15 },
            { header: '宿泊売上(税込)', key: 'accommodation_sales', width: 15 },
            { header: 'その他売上(税込)', key: 'other_sales', width: 15 },
            { header: '宿泊売上キャンセル(税込)', key: 'accommodation_sales_cancelled', width: 20 },
            { header: 'その他売上キャンセル(税込)', key: 'other_sales_cancelled', width: 20 },
            { header: '作成日時', key: 'created_at', width: 20 },
        ];

        // Process data for summary tables
        const aggregatedData1 = aggregateSalesData(groupedReportData[date1] || []);
        const aggregatedData2 = aggregateSalesData(groupedReportData[date2] || []);

        const allHotelNames = Array.from(new Set([
            ...Object.keys(aggregatedData1.aggregated),
            ...Object.keys(aggregatedData2.aggregated)
        ])).sort();

        const allMonths = Array.from(new Set([
            ...aggregatedData1.months,
            ...aggregatedData2.months
        ])).sort();

        // Helper to write a summary table
        const writeSummaryTable = (sheet, title, aggregatedData, months, startRow) => {
            sheet.getCell(`A${startRow}`).value = title;
            sheet.getCell(`A${startRow}`).font = { bold: true, size: 12 };
            startRow++;

            const headers = ['ホテル名', ...months];
            const headerRow = sheet.addRow(headers);
            headerRow.font = { bold: true };
            startRow++;

            // Apply number format to month headers
            months.forEach((month, index) => {
                const cell = headerRow.getCell(index + 2); // +2 because 'ホテル名' is column 1
                cell.numFmt = 'yyyy"年"m"月";@';
            });

            allHotelNames.forEach(hotelName => {
                const rowData = [hotelName];
                months.forEach(month => {
                    rowData.push(aggregatedData.aggregated[hotelName]?.[month] || 0);
                });
                const dataRow = sheet.addRow(rowData);
                // Apply number format to sales data cells
                months.forEach((month, index) => {
                    const cell = dataRow.getCell(index + 2); // +2 because 'ホテル名' is column 1
                    cell.numFmt = '_ * #,##0_ ;_ * -#,##0_ ;_ * "-"_ ;_ @';
                });
                startRow++;
            });
            return startRow + 2; // Add some space after the table
        };

        // Write Summary Table for date1
        let currentRow = 1;
        currentRow = writeSummaryTable(summarySheet, `売上サマリー (${date1})`, aggregatedData1, allMonths, currentRow);

        // Write Summary Table for date2
        if (date1 !== date2) {
            currentRow = writeSummaryTable(summarySheet, `売上サマリー (${date2})`, aggregatedData2, allMonths, currentRow);

            // Write Difference Table
            summarySheet.getCell(`A${currentRow}`).value = `差分 (${date2} - ${date1})`;
            summarySheet.getCell(`A${currentRow}`).font = { bold: true, size: 12 };
            currentRow++;

            const diffHeaders = ['ホテル名', ...allMonths];
            const diffHeaderRow = summarySheet.addRow(diffHeaders);
            diffHeaderRow.font = { bold: true };
            currentRow++;

            // Apply number format to month headers in difference table
            allMonths.forEach((month, index) => {
                const cell = diffHeaderRow.getCell(index + 2); // +2 because 'ホテル名' is column 1
                cell.numFmt = 'yyyy"年"m"月";@';
            });

            allHotelNames.forEach(hotelName => {
                const rowData = [hotelName];
                allMonths.forEach(month => {
                    const sales1 = aggregatedData1.aggregated[hotelName]?.[month] || 0;
                    const sales2 = aggregatedData2.aggregated[hotelName]?.[month] || 0;
                    rowData.push(sales2 - sales1);
                });
                const dataRow = summarySheet.addRow(rowData);
                // Apply number format to sales data cells in difference table
                allMonths.forEach((month, index) => {
                    const cell = dataRow.getCell(index + 2); // +2 because 'ホテル名' is column 1
                    cell.numFmt = '_ * #,##0_ ;_ * -#,##0_ ;_ * "-"_ ;_ @';
                });
                currentRow++;
            });
        }

        // Auto-fit columns for summary sheet
        summarySheet.columns.forEach(column => {
            let maxLength = 0;
            column.eachCell({ includeEmpty: true }, cell => {
                const cellValue = cell.value ? cell.value.toString() : '';
                maxLength = Math.max(maxLength, cellValue.length);
            });
            column.width = Math.min(Math.max(maxLength + 2, 10), 50);
        });

        // Add a note about tax-inclusive values
        summarySheet.addRow([]); // Empty row for spacing
        summarySheet.addRow(['売上は税込みです。']);

        for (const dateKey in groupedReportData) {
            const worksheet = workbook.addWorksheet(`${dateKey}`);
            worksheet.columns = columns;

            groupedReportData[dateKey].forEach(row => {
                worksheet.addRow({
                    hotel_id: row.hotel_id,
                    hotel_name: row.hotel_name,
                    month: formatDate(row.month),
                    plan_name: row.plan_name,
                    confirmed_stays: parseInt(row.confirmed_stays || 0),
                    non_accommodation_stays: parseInt(row.non_accommodation_stays || 0),
                    pending_stays: parseInt(row.pending_stays || 0),
                    in_talks_stays: parseInt(row.in_talks_stays || 0),
                    cancelled_stays: parseInt(row.cancelled_stays || 0),
                    non_billable_cancelled_stays: parseInt(row.non_billable_cancelled_stays || 0),
                    employee_stays: parseInt(row.employee_stays || 0),
                    normal_sales: parseInt(row.normal_sales || 0),
                    cancellation_sales: parseInt(row.cancellation_sales || 0),
                    accommodation_sales: parseInt(row.accommodation_sales || 0),
                    other_sales: parseInt(row.other_sales || 0),
                    accommodation_sales_cancelled: parseInt(row.accommodation_sales_cancelled || 0),
                    other_sales_cancelled: parseInt(row.other_sales_cancelled || 0),
                    created_at: formatDateTime(row.created_at),
                });
            });
        }

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=daily_report_${date1}_${date2}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Error generating daily report Excel:", err);
        res.status(500).send("Error generating daily report Excel");
    }
};

module.exports = {
    getExportReservationList,
    getExportReservationDetails,
    getExportMealCount,
    getDailyReport,
    getDailyReportData,
    getAvailableMetricDates,
    generateDailyMetrics,
    getExportDailyReportExcel,
};