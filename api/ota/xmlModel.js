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
const insertXMLRequest = async (requestId, hotel_id, name, xml) => {
    try {
        const pool = getPool(requestId);
        const result = await pool.query(
            "INSERT INTO xml_requests(hotel_id, name, request) VALUES($1, $2, $3) RETURNING *",
            [hotel_id, name, xml]
        );

        return result.rows;
    } catch (error) {
        console.error("Error adding XML request:", error.message);
        throw error;
    }
};
const insertXMLResponse = async (requestId, hotel_id, name, xml) => {
    try {
        const pool = getPool(requestId);
        const result = await pool.query(
            "INSERT INTO xml_responses(hotel_id, name, response) VALUES($1, $2, $3) RETURNING *",
            [hotel_id, name, xml]
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
        const res = await pool.query('SELECT * FROM xml_responses WHERE id = $1', [id]);
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

const selectXMLTemplate = async (requestId, hotel_id, name) => {
    try {
        const pool = getPool(requestId);
        
        const result = await pool.query(
            "SELECT template FROM xml_templates WHERE name = $1",
            [name]
        );
        if (result.rows.length === 0) {
            throw new Error("XML template not found in database.");
        }

        const login = await pool.query(
            `SELECT user_id, password 
                FROM sc_user_info 
                WHERE hotel_id = $1 AND name = 'TL-リンカーン'
            `, [hotel_id]
        );
        if (login.rows.length === 0) {
            throw new Error("Site Controller login info not found in database.");
        }

        let xml = result.rows[0].template;

        // Validate environment variables
        if (!process.env.XML_SYSTEM_ID || !process.env.XML_REQUEST_URL) {
            throw new Error("Missing required environment variables in .env file.");
        }

        // Replace placeholders
        xml = xml.replace("{{systemId}}", process.env.XML_SYSTEM_ID)
                 .replace("{{pmsUserId}}", login.rows[0].user_id)
                 .replace("{{pmsPassword}}", login.rows[0].password)

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
            `
                SELECT xml_responses.*, hotels.formal_name as hotel_formal_name, hotels.name as hotel_name
                FROM 
                    xml_responses 
                        LEFT JOIN
                    hotels
                        ON xml_responses.hotel_id = hotels.id
                ORDER BY received_at DESC LIMIT 50
            `
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
                    hotel_id: row.hotel_id,
                    hotel_formal_name: row.hotel_formal_name,
                    hotel_name: row.hotel_name,
                    received_at: row.received_at, 
                    name: row.name, 
                    status: status, 
                    response: parsedResponse['S:Envelope']['S:Body']['ns2:executeResponse']['return'] 
                };
            } catch (parseError) {
                console.error('Error parsing XML:', parseError);
                return { 
                    hotel_id: row.hotel_id,
                    hotel_formal_name: row.hotel_formal_name,
                    hotel_name: row.hotel_name,
                    received_at: row.received_at, 
                    name: row.name, 
                    status: status, 
                    response: null, 
                    parseError: parseError.message 
                };                
            }
        }));

        return parsedRows;        

    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

const selectTLRoomMaster = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = `
        SELECT * 
        FROM sc_tl_rooms 
        WHERE hotel_id = $1
    `;
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error finding master by hotel_id:', err);
        throw new Error('Database error');
    }
};
const insertTLRoomMaster = async (requestId, data) => {
    const pool = getPool(requestId);
    const client = await pool.connect();

    console.log('insertTLRoomMaster', data)

    try {
        await client.query('BEGIN');

        // Delete existing records for the hotel_id
        await pool.query('DELETE FROM sc_tl_rooms WHERE hotel_id = $1', [data[0].hotel_id]);

        // Insert the new records
        const results = [];
        for (const item of data) {
            const result = await client.query(
                `INSERT INTO sc_tl_rooms(hotel_id, room_type_id, rmTypeCode, rmTypeName, netRmTypeGroupCode, netRmTypeGroupName, agtCode, netAgtRmTypeCode, netAgtRmTypeName, isStockAdjustable, lincolnUseFlag) 
                VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
                [
                    item.hotel_id,
                    item.room_type_id,
                    item.rmtypecode,
                    item.rmtypename,
                    item.netrmtypegroupcode,
                    item.netrmtypegroupname,
                    item.agtcode,
                    item.netagtrmtypecode,
                    item.netagtrmtypename,
                    item.isstockadjustable,
                    item.lincolnuseflag,
                ]
            );
            results.push(result.rows[0]);
        };

        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding room master:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

const selectTLPlanMaster = async (requestId, hotel_id) => {
    const pool = getPool(requestId);
    const query = `
        SELECT * 
        FROM sc_tl_plans
        WHERE hotel_id = $1
    `;
    const values = [hotel_id];

    try {
        const result = await pool.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error finding master by hotel_id:', err);
        throw new Error('Database error');
    }
};
const insertTLPlanMaster = async (requestId, data) => {
    const pool = getPool(requestId);
    const client = await pool.connect();

    console.log('insertTLRoomMaster', data)

    try {
        await client.query('BEGIN');

        // Delete existing records for the hotel_id
        await pool.query('DELETE FROM sc_tl_plans WHERE hotel_id = $1', [data[0].hotel_id]);

        // Insert the new records
        const results = [];
        for (const item of data) {
            const result = await client.query(
                `INSERT INTO sc_tl_plans(hotel_id, plans_global_id, plans_hotel_id, planGroupCode, planGroupName) 
                VALUES($1, $2, $3, $4, $5) RETURNING *`,
                [
                    item.hotel_id,
                    item.plans_global_id,
                    item.plans_hotel_id,
                    item.plangroupcode,
                    item.plangroupname,                    
                ]
            );
            results.push(result.rows[0]);
        };
        
        await client.query('COMMIT');
        return results;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding plan master:', error.message);
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    insertXMLRequest,
    insertXMLResponse,
    processXMLResponse,
    selectXMLTemplate,
    selectXMLRecentResponses,
    selectTLRoomMaster,
    insertTLRoomMaster,
    selectTLPlanMaster,
    insertTLPlanMaster,
};