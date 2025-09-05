const { selectCountReservation, selectCountReservationDetailsPlans, selectCountReservationDetailsAddons, selectOccupationByPeriod, 
  selectReservationListView, selectForecastData, selectAccountingData, selectExportReservationList, selectExportReservationDetails, 
  selectExportMealCount, selectReservationsInventory, selectAllRoomTypesInventory, selectReservationsForGoogle, selectParkingReservationsForGoogle, 
  selectActiveReservationsChange,
  selectMonthlyReservationEvolution } = require('../models/report');
const { authorize, appendDataToSheet, createSheet } = require('../utils/googleUtils');
const { format } = require("@fast-csv/format");
const ExcelJS = require("exceljs");
const logger = require('../config/logger');

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

const translatePaymentTiming = (timing) => {
  switch (timing) {
    case 'not_set':
      return '未設定';
    case 'prepaid':
      return '事前決済';
    case 'on-site':
      return '現地決済';
    case 'postpaid':
      return '後払い';
    default:
      return '';
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
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;
  
  try {    
    const data = await selectAccountingData(req.requestId, hotelId, startDate, endDate);    
    
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
        レポート期間:  `${startDate} ～ ${endDate}`,
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
        支払い: translatePaymentTiming(reservation.payment_timing),        
        予約ID: reservation.id,
        備考: reservation.comment || '',
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
        レポート期間:  `${startDate} ～ ${endDate}`,        
        ステータス: translateStatus(reservation.reservation_status),
        予約種類: translateType(reservation.reservation_type),
        エージェント: reservation.agent,
        OTA_ID: reservation.ota_reservation_id,
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
        宿泊日: formatDate(new Date(reservation.date)),
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
        支払い: translatePaymentTiming(reservation.payment_timing),
        予約ID: reservation.reservation_id,
        予約詳細ID: reservation.id,
        詳細キャンセル: reservation.cancelled ? 'キャンセル' : '',
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
    const { summary, details } = await selectExportMealCount(req.requestId, hotelId, startDate, endDate); 
    
    if ((!summary || summary.length === 0) && (!details || details.length === 0)) {
      return res.status(404).send("No data available for the given dates.");
    }

    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const timestamp = new Date().toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });

    // Helper function to configure worksheet styles
    const configureWorksheet = (worksheet, title) => {
      // Configure print settings
      worksheet.pageSetup = {
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9,
        orientation: "landscape",
        margins: {
          left: 0.3, right: 0.3,
          top: 0.5, bottom: 0.5,
          header: 0.2, footer: 0.2
        }
      };
      
      worksheet.views = [{ showGridLines: false }];
      
      // Add title
      const titleCell = worksheet.getRow(1);
      titleCell.values = [title];
      titleCell.font = { bold: true, size: 14 };
      titleCell.alignment = { horizontal: "center", vertical: "middle" };
      
      // Add timestamp
      const timeCell = worksheet.getRow(2);
      timeCell.values = [`リスト作成日時：${timestamp}`];
      timeCell.font = { color: { argb: "BABABA" }, bold: true, size: 9 };
      
      return {
        headerRow: 3,
        dataStartRow: 4
      };
    };

    // 1. Create Summary Sheet
    if (summary && summary.length > 0) {
      const summarySheet = workbook.addWorksheet("食事件数サマリー");
      const { headerRow } = configureWorksheet(summarySheet, `${summary[0].hotel_name || "ホテル"} の食事件数サマリー`);
      
      // Set headers
      const headerCells = summarySheet.getRow(headerRow);
      headerCells.values = ["提供日", "朝食", "昼食", "夕食"];
      headerCells.font = { bold: true };
      headerCells.alignment = { horizontal: "center", vertical: "middle" };
      
      // Style headers
      headerCells.eachCell((cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "000000" } },
        };
      });

      // Set column widths and formats
      summarySheet.columns = [      
        { key: "meal_date", width: 15 },
        { key: "breakfast", width: 15, style: { numFmt: "0" } },
        { key: "lunch", width: 15, style: { numFmt: "0" } },
        { key: "dinner", width: 15, style: { numFmt: "0" } },
      ];

      // Add data rows
      summary.forEach((row, index) => {
        const dataRow = summarySheet.addRow({
          meal_date: new Date(formatDate(row.meal_date)),
          breakfast: row.breakfast * 1,
          lunch: row.lunch * 1,
          dinner: row.dinner * 1,
        });
        
        dataRow.alignment = { horizontal: "center", vertical: "middle" };
        
        // Apply alternating row colors
        if (index % 2 === 0) {
          dataRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" },
            };
          });
        }
      });
    }

    // 2. Create Detailed Sheet
    if (details && details.length > 0) {
      const detailSheet = workbook.addWorksheet("食事詳細");
      const { headerRow } = configureWorksheet(detailSheet, `${summary?.[0]?.hotel_name || "ホテル"} の食事詳細`);
      
      // Set headers
      const headerCells = detailSheet.getRow(headerRow);
      headerCells.values = ["予約者名", "部屋番号", "提供日", "朝食", "昼食", "夕食"];
      headerCells.font = { bold: true };
      headerCells.alignment = { horizontal: "center", vertical: "middle" };
      
      // Style headers
      headerCells.eachCell((cell) => {
        cell.border = {
          bottom: { style: "thin", color: { argb: "000000" } },
        };
      });

      // Group details by booker, room, and date
      const groupedDetails = details.reduce((acc, row) => {
        const key = `${row.booker_name}|${row.room_number}|${row.meal_date}`;
        if (!acc[key]) {
          acc[key] = {
            booker_name: row.booker_name,
            room_number: row.room_number || 'N/A',
            meal_date: new Date(row.meal_date),
            breakfast: 0,
            lunch: 0,
            dinner: 0
          };
        }
        // Add quantity to the corresponding meal type
        acc[key][row.meal_type] = row.quantity * 1;
        return acc;
      }, {});

      // Convert to array and sort by date, booker name, and room number
      const sortedDetails = Object.values(groupedDetails).sort((a, b) => {
        if (a.meal_date.getTime() !== b.meal_date.getTime()) {
          return a.meal_date - b.meal_date;
        }
        if (a.booker_name !== b.booker_name) {
          return a.booker_name.localeCompare(b.booker_name);
        }
        return (a.room_number || '').localeCompare(b.room_number || '');
      });

      // Set column widths and formats
      detailSheet.columns = [
        { key: "booker_name", width: 30 },
        { key: "room_number", width: 15 },
        { key: "meal_date", width: 15 },
        { key: "breakfast", width: 15, style: { numFmt: "0" } },
        { key: "lunch", width: 15, style: { numFmt: "0" } },
        { key: "dinner", width: 15, style: { numFmt: "0" } },
      ];

      // Add data rows
      sortedDetails.forEach((row, index) => {
        const dataRow = detailSheet.addRow({
          booker_name: row.booker_name,
          room_number: row.room_number,
          meal_date: row.meal_date,
          breakfast: row.breakfast || 0,
          lunch: row.lunch || 0,
          dinner: row.dinner || 0,
        });
        
        // Apply alignment
        dataRow.alignment = { 
          horizontal: "left", 
          vertical: "middle",
          wrapText: true
        };
        
        // Center align room number and meal count columns
        [2, 4, 5, 6].forEach(colNum => {  // Columns B, D, E, F (1-based index)
          const cell = dataRow.getCell(colNum);
          cell.alignment = { 
            horizontal: "center",
            vertical: "middle"
          };
        });
        
        // Apply alternating row colors
        if (index % 2 === 0) {
          dataRow.eachCell((cell) => {
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "F2F2F2" },
            };
          });
        }
      });
      
      // Auto-fit all columns with proper width constraints
      detailSheet.columns.forEach((column, index) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : "";
          maxLength = Math.max(maxLength, cellValue.length);
        });
        
        // Set minimum width for date column (C) to 11, others to 10
        const minWidth = index === 2 ? 11 : 10; // Column C (0-based index 2) gets 11 width
        const maxWidth = 50;
        column.width = Math.min(Math.max(maxLength + 2, minWidth), maxWidth);
      });
    }

    // Auto-fit all columns in all worksheets
    workbook.eachSheet((worksheet) => {
      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
          const cellValue = cell.value ? cell.value.toString() : "";
          maxLength = Math.max(maxLength, cellValue.length);
        });
        column.width = Math.min(Math.max(maxLength + 2, 10), 50); // Min width 10, max 50
      });
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

// Helper function to translate meal type
function translateMealType(type) {
  const translations = {
    'breakfast': '朝食',
    'lunch': '昼食',
    'dinner': '夕食'
  };
  return translations[type] || type;
}

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
      return res.status(404).json({ error: 'No data found for Google' });
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
      return res.status(404).json({ error: 'No parking data found for Google' });
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
  getParkingReservationsForGoogle,
  createNewGoogleSheet,  
  getActiveReservationsChange,
  getMonthlyReservationEvolution,
};