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
          const prefilledRow = prefilledData.find(dataRow =>
            new Date(dataRow.month).getFullYear() === hYear &&
            new Date(dataRow.month).getMonth() + 1 === hMonth &&
            dataRow.hotel_id === hotel.id &&
            dataRow.plan_global_id === plan.id
          );

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
  const endDate = new Date(month2);
  const csvRows = [];

  const budgetItems = ['宿泊売上', '営業日数', '客室数', '販売客室数']; // Assuming same budget items for accounting

  const monthHeaders = [];
  const year = startDate.getFullYear();
  const month = startDate.getMonth(); // 0-indexed

  for (let i = 0; i < 12; i++) {
    const d = new Date(year, month - 12 + i, 1); // Accounting goes back 12 months
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
          const prefilledRow = prefilledData.find(dataRow =>
            new Date(dataRow.month).getFullYear() === hYear &&
            new Date(dataRow.month).getMonth() + 1 === hMonth &&
            dataRow.hotel_id === hotel.id &&
            dataRow.plan_global_id === plan.id
          );

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

module.exports = {
  generateForecastCsv,
  generateAccountingCsv,
};