const crmReportModel = require('../../models/report/crm');

const getTopBookers = async (req, res) => {
  const { sdate, edate } = req.params;
  const includeTemp = req.query.include_temp === 'true';
  const minSales = parseInt(req.query.min_sales) || 0;
  const limit = parseInt(req.query.limit) || 200;

  try {
    const result = await crmReportModel.getTopBookers(req.requestId, sdate, edate, includeTemp, minSales, limit);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getTopBookers:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const getSalesByClientByMonth = async (req, res) => {
  const { sdate, edate } = req.params;
  const includeTemp = req.query.include_temp === 'true';
  const limit = parseInt(req.query.limit) || 10000;

  try {
    const result = await crmReportModel.getSalesByClientByMonth(req.requestId, sdate, edate, includeTemp, 0, limit);
    
    // Check if format=csv query param is present, although the prompt implies a download.
    // Usually download means CSV or Excel. I'll provide CSV for now as it's simpler and standard.
    // If the frontend expects JSON and handles CSV conversion, I can return JSON.
    // But "download the sum of sales" usually implies a file.
    // The existing export controller returns JSON often, but let's check export.js behavior.
    // Actually, selectExportReservationList returns rows. The controller likely handles formatting.
    // I'll return JSON for now and let the frontend handle the CSV generation (Client-side CSV export is common in this app's stack: PrimeVue/JS).
    // Or I can return CSV directly.
    
    // Let's stick to JSON for the API, and the frontend can convert to CSV.
    // Or if the route is /download/, maybe it should stream a file.
    // The prompt says "download the sum of sales".
    // I will return JSON and the frontend can use a utility to download as CSV.
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getSalesByClientByMonth:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = {
  getTopBookers,
  getSalesByClientByMonth,
};
