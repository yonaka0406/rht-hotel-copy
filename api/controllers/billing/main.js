const { getPool } = require('../../config/database');
const billingModel = require('../../models/billing');
const { getUsersByID } = require('../../models/user');
const { getBrowser, resetBrowser } = require('../../services/puppeteerService');
const { generateNewInvoiceNumber } = require('../services/invoiceService');
const logger = require('../../config/logger');
const fs = require('fs');
const path = require('path');
const ExcelJS = require("exceljs");

// --- Main Export Generation Functions ---

const getBillableListView = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await billingModel.selectBillableListView(req.requestId, hotelId, startDate, endDate);

    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    res.json(data);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Function to generate HTML for consolidated receipts


const getBilledListView = async (req, res) => {
  const hotelId = req.params.hid;
  const month = req.params.mdate;

  try {
    const data = await billingModel.selectBilledListView(req.requestId, hotelId, month);

    // Return empty array instead of 404 when no data found
    if (!data || data.length === 0) {
      return res.json([]);
    }

    res.json(data);
  } catch (err) {
    logger.error(err);
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

  let browser;
  let page;

  try {
    if (!invoiceData.invoice_number) {
      const maxInvoiceNumData = await billingModel.selectMaxInvoiceNumber(req.requestId, hotelId, invoiceData.date);
      invoiceData.invoice_number = await generateNewInvoiceNumber(maxInvoiceNumData, hotelId, invoiceData.date);
    }

    await billingModel.updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);

    const userInfo = await getUsersByID(req.requestId, userId);

    // Get browser instance from the service
    browser = await getBrowser();
    page = await browser.newPage();
    page.on('console', msg => {
      logger.debug('PAGE LOG:', msg.type(), msg.text());
    });

    //  1. Create HTML content for the PDF
    const htmlContent = generateInvoiceHTML(invoiceHTML, invoiceData, userInfo[0].name);
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


    if (!imageLoaded) {
      logger.warn('Image might not have loaded correctly.');
    }


    //  2. Generate PDF
    const pdfBuffer = await page.pdf({
      margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      printBackground: true,
      format: 'A4',
    });

    //  3. Send PDF as a download
    res.setHeader('Access-Control-Expose-Headers', 'X-Invoice-Number');
    res.setHeader('X-Invoice-Number', invoiceData.invoice_number);
    res.contentType("application/pdf");
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    logger.error('Error generating invoice PDF:', error);
    res.status(500).send('Internal server error while generating invoice PDF');
  } finally {
    if (page) {
      await page.close().catch(err => logger.error("Error closing page:", err));
    }
    await resetBrowser(false);
  }
};

/**
 * Populates the new HTML invoice template with dynamic data.
 */
