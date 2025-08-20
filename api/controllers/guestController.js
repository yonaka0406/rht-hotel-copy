const puppeteer = require('puppeteer');
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
            let formattedAddress = '';
            if (guest.postal_code) {
                formattedAddress += `〒 ${guest.postal_code}`;
            }
            if (guest.address) {
                if (formattedAddress) {
                    formattedAddress += `<br>`;
                }
                formattedAddress += `${guest.address}`;
            }

            guestsHtml += `
                <div class="grid-item label"><span class="highlight">※</span>お名前</div>
                <div class="grid-item col-span-2">${guest.name_kanji || guest.name || ''}</div>
                <div class="grid-item label"><span class="highlight">※</span>車両ナンバー</div>
                <div class="grid-item col-span-3"></div>

                <div class="grid-item label" style="height: 80px;"><span class="highlight">※</span>ご住所</div>
                <div class="grid-item col-span-6" style="height: 80px; align-items: flex-start;">${formattedAddress}</div>

                <div class="grid-item label"><span class="highlight">※</span>ご連絡先</div>
                <div class="grid-item col-span-6">${guest.phone || ''}</div>
            `;
        });
        htmlContent = htmlContent.replace('{{{guests_html}}}', guestsHtml);

        allRoomsHtml += htmlContent;
        isFirstRoom = false;
    }
    return allRoomsHtml;
}

const generatePdf = async (htmlContent, reservationId, isGroup) => {
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
    
    const filename = isGroup ? `guest_list_group_${reservationId}.pdf` : `guest_list_${reservationId}.pdf`;
    return { pdfBuffer, filename };
}

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
                let formattedAddress = '';
                if (guest.postal_code) {
                    formattedAddress += `〒 ${guest.postal_code}`;
                }
                if (guest.address) {
                    if (formattedAddress) {
                        formattedAddress += `<br>`;
                    }
                    formattedAddress += `${guest.address}`;
                }
                
                guestsHtml += `
                    <div class="grid-item label"><span class="highlight">※</span>お名前</div>
                    <div class="grid-item col-span-2">${guest.client_name || ''}</div>
                    <div class="grid-item label"><span class="highlight">※</span>車両ナンバー</div>
                    <div class="grid-item col-span-3">${guest.number_plate || ''}</div>

                    <div class="grid-item label" style="height: 80px;"><span class="highlight">※</span>ご住所</div>
                    <div class="grid-item col-span-6" style="height: 80px; align-items: flex-start;">${formattedAddress}</div>

                    <div class="grid-item label"><span class="highlight">※</span>ご連絡先</div>
                    <div class="grid-item col-span-6">${guest.phone_number || ''}</div>
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

const generateGroupGuestList = async (req, res) => {
    const { reservationId } = req.params;
    const guestData = req.body;

    try {
        const reservationData = await selectReservation(req.requestId, reservationId);
        if (!reservationData || reservationData.length === 0) {
            return res.status(404).send('Reservation not found');
        }

        const guestListHTML = fs.readFileSync(path.join(__dirname, '../components/guest-list.html'), 'utf-8');
        
        const rooms = {};
        reservationData.forEach(detail => {
            if (!rooms[detail.room_id]) {
                rooms[detail.room_id] = {
                    details: [],
                    room_number: detail.room_number,
                    smoking: detail.smoking,
                    guests: new Map()
                };
            }
            rooms[detail.room_id].details.push(detail);
            detail.reservation_clients.forEach(guest => {
                rooms[detail.room_id].guests.set(guest.client_id, guest);
            });
        });

        const allRoomsHtml = generateGuestListHTMLForRooms(rooms, guestListHTML, guestData);
        const { pdfBuffer, filename } = await generatePdf(allRoomsHtml, reservationId, true);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Length': pdfBuffer.length,
            'Content-Disposition': `attachment; filename="${filename}"`,
        });
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Error generating group guest list PDF:', error);
        res.status(500).send('Error generating group guest list PDF');
    }
};

module.exports = {
  generateGuestList,
  generateGroupGuestList,
};
