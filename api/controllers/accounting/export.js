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
        if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
            return res.status(400).json({ message: 'Invalid format for selectedMonth. Expected YYYY-MM' });
        }

        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            return res.status(400).json({ message: 'Missing required filters: hotelIds must be a non-empty array' });
        }

        // Calculate startDate and endDate from selectedMonth (YYYY-MM)
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const filters = {
            startDate,
            endDate,
            hotelIds
        };

        // Fetch ledger data and validation results in parallel
        const [data, validation] = await Promise.all([
            accountingModel.accountingRead.getLedgerPreview(requestId, filters),
            accountingModel.integrity.validateLedgerDataIntegrity(requestId, filters)
        ]);

        res.json({
            data,
            validation: validation.length > 0 ? validation : null
        });
    } catch (error) {
        logger.error(`[${requestId}] Error in getLedgerPreview:`, error);
        res.status(500).json({ message: 'Error fetching ledger preview' });
    }
};

const exportLedger = async (req, res) => {
    const { requestId, body } = req;
    try {
        const { selectedMonth, hotelIds, format } = body;

        // Validate inputs
        if (!selectedMonth || typeof selectedMonth !== 'string' || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
            return res.status(400).json({ message: 'Invalid or missing selectedMonth. Expected YYYY-MM format.' });
        }

        const hotelIdsArray = Array.isArray(hotelIds) ? hotelIds : (hotelIds ? [hotelIds] : []);
        if (hotelIdsArray.length === 0) {
            return res.status(400).json({ message: 'Missing hotelIds.' });
        }

        if (format !== 'csv') {
            return res.status(400).json({ message: 'Only CSV format is supported for this export' });
        }

        // Calculate startDate and endDate from selectedMonth (YYYY-MM)
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const data = await accountingModel.accountingRead.getLedgerPreview(requestId, {
            startDate,
            endDate,
            hotelIds: hotelIdsArray
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=yayoi_export_${startDate}_${endDate}.csv`);

        // Yayoi 25-Column Format (No Header)
        // 1:識別フラグ, 2:伝票No, 3:決算, 4:取引日付, 5:借方勘定科目, 6:借方補助科目, 7:借方部門, 8:借方税区分, 9:借方金額, 10:借方税金額,
        // 11:貸方勘定科目, 12:貸方補助科目, 13:貸方部門, 14:貸方税区分, 15:貸方金額, 16:貸方税金額, 17:摘要, 18:番号, 19:期日, 20:タイプ,
        // 21:生成元, 22:仕訳メモ, 23:付箋1, 24:付箋2, 25:調整

        const yayoiDate = startDate.replace(/-/g, '/'); // YYYY/MM/DD

        const rows = data.map((row, index) => {
            let flag = '2111'; // Default for single row
            if (data.length > 1) {
                if (index === 0) flag = '2110';
                else if (index === data.length - 1) flag = '2101';
                else flag = '2100';
            }

            // Calculate tax amount (rounded down)
            // For tax-inclusive amounts: tax = floor(total / (1 + rate) * rate)
            const taxRate = parseFloat(row.tax_rate) || 0;
            const totalAmount = parseFloat(row.total_amount) || 0;
            const taxAmount = taxRate > 0
                ? Math.floor(totalAmount / (1 + taxRate) * taxRate)
                : 0;

            // Format summary: {hotel_name}売上 - {plan_name}
            const summary = `${row.hotel_name}売上 - ${row.display_category_name || ''}`;

            const cols = [
                flag,                 // 1: 識別フラグ
                '',                   // 2: 伝票No
                '',                   // 3: 決算
                yayoiDate,            // 4: 取引日付
                '売掛金',              // 5: 借方勘定科目 (Debit: Accounts Receivable)
                '',                   // 6: 借方補助科目 (Debit: No sub-account)
                row.department_code || '', // 7: 借方部門 (Debit: Department code)
                '対象外',             // 8: 借方税区分 (Debit: Tax-exempt)
                totalAmount,          // 9: 借方金額 (Debit: Amount)
                '0',                  // 10: 借方税金額 (Debit: Tax amount - A/R is tax-exempt)
                row.account_name || '未設定', // 11: 貸方勘定科目 (Credit: Sales account)
                row.display_category_name || '', // 12: 貸方補助科目 (Credit: Plan name as sub-account)
                row.department_code || '', // 13: 貸方部門 (Credit: Department code)
                row.tax_category || '対象外', // 14: 貸方税区分 (Credit: Tax category)
                totalAmount,          // 15: 貸方金額 (Credit: Amount)
                taxAmount,            // 16: 貸方税金額 (Credit: Calculated tax)
                summary,              // 17: 摘要 (Summary: {hotel}売上 - {plan})
                '',                   // 18: 番号
                '',                   // 19: 期日
                '0',                  // 20: タイプ
                '',                   // 21: 生成元
                '',                   // 22: 仕訳メモ
                '0',                  // 23: 付箋1
                '0',                  // 24: 付箋2
                'no'                  // 25: 調整
            ];
            return cols.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',');
        }).join('\n');

        res.send('\ufeff' + rows); // Add BOM, no header
    } catch (error) {
        logger.error(`[${requestId}] Error in exportLedger:`, error);
        res.status(500).json({ message: 'Error exporting ledger' });
    }
};

/**
 * Get raw data for integrity analysis (PMS and Yayoi data)
 */
const getRawDataForIntegrityAnalysis = async (req, res) => {
    const requestId = req.requestId;

    try {
        const { selectedMonth, hotelIds } = req.body;

        // Validation
        if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
            return res.status(400).json({ message: 'Invalid format for selectedMonth. Expected YYYY-MM' });
        }

        let hotelIdsArray;
        if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
            hotelIdsArray = hotelIds;
        } else {
            // If no hotel IDs provided, get all hotels that have department mappings
            const hotelsWithDepts = await accountingModel.accountingRead.getHotelsWithDepartments(requestId);
            hotelIdsArray = hotelsWithDepts.map(h => h.hotel_id);
            logger.debug(`[${requestId}] Using hotels with department mappings for analysis: ${hotelIdsArray}`);
        }

        if (hotelIdsArray.length === 0) {
            return res.status(400).json({ message: 'No hotels with department mappings found' });
        }

        // Calculate startDate and endDate from selectedMonth (YYYY-MM)
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const filters = {
            startDate,
            endDate,
            hotelIds: hotelIdsArray
        };

        const result = await accountingModel.integrity.getRawDataForIntegrityAnalysis(requestId, filters);

        res.json({
            period: selectedMonth,
            rawData: result.details,  // Detailed data for drill-down
            hotelTotals: result.totals.hotelTotals  // Pre-calculated totals for summary
        });
    } catch (error) {
        logger.error(`[${requestId}] Error in getRawDataForIntegrityAnalysis:`, error);
        res.status(500).json({ message: 'Error fetching raw data for integrity analysis' });
    }
};

/**
 * Get available months from Yayoi data for period selection
 */
const getAvailableYayoiMonths = async (req, res) => {
    const requestId = req.requestId;

    try {
        const months = await accountingModel.accountingRead.getAvailableYayoiMonths(requestId);
        
        const response = {
            months: months.map(m => ({
                value: m.month_key,
                label: m.month_label,
                year: parseInt(m.year),
                month: parseInt(m.month),
                transactionCount: parseInt(m.transaction_count),
                earliestDate: m.earliest_date,
                latestDate: m.latest_date
            })),
            hasData: months.length > 0,
            latestMonth: months.length > 0 ? months[0].month_key : null
        };

        res.json(response);
    } catch (error) {
        logger.error(`[${requestId}] Error in getAvailableYayoiMonths:`, error);
        res.status(500).json({ message: 'Error fetching available Yayoi months' });
    }
};

/**
 * Get available years from Yayoi data for chart navigation
 */
const getAvailableYayoiYears = async (req, res) => {
    const requestId = req.requestId;

    try {
        const years = await accountingModel.accountingRead.getAvailableYayoiYears(requestId);
        
        const response = {
            years: years.map(y => ({
                ...y,
                year: parseInt(y.year) // Ensure year is a number
            })),
            latestYear: years.length > 0 ? parseInt(years[0].year) : new Date().getFullYear(),
            hasData: years.length > 0
        };
        
        res.json(response);
    } catch (error) {
        logger.error(`[${requestId}] Error in getAvailableYayoiYears:`, error);
        res.status(500).json({ message: 'Error fetching available Yayoi years' });
    }
};

/**
 * Get monthly sales comparison data for chart display
 */
const getMonthlySalesComparison = async (req, res) => {
    const requestId = req.requestId;

    try {
        const { year, hotelIds } = req.query;

        // Validation
        const yearNum = parseInt(year);
        if (!year || isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
            return res.status(400).json({ message: 'Invalid year parameter. Expected 2020-2030' });
        }

        let hotelIdsArray;
        if (hotelIds) {
            hotelIdsArray = Array.isArray(hotelIds) ? hotelIds.map(Number) : hotelIds.split(',').map(Number);
        } else {
            // If no hotel IDs provided, get all hotels that have department mappings
            const hotelsWithDepts = await accountingModel.accountingRead.getHotelsWithDepartments(requestId);
            hotelIdsArray = hotelsWithDepts.map(h => h.hotel_id);
            logger.debug(`[${requestId}] Using hotels with department mappings: ${hotelIdsArray}`);
        }

        const filters = {
            year: yearNum,
            hotelIds: hotelIdsArray
        };

        const monthlyData = await accountingModel.accountingRead.getMonthlySalesComparison(requestId, filters);

        res.json({
            year: yearNum,
            monthlyData
        });
    } catch (error) {
        logger.error(`[${requestId}] Error in getMonthlySalesComparison:`, error);
        res.status(500).json({ message: 'Error fetching monthly sales comparison' });
    }
};

/**
 * Compare PMS calculated sales vs imported Yayoi data for the same period
 */
const comparePmsVsYayoi = async (req, res) => {
    const requestId = req.requestId;

    try {
        const { selectedMonth, hotelIds } = req.body;

        // Validation
        if (!selectedMonth || !/^\d{4}-\d{2}$/.test(selectedMonth)) {
            return res.status(400).json({ message: 'Invalid format for selectedMonth. Expected YYYY-MM' });
        }

        let hotelIdsArray;
        if (hotelIds && Array.isArray(hotelIds) && hotelIds.length > 0) {
            hotelIdsArray = hotelIds;
        } else {
            // If no hotel IDs provided, get all hotels that have department mappings
            const hotelsWithDepts = await accountingModel.accountingRead.getHotelsWithDepartments(requestId);
            hotelIdsArray = hotelsWithDepts.map(h => h.hotel_id);
            logger.debug(`[${requestId}] Using hotels with department mappings for comparison: ${hotelIdsArray}`);
        }

        if (hotelIdsArray.length === 0) {
            return res.status(400).json({ message: 'No hotels with department mappings found' });
        }

        // Calculate startDate and endDate from selectedMonth (YYYY-MM)
        const [year, month] = selectedMonth.split('-').map(Number);
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        const filters = {
            startDate,
            endDate,
            hotelIds: hotelIdsArray
        };

        const comparison = await accountingModel.accountingRead.comparePmsVsYayoiData(requestId, filters);

        res.json({
            period: selectedMonth,
            comparison,
            hasDiscrepancies: comparison.length > 0
        });
    } catch (error) {
        logger.error(`[${requestId}] Error in comparePmsVsYayoi:`, error);
        res.status(500).json({ message: 'Error comparing PMS vs Yayoi data' });
    }
};

/**
 * Get detailed reservation data for a specific plan
 */
const getPlanReservationDetails = async (req, res) => {
    const requestId = req.requestId;

    try {
        const { hotelId, planName, selectedMonth, taxRate } = req.body;

        if (!hotelId || !planName || !selectedMonth) {
            return res.status(400).json({ 
                message: 'Missing required parameters: hotelId, planName, selectedMonth' 
            });
        }

        const filters = {
            hotelId: parseInt(hotelId),
            planName,
            selectedMonth,
            taxRate: parseFloat(taxRate) || 0.10
        };

        const result = await accountingModel.integrity.getPlanReservationDetails(requestId, filters);

        res.json({
            success: true,
            data: result,
            message: `Found ${result.length} reservation details for plan ${planName}`
        });
    } catch (error) {
        logger.error(`[${requestId}] Error in getPlanReservationDetails:`, error);
        res.status(500).json({ message: 'Error fetching plan reservation details' });
    }
};

module.exports = {
    getExportOptions,
    getLedgerPreview,
    exportLedger,
    comparePmsVsYayoi,
    getMonthlySalesComparison,
    getAvailableYayoiYears,
    getAvailableYayoiMonths,
    getRawDataForIntegrityAnalysis,
    getPlanReservationDetails
};
