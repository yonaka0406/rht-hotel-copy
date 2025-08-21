const { getBrowser } = require('../utils/browserManager');
const fs = require('fs');
const path = require('path');
const { selectReservation } = require('../models/reservations');

const generateGuestListHTMLForRooms = (rooms, guestListHTML, guestData) => {
    let allRoomsHtml = '';
    let isFirstRoom = true;
    for (const roomId in rooms) {
        const room = rooms[roomId];
        const firstDetail = room.details[0];

        if (!isFirstRoom) {
            allRoomsHtml += '<div style="page-break-before: always;"></div>';
        }

        let htmlContent = guestListHTML;

        // Generate smoking and non-smoking HTML parts based on the data
        let nonSmokingHtml = `<div style="text-align: center;">禁<br>煙</div>`;
        let smokingHtml = `<div style="text-align: center;">喫<br>煙</div>`;
        
        if (room.smoking === '禁煙') {
            nonSmokingHtml = `<div style="text-align: center; font-weight: bold;">禁<br>煙</div>`;
        } else if (room.smoking === '喫煙') {
            smokingHtml = `<div style="text-align: center; font-weight: bold;">喫<br>煙</div>`;
        }

        const checkInDate = new Date(firstDetail.check_in);
        const checkOutDate = new Date(firstDetail.check_out);
        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

        const totalPrice = room.details.reduce((acc, detail) => acc + parseFloat(detail.price), 0);
        const hotelName = guestData.hotel_name || 'My Hotel';

        // Split all parking lots and the selected one for comparison
        const allParkingLots = guestData.all_parking_lots_list ? guestData.all_parking_lots_list.split(',') : [];
        const selectedParkingLot = guestData.parking_lot_names_list || null;

        // Format the parking lot string with bolding
        let parkingLotNames;
        if (selectedParkingLot && selectedParkingLot.trim() !== '') {
            parkingLotNames = allParkingLots.map(lot => {
                const trimmedLot = lot.trim();
                const trimmedSelected = selectedParkingLot.trim();
                if (trimmedLot === trimmedSelected) {
                    return `<span style="font-weight: bold;">${trimmedLot}</span>`;
                }
                return trimmedLot;
            }).join(' ・ ');
        } else {
            parkingLotNames = allParkingLots.join(' ・ ');
        }
        
        // Dynamically create the payment option string based on the value from the Vue component
        let paymentOptionHtml = '';
        if (guestData.payment_option === 'あり') {
            paymentOptionHtml = `<span style="font-weight: bold;">あり</span> ・ なし`;
        } else {
            paymentOptionHtml = `あり ・ <span style="font-weight: bold;">なし</span>`;
        }
        
        // Format the plan names based on whether a plan was selected
        let planNames = '';
        const plansList = (guestData.plan_names_list && guestData.plan_names_list.trim() !== '') ? guestData.plan_names_list.split(',') : (guestData.all_plan_names_list ? guestData.all_plan_names_list.split(',') : []);
        if (plansList.length > 0) {
            planNames = plansList.map(plan => `<small>${plan.trim()}</small>`).join(' ・<br>');
        } else {
            planNames = '指定なし';
        }

        htmlContent = htmlContent.replace(new RegExp(`{{hotel_name}}`, 'g'), hotelName);
        htmlContent = htmlContent.replace(new RegExp(`{{booker_name}}`, 'g'), guestData.booker_name || '');
        htmlContent = htmlContent.replace(new RegExp(`{{alternative_name}}`, 'g'), guestData.alternative_name || '');
        htmlContent = htmlContent.replace(new RegExp(`{{check_in_month}}`, 'g'), guestData.check_in_month);
        htmlContent = htmlContent.replace(new RegExp(`{{check_in_day}}`, 'g'), guestData.check_in_day);
        htmlContent = htmlContent.replace(new RegExp(`{{check_in_weekday}}`, 'g'), guestData.check_in_weekday);
        htmlContent = htmlContent.replace(new RegExp(`{{check_out_month}}`, 'g'), guestData.check_out_month);
        htmlContent = htmlContent.replace(new RegExp(`{{check_out_day}}`, 'g'), guestData.check_out_day);
        htmlContent = htmlContent.replace(new RegExp(`{{check_out_weekday}}`, 'g'), guestData.check_out_weekday);
        htmlContent = htmlContent.replace(new RegExp(`{{parking_lot_names_list}}`, 'g'), parkingLotNames || '指定なし');
        htmlContent = htmlContent.replace(new RegExp(`{{payment_total}}`, 'g'), guestData.payment_total);
        htmlContent = htmlContent.replace(new RegExp(`{{room_numbers}}`, 'g'), room.room_number);
        htmlContent = htmlContent.replace(new RegExp(`{{plan_names_list}}`, 'g'), planNames);
        htmlContent = htmlContent.replace(new RegExp(`{{comment}}`, 'g'), guestData.comment || '');
        
        // This is where you insert the generated smokingHtml
        htmlContent = htmlContent.replace('{{{non_smoking_preference_html}}}', nonSmokingHtml);
        htmlContent = htmlContent.replace('{{{smoking_preference_html}}}', smokingHtml);
        htmlContent = htmlContent.replace('{{{payment_option_html}}}', paymentOptionHtml);

        let guestsHtml = '';
        const uniqueGuests = Array.from(room.guests.values());
        uniqueGuests.forEach((guest, index) => {
            if (index > 0) {
                guestsHtml += '<div class="separator"></div>';
            }
            
            // Format the address with the postal code from the guestData object
            const postalCodeLine = guest.postal_code ? `〒 ${guest.postal_code}` : '〒';
            const addressLine = guest.address || '';
            const formattedAddress = `${postalCodeLine}<br>　${addressLine}`;

            // ADDED: Guest number header
            guestsHtml += `
                <div class="grid-item label" style="grid-column: 1 / -1;">
                    宿泊者${index + 1}人目
                </div>
            `;

            // Adjusting column spans for name and vehicle number
            guestsHtml += `
                <div class="grid-item label" style="grid-column: 1 / span 1;"><span class="highlight">※</span>お名前</div>
                <div class="grid-item col-span-3">${guest.name_kanji || guest.name || ''}</div>
                <div class="grid-item label" style="grid-column: 5 / span 1;"><span class="highlight">※</span>車両ナンバー</div>
                <div class="grid-item col-span-2">${guest.car_number_plate || ''}</div>

                <div class="grid-item label" style="grid-column: 1 / span 1; align-items: flex-start;"><span class="highlight">※</span>ご住所</div>
                <div class="grid-item col-span-6" style="align-items: flex-start;">${formattedAddress}</div>

                <div class="grid-item label" style="grid-column: 1 / span 1;"><span class="highlight">※</span>ご連絡先</div>
                <div class="grid-item col-span-6">${guest.phone || ''}</div>
            `;
        });
        htmlContent = htmlContent.replace('{{{guests_html}}}', guestsHtml);

        allRoomsHtml += htmlContent;
        isFirstRoom = false;
    }
    return allRoomsHtml;
}

