const accountingModel = require('../../models/accounting');
const { validateNumericParam } = require('../../utils/validationUtils');
const logger = require('../../config/logger');

/**
 * Get cost breakdown analytics data
 */
const getCostBreakdown = async (req, res) => {
    try {
        const MAX_TOP_N = 100;
        let topN = 5; // Default

        if (req.query.topN !== undefined && req.query.topN !== null && String(req.query.topN).trim() !== '') {
            try {
                topN = validateNumericParam(req.query.topN, 'topN');
            } catch (validationErr) {
                // If invalid numeric format, we can either return 400 or just use default.
                // Given the instructions, let's return a 400 if it's explicitly provided but invalid.
                return res.status(400).json({
                    success: false,
                    error: validationErr.message
                });
            }
        }

        // Enforce bounds
        if (topN < 1) {
            topN = 1;
        } else if (topN > MAX_TOP_N) {
            topN = MAX_TOP_N;
        }

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
