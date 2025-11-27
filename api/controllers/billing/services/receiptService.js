const logger = require('../../../config/logger');

function generateReceiptHTML(html, receiptData, paymentData, userName, taxBreakdownData, honorific, isReissue, customIssueDate, customProviso) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g'); // Helper for global regex replace

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), receiptData.receipt_number || 'N/A');

  // Customer Information
  modifiedHTML = modifiedHTML.replace(g('customer_name'), (paymentData.client_name || 'お客様名'));

  // Received Amount (Total)
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

  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  // Hotel company information
  modifiedHTML = modifiedHTML.replace(g('hotel_company_name'), receiptData.hotel_company_name || 'レッドホーストラスト株式会社');

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
};

function generateConsolidatedReceiptHTML(html, consolidatedReceiptData, paymentsData, userName, taxBreakdownData, honorific, isReissue, customIssueDate, customProviso) {
  let modifiedHTML = html;
  const g = (key) => new RegExp(`{{ ${key} }}`, 'g');

  // Receipt Header
  modifiedHTML = modifiedHTML.replace(g('receipt_number'), consolidatedReceiptData.receipt_number || 'N/A');
  modifiedHTML = modifiedHTML.replace(g('receipt_date'), consolidatedReceiptData.receipt_date || 'YYYY-MM-DD');

  // Customer Information
  const firstPayment = paymentsData && paymentsData.length > 0 ? paymentsData[0] : {};
  modifiedHTML = modifiedHTML.replace(g('customer_name'), firstPayment.client_name || 'お客様名');

  // Calculate Total Consolidated Amount
  let totalConsolidatedAmount = 0;
  if (paymentsData && paymentsData.length > 0) {
    totalConsolidatedAmount = paymentsData.reduce((sum, payment) => {
      let paymentAmount = 0;
      if (payment.items && Array.isArray(payment.items) && payment.items.length > 0) {
        paymentAmount = payment.items.reduce((itemSum, item) => itemSum + (parseFloat(item.total_price) || 0), 0);
      } else if (payment.amount) {
        paymentAmount = parseFloat(payment.amount) || 0;
      }
      return sum + paymentAmount;
    }, 0);
  }
  modifiedHTML = modifiedHTML.replace(g('received_amount'), totalConsolidatedAmount.toLocaleString());
  modifiedHTML = modifiedHTML.replace(g('customer_name'), (firstPayment.client_name || 'お客様名') + honorific);
  modifiedHTML = modifiedHTML.replace(g('honorific'), honorific);

  // Proviso
  let facilityNameProviso = firstPayment.facility_name || '施設利用';
  modifiedHTML = modifiedHTML.replace(g('proviso_text'), customProviso || facilityNameProviso);

  // Stamp Image
  const imageUrl = `http://localhost:5000/34ba90cc-a65c-4a6e-93cb-b42a60626108/stamp.png`;
  modifiedHTML = modifiedHTML.replace(g('stamp_image'), imageUrl);

  // Hotel company information
  modifiedHTML = modifiedHTML.replace(g('hotel_company_name'), consolidatedReceiptData.hotel_company_name || 'レッドホーストラスト株式会社');

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

  // Clean up any old Handlebars-style placeholders
  modifiedHTML = modifiedHTML.replace(g('taxable_details_rows'), '');
  modifiedHTML = modifiedHTML.replace(g('details_subtotal_net'), '');
  modifiedHTML = modifiedHTML.replace(g('total_tax_value'), '');
  modifiedHTML = modifiedHTML.replace(g('taxable_details_exist'), 'false');

  return modifiedHTML;
};

module.exports = {
  generateReceiptHTML,
  generateConsolidatedReceiptHTML
};