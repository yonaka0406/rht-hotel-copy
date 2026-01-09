const accountingModel = require('../../models/accounting');
const hotelModel = require('../../models/hotel/read');
const planModel = require('../../models/plan/categories');
const logger = require('../../config/logger');
const ExcelJS = require('exceljs');

const getExportOptions = async (req, res) => {
    const { requestId } = req;
    try {
        const [hotels, planTypes] = await Promise.all([
            hotelModel.getAllHotels(requestId),
            planModel.selectAllPlanTypeCategories(requestId)
        ]);

        res.json({
            hotels: hotels.map(h => ({ id: h.id, name: h.name })),
            planTypes: planTypes.map(p => ({ id: p.id, name: p.name }))
        });
    } catch (error) {
        logger.error(`[${requestId}] Error in getExportOptions:`, error);
        res.status(500).json({ message: 'Error fetching export options' });
    }
};

const getLedgerPreview = async (req, res) => {
    const { requestId, body } = req;
    try {
        const { startDate, endDate, hotelIds, planTypeCategoryIds } = body;

        // Validation
        if (!startDate || !endDate || !hotelIds || !planTypeCategoryIds) {
            return res.status(400).json({ message: 'Missing required filters' });
        }

        const data = await accountingModel.getLedgerPreview(requestId, {
            startDate,
            endDate,
            hotelIds,
            planTypeCategoryIds
        });

        res.json(data);
    } catch (error) {
        logger.error(`[${requestId}] Error in getLedgerPreview:`, error);
        res.status(500).json({ message: 'Error fetching ledger preview' });
    }
};

const exportLedger = async (req, res) => {
    const { requestId, body } = req;
    try {
        const { startDate, endDate, hotelIds, planTypeCategoryIds, format } = body;

        const data = await accountingModel.getLedgerPreview(requestId, {
            startDate,
            endDate,
            hotelIds,
            planTypeCategoryIds
        });

        if (format === 'excel') {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sales Ledger');

            worksheet.columns = [
                { header: 'ホテル', key: 'hotel_name', width: 30 },
                { header: 'プランタイプ', key: 'plan_type_category_name', width: 20 },
                { header: '勘定コード', key: 'account_code', width: 15 },
                { header: '勘定科目名', key: 'account_name', width: 25 },
                { header: '合計金額', key: 'total_amount', width: 15 }
            ];

            data.forEach(row => {
                worksheet.addRow({
                    hotel_name: row.hotel_name,
                    plan_type_category_name: row.plan_type_category_name,
                    account_code: row.account_code || '未設定',
                    account_name: row.account_name || '未設定',
                    total_amount: parseInt(row.total_amount)
                });
            });

            // Formatting
            worksheet.getColumn('total_amount').numFmt = '#,##0';

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=sales_ledger_${startDate}_${endDate}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
        } else if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=sales_ledger_${startDate}_${endDate}.csv`);
            
            // Simple CSV generation
            const header = 'ホテル,プランタイプ,勘定コード,勘定科目名,合計金額\n';
            const rows = data.map(row => 
                `"${row.hotel_name}","${row.plan_type_category_name}","${row.account_code || ''}","${row.account_name || ''}",${row.total_amount}`
            ).join('\n');
            
            res.send('\ufeff' + header + rows); // Add BOM for Excel UTF-8 support
        } else {
            res.json(data); // Default to JSON
        }
    } catch (error) {
        logger.error(`[${requestId}] Error in exportLedger:`, error);
        res.status(500).json({ message: 'Error exporting ledger' });
    }
};

module.exports = {
    getExportOptions,
    getLedgerPreview,
    exportLedger
};
