const { selectBillableListView, selectBilledListView } = require('../models/billing');
const puppeteer = require('puppeteer');

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
  console.log("Received invoice data:", invoiceData);

  try {    
    // Save the invoice data to the database
    //const data = await upsertInvoiceData(req.requestId, hotelId, invoiceId, invoiceData);    

    console.log("Backend: Launching Puppeteer...");
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    //  1. Create HTML content for the PDF
    const htmlContent = generateInvoiceHTML(invoiceData); 
    console.log("Backend: HTML content generated:", htmlContent);

    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    console.log("Backend: Page content set.");

    //  2. Generate PDF
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
    });
    console.log("Backend: PDF generated. Buffer length:", pdfBuffer.length);

    await browser.close();
    console.log("Backend: Puppeteer closed.");

    //  3. Send PDF as a download
    res.contentType("application/pdf");
    res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
    console.log("Backend: Sending PDF...");
    res.send(pdfBuffer);
    console.log("Backend: PDF sent.");
    
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).send('Error generating PDF');
  }
};
function generateInvoiceHTML(data) {
  //  This is a basic example.  You'll need to expand it to match your invoice layout.
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

module.exports = { 
  getBillableListView,
  getBilledListView,
  generateInvoice,
};