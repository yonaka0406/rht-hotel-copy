const systemLogsModel = require('../../models/system_logs');
const { validateDateParam } = require('../../utils/validationUtils');

const getReservationLogs = async (req, res) => {
  const { date, limit, offset } = req.query;
  const validatedDate = validateDateParam(date);

  if (!validatedDate) {
    return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
  }

  try {
    const parsedLimit = parseInt(limit, 10);
    const parsedOffset = parseInt(offset, 10);

    const logs = await systemLogsModel.getReservationLogsByDate(req.requestId, validatedDate, parsedLimit, parsedOffset);
    res.status(200).json(logs);
  } catch (error) {
    req.app.locals.logger.error(error, { requestId: req.requestId, route: req.originalUrl });
    res.status(500).json({ message: 'Error fetching reservation logs' });
  }
};

module.exports = {
  getReservationLogs,
};
