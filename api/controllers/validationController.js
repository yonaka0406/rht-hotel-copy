const { getPotentialDoubleBookings } = require('../models/validation');

const getDoubleBookings = async (req, res) => {
  try {
    const data = await getPotentialDoubleBookings(req.requestId);
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
};