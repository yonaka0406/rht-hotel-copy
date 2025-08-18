const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const generateGuestList = async (req, res) => {
    const { reservationId } = req.params;
    const guestData = req.body;

    try {
        const guestListHTML = fs.readFileSync(path.join(__dirname, '../components/guest-list.html'), 'utf-8');
        
        let htmlContent = guestListHTML;

        let smokingHtml = '禁煙 ・ 喫煙';
        if (guestData.smoking_preference === '禁煙') {
            smokingHtml = '<b>禁煙</b> ・ 喫煙';
        } else if (guestData.smoking_preference === '喫煙') {
            smokingHtml = '禁煙 ・ <b>喫煙</b>';
        }
        guestData.smoking_preference_html = smokingHtml;

        let guestsHtml = '';
        if (guestData.guests && Array.isArray(guestData.guests)) {
            guestData.guests.forEach(guest => {
                guestsHtml += `
                    <div class="grid-item label"><span class="highlight">※</span>お名前</div>
                    <div class="grid-item col-span-2">${guest.client_name || ''}</div>
                    <div class="grid-item label"><span class="highlight">※</span>車両ナンバー</div>
                    <div class="grid-item col-span-3">${guest.number_plate || ''}</div>

                    <div class="grid-item label"><span class="highlight">※</span>ご住所</div>
                    <div class="grid-item col-span-6">(〒&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;-&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;) ${guest.address || ''}</div>

                    <div class="grid-item label"><span class="highlight">※</span>ご連絡先</div>
                    <div class="grid-item col-span-6">${guest.phone_number || ''}</div>
                `;
            });
        }
        guestData.guests_html = guestsHtml;

        for (const key in guestData) {
            if (key !== 'guests' && key !== 'guests_html' && key !== 'smoking_preference_html') {
                htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), guestData[key] || '');
            }
        }
        htmlContent = htmlContent.replace('{{{smoking_preference_html}}}', guestData.smoking_preference_html);
        htmlContent = htmlContent.replace('{{{guests_html}}}', guestData.guests_html);

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

module.exports = {
  generateGuestList,
};
