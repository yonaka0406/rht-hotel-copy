const { getBrowser } = require('../services/puppeteerService');
const fs = require('fs');
const path = require('path');
const ExcelJS = require("exceljs");
const logger = require('../config/logger');
const { selectReservation, selectReservationBalance } = require('../models/reservations');
const { selectCheckInReservationsForGuestList } = require('../models/guest');

// Helper
const formatDate = (date) => {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        console.error("Invalid Date object:", date);
        throw new Error("The provided input is not a valid Date object:");
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

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

const generatePdf = async (htmlContent, reservationId, isGroup) => {
    let page;
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
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

        const filename = isGroup ? `guest_list_group_${reservationId}.pdf` : `guest_list_${reservationId}.pdf`;
        return { pdfBuffer, filename };
    } finally {
        if (page) {
            await page.close();
        }
    }
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

const getGuestListExcel = async (req, res) => {
    const requestId = req.requestId;
    const { date, hotelId } = req.params; // Now receiving date and hotelId from params
    // logger.debug(`[${requestId}] Starting getGuestListExcel. Params: date=${date}, hotelId=${hotelId}`);

    try {
        const reservationsData = await selectCheckInReservationsForGuestList(requestId, hotelId, date);
        // logger.debug(`[${requestId}] Data from model: ${JSON.stringify(reservationsData, null, 2)}`);

        if (!reservationsData || reservationsData.length === 0) {
            // logger.warn(`[${requestId}] No reservations found for date ${date} and hotelId ${hotelId}.`);
            return res.status(404).json({ message: 'No reservations found for the given date and hotel.' });
        }
        // logger.debug(`[${requestId}] Found ${reservationsData.length} reservations.`);

        const workbook = new ExcelJS.Workbook();

        // Helper function for date formatting
        const formatDateForGuestList = (dateString) => {
            const date = new Date(dateString);
            const month = date.getMonth() + 1;
            const day = date.getDate();
            const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
            const weekday = weekdays[date.getDay()];
            return `${month} 月 ${day} 日 （ ${weekday} ）`;
        };

        // Define a base style for grid items
        const gridItemStyle = {
            border: {
                top: { style: 'thin', color: { argb: 'FFA9A9A9' } },
                left: { style: 'thin', color: { argb: 'FFA9A9A9' } },
                bottom: { style: 'thin', color: { argb: 'FFA9A9A9' } },
                right: { style: 'thin', color: { argb: 'FFA9A9A9' } },
            },
            alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
        };

        const leftAlignedGridItemStyle = {
            ...gridItemStyle,
            alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
        };

        const labelStyle = {
            ...gridItemStyle,
            fill: {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF2F2F2' }, // Light gray
            },
            font: { bold: true },
        };

        const highlightStyle = {
            font: { color: { argb: 'FFFF0000' }, bold: true }, // Red color for asterisks
        };

        // Group reservations by room number
        const reservationsByRoom = {};
        for (const reservation of reservationsData) {
            const roomNumber = reservation.room_number;
            if (roomNumber) {
                if (!reservationsByRoom[roomNumber]) {
                    reservationsByRoom[roomNumber] = [];
                }
                reservationsByRoom[roomNumber].push(reservation);
            }
        }
        // logger.debug(`[${requestId}] Reservations grouped by room: ${JSON.stringify(Object.keys(reservationsByRoom))}`);

        if (Object.keys(reservationsByRoom).length === 0) {
            logger.warn(`[${requestId}] No rooms found for the provided reservations. No sheets will be created.`);
            const worksheet = workbook.addWorksheet('情報なし');
            worksheet.mergeCells('A1:G1');
            worksheet.getCell('A1').value = '選択された予約には部屋情報がありませんでした。';
            worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getCell('A1').font = { bold: true, size: 14 };
        }

        for (const roomNumber in reservationsByRoom) {
            // logger.debug(`[${requestId}] Creating worksheet for room: ${roomNumber}`);
            const roomReservations = reservationsByRoom[roomNumber];
            const worksheet = workbook.addWorksheet(`部屋番号-${roomNumber}`);

            // Set page setup for A4, portrait, and fit all columns to page
            worksheet.pageSetup.paperSize = 9; // A4
            worksheet.pageSetup.orientation = 'portrait';
            worksheet.pageSetup.fitToPage = true;
            worksheet.pageSetup.fitToWidth = 1;

            // Set default column widths
            worksheet.columns = [
                { width: 20 }, // Column 1 (150px)
                { width: 15 }, // Column 2 (1fr)
                { width: 15 }, // Column 3 (1fr)
                { width: 15 }, // Column 4 (1fr)
                { width: 14 }, // Column 5 (100px)
                { width: 15 }, // Column 6 (1fr)
                { width: 15 }, // Column 7 (1fr)
                { width: 15 }, // Extra column for guest details
                { width: 15 }, // Extra column for guest details
                { width: 15 }, // Extra column for guest details
                { width: 15 }, // Extra column for guest details
                { width: 15 }, // Extra column for guest details
            ];

            let currentRow = 1;

            for (const reservation of roomReservations) {
                // logger.debug(`[${requestId}] Processing reservation ID: ${reservation.id} for room ${roomNumber}`);

                const reservationBalance = await selectReservationBalance(requestId, hotelId, reservation.id);
                logger.debug(`[${requestId}] selectReservationBalance result for reservation ${reservation.id}: ${JSON.stringify(reservationBalance, null, 2)}`);

                // Find the balance for the current room
                const currentRoomBalance = reservationBalance.find(item => item.room_id === reservation.room_id);

                const totalPayableAmount = currentRoomBalance ? parseFloat(currentRoomBalance.total_price) : 0;
                const totalPaidAmount = currentRoomBalance ? parseFloat(currentRoomBalance.total_payment) : 0;
                const remainingPayableAmount = currentRoomBalance ? parseFloat(currentRoomBalance.balance) : 0;

                const hotelName = reservation.hotel_name || 'RHT Hotel';
                const bookerName = reservation.booker_name_kanji || reservation.booker_name_kana || reservation.booker_name || 'N/A';
                const alternativeName = reservation.alternative_company_name || ''; // Assuming this might be in reservation object
                const currentRoomNumbers = reservation.room_number; // Already filtered by roomNumber
                const planNames = reservation.plan_name;
                const parkingLotNames = ''; // Parking lot info not directly in this reservation object, will need to fetch if needed

                const checkInDateFormatted = formatDateForGuestList(reservation.check_in);
                const checkOutDateFormatted = formatDateForGuestList(reservation.check_out);

                const paymentTotal = totalPayableAmount.toLocaleString(); // Use the calculated totalPayableAmount
                let paymentOption;
                if (reservation.payment_timing === 'on-site') {
                    paymentOption = '現地決済';
                } else if (reservation.payment_timing === 'postpaid') {
                    paymentOption = '後払い';
                } else if (reservation.payment_timing === 'prepaid') {
                    paymentOption = '事前決済';
                } else if (reservation.payment_timing === 'not_set') {
                    paymentOption = 'N/A';
                } else {
                    paymentOption = ''; // Default or handle unknown values
                }

                // Hotel Name Header
                // logger.debug(`[${requestId}] Adding Hotel Name Header for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = `${hotelName} 宿泊者名簿`;
                worksheet.getCell(currentRow, 1).font = { bold: true, size: 16 };
                worksheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'center' };
                currentRow++;
                currentRow++; // Add a blank row for spacing

                // Booker Name
                // logger.debug(`[${requestId}] Adding Booker Name for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = 'ご予約会社様/個人様名';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);
                currentRow++;
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = bookerName;
                Object.assign(worksheet.getCell(currentRow, 1), gridItemStyle);
                worksheet.getRow(currentRow).height = 30;
                currentRow++;

                // Alternative Company Name
                // logger.debug(`[${requestId}] Adding Alternative Company Name for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = '※ご宿泊会社様名（ご予約の会社様と異なる場合のみ）';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);
                worksheet.getCell(currentRow, 1).value = {
                    richText: [
                        { text: '※', font: highlightStyle.font },
                        { text: 'ご宿泊会社様名（ご予約の会社様と異なる場合のみ）' }
                    ]
                };
                currentRow++;
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = alternativeName;
                Object.assign(worksheet.getCell(currentRow, 1), gridItemStyle);
                worksheet.getRow(currentRow).height = 30;
                currentRow++;

                // Check-in/Check-out Dates
                // logger.debug(`[${requestId}] Adding Check-in/Check-out Dates for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 1);
                worksheet.getCell(currentRow, 1).value = 'チェックイン日';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);

                worksheet.mergeCells(currentRow, 2, currentRow, 4);
                worksheet.getCell(currentRow, 2).value = checkInDateFormatted;
                Object.assign(worksheet.getCell(currentRow, 2), gridItemStyle);

                worksheet.mergeCells(currentRow, 5, currentRow, 5);
                worksheet.getCell(currentRow, 5).value = 'アウト日';
                Object.assign(worksheet.getCell(currentRow, 5), labelStyle);

                worksheet.mergeCells(currentRow, 6, currentRow, 7);
                worksheet.getCell(currentRow, 6).value = checkOutDateFormatted;
                Object.assign(worksheet.getCell(currentRow, 6), gridItemStyle);
                currentRow++;

                // Parking and Payment
                // logger.debug(`[${requestId}] Adding Parking and Payment for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 1);
                worksheet.getCell(currentRow, 1).value = '駐車場';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);

                worksheet.mergeCells(currentRow, 2, currentRow, 4);
                worksheet.getCell(currentRow, 2).value = parkingLotNames;
                Object.assign(worksheet.getCell(currentRow, 2), gridItemStyle);

                worksheet.mergeCells(currentRow, 5, currentRow, 5);
                worksheet.getCell(currentRow, 5).value = '支払い方法';
                Object.assign(worksheet.getCell(currentRow, 5), labelStyle);

                worksheet.mergeCells(currentRow, 6, currentRow, 7);
                worksheet.getCell(currentRow, 6).value = `${paymentOption} （ ${remainingPayableAmount.toLocaleString()} 円）`;
                Object.assign(worksheet.getCell(currentRow, 6), gridItemStyle);
                currentRow++;

                // Room Details
                // logger.debug(`[${requestId}] Adding Room Details for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 1);
                worksheet.getCell(currentRow, 1).value = '部屋番号';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);

                worksheet.mergeCells(currentRow, 2, currentRow, 2);
                worksheet.getCell(currentRow, 2).value = currentRoomNumbers;
                Object.assign(worksheet.getCell(currentRow, 2), gridItemStyle);

                worksheet.mergeCells(currentRow, 3, currentRow, 4);
                const smokingPreference = reservation.smoking === true ? '喫煙' : '禁煙'; // Use reservation.smoking
                worksheet.getCell(currentRow, 3).value = smokingPreference; 
                Object.assign(worksheet.getCell(currentRow, 3), gridItemStyle);

                worksheet.mergeCells(currentRow, 5, currentRow, 5);
                worksheet.getCell(currentRow, 5).value = 'プラン';
                Object.assign(worksheet.getCell(currentRow, 5), labelStyle);

                worksheet.mergeCells(currentRow, 6, currentRow, 7);
                worksheet.getCell(currentRow, 6).value = planNames;
                Object.assign(worksheet.getCell(currentRow, 6), gridItemStyle);
                worksheet.getRow(currentRow).height = 30;
                currentRow++;

                // Guests Section Header
                // logger.debug(`[${requestId}] Adding Guests Section Header for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = '宿泊者情報';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);
                currentRow++;

                // Guests Table Rows
                let guests = reservation.clients_json || []; // Use clients_json from reservation
                if (guests.length === 0) {
                    const numPeople = reservation.number_of_people || 1; // Default to 1 if not specified
                    for (let i = 0; i < numPeople; i++) {
                        guests.push({
                            name_kanji: '', name_kana: '', name: '',
                            postal_code: '', address1: '', address2: '',
                            phone: '', gender: '', age: '', comment: ''
                        });
                    }
                }

                guests.forEach((guest, index) => {
                    if (index > 0) {
                        // Add a separator between guests
                        worksheet.mergeCells(currentRow, 1, currentRow, 7);
                        worksheet.getCell(currentRow, 1).value = '';
                        worksheet.getCell(currentRow, 1).border = { bottom: { style: 'thin', color: { argb: 'FFA9A9A9' } } };
                        currentRow++;
                    }

                    // logger.debug(`[${requestId}] Adding guest ${guest.name} for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);

                    // Guest Name
                    worksheet.mergeCells(currentRow, 1, currentRow, 1);
                    worksheet.getCell(currentRow, 1).value = {
                        richText: [
                            { text: '※', font: highlightStyle.font },
                            { text: 'お名前' }
                        ]
                    };
                    Object.assign(worksheet.getCell(currentRow, 1), labelStyle);

                    worksheet.mergeCells(currentRow, 2, currentRow, 7);
                    worksheet.getCell(currentRow, 2).value = guest.name_kanji || guest.name || '';
                    Object.assign(worksheet.getCell(currentRow, 2), leftAlignedGridItemStyle);
                    worksheet.getRow(currentRow).height = 30;
                    currentRow++;

                    // Guest Address (2 merged rows)
                    const addressStartRow = currentRow;
                    worksheet.mergeCells(addressStartRow, 1, addressStartRow + 1, 1);
                    worksheet.getCell(addressStartRow, 1).value = {
                        richText: [
                            { text: '※', font: highlightStyle.font },
                            { text: 'ご住所' }
                        ]
                    };
                    Object.assign(worksheet.getCell(addressStartRow, 1), labelStyle);

                    worksheet.mergeCells(addressStartRow, 2, addressStartRow + 1, 7);
                    worksheet.getCell(addressStartRow, 2).value = `${guest.postal_code ? '〒 ' + guest.postal_code : ''}\n${guest.address1 || ''} ${guest.address2 || ''}`.trim();
                    Object.assign(worksheet.getCell(addressStartRow, 2), leftAlignedGridItemStyle);
                    worksheet.getRow(addressStartRow).height = 30;
                    worksheet.getRow(addressStartRow + 1).height = 30;
                    currentRow += 2;

                    // Guest Phone
                    worksheet.mergeCells(currentRow, 1, currentRow, 1);
                    worksheet.getCell(currentRow, 1).value = {
                        richText: [
                            { text: '※', font: highlightStyle.font },
                            { text: 'ご連絡先' }
                        ]
                    };
                    Object.assign(worksheet.getCell(currentRow, 1), labelStyle);

                    worksheet.mergeCells(currentRow, 2, currentRow, 7);
                    worksheet.getCell(currentRow, 2).value = guest.phone || '';
                    Object.assign(worksheet.getCell(currentRow, 2), leftAlignedGridItemStyle);
                    worksheet.getRow(currentRow).height = 30;
                    currentRow++;
                });

                // Comments
                // logger.debug(`[${requestId}] Adding Comments for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                worksheet.mergeCells(currentRow, 1, currentRow, 1);
                worksheet.getCell(currentRow, 1).value = '備考';
                Object.assign(worksheet.getCell(currentRow, 1), labelStyle);

                worksheet.mergeCells(currentRow, 2, currentRow, 7);
                            worksheet.getCell(currentRow, 2).value = reservation.comment || '';
                            Object.assign(worksheet.getCell(currentRow, 2), leftAlignedGridItemStyle);                worksheet.getRow(currentRow).height = 120;
                currentRow++;

                // Footer Section
                // logger.debug(`[${requestId}] Adding Footer Section for reservation ${reservation.id} in room ${roomNumber} at row ${currentRow}`);
                currentRow++; // Blank row for spacing
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = '↑↑↑上記項目内の※の欄のご記入をお願いいたします。';
                worksheet.getCell(currentRow, 1).font = highlightStyle.font;
                worksheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left' };
                currentRow++;
                worksheet.mergeCells(currentRow, 1, currentRow, 7);
                worksheet.getCell(currentRow, 1).value = '※当社が収集した個人情報につきましては、予約の確認、キャンセルや変更、荷物の受け取り、お忘れ物、 緊急連絡時に利用する場合がございます。お客様からお預かりした個人情報は、適切かつ慎重に管理し 保存期間が終了しましたら、適切に処分いたしますうえ、ご了承くださいませ。';
                worksheet.getCell(currentRow, 1).font = { size: 9 };
                worksheet.getCell(currentRow, 1).alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                currentRow++;
                currentRow++; // Add a blank row for separation between reservations
            }
        }

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'GuestList.xlsx');

        await workbook.xlsx.write(res);
        res.end();
        // logger.debug(`[${requestId}] Successfully generated guest list Excel.`);

    } catch (error) {
        logger.error(`[${requestId}] Error generating guest list Excel:`, error);
        res.status(500).json({ message: 'Failed to generate guest list Excel', error: error.message });
    }
};

module.exports = {
    generateGuestList,
    getGuestListExcel,
};
