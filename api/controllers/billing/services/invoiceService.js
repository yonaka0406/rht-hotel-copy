const logger = require('../../../config/logger');

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

function generateInvoiceHTML(html, data, userName) {
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;

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
  modifiedHTML = modifiedHTML.replace(/{{ total_amount }}/g, data.invoice_total_value ? data.invoice_total_value.toLocaleString() : '0');
  modifiedHTML = modifiedHTML.replace(/{{ bank_name }}/g, data.bank_name || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_branch_name }}/g, data.bank_branch_name || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_type }}/g, data.bank_account_type || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_number }}/g, data.bank_account_number || '');
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_name }}/g, data.bank_account_name || '');

  // Details Table
  let dtlitems = data.items.map(item => `
  <tr>
      <td class="cell-center">1</td>
      <td>宿泊料</td>                    
      <td class="cell-right">${data.invoice_total_stays} 泊</td>
      <td class="cell-right">¥ ${data.invoice_total_value.toLocaleString()}</td>
  </tr>
`).join('');
  modifiedHTML = modifiedHTML.replace(/{{ detail_items }}/g, dtlitems);
  modifiedHTML = modifiedHTML.replace(/{{ details_total_value }}/g, data.invoice_total_value.toLocaleString());

  // Taxable items
  let taxValue = 0;
  if (data.items && Array.isArray(data.items)) {
    data.items.forEach(item => {
      const difference = item.total_price - item.total_net_price;
      taxValue += difference;
    });
  }
  modifiedHTML = modifiedHTML.replace(/{{ total_tax_value }}/g, taxValue.toLocaleString());
  let taxitems = data.items.map(item => `
    <tr>        
      <td class="title-cell">${(item.tax_rate * 100).toLocaleString()}％対象</td>
      <td class="cell-right">¥ ${item.total_net_price.toLocaleString()}</td>
    </tr>
`).join('');
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