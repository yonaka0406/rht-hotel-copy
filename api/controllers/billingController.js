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
            paymentDataForPdf = singlePaymentData;

            let receiptTotalAmount;
            if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
                receiptTotalAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax_amount) || 0), 0);
            } else {
                receiptTotalAmount = parseFloat(paymentDataForPdf.amount || 0);
            }
            receiptDataForPdf.totalAmount = receiptTotalAmount;

            let existingReceipt = await getReceiptByPaymentId(req.requestId, paymentId);
            if (existingReceipt && !req.body.forceRegenerate) {
                receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
                receiptDataForPdf.receipt_date = existingReceipt.receipt_date;
            } else {
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
                    req.requestId, paymentId, hotelId, receiptDataForPdf.receipt_number,
                    receiptDataForPdf.receipt_date, receiptTotalAmount, userId, taxBreakdownData
                );
                if (!saveResult || !saveResult.id) throw new Error('Failed to save single receipt record.');
                await linkPaymentToReceipt(req.requestId, paymentId, saveResult.id);
            }
            finalReceiptNumber = receiptDataForPdf.receipt_number;
        }

        const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../components/receipt.html'), 'utf-8');

        const htmlContent = isConsolidated ?
           generateConsolidatedReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentsArrayForPdf, userName, taxBreakdownData) :
           generateReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentDataForPdf, userName, taxBreakdownData);

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


  // Stamp Image - Ensure this placeholder exists in your receipt.html
  // The actual image path should be resolvable by the server or converted to a data URI
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`; // Example URL
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  // Replace placeholders for company information - these should come from hotel details or a config
  // For now, using example values if not available in firstPayment or consolidatedReceiptData
  modifiedHTML = modifiedHTML.replace(g('company_name'), firstPayment.hotel_company_name || 'レッドホーストラスト株式会社');
  modifiedHTML = modifiedHTML.replace(g('company_zip_code'), firstPayment.hotel_zip_code || '060-0061');
  modifiedHTML = modifiedHTML.replace(g('company_address_full'), firstPayment.hotel_address || '札幌市中央区南1条西2丁目5番地 南一条Kビル8階');
  modifiedHTML = modifiedHTML.replace(g('company_tel'), firstPayment.hotel_tel || '011-206-1831');
  modifiedHTML = modifiedHTML.replace(g('company_fax'), firstPayment.hotel_fax || '050-3606-5764');
  modifiedHTML = modifiedHTML.replace(g('company_registration_number'), firstPayment.hotel_registration_number || 'T2430001042062');

  // Handle display of detail items and tax sections based on provided flags
  // These flags should be set based on whether relevant data exists to show these sections
  // For consolidated receipts, detail_items might be empty or represent a summary
  modifiedHTML = modifiedHTML.replace(g('detail_items_exist'), 'false'); // Example: consolidated doesn't show item details
  modifiedHTML = modifiedHTML.replace(g('taxable_details_exist'), 'false'); // Example: tax details handled differently or not shown

  // Clear out placeholders that are not relevant or not populated for consolidated view
  modifiedHTML = modifiedHTML.replace(g('detail_items'), '');
  modifiedHTML = modifiedHTML.replace(g('taxable_details_rows'), '');
  modifiedHTML = modifiedHTML.replace(g('details_subtotal_net'), '0'); // Default to 0 or calculated sum
  modifiedHTML = modifiedHTML.replace(g('total_tax_value'), '0'); // Default to 0 or calculated sum
  modifiedHTML = modifiedHTML.replace(g('details_total_gross'), totalConsolidatedAmount.toLocaleString());
  modifiedHTML = modifiedHTML.replace(g('comments'), consolidatedReceiptData.comments || '');

  // --- Corrected Tax Breakdown Logic for taxDetailsPlaceholder START ---
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
  // --- Corrected Tax Breakdown Logic for taxDetailsPlaceholder END ---

  return modifiedHTML;
}


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

        let receiptDataForPdf; // To hold data for generateReceiptHTML (receipt_number, receipt_date, totalAmount)
        let paymentDataForPdf; // To hold data for generateReceiptHTML (client_name, facility_name, hotel_details, etc.)
                               // For consolidated, this will be the first payment's data for header info.
        // let paymentsArrayForPdf; // For consolidated list in HTML proviso, if generateReceiptHTML is adapted for it.
                                 // Currently generateConsolidatedReceiptHTML takes this.
        let finalReceiptNumber; // The main receipt number to be used for filename

        if (isConsolidated) {
            // *** Start of Consolidated Logic (moved from generateConsolidatedReceipt) ***
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
                if (clientNameCheck === null) clientNameCheck = singlePaymentData.client_name;
                else if (clientNameCheck !== singlePaymentData.client_name) {
                    return res.status(400).json({ error: 'All payments must belong to the same client for consolidation.' });
                }
                fetchedPaymentsData.push(singlePaymentData);
            }

            paymentDataForPdf = fetchedPaymentsData[0];
            // paymentsArrayForPdf = fetchedPaymentsData; // Pass this to generateConsolidatedReceiptHTML if used

            const consolidatedReceiptMaster = { client_name: clientNameCheck };
            const receiptDateObj = new Date();
            const year = receiptDateObj.getFullYear() % 100;
            const month = receiptDateObj.getMonth() + 1;
            const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
            let maxReceiptNumData = await selectMaxReceiptNumber(req.requestId, hotelId, receiptDateObj);
            let sequence = 1;
            if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
                sequence = BigInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length)) + BigInt(1);
            }
            consolidatedReceiptMaster.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
            consolidatedReceiptMaster.receipt_date = receiptDateObj.toISOString().split('T')[0];
            finalReceiptNumber = consolidatedReceiptMaster.receipt_number;

            // Calculate total amount based on taxBreakdownData if provided (sum of item.amount)
            // Otherwise, sum of p.amount (which might be less accurate if taxBreakdown is the source of truth)
            let totalConsolidatedAmount;
            if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
                totalConsolidatedAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax_amount) || 0), 0);
            } else {
                totalConsolidatedAmount = fetchedPaymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            }
            consolidatedReceiptMaster.totalAmount = totalConsolidatedAmount;


            // Use hotel details from the first payment for company info on receipt
             if (paymentDataForPdf && paymentDataForPdf.hotel_details) {
                consolidatedReceiptMaster.hotel_company_name = paymentDataForPdf.hotel_details.company_name;
                consolidatedReceiptMaster.hotel_zip_code = paymentDataForPdf.hotel_details.zip_code;
                consolidatedReceiptMaster.hotel_address = paymentDataForPdf.hotel_details.address;
                consolidatedReceiptMaster.hotel_tel = paymentDataForPdf.hotel_details.tel;
                consolidatedReceiptMaster.hotel_fax = paymentDataForPdf.hotel_details.fax;
                consolidatedReceiptMaster.hotel_registration_number = paymentDataForPdf.hotel_details.registration_number;
            }


            const saveResult = await saveReceiptNumber(
                req.requestId, null, hotelId, consolidatedReceiptMaster.receipt_number,
                consolidatedReceiptMaster.receipt_date, totalConsolidatedAmount, userId, taxBreakdownData
            );

            if (!saveResult || !saveResult.id) throw new Error('Failed to save consolidated receipt master record.');
            const newConsolidatedReceiptRecordId = saveResult.id;

            for (const pData of fetchedPaymentsData) {
                await linkPaymentToReceipt(req.requestId, pData.id, newConsolidatedReceiptRecordId);
            }
            receiptDataForPdf = consolidatedReceiptMaster;
            // *** End of Consolidated Specific Logic ***
        } else {
            // *** Start of Single Receipt Logic (moved from generateReceipt) ***
            if (!paymentId) {
                 return res.status(400).json({ error: 'payment_id URL parameter is required for single receipts.' });
            }
            const singlePaymentData = await getPaymentById(req.requestId, paymentId);
            if (!singlePaymentData) {
                return res.status(404).json({ error: 'Payment data not found for single receipt.' });
            }
            paymentDataForPdf = singlePaymentData;
            // paymentsArrayForPdf = [singlePaymentData];

            const singleReceiptMaster = {};
            let existingReceipt = await getReceiptByPaymentId(req.requestId, paymentId);

            // Calculate total amount based on taxBreakdownData if provided, otherwise use paymentDataForPdf.amount
            let receiptTotalAmount;
            if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
                receiptTotalAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0) + (parseFloat(item.tax_amount) || 0), 0);
            } else {
                receiptTotalAmount = parseFloat(paymentDataForPdf.amount || 0);
            }
            singleReceiptMaster.totalAmount = receiptTotalAmount;


            if (existingReceipt && !req.body.forceRegenerate) { // TODO: Add forceRegenerate to UI if needed
                singleReceiptMaster.receipt_number = existingReceipt.receipt_number;
                singleReceiptMaster.receipt_date = existingReceipt.receipt_date;
                // TODO: Fetch existing tax_breakdown_data if viewing, not regenerating
            } else {
                const receiptDateObj = new Date(paymentDataForPdf.payment_date);
                const year = receiptDateObj.getFullYear() % 100;
                const month = receiptDateObj.getMonth() + 1;
                const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
                let maxReceiptNumData = await selectMaxReceiptNumber(req.requestId, hotelId, receiptDateObj);
                let sequence = 1;
                if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
                    sequence = BigInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length)) + BigInt(1);
                }
                singleReceiptMaster.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
                singleReceiptMaster.receipt_date = receiptDateObj.toISOString().split('T')[0];

                const saveResult = await saveReceiptNumber(
                    req.requestId, paymentId, hotelId, singleReceiptMaster.receipt_number,
                    singleReceiptMaster.receipt_date, receiptTotalAmount, userId, taxBreakdownData
                );
                if (!saveResult || !saveResult.id) throw new Error('Failed to save single receipt record.');
                await linkPaymentToReceipt(req.requestId, paymentId, saveResult.id);
            }
            receiptDataForPdf = singleReceiptMaster;
            finalReceiptNumber = singleReceiptMaster.receipt_number;
            // *** End of Single Receipt Specific Logic ***
        }

        // Common PDF Generation Logic
        const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../components/receipt.html'), 'utf-8');

        // Using generateReceiptHTML for both, as it's designed to handle the main receipt data and tax breakdown.
        // paymentDataForPdf contains client_name, facility_name, hotel_details (for company info).
        // receiptDataForPdf contains receipt_number, receipt_date, totalAmount.
        // taxBreakdownData is the array for tax details.
        // For consolidated, generateConsolidatedReceiptHTML was also updated, so if it has specific formatting
        // for consolidated receipts beyond what generateReceiptHTML provides (e.g. listing payment IDs), use it.
        // For now, using generateReceiptHTML as the primary.
        const htmlContent = isConsolidated ?
           generateConsolidatedReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentsArrayForPdf /* pass full array for proviso */, userName, taxBreakdownData) :
           generateReceiptHTML(receiptHTMLTemplate, receiptDataForPdf, paymentDataForPdf, userName, taxBreakdownData);


        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // Changed to networkidle0

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


// const getBilledListView = async (req, res) => {
//   const hotelId = req.params.hid;
//   const month = req.params.mdate;

// const getBilledListView = async (req, res) => {
//   const hotelId = req.params.hid;
//   const month = req.params.mdate;
//
//   try {
//     const data = await selectBilledListView(req.requestId, hotelId, month);
//
//     if (!data || data.length === 0) {
//       return res.status(404).json({ error: 'No data found' });
//     }
//
//     res.json(data);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

// const generateInvoice = async (req, res) => {
//   const hotelId = req.params.hid;
//   // const invoiceId = req.params.invoice; // Not used in provided logic
//   const invoiceData = req.body;
//   const userId = req.user.id; // Assuming userId is from req.user
//   const invoiceHTMLPath = path.join(__dirname, '../components/invoice.html');
//
//   if (!fs.existsSync(invoiceHTMLPath)) {
//     console.error("Invoice HTML template not found at:", invoiceHTMLPath);
//     return res.status(500).send('Invoice template not found.');
//   }
//   const invoiceHTML = fs.readFileSync(invoiceHTMLPath, 'utf-8');
//
//   let browser;
//
//   try {
//     // Generate invoice number if not provided
//     if (!invoiceData.invoice_number) {
//       let max_invoice_number_data = await selectMaxInvoiceNumber(req.requestId, hotelId, invoiceData.date);
//       let next_invoice_number;
//       if (!max_invoice_number_data.last_invoice_number) {
//         const date = new Date(invoiceData.date);
//         const year = date.getFullYear() % 100;
//         const month = date.getMonth() + 1;
//         next_invoice_number = hotelId * 10000000 + year * 100000 + month * 1000 + 1;
//       } else {
//         next_invoice_number = max_invoice_number_data.last_invoice_number + 1;
//       }
//       invoiceData.invoice_number = next_invoice_number;
//     }
//
//     // Assuming updateInvoices saves or updates the invoice and returns necessary data.
//     // The parameters for updateInvoices might need adjustment based on its definition.
//     // For this example, I'm assuming it takes all necessary data from invoiceData.
//     // This might be where you create the invoice record if it's not just an update.
//     // await updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);
//
//     const userInfo = await getUsersByID(req.requestId, userId);
//     if (!userInfo || userInfo.length === 0) {
//         return res.status(404).json({ error: 'User info for contact person not found.' });
//     }
//
//     browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
//     const page = await browser.newPage();
//
//     const htmlContent = generateInvoiceHTML(invoiceHTML, invoiceData, userInfo[0].name);
//     await page.setContent(htmlContent, { waitUntil: 'networkidle0' }); // networkidle0 for images
//
//     const imageSelector = 'img[alt="Company Stamp"]'; // Selector for the stamp image
//     try {
//         await page.waitForSelector(imageSelector, { timeout: 5000 }); // Wait for the image
//         await page.evaluate(async selector => { // Ensure image is fully loaded
//             const img = document.querySelector(selector);
//             if (img && !img.complete) {
//                 await new Promise((resolve, reject) => {
//                     img.onload = resolve;
//                     img.onerror = reject;
//                 });
//             }
//         }, imageSelector);
//     } catch (e) {
//         console.warn('Stamp image selector not found or timed out in generateInvoice:', e.message);
//     }
//
//     const pdfBuffer = await page.pdf({
//         margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
//         printBackground: true,
//         format: 'A4',
//     });
//
//     await browser.close();
//
//     const filename = `invoice_${invoiceData.invoice_number}_${invoiceData.client_name.replace(/[\/:*?"<>|\s\r\n]/g, '_')}.pdf`;
//     res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
//     res.contentType("application/pdf");
//     res.send(Buffer.from(pdfBuffer));
//
//   } catch (error) {
//     console.error("Error generating PDF for invoice:", error);
//     if (browser) {
//       await browser.close().catch(err => console.error("Error closing browser when generating invoice:", err));
//     }
//     res.status(500).send(`Error generating invoice PDF: ${error.message}`);
//   }
// };

// function generateInvoiceHTML(html, data, userName) {
//   let modifiedHTML = html;
//   const g = (key, value) => {
//       modifiedHTML = modifiedHTML.replace(new RegExp(`{{ ${key} }}`, 'g'), value || '');
//   };
//
//   // const imageUrl = `http://localhost:5000/your-hotel-stamp-image.png`; // Replace with actual image path or variable
//   // Use a generic stamp for now, or make it hotel-specific via data
//   const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
//   g('stamp_image', imageUrl);
//
//   // Header
//   g('invoice_number', data.invoice_number);
//   g('invoice_date', data.date ? new Date(data.date).toLocaleDateString('ja-JP') : '');
//   g('customer_name', data.client_name);
//   g('customer_code', data.customer_code); // Assuming client_id can be used as customer_code
//   g('company_contact_person', userName); // User generating the invoice
//
//   // Company Info (from hotel details in `data` if available, otherwise placeholders or fixed values)
//   g('company_name', data.hotel_company_name || 'レッドホーストラスト株式会社'); // Example
//   g('company_zip_code', data.hotel_zip_code || '060-0061');
//   g('company_address_full', data.hotel_address || '札幌市中央区南1条西2丁目5番地 南一条Kビル8階');
//   g('company_tel', data.hotel_tel || '011-206-1831');
//   g('company_fax', data.hotel_fax || '050-3606-5764');
//   g('company_registration_number', data.hotel_registration_number || 'T2430001042062');
//
//
//   // Main Table
//   g('facility_name', data.facility_name); // This should be part of invoiceData from client
//   g('payment_due_date', data.due_date ? new Date(data.due_date).toLocaleDateString('ja-JP') : '');
//   g('total_amount', (data.invoice_total_value != null) ? data.invoice_total_value.toLocaleString() : '0');
//
//   // Bank Details (from hotel details in `data` if available)
//   g('bank_name', data.bank_name);
//   g('bank_branch_name', data.bank_branch_name);
//   g('bank_account_type', data.bank_account_type);
//   g('bank_account_number', data.bank_account_number);
//   g('bank_account_name', data.bank_account_name);
//
//   // Details Table
//   let detailItemsHtml = '';
//   if (data.items && Array.isArray(data.items)) {
//       data.items.forEach((item, index) => {
//           detailItemsHtml += `
//             <tr>
//                 <td class="cell-center">${index + 1}</td>
//                 <td>${item.description || '宿泊料'}</td>
//                 <td class="cell-right">${item.quantity || data.invoice_total_stays || '1'} ${item.unit || (item.description === '宿泊料' ? '泊' : '式')}</td>
//                 <td class="cell-right">¥ ${item.total_price != null ? item.total_price.toLocaleString() : '0'}</td>
//             </tr>
//           `;
//       });
//   } else { // Fallback if no items array, use main invoice data
//     detailItemsHtml = `
//         <tr>
//             <td class="cell-center">1</td>
//             <td>宿泊料</td>
//             <td class="cell-right">${data.invoice_total_stays || '1'} 泊</td>
//             <td class="cell-right">¥ ${data.invoice_total_value != null ? data.invoice_total_value.toLocaleString() : '0'}</td>
//         </tr>
//     `;
//   }
//   g('detail_items', detailItemsHtml);
//   g('details_total_value', (data.invoice_total_value != null) ? data.invoice_total_value.toLocaleString() : '0');
//
//   // Taxable items
//   let totalTaxValueCalculated = 0;
//   let taxableDetailsHtml = '';
//   if (data.items && Array.isArray(data.items)) {
//       const taxSummary = {}; // To aggregate amounts by tax rate
//
//       data.items.forEach(item => {
//           const itemNetPrice = parseFloat(item.total_net_price) || 0;
//           const itemTotalPrice = parseFloat(item.total_price) || 0;
//           const itemTax = itemTotalPrice - itemNetPrice;
//           totalTaxValueCalculated += itemTax;
//
//           const rateKey = (parseFloat(item.tax_rate) * 100).toString();
//           if (!taxSummary[rateKey]) {
//               taxSummary[rateKey] = { net: 0, tax: 0 };
//           }
//           taxSummary[rateKey].net += itemNetPrice;
//           taxSummary[rateKey].tax += itemTax;
//       });
//
//       for (const rate in taxSummary) {
//           taxableDetailsHtml += `
//             <tr>
//               <td class="title-cell">${rate}%対象</td>
//               <td class="cell-right">¥ ${taxSummary[rate].net.toLocaleString()}</td>
//               <!-- <td class="cell-right">¥ ${taxSummary[rate].tax.toLocaleString()}</td> -->
//             </tr>
//           `;
//       }
//   } else if (data.invoice_total_value != null && data.total_tax_value != null) {
//       // Fallback if no items, but main invoice has tax info (assuming single tax rate)
//       const net = data.invoice_total_value - (data.total_tax_value || 0);
//       totalTaxValueCalculated = data.total_tax_value || 0;
//       // Assuming 10% if not specified by items
//       taxableDetailsHtml = `
//         <tr>
//           <td class="title-cell">10%対象</td>
//           <td class="cell-right">¥ ${net.toLocaleString()}</td>
//         </tr>
//       `;
//   }
//   g('total_tax_value', totalTaxValueCalculated.toLocaleString());
//   g('taxable_details', taxableDetailsHtml);
//
//   // Footer
//   g('comments', data.comment ? data.comment.replace(/\n/g, '<br/>') : '');
//
//   return modifiedHTML;
// };

// function generateReceiptHTML(html, receiptData, paymentData, userName, taxBreakdownData) { // taxBreakdownData is now an array
//   let modifiedHTML = html;
//   const g = (key) => new RegExp(`{{ ${key} }}`, 'g');
//
//   modifiedHTML = modifiedHTML.replace(g('receipt_number'), receiptData.receipt_number || 'N/A');
//   modifiedHTML = modifiedHTML.replace(g('receipt_date'), receiptData.receipt_date ? new Date(receiptData.receipt_date).toLocaleDateString('ja-JP') : '');
//   modifiedHTML = modifiedHTML.replace(g('customer_name'), paymentData.client_name || 'お客様名');
//
//   // Use totalAmount from receiptData (which should be the sum from taxBreakdown or payment amount)
//   const receivedAmount = parseFloat(receiptData.totalAmount || paymentData.amount || 0);
//   modifiedHTML = modifiedHTML.replace(g('received_amount'), receivedAmount.toLocaleString());
//
//   modifiedHTML = modifiedHTML.replace(g('facility_name'), paymentData.facility_name || '施設利用');
//
//   // Stamp Image
//   const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
//   modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);
//
//   // Company Info from paymentData (which should have hotel_details)
//   modifiedHTML = modifiedHTML.replace(g('company_name'), paymentData.hotel_details?.company_name || 'レッドホーストラスト株式会社');
//   modifiedHTML = modifiedHTML.replace(g('company_zip_code'), paymentData.hotel_details?.zip_code || '060-0061');
//   modifiedHTML = modifiedHTML.replace(g('company_address_full'), paymentData.hotel_details?.address || '札幌市中央区南1条西2丁目5番地 南一条Kビル8階');
//   modifiedHTML = modifiedHTML.replace(g('company_tel'), paymentData.hotel_details?.tel || '011-206-1831');
//   modifiedHTML = modifiedHTML.replace(g('company_fax'), paymentData.hotel_details?.fax || '050-3606-5764');
//   modifiedHTML = modifiedHTML.replace(g('company_registration_number'), paymentData.hotel_details?.registration_number || 'T2430001042062');
//
//   // Comments if any
//   modifiedHTML = modifiedHTML.replace(g('comments'), paymentData.notes || '');
//
//
//   // Tax Breakdown Logic
//   // --- Corrected Tax Breakdown Logic for taxDetailsPlaceholder START ---
//   let dynamicTaxDetailsHtml = '';
//   if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
//     taxBreakdownData.forEach(item => {
//       if (item.amount > 0) {
//         const rateDisplay = (item.rate * 100).toFixed(0) + '%';
//         dynamicTaxDetailsHtml += '<div class="tax-item">';
//         dynamicTaxDetailsHtml += `<p>${item.name} 対象 ¥ ${item.amount.toLocaleString()}</p>`;
//         if (item.rate > 0) {
//           dynamicTaxDetailsHtml += `<p>内消費税等 (${rateDisplay}) ¥ ${item.tax_amount.toLocaleString()}</p>`;
//         }
//         dynamicTaxDetailsHtml += '</div>';
//       }
//     });
//   }
//
//   const taxDetailsPlaceholderRegex = /(<div id="taxDetailsPlaceholder"[^>]*>)[\s\S]*?(<\/div>)/i;
//   if (modifiedHTML.match(taxDetailsPlaceholderRegex)) {
//     if (dynamicTaxDetailsHtml) {
//       modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, `$1${dynamicTaxDetailsHtml}$2`);
//     } else {
//       modifiedHTML = modifiedHTML.replace(taxDetailsPlaceholderRegex, '$1$2');
//     }
//   } else {
//     console.warn('taxDetailsPlaceholder not found in receipt.html for generateReceiptHTML');
//   }
//
//   // Clean up any old Handlebars-style placeholders related to tax table
//   modifiedHTML = modifiedHTML.replace(g('taxable_details_rows'), '');
//   modifiedHTML = modifiedHTML.replace(g('details_subtotal_net'), '');
//   modifiedHTML = modifiedHTML.replace(g('total_tax_value'), '');
//   // The main `received_amount` is set above. If `details_total_gross` was specifically for the old table, clear it.
//   // If the new receipt.html (with taxDetailsPlaceholder) still has a {{ details_total_gross }} outside,
//   // this might need to be updated based on sum of taxBreakdownData.amount + taxBreakdownData.tax_amount.
//   // For now, assuming it's part of the old structure to be removed.
//   modifiedHTML = modifiedHTML.replace(g('details_total_gross'), '');
//   modifiedHTML = modifiedHTML.replace(g('taxable_details_exist'), 'false');
//   // --- Corrected Tax Breakdown Logic for taxDetailsPlaceholder END ---
//
//   // For single receipts, detail_items are usually not applicable or handled differently.
//   // If paymentData.items were relevant, logic similar to invoice would be here.
//   // For now, assume single receipts don't show detailed item breakdown in this template.
//   modifiedHTML = modifiedHTML.replace(g('detail_items'), ''); // Clear if not used
//   modifiedHTML = modifiedHTML.replace(g('detail_items_exist'), 'false'); // Hide section
//
//   return modifiedHTML;
// }

// const generateReceipt = async (req, res) => {
//   const hotelId = req.params.hid;
//   const paymentId = req.params.payment_id;
//   const { taxBreakdownData } = req.body; // taxBreakdownData from frontend
//   const userId = req.user.id;
//   let browser;
//
//   try {
//     const paymentData = await getPaymentById(req.requestId, paymentId);
//     if (!paymentData) {
//       return res.status(404).json({ error: 'Payment data not found' });
//     }
//
//     const userInfo = await getUsersByID(req.requestId, userId);
//     if (!userInfo || userInfo.length === 0) {
//         return res.status(404).json({ error: 'User info not found' });
//     }
//
//     let receiptData = {};
//     let attempts = 0;
//     const maxRetries = 3;
//
//     // Calculate total amount based on taxBreakdownData if provided, otherwise use paymentData.amount
//     let receiptTotalAmount = paymentData.amount;
//     if (taxBreakdownData) {
//         receiptTotalAmount = (taxBreakdownData.amount10Percent || 0) +
//                              (taxBreakdownData.amount8Percent || 0) +
//                              (taxBreakdownData.amountNonTaxable || 0);
//     }
//     receiptData.totalAmount = receiptTotalAmount; // Store for use in generateReceiptHTML
//
//
//     for (attempts = 0; attempts < maxRetries; attempts++) {
//         try {
//             let existingReceipt = await getReceiptByPaymentId(req.requestId, paymentId);
//             if (existingReceipt && !req.body.forceRegenerate) { // Allow forcing regeneration
//                 receiptData.receipt_number = existingReceipt.receipt_number;
//                 receiptData.receipt_date = existingReceipt.receipt_date;
//                 // If we are "viewing" an existing receipt, we might not have new taxBreakdownData.
//                 // The original taxBreakdownData (if any) should be fetched with existingReceipt.
//                 // For now, if taxBreakdownData is passed, we assume it's for a new/updated receipt.
//                 if (!taxBreakdownData && existingReceipt.tax_breakdown_data) {
//                     // This part is tricky: if viewing, we should use OLD tax_breakdown_data
//                     // This requires getReceiptByPaymentId to also return tax_breakdown_data
//                     // For now, this path assumes taxBreakdownData is for new generation.
//                 }
//                 break;
//             } else {
//                 const currentDate = new Date();
//                 const year = currentDate.getFullYear() % 100;
//                 const month = currentDate.getMonth() + 1;
//                 const sequenceLength = 4;
//                 const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
//
//                 let max_receipt_number_data = await selectMaxReceiptNumber(req.requestId, hotelId, currentDate);
//                 let new_receipt_number_str;
//
//                 if (!max_receipt_number_data.last_receipt_number || !max_receipt_number_data.last_receipt_number.toString().startsWith(prefixStr) ) {
//                     const firstSequence = '1'.padStart(sequenceLength, '0');
//                     new_receipt_number_str = prefixStr + firstSequence;
//                 } else {
//                     const lastReceiptStr = max_receipt_number_data.last_receipt_number.toString();
//                     const lastSequenceStr = lastReceiptStr.substring(prefixStr.length);
//                     const nextSequenceNum = BigInt(lastSequenceStr) + BigInt(1);
//                     new_receipt_number_str = prefixStr + nextSequenceNum.toString().padStart(sequenceLength, '0');
//                 }
//
//                 receiptData.receipt_number = new_receipt_number_str;
//                 receiptData.receipt_date = currentDate.toISOString().split('T')[0];
//
//                 const saveResult = await saveReceiptNumber(
//                     req.requestId,
//                     paymentId,
//                     hotelId,
//                     receiptData.receipt_number,
//                     receiptData.receipt_date,
//                     receiptTotalAmount, // Use the calculated total amount
//                     userId,
//                     taxBreakdownData // Pass taxBreakdownData to be saved
//                 );
//
//                 if (saveResult && saveResult.id) {
//                     await linkPaymentToReceipt(req.requestId, paymentId, saveResult.id);
//                     break;
//                 } else {
//                     console.error('saveReceiptNumber did not return an ID for paymentId:', paymentId);
//                     throw new Error('Failed to save receipt number due to missing ID in result.');
//                 }
//             }
//         } catch (error) {
//             if (error.code === '23505' && attempts < maxRetries - 1) {
//                 console.warn(`Attempt ${attempts + 1} for paymentId ${paymentId} failed due to duplicate receipt number. Retrying...`);
//                 await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
//                 continue;
//             }
//             throw error;
//         }
//     }
//     if (attempts === maxRetries && !receiptData.receipt_number) {
//          throw new Error(`Failed to generate and save receipt for paymentId ${paymentId} after ${maxRetries} attempts.`);
//     }
//
//     const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../components/receipt.html'), 'utf-8');
//     // Pass taxBreakdownData to generateReceiptHTML
//     const htmlContent = generateReceiptHTML(receiptHTMLTemplate, receiptData, paymentData, userInfo[0].name, taxBreakdownData);
//
//     browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//     const page = await browser.newPage();
//     await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
//
//     const imageSelector = 'img[alt="Company Stamp"]';
//     try {
//         await page.waitForSelector(imageSelector, { timeout: 5000 });
//         await page.evaluate(async selector => {
//             const img = document.querySelector(selector);
//             if (img && !img.complete) {
//                 await new Promise((resolve, reject) => {
//                     img.onload = resolve;
//                     img.onerror = reject;
//                 });
//             }
//         }, imageSelector);
//     } catch (e) {
//         console.warn('Stamp image selector not found or timed out in generateReceipt:', e.message);
//     }
//
//     const pdfBuffer = await page.pdf({
//         margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
//         printBackground: true,
//         format: 'A4'
//     });
//     await browser.close();
//
//     const sanitizedClientName = (paymentData.client_name || 'UnknownClient').replace(/[\/:*?"<>|\s\r\n]/g, '_').substring(0, 50);
//     const filename = `${receiptData.receipt_number}_${sanitizedClientName}.pdf`;
//
//     res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
//     res.contentType("application/pdf");
//     res.send(Buffer.from(pdfBuffer));
//
//   } catch (error) {
//     console.error("Error generating PDF for receipt:", error);
//     if (browser) {
//       await browser.close().catch(err => console.error("Error closing browser:", err));
//     }
//     res.status(500).send(`Error generating receipt PDF: ${error.message}`);
//   }
// };

// const getPaymentsForReceipts = async (req, res) => {
//   const hotelId = req.params.hid;
//   const startDate = req.params.sdate;
//   const endDate = req.params.edate;

//   try {
//     const data = await selectPaymentsForReceiptsView(req.requestId, hotelId, startDate, endDate);
//     if (!data) {
//       return res.status(404).json({ error: 'No payment data found for the specified criteria or an error occurred.' });
//     }
//     res.json(data);
//   } catch (err) {
//     console.error('Error in getPaymentsForReceipts controller:', err);
//     if (err.message.includes('Database error')) {
//         return res.status(503).json({ error: 'Service unavailable or database error.' });
//     }
//     res.status(500).json({ error: 'Internal server error while fetching payments for receipts.' });
//   }
// };

module.exports = {
  getBillableListView,
  // getBilledListView, // Commented out as per new structure
  // generateInvoice, // Commented out as per new structure
  // generateReceipt, // To be replaced by handleGenerateReceiptRequest
  // getPaymentsForReceipts, // Commented out as per new structure
  // generateConsolidatedReceipt, // To be replaced by handleGenerateReceiptRequest
  handleGenerateReceiptRequest, // Added new unified handler
};