const { selectCountReservation } = require('../models/report');

const getCountReservation = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectCountReservation(hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { 
  getCountReservation,
};