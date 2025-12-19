const ExcelJS = require('exceljs');
const { formatDate } = require('../../../utils/reportUtils');

const createAccommodationTaxWorkbook = (data, startDate, endDate) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('宿泊税レポート');

    // Hide grid lines
    worksheet.views = [{ showGridLines: false }];

    // 1. Merged Header (A1:F1)
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    const hotelName = data[0]?.hotel_name || 'ホテル';
    const timestamp = new Date().toLocaleString("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
    });
    titleCell.value = `${hotelName} - 宿泊税レポート - 作成日: ${timestamp}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle', shrinkToFit: true };

    // 2. Room Only Rate Field (A3, B3)
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
    taxRateValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 4. Tax Amount Field (E3, F3)
    const taxAmountLabelCell = worksheet.getCell('E3');
    taxAmountLabelCell.value = '税額';
    taxAmountLabelCell.font = { bold: true };
    taxAmountLabelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    taxAmountLabelCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    const taxAmountValueCell = worksheet.getCell('F3');
    taxAmountValueCell.value = null; // Changed to null as per new requirement to allow input
    taxAmountValueCell.numFmt = '#,##0';
    taxAmountValueCell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
    };

    // 5. Data Table Headers (Row 5)
    const headerRow = worksheet.getRow(5);
    headerRow.values = [
        '日付',
        '宿泊数',
        '宿泊人数',
        '非宿泊数',
        '', // E column empty
        '税額' // F column
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
        { key: 'number_of_people', width: 15 },
        { key: 'non_accommodation_count', width: 15 },
        { key: 'empty', width: 5 },
        { key: 'tax_amount', width: 20 },
    ];

    // 6. Add Data Rows (Starting from Row 6)
    let lastDataRowIndex = 5;
    data.forEach((row, index) => {
        const rowIndex = 6 + index;
        lastDataRowIndex = rowIndex;

        // Formula: B3*D3*C{row} (Room Only Rate * Tax Rate * Number of People)
        // B3 is Room Only Rate, D3 is Tax Rate, C{row} is Number of People
        // If both B3 and D3 have values, use B3*D3*C{row}, otherwise fallback to F3*C{row}
        const formula = `IF(AND(B3<>"", D3<>""), ROUNDDOWN(B3*D3*C${rowIndex}, 0), IF(F3<>"", ROUNDDOWN(F3*C${rowIndex}, 0), 0))`;

        worksheet.addRow({
            date: formatDate(new Date(row.date)),
            accommodation_count: parseInt(row.accommodation_count || 0),
            number_of_people: parseInt(row.number_of_people || 0),
            non_accommodation_count: parseInt(row.non_accommodation_count || 0),
            empty: '',
            tax_amount: { formula: formula }
        });
    });

    // 7. Add Total Row
    const totalRowIndex = lastDataRowIndex + 1;
    const totalRow = worksheet.getRow(totalRowIndex);
    totalRow.getCell('A').value = '合計';
    totalRow.getCell('B').value = { formula: `SUM(B6:B${lastDataRowIndex})` };
    totalRow.getCell('C').value = { formula: `SUM(C6:C${lastDataRowIndex})` };
    totalRow.getCell('D').value = { formula: `SUM(D6:D${lastDataRowIndex})` };
    totalRow.getCell('F').value = { formula: `SUM(F6:F${lastDataRowIndex})` };

    totalRow.font = { bold: true };
    totalRow.eachCell((cell) => {
        if (cell.col !== 5) { // Skip column E (empty)
            cell.border = { top: { style: 'thin' } };
        }
    });


    // Format currency columns (F - tax amount)
    // Rows start from 6 to totalRowIndex
    for (let i = 6; i <= totalRowIndex; i++) {
        worksheet.getCell(`F${i}`).numFmt = '#,##0';
    }

    // 8. Autofit Columns
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
