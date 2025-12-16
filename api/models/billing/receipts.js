const { getPool } = require('../../config/database');
const logger = require('../../config/logger');

async function selectMaxReceiptNumber(requestId, hotelId, prefix, dbClient = null) {
    const client = dbClient || await getPool(requestId).connect();
    logger.debug(`selectMaxReceiptNumber called with requestId: ${requestId}, hotelId: ${hotelId}, prefix: ${prefix}`);

    const query = `
        SELECT receipt_number as last_receipt_number
        FROM receipts
        WHERE hotel_id = $1
        AND receipt_number LIKE $2 || '%'
        ORDER BY receipt_number DESC
        LIMIT 1;
    `;
    try {
        const result = await client.query(query, [hotelId, prefix]);
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
    const useOwnClient = !dbClient; // Flag to indicate if this function is managing its own client and transaction

    logger.debug(`createNextReceiptVersion called with requestId: ${requestId}, hotelId: ${hotelId}, receiptNumber: ${receiptNumber}`);

    try {
        if (useOwnClient) {
            await client.query('BEGIN');
        }

        // 1. Get the current max version for this receipt number with FOR UPDATE to prevent race conditions
        const maxVerQuery = `
            SELECT MAX(version) as max_ver
            FROM receipts
            WHERE hotel_id = $1 AND receipt_number = $2;
        `;
        // Acquire an advisory lock for the specific receipt number within the transaction
        // Use hotelId and a hash of receiptNumber to create a unique lock key
        // This avoids integer overflow issues with large receipt numbers
        const crypto = require('crypto');
        const receiptHash = crypto.createHash('md5').update(receiptNumber.toString()).digest('hex');
        const receiptHashInt = parseInt(receiptHash.substring(0, 8), 16); // Use first 8 hex chars as int
        await client.query(`SELECT pg_advisory_xact_lock($1, $2)`, [hotelId, receiptHashInt]);
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
        if (useOwnClient) {
            await client.query('COMMIT');
        }
        const output = result.rows.length > 0 ? { success: true, id: result.rows[0].id } : { success: false };
        logger.debug(`createNextReceiptVersion result: ${JSON.stringify(output)}`);
        return output;

    } catch (err) {
        if (useOwnClient) {
            await client.query('ROLLBACK');
        }
        logger.error('Error in createNextReceiptVersion:', err);
        throw new Error('Database error while creating next receipt version.');
    } finally {
        if (useOwnClient) {
            client.release();
        }
    }
}

module.exports = {
    selectMaxReceiptNumber,
    getReceiptByPaymentId,
    saveReceiptNumber,
    createNextReceiptVersion,
};