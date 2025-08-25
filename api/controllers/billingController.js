const {
  selectBillableListView,
  selectBilledListView,
  selectMaxInvoiceNumber,
  updateInvoices,
  getPaymentById,
  selectMaxReceiptNumber,
  getReceiptByPaymentId,
  saveReceiptNumber,
  selectPaymentsForReceiptsView,
  linkPaymentToReceipt
} = require('../models/billing');
const { getUsersByID } = require('../models/user');
const { getBrowser } = require('../services/puppeteerService');
const fs = require('fs');
const path = require('path');
const ExcelJS = require("exceljs");

// --- Helper Functions ---

const generateNewInvoiceNumber = async (requestId, hotelId, date) => {
  let result = await selectMaxInvoiceNumber(requestId, hotelId, date);
  let last_invoice_number = result.length > 0 ? result[0].last_invoice_number : null;

  let new_invoice_number;
  if (!last_invoice_number) {
    const d = new Date(date);
    const year = d.getFullYear() % 100; // last two digits of year
    const month = d.getMonth() + 1; // getMonth returns 0-11

    new_invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
  } else {
    new_invoice_number = parseInt(last_invoice_number, 10) + 1;
  }
  return new_invoice_number;
};

// --- Main Export Generation Functions ---

const getBillableListView = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await selectBillableListView(req.requestId, hotelId, startDate, endDate);

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Function to generate HTML for consolidated receipts


