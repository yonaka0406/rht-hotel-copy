const { getGuestListDetails } = require('../models/guest');
const puppeteer = require('puppeteer');
const fs =require('fs');
const path = require('path');

const generateGuestList = async (req, res) => {
    const { hotelId, reservationId } = req.params;
    const guestData = req.body;

    try {
        const details = await getGuestListDetails(req.requestId, hotelId, reservationId);

        if (!details) {
            return res.status(404).json({ error: 'Guest list details not found' });
        }

        const guestListHTML = fs.readFileSync(path.join(__dirname, '../components/guest-list.html'), 'utf-8');
        
        const htmlContent = generateGuestListHTML(guestListHTML, details, guestData);

        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20px',
                right: '20px',
                bottom: '20px',
                left: '20px'
            }
        });

        await browser.close();

        const filename = `guest_list_${reservationId}.pdf`;
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating guest list PDF:', error);
        res.status(500).send('Error generating guest list PDF');
    }
};

function generateGuestListHTML(html, details, guestData) {
    let modifiedHTML = html;

    const formatJapaneseDate = (dateString) => {
        const date = new Date(dateString);
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()];
        return `${month}月${day}日(${dayOfWeek})`;
    };
    
    const fields = {
        booker_name: details.booker_name,
        alternative_name: details.alternative_name,
        check_in: formatJapaneseDate(details.check_in),
        check_out: formatJapaneseDate(details.check_out),
        parking_lot_names: details.parking_lot_names ? details.parking_lot_names.join(', ') : '',
        payment_total: details.payment_total ? new Intl.NumberFormat('ja-JP').format(details.payment_total) : '0',
        room_numbers: details.room_numbers ? details.room_numbers.join(', ') : '',
        plan_names: details.plan_names ? details.plan_names.join(', ') : '',
        client_name: details.guests && details.guests[0] ? details.guests[0].name : '',
        number_plate: details.guests && details.guests[0] ? details.guests[0].car_number_plate : '',
        address: details.guests && details.guests[0] ? details.guests[0].address : '',
        phone_number: details.guests && details.guests[0] ? details.guests[0].phone : '',
        comment: details.comment
    };

    for (const key in fields) {
        let value = fields[key];
        if (guestData[key] === false) { // Assuming checkbox value is sent as boolean
            value = '';
        }
        modifiedHTML = modifiedHTML.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }

    return modifiedHTML;
}

module.exports = {
  generateGuestList,
};
