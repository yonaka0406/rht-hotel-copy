const { getPool } = require('../../config/database');
const billingModel = require('../../models/billing');
const usersModel = require('../../models/user');
const { getBrowser, resetBrowser } = require('../../services/playwrightService');
const { generateNewInvoiceNumber, generateInvoiceHTML } = require('./services/invoiceService');

const logger = require('../../config/logger');
const fs = require('fs');
const path = require('path');
const ExcelJS = require("exceljs");

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

const getBilledListView = async (req, res) => {
  const hotelId = req.params.hid;
  const month = req.params.mdate;

  try {
    const data = await billingModel.selectBilledListView(req.requestId, hotelId, month);

    if (!data || data.length === 0) {
      return res.json([]);
    }

    res.json(data);
  } catch (err) {
    logger.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getPaymentsForReceipts = async (req, res) => {
  const hotelId = req.params.hid;
  const startDate = req.params.sdate;
  const endDate = req.params.edate;

  try {
    const data = await billingModel.selectPaymentsForReceiptsView(req.requestId, hotelId, startDate, endDate);
    if (!data) {
      return res.status(404).json({ error: 'No payment data found for the specified criteria or an error occurred.' });
    }
    res.json(data);
  } catch (err) {
    logger.error('Error in getPaymentsForReceipts controller:', err);
    if (err.message.includes('Database error')) { // Example check
      return res.status(503).json({ error: 'Service unavailable or database error.' });
    }
    res.status(500).json({ error: 'Internal server error while fetching payments for receipts.' });
  }
};

const generateInvoice = async (req, res) => {
  const hotelId = req.params.hid;
  const invoiceId = req.params.invoice;
  const invoiceData = req.body;
  const userId = req.user.id;
  const invoiceHTML = fs.readFileSync(path.join(__dirname, '../../components/invoice.html'), 'utf-8');

  let browser;
  let page;

  try {
    if (!invoiceData.invoice_number) {
      const maxInvoiceNumData = await billingModel.selectMaxInvoiceNumber(req.requestId, hotelId, invoiceData.date);
      invoiceData.invoice_number = generateNewInvoiceNumber(maxInvoiceNumData, hotelId, invoiceData.date);
    }

    await billingModel.updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);

    const userInfo = await usersModel.selectUserByID(req.requestId, userId);

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

const generateInvoiceExcel = async (req, res) => {
  const hotelId = req.params.hid;
  const invoiceData = req.body;
  const userId = req.user.id;

  try {
    if (!invoiceData.invoice_number) {
      const maxInvoiceNumData = await billingModel.selectMaxInvoiceNumber(req.requestId, hotelId, invoiceData.date);
      invoiceData.invoice_number = generateNewInvoiceNumber(maxInvoiceNumData, hotelId, invoiceData.date);
    }

    const userInfo = await usersModel.selectUserByID(req.requestId, userId);
    await billingModel.updateInvoices(req.requestId, invoiceData.id, hotelId, invoiceData.date, invoiceData.client_id, invoiceData.client_name, invoiceData.invoice_number, invoiceData.due_date, invoiceData.invoice_total_stays, invoiceData.comment);

    const mainTemplatePath = path.join(__dirname, '../../components/請求書テンプレート.xlsx');
    const detailsTemplatePath = path.join(__dirname, '../../components/請求書明細（テンプレート）.xlsx');
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
        1: { count: 0, price: 0 }, // Assuming 1,2,3,4 map to specific plan type categories
        2: { count: 0, price: 0 },
        3: { count: 0, price: 0 },
        4: { count: 0, price: 0 },
        5: { price: 0 } // For plans not falling into 1-4, or for total
      };
      let cancelledCount = 0;

      todaysDetails.forEach(detail => {
        if (detail.cancelled && detail.billable) {
          cancelledCount++;
        } else if (!detail.cancelled) {
          const planTypeId = detail.plan_type_category_id; // Use plan_type_category_id
          if (planTypeId && planData[planTypeId] && planData[planTypeId].hasOwnProperty('count')) {
            planData[planTypeId].count++;
            planData[planTypeId].price += detail.price;
          } else {
            // Handle plans that don't fit into categories 1-4, or other charges
            planData[5].price += detail.price; // Aggregate under 'other' or a general total
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
  getPaymentsForReceipts,
};