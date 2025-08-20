const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

/**
 * Generates the HTML content for a guest list, handling single or multiple rooms.
 * @param {Object} rooms - A map of rooms with their details, e.g., { 'room_id': { details: [], guests: [] } }
 * @param {string} guestListHTML - The HTML template string.
 * @param {Object} guestData - The main reservation data object.
 * @returns {string} The complete HTML content for the guest list.
 */
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

        // Determine smoking preference from the room object, which is now populated correctly
        if (room.smoking === '禁煙') {
            nonSmokingHtml = `<div style="text-align: center; font-weight: bold;">禁<br>煙</div>`;
        } else if (room.smoking === '喫煙') {
            smokingHtml = `<div style="text-align: center; font-weight: bold;">喫<br>煙</div>`;
        }

        // Note: The original code used check_in and check_out from firstDetail, but this isn't in guestData
        // I've kept the original logic here for formatting
        const checkInDate = new Date(firstDetail.check_in);
        const checkOutDate = new Date(firstDetail.check_out);
        const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
        
        const totalPrice = room.details.reduce((acc, detail) => acc + parseFloat(detail.price), 0);
        const hotelName = guestData.hotel_name || 'My Hotel';

        // Split all parking lots and the selected one for comparison
        const allParkingLots = guestData.all_parking_lots_list ? guestData.all_parking_lots_list.split(',') : [];
        const selectedParkingLot = room.parking_lot_names_list || null;

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
        const plansList = (room.plan_names_list && room.plan_names_list.trim() !== '') ? room.plan_names_list.split(',') : (guestData.all_plan_names_list ? guestData.all_plan_names_list.split(',') : []);
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
            
            // Handle the different data structures from the Vue component or the database
            const name = guest.name_kanji || guest.name || (guest.client_name ? guest.client_name.value : '');
            const postal_code = guest.postal_code || (guest.postal_code ? guest.postal_code.value : '');
            const address = guest.address || (guest.address ? guest.address.value : '');
            const phone = guest.phone || (guest.phone_number ? guest.phone_number.value : '');
            const car_number_plate = guest.car_number_plate || (guest.number_plate ? guest.number_plate.value : '');

            // Format the address with the postal code
            const postalCodeLine = postal_code ? `〒 ${postal_code}` : '〒';
            const addressLine = address || '';
            const formattedAddress = `${postalCodeLine}<br>　${addressLine}`;

            // ADDED: Guest number header
            guestsHtml += `
                <div class="grid-item label" style="grid-column: 1 / -1;">
                    宿泊者${index + 1}人目
                </div>
            `;

            // Adjusting column spans for name and vehicle number
            // Using a fallback for guest name and car number plate for consistency
            guestsHtml += `
                <div class="grid-item label" style="grid-column: 1 / span 1;"><span class="highlight">※</span>お名前</div>
                <div class="grid-item col-span-3">${name}</div>
                <div class="grid-item label" style="grid-column: 5 / span 1;"><span class="highlight">※</span>車両ナンバー</div>
                <div class="grid-item col-span-2">${car_number_plate}</div>

                <div class="grid-item label" style="grid-column: 1 / span 1; align-items: flex-start;"><span class="highlight">※</span>ご住所</div>
                <div class="grid-item col-span-6" style="align-items: flex-start;">${formattedAddress}</div>

                <div class="grid-item label" style="grid-column: 1 / span 1;"><span class="highlight">※</span>ご連絡先</div>
                <div class="grid-item col-span-6">${phone}</div>
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


        // Create a rooms object for a single reservation to use the common function
        const rooms = {
            [reservationId]: {
                details: [guestData], // assuming guestData has all detail properties
                room_number: guestData.room_numbers,
                smoking: guestData.smoking_preference,
                guests: new Map(guestData.guests.map(guest => [guest.client_id || guest.name, guest]))
            }
        };

        const allRoomsHtml = generateGuestListHTMLForRooms(rooms, guestListHTML, guestData);
        const { pdfBuffer, filename } = await generatePdf(allRoomsHtml, reservationId, false);

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
    try {
      const guestData = req.body;
      const guestListHTML = fs.readFileSync(
        path.join(__dirname, '../components/group-guest-list.html'),
        'utf-8'
      );
  
      // Build rooms object from flat guests array
      const rooms = {};
      guestData.guests.forEach(guest => {
        const roomNumber = guest.room_number || 'N/A';
        const smokingOption = guest.smoking_option || 'N/A';
        const selectedPlans = (guest.selected_plans || []).join(', ');
        const selectedParking = (guest.selected_parking || []).join(', ');
  
        if (!rooms[roomNumber]) {
          rooms[roomNumber] = {
            details: [
              {
                check_in: `${guestData.check_in_month || ''}-${guestData.check_in_day || ''}`,
                check_out: `${guestData.check_out_month || ''}-${guestData.check_out_day || ''}`,
                price: guestData.payment_total || 0
              }
            ],
            room_number: roomNumber,
            smoking: smokingOption,
            plan_names_list: selectedPlans,
            parking_lot_names_list: selectedParking,
            guests: new Map()
          };
        }
  
        const guestId = guest.client_name || guest.name || guest.number_plate;
        rooms[roomNumber].guests.set(guestId, guest);
      });
  
      const allRoomsHtml = generateGuestListHTMLForRooms(rooms, guestListHTML, guestData);
      const { pdfBuffer, filename } = await generatePdf(allRoomsHtml, 'group', true);
  
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Length': pdfBuffer.length,
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(pdfBuffer);
  
    } catch (error) {
      console.error("Error generating group guest list PDF:", error);
      res.status(500).send("Failed to generate PDF");
    }
  };
  
  

module.exports = {
  generateGuestList,
  generateGroupGuestList,
};
