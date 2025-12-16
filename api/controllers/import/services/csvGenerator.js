const { format } = require('fast-csv');

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const generateForecastCsv = async (month1, month2, prefilledData = [], hotels = [], plans = []) => {
  const startDate = new Date(month1);
  const endDate = new Date(month2);
  const csvRows = [];

  const budgetItems = ['宿泊売上', '営業日数', '客室数', '販売客室数'];

  const monthHeaders = [];
  const year = startDate.getFullYear();
  const month = startDate.getMonth(); // 0-indexed

  for (let i = 0; i < 12; i++) {
    const d = new Date(year, month + i, 1);
    monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  }

  // Add header row
  csvRows.push(['ID', '施設', 'プランID', 'プラン名', '予算項目', ...monthHeaders]);

  const sortedHotels = [...hotels].sort((a, b) => a.id - b.id);
  const sortedPlans = [...plans].sort((a, b) => a.id - b.id);

  sortedHotels.forEach(hotel => {
    sortedPlans.forEach(plan => {
      budgetItems.forEach(item => {
        const row = [hotel.id, hotel.name, plan.id, plan.name, item];
        monthHeaders.forEach(header => {
          const [hYear, hMonth] = header.split('-').map(Number);
          const prefilledRow = prefilledData.find(dataRow => {
            const dataMonth = new Date(dataRow.month);
            const isMonthMatch = dataMonth.getFullYear() === hYear && dataMonth.getMonth() + 1 === hMonth;
            const isHotelMatch = Number(dataRow.hotel_id) === hotel.id;
            const isPlanMatch = (dataRow.plan_global_id === null && plan.id === null) || 
                               (dataRow.plan_global_id === plan.id);
            return isMonthMatch && isHotelMatch && isPlanMatch;
          });

          if (item === '営業日数') {
            row.push(prefilledRow ? prefilledRow.operating_days : getDaysInMonth(hYear, hMonth - 1));
          } else if (item === '客室数') {
            const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);
            const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
              ? hotel.total_rooms * daysInCurrentMonth
              : 0;
            row.push(prefilledRow ? prefilledRow.available_room_nights : totalRoomsForMonth);
          } else if (item === '宿泊売上') {
            row.push(prefilledRow ? prefilledRow.accommodation_revenue : '');
          } else if (item === '販売客室数') {
            row.push(prefilledRow ? prefilledRow.rooms_sold_nights : '');
          } else {
            row.push('');
          }
        });
        csvRows.push(row); // Push the array directly
      });
    });
  });

  return new Promise((resolve, reject) => {
    const csvStream = format({ headers: false });
    let csvString = '';

    csvStream.on('data', chunk => (csvString += chunk.toString()));
    csvStream.on('end', () => resolve(csvString));
    csvStream.on('error', err => reject(err));

    csvRows.forEach(row => csvStream.write(row));
    csvStream.end();
  });
};

const generateAccountingCsv = async (month1, month2, prefilledData = [], hotels = [], plans = []) => {
  const startDate = new Date(month1);
  const csvRows = [];

  const budgetItems = ['宿泊売上', '営業日数', '客室数', '販売客室数'];

  const monthHeaders = [];
  
  // Generate 12 months starting from month1 (the query start date)
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth(); // 0-indexed

  // Generate 12 months starting from the query start date (month1)
  // This should match the actual data range that was queried
  for (let i = 0; i < 12; i++) {
    const d = new Date(startYear, startMonth + i, 1);
    monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  }



  // Add header row
  csvRows.push(['ID', '施設', 'プランID', 'プラン名', '会計項目', ...monthHeaders]);

  const sortedHotels = [...hotels].sort((a, b) => a.id - b.id);
  const sortedPlans = [...plans].sort((a, b) => a.id - b.id);



  sortedHotels.forEach(hotel => {
    sortedPlans.forEach(plan => {
      budgetItems.forEach(item => {
        const row = [hotel.id, hotel.name, plan.id, plan.name, item];
        monthHeaders.forEach(header => {
          const [hYear, hMonth] = header.split('-').map(Number);
          
          const prefilledRow = prefilledData.find(dataRow => {
            const dataMonth = new Date(dataRow.month);
            // Database stores end-of-month dates, compare by year and month only
            const isMonthMatch = dataMonth.getFullYear() === hYear && (dataMonth.getMonth() + 1) === hMonth;
            const isHotelMatch = Number(dataRow.hotel_id) === hotel.id;
            const isPlanMatch = (dataRow.plan_global_id === null && plan.id === null) || 
                               (dataRow.plan_global_id === plan.id);
            
            return isMonthMatch && isHotelMatch && isPlanMatch;
          });

          if (item === '営業日数') {
            row.push(prefilledRow ? prefilledRow.operating_days : getDaysInMonth(hYear, hMonth - 1));
          } else if (item === '客室数') {
            const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);
            const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
              ? hotel.total_rooms * daysInCurrentMonth
              : 0;
            row.push(prefilledRow ? prefilledRow.available_room_nights : totalRoomsForMonth);
          } else if (item === '宿泊売上') {
            row.push(prefilledRow ? prefilledRow.accommodation_revenue : '');
          } else if (item === '販売客室数') {
            row.push(prefilledRow ? prefilledRow.rooms_sold_nights : '');
          } else {
            row.push('');
          }
        });
        csvRows.push(row);
      });
    });
  });

  // Convert rows to CSV string manually to avoid encoding issues
  const csvString = csvRows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if needed
      const cellStr = String(cell || '');
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');
  
  return csvString;
};

module.exports = {
  generateForecastCsv,
  generateAccountingCsv,
};