const accountingModel = require('../../models/accounting');
const { validateNumericParam } = require('../../utils/validationUtils');
const logger = require('../../config/logger');

/**
 * Get cost breakdown analytics data
 */
const getCostBreakdown = async (req, res) => {
    try {
        const topN = validateNumericParam(req.query.topN, 5);

        const data = await accountingModel.accountingRead.getCostBreakdownData(req.requestId, topN);

        res.json({
            success: true,
            data
        });
    } catch (err) {
        logger.error('Error in getCostBreakdown controller:', err);
        res.status(500).json({
            success: false,
            error: '分析データの取得中にエラーが発生しました'
        });
    }
};

module.exports = {
    getCostBreakdown
};