const getBilledListView = async (req, res) => {
  const hotelId = req.params.hid;
  const month = req.params.mdate;

  try {
    const data = await selectBilledListView(req.requestId, hotelId, month);

    // Return empty array instead of 404 when no data found
    if (!data || data.length === 0) {
      return res.json([]);
    }

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generates an invoice PDF using a new HTML template that matches the Excel layout.
 */
const generateInvoice = async (req, res) => {
  const hotelId = req.params.hid;
  const invoiceId = req.params.invoice;
  const invoiceData = req.body;
  const userId = req.user.id;
  const invoiceHTML = fs.readFileSync(path.join(__dirname, '../components/invoice.html'), 'utf-8');

  let page;

  try {
    if (!invoiceData.invoice_number) {
      invoiceData.invoice_number = await generateNewInvoiceNumber(req.requestId, hotelId, invoiceData.date);
    }

    await updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);

    const userInfo = await getUsersByID(req.requestId, userId);

    // Get browser instance from the service
    const browser = await getBrowser();
    page = await browser.newPage();
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

    //  3. Send PDF as a download
    res.contentType("application/pdf");
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error("Error generating PDF with Puppeteer:", error);
    res.status(500).send('Error generating blank PDF');
  } finally {
    if (page) {
      await page.close().catch(err => console.error("Error closing page:", err));
    }
  }
};

/**
 * Populates the new HTML invoice template with dynamic data.
 */
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

const handleGenerateReceiptRequest = async (req, res) => {
  const paymentId = req.params.payment_id;
  const paymentIds = req.body.payment_ids;
  // Determine if it's single or consolidated
  const isConsolidated = !!req.body.payment_ids && !req.params.payment_id;
  console.log(`[Receipt Generation] isConsolidated: ${isConsolidated}, paymentId: ${paymentId}, paymentIds: ${paymentIds ? paymentIds.join(',') : 'N/A'}`);
  const hotelId = req.params.hid;
  const userId = req.user.id;
  const taxBreakdownData = req.body.taxBreakdownData;
  const forceRegenerate = req.body.forceRegenerate;

  let page;

  console.log(`New receipt request: consolidated=${isConsolidated}, hotelId=${hotelId}, paymentId=${paymentId}, paymentIds=${paymentIds ? paymentIds.join(',') : 'N/A'}, taxBreakdownData:`, taxBreakdownData);

  try {
    const userInfo = await getUsersByID(req.requestId, userId);
    if (!userInfo || userInfo.length === 0) {
      return res.status(404).json({ error: 'User info not found' });
    }
    const userName = userInfo[0].name;

    // Variables for PDF generation
    let receiptDataForPdf = {};
    let paymentDataForPdf;
    let paymentsArrayForPdf;
    let finalReceiptNumber;
    let finalTaxBreakdownForPdf;
    let isExistingReceipt = false;

    // Early check for existing receipt - check for both single and consolidated requests
    let existingReceipt = null;
    if (!isConsolidated && paymentId) {
      // For single payment requests, check if a receipt already exists
      existingReceipt = await getReceiptByPaymentId(req.requestId, paymentId);
    } else if (isConsolidated && Array.isArray(paymentIds) && paymentIds.length > 0) {
      // For consolidated requests, check if any of the payments already has a receipt
      // If any payment already has a receipt, we should use that existing receipt data
      for (const pid of paymentIds) {
        const existingReceiptForPayment = await getReceiptByPaymentId(req.requestId, pid);
        if (existingReceiptForPayment) {
          existingReceipt = existingReceiptForPayment;
          break; // Use the first existing receipt found
        }
      }
    }

    // If receipt exists and we're not forcing regeneration with new data, use existing receipt
    if (existingReceipt && !forceRegenerate && (!taxBreakdownData || taxBreakdownData.length === 0)) {
      console.log(`Using existing receipt: ${existingReceipt.receipt_number} for ${isConsolidated ? 'consolidated' : 'single'} request`);
      isExistingReceipt = true;

      // Always use the stored receipt data from database
      receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
      receiptDataForPdf.receipt_date = existingReceipt.receipt_date;
      receiptDataForPdf.totalAmount = parseFloat(existingReceipt.amount);
      finalTaxBreakdownForPdf = existingReceipt.tax_breakdown;
      finalReceiptNumber = existingReceipt.receipt_number;

      // Get payment data for PDF generation (use first payment for consolidated)
      const paymentForPdfId = isConsolidated ? paymentIds[0] : paymentId;
      paymentDataForPdf = await getPaymentById(req.requestId, paymentForPdfId);
      if (!paymentDataForPdf) {
        return res.status(404).json({ error: 'Payment data not found' });
      }

      // Override payment amount with the actual receipt amount from database
      // This ensures {{ received_amount }} always shows the stored receipt total
      paymentDataForPdf.amount = existingReceipt.amount;

      // For consolidated requests that are using existing receipt, we still need to get all payments for the proviso
      if (isConsolidated) {
        paymentsArrayForPdf = [];
        for (const pid of paymentIds) {
          const paymentData = await getPaymentById(req.requestId, pid);
          if (paymentData) {
            paymentsArrayForPdf.push(paymentData);
          }
        }
      }
    }

    // Generate new receipt if not using existing one
    if (!isExistingReceipt) {
      if (isConsolidated) {
        // Consolidated receipt logic
        if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
          return res.status(400).json({ error: 'payment_ids must be a non-empty array for consolidated receipts.' });
        }

        let fetchedPaymentsData = [];
        let clientNameCheck = null;
        for (const pid of paymentIds) {
          const singlePaymentData = await getPaymentById(req.requestId, pid);
          if (!singlePaymentData) {
            return res.status(404).json({ error: `Payment data not found for payment_id: ${pid}` });
          }
          if (clientNameCheck === null) {
            clientNameCheck = singlePaymentData.client_name;
          } else if (clientNameCheck !== singlePaymentData.client_name) {
            return res.status(400).json({ error: 'All payments must belong to the same client for consolidation.' });
          }
          fetchedPaymentsData.push(singlePaymentData);
        }

        paymentDataForPdf = fetchedPaymentsData[0];
        paymentsArrayForPdf = fetchedPaymentsData;
        receiptDataForPdf.client_name = clientNameCheck;

        // Determine common payment date for consolidated receipt
        let commonPaymentDate = null;
        if (fetchedPaymentsData.length > 0) {
          commonPaymentDate = fetchedPaymentsData[0].payment_date;
          for (let i = 1; i < fetchedPaymentsData.length; i++) {
            if (fetchedPaymentsData[i].payment_date !== commonPaymentDate) {
              commonPaymentDate = null; // Dates are not common
              console.log('[Receipt Generation] Consolidated: Payment dates differ, defaulting to current date for receipt.');
              break;
            }
          }
          if (commonPaymentDate) {
            console.log(`[Receipt Generation] Consolidated: Using common payment date for receipt: ${commonPaymentDate}`);
          }
        }

        // Generate receipt number and date
        const receiptDateObj = commonPaymentDate ? new Date(commonPaymentDate) : new Date();
        const year = receiptDateObj.getFullYear() % 100;
        const month = receiptDateObj.getMonth() + 1;
        const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
        let maxReceiptNumData = await selectMaxReceiptNumber(req.requestId, hotelId, receiptDateObj);
        let sequence = 1;
        if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
          sequence = BigInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length)) + BigInt(1);
        }
        receiptDataForPdf.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
        receiptDataForPdf.receipt_date = receiptDateObj.toISOString().split('T')[0];
        finalReceiptNumber = receiptDataForPdf.receipt_number;

        // Calculate total amount
        let totalConsolidatedAmount;
        if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
          totalConsolidatedAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
          finalTaxBreakdownForPdf = taxBreakdownData;
        } else {
          totalConsolidatedAmount = fetchedPaymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
          finalTaxBreakdownForPdf = null;
        }
        receiptDataForPdf.totalAmount = totalConsolidatedAmount;

        // Save consolidated receipt
        console.log(`[Receipt Generation] Consolidated Receipt Path: Determined receipt_date: ${receiptDataForPdf.receipt_date}`);
        const saveResult = await saveReceiptNumber(
          req.requestId, hotelId, receiptDataForPdf.receipt_number,
          receiptDataForPdf.receipt_date, totalConsolidatedAmount, userId, finalTaxBreakdownForPdf
        );

        if (!saveResult || !saveResult.id) {
          throw new Error('Failed to save consolidated receipt master record.');
        }

        // Link all payments to the receipt
        for (const pData of fetchedPaymentsData) {
          await linkPaymentToReceipt(req.requestId, pData.id, saveResult.id);
        }

      } else {
        // Single receipt logic - new receipt or regeneration
        if (!paymentId) {
          return res.status(400).json({ error: 'payment_id URL parameter is required for single receipts.' });
        }

        console.log(`Generating new receipt for paymentId: ${paymentId}`);

        // Fetch payment data if not already fetched
        if (!paymentDataForPdf) {
          paymentDataForPdf = await getPaymentById(req.requestId, paymentId);
          if (!paymentDataForPdf) {
            return res.status(404).json({ error: 'Payment data not found' });
          }
        }

        // Generate receipt number and date based on payment date
        console.log(`[Receipt Generation] Single Path: Raw payment_date from paymentDataForPdf: '${paymentDataForPdf.payment_date}'`);
        const receiptDateObj = new Date(paymentDataForPdf.payment_date);
        console.log(`[Receipt Generation] Single Path: Created receiptDateObj: ${receiptDateObj.toISOString()} (UTC)`);
        const year = receiptDateObj.getFullYear() % 100;
        const month = receiptDateObj.getMonth() + 1;
        const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
        let maxReceiptNumData = await selectMaxReceiptNumber(req.requestId, hotelId, receiptDateObj);
        let sequence = 1;
        if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
          sequence = BigInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length)) + BigInt(1);
        }
        receiptDataForPdf.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
        receiptDataForPdf.receipt_date = receiptDateObj.toISOString().split('T')[0];
        finalReceiptNumber = receiptDataForPdf.receipt_number;

        // Calculate total amount and tax breakdown
        let amountForDbSingle;
        if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
          receiptDataForPdf.totalAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
          amountForDbSingle = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
          finalTaxBreakdownForPdf = taxBreakdownData;
        } else {
          receiptDataForPdf.totalAmount = parseFloat(paymentDataForPdf.amount || 0);
          amountForDbSingle = receiptDataForPdf.totalAmount; // No breakdown, so DB amount is total amount
          // If regenerating existing receipt without new tax data, use existing tax breakdown
          finalTaxBreakdownForPdf = (existingReceipt && forceRegenerate) ? existingReceipt.tax_breakdown : null;
        }

        // Save the new receipt
        console.log(`[Receipt Generation] Single Receipt Path: Determined receipt_date: ${receiptDataForPdf.receipt_date}`);
        const saveResult = await saveReceiptNumber(
          req.requestId, hotelId, receiptDataForPdf.receipt_number,
          receiptDataForPdf.receipt_date, amountForDbSingle, userId, finalTaxBreakdownForPdf
        );

        if (!saveResult || !saveResult.id) {
          throw new Error('Failed to save single receipt record.');
        }

        // Link payment to receipt
        await linkPaymentToReceipt(req.requestId, paymentId, saveResult.id);
      }
    }

    // Populate hotel details for PDF generation
    if (paymentDataForPdf && paymentDataForPdf.hotel_details) {
      receiptDataForPdf.hotel_company_name = paymentDataForPdf.hotel_details.company_name;
      receiptDataForPdf.hotel_zip_code = paymentDataForPdf.hotel_details.zip_code;
      receiptDataForPdf.hotel_address = paymentDataForPdf.hotel_details.address;
      receiptDataForPdf.hotel_tel = paymentDataForPdf.hotel_details.tel;
      receiptDataForPdf.hotel_fax = paymentDataForPdf.hotel_details.fax;
      receiptDataForPdf.hotel_registration_number = paymentDataForPdf.hotel_details.registration_number;
    }

    // Generate PDF
    const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../components/receipt.html'), 'utf-8');

    const htmlContent = isConsolidated ?
      generateConsolidatedReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentsArrayForPdf, userName, finalTaxBreakdownForPdf) :
      generateReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentDataForPdf, userName, finalTaxBreakdownForPdf);

    const browser = await getBrowser();
    page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    const imageSelector = 'img[alt="Company Stamp"]';
    try {
      await page.waitForSelector(imageSelector, { timeout: 5000 });
      await page.evaluate(async selector => {
        const img = document.querySelector(selector);
        if (img && !img.complete) {
          await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
        }
      }, imageSelector);
    } catch (e) {
      console.warn(`Stamp image selector not found or timed out in ${isConsolidated ? 'consolidated' : 'single'} receipt:`, e.message);
    }

    const pdfBuffer = await page.pdf({
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true, format: 'A4'
    });

    const clientNameForFile = (paymentDataForPdf.client_name || 'UnknownClient')
      .replace(/[<>:"/\|?*]/g, '_')
      .trim()
      .substring(0, 50);

    const pdfFilename = `${finalReceiptNumber}_${clientNameForFile}.pdf`;
    const fallbackFilename = `${finalReceiptNumber}_receipt.pdf`;

    // Debug: Log what we're working with
    console.log('Original client name:', paymentDataForPdf.client_name);
    console.log('Sanitized client name:', clientNameForFile);
    console.log('PDF filename before encoding:', pdfFilename);
    console.log('PDF filename after encoding:', encodeURIComponent(pdfFilename));

    // The UTF-8 encoded filename for modern browsers
    const encodedPdfFilenameForStar = encodeURIComponent(pdfFilename);

    // The ASCII-safe filename for older browsers or as a robust fallback
    // This should always be ASCII. If pdfFilename contains non-ASCII, use a generic fallback.
    let asciiSafeFallbackFilename;
    if (/^[\x00-\x7F]*$/.test(pdfFilename)) {
      // If the original pdfFilename is already ASCII, use it for the fallback
      asciiSafeFallbackFilename = pdfFilename;
    } else {
      // If not ASCII, use the predefined ASCII-only fallback
      asciiSafeFallbackFilename = fallbackFilename;
    }

    // Set the Content-Disposition header
    // Ensure correct concatenation and quoting.
    res.set('Content-Disposition', `attachment; filename="${asciiSafeFallbackFilename}"; filename*=UTF-8''${encodedPdfFilenameForStar}`);

    res.contentType("application/pdf");
    res.send(Buffer.from(pdfBuffer));

  } catch (error) {
    console.error(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF:`, error);
    res.status(500).send(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF: ${error.message}`);
  } finally {
    if (page) {
      await page.close().catch(err => console.error("Error closing page:", err));
    }
  }
};
function generateReceiptHTML(html, receiptData, paymentData, userName, taxBreakdownData) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g'); // Helper for global regex replace

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), receiptData.receipt_number || 'N/A');
  modifiedHTML = modifiedHTML.replace(g('receipt_date'), receiptData.receipt_date || 'YYYY-MM-DD');

  // Customer Information
  modifiedHTML = modifiedHTML.replace(g('customer_name'), paymentData.client_name || 'お客様名');

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


  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`; // Assuming stamp.png is served at the root by the public static file server
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  let dynamicTaxDetailsHtml = '';
  if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
    taxBreakdownData.forEach(item => {
      // Only process items that have a taxable amount, or if all amounts are zero,
      // behavior might depend on whether zero-amount entries should be shown.
      // Current logic from consolidated receipt only shows if item.amount > 0. Let's replicate.
      if (item.amount > 0 || item.tax_amount > 0) { // Show if either amount or tax_amount has value if item.amount itself can be 0 but still part of breakdown
        const rateDisplay = (parseFloat(item.rate) * 100).toFixed(0) + '%';
        dynamicTaxDetailsHtml += '<div class="tax-item" style="margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px;">'; // Added inline style for clarity
        dynamicTaxDetailsHtml += `<p style="margin: 0; font-size: 0.8em;">${item.name} 対象 ¥ ${item.amount.toLocaleString()}</p>`;
        if (parseFloat(item.rate) > 0) {
          dynamicTaxDetailsHtml += `<p style="margin: 0; font-size: 0.8em;">内消費税等 (${rateDisplay}) ¥ ${item.tax_amount.toLocaleString()}</p>`;
        }
        dynamicTaxDetailsHtml += '</div>';
      }
    });
  }

  // Regex to find the placeholder div.
  // This assumes receipt.html contains <div id="taxDetailsPlaceholder"></div> or <div id="taxDetailsPlaceholder" class="some-class"></div>
  const taxDetailsPlaceholderRegex = /(<div id="taxDetailsPlaceholder"[^>]*>)[\s\S]*?(<\/div>)/i;

  if (modifiedHTML.match(taxDetailsPlaceholderRegex)) {
    if (dynamicTaxDetailsHtml) {
      modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, `$1${dynamicTaxDetailsHtml}$2`);
    } else {
      // If no tax breakdown data, replace placeholder with a "Not applicable" message or leave it empty.
      // For consistency with consolidated, let's use a message.
      modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, '$1<p style="font-size: 0.8em;">税区分適用なし</p>$2');
    }
  } else {
    // If the placeholder isn't found, we should log a warning.
    // This indicates that receipt.html might need to be updated.
    console.warn('taxDetailsPlaceholder not found in receipt.html template for generateReceiptHTML.');
  }

  return modifiedHTML;
}
function generateConsolidatedReceiptHTML(html, consolidatedReceiptData, paymentsData, userName, taxBreakdownData) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g'); // Helper for global regex replace

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), consolidatedReceiptData.receipt_number || 'N/A');
  modifiedHTML = modifiedHTML.replace(g('receipt_date'), consolidatedReceiptData.receipt_date || 'YYYY-MM-DD');

  // Customer Information - Use first payment's client name
  const firstPayment = paymentsData && paymentsData.length > 0 ? paymentsData[0] : {};
  modifiedHTML = modifiedHTML.replace(g('customer_name'), firstPayment.client_name || 'お客様名');

  // Calculate Total Consolidated Amount
  let totalConsolidatedAmount = 0;
  if (paymentsData && paymentsData.length > 0) {
    totalConsolidatedAmount = paymentsData.reduce((sum, payment) => {
      let paymentAmount = 0;
      // Ensure payment.items is an array before trying to reduce it
      if (payment.items && Array.isArray(payment.items) && payment.items.length > 0) {
        paymentAmount = payment.items.reduce((itemSum, item) => itemSum + (parseFloat(item.total_price) || 0), 0);
      } else if (payment.amount) { // Fallback to payment.amount if items are not available/applicable
        paymentAmount = parseFloat(payment.amount) || 0;
      }
      return sum + paymentAmount;
    }, 0);
  }
  modifiedHTML = modifiedHTML.replace(g('received_amount'), totalConsolidatedAmount.toLocaleString());

  // Proviso (但し書き) - Use facility_name as a base and append payment IDs for clarity
  let facilityNameProviso = firstPayment.facility_name || '施設利用'; // Default facility name  

  modifiedHTML = modifiedHTML.replace(g('facility_name'), facilityNameProviso);

  // Stamp Image  
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  let dynamicTaxDetailsHtml = '';
  if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
    taxBreakdownData.forEach(item => {
      if (item.amount > 0) {
        const rateDisplay = (item.rate * 100).toFixed(0) + '%';
        dynamicTaxDetailsHtml += '<div class="tax-item">';
        dynamicTaxDetailsHtml += `<p>${item.name} 対象 ¥ ${item.amount.toLocaleString()}</p>`;
        if (item.rate > 0) {
          dynamicTaxDetailsHtml += `<p>内消費税等 (${rateDisplay}) ¥ ${item.tax_amount.toLocaleString()}</p>`;
        }
        dynamicTaxDetailsHtml += '</div>';
      }
    });
  }

  const taxDetailsPlaceholderRegex = /(<div id="taxDetailsPlaceholder"[^>]*>)[\s\S]*?(<\/div>)/i;
  if (modifiedHTML.match(taxDetailsPlaceholderRegex)) {
    if (dynamicTaxDetailsHtml) {
      modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, `$1${dynamicTaxDetailsHtml}$2`);
    } else {
      modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, '$1$2');
    }
  } else {
    console.warn('taxDetailsPlaceholder not found in receipt.html for generateConsolidatedReceiptHTML');
  }

  // Clean up any old Handlebars-style placeholders related to tax table
  modifiedHTML = modifiedHTML.replace(g('taxable_details_rows'), '');
  modifiedHTML = modifiedHTML.replace(g('details_subtotal_net'), '');
  modifiedHTML = modifiedHTML.replace(g('total_tax_value'), '');
  // details_total_gross is part of the tax table, but received_amount is the main display.
  // If details_total_gross was specifically for the table, it should be cleared.
  // However, it might be used if the table is present but empty.
  // For safety, let's clear if it was only for the Handlebars table.
  // The main received_amount is handled separately.
  // modifiedHTML = modifiedHTML.replace(g('details_total_gross'), ''); // Re-evaluating this, might be needed for overall total
  modifiedHTML = modifiedHTML.replace(g('taxable_details_exist'), 'false');

  return modifiedHTML;
}

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

/**
 * Generates an invoice Excel file by loading a template and filling in the data.
 */
const generateInvoiceExcel = async (req, res) => {
  const hotelId = req.params.hid;
  const invoiceData = req.body;
  const userId = req.user.id;

  try {
      // Ensure invoice number exists
      if (!invoiceData.invoice_number) {
          invoiceData.invoice_number = await generateNewInvoiceNumber(req.requestId, hotelId, invoiceData.date);
      }

      // Update database records
      await updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);

      const userInfo = await getUsersByID(req.requestId, userId);

      // --- New Template-based Logic ---
      
      // 1. Load the template workbook
      const templatePath = path.join(__dirname, '../components/請求書テンプレート.xlsx');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(templatePath);

      // 2. Get the worksheet
      const worksheet = workbook.getWorksheet('請求書フォーマット'); // Use the correct sheet name from your template

      // 3. Fill in the data into specific cells
      worksheet.getCell('L1').value = invoiceData.invoice_number;
      worksheet.getCell('L2').value = new Date(invoiceData.date); // Use Date object for correct formatting
      worksheet.getCell('A4').value = invoiceData.client_name;
      
      // Subject line (optional, can be dynamic)
      worksheet.getCell('D9').value = invoiceData.facility_name ? `${invoiceData.facility_name} 宿泊料` : '宿泊料';
      worksheet.getCell('D10').value = new Date(invoiceData.due_date); // CORRECTED: Only the date, no label
      
      // Bank info (assuming it's static or coming from data)
      worksheet.getCell('D11').value = invoiceData.bank_name || '銀行A'; // CORRECTED: Only the value, no label

      worksheet.getCell('L15').value = `担当者： ${userInfo[0].name}`;
      
      // Main total amount (header)
      worksheet.getCell('D16').value = invoiceData.invoice_total_value;

      // Details section
      worksheet.getCell('H20').value = `${invoiceData.invoice_total_stays} 泊`;
      worksheet.getCell('J20').value = invoiceData.invoice_total_value;

      // --- Tax & Totals Calculation ---
      let totalTax = 0;
      let totalNet = 0;
      if (invoiceData.items && Array.isArray(invoiceData.items)) {
          invoiceData.items.forEach(item => {
              totalTax += (item.total_price - item.total_net_price);
              totalNet += item.total_net_price;
          });
      }
      
      // Totals section at the bottom
      worksheet.getCell('I24').value = invoiceData.invoice_total_value; // 合計金額
      worksheet.getCell('I25').value = totalTax; // 内消費税
      worksheet.getCell('I27').value = totalNet; // 10%対象
      worksheet.getCell('I28').value = totalTax; // 消費税

      // Remarks section
      worksheet.getCell('C33').value = invoiceData.comment; // CORRECTED: Changed from C32 to C33
      worksheet.getCell('C33').alignment = { wrapText: true, vertical: 'top' };


      // 4. Send the file to the client
      res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoiceData.invoice_number}.xlsx"`);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      await workbook.xlsx.write(res);
      res.end();

  } catch (error) {
      console.error("Error generating Excel from template:", error);
      res.status(500).send('Error generating Excel');
  }
};

module.exports = {
  getBillableListView,
  getBilledListView,
  generateInvoice,
  generateInvoiceExcel,
  handleGenerateReceiptRequest,
  getPaymentsForReceipts,
};