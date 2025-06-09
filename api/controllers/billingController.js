const { selectBillableListView, selectBilledListView, selectMaxInvoiceNumber, updateInvoices, getPaymentById, selectMaxReceiptNumber, getReceiptByPaymentId, saveReceiptNumber, selectPaymentsForReceiptsView } = require('../models/billing');
const { getUsersByID } = require('../models/user');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const getBillableListView = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {    
    const data = await selectBillableListView(req.requestId, hotelId, startDate, endDate);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getBilledListView = async (req, res) => {
  const hotelId = req.params.hid;
  const month = req.params.mdate;

  try {    
    const data = await selectBilledListView(req.requestId, hotelId, month);    
    
    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }  

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const generateInvoice = async (req, res) => {
  const hotelId = req.params.hid;
  const invoiceId = req.params.invoice;
  const invoiceData = req.body;  
  const userId = req.user.id;
  const invoiceHTML = fs.readFileSync(path.join(__dirname, '../components/invoice.html'), 'utf-8');  

  let browser;

  try {    
    // Save the invoice data to the database
    let max_invoice_number = await selectMaxInvoiceNumber(req.requestId, hotelId, invoiceData.date);
    console.log('invoice_number', max_invoice_number.last_invoice_number);
    if (!max_invoice_number.last_invoice_number) {
      const date = new Date(invoiceData.date);
      const year = date.getFullYear() % 100; // last two digits of year
      const month = date.getMonth() + 1; // getMonth returns 0-11
      
      max_invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
      
    } else {
      max_invoice_number += 1;
    }

    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = max_invoice_number;      
    }
    
    await updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);
    
    const userInfo = await getUsersByID(req.requestId, userId);    
    
    // Create a browser instance
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    page.on('console', msg => {
      console.log('PAGE LOG:', msg.type(), msg.text());
    });

    //  1. Create HTML content for the PDF
    const htmlContent = generateInvoiceHTML(invoiceHTML, invoiceData, userInfo[0].name); 
    //console.log("generateInvoice:", htmlContent);
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });
    
    const imageSelector = 'img[alt="Company Stamp"]';
    await page.waitForSelector(imageSelector);
    await page.evaluate(async selector => {
      const img = document.querySelector(selector);
      if (img && !img.complete) {
          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
          });
      }
    }, imageSelector);
    const imageLoaded = await page.evaluate(selector => {
        const img = document.querySelector(selector);
        if (!img) {
            return 'Image element not found';
        }
        return img.complete && img.naturalWidth > 0; //  Check if loaded
    }, 'img[alt="Company Stamp"]'); //  Use a specific selector
    
    console.log('Image loaded:', imageLoaded);
    
    if (!imageLoaded) {
        console.warn('Image might not have loaded correctly.');
    }
    

    //  2. Generate PDF
    const pdfBuffer = await page.pdf({
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true,
        format: 'A4',
    });
    
    // Close the browser instance
    await browser.close();

    //  3. Send PDF as a download
    res.contentType("application/pdf");    
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("Error generating PDF with Puppeteer:", error);
    res.status(500).send('Error generating blank PDF');
  } finally {
    if (browser) {
      await browser.close().catch(err => console.error("Error closing browser:", err));
    }
  }
};
function generateInvoiceHTML(html, data, userName) {
  const imagePath = path.join(__dirname, '../components/stamp.png');
  //const imageUrl = `file:///${imagePath.replace(/\\/g, '/')}`;
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;

  let modifiedHTML = html;

  // console.log("generateInvoiceHTML:", data);
  
  modifiedHTML = modifiedHTML.replace(/{{ stamp_image }}/g, imageUrl);

  // Header
  modifiedHTML = modifiedHTML.replace(/{{ invoice_number }}/g, data.invoice_number);
  modifiedHTML = modifiedHTML.replace(/{{ invoice_date }}/g, data.date);
  modifiedHTML = modifiedHTML.replace(/{{ customer_name }}/g, data.client_name);
  modifiedHTML = modifiedHTML.replace(/{{ customer_code }}/g, data.customer_code);
  modifiedHTML = modifiedHTML.replace(/{{ company_contact_person }}/g, userName);

  // Main Table
  modifiedHTML = modifiedHTML.replace(/{{ facility_name }}/g, data.facility_name);
  modifiedHTML = modifiedHTML.replace(/{{ payment_due_date }}/g, data.due_date);
  modifiedHTML = modifiedHTML.replace(/{{ total_amount }}/g, data.invoice_total_value.toLocaleString());
  modifiedHTML = modifiedHTML.replace(/{{ bank_name }}/g, data.bank_name);
  modifiedHTML = modifiedHTML.replace(/{{ bank_branch_name }}/g, data.bank_branch_name);
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_type }}/g, data.bank_account_type);
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_number }}/g, data.bank_account_number);
  modifiedHTML = modifiedHTML.replace(/{{ bank_account_name }}/g, data.bank_account_name);

  // Details Table
  let dtlitems = data.items.map(item => `
    <tr>
        <td class="cell-center">1</td>
        <td>宿泊料</td>                    
        <td class="cell-right">${ data.invoice_total_stays } 泊</td>
        <td class="cell-right">¥ ${ data.invoice_total_value.toLocaleString() }</td>
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
        <td class="cell-right">¥ ${ item.total_net_price.toLocaleString() }</td>
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

function generateReceiptHTML(html, receiptData, paymentData, userName) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ \${key} }}`, 'g'); // Helper for global regex replace

  // Active Placeholders in new receipt.html:
  // {{ receipt_date }}
  // {{ receipt_number }}
  // {{ customer_name }}
  // {{ received_amount }}
  // {{ facility_name }} (for 但し書き - proviso)

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), receiptData.receipt_number || 'N/A');
  modifiedHTML = modifiedHTML.replace(g('receipt_date'), receiptData.receipt_date || 'YYYY-MM-DD');

  // Customer Information
  modifiedHTML = modifiedHTML.replace(g('customer_name'), paymentData.client_name || 'お客様名');
  // {{ customer_code }} is commented out in the new template
  // // modifiedHTML = modifiedHTML.replace(g('customer_code'), paymentData.customer_code || '');

  // Facility Name (for "但し書き")
  modifiedHTML = modifiedHTML.replace(g('facility_name'), paymentData.facility_name || '施設利用');

  // Received Amount (Total)
  // This calculation is crucial and should remain.
  let calculatedReceivedAmount = 0;
  if (paymentData.items && paymentData.items.length > 0) {
    calculatedReceivedAmount = paymentData.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  } else {
    calculatedReceivedAmount = parseFloat(paymentData.amount) || 0;
  }
  modifiedHTML = modifiedHTML.replace(g('received_amount'), calculatedReceivedAmount.toLocaleString());

  // Obsolete Placeholders (commented out or removed as per plan)
  // {{ company_contact_person }} is commented out in the new template
  // // modifiedHTML = modifiedHTML.replace(g('company_contact_person'), userName || '');

  // Bank Details are hardcoded in the new template
  /*
  const hotelDetails = paymentData.hotel_details || {};
  modifiedHTML = modifiedHTML.replace(g('bank_name'), hotelDetails.bank_name || 'ホテル銀行名');
  modifiedHTML = modifiedHTML.replace(g('bank_branch_name'), hotelDetails.bank_branch_name || '支店名');
  modifiedHTML = modifiedHTML.replace(g('bank_account_type'), hotelDetails.bank_account_type || '口座種別');
  modifiedHTML = modifiedHTML.replace(g('bank_account_number'), hotelDetails.bank_account_number || '口座番号');
  modifiedHTML = modifiedHTML.replace(g('bank_account_name'), hotelDetails.bank_account_name || '口座名義');
  */

  // {{ stamp_image }} is replaced by a CSS styled div in the new template
  /*
  const imagePath = path.join(__dirname, '../components/stamp.png');
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);
  */

  // {{ detail_items }} section is hidden by display: none;
  /*
  let detailItemsHtml = '';
  let detailsTotalValue = 0; // This variable is also for a hidden section
  if (paymentData.items && Array.isArray(paymentData.items)) {
    paymentData.items.forEach((item, index) => {
      const itemTotalPrice = parseFloat(item.total_price) || 0;
      detailsTotalValue += itemTotalPrice;
      detailItemsHtml += `
        <tr>
            <td class="cell-center">\${index + 1}</td>
            <td>\${item.description || '品目'}</td>
            <td class="cell-center">\${item.quantity || 1} \${item.unit || ''}</td>
            <td class="cell-right">¥ \${itemTotalPrice.toLocaleString()}</td>
        </tr>
      `;
    });
  } else {
      detailsTotalValue = calculatedReceivedAmount;
      detailItemsHtml = `
        <tr>
            <td class="cell-center">1</td>
            <td>宿泊料として</td>
            <td class="cell-center">1 式</td>
            <td class="cell-right">¥ \${calculatedReceivedAmount.toLocaleString()}</td>
        </tr>
      `;
  }
  modifiedHTML = modifiedHTML.replace(g('detail_items'), detailItemsHtml);
  */

  // {{ details_total_value }} section is hidden by display: none;
  // // modifiedHTML = modifiedHTML.replace(g('details_total_value'), detailsTotalValue.toLocaleString()); // detailsTotalValue would be from the block above

  // {{ total_tax_value }} and {{ taxable_details }} sections are hidden by display: none;
  /*
  let totalTaxValue = 0;
  const taxItemsMap = new Map();
  if (paymentData.items && Array.isArray(paymentData.items)) {
    paymentData.items.forEach(item => {
      const itemNetPrice = parseFloat(item.total_net_price) || parseFloat(item.total_price) || 0;
      const itemTotalPrice = parseFloat(item.total_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;
      const taxDifference = itemTotalPrice - itemNetPrice;
      totalTaxValue += taxDifference;

      if (taxRate > 0) {
        const currentTaxableAmount = taxItemsMap.get(taxRate) || 0;
        taxItemsMap.set(taxRate, currentTaxableAmount + itemNetPrice);
      }
    });
  }
  modifiedHTML = modifiedHTML.replace(g('total_tax_value'), totalTaxValue.toLocaleString());

  let taxableDetailsHtml = '';
  taxItemsMap.forEach((amount, rate) => {
    taxableDetailsHtml += `
      <tr>
        <td class="title-cell">\${(rate * 100).toLocaleString()}%対象</td>
        <td class="cell-right">¥ \${amount.toLocaleString()}</td>
      </tr>
    `;
  });
  modifiedHTML = modifiedHTML.replace(g('taxable_details'), taxableDetailsHtml);
  */

  // {{ comments }} placeholder is not present in the new receipt.html in a general sense.
  // The line "上記金額を正に領収いたしました" is hardcoded.
  // paymentData.notes could be used for the "但し書き" if `facility_name` is not appropriate,
  // but the current template uses `facility_name` there.
  // // let commentsText = paymentData.notes || '';
  // // commentsText += (commentsText ? '<br/>' : '') + '上記金額を正に領収いたしました。'; // This specific text is already in the template.
  // // modifiedHTML = modifiedHTML.replace(g('comments'), commentsText); // No {{ comments }} placeholder in new template.

  return modifiedHTML;
}

