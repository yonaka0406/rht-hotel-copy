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
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g'); // Helper for global regex replace

  // Stamp Image
  const imagePath = path.join(__dirname, '../components/stamp.png');
  // const imageUrl = `file:///${imagePath.replace(/\\/g, '/')}`; // For local file access if needed
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`; // Assuming server serves it
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), receiptData.receipt_number);
  modifiedHTML = modifiedHTML.replace(g('receipt_date'), receiptData.receipt_date);

  // Customer Information
  modifiedHTML = modifiedHTML.replace(g('customer_name'), paymentData.client_name || 'お客様名');
  modifiedHTML = modifiedHTML.replace(g('customer_code'), paymentData.customer_code || '取引先コード');

  // Company & Contact
  modifiedHTML = modifiedHTML.replace(g('company_contact_person'), userName || '担当者名');
  // Assuming facility_name is on paymentData, if it's part of hotel_details, adjust path
  modifiedHTML = modifiedHTML.replace(g('facility_name'), paymentData.facility_name || '施設名');

  // Bank Details (from paymentData.hotel_details or fallback)
  const hotelDetails = paymentData.hotel_details || {};
  modifiedHTML = modifiedHTML.replace(g('bank_name'), hotelDetails.bank_name || 'ホテル銀行名');
  modifiedHTML = modifiedHTML.replace(g('bank_branch_name'), hotelDetails.bank_branch_name || '支店名');
  modifiedHTML = modifiedHTML.replace(g('bank_account_type'), hotelDetails.bank_account_type || '口座種別');
  modifiedHTML = modifiedHTML.replace(g('bank_account_number'), hotelDetails.bank_account_number || '口座番号');
  modifiedHTML = modifiedHTML.replace(g('bank_account_name'), hotelDetails.bank_account_name || '口座名義');

  // Received Amount (Total)
  // Prefer calculated total from items if available, otherwise use paymentData.amount
  let totalReceivedAmount = 0;
  if (paymentData.items && paymentData.items.length > 0) {
    totalReceivedAmount = paymentData.items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  } else {
    totalReceivedAmount = paymentData.amount || 0;
  }
  modifiedHTML = modifiedHTML.replace(g('received_amount'), totalReceivedAmount.toLocaleString());

  // Detail Items
  let detailItemsHtml = '';
  let detailsTotalValue = 0;
  if (paymentData.items && Array.isArray(paymentData.items)) {
    paymentData.items.forEach((item, index) => {
      const itemTotalPrice = item.total_price || 0;
      detailsTotalValue += itemTotalPrice;
      detailItemsHtml += `
        <tr>
            <td class="cell-center">${index + 1}</td>
            <td>${item.description || '品目'}</td>
            <td class="cell-center">${item.quantity || 1} ${item.unit || ''}</td>
            <td class="cell-right">¥ ${itemTotalPrice.toLocaleString()}</td>
        </tr>
      `;
    });
  } else { // Fallback if no items, use the main payment amount as a single line
      detailsTotalValue = totalReceivedAmount; // paymentData.amount should be the total
      detailItemsHtml = `
        <tr>
            <td class="cell-center">1</td>
            <td>宿泊料として</td>
            <td class="cell-center">1 式</td>
            <td class="cell-right">¥ ${totalReceivedAmount.toLocaleString()}</td>
        </tr>
      `;
  }
  modifiedHTML = modifiedHTML.replace(g('detail_items'), detailItemsHtml);
  modifiedHTML = modifiedHTML.replace(g('details_total_value'), detailsTotalValue.toLocaleString());

  // Tax Calculation (similar to invoice, assuming items have tax_rate and total_net_price)
  let totalTaxValue = 0;
  const taxItemsMap = new Map();

  if (paymentData.items && Array.isArray(paymentData.items)) {
    paymentData.items.forEach(item => {
      const itemNetPrice = item.total_net_price || item.total_price || 0; // Fallback if net price not available
      const itemTotalPrice = item.total_price || 0;
      const taxRate = item.tax_rate || 0; // Default to 0 if not specified
      const taxDifference = itemTotalPrice - itemNetPrice;
      totalTaxValue += taxDifference;

      if (taxRate > 0) { // Only include items with tax
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
        <td class="title-cell">${(rate * 100).toLocaleString()}%対象</td>
        <td class="cell-right">¥ ${amount.toLocaleString()}</td>
      </tr>
    `;
  });
  modifiedHTML = modifiedHTML.replace(g('taxable_details'), taxableDetailsHtml);

  // Comments
  let commentsText = paymentData.notes || '';
  commentsText += (commentsText ? '<br/>' : '') + '上記金額を正に領収いたしました。';
  modifiedHTML = modifiedHTML.replace(g('comments'), commentsText);

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

    // Ensure images are loaded if any - similar to invoice generation if receipt has images
    const imageSelector = 'img[alt="Company Stamp"]'; // Assuming similar stamp image
    try {
        await page.waitForSelector(imageSelector, { timeout: 5000 }); // Wait for 5 seconds
        await page.evaluate(async selector => {
            const img = document.querySelector(selector);
            if (img && !img.complete) {
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            }
        }, imageSelector);
    } catch (e) {
        console.warn(`Image selector ${imageSelector} not found or image did not load within timeout: ${e.message}`);
    }


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

module.exports = { 
  getBillableListView,
  getBilledListView,
  generateInvoice,
  generateReceipt,
  getPaymentsForReceipts,
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