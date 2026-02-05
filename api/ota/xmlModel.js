require("dotenv").config();
const xml2js = require('xml2js');
const { getPool, getProdPool } = require("../config/database");
const logger = require('../config/logger');

/*
Add to .env
XML_SYSTEM_ID=XXXXXXXX
XML_USER_ID=P2823341
XML_PASSWORD=g?Z+yy5U5!LR
XML_REQUEST_URL=https://www.tl-lincoln.net/pmsservice/V1/
*/
const insertXMLRequest = async (requestId, hotel_id, name, xml, dbClient = null) => {
    try {
        const executor = dbClient || getPool(requestId);
        const result = await executor.query(
            "INSERT INTO xml_requests(hotel_id, name, request) VALUES($1, $2, $3) RETURNING *",
            [hotel_id, name, xml]
        );

        return result.rows;
    } catch (error) {
        console.error("Error adding XML request:", error.message);
        throw error;
    }
};
const insertXMLResponse = async (requestId, hotel_id, name, xml, dbClient = null) => {
    try {
        const executor = dbClient || getPool(requestId);
        const result = await executor.query(
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
            const error = new Error('No XML responses found.');
            console.error(error.message);
            throw error;
        }
        const { id: responseId, name, response } = res.rows[0];
        console.log(`Processing response ID: ${responseId} - Name: ${name}`);

        // 2. Parse the SOAP XML response using the same approach as submitXMLTemplate
        const parseXML = (xml) => {
            return new Promise((resolve, reject) => {
                xml2js.parseString(xml, { explicitArray: false }, (err, result) => {
                    if (err) {
                        console.error('Error parsing XML:', err);
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        };

        try {
            // Parse the main SOAP response
            const result = await parseXML(response);
            const body = result?.['S:Envelope']?.['S:Body'];

            if (!body || !body['ns2:executeResponse']) {
                throw new Error('Invalid response format: Missing S:Envelope.S:Body.ns2:executeResponse');
            }

            // Extract `infoTravelXML` data
            const returnData = body['ns2:executeResponse']?.['return'];

            // Check if bookingInfoList exists and is an array with at least one item
            if (!returnData?.bookingInfoList || !Array.isArray(returnData.bookingInfoList) || returnData.bookingInfoList.length === 0) {
                console.log('No valid bookingInfoList array found in returnData. Return data keys:', Object.keys(returnData || {}));
                throw new Error('No booking information found in the response');
            }

            // Get the first booking info item (assuming it's the one we want)
            const firstBookingInfo = returnData.bookingInfoList[0];

            if (!firstBookingInfo?.infoTravelXML) {
                console.log('No infoTravelXML found in the first booking info item. Booking info keys:', Object.keys(firstBookingInfo || {}));
                throw new Error('No booking information found in the response');
            }

            // The infoTravelXML might be a string or an object with _text property
            let infoTravelXML = firstBookingInfo.infoTravelXML;

            // If it's an object with _text property (from CDATA), use that
            if (typeof infoTravelXML === 'object' && infoTravelXML._text) {
                infoTravelXML = infoTravelXML._text;
            }

            // If it's still not a string, try to stringify it
            if (typeof infoTravelXML !== 'string') {
                infoTravelXML = JSON.stringify(infoTravelXML);
            }

            // Parse the inner booking XML
            const bookingData = await parseXML(infoTravelXML);
            const allotmentBookingReport = bookingData?.AllotmentBookingReport;

            if (!allotmentBookingReport) {
                console.error('No AllotmentBookingReport found in the XML. Booking data keys:', Object.keys(bookingData || {}));
                throw new Error('No AllotmentBookingReport found in the XML');
            }

            // Extract the transaction type and basic info
            const transactionType = allotmentBookingReport.TransactionType || {};
            const dataClassification = transactionType.DataClassification;

            if (!dataClassification) {
                console.error('Could not determine report type. TransactionType:', transactionType);
                throw new Error('Could not determine report type: Missing DataClassification');
            }

            const basicInfo = allotmentBookingReport.BasicInformation || {};
            const commonData = {
                responseId,
                name,
                reportType: dataClassification,
                travelAgencyBookingNumber: basicInfo.TravelAgencyBookingNumber,
                travelAgencyBookingDate: basicInfo.TravelAgencyBookingDate,
                guestName: basicInfo.GuestOrGroupNameSingleByte,
                checkInDate: basicInfo.CheckInDate,
                checkInTime: basicInfo.CheckInTime,
                nights: basicInfo.Nights ? parseInt(basicInfo.Nights, 10) : 0,
                totalRoomCount: basicInfo.TotalRoomCount ? parseInt(basicInfo.TotalRoomCount, 10) : 0,
                grandTotalPaxCount: basicInfo.GrandTotalPaxCount ? parseInt(basicInfo.GrandTotalPaxCount, 10) : 0,
                packagePlanName: basicInfo.PackagePlanName,
                mealCondition: basicInfo.MealCondition,
                rawResponse: response,
                parsedData: allotmentBookingReport
            };

            // Handle different report types
            switch (dataClassification) {
                case 'NewBookReport':
                    return {
                        success: true,
                        type: 'reservation',
                        action: 'new',
                        ...commonData
                    };

                case 'ModificationReport':
                    return {
                        success: true,
                        type: 'reservation',
                        action: 'modified',
                        ...commonData
                    };

                case 'CancellationReport':
                    return {
                        success: true,
                        type: 'cancellation',
                        action: 'cancelled',
                        ...commonData,
                        cancellationDate: transactionType.SystemDate,
                        cancellationNumber: transactionType.DataID
                    };

                default:
                    console.warn(`Unhandled report type: ${dataClassification}`);
                    return {
                        success: false,
                        error: `Unsupported report type: ${dataClassification}`,
                        type: 'unknown',
                        action: 'unknown',
                        ...commonData
                    };
            }

        } catch (parseError) {
            console.error('Error parsing XML:', parseError);
            throw new Error(`Failed to parse XML response: ${parseError.message}`);
        }
    } catch (error) {
        console.error('Error processing XML response:', error);
        return {
            success: false,
            error: error.message,
            responseId: id
        };
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
            .replace("{{pmsPassword}}", login.rows[0].password);

        return xml;
    } catch (error) {
        console.error(`Error selecting XML template for hotel_id ${hotel_id} and name ${name}:`, error.message);
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

const selectTLRoomMaster = async (requestId, hotel_id, client = null) => {
    const pool = getPool(requestId);
    const query = `
        SELECT * 
        FROM sc_tl_rooms 
        WHERE hotel_id = $1
    `;
    const values = [hotel_id];

    try {
        const executor = client ? client : pool;
        const result = await executor.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error finding master by hotel_id:', err);
        throw new Error('Database error');
    }
};
const insertTLRoomMaster = async (requestId, data, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    if (!Array.isArray(data) || data.length === 0 || !data[0].hotel_id) {
        if (shouldRelease) client.release();
        throw new Error('Invalid or empty data provided to insertTLRoomMaster');
    }

    // console.log('insertTLRoomMaster', data)

    try {
        if (shouldRelease) await client.query('BEGIN');

        // Delete existing records for the hotel_id
        await client.query('DELETE FROM sc_tl_rooms WHERE hotel_id = $1', [data[0].hotel_id]);

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

        if (shouldRelease) await client.query('COMMIT');
        return results;
    } catch (error) {
        if (shouldRelease) await client.query('ROLLBACK');
        console.error('Error adding room master:', error.message);
        throw error;
    } finally {
        if (shouldRelease) client.release();
    }
};

const selectTLPlanMaster = async (requestId, hotel_id, client = null) => {
    const pool = getPool(requestId);
    const query = `
        SELECT * 
        FROM sc_tl_plans
        WHERE hotel_id = $1
    `;
    const values = [hotel_id];

    try {
        const executor = client ? client : pool;
        const result = await executor.query(query, values);
        return result.rows;
    } catch (err) {
        console.error('Error finding master by hotel_id:', err);
        throw new Error('Database error');
    }
};
const insertTLPlanMaster = async (requestId, data, dbClient = null) => {
    const pool = getPool(requestId);
    const client = dbClient || await pool.connect();
    const shouldRelease = !dbClient;

    if (!Array.isArray(data) || data.length === 0 || !data[0].hotel_id) {
        if (shouldRelease) client.release();
        throw new Error('Invalid or empty data provided to insertTLPlanMaster');
    }

    // 受信したデータをログ出力
    console.log('[insertTLPlanMaster] 受信したデータ:', JSON.stringify(data, null, 2));
    
    // 各アイテムの詳細をログ出力
    data.forEach((item, index) => {
        console.log(`[insertTLPlanMaster] アイテム ${index}:`, {
            hotel_id: item.hotel_id,
            plangroupcode: item.plangroupcode,
            plangroupname: item.plangroupname,
            plan_key: item.plan_key,
            plans_global_id: item.plans_global_id,
            plans_hotel_id: item.plans_hotel_id
        });
    });

    try {
        if (shouldRelease) await client.query('BEGIN');

        // Delete existing records for the hotel_id
        await client.query('DELETE FROM sc_tl_plans WHERE hotel_id = $1', [data[0].hotel_id]);

        // Insert the new records
        const results = [];
        for (const item of data) {
            console.log(`[insertTLPlanMaster] 挿入中: ${item.plangroupcode} "${item.plangroupname}"`, {
                plans_global_id: item.plans_global_id,
                plans_hotel_id: item.plans_hotel_id,
                plan_key: item.plan_key
            });
            
            const result = await client.query(
                `INSERT INTO sc_tl_plans(hotel_id, plans_global_id, plans_hotel_id, plan_key, planGroupCode, planGroupName) 
                VALUES($1, $2, $3, $4, $5, $6) RETURNING *`,
                [
                    item.hotel_id,
                    item.plans_global_id,
                    item.plans_hotel_id,
                    item.plan_key,
                    item.plangroupcode,
                    item.plangroupname,
                ]
            );
            
            console.log(`[insertTLPlanMaster] 挿入結果:`, result.rows[0]);
            results.push(result.rows[0]);
        };

        if (shouldRelease) await client.query('COMMIT');
        console.log(`[insertTLPlanMaster] 全${results.length}件の挿入完了`);
        return results;
    } catch (error) {
        if (shouldRelease) await client.query('ROLLBACK');
        console.error('Error adding plan master:', error.message);
        throw error;
    } finally {
        if (shouldRelease) client.release();
    }
};

/**
 * Add a reservation to the OTA reservation queue
 * @param {string} requestId - Request ID for logging
 * @param {object} options - Options object
 * @param {number} options.hotelId - Hotel ID
 * @param {string} options.otaReservationId - OTA's reservation ID
 * @param {string} options.transactionId - Unique transaction ID from OTA
 * @param {object} options.reservationData - Parsed reservation data
 * @param {string} [options.status='pending'] - Status of the reservation (pending/processed/failed)
 * @param {object} [options.conflictDetails=null] - Details of any conflicts
 * @returns {Promise<object>} The created/updated queue entry
 */
const insertOTAReservationQueue = async (requestId, {
    hotelId,
    otaReservationId,
    transactionId,
    reservationData,
    status = 'pending',
    conflictDetails = null
}) => {
    const pool = getPool(requestId);

    try {
        const result = await pool.query(
            `INSERT INTO ota_reservation_queue 
             (hotel_id, ota_reservation_id, transaction_id, reservation_data, status, conflict_details)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (hotel_id, transaction_id) 
             DO UPDATE SET
                 status = EXCLUDED.status,
                 conflict_details = COALESCE(EXCLUDED.conflict_details, ota_reservation_queue.conflict_details),
                 updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [
                hotelId,
                otaReservationId,
                transactionId,
                reservationData,
                status,
                conflictDetails
            ]
        );

        return result.rows[0];
    } catch (error) {
        console.error('Error in insertOTAReservationQueue:', error);
        throw error;
    }
};

/**
 * Update the status of a reservation in the OTA queue
 * @param {string} requestId - Request ID for logging
 * @param {number} id - Queue entry ID
 * @param {string} status - New status (pending/processed/failed)
 * @param {object} [conflictDetails=null] - Optional conflict details
 * @returns {Promise<object>} The updated queue entry
 */
const updateOTAReservationQueue = async (requestId, id, status, conflictDetails = null) => {
    const pool = getPool(requestId);

    try {
        const result = await pool.query(
            `UPDATE ota_reservation_queue 
             SET status = $1, 
                 conflict_details = COALESCE($2, conflict_details),
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [status, conflictDetails, id]
        );

        if (result.rows.length === 0) {
            throw new Error(`No reservation found with ID: ${id}`);
        }

        return result.rows[0];
    } catch (error) {
        console.error('Error in updateOTAReservationQueue:', error);
        throw error;
    }
};

// Constants for query limits
const OTA_QUEUE_DEFAULT_LIMIT = 100;
const OTA_QUEUE_SEARCH_LIMIT = 500;

const selectOTAReservationQueue = async (requestId, searchTerm = null) => {
    const pool = getPool(requestId);
    try {
        let whereClause = '';
        let params = [];

        if (searchTerm) {
            whereClause = `
                WHERE oq.ota_reservation_id ILIKE $1 
                OR oq.reservation_data->'BasicInformation'->>'GuestOrGroupNameSingleByte' ILIKE $1
            `;
            params.push(`%${searchTerm}%`);
        }

        // Use larger limit for searches, smaller for default view
        const limit = searchTerm ? OTA_QUEUE_SEARCH_LIMIT : OTA_QUEUE_DEFAULT_LIMIT;

        let query = `
            SELECT
                oq.id,
                oq.hotel_id,
                h.name as hotel_name,
                oq.ota_reservation_id,
                oq.status,
                oq.created_at,
                oq.reservation_data,
                oq.reservation_data->'TransactionType'->>'DataClassification' as data_classification,
                oq.reservation_data->'BasicInformation'->>'GuestOrGroupNameSingleByte' as booker_name
            FROM
                ota_reservation_queue oq
            JOIN
                hotels h ON oq.hotel_id = h.id
            ${whereClause}
            ORDER BY oq.created_at DESC 
            LIMIT ${limit}
        `;
        const result = await pool.query(query, params);
        return result.rows;
    } catch (error) {
        console.error('Error in selectOTAReservationQueue:', error);
        throw error;
    }
};

const insertOTAXmlQueue = async (requestId, { hotel_id, service_name, xml_body, current_request_id }, dbClient = null) => {
    const executor = dbClient || getProdPool();
    try {
        const result = await executor.query(
            `INSERT INTO ota_xml_queue 
             (hotel_id, service_name, xml_body, current_request_id, status, retries)
             VALUES ($1, $2, $3, $4, 'pending', 0)
             RETURNING *`,
            [hotel_id, service_name, xml_body, current_request_id]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error in insertOTAXmlQueue:', error);
        throw error;
    }
};

const updateOTAXmlQueue = async (requestId, id, status, error = null, dbClient = null) => {
    const executor = dbClient || getProdPool();
    try {
        let setClauses = [`status = $1`, `last_error = $2`];
        let values = [status, error, id];

        if (status === 'failed') {
            setClauses.push(`retries = retries + 1`);
            setClauses.push(`processed_at = CURRENT_TIMESTAMP`);
        } else if (status === 'completed') {
            setClauses.push(`processed_at = CURRENT_TIMESTAMP`);
        } else if (status === 'pending') {
            setClauses.push(`retries = retries + 1`); // Increment retries when going back to pending
            // processed_at should not be updated here
        }
        // For 'processing' status, processed_at is set in fetchPendingRequests, no need to update here.

        const query = `UPDATE ota_xml_queue SET ${setClauses.join(', ')} WHERE id = $3 RETURNING *`;

        const result = await executor.query(query, values);
        if (result.rows.length === 0) {
            throw new Error(`No OTA XML queue item found with ID: ${id}`);
        }
        return result.rows[0];
    } catch (updateError) {
        console.error('Error updating OTA XML queue status:', { requestId, id, status, error: updateError.message, stack: updateError.stack });
        throw updateError;
    }
};

const selectOTAXmlQueue = async (requestId) => {
    const pool = getPool(requestId);
    try {
        const query = `
      SELECT DISTINCT
        id,
        status,
        retries,
        last_error,
        created_at,
        processed_at,
        hotel_name,
        xml_body
      FROM (
        (SELECT
            oq.id,
            oq.status,
            oq.retries,
            oq.last_error,
            oq.created_at,
            oq.processed_at,
            h.name AS hotel_name,
            oq.xml_body
        FROM ota_xml_queue oq
        JOIN hotels h ON oq.hotel_id = h.id
        ORDER BY oq.created_at DESC
        LIMIT 100)
        UNION
        (SELECT
            oq.id,
            oq.status,
            oq.retries,
            oq.last_error,
            oq.created_at,
            oq.processed_at,
            h.name AS hotel_name,
            oq.xml_body
        FROM ota_xml_queue oq
        JOIN hotels h ON oq.hotel_id = h.id
        WHERE oq.status <> 'completed')
      ) AS combined_queue
      ORDER BY created_at DESC;
    `;

        const result = await pool.query(query);
        return result.rows;
    } catch (error) {
        logger.error(`[${requestId}] Error in selectOTAXmlQueue: ${error.message}`, { stack: error.stack });
        throw error;
    }
};

const selectFailedOTAXmlQueue = async (requestId) => {
    const pool = getPool(requestId);
    try {
        const query = `
      SELECT
        oq.id,
        oq.status,
        oq.retries,
        oq.last_error,
        oq.created_at,
        oq.processed_at,
        h.name AS hotel_name,
        oq.xml_body
      FROM ota_xml_queue oq
      JOIN hotels h ON oq.hotel_id = h.id
      WHERE oq.status = 'failed'
      ORDER BY oq.created_at DESC;
    `;

        const result = await pool.query(query);
        logger.debug(`[${requestId}] selectFailedOTAXmlQueue: Found ${result.rows.length} failed OTA XML queue items.`);
        return result.rows;
    } catch (error) {
        logger.error(`[${requestId}] Error in selectFailedOTAXmlQueue: ${error.message}`, { stack: error.stack });
        throw error;
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
    insertOTAReservationQueue,
    updateOTAReservationQueue,
    selectOTAReservationQueue,
    insertOTAXmlQueue,
    updateOTAXmlQueue,
    selectOTAXmlQueue,
    selectFailedOTAXmlQueue
};