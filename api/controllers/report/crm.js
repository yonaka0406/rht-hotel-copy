const crmReportModel = require('../../models/report/crm');
const logger = require('../../config/logger');
const { validateDateStringParam } = require('../../utils/validationUtils');

const getTopBookers = async (req, res) => {
  const { sdate, edate } = req.params;
  const requestId = req.requestId;

  // Validation
  const validSdate = validateDateStringParam(sdate, 'sdate');
  const validEdate = validateDateStringParam(edate, 'edate');

  if (!validSdate || !validEdate) {
    logger.warn(`[getTopBookers] Invalid or missing dates. requestId: ${requestId}, sdate: ${sdate}, edate: ${edate}`);
    return res.status(400).json({ error: 'Invalid or missing sdate/edate' });
  }

  const includeTemp = req.query.include_temp === 'true';
  const minSales = Math.max(0, parseInt(req.query.min_sales, 10) || 0);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit, 10) || 200));

  try {
    const result = await crmReportModel.getTopBookers(requestId, validSdate, validEdate, includeTemp, minSales, limit);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`[getTopBookers] Error for requestId: ${requestId}: ${error.message}`, { requestId, error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getSalesByClientByMonth = async (req, res) => {
  const { sdate, edate } = req.params;
  const requestId = req.requestId;

  // Validation
  const validSdate = validateDateStringParam(sdate, 'sdate');
  const validEdate = validateDateStringParam(edate, 'edate');

  if (!validSdate || !validEdate) {
    logger.warn(`[getSalesByClientByMonth] Invalid or missing dates. requestId: ${requestId}, sdate: ${sdate}, edate: ${edate}`);
    return res.status(400).json({ error: 'Invalid or missing sdate/edate' });
  }

  const includeTemp = req.query.include_temp === 'true';
  const limit = Math.max(1, parseInt(req.query.limit, 10) || 10000);
  const minSales = Math.max(0, parseInt(req.query.min_sales, 10) || 0);

  try {
    const result = await crmReportModel.getSalesByClientByMonth(requestId, validSdate, validEdate, includeTemp, minSales, limit);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`[getSalesByClientByMonth] Error for requestId: ${requestId}: ${error.message}`, { requestId, error });
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getTopBookers,
  getSalesByClientByMonth,
};