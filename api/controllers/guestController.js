const { getBrowser } = require('../services/puppeteerService');
const fs = require('fs');
const path = require('path');
const ExcelJS = require("exceljs");
const logger = require('../config/logger');
const { selectReservation } = require('../models/reservations');
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
    const { date, hotelId } = req.params;
    logger.debug(`[getGuestListExcel] Request received for date: ${date}, hotelId: ${hotelId}`);

    try {
        const reservations = await selectCheckInReservationsForGuestList(req.requestId, hotelId, date);
        logger.debug(`[getGuestListExcel] Data from model: ${JSON.stringify(reservations, null, 2)}`);

        if (!reservations || reservations.length === 0) {
            return res.status(404).send("No check-in reservations found for the given date and hotel.");
        }

        const workbook = new ExcelJS.Workbook();
        const hotelName = reservations[0].hotel_name; // Assuming all reservations are for the same hotel

        // Group reservations by room_number
        const reservationsByRoom = reservations.reduce((acc, reservation) => {
            const roomNumber = reservation.room_number || '未割り当て';
            if (!acc[roomNumber]) {
                acc[roomNumber] = [];
            }
            acc[roomNumber].push(reservation);
            return acc;
        }, {});

        for (const roomNumber in reservationsByRoom) {
            const roomReservations = reservationsByRoom[roomNumber];
            const worksheet = workbook.addWorksheet(`部屋番号-${roomNumber}`);

            // Add title
            worksheet.mergeCells('A1:J1');
            worksheet.getCell('A1').value = `${hotelName} - 宿泊者名簿 (${date})`;
            worksheet.getCell('A1').font = { bold: true, size: 16 };
            worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };

            // Add room number
            worksheet.mergeCells('A2:J2');
            worksheet.getCell('A2').value = `部屋番号: ${roomNumber}`;
            worksheet.getCell('A2').font = { bold: true, size: 14 };
            worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };

            // Add smoking preference
            worksheet.mergeCells('A3:J3');
            worksheet.getCell('A3').value = `喫煙区分: ${roomReservations[0].smoking ? '喫煙' : '禁煙'}`;
            worksheet.getCell('A3').font = { bold: true, size: 12 };
            worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };

            // Add headers
            const headers = [
                "予約ID",
                "チェックイン",
                "チェックアウト",
                "プラン名",
                "人数",
                "宿泊者名",
                "ご住所",
                "ご連絡先",
                "郵便番号",
                "備考"
            ];
            const headerRow = worksheet.addRow(headers);
            headerRow.font = { bold: true };
            headerRow.eachCell((cell) => {
                cell.border = {
                    bottom: { style: 'thin', color: { argb: '000000' } },
                };
            });

            // Add data rows
            roomReservations.forEach(reservation => {
                const clients = reservation.clients_json || [];

                clients.forEach(client => {
                    worksheet.addRow([
                        reservation.id,
                        formatDate(new Date(reservation.check_in)),
                        formatDate(new Date(reservation.check_out)),
                        reservation.plan_name,
                        reservation.number_of_people,
                        client.name_kanji || client.name_kana || client.name,
                        client.car_number_plate || '',
                        `${client.address1 || ''}${client.address2 || ''}`,
                        client.phone || '',
                        client.postal_code || '',
                        reservation.comment || '',
                    ]);
                });
            });

            // Set column widths
            worksheet.columns.forEach(column => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const cellValue = cell.value ? cell.value.toString() : '';
                    maxLength = Math.max(maxLength, cellValue.length);
                });
                column.width = maxLength < 10 ? 10 : maxLength + 2;
            });
        }

        res.setHeader("Content-Disposition", `attachment; filename=guest_list_${date}.xlsx`);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        logger.error("[getGuestListExcel] Error generating guest list Excel:", err);
        res.status(500).send("Error generating guest list Excel");
    }
};

module.exports = {
    generateGuestList,
    getGuestListExcel,
};