const generatePdf = async (htmlContent, reservationId, isGroup = false) => {
    let page;
    try {
        const browser = await getBrowser();
        if (!browser) {
            throw new Error('Failed to get browser instance');
        }
        
        // Create a new page with error handling
        page = await browser.newPage().catch(err => {
            console.error('Failed to create new page:', err);
            throw new Error('Failed to create new browser page');
        });
        
        // Set timeouts
        page.setDefaultNavigationTimeout(60000); // 60 seconds
        page.setDefaultTimeout(60000);
        
        // Disable navigation timeout for setContent
        await page.setDefaultNavigationTimeout(0);
        
        // Set the content with error handling for navigation
        try {
            await page.setContent(htmlContent, {
                waitUntil: ['networkidle0', 'domcontentloaded', 'load'],
                timeout: 120000 // 120 seconds
            });
        } catch (navError) {
            console.warn('Navigation warning:', navError.message);
            // Continue even if navigation times out, the content might still be loaded
        }
        
        // Wait for any dynamic content to load (3 seconds delay)
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Generate PDF with proper error handling
        let pdfBuffer;
        try {
            pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    right: '20px',
                    bottom: '20px',
                    left: '20px'
                },
                timeout: 120000, // 120 seconds
                preferCSSPageSize: true,
                displayHeaderFooter: false
            });
            
            if (!pdfBuffer || pdfBuffer.length === 0) {
                throw new Error('Failed to generate PDF: Empty buffer');
            }
        } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            throw new Error(`Failed to generate PDF: ${pdfError.message}`);
        }
        
        const filename = isGroup ? `guest_list_group_${reservationId}.pdf` : `guest_list_${reservationId}.pdf`;
        return { pdfBuffer, filename };
        
    } catch (error) {
        console.error('Error in generatePdf:', error);
        throw error;
        
    } finally {
        // Close the page if it exists and is open
        if (page && !page.isClosed()) {
            try {
                await page.close().catch(e => console.warn('Warning closing page:', e));
            } catch (closeError) {
                console.error('Error closing page:', closeError);
            }
        }
        
        // Don't close the browser here - let the browser manager handle it
        // This prevents issues with browser disconnections
    }
};

