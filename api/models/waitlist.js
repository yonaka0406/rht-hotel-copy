const { getPool } = require('../config/database');
const format = require('pg-format');
const logger = require('../config/logger');

const WaitlistEntry = {
    /**
     * Creates a new waitlist entry.
     * @param {string} requestId - The ID of the request for logging and context.
     * @param {object} data - The data for the new waitlist entry.
     * @param {number} data.client_id - ID of the client.
     * @param {number} data.hotel_id - ID of the hotel.
     * @param {number} data.room_type_id - ID of the room type.
     * @param {string} data.requested_check_in_date - Requested check-in date (YYYY-MM-DD).
     * @param {string} data.requested_check_out_date - Requested check-out date (YYYY-MM-DD).
     * @param {number} data.number_of_guests - Number of guests.
     * @param {number} data.number_of_rooms - Number of rooms.
     * @param {string} data.contact_email - Contact email of the client.
     * @param {string} [data.contact_phone] - Optional contact phone of the client.
     * @param {string} [data.notes] - Optional notes for the waitlist entry.
     * @param {string} data.communication_preference - Preferred method of communication ('email' or 'phone').
     * @param {number} userId - ID of the user creating the entry.
     * @returns {Promise<object>} The created waitlist entry.
     * @throws {Error} If database operation fails or required fields are missing.
     */
    async create(requestId, data, userId, client = null) {
        const pool = getPool(requestId);
        let dbClient = client;
        let shouldReleaseClient = false;

        if (!dbClient) {
            dbClient = await pool.connect();
            shouldReleaseClient = true;
        }

        // Validate required fields
        const requiredFields = [
            'client_id', 'hotel_id',
            'requested_check_in_date', 'requested_check_out_date',
            'number_of_guests', 'number_of_rooms', 'communication_preference'
        ];
        for (const field of requiredFields) {
            if (data[field] === undefined || data[field] === null || data[field] === '') {
                throw new Error(`Missing required field: ${field}`);
            }
        }
        if (data.communication_preference === 'email') {
            if (!data.contact_email || data.contact_email.trim() === '') {
                throw new Error('Missing required field: contact_email');
            }
        }
        if (data.communication_preference === 'phone') {
            if (!data.contact_phone || data.contact_phone.trim() === '') {
                throw new Error('Missing required field: contact_phone');
            }
        }

        if (data.number_of_guests <= 0) {
            throw new Error('Number of guests must be positive.');
        }
        if (data.number_of_rooms <= 0) {
            throw new Error('Number of rooms must be positive.');
        }
        if (new Date(data.requested_check_out_date) <= new Date(data.requested_check_in_date)) {
            throw new Error('Requested check-out date must be after check-in date.');
        }
        if (!['email', 'phone'].includes(data.communication_preference)) {
            throw new Error('Invalid communication preference. Must be "email" or "phone".');
        }
        if (data.communication_preference === 'phone' && (!data.contact_phone || String(data.contact_phone).trim() === '')) {
            throw new Error('Contact phone is required if communication preference is phone.');
        }
        if (data.preferred_smoking_status && !['any', 'smoking', 'non_smoking'].includes(data.preferred_smoking_status)) {
            throw new Error('Invalid preferred smoking status. Must be "any", "smoking", or "non_smoking".');
        }

        const query = format(`
            INSERT INTO waitlist_entries (
                client_id, hotel_id, room_type_id,
                requested_check_in_date, requested_check_out_date,
                number_of_guests, number_of_rooms, contact_email, contact_phone,
                notes, communication_preference, status,
                preferred_smoking_status,
                created_by, updated_by
            ) VALUES (
                %L, %L, %L,
                %L, %L,
                %L, %L, %L, %L,
                %L, %L, 'waiting',
                %L, /* preferred_smoking_status */
                %L, %L
            )
            RETURNING *;
        `,  data.client_id, data.hotel_id, data.room_type_id,
            data.requested_check_in_date, data.requested_check_out_date,
            data.number_of_guests, data.number_of_rooms, data.contact_email, data.contact_phone,
            data.notes, data.communication_preference,
            data.preferred_smoking_status || 'any',
            userId, userId
        );

        try {
            if (shouldReleaseClient) {
                await dbClient.query('BEGIN');
            }
            const result = await dbClient.query(query);
            if (shouldReleaseClient) {
                await dbClient.query('COMMIT');
            }
            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                throw new Error('Failed to create waitlist entry, no rows returned.');
            }
        } catch (err) {
            if (shouldReleaseClient) {
                try {
                    await dbClient.query('ROLLBACK');
                } catch (rbErr) {
                    logger.error('Error rolling back transaction', { error: rbErr, file: 'waitlist.js', function: 'createWaitlistEntry' });
                }
            }
            if (err.constraint) {
                if (err.constraint === 'waitlist_entries_client_id_fkey') {
                    throw new Error('Invalid client_id provided.');
                } else if (err.constraint === 'waitlist_entries_hotel_id_fkey') {
                    throw new Error('Invalid hotel_id provided.');
                } else if (err.constraint === 'fk_waitlist_room_types') {
                    throw new Error('Invalid room_type_id or combination with hotel_id.');
                }
                throw new Error(`Database constraint violation: ${err.constraint}`);
            }
            throw new Error('Database error occurred while creating waitlist entry.');
        } finally {
            if (shouldReleaseClient) {
                dbClient.release();
            }
        }
    },

    // Future functions as per WAITLIST_STRATEGY.md:
    // async findMatching(requestId, criteria) { /* ... */ }

    /**
     * Gets waitlist entries for a hotel with filtering and pagination.
     * (Skeleton implementation - returns empty data for now)
     * @param {string} requestId - The ID of the request for logging.
     * @param {number} hotelId - The ID of the hotel.
     * @param {object} [filters={}] - Filtering criteria (e.g., status, dates).
     * @param {number} [filters.page=1] - Page number.
     * @param {number} [filters.size=20] - Page size.
     * @returns {Promise<object>} Object containing entries array and pagination info.
     */
    async getByHotel(requestId, hotelId, filters = {}) {
        const pool = getPool(requestId);

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
        // Date range overlap (if both startDate and endDate are provided)
        // This logic might need refinement based on exact overlap requirements.
        // The above individual startDate/endDate clauses handle open-ended ranges.
        // If a strict "within this period" is needed:
        // if (startDate && endDate) {
        //    queryValues.push(startDate, endDate);
        //    whereClauses.push(`(we.requested_check_in_date, we.requested_check_out_date) OVERLAPS ($${queryValues.length-1}::DATE, $${queryValues.length}::DATE)`);
        // }


        const whereCondition = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query for total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM waitlist_entries we
            ${whereCondition};
        `;

        // Query for entries with joins and pagination
        // Aliasing columns to match frontend expectations (e.g., clientName, roomTypeName)
        // Assuming client table has name_first, name_last and room_types has name
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
            const countResult = await pool.query(countQuery, queryValues);
            const total = parseInt(countResult.rows[0].total, 10);
            const totalPages = Math.ceil(total / limit);

            const entriesResult = await pool.query(entriesQuery, [...queryValues, limit, offset]);

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
        }
    },

    /**
     * Finds a waitlist entry by its confirmation token.
     * @param {string} requestId - The ID of the request for logging.
     * @param {string} token - The confirmation token to search for.
     * @param {boolean} [validateExpiry=true] - Whether to validate token expiry.
     * @returns {Promise<object|null>} The waitlist entry object or null if not found/expired.
     */
    async findByToken(requestId, token, validateExpiry = true) {
        const pool = getPool(requestId);
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

            const result = await pool.query(query, queryValues);
            
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
        }
    },

    /**
     * Finds a waitlist entry by its ID.
     * @param {string} requestId - The ID of the request for logging.
     * @param {string} id - The UUID of the waitlist entry.
     * @returns {Promise<object|null>} The waitlist entry object or null if not found.
     */
    async findById(requestId, id) {
        const pool = getPool(requestId);
        try {
            const result = await pool.query('SELECT * FROM waitlist_entries WHERE id = $1', [id]);
            return result.rows.length > 0 ? result.rows[0] : null;
        } catch (err) {
            throw new Error('Database error occurred while fetching waitlist entry.');
        }
    },

    /**
     * Updates the status of a waitlist entry and related fields.
     * @param {string} requestId - The ID of the request for logging.
     * @param {string} id - The UUID of the waitlist entry to update.
     * @param {string} status - The new status.
     * @param {object} [additionalData={}] - Optional additional data to update.
     * @param {string} [additionalData.confirmation_token] - Confirmation token.
     * @param {string} [additionalData.token_expires_at] - Token expiry timestamp.
     * @param {string} [additionalData.notes] - Notes to append or update.
     * @param {number} userId - ID of the user performing the update.
     * @returns {Promise<object|null>} The updated waitlist entry or null if not found/updated.
     */
    async updateStatus(requestId, id, status, additionalData = {}, userId, client = null) {
        const pool = getPool(requestId);

        let dbClient = client;
        let shouldReleaseClient = false;

        if (!dbClient) {
            dbClient = await pool.connect();
            shouldReleaseClient = true;
        }

        const { confirmation_token, token_expires_at, notes } = additionalData;

        const validStatuses = ['waiting', 'notified', 'confirmed', 'expired', 'cancelled'];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status value: ${status}`);
        }

        let querySetters = ['status = $1', 'updated_by = $2', 'updated_at = CURRENT_TIMESTAMP'];
        let queryValues = [status, userId];
        let valueCounter = 3;

        if (status === 'notified') {
            if (confirmation_token && token_expires_at) {
                querySetters.push(`confirmation_token = $${valueCounter++}`);
                queryValues.push(confirmation_token);
                querySetters.push(`token_expires_at = $${valueCounter++}`);
                queryValues.push(token_expires_at);
            }
        } else {
            querySetters.push(`confirmation_token = NULL`);
            querySetters.push(`token_expires_at = NULL`);
        }

        // Handle notes update
        if (notes) {
            querySetters.push(`notes = CASE WHEN notes IS NULL OR notes = '' THEN $${valueCounter} ELSE notes || ' ' || $${valueCounter} END`);
            queryValues.push(notes);
            valueCounter++;
        }

        const query = format(`
            UPDATE waitlist_entries
            SET ${querySetters.join(', ')}
            WHERE id = $${valueCounter}
            RETURNING *;
        `);
        queryValues.push(id);

        try {
            if (shouldReleaseClient) {
                await dbClient.query('BEGIN');
            }
            const result = await dbClient.query(query, queryValues);
            if (shouldReleaseClient) {
                await dbClient.query('COMMIT');
            }
            if (result.rows.length > 0) {
                return result.rows[0];
            } else {
                return null;
            }
        } catch (err) {
            if (shouldReleaseClient) {
                try {
                    await dbClient.query('ROLLBACK');
                } catch (rbErr) {
                    console.error('Error rolling back transaction:', rbErr);
                }
            }
            if (err.constraint) {
                 throw new Error(`Database constraint violation: ${err.constraint} while updating status.`);
            }
            throw new Error('Database error occurred while updating waitlist entry status.');
        } finally {
            if (shouldReleaseClient) {
                dbClient.release();
            }
        }
    },

    /**
     * Cancels a waitlist entry by updating its status to 'cancelled'.
     * @param {string} requestId - The ID of the request for logging.
     * @param {string} id - The UUID of the waitlist entry to cancel.
     * @param {number} userId - ID of the user performing the cancellation.
     * @param {string} [cancelReason] - Optional reason for cancellation to append to notes.
     * @returns {Promise<object|null>} The cancelled waitlist entry or null if not found/updated.
     */
    async cancelEntry(requestId, id, userId, cancelReason = '') {
        const additionalData = {};
        if (cancelReason && cancelReason.trim()) {
            additionalData.notes = `[キャンセル理由: ${cancelReason.trim()}]`;
        }
        return this.updateStatus(requestId, id, 'cancelled', additionalData, userId);
    }
};

module.exports = {
    WaitlistEntry
};