function generateInvoiceHTML(html, data, userName) {
  const imagePath = path.join(__dirname, '../components/stamp.png');
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

const handleGenerateReceiptRequest = async (req, res) => {
  const paymentId = req.params.payment_id;
  const paymentIds = req.body.payment_ids;
  // Determine if it's single or consolidated
  const isConsolidated = !!req.body.payment_ids && !req.params.payment_id;
  const hotelId = req.params.hid;
  const userId = req.user.id;
  const taxBreakdownData = req.body.taxBreakdownData;
  const forceRegenerate = req.body.forceRegenerate;

  // New receipt customization parameters
  const honorific = req.body.honorific || '様';
  const isReissue = req.body.isReissue || false;
  const customIssueDate = req.body.customIssueDate || null;
  const customProviso = req.body.customProviso || null;

  let page = null; // Initialize page to null

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
      existingReceipt = await billingModel.getReceiptByPaymentId(req.requestId, paymentId, hotelId);
    } else if (isConsolidated && Array.isArray(paymentIds) && paymentIds.length > 0) {
      // For consolidated requests, check if any of the payments already has a receipt
      // If any payment already has a receipt, we should use that existing receipt data
      for (const pid of paymentIds) {
        const existingReceiptForPayment = await billingModel.getReceiptByPaymentId(req.requestId, pid, hotelId);
        if (existingReceiptForPayment) {
          existingReceipt = existingReceiptForPayment;
          break; // Use the first existing receipt found
        }
      }
    }

    // If receipt exists and we're not forcing regeneration with new data, use existing receipt
    if (existingReceipt && !forceRegenerate && (!taxBreakdownData || taxBreakdownData.length === 0)) {
      isExistingReceipt = true;

      // Always use the stored receipt data from database
      receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
      receiptDataForPdf.receipt_date = customIssueDate || existingReceipt.receipt_date;
      receiptDataForPdf.totalAmount = parseFloat(existingReceipt.amount);
      finalTaxBreakdownForPdf = existingReceipt.tax_breakdown;
      finalReceiptNumber = existingReceipt.receipt_number;

      // Get payment data for PDF generation (use first payment for consolidated)
      const paymentForPdfId = isConsolidated ? paymentIds[0] : paymentId;
      paymentDataForPdf = await billingModel.getPaymentById(req.requestId, paymentForPdfId, hotelId);
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
          const paymentData = await billingModel.getPaymentById(req.requestId, pid, hotelId);
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
          const singlePaymentData = await billingModel.getPaymentById(req.requestId, pid, hotelId);
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
              //logger.debug('[Receipt Generation] Consolidated: Payment dates differ, defaulting to current date for receipt.');
              break;
            }
          }
          if (commonPaymentDate) {
            //logger.debug(`[Receipt Generation] Consolidated: Using common payment date for receipt: ${commonPaymentDate}`);
          }
        }

        // Generate receipt number and date
        const receiptDateObj = commonPaymentDate ? new Date(commonPaymentDate) : new Date();

        if (existingReceipt) {
          receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
        } else {
          const year = receiptDateObj.getFullYear() % 100;
          const month = receiptDateObj.getMonth() + 1;
          const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
          let maxReceiptNumData = await billingModel.selectMaxReceiptNumber(req.requestId, hotelId, receiptDateObj);
          let sequence = 1;
          if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
            sequence = parseInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length), 10) + 1;
          }
          receiptDataForPdf.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
        }
        receiptDataForPdf.receipt_date = customIssueDate || receiptDateObj.toISOString().split('T')[0];
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
        const saveResult = await billingModel.saveReceiptNumber(
          req.requestId, hotelId, receiptDataForPdf.receipt_number,
          receiptDataForPdf.receipt_date, totalConsolidatedAmount, userId, finalTaxBreakdownForPdf,
          honorific, customProviso, isReissue
        );

        if (!saveResult || !saveResult.id) {
          throw new Error('Failed to save consolidated receipt master record.');
        }

        // Link all payments to the receipt
        for (const pData of fetchedPaymentsData) {
          await billingModel.linkPaymentToReceipt(req.requestId, pData.id, saveResult.id, hotelId);
        }

      } else {
        // Single receipt logic - new receipt or regeneration
        if (!paymentId) {
          return res.status(400).json({ error: 'payment_id URL parameter is required for single receipts.' });
        }


        // Fetch payment data if not already fetched
        if (!paymentDataForPdf) {
          paymentDataForPdf = await billingModel.getPaymentById(req.requestId, paymentId, hotelId);
          if (!paymentDataForPdf) {
            return res.status(404).json({ error: 'Payment data not found' });
          }
        }

        // Generate receipt number and date based on payment date
        const receiptDateObj = new Date(paymentDataForPdf.payment_date);

        if (existingReceipt) {
          receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
        } else {
          const year = receiptDateObj.getFullYear() % 100;
          const month = receiptDateObj.getMonth() + 1;
          const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
          let maxReceiptNumData = await billingModel.selectMaxReceiptNumber(req.requestId, hotelId, receiptDateObj);
          let sequence = 1;
          if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
            sequence = parseInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length), 10) + 1;
          }
          receiptDataForPdf.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
        }

        receiptDataForPdf.receipt_date = customIssueDate || receiptDateObj.toISOString().split('T')[0];
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
        const saveResult = await billingModel.saveReceiptNumber(
          req.requestId, hotelId, receiptDataForPdf.receipt_number,
          receiptDataForPdf.receipt_date, amountForDbSingle, userId, finalTaxBreakdownForPdf,
          honorific, customProviso, isReissue
        );

        if (!saveResult || !saveResult.id) {
          throw new Error('Failed to save single receipt record.');
        }

        // Link payment to receipt
        await billingModel.linkPaymentToReceipt(req.requestId, paymentId, saveResult.id, hotelId);
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
      generateConsolidatedReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentsArrayForPdf, userName, finalTaxBreakdownForPdf, honorific, isReissue, customIssueDate, customProviso) :
      generateReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentDataForPdf, userName, finalTaxBreakdownForPdf, honorific, isReissue, customIssueDate, customProviso);

    const browser = await getBrowser(); // Get browser instance once
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
      logger.warn(`Stamp image selector not found or timed out in ${isConsolidated ? 'consolidated' : 'single'} receipt:`, e.message);
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
    logger.error(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF:`, error);
    res.status(500).send(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF: ${error.message}`);
  } finally {
    if (page) {
      await page.close().catch(err => logger.error("Error closing page:", err));
    }
    await resetBrowser(false);
  }
};
function generateReceiptHTML(html, receiptData, paymentData, userName, taxBreakdownData, honorific, isReissue, customIssueDate, customProviso) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g'); // Helper for global regex replace

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), receiptData.receipt_number || 'N/A');

  // Customer Information
  modifiedHTML = modifiedHTML.replace(g('customer_name'), (paymentData.client_name || 'お客様名'));

  // Received Amount (Total)
  // This calculation is crucial and should remain.
  let calculatedReceivedAmount = 0;
  if (paymentData.items && paymentData.items.length > 0) {
    calculatedReceivedAmount = paymentData.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0);
  } else {
    calculatedReceivedAmount = parseFloat(paymentData.amount) || 0;
  }
  modifiedHTML = modifiedHTML.replace(g('received_amount'), calculatedReceivedAmount.toLocaleString());

  // Honorific
  modifiedHTML = modifiedHTML.replace(g('honorific'), honorific);
  // Issue date (use custom if provided)
  const displayIssueDate = customIssueDate || receiptData.receipt_date;
  modifiedHTML = modifiedHTML.replace(g('receipt_date'), displayIssueDate);
  // Proviso text (use custom if provided)
  const provisoText = customProviso || `${paymentData.facility_name || '施設利用'} 宿泊料として`;
  modifiedHTML = modifiedHTML.replace(g('proviso_text'), provisoText);
  // Show reissue stamp if needed
  if (isReissue) {
    modifiedHTML = modifiedHTML.replace('</body>', `
      <script>
        document.getElementById('reissueStamp').style.display = 'block';
      </script>
    </body>`);
  }
  // Show revenue stamp notice for amounts > 50,000
  const receiptAmount = parseFloat(receiptData.totalAmount) || calculatedReceivedAmount;
  if (receiptAmount > 50000) {
    modifiedHTML = modifiedHTML.replace('</body>', `
      <script>
        document.getElementById('revenueStampNotice').style.display = 'block';
      </script>
    </body>`);
  }

  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`; // Assuming stamp.png is served at the root by the public static file server
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  let dynamicTaxDetailsHtml = '';
  if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
    taxBreakdownData.forEach(item => {
      if (item.amount > 0 || item.tax_amount > 0) {
        const rateDisplay = (parseFloat(item.rate) * 100).toFixed(0) + '%';
        dynamicTaxDetailsHtml += '<div class="tax-item" style="margin-bottom: 5px; border-bottom: 1px solid #eee; padding-bottom: 5px;">';
        dynamicTaxDetailsHtml += `<p style="margin: 0; font-size: 0.8em;">${item.name} 対象 ¥ ${item.amount.toLocaleString()}</p>`;
        if (parseFloat(item.rate) > 0) {
          dynamicTaxDetailsHtml += `<p style="margin: 0; font-size: 0.8em;">内消費税等 (${rateDisplay}) ¥ ${item.tax_amount.toLocaleString()}</p>`;
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
      modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, '$1<p style="font-size: 0.8em;">税区分適用なし</p>$2');
    }
  } else {
    logger.warn('taxDetailsPlaceholder not found in receipt.html template for generateReceiptHTML.');
  }

  return modifiedHTML;
}
function generateConsolidatedReceiptHTML(html, consolidatedReceiptData, paymentsData, userName, taxBreakdownData, honorific, isReissue, customIssueDate, customProviso) {
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
  modifiedHTML = modifiedHTML.replace(g('customer_name'), (firstPayment.client_name || 'お客様名') + honorific);
  modifiedHTML = modifiedHTML.replace(g('honorific'), honorific);

  // Proviso (但し書き) - Use customProviso or facility_name as a base
  let facilityNameProviso = firstPayment.facility_name || '施設利用'; // Default facility name  

  modifiedHTML = modifiedHTML.replace(g('proviso_text'), customProviso || facilityNameProviso);

  // Stamp Image  
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  // Handle reissue stamp visibility
  if (isReissue) {
    modifiedHTML = modifiedHTML.replace(/(<div id="reissueStamp"[^>]*?)style="display: none;"(.*?>)/, '$1style="display: block;"$2');
  }

  let dynamicTaxDetailsHtml = '';
  if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
    taxBreakdownData.forEach(item => {
      if (item.amount > 0 || item.tax_amount > 0) {
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
    logger.warn('taxDetailsPlaceholder not found in receipt.html for generateConsolidatedReceiptHTML');
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
    const data = await billingModel.selectPaymentsForReceiptsView(req.requestId, hotelId, startDate, endDate);
    if (!data) { // Changed from !data || data.length === 0 to handle cases where model might return null on error
      return res.status(404).json({ error: 'No payment data found for the specified criteria or an error occurred.' });
    }
    // If data is an empty array, it's a valid response (no payments found), not a 404.
    res.json(data);
  } catch (err) {
    logger.error('Error in getPaymentsForReceipts controller:', err);
    // Check if the error is a known type, e.g., from the model indicating a specific issue
    if (err.message.includes('Database error')) { // Example check
      return res.status(503).json({ error: 'Service unavailable or database error.' });
    }
    res.status(500).json({ error: 'Internal server error while fetching payments for receipts.' });
  }
};

const generateInvoiceExcel = async (req, res) => {
  const hotelId = req.params.hid;
  const invoiceData = req.body;
  const userId = req.user.id;

  try {
    if (!invoiceData.invoice_number) {
      const maxInvoiceNumData = await billingModel.selectMaxInvoiceNumber(req.requestId, hotelId, invoiceData.date);
      invoiceData.invoice_number = await generateNewInvoiceNumber(maxInvoiceNumData, hotelId, invoiceData.date);
    }

    const userInfo = await getUsersByID(req.requestId, userId);
    await billingModel.updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);

    const mainTemplatePath = path.join(__dirname, '../components/請求書テンプレート.xlsx');
    const detailsTemplatePath = path.join(__dirname, '../components/請求書明細（テンプレート）.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(mainTemplatePath);
    const detailsWorkbook = new ExcelJS.Workbook();
    await detailsWorkbook.xlsx.readFile(detailsTemplatePath);

    const detailsTemplateSheet = detailsWorkbook.getWorksheet(1);
    const newSheet = workbook.addWorksheet('請求書明細');
    detailsTemplateSheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const newRow = newSheet.getRow(rowNumber);
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const newCell = newRow.getCell(colNumber);
        newCell.value = cell.value;
        newCell.style = JSON.parse(JSON.stringify(cell.style));
      });
      newRow.height = row.height;
    });
    for (let i = 1; i <= detailsTemplateSheet.columnCount; i++) {
      newSheet.getColumn(i).width = detailsTemplateSheet.getColumn(i).width;
    }
    detailsTemplateSheet.model.merges.forEach(merge => {
      newSheet.mergeCells(merge);
    });
    newSheet.views = JSON.parse(JSON.stringify(detailsTemplateSheet.views || []));
    newSheet.pageSetup = JSON.parse(JSON.stringify(detailsTemplateSheet.pageSetup || {}));

    const worksheet = workbook.getWorksheet('請求書フォーマット');
    const detailsSheet = workbook.getWorksheet('請求書明細');

    detailsSheet.getCell('A4').value = invoiceData.client_name;
    detailsSheet.getCell('J1').value = invoiceData.invoice_number;
    detailsSheet.getCell('G2').value = invoiceData.facility_name;

    worksheet.getCell('L1').value = invoiceData.invoice_number;
    worksheet.getCell('L2').value = new Date(invoiceData.date);
    worksheet.getCell('A4').value = invoiceData.client_name;
    worksheet.getCell('D5').value = invoiceData.customer_code ? String(invoiceData.customer_code).padStart(5, '0') : '';
    worksheet.getCell('D9').value = invoiceData.facility_name ? `${invoiceData.facility_name} 宿泊料` : '宿泊料';
    worksheet.getCell('D10').value = new Date(invoiceData.due_date);
    worksheet.getCell('D11').value = `${invoiceData.bank_name ?? ''} ${invoiceData.bank_branch_name ?? ''}`.trim();
    worksheet.getCell('D12').value = `${invoiceData.bank_account_type ?? ''} ${invoiceData.bank_account_number ?? ''}`.trim();
    worksheet.getCell('D13').value = invoiceData.bank_account_name ?? '';
    worksheet.getCell('L15').value = `担当者： ${userInfo[0].name}`;
    worksheet.getCell('D16').value = invoiceData.invoice_total_value;
    worksheet.getCell('H20').value = `${invoiceData.invoice_total_stays} 泊`;
    worksheet.getCell('J20').value = invoiceData.invoice_total_value;

    let totalTax = 0;
    let totalNet = 0;
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      invoiceData.items.forEach(item => {
        totalTax += (item.total_price - item.total_net_price);
        totalNet += item.total_net_price;
      });
    }
    worksheet.getCell('I24').value = invoiceData.invoice_total_value;
    worksheet.getCell('I25').value = totalTax;
    worksheet.getCell('I27').value = totalNet;
    worksheet.getCell('I28').value = totalTax;
    worksheet.getCell('C33').value = invoiceData.comment;
    worksheet.getCell('C33').alignment = { wrapText: true, vertical: 'top' };

    // Populate the details sheet
    const dailyDetails = invoiceData.daily_details || [];

    const [invYear, invMonth, invDay] = invoiceData.date.split('-').map(Number);
    const year = invYear;
    const month = invMonth - 1; // month is 0-indexed for Date object

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const toYYYYMMDD = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    // Filter dailyDetails to only include entries for the invoice month
    const filteredDailyDetails = dailyDetails.filter(detail => {
      const detailDate = new Date(detail.date);
      return detailDate.getFullYear() === year && detailDate.getMonth() === month;
    });

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = toYYYYMMDD(currentDate);

      const todaysDetails = filteredDailyDetails.filter(d => d.date.startsWith(dateString));

      const planData = {
        4: { count: 0, price: 0 },
        3: { count: 0, price: 0 },
        2: { count: 0, price: 0 },
        1: { count: 0, price: 0 },
        5: { price: 0 }
      };
      let cancelledCount = 0;

      todaysDetails.forEach(detail => {
        if (detail.cancelled && detail.billable) {
          cancelledCount++;
        } else if (!detail.cancelled) {
          if (planData[detail.plans_global_id]) {
            if (planData[detail.plans_global_id].hasOwnProperty('count')) {
              planData[detail.plans_global_id].count++;
            }
            planData[detail.plans_global_id].price += detail.price;
          }
        }
      });

      const row = detailsSheet.getRow(8 + day);

      const utcCurrentDate = new Date(Date.UTC(year, month, day));
      row.getCell('B').value = utcCurrentDate;

      row.getCell('C').value = planData[4].count > 0 ? planData[4].count : '';
      row.getCell('D').value = planData[4].price > 0 ? planData[4].price : '';
      row.getCell('E').value = planData[3].count > 0 ? planData[3].count : '';
      row.getCell('F').value = planData[3].price > 0 ? planData[3].price : '';
      row.getCell('G').value = planData[2].count > 0 ? planData[2].count : '';
      row.getCell('H').value = planData[2].price > 0 ? planData[2].price : '';
      row.getCell('I').value = planData[1].count > 0 ? planData[1].count : '';
      row.getCell('J').value = planData[1].price > 0 ? planData[1].price : '';
      row.getCell('K').value = planData[5].price > 0 ? planData[5].price : '';
      row.getCell('L').value = cancelledCount > 0 ? cancelledCount : '';
    }

    res.setHeader('Access-Control-Expose-Headers', 'X-Invoice-Number');
    res.setHeader('X-Invoice-Number', invoiceData.invoice_number);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    logger.error("Error generating Excel from template:", error);
    res.status(500).send('Internal server error while generating Excel invoice');
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