const logger = require('../../../config/logger');
const fs = require('fs');
const path = require('path');

/**
 * Helper function to generate a new invoice number.
 * If a previous invoice number exists, it increments it.
 * If no previous invoice number is found, it generates an initial one based on hotelId and date.
 * 
 * @param {Array} maxInvoiceResult - The result from the database query for max invoice number.
 * @param {number} hotelId - The ID of the hotel.
 * @param {string|Date} date - The date of the invoice.
 * @returns {number} The new invoice number.
 */
const generateNewInvoiceNumber = (maxInvoiceResult, hotelId, date) => {
  const last_invoice_number = maxInvoiceResult.length > 0 ? maxInvoiceResult[0].last_invoice_number : null;

  let new_invoice_number;
  if (last_invoice_number) {
    new_invoice_number = parseInt(last_invoice_number, 10) + 1;
  } else {
    const d = new Date(date);
    const year = d.getFullYear() % 100; // last two digits of year
    const month = d.getMonth() + 1; // getMonth returns 0-11

    // Initial invoice number generation logic
    new_invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
  }
  return new_invoice_number;
};

/**
 * Load and convert the stamp image to base64 data URI
 * This is cached to avoid reading the file on every invoice generation
 */
let cachedStampDataUri = null;
function getStampImageDataUri() {
  if (cachedStampDataUri) {
    return cachedStampDataUri;
  }

  try {
    // __dirname is at: api/controllers/billing/services
    // STAMP_COMPONENTS_DIR is relative to project root (e.g., './api/components')
    // So we need to go up 4 levels to reach the project root
    const stampDirEnvPath = process.env.STAMP_COMPONENTS_DIR || './api/components';
    const projectRoot = path.resolve(__dirname, '../../../..');
    const stampPath = path.resolve(projectRoot, stampDirEnvPath, 'stamp.png');

    const imageBuffer = fs.readFileSync(stampPath);
    const base64Image = imageBuffer.toString('base64');
    cachedStampDataUri = `data:image/png;base64,${base64Image}`;

    return cachedStampDataUri;
  } catch (error) {
    logger.error('Failed to load stamp image:', error);
    return ''; // Return empty string if image can't be loaded
  }
}

