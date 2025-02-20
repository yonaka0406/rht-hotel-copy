const { selectCountReservation, selectCountReservationDetailsPlans, selectCountReservationDetailsAddons, selectOccupationByPeriod, selectReservationListView } = require('../models/report');

const formatDate = (date) => {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
      console.error("Invalid Date object:", date);
      throw new Error("The provided input is not a valid Date object:");
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const getCountReservationDetails = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const planData = await selectCountReservationDetailsPlans(hotelId, startDate, endDate);
    const addonData = await selectCountReservationDetailsAddons(hotelId, startDate, endDate);     
    
    if ((!planData && !addonData) || (planData.length === 0 && addonData.length === 0)) {
      return res.status(404).json({ error: 'No data found' });
    }

    const mergedData = {};

    // Process planData
    planData.forEach(item => {
        const date = formatDate(item.date);  // Assuming 'date' is the common field
        if (!mergedData[date]) {
            mergedData[date] = {};
        }
        if (!mergedData[date].plans) { // Use your plan_key here, e.g., mergedData[date][plan_key] = []
            mergedData[date].plans = [];
        }
        mergedData[date].plans.push(item);
    });

    // Process addonData
    addonData.forEach(item => {
        const date = formatDate(item.date);
        if (!mergedData[date]) {
            mergedData[date] = {};
        }
        if (!mergedData[date].addons) { // Use your addon_key here, e.g., mergedData[date][addon_key] = []
            mergedData[date].addons = [];
        }
        mergedData[date].addons.push(item);
    });

    res.json(mergedData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOccupationByPeriod = async (req, res) => {
  const period = req.params.period;
  const hotelId = req.params.hid;
  const refDate = req.params.rdate;  
  
  try {    
    const data = await selectOccupationByPeriod(period, hotelId, refDate);
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReservationListView = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {    
    const data = await selectReservationListView(hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { 
  getCountReservation,
  getCountReservationDetails,
  getOccupationByPeriod,
  getReservationListView,
};