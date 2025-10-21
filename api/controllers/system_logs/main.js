const systemLogsModel = require('../../models/system_logs');
const { validateDateStringParam } = require('../../utils/validationUtils');

const getReservationLogs = async (req, res) => {
  const { date } = req.query; // Removed limit
  const validatedDate = validateDateStringParam(date, 'date');

  if (!validatedDate) {
    return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
  }

  try {
    // Removed parsedLimit

    const { logs, totalRecords } = await systemLogsModel.getReservationLogsByDate(req.requestId, validatedDate); // Removed parsedLimit
    res.status(200).json({ logs, totalRecords });
  } catch (error) {
    req.app.locals.logger.error(error, { requestId: req.requestId, route: req.originalUrl });
    res.status(500).json({ message: 'Error fetching reservation logs' });
  }
};

module.exports = {
  getReservationLogs,
};
