const { selectBillableListView, selectBilledListView } = require('../models/billing');
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
    //const data = await upsertInvoiceData(req.requestId, hotelId, invoiceId, invoiceData);  
    
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

  console.log("generateInvoiceHTML:", data);
  
  modifiedHTML = modifiedHTML.replace(/{{ stamp_image }}/g, imageUrl);

  // Header
  modifiedHTML = modifiedHTML.replace(/{{ invoice_number }}/g, data.invoice_number);
  modifiedHTML = modifiedHTML.replace(/{{ invoice_date }}/g, data.date);
  modifiedHTML = modifiedHTML.replace(/{{ customer_name }}/g, data.client_name);
  modifiedHTML = modifiedHTML.replace(/{{ customer_code }}/g, data.client_id);
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
  let itemsHtml = data.items.map(item => `
      <tr>
        <td style="text-align: right;">${(item.tax_rate * 100).toLocaleString()} %</td>
        <td style="text-align: right;">${item.total_net_price.toLocaleString()} 円</td>
        <td style="text-align: right;">${item.total_price.toLocaleString()} 円</td>
      </tr>
  `).join('');

  return `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <title>Invoice</title>
          <style>
              /* Basic styling.  Customize as needed. */
              body { font-family: sans-serif; }
              table { width: 100%; border-collapse: collapse; }
              table, th, td { border: 1px solid black; padding: 5px; }
          </style>
      </head>
      <body>
          <h1>Invoice</h1>
          <p>Invoice Number: ${data.invoice_number}</p>
          <p>Date: ${data.date}</p>
          <p>Client: ${data.client_name}</p>

          <table>
              <thead>
                  <tr>
                      <th>Tax Rate</th>
                      <th>Net Amount</th>
                      <th>Total Amount</th>
                  </tr>
              </thead>
              <tbody>
                  ${itemsHtml}
              </tbody>
          </table>

          <p>Total: ${data.invoice_total_value.toLocaleString()} 円</p>
          <p>Thank you for your business!</p>
      </body>
      </html>
  `;
};

const generateBlankPdfWithAbc = async (req, res) => {
  let browser;
  try {
    // Create a browser instance
    browser = await puppeteer.launch();

    // Create a new page
    const page = await browser.newPage();

    //Get HTML content from HTML file
    const invoiceHTML = fs.readFileSync(path.join(__dirname, '../components/invoice.html'), 'utf-8');
    await page.setContent(invoiceHTML, { waitUntil: 'domcontentloaded' });

    // To reflect CSS used for screens instead of print
    await page.emulateMediaType('screen');

    // Downlaod the PDF
    const pdfBuffer = await page.pdf({
      path: 'result.pdf',
      margin: { top: '100px', right: '50px', bottom: '100px', left: '50px' },
      printBackground: true,
      format: 'A4',
    });    

    // Close the browser instance
    await browser.close();

    res.contentType("application/pdf");    
    res.send(Buffer.from(pdfBuffer));
    
    console.log("Backend: Blank PDF sent (attempt 5).");  

  } catch (error) {
    console.error("Error generating blank PDF with Puppeteer (attempt 5):", error);
    res.status(500).send('Error generating blank PDF');
  } finally {
    if (browser) {
      await browser.close().catch(err => console.error("Error closing browser:", err));
    }
  }
};

module.exports = { 
  getBillableListView,
  getBilledListView,
  generateInvoice,
  generateBlankPdfWithAbc,
};