function generateInvoiceHTML(html, data, userName) {
  const imageUrl = getStampImageDataUri();

  let modifiedHTML = html;


  modifiedHTML = modifiedHTML.replace(/{{ stamp_image }}/g, imageUrl);

  // Header
  modifiedHTML = modifiedHTML.replace(/{{ invoice_number }}/g, data.invoice_number);
  modifiedHTML = modifiedHTML.replace(/{{ invoice_date }}/g, data.date);
  modifiedHTML = modifiedHTML.replace(/{{ customer_name }}/g, data.client_name);
  modifiedHTML = modifiedHTML.replace(/{{ customer_code }}/g, data.customer_code ? String(data.customer_code).padStart(5, '0') : '');
  modifiedHTML = modifiedHTML.replace(/{{ company_contact_person }}/g, userName);

  // Main Table
  modifiedHTML = modifiedHTML.replace(/{{ facility_name }}/g, data.facility_name || '');
  modifiedHTML = modifiedHTML.replace(/{{ payment_due_date }}/g, data.due_date || '');
  modifiedHTML = modifiedHTML.replace(/{{ total_amount }}/g, (data.invoice_total_value !== null && data.invoice_total_value !== undefined) ? data.invoice_total_value.toLocaleString() : '0');
  modifiedHTML = modifiedHTML.replace(/{{ bank_name }}/g, data.bank_name || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_branch_name }}/g, data.bank_branch_name || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_type }}/g, data.bank_account_type || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_number }}/g, data.bank_account_number || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_name }}/g, data.bank_account_name || '');

  // Details Table
  let dtlitems = '';
  let rowCount = 1;

  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      const baseLabel = item.name || (item.category === 'accommodation' ? '宿泊料' : 'その他');
      const taxRateVal = item.tax_rate !== null && item.tax_rate !== undefined ? parseFloat(item.tax_rate) : null;
      const taxLabel = taxRateVal !== null && taxRateVal > 0 ? ` (${(taxRateVal * 100).toLocaleString()}%)` : '';
      const label = `${baseLabel}${taxLabel}`;

      // 支払い項目の場合は数量と単位を表示しない
      let quantityDisplay = '';
      if (item.category !== 'payment') {
        const isRoomCharge = baseLabel.includes('宿泊料');
        const qtyValue = isRoomCharge ? (data.invoice_total_stays || item.total_quantity || 1) : (item.total_quantity || 1);
        const unit = isRoomCharge ? '泊' : '個';
        quantityDisplay = `${qtyValue} ${unit}`;
      }

      // 金額の表示（マイナス金額も適切に表示）
      let amountDisplay;
      if (item.total_price === null || item.total_price === undefined) {
        amountDisplay = '¥ -';
      } else {
        const value = Number(item.total_price);
        amountDisplay = `¥ ${value.toLocaleString()}`;
      }

      dtlitems += `
      <tr>
          <td class="cell-center">${rowCount++}</td>
          <td>${label}</td>                    
          <td class="cell-right">${quantityDisplay}</td>
          <td class="cell-right">${amountDisplay}</td>
      </tr>
      `;
    });
  } else {
    // Fallback if no items array
    const safeInvoiceTotal = (data.invoice_total_value !== null && data.invoice_total_value !== undefined) ? Number(data.invoice_total_value).toLocaleString() : '0';
    const safeInvoiceStays = (data.invoice_total_stays !== null && data.invoice_total_stays !== undefined) ? Number(data.invoice_total_stays).toLocaleString() : '0';
    dtlitems = `
    <tr>
        <td class="cell-center">1</td>
        <td>宿泊料</td>                    
        <td class="cell-right">${safeInvoiceStays} 泊</td>
        <td class="cell-right">¥ ${safeInvoiceTotal}</td>
    </tr>
    `;
  }

  modifiedHTML = modifiedHTML.replace(/{{ detail_items }}/g, dtlitems);
  const safeTotalValue = (data.invoice_total_value !== null && data.invoice_total_value !== undefined) ? Number(data.invoice_total_value).toLocaleString() : '0';
  modifiedHTML = modifiedHTML.replace(/{{ details_total_value }}/g, safeTotalValue);

  // Taxable items - 支払い項目を除外して計算
  let taxValue = 0;
  const taxSummary = {};

  if (data.items && Array.isArray(data.items)) {
    // 支払い項目以外のアイテムのみで税額計算
    const taxableItems = data.items.filter(item => item.category !== 'payment');
    
    taxableItems.forEach(item => {
      const difference = item.total_price - item.total_net_price;
      taxValue += difference;

      // Aggregate by tax rate for the breakdown section
      let rateKey = parseFloat(item.tax_rate);
      if (isNaN(rateKey)) {
        rateKey = 0;
      }
      if (!taxSummary[rateKey]) {
        taxSummary[rateKey] = { rate: rateKey, net: 0, tax: 0 };
      }
      taxSummary[rateKey].net += item.total_net_price;
      taxSummary[rateKey].tax += difference;
    });

    // 実際の請求額に基づいて税額を調整
    const originalTaxableTotal = taxableItems.reduce((sum, item) => sum + item.total_price, 0);
    const actualTaxableAmount = data.invoice_total_value;
    
    if (originalTaxableTotal > 0 && actualTaxableAmount !== originalTaxableTotal) {
      const adjustmentRatio = actualTaxableAmount / originalTaxableTotal;
      
      // 税額サマリーを調整 - Excel出力と同じロジックに統一
      Object.keys(taxSummary).forEach(rateKey => {
        const summary = taxSummary[rateKey];
        const rate = parseFloat(rateKey);
        
        // 調整後の税込金額を計算
        const adjustedTotalPrice = Math.round(summary.net * (1 + rate) * adjustmentRatio);
        
        // まず消費税を切り捨てで計算
        const adjustedTax = Math.floor(adjustedTotalPrice * rate / (1 + rate));
        
        // 税込金額 - 消費税 = 税抜金額
        const adjustedNet = adjustedTotalPrice - adjustedTax;
        
        summary.net = adjustedNet;
        summary.tax = adjustedTax;
      });
      
      // 総税額を再計算
      taxValue = Object.values(taxSummary).reduce((sum, summary) => sum + summary.tax, 0);
    }
  }
  const safeTaxValue = (taxValue !== null && taxValue !== undefined) ? Number(taxValue).toLocaleString() : '0';
  modifiedHTML = modifiedHTML.replace(/{{ total_tax_value }}/g, safeTaxValue);

  // Generate breakdown HTML, sorted by rate descending, filtering out 0s
  let taxitems = Object.values(taxSummary)
    .filter(summary => summary.net !== 0 || summary.tax !== 0)
    .sort((a, b) => b.rate - a.rate)
    .map(summary => {
      const safeRate = (summary.rate !== null && summary.rate !== undefined) ? Number(summary.rate * 100).toLocaleString() : '0';
      const safeNet = (summary.net !== null && summary.net !== undefined) ? Number(summary.net).toLocaleString() : '0';
      const safeTax = (summary.tax !== null && summary.tax !== undefined) ? Number(summary.tax).toLocaleString() : '0';
      
      return `
    <tr>      
      <td style="border:none;"></td>
      <td class="title-cell">${safeRate}％対象</td>
      <td class="cell-right">¥ ${safeNet}</td>
    </tr>
    <tr>        
      <td style="border:none;"></td>
      <td class="title-cell">消費税</td>
      <td class="cell-right">¥ ${safeTax}</td>
    </tr>
`;
    }).join('');

  modifiedHTML = modifiedHTML.replace(/{{ taxable_details }}/g, taxitems);

  // Footer
  let comment = '';
  if (data.comment) {
    // Replace all occurrences of \n with <br/>
    comment = data.comment.replace(/\n/g, '<br/>');
  }
  modifiedHTML = modifiedHTML.replace(/{{ comments }}/g, comment);

  return modifiedHTML;
};

module.exports = {
  generateNewInvoiceNumber,
  generateInvoiceHTML
};