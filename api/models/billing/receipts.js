const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

async function selectMaxReceiptNumber(requestId, hotelId, date, dbClient = null) {
    const client = dbClient || await getPool(requestId).connect();
    logger.debug(`selectMaxReceiptNumber called with requestId: ${requestId}, hotelId: ${hotelId}, date: ${date}`);
    // The date parameter is a JS Date object. We need to ensure it's formatted correctly for the query
    // or use date_trunc with the passed date.
    const query = `
        SELECT receipt_number as last_receipt_number
        FROM receipts
        WHERE hotel_id = $1
        AND receipt_date >= date_trunc('month', $2::date)
        AND receipt_date < date_trunc('month', $2::date) + interval '1 month'
        ORDER BY receipt_number DESC
        LIMIT 1;
    `;
    try {
        const result = await client.query(query, [hotelId, date]);
        const output = result.rows.length > 0 ? result.rows[0] : { last_receipt_number: null };
        logger.debug(`selectMaxReceiptNumber query result: ${JSON.stringify(output)}`);
        return output;
    } catch (err) {
        logger.error('Error in selectMaxReceiptNumber:', err);
        throw new Error('Database error while selecting max receipt number.');
    } finally {
        if (!dbClient) client.release();
    }
}

async function getReceiptByPaymentId(requestId, paymentId, hotelId, dbClient = null) {
    const client = dbClient || await getPool(requestId).connect();
    logger.debug(`getReceiptByPaymentId called with requestId: ${requestId}, paymentId: ${paymentId}, hotelId: ${hotelId}`);
    const query = `
        SELECT
            r.receipt_number,
            TO_CHAR(r.receipt_date, 'YYYY-MM-DD') as receipt_date,
            r.amount,
            r.tax_breakdown,
            r.version
        FROM reservation_payments p
        JOIN receipts r ON p.receipt_id = r.id AND p.hotel_id = r.hotel_id    
        WHERE p.id = $1 AND p.hotel_id = $2;
    `;
    try {
        const result = await client.query(query, [paymentId, hotelId]);
        const output = result.rows.length > 0 ? result.rows[0] : null;
        logger.debug(`getReceiptByPaymentId query result: ${JSON.stringify(output)}`);
        return output;
    } catch (err) {
        logger.error('Error in getReceiptByPaymentId:', err);
        throw new Error('Database error while fetching receipt by payment ID.');
    } finally {
        if (!dbClient) client.release();
    }
}

async function saveReceiptNumber(requestId, hotelId, receiptNumber, receiptDate, amount, userId, taxBreakdownData, honorific, customProviso, isReissue, dbClient = null) {
    const client = dbClient || await getPool(requestId).connect();
    logger.debug(`saveReceiptNumber called with requestId: ${requestId}, hotelId: ${hotelId}, receiptNumber: ${receiptNumber}, receiptDate: ${receiptDate}, amount: ${amount}, userId: ${userId}, taxBreakdownData: ${JSON.stringify(taxBreakdownData)}, honorific: ${honorific}, customProviso: ${customProviso}, isReissue: ${isReissue}`);
    const query = `
    INSERT INTO receipts
      (hotel_id, receipt_number, receipt_date, amount, created_by, tax_breakdown, honorific, custom_proviso, is_reissue, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())    
    RETURNING id;
  `;
    try {
        const values = [
            hotelId,
            receiptNumber,
            receiptDate,
            amount,
            userId,
            JSON.stringify(taxBreakdownData || []),
            honorific || '様',
            customProviso || null,
            isReissue || false
        ];
        const result = await client.query(query, values);
        const saveReceiptOutput = result.rows.length > 0 ? { success: true, id: result.rows[0].id } : { success: false };
        logger.debug(`saveReceiptNumber query result: ${JSON.stringify(saveReceiptOutput)}`);
        return saveReceiptOutput;
    } catch (err) {
        logger.error('Error in saveReceiptNumber:', err);
        logger.error('Failed to save receipt with data:', { hotelId, receiptNumber, taxBreakdownData });
        throw new Error('Database error while saving receipt number.');
    } finally {
        if (!dbClient) client.release();
    }
}

async function createNextReceiptVersion(requestId, hotelId, receiptNumber, receiptDate, amount, userId, taxBreakdownData, honorific, customProviso, isReissue, dbClient = null) {
    const client = dbClient || await getPool(requestId).connect();
    logger.debug(`createNextReceiptVersion called with requestId: ${requestId}, hotelId: ${hotelId}, receiptNumber: ${receiptNumber}`);

    try {
        // 1. Get the current max version for this receipt number
        const maxVerQuery = `SELECT MAX(version) as max_ver FROM receipts WHERE hotel_id = $1 AND receipt_number = $2`;
        const maxVerResult = await client.query(maxVerQuery, [hotelId, receiptNumber]);
        const nextVersion = (maxVerResult.rows[0].max_ver || 0) + 1;

        // 2. Insert new receipt record with incremented version
        const insertQuery = `
            INSERT INTO receipts
              (hotel_id, receipt_number, receipt_date, amount, created_by, tax_breakdown, honorific, custom_proviso, is_reissue, version, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())    
            RETURNING id;
        `;

        const values = [
            hotelId,
            receiptNumber,
            receiptDate,
            amount,
            userId,
            JSON.stringify(taxBreakdownData || []),
            honorific || '様',
            customProviso || null,
            isReissue || false,
            nextVersion
        ];

        const result = await client.query(insertQuery, values);
        const output = result.rows.length > 0 ? { success: true, id: result.rows[0].id } : { success: false };
        logger.debug(`createNextReceiptVersion result: ${JSON.stringify(output)}`);
        return output;

    } catch (err) {
        logger.error('Error in createNextReceiptVersion:', err);
        throw new Error('Database error while creating next receipt version.');
    } finally {
        if (!dbClient) client.release();
    }
}

module.exports = {
    selectMaxReceiptNumber,
    getReceiptByPaymentId,
    saveReceiptNumber,
    createNextReceiptVersion,
};