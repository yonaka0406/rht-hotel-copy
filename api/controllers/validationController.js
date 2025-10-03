const validationModel = require('../models/validation');

const getDoubleBookings = async (req, res) => {
  try {
    const data = await validationModel.getDoubleBookings(req.requestId);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getEmptyReservations = async (req, res) => {
  try {
    const data = await validationModel.getEmptyReservations(req.requestId);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  getDoubleBookings,
  getEmptyReservations,
};