const XlsxPopulate = require('xlsx-populate');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { convertExcelToPdf } = require('../../../services/libreOfficeService');

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

            // Write All Facilities Revenue & Occupancy Overview starting from Row 10
            if (Array.isArray(revenueData) && Array.isArray(occupancyData)) {
                const startRow = 10;

                // Headers
                const revHeaders = ['施設名', '計画売上', '売上', '売上差異', '前年売上', '前年比差異(売上)'];
                const occHeaders = ['施設名', '計画稼働率', '稼働率', '稼働率差異', '前年稼働率', '前年比差異(稼働率)'];

                const headerRow = dataSheet.row(startRow);
                revHeaders.forEach((header, index) => {
                    headerRow.cell(index + 1).value(header).style({ bold: true });
                });
                occHeaders.forEach((header, index) => {
                    // Start from Column H (8)
                    headerRow.cell(index + 8).value(header).style({ bold: true });
                });

                // Prepare combined data for sorting
                const hotelMetrics = revenueData
                    .filter(item => item.hotel_id !== 0)
                    .map(revItem => {
                        const occItem = occupancyData.find(o => String(o.hotel_id) === String(revItem.hotel_id)) || {};
                        const prevRevItem = (prevYearRevenueData || []).find(o => String(o.hotel_id) === String(revItem.hotel_id)) || {};
                        const prevOccItem = (prevYearOccupancyData || []).find(o => String(o.hotel_id) === String(revItem.hotel_id)) || {};

                        const forecastRevenue = revItem.forecast_revenue || 0;
                        const actualRevenue = revItem.period_revenue || revItem.acc_revenue || revItem.pms_revenue || 0;
                        const revenueVariance = actualRevenue - forecastRevenue;
                        const prevRevenue = prevRevItem.period_revenue || prevRevItem.acc_revenue || prevRevItem.pms_revenue || 0;
                        const yoyRevenueVariance = actualRevenue - prevRevenue;

                        const forecastOcc = occItem.fc_occ || 0;
                        const actualOcc = occItem.occ || 0;
                        const occVariance = actualOcc - forecastOcc;
                        const prevOcc = prevOccItem.occ || 0;
                        const yoyOccVariance = actualOcc - prevOcc;

                        return {
                            hotel_name: revItem.hotel_name,
                            forecastRevenue,
                            actualRevenue,
                            revenueVariance,
                            prevRevenue,
                            yoyRevenueVariance,
                            forecastOcc,
                            actualOcc,
                            occVariance,
                            prevOcc,
                            yoyOccVariance
                        };
                    });

                // Sort independently
                const revenueSorted = [...hotelMetrics].sort((a, b) => b.revenueVariance - a.revenueVariance);
                const occupancySorted = [...hotelMetrics].sort((a, b) => b.occVariance - a.occVariance);

                // Write data side-by-side
                revenueSorted.forEach((item, index) => {
                    const currentRow = startRow + 1 + index;
                    const row = dataSheet.row(currentRow);

                    // Revenue section (Cols 1-6)
                    row.cell(1).value(item.hotel_name);
                    row.cell(2).value(item.forecastRevenue).style("numberFormat", "#,##0");
                    row.cell(3).value(item.actualRevenue).style("numberFormat", "#,##0");
                    row.cell(4).value(item.revenueVariance).style("numberFormat", "#,##0");
                    row.cell(5).value(item.prevRevenue).style("numberFormat", "#,##0");
                    row.cell(6).value(item.yoyRevenueVariance).style("numberFormat", "#,##0");

                    // Formulas for columns O, P, Q (division by 10000)
                    row.cell(15).formula(`B${currentRow}/10000`).style("numberFormat", "#,##0");
                    row.cell(16).formula(`C${currentRow}/10000`).style("numberFormat", "#,##0");
                    row.cell(17).formula(`D${currentRow}/10000`).style("numberFormat", "#,##0");
                });

                occupancySorted.forEach((item, index) => {
                    const currentRow = startRow + 1 + index;
                    const row = dataSheet.row(currentRow);

                    // Occupancy section (Starts from Col 8 / H)
                    row.cell(8).value(item.hotel_name);
                    row.cell(9).value(item.forecastOcc / 100).style("numberFormat", "0.0%");
                    row.cell(10).value(item.actualOcc / 100).style("numberFormat", "0.0%");
                    row.cell(11).value(item.occVariance / 100).style("numberFormat", "0.0%");
                    row.cell(12).value(item.prevOcc / 100).style("numberFormat", "0.0%");
                    row.cell(13).value(item.yoyOccVariance / 100).style("numberFormat", "0.0%");
                });
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
    } = req.body;

    let generatedFilePath = null;
    try {
        generatedFilePath = await generateDailyReportPdf(req.body, requestId, outputFormat);

        const formattedDate = targetDate ? targetDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');
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
    }
};

module.exports = {
    getDailyTemplatePdf,
    generateDailyReportPdf
};
