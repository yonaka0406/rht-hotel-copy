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
        const { selectedMonth, hotelIds } = body;

        // Validation
        if (!selectedMonth || !hotelIds) {
            return res.status(400).json({ message: 'Missing required filters' });
        }

        // Calculate startDate and endDate from selectedMonth (YYYY-MM)
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const data = await accountingModel.getLedgerPreview(requestId, {
            startDate,
            endDate,
            hotelIds
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
        const { selectedMonth, hotelIds, format } = body;

        // Calculate startDate and endDate from selectedMonth (YYYY-MM)
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const data = await accountingModel.getLedgerPreview(requestId, {
            startDate,
            endDate,
            hotelIds
        });

        if (format !== 'csv') {
            return res.status(400).json({ message: 'Only CSV format is supported for this export' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=sales_ledger_${startDate}_${endDate}.csv`);

        // Simple CSV generation
        // Columns: Hotel, Plan/Addon Detail, Account Code, Account Name, Amount, Tax Category
        const header = 'ホテル,項目詳細,勘定コード,勘定科目名,合計金額,税区分\n';
        const rows = data.map(row =>
            `"${row.hotel_name}","${row.display_category_name}","${row.account_code || ''}","${row.account_name || ''}",${row.total_amount},"${row.tax_category}"`
        ).join('\n');

        res.send('\ufeff' + header + rows); // Add BOM for Excel UTF-8 support
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
