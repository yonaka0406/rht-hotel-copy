const { selectCountReservation, selectCountReservationDetailsPlans, selectCountReservationDetailsAddons, selectOccupationByPeriod, selectReservationListView, selectExportReservationList, selectExportReservationDetails } = require('../models/report');
const { format } = require("@fast-csv/format");

// Helper
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
const translateStatus = (status) => {
  switch (status) {
    case 'hold':
      return '保留中';
    case 'provisory':
      return '仮予約';
    case 'confirmed':
      return '確定';
    case 'checked_in':
      return 'チェックイン';
    case 'checked_out':
      return 'チェックアウト';
    case 'cancelled':
      return 'キャンセル';
    case 'block':
      return '予約不可';
    default:
      return '不明';
  }
};
const translateType = (type) => {
  switch (type) {    
    case 'default':
      return '通常';
    case 'employee':
      return '社員';
    case 'ota':
      return 'OTA';
    case 'web':
      return '自社ウェブ';    
    default:
      return '不明';
  }
};
const translatePlanType = (type) => {
  switch (type) {    
    case 'per_person':
      return '一人当たり';
    case 'per_room':
      return '部屋当たり';    
    default:
      return '不明';
  }
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

const getExportReservationList = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const result = await selectExportReservationList(hotelId, startDate, endDate);     

    if (!result || result.length === 0) {
      return res.status(404).send("No data available for the given dates.");
    }

    // CSV

    res.setHeader("Content-Disposition", "attachment; filename=reservations.csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.write("\uFEFF");

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    result.forEach((reservation) => {
      const clients = reservation.clients_json ? JSON.parse(reservation.clients_json) : [];
      const clientNames = clients.map(client => client.name_kana ? client.name + '(' + client.name_kana + ')' : client.name ).join(", ");
      const payers = reservation.payers_json ? JSON.parse(reservation.payers_json) : [];
      const payerNames = payers.map(client => client.name_kana ? client.name + '(' + client.name_kana + ')' : client.name ).join(", ");

      // Write data to CSV, add a formatted row
      csvStream.write({
        ホテルID: reservation.hotel_id,
        ホテル名称: reservation.formal_name,
        滞在期間:  `${startDate}～${endDate}`,
        ステータス: translateStatus(reservation.status),
        予約者: reservation.booker_name,
        予約者カナ: reservation.booker_name_kana,
        チェックイン: formatDate(new Date(reservation.check_in)),
        チェックアウト: formatDate(new Date(reservation.check_out)),        
        宿泊日数: reservation.number_of_nights,
        人数: reservation.number_of_people,
        プラン料金: Math.floor(parseFloat(reservation.plan_price)),
        アドオン料金: Math.floor(parseFloat(reservation.addon_price)),
        請求額: Math.floor(parseFloat(reservation.price)),
        入金額: Math.floor(parseFloat(reservation.payment)),        
        残高: Math.floor(parseFloat(reservation.price)) - Math.floor(parseFloat(reservation.payment)),
        宿泊者: clientNames,
        支払者: payerNames,
        予約ID: reservation.id,
      });
    });
    csvStream.end();
  } catch (err) {
    console.error("Error generating CSV:", err);
    res.status(500).send("Error generating CSV");
  }
};

const getExportReservationDetails = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const result = await selectExportReservationDetails(hotelId, startDate, endDate); 
    
    if (!result || result.length === 0) {
      return res.status(404).send("No data available for the given dates.");
    }

    // Edit totals
    const processedReservations = [];
    const seenReservationIds = new Set();
    const seenReservationDetailIds = new Set();
    
    result.forEach((reservation) => {
      const reservationId = reservation.reservation_id;
      const reservationDetailId = reservation.id;
      const isFirstOccurrence = !seenReservationIds.has(reservationId);
      const isFirstDetailOccurrence = !seenReservationDetailIds.has(reservationDetailId);
    
      if (isFirstOccurrence) {
        seenReservationIds.add(reservationId);
      }
      if (isFirstDetailOccurrence) {
        seenReservationDetailIds.add(reservationDetailId);
      }
    
      processedReservations.push({
        ...reservation,
        plan_price: isFirstDetailOccurrence
          ? Math.floor(parseFloat(reservation.plan_price) || 0)
          : null,
        payments: isFirstOccurrence
          ? Math.floor(parseFloat(reservation.payments) || 0)
          : null,
      });
    });

    // CSV

    res.setHeader("Content-Disposition", "attachment; filename=reservation_details.csv");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.write("\uFEFF");

    const csvStream = format({ headers: true });
    csvStream.pipe(res);

    processedReservations.forEach((reservation) => {
      const clients = reservation.clients_json ? JSON.parse(reservation.clients_json) : [];
      const clientNames = clients.map(client => client.name).join(", ");  // Join all client names into one string

      // Write data to CSV, add a formatted row
      csvStream.write({
        ホテルID: reservation.hotel_id,
        ホテル名称: reservation.formal_name,
        滞在期間:  `${startDate}～${endDate}`,
        ステータス: translateStatus(reservation.reservation_status),
        予約種類: translateType(reservation.reservation_type),
        予約者: reservation.booker_name,
        予約者カナ: reservation.booker_kana,
        チェックイン: formatDate(new Date(reservation.check_in)),
        チェックアウト: formatDate(new Date(reservation.check_out)),        
        宿泊日数: reservation.number_of_nights,
        予約人数: reservation.reservation_number_of_people,
        販売用部屋: reservation.for_sale ? 'はい' : 'いいえ',
        建物階: reservation.floor,
        部屋番号: reservation.room_number,
        部屋タイプ: reservation.room_type_name,
        喫煙部屋: reservation.smoking ? 'はい' : 'いいえ',
        部屋容量: reservation.capacity,
        滞在人数: reservation.number_of_people,
        日付: formatDate(new Date(reservation.date)),
        プラン名: reservation.plan_name,
        プランタイプ: translatePlanType(reservation.plan_type),
        プラン料金: reservation.plan_price,
        アドオン名: reservation.addon_name,
        アドオン数量: reservation.addon_quantity,
        アドオン単価: reservation.addon_price,
        アドオン料金: Math.floor(parseFloat(reservation.addon_value)),
        請求対象: reservation.billable ? 'はい' : 'いいえ',
        /*入金額: reservation.payments,*/
        /*残高: reservation.plan_price + Math.floor(parseFloat(reservation.addon_value)) - reservation.payments,*/
        売上高: reservation.billable ? reservation.plan_price + Math.floor(parseFloat(reservation.addon_value)) : 0,
        予約ID: reservation.reservation_id,
        予約詳細ID: reservation.id,
      });
    });
    csvStream.end();
  } catch (err) {
    console.error("Error generating CSV:", err);
    res.status(500).send("Error generating CSV");
  }
};

module.exports = { 
  getCountReservation,
  getCountReservationDetails,
  getOccupationByPeriod,
  getReservationListView,
  getExportReservationList,
  getExportReservationDetails,
};