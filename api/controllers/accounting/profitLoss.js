const profitLossModel = require('../../models/accounting/profitLoss');

/**
 * POST /api/accounting/profit-loss/detailed
 * Get detailed P&L data with tax information for CSV export
 */
async function getProfitLossDetailed(req, res) {
  try {
    const { startMonth, endMonth, departmentNames } = req.body;
    
    const filters = {
      startMonth: startMonth || null,
      endMonth: endMonth || null,
      departmentNames: departmentNames && Array.isArray(departmentNames) ? departmentNames : null
    };
    
    const data = await profitLossModel.getProfitLossDetailed(req.id, filters);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching detailed P&L data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch detailed P&L data',
      error: error.message
    });
  }
}

/**
 * POST /api/accounting/profit-loss
 * Get detailed P&L data
 */
async function getProfitLoss(req, res) {
  try {
    const { startMonth, endMonth, departmentNames } = req.body;
    
    const filters = {
      startMonth: startMonth || null,
      endMonth: endMonth || null,
      departmentNames: departmentNames && Array.isArray(departmentNames) ? departmentNames : null
    };
    
    const data = await profitLossModel.getProfitLoss(req.id, filters);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching P&L data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch P&L data',
      error: error.message
    });
  }
}

/**
 * POST /api/accounting/profit-loss/summary
 * Get summarized P&L data grouped by management group
 */
async function getProfitLossSummary(req, res) {
  try {
    const { startMonth, endMonth, departmentNames, groupBy } = req.body;
    
    const filters = {
      startMonth: startMonth || null,
      endMonth: endMonth || null,
      departmentNames: departmentNames && Array.isArray(departmentNames) ? departmentNames : null,
      groupBy: groupBy || 'month'
    };
    
    const data = await profitLossModel.getProfitLossSummary(req.id, filters);
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching P&L summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch P&L summary',
      error: error.message
    });
  }
}

/**
 * GET /api/accounting/profit-loss/months
 * Get available months
 */
async function getAvailableMonths(req, res) {
  try {
    const months = await profitLossModel.getAvailableMonths(req.id);
    
    res.json({
      success: true,
      data: months
    });
  } catch (error) {
    console.error('Error fetching available months:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available months',
      error: error.message
    });
  }
}

/**
 * GET /api/accounting/profit-loss/departments
 * Get available departments
 */
async function getAvailableDepartments(req, res) {
  try {
    const departments = await profitLossModel.getAvailableDepartments(req.id);
    
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching available departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available departments',
      error: error.message
    });
  }
}

module.exports = {
  getProfitLoss,
  getProfitLossDetailed,
  getProfitLossSummary,
  getAvailableMonths,
  getAvailableDepartments
};
