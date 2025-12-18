const { format } = require('fast-csv');

const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

const generateForecastCsv = async (month1, month2, prefilledData = [], hotels = [], typeCategories = [], packageCategories = []) => {
  const startDate = new Date(month1);
  const csvRows = [];

  const budgetItems = ['売上', '販売客室数', '営業日数', '客室数'];
  const salesCategories = [
    { id: 0, name: '宿泊' },
    { id: 1, name: '宿泊外' }
  ];

  const monthHeaders = [];
  const year = startDate.getFullYear();
  const month = startDate.getMonth(); // 0-indexed

  for (let i = 0; i < 12; i++) {
    const d = new Date(year, month + i, 1);
    monthHeaders.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`);
  }

  // Add header row
  csvRows.push(['ID', '施設', 'タイプカテゴリーID', 'タイプカテゴリー名', 'パッケージカテゴリーID', 'パッケージカテゴリー名', '売上区分', '予算項目', ...monthHeaders]);

  const sortedHotels = [...hotels].sort((a, b) => a.id - b.id);
  const sortedTypeCategories = [...typeCategories].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  const sortedPackageCategories = [...packageCategories].sort((a, b) => a.display_order - b.display_order || a.id - b.id);

  sortedHotels.forEach(hotel => {
    sortedTypeCategories.forEach(typeCategory => {
      sortedPackageCategories.forEach(packageCategory => {
        budgetItems.forEach(item => {
          // For '売上' and '販売客室数', create separate rows for accommodation and non-accommodation
          if (item === '売上' || item === '販売客室数') {
            salesCategories.forEach(salesCategory => {
              const row = [hotel.id, hotel.name, typeCategory.id, typeCategory.name, packageCategory.id, packageCategory.name, salesCategory.id, item];
              monthHeaders.forEach(header => {
                const [hYear, hMonth] = header.split('-').map(Number);
                const prefilledRow = prefilledData.find(dataRow => {
                  const dataMonth = new Date(dataRow.month);
                  const isMonthMatch = dataMonth.getFullYear() === hYear && dataMonth.getMonth() + 1 === hMonth;
                  const isHotelMatch = Number(dataRow.hotel_id) === hotel.id;
                  const isTypeCategoryMatch = dataRow.plan_type_category_id === typeCategory.id;
                  const isPackageCategoryMatch = dataRow.plan_package_category_id === packageCategory.id;
                  return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
                });

                if (item === '売上') {
                  const valueToPush = prefilledRow ? 
                    (salesCategory.id === 0 ? prefilledRow.accommodation_revenue : prefilledRow.non_accommodation_revenue) : '';
                  row.push(valueToPush);
                } else if (item === '販売客室数') {
                  const valueToPush = prefilledRow ? 
                    (salesCategory.id === 0 ? prefilledRow.rooms_sold_nights : prefilledRow.non_accommodation_sold_rooms) : '';
                  row.push(valueToPush);
                }
              });
              csvRows.push(row);
            });
          } else {
            // For '営業日数' and '客室数', create single row with sales_category = 0 (accommodation)
            const row = [hotel.id, hotel.name, typeCategory.id, typeCategory.name, packageCategory.id, packageCategory.name, 0, item];
            monthHeaders.forEach(header => {
              const [hYear, hMonth] = header.split('-').map(Number);
              const prefilledRow = prefilledData.find(dataRow => {
                const dataMonth = new Date(dataRow.month);
                const isMonthMatch = dataMonth.getFullYear() === hYear && dataMonth.getMonth() + 1 === hMonth;
                const isHotelMatch = Number(dataRow.hotel_id) === hotel.id;
                const isTypeCategoryMatch = dataRow.plan_type_category_id === typeCategory.id;
                const isPackageCategoryMatch = dataRow.plan_package_category_id === packageCategory.id;
                return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
              });

              if (item === '営業日数') {
                row.push(prefilledRow ? prefilledRow.operating_days : getDaysInMonth(hYear, hMonth - 1));
              } else if (item === '客室数') {
                const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);
                const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
                  ? hotel.total_rooms * daysInCurrentMonth
                  : 0;
                row.push(prefilledRow ? prefilledRow.available_room_nights : totalRoomsForMonth);
              }
            });
            csvRows.push(row);
          }
        });
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

const generateAccountingCsv = async (month1, month2, prefilledData = [], hotels = [], typeCategories = [], packageCategories = []) => {
  const startDate = new Date(month1);
  const csvRows = [];

  const budgetItems = ['売上', '販売客室数', '営業日数', '客室数'];
  const salesCategories = [
    { id: 0, name: '宿泊' },
    { id: 1, name: '宿泊外' }
  ];

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
  csvRows.push(['ID', '施設', 'タイプカテゴリーID', 'タイプカテゴリー名', 'パッケージカテゴリーID', 'パッケージカテゴリー名', '売上区分', '会計項目', ...monthHeaders]);

  const sortedHotels = [...hotels].sort((a, b) => a.id - b.id);
  const sortedTypeCategories = [...typeCategories].sort((a, b) => a.display_order - b.display_order || a.id - b.id);
  const sortedPackageCategories = [...packageCategories].sort((a, b) => a.display_order - b.display_order || a.id - b.id);

  sortedHotels.forEach(hotel => {
    sortedTypeCategories.forEach(typeCategory => {
      sortedPackageCategories.forEach(packageCategory => {
        budgetItems.forEach(item => {
          // For '売上' and '販売客室数', create separate rows for accommodation and non-accommodation
          if (item === '売上' || item === '販売客室数') {
            salesCategories.forEach(salesCategory => {
              const row = [hotel.id, hotel.name, typeCategory.id, typeCategory.name, packageCategory.id, packageCategory.name, salesCategory.id, item];
              monthHeaders.forEach(header => {
                const [hYear, hMonth] = header.split('-').map(Number);
                
                const prefilledRow = prefilledData.find(dataRow => {
                  const dataMonth = new Date(dataRow.month);
                  // Database stores end-of-month dates, compare by year and month only
                  const isMonthMatch = dataMonth.getFullYear() === hYear && (dataMonth.getMonth() + 1) === hMonth;
                  const isHotelMatch = Number(dataRow.hotel_id) === hotel.id;
                  const isTypeCategoryMatch = dataRow.plan_type_category_id === typeCategory.id;
                  const isPackageCategoryMatch = dataRow.plan_package_category_id === packageCategory.id;
                  
                  return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
                });

                if (item === '売上') {
                  const valueToPush = prefilledRow ? 
                    (salesCategory.id === 0 ? prefilledRow.accommodation_revenue : prefilledRow.non_accommodation_revenue) : '';
                  row.push(valueToPush);
                } else if (item === '販売客室数') {
                  const valueToPush = prefilledRow ? 
                    (salesCategory.id === 0 ? prefilledRow.rooms_sold_nights : prefilledRow.non_accommodation_sold_rooms) : '';
                  row.push(valueToPush);
                }
              });
              csvRows.push(row);
            });
          } else {
            // For '営業日数' and '客室数', create single row with sales_category = 0 (accommodation)
            const row = [hotel.id, hotel.name, typeCategory.id, typeCategory.name, packageCategory.id, packageCategory.name, 0, item];
            monthHeaders.forEach(header => {
              const [hYear, hMonth] = header.split('-').map(Number);
              
              const prefilledRow = prefilledData.find(dataRow => {
                const dataMonth = new Date(dataRow.month);
                // Database stores end-of-month dates, compare by year and month only
                const isMonthMatch = dataMonth.getFullYear() === hYear && (dataMonth.getMonth() + 1) === hMonth;
                const isHotelMatch = Number(dataRow.hotel_id) === hotel.id;
                const isTypeCategoryMatch = dataRow.plan_type_category_id === typeCategory.id;
                const isPackageCategoryMatch = dataRow.plan_package_category_id === packageCategory.id;
                
                return isMonthMatch && isHotelMatch && isTypeCategoryMatch && isPackageCategoryMatch;
              });

              if (item === '営業日数') {
                row.push(prefilledRow ? prefilledRow.operating_days : getDaysInMonth(hYear, hMonth - 1));
              } else if (item === '客室数') {
                const daysInCurrentMonth = getDaysInMonth(hYear, hMonth - 1);
                const totalRoomsForMonth = (hotel.total_rooms && typeof hotel.total_rooms === 'number')
                  ? hotel.total_rooms * daysInCurrentMonth
                  : 0;
                row.push(prefilledRow ? prefilledRow.available_room_nights : totalRoomsForMonth);
              }
            });
            csvRows.push(row);
          }
        });
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