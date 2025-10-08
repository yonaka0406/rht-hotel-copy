const { selectCountReservation, selectCountReservationDetailsPlans, selectCountReservationDetailsAddons, selectOccupationByPeriod, 
  selectReservationListView, selectForecastData, selectAccountingData, selectForecastDataByPlan, selectAccountingDataByPlan,
  selectReservationsInventory, selectAllRoomTypesInventory, selectReservationsForGoogle, selectParkingReservationsForGoogle, 
  selectActiveReservationsChange,
  selectMonthlyReservationEvolution, selectSalesByPlan, selectOccupationBreakdown, selectChannelSummary, selectCheckInOutReport } = require('../../models/report');
const { authorize, appendDataToSheet, createSheet } = require('../../utils/googleUtils');

const logger = require('../../config/logger');

const { formatDate, translateStatus, translatePaymentTiming, translateType, translatePlanType, translateMealType } = require('../../utils/reportUtils');

const getCountReservation = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectCountReservation(req.requestId, hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(200).json([]);
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
    const planData = await selectCountReservationDetailsPlans(req.requestId, hotelId, startDate, endDate);
    const addonData = await selectCountReservationDetailsAddons(req.requestId, hotelId, startDate, endDate);     
    
    if ((!planData && !addonData) || (planData.length === 0 && addonData.length === 0)) {
      return res.json({});
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
    const data = await selectOccupationByPeriod(req.requestId, period, hotelId, refDate);
    
    if (!data || data.length === 0) {      
      return res.json([{
        room_count: 0,
        available_rooms: 0,        
      }]);
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
  const searchType = req.params.search_type;

  try {    
    const data = await selectReservationListView(req.requestId, hotelId, startDate, endDate, searchType);    
    
    // Return empty array with 200 status
    if (!data || data.length === 0) {
      return res.json([]);
    } 

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getForecastData = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectForecastData(req.requestId, hotelId, startDate, endDate);    
    
    // Return empty array with 200 status if no data found
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const getAccountingData = async (req, res) => {
  const { hid, sdate, edate } = req.params;
  try {
    const data = await selectAccountingData(req.requestId, hid, sdate, edate);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Request ${req.requestId}] Error in getAccountingData:`, error);
    res.status(500).json({ message: 'Error fetching accounting data' });
  }
};

const getForecastDataByPlan = async (req, res) => {
  const { hid, sdate, edate } = req.params;
  try {
    const data = await selectForecastDataByPlan(req.requestId, hid, sdate, edate);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Request ${req.requestId}] Error in getForecastDataByPlan:`, error);
    res.status(500).json({ message: 'Error fetching forecast data by plan' });
  }
};

const getAccountingDataByPlan = async (req, res) => {
  const { hid, sdate, edate } = req.params;
  try {
    const data = await selectAccountingDataByPlan(req.requestId, hid, sdate, edate);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] [Request ${req.requestId}] Error in getAccountingDataByPlan:`, error);
    res.status(500).json({ message: 'Error fetching accounting data by plan' });
  }
};

const getReservationsInventory = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {
    const data = await selectReservationsInventory(req.requestId, hotelId, startDate, endDate); 

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const getAllInventory = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectAllRoomTypesInventory(req.requestId, hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getReservationsForGoogle = async (req, res) => {
  const sheetId = req.params.sid;
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {    
    const dataToAppend = await selectReservationsForGoogle(req.requestId, hotelId, startDate, endDate);    
    
    if (!dataToAppend || dataToAppend.length === 0) {
      return res.status(200).json([]);
    }

    const formattedData = formatDataForSheet(dataToAppend);
    
    const sheetName = `H_${hotelId}`;
    await appendDataToSheet(sheetId, sheetName, formattedData);

    res.json({success: 'Sheet update request made'});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const formatDataForSheet = (reservations) => {    
  // Format each reservation as an array in the same order as headers
  const rows = reservations.map(reservation => {
    let displayCell = '';    
    if (reservation.status === "hold") {
      displayCell += "㋭｜";
    } else if (reservation.status === "provisory") {
      displayCell += "㋕｜";
    }
    if (reservation.client_name) {
      displayCell += String(reservation.client_name || '');
    }
    if (reservation.plan_name) {
      displayCell += "、" + String(reservation.plan_name || '');
    }
    if (reservation.agent) {
      displayCell += "、㋔｜" + String(reservation.agent || '');
    } else if (reservation.type === "employee") {
      displayCell += "、㋛｜";
    }

    // Ensure all values are converted to strings
    return [
      String(reservation.hotel_id || ''),
      String(reservation.hotel_name || ''),
      String(reservation.reservation_detail_id || ''),
      new Date(reservation.date).toLocaleDateString('ja-JP'),
      String(reservation.room_type_name || ''),
      String(reservation.room_number || ''),
      String(reservation.client_name || ''),
      String(reservation.plan_name || ''),
      String(reservation.status || ''),
      String(reservation.type || ''),
      String(reservation.agent || ''),
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      displayCell
    ];
  });
  
  // Return data rows
  return [...rows];
};

const getParkingReservationsForGoogle = async (req, res) => {
  const sheetId = req.params.sid;
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const dataToAppend = await selectParkingReservationsForGoogle(req.requestId, hotelId, startDate, endDate);

    if (!dataToAppend || dataToAppend.length === 0) {
      return res.status(200).json([]);
    }

    const formattedData = formatParkingDataForSheet(dataToAppend);

    const authClient = await authorize();
    const sheetName = `P_${hotelId}`; // distinguish parking from rooms
    await appendDataToSheet(sheetId, sheetName, formattedData);

    res.json({ success: 'Parking sheet update request made' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const formatParkingDataForSheet = (reservations) => {
  const rows = reservations.map(reservation => {
    let displayCell = '';

    // Use reservation_status for Google display
    if (reservation.reservation_status === "hold") {
      displayCell += "㋭｜";
    } else if (reservation.reservation_status === "provisory") {
      displayCell += "㋕｜";
    }
    if (reservation.client_name) {
      displayCell += reservation.client_name;
    }
    if (reservation.vehicle_category_name) {
      displayCell += "、" + reservation.vehicle_category_name;
    }
    if (reservation.agent) {
      displayCell += "、㋔｜" + reservation.agent;
    } else if (reservation.reservation_type === "employee") {
      displayCell += "、㋛｜";
    }

    return [
      reservation.hotel_id,
      reservation.hotel_name,
      reservation.reservation_detail_id,
      new Date(reservation.date).toLocaleDateString('ja-JP'),
      reservation.vehicle_category_name || '',
      reservation.parking_lot_name || '',
      reservation.spot_number,
      reservation.client_name || '',
      reservation.addon_name || '',
      reservation.reservation_status,
      reservation.reservation_type,
      reservation.agent || '',
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      displayCell
    ];
  });

  return [...rows];
};

const createNewGoogleSheet =  async (req, res) => {
    const { title } = req.query;
    const context = { operation: 'createNewSheet', title };
    
    if (!title) {
        logger.warn('Missing required parameter: title', context);
        return res.status(400).json({ 
            success: false, 
            message: 'Title is required' 
        });
    }

    try {
        const authClient = await authorize();
        const spreadsheetId = await createSheet(authClient, title);
        
        logger.info('Successfully created new sheet', { ...context, spreadsheetId });
        return res.status(200).json({ 
            success: true, 
            data: { 
                spreadsheetId,
                spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`
            } 
        });
    } catch (error) {
        logger.error('Error creating new sheet', { ...context, error: error.message });
        return res.status(500).json({ 
            success: false, 
            message: 'Failed to create spreadsheet',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

const getActiveReservationsChange = async (req, res) => {
  const { hotel_id, date } = req.params;

  try {
    const data = await selectActiveReservationsChange(req.requestId, hotel_id, date);

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }  

    res.json(data);
  } catch (err) {
    console.error(`[${req.requestId}] Error in getActiveReservationsChange:`, err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMonthlyReservationEvolution = async (req, res) => {
  const { hotel_id, target_month } = req.params;

  try {
    // The model function selectMonthlyReservationEvolution now throws errors for invalid input
    // or returns an array (empty or with data).
    const data = await selectMonthlyReservationEvolution(req.requestId, hotel_id, target_month);

    // If data is an empty array, it means "no data found", which is a successful query.
    // res.json will handle sending a 200 OK with the array (empty or populated).
    res.json(data);

  } catch (err) {
    console.error(`[${req.requestId}] Error in getMonthlyReservationEvolution:`, err.message);
    if (err.message === 'Invalid hotel_id format.' || err.message === 'Invalid target_month format. Expected YYYY-MM-DD.') {
      res.status(400).json({ error: err.message });
    } else if (err.message === 'Database error') { // Or a more generic check if the model throws this
      res.status(500).json({ error: 'A database error occurred.' });
    }
    else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }  
};

const getSalesByPlan = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await selectSalesByPlan(req.requestId, hotelId, startDate, endDate);

    if (!data || data.length === 0) {
      return res.status(200).json([]); // Return empty array if no data
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getOccupationBreakdown = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await selectOccupationBreakdown(req.requestId, hotelId, startDate, endDate);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data); // The query now returns multiple rows (an array of objects)
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getChannelSummary = async (req, res) => {
  const { hotelIds, startDate, endDate } = req.body;

  try {
    const data = await selectChannelSummary(req.requestId, hotelIds, startDate, endDate);
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getCheckInOutReport = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await selectCheckInOutReport(req.requestId, hotelId, startDate, endDate);

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
  getCountReservation,
  getCountReservationDetails,
  getOccupationByPeriod,
  getReservationListView,
  getForecastData, 
  getAccountingData,  
  getReservationsInventory,
  getAllInventory,
  getReservationsForGoogle,
  getParkingReservationsForGoogle,
  createNewGoogleSheet,  
  getActiveReservationsChange,
  getMonthlyReservationEvolution,
  getSalesByPlan,
  getOccupationBreakdown,
  getChannelSummary,
  getCheckInOutReport,
  getForecastDataByPlan,
  getAccountingDataByPlan,
}