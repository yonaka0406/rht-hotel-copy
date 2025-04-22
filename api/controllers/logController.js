const { selectReservationHistory, selectReservationInventoryChange, selectReservationGoogleInventoryChange } = require('../models/log');

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
  const { id, type } = req.params;  

  // console.log('fetchReservationInventoryChange controller', id);

  try {
    if (type === 'google') {
      const logs = await selectReservationGoogleInventoryChange(req.requestId, id);
      res.json(logs);
    }
    if (type === 'site-controller') {
      const logs = await selectReservationInventoryChange(req.requestId, id);
      res.json(logs);
    }    
  } catch (error) {
    console.error('Error getting hotel rooms:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
    fetchReservationHistory,
    fetchReservationInventoryChange,    
};