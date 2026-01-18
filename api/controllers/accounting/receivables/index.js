const receivablesModel = require('../../../models/accounting/receivables');
const logger = require('../../../config/logger');

/**
 * GET /api/accounting/receivables/balances
 * Fetches all sub-accounts under '売掛金' with their cumulative balances.
 */
const getBalances = async (req, res) => {
    try {
        const { minBalance } = req.query;
        logger.debug(`[ReceivablesController] getBalances called. requestId: ${req.requestId}, minBalance: ${minBalance}`);
        
        const balances = await receivablesModel.getReceivableBalances(req.requestId, { 
            minBalance: minBalance ? parseFloat(minBalance) : 0 
        });
        
        logger.debug(`[ReceivablesController] getBalances success. Found ${balances.length} items.`);
        
        res.json({
            success: true,
            data: balances
        });
    } catch (err) {
        logger.error(`[ReceivablesController] Error fetching balances: ${err.message}`, { stack: err.stack });
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
        logger.debug(`[ReceivablesController] searchClients called. requestId: ${req.requestId}, query: ${query}`);
        
        if (!query || query.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        const clients = await receivablesModel.searchClients(req.requestId, query.trim());
        
        logger.debug(`[ReceivablesController] searchClients success. Found ${clients.length} results.`);
        
        res.json({
            success: true,
            data: clients
        });
    } catch (err) {
        logger.error(`[ReceivablesController] Error searching clients: ${err.message}`, { stack: err.stack });
        res.status(500).json({
            success: false,
            message: 'クライアントの検索に失敗しました。'
        });
    }
};

/**
 * GET /api/accounting/receivables/history
 * Fetches the monthly history of a specific sub-account.
 */
const getHistory = async (req, res) => {
    try {
        const { subAccount } = req.query;
        logger.debug(`[ReceivablesController] getHistory called. requestId: ${req.requestId}, subAccount: ${subAccount}`);
        
        if (!subAccount) {
            return res.status(400).json({ success: false, message: 'サブアカウント名が必要です。' });
        }

        const history = await receivablesModel.getReceivableSubAccountHistory(req.requestId, subAccount);
        
        res.json({
            success: true,
            data: history
        });
    } catch (err) {
        logger.error(`[ReceivablesController] Error fetching history: ${err.message}`, { stack: err.stack });
        res.status(500).json({
            success: false,
            message: '履歴の取得に失敗しました。'
        });
    }
};

module.exports = {
    getBalances,
    searchClients,
    getHistory
};
