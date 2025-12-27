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
    const { outlookData, targetDate, format: outputFormat = 'pdf', revenueData, occupancyData } = req.body;

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
        const dataSheet = workbook.sheet('合計データ');

        if (dataSheet) {
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

                // Fix: Re-apply autoFilter to cover the new data range to prevent table corruption
                const lastRow = outlookData.length + 1;
                if (lastRow > 1) {
                    const range = dataSheet.range(1, 1, lastRow, 14);
                    range.autoFilter();
                }
            }

            // Write All Facilities Revenue & Occupancy Overview starting from Row 10
            if (Array.isArray(revenueData) && Array.isArray(occupancyData)) {
                const startRow = 10;
                
                // Headers
                const headers = ['施設名', '計画売上', '実績売上', '売上差異', '計画稼働率', '実績稼働率', '稼働率差異'];
                const headerRow = dataSheet.row(startRow);
                headers.forEach((header, index) => {
                    headerRow.cell(index + 1).value(header).style({ bold: true });
                });

                // Data
                const filteredRevenue = revenueData.filter(item => item.hotel_id !== 0);
                filteredRevenue.forEach((revItem, index) => {
                    const currentRow = startRow + 1 + index;
                    const row = dataSheet.row(currentRow);
                    const occItem = occupancyData.find(o => o.hotel_id === revItem.hotel_id) || {};

                    const forecastRevenue = revItem.forecast_revenue || 0;
                    const actualRevenue = revItem.period_revenue || revItem.acc_revenue || revItem.pms_revenue || 0;
                    const revenueVariance = actualRevenue - forecastRevenue;

                    const forecastOcc = occItem.fc_occ || 0;
                    const actualOcc = occItem.occ || 0;
                    const occVariance = actualOcc - forecastOcc;

                    row.cell(1).value(revItem.hotel_name);
                    row.cell(2).value(forecastRevenue).style("numberFormat", "#,##0");
                    row.cell(3).value(actualRevenue).style("numberFormat", "#,##0");
                    row.cell(4).value(revenueVariance).style("numberFormat", "#,##0");
                    row.cell(5).value(forecastOcc / 100).style("numberFormat", "0.0%");
                    row.cell(6).value(actualOcc / 100).style("numberFormat", "0.0%");
                    row.cell(7).value(occVariance / 100).style("numberFormat", "0.0%");
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
