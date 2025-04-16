const { selectReservationHistory, selectReservationInventoryChange } = require('../models/log');

const fetchReservationHistory = async (req, res) => {
    const { id } = req.params;

    try {
      const logs = await selectReservationHistory(req.requestId, id);
      res.json(logs);
    } catch (error) {
      console.error('Error getting hotel rooms:', error);
      res.status(500).json({ error: error.message });
    }
};

const fetchReservationInventoryChange = async (req, res) => {
  const { id } = req.params;

  // console.log('fetchReservationInventoryChange controller', id);

  try {
    const logs = await selectReservationInventoryChange(req.requestId, id);
    // console.log('fetchReservationInventoryChange', logs)
    res.json(logs);
  } catch (error) {
    console.error('Error getting hotel rooms:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
    fetchReservationHistory,
    fetchReservationInventoryChange,    
};