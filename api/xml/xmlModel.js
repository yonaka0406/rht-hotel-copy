require("dotenv").config();
const xml2js = require('xml2js');
const { getPool } = require("../config/database");

/*
Add to .env
XML_SYSTEM_ID=XXXXXXXX
XML_USER_ID=P2823341
XML_PASSWORD=g?Z+yy5U5!LR
XML_REQUEST_URL=https://www.tl-lincoln.net/pmsservice/V1/
*/
const insertXMLRequest = async (requestId, name, xml) => {
    try {
        const pool = getPool(requestId);
        const result = await pool.query(
            "INSERT INTO xml_requests(name, request) VALUES($1, $2) RETURNING *",
            [name, xml]
        );

        return result.rows;
    } catch (error) {
        console.error("Error adding XML request:", error.message);
        throw error;
    }
};
const insertXMLResponse = async (requestId, name, xml) => {
    try {
        const pool = getPool(requestId);
        const result = await pool.query(
            "INSERT INTO xml_responses(name, response) VALUES($1, $2) RETURNING *",
            [name, xml]
        );

        return result.rows;
    } catch (error) {
        console.error("Error adding XML response:", error.message);
        throw error;
    }
};


const processXMLResponse = async (requestId, id) => {
    try {
        const pool = getPool(requestId);
        // 1. Retrieve the id response from xml_responses        
        const res = await pool.query('SELECT id, name, response FROM xml_responses WHERE id = $1', [id]);
        if (res.rows.length === 0) {
            console.log('No XML responses found.');
            return;
        }
        const { id, name, response } = res.rows[0];
        console.log(`Processing response ID: ${id} - Name: ${name}`);

        // 2. Parse SOAP XML response
        const parser = new xml2js.Parser({ explicitArray: false });
        parser.parseString(response, async (err, result) => {
            if (err) {
                console.error('Error parsing SOAP XML:', err);
                return;
            }
            const body = result['S:Envelope']['S:Body'];
            if (!body || !body['ns2:executeResponse']) {
                console.error('Invalid response format.');
                return;
            }

            // Extract `infoTravelXML` data
            const returnData = body['ns2:executeResponse']['return'];
            if (!returnData || !returnData.bookingInfoList || !returnData.bookingInfoList.infoTravelXML) {
                console.error('No booking information found.');
                return;
            }
            const infoTravelXML = returnData.bookingInfoList.infoTravelXML;

            // 3. Parse extracted `infoTravelXML`
            parser.parseString(infoTravelXML, async (err, bookingData) => {
                if (err) {
                    console.error('Error parsing booking XML:', err);
                    return;
                }
                console.log('Parsed Booking Data:', JSON.stringify(bookingData, null, 2));

                const basicInfo = bookingData.AllotmentBookingReport.BasicInformation;
                if (!basicInfo) {
                    console.error('No basic booking information found.');
                    return;
                }

                // Extract required fields
                const travelAgencyBookingNumber = basicInfo.TravelAgencyBookingNumber;
                const travelAgencyBookingDate = basicInfo.TravelAgencyBookingDate;
                const guestName = basicInfo.GuestOrGroupNameSingleByte;
                const checkInDate = basicInfo.CheckInDate;
                const checkInTime = basicInfo.CheckInTime;
                const nights = parseInt(basicInfo.Nights, 10);
                const totalRoomCount = parseInt(basicInfo.TotalRoomCount, 10);
                const grandTotalPaxCount = parseInt(basicInfo.GrandTotalPaxCount, 10);
                const packagePlanName = basicInfo.PackagePlanName;
                const mealCondition = basicInfo.MealCondition;
            });
        });

    } catch (error) {
        console.error('Database error:', error);
    }
};

const selectXMLTemplate = async (requestId, name) => {
    try {
        const pool = getPool(requestId);
        
        const result = await pool.query(
            "SELECT template FROM xml_templates WHERE name = $1",
            [name]
        );

        if (result.rows.length === 0) {
            throw new Error("XML template not found in database.");
        }

        let xml = result.rows[0].template;

        // Validate environment variables
        if (!process.env.XML_SYSTEM_ID || !process.env.XML_USER_ID || !process.env.XML_PASSWORD) {
            throw new Error("Missing required environment variables in .env file.");
        }

        // Replace placeholders
        xml = xml.replace("{{systemId}}", process.env.XML_SYSTEM_ID)
                 .replace("{{pmsUserId}}", process.env.XML_USER_ID)
                 .replace("{{pmsPassword}}", process.env.XML_PASSWORD)                 

        return xml;
    } catch (error) {
        console.error("Error selecting XML template:", error.message);
        throw error; // Rethrow to be handled by the caller
    }
};
const selectXMLRecentResponses = async (requestId) => {
    const pool = getPool(requestId);

    try {
        const result = await pool.query(
            "SELECT * FROM xml_responses ORDER BY received_at DESC LIMIT 50"
        );

        const rows = result.rows;        
        const parser = new xml2js.Parser({ explicitArray: false });
        const parsedRows = await Promise.all(rows.map(async (row) => {
            let status = '不明';
            try {
                const parsedResponse = await parser.parseStringPromise(row.response);
                // Extract status
                status = parsedResponse['S:Envelope']['S:Body']['ns2:executeResponse']['return']['commonResponse']['isSuccess'] === 'true' ? '成功' : 'エラー';                
                
                return { 
                    received_at: row.received_at, 
                    name: row.name, 
                    status: status, 
                    response: parsedResponse['S:Envelope']['S:Body']['ns2:executeResponse']['return'] 
                };
            } catch (parseError) {
                console.error('Error parsing XML:', parseError);
                return { received_at: row.received_at, name: row.name, status: status, response: null, parseError: parseError.message };                
            }
        }));

        return parsedRows;        

    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

module.exports = { 
    insertXMLRequest,
    insertXMLResponse,
    processXMLResponse,
    selectXMLTemplate,
    selectXMLRecentResponses,
};