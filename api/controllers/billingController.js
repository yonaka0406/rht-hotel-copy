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

// Function to generate HTML for consolidated receipts


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

const handleGenerateReceiptRequest = async (req, res) => {
    // Determine if it's single or consolidated
    const isConsolidated = !!req.body.payment_ids; // True if payment_ids array exists in body
    const paymentId = req.params.payment_id; // For single receipts from URL param
    const paymentIds = req.body.payment_ids; // For consolidated from body
    const hotelId = req.params.hid; // From URL param, common for both
    const userId = req.user.id;
    const taxBreakdownData = req.body.taxBreakdownData; // Expected as an array from the dialog

    let browser;

    console.log(`New receipt request: consolidated=${isConsolidated}, hotelId=${hotelId}, paymentId=${paymentId}, paymentIds=${paymentIds ? paymentIds.join(',') : 'N/A'}, taxBreakdownData:`, taxBreakdownData);

    try {
        const userInfo = await getUsersByID(req.requestId, userId);
        if (!userInfo || userInfo.length === 0) {
            return res.status(404).json({ error: 'User info not found' });
        }
        const userName = userInfo[0].name;

        let receiptDataForPdf = {}; // Holds receipt_number, receipt_date, totalAmount (calculated)
        let paymentDataForPdf;    // Holds client_name, facility_name, hotel_details for company info etc.
                                  // For consolidated, this is the first payment's data.
        let paymentsArrayForPdf;  // For consolidated, holds all payment objects for proviso.
        let finalReceiptNumber;

        if (isConsolidated) {
            if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
                return res.status(400).json({ error: 'payment_ids must be a non-empty array for consolidated receipts.' });
            }

            let fetchedPaymentsData = [];
            let clientNameCheck = null;
            for (const pid of paymentIds) {
                const singlePaymentData = await getPaymentById(req.requestId, pid);
                if (!singlePaymentData) return res.status(404).json({ error: `Payment data not found for payment_id: ${pid}` });
                if (clientNameCheck === null) clientNameCheck = singlePaymentData.client_name;
                else if (clientNameCheck !== singlePaymentData.client_name) {
                    return res.status(400).json({ error: 'All payments must belong to the same client for consolidation.' });
                }
                fetchedPaymentsData.push(singlePaymentData);
            }

            paymentDataForPdf = fetchedPaymentsData[0];
            paymentsArrayForPdf = fetchedPaymentsData;

            const receiptDateObj = new Date();
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
            receiptDataForPdf.client_name = clientNameCheck;

            let totalConsolidatedAmount;
            if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
                totalConsolidatedAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax_amount) || 0), 0);
            } else {
                totalConsolidatedAmount = fetchedPaymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            }
            receiptDataForPdf.totalAmount = totalConsolidatedAmount;

            if (paymentDataForPdf && paymentDataForPdf.hotel_details) {
                receiptDataForPdf.hotel_company_name = paymentDataForPdf.hotel_details.company_name;
                receiptDataForPdf.hotel_zip_code = paymentDataForPdf.hotel_details.zip_code;
                receiptDataForPdf.hotel_address = paymentDataForPdf.hotel_details.address;
                receiptDataForPdf.hotel_tel = paymentDataForPdf.hotel_details.tel;
                receiptDataForPdf.hotel_fax = paymentDataForPdf.hotel_details.fax;
                receiptDataForPdf.hotel_registration_number = paymentDataForPdf.hotel_details.registration_number;
            }

            const saveResult = await saveReceiptNumber(
                req.requestId, null, hotelId, receiptDataForPdf.receipt_number,
                receiptDataForPdf.receipt_date, totalConsolidatedAmount, userId, taxBreakdownData
            );

            if (!saveResult || !saveResult.id) throw new Error('Failed to save consolidated receipt master record.');
            const newConsolidatedReceiptRecordId = saveResult.id;

            for (const pData of fetchedPaymentsData) {
                await linkPaymentToReceipt(req.requestId, pData.id, newConsolidatedReceiptRecordId);
            }
        } else { // Single Receipt
            if (!paymentId) {
                 return res.status(400).json({ error: 'payment_id URL parameter is required for single receipts.' });
            }
            const singlePaymentData = await getPaymentById(req.requestId, paymentId);
            if (!singlePaymentData) {
                return res.status(404).json({ error: 'Payment data not found for single receipt.' });
            }
            paymentDataForPdf = singlePaymentData; // Used for PDF details like client name

            let existingReceipt = await getReceiptByPaymentId(req.requestId, paymentId);

            let finalTaxBreakdownForPdf;
            // finalReceiptNumber is already declared above this block

            // Ensure 'receiptDataForPdf' is initialized as an object (already done above)
            // Ensure 'userId' is defined (already done above)
            // Ensure 'hotelId' and 'paymentId' are defined (already done above)
            // Ensure 'taxBreakdownData' is defined from req.body.taxBreakdownData (already done above)

            if (existingReceipt && (!taxBreakdownData || taxBreakdownData.length === 0) && !req.body.forceRegenerate) {
                // RE-ISSUE PATH
                console.log(`Re-issuing receipt for paymentId: ${paymentId} using existing receipt data.`);
                receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
                receiptDataForPdf.receipt_date = existingReceipt.receipt_date;
                receiptDataForPdf.totalAmount = parseFloat(existingReceipt.amount);
                finalTaxBreakdownForPdf = existingReceipt.tax_breakdown; // ASSIGNMENT
                // finalReceiptNumber variable might also need to be explicitly set here if used later for filename outside this direct scope.
                // For now, assume receiptDataForPdf.receipt_number is used for filename context.
                finalReceiptNumber = existingReceipt.receipt_number; // Ensure finalReceiptNumber is set for re-issue

            } else {
                // NEW RECEIPT or REGENERATION WITH NEW DATA PATH
                console.log(`Generating new receipt (or regenerating with new data) for paymentId: ${paymentId}.`);

                if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
                    receiptDataForPdf.totalAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax_amount) || 0), 0);
                    finalTaxBreakdownForPdf = taxBreakdownData; // ASSIGNMENT
                } else {
                    receiptDataForPdf.totalAmount = parseFloat(paymentDataForPdf.amount || 0);
                    finalTaxBreakdownForPdf = null; // ASSIGNMENT (or [] if preferred for consistency with saveReceiptNumber)
                }

                const receiptDateObj = new Date(paymentDataForPdf.payment_date);
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

                const saveResult = await saveReceiptNumber(
                    req.requestId,
                    paymentId,
                    hotelId,
                    receiptDataForPdf.receipt_number,
                    receiptDataForPdf.receipt_date,
                    receiptDataForPdf.totalAmount, // Use the calculated totalAmount
                    userId,
                    finalTaxBreakdownForPdf
                );
                if (!saveResult || !saveResult.id) {
                    throw new Error('Failed to save single receipt record during new generation.');
                }
                await linkPaymentToReceipt(req.requestId, paymentId, saveResult.id);
                finalReceiptNumber = receiptDataForPdf.receipt_number; // Ensure finalReceiptNumber is set for new/regenerated
            }
            // The 'finalReceiptNumber' for filename is derived from 'receiptDataForPdf.receipt_number' which is set in both paths.
            // So, the 'finalReceiptNumber = receiptDataForPdf.receipt_number;' line after this if/else block is fine.
        }

        const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../components/receipt.html'), 'utf-8');

        const htmlContent = isConsolidated ?
           generateConsolidatedReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentsArrayForPdf, userName, taxBreakdownData) : // For consolidated, original taxBreakdownData from request is passed
           generateReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentDataForPdf, userName, finalTaxBreakdownForPdf); // For single, pass the determined finalTaxBreakdownForPdf

        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
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
        await browser.close();

        const clientNameForFile = (paymentDataForPdf.client_name || 'UnknownClient').replace(/[^a-z0-9_-\s]/gi, '_').substring(0, 50);
        const pdfFilename = `${finalReceiptNumber}_${clientNameForFile}.pdf`;

        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(pdfFilename)}"`);
        res.contentType("application/pdf");
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        console.error(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF:`, error);
        if (browser) {
            await browser.close().catch(err => console.error("Error closing browser:", err));
        }
        res.status(500).send(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF: ${error.message}`);
    }
};
function generateReceiptHTML(html, receiptData, paymentData, userName, taxBreakdownData) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g'); // Helper for global regex replace

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
  // Update: Per new requirements, we will replace {{ stamp_image }} with an actual image URL.
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`; // Assuming stamp.png is served at the root by the public static file server
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

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

  // --- Start of new logic for Tax Breakdown ---
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
      // Optionally, append the tax details at the end if no placeholder, though less ideal:
      // if (dynamicTaxDetailsHtml) {
      // modifiedHTML += '<h2>税内訳</h2>' + dynamicTaxDetailsHtml; // Or some other fallback
      // }
  }
  // --- End of new logic for Tax Breakdown ---
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
  if (paymentsData && paymentsData.length > 1) { // Only add payment IDs if there's more than one payment
      const paymentIdsString = paymentsData.map(p => `ID:${p.payment_id || p.id}`).join(', '); // Use payment_id or id
      facilityNameProviso += ` (支払ID: ${paymentIdsString})`;
  }

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

module.exports = {
  getBillableListView,
  getBilledListView,
  generateInvoice,    
  handleGenerateReceiptRequest,
  getPaymentsForReceipts,  
};