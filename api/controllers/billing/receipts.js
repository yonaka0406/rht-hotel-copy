const { getPool } = require('../../config/database');
const billingModel = require('../../models/billing');
const { getUsersByID } = require('../../models/user');
const { getHotelByID } = require('../../models/hotel');

const { getBrowser, resetBrowser } = require('../../services/puppeteerService');
const logger = require('../../config/logger');
const fs = require('fs');
const path = require('path');

const { generateReceiptHTML, generateConsolidatedReceiptHTML } = require('./services/receiptService');


const handleGenerateReceiptRequest = async (req, res) => {
    logger.debug(`[handleGenerateReceiptRequest] - START`);
    logger.debug(`[handleGenerateReceiptRequest] Request Body: ${JSON.stringify(req.body)}`);
    logger.debug(`[handleGenerateReceiptRequest] Request Params: ${JSON.stringify(req.params)}`);

    const paymentId = req.params.payment_id;
    const paymentIds = req.body.payment_ids;
    const isConsolidated = !!req.body.payment_ids && !req.params.payment_id;
    const hotelId = req.params.hid;
    const userId = req.user.id;
    const taxBreakdownData = req.body.taxBreakdownData;
    const forceRegenerate = req.body.forceRegenerate;
    const honorific = req.body.honorific || '様';
    const isReissue = req.body.isReissue || false;
    const customIssueDate = req.body.customIssueDate || null;
    const customProviso = req.body.customProviso || null;

    logger.debug(`[handleGenerateReceiptRequest] Parsed parameters: { paymentId: ${paymentId}, paymentIds: ${paymentIds}, isConsolidated: ${isConsolidated}, hotelId: ${hotelId}, userId: ${userId}, forceRegenerate: ${forceRegenerate}, isReissue: ${isReissue}, customIssueDate: ${customIssueDate}, customProviso: ${customProviso}, taxBreakdownData: ${JSON.stringify(taxBreakdownData)} }`);

    let page = null; // Initialize page to null

    const pool = getPool(req.requestId);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');
        const userInfo = await getUsersByID(req.requestId, userId, client);
        if (!userInfo || userInfo.length === 0) {
            return res.status(404).json({ error: 'User info not found' });
        }
        const userName = userInfo[0].name;

        // Fetch hotel information
        const hotelInfo = await getHotelByID(req.requestId, hotelId, client);
        if (!hotelInfo) {
            logger.error(`[handleGenerateReceiptRequest] Hotel not found for ID: ${hotelId}`);
            return res.status(404).json({ error: 'Hotel information not found' });
        }
        const hotelFormalName = hotelInfo.formal_name;

        // Variables for PDF generation
        let receiptDataForPdf = {
            hotel_company_name: hotelFormalName // Set hotel company name from fetched hotel info
        };
        let paymentDataForPdf;
        let paymentsArrayForPdf;
        let finalReceiptNumber;
        let finalTaxBreakdownForPdf;
        let isExistingReceipt = false;

        // Early check for existing receipt - check for both single and consolidated requests


        let shouldGenerateNewReceiptRecord = false; // Flag to indicate if a new record needs to be inserted/updated in the 'receipts' table

        // Determine if an existing receipt record is present
        let existingReceipt = null;
        if (!isConsolidated && paymentId) {
            existingReceipt = await billingModel.getReceiptByPaymentId(req.requestId, paymentId, hotelId, client);
        } else if (isConsolidated && Array.isArray(paymentIds) && paymentIds.length > 0) {
            for (const pid of paymentIds) {
                const existingReceiptForPayment = await billingModel.getReceiptByPaymentId(req.requestId, pid, hotelId, client);
                if (existingReceiptForPayment) {
                    existingReceipt = existingReceiptForPayment;
                    break;
                }
            }
        }

        logger.debug(`[handleGenerateReceiptRequest] Existing receipt check results: existingReceipt = ${!!existingReceipt}, forceRegenerate = ${forceRegenerate}, isReissue = ${isReissue}`);

        if (!existingReceipt) {
            // No existing receipt, so we must generate a new record
            shouldGenerateNewReceiptRecord = true;
            logger.debug(`[handleGenerateReceiptRequest] No existing receipt found. A new receipt record will be generated.`);
        } else {
            // Existing receipt found. Decide whether to create a new version or use the existing one.
            if (forceRegenerate || (isReissue && existingReceipt.version === 1)) {
                // If forced regeneration or reissuing the initial version, create a new record.
                shouldGenerateNewReceiptRecord = true;
                logger.debug(`[handleGenerateReceiptRequest] Existing receipt will be re-generated (new version) due to forceRegenerate or initial reissue.`);
            } else {
                // Otherwise, use the existing receipt's data for PDF generation.
                // Populate receiptDataForPdf from existingReceipt
                receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
                receiptDataForPdf.receipt_date = customIssueDate || existingReceipt.receipt_date;
                receiptDataForPdf.totalAmount = parseFloat(existingReceipt.amount);
                finalTaxBreakdownForPdf = existingReceipt.tax_breakdown;
                finalReceiptNumber = existingReceipt.receipt_number;

                // For consolidated, ensure paymentsArrayForPdf is populated for proviso if needed
                if (isConsolidated && Array.isArray(paymentIds) && paymentIds.length > 0) {
                    paymentsArrayForPdf = [];
                    for (const pid of paymentIds) {
                        const paymentData = await billingModel.getPaymentById(req.requestId, pid, hotelId, client);
                        if (paymentData) {
                            paymentsArrayForPdf.push(paymentData);
                        }
                    }
                }

                // If using existing receipt, populate paymentDataForPdf from the first payment (or the single payment)
                // This is needed for hotel_details and client_name for PDF generation
                const paymentForPdfId = isConsolidated ? paymentIds[0] : paymentId;
                paymentDataForPdf = await billingModel.getPaymentById(req.requestId, paymentForPdfId, hotelId, client);
                if (!paymentDataForPdf) {
                    return res.status(404).json({ error: 'Payment data not found for existing receipt context' });
                }
                // Override payment amount with the actual receipt amount from database
                paymentDataForPdf.amount = existingReceipt.amount;

                logger.debug(`[handleGenerateReceiptRequest] Using existing receipt data for PDF generation.`);
            }
        }

        let fetchedPaymentsData = [];
        if (isConsolidated && Array.isArray(paymentIds) && paymentIds.length > 0) {
            let clientNameCheck = null;
            for (const pid of paymentIds) {
                const singlePaymentData = await billingModel.getPaymentById(req.requestId, pid, hotelId, client);
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
            paymentDataForPdf = fetchedPaymentsData[0]; // Use first payment for hotel_details and client_name
            paymentsArrayForPdf = fetchedPaymentsData; // For consolidated HTML generation
            receiptDataForPdf.client_name = clientNameCheck;
        } else if (!isConsolidated && paymentId) {
            paymentDataForPdf = await billingModel.getPaymentById(req.requestId, paymentId, hotelId, client);
            if (!paymentDataForPdf) {
                return res.status(404).json({ error: 'Payment data not found' });
            }
        }

        // --- Centralized calculation of finalTaxBreakdownForPdf and receiptDataForPdf.totalAmount ---
        if (taxBreakdownData && Array.isArray(taxBreakdownData) && taxBreakdownData.length > 0) {
            // Use taxBreakdownData from request body if provided
            receiptDataForPdf.totalAmount = taxBreakdownData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            finalTaxBreakdownForPdf = taxBreakdownData;
        } else if (existingReceipt && !shouldGenerateNewReceiptRecord) {
            // Use existing receipt data if not generating a new record and existing one is present
            receiptDataForPdf.totalAmount = parseFloat(existingReceipt.amount);
            finalTaxBreakdownForPdf = existingReceipt.tax_breakdown;
            finalReceiptNumber = existingReceipt.receipt_number; // Ensure finalReceiptNumber is set here too
        } else {
            // Calculate from payment(s) if no tax breakdown from request or existing receipt
            if (isConsolidated) {
                // fetchedPaymentsData should already be populated if isConsolidated is true
                if (fetchedPaymentsData.length === 0) {
                    return res.status(400).json({ error: 'No payments found for consolidated receipt.' });
                }
                receiptDataForPdf.totalAmount = fetchedPaymentsData.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
            } else if (paymentDataForPdf) {
                receiptDataForPdf.totalAmount = parseFloat(paymentDataForPdf.amount || 0);
            } else {
                return res.status(400).json({ error: 'Cannot determine total amount for receipt.' });
            }
            finalTaxBreakdownForPdf = null;
        }
        // If an existing receipt is being re-used for PDF generation (i.e. !shouldGenerateNewReceiptRecord)
        // and its receipt_number hasn't been set by taxBreakdownData or existingReceipt logic,
        // it should be set from existingReceipt.
        if (!finalReceiptNumber && existingReceipt) {
            finalReceiptNumber = existingReceipt.receipt_number;
        }
        // -------------------------------------------------------------------------------------

        if (shouldGenerateNewReceiptRecord) {
            logger.debug(`[handleGenerateReceiptRequest] Generating new receipt (or new version).`);
            if (isConsolidated) {
                // Consolidated receipt logic
                if (!Array.isArray(paymentIds) || paymentIds.length === 0) {
                    return res.status(400).json({ error: 'payment_ids must be a non-empty array for consolidated receipts.' });
                }

                // Determine common payment date for consolidated receipt
                let commonPaymentDate = null;
                if (fetchedPaymentsData.length > 0) {
                    commonPaymentDate = fetchedPaymentsData[0].payment_date;
                    for (let i = 1; i < fetchedPaymentsData.length; i++) {
                        if (fetchedPaymentsData[i].payment_date !== commonPaymentDate) {
                            commonPaymentDate = null; // Dates are not common
                            break;
                        }
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
                    let maxReceiptNumData = await billingModel.selectMaxReceiptNumber(req.requestId, hotelId, prefixStr, client);
                    let sequence = 1;
                    if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
                        sequence = parseInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length), 10) + 1;
                    }
                    receiptDataForPdf.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
                }
                receiptDataForPdf.receipt_date = customIssueDate || receiptDateObj.toISOString().split('T')[0];
                finalReceiptNumber = receiptDataForPdf.receipt_number;

                // Save consolidated receipt
                let saveResult;
                logger.debug(`[handleGenerateReceiptRequest] Consolidated: Before save/create version: { isReissue: ${isReissue}, existingReceipt: ${!!existingReceipt}, shouldGenerateNewReceiptRecord: ${shouldGenerateNewReceiptRecord} }`);
                if (existingReceipt) { // If existingReceipt, it means we are creating a new version
                    saveResult = await billingModel.createNextReceiptVersion(
                        req.requestId, hotelId, receiptDataForPdf.receipt_number,
                        receiptDataForPdf.receipt_date, receiptDataForPdf.totalAmount, userId, finalTaxBreakdownForPdf,
                        honorific, customProviso, isReissue, client
                    );
                } else {
                    saveResult = await billingModel.saveReceiptNumber(
                        req.requestId, hotelId, receiptDataForPdf.receipt_number,
                        receiptDataForPdf.receipt_date, receiptDataForPdf.totalAmount, userId, finalTaxBreakdownForPdf,
                        honorific, customProviso, isReissue, client
                    );
                }

                if (!saveResult || !saveResult.id) {
                    throw new Error('Failed to save consolidated receipt master record.');
                }

                // Link all payments to the receipt
                for (const pData of fetchedPaymentsData) {
                    await billingModel.linkPaymentToReceipt(req.requestId, pData.id, saveResult.id, hotelId, client);
                }

            } else {
                // Single receipt logic - new receipt or regeneration
                if (!paymentId) {
                    return res.status(400).json({ error: 'payment_id URL parameter is required for single receipts.' });
                }

                // Generate receipt number and date based on payment date
                const receiptDateObj = new Date(paymentDataForPdf.payment_date);

                if (existingReceipt) {
                    receiptDataForPdf.receipt_number = existingReceipt.receipt_number;
                } else {
                    const year = receiptDateObj.getFullYear() % 100;
                    const month = receiptDateObj.getMonth() + 1;
                    const prefixStr = `${hotelId}${String(year).padStart(2, '0')}${String(month).padStart(2, '0')}`;
                    let maxReceiptNumData = await billingModel.selectMaxReceiptNumber(req.requestId, hotelId, prefixStr, client);
                    let sequence = 1;
                    if (maxReceiptNumData.last_receipt_number && maxReceiptNumData.last_receipt_number.toString().startsWith(prefixStr)) {
                        sequence = parseInt(maxReceiptNumData.last_receipt_number.toString().substring(prefixStr.length), 10) + 1;
                    }
                    receiptDataForPdf.receipt_number = prefixStr + sequence.toString().padStart(4, '0');
                }

                receiptDataForPdf.receipt_date = customIssueDate || receiptDateObj.toISOString().split('T')[0];
                finalReceiptNumber = receiptDataForPdf.receipt_number;

                // Save the new receipt
                let saveResult;
                logger.debug(`[handleGenerateReceiptRequest] Single: Before save/create version: { isReissue: ${isReissue}, existingReceipt: ${!!existingReceipt}, shouldGenerateNewReceiptRecord: ${shouldGenerateNewReceiptRecord} }`);
                if (existingReceipt) { // If existingReceipt, it means we are creating a new version
                    saveResult = await billingModel.createNextReceiptVersion(
                        req.requestId, hotelId, receiptDataForPdf.receipt_number,
                        receiptDataForPdf.receipt_date, receiptDataForPdf.totalAmount, userId, finalTaxBreakdownForPdf,
                        honorific, customProviso, isReissue, client
                    );
                } else {
                    saveResult = await billingModel.saveReceiptNumber(req.requestId, hotelId, receiptDataForPdf.receipt_number,
                        receiptDataForPdf.receipt_date, receiptDataForPdf.totalAmount, userId, finalTaxBreakdownForPdf,
                        honorific, customProviso, isReissue, client
                    );
                }

                if (!saveResult || !saveResult.id) {
                    throw new Error('Failed to save single receipt record.');
                }

                // Link payment to receipt
                await billingModel.linkPaymentToReceipt(req.requestId, paymentId, saveResult.id, hotelId, client);
            }
        }



        // Generate PDF
        const receiptHTMLTemplate = fs.readFileSync(path.join(__dirname, '../../components/receipt.html'), 'utf-8');

        logger.debug(`[handleGenerateReceiptRequest] Before generateReceiptHTML call: paymentDataForPdf = ${JSON.stringify(paymentDataForPdf)}`);

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
        await client.query('COMMIT');
        res.send(Buffer.from(pdfBuffer));

    } catch (error) {
        logger.error(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF:`, error);
        res.status(500).send(`Error generating ${isConsolidated ? 'consolidated' : 'single'} receipt PDF: ${error.message}`);
        await client.query('ROLLBACK');
    } finally {
        if (page) {
            await page.close().catch(err => logger.error("Error closing page:", err));
        }
        await resetBrowser(false);
        client.release();
    }
};

module.exports = {
    handleGenerateReceiptRequest,
};