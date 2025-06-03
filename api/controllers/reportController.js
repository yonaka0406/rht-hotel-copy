const { selectCountReservation, selectCountReservationDetailsPlans, selectCountReservationDetailsAddons, selectOccupationByPeriod, selectReservationListView, selectForecastData, selectAccountingData, selectExportReservationList, selectExportReservationDetails, selectExportMealCount, selectReservationsInventory, selectAllRoomTypesInventory, selectReservationsForGoogle, selectActiveReservationsChange,
  selectMonthlyReservationEvolution } = require('../models/report');
const { authorize, appendDataToSheet } = require('../utils/googleUtils');
const { format } = require("@fast-csv/format");
const ExcelJS = require("exceljs");

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
    const data = await selectCountReservation(req.requestId, hotelId, startDate, endDate);    
    
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
    const planData = await selectCountReservationDetailsPlans(req.requestId, hotelId, startDate, endDate);
    const addonData = await selectCountReservationDetailsAddons(req.requestId, hotelId, startDate, endDate);     
    
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
    const data = await selectOccupationByPeriod(req.requestId, period, hotelId, refDate);
    
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
    const data = await selectReservationListView(req.requestId, hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
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
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
const getAccountingData = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectAccountingData(req.requestId, hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getExportReservationList = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const result = await selectExportReservationList(req.requestId, hotelId, startDate, endDate);     

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
    const result = await selectExportReservationDetails(req.requestId, hotelId, startDate, endDate); 
    
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
const getExportMealCount = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const result = await selectExportMealCount(req.requestId, hotelId, startDate, endDate); 
    
    if (!result || result.length === 0) {
      return res.status(404).send("No data available for the given dates.");
    }

    // Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("食事件数");

    // Configure print settings
    worksheet.pageSetup = {
      fitToWidth: 1, // Fit to one page width
      fitToHeight: 0, // Allow multiple pages in height if needed
      paperSize: 9, // A4 paper size (ExcelJS uses numeric codes)
      orientation: "landscape", // Optional: Set to "portrait" if needed
      margins: {
        left: 0.3, right: 0.3,
        top: 0.5, bottom: 0.5,
        header: 0.2, footer: 0.2
      }
    };    
    worksheet.views = [{ showGridLines: false }];

    const hotelName = result[0].hotel_name || "ホテル";
    worksheet.mergeCells("A1:D1");
    const titleCell = worksheet.getCell("A1");
    titleCell.value = `${hotelName} の食事件数`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "D3D3D3" } };

    // Add timestamp in cell A2
    const timeStamp = new Date().toLocaleString("ja-JP", { // Format date for Japan
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    const timeCell = worksheet.getCell("A2");
    timeCell.value = `リスト作成日時：${timeStamp}`;
    timeCell.font = { color: { argb: "BABABA" }, bold: true, size: 9 };
    timeCell.alignment = { horizontal: "left", vertical: "middle" };

    // Headers in Row 3
    const headerRow = worksheet.getRow(3);
    headerRow.values = ["提供日", "朝食", "昼食", "夕食"];
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: "center", vertical: "middle" };
    
    // Add bottom border to headers
    headerRow.eachCell((cell) => {
      cell.border = {
        bottom: { style: "thin", color: { argb: "000000" } }, // Thick black bottom border
      };
    });

    // Set column widths and formats
    worksheet.columns = [      
      { key: "meal_date", width: 15 },
      { key: "breakfast", width: 15, style: { numFmt: "0" } },
      { key: "lunch", width: 15, style: { numFmt: "0" } },
      { key: "dinner", width: 15, style: { numFmt: "0" } },
    ];

    // Add data rows starting from row 4
    result.forEach((reservation, index) => {
      const row = worksheet.addRow({
        meal_date: new Date(formatDate(reservation.meal_date)), // Ensure date format        
        breakfast: reservation.breakfast * 1,
        lunch: reservation.lunch * 1,
        dinner: reservation.dinner * 1,
      });
      row.alignment = { horizontal: "center", vertical: "middle" };
      // Apply alternating row colors (striped effect)
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "F2F2F2" }, // Light gray for even rows
          };
        });
      }

      // Center align and add right border to column A (meal_date)
      const mealDateCell = row.getCell(1);
      mealDateCell.alignment = { horizontal: "center" };
      mealDateCell.border = {
        right: { style: "thin", color: { argb: "000000" } }, // Thin right border
      };
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : "";
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = maxLength + 2; // Add some padding
    });

    // Set headers for download
    res.setHeader("Content-Disposition", "attachment; filename=meal_count.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

    // Write workbook to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Error generating Excel:", err);
    res.status(500).send("Error generating Excel");
  }
};

const getReservationsInventory = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectReservationsInventory(req.requestId, hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
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
      return res.status(404).json({ error: 'No data found' });
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
      return res.status(404).json({ error: 'No data found' });
    }

    const formattedData = formatDataForSheet(dataToAppend);
    
    const authClient = await authorize();
    const sheetName = `H_${hotelId}`;   
    // console.log('appendDataToSheet', sheetId, sheetName, formattedData);
    await appendDataToSheet(authClient, sheetId, sheetName, formattedData);

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
      displayCell += reservation.client_name;
    }
    if (reservation.plan_name) {
      displayCell += "、" + reservation.plan_name;
    }
    if (reservation.agent) {
      displayCell += "、㋔｜" + reservation.agent;
    } else if (reservation.type === "employee") {
      displayCell += "、㋛｜";
    }

    return [
      reservation.hotel_id,
      reservation.hotel_name,
      reservation.reservation_detail_id,
      new Date(reservation.date).toLocaleDateString('ja-JP'),
      reservation.room_type_name,
      reservation.room_number,
      reservation.client_name,
      reservation.plan_name || '',
      reservation.status,
      reservation.type,
      reservation.agent || '',
      new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
      displayCell
    ];
  });
  
  // Return data rows
  return [...rows];
};

const getActiveReservationsChange = async (req, res) => {
  const { hotel_id, date } = req.params;

  try {
    const data = await selectActiveReservationsChange(req.requestId, hotel_id, date);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data returned from query.' });
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
    const data = await selectMonthlyReservationEvolution(req.requestId, hotel_id, target_month);

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data returned from query.' });
    }  

    res.json(data);
  } catch (err) {
    console.error(`[${req.requestId}] Error in getMonthlyReservationEvolution:`, err);
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
  getExportReservationList,
  getExportReservationDetails,
  getExportMealCount,
  getReservationsInventory,
  getAllInventory,
  getReservationsForGoogle,
  getActiveReservationsChange,
  getMonthlyReservationEvolution,
};