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

const getDailyTemplatePdf = async (req, res) => {
    const requestId = req.requestId;
    const { 
        outlookData, 
        targetDate, 
        format: outputFormat = 'pdf', 
        revenueData, 
        occupancyData, 
        prevYearRevenueData,
        prevYearOccupancyData,
        selectionMessage,
        kpiData
    } = req.body;

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
        
        // Write Selection Message in 'レポート' sheet A39
        const reportSheet = workbook.sheet('レポート');
        if (reportSheet && selectionMessage) {
            reportSheet.cell('A39').value(selectionMessage);
        }

        const dataSheet = workbook.sheet('合計データ');

        if (dataSheet) {
            // Write KPI Data starting at M10 (Col 13)
            if (kpiData) {
                const kpiStartRow = 10;
                dataSheet.cell(kpiStartRow, 13).value('KPI').style({ bold: true });
                
                const kpiLabels = [
                    { label: '実績 ADR', value: kpiData.actualADR },
                    { label: '計画 ADR', value: kpiData.forecastADR },
                    { label: '実績 RevPAR', value: kpiData.actualRevPAR },
                    { label: '計画 RevPAR', value: kpiData.forecastRevPAR }
                ];

                kpiLabels.forEach((kpi, index) => {
                    const rowNum = kpiStartRow + 1 + index;
                    dataSheet.cell(rowNum, 13).value(kpi.label);
                    dataSheet.cell(rowNum, 14).value(kpi.value).style("numberFormat", "#,##0");
                });
            }

            if (Array.isArray(outlookData)) {
                outlookData.forEach((item, index) => {
                    const rowNumber = index + 2; // xlsx-populate uses 1-based indexing
                    const row = dataSheet.row(rowNumber);
                    
                    row.cell(1).value(item.month);
                    row.cell(2).value(item.forecast_sales);
                    row.cell(3).value(item.sales);
                    row.cell(4).value(item.confirmed_nights);
                    row.cell(5).value(item.forecast_occ ? item.forecast_occ / 100 : 0).style("numberFormat", "0.0%");
                    row.cell(6).value(item.occ ? item.occ / 100 : 0).style("numberFormat", "0.0%");
                    row.cell(7).value(item.metric_date);
                    row.cell(8).value(item.prev_sales);
                    row.cell(9).value(item.prev_occ ? item.prev_occ / 100 : 0).style("numberFormat", "0.0%");
                    row.cell(10).value(item.prev_confirmed_stays);
                    row.cell(11).value(item.confirmed_nights);
                    row.cell(12).value(item.total_bookable_room_nights);
                    row.cell(13).value(item.blocked_nights);
                    row.cell(14).value(item.net_available_room_nights);
                });
            }

            // Write All Facilities Revenue & Occupancy Overview starting from Row 10
            if (Array.isArray(revenueData) && Array.isArray(occupancyData)) {
                const startRow = 10;
                
                // Headers
                const headers = [
                    '施設名', '計画売上', '実績売上', '売上差異', '前年売上', '前年比差異(売上)',
                    '施設名', '計画稼働率', '実績稼働率', '稼働率差異', '前年稼働率', '前年比差異(稼働率)'
                ];
                const headerRow = dataSheet.row(startRow);
                headers.forEach((header, index) => {
                    headerRow.cell(index + 1).value(header).style({ bold: true });
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

                    // Occupancy section (Cols 7-12)
                    row.cell(7).value(item.hotel_name);
                    row.cell(8).value(item.forecastOcc / 100).style("numberFormat", "0.0%");
                    row.cell(9).value(item.actualOcc / 100).style("numberFormat", "0.0%");
                    row.cell(10).value(item.occVariance / 100).style("numberFormat", "0.0%");
                    row.cell(11).value(item.prevOcc / 100).style("numberFormat", "0.0%");
                    row.cell(12).value(item.yoyOccVariance / 100).style("numberFormat", "0.0%");
                });
            }
        }

        await workbook.toFileAsync(tempXlsxPath);

        const formattedDate = targetDate ? targetDate.replace(/-/g, '') : new Date().toISOString().slice(0, 10).replace(/-/g, '');

        if (outputFormat === 'xlsx') {
            if (fs.existsSync(tempXlsxPath)) {
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', `attachment; filename="daily_report_${formattedDate}.xlsx"`);
                const fileStream = fs.createReadStream(tempXlsxPath);
                fileStream.pipe(res);
                fileStream.on('close', () => cleanupFiles([tempXlsxPath]));
            } else {
                throw new Error('XLSX file not found');
            }
        } else {
            // PDF
            await convertExcelToPdf(tempXlsxPath, tmpDir);
            if (fs.existsSync(outputPdfPath)) {
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="daily_report_${formattedDate}.pdf"`);
                const fileStream = fs.createReadStream(outputPdfPath);
                fileStream.pipe(res);
                fileStream.on('close', () => cleanupFiles([tempXlsxPath, outputPdfPath]));
            } else {
                throw new Error('PDF file not found after conversion');
            }
        }

    } catch (error) {
        console.error(`[${requestId}] Error generating daily template ${outputFormat}:`, error);
        cleanupFiles([tempXlsxPath, outputPdfPath]);
        if (!res.headersSent) res.status(500).json({ message: 'Failed to generate file', error: error.message });
    }
};

module.exports = {
    getDailyTemplatePdf
};
