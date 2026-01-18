const receivablesModel = require('../../../models/accounting/receivables');
const logger = require('../../../config/logger');

/**
 * GET /api/accounting/receivables/balances
 * Fetches all sub-accounts under '売掛金' with their cumulative balances.
 */
const getBalances = async (req, res) => {
    try {
        const { minBalance } = req.query;
        const balances = await receivablesModel.getReceivableBalances(req.requestId, { 
            minBalance: minBalance ? parseFloat(minBalance) : 0 
        });
        
        res.json({
            success: true,
            data: balances
        });
    } catch (err) {
        logger.error(`[ReceivablesController] Error fetching balances: ${err.message}`);
        res.status(500).json({
            success: false,
            message: '売掛金残高の取得に失敗しました。'
        });
    }
};

/**
 * GET /api/accounting/receivables/search-clients
 * Searches for clients across the system.
 */
const searchClients = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query || query.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        const clients = await receivablesModel.searchClients(req.requestId, query.trim());
        
        res.json({
            success: true,
            data: clients
        });
    } catch (err) {
        logger.error(`[ReceivablesController] Error searching clients: ${err.message}`);
        res.status(500).json({
            success: false,
            message: 'クライアントの検索に失敗しました。'
        });
    }
};

module.exports = {
    getBalances,
    searchClients
};
