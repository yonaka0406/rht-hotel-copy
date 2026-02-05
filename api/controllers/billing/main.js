const { getPool } = require('../../config/database');
const billingModel = require('../../models/billing');
const usersModel = require('../../models/user');
const { getBrowser, resetBrowser } = require('../../services/playwrightService');
const { generateNewInvoiceNumber, generateInvoiceHTML } = require('./services/invoiceService');

const logger = require('../../config/logger');
const fs = require('fs');
const path = require('path');
const ExcelJS = require("exceljs");

// 支払い方法別の表示名マッピング
const getPaymentDisplayName = (paymentType) => {
  const displayNames = {
    'cash': 'ご入金（現金）',
    'credit': 'ご入金（クレジットカード）',
    'discount': 'お値引き',
    'point': 'ご入金（ネットポイント）',
    'wire': 'ご入金（事前振り込み）'
  };
  return displayNames[paymentType] || `ご入金（${paymentType}）`;
};

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

    // 支払い詳細から請求書以外の支払いを抽出
    const payments = invoiceData.details || [];
    const otherPayments = payments.filter(p => p.payment_type_transaction !== 'bill');

    // 支払い方法別に集計
    const paymentsByType = otherPayments.reduce((acc, payment) => {
      const type = payment.payment_type_transaction;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          displayName: getPaymentDisplayName(type)
        };
      }
      
      // payment.valueの安全な処理
      if (payment.value != null) {
        const v = parseFloat(payment.value);
        if (Number.isFinite(v)) {
          acc[type].total += v;
        } else {
          logger.warn(`Invalid payment value for type ${type}: ${payment.value}`);
        }
      }
      
      return acc;
    }, {});

    // 実際の請求額を計算（総額 - 既入金額）
    const totalPaidAmount = Object.values(paymentsByType).reduce((sum, info) => sum + info.total, 0);
    const actualInvoiceAmount = invoiceData.invoice_total_value - totalPaidAmount;

    // 支払い詳細をitemsに追加
    const paymentItems = Object.entries(paymentsByType).map(([type, info]) => ({
      name: info.displayName,
      category: 'payment',
      tax_rate: 0,
      total_quantity: 1,
      total_price: -info.total,
      total_net_price: -info.total
    }));

    // 元のitemsと支払い詳細を結合
    invoiceData.items = [...(invoiceData.items || []), ...paymentItems];
    
    // 実際の請求額を設定
    invoiceData.invoice_total_value = actualInvoiceAmount;

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

    // 支払い詳細から請求書以外の支払いを抽出
    const payments = invoiceData.details || [];
    const otherPayments = payments.filter(p => p.payment_type_transaction !== 'bill');

    // 支払い方法別に集計
    const paymentsByType = otherPayments.reduce((acc, payment) => {
      const type = payment.payment_type_transaction;
      if (!acc[type]) {
        acc[type] = {
          total: 0,
          displayName: getPaymentDisplayName(type)
        };
      }
      
      // payment.valueの安全な処理
      if (payment.value != null) {
        const v = parseFloat(payment.value);
        if (Number.isFinite(v)) {
          acc[type].total += v;
        } else {
          logger.warn(`Invalid payment value for type ${type}: ${payment.value}`);
        }
      }
      
      return acc;
    }, {});

    // 実際の請求額を計算（総額 - 既入金額）
    const totalPaidAmount = Object.values(paymentsByType).reduce((sum, info) => sum + info.total, 0);
    const actualInvoiceAmount = invoiceData.invoice_total_value - totalPaidAmount;

    worksheet.getCell('L15').value = `担当者： ${userInfo[0].name}`;
    worksheet.getCell('D16').value = actualInvoiceAmount; // 実際の請求額を表示

    // Populate Main Invoice Rows (Accommodation vs Addons + Payment Details)
    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      let currentRow = 20;
      let itemNumber = 1;
      
      // 1. 宿泊料・アドオン項目
      invoiceData.items.forEach((item) => {
        const baseLabel = item.name || (item.category === 'accommodation' ? '宿泊料' : 'その他');
        const taxLabel = item.tax_rate ? ` (${(parseFloat(item.tax_rate) * 100).toLocaleString()}%)` : '';
        const label = `${baseLabel}${taxLabel}`;

        const isRoomCharge = baseLabel.includes('宿泊料');
        const quantity = isRoomCharge ? (invoiceData.invoice_total_stays || item.total_quantity || 1) : (item.total_quantity || 1);

        // No.
        worksheet.getCell(`A${currentRow}`).value = itemNumber;
        // Description/Item Name
        worksheet.getCell(`B${currentRow}`).value = label;
        // Quantity
        worksheet.getCell(`G${currentRow}`).value = quantity;
        // Unit
        worksheet.getCell(`H${currentRow}`).value = isRoomCharge ? '泊' : '個';
        // Amount
        worksheet.getCell(`J${currentRow}`).value = item.total_price;

        currentRow++;
        itemNumber++;
      });

      // 2. 支払い方法別の入金・値引き行
      Object.entries(paymentsByType).forEach(([type, info]) => {
        worksheet.getCell(`A${currentRow}`).value = itemNumber;
        worksheet.getCell(`B${currentRow}`).value = info.displayName;
        worksheet.getCell(`J${currentRow}`).value = -info.total; // マイナス表示
        currentRow++;
        itemNumber++;
      });
    } else {
      // Fallback for backward compatibility
      worksheet.getCell('A20').value = 1;
      worksheet.getCell('B20').value = '宿泊料';
      worksheet.getCell('G20').value = invoiceData.invoice_total_stays;
      worksheet.getCell('J20').value = invoiceData.invoice_total_value;
    }

    let totalTax = 0;
    let totalNet10 = 0;
    let totalNet8 = 0;
    let totalNet0 = 0;
    let taxAmount10 = 0;
    let taxAmount8 = 0;
    let taxAmount0 = 0;

    if (invoiceData.items && Array.isArray(invoiceData.items)) {
      // 元の総額と実際の請求額の比率を計算
      const totalOriginalAmount = invoiceData.items.reduce((sum, item) => sum + item.total_price, 0);
      
      let adjustmentRatio;
      let useEvenDistribution = false;
      
      // totalOriginalAmountが0の場合のガード処理
      if (invoiceData.items.length === 0) {
        // アイテムが存在しない場合は調整比率を0に設定してスキップ
        adjustmentRatio = 0;
      } else if (totalOriginalAmount === 0) {
        // アイテムは存在するが合計が0の場合は均等分配
        adjustmentRatio = actualInvoiceAmount / invoiceData.items.length;
        useEvenDistribution = true;
      } else {
        // 通常の比率計算
        adjustmentRatio = actualInvoiceAmount / totalOriginalAmount;
      }

      // 統一ルール：税率別に税込合計額を集計してから消費税を計算
      const taxGroups = {
        '0.10': { totalInclusive: 0, rate: 0.10 },
        '0.08': { totalInclusive: 0, rate: 0.08 },
        '0.00': { totalInclusive: 0, rate: 0.00 }
      };

      // Step 1: 税率別に調整後の税込合計額を集計
      invoiceData.items.forEach(item => {
        const rate = parseFloat(item.tax_rate);
        let adjustedTotalPrice;
        
        if (useEvenDistribution) {
          // 均等分配の場合
          adjustedTotalPrice = Math.round(adjustmentRatio);
        } else {
          // 通常の比率計算
          adjustedTotalPrice = Math.round(item.total_price * adjustmentRatio);
        }
        
        // 税率別にグループ化（小数点誤差を考慮）
        if (Math.abs(rate - 0.10) < 0.001) {
          taxGroups['0.10'].totalInclusive += adjustedTotalPrice;
        } else if (Math.abs(rate - 0.08) < 0.001) {
          taxGroups['0.08'].totalInclusive += adjustedTotalPrice;
        } else if (Math.abs(rate) < 0.001) {
          taxGroups['0.00'].totalInclusive += adjustedTotalPrice;
        }
      });

      // Step 2: 税率別に統一ルールで消費税を計算（切り捨て）
      Object.entries(taxGroups).forEach(([rateKey, group]) => {
        if (group.totalInclusive > 0) {
          // 統一ルール：税込合計額から消費税を切り捨て計算
          const calculatedTax = Math.floor(group.totalInclusive * group.rate / (1 + group.rate));
          const calculatedNet = group.totalInclusive - calculatedTax;
          
          // 税率別に結果を設定
          if (rateKey === '0.10') {
            taxAmount10 = calculatedTax;
            totalNet10 = calculatedNet;
          } else if (rateKey === '0.08') {
            taxAmount8 = calculatedTax;
            totalNet8 = calculatedNet;
          } else if (rateKey === '0.00') {
            taxAmount0 = calculatedTax;
            totalNet0 = calculatedNet;
          }
          
          totalTax += calculatedTax;
        }
      });

      // 最終的な整合性チェック（1円未満の調整のみ）
      const calculatedTotal = totalNet10 + totalNet8 + totalNet0 + totalTax;
      const difference = actualInvoiceAmount - calculatedTotal;
      
      // 1円の誤差があれば最大の税率グループで微調整
      if (Math.abs(difference) >= 1) {
        if (totalNet10 > 0) {
          totalNet10 += difference;
        } else if (totalNet8 > 0) {
          totalNet8 += difference;
        } else if (totalNet0 > 0) {
          totalNet0 += difference;
        }
      }
    }
    
    // 実際の請求額を使用（総額から既入金を差し引いた金額）
    worksheet.getCell('I24').value = actualInvoiceAmount;
    worksheet.getCell('I25').value = totalTax;

    // 10% Subject (Net) and Tax
    worksheet.getCell('I27').value = totalNet10 !== 0 ? totalNet10 : '';
    worksheet.getCell('I28').value = taxAmount10 !== 0 ? taxAmount10 : '';

    // 8% Subject (Net) and Tax - Corrected based on template having a spacer at I29
    worksheet.getCell('I30').value = totalNet8 !== 0 ? totalNet8 : '';
    worksheet.getCell('I31').value = taxAmount8 !== 0 ? taxAmount8 : '';

    // 0% (Non-taxable) Subject and Tax
    worksheet.getCell('I33').value = (totalNet0 !== 0 || taxAmount0 !== 0) ? totalNet0 : '';
    worksheet.getCell('I34').value = (totalNet0 !== 0 || taxAmount0 !== 0) ? taxAmount0 : '';

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
        let bucketId = detail.plans_global_id || detail.plan_type_category_id;

        // Fallback: If global ID and category ID are missing, map based on tax rate
        if (!bucketId && detail.tax_rate != null) {
          const rate = parseFloat(detail.tax_rate);
          if (Math.abs(rate - 0.10) < 0.001) bucketId = 4;
          else if (Math.abs(rate - 0.08) < 0.001) bucketId = 3;
          else bucketId = 4; // Default to standard bucket
        }

        if (detail.cancelled && detail.billable) {
          cancelledCount++;
        } else if (!detail.cancelled) {
          if (bucketId && planData[bucketId]) {
            if (planData[bucketId].hasOwnProperty('count')) {
              planData[bucketId].count++;
            }
            // Add Plan Price + Accommodation Addons (e.g. Meals included in plan price)
            planData[bucketId].price += detail.price + (detail.addons_price_accom || 0);
          }
          // Add 'Other' Addons to bucket 5
          if (detail.addons_price_other !== 0) {
            planData[5].price += detail.addons_price_other;
          }
        }
      });

      const row = detailsSheet.getRow(8 + day);

      const utcCurrentDate = new Date(Date.UTC(year, month, day));
      row.getCell('B').value = utcCurrentDate;

      row.getCell('C').value = planData[4].count !== 0 ? planData[4].count : '';
      row.getCell('D').value = planData[4].price !== 0 ? planData[4].price : '';
      row.getCell('E').value = planData[3].count !== 0 ? planData[3].count : '';
      row.getCell('F').value = planData[3].price !== 0 ? planData[3].price : '';
      row.getCell('G').value = planData[2].count !== 0 ? planData[2].count : '';
      row.getCell('H').value = planData[2].price !== 0 ? planData[2].price : '';
      row.getCell('I').value = planData[1].count !== 0 ? planData[1].count : '';
      row.getCell('J').value = planData[1].price !== 0 ? planData[1].price : '';
      row.getCell('K').value = planData[5].price !== 0 ? planData[5].price : '';
      row.getCell('L').value = cancelledCount !== 0 ? cancelledCount : '';
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