const generateGuestList = async (req, res) => {
    const { reservationId } = req.params;
    const guestData = req.body;

    try {
        const guestListHTML = fs.readFileSync(path.join(__dirname, '../components/guest-list.html'), 'utf-8');
        
        let nonSmokingHtml = `<div style="text-align: center;">禁<br>煙</div>`;
        let smokingHtml = `<div style="text-align: center;">喫<br>煙</div>`;

        if (guestData.smoking_preference === '禁煙') {
            nonSmokingHtml = `<div style="text-align: center; font-weight: bold;">禁<br>煙</div>`;
        } else if (guestData.smoking_preference === '喫煙') {
            smokingHtml = `<div style="text-align: center; font-weight: bold;">喫<br>煙</div>`;
        }

        guestData.non_smoking_preference_html = nonSmokingHtml;
        guestData.smoking_preference_html = smokingHtml;

        let guestsHtml = '';
        if (guestData.guests && Array.isArray(guestData.guests)) {
            guestData.guests.forEach((guest, index) => {
                if (index > 0) {
                    guestsHtml += '<div class="separator"></div>';
                }

                // Correctly format the postal code and address here
                const postalCodeLine = guest.postal_code ? `〒 ${guest.postal_code}` : '〒';
                const addressLine = guest.address || '';
                const formattedAddress = `${postalCodeLine}<br>　${addressLine}`;

                // ADDED: Guest number header
                guestsHtml += `
                    <div class="grid-item label" style="grid-column: 1 / -1;">
                        宿泊者${index + 1}人目
                    </div>
                `;

                // Adjusting column spans for name and vehicle number
                guestsHtml += `
                    <div class="grid-item label" style="grid-column: 1 / span 1;"><span class="highlight">※</span>お名前</div>
                    <div class="grid-item col-span-3">${guest.client_name || ''}</div>
                    <div class="grid-item label" style="grid-column: 5 / span 1;"><span class="highlight">※</span>車両ナンバー</div>
                    <div class="grid-item col-span-2">${guest.number_plate || ''}</div>

                    <div class="grid-item label" style="grid-column: 1 / span 1; align-items: flex-start;"><span class="highlight">※</span>ご住所</div>
                    <div class="grid-item col-span-6" style="align-items: flex-start;">${formattedAddress}</div>

                    <div class="grid-item label" style="grid-column: 1 / span 1;"><span class="highlight">※</span>ご連絡先</div>
                    <div class="grid-item col-span-6">${guest.phone || ''}</div>
                `;
            });
        }
        guestData.guests_html = guestsHtml;

        let htmlContent = guestListHTML;
        
        // Correct the parking lot variable assignment and add bolding
        const allParkingLots = guestData.all_parking_lots_list ? guestData.all_parking_lots_list.split(',') : [];
        const selectedParkingLot = guestData.parking_lot_names_list;

        let parkingLotNames;
        if (selectedParkingLot && selectedParkingLot.trim() !== '') {
            parkingLotNames = allParkingLots.map(lot => {
                const trimmedLot = lot.trim();
                const trimmedSelected = selectedParkingLot.trim();
                if (trimmedLot === trimmedSelected) {
                    return `<span style="font-weight: bold;">${trimmedLot}</span>`;
                }
                return trimmedLot;
            }).join(' ・ ');
        } else {
            parkingLotNames = allParkingLots.join(' ・ ');
        }
        
        // Dynamically create the payment option string based on the value from the Vue component
        let paymentOptionHtml = '';
        if (guestData.payment_option === 'あり') {
            paymentOptionHtml = `<span style="font-weight: bold;">あり</span> ・ なし`;
        } else {
            paymentOptionHtml = `あり ・ <span style="font-weight: bold;">なし</span>`;
        }

        // Format the plan names based on whether a plan was selected
        let planNames = '';
        const plansList = (guestData.plan_names_list && guestData.plan_names_list.trim() !== '') ? guestData.plan_names_list.split(',') : (guestData.all_plan_names_list ? guestData.all_plan_names_list.split(',') : []);
        if (plansList.length > 0) {
            planNames = plansList.map(plan => `<small>${plan.trim()}</small>`).join(' ・<br>');
        } else {
            planNames = '指定なし';
        }
        
        for (const key in guestData) {
            if (key !== 'guests' && key !== 'guests_html' && key !== 'non_smoking_preference_html' && key !== 'smoking_preference_html' && key !== 'parking_lot_names_list' && key !== 'all_parking_lots_list' && key !== 'payment_option' && key !== 'plan_names_list') {
                htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), guestData[key] || '');
            }
        }
        htmlContent = htmlContent.replace('{{{non_smoking_preference_html}}}', guestData.non_smoking_preference_html);
        htmlContent = htmlContent.replace('{{{smoking_preference_html}}}', guestData.smoking_preference_html);
        htmlContent = htmlContent.replace(new RegExp(`{{parking_lot_names_list}}`, 'g'), parkingLotNames || '指定なし');
        htmlContent = htmlContent.replace('{{{guests_html}}}', guestsHtml);
        htmlContent = htmlContent.replace(new RegExp(`{{payment_total}}`, 'g'), guestData.payment_total);
        htmlContent = htmlContent.replace('{{{payment_option_html}}}', paymentOptionHtml);
        htmlContent = htmlContent.replace('{{plan_names_list}}', planNames);


        const { pdfBuffer, filename } = await generatePdf(htmlContent, reservationId, false);

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
