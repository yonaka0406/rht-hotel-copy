require("dotenv").config();
const xml2js = require('xml2js');
const { selectXMLTemplate, selectXMLRecentResponses, insertXMLRequest, insertXMLResponse, selectTLRoomMaster, insertTLRoomMaster } = require('../ota/xmlModel');
const { getAllHotelSiteController } = require('../models/hotel');

// GET
const getXMLTemplate = async (req, res) => {
    const hotel_id = req.params.hotel_id;
    const name = req.params.name;
    
    try {
        const template = await selectXMLTemplate(req.requestId, hotel_id, name);
        res.send(template);
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};
const getXMLRecentResponses = async (req, res) => {
    try {
        const responses = await selectXMLRecentResponses(req.requestId);
        res.json(responses);        
    } catch (error) {
        console.error('Error getting xml responses:', error);
        res.status(500).json({ error: error.message });
    }
};

// POST
const postXMLResponse = async (req, res) => {    
    const { hotel_id, name } = req.params;
    const xml = req.body.toString('utf8');

    console.log('postXMLResponse', req.params, xml);

    try {
        const parser = new xml2js.Parser();
        parser.parseString(xml, async (err, result) => {
            if (err) {
                console.error('Error parsing XML:', err);
                return res.status(400).json({ error: 'Invalid XML' });
            }
            console.log('Parsed XML:', result);

            try {
                const responseXml = await submitXMLTemplate(req, res, hotel_id, name, xml);
                console.log('XML response added successfully', responseXml);
                res.json({ response: 'XML response added successfully', data: responseXml });
            } catch (error) {
                console.error('Error in submitXMLTemplate:', error);
                res.status(500).json({ error: error.message });
            }

        });
    } catch (error) {
        console.error('Error getting xml template:', error);
        res.status(500).json({ error: error.message });
    }
};

// Lincoln
const submitXMLTemplate = async (req, res, hotel_id, name, xml) => {
    // console.log('submitXMLTemplate', name, xml);    
    
    try {        
        // Save the request in the database
        await insertXMLRequest(req.requestId, hotel_id, name, xml);

        const url = `${process.env.XML_REQUEST_URL}${name}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {                
                'Content-Type': 'text/xml',
            },
            body: xml,
        });
        if (!response.ok) {
            const errorText = await response.text(); // Get the error response body
            console.error('API Error:', response.status, response.statusText, errorText); // Log detailed error
            throw new Error(`Failed to submit XML template: ${response.status} ${response.statusText} ${errorText}`);
        }

        // Save the response using insertXMLResponse
        const responseXml = await response.text();
        // console.log('Response XML:', responseXml);
        console.log('Inserting XML response into database...');
        await insertXMLResponse(req.requestId, hotel_id, name, responseXml);

        // Parse the XML response using xml2js
        const parsedJson = new Promise((resolve, reject) => {
            xml2js.parseString(responseXml, { explicitArray: false }, (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
            });
        });
        return parsedJson;        
    } catch (error) {
        console.error('Failed to submit XML template', error);
    } 
};
const getTLRoomMaster = async (req, res) => {
    const hotel_id = req.params.hotel_id;

    try {
        const master = await selectTLRoomMaster(req.requestId, hotel_id);
        res.send(master);
    } catch (error) {
        console.error('Error getting TL data:', error);
        res.status(500).json({ error: error.message });
    }
};
const createTLRoomMaster = async (req, res) => {    
    const data = req.body;
    
    try {
        const master = await insertTLRoomMaster(req.requestId, data);
        res.json(master);
    } catch (err) {
        console.error('Error creating master:', err);
        res.status(500).json({ error: 'Failed to create master' });
    }
};

const getOTAReservations = async (req, res) => {
    const name = 'BookingInfoOutputService';

    try {
        const hotels = await getAllHotelSiteController(req.requestId);
        if (!hotels || hotels.length === 0) {
            return res.status(404).send({ error: 'No hotels found.' });
        }

        for (const hotel of hotels) {
            const hotel_id = hotel.hotel_id; 

            const template = await selectXMLTemplate(req.requestId, hotel_id, name);
            if (!template) {
                console.warn(`XML template not found for hotel_id: ${hotel_id}`);
                continue; // Skip to next hotel
            }

            // Fetch the data
            const reservations = await submitXMLTemplate(req, res, hotel_id, name, template);
            console.log('getOTAReservations reservations', reservations);

            const executeResponse = reservations['S:Envelope']['S:Body']['ns2:executeResponse'];
            console.log('getOTAReservations executeResponse', executeResponse);

            const bookingInfoListWrapper = executeResponse?.return?.bookingInfoList;
            const bookingInfoList = Array.isArray(bookingInfoListWrapper) ? bookingInfoListWrapper : [bookingInfoListWrapper];
            console.log('getOTAReservations bookingInfoList', bookingInfoList);

            if (!bookingInfoList || bookingInfoList.length === 0 || bookingInfoList[0] === null) {
                console.log('No booking information found in the response.');
                return [];
            }

            const parsedReservations = [];
            // Process each bookingInfo to parse the inner infoTravelXML
            for (const bookingInfo of Array.isArray(bookingInfoList) ? bookingInfoList : [bookingInfoList]) {
                const infoTravelXML = bookingInfo.infoTravelXML;
        
                if (infoTravelXML) {
                try {
                    const parsedXML = await new Promise((resolve, reject) => {
                    xml2js.parseString(infoTravelXML, { explicitArray: false }, (err, result) => {
                        if (err) {
                        reject(err);
                        } else {
                        resolve(result);
                        }
                    });
                    });
                    parsedReservations.push(parsedXML);
                } catch (parseError) {
                    console.error('Error parsing infoTravelXML:', parseError);
                    // Handle the error appropriately, e.g., skip this reservation or log the error
                }
                }
            };        
            console.log('Parsed Reservations:', parsedReservations);

            // Send OK to OTA server
            // await successOTAReservations(req, res, hotel_id);
        }

        return res.status(200).send({ message: 'Processed all hotels.' });
    } catch (error) {
        console.error('Error in getOTAReservations:', error);
        return res.status(500).send({ error: 'An error occurred while processing hotels.' });
    }

    

};
const successOTAReservations = async (req, res, hotel_id) => {
    const name = 'OutputCompleteService';

    try {
        const template = await selectXMLTemplate(req.requestId, hotel_id, name);
        await submitXMLTemplate(req, res, hotel_id, name, template);
    } catch (error) {        
        console.error('Error in successOTAReservations:', error);
        return res.status(500).send({ error: 'An error occurred while processing hotel response.' });
    }
};
const updateInventoryMultipleDays = async (req, res) => {
    const hotel_id = req.params.hotel_id;
    const log_id = req.params.log_id;
    const inventory = req.body;

    const name = 'NetStockBulkAdjustmentService';

    // console.log('updateInventoryMultipleDays:', hotel_id, name);

    const template = await selectXMLTemplate(req.requestId, hotel_id, name);
    if (!template) {
        return res.status(500).send({ error: 'XML template not found.' });
    }
    // console.log('updateInventoryMultipleDays selectXMLTemplate:', template);

    // Filter out entries older than the current date
    const currentDate = (() => {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    })();    
    
    let filteredInventory = inventory.filter((item) => {
        const itemDate = (() => {
            const date = new Date(item.date);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}${month}${day}`;
        })();

        console.log('itemDate:', itemDate, itemDate >= currentDate);

        return itemDate >= currentDate;
    });

    // console.log('filteredInventory', filteredInventory);

    const processInventoryBatch = async (batch, batch_no) => {
        let adjustmentTargetXml = '';
        batch.forEach((item) => {
            const adjustmentDate = (() => {
                const date = new Date(item.date);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}${month}${day}`;
            })();
            let remainingCount = parseInt(item.total_rooms) - parseInt(item.room_count);
            remainingCount = remainingCount < 0 ? 0 : remainingCount;

            let target = `
                <adjustmentTarget>
                    <adjustmentProcedureCode>1</adjustmentProcedureCode>
                    <netRmTypeGroupCode>${item.netrmtypegroupcode}</netRmTypeGroupCode>
                    <adjustmentDate>${adjustmentDate}</adjustmentDate>
                    <remainingCount>${remainingCount}</remainingCount>
                    <salesStatus>3</salesStatus>
                </adjustmentTarget>
            `;
            adjustmentTargetXml += target;
        });

        let xmlBody = template.replace(
            `<adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate}}</adjustmentDate>
               <remainingCount>{{remainingCount}}</remainingCount>
               <salesStatus>{{salesStatus}}</salesStatus>               
            </adjustmentTarget>
            <adjustmentTarget>
               <adjustmentProcedureCode>{{adjustmentProcedureCode2}}</adjustmentProcedureCode>
               <netRmTypeGroupCode>{{netRmTypeGroupCode2}}</netRmTypeGroupCode>
               <adjustmentDate>{{adjustmentDate2}}</adjustmentDate>
               <remainingCount>{{remainingCount2}}</remainingCount>
               <salesStatus>{{salesStatus2}}</salesStatus>               
            </adjustmentTarget>`,
            adjustmentTargetXml
        );

        let requestId = log_id + (batch_no / 100);
        requestId = requestId.toString();
        if (requestId.length > 8) {
            requestId = requestId.slice(-8); // keep the last 8 characters
        }
        xmlBody = xmlBody.replace('{{requestId}}', requestId);

        // console.log('updateInventoryMultipleDays xmlBody:', xmlBody);

        try {
            const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
            await delay(1000); // 1-second pause
            const apiResponse = await submitXMLTemplate(req, res, hotel_id, name, xmlBody);
        } catch (error) {
            
        }
        
    };
    const getInventoryDateRange = (inventory) => {
        if (inventory.length === 0) return { minDate: null, maxDate: null };

        const dates = inventory.map((item) => new Date(item.date));
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        return { minDate, maxDate };
    };
    const dateRangeExceeds30Days = (minDate, maxDate) => {
        if (!minDate || !maxDate) return false;

        const timeDiff = Math.abs(maxDate.getTime() - minDate.getTime());
        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return daysDiff > 30;
    };

    const { minDate, maxDate } = getInventoryDateRange(filteredInventory);
    const exceeds30Days = dateRangeExceeds30Days(minDate, maxDate);
    
    if (filteredInventory.length > 1000 || exceeds30Days) {        
        const batchSize = 30;
        let requestNumber = 0;
        for (let i = 0; i < filteredInventory.length; i += batchSize) {            
            const batch = filteredInventory.slice(i, i + batchSize);
            await processInventoryBatch(batch, requestNumber);
            requestNumber++;
        }
    } else {
        await processInventoryBatch(filteredInventory, 0);
    }

    res.status(200).send({ message: 'Inventory update processed.' });                

};

module.exports = {
    getXMLTemplate,
    getXMLRecentResponses,
    postXMLResponse,
    submitXMLTemplate,
    getTLRoomMaster,
    createTLRoomMaster,
    getOTAReservations,
    successOTAReservations,
    updateInventoryMultipleDays,
};