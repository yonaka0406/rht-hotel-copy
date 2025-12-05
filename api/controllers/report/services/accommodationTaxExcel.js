const ExcelJS = require('exceljs');
const { formatDate } = require('../../../utils/reportUtils');

const createAccommodationTaxWorkbook = (data, startDate, endDate) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('宿泊税レポート');

    // Hide grid lines
    worksheet.views = [{ showGridLines: false }];

    // 1. Merged Header (A1:H1)
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    const hotelName = data[0]?.hotel_name || 'ホテル';
    const timestamp = new Date().toLocaleString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
    });
    titleCell.value = `${hotelName} - 宿泊税レポート - 作成日: ${timestamp}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    // 2. Tax Rate Field (A3, B3)
    const taxRateLabelCell = worksheet.getCell('A3');
    taxRateLabelCell.value = '税率';
    taxRateLabelCell.font = { bold: true };
    taxRateLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    taxRateLabelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const taxRateValueCell = worksheet.getCell('B3');
    taxRateValueCell.value = null; // User can input this
    taxRateValueCell.numFmt = '0.00%';
    taxRateValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 3. Tax Amount Field (C3, D3)
    const taxAmountLabelCell = worksheet.getCell('C3');
    taxAmountLabelCell.value = '税額';
    taxAmountLabelCell.font = { bold: true };
    taxAmountLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    taxAmountLabelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const taxAmountValueCell = worksheet.getCell('D3');
    taxAmountValueCell.value = null; // Changed to null as per new requirement to allow input
    taxAmountValueCell.numFmt = '#,##0';
    taxAmountValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 4. Data Table Headers (Row 5)
    const headerRow = worksheet.getRow(5);
    headerRow.values = [
        '日付',
        '宿泊数',
        '非宿泊数',
        'プラン料金(宿泊)',
        'プラン料金(その他)',
        'アドオン料金(宿泊)',
        'アドオン料金(その他)',
        '合計',
        '', // I column empty
        '税額' // J column
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

    // Define columns (for width and keys, though we add rows manually to control position)
    worksheet.columns = [
        { key: 'date', width: 15 },
        { key: 'accommodation_count', width: 15 },
        { key: 'non_accommodation_count', width: 15 },
        { key: 'plan_price_accom', width: 20 },
        { key: 'plan_price_other', width: 20 },
        { key: 'addon_price_accom', width: 20 },
        { key: 'addon_price_other', width: 20 },
        { key: 'total_price', width: 20 },
        { key: 'empty', width: 5 },
        { key: 'tax_amount', width: 20 },
    ];

    // 5. Add Data Rows (Starting from Row 6)
    let lastDataRowIndex = 5;
    data.forEach((row, index) => {
        const planPriceAccom = parseInt(row.plan_price_accom || 0);
        const planPriceOther = parseInt(row.plan_price_other || 0);
        const addonPriceAccom = parseInt(row.addon_price_accom || 0);
        const addonPriceOther = parseInt(row.addon_price_other || 0);
        const total = planPriceAccom + planPriceOther + addonPriceAccom + addonPriceOther;
        const rowIndex = 6 + index;
        lastDataRowIndex = rowIndex;

        // Formula: IF(B3<>"", ROUNDDOWN(D{row}*B3, 0), IF(D3<>"", ROUNDDOWN(B{row}*D3, 0), 0))
        // D{row} is Plan Price Accom (Column D)
        // B{row} is Accommodation Count (Column B)
        const formula = `IF(B3<>"", ROUNDDOWN(D${rowIndex}*B3, 0), IF(D3<>"", ROUNDDOWN(B${rowIndex}*D3, 0), 0))`;

        worksheet.addRow({
            date: formatDate(new Date(row.date)),
            accommodation_count: parseInt(row.accommodation_count || 0),
            non_accommodation_count: parseInt(row.non_accommodation_count || 0),
            plan_price_accom: planPriceAccom,
            plan_price_other: planPriceOther,
            addon_price_accom: addonPriceAccom,
            addon_price_other: addonPriceOther,
            total_price: total,
            empty: '',
            tax_amount: { formula: formula }
        });
    });

    // 6. Add Total Row
    const totalRowIndex = lastDataRowIndex + 1;
    const totalRow = worksheet.getRow(totalRowIndex);
    totalRow.getCell('A').value = '合計';
    totalRow.getCell('B').value = { formula: `SUM(B6:B${lastDataRowIndex})` };
    totalRow.getCell('C').value = { formula: `SUM(C6:C${lastDataRowIndex})` };
    totalRow.getCell('D').value = { formula: `SUM(D6:D${lastDataRowIndex})` };
    totalRow.getCell('E').value = { formula: `SUM(E6:E${lastDataRowIndex})` };
    totalRow.getCell('F').value = { formula: `SUM(F6:F${lastDataRowIndex})` };
    totalRow.getCell('G').value = { formula: `SUM(G6:G${lastDataRowIndex})` };
    totalRow.getCell('H').value = { formula: `SUM(H6:H${lastDataRowIndex})` };
    totalRow.getCell('J').value = { formula: `SUM(J6:J${lastDataRowIndex})` };

    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        if (cell.col !== 9) { // Skip column I (empty)
            cell.border = { top: { style: 'thin' } };
        }
    });


    // Format currency columns (D, E, F, G, H, J)
    // Rows start from 6 to totalRowIndex
    for (let i = 6; i <= totalRowIndex; i++) {
        ['D', 'E', 'F', 'G', 'H', 'J'].forEach(col => {
            worksheet.getCell(`${col}${i}`).numFmt = '#,##0';
        });
    }

    // 7. Autofit Columns
    worksheet.columns.forEach((column) => {
        let maxLength = 0;
        column.eachCell({ includeEmpty: true }, (cell) => {
            // Skip header rows (1-4) for width calculation to avoid skewing by title
            if (cell.row <= 4) return;

            let cellValue = '';
            if (cell.value && typeof cell.value === 'object' && cell.value.formula) {
                // Estimate formula result length (rough guess)
                cellValue = '00000000';
            } else {
                cellValue = cell.value ? cell.value.toString() : '';
            }

            // Handle Japanese characters (roughly 2x width)
            let length = 0;
            for (let i = 0; i < cellValue.length; i++) {
                const code = cellValue.charCodeAt(i);
                // Simple check for full-width chars
                if (code > 255) length += 2;
                else length += 1;
            }

            maxLength = Math.max(maxLength, length);
        });
        column.width = Math.min(Math.max(maxLength + 2, 12), 50);
    });

    return workbook;
};

module.exports = {
    createAccommodationTaxWorkbook
};
