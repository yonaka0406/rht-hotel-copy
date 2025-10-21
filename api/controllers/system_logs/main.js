const systemLogsModel = require('../../models/system_logs');
const { validateDateParam } = require('../../utils/validationUtils');

const getReservationLogs = async (req, res) => {
  const { date } = req.query;
  const validatedDate = validateDateParam(date);

  if (!validatedDate) {
    return res.status(400).json({ message: 'Invalid date format. Please use YYYY-MM-DD.' });
  }

  try {
    const logs = await systemLogsModel.getReservationLogsByDate(req.requestId, validatedDate);
    res.status(200).json(logs);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching reservation logs' });
  }
};

module.exports = {
  getReservationLogs,
};
