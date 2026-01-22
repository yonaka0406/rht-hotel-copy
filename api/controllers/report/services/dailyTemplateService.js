const XlsxPopulate = require('xlsx-populate');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { convertExcelToPdf } = require('../../../services/libreOfficeService');
const { getFrontendCompatibleReportData } = require('../../../jobs/services/frontendCompatibleReportService');
const { getPool } = require('../../../config/database');

const cleanupFiles = (filePaths) => {
    filePaths.forEach(filePath => {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (err) {
            console.warn(`Failed to cleanup file ${filePath}:`, err);
        }
    });
};

/**
 * Generates the Daily Report PDF (or XLSX) based on provided data.
 * @param {Object} data - The report data (outlookData, revenueData, etc.)
 * @param {string} requestId - Request ID for logging
 * @param {string} format - Output format ('pdf' or 'xlsx')
 * @returns {Promise<string>} Path to the generated PDF (or XLSX) file.
 */
const generateDailyReportPdf = async (data, requestId, format = null) => {
    const {
        outlookData,
        targetDate,
        revenueData,
        occupancyData,
        prevYearRevenueData,
        prevYearOccupancyData,
        selectionMessage,
        kpiData
    } = data;

    const outputFormat = format || data.format || 'pdf';

    // Adjusted path relative to this service file location (api/controllers/report/services)
    const templatePath = path.join(__dirname, '../../../components/デイリーテンプレート.xlsx');
    const tmpDir = path.join(__dirname, '../../../tmp');

    if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
    }

    const uniqueId = uuidv4();
    const tempXlsxPath = path.join(tmpDir, `daily_report_${uniqueId}.xlsx`);
    const outputPdfPath = path.join(tmpDir, `daily_report_${uniqueId}.pdf`);

    try {
        // Use XlsxPopulate to load the template (preserves charts)
        const workbook = await XlsxPopulate.fromFileAsync(templatePath);

        // Write Selection Message in 'レポート' sheet A52
        const reportSheet = workbook.sheet('レポート');
        if (reportSheet && selectionMessage) {
            reportSheet.cell('A52').value(selectionMessage);
        }

        const dataSheet = workbook.sheet('合計データ');

        if (dataSheet) {
            // Write KPI Data (6 months) - ADR and RevPAR now in columns W-AB (23-28)
            if (kpiData) {
                const writeKpiRow = (rowNum, dataArray) => {
                    if (Array.isArray(dataArray)) {
                        dataArray.forEach((val, i) => {
                            if (i < 6) {
                                // Start from Column W (23) instead of V (22)
                                dataSheet.cell(rowNum, 23 + i).value(val).style("numberFormat", "#,##0");
                            }
                        });
                    }
                };

                writeKpiRow(2, kpiData.actualADR);
                writeKpiRow(4, kpiData.actualRevPAR);
                writeKpiRow(7, kpiData.forecastADR);
                writeKpiRow(8, kpiData.forecastRevPAR);
            }

            if (Array.isArray(outlookData)) {
                outlookData.forEach((item, index) => {
                    const rowNumber = index + 2; // xlsx-populate uses 1-based indexing
                    const row = dataSheet.row(rowNumber);

                    // Ensure sales_with_provisory has a valid value, fallback to sales if undefined
                    const salesWithProvisory = (item.sales_with_provisory !== undefined && item.sales_with_provisory !== null)
                        ? item.sales_with_provisory
                        : item.sales;

                    console.log(`[dailyTemplateService] Row ${rowNumber}, Month ${item.month}: sales=${item.sales}, sales_with_provisory=${item.sales_with_provisory}, using=${salesWithProvisory}`);

                    row.cell(1).value(item.month);                                                                      // A: 月度
                    row.cell(2).value(item.forecast_sales);                                                             // B: 計画売上
                    row.cell(3).value(item.sales);                                                                      // C: 売上
                    row.cell(4).value(salesWithProvisory);                                                              // D: 売上（仮予約含む）
                    row.cell(5).value(item.forecast_occ ? item.forecast_occ / 100 : 0).style("numberFormat", "0.0%"); // E: 計画稼働率
                    row.cell(6).value(item.occ ? item.occ / 100 : 0).style("numberFormat", "0.0%");                   // F: 稼働率
                    row.cell(7).value(item.occ_with_provisory ? item.occ_with_provisory / 100 : 0).style("numberFormat", "0.0%"); // G: 稼働率（仮予約含む）
                    row.cell(8).value(item.metric_date);                                                                // H: 前日集計日
                    row.cell(9).value(item.prev_sales);                                                                 // I: 前日実績売上
                    row.cell(10).value(item.prev_occ ? item.prev_occ / 100 : 0).style("numberFormat", "0.0%");        // J: 前日稼働率
                    row.cell(11).value(item.prev_confirmed_stays);                                                      // K: 前日確定泊数
                    row.cell(12).value(item.confirmed_nights);                                                          // L: 確定泊数
                    row.cell(13).value(item.confirmed_nights_with_provisory ?? item.confirmed_nights);                 // M: 確定泊数（仮予約含む）
                    row.cell(14).value(item.forecast_rooms ?? item.total_bookable_room_nights);                        // N: 計画総室数
                    // Note: Columns O-V are for formulas/other data, ADR/RevPAR moved to W-AB
                });
            }

            // Helper function to write facility performance metrics
            const writeFacilityPerformance = (sheet, startRow, monthStr, filteredRevenue, filteredOccupancy, options = {}) => {
                const { writeFormulas = false, writeHeaders = true } = options;
                const monthDate = monthStr ? new Date(`${monthStr}-01`) : null;

                if (writeHeaders) {
                    const revHeaders = ['施設名', '月度', '計画売上', '見込み売上', '売上差異'];
                    const occHeaders = ['施設名', '月度', '計画稼働率', '見込み稼働率', '稼働率差異'];

                    const headerRow = sheet.row(startRow);
                    revHeaders.forEach((header, index) => {
                        headerRow.cell(index + 1).value(header).style({ bold: true });
                    });
                    occHeaders.forEach((header, index) => {
                        headerRow.cell(index + 8).value(header).style({ bold: true });
                    });
                }

                // Prepare combined data for sorting
                const hotelMetrics = filteredRevenue
                    .filter(item => item.hotel_id !== 0)
                    .map(revItem => {
                        const occItem = filteredOccupancy.find(o => String(o.hotel_id) === String(revItem.hotel_id)) || {};

                        const forecastRevenue = revItem.forecast_revenue ?? 0;
                        const actualRevenue = revItem.accommodation_revenue ?? 0;
                        const revenueVariance = actualRevenue - forecastRevenue;

                        const forecastOcc = occItem.fc_occ || 0;
                        const actualOcc = occItem.occ || 0;
                        const occVariance = actualOcc - forecastOcc;

                        return {
                            hotel_name: revItem.hotel_name,
                            forecastRevenue,
                            actualRevenue,
                            revenueVariance,
                            forecastOcc,
                            actualOcc,
                            occVariance,
                        };
                    });

                // Sort independently
                const revenueSorted = [...hotelMetrics].sort((a, b) => b.revenueVariance - a.revenueVariance);
                const occupancySorted = [...hotelMetrics].sort((a, b) => b.occVariance - a.occVariance);

                // Write data side-by-side
                revenueSorted.forEach((item, index) => {
                    const currentRow = startRow + 1 + index;
                    const row = sheet.row(currentRow);

                    row.cell(1).value(item.hotel_name);
                    if (monthDate) {
                        row.cell(2).value(monthDate).style("numberFormat", "yyyy/mm/dd");
                    }
                    row.cell(3).value(item.forecastRevenue).style("numberFormat", "#,##0");
                    row.cell(4).value(item.actualRevenue).style("numberFormat", "#,##0");
                    row.cell(5).value(item.revenueVariance).style("numberFormat", "#,##0");

                    if (writeFormulas) {
                        row.cell(15).formula(`C${currentRow}/10000`).style("numberFormat", "#,##0");
                        row.cell(16).formula(`D${currentRow}/10000`).style("numberFormat", "#,##0");
                        row.cell(17).formula(`E${currentRow}/10000`).style("numberFormat", "#,##0");
                    }
                });

                occupancySorted.forEach((item, index) => {
                    const currentRow = startRow + 1 + index;
                    const row = sheet.row(currentRow);

                    row.cell(8).value(item.hotel_name);
                    if (monthDate) {
                        row.cell(9).value(monthDate).style("numberFormat", "yyyy/mm/dd");
                    }
                    row.cell(10).value(item.forecastOcc / 100).style("numberFormat", "0.0%");
                    row.cell(11).value(item.actualOcc / 100).style("numberFormat", "0.0%");
                    row.cell(12).value(item.occVariance / 100).style("numberFormat", "0.0%");
                });

                return hotelMetrics.length;
            };

            // Write All Facilities Revenue & Occupancy Overview starting from Row 10
            if (Array.isArray(revenueData) && Array.isArray(occupancyData)) {
                // Determine current month from outlookData
                const currentMonthStr = outlookData?.[0]?.month;

                // 1. Current Month Section on '合計データ'
                const currentRevData = revenueData.filter(r => r.month === currentMonthStr);
                const currentOccData = occupancyData.filter(o => o.month === currentMonthStr);

                writeFacilityPerformance(dataSheet, 10, currentMonthStr, currentRevData, currentOccData, { writeFormulas: true, writeHeaders: true });

                // 2. Next Month (M+1) on '合計データ2'
                const nextMonth1Str = outlookData?.[1]?.month;
                if (nextMonth1Str) {
                    const dataSheet2 = workbook.sheet('合計データ2') || workbook.addSheet('合計データ2');
                    const nextRev1Data = revenueData.filter(r => r.month === nextMonth1Str);
                    const nextOcc1Data = occupancyData.filter(o => o.month === nextMonth1Str);
                    if (dataSheet2 && (nextRev1Data.length > 0 || nextOcc1Data.length > 0)) {
                        writeFacilityPerformance(dataSheet2, 1, nextMonth1Str, nextRev1Data, nextOcc1Data, { writeHeaders: true });
                    }
                }

                // 3. Month After Next (M+2) on '合計データ3'
                const nextMonth2Str = outlookData?.[2]?.month;
                if (nextMonth2Str) {
                    const dataSheet3 = workbook.sheet('合計データ3') || workbook.addSheet('合計データ3');
                    const nextRev2Data = revenueData.filter(r => r.month === nextMonth2Str);
                    const nextOcc2Data = occupancyData.filter(o => o.month === nextMonth2Str);
                    if (dataSheet3 && (nextRev2Data.length > 0 || nextOcc2Data.length > 0)) {
                        writeFacilityPerformance(dataSheet3, 1, nextMonth2Str, nextRev2Data, nextOcc2Data, { writeHeaders: true });
                    }
                }
            }
        }

        await workbook.toFileAsync(tempXlsxPath);

        if (outputFormat === 'xlsx') {
            return tempXlsxPath;
        } else {
            // PDF
            await convertExcelToPdf(tempXlsxPath, tmpDir);
            if (fs.existsSync(outputPdfPath)) {
                cleanupFiles([tempXlsxPath]); // Cleanup xlsx immediately
                return outputPdfPath;
            } else {
                throw new Error('PDF file not found after conversion');
            }
        }

    } catch (error) {
        console.error(`[${requestId}] Error generating daily template ${outputFormat}:`, error);
        cleanupFiles([tempXlsxPath, outputPdfPath]);
        throw error;
    }
};

