const ExcelJS = require('exceljs');
const { formatDate } = require('../../../utils/reportUtils');

const createAccommodationTaxWorkbook = (data, startDate, endDate) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('宿泊税レポート');

    // Hide grid lines
    worksheet.views = [{ showGridLines: false }];

    // 1. Merged Header (A1:T1)
    const titleCell = worksheet.getCell('A1');
    const hotelName = data[0]?.hotel_name || 'ホテル';
    const timestamp = new Date().toLocaleString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
    });
    titleCell.value = `${hotelName} - 宿泊税レポート - 作成日: ${timestamp}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { vertical: 'middle' };

    // 2. Room Only Rate Field (A3, B3)
    const row3 = worksheet.getRow(3);
    row3.height = 30;
    
    const roomOnlyRateLabelCell = worksheet.getCell('A3');
    roomOnlyRateLabelCell.value = '素泊まり料金';
    roomOnlyRateLabelCell.font = { bold: true };
    roomOnlyRateLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    roomOnlyRateLabelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const roomOnlyRateValueCell = worksheet.getCell('B3');
    roomOnlyRateValueCell.value = null; // User can input this
    roomOnlyRateValueCell.numFmt = '#,##0';
    roomOnlyRateValueCell.alignment = { vertical: 'middle' };
    roomOnlyRateValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 3. Tax Rate Field (C3, D3)
    const taxRateLabelCell = worksheet.getCell('C3');
    taxRateLabelCell.value = '税率';
    taxRateLabelCell.font = { bold: true };
    taxRateLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    taxRateLabelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const taxRateValueCell = worksheet.getCell('D3');
    taxRateValueCell.value = null; // User can input this
    taxRateValueCell.numFmt = '0.00%';
    taxRateValueCell.alignment = { vertical: 'middle' };
    taxRateValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 4. Tax Amount Field (E3, F3)
    const taxAmountLabelCell = worksheet.getCell('E3');
    taxAmountLabelCell.value = '1人当たり税額';
    taxAmountLabelCell.font = { bold: true };
    taxAmountLabelCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    taxAmountLabelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const taxAmountValueCell = worksheet.getCell('F3');
    taxAmountValueCell.value = null; // Changed to null as per new requirement to allow input
    taxAmountValueCell.numFmt = '#,##0';
    taxAmountValueCell.alignment = { vertical: 'middle' };
    taxAmountValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 5. Section Titles (Row 5)
    worksheet.getCell('A5').value = 'スタンダード';
    worksheet.getCell('A5').font = { bold: true, size: 12 };
    worksheet.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.getCell('H5').value = 'マンスリー';
    worksheet.getCell('H5').font = { bold: true, size: 12 };
    worksheet.getCell('H5').alignment = { horizontal: 'center', vertical: 'middle' };
    
    worksheet.getCell('O5').value = '合計';
    worksheet.getCell('O5').font = { bold: true, size: 12 };
    worksheet.getCell('O5').alignment = { horizontal: 'center', vertical: 'middle' };

    // 6. Data Table Headers (Row 6)
    const headerRow = worksheet.getRow(6);
    headerRow.values = [
        '日付', '宿泊数', '宿泊人数', '非宿泊数', '', '税額', '', // A-G (Standard)
        '日付', '宿泊数', '宿泊人数', '非宿泊数', '', '税額', '', // H-N (Monthly)
        '日付', '宿泊数', '宿泊人数', '非宿泊数', '', '税額'     // O-T (Total)
    ];
    headerRow.font = { bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell((cell) => {
        if (cell.value) {
            cell.border = {
                bottom: { style: 'thin' }
            };
        }
    });

    // Define columns
    worksheet.columns = [
        // Standard (A-F)
        { key: 'std_date', width: 15 },
        { key: 'std_accommodation_count', width: 12 },
        { key: 'std_number_of_people', width: 12 },
        { key: 'std_non_accommodation_count', width: 12 },
        { key: 'std_empty', width: 10 },
        { key: 'std_tax_amount', width: 15 },
        { key: 'separator1', width: 3 },
        // Monthly (H-M)
        { key: 'mon_date', width: 15 },
        { key: 'mon_accommodation_count', width: 12 },
        { key: 'mon_number_of_people', width: 12 },
        { key: 'mon_non_accommodation_count', width: 12 },
        { key: 'mon_empty', width: 10 },
        { key: 'mon_tax_amount', width: 15 },
        { key: 'separator2', width: 3 },
        // Total (O-T)
        { key: 'tot_date', width: 15 },
        { key: 'tot_accommodation_count', width: 12 },
        { key: 'tot_number_of_people', width: 12 },
        { key: 'tot_non_accommodation_count', width: 12 },
        { key: 'tot_empty', width: 10 },
        { key: 'tot_tax_amount', width: 15 },
    ];

    // 7. Add Data Rows (Starting from Row 7)
    let lastDataRowIndex = 6;
    
    if (data.length === 0) {
        // No data: write a single empty row to maintain structure
        worksheet.addRow({
            std_date: '', std_accommodation_count: 0, std_number_of_people: 0, std_non_accommodation_count: 0, std_empty: '', std_tax_amount: 0, separator1: '',
            mon_date: '', mon_accommodation_count: 0, mon_number_of_people: 0, mon_non_accommodation_count: 0, mon_empty: '', mon_tax_amount: 0, separator2: '',
            tot_date: '', tot_accommodation_count: 0, tot_number_of_people: 0, tot_non_accommodation_count: 0, tot_empty: '', tot_tax_amount: 0,
        });
        lastDataRowIndex = 7;
    } else {
        data.forEach((row, index) => {
            const rowIndex = 7 + index;
            lastDataRowIndex = rowIndex;

            const dateStr = formatDate(new Date(row.date));
            
            // Standard values
            const stdAccomCount = parseInt(row.standard_accommodation_count || 0);
            const stdPeopleCount = parseInt(row.standard_number_of_people || 0);
            const stdNonAccomCount = parseInt(row.standard_non_accommodation_count || 0);
            
            // Monthly values
            const monAccomCount = parseInt(row.monthly_accommodation_count || 0);
            const monPeopleCount = parseInt(row.monthly_number_of_people || 0);
            const monNonAccomCount = parseInt(row.monthly_non_accommodation_count || 0);

            // Tax formulas
            const stdTaxFormula = `IF(AND(B3<>"", D3<>""), ROUNDDOWN(B3*D3*C${rowIndex}, 0), IF(F3<>"", ROUNDDOWN(F3*C${rowIndex}, 0), 0))`;
            const monTaxFormula = `IF(AND(B3<>"", D3<>""), ROUNDDOWN(B3*D3*J${rowIndex}, 0), IF(F3<>"", ROUNDDOWN(F3*J${rowIndex}, 0), 0))`;
            const totTaxFormula = `IF(AND(B3<>"", D3<>""), ROUNDDOWN(B3*D3*Q${rowIndex}, 0), IF(F3<>"", ROUNDDOWN(F3*Q${rowIndex}, 0), 0))`;

            worksheet.addRow({
                // Standard (A-F)
                std_date: dateStr,
                std_accommodation_count: stdAccomCount,
                std_number_of_people: stdPeopleCount,
                std_non_accommodation_count: stdNonAccomCount,
                std_empty: '',
                std_tax_amount: { formula: stdTaxFormula },
                separator1: '',
                // Monthly (H-M)
                mon_date: dateStr,
                mon_accommodation_count: monAccomCount,
                mon_number_of_people: monPeopleCount,
                mon_non_accommodation_count: monNonAccomCount,
                mon_empty: '',
                mon_tax_amount: { formula: monTaxFormula },
                separator2: '',
                // Total (O-T)
                tot_date: dateStr,
                tot_accommodation_count: { formula: `B${rowIndex}+I${rowIndex}` },
                tot_number_of_people: { formula: `C${rowIndex}+J${rowIndex}` },
                tot_non_accommodation_count: { formula: `D${rowIndex}+K${rowIndex}` },
                tot_empty: '',
                tot_tax_amount: { formula: totTaxFormula },
            });
        });
    }

    // 8. Add Total Row
    const totalRowIndex = lastDataRowIndex + 1;
    const totalRow = worksheet.getRow(totalRowIndex);
    
    // Standard totals
    totalRow.getCell('A').value = '合計';
    totalRow.getCell('B').value = { formula: `SUM(B7:B${lastDataRowIndex})` };
    totalRow.getCell('C').value = { formula: `SUM(C7:C${lastDataRowIndex})` };
    totalRow.getCell('D').value = { formula: `SUM(D7:D${lastDataRowIndex})` };
    totalRow.getCell('F').value = { formula: `SUM(F7:F${lastDataRowIndex})` };
    
    // Monthly totals
    totalRow.getCell('H').value = '合計';
    totalRow.getCell('I').value = { formula: `SUM(I7:I${lastDataRowIndex})` };
    totalRow.getCell('J').value = { formula: `SUM(J7:J${lastDataRowIndex})` };
    totalRow.getCell('K').value = { formula: `SUM(K7:K${lastDataRowIndex})` };
    totalRow.getCell('M').value = { formula: `SUM(M7:M${lastDataRowIndex})` };
    
    // Total totals
    totalRow.getCell('O').value = '合計';
    totalRow.getCell('P').value = { formula: `SUM(P7:P${lastDataRowIndex})` };
    totalRow.getCell('Q').value = { formula: `SUM(Q7:Q${lastDataRowIndex})` };
    totalRow.getCell('R').value = { formula: `SUM(R7:R${lastDataRowIndex})` };
    totalRow.getCell('T').value = { formula: `SUM(T7:T${lastDataRowIndex})` };

    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        if (cell.value && cell.col !== 5 && cell.col !== 7 && cell.col !== 12 && cell.col !== 14 && cell.col !== 19) {
            cell.border = { top: { style: 'thin' } };
        }
    });

    // Format currency columns (F, M, T - tax amount)
    for (let i = 7; i <= totalRowIndex; i++) {
        worksheet.getCell(`F${i}`).numFmt = '#,##0';
        worksheet.getCell(`M${i}`).numFmt = '#,##0';
        worksheet.getCell(`T${i}`).numFmt = '#,##0';
    }

    return workbook;
};

module.exports = {
    createAccommodationTaxWorkbook
};
