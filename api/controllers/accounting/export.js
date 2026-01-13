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
        res.setHeader('Content-Disposition', `attachment; filename=yayoi_export_${startDate}_${endDate}.csv`);

        // Yayoi 25-Column Format
        // 1:識別フラグ, 2:伝票No, 3:決算, 4:取引日付, 5:借方勘定科目, 6:借方補助科目, 7:借方部門, 8:借方税区分, 9:借方金額, 10:借方税金額,
        // 11:貸方勘定科目, 12:貸方補助科目, 13:貸方部門, 14:貸方税区分, 15:貸方金額, 16:貸方税金額, 17:摘要, 18:番号, 19:期日, 20:タイプ,
        // 21:生成元, 22:仕訳メモ, 23:付箋1, 24:付箋2, 25:調整
        const header = '識別フラグ,伝票No,決算,取引日付,借方勘定科目,借方補助科目,借方部門,借方税区分,借方金額,借方税金額,貸方勘定科目,貸方補助科目,貸方部門,貸方税区分,貸方金額,貸方税金額,摘要,番号,期日,タイプ,生成元,仕訳メモ,付箋1,付箋2,調整\n';

        const yayoiDate = startDate.replace(/-/g, '/'); // YYYY/MM/DD

        const rows = data.map(row => {
            const cols = [
                '2111',               // 1: 識別フラグ (Single line slip)
                '',                   // 2: 伝票No
                '',                   // 3: 決算
                yayoiDate,            // 4: 取引日付
                '売掛金',              // 5: 借方勘定科目 (Debit A/R)
                row.hotel_name,       // 6: 借方補助科目 (Hotel Name as Sub-Account)
                '',                   // 7: 借方部門
                '対象外',             // 8: 借方税区分
                row.total_amount,     // 9: 借方金額
                '0',                  // 10: 借方税金額
                row.account_name || '未設定', // 11: 貸方勘定科目 (Sales Account)
                row.hotel_name,       // 12: 貸方補助科目 (Hotel Name)
                '',                   // 13: 貸方部門
                row.tax_category || '対象外', // 14: 貸方税区分
                row.total_amount,     // 15: 貸方金額
                '0',                  // 16: 貸方税金額
                row.display_category_name, // 17: 摘要 (Item detail)
                '',                   // 18: 番号
                '',                   // 19: 期日
                '0',                  // 20: タイプ (Journal)
                '',                   // 21: 生成元
                '',                   // 22: 仕訳メモ
                '0',                  // 23: 付箋1
                '0',                  // 24: 付箋2
                'no'                  // 25: 調整 (Adjustment)
            ];
            return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
        }).join('\n');

        res.send('\ufeff' + header + rows); // Add BOM for Excel/Yayoi UTF-8 support
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