const getDailyTemplatePdf = async (req, res) => {
    const requestId = req.requestId;
    const {
        targetDate,
        format: outputFormat = 'pdf',
        period = 'month'
    } = req.body;

    let generatedFilePath = null;
    let dbClient = null;
    try {
        // Fetch fresh, full data using the backend service to ensure multi-month data for sheets like '合計データ2'
        dbClient = await getPool(requestId).connect();
        const fullReportData = await getFrontendCompatibleReportData(requestId, targetDate, period, dbClient);

        // Merge backend-calculated data with frontend metadata if any
        const combinedData = {
            ...req.body,
            ...fullReportData
        };

        generatedFilePath = await generateDailyReportPdf(combinedData, requestId, outputFormat);

        const formattedDate = targetDate ? String(targetDate).replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `daily_report_${formattedDate}.${outputFormat}`;

        if (outputFormat === 'xlsx') {
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else {
            res.setHeader('Content-Type', 'application/pdf');
        }
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        const fileStream = fs.createReadStream(generatedFilePath);
        fileStream.pipe(res);
        fileStream.on('close', () => cleanupFiles([generatedFilePath]));
        fileStream.on('error', (err) => {
            console.error(`[${requestId}] Error piping file stream:`, err);
            cleanupFiles([generatedFilePath]);
            if (!res.headersSent) {
                res.status(500).end();
            }
        });

    } catch (error) {
        if (!res.headersSent) res.status(500).json({ message: 'Failed to generate file', error: error.message });
        if (generatedFilePath) cleanupFiles([generatedFilePath]);
    } finally {
        if (dbClient) dbClient.release();
    }
};

module.exports = {
    getDailyTemplatePdf,
    generateDailyReportPdf
};
