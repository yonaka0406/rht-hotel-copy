const { getPool } = require('../../config/database');
const format = require('pg-format');

/**
 * Gets waitlist entries for a hotel with filtering and pagination.
 * @param {string} requestId - The ID of the request for logging.
 * @param {number} hotelId - The ID of the hotel.
 * @param {object} [filters={}] - Filtering criteria (e.g., status, dates).
 * @param {number} [filters.page=1] - Page number.
 * @param {number} [filters.size=20] - Page size.
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<object>} Object containing entries array and pagination info.
 */
const getWaitlistEntriesByHotel = async (requestId, hotelId, filters = {}, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();

    const {
        page = 1,
        size = 20,
        status,
        startDate,
        endDate,
        roomTypeId
    } = filters;

    let queryValues = [];
    let whereClauses = [];

    // Mandatory hotel_id filter
    queryValues.push(hotelId);
    whereClauses.push(`we.hotel_id = $${queryValues.length}`);

    // Optional filters
    // Sanitize status filter
    if (status) {
        let statusArray = status;
        if (typeof statusArray === 'string') {
            statusArray = statusArray.split(',');
        }
        const allowedStatuses = ['waiting', 'notified', 'confirmed', 'expired', 'cancelled'];
        statusArray = statusArray.map(s => s.trim()).filter(s => allowedStatuses.includes(s));
        if (statusArray.length > 0) {
            queryValues.push(statusArray);
            whereClauses.push(`we.status = ANY($${queryValues.length})`);
        }
    }
    if (roomTypeId) {
        queryValues.push(roomTypeId);
        whereClauses.push(`we.room_type_id = $${queryValues.length}`);
    }
    if (startDate) {
        queryValues.push(startDate);
        // Ensure requests overlap or start after this date
        whereClauses.push(`we.requested_check_out_date > $${queryValues.length}`);
    }
    if (endDate) {
        queryValues.push(endDate);
        // Ensure requests overlap or end before this date
        whereClauses.push(`we.requested_check_in_date < $${queryValues.length}`);
    }

    const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query for total count
    const countQuery = `
        SELECT COUNT(*) AS total
        FROM waitlist_entries we
        ${whereCondition};
    `;

    // Query for entries with joins and pagination
    const entriesQuery = `
        SELECT
            we.id,
            we.client_id,
            COALESCE(c.name_kanji, c.name_kana, c.name) AS "clientName",
            we.hotel_id,
            h.name AS "hotelName",
            we.room_type_id,
            rt.name AS "roomTypeName",
            we.requested_check_in_date,
            we.requested_check_out_date,
            to_char(we.requested_check_in_date, 'YYYY/MM/DD') || ' - ' || to_char(we.requested_check_out_date, 'YYYY/MM/DD') AS "requestedDates",
            we.number_of_guests,
            we.number_of_rooms,
            we.status,
            we.notes,
            we.communication_preference,
            we.contact_email,
            we.contact_phone,
            we.preferred_smoking_status,
            we.created_at,
            we.updated_at
        FROM waitlist_entries we
        LEFT JOIN clients c ON we.client_id = c.id
        LEFT JOIN hotels h ON we.hotel_id = h.id
        LEFT JOIN room_types rt ON we.room_type_id = rt.id AND we.hotel_id = rt.hotel_id
        ${whereCondition}
        ORDER BY we.created_at ASC
        LIMIT $${queryValues.length + 1} OFFSET $${queryValues.length + 2};
    `;

    const limit = parseInt(size, 10);
    const offset = (parseInt(page, 10) - 1) * limit;

    try {
        const countResult = await client.query(countQuery, queryValues);
        const total = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limit);

        const entriesResult = await client.query(entriesQuery, [...queryValues, limit, offset]);

        return {
            entries: entriesResult.rows,
            pagination: {
                page: parseInt(page, 10),
                size: limit,
                total,
                totalPages
            }
        };
    } catch (err) {
        throw new Error(`Database error fetching waitlist entries: ${err.message}`);
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

/**
 * Finds a waitlist entry by its confirmation token.
 * @param {string} requestId - The ID of the request for logging.
 * @param {string} token - The confirmation token to search for.
 * @param {boolean} [validateExpiry=true] - Whether to validate token expiry.
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<object|null>} The waitlist entry object or null if not found/expired.
 */
const findWaitlistEntryByToken = async (requestId, token, validateExpiry = true, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    try {
        let query = `
            SELECT 
                we.*,
                COALESCE(c.name_kanji, c.name_kana, c.name) AS "clientName",
                h.name AS "hotelName",
                rt.name AS "roomTypeName"
            FROM waitlist_entries we
            LEFT JOIN clients c ON we.client_id = c.id
            LEFT JOIN hotels h ON we.hotel_id = h.id
            LEFT JOIN room_types rt ON we.room_type_id = rt.id AND we.hotel_id = rt.hotel_id
            WHERE we.confirmation_token = $1
        `;
        let queryValues = [token];

        if (validateExpiry) {
            query += ` AND we.token_expires_at > CURRENT_TIMESTAMP`;
        }

        const result = await client.query(query, queryValues);
        
        if (result.rows.length > 0) {
            const entry = result.rows[0];
            
            // Check if token is expired even if validateExpiry is false
            if (!validateExpiry && entry.token_expires_at) {
                const now = new Date();
                const expiryDate = new Date(entry.token_expires_at);
                if (now > expiryDate) {
                    return null; // Token is expired
                }
            }
            
            return entry;
        }
        
        return null;
    } catch (err) {
        throw new Error('Database error occurred while fetching waitlist entry by token.');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

/**
 * Finds a waitlist entry by its ID.
 * @param {string} requestId - The ID of the request for logging.
 * @param {string} id - The UUID of the waitlist entry.
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<object|null>} The waitlist entry object or null if not found.
 */
const findWaitlistEntryById = async (requestId, id, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();
    try {
        const result = await client.query('SELECT * FROM waitlist_entries WHERE id = $1', [id]);
        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
        throw new Error('Database error occurred while fetching waitlist entry.');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

/**
 * Checks if there is vacancy for a waitlist entry.
 * @param {string} requestId - The ID of the request for logging.
 * @param {number} hotel_id
 * @param {number} room_type_id
 * @param {string} check_in
 * @param {string} check_out
 * @param {number} number_of_rooms
 * @param {number} number_of_guests
 * @param {string} smoking_preference
 * @param {object} [dbClient=null] - Optional. A database client to use for the query.
 * @returns {Promise<boolean>} True if vacancy is available, false otherwise.
 */
const checkWaitlistVacancy = async (requestId, hotel_id, room_type_id, check_in, check_out, number_of_rooms, number_of_guests, smoking_preference, dbClient = null) => {
    const client = dbClient || await getPool(requestId).connect();

    try {
        // Convert ISO date strings to DATE format for SQL function
        const formatDateForSQL = (dateString) => {
            const date = new Date(dateString);
            date.setHours(date.getHours() + 9); // Adjust for JST
            return date.toISOString().split('T')[0];
        };

        const checkInDate = formatDateForSQL(check_in);
        const checkOutDate = formatDateForSQL(check_out);

        const params = [
            hotel_id,
            room_type_id || null,
            checkInDate,
            checkOutDate,
            number_of_rooms,
            number_of_guests,
            smoking_preference
        ];

        const result = await client.query(
            'SELECT is_waitlist_vacancy_available($1::INT, $2::INT, $3::DATE, $4::DATE, $5::INT, $6::INT, $7::BOOLEAN) AS available',
            params
        );

        return result.rows[0].available;
    } catch (error) {
        console.error(`[${requestId}] Error in waitlistModel.checkVacancy:`, error);
        throw new Error('Failed to check vacancy.');
    } finally {
        if (!dbClient) {
            client.release();
        }
    }
};

module.exports = {
    getWaitlistEntriesByHotel,
    findWaitlistEntryByToken,
    findWaitlistEntryById,
    checkWaitlistVacancy,
};