const generateReceipt = async (req, res) => {
  const hotelId = req.params.hid;
  const paymentId = req.params.payment_id; // Corrected variable name
  const userId = req.user.id;
  let browser;
  const receiptData = {}; // Initialize receiptData

  try {
    const paymentData = await getPaymentById(req.requestId, paymentId);
    if (!paymentData) {
      return res.status(404).json({ error: 'Payment data not found' });
    }

    const userInfo = await getUsersByID(req.requestId, userId);
    if (!userInfo || userInfo.length === 0) {
        return res.status(404).json({ error: 'User info not found' });
    }

    let existingReceipt = await getReceiptByPaymentId(req.requestId, paymentId);

    if (existingReceipt) {
      receiptData.receipt_number = existingReceipt.receipt_number;
      receiptData.receipt_date = existingReceipt.receipt_date;
    } else {
      const receiptDate = new Date();
      let max_receipt_number_data = await selectMaxReceiptNumber(req.requestId, hotelId, receiptDate);
      let max_receipt_number;

      if (!max_receipt_number_data.last_receipt_number) {
        const year = receiptDate.getFullYear() % 100;
        const month = receiptDate.getMonth() + 1;
        max_receipt_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
      } else {
        max_receipt_number = max_receipt_number_data.last_receipt_number + 1;
      }
      receiptData.receipt_number = max_receipt_number;
      receiptData.receipt_date = receiptDate.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Ensure paymentData.amount or the correct field for amount is used
      await saveReceiptNumber(req.requestId, paymentId, hotelId, receiptData.receipt_number, receiptData.receipt_date, paymentData.amount, userId);
    }

    const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../components/receipt.html'), 'utf-8');
    const htmlContent = generateReceiptHTML(receiptHTMLTemplate, receiptData, paymentData, userInfo[0].name);

    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
        printBackground: true,
        format: 'A4'
    });
    await browser.close();

    res.contentType("application/pdf");
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Error generating PDF for receipt:", error);
    if (browser) {
      await browser.close().catch(err => console.error("Error closing browser:", err));
    }
    res.status(500).send('Error generating receipt PDF');
  }
};

const getPaymentsForReceipts = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await selectPaymentsForReceiptsView(req.requestId, hotelId, startDate, endDate);
    if (!data) { // Changed from !data || data.length === 0 to handle cases where model might return null on error
      return res.status(404).json({ error: 'No payment data found for the specified criteria or an error occurred.' });
    }
    // If data is an empty array, it's a valid response (no payments found), not a 404.
    res.json(data);
  } catch (err) {
    console.error('Error in getPaymentsForReceipts controller:', err);
    // Check if the error is a known type, e.g., from the model indicating a specific issue
    if (err.message.includes('Database error')) { // Example check
        return res.status(503).json({ error: 'Service unavailable or database error.' });
    }
    res.status(500).json({ error: 'Internal server error while fetching payments for receipts.' });
  }
};

module.exports = {
  getBillableListView,
  getBilledListView,
  generateInvoice,
  generateReceipt,
  getPaymentsForReceipts,
};
// FORCED_UPDATE_TIMESTAMP_CONTROLLER_20231201153000