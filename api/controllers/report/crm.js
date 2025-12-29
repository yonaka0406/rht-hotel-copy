const crmReportModel = require('../../models/report/crm');
const logger = require('../../config/logger');
const { validateDateStringParam } = require('../../utils/validationUtils');

/**
 * Shared helper for CRM report controllers to handle common validation, parsing, and error handling.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} modelFn - The specific model function to call.
 * @param {String} label - Label for logging.
 * @param {Number} defaultLimit - Default limit if not provided.
 */
const _fetchCrmReport = async (req, res, modelFn, label, defaultLimit) => {
  const { sdate, edate } = req.params;
  const requestId = req.requestId;

  // 1. Validate dates
  const validSdate = validateDateStringParam(sdate, 'sdate');
  const validEdate = validateDateStringParam(edate, 'edate');

  if (!validSdate || !validEdate) {
    logger.warn(`[${label}] Invalid or missing dates. requestId: ${requestId}, sdate: ${sdate}, edate: ${edate}`);
    return res.status(400).json({ error: 'Invalid or missing sdate/edate' });
  }

  // 2. Parse and normalize query params
  const includeTemp = req.query.include_temp === 'true';
  const minSales = Math.max(0, parseInt(req.query.min_sales, 10) || 0);
  
  // Enforce positive integer and safe maximums for limit
  let parsedLimit = parseInt(req.query.limit, 10);
  if (isNaN(parsedLimit) || parsedLimit < 1) {
    parsedLimit = defaultLimit;
  }
  // Clamp to reasonable max (e.g. 1000 for top bookers, 50000 for full monthly)
  const maxLimit = defaultLimit > 1000 ? 50000 : 1000;
  const limit = Math.min(maxLimit, parsedLimit);

  // 3. Execute model call
  try {
    const result = await modelFn(requestId, validSdate, validEdate, includeTemp, minSales, limit);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`[${label}] Error for requestId: ${requestId}: ${error.message}`, { requestId, error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getTopBookers = async (req, res) => {
  return _fetchCrmReport(req, res, crmReportModel.getTopBookers, 'getTopBookers', 200);
};

const getSalesByClientByMonth = async (req, res) => {
  return _fetchCrmReport(req, res, crmReportModel.getSalesByClientByMonth, 'getSalesByClientByMonth', 10000);
};

module.exports = {
  getTopBookers,
  getSalesByClientByMonth,
};
